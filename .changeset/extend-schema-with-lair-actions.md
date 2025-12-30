---
"@achm/schemas": minor
"@achm/web": patch
---

Add lair actions support to stat blocks

**Schema:**
- Add `lair_actions_intro` field for introductory text (e.g., "On initiative count 20, roll 1d4")
- Add `lair_actions` array field with `name` and `desc` for each lair action

**Web App:**
- New `LairActions.astro` component to display lair actions in stat blocks
- Lair actions render after reactions when present
