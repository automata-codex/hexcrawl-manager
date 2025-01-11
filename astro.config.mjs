import vercel from '@astrojs/vercel';
import clerk from '@clerk/astro'
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  adapter: vercel(),
  integrations: [clerk()],
  output: 'server',
});
