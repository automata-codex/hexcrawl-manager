# Scribe Lib Directory

This directory contains utility and helper modules used throughout the Scribe project. Each subdirectory provides focused helpers for a specific domain. This file documents the available submodules and their exported functions.

---

## hexes/

Hex grid utilities for working with hex IDs, neighbors, and sorting.

**Path:** `lib/hexes/`

### Exports from `lib/hexes/index.ts`:

- `getHexNeighbors(hex: string): string[]`
  - Returns a sorted array of valid neighboring hex IDs for a given hex (e.g., 'P17').
  - Handles flat-topped hex grid logic and board boundaries (A-W, 1-27).
  - Throws if the input is not a valid hex ID.

- `hexSort(hexIdA: string, hexIdB: string): number`
  - Sorts two hex IDs first by column (A-Z), then by row (numeric).
  - Useful for ordering hexes in a consistent way.

- `isValidHexId(hexId: string): boolean`
  - Returns true if the string is a valid hex ID (letter + number, e.g., 'P17').

- `normalizeHexId(h: string): string`
  - Trims and uppercases a hex ID string for canonical comparison.

---

## repo/

Helpers for working with the repository root and configuration.

**Path:** `lib/repo/`

### Exports from `lib/repo/index.ts`:

- `getRepoPath(...segments: string[]): string`
  - Joins the repository root (from config) with additional path segments, returning an absolute path.
  - Uses the `repoRoot` property from `skyreach.config.json`.

- `getRepoRoot(): string`
  - Returns the repository root directory, using the `REPO_ROOT` environment variable if set, otherwise falling back to the config file.

- `loadConfig(): SkyreachConfig`
  - Loads and validates the repository configuration from `skyreach.config.json`.
  - Returns a `SkyreachConfig` object with at least a `repoRoot` property.
  - Throws if the config file is missing or invalid.

---

## trails/

Helpers for working with trail IDs and parsing trail endpoints.

**Path:** `lib/trails/`

### Exports from `lib/trails/index.ts`:

- `parseTrailId(trailId: string): { from: string; to: string } | null`
  - Parses a trail ID string of the form `FROM-TO` (e.g., `P17-Q18`).
  - Returns an object `{ from, to }` if both parts are valid hex IDs, or `null` if invalid.
  - Uses `isValidHexId` from `lib/hexes` to validate each endpoint.
