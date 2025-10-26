# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Skyreach is a campaign manager for a tabletop RPG campaign "Beyond the Skyreach Mountains". It consists of:
- A CLI tool (`skyreach`) for session management and data processing
- A web application for viewing campaign data
- A monorepo with shared packages for core logic, schemas, and utilities

## Common Commands

### Building
```bash
npm run build              # Build all packages (TypeScript compilation + JSON schemas)
npm run build:force        # Force rebuild everything
npm run clean              # Clean build artifacts
npm run rebuild            # Clean + build
```

### Testing
```bash
npm test                   # Run all tests
npm run test:scribe        # Test only scribe commands (unit)
npm run test:scribe:int    # Test scribe commands (integration)
npm run test:scribe:watch  # Watch mode for scribe tests
npm run test:weave         # Test only weave commands (unit)
npm run test:weave:int     # Test weave commands (integration)
```

**Test patterns:**
- Unit tests: `*.spec.ts` (run with `vitest run --mode unit`)
- Integration tests: `*.spec-int.ts` (run with `vitest run --mode int`)

### Running the CLI
```bash
npm run cli                # Run CLI (via tsx)
npm run cli -- scribe      # Start scribe REPL
npm run cli -- weave --help
```

### Code Quality
```bash
npm run format             # Check formatting
npm run format:fix         # Apply formatting
npm run lint               # Run ESLint
npm run lint:fix           # Fix linting issues
npm run typecheck          # TypeScript type checking
npm run arch:check         # Validate dependency architecture rules
```

### Web Development
```bash
npm run dev                # Start Astro dev server (runs on all network interfaces)
npm run build:web          # Build web app (includes package build + clue links)
npm run preview            # Preview production build
```

## Architecture

### Workspace Structure

This is an npm workspaces monorepo with strict architectural boundaries enforced by dependency-cruiser:

**Apps:**
- `apps/cli` - The `skyreach` CLI tool (Commander.js-based)
- `apps/web` - Astro-based web application with Svelte components

**Packages:**
- `packages/schemas` - Zod schemas and generated JSON schemas (foundation layer)
- `packages/core` - Pure domain logic, no I/O (depends only on schemas)
- `packages/data` - Data access layer (file I/O, Git operations, YAML/JSONL)
- `packages/cli-kit` - CLI utilities (prompts, reporting, UI helpers)
- `packages/test-helpers` - Testing utilities

**Build order (from tsconfig.workspace.json):**
1. schemas
2. core
3. data
4. cli-kit
5. test-helpers

### Architectural Rules (enforced by .dependency-cruiser.cjs)

**Cross-package access:**
- Apps and packages MUST import from package barrel files (`index.ts`) only
- No deep imports into package internals (e.g., `packages/core/src/foo/bar.ts` from CLI)

**Package dependency constraints:**
- `core` - NO I/O dependencies (fs, path, yaml, simple-git, child_process)
- `cli-kit` - Cannot depend on `core` or `data`
- All packages must use barrel exports

**CLI command isolation:**
- Commands cannot import from other commands (e.g., `scribe` cannot import from `weave`)

### Domain Concepts

**Session lifecycle:**
1. **Scribe** - Interactive REPL for in-session logging
   - Creates JSONL session logs: `session-<SEQ>_<YYYY-MM-DD>.jsonl`
   - Dev mode: `dev_<ISO>.jsonl` in `sessions/_dev/`
   - Commands: start, move, note, party, weather, finalize, etc.
   - `scribe finalize` splits multi-season sessions and ensures season-homogeneous outputs

2. **Weave** - Campaign state applier
   - Consumes finalized session logs and rollovers
   - Enforces strict chronological ordering
   - Domains: `trails` (hex exploration), `ap` (advancement points)
   - Idempotent: already-applied sessions are no-ops
   - Commands: apply, plan (dry-run), status, doctor, allocate

**Data storage:**
- Session logs: `data/session-logs/sessions/` (JSONL format)
- Rollovers: `data/session-logs/rollovers/` (JSONL format)
- Footprints: `data/session-logs/footprints/{domain}/` (apply audit trail)
- Meta tracking: `data/meta.yaml` (appliedSessions, rolledSeasons, nextSessionSeq)
- Campaign data: `data/` (YAML files for characters, hexes, trails, etc.)

**File naming conventions:**
- Production sessions: `session-<SEQ>_<YYYY-MM-DD>.jsonl` (zero-padded SEQ)
- Dev sessions: `dev_<ISO>.jsonl` (never touches meta.nextSessionSeq)
- Rollovers: `rollover_<seasonId>_<YYYY-MM-DD>.jsonl`
- Footprints: `<ISO-timestamp>__<sessionId>.yaml`

### Key Technical Patterns

**Schemas and validation:**
- Zod schemas in `packages/schemas/src/schemas/`
- JSON schemas auto-generated via `npm run build:json-schemas`
- Run schema build: `npm run gen-json-schema`

**Testing sandboxes:**
- Integration tests use isolated Git repos in `.test-repos/`
- See `docs/specs/test-sandboxes.md` for details

**Strict chronology (weave):**
- Sessions must occur in seasons that have been rolled
- Rollovers must be applied in sequential order
- Already-applied artifacts are idempotent no-ops

## Release Process

Skyreach uses a "version-on-develop" workflow:

1. Create release branch from `develop`: `git co -b release-YYYY-MM-DD`
2. Run `npm run release:version` to apply changesets
3. Commit: `git commit -am "Set new versions; update changelogs"`
4. PR to `develop`, then `develop` → `main`
5. On merge to `main`, CI creates git tags: `<package-name>@<version>`

**Changesets:**
- Add changeset: `npm run changeset`
- Apply versions: `npm run release:version`

## Important Files

- `.dependency-cruiser.cjs` - Enforces architectural boundaries
- `tsconfig.workspace.json` - TypeScript project references
- `vitest.config.ts` - Test configuration (unit vs integration modes)
- `docs/specs/` - Command specifications (scribe, weave, data-contracts)
- `docs/dev/session-lifecycle.md` - Session/rollover/weave lifecycle
- `data/meta.yaml` - Campaign state index

## Development Notes

**When adding new commands:**
- Add spec to `docs/specs/scribe-commands/` or `docs/specs/weave-commands/`
- Follow existing handler patterns in `apps/cli/src/commands/scribe/handlers/` or `apps/cli/src/commands/weave/commands/`
- Respect command isolation (no cross-command imports)

**When modifying schemas:**
- Update Zod schema in `packages/schemas/src/schemas/`
- Run `npm run build:json-schemas` to regenerate JSON schemas
- Update related types if needed

**When working with session data:**
- Production sessions use sequential IDs from `meta.nextSessionSeq`
- Dev mode (--dev flag or SKYREACH_DEV=true) uses ISO timestamps
- Always use `ensureRepoDirs()` from `@skyreach/data` before file operations

**Git workflow:**
- Main branch: `main`
- Development branch: `develop`
- Feature branches from `develop`
- Weave apply requires clean working tree (unless `--allow-dirty`)
