# Spec: `backtrack` command

## Purpose

When the party is **lost**, they can return to the **previous hex**. `backtrack` always succeeds but costs time (tracked separately with `time`). It may also clear the lost state.

## Scope

* **In scope:** CLI parsing/validation; emitting a `backtrack` attempt event; emitting `lost off` (if applicable); emitting the authoritative `move` back to the previous hex.
* **Out of scope:** Time accounting (that’s `time`), encounter/trail logic, or any DC/weather math.

## Command signature

```
backtrack [slow|normal]
```

* Optional pace: `slow` or `normal`. (No `fast` for backtracking.)
* Default pace if omitted: **`normal`** (or whatever your table prefers; pick one and document it).
* Optional alias: `bt` with same signature.

## Behavior

1. **Zero duration:** `backtrack` emits events but never logs time; you’ll issue a `time N` separately.
2. **No arguments beyond pace:** If an unsupported token is present, show usage; emit no events.
3. **Previous hex resolution:** Determine the *previous hex* as the most recent **distinct** `move.payload.from`/`to` pair that yields the hex prior to the *current* one (i.e., “one step back”). If there is no prior step (e.g., first hex of session), show a warning and emit only the attempt event (or nothing—see guards below).
4. **Lost requirement:** Rules-wise, backtrack is intended for when the party is **lost**. Implementation-wise:

  * If **lost**: emit attempt → `lost off` → `move` (back one hex).
  * If **not lost**: still allow (it’s just retracing a step). Emit attempt → `move` only (no `lost off`).

> Use your selector: `isPartyLost(events): boolean`.

## Events emitted (and order)

Emit **atomically** in this **order**:

1. `backtrack` attempt (always)
2. `lost off` (only if currently lost)
3. `move` to the previous hex (always, if a previous hex exists)

### Event shapes

(Your logger supplies `seq` and `ts`.)

**Attempt (always)**

```json
{"kind":"backtrack","payload":{"pace":"normal"}}
```

(or `"slow"` if chosen)

**Conditional un-lost (when lost)**

```json
{"kind":"lost","payload":{"state":"off","method":"backtrack"}}
```

**Authoritative move (always, if previous hex available)**

```json
{"kind":"move","payload":{"from":"<CURRENT_HEX>","to":"<PREVIOUS_HEX>","pace":"normal"}}
```

## Validation & guards

* **Pace:** Only `slow` or `normal` accepted; otherwise `usage: backtrack [slow|normal]`.
* **Previous hex missing:** If there is no prior step to return to, print a friendly warning and **do not emit `move`**. Keep or drop the attempt event—your call. (I recommend **still emitting the `backtrack` attempt** so the transcript reflects what was tried.)
* **Lost already off:** Allowed. No `lost off` emitted; just attempt + move.

## CLI UX (examples; keep terse)

* Lost party: `Backtracking (normal pace). Regained bearings. Moved to P13.`
* Not lost: `Backtracking (slow pace). Moved to P13.`
* No previous hex: `Cannot backtrack—no previous hex.`

## Examples (expected emissions)

(*Omitting `seq`/`ts` for brevity; order is important.*)

**A) Lost; `backtrack` (default normal pace)**

```jsonl
{"kind":"backtrack","payload":{"pace":"normal"}}
{"kind":"lost","payload":{"state":"off","method":"backtrack"}}
{"kind":"move","payload":{"from":"R14","to":"P13","pace":"normal"}}
```

**B) Not lost; `backtrack slow`**

```jsonl
{"kind":"backtrack","payload":{"pace":"slow"}}
{"kind":"move","payload":{"from":"R14","to":"P13","pace":"slow"}}
```

**C) No previous hex available**

```json
{"kind":"backtrack","payload":{"pace":"normal"}}
```

(And a warning to the console; no `move` emitted.)

---
