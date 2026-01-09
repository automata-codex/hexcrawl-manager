#!/usr/bin/env tsx
/**
 * Validate Table of Contents Configuration
 *
 * This script validates:
 * 1. All top-level sections have an href for their ToC page
 * 2. All items with hasToC: true have a tocHref set
 * 3. All tocHref values start with /
 *
 * Usage:
 *   tsx scripts/validate-toc-config.ts
 *   npm run validate:toc
 */

import { getSidebarSections } from '../src/config/sidebar-sections';

import type { SidebarHref } from '../src/types';

function isStringHref(href: SidebarHref | undefined): href is string {
  return typeof href === 'string';
}

interface ValidationError {
  type: 'missing-section-href' | 'missing-toc-href' | 'invalid-toc-href';
  sectionId: string;
  itemId?: string;
  message: string;
}

function validate(): ValidationError[] {
  const errors: ValidationError[] = [];

  // Get all sections using includeAll to bypass role checking
  const sections = getSidebarSections(null, { includeAll: true });

  for (const section of sections) {
    // Check that section has href for ToC page
    if (!section.href) {
      errors.push({
        type: 'missing-section-href',
        sectionId: section.id,
        message: `Section "${section.id}" is missing href for ToC page`,
      });
    } else if (isStringHref(section.href) && !section.href.startsWith('/')) {
      errors.push({
        type: 'invalid-toc-href',
        sectionId: section.id,
        message: `Section "${section.id}" href "${section.href}" should start with /`,
      });
    }

    // Check items
    for (const item of section.items) {
      if (item.hasToC) {
        if (!item.tocHref) {
          errors.push({
            type: 'missing-toc-href',
            sectionId: section.id,
            itemId: item.id,
            message: `Item "${item.id}" in section "${section.id}" has hasToC=true but no tocHref`,
          });
        } else if (!item.tocHref.startsWith('/')) {
          errors.push({
            type: 'invalid-toc-href',
            sectionId: section.id,
            itemId: item.id,
            message: `Item "${item.id}" tocHref "${item.tocHref}" should start with /`,
          });
        }
      }
    }
  }

  return errors;
}

function main() {
  console.log('Validating ToC configuration...\n');

  const errors = validate();

  if (errors.length > 0) {
    console.error('ToC configuration errors found:\n');
    for (const error of errors) {
      console.error(`  - ${error.message}`);
    }
    console.error('\nToC validation failed!\n');
    process.exit(1);
  }

  // Print summary of ToC pages
  const sections = getSidebarSections(null, { includeAll: true });
  const tocPages: string[] = [];

  for (const section of sections) {
    if (isStringHref(section.href)) {
      tocPages.push(section.href);
    }
    for (const item of section.items) {
      if (item.hasToC && item.tocHref) {
        tocPages.push(item.tocHref);
      }
    }
  }

  console.log(`Found ${tocPages.length} ToC pages configured:`);
  for (const page of tocPages.sort()) {
    console.log(`  ${page}`);
  }

  console.log('\nToC configuration validated successfully!\n');
  process.exit(0);
}

main();
