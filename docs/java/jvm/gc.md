---
title: 垃圾回收
icon: broom
order: 2
category:
  - Java
  - JVM
tag:
  - GC
  - 垃圾回收
  - 可达性分析
  - CMS
  - G1
  - ZGC
  - 三色标记
  - 引用类型
---

# 垃圾回收：从标记-清除到 ZGC

> 📖 垃圾回收（Garbage Collection）是 JVM 区别於 C/C++ 的核心特征之一——开发者不必手动 `free` 内存，JVM 自动判定哪些对象已死、哪些该留下。但这不意味着 GC 就完全不需要理解：从判断对象存活的两种算法（引用计数 vs 可达性分析），到四种引用类型（强/软/弱/虚）的实际用途，从三种基础回收算法（标记-清除/复制/整理）到 CMS 的七个阶段与三个致命缺陷，再到 G1 的 Region 布局和 ZGC 的染色指针——理解 GC 是性能调优的基石。

---

## 一、什么是垃圾？

GC 要解决的核心问题只有两个：**哪些对象需要回收？什么时候回收？怎么回收？**

```java
public class GarbageDemo {
    public static void main(String[] args) {
        Object a = new Object();  // a 指向对象1
        Object b = new Object();  // b 指向对象2

        a = b;   // 对象1 不再被任何引用指向 → 垃圾
        b = null;// 对象2 仍被 a 指向 → 不是垃圾
        // 对象1 已经不可达，GC 可以回收它
    }
}
```

### 1.1 引用计数法（Reference Counting）

在每个对象上维护一个计数器，被引用时 +1，引用失效时 -1，计数器归零即为垃圾。

```
原理示意：
  Object objA = new Object();  // objA 引用计数 = 1
  Object objB = objA;          // objA 引用计数 = 2
  objA = null;                 // objA 引用计数 = 1
  objB = null;                 // objA 引用计数 = 0 → 可回收
```

```java
// ❌ 引用计数法的致命缺陷——循环引用
class Node {
    Node next;
}

Node a = new Node();
Node b = new Node();
a.next = b;
b.next = a;
a = null;
b = null;
// a 和 b 互相引用，计数永远 = 1，永远无法回收！
// 但实际上 a 和 b 已经不可达 → 内存泄漏
```

> ⭐️ **结论**：引用计数法原理简单，但无法解决循环引用。Python 用引用计数 + 标记清除来弥补，而 **Java 完全不使用引用计数法**，而是用可达性分析。

### 1.2 可达性分析（Reachability Analysis）

从一系列 **GC Roots** 出发，沿着引用链向下搜索，搜索走过的路径叫**引用链（Reference Chain）**；不在任何引用链上的对象就是垃圾。

```
可达性分析示意：

  GC Roots
  ┌─────────┐    ┌─────────┐    ┌─────────┐
  │ 栈引用    │    │ 静态变量  │    │ JNI引用  │
  └────┬────┘    └────┬────┘    └────┬────┘
       │              │              │
       ▼              ▼              ▼
  ┌─────────┐   ┌─────────┐   ┌─────────┐
  │ 对象 A   │──▶│ 对象 B   │──▶│ 对象 C   │   ← 可达（存活）
  └─────────┘   └─────────┘   └─────────┘
                                    │
  ┌─────────┐   ┌─────────┐        │  ← 不可达（垃圾！）
  │ 对象 D   │◀──│ 对象 E   │        │
  └─────────┘   └─────────┘        │
       循环引用，但从 GC Roots 出发      │
       无法到达 → 同样是垃圾！          │
```

---

## 二、GC Roots —— 谁是"根"？

GC Roots 是可达性分析的起点集合。在 HotSpot 中，GC Roots 主要包括：

```
┌─────────────────────────────────────────────────────┐
│                    GC Roots 全集                      │
├─────────────────────────────────────────────────────┤
│ 1. 虚拟机栈（栈帧中的局部变量表）引用的对象                │
│    → 正在执行的方法中的局部变量、参数                    │
│                                                      │
│ 2. 方法区中静态属性引用的对象                            │
│    → static 字段引用的对象                             │
│                                                      │
│ 3. 方法区中常量引用的对象                                │
│    → 字符串常量池中的引用                               │
│                                                      │
│ 4. 本地方法栈中 JNI 引用的对象                           │
│    → native 方法中的全局引用                           │
│                                                      │
│ 5. Java 虚拟机内部的引用                                │
│    → 基本数据类型对应的 Class 对象                      │
│    → 常驻异常对象（如 NullPointerException）           │
│    → 系统类加载器                                      │
│                                                      │
│ 6. 所有被同步锁（synchronized）持有的对象                 │
│    → 正在被用作锁的对象                                │
│                                                      │
│ 7. 反映 Java 虚拟机内部情况的 JMXBean                   │
│    → 注册到 JMX 的回调、JVMTI 的回调等                   │
└─────────────────────────────────────────────────────┘
```

