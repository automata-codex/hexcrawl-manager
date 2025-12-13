# NPC Pages Specification

## Problem

NPCs are currently displayed only on a single list page (`/players-reference/setting/npcs`). This creates two issues:

1. **No linkable targets**: Clue placements cannot link to specific NPCs since there are no individual NPC pages
2. **Limited content space**: NPCs like Ulrich Varrian need extended content (backstory, roleplaying notes, secrets) that doesn't fit well in a YAML `description` field

## Goal

1. Create individual NPC pages that can be linked from clue placements and other content
2. Support a hybrid file format where simple NPCs remain YAML files while content-heavy NPCs use MDX with front matter
3. Keep the existing list page functional, adding links to individual pages

---

## Schema Changes

### Content Collection Loader

Update the NPCs collection to use Astro's `glob` loader instead of the custom `getDirectoryYamlLoader`. This enables mixed file types:

```typescript
// In apps/web/src/content.config.ts

const npcs = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml,md,mdx}', base: DIRS.NPCS }),
  schema: NpcSchema,
});
```

### NpcSchema

The existing schema remains unchanged:

```typescript
export const NpcSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string().optional(),
  occupation: z.string(),
  class: ClassEnum.optional(),
  adventuringCompany: z.string().optional(),
  species: z.string(),
  culture: z.string(),
  pronouns: z.string(),
  description: z.string(),
  image: z.string().optional(),
  notes: z.array(z.string()).optional(),
  clues: ClueReferencesSchema.describe('IDs of clues this NPC knows or can reveal'),
});
```

**Key insight**: The `description` field serves as a short summary for list views. Extended content lives in the MDX body (not a schema field).

---

## File Format

### Hybrid Approach

The collection supports two file formats in the same directory:

#### YAML Files (Simple NPCs)

For NPCs with minimal content, use standard YAML:

```yaml
# data/npcs/brix-stokewheel.yaml
id: brix-stokewheel
name: Brix Stokewheel
occupation: Wagon driver
species: Dwarf
culture: Mountain dwarf
pronouns: she/her
description: A grizzled and tough wagon driver who's made countless trips through
  the treacherous mountain road.
image: /images/npcs/brix-stokewheel.webp
clues:
  - burned-wagon
```

#### MDX Files (Content-Heavy NPCs)

For NPCs needing extended content, use MDX with front matter:

```mdx
---
id: ulrich-varrian
name: Ulrich Varrian
title: Merchant Prince
occupation: Merchant
species: Human
culture: Valossian
pronouns: he/him
description: A wealthy and influential merchant with connections throughout the region.
image: /images/npcs/ulrich-varrian.webp
clues:
  - trade-route-secrets
  - id: missing-shipment
    context: Will reveal if players help recover his goods
---

## Background

Ulrich Varrian rose from humble beginnings as a dockworker's son to become
one of the most powerful merchants in the region...

## Roleplaying Notes

Ulrich speaks slowly and deliberately, always weighing his words. He never
makes a promise he can't keep, but he's also careful never to promise more
than necessary...

## Secrets

<SecretContent>
Ulrich is secretly funding expeditions into the Skyreach Mountains, looking
for First Civilization artifacts...
</SecretContent>
```

### Content Guidelines

| Field | Purpose | Length |
|-------|---------|--------|
| `description` | List page summary, quick reference | 1-3 sentences |
| MDX body | Extended content for detail page | Unlimited |

NPCs without MDX body content will show only their structured data on their detail page.

---

## URL Structure

### Individual NPC Pages

```
/players-reference/setting/npcs/[id]
```

Examples:
- `/players-reference/setting/npcs/brix-stokewheel`
- `/players-reference/setting/npcs/ulrich-varrian`

### List Page

Move from `npcs.astro` to `npcs/index.astro`:

```
# Before
apps/web/src/pages/players-reference/setting/npcs.astro

# After
apps/web/src/pages/players-reference/setting/npcs/index.astro
```

The URL remains `/players-reference/setting/npcs` — Astro treats `npcs/index.astro` the same as `npcs.astro`.

---

## Page Components

### NPC Detail Page

Create `apps/web/src/pages/players-reference/setting/npcs/[id].astro`:

