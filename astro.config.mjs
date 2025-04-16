import mdx from '@astrojs/mdx';
import vercel from '@astrojs/vercel';
import clerk from '@clerk/astro'
import { defineConfig } from 'astro/config';
import rehypeAddClasses from 'rehype-add-classes';
import remarkSmartypants from 'remark-smartypants';

import svelte from '@astrojs/svelte';

// https://astro.build/config
export default defineConfig({
  adapter: vercel(),
  integrations: [clerk(), mdx(), svelte()],
  markdown: {
    rehypePlugins: [
      // Changes to these plugins should also be made to the pipeline in `src/utils/markdown.ts`
      remarkSmartypants,
      [
        rehypeAddClasses,
        {
          h1: 'title is-2',
          h2: 'title is-3',
          h3: 'title is-4',
          h4: 'title is-5',
        },
      ],
    ],
  },
  output: 'server',
});
