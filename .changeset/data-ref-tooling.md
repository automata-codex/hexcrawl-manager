---
'@achm/web': minor
---

Data-reference tooling: validate and auto-link entity references in
campaign data files.

- **New** `scripts/validate-data-refs.ts` (`npm run validate:refs`)
  scans every markdown/YAML file under `data/` for four classes of
  drift: unresolved backtick slugs in prose, dangling markdown links
  to entity URLs, URL drift (link points to a non-canonical path for
  the entity's type), and references to entity types that have no
  public route. Strict by default — non-zero exit on any finding.

- **New** `scripts/link-data-refs.ts` (`npm run link:refs`) rewrites
  backtick slug references like `` `revenant-courier` `` into proper
  markdown links (`[Revenant Courier](/gm-reference/encounters/revenant-courier)`).
  Skips tokens inside fenced code blocks, existing link text,
  unresolved tokens, and types with no public route. Defaults to
  dry-run; supports `--write`, `--paths`, and `--branch` (only files
  changed vs. `main`).

- **New** shared `scripts/lib/data-refs.ts` provides the entity
  resolver, backtick/link scanners, and markdown parser used by both
  scripts.

- **Build integration:** `validate:refs` runs as part of the web
  app's `prebuild.sh`, so any new drift fails the build before
  Astro starts.
