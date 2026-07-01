---
'@achm/web': minor
---

Add the clue/beat placement-integrity validator
(`npm run validate:placement-integrity`, or
`tsx scripts/validate-placement-integrity.ts`), which enforces the structural
invariants from `docs/clue-and-beat-placement-guide.md` that no existing check
covers. It complements rather than duplicates the two neighbours:
`validate-hex-beat-refs.ts` still owns hex→beat/book *anchor arrays*, and
`validate-clue-placements.ts` still owns placement *counts* — this one walks the
reference graph.

Every finding is a hard invariant, so any hit fails the build:

- **Dangling clue references** — every clue id referenced from a hex
  (landmark/hidden-site clues, hidden-site `clueId`/`linkId`, dream-note
  `clueId`), encounter, dungeon, npc, character, pointcrawl-node, beat, or
  roleplay-book tidings link resolves to a clue file.
- **Dangling beat `linkId`** — hidden-site and tidings rows whose `linkType` is
  `beat` must resolve (the surface the anchor-array checks don't see).
- **Forbidden back-links** — a clue or beat file must not carry a placement
  array (`hexes`, `placements`, `locations`, `placedAt`, `hexIds`); placement is
  owned by the location.
- **Double-home beats** — a beat that is hex-anchored *and* surfaced in a
  faction-tidings channel is miscategorized (spatial vs. relational).
- **Duplicate ids** — two clues sharing an id, or two beats sharing a canonical
  `plotline/slug`.
- **Id / slug mismatches** — a clue whose `id` differs from its filename, or a
  beat whose frontmatter `slug`/`plotline` disagrees with its path.

The surface-walking and checks live in the pure, unit-tested
`placement-integrity-analyzer.ts`; the script only loads data and sets the exit
code. It runs in `prebuild.sh` after the hex→beat anchor check.

Also fixes `validate-clue-placements.ts`: pointcrawl nodes, characters, and NPCs
can be authored as `.md`/`.mdx` frontmatter, but the loader only globbed YAML,
so clues carried by those files vanished from the placement count and read as
under-placed even though the web app (which loads via Astro content collections)
counted them. It now loads both formats, keeping the check in agreement with the
UI it mirrors.
