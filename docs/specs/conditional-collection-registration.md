## Spike: Conditional Collection Registration in Astro

### Goal

Test whether Astro's content layer allows dynamically registering collections based on filesystem presence. If successful, this enables open-source users to skip unused features without seeing empty collection warnings.

### Hypothesis

Since `content.config.ts` runs at build time, Node.js filesystem checks (`fs.existsSync`) should work before collection registration. The unknown is whether Astro expects the `collections` export to be statically analyzable.

### Test Approach

1. **Create a minimal test branch** (don't pollute main)

2. **Modify `content.config.ts`** to conditionally register 2-3 collections:

```typescript
import fs from 'fs';
import path from 'path';

function collectionExists(dir: string): boolean {
  const fullPath = path.resolve(process.cwd(), dir);
  return fs.existsSync(fullPath);
}

// Conditionally define collections
const spells = collectionExists(DIRS.SPELLS)
  ? defineCollection({
      loader: glob({ pattern: '**/*.{yaml,yml}', base: DIRS.SPELLS }),
      schema: SpellSchema,
    })
  : null;

// Build collections object dynamically
const conditionalCollections: Record<string, CollectionConfig> = {};

if (spells) conditionalCollections.spells = spells;
// ... repeat for test collections

export const collections = {
  // Always-present collections
  hexes,
  regions,
  sessions,
  // Conditional ones spread in
  ...conditionalCollections,
};
```

3. **Test scenarios** (run each, note results):
  - `npm run dev` with directory present → collection works normally
  - `npm run dev` with directory missing/empty → no warning, no crash
  - `npm run build` with directory missing → builds successfully
  - Type inference in consuming code → `getCollection('spells')` still typed correctly?

4. **Alternative patterns to try if the above fails**:
  - Empty array loader: `loader: () => []` for missing directories
  - Proxy collection that returns empty on missing dir

### Success Criteria

- [x] Build succeeds with missing optional collection directories
- [x] No warnings for unused collections
- [x] Dev server works in both states
- [x] Type safety preserved

### Deliverable

Brief findings doc answering:
1. Does conditional registration work? (Yes/No/Partially)
2. Any gotchas or workarounds needed?
3. Recommended pattern for the codebase

### Time Box

~1 hour. If it works quickly, great. If Astro fights back, document the failure mode and move on to fallback options.

---

## Results (2025-12-20)

### Does conditional registration work?

**Partially.** Two patterns were tested:

#### Pattern A: Conditional null registration (FAILED)

```typescript
const spells = collectionExists(DIRS.SPELLS)
  ? defineCollection({ loader: glob(...), schema: SpellSchema })
  : null;

const conditionalCollections: Record<string, CollectionConfig> = {};
if (spells) conditionalCollections.spells = spells;

export const collections = {
  ...alwaysPresentCollections,
  ...conditionalCollections,
};
```

**Problem:** When spreading a dynamic `Record<string, CollectionConfig>` into the export, TypeScript loses specific collection types. Calls like `getCollection('rumors')` return a union of all possible collection data types instead of the specific schema type. This broke type safety with 29 type errors in consuming code.

#### Pattern B: Empty loader fallback (SUCCESS)

```typescript
const spells = defineCollection({
  loader: collectionExists(DIRS.SPELLS)
    ? glob({ pattern: '**/*.{yaml,yml}', base: DIRS.SPELLS })
    : () => [],
  schema: SpellSchema,
});
```

**Result:** Always register the collection with a static export, but use an empty loader when the directory is missing. Type safety is fully preserved because the `collections` export remains statically analyzable.

### Recommended Pattern

Use the empty loader fallback (Pattern B). The `collectionExists` helper:

```typescript
function collectionExists(dir: string): boolean {
  const fullPath = path.resolve(process.cwd(), 'src', dir);
  return fs.existsSync(fullPath);
}
```

### Implementation Notes

- Proof of concept implemented for `bounties`, `rumors`, and `spells` collections
- The pattern works with both `glob()` loaders and custom loaders like `getDirectoryYamlLoader`
- Collections with missing directories return empty arrays from `getCollection()` calls
- No runtime errors or build warnings when directories are absent
