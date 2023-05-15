import {defineConfig} from "astro/config";
import UnoCSS from "unocss/astro";
import presetUno from "unocss/preset-uno";
import transformerVariantGroup from "@unocss/transformer-variant-group";
import transformerDirectives from "@unocss/transformer-directives";

import solidJs from "@astrojs/solid-js";
import cloudflare from "@astrojs/cloudflare";
import AstroPWA from "@vite-pwa/astro";
import {visualizer} from "rollup-plugin-visualizer";

// https://astro.build/config
export default defineConfig({
  integrations: [
    UnoCSS({
      theme: {
        fontFamily: {
          sans: ["Montserrat", "ui-sans-serif", "system-ui"],
        },
        colors: {
          surface: "hsl(var(--clrSurface))",
          base: "hsl(var(--clrBase))",
          primary: "hsl(var(--clrPrimary))",
          secondary: "hsl(var(--clrSecondary))",
          tertiary: "hsl(var(--clrTertiary))",
        },
      },
      presets: [presetUno()],
      transformers: [transformerVariantGroup(), transformerDirectives()],
      rules: [
        [
          /^grid-col-fill-(\d+)$/,
          ([, d]) => ({
            "grid-template-columns": `repeat( auto-fit, minmax(${d}px, 1fr) );`,
          }),
        ],
        [
          /^scrollbar-hide$/,
          ([_]) => {
            return `.scrollbar-hide{scrollbar-width:none}
  .scrollbar-hide::-webkit-scrollbar{display:none}`;
          },
        ],
        [
          /^scrollbar-default$/,
          ([_]) => {
            return `.scrollbar-default{scrollbar-width:auto}
  .scrollbar-default::-webkit-scrollbar{display:block}`;
          },
        ],
        [
          // https://unocss.dev/config/theme#usage-in-rules
          /^text-(.*)$/,
          ([, c], {theme}) => {
            if (theme.colors[c]) return {color: theme.colors[c]};
          },
        ],
        [
          // https://unocss.dev/config/theme#usage-in-rules
          /^bglg-(.*(?=\)$))/,
          ([, c]) => {
            return {
              "background-image": `linear-gradient(${c.replaceAll("_", " ")})`,
            };
          },
        ],
        [
          // https://unocss.dev/config/theme#usage-in-rules
          /^bg-(.*)$/,
          ([, c], {theme}) => {
            if (theme.colors[c]) {
              return {"background-color": theme.colors[c]};
            }
          },
        ],
      ],
    }),
    solidJs(),
    AstroPWA({
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
        globIgnores: [
          "**/node_modules/**/*",
          "$server_build/*",
          "$server_build/**/*",
        ],
      },
    }),
  ],
  output: "server",
  adapter: cloudflare({
    mode: "directory",
  }),
  vite: {
    // build: {
    //   minify: false,
    // },
    plugins: [
      visualizer({
        // goal:  ~100kib of HTML/CSS/Fonts (e.g. check network tab for amount loaded), and then ~300-350kib JS gzipped:
        gzipSize: true,
      }),
    ],
  },
});
