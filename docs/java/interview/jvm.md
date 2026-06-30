---
title: JVM 面试高频题
icon: microchip
order: 2
category:
  - Java
  - 面试宝典
tag:
  - JVM
  - 内存模型
  - GC
  - 类加载
  - 性能调优
---

# JVM 面试高频题

JVM 是 Java 面试的"分水岭"——初级程序员可能只问内存模型，中高级则深入 GC 调优和类加载机制。以下 8 题覆盖了从基础到进阶的 JVM 核心考点。

---

## Q1: JVM 内存模型（运行时数据区）⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: JVM 内存结构、线程共享/隔离

> 面试官问："Java 虚拟机运行时数据区包含哪些部分？哪些是线程私有的，哪些是线程共享的？"

### 核心回答

```
JVM 运行时数据区（HotSpot）
├── 线程私有
│   ├── 程序计数器（PC Register）    —— 当前线程执行的字节码行号
│   ├── 虚拟机栈（VM Stack）         —— 方法调用的栈帧（局部变量、操作数栈、返回地址）
│   └── 本地方法栈（Native Stack）   —— Native 方法调用
│
└── 线程共享
    ├── 堆（Heap）                   —— 存放对象实例（GC 的主战场）
    └── 方法区 / 元空间（Method Area / Metaspace）
                                     —— 类信息、常量、静态变量、JIT 编译后的代码缓存
```

**堆的划分（分代收集理论）**：

```
堆内存
├── 年轻代（Young Generation）
│   ├── Eden 区（对象出生地）
│   └── Survivor 区 × 2（S0 / S1，from / to）
└── 老年代（Old/Tenured Generation）
```

**JDK 8 的重大变化**：**永久代（PermGen）被移除**，改为**元空间（Metaspace）**，使用本地内存而非堆内存。这解决了永久代容易 OOM（`java.lang.OutOfMemoryError: PermGen space`）的问题。

### 深度扩展

**栈帧内部结构**：

```
每个方法调用 = 一个新的栈帧压入虚拟机栈
┌─────────────────────┐
│  局部变量表           │  ← 方法参数 + 方法体内局部变量（编译期确定大小）
│  操作数栈             │  ← 字节码指令执行时的操作空间
│  动态连接             │  ← 指向运行时常量池中该方法的引用
│  方法返回地址          │  ← 调用者的 PC 值
└─────────────────────┘
```

**为什么用两个 Survivor 区？**
标记-复制算法需要一个空的空间来存放存活对象。如果只有一个 Survivor，每次 Minor GC 后 Eden + 1 个 Survivor 的对象都往另一个 Survivor 拷贝，但那个 Survivor 里已经有上一轮 GC 剩下的对象了，内存不连续。两个 Survivor 保证始终有一个是完全空的，复制过去就是连续的内存。

**逃逸分析（Escape Analysis）——栈上分配**：

```java
// 这个对象不会逃逸出方法，JIT 可能直接在栈上分配
public void test() {
    Point p = new Point(1, 2);  // 可能栈上分配，不进入堆
    System.out.println(p.x);
}

// 这个对象逃逸了，必须堆分配
public Point test() {
    Point p = new Point(1, 2);
    return p;  // 返回给调用者 → 逃逸 → 堆分配
}
```

### 面试追问

**Q**: 方法区存什么？和永久代/元空间什么关系？
**A**: 方法区是 JVM 规范中的**逻辑概念**，永久代和元空间是 HotSpot 的**物理实现**。JDK 7 前用永久代（堆内），JDK 8 后用元空间（本地内存）。存类的元信息、运行时常量池、静态变量、JIT 编译缓存。

**Q**: 字符串常量池在哪里？
**A**: JDK 7 起从永久代移到了堆中。因为永久代 GC 不频繁且空间小，大量字符串容易导致 PermGen OOM。

### 常见错误

- ❌ "所有对象都在堆上"——JIT 优化后，未逃逸的对象可能在栈上分配，或经过标量替换后直接拆成基本类型
- ❌ "方法区就是永久代"——方法区是规范，永久代/元空间是实现

