# Milestone AP Support

## Overview

Add milestone advancement point support to the CLI:
1. **Scribe**: `ap milestone "<note>"` - alias for `todo "Add AP for milestone: <note>"`
2. **Weave**: Refactor `weave allocate ap` to use subcommands `absence` and `milestone`

## Background

Per the character advancement rules, when the party reaches a major turning point in a plotline, each character gains 3 AP to allocate freely among the three pillars. This is distinct from absence credits (earned by missing sessions).

## Design Decisions

- **Breaking change**: Old `weave allocate ap --character ...` syntax will no longer work; must use `weave allocate ap absence ...`
- **Scribe simplicity**: `ap milestone` creates a `todo` event, not a distinct event type
- **Milestone AP**: Always 3 total, split across pillars by the user

---

## Command Specifications

### Scribe: `ap milestone "<note>"`

**Purpose**: Create a reminder to allocate milestone AP after the session.

**Syntax**:
```
ap milestone "<note...>"
```

**Behavior**:
- Creates a `todo` event with text `"Add AP for milestone: <note>"`
- Requires an active session

**Example**:
```
> ap milestone "Survived the Winter of 1512"
  todo added: Add AP for milestone: Survived the Winter of 1512
```

### Weave: `weave allocate ap absence`

**Purpose**: Spend unclaimed absence credits (existing functionality, now under subcommand).

**Syntax**:
```
weave allocate ap absence --character <id> --amount <n> \
  --combat <n> --exploration <n> --social <n> \
  [--note "<text>"] [--dry-run]
```

**Flags**:

| Flag                | Required | Description                                |
|---------------------|----------|--------------------------------------------|
| `--character <id>`  | Yes      | Character ID (starts new allocation block) |
| `--amount <n>`      | Yes      | Total credits to allocate                  |
| `--combat <n>`      | Yes*     | Combat pillar credits                      |
| `--exploration <n>` | Yes*     | Exploration pillar credits                 |
| `--social <n>`      | Yes*     | Social pillar credits                      |
| `--note "<text>"`   | No       | Optional note                              |
| `--dry-run`         | No       | Preview without applying                   |

*Pillar splits must sum to `--amount`.

**Validation**:
- Character must exist
- Character must have sufficient unclaimed absence credits
- Pillar splits must sum to amount

**Ledger Entry**: `absence_spend` (unchanged)

### Weave: `weave allocate ap milestone`

**Purpose**: Grant milestone AP to characters.

**Syntax**:
```
weave allocate ap milestone --character <id> \
  --combat <n> --exploration <n> --social <n> \
  [--note "<text>"] [--dry-run]
```

**Flags**:

| Flag                | Required | Description                                |
|---------------------|----------|--------------------------------------------|
| `--character <id>`  | Yes      | Character ID (starts new allocation block) |
| `--combat <n>`      | Yes*     | Combat pillar credits                      |
| `--exploration <n>` | Yes*     | Exploration pillar credits                 |
| `--social <n>`      | Yes*     | Social pillar credits                      |
| `--note "<text>"`   | No       | Milestone description                      |
| `--dry-run`         | No       | Preview without applying                   |

*Pillar splits must sum to 3 (the fixed milestone amount).

**Validation**:
- Character must exist
- Pillar splits must sum to 3
- No credit check (GM grants milestones directly)

**Ledger Entry**: `milestone_spend` (new)

### Multi-Character Allocation

Both subcommands support allocating to multiple characters in one invocation:

```bash
weave allocate ap milestone \
  --character alice --combat 1 --exploration 2 --social 0 --note "Winter" \
  --character bob --combat 0 --exploration 1 --social 2 --note "Winter"
```

---

## Schema Changes

### New Ledger Entry Type: `milestone_spend`

```typescript
const MilestoneSpendEntrySchema = z.object({
  kind: z.literal('milestone_spend'),
  advancementPoints: z.object({
    combat: ApSchema,
    exploration: ApSchema,
    social: ApSchema,
  }),
  appliedAt: z.string().datetime(),
  characterId: z.string(),
  notes: z.string().optional(),
  sessionId: SessionIdSchema,  // Most recent completed session
});
```

### Updated Discriminated Union

```typescript
export const ApLedgerEntrySchema = z.discriminatedUnion('kind', [
  AbsenceSpendEntrySchema,
  MilestoneSpendEntrySchema,  // NEW
  SessionApEntrySchema,
]);
```

---

## Implementation Plan

### Phase 1: Schema Changes

**Files**:
- `packages/schemas/src/schemas/ap-ledger.ts` - Add `MilestoneSpendEntrySchema`
- `packages/data/src/ap-ledger/aggregate.ts` - Handle `milestone_spend` in aggregation

**Verification**:
```bash
npm run build && npm run typecheck
```

### Phase 2: Scribe `ap milestone` Command

**Files**:
- `apps/cli/src/commands/scribe/handlers/ap.ts` - Add milestone subcommand handling
- `apps/cli/src/commands/scribe/help-text.ts` - Add help entry

### Phase 3: Weave Allocate Subcommands

#### Phase 3A: Create Milestone Handler

**New file**: `apps/cli/src/commands/weave/commands/allocate-ap-milestone.ts`

Key functions:
- `allocateMilestone(args)` - main logic
- `buildMilestoneSpendEntry()` - creates ledger entry
- `validateMilestonePillarSplits()` - ensures sum is 3

#### Phase 3B: Update Types and Parsing

**File**: `apps/cli/src/commands/weave/commands/allocate.ts`

Add:
- `AllocateMilestoneArgs` type
- `MilestoneAllocationBlock` type
- `parseMilestoneTokens()` function
- `allocateMilestoneFromCli()` entry point

#### Phase 3C: Refactor CLI Registration

**File**: `apps/cli/src/commands/weave/index.ts`

Replace single `allocateAp` command with parent + two subcommands (`absence`, `milestone`).

### Phase 4: Testing

**Unit tests**:
- `apps/cli/src/commands/weave/commands/allocate.spec.ts` - milestone parsing
- `apps/cli/src/commands/weave/commands/allocate-ap-milestone.spec.ts` (new)

**Integration tests**:
- `apps/cli/src/commands/weave/commands/allocate-ap-milestone.spec-int.ts` (new)

### Phase 5: Finalization

1. Run full test suite: `npm test`
2. Run typecheck: `npm run typecheck`
3. Create changeset: `npm run changeset`

---

## File Summary

| File                                                                     | Action                                  |
|--------------------------------------------------------------------------|-----------------------------------------|
| `packages/schemas/src/schemas/ap-ledger.ts`                              | Add `milestone_spend` schema            |
| `packages/data/src/ap-ledger/aggregate.ts`                               | Handle `milestone_spend` in aggregation |
| `apps/cli/src/commands/scribe/handlers/ap.ts`                            | Add `milestone` subcommand              |
| `apps/cli/src/commands/scribe/help-text.ts`                              | Add help entry                          |
| `apps/cli/src/commands/weave/index.ts`                                   | Refactor to subcommands                 |
| `apps/cli/src/commands/weave/commands/allocate.ts`                       | Add milestone types/parsing             |
| `apps/cli/src/commands/weave/commands/allocate-ap-milestone.ts`          | **NEW** - milestone handler             |
| `apps/cli/src/commands/weave/commands/allocate.spec.ts`                  | Add milestone parsing tests             |
| `apps/cli/src/commands/weave/commands/allocate-ap-milestone.spec.ts`     | **NEW** - unit tests                    |
| `apps/cli/src/commands/weave/commands/allocate-ap-milestone.spec-int.ts` | **NEW** - integration tests             |
