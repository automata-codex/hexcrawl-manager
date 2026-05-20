---
'@achm/web': patch
---

Extract a shared `HexClueList` Svelte component for rendering the
"Clues:" line under hex landmarks and hidden sites. Replaces the
duplicated inline rendering in `HiddenSites.svelte` and
`Landmark.svelte`, and adds support for the `context` field on
structured clue references (rendered as a parenthesized italic note
next to the clue link).
