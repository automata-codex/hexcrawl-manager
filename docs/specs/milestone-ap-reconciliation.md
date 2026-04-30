---
status: proposal
supersedes: parts of `milestone-ap.md`
related:
  - `../../skyreach/data/articles/character-advancement.md` (canonical rules)
  - `milestone-ap.md` (current implementation spec)
  - `weave-commands/status-ap.md`
---

# Milestone AP Reconciliation: Top-Up Model

## Problem

The implementation and the campaign rules disagree on how milestone AP is awarded.

**Campaign rules** (`character-advancement.md:103`):
> Milestone AP is awarded only when pillar advancement doesn't already reflect the session's narrative progress. It serves as an alternative to pillar AP, not a supplement—the party earns either pillar AP or milestone AP for a given session, not both. The maximum AP a character can earn in a single session is three.

**Current implementation** (`milestone-ap.md:17`, `allocate-ap-milestone.ts:26`):
- `MILESTONE_AP_AMOUNT = 3` — always grants a flat 3 AP.
- No reference to the character's session pillar AP.
- No credit check; GM grants directly on top of whatever the session already produced.

In practice, this lets a character receive pillar AP **and** a flat +3 milestone AP in the same session, exceeding the rules-stated cap of 3 AP/session.

## Proposed Reconciliation: Top-Up

Replace the flat-grant model with a **top-up** model, scoped per character per milestone session.

### Mechanic

For a milestone awarded in `session-NNNN`, for each eligible character:

```
sessionTotal     = combat_delta + exploration_delta + social_delta
                   from that character's session_ap entry for session-NNNN
                   (deltas are already era-clamped: cap policy ≥0020, grandfather ≤0019)
topUpAmount      = max(0, 3 - sessionTotal)
milestoneSplit   = player-chosen pillar distribution summing to topUpAmount
```

If `sessionTotal >= 3` (possible only under the grandfather policy in old sessions), the milestone grants 0 AP but is still recorded as claimed.

### Tier interaction

The same milestone awards **different amounts to different characters at the same table**, because `sessionTotal` is per-character and reflects each character's tier-gated pillar AP. No additional tier logic is needed in the milestone code path — the existing event `maxTier` gates and era policies (handled by `weave apply ap`) shape `session_ap`, and the topup formula reads what's already there.

**Worked example.** Session events: 1 combat (`maxTier: 1`), 1 exploration (`maxTier: 2`), 1 milestone declaration.

| Character | Tier | combat | exploration | pillarTotal | topUp | Milestone AP | Session total |
|-----------|------|--------|-------------|-------------|-------|--------------|---------------|
| Alistar   | 1    | 1      | 1           | 2           | 1     | 1            | 3             |
| Daemaris  | 2    | 0 (gated) | 1        | 1           | 2     | 2            | 3             |

Both characters end the session at 3 AP, with each milestone's pillar split chosen by the player whose character is being awarded.

**Cap-or-grandfather edge cases.**
- **≥0020 cap policy:** `session_ap.delta` for over-tier events is 0 (excluded), so `sessionTotal` is naturally ≤3. Topup formula behaves as expected.
- **≤0019 grandfather policy:** over-tier events still contribute, so `sessionTotal` can exceed 3. Topup is `max(0, 3 - sessionTotal) = 0`. The GM stages a `0/0/0` allocation; the milestone is recorded as claimed with no AP, and the character keeps the grandfathered overage. The rules-stated 3-per-session cap is still violated by the grandfather policy, but that's an existing legacy concession, not something milestone introduces.

**Reason annotation.** Milestone deltas always use `reason: "normal"`. The `cap` and `grandfathered` reasons belong to `session_ap` entries (pillar AP), not `milestone_spend`.

### Allocation command

```
weave allocate ap milestone \
  --character <id> \
  --session-id <session-NNNN> \         # NEW: required; ties milestone to a specific session
  --combat <n> --exploration <n> --social <n> \
  [--note "<text>"] [--dry-run]
```

**Behavior:** `allocate ap milestone` does **not** write to the ledger. It stages the GM's intent in the session report's `milestoneAllocations[]` array (analogous to `absenceAllocations[]`). The ledger entries (`session_ap` and `milestone_spend`) are emitted together by `weave apply ap` — see "Allocation order-independence" below.

**Validation at allocate-time** (eager checks; apply re-validates):
- Character must exist.
- `session-NNNN` must be a known session (planned or completed; logs need not yet be applied).
- Per-pillar values nonneg ints; sum is **0–3** inclusive (a 0-AP allocation is valid when `sessionTotal ≥ 3` under grandfather; the milestone is still claimed but grants no AP).
- No existing milestone allocation for (character, session) — dedup check.

