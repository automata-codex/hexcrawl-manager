---
'@achm/web': minor
---

Add the faction tidings authoring aid (`npm run tidings:aid -- [faction-id]`,
or `tsx scripts/faction-tidings-aid.ts [faction-id]`) — a per-faction
surfacing convenience for authoring faction tidings. For each faction it
builds the plotline set as the union of the faction's explicit `plotlines`
field and plotlines whose body mentions the faction (reusing the plotline-refs
analyzer's body parsing and name normalization), then lists the live beats
(status pending/active) and live clues (status unknown) under that set, each
tagged with how it surfaced (`direct` vs `via-plotline:<slug>`).

Over-inclusive on purpose: better to show a via-plotline item you then judge
irrelevant than to miss one. Read-only — never writes status.

The gather is a pure, tested module (`scripts/faction-tidings-analyzer.ts`)
with the CLI as one caller, so a future "live threads for this faction" panel
on `/gm-reference/factions/[id]` can reuse it (logged, not built).

Known residual (documented, not fixed): body-derivation matches proper
faction names only, so oblique references ("the kobolds") won't link a
plotline. The forthcoming beat-tiding coverage tool backstops this; if it
bites in practice, the fix is faction aliases.