```astro
---
import { getCollection, render } from 'astro:content';
import SecretContent from '../../../../components/Content/SecretContent.astro';
import ComponentLayout from '../../../../layouts/ComponentLayout.astro';
import { renderMarkdown } from '../../../../utils/markdown';

export async function getStaticPaths() {
  const npcs = await getCollection('npcs');
  return npcs.map((npc) => ({
    params: { id: npc.id },
    props: { npc },
  }));
}

const { npc } = Astro.props;

// Only MDX entries have renderable content
const hasContent = npc.filePath?.endsWith('.mdx') || npc.filePath?.endsWith('.md');
const { Content } = hasContent ? await render(npc) : { Content: null };
---

<ComponentLayout title={npc.data.name}>
  <main>
    {npc.data.image && <img src={npc.data.image} alt={npc.data.name} />}

    <h1 class="title is-2">{npc.data.name}</h1>
    {npc.data.title && <p class="subtitle">{npc.data.title}</p>}

    <dl>
      <dt>Occupation</dt>
      <dd>{formatOccupation(npc.data)}</dd>

      <dt>Species</dt>
      <dd>{npc.data.species}</dd>

      <dt>Culture</dt>
      <dd>{npc.data.culture}</dd>

      <dt>Pronouns</dt>
      <dd>{npc.data.pronouns}</dd>
    </dl>

    <div class="description">
      <Fragment set:html={renderMarkdown(npc.data.description)} />
    </div>

    {Content && (
      <div class="extended-content">
        <Content components={{ SecretContent }} />
      </div>
    )}

    <SecretContent>
      {npc.data.notes && (
        <section class="notes">
          <h2>GM Notes</h2>
          <ul>
            {npc.data.notes.map((note) => <li>{note}</li>)}
          </ul>
        </section>
      )}
    </SecretContent>
  </main>
</ComponentLayout>
```

### NPC List Page Updates

Update `apps/web/src/pages/players-reference/setting/npcs.astro` to link to individual pages:

```astro
{npcData.map((npc) => (
  <section>
    {/* ... existing content ... */}
    <h2 class="title is-4">
      <a href={`/players-reference/setting/npcs/${npc.id}`}>
        {npc.data.name}
      </a>
    </h2>
    {/* ... rest of existing content ... */}
  </section>
))}
```

---

## Routes Configuration

### Update routes.yml

Add NPC collection to `data/routes.yml`:

```yaml
playersReference:
  setting:
    bountyBoard:
      type: collection
      path: /players-reference/setting/bounty-board
      idPath: /players-reference/setting/bounty-board/[id]
    npcs:                                              # Add this block
      type: collection
      path: /players-reference/setting/npcs
      idPath: /players-reference/setting/npcs/[id]
```

### Add route helper to generator

The route helpers are generated from a template in `apps/web/scripts/generate-config.ts`. Add the `getNpcPath` helper to the template string (around line 161, after `getBountyPath`):

```typescript
export function getNpcPath(npcId: string): string {
  return getCollectionItemPath(ROUTES.playersReference.setting.npcs as CollectionRoute, npcId);
}
```

### Regenerate routes

Run the config generator to update `apps/web/src/config/generated/routes.ts`:

```bash
npm run generate:config
```

This enables clue placements and other content to link to NPCs consistently.

---

## Clue Backlink Updates

### Problem

The `Clue.astro` component displays "Located in" backlinks for clues. Currently, the `getUsageUrl` function returns `'#'` for `npc`, `character`, and `plotline` types because no individual pages existed.

### Update getUsageUrl

In `apps/web/src/components/Clue.astro`, update the `getUsageUrl` function to handle all reference types:

```typescript
import {
  getCharacterPath,
  getDungeonPath,
  getEncounterPath,
  getHexPath,
  getNpcPath,           // Add import
  getPlotlinePath,
  getPointcrawlNodePath,
} from '../config/routes';

// Helper to get the URL for a usage reference
function getUsageUrl(ref: ClueUsageReference): string {
  switch (ref.type) {
    case 'encounter':
      return getEncounterPath(ref.id);
    case 'hex-landmark':
    case 'hex-hidden-site':
    case 'hex-dream':
    case 'hex-keyed-encounter':
      return getHexPath(ref.hexId || ref.id);
    case 'dungeon':
      return getDungeonPath(ref.id);
    case 'pointcrawl-node':
      return getPointcrawlNodePath(ref.id);
    case 'character':
      return getCharacterPath(ref.id);
    case 'npc':
      return getNpcPath(ref.id);
    case 'plotline':
      return getPlotlinePath(ref.id);
    default:
      return '#';
  }
}
```