```java
public class GCRootsDemo {
    private static Object staticObj = new Object();   // GC Root（静态变量）

    public void method() {
        Object localObj = new Object();                // GC Root（栈引用，方法执行期间）
        Thread t = new Thread(() -> {
            Object threadLocal = new Object();         // GC Root（活跃线程的栈帧）
        });
        t.start();
    }
    // 方法结束后，localObj 不再是 GC Root → 可以被回收
}
```

---

## 三、四种引用类型 —— 与 GC 的协作

Java 的引用不仅仅是"指向对象"那么简单——JDK 1.2 起引入四种引用类型，给开发者提供了与 GC 交互的接口：

```
引用强度： 强引用 > 软引用 > 弱引用 > 虚引用
        （越往右越容易被回收）
```

### 3.1 强引用（Strong Reference）

最普通的引用——只要强引用还在，GC 就**永远不会**回收它。

```java
Object obj = new Object();  // 强引用
obj = null;                 // 取消强引用 → GC 才可以回收
```

### 3.2 软引用（Soft Reference）

描述有用但非必需的对象。**内存不够时**，GC 会回收软引用指向的对象。

```java
// 创建软引用
SoftReference<byte[]> softRef = new SoftReference<>(new byte[10 * 1024 * 1024]); // 10MB

byte[] data = softRef.get();  // 获取对象（可能已经为 null）
if (data == null) {
    // 已被回收 → 重新创建
    data = new byte[10 * 1024 * 1024];
    softRef = new SoftReference<>(data);
}

// ⭐️ 经典用途：缓存
// 内存充足时从软引用缓存读取，内存紧张时自动释放
public class ImageCache {
    private Map<String, SoftReference<BufferedImage>> cache = new HashMap<>();

    public BufferedImage get(String key) {
        SoftReference<BufferedImage> ref = cache.get(key);
        if (ref != null) {
            BufferedImage img = ref.get();
            if (img != null) return img;  // 缓存命中
        }
        // 缓存未命中或被回收 → 重新加载
        BufferedImage img = loadImage(key);
        cache.put(key, new SoftReference<>(img));
        return img;
    }
}
```

### 3.3 弱引用（Weak Reference）

描述非必需的对象，但比软引用更弱——**GC 线程发现弱引用就会回收**，不管内存够不够。

```java
WeakReference<Object> weakRef = new WeakReference<>(new Object());

System.out.println(weakRef.get());  // 非 null
System.gc();                        // 触发 GC
System.out.println(weakRef.get());  // null ← 被回收了！

// ⭐️ 经典用途1：WeakHashMap
// key 被外部强引用置空后，GC 回收 key → WeakHashMap 自动删除 Entry
WeakHashMap<Object, String> map = new WeakHashMap<>();
Object key = new Object();
map.put(key, "value");
System.out.println(map.size());  // 1
key = null;
System.gc();                      // GC 回收 key
System.out.println(map.size());  // 0 ← Entry 被自动清除了！

// ⭐️ 经典用途2：ThreadLocal 的 Entry
// ThreadLocalMap 的 Entry 继承 WeakReference<ThreadLocal<?>>
// 防止 ThreadLocal 对象被外部置 null 后，ThreadLocalMap 的引用阻止 GC
```

### 3.4 虚引用（Phantom Reference）

最弱的一种引用——**无法通过 `get()` 获取对象**（永远返回 null），唯一用途是**在对象被回收时收到一个系统通知**。

```java
ReferenceQueue<Object> queue = new ReferenceQueue<>();
PhantomReference<Object> phantomRef = new PhantomReference<>(new Object(), queue);

System.out.println(phantomRef.get());  // 永远是 null！

// ⭐️ 经典用途：管理直接内存的释放
// NIO 的 DirectByteBuffer 使用虚引用追踪直接内存
// 当 DirectByteBuffer 对象被 GC → 虚引用被加入 ReferenceQueue
// → 后台线程从 queue 取出 → 调用 Unsafe.freeMemory() 释放直接内存

// 简化原理：
// class Cleaner extends PhantomReference<Object> {
//     public void clean() {
//         // 从 ReferenceQueue 取出后调用
//         Unsafe.freeMemory(address);  // 释放直接内存
//     }
// }
```

### 3.5 四种引用总结

| 引用类型 | 回收时机 | get() 返回值 | 典型用途 |
|---------|------|:---:|------|
| **强引用** | 永不回收（除非不可达） | 指向的对象 | 99% 的日常引用 |
| **软引用** | 内存不足时 | 对象/null | 内存敏感的缓存 |
| **弱引用** | 下次 GC 发现时 | 对象/null | WeakHashMap、ThreadLocal |
| **虚引用** | 任何时候都可能 | **始终 null** | 直接内存回收（NIO） |

---

## 四、三种基础回收算法

### 4.1 标记-清除（Mark-Sweep）

