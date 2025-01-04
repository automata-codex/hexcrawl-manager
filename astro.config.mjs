import { defineConfig } from 'astro/config';
import rehypeAddClasses from 'rehype-add-classes';

// https://astro.build/config
export default defineConfig({
  markdown: {
    rehypePlugins: [
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
  vite: {
    plugins: []
  }
});
