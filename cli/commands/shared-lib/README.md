# Shared Lib Utilities

This directory contains utility modules for CLI commands and test sandboxes. Each module provides focused helpers for working with repositories, running commands, and managing test environments.

## constants/repo-paths.ts

Common repository paths and directory utilities.

### Exports:

- `REPO_PATHS: { ... }`
  - Object containing common repo paths, all resolved using `getRepoPath`. Includes paths for characters, session logs, havens, trails, and more.

- `ensureRepoDirs(): void`
  - Ensures all directories in `REPO_PATHS` exist, creating them if needed.

## atomic-write.ts

Helpers for atomic file writing.

### Exports:

- `atomicWrite(filePath: string, content: string): void`
  - Writes a file atomically by writing to a temporary file and then renaming it. Ensures the file is either fully written or not present.

## get-test-repo-base.ts

Helpers for managing the base directory for test repositories.

### Exports:

- `getTestRepoBase(): string`
  - Returns the absolute path to the test repo base directory, creating it and a sentinel file if needed. Uses the `TEST_REPO_BASE` environment variable or defaults to `.test-repos` at the project root.

- `TEST_REPO_SENTINEL: string`
  - The sentinel filename used to mark the test repo base directory.

## run-scribe.ts

Helpers for running the Scribe CLI programmatically.

### Exports:

- `runScribe(commands: string[], opts: RunScribeOptions): Promise<RunScribeResult>`
  - Runs the Scribe CLI with the given commands and options. Returns an object with `stdout`, `stderr`, and `exitCode`.

- `RunScribeOptions`
  - Options for `runScribe`. Includes `repo` (path), `ensureFinalize`, `ensureExit`, `env`, and `entry` (custom command/args).

- `RunScribeResult`
  - Result object for `runScribe`. Includes `stdout`, `stderr`, and `exitCode`.

## run-weave.ts

Helpers for running the Weave CLI programmatically.

### Exports:

- `runWeave(args: string[], opts: RunWeaveOptions): Promise<RunWeaveResult>`
  - Runs the Weave CLI with the given arguments and options. Returns an object with `stdout`, `stderr`, and `exitCode`.

- `RunWeaveOptions`
  - Options for `runWeave`. Includes `repo` (path), `env`, and `entry` (custom command/args).

- `RunWeaveResult`
  - Result object for `runWeave`. Includes `stdout`, `stderr`, and `exitCode`.

## string.ts

String utility helpers.

### Exports:

- `pad(n: number, len = 4): string`
  - Pads the number `n` with leading zeros to the specified length (default 4).

## test-helpers.ts

Helpers for working with test data and session files.

### Exports:

- `eventsOf(events: Event[], kind: string): Event[]`
  - Filters an array of `Event` objects, returning only those of the specified kind.

- `findSessionFiles(dir: string): string[]`
  - Finds all session JSONL files in the given directory matching the pattern `session_<id>_<date>.jsonl`.

- `readJsonl(file: string): any[]`
  - Reads a `.jsonl` file and parses each line as JSON, returning an array of objects.

## with-temp-repo.ts

Helpers for creating and managing temporary test repository sandboxes.

### Exports:

- `withTempRepo<T = string>(title?: string, opts?: { initGit?: boolean; keepOnFailEnv?: string }, fn?: (repoPath: string) => Promise<T>): Promise<T | string>`
  - Creates a temporary test repo sandbox, runs the provided async function in it, and cleans up unless `KEEP_TEST_REPOS` is set or an error occurs. Seeds required files and can initialize a git repo if `initGit` is true. Returns the result of the function or the repo path.
