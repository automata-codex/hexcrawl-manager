# Milestone AP Migration Runbook (Phase 6)

This runbook walks through migrating the one extant milestone artifact (a
legacy `todo`-prefix entry in session-0028) to the new top-up model. Run it
once after Phases 1–5 have landed and before deleting the legacy-prefix
fallback in `status-ap.ts`.

> Branch hygiene: do this work on a dedicated branch in **both** repos so
> the JSONL edit, the report YAML write, and the ledger append commit
> together as one logical change.

## Target

- **Session:** `session-0028` (March 22, 2026 IRL).
- **Milestone:** "Retrieve Nightbane".
- **Party present:** `alistar`, `quince`, `milly`, `daemaris`.
- **Pillar AP each character earned that session:** 1 combat + 0 exploration + 1 social = **pillar total 2 → topup 1 AP per character**.

## Step 1 — Rewrite the JSONL log entry (data repo)

In `../skyreach/data/session-logs/sessions/session-0028_2026-03-22.jsonl`,
replace the line:

```jsonl
{"seq":27,"ts":"2026-03-28T17:24:51.010Z","kind":"todo","payload":{"text":"Add AP for milestone: Retrieve Nightbane"}}
```

with:

```jsonl
{"seq":27,"ts":"2026-03-28T17:24:51.010Z","kind":"milestone","payload":{"note":"Retrieve Nightbane"}}
```

Same `seq` and `ts` so audit trail and downstream re-runs stay deterministic.

## Step 2 — Stage milestone allocations (per character)

Each character gets 1 AP of milestone topup. The pillar choice is GM
judgment — the worked example below allocates 1 exploration to every
character (since exploration was the pillar that didn't earn this session),
but you can pick differently per character.

```bash
# Run from anywhere with ACHM_DATA_PATH set to ../skyreach/data
export ACHM_DATA_PATH="$(pwd)/../skyreach/data"  # adjust path as needed

npm run cli -- weave allocate ap milestone \
  --character alistar  --session-id session-0028 --combat 0 --exploration 1 --social 0 --note "Retrieve Nightbane" \
  --character quince   --session-id session-0028 --combat 1 --exploration 0 --social 0 --note "Retrieve Nightbane" \
  --character milly    --session-id session-0028 --combat 0 --exploration 1 --social 0 --note "Retrieve Nightbane" \
  --character daemaris --session-id session-0028 --combat 1 --exploration 0 --social 0 --note "Retrieve Nightbane"
```

The command will eagerly validate that each character's split (sum 1)
matches the computed topup (3 − 2 = 1). It writes intent to
`session-reports/session-0028.yaml` under `milestoneAllocations[]` and
prints a reminder to run `weave apply ap session-0028`.

## Step 3 — Apply

```bash
npm run cli -- weave apply ap session-0028
```

The session-0028 fingerprint already matches an existing completed report,
so Phase 1 (pillar AP) is a no-op. Phase 2 reads the staged allocations and
appends four `milestone_spend` ledger entries — one per character.

## Step 4 — Verify

```bash
npm run cli -- weave status ap
```

Expected output in the new Milestone Awards table:

```
Milestone Awards:
-------------------------------------------------
Character         Eligible  Claimed  Unclaimed
-------------------------------------------------
Alistar           1         1        0
Daemaris          1         1        0
Milly             1         1        0
Quince            1         1        0
…  (all other characters: 0/0/0)
-------------------------------------------------
```

The per-pillar AP totals for the four characters should each show 1
additional exploration AP credit (or whichever pillars you chose).

## Step 5 — Commit (data repo)

```bash
cd ../skyreach
git add data/session-logs/sessions/session-0028_2026-03-22.jsonl \
        data/session-reports/session-0028.yaml \
        data/ap-ledger.jsonl
git commit -m "chore(data): migrate session-0028 milestone to structured event"
```

## Step 6 — Remove the legacy-prefix fallback (code repo)

Once the data migration is committed, the legacy-prefix branch in
`apps/cli/src/commands/weave/commands/status-ap.ts` is no longer needed —
no historical logs contain it anymore. Open a small follow-up PR that:

1. Removes the `LEGACY_MILESTONE_TODO_PREFIX` constant and the loop that
   counts `report.todo[]` entries with that prefix in
   `collectMilestoneCountsBySessionId()`.
2. Updates the integration test in `status-ap.spec-int.ts` that exercised
   the legacy path so it instead seeds a structured `milestone` event in
   the JSONL log.

> The fallback can also be left in place permanently if you'd prefer
> defense-in-depth against any future hand-rolled legacy logs. It's a few
> lines of code.

## Sanity checks before commit

- [ ] `npm test` passes in the code repo.
- [ ] `git diff` in the data repo shows: 1 JSONL line changed (todo → milestone), 1 YAML report with `milestoneAllocations[]` populated, 4 new lines appended to `ap-ledger.jsonl`.
- [ ] `weave status ap` Milestone Awards table shows the four characters with `Eligible 1 / Claimed 1 / Unclaimed 0` and everyone else `0/0/0`.
- [ ] Per-pillar AP totals for the four characters are unchanged from before migration in combat and social, and **+1** in whichever pillar(s) you allocated the milestone to.
