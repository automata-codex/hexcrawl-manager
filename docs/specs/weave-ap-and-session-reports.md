# Spec: `weave ap` + Session Reports v2

## 0. Goals & Non-Goals

**Goals**

* Add lifecycle’d session reports (v2) with `status: planned|completed`.
* Derive attendance/awards from session reports; write canonical AP ledger.
* Enforce rules: absence credits (derived), Tier-1-only absence spend, grandfather awards ≤ session 19, explicit caps ≥ 20.
* Ship minimal CLI: `weave session new`, `weave ap apply`, `weave ap status`, `weave ap allocate`.

**Non-Goals**

* Parsing PDFs at runtime (advancement thresholds come from a small config file).
* Rewriting historic session text beyond adding required v2 fields.
* Computing in-game CanonicalDate yet (keep free text for now).

---

## 1. Repository Layout

```
data/
  session-logs/                 # scribe output (unchanged)
    session_0012_2025-09-15.jsonl
  session-reports/              # NEW v2 reports (yaml)
    session-0012.yaml
  ap-ledger.jsonl               # single append-only ledger file

config/
  ap.json                       # AP rules config
  advancement.json              # level/tier thresholds (transcribed from PDF)

docs/
  dev/weave-ap-spec.md          # this file
```

---

## 2. Session Report v2 (YAML)

### 2.1 Lifecycle

* `status: planned` → GM drafts agenda, attendees, optional AP placeholders (`'-'`), optional downtime/absenceAllocations.
* `status: completed` → set by `weave ap apply`; AP numbers are concrete; `weave.*` stamped.

### 2.2 Required keys

Header:

* `schemaVersion: 2`
* `sessionKey: "session-####"` (4-digit zero-pad)
* `scribeIds: string[]` (e.g., `["session_0012_2025-09-15"]`)
* `sessionDate: YYYY-MM-DD` (real-world)
* `status: planned|completed`
* `source: scribe|import`
* `createdAt: ISO-8601` (optional)

Shared:

* `agenda: string[]`
* `gmNotes: string` (optional)
* `characterIds: (string | {characterName, playerName})[]` (strings = PCs; objects = guests)
* `downtime: {characterId, kind, notes?}[]` (optional; default `[]`)
* `absenceAllocations: {characterId, allocations:{combat,exploration,social}, notes?}[]` (optional; default `[]`)

AP:

* **planned**: `advancementPoints: { combat|exploration|social: number | '-' }` (optional; may contain `'-'`)
* **completed**: `advancementPoints: { combat|exploration|social: number }` (required; no `'-'`)
* `events: string[]` (completed; default `[]`)
* `weave: { appliedAt: ISO, weaveVersion: string, notes?: string }` (completed)

```ts
import { z } from 'zod';

// shared bits you already have
export const Pillar = z.enum(['combat','exploration','social']);
export const Reason = z.enum(['normal','cap','absence_spend','downtime','correction','grandfathered']);

export const SessionIdBlock = z.object({
  schemaVersion: z.number().int().min(2).default(2),
  sessionKey: z.string().regex(/^session-\d{4}$/), // e.g., session-0012
  scribeIds: z.array(z.string().regex(/^session_\d{4}_\d{4}-\d{2}-\d{2}$/)).min(1).optional(),
  createdAt: z.string().datetime().optional(),
  source: z.enum(['scribe','import']).default('scribe'),
});

const AgendaBlock = z.object({
  agenda: z.array(z.string()).default([]),
  gmNotes: z.string().optional(),
});

const AttendeeList = z.object({
  // strings = PCs; objects = guests (same as today)
  characterIds: z.array(z.union([z.string(), z.object({ characterName: z.string(), playerName: z.string() })])),
});

const DowntimeSchema = z.object({
  characterId: z.string(),
  kind: z.enum(['crafting','training','research','travel','other']),
  notes: z.string().optional(),
});

const AbsenceAllocationSchema = z.object({
  characterId: z.string(),
  allocations: z.object({
    combat: z.number().int().min(0).default(0),
    exploration: z.number().int().min(0).default(0),
    social: z.number().int().min(0).default(0),
  }),
  notes: z.string().optional(),
});

const PlannedAP = z.object({
  advancementPoints: z.object({
    combat: z.union([z.number().int().min(0), z.literal('-')]),
    exploration: z.union([z.number().int().min(0), z.literal('-')]),
    social: z.union([z.number().int().min(0), z.literal('-')]),
  }).optional(), // optional while planning
  downtime: z.array(DowntimeSchema).default([]),
  absenceAllocations: z.array(AbsenceAllocationSchema).default([]),
});

const RecordBlock = z.object({
  events: z.array(z.string()).default([]),
  // After apply, AP numbers should be concrete (no '-')
  advancementPoints: z.object({
    combat: z.number().int().min(0),
    exploration: z.number().int().min(0),
    social: z.number().int().min(0),
  }),
  downtime: z.array(DowntimeSchema).default([]),
  absenceAllocations: z.array(AbsenceAllocationSchema).default([]),
  // `weave` stamps this on completion
  weave: z.object({
    appliedAt: z.string().datetime(),
    weaveVersion: z.string(),
    notes: z.string().optional(),
  }),
});

// —— Discriminated union on status
export const PlannedSessionReport = z.object({
  status: z.literal('planned'),
  sessionDate: z.string(),        // real-world date; keep simple
}).and(SessionIdBlock).and(AgendaBlock).and(AttendeeList).and(PlannedAP);

export const CompletedSessionReport = z.object({
  status: z.literal('completed'),
  sessionDate: z.string(),
}).and(SessionIdBlock).and(AgendaBlock).and(AttendeeList).and(RecordBlock);

export const SessionReportV2 = z.discriminatedUnion('status', [
  PlannedSessionReport,
  CompletedSessionReport,
]);

export type SessionReportV2 = z.infer<typeof SessionReportV2>;
```
---

