---
title: JUC 工具类
icon: tools
order: 3
category:
  - Java
  - 并发编程
tag:
  - CountDownLatch
  - CyclicBarrier
  - Semaphore
  - 原子类
  - CAS
  - CopyOnWriteArrayList
---

# JUC 工具类：同步器、原子类与并发容器

> 📖 理解了 AQS 之后，JUC 工具类的源码就不再神秘——`CountDownLatch`、`Semaphore` 本质上就是对 AQS 共享模式的简单封装，`CyclicBarrier` 则是 `ReentrantLock + Condition` 的组合应用。本文从使用场景出发，解析每种工具的内部原理、对比差异和最佳实践，最后介绍原子类和并发容器的核心要点。

---

## 一、CountDownLatch —— 等所有人到齐再开始

### 1.1 基本用法

`CountDownLatch` 就像一个 **门闩**：初始时门关着（计数器 > 0），每完成一个任务就倒数一次，所有任务完成（计数器归零）后，门打开，等待线程继续。

```java
// 场景：主线程等待 3 个子任务全部完成
CountDownLatch latch = new CountDownLatch(3);

for (int i = 0; i < 3; i++) {
    final int taskId = i;
    new Thread(() -> {
        System.out.println("任务 " + taskId + " 开始");
        try {
            Thread.sleep(ThreadLocalRandom.current().nextInt(1000, 3000));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        System.out.println("任务 " + taskId + " 完成");
        latch.countDown();  // 计数 -1
    }).start();
}

System.out.println("主线程等待所有任务完成...");
latch.await();  // 阻塞，直到 count=0
System.out.println("所有任务已完成，主线程继续！");
```

### 1.2 底层原理

`CountDownLatch` 内部基于 **AQS 共享模式**，非常简洁：

```java
public class CountDownLatch {
    private static final class Sync extends AbstractQueuedSynchronizer {
        Sync(int count) {
            setState(count);  // state = 初始计数
        }

        // await() → acquireSharedInterruptibly(1)
        // 当 state == 0 时返回 1（成功），否则返回 -1（需要等待）
        protected int tryAcquireShared(int acquires) {
            return (getState() == 0) ? 1 : -1;
        }

        // countDown() → releaseShared(1)
        protected boolean tryReleaseShared(int releases) {
            // CAS 自旋递减 state
            for (;;) {
                int c = getState();
                if (c == 0) return false;
                int nextc = c - 1;
                if (compareAndSetState(c, nextc))
                    return nextc == 0;  // 减到 0 时才真正释放
            }
        }
    }

    private final Sync sync;
    public CountDownLatch(int count) { this.sync = new Sync(count); }
    public void await() throws InterruptedException { sync.acquireSharedInterruptibly(1); }
    public void countDown() { sync.releaseShared(1); }
}
```

> 💡 `CountDownLatch` 是一次性的——计数器归零后不能重置。如果需要重复使用，请看下文的 `CyclicBarrier`。

---

## 二、CyclicBarrier —— 人到齐了再一起走

### 2.1 基本用法

`CyclicBarrier` 让一组线程互相等待，**所有线程都到达屏障点后才同时继续**：

```java
// 场景：3 个线程各自执行，到达屏障后一起继续
CyclicBarrier barrier = new CyclicBarrier(3, () -> {
    System.out.println("所有人已到齐，执行汇总操作！");
});

for (int i = 0; i < 3; i++) {
    final int id = i;
    new Thread(() -> {
        try {
            System.out.println("线程 " + id + " 阶段1 开始");
            Thread.sleep(ThreadLocalRandom.current().nextInt(1000, 3000));
            System.out.println("线程 " + id + " 到达屏障，等待其他人...");
            barrier.await();  // 到达屏障点，等待其他线程
            System.out.println("线程 " + id + " 阶段2 开始（所有人已到齐）");
        } catch (InterruptedException | BrokenBarrierException e) {
            Thread.currentThread().interrupt();
        }
    }).start();
}
```

### 2.2 底层原理

与 `CountDownLatch` 不同，`CyclicBarrier` 使用 **ReentrantLock + Condition**（不使用 AQS 直接）：

