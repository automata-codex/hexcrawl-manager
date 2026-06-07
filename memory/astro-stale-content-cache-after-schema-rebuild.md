---
name: astro-stale-content-cache-after-schema-rebuild
description: After rebuilding @achm/schemas with a new field, the running Astro dev server serves stale content until apps/web/.astro is cleared.
metadata:
  type: project
---

When a new field is added to a Zod schema in `packages/schemas` and the
package is rebuilt, the already-running Astro dev server (`npm run dev`)
keeps serving stale content and the new field appears missing in the UI.

**Why:** Astro caches parsed content collections in `apps/web/.astro/`
(`data-store.json`). Entries are parsed through the collection's Zod
schema, which **strips unknown keys**. Anything parsed before the schema
rebuild has the new field dropped, and the running server reuses that
cache rather than re-parsing.

**How to apply:** After rebuilding `@achm/schemas` (or otherwise changing
a collection schema), clear the cache so the dev server re-syncs:
`rm -rf apps/web/.astro`. A `tail -f`-clean signal that the cache (not the
code) is the problem: `astro check` renders the field correctly but the
live dev server does not.
