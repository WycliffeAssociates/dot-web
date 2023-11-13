import { onRequestGet as __api_getId_ts_onRequestGet } from "/Users/willkelly/Documents/Work/Code/DotWeb/functions/api/getId.ts"
import { onRequestGet as __api_getPlaylist_ts_onRequestGet } from "/Users/willkelly/Documents/Work/Code/DotWeb/functions/api/getPlaylist.ts"
import { onRequest as ____path___js_onRequest } from "/Users/willkelly/Documents/Work/Code/DotWeb/functions/[[path]].js"

export const routes = [
    {
      routePath: "/api/getId",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_getId_ts_onRequestGet],
    },
  {
      routePath: "/api/getPlaylist",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_getPlaylist_ts_onRequestGet],
    },
  {
      routePath: "/:path*",
      mountPath: "/",
      method: "",
      middlewares: [],
      modules: [____path___js_onRequest],
    },
  ]