最基础的 GC 算法，也是最古老的——分两步：先标记出所有存活对象，再统一清除未标记的对象。

```
标记-清除过程：

  回收前：                    标记阶段：               清除阶段：
  ┌─┬─┬─┬─┬─┬─┐           ┌─┬─┬─┬─┬─┬─┐           ┌─┬───┬───┬─┬───┐
  │A│B│C│D│E│F│    ──▶    │A│B│C│D│E│F│    ──▶    │A│   │   │D│   │
  └─┴─┴─┴─┴─┴─┘           └─┴─┴─┴─┴─┴─┘           └─┴───┴───┴─┴───┘
      存活:A,D              存活:A,D(标记)             存活:A,D
      垃圾:B,C,E,F           垃圾:B,C,E,F(未标记)       垃圾已清除(产生碎片)
```

**优点**：简单、不需要移动对象。

**致命缺陷**：
1. **执行效率不稳定**：标记和清除都随对象数量增长
2. **内存碎片化**：清除后留下不连续的空闲空间，大对象可能无法分配

```
碎片化问题示意：
  ┌──┬──┬──┬──┬──┬──┬──┬──┐
  │A │  │  │D │  │  │G │  │    ← 空闲总空间 = 5格
  └──┴──┴──┴──┴──┴──┴──┴──┘    但最大的连续空隙 = 2格
                                  如果要分配 3 格的对象 → 又触发 GC！
```

### 4.2 标记-复制（Mark-Copy）

**新生代的主力算法**。将内存分为两块，每次只用一块；回收时把存活对象复制到另一块，然后清空当前块。

```
标记-复制过程（以 Eden + Survivor 为例）：

  GC 前：                    GC 后：
  ┌──────────────────┐     ┌──────────────────┐
  │ Eden (满)          │     │ Eden (空)          │
  │ [A][B][C][D][E]   │     │ [新对象分配中...]    │
  └──────────────────┘     └──────────────────┘
  ┌──────────────────┐     ┌──────────────────┐
  │ S0 (From)         │     │ S0 (空)            │
  │ [F][G]            │     │ ← 清空了            │
  └──────────────────┘     └──────────────────┘
  ┌──────────────────┐     ┌──────────────────┐
  │ S1 (To)           │     │ S1 (To → From)     │
  │ (空)              │     │ [A][C][F]   ← 存活  │
  └──────────────────┘     └──────────────────┘
       存活对象: A, C, F → 复制到 S1 → Eden + S0 清空 → S1 变成 From，S0 变成 To
```

**优点**：无碎片、分配只需指针碰撞、极其高效。

**缺点**：浪费一半空间；对象存活率高时复制开销大。

> 🎯 这就是为什么新生代用复制算法：新生代 98% 的对象朝生夕死，每次只有少数存活→复制开销极小；而老年代则不用复制，因为存活率高→复制代价太大。

### 4.3 标记-整理（Mark-Compact）

**老年代的主力算法**。先标记存活对象，然后让所有存活对象向一端移动，最后直接清理边界外的内存。

```
标记-整理过程：

  回收前：                    标记：                  整理后：
  ┌─┬─┬─┬─┬─┬─┐           ┌─┬─┬─┬─┬─┬─┐           ┌─┬─┬───────────┐
  │A│B│C│D│E│F│    ──▶    │A│B│C│D│E│F│    ──▶    │A│D│           │
  └─┴─┴─┴─┴─┴─┘           └─┴─┴─┴─┴─┴─┘           └─┴─┴───────────┘
      存活:A,D              存活:A,D(标记)           存活:A,D(紧凑排列)
      垃圾:B,C,E,F                                      边界外的全清除
```

| 算法 | 碎片 | 吞吐量 | 内存利用率 | 适用场景 |
|------|:---:|:---:|:---:|------|
| 标记-清除 | ❌ 有碎片 | 中 | 高 | 老年代（CMS 的基础） |
| 标记-复制 | ✅ 无碎片 | 高 | **50%**（浪费一半） | **新生代** |
| 标记-整理 | ✅ 无碎片 | 低（移动成本） | 高 | 老年代（Serial/Parallel Old） |

---

## 五、分代收集理论

### 5.1 分代假说

三个核心假说支撑了分代收集的设计：

```
假说 1：弱分代假说（Weak Generational Hypothesis）
  → 绝大多数对象朝生夕死 → 新生代用复制算法，快速回收

假说 2：强分代假说（Strong Generational Hypothesis）
  → 熬过越多次 GC 的对象越难消亡 → 老年代减少回收频次

假说 3：跨代引用假说（Inter-generational Reference Hypothesis）
  → 跨代引用相对于同代引用只是极少数
  → 老年代引用新生代时，新生代 GC 不必扫描整个老年代
  → 用记忆集（Remembered Set）记录"老年代→新生代"的引用
```

### 5.2 三种 GC 类型

