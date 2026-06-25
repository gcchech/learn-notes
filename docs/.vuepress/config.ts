import { viteBundler } from "@vuepress/bundler-vite";
import { defineUserConfig } from "vuepress";
import theme from "./theme.js";

export default defineUserConfig({
  base: "/",

  lang: "zh-CN",
  title: "Java 学习笔记",
  description: "从零开始的 Java 技术博客 —— 核心概念、语法基础、集合框架、并发编程、JVM 调优",

  // 只将 .md 和 .html 文件作为页面处理，避免 Vite 解析图片等二进制文件报错
  pagePatterns: ["**/*.md", "**/*.html", "!.vuepress", "!node_modules"],

  bundler: viteBundler(),
  theme,
});
