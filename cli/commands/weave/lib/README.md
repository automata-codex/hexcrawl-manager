# Weave CLI Shared Helpers

This directory contains shared logic for the weave CLI commands. Use these helpers to avoid code duplication and ensure consistent behavior across commands.

---

## File: `apply.ts`
- **applyRolloverToTrails(trails, havens, dryRun?)**: Returns a new trails object after applying rollover logic. Handles near/far haven logic, streaks, permanence, and d6 rolls (real or simulated).

## File: `files.ts`
- **getMostRecentRolloverFootprint(seasonId)**: Returns the most recent rollover footprint YAML for a given season (or null).
- **getNextUnrolledSeason(meta)**: Returns the next season (as a string) after the last rolled season in meta.
- **listCandidateFiles(meta)**: Returns a sorted list of unapplied session and rollover files.
- **promptSelectFile(candidates)**: Prompts the user to select a file from a list of candidates.
- **requireCleanGitOrAllowDirty(opts?)**: Exits if the git working tree is dirty, unless `--allow-dirty` is set.
- **resolveInputFile(fileArg, meta, opts?)**: Handles file selection, prompting, and error handling for unapplied session/rollover files.

## File: `git.ts`
- **getGitHeadCommit()**: Returns the current git HEAD commit SHA, or null if not in a git repo.
- **isGitDirty()**: Returns true if the git working directory is dirty (has uncommitted changes).

## File: `guards.ts`
- **isRolloverAlreadyApplied(meta, fileId)**: Returns true if the rollover file has already been applied.
- **isRolloverChronologyValid(meta, seasonId)**: Checks if the rollover is for the next unapplied season.
- **isRolloverFile(filePath)**: Returns true if the file path matches a rollover file pattern.
- **isSessionAlreadyApplied(meta, fileId)**: Returns true if the session file has already been applied.
- **isSessionChronologyValid(meta, seasonId)**: Checks if all required rollovers up to the session's season have been applied.
- **isSessionFile(filePath)**: Returns true if the file path matches a session file pattern.

## File: `season.ts`
- **compareSeasonIds(a, b)**: Compares two season IDs for chronological order.
- **deriveSeasonId(date)**: Derives a season ID (e.g., '1511-autumn') from a CanonicalDate.
- **normalizeSeasonId(seasonId)**: Normalizes a season ID to lower-case, trimmed.

## File: `state.ts`
- **appendToMetaAppliedSessions(meta, fileId)**: Adds a fileId to meta.appliedSessions if not already present.
- **loadHavens()**: Loads havens from the repo YAML.
- **loadMeta()**: Loads the meta YAML (appliedSessions, rolledSeasons, etc).
- **loadTrails()**: Loads the trails YAML.
- **writeFootprint(footprint)**: Emits a YAML footprint file for every apply, including only affected edges and all required details (optionally includes git commit info).
- **writeYamlAtomic(filePath, data)**: Writes YAML atomically to a file.

## File: `validate.ts`
- **validateSessionEnvelope(events)**: Checks that a session file starts/ends with the correct events, contains at least one `day_start`, and all `day_start` events share the same seasonId.

---

**Usage:**
Import and use these helpers in command entry points. If you add new shared logic, document it here for future maintainers.