```
┌─────────────────────────────────────────────────────────────────┐
│                   HotSpot GC 分类                                 │
├─────────────────────────────────────────────────────────────────┤
│ Minor GC / Young GC                                              │
│   → 只回收新生代                                                  │
│   → 触发条件：Eden 区满                                           │
│   → 频率高、速度快（几十毫秒）                                      │
│   → 整个过程可能 STW                                               │
├─────────────────────────────────────────────────────────────────┤
│ Major GC / Old GC                                                │
│   → 只回收老年代（只有 CMS 会单独回收老年代）                        │
│   → 通常比 Minor GC 慢 10 倍以上                                   │
├─────────────────────────────────────────────────────────────────┤
│ Full GC                                                          │
│   → 回收整个堆（新生代 + 老年代 + 方法区）                           │
│   → 触发条件：老年代满、元空间满、System.gc()、                                        │
│   → STW 时间最长（几秒甚至几十秒）                                  │
└─────────────────────────────────────────────────────────────────┘
```

```java
// GC 触发实验（JDK 17）
// java -Xms20M -Xmx20M -Xmn10M -XX:+PrintGCDetails GCDemo
public class GCDemo {
    private static final int _1MB = 1024 * 1024;

    public static void main(String[] args) {
        byte[] a, b, c, d, e;

        a = new byte[2 * _1MB];
        b = new byte[2 * _1MB];
        c = new byte[2 * _1MB];
        // Eden 区 8M，a+b+c = 6MB

        d = new byte[2 * _1MB];  // Eden 不够 8-6=2 < 2 → Minor GC
        // a,b,c 不可达 → 回收；d 进入 Eden

        e = new byte[3 * _1MB];  // 大对象直接进老年代（老年代空间担保）
    }
}
```

> 🎯 **面试高频**：Full GC 和 Major GC 不是一个概念！Major GC 通常指只回收老年代的 GC（CMS 有），而 Full GC 是整个堆（甚至包括方法区）的大扫除。串行/并行 GC 中，老年代回收其实就是 Full GC。

---

## 六、HotSpot 经典 GC 收集器

### 6.1 收集器全景图

```
新生代收集器：                     老年代收集器：
┌──────────┐  ┌──────────┐        ┌──────────┐  ┌──────────┐  ┌──────────┐
│  Serial  │  │ Parallel │        │Serial Old│  │Parallel  │  │   CMS    │
│          │  │ Scavenge │        │          │  │   Old    │  │          │
└────┬─────┘  └────┬─────┘        └────┬─────┘  └────┬─────┘  └────┬─────┘
     │              │                  │              │              │
     └──────┬───────┘                  └──────┬───────┘              │
            │ 配对使用                        │ 配对使用              │
            ▼                                ▼                      ▼
┌──────────────────────┐        ┌──────────────────────┐
│  Serial + Serial Old │        │ Parallel Scavenge    │  CMS + ParNew
│  -XX:+UseSerialGC    │        │ + Parallel Old       │  (JDK 9 已废弃)
│  单线程 + 单线程      │        │ -XX:+UseParallelGC   │
│  客户端模式默认        │        │ 吞吐量优先（JDK8默认） │
└──────────────────────┘        └──────────────────────┘

                      ┌──────────────────────────────────────────────┐
                      │  G1 (Garbage First)                           │
                      │  -XX:+UseG1GC                                │
                      │  JDK 9+ 默认，Region 化，Mixed GC            │
                      └──────────────────────────────────────────────┘

                      ┌──────────────────────────────────────────────┐
                      │  ZGC / Shenandoah                             │
                      │  超低延迟（< 1ms / < 10ms STW），TB 级堆支持   │
                      └──────────────────────────────────────────────┘
```

### 6.2 Serial / Serial Old —— 最古老的收集器

单线程收集器，GC 期间必须 STW（Stop The World），所有应用线程暂停：

```
Serial 工作示意：

  [应用线程]────────────────▶ 暂停 ──────────────▶ 继续
                               │
  [GC 线程  ]                  └─ 单线程执行 GC ──▶
                               GC 期间只有一条线程在工作
```

适用场景：桌面应用（Client 模式），堆 < 100MB 的小型应用。

### 6.3 Parallel Scavenge / Parallel Old —— 吞吐量优先

JDK 8 的默认收集器。**新生代多条 GC 线程并行**（老年代也是），注重吞吐量：

```
Parallel Scavenge 工作示意：

  [应用线程 1]─────────────▶ 暂停 ──────────▶ 继续
  [应用线程 2]─────────────▶ 暂停 ──────────▶ 继续
                              │
  [GC 线程 1]                 ├─ 并行标记 ──▶
  [GC 线程 2]                 ├─ 并行标记 ──▶
  [GC 线程 3]                 └─ 并行复制 ──▶
                              GC 期间多线程并行工作
```

