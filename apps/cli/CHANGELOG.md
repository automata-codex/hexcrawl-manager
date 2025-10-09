# @skyreach/cli

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
