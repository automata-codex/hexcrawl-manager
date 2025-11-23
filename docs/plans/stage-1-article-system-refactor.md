# Stage 1: Article System Refactor - Implementation Plan

**Source Spec:** `docs/specs/site-navigation.md` (Stage 1)
**Created:** 2024-11-22

## Overview

This plan refactors the article system to:
- Eliminate the `ARTICLE_ROUTES` array from `apps/web/src/config/routes.ts`
- Make articles self-describing with `id` and `slug` in frontmatter
- Create a unified catch-all route handler
- Support both simple articles and composite articles (multi-part pages)

## Current State Summary

- **50+ simple articles** mapped via `ARTICLE_ROUTES` array (slug → path)
- **Composite articles** as dedicated `.astro` files (e.g., `cosmology.astro`, `havens.astro`)
- **Article schema** has `title`, optional `secure`, optional `slug`
- **Catch-all route** `[...article].astro` uses `ARTICLE_ROUTES` to find articles by path

## Design Decisions

1. **Pages with inline content** (like `known-world.astro`) will be converted to markdown articles
2. **Custom styling** in composite articles will be dropped; flagged for manual review post-migration
3. **Build-time validation** will ensure all article `id` and `slug` values are unique

---

## Phase 1: Schema Updates

**Goal:** Extend schemas to support new `id` and required `slug` fields

### Tasks

1. Update article schema in `apps/web/src/content.config.ts`:
   - Add required `id` field (string, unique identifier)
   - Make `slug` required (string, full URL path starting with `/`)

2. Create composite-articles collection:
   - Create `data/composite-articles/` directory
   - Define schema for composite articles:
     ```typescript
     {
       id: string;           // Unique identifier
       slug: string;         // Full URL path
       title: string;        // Page title
       sections: Array<{
         articleId: string;  // Reference to article id
         secure: boolean;    // Whether to wrap in SecretContent
       }>;
     }
     ```
   - Add collection definition in `content.config.ts`

3. Run `npx astro sync` to verify schema compiles

### Deliverable

Schema changes ready, composite-articles collection defined (but empty)

---

## Phase 2: Migrate Simple Article Frontmatter

**Goal:** Add `id` and `slug` to all existing articles

### Tasks

1. Generate migration mapping from `ARTICLE_ROUTES`:
   - For each entry: `{ slug, path }` → derive `id` from slug, use `path` as new `slug`

2. Update all article files in `data/articles/`:
   - Add `id` field (derive from filename, e.g., `biomes.mdx` → `id: biomes`)
   - Add `slug` field (full URL path from `ARTICLE_ROUTES`)

