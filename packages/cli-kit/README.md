# `@skyreach/cli-kit`

This is the home for things that are:

- shared by multiple CLI subcommands,
- **don’t** touch FS/git/env (that’s `data`), and
- **aren’t** domain mechanics (that’s `core`),
- but **do** encode repo conventions (IDs, filenames, ordering).

## ChatGPT Recommended Structure

```
packages/cli-kit/src/
├─ cli/                # actual CLI ergonomics (logger, errors, prompts, option parsing)
│  ├─ logger.ts
│  ├─ errors.ts
│  └─ prompts.ts
├─ conventions/        # repo-convention utilities (shared by scribe & weave)
│  ├─ ids/
│  │  ├─ session.ts        # pickNextSessionId
│  │  └─ scribe.ts         # sortScribeIds
│  ├─ events.ts            # eventsOf
│  ├─ strings/
│  │  └─ pad.ts
│  └─ parse.ts             # tiny, pure parsers (no I/O)
└─ index.ts            # barrel: re-export cli/* and conventions/*
```

Rules:

* `cli-kit` may depend on `@skyreach/schemas` (for branded types, regexes).
* `cli-kit` may **not** depend on `@skyreach/core` or `@skyreach/data`.
* No `fs`, `path`, `yaml`, `simple-git`, `process.env` here—ever.

## Quick “what goes where” rubric

* **Touches disk/git/env?** → `data`
* **Implements campaign math/validation (AP, seasons, calendar semantics)?** → `core`
* **Pure utils tied to repo shape (IDs, filenames, sorting) or CLI ergonomics?** → `cli-kit`
* **Only one command uses it and it’s UI-ish?** → keep local to that command
