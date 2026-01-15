import cloudflare from "@astrojs/cloudflare";
import solidJs from "@astrojs/solid-js";
import AstroPWA from "@vite-pwa/astro";
import {defineConfig} from "astro/config";
import {visualizer} from "rollup-plugin-visualizer";
import UnoCSS from "unocss/astro";

const isDev = import.meta.env.DEV;
// https://astro.build/config
export default defineConfig({
  integrations: [
    UnoCSS(),
    solidJs(),
    AstroPWA({
      workbox: {
        disableDevLogs: false,
      },
      srcDir: "src",
      filename: "sw.ts",
      strategies: "injectManifest",
      registerType: "autoUpdate",
      // manifest: {},
      devOptions: {
        enabled: true,
        type: "module",
        /* other options */
      },
      injectManifest: {
        globIgnores: ["**/_worker.js/**"],
      },
    }),
  ],
  output: "server",
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
      configPath: ".dev.vars",
    },
  }),
  vite: {
    // build: {
    //   minify: false,
    // },
    // ssr: {
    //   noExternal: ["@kobalte/core", "@internationalized/message"],
    // },
    plugins: [
      visualizer({
        // goal:  ~100kib of HTML/CSS/Fonts (e.g. check network tab for amount loaded), and then ~300-350kib JS gzipped:
        gzipSize: true,
      }),
    ],
  },
});
