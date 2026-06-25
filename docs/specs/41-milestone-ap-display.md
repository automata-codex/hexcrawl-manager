# CC Brief — Show milestone AP (not award counts) in `weave status ap`

## Goal

The `weave status ap` "Milestone Awards" table currently reports **counts of
awards** — how many milestone events a character is eligible for, has claimed,
and hasn't claimed. Switch all three columns to report **milestone AP** instead:
how much milestone AP the character is eligible for, has claimed, and hasn't
claimed.

Confirmed scope (do exactly this, no more):
- **Eligible / Claimed / Unclaimed all in AP**, not counts.
- **Single combined total** per character (combat + exploration + social summed),
  not a per-pillar breakdown.
- **Replace** the count columns with AP columns — do not keep the counts and do
  not add a parallel table.

This is a display/semantics change to one table. The milestone allocation/apply
machinery, the ledger schema, and the per-pillar "AP Status by Character" table
above it are all **unaffected**.

## Background you need (read, don't infer)

This builds directly on the top-up model. Read these first:

- `docs/specs/milestone-ap-reconciliation.md` — the governing spec. The
  **top-up mechanic** (§"Mechanic") is the whole basis for "milestone AP": a
  milestone event carries **no AP value of its own**. The AP a character earns
  from a milestone is computed per character per session as
  `topUp = max(0, 3 − sessionTotal)`, where `sessionTotal` is that character's
  pillar AP from their `session_ap` ledger entry for the session. Note its
  §"Status display impact" describes the *count* table this brief is replacing —
  this brief supersedes that section.
- `apps/cli/src/commands/weave/lib/core/compute-unclaimed-milestone-awards.ts` —
  the function that produces the table data today (counts). **This is the main
  file you change.**
- `apps/cli/src/commands/weave/commands/allocate-ap-milestone.ts` — read
  `getEagerTopUp` (lines 62–91) and `MILESTONE_AP_CAP` (line 25). `getEagerTopUp`
  already computes exactly the per-(character, session) top-up you need for
  Eligible AP — but it reads the ledger from disk. You need the same arithmetic
  over the **in-memory `apLedger`** the compute function already receives. Mirror
  the math; don't re-read from disk.
- `apps/cli/src/commands/weave/commands/status-ap.ts` — wires data into the
  table. It already passes the full `apLedger` into the compute function, so no
  new data plumbing is required. The `StatusApResult.milestoneAwards` type
  (lines 32–38) changes with the field rename below.
- `apps/cli/src/commands/weave/commands/status.ts` — renders the table
  (lines 51–68). Header/label change only.
- `apps/cli/src/commands/weave/lib/core/compute-unclaimed-milestone-awards.spec.ts`
  — the unit test you rewrite.

## The change

### 1. Eligible AP (`compute-unclaimed-milestone-awards.ts`)

Today, for each completed milestone-bearing session a character attended, the
function adds the session's milestone **event count** to that character's
eligible total (lines 37–49). Replace that with the **per-session top-up**:

For each completed session where `milestoneCountsBySessionId` has an entry
(i.e. the session has ≥1 milestone event) and the character is in the session's
`characterIds` roster, add a single top-up for that session:

```
sessionTotal = sum of combat/exploration/social deltas across that character's
               session_ap ledger entries for that sessionId   (from apLedger)
topUp        = max(0, MILESTONE_AP_CAP − sessionTotal)
```

Two confirmed semantic decisions baked in here:

- **Per-session cap, not per-event.** A session with 2 milestone events yields
  **one** top-up to the cap, not two. The cap (`MILESTONE_AP_CAP = 3`) is a
  per-session ceiling on a character's total session AP, so multiple milestones
  in one session don't stack. Use the map only as a boolean "this session has a
  milestone" — **stop summing `count`**. (The existing `if (count === 0)
  continue` guard already gives you the boolean; just don't add `count` to the
  total anymore.)
- **Unapplied sessions default to the full cap.** If the character has **no**
  `session_ap` entry for that session yet (pillar AP not applied — the same case
  where `getEagerTopUp` returns `null`), the top-up isn't yet computable. Treat
  eligible AP for that session as the full `MILESTONE_AP_CAP` (3). This is the
  most conservative "eligible" reading and self-corrects to the real top-up once
  `weave apply ap` runs.

Factor the top-up arithmetic into a small pure helper that operates on the
in-memory ledger, e.g.:

```ts
// returns null when no session_ap exists yet for (characterId, sessionId)
function sessionApTotal(
  apLedger: ApLedgerEntry[],
  characterId: string,
  sessionId: string,
): number | null
```

Then eligible-per-session = `total === null ? MILESTONE_AP_CAP : Math.max(0, MILESTONE_AP_CAP − total)`.

> Note on `MILESTONE_AP_CAP`: it currently lives in (and is exported from)
> `allocate-ap-milestone.ts`, a **command** file. A `lib/core` module importing
> from a command is the wrong dependency direction and may trip
> `npm run arch:check`. Prefer defining the constant in a shared `lib/core`
> location and having `allocate-ap-milestone.ts` import it from there; or, if
> that's more churn than you want, redeclare the `3` locally with a comment
> pointing at the canonical definition. Run `npm run arch:check` either way.

### 2. Claimed AP (`compute-unclaimed-milestone-awards.ts`)

Today claimed is `+1` per `milestone_spend` ledger entry for the character
(lines 51–59). Replace with the **sum of the entry's three pillar deltas**:

```
claimedAp += (entry.advancementPoints.combat?.delta ?? 0)
           + (entry.advancementPoints.exploration?.delta ?? 0)
           + (entry.advancementPoints.social?.delta ?? 0)
