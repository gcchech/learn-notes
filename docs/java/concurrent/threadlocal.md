---
title: ThreadLocal 深度解析
icon: thumbtack
order: 5
category:
  - Java
  - 并发编程
tag:
  - ThreadLocal
  - 内存泄漏
  - InheritableThreadLocal
  - TransmittableThreadLocal
---

# ThreadLocal 深度解析：原理、内存泄漏与最佳实践

> 📖 `ThreadLocal` 看似简单——每个线程存一份自己的变量副本，线程之间互不影响。但它的内部实现暗藏玄机：`ThreadLocalMap` 的 Entry 为什么用弱引用？弱引用如何导致了经典的内存泄漏？线程池场景下 `InheritableThreadLocal` 为什么失效？阿里巴巴的 `TransmittableThreadLocal` 如何解决这个问题？本文从源码出发，逐一拆解。

---

## 一、ThreadLocal 是什么？

**一句话**：`ThreadLocal` 为每个线程提供独立的变量副本，线程之间互不干扰。

```java
// ThreadLocal 最简示例
ThreadLocal<Integer> threadLocal = ThreadLocal.withInitial(() -> 0);

new Thread(() -> {
    threadLocal.set(1);
    System.out.println("Thread-A: " + threadLocal.get());  // 1
}).start();

new Thread(() -> {
    threadLocal.set(2);
    System.out.println("Thread-B: " + threadLocal.get());  // 2
}).start();

System.out.println("Main: " + threadLocal.get());          // 0（默认值）
// 三个线程各自的 ThreadLocal 值互不干扰
```

### 1.1 典型使用场景

| 场景 | 示例 | 解决的问题 |
|------|------|-----------|
| 数据库连接 | Spring 的 `TransactionSynchronizationManager` | 每个 DAO 方法拿到同一个连接，实现事务 |
| Session 管理 | `RequestContextHolder` | Controller 和 Service 不用传 HttpSession 参数 |
| 日期格式化 | `SimpleDateFormat` 线程不安全 → 每个线程一个实例 | 避免 `synchronized` 开销 |
| 链路追踪 | TraceId 全链路透传 | 日志中每个请求有唯一 TraceId，便于问题排查 |

```java
// 场景 1：SimpleDateFormat 的 ThreadLocal 封装
public class DateUtils {
    // ❌ SimpleDateFormat 不是线程安全的，不能作为静态变量共享！
    // private static final SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");

    // ✅ 每个线程一个 SimpleDateFormat 实例
    private static final ThreadLocal<SimpleDateFormat> SDF =
        ThreadLocal.withInitial(() -> new SimpleDateFormat("yyyy-MM-dd"));

    public static String format(Date date) {
        return SDF.get().format(date);
    }

    public static Date parse(String str) throws ParseException {
        return SDF.get().parse(str);
    }
}

// 场景 2：全局 TraceId
public class TraceContext {
    private static final ThreadLocal<String> TRACE_ID = new ThreadLocal<>();

    public static void setTraceId(String traceId) { TRACE_ID.set(traceId); }
    public static String getTraceId() { return TRACE_ID.get(); }
    public static void clear() { TRACE_ID.remove(); }  // ⚠️ 必须清理！
}

// 在 Filter / Interceptor 中
// doFilter:
//   TraceContext.setTraceId(UUID.randomUUID().toString());
//   try { chain.doFilter(); }
//   finally { TraceContext.clear(); }  // 防止内存泄漏
```

---

## 二、☆ ThreadLocal 的实现原理

### 2.1 核心数据结构

`ThreadLocal` 的数据**不是存在 ThreadLocal 对象里，而是存在 Thread 里**：

