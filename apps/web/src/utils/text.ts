import retextParse from 'retext-english';
import retextSmartypants from 'retext-smartypants';
import retextStringify from 'retext-stringify';
import { unified } from 'unified';

/**
 * @deprecated Use `renderBulletMarkdown` from `src/utils/markdown.ts` instead.
 */
export async function formatText(text: string) {
  const file = await unified()
    .use(retextParse) // Parse the text
    .use(retextSmartypants, { dashes: 'oldschool' }) // Apply typographic transformations
    .use(retextStringify) // Convert the processed tree back to plain text
    .process(text);

  return String(file);
}
