import { defineConfig } from 'astro/config';
import image from '@astrojs/image';
// import vercel from '@astrojs/vercel';
import vercelStatic from '@astrojs/vercel/static';

// https://astro.build/config
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  // output: 'server',
  output: 'static',
  adapter: vercelStatic(
    {
      imagesConfig: {
        sizes: [320, 640, 1280],
      },
    }
  ),
  integrations: [image(
    {
      serviceEntryPoint: '@astrojs/image/sharp'
    }
  )],
  // adapter: node({
  //   mode: 'standalone'
  // }),
  // experimental: { assets: true },
});