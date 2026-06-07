---
'@achm/web': patch
---

Render the clue `summary` field as markdown on the clue detail view
(`Clue.astro`). It now goes through the inline markdown pipeline
(`renderBulletMarkdown`), so summaries can use links, emphasis, code, and
other inline markup instead of displaying raw text — matching how
`clue.details` and the pointcrawl `summary` already render. The clue list
search still matches against the raw summary text, so filtering is
unaffected.
