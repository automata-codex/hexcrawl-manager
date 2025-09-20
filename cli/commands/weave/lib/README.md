# Weave CLI Shared Helpers

This directory contains shared logic for the weave CLI commands. Use these helpers to avoid code duplication and ensure consistent behavior across commands.

## File Selection
- **resolveInputFile** (in `files.ts`):
  - Handles file selection, prompting, and error handling for unapplied session/rollover files.
  - Use this in all commands that need to select a session or rollover file.

## Session Envelope Validation
- **validateSessionEnvelope** (in `validate.ts`):
  - Checks that a session file starts/ends with the correct events, contains at least one `day_start`, and all `day_start` events share the same seasonId.
  - Use this before processing any session file.

## Chronology and Idempotency
- **isSessionChronologyValid, isRolloverChronologyValid, isSessionAlreadyApplied, isRolloverAlreadyApplied** (in `guards.ts`):
  - Enforce correct application order and prevent duplicate application of files.
  - Use these before applying or planning any session or rollover.

## State and Footprint
- **applySessionToTrails, applyRolloverToTrails** (in `apply.ts`):
  - Core logic for updating trails based on session or rollover events.
- **writeFootprint** (in `state.ts`):
  - Emits a YAML footprint file for every apply, including only affected edges and all required details.

---

**Usage:**
Import and use these helpers in command entry points. If you add new shared logic, document it here for future maintainers.

