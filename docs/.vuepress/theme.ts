import { hopeTheme } from "vuepress-theme-hope";
import navbar from "./navbar.js";
import sidebar from "./sidebar.js";

export default hopeTheme({
  hostname: "https://liuzhenya.cn",

  // 作者信息
  author: {
    name: "月亮",
    url: "/about/",
  },

  // ============================================================
  // 图标库配置
  // ============================================================
  // 当前：使用主题内置的阿里 iconfont 预设（约 200+ 图标）
  // 预设图标列表：https://theme-hope.vuejs.press/zh/guide/interface/icon.html
  //
  // 🔧 如需完全自定义图标集（推荐，可选择上万个图标）：
  //    1. 打开 https://www.iconfont.cn/ 注册登录
  //    2. 新建项目 → 搜索并添加你需要的图标到购物车 → 加入项目
  //    3. 项目设置 → Font Class → 复制生成的 CSS 链接
  //    4. 将下方 URL 替换为你的链接（格式：//at.alicdn.com/t/c/font_XXXXXXX.css）
  //    5. 后续增删图标：在 iconfont.cn 上操作后重新生成链接替换即可
  //
  // 备选方案：
  //   - "fontawesome"        → FontAwesome 免费图标
  //   - "fontawesome-with-brands" → FontAwesome + 品牌图标
  // ============================================================
  iconAssets: "//at.alicdn.com/t/c/font_5200196_zb84qpgo9cp.css",

  // 站点 Logo
  logo: "/logo.svg",

  // 仓库地址
  repo: "ideaspace/learn-notes",
  docsDir: "docs",

  // 导航栏
  navbar,

  // 侧边栏
  sidebar,

  // 页脚
  footer: "Java 学习笔记 | 记录学习路上的点滴收获",
  displayFooter: true,

  // 贡献者（关闭 Git 贡献者显示，避免暴露真实姓名）
  contributors: false,

  // 博客配置
  blog: {
    name: "月亮",
    description: "Java 开发者",
    intro: "/about/",
    medias: {
      GitHub: "https://gitee.com/gcchech/learn-notes",
    },
  },

  // 元数据
  metaLocales: {
    editLink: "在 GitHub 上编辑此页",
  },

  // 深色模式
  darkmode: "toggle",

  // 打印按钮
  print: false,

  // markdown 增强
  markdown: {
    // 代码块行号
    lineNumbers: true,
    // 提示框
    alert: true,
    // 选项卡
    tabs: true,
    // 代码复制
    copyCode: true,
    // 脚注
    footnotes: true,
    // 标记
    mark: true,
    // 上标下标
    sup: true,
    sub: true,
  },

  // 插件选项
  plugins: {
    // Markdown 增强
    mdEnhance: {
      // mermaid 流程图：当前使用静态 SVG 替代（参见 /java/README.md）
      // 如需启用交互式图表，取消下行注释并 npm install mermaid
      // mermaid: true,
    },
    // 博客功能 (tree-shakable, 需要显式启用)
    blog: true,
    // 本地搜索
    search: {
      locales: {
        "/": {
          placeholder: "搜索文档",
        },
      },
      maxSuggestions: 10,
    },
    // 代码复制
    copyCode: {},
    // 阅读时间
    readingTime: {},
    // 版权信息
    copyright: {
      author: "月亮",
      license: "CC BY-NC-SA 4.0",
    },
  },
});
