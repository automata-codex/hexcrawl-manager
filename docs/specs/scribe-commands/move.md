# Spec: `move` Command

## Purpose

The `move` command records that the party has arrived in a specified hex, optionally marking the party as lost and/or specifying the pace of travel. It is a fact-recording command, not an adjudication tool.

## Command Signature

```
move <HEX_ID> [lost] [pace=slow|normal|fast]
```

- `HEX_ID` (required): The destination hex. Case-insensitive; normalized to canonical form (e.g., `P14`).
- `lost` (optional): If present, records that the party became lost as a result of this move.
- `pace` (optional): If provided, must be one of `slow`, `normal`, or `fast`. Defaults to `normal` if not specified.

## Behavior

1. **Arrival is authoritative.** `move` always means “we arrived in `<HEX_ID>`.”
2. **Zero duration.** Does not emit or modify time.
3. **Lost toggle:**
   - If `lost` is present and the current lost state is **off/unknown**, emits a `lost` event to turn it **on**.
   - If `lost` is present but the state is **already on**, does not emit a duplicate `lost` event (idempotent).
   - If `lost` is absent, does not change lost state.
4. **Adjacency check:**
   - Warns if the destination hex is not adjacent to the current hex, but still allows the move.
5. **Validation:**
   - Validates `HEX_ID` against the hex scheme. On invalid input, prints an error and emits no events.
   - Validates `pace` if provided. On invalid value, prints usage and emits no events.

## Events Emitted

Events are emitted atomically and in order (same timestamp; logger assigns `seq` and `ts`).

### 1) `move`

```json
{"kind":"move","payload":{"from":"<PREV_HEX>","to":"<HEX_ID>","pace":"<pace>"}}
```
- `from`: The last known hex (the `to` from the most recent `move` event).
- `to`: Normalized `<HEX_ID>`.
- `pace`: `"slow" | "normal" | "fast"` (per command arg or default).

### 2) (optional) `lost`

Emitted only when `lost` flag is present **and** current lost state is not already `on`:

```json
{"kind":"lost","payload":{"state":"on","reason":"nav-fail"}}
```
- `reason`: Always `"nav-fail"`.

## CLI UX

- Success messages:
  - `Moved to R14.`
  - `Moved to R14. Lost state: ON.` (when a new `lost` event is emitted)
  - `Moved to R14. (Already lost.)` (when `lost` was passed but state unchanged)
- Usage string: `move <HEX_ID> [lost] [pace=slow|normal|fast]`

## Examples

> (*`seq` and `ts` omitted; assigned by logger*)

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

## Edge Cases

- Repeat `move` to same hex: emits a `move` event (append-only log).
- `move` while already lost (no `lost` flag): allowed; emits `move` only.
- `move … lost` when already lost: emits `move` only (suppresses duplicate `lost on`).
- Missing `HEX_ID`: prints usage; emits no events.

## Test Checklist

1. `move` emits a single `move` with normalized `to` and correct `from`.
2. `move … lost` emits `move` then `lost` when prior state is **not** lost.
3. `move … lost` emits **only** `move` when prior state is already lost.
4. Invalid hex → no events.
5. `pace` validation and propagation to `payload.pace`.

