# Pi Protected Path

[![CI](https://github.com/koopycat/pi-protected-path/actions/workflows/ci.yml/badge.svg)](https://github.com/koopycat/pi-protected-path/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A [Pi coding agent](https://github.com/earendil-works/pi) extension that requires approval before an
agent reads or modifies sensitive files inside the current project.

`.env` and `.env.*` files are protected by default at every directory depth. Add project-specific
patterns in `.agentignore` and personal defaults in `~/.pi/.agentignore`.

## Install

```bash
pi install git:github.com/koopycat/pi-protected-path@v0.1.0
```

To remove it:

```bash
pi remove git:github.com/koopycat/pi-protected-path@v0.1.0
```

Pi packages execute local code. Review third-party package source before installation.

## Behavior

The extension checks Pi's `read`, `write`, `edit`, and `bash` tool calls.

- **Interactive sessions:** choose **Allow once**, **Allow for session**, or **Block**.
- **Headless sessions:** protected access is blocked because confirmation is unavailable.
- **Session approval:** applies only to the exact tool and path approved.
- **Outside-project paths:** are not handled. Pair this package with a path-jail extension if agents
  must also be prevented from leaving the project root.

Example `.agentignore`:

```gitignore
# Patterns without a slash match at any depth.
*.pem
credentials.json

# A trailing slash protects the directory and everything below it.
secrets/

# Patterns containing a slash are anchored to the project root.
config/production.yml
```

Supported syntax: `*`, `**`, `?`, blank lines, and `#` comments. Negation (`!`) is not supported.
Built-in `.env` protections cannot be negated.

After changing `.agentignore`, reload Pi resources or start a new session. Project patterns are read
from the session's working directory.

## Security boundaries

This extension is a confirmation guard, not an operating-system sandbox. In interactive mode, the
user can approve access. Shell commands are inspected using conservative token extraction rather
than a complete shell interpreter, so indirect access through variables, generated commands,
subprocesses, aliases, or obfuscated shell syntax may evade path detection. For stronger isolation,
run Pi in a sandbox with OS-level filesystem controls.

Symlink targets are not resolved by this extension. Do not treat it as a defense against hostile
repositories.

## Development

```bash
pnpm install
pnpm check
```

## License

[MIT](LICENSE)