```java
public class CyclicBarrier {
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition trip = lock.lock();
    private final int parties;         // 参与线程数
    private final Runnable barrierCommand;  // 全部到达后执行的动作
    private Generation generation;     // 当前 "代"（用于重置）
    private int count;                 // 还需等待的线程数

    // await() 的核心逻辑（简化）
    private int dowait(boolean timed, long nanos) {
        lock.lock();
        try {
            int index = --count;
            if (index == 0) {  // 最后一个到达的线程
                if (barrierCommand != null) barrierCommand.run();
                nextGeneration();  // 重置 count=parties，唤醒所有等待线程
                return 0;
            }
            // 还没到齐 → 等待
            for (;;) {
                trip.await();  // Condition.await()，释放锁
                // 醒来后检查：是被 signal 唤醒（正常）还是 barrier 被破坏
            }
        } finally {
            lock.unlock();
        }
    }

    private void nextGeneration() {
        trip.signalAll();       // 唤醒所有等待线程
        count = parties;        // 重置计数器（可循环使用的关键！）
        generation = new Generation();
    }
}
```

### 2.3 CountDownLatch vs CyclicBarrier

| 对比维度 | CountDownLatch | CyclicBarrier |
|---------|:---:|:---:|
| 可重用 | ❌ 一次性 | ✅ 可循环使用 |
| 底层 | AQS 共享模式 | ReentrantLock + Condition |
| 计数方向 | 递减（countDown） | 递减（await） |
| 角色 | 一个/多个线程等**其他线程**完成 | 线程之间**互相等待** |
| 回调 | ❌ 不支持 | ✅ 支持 `barrierCommand` |
| 语义 | "门闩"——等所有人完成 | "栅栏"——人到齐一起走 |

```java
// 典型使用场景对比
// CountDownLatch：主线程等所有子任务完成
//   主线程 [等...等...等]           → 全部完成 → 继续
//   子任务  [做][做][做]

// CyclicBarrier：多个线程互相等待
//   线程1  [做] → [到屏障，等] ↘
//   线程2  [做] → [到屏障，等] → [到齐了，一起走！]
//   线程3  [做] → [到屏障，等] ↗
```

---

## 三、Semaphore —— 信号量限流

### 3.1 基本用法

`Semaphore` 控制**同时访问某个资源的线程数量**：

```java
// 场景：最多 3 个线程同时访问数据库
Semaphore semaphore = new Semaphore(3);  // 3 个许可

for (int i = 0; i < 10; i++) {
    new Thread(() -> {
        try {
            semaphore.acquire();  // 获取许可（没有可用许可就等待）
            System.out.println(Thread.currentThread().getName() + " 获取许可");
            Thread.sleep(2000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } finally {
            semaphore.release();  // ⚠️ 必须在 finally 中释放
            System.out.println(Thread.currentThread().getName() + " 释放许可");
        }
    }).start();
}
// 同一时刻最多只有 3 个线程在执行
```

### 3.2 底层原理

`Semaphore` 同样是 **AQS 共享模式** 的简单应用：

```java
public class Semaphore {
    abstract static class Sync extends AbstractQueuedSynchronizer {
        Sync(int permits) {
            setState(permits);  // state = 许可证数量
        }

        // acquire() → acquireSharedInterruptibly(1)
        // tryAcquireShared：state > 0 时 CAS 递减
        final int nonfairTryAcquireShared(int acquires) {
            for (;;) {
                int available = getState();
                int remaining = available - acquires;
                if (remaining < 0 || compareAndSetState(available, remaining))
                    return remaining;  // >= 0 成功，< 0 需要等待
            }
        }

        // release() → releaseShared(1)
        protected final boolean tryReleaseShared(int releases) {
            for (;;) {
                int current = getState();
                int next = current + releases;
                if (next < current) throw new Error("Maximum permit count exceeded");
                if (compareAndSetState(current, next))
                    return true;
            }
        }
    }
}
```

### 3.3 公平 Semaphore

```java
// 非公平（默认）：新 acquire 可能 "插队"
Semaphore nonFair = new Semaphore(5);

// 公平：严格按照 FIFO 顺序分配许可
Semaphore fair = new Semaphore(5, true);
```

### 3.4 Semaphore 的常用方法

