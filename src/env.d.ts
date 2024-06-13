/// <reference types="astro/client" />
/// <reference types="vite-plugin-pwa/client" />
/// <reference types="video.js" />

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}
declare module "@brightcove/player-loader";