**Eager top-up validation when possible:** if `session_ap` for (character, session) is already in the ledger (i.e. apply has run for the session's pillar AP), allocate computes `topUpAmount = max(0, 3 - pillarTotal)` and rejects splits that don't sum to it exactly. If `session_ap` is not yet present, allocate accepts any split summing 0–3 and defers final validation to apply.

**Behavior changes vs. current:**
- `--session-id` becomes required and explicit (was implicit "most recent completed").
- Sum target is `topUpAmount` (computed) when known, or 1–3 when deferred.
- Allocate writes to the session report, not the ledger.

### Schema impact

`MilestoneSpendEntrySchema` (`packages/schemas/src/schemas/ap-ledger.ts:33`):
- No structural change required — per-pillar `delta` is already `nonnegative` with no sum constraint at the schema layer.
- Semantic note: `sessionId` now means "the session this milestone is tied to" (not "session this was applied at"). Worth a comment on the schema.

**New scribe event** (`packages/schemas/src/schemas/scribe-event.ts`): replace the free-text `todo` workflow with a structured `milestone` event.

```typescript
export const MilestoneEventPayloadSchema = z.object({
  note: z.string(),
  // optional structured identity; lets two characters claim "the same" milestone reliably
  slug: z.string().optional(),
});
export const MilestoneEventSchema = makeEventSchema('milestone', MilestoneEventPayloadSchema);
```

- Scribe `ap milestone "<note>"` emits a `milestone` event (not a `todo`).
- The pre-existing free-text `todo` form is deprecated but still parseable for backfill of historical logs.
- Eligibility is computed from session attendance (see "Eligibility" below), not from the event payload — the event marks *that a milestone happened*, not *who it applies to*.

### Eligibility

A character is eligible for a milestone iff:
1. The milestone event appears in a completed session, AND
2. The character was **present** at that session (recorded via scribe `party add`).

Active-window logic (`introducedAt`/`retiredAt`) used for absence credits **does not** apply to milestones. A character who is "active" in the campaign but absent from the session in which the milestone was declared receives nothing for it. This matches the rules-as-written that milestones recognize narrative progress, which only attendees experienced.

### Status display impact

The proposed `weave status ap` milestone table (mirroring the absence-awards table):

| Column    | Meaning                                                                  |
|-----------|--------------------------------------------------------------------------|
| Eligible  | Count of milestone events in completed sessions the character attended   |
| Claimed   | Count of `milestone_spend` entries for the character                     |
| Unclaimed | `Eligible − Claimed`, floored at 0                                       |

Eligibility is **per-milestone, not per-AP**: a character whose top-up worked out to 0 AP is still "claimed" once the GM records the milestone for them. This keeps the table about milestone *events*, not AP.

The existing per-pillar AP totals table is unaffected — milestone deltas keep flowing into it the same way, just usually smaller numbers.

### Allocation order-independence

`weave apply ap` is the **single writer** of all ledger entries (`session_ap` + `milestone_spend`) for a session. `weave allocate ap milestone` only **stages intent** (in the session report's `milestoneAllocations[]`); it does not write to the ledger. This gives natural order-independence: apply reads the entire log plus all staged intents, computes the capped totals, and emits the right ledger entries in one batch.

**Apply's two-phase write per session:**

1. **Pillar AP phase.** Read the JSONL log, compute pillar AP per attending character per the existing rules (event tier-gates, era policies). Write `session_ap` entries — but **not yet committed** if there are staged milestone allocations; held in memory until phase 2 reconciles.
2. **Milestone phase.** Read `report.milestoneAllocations[]`. For each entry: compute `topUp = max(0, 3 - pillarTotal)`. Validate `entry.split` sums to exactly `topUp` (no rounding, no auto-clamp — strict). If valid, emit a `milestone_spend` ledger entry. If invalid, fail the whole apply with a clear message naming the character, session, expected sum, and provided sum.

**Order scenarios:**

- **Pillar-AP-first:** Apply runs, writes session_ap (no staged milestones, phase 2 is a no-op). Later, GM runs `allocate`, which stages intent and — since session_ap exists — eagerly validates the split against the computed topup. Re-run `apply ap S` to commit the milestone_spend entry.
- **Milestone-first:** GM runs `allocate` before any apply for the session. Allocate stages intent; topup can't be computed yet, so allocate accepts any split summing 1–3. Later `apply ap S` runs both phases together: pillar AP from log → topup → validate staged split → commit both ledger entries.
- **Either way, apply is idempotent**: if `session_ap` is already in the ledger for the session, phase 1 is a no-op; if `milestone_spend` is already there for (character, session), phase 2 skips that allocation.

**No correction entries, no negative deltas, no rounding rule.** The cap is enforced at write-time by validating GM intent against rules-derived pillar AP. If the GM's split doesn't fit, apply fails and the GM updates `milestoneAllocations[]` (or re-runs `allocate` after manually editing the report).

**Schema implication for the session report:** add `milestoneAllocations[]` to `SessionReport` (parallel to `absenceAllocations[]`):

```typescript
const MilestoneAllocationSchema = z.object({
  characterId: z.string(),
  pillarSplits: z.object({
    combat: z.number().int().nonnegative(),
    exploration: z.number().int().nonnegative(),
    social: z.number().int().nonnegative(),
  }),
  note: z.string().optional(),
  allocatedAt: z.string().datetime(),
});
```

## Migration of Existing Data

The campaign has exactly one milestone-related artifact today: a single `todo` event in one session's JSONL log with text starting `"Add AP for milestone:"`. There is **no** `milestone_spend` entry in the AP ledger yet — the GM hasn't run `weave allocate ap milestone` for it.

Migration steps (all hand-done, no script):

1. **Rewrite the JSONL log line** in `data/session-logs/sessions/session-NNNN_YYYY-MM-DD.jsonl`: change the `todo` event with `"Add AP for milestone: <note>"` text into a structured `milestone` event with `{ note: "<note>" }` payload.
2. **Allocate**: run the new `weave allocate ap milestone --session-id <S> --character <id> --combat … --exploration … --social …` for each present character. This populates `report.milestoneAllocations[]` in the (already completed) session report.
3. **Re-apply**: run `weave apply ap <S>`. Phase 1 is a no-op (`session_ap` already there). Phase 2 reads the staged allocations, validates each against the topup, and writes `milestone_spend` ledger entries.

If pillar AP for that session has not yet been applied, step 3 does both phases in one go.

## Resolved Decisions

1. **Eligibility = present in final session roster.** Determined by `party add` events; mid-session arrivals are eligible for milestones declared earlier in the same session.
2. **Structured milestone event.** A new `milestone` scribe event replaces the free-text `todo` workflow.
3. **Allocation order-independence via deferred-write.** `allocate ap milestone` stages intent in `report.milestoneAllocations[]`; `apply ap` is the single ledger writer and reconciles log + intent in one batch. No correction entries, no negative deltas, no rounding rule.
4. **Re-allocate is an error.** If `milestoneAllocations[]` already has an entry for (character, session), `allocate` errors. To revise: hand-edit the report.
5. **Bulk allocation UX: punted.** Per-character flags only for now.
6. **Migration is hand-edits only.** One JSONL log line rewritten + per-character `allocate` runs + one `apply` run.
7. **Rules text updates.** `../skyreach/data/articles/character-advancement.md` will be revised to describe the top-up model and tier interaction.
8. **Strict-fail on stale staged intent.** If apply finds a staged split that doesn't equal the computed topup, the whole apply fails with a clear message; GM updates the staged allocation and re-applies. No auto-clamp.
9. **Staged intent lives in the session report.** `report.milestoneAllocations[]`, parallel to `absenceAllocations[]`.
10. **Tier interaction is automatic.** `topup = 3 − sessionTotal` reads the era-clamped `session_ap` deltas, so per-character tier gating handled by `apply ap` flows through to milestone amounts naturally. Milestone has no `maxTier` of its own; everyone present is eligible. Milestone deltas always carry `reason: "normal"`.

## Files Likely Affected

| File                                                                | Change                                                                                                            |
|---------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------|
| `packages/schemas/src/schemas/scribe-event.ts`                      | Add `MilestoneEventSchema` (note + optional slug)                                                                 |
| `packages/schemas/src/schemas/session-report.ts`                    | Add `milestoneAllocations[]` field (mirrors `absenceAllocations[]`)                                               |
| `packages/schemas/src/schemas/ap-ledger.ts`                         | Comment on `sessionId` semantics for `milestone_spend`; no structural change                                      |
| `apps/cli/src/commands/scribe/handlers/ap.ts`                       | Emit structured `milestone` event (was: `todo` with prefix); keep parsing legacy `todo`-prefix logs for backfill  |
| `apps/cli/src/commands/scribe/help-text.ts`                         | Update help                                                                                                       |
| `apps/cli/src/commands/weave/commands/allocate-ap-milestone.ts`     | Stage intent in `report.milestoneAllocations[]` instead of writing to ledger; require `--session-id`; eager top-up validation when `session_ap` exists |
| `apps/cli/src/commands/weave/commands/allocate.ts`                  | Update `AllocateMilestoneArgs` (require sessionId); update parsing                                                |
| `apps/cli/src/commands/weave/commands/apply-ap.ts`                  | Phase 2 reconciler: read `report.milestoneAllocations[]`, validate against topup, emit `milestone_spend` entries  |
| `apps/cli/src/commands/weave/commands/status-ap.ts` + `status.ts`   | Add the milestone-awards table to status output                                                                   |
| `apps/cli/src/commands/weave/commands/allocate-ap-milestone.spec*`  | New test cases: stage intent, dedup error, eager top-up validation                                                |
| `apps/cli/src/commands/weave/commands/apply-ap.spec-int.ts`         | New test cases: milestone-first-then-apply (single batch), apply-then-allocate-then-reapply, mismatch fails apply |
| `docs/specs/milestone-ap.md`                                        | Mark superseded sections; link to this doc                                                                        |
| `docs/specs/weave-commands/allocate-ap.md`                          | Update command syntax for milestone subcommand                                                                    |
| `docs/specs/weave-commands/apply-ap.md`                             | Document the milestone phase-2 reconciler                                                                         |
| `docs/specs/ap-workflow-overview.md`                                | Add a Milestone Advancement section (currently silent on milestones)                                              |
| `../skyreach/data/articles/character-advancement.md`                | Rewrite Milestone Advancement section to describe top-up model and order-independence                             |

## Status

All ten resolved decisions above are confirmed by the GM. The spec is ready to drive implementation. No outstanding open questions.
