---
'@achm/web': minor
---

Show a spoiler-free warning on Lost Valley-barrier hexes to non-GM viewers.
The map detail panel and player hex detail page previously showed the GM's
routing hint (naming the L3/P3 detour) to GMs only and nothing to players;
players now see a plain "Hex is impassable." notice instead.

The player-facing hex API (`/api/hexes.json`) no longer forwards the raw
`tags` array (other tags are spoilers) and instead derives a boolean
`isImpassable` flag from the `lost-valley-barrier` tag, set only once a hex
is visited or scouted.
