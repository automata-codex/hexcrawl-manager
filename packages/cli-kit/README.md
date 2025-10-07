# `@skyreach/cli-kit`

Shared **CLI UX primitives** and helpers. This package is for building nice command-line experiences across apps—**not** for domain or data logic.

Examples include:

- Console output helpers (`info`, `warn`, `error`, `success`, `debug`)
- Interactive prompts (`selectFromFiles`, `confirm`, `input`)
- TTY-aware niceties (spinners, progress, colorized text)
- Formatting utilities (tables/columns, path shorteners, code frames)
- Environment helpers (CI/non-interactive detection, width/tty checks)
- Small time/measure helpers (timers, `withSpinner(asyncFn)`)

**_No domain logic. No repository layout knowledge. No file I/O beyond generic helpers._**

## Design principles

- **UI only:** Provide presentation and interaction; leave policy to callers.
- **Stateless & composable:** Pure functions where possible, minimal side effects.
- **TTY-aware:** Pretty when attached to a TTY; degrade gracefully in CI/log files.
- **Portable:** No assumptions about project structure, repo paths, or game rules.

## Do / Don’t

**Do**
- Use for printing, prompting, spinners, and formatting.
- Keep APIs generic (strings, lists, simple records).
- Handle non-interactive mode gracefully (e.g., skip prompts with defaults).

**Don’t**
- Parse or enforce business rules.
- Read/write project data files or know repo paths.
- Decide exit codes or error semantics (the app owns that).
