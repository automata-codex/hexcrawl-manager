### `scout` Command — Spec

**Purpose**
Represents an individual PC scouting an adjacent hex.

* No risk of getting lost.
* Always reveals the terrain + vegetation.
* Optional: also reveal the landmark (if `landmark` flag is passed).
* If `landmark` isn’t specified, assume the outcome is “encounters revealed.” (Whether or not the Perception check succeeded is irrelevant to the log—you just note what the GM told the players.)

---

**Usage**

```
scout <HEX_ID> [landmark]
```

* `<HEX_ID>` — required, the adjacent hex being scouted.
* `landmark` — optional keyword, means the PC revealed the landmark instead of creature encounters.

---

**Events Emitted**

1. Always a **`scout`** event:

```json
{
  "kind": "scout",
  "payload": {
    "target": "O11",
    "result": "landmark"   // or "encounters"
  }
}
```

* `target` = hex ID being scouted.
* `result` = `"landmark"` if `landmark` flag was present, otherwise `"encounters"`.

2. No `move` or `lost` events, because the party hasn’t left their current hex.

---

**Notes & Implications**

* You don’t need to track who scouted (player name); the log just records that scouting occurred.
* The command does not handle the Perception check—the GM still runs that. The GM just records the outcome (`landmark` vs. `encounters`).
* If later you add more granularity (e.g. `revealLandmark: true`), you can extend the payload schema.

---

**Example Commands → Expected Emissions**

* `scout O11 landmark`

```json
{"kind":"scout","payload":{"target":"O11","result":"landmark"}}
```

* `scout O12`

```json
{"kind":"scout","payload":{"target":"O12","result":"encounters"}}
```
