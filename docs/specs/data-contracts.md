# Data Contracts (Semantics)

> **File:** `docs/specs/data-contracts.md`
>
> **Purpose:** Explain how `weave` commands interpret the centrally defined Zod/TS schemas.
>
> **Source of truth:** Zod schemas (and derived TS types) in the top-level **`schemas/`** directory. This doc does **not** duplicate schema code; it defines meanings, defaults, and constraints the commands rely on.

---

## 1) Where the schemas live

- **Session Report schema:** `schemas/session-report.ts` (or equivalent)
- **AP Ledger schema:** `schemas/ap-ledger.ts` (or equivalent)
- **(Migration only) Reconciliation Report schema:** produced by the one-time migration script; shape summarized in §5.

_Add/adjust the exact filenames once finalized._

---

## 2) Shared enums & identifiers

- **Session status:** `"planned" | "completed"`.
- **AP reason (six total):**
  `"normal" | "cap" | "absence_spend" | "downtime" | "correction" | "grandfathered"`.
- **Session ID format:** `session-####` (4-digit zero-padded).
- **Scribe log basename pattern:**
  `session-####_YYYY-MM-DD.jsonl` or `session-####{a|b|c}_YYYY-MM-DD.jsonl`.
- **AP event gate:** events carry `{ number, maxTier }` (see `schemas`).
- **Character tier is derived from level:** 1–4→Tier 1, 5–10→Tier 2, 11–16→Tier 3, 17–20→Tier 4 (missing level ⇒ Tier 1).

---

## 3) Session Report (planned → completed)

### 3.1 Identification & file rules
- **Path:** `data/session-reports/session-####.yaml`
- **`id`** must equal the file’s session ID (`session-####`).
- **`status`** is `"planned"` or `"completed"`. Completed reports are **immutable**.
- Exactly **one** report (planned or completed) per `session-####`.

### 3.2 Planned report fields (authoring-time)
Minimal expected fields:
- `id: "session-####"`
- `status: "planned"`
- `agenda?: string`
- `notes?: string`
- `gameStartDate?: string` (in-world date; optional)

**Never present** in planned: `attendance.characterIds`, pillar AP, `absenceAllocations[]`.

### 3.3 Completed report fields (produced by `weave ap apply`)
- **`scribeIds: string[]`**
  Basenames of **all** finalized log parts for the session; must exist under `data/session-logs/sessions/`.
  Sorted by date (YYYY-MM-DD in filename), then by suffix (no suffix < `a` < `b` …). No duplicates.

- **`sessionDate: string`**
  **Earliest real-world timestamp across all parts** (overwrites any planned value).

- **`gameStartDate?: string`, `gameEndDate?: string`**
  From in-world log events (if present). `gameEndDate` is the in-world end of play.

- **`attendance`**
  - `characterIds: string[]` — unique set derived from logs (guests excluded).
  - `guests?: { name: string; note?: string }[]` — **guest players** who participated but **do not** have character files/IDs. Guests **never** receive AP, absence credits, or ledger entries; informational only.

- **Per-character pillar results** (see §3.4):
  For each attending character, store per-pillar deltas as computed by `ap apply`.
  If no AP events for an attending character: record `{ delta: 0, reason: "normal" }` for each pillar.

- **`absenceAllocations[]`** (appended by `weave ap allocate`)
  Human-readable audit showing which **absence credits** were spent **in association with the most recent completed report** at the time of allocation.
  Minimum: `characterId`, `amount`, `createdAt`. Optional: `note`, `by`, pillar targeting metadata (if your UI captures it). Append-only.

### 3.4 Pillar delta shape & **reason** semantics
Per character, per pillar (`combat`, `exploration`, `social`), the value stored in reports/ledger is:

```ts
{ delta: number,
  reason: "normal" | "cap" | "absence_spend" | "downtime" | "correction" | "grandfathered",
  note?: string }
```

**Reason meanings (command expectations):**
- **`normal`** — Award from play logs within the event gate (no over-tier events involved).
- **`cap`** — Session ≥ `session-0020`; some **over-tier** events were **excluded** due to tier. (Delta reflects only eligible events.)
- **`grandfathered`** — Session ≤ `session-0019`; over-tier events still counted under grandfather policy.
- **`absence_spend`** — Pillar progress from spending absence credits (usually Tier 1); the transaction is also recorded as `absence_spend` entry in the ledger.
- **`downtime`** — Pillar progress explicitly awarded for downtime activities (separate from absence credits).
- **`correction`** — Manual adjustment to fix past errors (migration or GM correction).

**Reason selection policy (pillar-level outcome):**
- **≤0019:** if any over-tier event (T > event.maxTier) contributed to the pillar, set `"grandfathered"`; else `"normal"`.
- **≥0020:** events over-tier are excluded; if any were excluded for the pillar, set `"cap"`; else `"normal"`.

**`note`** (optional): short free-text carried from the originating event (e.g., “Boss fight,” “Mapped Region 4”); purely informational.

