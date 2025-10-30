#!/usr/bin/env bash
set -euo pipefail

# Prefer Vercel-provided SHAs; fall back to the previous commit if missing.
PREV="${VERCEL_GIT_PREVIOUS_SHA:-}"
CURR="${VERCEL_GIT_COMMIT_SHA:-}"

if [[ -z "${CURR}" ]]; then
  echo "No current commit SHA from Vercel; building."
  exit 1
fi

# For main branch: compare current commit with previous commit on main (not develop)
# This handles the case where develop is merged into main and consecutive commits are identical
if [[ "${VERCEL_GIT_COMMIT_REF:-}" == "main" ]]; then
  # Get the previous commit on main by following first-parent only
  PREV_ON_MAIN=$(git log --first-parent --format=%H -n 2 "${CURR}" 2>/dev/null | tail -1)

  if [[ -z "${PREV_ON_MAIN}" ]] || [[ "${PREV_ON_MAIN}" == "${CURR}" ]]; then
    # First commit on main, or couldn't find a previous commit; build
    echo "First commit on main or couldn't find previous commit; building."
    exit 1
  fi

  CHANGED="$(git diff --name-only "${PREV_ON_MAIN}" "${CURR}" || true)"
else
  # For other branches (preview deployments), use Vercel's PREV
  if [[ -z "${PREV}" ]]; then
    # On first build or when Vercel can't provide previous SHA, build.
    echo "No previous commit SHA; building."
    exit 1
  fi

  CHANGED="$(git diff --name-only "${PREV}" "${CURR}" || true)"
fi

# Trigger a build only if these paths changed (repo-root–relative paths)
if echo "${CHANGED}" | grep -E '^(packages/|apps/web/|data/|package.json|tsconfig.workspace.json|package-lock.json|pnpm-lock.yaml)$' >/dev/null; then
  # exit 1 => DO build
  exit 1
fi

echo "No changes in packages/, apps/web/, or data/ — skipping Vercel preview build"
exit 0
