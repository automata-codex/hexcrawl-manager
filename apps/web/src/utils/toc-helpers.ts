/**
 * Helper functions for Table of Contents page resolution.
 * Used by the catch-all route handler to detect and render ToC pages.
 */

import type { SidebarSection, SidebarItem } from '../types';

export interface ToCPageData {
  title: string;
  items: { label: string; href: string }[];
}

/**
 * Find a ToC page configuration for a given path.
 * Checks both top-level section hrefs and item tocHrefs.
 *
 * @param path - The URL path to check (e.g., '/gm-reference/first-civilization')
 * @param sections - The sidebar sections configuration
 * @returns ToC page data if path matches a ToC page, null otherwise
 */
export function findToCPage(
  path: string,
  sections: SidebarSection[],
): ToCPageData | null {
  for (const section of sections) {
    // Check if this is a top-level section ToC page
    if (section.href === path) {
      // Collect all items from this section
      const items = collectToCItems(section.items);
      return {
        title: section.label,
        items,
      };
    }

    // Check items for sub-section ToC pages
    for (const item of section.items) {
      if (item.hasToC && item.tocHref === path && item.items) {
        return {
          title: item.label,
          items: item.items.map((subItem) => ({
            label: subItem.label,
            href: subItem.href,
          })),
        };
      }
    }
  }

  return null;
}

/**
 * Collect all navigable items from a section's items array.
 * Flattens expandable items to include their sub-items.
 */
function collectToCItems(
  items: SidebarItem[],
): { label: string; href: string }[] {
  const result: { label: string; href: string }[] = [];

  for (const item of items) {
    if (item.href) {
      // Direct link item
      result.push({ label: item.label, href: item.href });
    }

    if (item.hasToC && item.tocHref) {
      // Item with ToC page - link to the ToC page
      result.push({ label: item.label, href: item.tocHref });
    } else if (item.expandable && item.items) {
      // Expandable item without ToC - include sub-items directly
      for (const subItem of item.items) {
        result.push({ label: subItem.label, href: subItem.href });
      }
    }
  }

  return result;
}
