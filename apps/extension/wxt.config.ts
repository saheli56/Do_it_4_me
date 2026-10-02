import { defineConfig } from "wxt";
import preact from "@preact/preset-vite";

export default defineConfig({
  vite: () => ({
    plugins: [preact()]
  }),
  manifest: {
    name: "Do It For Me",
    description: "Personal action agent for automating web tasks with verified supervision",
    version: "0.1.0",
    permissions: ["activeTab", "tabs", "sidePanel", "scripting", "storage", "notifications", "alarms"],
    host_permissions: ["<all_urls>"],
    action: {
      default_title: "Open Do It For Me",
      default_icon: {
        "16": "icon-16.png",
        "48": "icon-48.png",
        "128": "icon-128.png"
      }
    },
    icons: {
      "16": "icon-16.png",
      "48": "icon-48.png",
      "128": "icon-128.png"
    },
    web_accessible_resources: [
      {
        resources: ["icon-16.png", "icon-48.png", "icon-128.png", "icon-256.png", "logo-master.png"],
        matches: ["<all_urls>"]
      }
    ],
    side_panel: {
      default_path: "entrypoints/sidepanel/index.html"
    }
  }
});
