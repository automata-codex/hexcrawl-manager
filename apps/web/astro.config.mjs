import mdx from '@astrojs/mdx';
import node from '@astrojs/node';
import svelte from '@astrojs/svelte';
import clerk from '@clerk/astro';
import { getPublicDir } from '@achm/data';
import { defineConfig } from 'astro/config';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import rehypeAddClasses from 'rehype-add-classes';
import remarkSmartypants from 'remark-smartypants';

import svgSymbolsPlugin from './src/plugins/svg-symbols-plugin.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  adapter: node({
    mode: 'standalone',
  }),
  publicDir: getPublicDir(),
  server: {
    host: '0.0.0.0', // Listen on all network interfaces for Railway
    port: Number(process.env.PORT) || 4321, // Use Railway's PORT env var
  },
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
          h5: 'title is-6',
        },
      ],
    ],
  },
  output: 'server',
  vite: {
    plugins: [svgSymbolsPlugin()],
    resolve: {
      alias: {
        // Allow MDX files in external data repo to import components
        '@achm/web': path.resolve(__dirname),
      },
    },
  },
});