### 一句话总结

> **堆和方法区是共享的（GC 主战场），栈、PC、本地栈是私有的（随线程生灭）。JDK 8 元空间替代永久代，字符串池移到堆。**

---

## Q2: 类加载过程与双亲委派机制 ⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: 类生命周期、类加载器、双亲委派

> 面试官问："一个类从 .class 文件到能被使用，经历了哪些步骤？什么是双亲委派机制？为什么要这样设计？"

### 核心回答

**类的生命周期（7 个阶段）**：

```
加载 → 验证 → 准备 → 解析 → 初始化 → 使用 → 卸载
│______ 连接 ______│
```

| 阶段 | 做什么 |
|------|--------|
| **加载** | 通过全限定名获取二进制字节流 → 转为方法区数据结构 → 生成 Class 对象 |
| **验证** | 检查 class 文件格式、元数据、字节码、符号引用是否合法 |
| **准备** | 为**静态变量**分配内存并赋**零值**（`static int a = 1` 此时 `a = 0`） |
| **解析** | 将常量池中的符号引用替换为直接引用（类、方法、字段的内存地址） |
| **初始化** | 执行 `<clinit>()` 方法，真正执行静态变量赋值和静态代码块 |

**双亲委派机制**：

```
Bootstrap ClassLoader（启动类加载器）  ← rt.jar / java.*
        ↑
Extension ClassLoader（扩展类加载器）  ← jre/lib/ext/
        ↑
Application ClassLoader（应用类加载器）← classpath
        ↑
Custom ClassLoader（自定义加载器）

加载流程：
1. 收到加载请求 → 先检查是否加载过
2. 没加载过 → 委派给父加载器
3. 父加载器也委派它的父 → 直到 Bootstrap
4. Bootstrap 加载不了 → 交给子加载器尝试
5. 都不能加载 → ClassNotFoundException
```

**为什么这样设计？** 核心是**安全**。保证核心类库（如 `java.lang.String`）永远由 Bootstrap 加载，防止有人自定义一个同名类替换 JDK 的核心类。

### 深度扩展

**破坏双亲委派的经典案例**：

1. **JDBC**（SPI 机制）：`java.sql.DriverManager` 由 Bootstrap 加载，但具体的 MySQL Driver 在 classpath 下（AppClassLoader 加载）。Bootstrap 加载的类如何调用子加载器的类？→ **线程上下文类加载器**（Thread Context ClassLoader）。

```java
// JDBC 使用线程上下文类加载器打破双亲委派
ClassLoader callerCL = Thread.currentThread().getContextClassLoader();
// 用子加载器去加载 SPI 实现类
```

2. **Tomcat**：一个 Tomcat 部署多个 Web 应用，每个应用有自己的类加载器，隔离各自的 lib。同时需要共享一些公共库。

3. **OSGi / 模块化**：每个模块有自己的类加载器，模块间可以互相依赖。

**`<clinit>()` vs `<init>()`**：
- `<clinit>()` = 类构造器，由编译器收集所有静态变量赋值 + 静态代码块，类加载时执行一次
- `<init>()` = 实例构造器，由编译器收集实例变量赋值 + 构造代码块 + 构造函数，每次 new 都执行

### 面试追问

**Q**: 两个不同类加载器加载的同一个类，`instanceof` 判断结果是 true 吗？
**A**: 不是。JVM 认为"同一个类 = 相同的全限定名 + 相同的类加载器"。不同类加载器加载的同一个 .class 文件，JVM 认为是两个不同的类。

### 常见错误

- ❌ 把"准备"阶段的赋零值和"初始化"阶段的真正赋值搞混
- ❌ 以为双亲委派是"父亲先加载，加载不了才自己来"——确实是这样，但需要说明为什么（安全 + 避免重复加载）

### 一句话总结

> **加载→验证→准备→解析→初始化。双亲委派的核心是安全——核心类只能由 Bootstrap 加载，防止被篡改。**

---