```java
Semaphore sem = new Semaphore(5);

sem.acquire();                  // 获取 1 个许可（阻塞）
sem.acquire(3);                 // 获取 3 个许可
sem.tryAcquire();               // 尝试获取，立即返回 boolean
sem.tryAcquire(3, TimeUnit.SECONDS);  // 超时尝试
sem.release();                  // 释放 1 个许可
sem.release(3);                 // 释放 3 个许可
sem.availablePermits();         // 当前可用的许可数
sem.drainPermits();             // 一次性取走所有可用许可
```

---

## 四、☆ 原子类 —— 无锁线程安全

### 4.1 CAS 原理

原子类核心依赖 **CAS（Compare And Swap）**——一条 CPU 原子指令：

```
CAS(V, E, N)：
  读取变量当前值 C
  如果 C == E（期望值）：
    将变量更新为 N（新值）
    返回 true
  否则：
    返回 false（说明有其他线程修改过）
```

```java
// AtomicInteger 的源码
public class AtomicInteger extends Number {
    private volatile int value;  // volatile 保证可见性

    // Unsafe 提供硬件级别的 CAS 操作
    private static final Unsafe U = Unsafe.getUnsafe();

    public final int getAndIncrement() {
        return U.getAndAddInt(this, VALUE, 1);  // 底层是 CAS 自旋
    }

    // Unsafe 的实现（JDK 8+）
    public final int getAndAddInt(Object o, long offset, int delta) {
        int v;
        do {
            v = getIntVolatile(o, offset);     // ① 读取当前值
        } while (!compareAndSwapInt(o, offset, v, v + delta));  // ② CAS
        return v;
    }
}
```

> 🎯 **CAS 的核心优势**：不加锁，线程不会阻塞/切换。高并发、低竞争场景性能远超 `synchronized`。但竞争激烈时 CAS 自旋会浪费 CPU —— 这就是 `LongAdder` 登场的原因。

### 4.2 基础原子类

| 类 | 说明 |
|----|------|
| `AtomicInteger` | 原子 int |
| `AtomicLong` | 原子 long |
| `AtomicBoolean` | 原子 boolean（内部用 int 0/1） |
| `AtomicReference<V>` | 原子引用 |

```java
// 常用方法
AtomicInteger ai = new AtomicInteger(0);

ai.get();                    // 获取当前值
ai.set(10);                  // 设置值
ai.getAndSet(20);            // 设置并返回旧值
ai.compareAndSet(20, 30);    // CAS：预期 20 → 更新为 30
ai.getAndIncrement();        // i++（原子版）
ai.incrementAndGet();        // ++i
ai.getAndAdd(5);             // 加并返回旧值
ai.addAndGet(5);             // 加并返回新值
ai.updateAndGet(x -> x * 2); // JDK 8：原子更新，Lambda
ai.getAndAccumulate(3, Integer::sum); // JDK 8：原子累加
```

### 4.3 ABA 问题与解决方案

**ABA 问题**：CAS 只检查 "值是否还是 A"，不关心这个值曾经变成过什么：

```java
// 场景：CAS 看到 A → 认为没变化 → 实际是 A → B → A（被改过又改回来）
AtomicReference<String> ref = new AtomicReference<>("A");

// 线程 1
String old = ref.get();     // "A"
// 准备 CAS("A", "C")

// 线程 2（在 1 的 CAS 之前执行）
ref.compareAndSet("A", "B");   // A → B
ref.compareAndSet("B", "A");   // B → A

// 线程 1 继续
ref.compareAndSet("A", "C");   // ✅ 成功！但不知道中间被改过
// 对于引用类型，这可能导致严重问题（如链表节点被复用）
```

**解决方案**：加上版本号

```java
// AtomicStampedReference：stamp（版本号）
AtomicStampedReference<String> ref = new AtomicStampedReference<>("A", 0);

int[] stampHolder = new int[1];
String value = ref.get(stampHolder);
int stamp = stampHolder[0];  // stamp = 0

// 线程 2 修改：stamp 变两次
ref.compareAndSet("A", "B", 0, 1);   // stamp: 0 → 1
ref.compareAndSet("B", "A", 1, 2);   // stamp: 1 → 2

// 线程 1 CAS：stamp 不匹配，失败！
boolean success = ref.compareAndSet("A", "C", 0, 1);  // ❌ false

// AtomicMarkableReference：只关心 "是否被改过"（boolean mark）
AtomicMarkableReference<String> ref2 = new AtomicMarkableReference<>("A", false);
```

