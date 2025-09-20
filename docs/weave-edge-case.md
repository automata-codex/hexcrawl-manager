# Season Boundaries--An Intentionally Unhandled Edge Case

1. **Season/day boundaries.**

  * The rules implicitly assume that a “day” starts at dawn, since daylight hours drive labor.
  * Edge case: adventuring past midnight into a new *day* and *season*. You want to document it but not handle it — fair, since it would be a bookkeeping nightmare and your table hasn’t run into exhaustion yet.

2. **Session flow.**

  * `session_start` → `"status":"in-progress"` plus session id, startHex.
  * If a session spans a rollover, you don’t want to put a `session_start` *after* the rollover file — instead you’d use a new event.

3. **Pause/continue semantics.**

  * `session_pause`: payload mirrors `session_start` but with `"status":"paused"` and the same session id.
  * `session_continue`: restores `"status":"in-progress"`.
  * You want `session_continue` to also carry **current hex, party, and in-world date**, so that any partitioned session log is resumable without context leakage.

4. **Partition boundaries.**

  * Right now, partitions end at `session_end`.
  * Better: allow them to end at `session_pause` (or a future `session_split`) so that `weave` knows to join multiple parts of the same session for reporting.