### 3.5 Completion & immutability
- `weave ap apply` **creates** a completed report **even if** no planned report exists.
- If a planned report exists, it is replaced only when **git is clean**; otherwise `ap apply` fails with guidance.
- Once `status: "completed"`, reports are **immutable**; re-applying with the same fingerprint is a no-op.

---

## 4) AP Ledger

### 4.1 Canonical, append-only
- The ledger is **canonical** from session-0001.
- Entries are **appended** only; existing records are not mutated.

### 4.2 Entry kinds
- **`session_ap`** — one per **(session, character)** produced by `weave ap apply`.
- **`absence_spend`** — one per allocation produced by `weave ap allocate`.

### 4.3 `session_ap` semantics
Required (names per schema):
- `sessionId: "session-####"`
- `characterId: string`
- `pillars: { combat, exploration, social }` with values shaped per §3.4.

Optional audit fields (if schema provides):
- `source?: { scribeIds?: string[]; appliedAt?: string }`
- `fileHash?: string` (not required; idempotency uses `{ sessionId, sorted scribeIds }`)

**Deterministic rules (recap):**
- Sessions **≤ 0019**: over-tier awards → `grandfathered`; others `normal`.
- Sessions **≥ 0020**: **exclude** over-tier events → pillar `reason: "cap"` if any exclusion occurred.
- **Missing `event.maxTier`** → treat as **1**.
- Attending character with **no AP** in logs → `{ delta: 0, reason: "normal" }`.

### 4.4 `absence_spend` semantics
- Records a **spend** of derived absence credits (the transaction itself).
- Minimum: `characterId`, `amount`, `createdAt`, and an association (e.g., `sessionIdSpentAt`).
- Optional: `note`, `by`, and pillar targeting metadata if credits are translated to pillar deltas (Tier 1).
- **Tier policy:**
  - **Tier 1:** may also create pillar deltas with `reason: "absence_spend"` (in addition to the transaction record).
  - **Tier 2+:** record **only** the `absence_spend` entry; **do not** create pillar deltas.

> `weave ap status` **derives** absence **credits** at runtime (Tier-1 & **not in downtime** for that session). Credits are **never** persisted; only **spends** are.

### 4.5 `correction` recording (recommended)
- Prefer a dedicated `session_ap` entry with pillar deltas carrying `reason: "correction"`, tied to the **current** `sessionId` when the correction is made (or a designated “admin” session).
- Keep the correction small, explicit, and include a `note` describing the rationale.

---

## 5) Reconciliation Report (migration only)

Produced by the one-time migration script to compare ledger totals vs character YAML totals.

**Suggested minimum shape:**
- `summary`: `{ characters: number, sessionsProcessed: number, diffs: number }`
- `perCharacter[]`:
  - `characterId`
  - `ledgerTotals`: `{ combat: number, exploration: number, social: number }`
  - `fileTotals`: `{ combat: number, exploration: number, social: number }`
  - `diff`: `{ combat: number, exploration: number, social: number }`
  - `notes?: string[]` (e.g., “missing level; treated as Tier 1”)

---

## 6) Normalization & validation

- **IDs**
  - `sessionId` must match `session-####` and be unique across report/ledger joins.
  - `characterId` must resolve to a known character file (commands fail fast otherwise).

- **`scribeIds[]`**
  - Basenames only; must exist under `data/session-logs/sessions/`.
  - Must be the **complete** set for the session (includes multi-part `a`, `b`, … if present).
  - Stored **sorted**; duplicates rejected.

- **Attendance**
  - `attendance.characterIds[]` is unique, **log-derived**; guests are separate in `attendance.guests[]` and never included in AP.

- **Immutability**
  - Reports with `status: "completed"` are not edited by any command.

- **Ledger**
  - Enforce append-only writes; prevent duplicate `session_ap` for the same `{ sessionId, characterId }` on idempotent re-runs.

---

## 7) Defaults & derived values

- **Tier from level** (no stored tier): 1–4→Tier 1, 5–10→Tier 2, 11–16→Tier 3, 17–20→Tier 4.
  - **Missing level** ⇒ Tier 1.
- **AP event default:** missing `event.maxTier` ⇒ **1**.
- **No AP in logs for an attending character** → `{ delta: 0, reason: "normal" }`.
- **Absence credit derivation** (read-only in `status`):
  - +1 credit if **Tier 1** and **no** downtime entry for that session; otherwise 0.
  - Credits are **not stored**; only `absence_spend` is persisted (and, for Tier 1, optional pillar deltas with `reason: "absence_spend"`).

---

## 8) Compatibility

- Adding optional fields (e.g., `note`, `source.appliedAt`, `attendance.guests[]`) is additive and must not change existing behavior.
- Commands tolerate unknown fields in reports/ledger (forward compatibility).
- If schema evolution changes persisted artifacts, add a note under `docs/dev/migrations/`.

---

## 9) Cross-references

- **Workflow:** `docs/specs/ap-workflow-overview.md`
- **Commands:** `docs/specs/weave-commands/` — `ap-apply.md`, `ap-status.md`, `ap-allocate.md`, `session.md`
- **Migration (one-time):** `docs/dev/migrations/2025-AP-ledger-migration.md`
- **Tests:** `docs/dev/ap-test-matrix.md`
