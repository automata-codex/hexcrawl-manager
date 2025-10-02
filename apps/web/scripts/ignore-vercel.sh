#!/usr/bin/env bash
set -euo pipefail

# Prefer Vercel-provided SHAs; fall back to the previous commit if missing.
PREV="${VERCEL_GIT_PREVIOUS_SHA:-}"
CURR="${VERCEL_GIT_COMMIT_SHA:-}"

if [[ -z "${CURR}" ]]; then
  echo "No current commit SHA from Vercel; building."
  exit 1
fi

if [[ -z "${PREV}" ]]; then
  # On first build or when Vercel can't provide previous SHA, build.
  echo "No previous commit SHA; building."
  exit 1
fi

CHANGED="$(git diff --name-only "${PREV}" "${CURR}" || true)"

# Trigger a build only if these paths changed (repo-root–relative paths)
if echo "${CHANGED}" | grep -E '^(packages/|apps/web/|data/|package.json|tsconfig.workspace.json|package-lock.json|pnpm-lock.yaml)$' >/dev/null; then
  # exit 1 => DO build
  exit 1
fi

echo "No changes in packages/, apps/web/, or data/ — skipping Vercel preview build"
exit 0
