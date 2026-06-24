import { defineClientConfig } from "vuepress/client";
import { useHintContainers } from "D:/workspace/ideaspace/learn-notes/learn-notes/node_modules/vuepress-plugin-md-enhance/lib/client/composables/useHintContainers.js";
import "D:/workspace/ideaspace/learn-notes/learn-notes/node_modules/vuepress-plugin-md-enhance/lib/client/styles/hint/index.scss";

export default defineClientConfig({
  enhance: ({ app }) => {

  },
  setup: () => {
useHintContainers();
  }
});
