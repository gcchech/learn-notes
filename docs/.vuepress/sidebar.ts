import { sidebar } from "vuepress-theme-hope";

export default sidebar({
  "/java/": [
    {
      text: "Java 基础",
      icon: "book",
      collapsible: true,
      prefix: "base/",
      children: [
        "concept",
        "syntax",
        "datatype",
        "oop",
        "string",
        "exception",
        "generics",
        "reflection-annotation",
        "io",
        "serialization",
      ],
    },
    {
      text: "集合框架",
      icon: "cubes",
      collapsible: true,
      prefix: "collection/",
      children: [
        "overview",
        "list",
        "set",
        "map",
        "queue",
      ],
    },
    {
      text: "并发编程",
      icon: "bolt",
      collapsible: true,
      prefix: "concurrent/",
      children: [
        "basics",
        "threadpool",
        "juc-tools",
        "lock",
        "threadlocal",
      ],
    },
    {
      text: "JVM",
      icon: "microchip",
      collapsible: true,
      prefix: "jvm/",
      children: [
        "memory",
        "gc",
        "classloader",
        "tuning",
      ],
    },
    {
      text: "新特性",
      icon: "star",
      collapsible: true,
      prefix: "new-features/",
      children: [
        "java8",
        "java9-21",
      ],
    },
  ],
  "/tools/": [
    {
      text: "开发工具",
      icon: "toolbox",
      children: [
        "build",
        "git",
        "idea",
      ],
    },
  ],
});
