# @skyreach/schemas

## 3.0.0

### Minor Changes

- e0d25c5: Add hex processing to `weave apply`
- ca23cfc: Fix time schemas
  - explicitly name fields
  - store segments everywhere
  - migrate old logs
- b30babe: Backfill session logs

### Patch Changes

- ec8befc: Implement scribe fast-travel command

## 2.5.0

### Minor Changes

- cbfd8ed: Update tests with fixture factories
- 65916d2: Add `SessionId` branded type; add `scribe start` interactive mode
- feeb18e: Improve and test discovery for `weave apply`.
- ba530e6: Update `scribe finalize` per spec
- fee59a4: Update `scribe` tests; add GitHub Action ti run tests on every PR
- 933be02: Add support for `meta.yaml` v2

## 2.4.0

### Minor Changes

- 56f881b: Refactor AP ledger file to use JSONL format
- 71168aa: Add `weave ap status` command
- c7a19f4: Migrate helpers and shared functions from the CLI to shared packages
- 8ea1ad4: Initialize packages

### Patch Changes

- 2552397: Update linting and formatting rules