## Q3: GC 算法与垃圾回收器 ⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: 垃圾回收算法、CMS/G1/ZGC 特点与适用场景

> 面试官问："Java 有哪些垃圾回收算法？CMS、G1、ZGC 分别有什么特点、适用什么场景？"

### 核心回答

**基础 GC 算法**：

| 算法 | 原理 | 优点 | 缺点 |
|------|------|------|------|
| **标记-清除** | 标记存活对象 → 清除未标记的 | 简单 | 内存碎片化 |
| **标记-复制** | 内存分两块 → 复制存活到另一块 → 整块清空 | 无碎片、速度快 | 浪费一半内存 |
| **标记-整理** | 标记存活 → 将所有存活向一端移动 | 无碎片、不浪费内存 | 移动成本高（STW） |

**三大主流回收器对比**：

| 维度 | CMS | G1 | ZGC |
|------|-----|----|-----|
| **目标** | 低停顿（老年代） | 可控停顿 + 高吞吐 | 超低停顿（<1ms） |
| **STW 时间** | 几十~几百 ms | 可设目标（默认 200ms） | <1ms（JDK 21 支持分代） |
| **内存布局** | 连续分代 | 分 Region（逻辑分代） | 分 Region（染色指针） |
| **碎片问题** | 有（标记-清除） | 无（标记-复制/整理） | 无 |
| **适用堆大小** | 4-8G | 4G-32G | 16G-16T |
| **JDK 版本** | JDK 9 废弃，14 移除 | JDK 9 默认 | JDK 11 实验，15 生产可用 |

**分代收集 → 分区收集的演进**：
- **CMS**：年轻代用 ParNew（复制），老年代用 CMS（标记-清除），分代固定
- **G1**：内存划分为多个 Region，每个 Region 可以是 Eden/Survivor/Old/Humongous，逻辑分代
- **ZGC**：不分代（JDK 21 前），全堆并发标记-整理，通过染色指针 + 读屏障实现并发重映射

### 深度扩展

**CMS 的 GC 流程（7 步，重点 4 步）**：

```
① 初始标记（STW，极短）：标记 GC Roots 直接引用的对象
② 并发标记：从 GC Roots 出发，并发遍历对象图
③ 并发预清理：处理并发标记期间的变化
④ 重新标记（STW，较长）：修正并发标记期间的变动
⑤ 并发清除：清除未标记对象
⑥ 并发重置：重置 CMS 内部状态
```

**CMS 的三大问题**：
1. **并发失败（Concurrent Mode Failure）**：并发清理期间老年代满了→退化为 Serial Old 单线程整理→长时间 STW
2. **浮动垃圾（Floating Garbage）**：并发标记期间新产生的垃圾本轮无法回收
3. **内存碎片**：标记-清除算法的本质问题，碎片多时可能提前触发 Full GC

**G1 的 Mixed GC 与 Remembered Set**：
G1 除了 Young GC 和 Full GC，还有 Mixed GC（同时回收年轻代 + 部分老年代 Region）。通过 **Remembered Set (RSet)** 记录"谁引用了我"，避免了全堆扫描。

**ZGC 染色指针技术（Colored Pointers）**：
在 64 位指针中嵌入 GC 状态标记（Marked0/Marked1/Remapped/Finalizable），不需要额外内存。通过**读屏障**在读取对象时检查指针颜色，若不一致则自动修正——实现了并发重映射。

### 面试追问

**Q**: G1 的 `-XX:MaxGCPauseMillis` 设得越小越好吗？
**A**: 不是。设得太小会导致每次回收的 Region 太少，赶不上分配速度，最终退化为 Full GC，性能反而更差。

### 常见错误

- ❌ 口头禅"CMS 已经不用了"——很多老系统 JDK 8 + CMS 还在跑
- ❌ ZGC 不分代=不优秀——分代是优化手段不是目的，ZGC 用染色指针解决了这个问题

### 一句话总结

> **标记-清除/复制/整理是基础；CMS = 低停顿（碎片问题）；G1 = 可控停顿（Region 化）；ZGC = 超低停顿（染色指针）。堆越大越选后面的。**