### 4.4 LongAdder —— 高并发下的性能利器

`AtomicLong` 在高并发下 CAS 自旋严重（多个线程竞争同一个变量）。JDK 8 的 `LongAdder` 通过 **分段累加** 解决：

```
AtomicLong 的问题（高并发）：
  所有线程争抢一个变量
  Thread1 ──┐
  Thread2 ──┼──▶ CAS 竞争同一个 value ──▶ 大量自旋！CPU 空转
  Thread3 ──┘

LongAdder 的解决（分段）：
  Thread1 ──▶ Cell[0]  ┐
  Thread2 ──▶ Cell[1]  ├── 各自 CAS，互不干扰！
  Thread3 ──▶ Cell[2]  ┘
              ...
              sum() 汇总：base + Cell[0] + Cell[1] + Cell[2] + ...
```

```java
LongAdder adder = new LongAdder();

// 多线程累加
adder.increment();   // +1
adder.add(100);      // +100
adder.decrement();   // -1

// ⚠️ sum() 不是原子的！调用时可能还有其他线程在写
long total = adder.sum();
// 只有在没有并发更新时，sum() 才是精确的
```

```java
// 使用场景对比
// AtomicLong：需要精确的当前值（如序列号生成器）
// LongAdder：只需要最终汇总值（如计数器、统计求和）

// 性能对比（16 线程，竞争激烈时）：
// AtomicLong.incrementAndGet()  — 基准
// LongAdder.increment()         — 快 5~10 倍！

// 配套的还有：
// LongAccumulator：自定义累加函数
LongAccumulator acc = new LongAccumulator(Long::max, Long.MIN_VALUE);
acc.accumulate(5);   // max(5, Long.MIN_VALUE) = 5
acc.accumulate(3);   // max(3, 5) = 5
acc.accumulate(10);  // max(10, 5) = 10

// DoubleAdder / DoubleAccumulator：浮点版本
```

> 🎯 **选择指南**：低竞争场景用 `AtomicLong`（简单直接），高竞争场景用 `LongAdder`（分段减少竞争），需要 `compareAndSet` 等精细操作只能用 `AtomicLong`。

---

## 五、并发集合

### 5.1 ConcurrentHashMap

已在 [集合框架-Map](../collection/map.md) 中深度分析，这里简要回顾核心演进：

| 版本 | 实现 | 锁粒度 |
|------|------|--------|
| JDK 7 | Segment (ReentrantLock) 分段锁 | 16 个 Segment，每个管一部分桶 |
| JDK 8 | CAS + synchronized | 每个桶的第一个节点 |

```java
// JDK 8 ConcurrentHashMap 核心操作
Map<String, Integer> map = new ConcurrentHashMap<>();

// 线程安全的复合操作
map.putIfAbsent("key", 1);                    // 不存在才插入
map.computeIfAbsent("key", k -> expensive());  // 不存在才计算（原子）
map.computeIfPresent("key", (k, v) -> v + 1); // 存在才更新
map.replace("key", 1, 2);                     // 原子替换（CAS 语义）
```

### 5.2 CopyOnWriteArrayList

**写时复制**——读操作完全无锁，写操作复制整个数组：

```java
// 适合 "读多写极少" 的场景
CopyOnWriteArrayList<String> list = new CopyOnWriteArrayList<>();

// 读操作：无锁，直接读原数组（snapshot）
for (String s : list) {
    System.out.println(s);  // 遍历期间即使有人修改，也不影响此迭代
}

// 写操作：加锁 + 复制 + 替换
list.add("new");  // ReentrantLock 加锁 → 复制新数组 → 替换引用 → 解锁
```

