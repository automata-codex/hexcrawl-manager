import { z } from 'zod';

/**
 * Sidebar configuration schemas for data/sidebar.yml
 *
 * The sidebar is organized into:
 * - shared: sections visible to all users
 * - gmOnly: sections visible only to GMs
 *
 * Items can be nested to arbitrary depth for ToC pages,
 * though the sidebar UI only displays 2 levels.
 */

/**
 * Typed href that references an article by ID
 */
export const ArticleHrefSchema = z
  .object({
    type: z.literal('article'),
    id: z.string(),
  })
  .describe('ArticleHrefSchema');

/**
 * Typed href that references a composite article by ID
 */
export const CompositeHrefSchema = z
  .object({
    type: z.literal('composite'),
    id: z.string(),
  })
  .describe('CompositeHrefSchema');

/**
 * Typed href that references a collection's index path
 */
export const CollectionHrefSchema = z
  .object({
    type: z.literal('collection'),
    path: z.string(),
  })
  .describe('CollectionHrefSchema');

/**
 * A sidebar href can be:
 * - A typed reference (article, composite, collection)
 * - A direct string path (for ToC pages, images, special cases)
 */
export const SidebarHrefSchema = z.union([
  ArticleHrefSchema,
  CompositeHrefSchema,
  CollectionHrefSchema,
  z.string(),
]);

export type SidebarHrefData = z.infer<typeof SidebarHrefSchema>;

/**
 * Base shape for sidebar items (used for recursive definition)
 */
const SidebarItemBaseSchema = z.object({
  id: z.string().optional().describe('Unique identifier'),
  label: z.string().describe('Display label'),
  href: SidebarHrefSchema.optional().describe('Link URL (typed reference or direct path)'),
  hasToC: z.boolean().optional().describe('Whether item has a ToC page'),
  tocHref: z
    .string()
    .optional()
    .describe('Path to ToC page (when hasToC is true)'),
});

/**
 * A sidebar item with recursive nesting support.
 * Items can contain sub-items to arbitrary depth.
 */
export type SidebarItemData = z.infer<typeof SidebarItemBaseSchema> & {
  items?: SidebarItemData[];
};

export const SidebarItemSchema: z.ZodType<SidebarItemData> = SidebarItemBaseSchema.extend({
  items: z.lazy(() => z.array(SidebarItemSchema).optional()).describe(
    'Sub-items (shown when expanded or on ToC page)',
  ),
});

/**
 * A sidebar section (top level)
 * Contains a label and list of items
 */
export const SidebarSectionSchema = z
  .object({
    id: z.string().describe('Unique identifier'),
    label: z.string().describe('Display label'),
    href: z.string().optional().describe('Link to section ToC page'),
    items: z.array(SidebarItemSchema).describe('Items in this section'),
  })
  .describe('SidebarSectionSchema');

/**
 * Root sidebar configuration
 * Separates shared (public) and GM-only sections
 */
export const SidebarConfigSchema = z
  .object({
    shared: z
      .array(SidebarSectionSchema)
      .describe('Sections visible to all users'),
    gmOnly: z
      .array(SidebarSectionSchema)
      .describe('Sections visible only to GMs'),
  })
  .describe('SidebarConfigSchema');

export type SidebarSectionData = z.infer<typeof SidebarSectionSchema>;
export type SidebarConfigData = z.infer<typeof SidebarConfigSchema>;