```java
public class Thread implements Runnable {
    // 每个线程持有自己的 ThreadLocalMap
    ThreadLocal.ThreadLocalMap threadLocals;       // 普通 ThreadLocal
    ThreadLocal.ThreadLocalMap inheritableThreadLocals;  // 可继承的 ThreadLocal
}

public class ThreadLocal<T> {
    // ThreadLocal 只是一个 key，真正的 value 存在 Thread.threadLocals 中

    public T get() {
        Thread t = Thread.currentThread();
        ThreadLocalMap map = getMap(t);        // ① 获取当前线程的 ThreadLocalMap
        if (map != null) {
            ThreadLocalMap.Entry e = map.getEntry(this);  // ② 用 this 作为 key 查找
            if (e != null) return (T) e.value;
        }
        return setInitialValue();  // ③ 没找到 → 初始化默认值
    }

    public void set(T value) {
        Thread t = Thread.currentThread();
        ThreadLocalMap map = getMap(t);
        if (map != null)
            map.set(this, value);
        else
            createMap(t, value);  // 首次使用时才创建 map（懒加载）
    }

    ThreadLocalMap getMap(Thread t) {
        return t.threadLocals;
    }
}
```

```
设计精妙之处：ThreadLocal 只扮演 key 的角色

  Thread A                        Thread B
  ┌─────────────────┐            ┌─────────────────┐
  │ threadLocals     │            │ threadLocals     │
  │ (ThreadLocalMap) │            │ (ThreadLocalMap) │
  │ ┌─────────────┐  │            │ ┌─────────────┐  │
  │ │TL#1 → "valA"│  │            │ │TL#1 → "valB"│  │
  │ │TL#2 → 123   │  │            │ │TL#2 → 456   │  │
  │ └─────────────┘  │            │ └─────────────┘  │
  └─────────────────┘            └─────────────────┘

  不同的 Thread 对象 → 不同的 ThreadLocalMap → 同样的 key 映射到不同的 value
```

### 2.2 ThreadLocalMap 内部结构

`ThreadLocalMap` 是一个**简化的哈希表**（不是 `HashMap`！），只给 `ThreadLocal` 内部使用：

```java
static class ThreadLocalMap {

    // Entry 继承 WeakReference —— 这是内存泄漏话题的核心！
    static class Entry extends WeakReference<ThreadLocal<?>> {
        Object value;  // 强引用！
        Entry(ThreadLocal<?> k, Object v) {
            super(k);   // 传给 WeakReference 构造器 → key 是弱引用
            value = v;  // value 是强引用
        }
    }

    private Entry[] table;           // 数组，不是链表
    private static final int INITIAL_CAPACITY = 16;
    private int threshold;           // table.length * 2/3

    // 哈希冲突解决：开放地址法（线性探测），不是链表法！
    // 冲突时：index = (i + 1) % len，直到找到空位
}
```

```
ThreadLocalMap 结构示意（开放地址法）：

  table 索引:  0       1       2       3       4       ...
           ┌───────┬───────┬───────┬───────┬───────┐
           │Entry0 │Entry1 │Entry2 │Entry3 │Entry4 │
           │WeakRef│       │WeakRef│(null) │WeakRef│
           │→ TL#1 │       │→ TL#3 │       │→ TL#5 │
           │val: A │       │val: C │       │val: E │
           └───────┴───────┴───────┴───────┴───────┘
                                        ↑
                                  哈希冲突后，线性探测找到的插入位置
```

> 💡 **为什么不用 `HashMap` 的标准实现？** `ThreadLocalMap` 故意简化：用开放地址法而非链表法。因为 ThreadLocal 的 key 通常就几个，数组很小，线性探测效率不低，同时避免了链表节点的额外内存开销。`WeakReference` 继承 + 开放地址法 = 最精简的设计。

### 2.3 Hash 算法与冲突解决

```java
// hash 值 = 每次累加 0x61c88647（斐波那契哈希的黄金比例值）
// 这个魔术常数的效果：key 在 2^n 大小的数组中均匀分布
private static final int HASH_INCREMENT = 0x61c88647;
private final int threadLocalHashCode = nextHashCode();
private static AtomicInteger nextHashCode = new AtomicInteger();

private static int nextHashCode() {
    return nextHashCode.getAndAdd(HASH_INCREMENT);
}

// 索引计算：hash & (len - 1)，与 HashMap 相同
int i = key.threadLocalHashCode & (table.length - 1);
```

