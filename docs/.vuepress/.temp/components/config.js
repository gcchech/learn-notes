import { defineClientConfig } from "vuepress/client";
import { hasGlobalComponent } from "D:/workspace/ideaspace/learn-notes/learn-notes/node_modules/@vuepress/helper/lib/client/index.js";

import { useStyleTag } from "D:/workspace/ideaspace/learn-notes/learn-notes/node_modules/@vueuse/core/index.mjs";
import Badge from "D:/workspace/ideaspace/learn-notes/learn-notes/node_modules/vuepress-plugin-components/lib/client/components/Badge.js";
import FontIcon from "D:/workspace/ideaspace/learn-notes/learn-notes/node_modules/vuepress-plugin-components/lib/client/components/FontIcon.js";

import "D:/workspace/ideaspace/learn-notes/learn-notes/node_modules/vuepress-plugin-components/lib/client/styles/sr-only.scss";

export default defineClientConfig({
  enhance: ({ app }) => {
    if(!hasGlobalComponent("Badge")) app.component("Badge", Badge);
    if(!hasGlobalComponent("FontIcon")) app.component("FontIcon", FontIcon);
    
  },
  setup: () => {
    useStyleTag(`\
@import url("//at.alicdn.com/t/c/font_5200196_zb84qpgo9cp.css");
`);
  },
  rootComponents: [

  ],
});
