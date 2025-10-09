# Test Sandboxes on Real FS — Spec (v1)

## Goal

Enable automated tests to run `scribe` (REPL) and `weave` commands against **isolated on-disk repos** you control, without touching your real repo. Tests should be able to (a) script REPL input, (b) choose where the sandbox lives, (c) optionally initialize Git, and (d) clean up unless kept for debugging.

## Requirements

### 1) Repo root resolution (app code)

* Add a resolver that respects an env override:

  * `getRepoRoot()` MUST return `process.env.REPO_ROOT` if set; otherwise fall back to the current logic (existing behavior).
  * `getRepoPath(...segments)` MUST build absolute paths under `getRepoRoot()`.
* No “test mode” branches elsewhere. All app code that touches the filesystem MUST route through `getRepoPath`.

**Acceptance**

* When `REPO_ROOT=/tmp/foo`, `getRepoPath('sessions')` resolves to `/tmp/foo/sessions` (or OS-equivalent).
* Without `REPO_ROOT`, behavior is unchanged from today.

### 2) Deterministic test repos base

* Define a base directory within the project for test sandboxes:

  * Env var: `TEST_REPO_BASE` (default: `./.test-repos` relative to the project root).
  * MUST create a **sentinel file** (e.g., `.skyreach-test-root`) in the base on first use.
* Add `/.test-repos/` to `.gitignore`.

**Acceptance**

* If `TEST_REPO_BASE` is unset, sandboxes are created under `./.test-repos/…`, and that directory is ignored by Git.
* Base contains the sentinel file.

### 3) Sandbox allocator helper (tests)

Create a helper exposed to tests:

**Signature (conceptual)**

* `withTempRepo(title?: string, opts?: { initGit?: boolean, keepOnFailEnv?: string }) -> Promise<string>` where the resolved value is the absolute repo path.

**Behavior**

* Allocates a **unique subdir** under `TEST_REPO_BASE` using:

  * `<suite-or-file>/<slugified-title>-<timestamp>/`
* Seeds required structure/files:

  * `sessions/` and `sessions/rollovers/`
  * `data/session-logs/footprints/`
  * `data/meta.yaml` with `{ appliedSessions: [], rolledSeasons: [], havens: [] }`
  * `data/trails.yaml` with `{ trails: {} }`
* If `opts.initGit === true`:

  * Run `git init`, set dummy author, and commit seeded files once.
* **Cleanup policy**:

  * By default, delete the sandbox after the test finishes.
  * If the test throws, **do not delete**; instead print the absolute path.
  * Respect `keepOnFailEnv` (default: `KEEP_TEST_REPOS`) when truthy (`"1"`, `"true"`): always keep on failure.
  * Provide a safety check: never delete anything unless the base dir contains the sentinel file.

**Acceptance**

* A failing test logs something like: `Sandbox preserved at .test-repos/weave.apply/session-happy-1758158762762/`.
* A passing test leaves no sandbox behind unless explicitly configured otherwise.

### 4) REPL runner for `scribe` (tests)

Create a runner that pipes an array of commands into the REPL:

**Signature (conceptual)**

* `runScribe(commands: string[], opts?: { repo: string; ensureFinalize?: boolean; ensureExit?: boolean; env?: Record<string,string>; entry?: { cmd: string; args: string[] } }) -> Promise<{ stdout: string, stderr: string, exitCode: number }>`.

**Behavior**

* Joins `commands` with `\n` and feeds to `stdin` of the `scribe` process.
* Defaults:

  * `ensureFinalize: true` → append `finalize` if not present.
  * `ensureExit: true` → append `exit` if not present.
  * `entry` default: `{ cmd: "tsx", args: ["cli/skyreach.ts", "scribe"] }` (but keep overridable).
* Process environment:

  * Set `REPO_ROOT = opts.repo`.
  * Set `FORCE_COLOR = "0"` (or equivalent) to suppress ANSI.
* Working directory:

  * Set `cwd = opts.repo`.
* Do **not** mock TTY; just pipe stdin (the REPL should read lines until EOF).

**Acceptance**

* Given a sandbox `repo`, calling `runScribe(["start P13","day 1511-12-01 winter","move Q13 normal"])` creates a `sessions/session_…jsonl` inside that `repo`.
* Output contains no ANSI escapes when `FORCE_COLOR=0`.

### 5) CLI runner for `weave` (tests)

Create a lightweight runner for `weave` subcommands:

**Signature (conceptual)**

* `runWeave(args: string[], opts?: { repo: string; env?: Record<string,string>; entry?: { cmd: string; args: string[] } }) -> Promise<{ stdout: string, stderr: string, exitCode: number }>`.

**Behavior**

* Default `entry`: `{ cmd: "tsx", args: ["cli/skyreach.ts", "weave"] }`.
* Prepend subcommand and flags in `args` (e.g., `["plan", "<file>", "--no-prompt"]`).
* Set `REPO_ROOT` and `cwd` to `opts.repo`. Set `FORCE_COLOR=0`.
* No Git work unless tests ask for it via `withTempRepo({ initGit: true })`.

**Acceptance**

* `runWeave(["plan", "<path>", "--no-prompt"], { repo })` prints a plan mentioning normalized edge keys.
* `runWeave(["apply", "<path>", "--no-prompt", "--allow-dirty"], { repo })` updates `data/` inside `repo`.

### 6) Naming & collision avoidance

* Subdirectory naming MUST include: a short suite or file identifier, a slugified test title, and the Unix epoch timestamp.
* All paths MUST be shorter than \~180 chars to avoid Windows MAX\_PATH issues.

**Acceptance**

* Example path: `./.test-repos/weave.apply/session-happy-1758158762762/`.

### 7) Safety & hygiene

* Provide an npm script to clean all sandboxes: `npm run clean:test-repos`.

  * MUST only delete directories under `TEST_REPO_BASE` that contain the sentinel file.
* CI guidance:

  * By default, allow test failures to keep sandboxes for debugging; optionally add a CI job step to `npm run clean:test-repos` after artifact upload.

**Acceptance**

* Running the clean script removes only sandbox dirs under the test base and refuses to operate if the sentinel is missing.

## Non-Goals

* No in-memory filesystem backend.
* No special “test mode” branches in app code beyond `getRepoRoot()` env override.
* No reliance on npm scripts to spawn CLIs in tests (directly invoke the entry command).

## Verification Checklist (manual)

* Set `TEST_REPO_BASE=.test-repos` and run a test that uses `withTempRepo` + `runScribe`.

  * Confirm `sessions/` is created under the sandbox path, not the real repo.
* Force a test failure; confirm the sandbox path is printed and not deleted.
* Run a test with `initGit: true`; confirm `git status` inside the sandbox shows a clean repo before applying.
* Apply a session; confirm `data/trails.yaml`, `data/meta.yaml`, and a footprint YAML are written in the sandbox.

## Deliverables

* Updated path resolver (`getRepoRoot`, `getRepoPath`) to honor `REPO_ROOT`.
* New test helpers: `withTempRepo`, `runScribe`, `runWeave`.
* `.gitignore` updated to ignore `/.test-repos/`.
* Clean script `clean:test-repos` added (protected by sentinel).
* Minimal docs snippet (README/CONTRIBUTING) describing `TEST_REPO_BASE`, `REPO_ROOT`, and `KEEP_TEST_REPOS`.
