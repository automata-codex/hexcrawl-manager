### `explore` Command — Spec

**Purpose**
Records that the party has explored their current hex, revealing hidden sites and features.

* No arguments required—automatically uses the party's current hex location.
* Represents a deliberate exploration action (e.g., searching for hidden sites, dungeons, or points of interest).
* Does not move the party or change their location.

---

**Usage**

```
explore
```

No arguments needed. The command will use the party's current hex as the target.

---

**Events Emitted**

1. Always an **`explore`** event:

```json
{
  "kind": "explore",
  "payload": {
    "target": "O11"
  }
}
```

* `target` = the party's current hex ID (derived from the last `move` event or `session_start`).

2. No `move` or location-related events are emitted, as the party remains in their current hex.

---

**Validation**

* Must have an active session (via `session_start` or `session_continue`).
* Must have a current hex location available.
* No validation on multiple explorations of the same hex (may be added in a future update).

---

**Notes & Implications**

* The command does not validate whether the hex has already been explored—you can explore the same hex multiple times.
* The event log simply records that exploration occurred; the GM still manages what is revealed to the players.
* Future enhancement: Look up the hex data file and display the hidden sites in the REPL output, helping the GM quickly reference what should be revealed.

---

**Example Commands → Expected Emissions**

* `explore` (while in hex O11)

```json
{"kind":"explore","payload":{"target":"O11"}}
```

* `explore` (while in hex N09)

```json
{"kind":"explore","payload":{"target":"N09"}}
```
