// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

import sitemap from "@astrojs/sitemap";

import tailwind from "@astrojs/tailwind";

import vue from "@astrojs/vue";

// https://astro.build/config
export default defineConfig({
  devToolbar: {
    enabled: false,
  },
  site: "https://syntheticreality.github.io",
  integrations: [
    mdx(),
    sitemap(),
    tailwind({
      applyBaseStyles: false,
    }),
    vue(),
  ],
});
