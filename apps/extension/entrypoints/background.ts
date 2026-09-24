import { defineBackground } from "wxt/sandbox";

export default defineBackground(() => {
  chrome.sidePanel
    ?.setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => {});

  chrome.runtime.onInstalled.addListener(() => {});
});
