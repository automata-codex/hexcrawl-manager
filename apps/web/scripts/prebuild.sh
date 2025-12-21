#!/usr/bin/env bash
set -e

# Prebuild script for @skyreach/web
# Runs all validation and generation steps before building the Astro app.

# Set data path with fallback to local data directory
export ACHM_DATA_PATH="${ACHM_DATA_PATH:-../../data}"

echo "=== Prebuild: Building packages ==="
npm run --prefix ../.. build:packages

echo ""
echo "=== Prebuild: Validating YAML config ==="
tsx scripts/validate-yaml-config.ts

echo ""
echo "=== Prebuild: Validating articles ==="
tsx scripts/validate-articles.ts

echo ""
echo "=== Prebuild: Validating encounter content ==="
tsx scripts/validate-encounter-content.ts

echo ""
echo "=== Prebuild: Validating encounter table ==="
tsx scripts/validate-encounter-table.ts

echo ""
echo "=== Prebuild: Validating pointcrawl IDs ==="
tsx scripts/validate-pointcrawl-ids.ts

echo ""
echo "=== Prebuild: Validating ToC config ==="
tsx scripts/validate-toc-config.ts

echo ""
echo "=== Prebuild: Caching AP totals ==="
tsx scripts/cache-ap-totals.ts

echo ""
echo "=== Prebuild: Generating config ==="
tsx scripts/generate-config.ts

echo ""
echo "=== Prebuild complete ==="
