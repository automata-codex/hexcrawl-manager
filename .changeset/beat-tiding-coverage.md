---
'@achm/web': minor
---

Add the beat tiding orphan-catcher (`npm run tidings:coverage`, or
`tsx scripts/beat-tiding-coverage.ts`) — the global completeness backstop
for faction tidings. It lists every live beat (status pending/active,
campaign-active) whose compound `<plotlineSlug>/<beatSlug>` id appears in no
`linkType: 'beat'` row across any roleplay book's intelligence reports
(rolled or selectable).

This is the "don't forget" signal; the faction tidings aid is the ergonomic
way to work the list down. In particular it catches what the aid
structurally misses: beats that are faction-untagged, named obliquely in
plotline bodies, or whose factions have no roleplay book.

Distinct from the plotline-refs validator's `orphan-beat` warning, which
checks beat-file-vs-plotline-`beats`-array sync — this tool checks
beat-vs-tiding coverage. Both tools share one `isLiveBeat` predicate so they
agree on what "live" means.

Warnings-only: always exits 0. Deferred (logged, not built): a strict env
gate mirroring `ACHM_STRICT_PLOTLINE_REFS` if CI should ever enforce
coverage.
