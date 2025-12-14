# @skyreach/cli

## 2.7.0

### Minor Changes

- f83daea: Add GM dashboard

### Patch Changes

- Updated dependencies [f83daea]
- Updated dependencies [4978f44]
- Updated dependencies [7eb674e]
- Updated dependencies [ec7e954]
- Updated dependencies [89c8f82]
- Updated dependencies [0b6649c]
  - @skyreach/schemas@4.0.0
  - @skyreach/data@3.3.0
  - @skyreach/core@3.1.0

## 2.6.2

### Patch Changes

- 3957613: **Content Update:** Record session 21; fix CLI bugs
- Updated dependencies [91b7478]
- Updated dependencies [934bdd5]
- Updated dependencies [31a2356]
- Updated dependencies [0712fd6]
- Updated dependencies [d844fc0]
- Updated dependencies [7bcc551]
  - @skyreach/schemas@3.3.0

## 2.6.1

### Patch Changes

- 385eaa3: Fix bugs in fast travel command
- Updated dependencies [c54fe00]
- Updated dependencies [9e92518]
- Updated dependencies [72a2ade]
- Updated dependencies [e3ef0c9]
  - @skyreach/schemas@3.2.0
  - @skyreach/data@3.2.0

## 2.6.0

### Minor Changes

- e0d25c5: Add hex processing to `weave apply`
- 70a2fc7: Hide retired characters in AP status and progress tracker
- dac07dd: Add more scribe commands
- ca23cfc: Fix time schemas
  - explicitly name fields
  - store segments everywhere
  - migrate old logs
- 39e37e8: Minor updates:
  - BREAKING CHANGE: Move `rollDice` to from @skyreach/data to @skyreach/core
  - Update `scribe move` to display a reminder when moving along permanent trails
- ec8befc: Implement scribe fast-travel command
- b30babe: Backfill session logs
- 20630f5: Wire web app to read character AP from AP ledger

### Patch Changes

- 4e2c992: Fix type errors; fix bug with "Explored" checkbox in interactive map's detail pane
- d790497: Update callsites to accept new or old form of session filename
- Updated dependencies [e0d25c5]
- Updated dependencies [ca23cfc]
- Updated dependencies [39e37e8]
- Updated dependencies [d790497]
- Updated dependencies [ec8befc]
- Updated dependencies [b30babe]
- Updated dependencies [20630f5]
  - @skyreach/schemas@3.0.0
  - @skyreach/data@3.0.0
  - @skyreach/test-helpers@3.0.0
  - @skyreach/core@3.0.0
  - @skyreach/cli-kit@3.0.0

## 2.5.0

### Minor Changes

- 3f9dc1b: Implement `weave allocate ap` command
- 99a55f6: Update and expand `scribe doctor` command
- cbfd8ed: Update tests with fixture factories
- ba92ccf: Add more tests; switch to custom prompts for interactivity in `scribe` tool
- 65916d2: Add `SessionId` branded type; add `scribe start` interactive mode
- feeb18e: Improve and test discovery for `weave apply`.
- ba530e6: Update `scribe finalize` per spec
- fee59a4: Update `scribe` tests; add GitHub Action ti run tests on every PR
- ba78e1e: Update `session` command (removing call to deprecated function)
- 933be02: Add support for `meta.yaml` v2
- 1dc8e05: Update `weave apply trails` to match spec
- fb47a9e: Update `weave plan` command

### Patch Changes

- 06c8020: Refactor file layout
- Updated dependencies [3f9dc1b]
- Updated dependencies [cbfd8ed]
- Updated dependencies [ba92ccf]
- Updated dependencies [65916d2]
- Updated dependencies [feeb18e]
- Updated dependencies [ba530e6]
- Updated dependencies [fee59a4]
- Updated dependencies [933be02]
  - @skyreach/test-helpers@2.5.0
  - @skyreach/data@2.5.0
  - @skyreach/schemas@2.5.0
  - @skyreach/core@2.5.0
  - @skyreach/cli-kit@2.5.0

## 2.4.0

### Minor Changes

- 062f7fa: Add `scribe` and `weave` CLI tools
- 56f881b: Refactor AP ledger file to use JSONL format
- 71168aa: Add `weave ap status` command
- 7f491a3: Migrate `weave ap apply` to `weave apply ap`
- 1fbb9ef: Migrate `weave apply trails` to new command structure
- ad6b2d2: Add prompts to `@skyreach/cli-kit` and move existing functionality to shared CLI services
- c7a19f4: Migrate helpers and shared functions from the CLI to shared packages
- 188c649: Catch-up changeset for the CLI tools we've been adding
  - The `scribe` REPL for capturing a session log
  - The first `weave apply` command for updating the trails and handling a season rollover
  - The `session` command to bootstrap a planned session report
- 40823fc: Generate package catalog from typdoc annotations
- 188c649: Add `skyreach weave ap apply` command
- bf73d6e: Migrate `weave ap status` to `weave status ap`

### Patch Changes

- fcfd1f4: Add error checking to the `weave apply trails` loop
- 2552397: Update linting and formatting rules
- Updated dependencies [56f881b]
- Updated dependencies [71168aa]
- Updated dependencies [7f491a3]
- Updated dependencies [1fbb9ef]
- Updated dependencies [ad6b2d2]
- Updated dependencies [c7a19f4]
- Updated dependencies [8ea1ad4]
- Updated dependencies [2552397]
  - @skyreach/schemas@2.4.0
  - @skyreach/data@2.4.0
  - @skyreach/test-helpers@2.4.0
  - @skyreach/cli-kit@2.4.0
  - @skyreach/core@2.4.0