```java
// CopyOnWriteArrayList 的 add 方法（简化）
public boolean add(E e) {
    final ReentrantLock lock = this.lock;
    lock.lock();
    try {
        Object[] elements = getArray();
        int len = elements.length;
        Object[] newElements = Arrays.copyOf(elements, len + 1);
        newElements[len] = e;
        setArray(newElements);  // volatile 写，对所有读线程可见
        return true;
    } finally {
        lock.unlock();
    }
}
```

| 场景 | CopyOnWriteArrayList | Collections.synchronizedList |
|------|:---:|:---:|
| 读多写少 | ✅ 优秀（无锁读） | ❌ 每次都加锁 |
| 写入频繁 | ❌ 差（每次复制整个数组） | ✅ 更好 |
| 数据实时性 | ⚠️ 弱（读的是快照） | ✅ 强（每次读都加锁） |
| 迭代器 | ✅ 不可变快照，不抛 CME | ⚠️ 需手动加锁或用 synchronized 块 |

### 5.3 其他并发集合

```java
// ConcurrentLinkedQueue：无界非阻塞队列（CAS 实现）
ConcurrentLinkedQueue<String> q = new ConcurrentLinkedQueue<>();
q.offer("a");  // CAS 入队
q.poll();      // CAS 出队

// ConcurrentLinkedDeque：无界非阻塞双端队列（CAS 实现）
ConcurrentLinkedDeque<String> dq = new ConcurrentLinkedDeque<>();

// ConcurrentSkipListMap：并发跳表（替代同步版的 TreeMap）
ConcurrentNavigableMap<String, Integer> skipMap = new ConcurrentSkipListMap<>();

// ConcurrentSkipListSet：并发跳表集合（基于 ConcurrentSkipListMap）
ConcurrentSkipListSet<Integer> skipSet = new ConcurrentSkipListSet<>();
```

---

## 六、JUC 工具类全景图

```
                     AQS (AbstractQueuedSynchronizer)
                      │
         ┌────────────┼────────────┬──────────────┐
         │            │            │              │
    独占模式      共享模式      共享+独占混合    不依赖 AQS
         │            │            │              │
    ReentrantLock  CountDownLatch  ReadWriteLock  CyclicBarrier
                   Semaphore      (ReentrantLock
                                    + Condition)

原子类（不依赖 AQS，基于 CAS + volatile）：
  AtomicInteger / AtomicLong / AtomicBoolean
  AtomicReference / AtomicStampedReference
  LongAdder / LongAccumulator (分段累加)

并发集合：
  ConcurrentHashMap  — CAS + synchronized (JDK 8)
  CopyOnWriteArrayList — ReentrantLock + 写时复制
  ConcurrentLinkedQueue — CAS 无锁队列
```

---

## 七、总结

| 工具 | 核心原理 | 使用场景 |
|------|---------|---------|
| CountDownLatch | AQS 共享模式，state=倒数计数 | 主线程等待子任务全部完成 |
| CyclicBarrier | ReentrantLock + Condition | 多个线程互相等待，同时出发 |
| Semaphore | AQS 共享模式，state=许可数 | 限流、控制同时访问资源的线程数 |
| AtomicInteger | CAS + volatile | 计数器、序列号生成 |
| LongAdder | 分段累加 (Striped64) | 高并发计数（比 AtomicLong 快 5-10 倍） |
| AtomicStampedReference | CAS + 版本号 (stamp) | 解决 ABA 问题 |
| CopyOnWriteArrayList | ReentrantLock + 写时复制数组 | 读多写极少的列表 |

下一篇将深入 **线程池**——`ThreadPoolExecutor` 的 7 个核心参数、4 种拒绝策略、线程池的执行流程与动态调优，以及 `ForkJoinPool` 的工作窃取算法。

---

## 参考

- [CountDownLatch JavaDoc](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/CountDownLatch.html)
- [CyclicBarrier JavaDoc](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/CyclicBarrier.html)
- [Semaphore JavaDoc](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/Semaphore.html)
- [AtomicInteger JavaDoc](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/atomic/AtomicInteger.html)
- [LongAdder JavaDoc](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/atomic/LongAdder.html)
- [CopyOnWriteArrayList JavaDoc](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/CopyOnWriteArrayList.html)
- [JavaGuide - JUC 原子类](https://javaguide.cn/java/concurrent/atomic-classes.html)
