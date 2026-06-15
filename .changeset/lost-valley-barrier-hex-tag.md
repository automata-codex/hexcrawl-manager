---
'@achm/schemas': patch
---

Add `lost-valley-barrier` to the known hex tag vocabulary (`KnownTagEnum`).
Additive enum value; runtime validation is unchanged (the `tags` field already
accepts any string via the `z.string()` fallback in `TagSchema`). Used to flag
impassable barrier hexes with a GM-facing warning in the web app.