```bash
# 吞吐量优先配置
-XX:+UseParallelGC              # 新生代 Parallel Scavenge
-XX:+UseParallelOldGC           # 老年代 Parallel Old（JDK 7+ 默认捆绑）
-XX:MaxGCPauseMillis=200        # 最大 GC 暂停目标（ms）
-XX:GCTimeRatio=99              # 吞吐量目标：1/(1+99) = 1% 时间用于 GC
```

> ⭐️ **吞吐量 vs 延迟**：Parallel 追求的是**吞吐量**（GC 时间占比越低越好），而不是**响应时间**（单次 GC 暂停越短越好）。后台批处理选 Parallel，Web 服务选 CMS/G1/ZGC。

### 6.4 CMS（Concurrent Mark Sweep）—— 低延迟先行者

CMS 是老年代收集器的里程碑——它首次实现了"应用线程和 GC 线程大部分时间并发执行"。

#### CMS 的 7 个阶段

```
CMS 的完整执行流程（按时间顺序）：

阶段1：初始标记 (Initial Mark) — STW，极短
  → 只标记 GC Roots 能直接关联到的对象
  → 暂停所有用户线程，但速度很快（通常 < 10ms）

阶段2：并发标记 (Concurrent Mark) — 与应用线程并发
  → 从 GC Roots 出发，遍历整个对象图
  → 最耗时的阶段，但与用户线程并发执行

阶段3：并发预清理 (Concurrent Preclean) — 与应用线程并发
  → 处理并发标记阶段因用户线程运行而变化的引用
  → 为 Remark 阶段减轻负担

阶段4：可中断的并发预清理 (Concurrent Abortable Preclean)
  → 等待到一定条件再进入 Remark（如 Eden 使用率达到阈值）
  → 减少 Remark 的工作量

阶段5：重新标记 (Remark) — STW，较长
  → 修正并发标记期间用户线程产生的变动的标记
  → 三色标记法中的 SATB(原始快照) 在这里发挥作用
  → 比初始标记长得多，但远比并发标记短

阶段6：并发清除 (Concurrent Sweep) — 与应用线程并发
  → 清除所有未标记的对象（标记-清除算法）
  → 与应用线程并发执行

阶段7：并发重置 (Concurrent Reset) — 与应用线程并发
  → 重置 CMS 内部数据结构，准备下一轮收集
```

```
CMS 各阶段时间线：

  ─初始标记─┬──────并发标记──────┬─并发预清理─┬─重新标记─┬───并发清除───┬─重置─
   (STW)    │   (并发, 与应用线程)  │  (并发)    │  (STW)   │  (并发)     │(并发)
   ~10ms    │                    │           │  ~100ms   │             │
            │←────────── 全过程只有两次短暂的 STW ──────────→│
```

#### CMS 的三个致命问题

```java
// 问题 1：CPU 资源敏感
// 并发标记和并发清除阶段，CMS 线程占用 CPU 核心
// 默认回收线程数 = (CPU 核数 + 3) / 4
// 4 核机器 → 占用 (4+3)/4 ≈ 1 个核 → 应用吞吐量下降 25%

// 问题 2：浮动垃圾（Floating Garbage）
// 并发标记和并发清除期间，用户线程继续运行 → 产生新垃圾
// 这些"浮动垃圾"本次 GC 无法回收 → 只能等下一次 GC
// 解决方案：不能等老年代 100% 满了再触发 GC
//   -XX:CMSInitiatingOccupancyFraction=70  ← 老年代占用 70% 就触发 CMS
// 如果预留空间不够：并发收集失败 → 降级为 Serial Old（STW 漫长！）

// 问题 3：碎片化（Fragmentation）
// CMS 使用标记-清除算法 → 产生内存碎片
// 碎片到一定程度 → 无法分配大对象 → 触发 Full GC（Serial Old 整理）
// 缓解措施（JDK 9 已废弃 CMS）：
//   -XX:+UseCMSCompactAtFullCollection     → Full GC 时做碎片整理
//   -XX:CMSFullGCsBeforeCompaction=0       → 每次 Full GC 都整理
```

> 🎯 **CMS 的历史地位**：CMS 是 GC 技术的里程碑——它证明了"大部分 GC 工作可以和应用线程并发执行"。但它已被 JDK 9 标记为废弃、JDK 14 正式移除。**CMS 的思想在 G1 中得到了延续和升级**。

### 6.5 G1（Garbage First）—— JDK 9+ 默认收集器

G1 不再按新生代/老年代划分连续内存，而是把堆划分为大小相等的 **Region**：

```
G1 堆布局（Region 化）：

┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
│ E │ E │ S │ E │ O │ E │ H │ S │ E │ O │ E │ E │   E=Eden
├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤   S=Survivor
│ F │ E │ O │ E │ E │ O │ F │ E │ O │ E │ S │ E │   O=Old
├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤   H=Humongous
│ E │ O │ E │ F │ E │ O │ E │ O │ E │ E │ O │ E │   F=Free
└───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘

每个 Region 大小：1MB~32MB（通过 -XX:G1HeapRegionSize 设定）
堆 = N × Region，各 Region 的角色可以动态切换
```