---

## Q4: 对象创建完整过程 ⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: 对象内存分配、TLAB、对象头

> 面试官问："`new Object()` 的时候，JVM 内部发生了什么？"

### 核心回答

```
① 类加载检查：常量池中是否有该类的符号引用 → 该类是否已加载/解析/初始化
     ↓
② 分配内存：在堆中为新对象分配空间
    ├── 指针碰撞（Bump the Pointer）：堆内存规整时（Serial, ParNew），移动指针
    └── 空闲列表（Free List）：堆内存不规整时（CMS），从列表分配
    并发安全：CAS + 失败重试，或 TLAB（本地线程分配缓冲）
     ↓
③ 初始化零值：所有实例字段赋默认值（int=0, boolean=false, reference=null）
     ↓
④ 设置对象头：Mark Word（hashCode、GC 分代年龄、锁状态）
                + 类型指针（指向方法区的类元信息）
     ↓
⑤ 执行 <init>()：构造方法 + 实例初始化块，按代码中的值赋给字段
```

### 深度扩展

**TLAB（Thread Local Allocation Buffer）**：
每个线程在 Eden 区有一小块专属内存。分配对象时优先在 TLAB 内分配（无锁），TLAB 不够了才去 Eden 公共区域 CAS 分配。这是 JVM 默认启用的优化。

```bash
# TLAB 相关参数
-XX:+UseTLAB           # 启用 TLAB（默认开启）
-XX:TLABSize=          # TLAB 大小
-XX:+PrintTLAB         # 打印 TLAB 使用情况
```

**对象头的 Mark Word（64 位）**：

```
|----------------------------------------------------------|
| 锁状态         | 存储内容                                   |
|----------------------------------------------------------|
| 无锁           | hashCode(31) + 分代年龄(4) + 偏向锁标记(1) |
| 偏向锁         | 线程ID(54) + Epoch(2) + 分代年龄(4) + ...  |
| 轻量级锁       | 指向栈中锁记录的指针(62)                      |
| 重量级锁       | 指向互斥量的指针(62)                           |
| GC 标记        | 空                                          |
|----------------------------------------------------------|
```

### 面试追问

**Q**: 对象的内存布局是怎样的？
**A**: 对象头（Mark Word + 类型指针）+ 实例数据 + 对齐填充（确保 8 字节对齐）。

**Q**: 数组对象和普通对象的对象头有什么区别？
**A**: 数组对象头多一个 4 字节的数组长度字段。

### 常见错误

- ❌ 把赋值过程说反——零值初始化在 `<init>` 之前
- ❌ 漏掉 TLAB 或其他内存分配优化——面试官想听的就是这些细节

### 一句话总结

> **类检查 → TLAB/CAS 分配 → 零值初始化 → 设对象头 → 构造函数。TLAB 是无锁分配的关键优化。**

---

## Q5: Minor GC / Major GC / Full GC 触发条件 ⭐️⭐️

**难度:** ⭐️⭐️ | **考察点**: GC 触发时机、分代回收

> 面试官问："Minor GC 什么时候触发？Full GC 呢？它们各有什么特点？"

### 核心回答

| GC 类型 | 回收区域 | 触发条件 | 特点 |
|---------|---------|---------|------|
| **Minor GC** | 年轻代 | Eden 区满 | 频繁、速度快、STW 短 |
| **Major GC** | 老年代 | 通常伴随 Full GC，CMS 可单独触发 | 比 Minor GC 慢 10 倍以上 |
| **Full GC** | 整个堆 + 元空间 | 多种条件触发 | 最慢，应尽量避免 |

**Full GC 的触发条件**：

