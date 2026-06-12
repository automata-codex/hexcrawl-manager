---
'@achm/web': minor
---

Add the beat tag vocabulary validator (`npm run validate:tags`, or
`tsx scripts/validate-tags.ts`). Checks every beat's `tags` against the
blessed vocabulary in `data/tags.yaml` (the `beat` domain key — future
vocabularies like clue/hex are sibling keys). Off-vocabulary tags are
reported grouped by tag, ordered by use count, so cleanup is one decision
per tag: bless (add to tags.yaml), collapse (rename to a blessed tag), or
drop (delete; if the info matters, it's body prose).

A missing or malformed tags.yaml is treated as an empty vocabulary — every
tag is flagged, which makes the first run the triage worklist.

Warnings-only by default; `ACHM_STRICT_TAGS=1` fails the build. The gate
flips on (mirroring `validate:plotlines`) once the data cleanup pass is
complete.

No UI change: the beats index already derives its tag filter options from
the union of beat tags, so the dropdown shrinks automatically as the data
is cleaned.
