---
title: Java
icon: java
index: true
order: 1
category:
  - Java
---

# ☕ Java 技术指南

> 从基础到进阶，系统掌握 Java 核心技术栈。

## 模块导航

<Catalog />

## 学习路线

<div style="overflow-x:auto;padding:16px 0;">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 80" width="100%" style="max-width:960px;min-width:700px;">
  <defs>
    <linearGradient id="box" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#e76f00;stop-opacity:0.12"/>
      <stop offset="100%" style="stop-color:#e76f00;stop-opacity:0.06"/>
    </linearGradient>
    <filter id="shadow" x="-2%" y="-2%" width="104%" height="120%">
      <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#e76f00" flood-opacity="0.15"/>
    </filter>
  </defs>
  <!-- 节点 1: Java 基础 -->
  <rect x="0" y="10" width="150" height="56" rx="10" fill="url(#box)" stroke="#e76f00" stroke-width="2" filter="url(#shadow)"/>
  <text x="75" y="44" text-anchor="middle" fill="currentColor" font-size="15" font-weight="bold" font-family="system-ui,sans-serif">☕ Java 基础</text>
  <!-- 箭头 1→2 -->
  <line x1="155" y1="38" x2="215" y2="38" stroke="#e76f00" stroke-width="2.5" stroke-dasharray="6 3"/>
  <polygon points="215,32 225,38 215,44" fill="#e76f00"/>
  <!-- 节点 2: 集合框架 -->
  <rect x="230" y="10" width="150" height="56" rx="10" fill="url(#box)" stroke="#e76f00" stroke-width="2" filter="url(#shadow)"/>
  <text x="305" y="44" text-anchor="middle" fill="currentColor" font-size="15" font-weight="bold" font-family="system-ui,sans-serif">📦 集合框架</text>
  <!-- 箭头 2→3 -->
  <line x1="385" y1="38" x2="445" y2="38" stroke="#e76f00" stroke-width="2.5" stroke-dasharray="6 3"/>
  <polygon points="445,32 455,38 445,44" fill="#e76f00"/>
  <!-- 节点 3: 并发编程 -->
  <rect x="460" y="10" width="150" height="56" rx="10" fill="url(#box)" stroke="#e76f00" stroke-width="2" filter="url(#shadow)"/>
  <text x="535" y="44" text-anchor="middle" fill="currentColor" font-size="15" font-weight="bold" font-family="system-ui,sans-serif">⚡ 并发编程</text>
  <!-- 箭头 3→4 -->
  <line x1="615" y1="38" x2="675" y2="38" stroke="#e76f00" stroke-width="2.5" stroke-dasharray="6 3"/>
  <polygon points="675,32 685,38 675,44" fill="#e76f00"/>
  <!-- 节点 4: JVM 原理 -->
  <rect x="690" y="10" width="130" height="56" rx="10" fill="url(#box)" stroke="#e76f00" stroke-width="2" filter="url(#shadow)"/>
  <text x="755" y="44" text-anchor="middle" fill="currentColor" font-size="15" font-weight="bold" font-family="system-ui,sans-serif">💻 JVM 原理</text>
  <!-- 箭头 4→5 -->
  <line x1="825" y1="38" x2="875" y2="38" stroke="#e76f00" stroke-width="2.5" stroke-dasharray="6 3"/>
  <polygon points="875,32 885,38 875,44" fill="#e76f00"/>
  <!-- 节点 5: Java 新特性 -->
  <rect x="830" y="10" width="130" height="56" rx="10" fill="url(#box)" stroke="#e76f00" stroke-width="2" filter="url(#shadow)"/>
  <text x="895" y="44" text-anchor="middle" fill="currentColor" font-size="15" font-weight="bold" font-family="system-ui,sans-serif">✨ 新特性</text>
</svg>
</div>

建议按以下顺序学习：

1. **Java 基础** —— 掌握核心概念、基本语法、面向对象
2. **集合框架** —— 理解容器体系，深入 HashMap、ArrayList 源码
3. **并发编程** —— 线程池、锁机制、JUC 工具类
4. **JVM 原理** —— 内存结构、GC、类加载
5. **Java 新特性** —— Lambda/Stream、模块系统、虚拟线程

## 文章列表

### 📘 Java 基础（10 篇）