```bash
# 1. 老年代空间不足（最常见）
#    新建大对象直接进老年代但老年代放不下
#    Minor GC 后存活对象太多，老年代放不下（" promotion failed"）

# 2. 元空间不足
#    加载的类太多或动态生成大量类（CGLIB、动态代理）

# 3. System.gc() 显示调用
#    默认会触发 Full GC（可用 -XX:+DisableExplicitGC 禁用）

# 4. CMS/G1 并发失败
#    CMS: Concurrent Mode Failure
#    G1:  Evacuation Failure

# 5. 空间分配担保失败
#    Minor GC 前检查老年代最大可用连续空间是否大于新生代所有对象总大小
```

### 深度扩展

**空间分配担保机制**：

```java
// 新生代使用标记-复制算法，需要一块 Survivor 来存放存活对象
// 如果 Survivor 放不下 → 需要老年代做"担保"
// JVM 在 Minor GC 前会检查：
// - 老年代最大连续可用空间 > 新生代所有对象大小？
//   - 是 → 安全，直接 Minor GC
//   - 否 → 检查是否允许担保失败
//     - 允许 → 检查老年代是否 > 历次晋升老年代的平均大小
//       - 是 → 冒险 Minor GC（可能 promotion failed → Full GC）
//       - 否 → 直接 Full GC
```

**Full GC 的危害**：
- 长时间 STW（几秒到几十秒）
- 服务表现为无响应、超时、健康检查失败
- 可能导致连锁反应（其他节点也 Full GC → 雪崩）

### 面试追问

**Q**: 线上系统频繁 Full GC，怎么排查？
**A**: `jstat -gcutil <pid> 1000` 观察 GC 频率和耗时 → `jmap -histo <pid>` 看哪些对象占内存多 → 分析堆 dump（`jmap -dump`）→ 针对性修改代码或调参。

### 常见错误

- ❌ 把 Major GC 和 Full GC 混为一谈——Major GC 通常指老年代 GC，可能是 Full GC 的一部分
- ❌ 以为调用 `System.gc()` 会立刻触发 GC——只是**建议**，JVM 可能忽略

### 一句话总结

> **Minor GC = Eden 满了（频繁但快），Full GC = 老年代/元空间不够了（慢且危险，应避免）。**

---

## Q6: OOM 排查思路与工具 ⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: 内存溢出排查、jmap/jstat/MAT 使用

> 面试官问："线上 Java 应用 OOM 了，你会怎么排查？用过哪些工具？"

### 核心回答

**排查流程**：

```
① 保留现场：-XX:+HeapDumpOnOutOfMemoryError 自动 dump
            或 kill -3 <pid> 获取 thread dump

② 快速恢复：先重启服务（如果 dump 已拿到），恢复线上可用

③ 分析 dump：
   jmap -dump:format=b,file=heap.hprof <pid>
   用 MAT / JProfiler / VisualVM 打开分析

④ 定位问题：
   - 看 Dominator Tree → 谁占最多内存
   - 看 Leak Suspects → 自动分析可疑泄漏点
   - 看 GC Roots 引用链 → 为什么没被回收

⑤ 根因分类 → 针对解决
```

**OOM 常见类型与原因**：

| 错误信息 | 常见原因 |
|----------|---------|
| `java.lang.OutOfMemoryError: Java heap space` | 堆内存不够（大对象、集合无限增长） |
| `java.lang.OutOfMemoryError: GC overhead limit exceeded` | 98% 时间在 GC 却只回收了 <2% 的堆 |
| `java.lang.OutOfMemoryError: Metaspace` | 加载了太多类（动态代理、CGLIB） |
| `java.lang.OutOfMemoryError: unable to create new native thread` | 线程数超过 OS 限制 |
| `java.lang.OutOfMemoryError: Direct buffer memory` | NIO 直接内存未释放 |

### 深度扩展

**常用监控与排查工具**：

```bash
# 1. jps —— 查看 Java 进程 PID
jps -l

# 2. jstat —— 实时 GC 监控
jstat -gcutil <pid> 1000    # 每秒打印 GC 情况
jstat -gc <pid> 1000        # 详细内存使用

# 3. jmap —— 堆内存分析
jmap -heap <pid>            # 堆配置和使用情况
jmap -histo:live <pid>      # 存活对象统计（触发 Full GC 后）
jmap -dump:format=b,file=heap.hprof <pid>

# 4. jstack —— 线程分析
jstack <pid>                # 线程快照
jstack -l <pid>             # 含锁信息

# 5. 在线 Arthas（阿里巴巴开源）
dashboard                   # 实时面板
thread -b                   # 检测死锁
heapdump /tmp/dump.hprof    # heap dump
```

