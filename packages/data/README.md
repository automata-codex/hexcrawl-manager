# `@skyreach/data`

Data handling lives here: repository layout, file formats, and safe I/O. This
package knows *where* things are on disk and *how* to serialize/validate them.

Examples include:

- **Paths & layout**
  - `REPO_PATHS` for sessions, meta, trails, footprints, reports, etc.
- **Filenames (storage grammar)**
  - `SESSION_FILE_RE`, `ROLLOVER_FILE_RE`
  - `parseSessionFilename`, `parseRolloverFilename`
  - `fmtSessionBase`, `fmtRolloverBase`
- **Serialization**
  - YAML/JSON read/write helpers, `writeYamlAtomic`
  - Zod-backed loaders: `loadMeta`, `loadTrails`, `loadHavens`
- **Validation & errors**
  - `DataFileNotFoundError`, `DataParseError`, `DataValidationError`

**_No game rules._** This package doesn’t decide *what* a rollover does—only how
to load/save the data used by rule engines.

## Design principles

- **Fail fast:** Missing/invalid files throw typed errors.
- **Validate at the edge:** Use Zod schemas for all loaders.
- **Atomic writes:** Avoid partial/corrupt files; deterministic key ordering.
- **Separation of concerns:** Storage grammar (filenames) here; domain IDs in core.

## Do / Don’t

**Do**
- Provide stable path helpers and filename parsers/formatters.
- Read/validate/write YAML/JSON with clear, typed errors.
- Offer canonicalization utilities for on-disk maps (e.g., trail key normalization).

**Don’t**
- Implement business rules (AP math, trail decay, chronology).
- Print to console or decide exit codes.
- Prompt users or depend on TTY state.

## Interop notes

- **Core ↔ Data:** Data uses core’s *ID* assertions to normalize values (e.g.,
  `assertSeasonId`), while core never imports data.
- **CLI ↔ Data:** CLI commands should import *only* I/O concerns here; keep rule
  evaluation in core or the app’s orchestrator.