**G1 的核心概念**：

```
1. Region：堆被划分为大小相等的区域，每个 Region 可以在不同时间扮演不同角色

2. 巨型对象（Humongous Object）：
   - 超过 Region 大小一半的对象 = 巨型对象
   - 独占若干个连续的 Region
   - 直接在老年代分配，回收时特殊处理

3. 记忆集（Remembered Set / RSet）：
   - 记录"其他 Region → 当前 Region"的引用
   - 每个 Region 有自己的 RSet
   - Minor GC 时不用扫描整个老年代 → 只扫描 RSet 记录的 Region

4. 卡表（Card Table）：
   - RSet 的底层实现单元
   - 堆空间被划分为 512 字节的"卡"（Card）
   - 引用变化时，对应的 Card 被标记为"脏"
```

**G1 的 Mixed GC**：

G1 的回收模式介于 Minor GC 和 Full GC 之间——它可以选择性地回收一部分老年代 Region：

```
Mixed GC 的选择过程：

  1. 全局并发标记（Concurrent Marking）
     → 找出所有老年代 Region 中的垃圾占比

  2. 回收价值排序
     → 按 "回收价值 = 可回收空间 / 预估回收耗时" 排序

  3. 选择回收集（Collection Set / CSet）
     → 选择回收价值最高的若干个 Region
     → 放入 CSet
     → 在 -XX:MaxGCPauseMillis 设定的暂停时间内尽可能多地回收

  垃圾优先（Garbage First）的含义：
    → 优先回收"垃圾最多的 Region"
    → 这就是 G1 名字的由来！
```

**SATB（Snapshot-At-The-Beginning）**：

G1 并发标记阶段使用 SATB 算法保证标记的正确性：

```
SATB 核心思想：
  → 在并发标记开始时，给当前对象图拍一张"快照"
  → 快照中的存活对象 = 本次 GC 保留的对象
  → 并发标记期间新产生的垃圾（浮动垃圾） → 下次 GC 再处理
  → 并发标记期间"删除引用"操作 → 通过 pre-write barrier 记录到 SATB 队列
  → Remark 阶段处理 SATB 队列中的引用

SATB 解决了 CMS 的"漏标"问题并且不需要 incremental update
但代价是：浮动垃圾比 CMS 多（新分配的对象可能也都算进快照）
```

```bash
# G1 关键参数
-XX:+UseG1GC                       # 启用 G1
-XX:MaxGCPauseMillis=200           # 期望的最大停顿时间（ms）— G1 的核心调优目标
-XX:G1HeapRegionSize=4m            # Region 大小（1,2,4,8,16,32 MB）
-XX:InitiatingHeapOccupancyPercent=45  # 老年代占用达到 45% → 触发并发标记周期
-XX:G1ReservePercent=10            # 保留 10% 空闲空间防止晋升失败
```

### 6.6 ZGC —— 亚毫秒级延迟

ZGC 是 JDK 11 引入的实验性收集器，JDK 15 正式发布。目标是将 STW 控制在 **1ms 以内**，支持 **TB 级堆**：

```
ZGC 核心技术：

1. 染色指针（Colored Pointers）
   → 在 64 位指针中嵌入元数据（利用高位 bit）
   → 标记信息直接存在指针里，不需要单独的对象头标记
   ┌──────────────────────────────────────────────┐
   │ [元数据: 4位] [地址: 42位(最大4TB堆)]         │
   │ 包含：Finalizable/Remapped/Marked1/Marked0    │
   └──────────────────────────────────────────────┘

2. 读屏障（Load Barrier）
   → 访问对象时如果发现指针颜色不对 → 自动修正后再访问
   → 这就是 ZGC 能做到"并发移动对象"的关键

3. 并发整理
   → ZGC 可以和应用线程并发地移动对象（不会 STW）
   → 这比 G1 又进了一步——G1 的转移对象仍需 STW
```

```bash
# ZGC 配置（JDK 17+）
-XX:+UseZGC              # 启用 ZGC
-Xmx16g                  # ZGC 在 16GB+ 堆上才能真正展现优势
# ZGC 几乎不需要调优——MaxGCPauseMillis 是唯一需要关心的
```

> 🎯 **GC 选择速查**：
> - 小型应用 / 客户端 → Serial
> - 后台批处理（吞吐量优先） → Parallel
> - Web 服务（响应时间优先，堆 4~32GB） → **G1**（JDK 9+ 默认，首选）
> - 超低延迟（< 1ms，堆很大）→ ZGC
> - 堆 > 32GB 且需要低延迟 → ZGC 几乎是最优解

---

## 七、三色标记法与漏标问题

### 7.1 三色标记算法

可达性分析的并发标记阶段，核心是**三色标记法（Tri-color Marking）**：

