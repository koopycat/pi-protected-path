/**
 * Protected Path Extension
 *
 * Reads a repo file called ".agentignore" and asks for confirmation
 * before accessing (read/write/edit/bash) protected paths.
 *
 * Place .agentignore in your repo root (next to .gitignore). Supports
 * basic glob patterns:
 *   - *       matches anything except /
 *   - **      matches anything including /
 *   - ?       matches a single char except /
 *   - #       line comment
 *   - !       negation (not implemented, treated as literal)
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { type Pattern, loadAgentignore, loadGlobalAgentignore, getDefaultPatterns, isProtected, extractPathsFromCommand } from "./lib.ts";

let patterns: Pattern[] = [];
const allowedThisSession = new Set<string>();

export default function (pi: ExtensionAPI) {
  function refresh(cwd: string) {
    const defaults = getDefaultPatterns();
    const global = loadGlobalAgentignore();
    const local = loadAgentignore(cwd);
    patterns = [...defaults, ...global, ...local];
    allowedThisSession.clear();
  }

  pi.on("session_start", async (event, ctx) => {
    refresh(ctx.cwd);
  });

  pi.on("resources_discover", async (event, ctx) => {
    if (event.reason === "reload") {
      refresh(ctx.cwd);
    }
  });

  pi.on("tool_call", async (event, ctx) => {
    if (patterns.length === 0) return undefined;

    const tool = event.toolName;
    let pathsToCheck: string[] = [];

    if (tool === "read" || tool === "write" || tool === "edit") {
      const path = (event.input as { path?: string }).path;
      if (path) pathsToCheck.push(path);
    } else if (tool === "bash") {
      const command = (event.input as { command?: string }).command;
      if (command) {
        pathsToCheck = extractPathsFromCommand(command);
      }
    }

    if (pathsToCheck.length === 0) return undefined;

    for (const p of pathsToCheck) {
      const matched = isProtected(ctx.cwd, p, patterns);
      if (!matched) continue;

      const cacheKey = `${tool}:${p}`;
      if (allowedThisSession.has(cacheKey)) continue;

      if (!ctx.hasUI) {
        return {
          block: true,
          reason: `Blocked ${tool} on protected path "${p}" (matches .agentignore pattern "${matched.raw}") — no UI for confirmation`,
        };
      }

      const choice = await ctx.ui.select(
        `🔒 Protected path\n\n  Tool: ${tool}\n  Path: ${p}\n  Pattern: ${matched.raw}\n\nAllow this access?`,
        ["Allow once", "Allow for session", "Block"]
      );

      if (choice === "Allow for session") {
        allowedThisSession.add(cacheKey);
      } else if (choice === "Allow once") {
        // do not cache, allow this single call
      } else {
        return {
          block: true,
          reason: `Blocked ${tool} on protected path "${p}" (matches .agentignore pattern "${matched.raw}")`,
        };
      }
    }

    return undefined;
  });
}
