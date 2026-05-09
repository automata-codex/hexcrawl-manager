---
'@achm/web': patch
---

Treat known clues as fully placed in the clue list. A clue with status
`known` no longer gets the orange "Review" badge when its placement
count is below `minPlacements`, and it renders in the upright (non-
italic) style used for placed clues even if it has no placements.