**MAT（Memory Analyzer Tool）分析技巧**：
- **Histogram**：按类统计对象数量和内存占用，快速锁定可疑类
- **Dominator Tree**：支配树——如果 X 支配 Y，意味着 GC Roots 到 Y 的所有路径都经过 X。找到最大的支配者
- **Path to GC Roots**：右键某个对象 → 查看 GC Roots 引用链，分析为什么没被回收
- **OQL**：类似 SQL 的对象查询语言，筛选特定对象

### 面试追问

**Q**: `GC overhead limit exceeded` 和 `Java heap space` 有什么区别？
**A**: 前者表示 GC 占了 98% 时间但只回收了 <2% 内存——几乎是无用功，属于"提前放弃"的机制。后者是真正耗尽了所有可用堆空间。

### 常见错误

- ❌ OOM 后没有保留 dump 就重启——dump 是定位问题的唯一线索，务必通过 JVM 参数自动保留
- ❌ 只会用 `jmap -histo`，不知道用 MAT 做 Dominator Tree 分析

### 一句话总结

> **JVM 参数先保 dump → 重启恢复 → MAT 分析 Dominator Tree → 追溯 GC Roots → 根因修复。**

---

## Q7: 强引用、软引用、弱引用、虚引用的区别 ⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: 引用类型、GC、内存敏感缓存

> 面试官问："Java 的四种引用类型分别是什么？各自在什么场景下使用？"

### 核心回答

| 引用类型 | GC 回收策略 | 使用场景 |
|----------|------------|---------|
| **强引用** | 永不回收（GC Root 可达） | 普通的 `Object obj = new Object()` |
| **软引用** | 内存不足时回收 | 内存敏感缓存（如图片缓存） |
| **弱引用** | 下一次 GC 必定回收 | `WeakHashMap`、ThreadLocal 中的 `Entry.key` |
| **虚引用** | 任何时候都可能被回收，**get() 永远返回 null** | 管理堆外内存（NIO DirectByteBuffer） |

```java
// 软引用示例
SoftReference<byte[]> cache = new SoftReference<>(new byte[100 * 1024 * 1024]);
byte[] data = cache.get();
if (data == null) {
    // 已被回收，重新加载
    data = loadFromDisk();
    cache = new SoftReference<>(data);
}

// 弱引用示例
WeakReference<Object> weakRef = new WeakReference<>(new Object());
System.gc();  // 触发 GC
weakRef.get(); // → null（已被回收）

// 虚引用示例：必须配合 ReferenceQueue 使用
ReferenceQueue<Object> queue = new ReferenceQueue<>();
PhantomReference<Object> phantom = new PhantomReference<>(new Object(), queue);
phantom.get(); // 永远返回 null
// 对象被回收时，虚引用会入队 → 通知清理堆外资源
```

### 深度扩展

**ThreadLocal 为什么用弱引用？**

```java
// ThreadLocal.ThreadLocalMap.Entry
static class Entry extends WeakReference<ThreadLocal<?>> {
    Object value;
    Entry(ThreadLocal<?> k, Object v) {
        super(k);  // key 是弱引用
        this.value = v;
    }
}

// 如果 key 是强引用，即使 ThreadLocal 外部无人引用，
// Entry 仍然持有 → ThreadLocal 永远无法被回收
// 弱引用允许 key 在 GC 时被回收，防止 ThreadLocal 内存泄漏
// 但 value 仍有泄漏风险 → ThreadLocal 必须调用 remove()
```

