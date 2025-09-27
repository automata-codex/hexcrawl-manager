# Skip build if the diff only contains files under cli/
CHANGED="$(git diff --name-only HEAD^ HEAD || true)"

# If any changed path is NOT under cli/, build (exit 1)
if echo "$CHANGED" | grep -vE '^(cli/|cli$)' >/dev/null; then
  exit 1
fi

echo "Only cli/ changed — skipping Vercel preview build"
exit 0