```java
// getEntry 的核心逻辑（线性探测查找）
private Entry getEntry(ThreadLocal<?> key) {
    int i = key.threadLocalHashCode & (table.length - 1);
    Entry e = table[i];
    if (e != null && e.get() == key)
        return e;   // 直接命中
    else
        return getEntryAfterMiss(key, i, e);  // 线性探测
}

private Entry getEntryAfterMiss(ThreadLocal<?> key, int i, Entry e) {
    Entry[] tab = table;
    int len = tab.length;
    while (e != null) {
        ThreadLocal<?> k = e.get();
        if (k == key) return e;     // 找到了
        if (k == null) expungeStaleEntry(i);  // 顺便清理过期 Entry
        else i = nextIndex(i, len); // 线性探测下一个
        e = tab[i];
    }
    return null;
}
```

---

## 三、☆ 内存泄漏问题——最经典的 ThreadLocal 坑

### 3.1 为什么 Entry 用 WeakReference？

```java
// 如果不使用弱引用（假设用强引用 key）：
// ThreadLocal<String> tl = new ThreadLocal<>();  // tl 是强引用
// tl.set("hello");
// tl = null;  // tl 外部引用没了...
//   但 Thread.threadLocals 中的 Entry 还强引用着 tl！
//   → tl 永远不会被 GC → 内存泄漏
```

设计意图很美好：

```
正常流程（使用弱引用）：
  ThreadLocal tl = new ThreadLocal<>()  →  Entry 弱引用 tl
  tl.set("value")
  tl = null                              →  外部没有强引用了
  GC 发生时：
    ① tl 被回收（只有弱引用指向它）
    ② Entry 的 key 变为 null
    ③ 下次 get/set/remove 时清理这些 key==null 的 Entry
```

但问题是：**第 ③ 步不一定被执行！**

### 3.2 内存泄漏的真正原因

```java
// 内存泄漏的核心：
// Entry 的 key 是弱引用 → key 被 GC 回收 → key == null
// 但是！Entry 的 value 是强引用 → value 无法被 GC → 内存泄漏！

// 这个 Entry (key=null, value="hello") 一直存在于 table 数组中
// 除非：
//   1. 显式调用 remove()
//   2. 后续的 get/set/remove 触发清理（expungeStaleEntry）
//   3. 线程终止（整个 ThreadLocalMap 被 GC）
```

```java
// 经典泄漏场景：线程池 + ThreadLocal
public class MemoryLeakDemo {
    private static final ThreadLocal<byte[]> THREAD_LOCAL = new ThreadLocal<>();

    public static void main(String[] args) {
        ExecutorService pool = Executors.newFixedThreadPool(5);

        for (int i = 0; i < 100; i++) {
            pool.execute(() -> {
                THREAD_LOCAL.set(new byte[10 * 1024 * 1024]);  // 10MB
                // 处理请求...
                // ❌ 忘记调用 THREAD_LOCAL.remove()！
                // 线程复用 → ThreadLocalMap 一直在 → 10MB 数据永远不释放
            });
        }
        // 5 个线程，每个卡了 1GB+ 的泄漏数据 → OOM！
    }
}
```

### 3.3 解决方案

```java
// ✅ 方案 1：finally 中 remove（最可靠）
ThreadLocal<String> tl = new ThreadLocal<>();
try {
    tl.set("some value");
    // 执行业务逻辑
} finally {
    tl.remove();  // ⚠️ 必须在 finally 中！
}

// ✅ 方案 2：使用 AutoCloseable 封装（Java 7+）
class ThreadLocalContext<T> implements AutoCloseable {
    private final ThreadLocal<T> tl;
    public ThreadLocalContext(ThreadLocal<T> tl, T value) {
        this.tl = tl;
        tl.set(value);
    }
    @Override
    public void close() { tl.remove(); }
}

// 使用 try-with-resources
try (ThreadLocalContext<String> ctx = new ThreadLocalContext<>(tl, "value")) {
    // 业务逻辑
}  // 自动 remove()

// ✅ 方案 3：JDK 建议的静态 ThreadLocal + 弱引用值
// 或者：在 Filter/Interceptor 中统一清理
```

### 3.4 ThreadLocalMap 的自动清理机制

即使忘记 `remove()`，`ThreadLocalMap` 也会在后续操作时 **尽量清理**：