3. Handle articles not in `ARTICLE_ROUTES`:
   - `cosmology-public.md`, `cosmology-secret.md` - these are parts of composite articles
   - `existing-haven-rules.md`, `haven-requirements.md`, `new-haven-rules.md` - parts of havens composite
   - These get `id` but no `slug` (they're referenced by composite articles)

4. Run `npx astro sync` to verify all articles pass schema validation

### Migration Mapping

| Filename | id | slug |
|----------|-----|------|
| `biomes.mdx` | `biomes` | `/gm-reference/biomes` |
| `house-rules.md` | `house-rules` | `/players-reference/rules/house-rules` |
| ... (full mapping derived from ARTICLE_ROUTES) | | |

### Deliverable

All simple articles have self-describing frontmatter with `id` and `slug`

---

## Phase 3: Create Composite Article Configs

**Goal:** Replace dedicated `.astro` composite pages with YAML configs

### Tasks

1. Identify composite article pages to migrate:
   - `cosmology.astro` → combines `cosmology-public` + `cosmology-secret`
   - `havens.astro` → combines 3 articles (has custom styles - FLAG FOR REVIEW)

2. Identify pages with inline content to convert to markdown:
   - `known-world.astro` → create `data/articles/known-world.md`

3. Create YAML configs in `data/composite-articles/`:

   ```yaml
   # cosmology.yml
   id: cosmology
   slug: /players-reference/setting/cosmology
   title: Cosmology
   sections:
     - articleId: cosmology-public
       secure: false
     - articleId: cosmology-secret
       secure: true
   ```

   ```yaml
   # havens.yml
   id: havens
   slug: /players-reference/rules/havens
   title: Havens
   # NOTE: Original had custom table styles - flagged for manual review
   sections:
     - articleId: existing-haven-rules
       secure: false
     - articleId: haven-requirements
       secure: true
       heading: "Haven Requirements"  # Custom heading from original
     - articleId: new-haven-rules
       secure: false
       heading: "Founding a New Haven"  # Custom heading from original
   ```

4. Audit remaining `.astro` pages to identify any other candidates:
   - Collection pages (`[id].astro`, `index.astro`) - NOT candidates, keep as-is
   - Special pages (maps, interactive content) - NOT candidates, keep as-is

### Pages Flagged for Manual Review

- `havens.astro` - had custom table styles (dropped in migration)

### Deliverable

YAML configs for all composite articles, inline content pages converted to markdown

---

## Phase 4: Path Resolution Helpers

**Goal:** Create functions to resolve article/composite IDs to paths

### Tasks

1. Add helpers in `apps/web/src/config/routes.ts`:

   ```typescript
   import { getCollection } from 'astro:content';

   // Cache collections at module level (populated at build time)
   let articlesCache: CollectionEntry<'articles'>[] | null = null;
   let compositesCache: CollectionEntry<'composite-articles'>[] | null = null;

   async function getArticles() {
     if (!articlesCache) {
       articlesCache = await getCollection('articles');
     }
     return articlesCache;
   }

   async function getComposites() {
     if (!compositesCache) {
       compositesCache = await getCollection('composite-articles');
     }
     return compositesCache;
   }

   export async function getArticlePath(articleId: string): Promise<string> {
     const articles = await getArticles();
     const article = articles.find(a => a.data.id === articleId);
     if (!article) throw new Error(`Article not found: ${articleId}`);
     if (!article.data.slug) throw new Error(`Article has no slug: ${articleId}`);
     return article.data.slug;
   }

   export async function getCompositePath(compositeId: string): Promise<string> {
     const composites = await getComposites();
     const composite = composites.find(c => c.data.id === compositeId);
     if (!composite) throw new Error(`Composite not found: ${compositeId}`);
     return composite.data.slug;
   }

   export type RouteConfig =
     | string
     | { type: 'article'; id: string }
     | { type: 'composite'; id: string };

   export async function resolvePath(route: RouteConfig): Promise<string> {
     if (typeof route === 'string') return route;
     if (route.type === 'article') return getArticlePath(route.id);
     if (route.type === 'composite') return getCompositePath(route.id);
     throw new Error(`Unknown route type: ${JSON.stringify(route)}`);
   }
   ```

2. Consider sync vs async trade-offs (Astro's `getCollection` is async)

### Deliverable

Helper functions for path resolution ready to use

---

## Phase 5: Update Catch-All Route Handler

**Goal:** Make `[...article].astro` resolve by slug instead of `ARTICLE_ROUTES`

### Tasks

1. Update `apps/web/src/pages/[...article].astro`:

   ```astro
   ---
   import { getCollection, getEntry, render } from 'astro:content';

   import ArticleLayout from '../layouts/ArticleLayout.astro';
   import SecretArticleLayout from '../layouts/SecretArticleLayout.astro';
   import SecretContent from '../components/Content/SecretContent.astro';

   const currentPath = Astro.url.pathname;

   // 1. Try composite articles first
   const composites = await getCollection('composite-articles');
   const composite = composites.find(c => c.data.slug === currentPath);

   if (composite) {
     // Render composite article
     const sections = await Promise.all(
       composite.data.sections.map(async (section) => {
         const article = await getEntry('articles', section.articleId);
         if (!article) throw new Error(`Article not found: ${section.articleId}`);
         const { Content } = await render(article);
         return { Content, secure: section.secure, heading: section.heading };
       })
     );
     // ... render with sections
   }

   // 2. Try simple articles
   const articles = await getCollection('articles');
   const article = articles.find(a => a.data.slug === currentPath);

   if (!article) {
     return new Response(null, { status: 404, statusText: 'Not found' });
   }

   const { Content } = await render(article);
   const isSecure = article.data.secure ?? false;
   const title = article.data.title;
   ---

   {/* Render article or composite */}
   ```

2. Create `CompositeArticle.astro` component for rendering composite articles

### Deliverable

Catch-all handler works with slug-based resolution for both simple and composite articles

---

## Phase 6: Build-Time Validation

**Goal:** Ensure all `id` and `slug` values are unique

### Tasks

1. Create validation script `apps/web/scripts/validate-articles.ts`:

   ```typescript
   import { getCollection } from 'astro:content';

   export async function validateArticles() {
     const articles = await getCollection('articles');
     const composites = await getCollection('composite-articles');

     // Check for duplicate article IDs
     const articleIds = articles.map(a => a.data.id);
     const duplicateIds = articleIds.filter((id, i) => articleIds.indexOf(id) !== i);
     if (duplicateIds.length > 0) {
       throw new Error(`Duplicate article IDs: ${duplicateIds.join(', ')}`);
     }

     // Check for duplicate slugs (across articles and composites)
     const allSlugs = [
       ...articles.filter(a => a.data.slug).map(a => a.data.slug),
       ...composites.map(c => c.data.slug),
     ];
     const duplicateSlugs = allSlugs.filter((slug, i) => allSlugs.indexOf(slug) !== i);
     if (duplicateSlugs.length > 0) {
       throw new Error(`Duplicate slugs: ${duplicateSlugs.join(', ')}`);
     }

     // Validate composite article references
     const articleIdSet = new Set(articleIds);
     for (const composite of composites) {
       for (const section of composite.data.sections) {
         if (!articleIdSet.has(section.articleId)) {
           throw new Error(
             `Composite "${composite.data.id}" references unknown article: ${section.articleId}`
           );
         }
       }
     }

     console.log('Article validation passed!');
   }
   ```

2. Integrate into build process (run before Astro build)

### Deliverable

Build fails fast if article IDs or slugs are duplicated

---

## Phase 7: Update Consumers & Cleanup

**Goal:** Remove dependencies on `ARTICLE_ROUTES` and clean up

### Tasks

1. Audit imports of `ARTICLE_ROUTES`:
   - `[...article].astro` - will be updated in Phase 5
   - Any other files?

2. Delete `ARTICLE_ROUTES` array from `apps/web/src/config/routes.ts`

3. Delete dedicated composite `.astro` files:
   - `apps/web/src/pages/players-reference/setting/cosmology.astro`
   - `apps/web/src/pages/players-reference/rules/havens.astro`
   - `apps/web/src/pages/players-reference/setting/known-world.astro` (after converting to markdown)

4. Update `ROUTES` object if any paths reference deleted pages

5. Run full verification:
   - `npm run build:web`
   - Manual spot-check of article URLs

### Deliverable

Clean codebase, `ARTICLE_ROUTES` deleted, all existing URLs working

---

## Testing Checklist

After each phase, verify:

- [ ] `npx astro sync` succeeds
- [ ] `npm run typecheck` passes
- [ ] `npm run build:web` succeeds

After Phase 7 (final):

- [ ] All existing article URLs return 200
- [ ] All composite articles render correctly
- [ ] Secure content shows/hides based on user role
- [ ] Sidebar navigation works correctly
- [ ] No console errors in browser

---

## Rollback Plan

If issues arise:
1. Revert frontmatter changes to articles
2. Restore `ARTICLE_ROUTES` array
3. Restore deleted `.astro` files
4. Remove composite-articles collection

Git makes this straightforward - each phase should be a reviewable commit.
