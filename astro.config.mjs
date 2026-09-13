// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";


import tailwind from "@astrojs/tailwind";

import vue from "@astrojs/vue";

// https://astro.build/config
export default defineConfig({
  devToolbar: {
    enabled: false,
  },
  site: "https://www.syry.io",
  integrations: [
    mdx(),
    tailwind({
      applyBaseStyles: false,
    }),
    vue(),
  ],
});
