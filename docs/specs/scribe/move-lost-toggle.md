# Spec: Update `move` to support the `lost` toggle

## Purpose

Allow the `move` command to record that the party **arrived** in a hex **and** became **lost** as a consequence of that movement, via a single flag. This preserves “scribe records facts; it doesn’t adjudicate.”

## Scope

* **In scope:** `move` command parsing/validation; event emission for `move`; conditional emission of a `lost` event.
* **Out of scope:** time tracking, dead-reckoning, backtrack logic, encounter/trail adjudication, or any map math beyond hex ID validation/normalization.

## Command signature

```
move <HEX_ID> [lost] [pace=<slow|normal|fast>]
```

* `HEX_ID` (required): case-insensitive; normalize to canonical form (e.g., `P14`).
* `lost` (optional): if present, the command also records that the party became lost.
* `pace` (optional): if provided, include it in the `move` event; otherwise default to existing behavior (your current default appears to be `"slow"` when unspecified—keep whatever your tool currently does).

## Behavior

1. **Arrival is authoritative.** `move` always means “we arrived in `<HEX_ID>`.” No intent/destination semantics.
2. **Zero duration.** Do not emit/modify time.
3. **Lost toggle.**

  * If `lost` is present and current lost state is **off/unknown**, emit a `lost` event that turns it **on**.
  * If `lost` is present but state is **already on**, suppress a duplicate “on” event (idempotent).
  * If `lost` is absent, do not change lost state.

## Events emitted

Emit events **atomically** and **in order** (same timestamp; your logger will assign `seq` and `ts`).

### 1) `move`

* **Shape** (fields shown are within `payload`; `seq` and `ts` are auto-assigned by your logger):

```json
{"kind":"move","payload":{"from":"<PREV_HEX>","to":"<HEX_ID>","pace":"<pace>"}}
```

* `from`: the last known hex (i.e., the `to` from the most recent `move` in this session/log).
* `to`: normalized `<HEX_ID>`.
* `pace`: `"slow" | "normal" | "fast"` (per command arg or default).

### 2) (optional) `lost`

* **Only** when `lost` flag present **and** current lost state is not already `on`:

```json
{"kind":"lost","payload":{"state":"on","reason":"nav-fail"}}
```

* `reason`: fixed string `"nav-fail"` (we’re not adjudicating details; just tagging cause class).
* If already lost, do **not** emit a second `lost` event.

## Validation

* **HEX\_ID**: validate against your hex scheme; normalize to canonical uppercase letter(s)+digits (e.g., `P14`). On invalid input, print a friendly error and emit **no** events.
* **pace**: if provided, validate; on invalid value, show usage and emit **no** events.

## CLI UX

* Success messages (examples; keep your house style):

  * `Moved to R14.`
  * `Moved to R14. Lost state: ON.` (only when a new `lost` event is emitted)
  * `Moved to R14. (Already lost.)` (when `lost` was passed but state unchanged)
* Usage string should show: `move <HEX_ID> [lost] [pace=slow|normal|fast]`

## Examples (expected emissions)

> (*`seq` and `ts` omitted here; your logger assigns them.*)

**A) `move r14`**

```json
{"kind":"move","payload":{"from":"P13","to":"R14","pace":"normal"}}
```

**B) `move p14 lost` (party was not lost)**

```jsonl
{"kind":"move","payload":{"from":"R14","to":"P14","pace":"normal"}}
{"kind":"lost","payload":{"state":"on","reason":"nav-fail"}}
```

**C) `move q13 lost` (party already lost)**

```json
{"kind":"move","payload":{"from":"P14","to":"Q13","pace":"normal"}}
```

**D) `move t12 pace=fast`**

```json
{"kind":"move","payload":{"from":"Q13","to":"T12","pace":"fast"}}
```

## State rules (for downstream derivation; not enforced here)

* **Current hex** = `payload.to` of the latest `move`.
* **Lost state** = last `lost` event’s `payload.state` (`"on"`/`"off"`). `move` only changes this when the `lost` flag is present and state flips to `on`.

## Edge cases

* **Repeat `move` to same hex**: still emit a `move` event (append-only log).
* **`move` while already lost (no `lost` flag)**: allowed; emits `move` only.
* **`move … lost` when already lost**: emit `move` only (suppress duplicate `lost on`).
* **Missing HEX\_ID**: print usage; emit no events.

## Test checklist (high level)

1. `move` emits a single `move` with normalized `to` and correct `from`.
2. `move … lost` emits `move` then `lost` when prior state is **not** lost.
3. `move … lost` emits **only** `move` when prior state is already lost.
4. Invalid hex → no events.
5. `pace` validation and propagation to `payload.pace`.
