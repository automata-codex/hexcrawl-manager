# `@achm/core`

Domain logic lives here. This package encodes the *rules of the world* and the
*game system*—concepts that make sense even if you swapped out storage or UI.

Examples include:

- **Identifiers & parsing**
  - `SessionId`, `SeasonId`, `HexId`
  - `isSessionId/assertSessionId`, `isSeasonId/assertSeasonId`
- **Calendar & seasons**
  - `deriveSeasonId`, `normalizeSeasonId`, `nextSeasonId`
- **Hex math**
  - axial/offset conversions, `hexSort`, range/neighboring logic
- **Rules & transforms**
  - advancement/AP rules, trail state transitions, decay/maintenance rules
- **Domain-specific errors**
  - e.g., `SessionFingerprintMismatchError`, `ChronologyRuleError`

**_No filesystem assumptions._** No paths, filenames, YAML, or disk I/O.

## Design principles

- **Pure over impure:** Prefer pure functions; pass data in, get data out.
- **Deterministic:** Same inputs → same outputs (no hidden randomness or clock).
- **Composable:** Small utilities that compose into bigger rules.
- **Test-first:** High unit-test coverage with straightforward fixtures.

## Do / Don’t

**Do**
- Validate and normalize *domain* inputs (IDs, dates, hexes).
- Express rule engines and state transitions as pure functions.
- Throw *domain* errors when invariants are violated.

**Don’t**
- Read/write files, touch the network, or depend on process/TTY.
- Hardcode repository paths or filename shapes.
- Depend on CLI-specific utilities or colorized output.
