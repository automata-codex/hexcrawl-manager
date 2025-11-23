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
  href?: string;
  hasToC?: boolean;
  tocHref?: string;
  items?: ResolvedSubItem[];
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
 * Checks section hrefs, item tocHrefs, and sub-item tocHrefs recursively.
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
          items: collectToCItemsFromSubItems(item.items),
          // Sub-section ToCs have the section as their parent
          parent: section.href
            ? { label: section.label, href: section.href }
            : undefined,
        };
      }

      // Check sub-items for nested ToC pages
      if (item.items) {
        const subItemResult = findToCInSubItems(
          path,
          item.items,
          item.hasToC && item.tocHref
            ? { label: item.label, href: item.tocHref }
            : section.href
              ? { label: section.label, href: section.href }
              : undefined,
        );
        if (subItemResult) {
          return subItemResult;
        }
      }
    }
  }

  return null;
}

/**
 * Recursively search sub-items for a ToC page match
 */
function findToCInSubItems(
  path: string,
  subItems: ResolvedSubItem[],
  parent?: { label: string; href: string },
): ToCPageData | null {
  for (const subItem of subItems) {
    if (subItem.hasToC && subItem.tocHref === path && subItem.items) {
      return {
        title: subItem.label,
        items: collectToCItemsFromSubItems(subItem.items),
        parent,
      };
    }

    // Recurse into nested sub-items
    if (subItem.items) {
      const result = findToCInSubItems(
        path,
        subItem.items,
        subItem.hasToC && subItem.tocHref
          ? { label: subItem.label, href: subItem.tocHref }
          : parent,
      );
      if (result) {
        return result;
      }
    }
  }

  return null;
}

/**
 * Collect ToC items from sub-items array
 */
function collectToCItemsFromSubItems(
  subItems: ResolvedSubItem[],
): { label: string; href: string }[] {
  const result: { label: string; href: string }[] = [];

  for (const subItem of subItems) {
    if (subItem.hasToC && subItem.tocHref) {
      // Sub-item with ToC page - link to the ToC page
      result.push({ label: subItem.label, href: subItem.tocHref });
    } else if (subItem.href) {
      // Direct link sub-item
      result.push({ label: subItem.label, href: subItem.href });
    }
  }

  return result;
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
      result.push(...collectToCItemsFromSubItems(item.items));
    }
  }

  return result;
}
