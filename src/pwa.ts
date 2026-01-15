import {registerSW} from "virtual:pwa-register";

const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(swScriptUrl) {
    console.log("SW registered: ", swScriptUrl);
  },
  onOfflineReady() {
    console.log("PWA application ready to work offline");
  },
  onNeedRefresh() {
    console.log("SW needs refresh, updating...");
    updateSW(true);
  },
});
