---
'@achm/web': patch
---

Widen the plotline-refs analyzer's NPC-section heading detection so
prefixed headings like `## Other NPCs` are recognized as NPC sections
(previously only headings *starting* with `npcs`/`operatives`/`agents`
matched). Without this, NPC links under such headings were never
captured for back-reference validation. Also removes a stray
`border-radius` on the NPC list row avatar so the avatar is fully
round (matching the rest of the UI).
