# @skyreach/cli

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
