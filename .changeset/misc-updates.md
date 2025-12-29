---
"@achm/web": patch
---

Miscellaneous UI fixes and improvements

**Badge Component:**
- Fix inconsistent font weight by setting explicit `font-weight: normal`
- Add explicit font family for consistent rendering

**Sidebar Navigation:**
- Make nav menu scrollable when content exceeds viewport height
- Move scrollbar to edge of sidebar (outside padding)
- Add theme-aware scrollbar styling for both light and dark modes

**GM Dashboard:**
- Add in-world game start date display to next session agenda

**Hidden Sites:**
- Fix type errors when clue references are objects instead of strings
- Use `normalizeClueRef` helper for consistent handling

**Minor Fixes:**
- Fix navbar nag badge font consistency
- Fix hex detail content spacing
- Update progress meter font
