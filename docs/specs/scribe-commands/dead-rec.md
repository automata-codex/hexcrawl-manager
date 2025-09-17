# Spec: `dead-rec` command (attempt event + conditional un-lost)

## Purpose

Log **every** dead-reckoning attempt as its own event (success or fail). On **success**, if the party is currently lost, also emit a `lost` event turning it off. No movement or time logging here.

## Command signature

```
dead-rec <success|fail>
```

* Required argument, case-insensitive.

## Behavior

1. **Zero duration**: This command never logs time.
2. **No movement**: It does not change current hex.
3. **Always log the attempt**: Emit a `dead_reckoning` event with the outcome.
4. **Conditional un-lost**: If outcome is **success** and the party **is currently lost**, also emit `lost` with `state:"off"` and `method:"dead-reckoning"`.
5. **Success while not lost**: Only the attempt event; no state change.
6. **Fail**: Only the attempt event; no state change.

> Use a selector like `isPartyLost(events): boolean` for the idempotency check.
> Keep event timestamps/seq ordering consistent: attempt first, then (if applicable) the `lost off`.

## Events emitted

> (`seq` and `ts` come from the logger; only `kind` and `payload` shown)

### Attempt (always)

```json
{"kind":"dead_reckoning","payload":{"outcome":"success"}}
```

or

```json
{"kind":"dead_reckoning","payload":{"outcome":"fail"}}
```

### Conditional un-lost (only on success **and** currently lost)

```json
{"kind":"lost","payload":{"state":"off","method":"dead-reckoning"}}
```

## Validation

* Missing/invalid arg → show `usage: dead-rec <success|fail>` and emit **no** events.
* Args are case-insensitive.

## CLI UX (examples, keep concise)

* `dead-rec success` when lost →
  `Dead reckoning succeeded. Lost state: OFF.`
* `dead-rec success` when not lost →
  `Dead reckoning succeeded.`
* `dead-rec fail` →
  `Dead reckoning failed.`

## Examples (expected emissions)

> (Order preserved; attempt first.)

**A) Party is lost; `dead-rec success`**

```jsonl
{"kind":"dead_reckoning","payload":{"outcome":"success"}}
{"kind":"lost","payload":{"state":"off","method":"dead-reckoning"}}
```

**B) Party is not lost; `dead-rec success`**

```json
{"kind":"dead_reckoning","payload":{"outcome":"success"}}
```

**C) Party is lost; `dead-rec fail`**

```json
{"kind":"dead_reckoning","payload":{"outcome":"fail"}}
```

**D) Party is not lost; `dead-rec fail`**

```json
{"kind":"dead_reckoning","payload":{"outcome":"fail"}}
```

## State rules (derivation, not enforced here)

* **Lost state** = last `lost` event’s `payload.state` (`on|off`).
* `dead_reckoning` events are audit logs; only `lost off` flips state.

## Edge cases

* Multiple `success` attempts while not lost → log attempts only; no `lost off`.
* Multiple `success` attempts in a row while lost → first success emits `lost off`; later successes are attempts only.
* New session with no prior `lost` events → treat as **not lost** unless your selector says otherwise.

## Tests (high level)

1. Lost + success → emits `dead_reckoning{success}` then `lost{off, method:"dead-reckoning"}`.
2. Not lost + success → emits only `dead_reckoning{success}`.
3. Lost + fail → emits only `dead_reckoning{fail}`.
4. Not lost + fail → emits only `dead_reckoning{fail}`.
5. Invalid/missing arg → usage; no events.
