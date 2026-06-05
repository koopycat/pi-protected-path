import { readFileSync, existsSync } from "node:fs";
import { join, resolve, relative, isAbsolute } from "node:path";
import { homedir } from "node:os";

export interface Pattern {
  raw: string;
  regex: RegExp;
  dirOnly: boolean;
}

/** Built-in protections that apply even without any .agentignore files. */
export const DEFAULT_PATTERNS: Pattern[] = [
  { raw: ".env", regex: globToRegex(".env"), dirOnly: false },
  { raw: ".env.*", regex: globToRegex(".env.*"), dirOnly: false },
];

export function globToRegex(glob: string): RegExp {
  let pattern = glob;
  const dirOnly = pattern.endsWith("/");
  if (dirOnly) pattern = pattern.slice(0, -1);

  let regex = "";
  let i = 0;
  while (i < pattern.length) {
    const c = pattern[i];
    if (c === "*" && pattern[i + 1] === "*") {
      if (pattern[i + 2] === "/") {
        regex += "(?:.*/)?";
        i += 3;
      } else {
        regex += ".*";
        i += 2;
      }
    } else if (c === "*") {
      regex += "[^/]*";
      i++;
    } else if (c === "?") {
      regex += "[^/]";
      i++;
    } else if ("./+{}[]()|^$\\".includes(c)) {
      regex += "\\" + c;
      i++;
    } else {
      regex += c;
      i++;
    }
  }

  // Patterns without a slash match at any depth
  const anchor = pattern.includes("/") ? "^" : "^(?:.*/)?";
  return new RegExp(anchor + regex + "$", "i");
}

function parseAgentignore(text: string): Pattern[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => ({
      raw: l,
      regex: globToRegex(l),
      dirOnly: l.endsWith("/"),
    }));
}

export function loadAgentignore(cwd: string): Pattern[] {
  const path = join(cwd, ".agentignore");
  if (!existsSync(path)) return [];

  try {
    const text = readFileSync(path, "utf-8");
    return parseAgentignore(text);
  } catch {
    return [];
  }
}

export function getDefaultPatterns(): Pattern[] {
  return DEFAULT_PATTERNS.map((p) => ({ ...p }));
}

export function loadGlobalAgentignore(): Pattern[] {
  const path = join(homedir(), ".pi", ".agentignore");
  if (!existsSync(path)) return [];

  try {
    const text = readFileSync(path, "utf-8");
    return parseAgentignore(text);
  } catch {
    return [];
  }
}

export function isProtected(
  cwd: string,
  filePath: string,
  patterns: Pattern[]
): Pattern | undefined {
  const abs = isAbsolute(filePath) ? filePath : resolve(cwd, filePath);
  const rel = relative(cwd, abs);
  if (rel.startsWith("..")) return undefined; // outside repo

  const normalized = rel.replace(/\\/g, "/");
  for (const p of patterns) {
    if (p.dirOnly) {
      // Directory-only pattern: match the path itself or any path inside it
      const dirRegex = new RegExp(
        p.regex.source.replace(/\$$/, "(?:/.*)?$"),
        "i"
      );
      if (dirRegex.test(normalized)) return p;
    } else {
      if (p.regex.test(normalized)) return p;
    }
  }
  return undefined;
}

export function extractPathsFromCommand(command: string): string[] {
  // Naive extraction of potential file paths from a bash command
  const paths: string[] = [];
  const tokens = command.split(/\s+/);
  for (const token of tokens) {
    if (
      token.startsWith("./") ||
      token.startsWith("../") ||
      token.startsWith("/") ||
      token.startsWith("~") ||
      (!token.startsWith("-") && token.includes("/"))
    ) {
      paths.push(token.replace(/^~/, process.env.HOME || "~"));
    }
  }
  return paths;
}
