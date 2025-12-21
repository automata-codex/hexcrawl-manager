# Plan: Rename Package Namespace and CLI Binary

## Summary
- Rename package namespace from `@skyreach` to `@achm`
- Rename CLI binary from `skyreach` to `hexcrawl`

## Scope

**Total impact:** ~321 files with `@skyreach` references, plus CLI binary rename

### Packages to Rename (7 packages)
| Current | New |
|---------|-----|
| `@skyreach/schemas` | `@achm/schemas` |
| `@skyreach/core` | `@achm/core` |
| `@skyreach/data` | `@achm/data` |
| `@skyreach/cli-kit` | `@achm/cli-kit` |
| `@skyreach/test-helpers` | `@achm/test-helpers` |
| `@skyreach/cli` | `@achm/cli` |
| `@skyreach/web` | `@achm/web` |

### CLI Binary Rename
- Current: `skyreach` command
- New: `hexcrawl` command

---

## Implementation Phases

### Phase 1: Update Package Names in package.json Files

Update the `"name"` field in each package.json:

- `packages/schemas/package.json` - `@skyreach/schemas` → `@achm/schemas`
- `packages/core/package.json` - `@skyreach/core` → `@achm/core`
- `packages/data/package.json` - `@skyreach/data` → `@achm/data`
- `packages/cli-kit/package.json` - `@skyreach/cli-kit` → `@achm/cli-kit`
- `packages/test-helpers/package.json` - `@skyreach/test-helpers` → `@achm/test-helpers`
- `apps/cli/package.json` - `@skyreach/cli` → `@achm/cli`
- `apps/web/package.json` - `@skyreach/web` → `@achm/web`

### Phase 2: Update Dependencies in package.json Files

Update dependency references in:

- `apps/cli/package.json` - Update all `@skyreach/*` dependencies
- `packages/core/package.json` - Update `@skyreach/schemas` dependency
- `packages/cli-kit/package.json` - Update `@skyreach/schemas` dependency
- `packages/test-helpers/package.json` - Update all `@skyreach/*` dependencies

### Phase 3: Update Root package.json

Update workspace script references:
- `npm run -w @skyreach/web` → `npm run -w @achm/web`
- `npm run -w @skyreach/cli` → `npm run -w @achm/cli`

### Phase 4: Update Import Statements

Bulk replace `@skyreach/` with `@achm/` in all TypeScript files:

- `apps/cli/src/**/*.ts` (~150+ files)
- `apps/web/src/**/*.ts` (~80+ files)
- `packages/*/src/**/*.ts` (~60+ files)
- `scripts/**/*.ts`

### Phase 5: Update Configuration Files

- `apps/web/astro.config.mjs` - Update import and Vite alias
- `.github/workflows/pr-tests.yml` - Update workspace references

### Phase 6: Rename CLI Binary

**Files to update:**

1. `apps/cli/src/skyreach.ts` → `apps/cli/src/hexcrawl.ts`
   - Update the `.name('skyreach')` call to `.name('hexcrawl')`

2. `apps/cli/package.json` - Update bin field:
   ```json
   "bin": {
     "hexcrawl": "./dist/hexcrawl.js"
   }
   ```

3. `apps/cli/tsconfig.build.json` - Update include if it references skyreach.ts

### Phase 7: Update Documentation

- `CLAUDE.md` - Update all `@skyreach` references and CLI name
- `README.md` - Update package references and CLI examples
- `packages/*/README.md` - Update package names
- `apps/*/CHANGELOG.md` - Update package references in changelog entries

### Phase 8: Regenerate package-lock.json and Verify

```bash
rm package-lock.json
npm install
npm run build
npm test
npm run typecheck
npm run lint
```

---

## Files to Modify (Key Files)

### Package.json files (8)
- `/package.json`
- `/apps/cli/package.json`
- `/apps/web/package.json`
- `/packages/schemas/package.json`
- `/packages/core/package.json`
- `/packages/data/package.json`
- `/packages/cli-kit/package.json`
- `/packages/test-helpers/package.json`

### CLI binary (2-3)
- `/apps/cli/src/skyreach.ts` → rename to `hexcrawl.ts`
- `/apps/cli/package.json` (bin field)
- `/apps/cli/tsconfig.build.json` (if applicable)

### Configuration (2)
- `/apps/web/astro.config.mjs`
- `/.github/workflows/pr-tests.yml`

### Documentation (3+)
- `/CLAUDE.md`
- `/README.md`
- Various package READMEs and CHANGELOGs