```java
// expungeStaleEntry：清理 key==null 的过期 Entry
private int expungeStaleEntry(int staleSlot) {
    Entry[] tab = table;
    int len = tab.length;

    // ① 清除当前槽位
    tab[staleSlot].value = null;   // 断开 value 的强引用！
    tab[staleSlot] = null;         // 清空槽位

    // ② 重新哈希后面的连续 Entry（开放地址法的连锁清理）
    for (int i = nextIndex(staleSlot, len);
         (e = tab[i]) != null;
         i = nextIndex(i, len)) {
        ThreadLocal<?> k = e.get();
        if (k == null) {
            e.value = null;
            tab[i] = null;          // 也清理了！
        } else {
            // 重新哈希到正确位置
            int h = k.threadLocalHashCode & (len - 1);
            if (h != i) {
                tab[i] = null;
                while (tab[h] != null) h = nextIndex(h, len);
                tab[h] = e;
            }
        }
    }
    return i;
}
```

> ⚠️ **但这不可靠！** 如果 ThreadLocal 不再被使用，且线程不再调用同一 ThreadLocal 的 get/set，`expungeStaleEntry` 就不会被触发。**`remove()` 是唯一可靠的清理方式。**

---

## 四、InheritableThreadLocal —— 父子线程传递

### 4.1 基本用法

```java
// 普通 ThreadLocal：子线程拿不到父线程的值
ThreadLocal<String> normalTl = new ThreadLocal<>();
normalTl.set("parent-value");
new Thread(() -> System.out.println(normalTl.get())).start();
// 输出：null（子线程是新线程，ThreadLocalMap 是空的）

// InheritableThreadLocal：子线程继承父线程的值
InheritableThreadLocal<String> inheritableTl = new InheritableThreadLocal<>();
inheritableTl.set("parent-value");
new Thread(() -> System.out.println(inheritableTl.get())).start();
// 输出：parent-value
```

### 4.2 实现原理

```java
public class InheritableThreadLocal<T> extends ThreadLocal<T> {
    // 关键：子线程取值时用的是 inheritableThreadLocals
    @Override
    ThreadLocalMap getMap(Thread t) {
        return t.inheritableThreadLocals;  // 不是 threadLocals！
    }

    // 关键：子线程创建时，Thread.init() 会调用这个方法
    @Override
    void createMap(Thread t, T firstValue) {
        t.inheritableThreadLocals = new ThreadLocalMap(this, firstValue);
    }
}

// Thread.init() 中的核心逻辑（简化）：
// 当前线程是 parent，要创建的线程是 child
if (parent.inheritableThreadLocals != null) {
    // 浅拷贝：key 共享，value 引用相同
    child.inheritableThreadLocals =
        ThreadLocal.createInheritedMap(parent.inheritableThreadLocals);
}
```

```
InheritableThreadLocal 的传递过程：

  父线程                                  子线程
  ┌───────────────────────┐            ┌───────────────────────┐
  │ inheritableThreadLocals│   new      │ inheritableThreadLocals│
  │ ┌─────────────────┐   │  Thread    │ ┌─────────────────┐   │
  │ │ TL#1 → "parent" │───┼───────────▶│ │ TL#1 → "parent" │   │
  │ └─────────────────┘   │  (浅拷贝)   │ └─────────────────┘   │
  └───────────────────────┘            └───────────────────────┘

  ⚠️ 浅拷贝的陷阱：
  如果 value 是可变对象（如 List），父子线程共享同一个对象引用！
  → 父线程修改 value，子线程也受影响（线程安全问题！）
```

### 4.3 InheritableThreadLocal 的局限性

```java
// ⚠️ 局限 1：只在创建子线程时传递，后续修改对已创建的子线程不可见
InheritableThreadLocal<String> tl = new InheritableThreadLocal<>();
tl.set("value-1");
new Thread(() -> System.out.println(tl.get())).start();  // value-1

tl.set("value-2");  // 修改...但已创建的子线程不知道
new Thread(() -> System.out.println(tl.get())).start();  // value-2

// ⚠️ 局限 2：线程池场景彻底失效！
// 原因：线程池中的线程是复用的，不是每次都 new
InheritableThreadLocal<String> tl2 = new InheritableThreadLocal<>();
ExecutorService pool = Executors.newFixedThreadPool(2);

tl2.set("task-1-value");
pool.execute(() -> System.out.println(tl2.get()));  // 可能是 task-1-value

tl2.set("task-2-value");
pool.execute(() -> System.out.println(tl2.get()));
// 可能是 task-1-value（线程复用！拿到的是线程第一次创建时的值）
// 也可能是 task-2-value（如果恰好是新建的线程）
// → 结果不确定！
```

