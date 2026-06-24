<template><div><h1 id="java-基本语法-从注释到运算符" tabindex="-1"><a class="header-anchor" href="#java-基本语法-从注释到运算符"><span>Java 基本语法：从注释到运算符</span></a></h1>
<blockquote>
<p>📖 本文是 Java 基础知识系列的第二篇，承接上一篇的核心概念，正式开始学习 Java 的语法细节。注释、标识符、关键字、运算符——这些是每一行 Java 代码的构成基础。掌握它们之后，你就可以真正开始写代码了。</p>
</blockquote>
<hr>
<h2 id="一、注释" tabindex="-1"><a class="header-anchor" href="#一、注释"><span>一、注释</span></a></h2>
<blockquote>
<p>写好注释有助于自己和同事理解代码。注释是写给<strong>人</strong>看的，编译器在编译时会完全忽略它们——不会对生成的 <code v-pre>.class</code> 文件产生任何影响。</p>
</blockquote>
<h3 id="_1-1-单行注释" tabindex="-1"><a class="header-anchor" href="#_1-1-单行注释"><span>1.1 单行注释</span></a></h3>
<p><strong>语法</strong>：以 <code v-pre>//</code> 开头，从 <code v-pre>//</code> 开始到本行结束的所有内容都是注释。</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">public</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> void</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF"> method</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">() {</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">    // age 用于表示年龄</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">    int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> age </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 18</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">}</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>阿里巴巴 Java 开发规约要求</strong>：单行注释必须写在被注释语句的<strong>上方另起一行</strong>，而不是写在行尾：</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// ❌ 不推荐：注释写在行尾</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> age </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 18</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"> // age 用于表示年龄</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// ✅ 推荐：注释写在上方另起一行</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// age 用于表示年龄</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> age </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 18</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>关于单行注释的内容，有一个重要的原则：<strong>注释应该解释&quot;为什么这样做&quot;，而不是&quot;做了什么&quot;</strong>。代码本身已经清楚地表达了&quot;做了什么&quot;，但代码无法解释背后的设计决策：</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// ❌ 废话注释——代码已经说明了"做了什么"</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 将 price 乘以 0.8</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">double</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> finalPrice </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> price </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">*</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 0.8</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// ✅ 有价值的注释——解释了"为什么"</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 会员享受 8 折优惠</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">double</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> finalPrice </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> price </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">*</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 0.8</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_1-2-多行注释" tabindex="-1"><a class="header-anchor" href="#_1-2-多行注释"><span>1.2 多行注释</span></a></h3>
<p><strong>语法</strong>：以 <code v-pre>/*</code> 开头，以 <code v-pre>*/</code> 结尾，中间的所有内容都是注释，可以跨多行。</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">/*</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"> * age 用于表示年纪</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"> * name 用于表示姓名</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"> */</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> age </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 18</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">String</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> name </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379"> "张三"</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>多行注释有一个重要的限制：<strong>不能嵌套使用</strong>。</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">/* 外层注释</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">    /* 内层注释 */</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // ← 编译器认为注释到此处就结束了！</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">    这部分代码会报错——因为它已经不在注释里了</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">*/</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>编译器遇到第一个 <code v-pre>*/</code> 就认为注释结束了，后面的内容会被当作代码来解析。如果你需要临时注释掉一大段代码（包含多行注释的代码），建议使用 IDE 的快捷注释功能（<code v-pre>Ctrl + /</code>），或者使用单行注释逐行 <code v-pre>//</code>。</p>
<h3 id="_1-3-⭐️-文档注释-javadoc" tabindex="-1"><a class="header-anchor" href="#_1-3-⭐️-文档注释-javadoc"><span>1.3 ⭐️ 文档注释（Javadoc）</span></a></h3>
<p>文档注释是 Java 独有的一种注释形式，它不是写给程序员看的，而是 <strong>写给 javadoc 工具看的</strong>——可以自动生成专业的 HTML API 文档。</p>
<p><strong>语法</strong>：以 <code v-pre>/**</code> 开头，以 <code v-pre>*/</code> 结尾。注意开头是<strong>两个星号</strong>，这是它和普通多行注释 <code v-pre>/* */</code> 的关键区别。</p>
<p>文档注释可以用在三个地方：<strong>类</strong>、<strong>字段</strong>、<strong>方法</strong>。</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">/**</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"> * 代码示例</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"> *</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"> * </span><span style="--shiki-light:#A626A4;--shiki-light-font-style:italic;--shiki-dark:#C678DD;--shiki-dark-font-style:italic">@author</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"> ；zy</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"> * @date 2026/06/24</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"> */</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">public</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> class</span><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B"> Demo</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF"> {</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">    /** 姓名 */</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">    private</span><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B"> String</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> name</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">    /** 年龄 */</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">    private</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> age</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">    /**</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">     * main 方法作为程序的入口</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">     *</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">     * </span><span style="--shiki-light:#A626A4;--shiki-light-font-style:italic;--shiki-dark:#C678DD;--shiki-dark-font-style:italic">@param</span><span style="--shiki-light:#383A42;--shiki-light-font-style:italic;--shiki-dark:#E06C75;--shiki-dark-font-style:italic"> args</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"> 命令行参数</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">     */</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">    public</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> static</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> void</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF"> main</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">String</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">[] </span><span style="--shiki-light:#383A42;--shiki-light-font-style:inherit;--shiki-dark:#E06C75;--shiki-dark-font-style:italic">args</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">)</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF"> {</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">        System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379">"Hello, Java!"</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">);</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">    }</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">}</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><blockquote>
<p>💡 <strong>IDEA 快捷键</strong>：在类、字段或方法的上方输入 <code v-pre>/**</code> 然后按回车键，IDEA 会自动补全文档注释的格式（包括 <code v-pre>@param</code>、<code v-pre>@return</code> 等标签），<code v-pre>*/</code> 也会自动生成。</p>
</blockquote>
<p><strong>常用 Javadoc 标签一览</strong>：</p>
<table>
<thead>
<tr>
<th>标签</th>
<th>用途</th>
<th>写在哪儿</th>
</tr>
</thead>
<tbody>
<tr>
<td><code v-pre>@author</code></td>
<td>作者标识</td>
<td>类</td>
</tr>
<tr>
<td><code v-pre>@version</code></td>
<td>版本号</td>
<td>类</td>
</tr>
<tr>
<td><code v-pre>@since</code></td>
<td>从哪个版本开始引入</td>
<td>类 / 方法</td>
</tr>
<tr>
<td><code v-pre>@see</code></td>
<td>引用其他类或方法</td>
<td>类 / 方法</td>
</tr>
<tr>
<td><code v-pre>@param</code></td>
<td>参数说明</td>
<td>方法</td>
</tr>
<tr>
<td><code v-pre>@return</code></td>
<td>返回值说明</td>
<td>方法</td>
</tr>
<tr>
<td><code v-pre>@throws</code> / <code v-pre>@exception</code></td>
<td>异常说明</td>
<td>方法</td>
</tr>
<tr>
<td><code v-pre>@deprecated</code></td>
<td>标记已废弃，不推荐使用</td>
<td>类 / 方法</td>
</tr>
</tbody>
</table>
<p><strong>用 <code v-pre>javadoc</code> 命令生成 HTML 文档</strong>：</p>
<div class="language-bash line-numbers-mode" data-highlighter="shiki" data-ext="bash" data-title="bash" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"># 第一步：在类文件所在目录打开终端</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"># 第二步：执行 javadoc 命令</span></span>
<span class="line"><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">javadoc</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379"> Demo.java</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> -encoding</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379"> utf-8</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"># 第三步：查看生成的文件</span></span>
<span class="line"><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">ls</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> -l</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"># 会看到 index.html、Demo.html 以及一些 .js 和 .css 文件</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"># 第四步：用浏览器打开</span></span>
<span class="line"><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">open</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379"> index.html</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">   # macOS</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"># 或者直接在文件管理器中双击 index.html</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>生成的 HTML 页面和 Oracle 官方 Java API 文档是一样的风格。</p>
<h3 id="_1-4-⭐️-文档注释的注意事项" tabindex="-1"><a class="header-anchor" href="#_1-4-⭐️-文档注释的注意事项"><span>1.4 ⭐️ 文档注释的注意事项</span></a></h3>
<p>以下三条注意事项直接决定你生成的 javadoc 文档是否可用：</p>
<p><strong>① 访问权限限制（最容易被忽略）</strong></p>
<p><code v-pre>javadoc</code> 命令<strong>只能</strong>为 <code v-pre>public</code> 和 <code v-pre>protected</code> 修饰的字段、方法和类生成文档。<code v-pre>default</code>（包访问权限）和 <code v-pre>private</code> 的注释会被 javadoc 静默忽略。</p>
<p>这不是 bug，而是<strong>有意设计</strong>：文档是给外部调用者看的，内部实现细节本来就不该暴露。如果你的类本身不是 <code v-pre>public</code>，javadoc 甚至会直接执行失败——连 index.html 都生成不了。</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">/**</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"> * 这个注释会出现在 javadoc 中 —— 因为类是 public</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"> */</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">public</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> class</span><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B"> Person</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF"> {</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">    /** 这个注释也会出现 —— 字段是 public */</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">    public</span><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B"> String</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> name</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">    /**</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">     * 这个注释不会被 javadoc 生成 —— 方法是 private</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">     * 因为调用者根本看不到这个方法，没必要生成文档</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">     */</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">    private</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> void</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF"> internalHelper</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">()</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF"> {</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">        // ...</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">    }</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">}</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>② HTML 标签使用规范</strong></p>
<p>文档注释中可以嵌入 HTML 标记来排版，比如 <code v-pre>&lt;p&gt;</code> 分段、<code v-pre>&lt;a&gt;</code> 超链接、<code v-pre>&lt;ul&gt;</code> / <code v-pre>&lt;li&gt;</code> 列表等：</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">/**</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"> * &#x3C;p>这是一个用户服务类，提供用户的增删改查功能。&#x3C;/p></span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"> *</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"> * &#x3C;ul></span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"> *   &#x3C;li>支持分页查询&#x3C;/li></span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"> *   &#x3C;li>支持按用户名模糊搜索&#x3C;/li></span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"> *   &#x3C;li>密码使用 BCrypt 加密存储&#x3C;/li></span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"> * &#x3C;/ul></span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"> *</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"> * 参考文档：&#x3C;a href="https://example.com/api-guide">API 开发指南&#x3C;/a></span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"> */</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">public</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> class</span><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B"> UserService</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF"> {</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">}</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>但是<strong>不要使用标题标记</strong>（<code v-pre>&lt;h1&gt;</code> ~ <code v-pre>&lt;h6&gt;</code>）。因为 javadoc 工具会自己插入标题来组织页面结构，如果你写的 <code v-pre>&lt;h1&gt;</code> 和 javadoc 生成的标题重叠，页面排版就会乱掉。</p>
<p><strong>③ 自定义 @ 注解</strong></p>
<p>除了标准标签，你还可以在文档注释中定义并使用自己的 <code v-pre>@</code> 注解。</p>
<h3 id="_1-5-注释规约与最佳实践" tabindex="-1"><a class="header-anchor" href="#_1-5-注释规约与最佳实践"><span>1.5 注释规约与最佳实践</span></a></h3>
<p>以下规约综合了阿里巴巴 Java 开发手册和行业通用实践：</p>
<p><strong>✅ 类、字段、方法必须使用文档注释</strong>（<code v-pre>/** */</code>）而不是单行 <code v-pre>//</code> 或多行 <code v-pre>/* */</code>。因为 IDE 的鼠标悬浮提示可以直接显示文档注释的内容，大大提高开发效率——你在使用 <code v-pre>String</code> 类时，鼠标悬停在上面看到的说明文字，就是文档注释生成的。</p>
<p><strong>✅ 所有抽象方法（包括接口方法）必须用 Javadoc 注释</strong>。除了说明返回值、参数和异常外，还必须清楚说明&quot;这个方法做什么事、实现什么功能&quot;——因为抽象方法没有方法体，调用者完全靠注释来理解它的行为。</p>
<p><strong>✅ 所有类必须添加创建者和创建日期</strong>。可以在 IDEA 的 <code v-pre>File and Code Templates</code> 中预设模板，这样每次新建类时自动生成：</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">/**</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"> * ${description}</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"> *</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"> * </span><span style="--shiki-light:#A626A4;--shiki-light-font-style:italic;--shiki-dark:#C678DD;--shiki-dark-font-style:italic">@author</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"> 你的名字</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"> * @date ${DATE}</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"> */</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>✅ 所有枚举类型字段必须有注释</strong>，说明每个数据项的含义和用途：</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">public</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> enum</span><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B"> OrderStatus</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> {</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">    /** 待支付 */</span></span>
<span class="line"><span style="--shiki-light:#986801;--shiki-dark:#D19A66">    PENDING</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">,</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">    /** 已支付 */</span></span>
<span class="line"><span style="--shiki-light:#986801;--shiki-dark:#D19A66">    PAID</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">,</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">    /** 已取消 */</span></span>
<span class="line"><span style="--shiki-light:#986801;--shiki-dark:#D19A66">    CANCELLED</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">,</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">    /** 已退款 */</span></span>
<span class="line"><span style="--shiki-light:#986801;--shiki-dark:#D19A66">    REFUNDED</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">}</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>✅ 代码修改时，同步更新注释</strong>——过时的注释比没有注释更危险。一段写着&quot;只支持正整数&quot;的代码如果被改成了&quot;也支持负数&quot;，后来的开发者会被误导。</p>
<p><strong>❌ 注释的反模式</strong>：</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// ❌ 废话注释</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 获取姓名</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">public</span><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B"> String</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF"> getName</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">() { </span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">return</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> name</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> }  </span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 代码本身已经足够清晰</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// ❌ 被注释掉的代码块（用 Git 管理历史，不要这么干）</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// public void oldMethod() {</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">//     // 几百行被注释的旧代码……</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// }</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// ❌ 与代码不一致的注释</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 返回用户年龄 —— 但这个方法的代码已经被改成了返回出生日期！</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">public</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> int</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF"> getAge</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">() { </span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">return</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> birthYear</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> }</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><blockquote>
<p>🎯 <strong>核心原则</strong>：注释是程序固有的一部分。好的注释能准确反映设计思想和业务含义，让继任者（包括几个月后的你自己）快速理解代码背后的信息。</p>
</blockquote>
<hr>
<h2 id="二、标识符" tabindex="-1"><a class="header-anchor" href="#二、标识符"><span>二、标识符</span></a></h2>
<blockquote>
<p>标识符就是你给类、方法、变量、包起的<strong>名字</strong>。Java 对此既有&quot;违法必究&quot;的硬性规则，也有&quot;不守规约会被同事鄙视&quot;的软性规范。</p>
</blockquote>
<h3 id="_2-1-命名规则-硬性要求——违反编译不通过-没有任何商量余地" tabindex="-1"><a class="header-anchor" href="#_2-1-命名规则-硬性要求——违反编译不通过-没有任何商量余地"><span>2.1 命名规则（硬性要求——违反编译不通过，没有任何商量余地）</span></a></h3>
<table>
<thead>
<tr>
<th>规则</th>
<th>说明</th>
<th>例子</th>
</tr>
</thead>
<tbody>
<tr>
<td>组成字符</td>
<td>只能由字母、数字、下划线 <code v-pre>_</code>、美元符号 <code v-pre>$</code> 组成</td>
<td><code v-pre>myVar</code> ✅ / <code v-pre>my-var</code> ❌</td>
</tr>
<tr>
<td>开头限制</td>
<td>不能以数字开头</td>
<td><code v-pre>name1</code> ✅ / <code v-pre>1name</code> ❌</td>
</tr>
<tr>
<td>关键字冲突</td>
<td>不能使用关键字和保留字</td>
<td><code v-pre>class</code> ❌ / <code v-pre>myClass</code> ✅</td>
</tr>
<tr>
<td>大小写敏感</td>
<td><code v-pre>Name</code> 和 <code v-pre>name</code> 是两个不同的标识符</td>
<td>两个完全独立的变量</td>
</tr>
<tr>
<td>长度不限</td>
<td>理论上没有长度限制</td>
<td>但别起 200 个字符的名字……</td>
</tr>
</tbody>
</table>
<p>验证这些规则的简单示例：</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// ✅ 合法标识符</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> age</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">String</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> userName</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">double</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> $price</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">    // $ 允许但应避免</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> _count</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">       // _ 单独使用从 Java 9 开始禁止</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// ❌ 非法标识符</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> 1stPlace</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">     // 不能以数字开头</span></span>
<span class="line"><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">String</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> my</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">-</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">name</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">   // 连字符 - 不允许</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> class</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">        // class 是关键字</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> my</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">@</span><span style="--shiki-light:#A626A4;--shiki-dark:#E5C07B">email</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">     // @ 不允许</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_2-2-命名规范-软性建议——违反能编译-但-java-社区会-另眼相看" tabindex="-1"><a class="header-anchor" href="#_2-2-命名规范-软性建议——违反能编译-但-java-社区会-另眼相看"><span>2.2 命名规范（软性建议——违反能编译，但 Java 社区会&quot;另眼相看&quot;）</span></a></h3>
<p>随着Java的演化，形成了统一的命名约定。违反这些约定虽然不会编译报错，但不合适。</p>
<table>
<thead>
<tr>
<th>元素</th>
<th>命名风格</th>
<th>示例</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>包名</strong></td>
<td>全部小写，多级用 <code v-pre>.</code> 分隔</td>
<td><code v-pre>com.example.myapp.util</code></td>
</tr>
<tr>
<td><strong>类名 / 接口名</strong></td>
<td>大驼峰（PascalCase），名词或名词短语</td>
<td><code v-pre>HelloWorld</code>、<code v-pre>ArrayList</code>、<code v-pre>UserService</code></td>
</tr>
<tr>
<td><strong>方法名</strong></td>
<td>小驼峰（camelCase），动词或动词短语</td>
<td><code v-pre>getName()</code>、<code v-pre>calculateTotal()</code>、<code v-pre>sendMessage()</code></td>
</tr>
<tr>
<td><strong>变量名</strong></td>
<td>小驼峰，名词，见名知意</td>
<td><code v-pre>userName</code>、<code v-pre>maxCount</code>、<code v-pre>isFinished</code></td>
</tr>
<tr>
<td><strong>常量名</strong></td>
<td>全大写，下划线分隔</td>
<td><code v-pre>MAX_VALUE</code>、<code v-pre>DEFAULT_PAGE_SIZE</code></td>
</tr>
</tbody>
</table>
<p><strong>为什么 Java 选择驼峰命名而不是下划线？</strong></p>
<p>驼峰命名的优势在于：每个单词的边界通过大写字母清晰区分（<code v-pre>getUserName</code>），比下划线（<code v-pre>get_user_name</code>）更紧凑，也更适合 Java 的面向对象风格。当你看到大驼峰 → 知道这是类/接口；看到小驼峰 → 知道这是方法/变量。</p>
<h3 id="_2-3-特殊标识符" tabindex="-1"><a class="header-anchor" href="#_2-3-特殊标识符"><span>2.3 特殊标识符</span></a></h3>
<p>Java 的标识符比大多数人想象的更宽松，但宽松不意味着应该滥用：</p>
<p><strong>Unicode 字符可以做标识符（合法但强烈不建议）</strong>：</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 😱 这竟然能编译通过！但永远不要这么写</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">String 姓名 </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379"> "张三"</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> 年龄 </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 18</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(姓名 </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">+</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379"> "今年"</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> +</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF"> 年龄 </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">+</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379"> "岁"</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">);</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 理由：源代码可能在不同编码环境间传输，Unicode 标识符极易导致乱码问题</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong><code v-pre>$</code> 符号</strong>：Java 编译器在生成内部类时会使用 <code v-pre>$</code> 作为分隔符（比如 <code v-pre>Outer$Inner.class</code>）。你手写的代码中应避免使用 <code v-pre>$</code>，以免和编译器生成的类名冲突。</p>
<p><strong><code v-pre>_</code> 下划线</strong>：从 Java 9 开始，单独的 <code v-pre>_</code> 变成了关键字，不能再用作标识符。这是为了给未来的语言特性（如模式匹配中的占位符）预留空间：</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> _ </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 10</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // Java 8 可以编译，Java 9+ 报错</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div></div></div><hr>
<h2 id="三、关键字" tabindex="-1"><a class="header-anchor" href="#三、关键字"><span>三、关键字</span></a></h2>
<blockquote>
<p>关键字是 Java 语言保留的、有特殊含义的单词。你可以把它们理解为 Java 的&quot;保留词汇&quot;——它们有自己的本职工作，不能兼职做你的变量名。</p>
</blockquote>
<h3 id="_3-1-关键字完整分类表" tabindex="-1"><a class="header-anchor" href="#_3-1-关键字完整分类表"><span>3.1 关键字完整分类表</span></a></h3>
<p>Java 共有约 50 个关键字（不同版本略有增减），按功能分为以下几类：</p>
<p><strong>① 访问控制（3 个）</strong></p>
<table>
<thead>
<tr>
<th>关键字</th>
<th>含义</th>
</tr>
</thead>
<tbody>
<tr>
<td><code v-pre>private</code></td>
<td>仅本类可见</td>
</tr>
<tr>
<td><code v-pre>protected</code></td>
<td>本类 + 同包 + 子类可见</td>
</tr>
<tr>
<td><code v-pre>public</code></td>
<td>所有类可见</td>
</tr>
</tbody>
</table>
<p><strong>② 类/方法/变量修饰符</strong></p>
<table>
<thead>
<tr>
<th>关键字</th>
<th>含义</th>
</tr>
</thead>
<tbody>
<tr>
<td><code v-pre>abstract</code></td>
<td>抽象类 / 抽象方法</td>
</tr>
<tr>
<td><code v-pre>class</code></td>
<td>声明一个类</td>
</tr>
<tr>
<td><code v-pre>extends</code></td>
<td>继承父类</td>
</tr>
<tr>
<td><code v-pre>final</code></td>
<td>不可变（类不可继承、方法不可重写、变量不可修改）</td>
</tr>
<tr>
<td><code v-pre>implements</code></td>
<td>实现接口</td>
</tr>
<tr>
<td><code v-pre>interface</code></td>
<td>声明一个接口</td>
</tr>
<tr>
<td><code v-pre>new</code></td>
<td>创建对象实例</td>
</tr>
<tr>
<td><code v-pre>static</code></td>
<td>静态（属于类而非实例）</td>
</tr>
<tr>
<td><code v-pre>native</code></td>
<td>本地方法（JNI 调用 C/C++ 代码）</td>
</tr>
<tr>
<td><code v-pre>strictfp</code></td>
<td>严格浮点运算（Java 17 起已废弃）</td>
</tr>
<tr>
<td><code v-pre>synchronized</code></td>
<td>同步锁</td>
</tr>
<tr>
<td><code v-pre>transient</code></td>
<td>序列化时忽略该字段</td>
</tr>
<tr>
<td><code v-pre>volatile</code></td>
<td>保证多线程间的可见性</td>
</tr>
</tbody>
</table>
<p><strong>③ 程序控制（12 个）</strong></p>
<p><code v-pre>if</code>、<code v-pre>else</code>、<code v-pre>switch</code>、<code v-pre>case</code>、<code v-pre>default</code>、<code v-pre>for</code>、<code v-pre>while</code>、<code v-pre>do</code>、<code v-pre>break</code>、<code v-pre>continue</code>、<code v-pre>return</code>、<code v-pre>instanceof</code></p>
<p><strong>④ 错误处理（6 个）</strong></p>
<p><code v-pre>try</code>、<code v-pre>catch</code>、<code v-pre>finally</code>、<code v-pre>throw</code>、<code v-pre>throws</code>、<code v-pre>assert</code></p>
<p><strong>⑤ 包相关（2 个）</strong></p>
<p><code v-pre>package</code>（声明包路径）、<code v-pre>import</code>（导入其他包）</p>
<p><strong>⑥ 基本数据类型（8 个）</strong></p>
<p><code v-pre>byte</code>、<code v-pre>short</code>、<code v-pre>int</code>、<code v-pre>long</code>、<code v-pre>float</code>、<code v-pre>double</code>、<code v-pre>char</code>、<code v-pre>boolean</code></p>
<p><strong>⑦ 其他</strong></p>
<p><code v-pre>void</code>（方法无返回值）、<code v-pre>enum</code>（枚举）、<code v-pre>super</code>（父类引用）、<code v-pre>this</code>（本对象引用）</p>
<h3 id="_3-2-两个被-架空了-的关键字——const-和-goto" tabindex="-1"><a class="header-anchor" href="#_3-2-两个被-架空了-的关键字——const-和-goto"><span>3.2 两个被&quot;架空了&quot;的关键字——const 和 goto</span></a></h3>
<p><code v-pre>const</code> 和 <code v-pre>goto</code> 是 Java 关键字列表中两个特殊的存在：它们被保留了，但在 Java 中<strong>不起任何实际作用</strong>。</p>
<ul>
<li><strong><code v-pre>const</code></strong>：Java 用 <code v-pre>final</code> 代替了 C/C++ 的 <code v-pre>const</code> 功能</li>
<li><strong><code v-pre>goto</code></strong>：Java 保留了它但刻意不支持，因为 <code v-pre>goto</code> 是&quot;结构化编程&quot;的天敌（会导致意大利面条式的代码）。Java 使用 <code v-pre>break label</code> 和 <code v-pre>continue label</code> 来处理少数真正需要跳转的场景</li>
</ul>
<p>虽然没有 <code v-pre>goto</code>，但 Java 提供了<strong>带标签的 <code v-pre>break</code> 和 <code v-pre>continue</code></strong> 来应对少数真正需要跨层跳转的场景——这是结构化编程对 <code v-pre>goto</code> 的&quot;合法替代&quot;：</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// ============================================</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// Java 标签跳转：goto 的结构化替代方案</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 标签声明在循环或代码块前，命名遵循标识符规则，后跟冒号</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// ============================================</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 示例 1：break + 标签 —— 跳出多重嵌套循环</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 这是 goto 最常见的合法用途：在深层循环中直接退出到指定层级</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">outer</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">:</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">for</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> i </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 1</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> i </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">&#x3C;=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 3</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> i</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">++</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">) {</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">    for</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> j </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 1</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> j </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">&#x3C;=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 3</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> j</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">++</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">) {</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">        if</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (i </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">==</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 2</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> &#x26;&#x26;</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> j </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">==</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 2</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">) {</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">            break</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> outer</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">      // 直接跳出 outer 标签所在的外层循环</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">        }</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">        System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">printf</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379">"i=%d, j=%d%n"</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">, i, j);</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">    }</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">}</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 输出：i=1,j=1  i=1,j=2  i=1,j=3  i=2,j=1</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 当 i=2, j=2 时，break outer 终止整个 outer 循环，内层循环也随之结束</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 示例 2：continue + 标签 —— 跳到外层循环的下一次迭代</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 比普通 continue 更强大：可以跨越多层直接控制外层循环的迭代</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">outer</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">:</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">for</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> i </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 1</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> i </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">&#x3C;=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 3</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> i</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">++</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">) {</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">    for</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> j </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 1</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> j </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">&#x3C;=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 3</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> j</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">++</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">) {</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">        if</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (j </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">==</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 2</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">) {</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">            continue</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> outer</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">   // 跳过内层循环的剩余迭代，外层 i++ 后继续</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">        }</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">        System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">printf</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379">"i=%d, j=%d%n"</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">, i, j);</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">    }</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">}</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 输出：i=1,j=1  i=2,j=1  i=3,j=1</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// j 永远不会等于 3：每次 j=2 时直接跳回外层 i++，内层被重置</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 示例 3：标签 + 代码块 —— 模拟 C 语言中 goto 跳出任意代码块</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 注意：标签只能用于循环（for/while/do-while）或普通代码块，不能跨方法</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">initialize</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">:</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">{</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">    int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> port </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 8080</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">    System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379">"正在检查端口 "</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> +</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF"> port </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">+</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379"> " 的可用性..."</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">);</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">    if</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (port </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">&#x3C;</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 1024</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">) {</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">        System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379">"端口冲突，跳过初始化"</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">);</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">        break</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> initialize</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">    // 直接跳出整个初始化代码块，类似 goto end_of_init</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">    }</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">    System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379">"端口可用，继续初始化流程"</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">);</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">    // 更多初始化逻辑...</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">}</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379">"初始化阶段结束"</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">);</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 输出：正在检查端口 8080 的可用性...  端口可用，继续初始化流程  初始化阶段结束</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 若 port &#x3C; 1024，则输出"端口冲突"后直接跳到最后的 println</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// ===== 关键区别 =====</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// break label  —— 终止标签所在循环/代码块，控制流跳到该块之后</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// continue label —— 跳过当前迭代的剩余部分，直接进入标签所在循环的下一次迭代</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 与 goto 的本质不同：标签跳转严格遵循块作用域，禁止跨方法或跳入循环体内部</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_3-3-三个特殊的-字面量-——true、false、null" tabindex="-1"><a class="header-anchor" href="#_3-3-三个特殊的-字面量-——true、false、null"><span>3.3 三个特殊的&quot;字面量&quot;——true、false、null</span></a></h3>
<p>严格来说，<code v-pre>true</code>、<code v-pre>false</code>、<code v-pre>null</code> <strong>不是关键字，而是字面量（Literals）</strong>：</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">boolean</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> flag </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> true</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">   // true 是 boolean 类型的字面量</span></span>
<span class="line"><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">String</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> name </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> null</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">    // null 是引用类型的空值字面量</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div></div></div><p>但它们和关键字一样不能用作标识符：</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> true </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 1</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">   // ❌ 编译不通过</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> null </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 0</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">   // ❌ 编译不通过</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div></div></div><hr>
<h2 id="四、运算符" tabindex="-1"><a class="header-anchor" href="#四、运算符"><span>四、运算符</span></a></h2>
<blockquote>
<p>运算符是执行计算、比较和逻辑判断的符号。这一节是整个 Java 基础语法中<strong>面试出镜率最高</strong>的知识点——尤其是自增自减和移位运算。</p>
</blockquote>
<h3 id="_4-1-算术运算符" tabindex="-1"><a class="header-anchor" href="#_4-1-算术运算符"><span>4.1 算术运算符</span></a></h3>
<table>
<thead>
<tr>
<th>运算符</th>
<th>含义</th>
<th>示例</th>
</tr>
</thead>
<tbody>
<tr>
<td><code v-pre>+</code></td>
<td>加法</td>
<td><code v-pre>3 + 2</code> → <code v-pre>5</code></td>
</tr>
<tr>
<td><code v-pre>-</code></td>
<td>减法</td>
<td><code v-pre>3 - 2</code> → <code v-pre>1</code></td>
</tr>
<tr>
<td><code v-pre>*</code></td>
<td>乘法</td>
<td><code v-pre>3 * 2</code> → <code v-pre>6</code></td>
</tr>
<tr>
<td><code v-pre>/</code></td>
<td>除法</td>
<td><code v-pre>5 / 2</code> → <code v-pre>2</code>（整型）/ <code v-pre>5.0 / 2</code> → <code v-pre>2.5</code>（浮点）</td>
</tr>
<tr>
<td><code v-pre>%</code></td>
<td>取模（取余数）</td>
<td><code v-pre>5 % 2</code> → <code v-pre>1</code></td>
</tr>
</tbody>
</table>
<p><strong>整数除法 vs 浮点数除法</strong>——这是新手最容易踩的坑：</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> a </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 5</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> /</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 2</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">        // 结果是 2，不是 2.5！</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 两个整数相除，Java 会执行整数除法，直接截断小数部分</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">double</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> b </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 5.0</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> /</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 2</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">    // 结果是 2.5</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">double</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> c </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 5</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> /</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 2.0</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">    // 结果也是 2.5</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 只要有一个操作数是浮点数，就会执行浮点数除法</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong><code v-pre>%</code> 取模——结果符号跟随被除数</strong>：</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66">5</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> %</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 3</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">    // 2</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66">5</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> %</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> -</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66">3</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">   // 2  （被除数是正数，结果为正）</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">-</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66">5</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> %</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 3</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">   // -2 （被除数是负数，结果为负）</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">-</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66">5</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> %</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> -</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66">3</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // -2</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong><code v-pre>+</code> 的双重身份——加法 vs 字符串拼接</strong>：</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 两边都是数字 → 加法</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66">1</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> +</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 2</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">         // 3</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 有一边是字符串 → 拼接</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379">"Hello "</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> +</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379"> "World"</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // Hello World</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379">"age: "</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> +</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 18</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">        // age: 18</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 混合运算要小心执行顺序（从左到右）</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66">1</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> +</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 2</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> +</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379"> "abc"</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">       // "3abc"  先做加法，再拼接</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379">"abc"</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> +</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 1</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> +</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 2</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">       // "abc12" 先拼接，再拼接</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_4-2-关系运算符" tabindex="-1"><a class="header-anchor" href="#_4-2-关系运算符"><span>4.2 关系运算符</span></a></h3>
<p>关系运算符用来比较两个值的大小或相等关系，结果永远是 <code v-pre>boolean</code> 类型。</p>
<table>
<thead>
<tr>
<th>运算符</th>
<th>含义</th>
<th>示例</th>
</tr>
</thead>
<tbody>
<tr>
<td><code v-pre>==</code></td>
<td>等于</td>
<td><code v-pre>5 == 3</code> → <code v-pre>false</code></td>
</tr>
<tr>
<td><code v-pre>!=</code></td>
<td>不等于</td>
<td><code v-pre>5 != 3</code> → <code v-pre>true</code></td>
</tr>
<tr>
<td><code v-pre>&gt;</code></td>
<td>大于</td>
<td><code v-pre>5 &gt; 3</code> → <code v-pre>true</code></td>
</tr>
<tr>
<td><code v-pre>&lt;</code></td>
<td>小于</td>
<td><code v-pre>5 &lt; 3</code> → <code v-pre>false</code></td>
</tr>
<tr>
<td><code v-pre>&gt;=</code></td>
<td>大于等于</td>
<td><code v-pre>5 &gt;= 5</code> → <code v-pre>true</code></td>
</tr>
<tr>
<td><code v-pre>&lt;=</code></td>
<td>小于等于</td>
<td><code v-pre>3 &lt;= 5</code> → <code v-pre>true</code></td>
</tr>
</tbody>
</table>
<blockquote>
<p>⚠️ <strong>陷阱预告</strong>：<code v-pre>==</code> 在比较<strong>基本类型</strong>时比较的是值，在比较<strong>引用类型</strong>时比较的是内存地址（是不是同一个对象）。具体区别下一篇&quot;基本数据类型&quot;中会详细展开。</p>
</blockquote>
<h3 id="_4-3-⭐️-逻辑运算符与短路求值" tabindex="-1"><a class="header-anchor" href="#_4-3-⭐️-逻辑运算符与短路求值"><span>4.3 ⭐️ 逻辑运算符与短路求值</span></a></h3>
<table>
<thead>
<tr>
<th>运算符</th>
<th>含义</th>
</tr>
</thead>
<tbody>
<tr>
<td><code v-pre>&amp;&amp;</code></td>
<td>逻辑与（AND），两边都为 <code v-pre>true</code> 结果才为 <code v-pre>true</code></td>
</tr>
<tr>
<td><code v-pre>||</code></td>
<td>逻辑或（OR），任意一边为 <code v-pre>true</code> 结果就为 <code v-pre>true</code></td>
</tr>
<tr>
<td><code v-pre>!</code></td>
<td>逻辑非（NOT），取反</td>
</tr>
</tbody>
</table>
<p><strong>短路求值（Short-Circuit Evaluation）</strong> 是面试中的高频考点：</p>
<ul>
<li><code v-pre>&amp;&amp;</code> 如果左边是 <code v-pre>false</code>，右边<strong>根本不会执行</strong>（因为不管右边是什么，结果都是 false）</li>
<li><code v-pre>||</code> 如果左边是 <code v-pre>true</code>，右边<strong>根本不会执行</strong>（因为不管右边是什么，结果都是 true）</li>
</ul>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 短路求值的实际效果</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> a </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 10</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// &#x26;&#x26; 短路：左边为 false，右边不执行</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">boolean</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> r1 </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (a </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">&#x3C;</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 5</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">) </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">&#x26;&#x26;</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (a</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">++</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> ></span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 0</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">)</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(r1);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // false</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(a);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">   // 10 —— a++ 根本没有执行！</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// || 短路：左边为 true，右边不执行</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">boolean</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> r2 </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (a </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">></span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 5</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">) </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">||</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (a</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">++</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> ></span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 0</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">)</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(r2);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // true</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(a);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">   // 10 —— a++ 还是没有执行！</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>这个特性在实际开发中非常有用：</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// ✅ 利用短路避免空指针异常</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">if</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (user </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">!=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> null</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> &#x26;&#x26;</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B"> user</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">getName</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">().</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">equals</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379">"张三"</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">)</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">) {</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">    // 如果 user 为 null，&#x26;&#x26; 后面的代码不会执行，避免了 NullPointerException</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">}</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// ✅ 利用短路做条件执行</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">if</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (cache </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">==</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> null</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> ||</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> !</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">cache</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">hasKey</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(key)</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">) {</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">    // 只在缓存不存在或无数据时加载</span></span>
<span class="line"><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">    loadData</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">()</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">}</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong><code v-pre>&amp;&amp;</code> vs <code v-pre>&amp;</code>、<code v-pre>||</code> vs <code v-pre>|</code> 的区别</strong>：</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> a </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 10</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">,</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> b </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 10</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// &#x26;&#x26; 短路</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">boolean</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> r1 </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (a </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">&#x3C;</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 5</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">) </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">&#x26;&#x26;</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (a</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">++</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> ></span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 0</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">)</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // a++ 没执行，a 还是 10</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// &#x26; 非短路（两边都会执行）</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">boolean</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> r2 </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (b </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">&#x3C;</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 5</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">) </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">&#x26;</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (b</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">++</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> ></span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 0</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">)</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">   // b++ 执行了，b 变成了 11</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><code v-pre>&amp;</code> 和 <code v-pre>|</code> 也可以做逻辑运算，但它们<strong>不短路</strong>，两边表达式都会执行。此外 <code v-pre>&amp;</code> 和 <code v-pre>|</code> 还可以做<strong>位运算</strong>（见 4.8 节），而 <code v-pre>&amp;&amp;</code> 和 <code v-pre>||</code> 只能做逻辑运算。</p>
<h3 id="_4-4-赋值运算符" tabindex="-1"><a class="header-anchor" href="#_4-4-赋值运算符"><span>4.4 赋值运算符</span></a></h3>
<table>
<thead>
<tr>
<th>运算符</th>
<th>等价于</th>
</tr>
</thead>
<tbody>
<tr>
<td><code v-pre>=</code></td>
<td>直接赋值</td>
</tr>
<tr>
<td><code v-pre>+=</code></td>
<td><code v-pre>a = a + b</code></td>
</tr>
<tr>
<td><code v-pre>-=</code></td>
<td><code v-pre>a = a - b</code></td>
</tr>
<tr>
<td><code v-pre>*=</code></td>
<td><code v-pre>a = a * b</code></td>
</tr>
<tr>
<td><code v-pre>/=</code></td>
<td><code v-pre>a = a / b</code></td>
</tr>
<tr>
<td><code v-pre>%=</code></td>
<td><code v-pre>a = a % b</code></td>
</tr>
</tbody>
</table>
<p>复合赋值运算符有一个隐蔽的特性：<strong>自动帮你做类型转换</strong>：</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">byte</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> b </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 10</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// ❌ 编译不通过</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">b </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> b </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">+</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 1</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">   // b + 1 的结果是 int 类型，无法赋值给 byte</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// ✅ 编译通过</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">b </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">+=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 1</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">      // += 内部自动做了强制类型转换：b = (byte)(b + 1)</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>这不是 bug，而是 JLS（Java 语言规范）明确规定 <code v-pre>+=</code> 等价于 <code v-pre>(type)((a) + (b))</code>。</p>
<h3 id="_4-5-三元运算符" tabindex="-1"><a class="header-anchor" href="#_4-5-三元运算符"><span>4.5 三元运算符</span></a></h3>
<p><strong>语法</strong>：<code v-pre>条件 ? 表达式1 : 表达式2</code></p>
<p>如果条件为 <code v-pre>true</code>，返回表达式 1 的值；如果条件为 <code v-pre>false</code>，返回表达式 2 的值。</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> score </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 85</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">String</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> result </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> score </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">>=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 60</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> ?</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379"> "及格"</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> :</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379"> "不及格"</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(result);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // 及格</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>什么时候用三元，什么时候用 <code v-pre>if-else</code>？</strong></p>
<table>
<thead>
<tr>
<th>场景</th>
<th>推荐</th>
</tr>
</thead>
<tbody>
<tr>
<td>简单的二选一赋值</td>
<td><code v-pre>?:</code> 更简洁</td>
</tr>
<tr>
<td>需要执行多行语句</td>
<td><code v-pre>if-else</code> 更清晰</td>
</tr>
<tr>
<td>嵌套条件</td>
<td>别用三元嵌套——那是给自己找麻烦</td>
</tr>
</tbody>
</table>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// ❌ 别这样写——三元嵌套是代码可读性的灾难</span></span>
<span class="line"><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">String</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> level </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> score </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">>=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 90</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> ?</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379"> "优秀"</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> :</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> score </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">>=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 80</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> ?</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379"> "良好"</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> :</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> score </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">>=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 60</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> ?</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379"> "及格"</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> :</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379"> "不及格"</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// ✅ 这种情况用 if-else 更清晰</span></span>
<span class="line"><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">String</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> level</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">if</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (score </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">>=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 90</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">) {</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">    level </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379"> "优秀"</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">} </span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">else</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> if</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (score </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">>=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 80</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">) {</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">    level </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379"> "良好"</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">} </span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">else</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> if</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (score </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">>=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 60</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">) {</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">    level </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379"> "及格"</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">} </span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">else</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> {</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">    level </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379"> "不及格"</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">}</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_4-6-⭐️-自增自减运算符-面试高频" tabindex="-1"><a class="header-anchor" href="#_4-6-⭐️-自增自减运算符-面试高频"><span>4.6 ⭐️ 自增自减运算符（面试高频）</span></a></h3>
<p>这是 Java 面试中<strong>最常考的运算符陷阱</strong>，没有之一。</p>
<p><strong>基本规则</strong>：</p>
<table>
<thead>
<tr>
<th>运算符</th>
<th>含义</th>
</tr>
</thead>
<tbody>
<tr>
<td><code v-pre>++i</code></td>
<td><strong>先加后用</strong>——i 先自增 1，再参与外层表达式的计算</td>
</tr>
<tr>
<td><code v-pre>i++</code></td>
<td><strong>先用后加</strong>——先取 i 的当前值参与外层表达式的计算，然后 i 再自增 1</td>
</tr>
<tr>
<td><code v-pre>--i</code></td>
<td>先减后用</td>
</tr>
<tr>
<td><code v-pre>i--</code></td>
<td>先用后减</td>
</tr>
</tbody>
</table>
<p><strong>简单场景</strong>：</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> i </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 1</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> a </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF"> ++</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">i</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // i 先变成 2，再赋值给 a</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379">"i="</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> +</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF"> i </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">+</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379"> ", a="</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> +</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF"> a);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // i=2, a=2</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> j </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 1</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> b </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> j</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">++;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // 先把 j 的值 1 赋给 b，j 再变成 2</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379">"j="</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> +</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF"> j </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">+</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379"> ", b="</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> +</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF"> b);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // j=2, b=1</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>深入理解——用 <code v-pre>javap -c</code> 反编译字节码验证</strong>：</p>
<p>源文件 <code v-pre>HelloWorld.java</code>：</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">public</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> class</span><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B"> HelloWorld</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF"> {</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">    public</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> static</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> void</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF"> main</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">String</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">[] </span><span style="--shiki-light:#383A42;--shiki-light-font-style:inherit;--shiki-dark:#E06C75;--shiki-dark-font-style:italic">args</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">)</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF"> {</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">        int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> i</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> =</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 1</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">        i </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF"> i++;</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">    }</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">}</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>用 <code v-pre>javap -c HelloWorld.class</code> 反编译，<code v-pre>main</code> 方法的字节码如下：</p>
<div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" data-title="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>Code:</span></span>
<span class="line"><span>   0: iconst_1       // 将 int 常量 1 压入操作数栈</span></span>
<span class="line"><span>   1: istore_1       // 弹出栈顶值，存入局部变量表槽位 1（即 i = 1）</span></span>
<span class="line"><span>   2: iload_1        // 将局部变量表槽位 1 的值（i = 1）压入操作数栈</span></span>
<span class="line"><span>   3: iinc    1, 1   // 将局部变量表槽位 1 的值自增 1（此时 i 变为 2）</span></span>
<span class="line"><span>   6: istore_1       // 弹出操作数栈顶的值（栈顶仍然是 1），存入局部变量表槽位 1</span></span>
<span class="line"><span>   7: return         // 方法返回</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>逐条推演</strong>（操作数栈 + 局部变量表的变化）：</p>
<table>
<thead>
<tr>
<th>字节码</th>
<th>指令含义</th>
<th>操作数栈</th>
<th>局部变量表</th>
</tr>
</thead>
<tbody>
<tr>
<td><code v-pre>iconst_1</code></td>
<td>将常量 1 压栈</td>
<td><code v-pre>[1]</code></td>
<td>i = 未初始化</td>
</tr>
<tr>
<td><code v-pre>istore_1</code></td>
<td>栈顶弹出 → 存入槽位 1</td>
<td><code v-pre>[]</code></td>
<td><strong>i = 1</strong></td>
</tr>
<tr>
<td><code v-pre>iload_1</code></td>
<td>将槽位 1 的值压栈</td>
<td><code v-pre>[1]</code></td>
<td>i = 1</td>
</tr>
<tr>
<td><code v-pre>iinc 1, 1</code></td>
<td>槽位 1 自增 1（<strong>只操作局部变量表，不碰栈</strong>）</td>
<td><code v-pre>[1]</code></td>
<td><strong>i = 2</strong></td>
</tr>
<tr>
<td><code v-pre>istore_1</code></td>
<td>栈顶弹出 → 存入槽位 1（<strong>用栈顶的 1 覆盖了 i</strong>）</td>
<td><code v-pre>[]</code></td>
<td><strong>i = 1</strong></td>
</tr>
<tr>
<td><code v-pre>return</code></td>
<td>方法返回</td>
<td>—</td>
<td>i = 1</td>
</tr>
</tbody>
</table>
<p>三步看懂整个过程：</p>
<div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" data-title="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>iload_1  →  栈 = [1],   i = 1    "把 i 的值抄一份压入栈"</span></span>
<span class="line"><span>iinc     →  栈 = [1],   i = 2    "局部变量 i 自增，但栈里的副本不受影响"</span></span>
<span class="line"><span>istore_1 →  栈 = [],    i = 1    "把栈顶的值 (1) 写回 i，i 的自增被覆盖了！"</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>关键发现</strong>：<code v-pre>iinc</code> 指令直接操作局部变量表，<strong>不会修改操作数栈中已经压入的值</strong>。所以 <code v-pre>istore_1</code> 写入的仍然是 <code v-pre>iload_1</code> 时压入的那个 <code v-pre>1</code>——<code v-pre>iinc</code> 对局部变量表所做的自增（<code v-pre>i = 2</code>）被无情覆盖，最终 <code v-pre>i</code> 仍然是 <code v-pre>1</code>。</p>
<blockquote>
<p>💡 <strong>为什么局部变量表从槽位 1 开始？</strong></p>
<p>因为 <code v-pre>main</code> 是静态方法，槽位 0 被 <code v-pre>String[] args</code> 参数占用。如果是实例方法（非 <code v-pre>static</code>），槽位 0 则是 <code v-pre>this</code> 引用。</p>
</blockquote>
<p><strong>经典面试题变体对比</strong>：</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 题一：i = i++</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> i </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 1</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">i </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> i</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">++;</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(i);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // 输出：1</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 原因见上方字节码推演</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 题二：i = ++i</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> j </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 1</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">j </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF"> ++</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">j</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(j);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // 输出：2</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// ++j 的字节码顺序不同：iinc 先执行（j 变 2），iload 后执行（压入 2），istore 写入 2</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><blockquote>
<p>🎯 <strong>记忆诀窍</strong>：<code v-pre>i++</code> 是&quot;先抄一份旧的备用，再自增，最后用备用的覆盖&quot;；<code v-pre>++i</code> 是&quot;先自增，再抄新的，最后用新的写入&quot;。面试时画出操作数栈的推演过程，就永远不会算错。</p>
</blockquote>
<h3 id="_4-7-⭐️-移位运算符-面试高频" tabindex="-1"><a class="header-anchor" href="#_4-7-⭐️-移位运算符-面试高频"><span>4.7 ⭐️ 移位运算符（面试高频）</span></a></h3>
<p>移位运算符直接操纵二进制位，是底层优化和高性能编程的基础。</p>
<table>
<thead>
<tr>
<th>运算符</th>
<th>含义</th>
<th>效果</th>
</tr>
</thead>
<tbody>
<tr>
<td><code v-pre>&lt;&lt;</code></td>
<td>左移</td>
<td>低位补 0，每左移 1 位相当于<strong>乘以 2</strong></td>
</tr>
<tr>
<td><code v-pre>&gt;&gt;</code></td>
<td>算术右移</td>
<td>高位用<strong>符号位</strong>填充（正数补 0，负数补 1）</td>
</tr>
<tr>
<td><code v-pre>&gt;&gt;&gt;</code></td>
<td>逻辑右移</td>
<td>高位<strong>一律补 0</strong>（不关心符号）</td>
</tr>
</tbody>
</table>
<p><strong>图解三种移位</strong>：</p>
<div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" data-title="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>假设数字 -8（32 位表示）：</span></span>
<span class="line"><span></span></span>
<span class="line"><span>二进制（补码）：11111111 11111111 11111111 11111000</span></span>
<span class="line"><span></span></span>
<span class="line"><span>>>  1 位（算术右移）：11111111 11111111 11111111 11111100  → -4</span></span>
<span class="line"><span>     高位补符号位 1，保持负数</span></span>
<span class="line"><span></span></span>
<span class="line"><span>>>> 1 位（逻辑右移）：01111111 11111111 11111111 11111100  → 2147483644</span></span>
<span class="line"><span>     高位一律补 0，负数变巨大正数！</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>代码验证</strong>：</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> n </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> -</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66">8</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(n </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">>></span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 1</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">    // -4   —— 算术右移：除以 2，保留符号</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(n </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">>>></span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 1</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">   // 2147483644 —— 逻辑右移：符号位也补 0</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong><code v-pre>&lt;&lt;</code> 为什么相当于乘以 2 的 n 次方？</strong></p>
<p>二进制中，左移一位就是在末尾加一个 0，这和十进制末尾加一个 0 相当于乘以 10 是同一个道理：</p>
<div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" data-title="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>二进制：0010 (2)  → 左移 1 位 → 0100 (4)   = 2 × 2¹</span></span>
<span class="line"><span>二进制：0010 (2)  → 左移 2 位 → 1000 (8)   = 2 × 2²</span></span>
<span class="line"><span>二进制：0010 (2)  → 左移 3 位 → 0001 0000 (16) = 2 × 2³</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>实际应用场景</strong>：</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 1. HashMap 的哈希扰动函数</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 将高 16 位和低 16 位做异或，增加哈希值的随机性</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">static</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> final</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> int</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF"> hash</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">(</span><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">Object</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> key) {</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">    int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> h</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">    return</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (key </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">==</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> null</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">) </span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">?</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 0</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> :</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (h </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B"> key</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">hashCode</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">()</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">) </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">^</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (h </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">>>></span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 16</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">)</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">}</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 2. 位图标记——用 int 的 32 个位记录 32 种状态</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> flags </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 0</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">flags </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">|=</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66">1</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> &#x3C;&#x3C;</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 3</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">)</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">   // 设置第 3 位为 1</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">flags </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">|=</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66">1</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> &#x3C;&#x3C;</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 7</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">)</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">   // 设置第 7 位为 1</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">boolean</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> hasFlag3 </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (flags </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">&#x26;</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66">1</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> &#x3C;&#x3C;</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 3</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">)) </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">!=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 0</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // 检查第 3 位是否为 1</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 3. 高效计算——移位比乘除快得多</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> half </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> n </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">>></span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 1</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">   // 等价于 n / 2，但更快</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> doubleVal </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> n </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">&#x3C;&#x3C;</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 1</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // 等价于 n * 2，但更快</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_4-8-位运算符" tabindex="-1"><a class="header-anchor" href="#_4-8-位运算符"><span>4.8 位运算符</span></a></h3>
<table>
<thead>
<tr>
<th>运算符</th>
<th>含义</th>
<th>运算规则</th>
</tr>
</thead>
<tbody>
<tr>
<td><code v-pre>&amp;</code></td>
<td>按位与</td>
<td>同为 1 才得 1</td>
</tr>
<tr>
<td><code v-pre>|</code></td>
<td>按位或</td>
<td>只要有一个 1 就得 1</td>
</tr>
<tr>
<td><code v-pre>^</code></td>
<td>按位异或</td>
<td>不同为 1，相同为 0</td>
</tr>
<tr>
<td><code v-pre>~</code></td>
<td>按位取反</td>
<td>0 变 1，1 变 0</td>
</tr>
</tbody>
</table>
<p><strong>真值表</strong>：</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> a </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 0b1100</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // 二进制 1100 = 十进制 12</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> b </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 0b1010</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // 二进制 1010 = 十进制 10</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">Integer</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">toBinaryString</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(a </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">&#x26;</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF"> b));</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">   // 1000 (8)  —— 两位都是 1</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">Integer</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">toBinaryString</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(a </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">|</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF"> b));</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">   // 1110 (14) —— 至少一位是 1</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">Integer</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">toBinaryString</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(a </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">^</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF"> b));</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">   // 0110 (6)  —— 两位不同</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">Integer</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">toBinaryString</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">~</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">a));</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">      // 1111...0011 (-13) —— 全部取反</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>典型应用场景</strong>：</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 1. 奇偶判断——比 n % 2 更快</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">boolean</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> isOdd </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (n </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">&#x26;</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 1</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">) </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">==</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 1</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 2. 权限位掩码</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> READ    </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 1</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> &#x3C;&#x3C;</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 0</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // 0001</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> WRITE   </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 1</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> &#x3C;&#x3C;</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 1</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // 0010</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> EXECUTE </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 1</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> &#x3C;&#x3C;</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 2</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // 0100</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> permission </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> READ </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">|</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> WRITE</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // 0011 —— 拥有读写权限</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">boolean</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> canRead </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (permission </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">&#x26;</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> READ) </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">!=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 0</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">      // true</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">boolean</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> canExecute </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (permission </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">&#x26;</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> EXECUTE) </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">!=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 0</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic"> // false</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 3. 交换两个整数（不借助第三个变量）</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> x </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 5</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">,</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> y </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 10</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">x </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> x </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">^</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> y</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">y </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> x </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">^</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> y</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // y 变成了原来的 x</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">x </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> x </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">^</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> y</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // x 变成了原来的 y</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379">"x="</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> +</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF"> x </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">+</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379"> ", y="</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> +</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF"> y);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // x=10, y=5</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_4-9-运算符优先级" tabindex="-1"><a class="header-anchor" href="#_4-9-运算符优先级"><span>4.9 运算符优先级</span></a></h3>
<p>当一行代码中出现多个运算符时，Java 按照优先级从高到低依次计算。</p>
<p><strong>优先级速查表（从高到低）</strong>：</p>
<table>
<thead>
<tr>
<th>优先级</th>
<th>运算符</th>
<th>结合性</th>
</tr>
</thead>
<tbody>
<tr>
<td>1（最高）</td>
<td><code v-pre>()</code> <code v-pre>[]</code> <code v-pre>.</code></td>
<td>左 → 右</td>
</tr>
<tr>
<td>2</td>
<td><code v-pre>!</code> <code v-pre>~</code> <code v-pre>++</code> <code v-pre>--</code> <code v-pre>+</code>（正号）<code v-pre>-</code>（负号）</td>
<td>右 → 左</td>
</tr>
<tr>
<td>3</td>
<td><code v-pre>*</code> <code v-pre>/</code> <code v-pre>%</code></td>
<td>左 → 右</td>
</tr>
<tr>
<td>4</td>
<td><code v-pre>+</code> <code v-pre>-</code></td>
<td>左 → 右</td>
</tr>
<tr>
<td>5</td>
<td><code v-pre>&lt;&lt;</code> <code v-pre>&gt;&gt;</code> <code v-pre>&gt;&gt;&gt;</code></td>
<td>左 → 右</td>
</tr>
<tr>
<td>6</td>
<td><code v-pre>&lt;</code> <code v-pre>&lt;=</code> <code v-pre>&gt;</code> <code v-pre>&gt;=</code> <code v-pre>instanceof</code></td>
<td>左 → 右</td>
</tr>
<tr>
<td>7</td>
<td><code v-pre>==</code> <code v-pre>!=</code></td>
<td>左 → 右</td>
</tr>
<tr>
<td>8</td>
<td><code v-pre>&amp;</code></td>
<td>左 → 右</td>
</tr>
<tr>
<td>9</td>
<td><code v-pre>^</code></td>
<td>左 → 右</td>
</tr>
<tr>
<td>10</td>
<td><code v-pre>|</code></td>
<td>左 → 右</td>
</tr>
<tr>
<td>11</td>
<td><code v-pre>&amp;&amp;</code></td>
<td>左 → 右</td>
</tr>
<tr>
<td>12</td>
<td><code v-pre>||</code></td>
<td>左 → 右</td>
</tr>
<tr>
<td>13</td>
<td><code v-pre>?:</code></td>
<td>右 → 左</td>
</tr>
<tr>
<td>14（最低）</td>
<td><code v-pre>=</code> <code v-pre>+=</code> <code v-pre>-=</code> <code v-pre>*=</code> <code v-pre>/=</code> <code v-pre>%=</code> <code v-pre>&lt;&lt;=</code> <code v-pre>&gt;&gt;=</code></td>
<td>右 → 左</td>
</tr>
</tbody>
</table>
<p><strong>口诀记忆</strong>：&quot;<strong>单目 &gt; 算术 &gt; 移位 &gt; 关系 &gt; 位 &gt; 逻辑 &gt; 三目 &gt; 赋值</strong>&quot;</p>
<p><strong>最佳实践是：不确定优先级就加括号</strong>。括号不仅消除歧义，更重要的——它让看代码的人不需要在脑中模拟优先级。</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// ❌ 让人头疼——谁会记得 &#x26; 和 &#x26;&#x26; 哪个优先级高？</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">boolean</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> result </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> a </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">></span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 0</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> &#x26;&#x26;</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> b </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">&#x3C;</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 10</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> &#x26;</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> c </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">!=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 0</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// ✅ 加了括号一目了然</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">boolean</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> result </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (a </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">></span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 0</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">) </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">&#x26;&#x26;</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> ((b </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">&#x3C;</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 10</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">) </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">&#x26;</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (c </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">!=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> 0</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">))</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_4-10-instanceof-运算符" tabindex="-1"><a class="header-anchor" href="#_4-10-instanceof-运算符"><span>4.10 instanceof 运算符</span></a></h3>
<p><code v-pre>instanceof</code> 用来判断一个对象是否是某个类（或接口）的实例：</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">Object</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> obj </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379"> "Hello, Java!"</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(obj </span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">instanceof</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF"> String);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">   // true</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(obj </span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">instanceof</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF"> Integer);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // false</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(obj </span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">instanceof</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF"> Object);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">   // true —— 所有类都是 Object 的子类</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>Java 16 的 Pattern Matching 简化写法</strong>：</p>
<p>Java 16 之前，<code v-pre>instanceof</code> 判断后需要手动强转：</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// Java 16 之前——啰嗦</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">if</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (obj </span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">instanceof</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> String) {</span></span>
<span class="line"><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">    String</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> s </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (String) obj</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">   // 手动强转</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">    System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">s</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">length</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">());</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">}</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// Java 16+ —— 简洁</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">if</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (obj </span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">instanceof</span><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B"> String</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> s) {  </span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 一步完成判断 + 赋值 + 类型转换</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">    System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">s</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">length</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">());</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">}</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>这种写法特别适合需要根据不同类型做不同处理的场景，减少了冗余代码。</p>
<hr>
<h2 id="五、分隔符" tabindex="-1"><a class="header-anchor" href="#五、分隔符"><span>五、分隔符</span></a></h2>
<blockquote>
<p>分隔符是 Java 代码的&quot;骨架&quot;，它们定义了代码块、方法调用、数组访问等结构。没有它们，Java 代码就是一盘散沙。</p>
</blockquote>
<table>
<thead>
<tr>
<th>分隔符</th>
<th>名称</th>
<th>用途</th>
</tr>
</thead>
<tbody>
<tr>
<td><code v-pre>{ }</code></td>
<td>花括号</td>
<td>定义代码块 / 类体 / 方法体 / 作用域</td>
</tr>
<tr>
<td><code v-pre>( )</code></td>
<td>圆括号</td>
<td>方法参数列表 / 表达式分组 / 类型转换 / <code v-pre>if</code>/<code v-pre>for</code>/<code v-pre>while</code> 条件</td>
</tr>
<tr>
<td><code v-pre>[ ]</code></td>
<td>方括号</td>
<td>数组声明和元素访问</td>
</tr>
<tr>
<td><code v-pre>;</code></td>
<td>分号</td>
<td>语句结束符——Java 中<strong>每条语句都必须以分号结尾</strong></td>
</tr>
<tr>
<td><code v-pre>,</code></td>
<td>逗号</td>
<td>分隔变量声明、方法参数、数组元素</td>
</tr>
<tr>
<td><code v-pre>.</code></td>
<td>点号</td>
<td>访问类的成员（<code v-pre>System.out</code>）或包的层级（<code v-pre>java.util</code>）</td>
</tr>
<tr>
<td><code v-pre>::</code></td>
<td>双冒号</td>
<td>方法引用（Java 8+），如 <code v-pre>System.out::println</code></td>
</tr>
</tbody>
</table>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 分隔符使用的完整示例</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">public</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> class</span><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B"> SeparatorDemo</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF"> {</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">             // { 开始类体</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">    public</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> static</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> void</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF"> main</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">String</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">[] </span><span style="--shiki-light:#383A42;--shiki-light-font-style:inherit;--shiki-dark:#E06C75;--shiki-dark-font-style:italic">args</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">)</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF"> {  </span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// ( 参数列表 )，{ 开始方法体</span></span>
<span class="line"><span style="--shiki-light:#C18401;--shiki-dark:#C678DD">        int</span><span style="--shiki-light:#E45649;--shiki-dark:#ABB2BF">[] </span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75">numbers</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> =</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF"> {</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66">1</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">, </span><span style="--shiki-light:#986801;--shiki-dark:#D19A66">2</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">, </span><span style="--shiki-light:#986801;--shiki-dark:#D19A66">3</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">};       </span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// [] 数组声明，{ 数组初始化，, 分隔元素</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">        System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(numbers[</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66">0</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">]);  </span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// . 访问成员，() 方法调用，[] 数组访问，; 语句结束</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">    }</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">                                     // } 结束方法体</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">}</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">                                         // } 结束类体</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><hr>
<h2 id="六、总结" tabindex="-1"><a class="header-anchor" href="#六、总结"><span>六、总结</span></a></h2>
<table>
<thead>
<tr>
<th>知识点</th>
<th>核心要点</th>
</tr>
</thead>
<tbody>
<tr>
<td>注释</td>
<td><code v-pre>//</code> 单行 / <code v-pre>/* */</code> 多行 / <code v-pre>/** */</code> 文档（Javadoc），文档注释要注意 javadoc 的访问权限限制</td>
</tr>
<tr>
<td>标识符命名</td>
<td>规则（硬性要求，违反编译不过）vs 规范（软性建议，驼峰命名是 Java 的身份证）</td>
</tr>
<tr>
<td>关键字</td>
<td>约 50 个保留词，<code v-pre>const</code> 和 <code v-pre>goto</code> 是历史遗物，<code v-pre>true</code>/<code v-pre>false</code>/<code v-pre>null</code> 是字面量</td>
</tr>
<tr>
<td>自增自减</td>
<td><code v-pre>++i</code> 先加后用，<code v-pre>i++</code> 先用后加——用操作数栈模型理解 <code v-pre>i = i++</code> 的结果</td>
</tr>
<tr>
<td>短路求值</td>
<td><code v-pre>&amp;&amp;</code> 和 `</td>
</tr>
<tr>
<td>移位运算</td>
<td><code v-pre>&lt;&lt;</code> 左移（乘以 2）/ <code v-pre>&gt;&gt;</code> 算术右移（补符号位）/ <code v-pre>&gt;&gt;&gt;</code> 逻辑右移（补 0）</td>
</tr>
<tr>
<td>位运算</td>
<td><code v-pre>&amp;</code> `</td>
</tr>
<tr>
<td>优先级</td>
<td>不确定就加括号——代码是写给人看的</td>
</tr>
</tbody>
</table>
<p>掌握本文的内容后，你就拥有了阅读和编写 Java 代码的&quot;识字能力&quot;。下一篇我们将进入 <strong>基本数据类型</strong>——Java 中的 8 种基本类型、包装类型、自动装箱拆箱，以及那些会让你在面试中被问到的缓存机制。</p>
<hr>
<h2 id="参考" tabindex="-1"><a class="header-anchor" href="#参考"><span>参考</span></a></h2>
<ul>
<li><a href="https://docs.oracle.com/javase/specs/jls/se17/html/jls-3.html" target="_blank" rel="noopener noreferrer">Java Language Specification - Chapter 3: Lexical Structure</a> — Java 词法结构官方规范</li>
<li><a href="https://docs.oracle.com/javase/specs/jls/se17/html/jls-15.html" target="_blank" rel="noopener noreferrer">Java Language Specification - Chapter 15: Expressions</a> — Java 表达式官方规范</li>
<li><a href="https://javabetter.cn/basic-grammar/javadoc.html" target="_blank" rel="noopener noreferrer">javabetter.cn - 文档注释详解</a> — 二哥的注释教程</li>
<li><a href="https://javaguide.cn/java/basis/java-basic-questions-01.html" target="_blank" rel="noopener noreferrer">JavaGuide</a> — 常看的Java知识分享社群</li>
</ul>
<hr>
</div></template>