This ensures clue pages link to the correct NPC detail pages in the "Located in" section.

---

## Clue Integration

### Linking Clues to NPCs

Clue placements can now reference NPC pages:

```yaml
# In a clue file
placements:
  - type: npc
    id: ulrich-varrian
    context: "Will reveal if asked about trade routes"
```

### Clue Display on NPC Pages

The NPC detail page can optionally display clues the NPC knows:

```astro
{npc.data.clues && npc.data.clues.length > 0 && (
  <SecretContent>
    <section class="clues">
      <h2>Clues This NPC Knows</h2>
      <ul>
        {npc.data.clues.map((clue) => (
          <li>
            <a href={getCluePath(normalizeClueRef(clue).id)}>
              {normalizeClueRef(clue).id}
            </a>
            {normalizeClueRef(clue).context && (
              <span class="context"> — {normalizeClueRef(clue).context}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  </SecretContent>
)}
```

---

## Migration Strategy

### Phase 1: Infrastructure

1. Update `data/routes.yml` to add NPC collection routes
2. Add `getNpcPath` helper to `apps/web/scripts/generate-config.ts` template
3. Run `npm run generate:config` to regenerate route helpers
4. Update content collection loader to use glob with mixed patterns
5. Move `npcs.astro` to `npcs/index.astro`
6. Create the NPC detail page component at `npcs/[id].astro`
7. Update list page with links to detail pages
8. Update `Clue.astro` `getUsageUrl` to handle `npc` type

### Phase 2: Content Migration (As Needed)

Convert NPCs to MDX only when extended content is needed:

1. Rename `npc-name.yaml` to `npc-name.mdx`
2. Convert YAML to front matter (add `---` delimiters)
3. Add extended content below front matter
4. Validate with `npm run build:web`

**No bulk migration required** — YAML files continue to work alongside MDX files.

### Migration Example

Before (`data/npcs/ulrich-varrian.yaml`):
```yaml
id: ulrich-varrian
name: Ulrich Varrian
occupation: Merchant
species: Human
culture: Valossian
pronouns: he/him
description: A wealthy merchant with regional connections.
```

After (`data/npcs/ulrich-varrian.mdx`):
```mdx
---
id: ulrich-varrian
name: Ulrich Varrian
occupation: Merchant
species: Human
culture: Valossian
pronouns: he/him
description: A wealthy merchant with regional connections.
---

## Background

Extended backstory content here...
```

---

## Testing

### Manual Testing Checklist

- [ ] YAML NPCs load correctly in list and detail views
- [ ] MDX NPCs render body content on detail pages
- [ ] NPCs without body content show structured data only
- [ ] Links from list page navigate to detail pages
- [ ] `SecretContent` components work in MDX body
- [ ] Images display correctly
- [ ] Clue references display on NPC pages (GM view)
- [ ] Clue "Located in" backlinks navigate to NPC detail pages
- [ ] Route helper `getNpcPath` generates correct paths
- [ ] Index page URL unchanged at `/players-reference/setting/npcs`

### Build Validation

```bash
npm run build:web  # Should complete without errors
npm run typecheck  # Verify TypeScript types
```

---

## Future Considerations

### Potential Enhancements

- **NPC relationships**: Link NPCs to each other (allies, rivals, family)
- **Location associations**: Link NPCs to hexes/regions where they can be found
- **Faction membership**: Formal faction field for filtering
- **Session appearance tracking**: Show which sessions an NPC appeared in
- **Portrait gallery**: Multiple images per NPC

### Open Questions

- Should the list page show a "has extended content" indicator?
- Should NPCs be filterable by faction/location on the list page?
- Should clue context from NPC files appear on the clue list page?
