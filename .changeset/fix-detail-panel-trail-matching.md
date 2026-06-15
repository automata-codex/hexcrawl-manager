---
'@achm/web': patch
---

Fix the map detail panel showing trails from unrelated hexes. The
`trailsInHex` filter matched hex IDs with substring `.includes()`, so
selecting hex `p1` also pulled in every trail touching `p10`–`p19`
(e.g. `'p11'.includes('p1')`). Switched to exact equality. This also
resolves a Svelte `each_key_duplicate` crash that occurred when a real
trail and a wrongly-included one resolved to the same destination hex;
the trail list is now keyed on the unique trail ID instead of the
destination.
