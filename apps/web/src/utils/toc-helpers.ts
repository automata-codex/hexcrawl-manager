/**
 * Helper functions for Table of Contents page resolution.
 * Used by the catch-all route handler to detect and render ToC pages.
 *
 * IMPORTANT: These functions expect RESOLVED sidebar sections where all
 * typed hrefs have been converted to URL strings. Call resolveSidebarSections()
 * before passing sections to these functions.
 */

export interface ToCPageData {
  title: string;
  items: { label: string; href: string }[];
  parent?: { label: string; href: string };
}

/**
 * Resolved sidebar types - after href resolution, all hrefs are strings
 */
export interface ResolvedSubItem {
  label: string;
  href: string;
}

export interface ResolvedItem {
  id?: string;
  label: string;
  href?: string;
  expandable?: boolean;
  hasToC?: boolean;
  tocHref?: string;
  items?: ResolvedSubItem[];
}

export interface ResolvedSection {
  id: string;
  label: string;
  href?: string;
  items: ResolvedItem[];
}

/**
 * Find a ToC page configuration for a given path.
 * Checks both top-level section hrefs and item tocHrefs.
 *
 * @param path - The URL path to check (e.g., '/gm-reference/first-civilization')
 * @param sections - The sidebar sections configuration (must be resolved)
 * @returns ToC page data if path matches a ToC page, null otherwise
 */
export function findToCPage(
  path: string,
  sections: ResolvedSection[],
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
          // Sub-section ToCs have the section as their parent
          parent: section.href
            ? { label: section.label, href: section.href }
            : undefined,
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
  items: ResolvedItem[],
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
