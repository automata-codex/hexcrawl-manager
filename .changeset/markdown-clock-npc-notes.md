---
'@achm/web': patch
---

Render markdown in two places that previously displayed raw text:

- **`Clock` component** — the optional `description` field now goes
  through the inline markdown pipeline (`renderBulletMarkdown`), so
  faction-clock descriptions can use links, emphasis, and other
  inline markup.

- **NPC GM Notes** (`/players-reference/setting/npcs/[id]`) — each
  bullet in the NPC `notes` array is rendered through the same inline
  pipeline. Replaces the deprecated `formatText` helper (which only
  applied smartypants typography).