## 3. AP Rules (enforced in code)

* **Ledger canonical from session 1.**
* **Grandfather window:** sessions with key ≤ `"session-0019"` preserve awards (`reason: "grandfathered"`).
* **Caps from session 20+:** clamp over-cap awards; record `reason: "cap"`.
* **Absence credits:** 1 credit per missed session if not in `downtime[]`; **derived**, not stored.
* **Tier-1 only absence spend:** if current tier ≥ 2, `absence_spend` is recorded but **no pillar deltas** are written.

---

## 4. Config Files

### 4.1 `config/ap.json`

```json
{
  "grandfather": { "untilSessionKey": "session-0019" },
  "absence": { "creditPerMissedSession": 1, "exemptIfDowntime": true },
  "absenceSpend": { "tier1CapOnly": true }
}
```

### 4.2 `config/advancement.json`

* Transcribe from Character Advancement PDF:

```json
{
  "levels": [
    { "level": 1, "tier": 1, "apRequired": { "combat": 0, "exploration": 0, "social": 0 } }
    // ...
  ]
}
```

* Used by `computeLevelAndTier(totals, spec)`.

---

## 5. CLI Surface

### 5.1 `weave session new <####> [--date YYYY-MM-DD] [--scribe <id> ...]`

* Creates `data/session-reports/session-####.yaml` with:

  * header (status `planned`, sessionKey, scribeIds\[], sessionDate)
  * empty `agenda`, `characterIds`, `downtime`, `absenceAllocations`
  * optional AP placeholders set to `'-'`

### 5.2 `weave ap apply [--only session-####] [--dry-run]`

* Validates report (planned/completed).
* If `planned`:

  * Determine attendees (string entries in `characterIds`).
  * **Attendees:** write `session_ap` per numeric pillar (≤19 grandfathered; ≥20 cap/normal).
  * **Absences:** no write (credits derived).
  * **absenceAllocations:**

    * If current tier = 1 → write pillar `session_ap` with `reason:"absence_spend"`.
    * If tier ≥ 2 → write `absence_spend` only (no pillar deltas).
  * Flip to `status: completed`, coerce AP to numbers (error if any `'-'` remain), stamp `weave.*`.
* If already `completed`: re-apply is idempotent (skip duplicates).
* Append entries to `data/ap-ledger.jsonl`.

### 5.3 `weave ap status`

* Loads ledger + session reports.
* For each PC:

  * Fold ledger → `{combat, exploration, social, total, tier}`.
  * Compute **derived credits**: iterate sessions in order; if absent & not downtime & simulated tier<2 → `+1`; subtract all `absence_spend` allocation sums.
* Output balances + `creditsUnallocated` and list sessions with AP `'-'` gaps (if any).

### 5.4 `weave ap allocate --character <id> [combat=N] [exploration=M] [social=K]`

* Validate requested total ≤ derived credits.
* If tier = 1 → write pillar `session_ap` with `reason:"absence_spend"` (cap if needed per Tier-1 rules).
* If tier ≥ 2 → write `absence_spend` only.
* Append to ledger; echo new balances/credits.

---

## 6. Implementation Plan (modules & key functions)

### 6.1 Files/modules

```
cli/weave-session.ts            # session new
cli/weave-ap.ts                 # apply | status | allocate

lib/ap/config.ts                # loadAPConfig()
lib/ap/advancement.ts           # loadAdvancementSpec(), computeLevelAndTier()
lib/ap/reports.ts               # read/write/validate v2 YAML, status transition
lib/ap/ledger.ts                # readLedger(), appendLedgerEntry(), foldLedger(), isDuplicate()
lib/ap/credits.ts               # computeDerivedCredits(), enforceTier1AbsenceSpend()
lib/ap/sessions-index.ts        # list reports, parse keys, collect attendance/downtime per session

types/schemas.ts                # Zod schemas (as finalized)
```