- [Java 核心概念](base/concept.md) — JVM/JDK/JRE、跨平台原理、编译与解释
- [Java 基本语法](base/syntax.md) — 注释、标识符、关键字、运算符详解
- [基本数据类型](base/datatype.md) — 8 种基本类型、包装类、装箱拆箱、BigDecimal
- [面向对象编程](base/oop.md) — 封装、继承、多态、抽象类与接口
- [String 深度解析](base/string.md) — 不可变性、常量池、StringBuilder
- [异常处理](base/exception.md) — 受检/非受检异常、try-with-resources
- [泛型](base/generics.md) — 类型擦除、通配符、PECS 原则
- [反射与注解](base/reflection-annotation.md) — Class 对象、动态代理
- [I/O 流](base/io.md) — 字节/字符流、装饰器模式、NIO
- [序列化](base/serialization.md) — Serializable、transient、JSON 替代方案

### 📗 集合框架（5 篇）

- [集合框架概览](collection/overview.md) — 两大体系、Iterator、fail-fast 机制
- [ArrayList vs LinkedList](collection/list.md) — 扩容机制、双向链表、性能对比
- [HashSet / TreeSet / LinkedHashSet](collection/set.md) — hashCode/equals 契约、红黑树
- [HashMap 深度解析](collection/map.md) — 1.7 vs 1.8 源码演进、红黑树化、ConcurrentHashMap
- [Queue / Deque / BlockingQueue](collection/queue.md) — 二叉堆、循环数组、生产者-消费者

### 📙 并发编程（5 篇）

- [并发编程基础](concurrent/basics.md) — 线程生命周期、synchronized 锁升级、volatile、wait/notify
- [JUC 锁机制与 AQS](concurrent/lock.md) — AQS 源码、ReentrantLock、ReadWriteLock、StampedLock
- [JUC 工具类](concurrent/juc-tools.md) — CountDownLatch、CyclicBarrier、Semaphore、原子类
- [线程池详解](concurrent/threadpool.md) — ThreadPoolExecutor 参数、拒绝策略、ForkJoinPool
- [ThreadLocal 深度解析](concurrent/threadlocal.md) — ThreadLocalMap、弱引用、内存泄漏、TTL

### 📕 JVM（4 篇）

- [JVM 内存结构](jvm/memory.md) — 运行时数据区、对象创建、内存溢出排查
- [垃圾回收](jvm/gc.md) — GC 算法、垃圾收集器、CMS/G1/ZGC 演进
- [类加载机制](jvm/classloader.md) — 类加载器、双亲委派、SPI 机制
- [JVM 调优实战](jvm/tuning.md) — 调优参数、调优工具、内存泄漏排查

### 📓 Java 新特性（2 篇）

- [Java 8 核心特性](new-features/java8.md) — Lambda、Stream、Optional、新的日期时间 API
- [Java 9~21 演进之路](new-features/java9-21.md) — 模块化、var、Record、虚拟线程、模式匹配

### 🛠 开发工具（3 篇）

- [构建工具 Maven/Gradle](../../tools/build.md) — 依赖管理、插件机制、多模块构建
- [Git 高效使用指南](../../tools/git.md) — 工作流、分支策略、rebase vs merge
- [IntelliJ IDEA 高效开发](../../tools/idea.md) — 快捷键、调试技巧、插件推荐

### 📋 面试宝典（9 篇）

- [MySQL 面试高频题](interview/mysql.md) — 10 题：索引、事务、锁、分库分表
- [JVM 面试高频题](interview/jvm.md) — 8 题：内存、GC、类加载、调优
- [Collections 面试高频题](interview/collections.md) — 8 题：HashMap、List、Set
- [并发编程面试高频题](interview/concurrent.md) — 8 题：锁升级、AQS、线程池、ThreadLocal
- [Spring 面试高频题](interview/spring.md) — 10 题：IoC、AOP、事务、自动配置
- [Redis 面试高频题](interview/redis.md) — 10 题：数据结构、缓存、持久化、集群
- [计算机网络面试高频题](interview/network.md) — 10 题：TCP、HTTP、HTTPS、跨域
- [分布式系统面试高频题](interview/distributed.md) — 10 题：CAP、分布式事务、分布式 ID
- [场景设计题](interview/scenario.md) — 8 题：短链、秒杀、排行榜、海量数据