```

This mirrors `packages/data/src/ap-ledger/aggregate.ts:22`, which already sums
`milestone_spend` deltas into the per-pillar AP table.

### 3. Unclaimed AP

`unclaimed = Math.max(0, eligibleAp − claimedAp)` — same flooring as today,
applied to AP totals instead of counts.

### 4. Rename the output fields (make the semantic change explicit)

Repurposing `eligible/claimed/unclaimed` from counts to AP silently invites
confusion. Rename the fields on `UnclaimedMilestoneSummary`
(`compute-unclaimed-milestone-awards.ts:7–13`) to `eligibleAp / claimedAp /
unclaimedAp`, and update the matching `StatusApResult.milestoneAwards` shape in
`status-ap.ts:32–38` and the renderer in `status.ts`. (Optionally rename the
type itself, e.g. `MilestoneApSummary`, but that's not required.)

### 5. Display (`status.ts:51–68`)

- Change the section label from `Milestone Awards:` to `Milestone AP:` so it's
  unambiguous the columns are AP, not award counts.
- Keep the three columns `Eligible / Claimed / Unclaimed`; they now print AP
  totals. Keep the existing `pad`/column widths.

## Out of scope / leave alone

- **The allocation and apply paths.** `allocate ap milestone`, the
  `milestoneAllocations[]` staging, and the phase-2 reconciler in `apply ap` are
  untouched. This brief only reads what they've already written.
- **Schemas.** No change to `MilestoneSpendEntrySchema`, `MilestoneAllocationSchema`,
  or the scribe `milestone` event. The deltas you sum already exist.
- **Per-pillar milestone breakdown.** Confirmed single total only. If a per-pillar
  view is ever wanted, it's a separate brief.
- **The "AP Status by Character" table.** It already includes milestone deltas
  via `aggregateApByCharacter`; don't touch it.
- **The absence-awards table.** Still counts; out of scope here.

## Tests

Rewrite `compute-unclaimed-milestone-awards.spec.ts` — its current assertions are
all in count terms and will no longer hold. The existing `milestoneSpend` helper
builds entries with all-zero deltas; give it non-zero pillar deltas so claimed AP
is meaningful. You'll also need `session_ap` ledger fixtures so top-ups are
computable. Cover at least:

1. **Top-up from session AP.** Attendee with `session_ap` total of 2 for a
   milestone session → `eligibleAp = 1`. Total of 1 → `eligibleAp = 2`. Total of
   0 → `eligibleAp = 3`.
2. **Per-session cap, not per-event.** A session with **2** milestone events
   (`milestoneCountsBySessionId` value 2) still yields a single top-up for that
   session — assert the multi-milestone session does **not** double the AP. (This
   replaces the current "two milestones in one session → eligible 2" test.)
3. **Unapplied session defaults to cap.** Attendee with **no** `session_ap` entry
   for a milestone session → `eligibleAp = 3`.
4. **Grandfather edge.** `session_ap` total ≥ 3 → `topUp = 0` → `eligibleAp = 0`
   for that session (still claimable; just worth no AP).
5. **Claimed = sum of deltas.** A `milestone_spend` entry with e.g.
   `combat:1, exploration:1, social:0` → `claimedAp = 2` (not 1).
6. **Unclaimed floors at 0** when claimed AP exceeds eligible AP (data-drift
   defense), and a fully reconciled session nets `unclaimedAp = 0`
   (claimed deltas equal the top-up).
7. **Non-attendees and planned/no-milestone sessions** contribute 0 (preserve the
   existing coverage, just in AP terms).

Run `npm run test:weave` (unit) for the compute changes. Run `npm run typecheck`,
`npm run lint`, and `npm run arch:check` before finishing.

## Manual verification

After building, `npm run cli -- weave status ap` against the data repo should
show a `Milestone AP:` section whose numbers are AP totals. Spot-check one
character: their Claimed AP should equal the sum of their `milestone_spend`
deltas in `data/ap-ledger.jsonl`, and Eligible − Claimed should match Unclaimed.

## Confirmed with Alex

- Eligible, Claimed, and Unclaimed all switch to **AP**.
- **Single combined total**, not per pillar.
- **Replace** the award counts (no second table, counts not retained).
- **Multi-milestone sessions** collapse to a single per-session top-up (per-session
  cap, not per-event).
- **Sessions not yet applied to the ledger** default to the full cap (3 AP) for
  eligibility, self-correcting once pillar AP is applied.
