import cloudflare from "@astrojs/cloudflare";
import solidJs from "@astrojs/solid-js";
import {defineConfig} from "astro/config";
import {visualizer} from "rollup-plugin-visualizer";
import UnoCSS from "unocss/astro";

export default defineConfig({
  integrations: [UnoCSS(), solidJs()],
  output: "server",
  adapter: cloudflare(),
  vite: {
    plugins: [
      visualizer({
        gzipSize: true,
      }),
    ],
  },
});
