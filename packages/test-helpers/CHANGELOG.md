# @skyreach/test-helpers

## 3.1.0

### Minor Changes

- 0c99f12: Rename package namespace

### Patch Changes

- 52b773f: Add milestone AP allocation support and fix flaky integration tests

  **Milestone AP Feature:**
  - Add `ap milestone "<note>"` command in scribe to create a todo for milestone AP allocation
  - Refactor `weave allocate ap` to use subcommands: `absence` (existing) and `milestone` (new)
  - Add `milestone_spend` entry type to the AP ledger schema
  - Milestone allocations always grant 3 AP total, split across pillars by the user

  **Breaking Change:**
  - Old syntax `weave allocate ap --character ...` no longer works
  - Must use `weave allocate ap absence --character ...` instead

  **CLI Commands:**

  ```bash
  # Scribe - during session
  ap milestone "Survived the Winter of 1512"

  # Weave - allocate absence credits (existing, renamed)
  weave allocate ap absence --character alice --amount 2 --combat 1 --exploration 1

  # Weave - allocate milestone AP (new)
  weave allocate ap milestone --character alice --combat 1 --exploration 1 --social 1 --note "Winter survival"
  ```

  **Test Infrastructure:**
  - Fix flaky integration tests by configuring vitest to use forks pool for integration tests
  - Add retry mechanism to `runWeave` and `runScribe` test helpers for transient SIGSEGV failures

- 0f0d0f7: **BREAKING CHANGE:** Refactor repo after code/data split
  - Add file extensions to imports
  - Add placeholder data
  - Add license
  - **BREAKING CHANGE:** Implement configurable data directory
  - Update tests

- Updated dependencies [ec425a4]
- Updated dependencies [52b773f]
- Updated dependencies [3d0d8ba]
- Updated dependencies [3b23d23]
- Updated dependencies [8726d51]
- Updated dependencies [0c99f12]
- Updated dependencies [0f0d0f7]
- Updated dependencies [87fad0b]
- Updated dependencies [2252ac4]
- Updated dependencies [8ea782e]
  - @achm/core@4.0.0
  - @achm/schemas@5.0.0
  - @achm/data@4.0.0

## 3.0.0

### Minor Changes

- ca23cfc: Fix time schemas
  - explicitly name fields
  - store segments everywhere
  - migrate old logs
- ec8befc: Implement scribe fast-travel command
- b30babe: Backfill session logs

### Patch Changes

- Updated dependencies [e0d25c5]
- Updated dependencies [ca23cfc]
- Updated dependencies [39e37e8]
- Updated dependencies [d790497]
- Updated dependencies [ec8befc]
- Updated dependencies [b30babe]
- Updated dependencies [20630f5]
  - @skyreach/schemas@3.0.0
  - @skyreach/data@3.0.0
  - @skyreach/core@3.0.0

## 2.5.0

### Minor Changes

- 3f9dc1b: Implement `weave allocate ap` command
- cbfd8ed: Update tests with fixture factories
- 65916d2: Add `SessionId` branded type; add `scribe start` interactive mode
- feeb18e: Improve and test discovery for `weave apply`.
- fee59a4: Update `scribe` tests; add GitHub Action ti run tests on every PR

### Patch Changes

- Updated dependencies [3f9dc1b]
- Updated dependencies [cbfd8ed]
- Updated dependencies [65916d2]
- Updated dependencies [feeb18e]
- Updated dependencies [ba530e6]
- Updated dependencies [fee59a4]
- Updated dependencies [933be02]
  - @skyreach/data@2.5.0
  - @skyreach/schemas@2.5.0
  - @skyreach/core@2.5.0

## 2.4.0

### Minor Changes

- 71168aa: Add `weave ap status` command
- c7a19f4: Migrate helpers and shared functions from the CLI to shared packages

### Patch Changes

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
  - @skyreach/core@2.4.0
