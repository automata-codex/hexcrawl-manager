import rehypeAddClasses from 'rehype-add-classes';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import { remark } from 'remark';
import remarkBehead from 'remark-behead';
import remarkRehype from 'remark-rehype';
import remarkSmartypants from 'remark-smartypants';

interface AdditionalPlugin {
  plugin: any;
  options?: any;
  position: number;
}

function createBasePipeline(additionalPlugins: AdditionalPlugin[] = []) {
  const defaultPlugins = [
    { plugin: remarkRehype, options: { allowDangerousHtml: true } }, // 0
    { plugin: rehypeRaw }, // 1
    { plugin: remarkSmartypants }, // 2
    { plugin: rehypeAddClasses, options: {
      h1: 'title is-2',
      h2: 'title is-3',
      h3: 'title is-4',
      h4: 'title is-5',
      h5: 'title is-6',
      h6: 'title is-7',
      strong: 'inline-heading',
    }}, // 3
    { plugin: rehypeStringify, options: { allowDangerousHtml: true } } // 4
  ];

  additionalPlugins.forEach(({ plugin, options, position }) => {
    defaultPlugins.splice(position, 0, { plugin, options });
  });

  const pipeline = remark();
  defaultPlugins.forEach(({ plugin, options }) => {
    pipeline.use(plugin, options);
  });

  return pipeline;
}

export async function renderMarkdown(markdown: string) {
  const pipeline = createBasePipeline();
  const result = await pipeline.process(markdown);
  return result.toString();
}

export async function renderMarkdownWithAdditionalPlugin(markdown: string, additionalPlugins: AdditionalPlugin[]) {
  const pipeline = createBasePipeline(additionalPlugins);
  const result = await pipeline.process(markdown);
  return result.toString();
}

export async function renderSubArticleMarkdown(markdown: string) {
  const behead: AdditionalPlugin = {
    plugin: remarkBehead,
    options: { depth: 1 },
    position: 0,
  };
  return renderMarkdownWithAdditionalPlugin(markdown, [ behead ]);
}