### 6.2 Key functions (signatures)

```ts
// reports.ts
export function deriveSessionKeyFromReportPath(fp: string): string; // "session-####"
export function readReport(fp: string): Promise<SessionReportV2>;
export function writeReport(fp: string, doc: SessionReportV2): Promise<void>;
export function validateTransition(doc: SessionReportV2, to: 'completed'): { ok: boolean; errors?: string[] };

// sessions-index.ts
export function listReportFiles(dir='data/session-reports'): Promise<string[]>; // sorted
export function buildAttendanceIndex(): Promise<
  Array<{ key: string; attendees: string[]; downtimeIds: Set<string> }>
>;

// ledger.ts (single-file ledger)
export function readLedger(path='data/ap-ledger.jsonl'): Promise<APLedgerEntry[]>;
export function appendLedgerEntry(e: APLedgerEntry, path?: string): Promise<void>;
export function isDuplicate(existing: APLedgerEntry[], proposed: APLedgerEntry): boolean;
export function foldLedger(entries: APLedgerEntry[]): { combat:number; exploration:number; social:number; total:number; tier:1|2|3|4 };

// credits.ts
export function computeDerivedCredits(args: {
  characterId: string;
  sessions: Array<{key:string; attendees:string[]; downtimeIds:Set<string>}>;
  ledger: APLedgerEntry[];
  spec: LevelSpec[];
}): number;

export function enforceTier1AbsenceSpend(
  tier: 1|2|3|4,
  allocations: Record<Pillar, number>
): { effective: Record<Pillar, number>; blocked: boolean };

// advancement.ts
export type LevelSpec = { level:number; tier:1|2|3|4; apRequired: Record<Pillar, number> };
export function loadAdvancementSpec(): Promise<LevelSpec[]>;
export function computeLevelAndTier(totals: Record<Pillar,number>, spec: LevelSpec[]): { level:number; tier:1|2|3|4 };

// config.ts
export function loadAPConfig(): Promise<{
  grandfather:{ untilSessionKey:string },
  absence:{ creditPerMissedSession:number, exemptIfDowntime:boolean },
  absenceSpend:{ tier1CapOnly:boolean }
}>;
```

---

## 7. Migration (one-time scripts)

### 7.1 Upgrade old reports → v2

* Input: `data/sessions/` + `data/session-logs/`
* Output: `data/session-reports/session-####.yaml`
* For each session number:

  * Compute `{ sessionKey, scribeIds[] }` by grouping logs `session_####_YYYY-MM-DD.jsonl`.
  * Map old fields (agenda/events/AP/characterIds).
  * Ensure `downtime: []`, `absenceAllocations: []`.
  * Write YAML (status `planned` or `completed` per your preference; simplest is `planned` then let `apply` finalize).

### 7.2 Backfill ledger (idempotent)

* Walk v2 reports in numeric order.
* Apply the same logic as `weave ap apply` (grandfather ≤ 19, caps ≥ 20, absence spend Tier-1).
* Append to `data/ap-ledger.jsonl`; skip duplicates.
* Emit a JSON audit: gaps (`'-'`), capped awards ≥ 20, Tier-2+ absence spends blocked.

---

## 8. Idempotency & Safety

* Ledger is append-only JSONL; dedupe on `{kind,characterId,sessionKey,category?/allocations?,delta?}`.
* `apply` is safe to rerun; `status` is read-only; `allocate` checks available credits before writing.
* Status transition is one-way (`planned → completed`) unless `--force`.

---

## 9. Acceptance Criteria / Tests

* Re-running `apply` produces no duplicate ledger entries.
* Session `"session-0019"` awards marked `"grandfathered"`; `"session-0020"`+ clamp with `reason:"cap"`.
* Derived credits: increment for absences only while simulated tier < 2; stop thereafter.
* Tier-2+ `allocate` writes `absence_spend` only; no pillar deltas.
* Schemas validate both `planned` and `completed` shapes; `apply` errors if `completed` contains `'-'`.

---

## 10. Open Questions (tiny)

* Do you want `apply` to **error** if any AP pillar is `'-'` in a `planned` file, or **complete** the session but skip ledger writes for that pillar and record a warning in `weave.notes`? (I recommend: **error** to avoid silent gaps.)
* Any Tier-1 **per-pillar** caps beyond the “≥20 explicit caps” rule? If yes, add to `ap.json` and clamp in both `apply` and `allocate`.

---

If you want, I can also add a minimal scaffold for `cli/weave-session.ts` and `cli/weave-ap.ts` (command signatures + argument parsing) to kickstart Copilot on the implementation paths you’ll fill in.
