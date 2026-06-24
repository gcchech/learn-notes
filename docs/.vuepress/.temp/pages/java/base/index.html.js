import comp from "D:/workspace/ideaspace/learn-notes/learn-notes/docs/.vuepress/.temp/pages/java/base/index.html.vue"
const data = JSON.parse("{\"path\":\"/java/base/\",\"title\":\"Base\",\"lang\":\"zh-CN\",\"frontmatter\":{\"title\":\"Base\",\"article\":false,\"feed\":false,\"sitemap\":false,\"head\":[[\"meta\",{\"property\":\"og:url\",\"content\":\"https://learn-notes.example.com/java/base/\"}],[\"meta\",{\"property\":\"og:site_name\",\"content\":\"Java 学习笔记\"}],[\"meta\",{\"property\":\"og:title\",\"content\":\"Base\"}],[\"meta\",{\"property\":\"og:type\",\"content\":\"website\"}],[\"meta\",{\"property\":\"og:locale\",\"content\":\"zh-CN\"}],[\"meta\",{\"property\":\"article:author\",\"content\":\"月亮\"}],[\"script\",{\"type\":\"application/ld+json\"},\"{\\\"@context\\\":\\\"https://schema.org\\\",\\\"@type\\\":\\\"WebPage\\\",\\\"name\\\":\\\"Base\\\"}\"]]},\"headers\":[],\"readingTime\":{\"minutes\":0,\"words\":1},\"filePathRelative\":null,\"excerpt\":\"\"}")
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
