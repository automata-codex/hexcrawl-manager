# Milestone AP Reconciliation Implementation Plan

This plan implements the spec at `docs/specs/milestone-ap-reconciliation.md` in six phases, each independently buildable, testable, and revertable. Land them as separate PRs so review and git history stay scoped.

**Spec summary:** Replace the flat-3 milestone-grant model with a top-up model. Allocation stages intent in the session report; `weave apply ap` is the single ledger writer for both `session_ap` and `milestone_spend`. See the spec for full design.

---

## Phase 1: Schemas

**Goal:** Add the new event type and the session-report field. No behavior change yet — everything else builds on this.

**Work:**
- Add `MilestoneEventSchema` to `packages/schemas/src/schemas/scribe-event.ts` with payload `{ note: string, slug?: string }`.
- Register the new event in the `ScribeEventSchema` discriminated union.
- Add `MilestoneAllocationSchema` to `packages/schemas/src/schemas/session-report.ts` and a `milestoneAllocations: z.array(MilestoneAllocationSchema).default([])` field on `SessionHeader` (parallel to `absenceAllocations`).
- Comment update on `MilestoneSpendEntrySchema.sessionId` in `ap-ledger.ts`: it now means "the session this milestone is tied to," not "session this was applied at."
- Regenerate JSON schemas: `npm run build:json-schemas`.
- `npm run build && npm run typecheck` pass.

**Review focus:** Schema field naming consistency with `absenceAllocations`, payload shape for the milestone event, JSON schema regen output.

**Commit:** `feat(schemas): add milestone scribe event and session-report milestone allocations`

**Status:** Pending

---

## Phase 2: Scribe handler emits structured milestone event

**Goal:** Switch the scribe `ap milestone` handler from emitting a `todo` event with a magic prefix to emitting the new structured `milestone` event.

**Work:**
- Update `apps/cli/src/commands/scribe/handlers/ap.ts` to emit a `milestone` event (payload `{ note }`) when the user runs `ap milestone "<note>"`.
- Keep a small parser path for legacy `todo` events whose text starts with `"Add AP for milestone:"` so historical logs still surface as milestones — used by Phase 5 status computation. Add a TODO to delete this fallback once the migration in Phase 6 lands.
- Update `apps/cli/src/commands/scribe/help-text.ts`.
- Unit test: `ap milestone "Survived the Winter"` writes a milestone event with the expected payload.
- Unit test: a legacy `todo` event with the magic prefix is recognized as a milestone marker by the parser.

**Review focus:** Event payload shape, legacy-prefix parser, no regression in other `ap` subcommands.

**Commit:** `refactor(scribe): emit structured milestone events instead of todos`

**Status:** Pending

---

## Phase 3: Weave allocate stages intent (no ledger write)

**Goal:** Rewrite `weave allocate ap milestone` to stage intent in `report.milestoneAllocations[]` instead of writing to the AP ledger.

**Work:**
- Rewrite `apps/cli/src/commands/weave/commands/allocate-ap-milestone.ts`:
  - Require `--session-id`.
  - Validate character exists; session is known (planned or completed).
  - Per-pillar values nonneg ints; sum 0–3 inclusive.
  - Dedup check: error if `report.milestoneAllocations[]` already contains an entry for (character, session).
  - **Eager top-up validation:** if `session_ap` for (character, session) is in the ledger, compute `topUp = max(0, 3 - pillarTotal)` and reject splits that don't sum to `topUp` exactly.
  - **Deferred validation:** if `session_ap` is absent, accept any split summing 0–3 and stage it.
  - Append to `report.milestoneAllocations[]` (read report YAML, modify, write back).
