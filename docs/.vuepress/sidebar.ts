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
        "lock",
        "juc-tools",
        "threadpool",
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
    {
      text: "面试宝典",
      icon: "file-contract",
      collapsible: true,
      prefix: "interview/",
      children: [
        "mysql",
        "jvm",
        "collections",
        "concurrent",
        "spring",
        "redis",
        "network",
        "distributed",
        "scenario",
      ],
    },
    {
      text: "源码解析",
      icon: "code",
      collapsible: true,
      prefix: "source-code/",
      children: [
        "spring-ioc",
        "spring-aop",
        "springmvc",
        "mybatis",
        "mysql-arch",
        "springboot",
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
