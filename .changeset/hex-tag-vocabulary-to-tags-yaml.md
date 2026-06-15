---
'@achm/schemas': patch
---

Move the hex tag vocabulary out of the schema and into the data repo's
`tags.yaml`. Removes the `KnownTagEnum` enum, the `KnownTag` type, and the
`TagSchema` union; the hex `tags` field is now a plain `z.array(z.string())`.

Runtime validation is unchanged — `TagSchema` was already non-enforcing (its
`z.string()` fallback accepted any string), so the enum was documentation/
autocomplete only. The blessed vocabulary now lives in `tags.yaml` and is
checked by a warnings-only validator. The removed symbols had no consumers.
