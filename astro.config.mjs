import { defineConfig } from 'astro/config';
import image from '@astrojs/image';

// https://astro.build/config
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [image()],
  adapter: node({
    mode: 'standalone'
  }),
  experimental: { assets: true },
});