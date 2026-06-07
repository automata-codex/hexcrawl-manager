---
'@achm/schemas': minor
'@achm/web': patch
---

Add a markdown `gmNotes` field to NPCs and render it on the detail page,
superseding the deprecated `notes` array.

**Schema** (`@achm/schemas`):

- **New** optional `gmNotes: string` on `NpcSchema` — GM-only markdown
  (never shown to players regardless of `visibility`). Holds the truth
  behind the player-facing `description` plus performance and
  run-the-NPC reference. Convention: prose sections for read-once
  material (`## Truth`, `## Voice`), bulleted sections for table-scanning
  (`## Reference`).
- **Deprecates** `notes: string[]` in favour of `gmNotes`. Kept optional
  so unmigrated files still validate during the migration window; remove
  once no file uses it.
- Formalizes the player-facing vs GM-only **audience contract** via field
  descriptions: `description`, `occupation`, `species`, `culture`, and
  `class` record the NPC's outward presentation (covers and personas
  written straight); the concealed truth lives in `gmNotes`. Additive and
  backward-compatible — existing YAML/MDX validates unchanged.

**Web** (`@achm/web`):

- **NPC detail page** (`/players-reference/setting/npcs/[id]`) renders
  `gmNotes` as a markdown block (inside the existing GM-only
  `SecretContent`). The field's own headings are demoted one level so
  they sit beneath the "GM Notes" section heading.
- **Falls back** to the deprecated `notes` bullet list when `gmNotes` is
  absent, so NPCs not yet migrated keep displaying their GM notes.
