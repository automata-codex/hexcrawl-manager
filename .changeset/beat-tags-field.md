---
'@achm/schemas': minor
---

Add optional `tags: string[]` field to `BeatSchema`. Free-form, no
controlled vocabulary — used as the lookup key for at-the-table beat
summoning. Existing beat MD files are unaffected; the field is optional
and additive. Sits alongside the existing `trigger:` field (which stays
as the GM-facing narrative description of when the beat fires) and the
other beat metadata.
