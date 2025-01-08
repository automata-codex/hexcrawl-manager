import rehypeAddClasses from 'rehype-add-classes';
import rehypeStringify from 'rehype-stringify';
import { remark } from 'remark';
import remarkRehype from 'remark-rehype';
import remarkSmartypants from 'remark-smartypants';

export async function renderMarkdown(markdown: string) {
  const result = await remark()
    .use(remarkRehype) // Converts MDAST to HAST
    .use(remarkSmartypants) // Adds typographic enhancements
    .use(rehypeAddClasses, {
      h1: 'title is-2',
      h2: 'title is-3',
      h3: 'title is-4',
      h4: 'title is-5',
      strong: 'inline-heading',
    })
    .use(rehypeStringify) // Converts HAST to HTML
    .process(markdown);
  return result.toString();
}
