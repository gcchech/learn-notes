<template><div><h1 id="java-i-o-流-从字节流到-nio" tabindex="-1"><a class="header-anchor" href="#java-i-o-流-从字节流到-nio"><span>Java I/O 流：从字节流到 NIO</span></a></h1>
<blockquote>
<p>📖 I/O 是 Java 程序与外部世界交互的通道——文件读写、网络通信、管道传输，底层都是 I/O。Java 的 I/O 体系庞大但设计精巧，最妙的是它对<strong>装饰器模式</strong>的经典运用。</p>
</blockquote>
<hr>
<h2 id="一、i-o-流体系总览" tabindex="-1"><a class="header-anchor" href="#一、i-o-流体系总览"><span>一、I/O 流体系总览</span></a></h2>
<h3 id="_1-1-分类维度" tabindex="-1"><a class="header-anchor" href="#_1-1-分类维度"><span>1.1 分类维度</span></a></h3>
<p>Java I/O 按两个维度分类：</p>
<div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" data-title="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>             字节流（以 byte 为单位）      字符流（以 char 为单位）</span></span>
<span class="line"><span>           ┌─────────────────────┐  ┌────────────────────────┐</span></span>
<span class="line"><span>输入       │ InputStream         │  │ Reader                 │</span></span>
<span class="line"><span>           │  └ FileInputStream  │  │  └ FileReader          │</span></span>
<span class="line"><span>           │  └ ByteArrayInput.. │  │  └ BufferedReader ★    │</span></span>
<span class="line"><span>           │  └ BufferedInput..  │  │  └ InputStreamReader    │</span></span>
<span class="line"><span>           │  └ ObjectInput..    │  │                        │</span></span>
<span class="line"><span>           └─────────────────────┘  └────────────────────────┘</span></span>
<span class="line"><span>输出       │ OutputStream        │  │ Writer                 │</span></span>
<span class="line"><span>           │  └ FileOutputStream │  │  └ FileWriter          │</span></span>
<span class="line"><span>           │  └ ByteArrayOutput..│  │  └ BufferedWriter      │</span></span>
<span class="line"><span>           │  └ BufferedOutput.. │  │  └ PrintWriter         │</span></span>
<span class="line"><span>           │  └ ObjectOutput..   │  │  └ OutputStreamWriter  │</span></span>
<span class="line"><span>           │  └ PrintStream      │  │                        │</span></span>
<span class="line"><span>           └─────────────────────┘  └────────────────────────┘</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><blockquote>
<p>🎯 <strong>记忆口诀</strong>：Stream = 字节，Reader/Writer = 字符。</p>
</blockquote>
<h3 id="_1-2-字节流-vs-字符流" tabindex="-1"><a class="header-anchor" href="#_1-2-字节流-vs-字符流"><span>1.2 字节流 vs 字符流</span></a></h3>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 字节流——处理二进制数据（图片、视频、压缩包）</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">try</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (</span><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">FileInputStream</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> fis </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> new</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF"> FileInputStream</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">(</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379">"image.png"</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">)) {</span></span>
<span class="line"><span style="--shiki-light:#C18401;--shiki-dark:#C678DD">    byte</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75">[] buffer </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> new</span><span style="--shiki-light:#C18401;--shiki-dark:#C678DD"> byte</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">[</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66">1024</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">]</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">    int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> bytesRead</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">    while</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> ((bytesRead </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B"> fis</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">read</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(buffer)</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">) </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">!=</span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2"> -</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66">1</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">) {</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">        // 处理 buffer[0..bytesRead-1]</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">    }</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">}</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 字符流——处理文本数据（.txt、.json、.xml）</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">try</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (</span><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">BufferedReader</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> reader </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> new</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF"> BufferedReader</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">(</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">new</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF"> FileReader</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">(</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379">"data.txt"</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">))) {</span></span>
<span class="line"><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">    String</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> line</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">    while</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> ((line </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B"> reader</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">readLine</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">()</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">) </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">!=</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66"> null</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">) {</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">        System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(line);</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">    }</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">}</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><hr>
<h2 id="二、⭐️-装饰器模式——i-o-设计的精髓" tabindex="-1"><a class="header-anchor" href="#二、⭐️-装饰器模式——i-o-设计的精髓"><span>二、⭐️ 装饰器模式——I/O 设计的精髓</span></a></h2>
<h3 id="_2-1-什么是装饰器模式" tabindex="-1"><a class="header-anchor" href="#_2-1-什么是装饰器模式"><span>2.1 什么是装饰器模式？</span></a></h3>
<p>Java I/O 的设计是装饰器模式的教科书级实现。核心思想：<strong>不修改原有类，而是嵌套包装来增强功能</strong>。</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// ① 基础组件——直接读文件（每次读一个字节，很慢）</span></span>
<span class="line"><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">InputStream</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> fileInput </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> new</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF"> FileInputStream</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">(</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379">"data.bin"</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">)</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// ② 装饰一层——加缓冲（减少系统调用，快很多）</span></span>
<span class="line"><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">InputStream</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> bufferedInput </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> new</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF"> BufferedInputStream</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">(fileInput)</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// ③ 再装饰一层——加数据读取能力</span></span>
<span class="line"><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">DataInputStream</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> dataInput </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> new</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF"> DataInputStream</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">(bufferedInput)</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// ④ 最终效果——可以高效地按 int、double 等类型读取</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> value </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B"> dataInput</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">readInt</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">();</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">double</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> price </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B"> dataInput</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">readDouble</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">();</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 这三层装饰形成了嵌套结构：</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// DataInputStream → BufferedInputStream → FileInputStream → 文件</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_2-2-嵌套组合的力量" tabindex="-1"><a class="header-anchor" href="#_2-2-嵌套组合的力量"><span>2.2 嵌套组合的力量</span></a></h3>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 字节流 + 缓冲 + 按行读字符</span></span>
<span class="line"><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">BufferedReader</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> reader </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> new</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF"> BufferedReader</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">(</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">    new</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF"> InputStreamReader</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">(         </span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// ③ 字节 → 字符（桥接器）</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">        new</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF"> BufferedInputStream</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">(   </span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// ② 加缓冲</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">            new</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF"> FileInputStream</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">(</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379">"test.txt"</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">)  </span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// ① 读文件</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">        )</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">,</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">        StandardCharsets</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">UTF_8</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">    // 指定编码</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">    )</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">)</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 等价于更常用的简化写法：</span></span>
<span class="line"><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">BufferedReader</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> reader </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> new</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF"> BufferedReader</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">(</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">new</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF"> FileReader</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">(</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379">"test.txt"</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">))</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// FileReader 内部就是 FileInputStream + 默认编码</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_2-3-装饰器-vs-继承" tabindex="-1"><a class="header-anchor" href="#_2-3-装饰器-vs-继承"><span>2.3 装饰器 vs 继承</span></a></h3>
<p>如果用继承来实现同样的功能，会有无数种排列组合：</p>
<div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" data-title="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>// 装饰器模式：3 个功能（缓冲 + 数据读取 + 文件输入）= 3 个类</span></span>
<span class="line"><span>//   FileInputStream + BufferedInputStream + DataInputStream</span></span>
<span class="line"><span></span></span>
<span class="line"><span>// 继承方案：需要创建 2³ = 8 个类！</span></span>
<span class="line"><span>//   FileInputStream、BufferedFileInputStream、DataFileInputStream、</span></span>
<span class="line"><span>//   BufferedDataFileInputStream、ByteArrayInputStream、BufferedByteArray……</span></span>
<span class="line"><span>//   每种功能组合 × 每种数据源都需要一个独立的类 — 类的爆炸</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><hr>
<h2 id="三、字符流与编码" tabindex="-1"><a class="header-anchor" href="#三、字符流与编码"><span>三、字符流与编码</span></a></h2>
<p><code v-pre>InputStreamReader</code> 是字节流到字符流的<strong>桥梁</strong>——它把字节按指定编码解码为字符：</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 读取 GBK 编码的文件</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">try</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (</span><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">BufferedReader</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> reader </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> new</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF"> BufferedReader</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">(</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">        new</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF"> InputStreamReader</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">(</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">            new</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF"> FileInputStream</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">(</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379">"gbk-file.txt"</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">)</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">,</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">            Charset</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">forName</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379">"GBK"</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">)</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // 指定编码</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">        ))) {</span></span>
<span class="line"><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">    String</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> line </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B"> reader</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">readLine</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">();</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">}</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// JDK 11+ 可以直接用 Files</span></span>
<span class="line"><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">String</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> content </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B"> Files</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">readString</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">Path</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">of</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379">"test.txt"</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">), </span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">StandardCharsets</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">UTF_8</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">);</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="字节流和字符流的-桥梁-类" tabindex="-1"><a class="header-anchor" href="#字节流和字符流的-桥梁-类"><span>字节流和字符流的&quot;桥梁&quot;类</span></a></h3>
<div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" data-title="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>字节 → 字符（输入）：InputStreamReader</span></span>
<span class="line"><span>字符 → 字节（输出）：OutputStreamWriter</span></span>
<span class="line"><span></span></span>
<span class="line"><span>// 这两个类属于"适配器模式"——连接两套不兼容的接口体系</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><hr>
<h2 id="四、nio-基础" tabindex="-1"><a class="header-anchor" href="#四、nio-基础"><span>四、NIO 基础</span></a></h2>
<h3 id="_4-1-nio-的三个核心组件" tabindex="-1"><a class="header-anchor" href="#_4-1-nio-的三个核心组件"><span>4.1 NIO 的三个核心组件</span></a></h3>
<table>
<thead>
<tr>
<th>组件</th>
<th>角色</th>
<th>比喻</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>Buffer</strong></td>
<td>数据容器（一块内存区域）</td>
<td>卡车——装载数据</td>
</tr>
<tr>
<td><strong>Channel</strong></td>
<td>数据传输通道（双向）</td>
<td>高速公路——数据流动的管道</td>
</tr>
<tr>
<td><strong>Selector</strong></td>
<td>多路复用器，一个线程管理多个 Channel</td>
<td>调度中心——监控多个通道的状态</td>
</tr>
</tbody>
</table>
<h3 id="_4-2-buffer-的三种模式" tabindex="-1"><a class="header-anchor" href="#_4-2-buffer-的三种模式"><span>4.2 Buffer 的三种模式</span></a></h3>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// Buffer 有三个关键属性：capacity、position、limit</span></span>
<span class="line"><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">ByteBuffer</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> buffer </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B"> ByteBuffer</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">allocate</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66">1024</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // capacity = 1024</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 写模式</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">buffer</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">put</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379">"hello"</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">getBytes</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">());</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // position 移动</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">buffer</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">putInt</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66">42</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">);</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 切换到读模式——flip()</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">buffer</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">flip</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">();</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // limit = position, position = 0</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 读取数据</span></span>
<span class="line"><span style="--shiki-light:#C18401;--shiki-dark:#C678DD">byte</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75">[] bytes </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> new</span><span style="--shiki-light:#C18401;--shiki-dark:#C678DD"> byte</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">[</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">buffer</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">limit</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">()</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">]</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">buffer</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">get</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(bytes);</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">println</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">new</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF"> String</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(bytes));</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // hello + 42 的二进制</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 清空——切换到写模式</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">buffer</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">clear</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">();</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // position = 0, limit = capacity（旧数据还在但会被覆盖）</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" data-title="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span>Buffer 状态转换：</span></span>
<span class="line"><span></span></span>
<span class="line"><span>[写模式]               flip()              [读模式]</span></span>
<span class="line"><span>position 随写入前进  ──────────▶   position=0, limit=原position</span></span>
<span class="line"><span>                     ◀──────────</span></span>
<span class="line"><span>                      clear()/compact()</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_4-3-channel-的双向特性" tabindex="-1"><a class="header-anchor" href="#_4-3-channel-的双向特性"><span>4.3 Channel 的双向特性</span></a></h3>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 传统 IO 的 InputStream/OutputStream 是单向的</span></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// NIO 的 Channel 是双向的（可读可写）</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">try</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (</span><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">FileChannel</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> channel </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B"> FileChannel</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">open</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">         Path</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">of</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379">"data.bin"</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">),</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">         StandardOpenOption</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">READ</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">,</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">         StandardOpenOption</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">WRITE</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">)</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">) {</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">    ByteBuffer</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> buffer </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B"> ByteBuffer</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">allocate</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#986801;--shiki-dark:#D19A66">1024</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">);</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">    // 读</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">    int</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> bytesRead </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B"> channel</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">read</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(buffer);</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">    buffer</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">flip</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">();</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">    // 写</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">    channel</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">write</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(buffer, </span><span style="--shiki-light:#986801;--shiki-dark:#D19A66">0</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // 写到文件指定位置</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">}</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_4-4-bio-vs-nio" tabindex="-1"><a class="header-anchor" href="#_4-4-bio-vs-nio"><span>4.4 BIO vs NIO</span></a></h3>
<table>
<thead>
<tr>
<th>维度</th>
<th>BIO（传统 IO）</th>
<th>NIO（New IO）</th>
</tr>
</thead>
<tbody>
<tr>
<td>数据单位</td>
<td>Stream（流）</td>
<td>Buffer + Channel</td>
</tr>
<tr>
<td>方向</td>
<td>单向（InputStream / OutputStream）</td>
<td><strong>双向</strong>（Channel 可读可写）</td>
</tr>
<tr>
<td>阻塞</td>
<td>阻塞（read() 一直等到有数据）</td>
<td>非阻塞（Selector 多路复用）</td>
</tr>
<tr>
<td>适用场景</td>
<td>连接数少、数据量大</td>
<td><strong>连接数多</strong>（如聊天服务器、IoT）</td>
</tr>
<tr>
<td>性能</td>
<td>连接多时线程爆炸</td>
<td>一个线程管理上千连接</td>
</tr>
</tbody>
</table>
<hr>
<h2 id="五、path-与-files-工具类-jdk-7" tabindex="-1"><a class="header-anchor" href="#五、path-与-files-工具类-jdk-7"><span>五、Path 与 Files 工具类（JDK 7+）</span></a></h2>
<p>JDK 7 引入了 <code v-pre>java.nio.file.Path</code> 和 <code v-pre>java.nio.file.Files</code>，极大简化了文件操作：</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">Path</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> path </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B"> Path</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">of</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379">"/home/user/docs/readme.txt"</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">);</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 文件信息</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">Files</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">exists</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(path);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">            // 是否存在</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">Files</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">size</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(path);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">              // 文件大小</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">Files</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">isDirectory</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(path);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">       // 是否是目录</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">Files</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">getLastModifiedTime</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(path);</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 一次性读取/写入</span></span>
<span class="line"><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">String</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> content </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B"> Files</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">readString</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(path);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // JDK 11+</span></span>
<span class="line"><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">List</span><span style="--shiki-light:#E45649;--shiki-dark:#ABB2BF">&#x3C;</span><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">String</span><span style="--shiki-light:#E45649;--shiki-dark:#ABB2BF">></span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> lines </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B"> Files</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">readAllLines</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(path);</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">Files</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">writeString</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(path, </span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379">"Hello, World!"</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // JDK 11+</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 复制/移动/删除</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">Files</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">copy</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(src, dest, </span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">StandardCopyOption</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">REPLACE_EXISTING</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">);</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">Files</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">move</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(src, dest);</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">Files</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">delete</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(path);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">            // 文件不存在会抛异常</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">Files</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">deleteIfExists</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(path);</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">    // 更安全</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 遍历目录</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">try</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (</span><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">Stream</span><span style="--shiki-light:#E45649;--shiki-dark:#ABB2BF">&#x3C;</span><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">Path</span><span style="--shiki-light:#E45649;--shiki-dark:#ABB2BF">></span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> stream </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B"> Files</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">walk</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">Path</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">of</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379">"/home/user"</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">), </span><span style="--shiki-light:#986801;--shiki-dark:#D19A66">2</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">)</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">) {  </span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 深度=2</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">    stream</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">filter</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(Files</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">::</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">isRegularFile)</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">          .</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">forEach</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">System</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">out</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">::</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">println);</span></span>
<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">}</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 创建目录</span></span>
<span class="line"><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">Files</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">createDirectories</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">Path</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">of</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379">"/a/b/c"</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">));</span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">  // 自动创建所有不存在的父目录</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><strong>Path vs File</strong>：</p>
<div class="language-java line-numbers-mode" data-highlighter="shiki" data-ext="java" data-title="java" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34"><pre v-pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code><span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 旧方式（JDK 6 及以前）</span></span>
<span class="line"><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">File</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> file </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD"> new</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF"> File</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">(</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379">"/home/user/test.txt"</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">)</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">;</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">if</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">file</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">exists</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">()</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">) { </span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">/* ... */</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> }</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// 新方式（JDK 7+）</span></span>
<span class="line"><span style="--shiki-light:#C18401;--shiki-dark:#E5C07B">Path</span><span style="--shiki-light:#E45649;--shiki-dark:#E06C75"> path </span><span style="--shiki-light:#383A42;--shiki-dark:#56B6C2">=</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B"> Path</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">of</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(</span><span style="--shiki-light:#50A14F;--shiki-dark:#98C379">"/home/user/test.txt"</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">);</span></span>
<span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#C678DD">if</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> (</span><span style="--shiki-light:#E45649;--shiki-dark:#E5C07B">Files</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">.</span><span style="--shiki-light:#4078F2;--shiki-dark:#61AFEF">exists</span><span style="--shiki-light:#383A42;--shiki-dark:#ABB2BF">(path)</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75">) { </span><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">/* ... */</span><span style="--shiki-light:#383A42;--shiki-dark:#E06C75"> }</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#A0A1A7;--shiki-light-font-style:italic;--shiki-dark:#7F848E;--shiki-dark-font-style:italic">// Path 的优势：更清晰的 API、更好的异常消息、支持符号链接、与 NIO 无缝集成</span></span></code></pre>
<div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><hr>
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
<td>IO 分类</td>
<td>字节流（Stream）= 二进制；字符流（Reader/Writer）= 文本</td>
</tr>
<tr>
<td>装饰器模式</td>
<td>I/O 系统的核心设计——嵌套包装增强功能，避免类爆炸</td>
</tr>
<tr>
<td>InputStreamReader</td>
<td>字节 → 字符的桥梁（适配器模式），可指定编码</td>
</tr>
<tr>
<td>Buffer</td>
<td>NIO 数据容器，三种模式转换：写 → flip() → 读 → clear()</td>
</tr>
<tr>
<td>Channel</td>
<td>双向通道，替代单向 Stream</td>
</tr>
<tr>
<td>Path/Files</td>
<td>JDK 7+ 推荐的现代文件操作 API，替代 java.io.File</td>
</tr>
</tbody>
</table>
<p>下一篇我们将进入 <strong>序列化</strong>——Serializable 接口、transient 关键字、serialVersionUID 的作用，以及为什么现代应用更倾向于用 JSON 替代 Java 原生序列化。</p>
<hr>
<h2 id="参考" tabindex="-1"><a class="header-anchor" href="#参考"><span>参考</span></a></h2>
<ul>
<li><a href="https://docs.oracle.com/javase/tutorial/essential/io/" target="_blank" rel="noopener noreferrer">Java I/O Tutorial</a></li>
<li><a href="https://docs.oracle.com/javase/8/docs/api/java/nio/package-summary.html" target="_blank" rel="noopener noreferrer">Java NIO Package</a></li>
<li><a href="https://javaguide.cn/java/basis/java-basic-questions-01.html" target="_blank" rel="noopener noreferrer">JavaGuide - IO</a></li>
</ul>
</div></template>