```
白色 (White)：未被标记 — 可能是垃圾
  → 初始所有对象都是白色
  → 标记结束时仍为白色 = 垃圾！

灰色 (Gray)：已被标记，但其引用的子对象尚未全部标记
  → 中间态，需要进一步扫描

黑色 (Black)：已被标记，且其所有引用的子对象也都已标记
  → 安全态，不需要再扫描

标记推进过程：
  白色 ──(找到引用)──▶ 灰色 ──(扫描完子对象)──▶ 黑色
```

```
三色标记过程示意：

  初始状态：              扫描 Root：             扫描完成：
  ○ A (白)               ● A (灰)               ● A (黑)
  ├─ ○ B (白)            ├─ ○ B (白) ←被引用     ├─ ● B (灰) ←被标记
  └─ ○ C (白)            └─ ○ C (白) ←被引用     └─ ○ C (白) ←等待扫描
                                                         │
                         下一步:                    最终：
                         ● A (黑)               ● A (黑)
                         ├─ ● B (灰)             ├─ ● B (黑)
                         └─ ● C (灰)             │  ├─ ● C (黑)
                                                 │  └─ ● D (黑)
                                                 └─ ● C (黑)

  白色且不可达 → 垃圾，回收！
```

### 7.2 漏标问题及其解决方案

并发标记过程中，用户线程同时在修改引用关系——这可能导致活对象被标成白色（漏标），从而被错误回收：

```
漏标的充分必要条件（两个条件同时满足）：
  条件1：黑色对象新增了指向白色对象的引用
  条件2：灰色对象到该白色对象的所有引用路径被切断

破局思路 → 破坏其中一个条件即可：
  破坏条件1 → 增量更新（Incremental Update）：CMS 的方案
    黑色对象新增白色引用时，把黑色对象重新变灰
    → 写后屏障（post-write barrier）

  破坏条件2 → 原始快照 SATB（Snapshot At The Beginning）：G1 的方案
    灰色对象删除白色引用时，把被删的引用记录到 SATB 队列
    → 写前屏障（pre-write barrier）
```

```java
// 漏标场景复现（伪代码）：

// 初始状态：
A.b = B;    // A 是黑色，B 是白色
C.b = null;

// 用户线程并发操作：
A.b = null;   // 条件2：灰色→白色的路径被切断
C.b = B;      // 条件1：黑色 C 新增了指向白色 B 的引用 → B 漏标！

// CMS 增量更新方案：
// A.b = null  // 不做处理
// C.b = B     // post-write barrier → 把 C 重新标为灰色 → C 重新扫描 → B 被发现！

// G1 SATB 方案：
// A.b = B     // (逻辑上的快照记录) SATB 队列记录"B 曾经被 A 引用过"
// A.b = null  // (条件2的触发点) pre-write barrier → 把 B 放入 SATB 队列
// C.b = B     // 不做处理
// Remark 阶段：处理 SATB 队列 → B 被认为存活
```

---

## 八、GC 日志解读

### 8.1 JDK 9+ 统一日志格式

JDK 9 引入了 `-Xlog` 统一日志框架，取代了 JDK 8 的 `-XX:+PrintGC*` 系列参数：

```bash
# JDK 8 风格（已过时）
-XX:+PrintGCDetails -XX:+PrintGCDateStamps -Xloggc:gc.log

# JDK 9+ / JDK 17 风格
-Xlog:gc*=info:file=gc.log:time,level,tags
# 拆解：
#   gc*      → 所有 gc 相关的 tag
#   info     → 日志级别
#   file=    → 输出到文件
#   time,level,tags → 包含时间、级别、tag 装饰
```

```bash
# 一条 G1 的 GC 日志示例（JDK 17）
# [2024-01-15T10:30:15.123+0800][info][gc,start       ] GC(42) Pause Young (Normal) (G1 Evacuation Pause)
# [2024-01-15T10:30:15.135+0800][info][gc,phases      ] GC(42)   Pre Evacuate Collection Set: 0.1ms
# [2024-01-15T10:30:15.136+0800][info][gc,phases      ] GC(42)   Evacuate Collection Set: 10.2ms
# [2024-01-15T10:30:15.137+0800][info][gc,phases      ] GC(42)   Post Evacuate Collection Set: 0.5ms
# [2024-01-15T10:30:15.140+0800][info][gc,heap        ] GC(42)   Eden: 4096M(4096M)->0M(4088M) Survivor: 512M->520M
# [2024-01-15T10:30:15.140+0800][info][gc,heap        ] GC(42)   Heap: 10240M(16384M)->6200M(16384M)
# [2024-01-15T10:30:15.141+0800][info][gc             ] GC(42) Pause Young (Normal) (G1 Evacuation Pause) 10280M->6200M 18.2ms
#
# 关键信息：
#   GC(42)                → 第 42 次 GC
#   Pause Young (Normal)  → 新生代 GC（正常类型）
#   10280M → 6200M         → GC 前堆占用 → GC 后堆占用
#   18.2ms                → 总停顿时间
```

