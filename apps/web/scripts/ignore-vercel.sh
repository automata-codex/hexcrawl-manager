#!/usr/bin/env bash
set -euo pipefail

# Get the list of changed files in the last commit
CHANGED="$(git diff --name-only HEAD^ HEAD || true)"

# If any changed path starts with packages/, apps/web, or data/, then build (exit 1).
if echo "$CHANGED" | grep -E '^(packages/|apps/web/|data/)' >/dev/null; then
  exit 1
fi

echo "No changes in packages/, apps/web/, or data/ — skipping Vercel preview build"
exit 0
