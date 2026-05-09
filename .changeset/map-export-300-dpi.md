---
'@achm/web': patch
---

Export interactive map at 300 DPI. The `DownloadButton` now scales the
canvas pixel dimensions by 300/96 and injects a `pHYs` chunk into the
PNG so viewers and print software recognize the export as 300 DPI
rather than the canvas default of 96.
