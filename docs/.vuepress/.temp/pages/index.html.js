import comp from "D:/workspace/ideaspace/learn-notes/learn-notes/docs/.vuepress/.temp/pages/index.html.vue"
const data = JSON.parse("{\"path\":\"/\",\"title\":\"首页\",\"lang\":\"zh-CN\",\"frontmatter\":{\"home\":true,\"icon\":\"home\",\"title\":\"首页\",\"heroImage\":\"/logo.svg\",\"heroText\":\"Java 学习笔记\",\"tagline\":\"从零开始的 Java 技术博客 —— 核心概念、语法基础、集合框架、并发编程、JVM 调优\",\"actions\":[{\"text\":\"开始学习\",\"link\":\"/java/\",\"type\":\"primary\",\"icon\":\"book\"}],\"features\":[{\"title\":\"Java 基础\",\"icon\":\"java\",\"details\":\"从 JVM 原理到基本语法，从面向对象到异常处理，夯实 Java SE 核心基础\",\"link\":\"/java/base/concept.html\"}],\"head\":[[\"meta\",{\"name\":\"keywords\",\"content\":\"Java,Java教程,Java学习,Spring,并发编程,JVM,mybatis\"}],[\"meta\",{\"property\":\"og:url\",\"content\":\"https://learn-notes.example.com/\"}],[\"meta\",{\"property\":\"og:site_name\",\"content\":\"Java 学习笔记\"}],[\"meta\",{\"property\":\"og:title\",\"content\":\"首页\"}],[\"meta\",{\"property\":\"og:type\",\"content\":\"website\"}],[\"meta\",{\"property\":\"og:locale\",\"content\":\"zh-CN\"}],[\"meta\",{\"property\":\"article:author\",\"content\":\"月亮\"}],[\"script\",{\"type\":\"application/ld+json\"},\"{\\\"@context\\\":\\\"https://schema.org\\\",\\\"@type\\\":\\\"WebPage\\\",\\\"name\\\":\\\"首页\\\"}\"]]},\"headers\":[],\"readingTime\":{\"minutes\":0.91,\"words\":273},\"filePathRelative\":\"README.md\",\"excerpt\":\"\"}")
export { comp, data }

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
  if (__VUE_HMR_RUNTIME__.updatePageData) {
    __VUE_HMR_RUNTIME__.updatePageData(data)
  }
}

if (import.meta.hot) {
  import.meta.hot.accept(({ data }) => {
    __VUE_HMR_RUNTIME__.updatePageData(data)
  })
}