---

## 五、TransmittableThreadLocal —— 线程池场景的救星

阿里巴巴开源的 [transmittable-thread-local](https://github.com/alibaba/transmittable-thread-local) 解决了线程池场景下 `ThreadLocal` 值传递的问题。

### 5.1 核心思路

```
InheritableThreadLocal 的问题：
  主线程设置值 → submit 任务 → 线程池中已存在的线程 → 拿不到新值

TransmittableThreadLocal 的解决方案：
  主线程设置值 → submit 任务 → TTL 在 submit 时捕获快照
                            → 执行前回放快照到执行线程
                            → 执行后恢复执行线程原来的值
```

### 5.2 基本使用

```java
// ① 添加依赖
// <dependency>
//     <groupId>com.alibaba</groupId>
//     <artifactId>transmittable-thread-local</artifactId>
// </dependency>

// ② 使用 TTL
TransmittableThreadLocal<String> ttl = new TransmittableThreadLocal<>();

// ③ 包装线程池（关键步骤！）
ExecutorService pool = TtlExecutors.getTtlExecutorService(
    Executors.newFixedThreadPool(3)
);

// ④ 正常使用——每次 submit 的值都能正确传递
ttl.set("task-1-value");
pool.execute(() -> System.out.println(ttl.get()));  // task-1-value ✅

ttl.set("task-2-value");
pool.execute(() -> System.out.println(ttl.get()));  // task-2-value ✅
```

### 5.3 实现原理（简要）

```java
// TTL 的核心：捕获 → 回放 → 恢复

// 1. 在调用线程中：TtlRunnable 构造时捕获当前 TTL 值（快照）
TtlRunnable(Runnable runnable) {
    this.capturedRef = capture();  // 保存提交时的 TTL 快照
    this.runnable = runnable;
}

// 2. 在执行线程中：run() 之前回放快照
public void run() {
    Object backup = replay(capturedRef);  // 回放捕获的快照，保存线程原来的值
    try {
        runnable.run();
    } finally {
        restore(backup);  // 恢复线程原来的值（不污染线程池线程！）
    }
}
```

> 🎯 TTL 的设计精髓在于 **backup/restore 机制**：执行任务前把线程原来的 TTL 值备份起来，执行后恢复回去。这样线程池复用线程时不会互相污染。

---

## 六、总结

| 知识点 | 核心要点 |
|--------|---------|
| 数据存储位置 | ThreadLocal 是 key，value 存在 `Thread.threadLocals` (ThreadLocalMap) 中 |
| ThreadLocalMap | 简化哈希表；开放地址法解决冲突；Entry 的 key 是弱引用 |
| 弱引用设计 | key (ThreadLocal) 弱引用 → 防止 ThreadLocal 对象无法被 GC |
| 内存泄漏 | key 被 GC 后，value 仍是强引用 → 不 remove 就泄漏 |
| 解决方案 | finally 中调用 `remove()`；用 try-with-resources 封装 |
| 线程池 + TL | 线程复用 → TL 值残留 → 必须 remove（或用 TTL） |
| InheritableThreadLocal | 创建子线程时浅拷贝；线程池场景失效 |
| TTL | 线程池场景下的上下文传递；capture → replay → restore |

---

至此，**并发编程模块的 5 篇文章全部完成！** 下一篇将进入 **JVM 原理**模块——从 JVM 内存结构（堆/栈/方法区/元空间）开始，逐步深入 GC 算法、类加载机制和 JVM 调优实战。

---

## 参考

- [ThreadLocal JavaDoc (JDK 17)](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/ThreadLocal.html)
- [InheritableThreadLocal JavaDoc](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/InheritableThreadLocal.html)
- [ThreadLocal 源码 (JDK 17)](https://github.com/openjdk/jdk/blob/jdk-17-ga/src/java.base/share/classes/java/lang/ThreadLocal.java)
- [阿里巴巴 TransmittableThreadLocal](https://github.com/alibaba/transmittable-thread-local)
- [JavaGuide - ThreadLocal](https://javaguide.cn/java/concurrent/threadlocal.html)