### 8.2 常用 GC 日志参数

```bash
# 查看 GC 基本信息（生产推荐）
-Xlog:gc*=info:file=gc.log:time,level,tags:filecount=10,filesize=50M

# 实时在控制台看 GC 情况
-Xlog:gc+heap=trace:stdout    # 极其详细，仅调试用

# 只关心 GC 停顿时间
-Xlog:gc=trace:stdout

# 关注并发标记周期（G1）
-Xlog:gc+marking=trace:stdout

# GC 日志文件轮转
-Xlog:gc*:file=gc.log:time:filecount=5,filesize=100M
# 最多 5 个文件，每个 100MB
```

---

## 九、System.gc() —— 你该知道的陷阱

```java
// System.gc() 官方文档明确说：
// "调用 gc() 方法暗示 JVM 尽力去回收未使用的对象"
// 实际上是"建议"而非强制——取决于 JVM 实现和参数

public class SystemGCDemo {
    public static void main(String[] args) {
        // ❌ 生产代码里看到这行 = 红旗
        System.gc();  // 触发 Full GC！所有应用线程停顿！

        // ✅ 如果你需要督促 GC 回收（如直接内存用完），用这个：
        // -XX:+ExplicitGCInvokesConcurrent
        // 让 System.gc() 触发并发 GC 而不是 Full GC（G1/ZGC 专用）

        // ❌❌❌ 更可怕的是这个：
        // -XX:+DisableExplicitGC
        // 直接忽略 System.gc() —— 但这可能导致直接内存无法回收（NIO）
    }
}
```

> 🎯 **阿里规约**：生产环境务必使用 `-XX:+ExplicitGCInvokesConcurrent` 替代禁掉 `System.gc()`，防止 NIO 直接内存泄漏。

---

## 十、总结

| 知识点 | 核心要点 |
|--------|---------|
| 引用计数 vs 可达性分析 | Java 用可达性分析；引用计数无法解决循环引用 |
| GC Roots | 栈引用、静态变量、常量池、JNI 引用、活跃线程、锁持有对象 |
| 强/软/弱/虚引用 | 强→永不回收；软→内存不足回收（缓存）；弱→下次GC回收（WeakHashMap）；虚→回收通知（NIO直接内存） |
| 标记-清除 | 最基础、有碎片、CMS 的基础算法 |
| 标记-复制 | 无碎片、浪费一半内存、**新生代专用** |
| 标记-整理 | 无碎片、需要移动对象、老年代专用 |
| Serial | 单线程、客户端/小应用 |
| Parallel | 多线程并行、**吞吐量优先**、JDK 8 默认 |
| CMS | 并发低延迟先行者、标记-清除碎片化、**JDK 14 已移除** |
| G1 | Region 化、Mixed GC、**JDK 9+ 默认**、延迟吞吐均衡 |
| ZGC | 染色指针+读屏障、< 1ms STW、TB 级堆 |
| 三色标记 | 黑-灰-白；CMS 增量更新 vs G1 SATB 两种漏标解决方案 |
| CMS 三缺陷 | CPU 敏感、浮动垃圾（并发失败降级Serial）、碎片化 |
| GC 日志 | JDK 9+ 用 `-Xlog:gc*`，格式与 JDK 8 完全不同 |

**GC 选择决策树**：

```
堆大小 < 100MB？
  ├─ 是 → Serial（客户端）
  └─ 否 → 追求吞吐量？
            ├─ 是 → Parallel（批处理）
            └─ 否 → 延迟敏感？
                      ├─ 堆 4~32GB → G1（Web 服务首选）
                      └─ 堆大、延迟 < 1ms → ZGC
```

下一篇将深入 **类加载机制**——从双亲委派模型到 SPI 如何打破它，从 Tomcat 类加载器到自定义类加载器，从类生命周期到类的卸载条件。

---

## 参考

- [The Garbage Collection Handbook (2nd Edition)](https://gchandbook.org/)
- [JEP 248: Make G1 the Default Garbage Collector](https://openjdk.org/jeps/248)
- [JEP 333: ZGC (Experimental, JDK 11)](https://openjdk.org/jeps/333)
- [JEP 377: ZGC (Production, JDK 15)](https://openjdk.org/jeps/377)
- [JEP 363: Remove the Concurrent Mark Sweep (CMS) Collector](https://openjdk.org/jeps/363)
- [Understanding GC Logs (Oracle)](https://docs.oracle.com/javase/9/tools/java.htm)
- [Alexey Shipilev — JVM Anatomy Quark #11: GC](https://shipilev.net/jvm/anatomy-quarks/11-moving-gc-locality/)
- [JavaGuide — JVM 垃圾回收](https://javaguide.cn/java/jvm/jvm-garbage-collection.html)