- Update `apps/cli/src/commands/weave/commands/allocate.ts` types and parsing to require `sessionId`.
- Drop the existing `MILESTONE_AP_AMOUNT = 3` constant.
- Update `docs/specs/weave-commands/allocate-ap.md` to match new syntax and behavior.
- Unit tests in `allocate.spec.ts` and `allocate-ap-milestone.spec.ts`:
  - Eager-validate-pass: session_ap exists with pillarTotal=2, GM stages 1/0/0 → success.
  - Eager-validate-fail: session_ap exists with pillarTotal=2, GM stages 2/0/0 → error citing topup=1.
  - Deferred-stage: no session_ap, GM stages 1/1/1 → success, intent in report.
  - Dedup-error: existing allocation for (X, S), GM tries again → error.
  - Sum-zero allowed: pillarTotal=4 (grandfathered), GM stages 0/0/0 → success.
- Integration test in `allocate-ap-milestone.spec-int.ts`: full path from CLI invocation through report file modification.

**Review focus:** No ledger writes from this command; eager-vs-deferred branching; dedup semantics; report file write atomicity.

**Commit:** `refactor(weave): stage milestone intent in session report instead of ledger`

**Status:** Pending

---

## Phase 4: Weave apply reconciles intent into ledger

**Goal:** Add the phase-2 reconciler to `weave apply ap` so it consumes `report.milestoneAllocations[]` and emits `milestone_spend` ledger entries.

**Work:**
- Extend `apps/cli/src/commands/weave/commands/apply-ap.ts`:
  - After writing `session_ap` entries (existing logic), iterate `report.milestoneAllocations[]`.
  - For each entry: compute `topUp = max(0, 3 - pillarTotal)` from the just-written or already-present `session_ap`.
  - **Strict-fail:** if `entry.pillarSplits` doesn't sum to `topUp` exactly, fail the entire apply with a message naming character, session, expected sum, provided sum. No auto-clamp.
  - If valid, append a `milestone_spend` ledger entry with `reason: "normal"` on each pillar.
  - **Idempotency:** skip allocations whose `milestone_spend` is already in the ledger (matched by `characterId + sessionId`).
