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
      default_title: "Open Do It For Me"
    },
    side_panel: {
      default_path: "entrypoints/sidepanel/index.html"
    }
  }
});