**NIO DirectByteBuffer 与虚引用**：
`DirectByteBuffer` 通过虚引用（`Cleaner`）来管理堆外内存。当 DirectByteBuffer 对象被 GC 时，虚引用入队 → Cleaner 线程调用 `Unsafe.freeMemory()` 释放堆外内存。这就是堆外内存"自动释放"的机制。

### 面试追问

**Q**: 软引用和弱引用有什么区别？
**A**: 软引用只在**内存不足**时回收，弱引用**下一次 GC 必定回收**。软引用适合做缓存（尽量保留），弱引用适合做"标记"（尽快释放）。

### 常见错误

- ❌ 以为 `WeakReference.get()` 返回 null 就没事了——需要配合 ReferenceQueue 做清理工作
- ❌ 不知道 ThreadLocal key 是弱引用，答不出 ThreadLocal 内存泄漏的根本原因

### 一句话总结

> **强 = 打死不回收，软 = 内存紧才回收，弱 = GC 就回收，虚 = 已死只留通知。**

---

## Q8: JIT 编译与逃逸分析 ⭐️

**难度**: ⭐️ | **考察点**: 热点代码编译、栈上分配、锁消除

> 面试官问："JIT 编译是什么？逃逸分析做了哪些优化？"

### 核心回答

**JIT（Just-In-Time）编译**：Java 是"编译 + 解释"混合执行的。热点代码（频繁执行的方法/循环）被 JIT 编译器编译为**本地机器码**，之后直接执行机器码而不再解释执行，大幅提升性能。

**热点探测（HotSpot 名称的由来）**：
- 方法调用计数器：方法被调用超过阈值（Client: 1500 次, Server: 10000 次）
- 回边计数器：循环执行次数超过阈值
- 满足条件 → 提交编译任务 → 编译成本地代码 → 替换方法入口

**逃逸分析的三大优化**：

```java
// 1. 栈上分配 —— 对象不逃逸，在栈上分配（随栈帧销毁，不触发 GC）
public long sum() {
    Point p = new Point(1, 2);  // 未逃逸 → 栈上分配
    return p.x + p.y;
}

// 2. 标量替换 —— 对象打散为基本类型
public long sum() {
    int x = 1;  // 标量替换后直接拆成字段
    int y = 2;
    return x + y;
}

// 3. 同步消除 —— 不逃逸的对象的锁操作被消除
public String concat() {
    StringBuffer sb = new StringBuffer();  // 线程私有，锁无意义
    sb.append("a").append("b");  // 锁被消除！
    return sb.toString();
}
```

### 深度扩展

**C1 vs C2 编译器**：
- **C1（Client Compiler）**：编译快、优化少，适合 GUI 等对启动时间敏感的场景
- **C2（Server Compiler）**：编译慢、优化深，适合长期运行的服务端应用

**分层编译（Tiered Compilation，JDK 7+ 默认）**：
```
L0: 解释执行
L1: C1 编译，不收集 profiling 数据
L2: C1 编译，收集 profiling 数据（少量）
L3: C1 编译，收集 profiling 数据（完整）→ 用于 C2 优化决策
L4: C2 编译（基于 profiling 数据做激进优化）
```

### 面试追问

**Q**: 逃逸分析的优化一定要用 `-XX:+DoEscapeAnalysis` 手动开吗？
**A**: JDK 6u23 后默认开启（配合 `-XX:+EliminateAllocations` 和 `-XX:+EliminateLocks`）。

### 常见错误

- ❌ "Java 是纯解释型语言"——Java 是混合模式（解释 + JIT），这也是 HotSpot 这个名字的由来
- ❌ 逃逸分析的结果可以在运行期"反优化"（deoptimization）——如果发现之前的逃逸分析假设不成立，会退回解释执行

### 一句话总结

> **热点代码 JIT 编译为本地机器码大幅提速；逃逸分析 = 栈上分配 + 标量替换 + 锁消除。**

---

## 参考阅读

- [JVM 内存模型](../jvm/memory.md)
- [GC 与垃圾回收器](../jvm/gc.md)
- [类加载机制](../jvm/classloader.md)
- [JVM 调优实战](../jvm/tuning.md)
