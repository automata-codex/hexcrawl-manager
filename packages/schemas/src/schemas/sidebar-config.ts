import { z } from 'zod';

/**
 * Sidebar configuration schemas for data/sidebar.yml
 *
 * The sidebar is organized into:
 * - shared: sections visible to all users
 * - gmOnly: sections visible only to GMs
 */

/**
 * A sub-item within a sidebar item (third level of nesting)
 */
export const SidebarSubItemSchema = z
  .object({
    label: z.string().describe('Display label'),
    href: z.string().describe('URL path'),
  })
  .describe('SidebarSubItemSchema');

/**
 * A sidebar item (second level of nesting)
 * Can be a simple link or an expandable section with sub-items
 */
export const SidebarItemSchema = z
  .object({
    id: z.string().describe('Unique identifier'),
    label: z.string().describe('Display label'),
    href: z.string().optional().describe('Direct link URL'),
    expandable: z.boolean().optional().describe('Whether item can expand'),
    hasToC: z.boolean().optional().describe('Whether item has a ToC page'),
    tocHref: z
      .string()
      .optional()
      .describe('Path to ToC page (when hasToC is true)'),
    items: z
      .array(SidebarSubItemSchema)
      .optional()
      .describe('Sub-items (shown when expanded or on ToC page)'),
  })
  .describe('SidebarItemSchema');

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

export type SidebarSubItemData = z.infer<typeof SidebarSubItemSchema>;
export type SidebarItemData = z.infer<typeof SidebarItemSchema>;
export type SidebarSectionData = z.infer<typeof SidebarSectionSchema>;
export type SidebarConfigData = z.infer<typeof SidebarConfigSchema>;
