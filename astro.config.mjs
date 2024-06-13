import {defineConfig} from "astro/config";
import UnoCSS from "unocss/astro";
import solidJs from "@astrojs/solid-js";
import cloudflare from "@astrojs/cloudflare";
import AstroPWA from "@vite-pwa/astro";
import {visualizer} from "rollup-plugin-visualizer";
const isDev = import.meta.env.DEV;
// https://astro.build/config
export default defineConfig({
  integrations: [
    UnoCSS(),
    solidJs(),
    AstroPWA({
      workbox: {
        disableDevLogs: true,
      },
      srcDir: "src",
      filename: "sw.ts",
      strategies: "injectManifest",
      registerType: "autoUpdate",
      // manifest: {},
      devOptions: {
        enabled: isDev,
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
    // https://discord.com/channels/830184174198718474/1239920931510554655/1249724228794585178
    /* 
    For anyone that might land here in the future, due to the hydration being broken in Solid it creates an unfortunate situation with an easy workaround, at least until it gets fixed in core:

In local development everytinhg will work fine by default but it won't build with the problem I described in the post, by applying a manual resolver to vite it will break the development server  but the production build will work just fine, so in order to have both, in your astro.config.mjs:

last checked: June 13, 2024
    */
    resolve: {
      conditions: !isDev ? ["worker", "webworker"] : [],
      mainFields: !isDev ? ["module"] : [],
    },
  },
});
