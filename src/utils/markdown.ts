import rehypeAddClasses from 'rehype-add-classes';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import { remark } from 'remark';
import remarkRehype from 'remark-rehype';
import remarkSmartypants from 'remark-smartypants';

export async function renderMarkdown(markdown: string) {
  // Changes to this pipeline should also be made to `astro.config.mjs`
  const result = await remark()
    .use(remarkRehype, { allowDangerousHtml: true }) // Converts MDAST to HAST
    .use(rehypeRaw) // Allows raw HTML in markdown
    .use(remarkSmartypants) // Adds typographic enhancements
    .use(rehypeAddClasses, {
      h1: 'title is-2',
      h2: 'title is-3',
      h3: 'title is-4',
      h4: 'title is-5',
      strong: 'inline-heading',
    })
    .use(rehypeStringify, { allowDangerousHtml: true }) // Converts HAST to HTML
    .process(markdown);
  return result.toString();
}