- Update the apply fingerprint check to include the milestone-allocations content (so re-running apply after a new allocation actually does the phase-2 write rather than no-op'ing).
- Update `docs/specs/weave-commands/apply-ap.md` to document the milestone phase.
- Integration tests in `apply-ap.spec-int.ts`:
  - Milestone-first-then-apply: stage allocation in planned report, run apply, verify both `session_ap` and `milestone_spend` written.
  - Apply-then-allocate-then-reapply: apply once (only session_ap), allocate, reapply (now writes milestone_spend).
  - Mismatch-fails-apply: stage 1/1/1 when pillarTotal will be 2 (topup=1), apply fails with clear message; verify no partial ledger writes.
  - Idempotency: apply twice with the same intent; second call writes nothing new.
  - Tier-aware topup: T1 character with 2 pillar AP gets 1 milestone AP; T2 character with 1 pillar AP (combat gated out) gets 2 milestone AP — both end at 3.
  - Grandfather-overage: ≤0019 session with pillarTotal=4 and a 0/0/0 staged allocation; apply writes a zero-delta `milestone_spend` and the character keeps the overage.

**Review focus:** Strict-fail semantics, idempotency fingerprint, error messages, grandfather edge case. This is the load-bearing PR — review carefully.

**Commit:** `feat(weave): apply ap writes milestone_spend from staged allocations`

**Status:** Pending

---

## Phase 5: Weave status milestone awards table

**Goal:** Add a per-character milestone awards table to `weave status ap` output, mirroring the absence awards table.

**Work:**
- Create `apps/cli/src/commands/weave/lib/core/compute-unclaimed-milestone-awards.ts`:
  - Inputs: session reports, characters, AP ledger.
  - For each character: count milestone events in completed sessions where the character was present (final attendance roster). Count `milestone_spend` ledger entries. Compute unclaimed.
  - Returns rows: `{ characterId, displayName, eligible, claimed, unclaimed }`.
- Wire into `apps/cli/src/commands/weave/commands/status-ap.ts`: extend `StatusApResult` with `milestoneAwards` field.
- Add a third printed table in `apps/cli/src/commands/weave/commands/status.ts` after the absence awards table, using the same `pad`/divider pattern.
- Unit tests for `compute-unclaimed-milestone-awards.ts`: present-with-milestone, absent-from-milestone-session, mid-session arrival, multiple milestones across sessions, retired character.
- Integration test extending `status-ap.spec-int.ts`: seed a milestone event + `milestone_spend` entry, assert the new table rows.

**Review focus:** Eligibility computation (present-at-session, not active-window); table formatting consistency with the absence table; legacy-prefix parser path still works for the one historical milestone until Phase 6 migrates it.

**Commit:** `feat(weave): show milestone awards in weave status ap`

**Status:** Pending

---

## Phase 6: Migration, rules text, and spec cleanup

**Goal:** Migrate the one extant milestone, update the canonical rules article, and mark the old spec superseded.

**Work:**
- **Data migration** (in the `../skyreach` data repo):
  - Identify the JSONL log line: `data/session-logs/sessions/session-NNNN_*.jsonl` containing the `todo` event with `"Add AP for milestone:"` prefix.
  - Hand-edit that line into a structured `milestone` event with `{ note }` payload.
  - Run `weave allocate ap milestone --session-id <S> --character <id> ...` for each character present in that session, with the pillar splits each player chose for their own character.
  - Run `weave apply ap <S>` (or `weave apply ap` to pick it up automatically). Verify `milestone_spend` entries appear in the ledger.
  - Verify `weave status ap` shows the milestone in the new table.
  - Commit in the data repo: `chore(data): migrate session-NN milestone to structured event`
- **Rules text** (in the `../skyreach` data repo):
  - Rewrite the Milestone Advancement section in `data/articles/character-advancement.md` to describe the top-up model: per-character topup based on session pillar AP, milestone has no tier gate, present-at-session eligibility, the worked example.
  - Commit in the data repo: `docs(rules): describe top-up milestone model`
- **Spec cleanup** (in this repo):
  - Mark `docs/specs/milestone-ap.md` superseded with a header note linking to `milestone-ap-reconciliation.md`.
  - Add a Milestone Advancement subsection to `docs/specs/ap-workflow-overview.md` (currently silent on milestones), describing the two-phase apply, present-at-session eligibility, and the topup formula.
  - Delete the legacy-prefix fallback parser added in Phase 2 (no historical logs left to need it after migration).
  - Add a changeset: `npm run changeset`.
  - Commit: `docs(specs): supersede milestone-ap.md, document apply-ap milestone phase`

**Review focus:** Migration correctness (the one historical milestone winds up with the right per-character splits), rules article wording, fallback parser removed.

**Status:** Pending

---

## Phase Dependencies

```
Phase 1 ──┬── Phase 2 (scribe) ──┐
          │                       │
          ├── Phase 3 (allocate)──┼── Phase 4 (apply) ──┬── Phase 6 (migration + docs)
          │                       │                     │
          └── Phase 5 (status) ───┴─────────────────────┘
```

- **Phase 1** unblocks everything.
- **Phase 2 and 3** are independent of each other; can be reviewed in parallel.
- **Phase 4** depends on Phase 3 (needs `milestoneAllocations[]` populated to test against).
- **Phase 5** depends on Phase 1 only; the status table works with the legacy-prefix parser even before Phase 4 lands. Land it whenever convenient.
- **Phase 6** is last; the feature must be working end-to-end before migrating real data.

## Compression Options

If you want fewer PRs:
- **Phase 1 + Phase 2** can land together (small additive schema + small handler change). Pro: removes a trivial PR. Con: ties two reviews together.
- **Phase 5 + Phase 6** can land together (status display + migration + cleanup). Pro: status table tested against migrated data. Con: bigger final PR.
- Resist merging Phase 3 and Phase 4 — that's where the design's nuance lives.

Minimum recommended split: 4 PRs (1+2, 3, 4, 5+6).
