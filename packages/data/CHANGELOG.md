# @skyreach/data

## 3.2.0

### Minor Changes

- e3ef0c9: Made the side nav menu and article routes configurable from YAML rather than hard-coded into the web app's logic. This allows for easier updates and customization of the navigation structure without needing to modify the application code directly.

## 3.0.0

### Major Changes

- 39e37e8: Minor updates:
  - BREAKING CHANGE: Move `rollDice` to from @skyreach/data to @skyreach/core
  - Update `scribe move` to display a reminder when moving along permanent trails

### Minor Changes

- e0d25c5: Add hex processing to `weave apply`
- b30babe: Backfill session logs
- 20630f5: Wire web app to read character AP from AP ledger

### Patch Changes

- d790497: Update callsites to accept new or old form of session filename
- ec8befc: Implement scribe fast-travel command

## 2.5.0

### Minor Changes

- 3f9dc1b: Implement `weave allocate ap` command
- 65916d2: Add `SessionId` branded type; add `scribe start` interactive mode
- feeb18e: Improve and test discovery for `weave apply`.
- fee59a4: Update `scribe` tests; add GitHub Action ti run tests on every PR
- 933be02: Add support for `meta.yaml` v2

## 2.4.0

### Minor Changes

- 56f881b: Refactor AP ledger file to use JSONL format
- 71168aa: Add `weave ap status` command
- 7f491a3: Migrate `weave ap apply` to `weave apply ap`
- 1fbb9ef: Migrate `weave apply trails` to new command structure
- c7a19f4: Migrate helpers and shared functions from the CLI to shared packages
- 8ea1ad4: Initialize packages

### Patch Changes

- 2552397: Update linting and formatting rules
