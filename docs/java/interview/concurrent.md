---
title: 并发编程面试高频题
icon: bolt
order: 4
category:
  - Java
  - 面试宝典
tag:
  - 并发
  - synchronized
  - AQS
  - 线程池
  - ThreadLocal
  - volatile
---

# 并发编程面试高频题

并发编程是 Java 面试中区分度最高的模块。synchronized 锁升级、AQS、线程池这三道题几乎是中高级面试的"入门券"。以下 8 题覆盖了从锁原理到线程池的高频考点。

---

## Q1: synchronized 锁升级过程 ⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: 锁升级、Mark Word、偏向锁/轻量级锁/重量级锁

> 面试官问："synchronized 在 JDK 6 之后做了哪些优化？锁升级的过程是怎样的？"

### 核心回答

**JDK 1.6 之前**：synchronized 直接使用操作系统的 mutex 锁（重量级锁），每次加锁都涉及**用户态 → 内核态切换**，开销大。这也是早期"StringBuffer/StringBuilder"选择的背景。

**JDK 1.6+ 锁升级路径**（只能升级，不能降级）：

```
无锁状态
   ↓ 第一个线程访问
偏向锁（Biased Locking）
   ↓ 第二个线程竞争
轻量级锁（Lightweight Locking）
   ↓ 自旋失败 或 竞争加剧
重量级锁（Heavyweight Locking）
   ↓
调用 OS mutex，线程阻塞/唤醒
```

**各阶段详解**：

| 锁状态 | 原理 | 适用场景 | Mark Word 存储 |
|--------|------|---------|---------------|
| **偏向锁** | CAS 设置线程 ID，重入无需 CAS | **单线程反复获取** | 线程 ID + Epoch |
| **轻量级锁** | 栈中 Lock Record + CAS 替换 Mark Word | **线程交替执行**（无竞争） | 指向栈中 Lock Record 的指针 |
| **重量级锁** | OS mutex，未抢到的线程阻塞 | **多线程激烈竞争** | 指向 monitor 对象的指针 |

```
锁升级条件：
偏向锁 → 轻量级锁：第二个线程竞争（撤销偏向，升级）
轻量级锁 → 重量级锁：自旋超过一定次数（默认 10 次）或等待线程数超过阈值
```

### 深度扩展

**偏向锁的撤销（开销很大）**：
撤销偏向锁需要在**全局安全点（Safe Point）**暂停拥有该锁的线程，检查它是否还在执行同步块。这就是为什么在竞争激烈的场景下，偏向锁反而变成负担——频繁撤销的代价可能超过偏向锁省下的 CAS 开销。

**JDK 15+ 默认禁用偏向锁**：现代应用大多是高并发的，偏向锁的收益远小于撤销开销。

**轻量级锁的自旋（Spin）**：
- 自旋不会让线程阻塞，而是空转循环等待
- **自适应自旋**：JVM 根据上次自旋时间和锁持有状态动态调整自旋次数
- 优点：避免线程挂起/唤醒的开销（线程切换约耗时 1-10 微秒）
- 缺点：空转消耗 CPU

**测试依据**：
```java
// 查看锁状态（需 JDK 8，JDK 9+ 需额外参数）
// -XX:+PrintBiasedLockingStatistics  -XX:BiasedLockingStartupDelay=0
public synchronized void test() { }
```

### 面试追问

**Q**: 偏向锁延迟（BiasedLockingStartupDelay）为什么默认 4 秒？
**A**: JVM 启动期间大量类加载和初始化使用同步块——此时竞争往往激烈。延迟 4 秒让启动完成后再开启偏向锁。

**Q**: `wait()` 释放锁吗？`sleep()` 呢？
**A**: `wait()` 释放锁（让出 monitor），`sleep()` 不释放锁（抱着锁睡）。

### 常见错误

- ❌ "synchronized 始终很慢"——JDK 6+ 无竞争时性能与 Lock 相当，锁升级后只剩 CAS 开销
- ❌ "锁降级"——synchronized 的锁状态**只升不降**（降级只在 GC 的 safe point 短暂发生）

### 一句话总结

> **无锁 → 偏向（单线程 CAS 免去） → 轻量（线程交替 CAS + 自旋） → 重量（OS mutex 阻塞）。只升不降，逐级膨胀。**

---

## Q2: AQS 原理与 ReentrantLock 实现 ⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: AQS 框架、CLH 队列、公平/非公平锁

> 面试官问："AQS 是什么？ReentrantLock 是如何基于 AQS 实现加锁和释放锁的？"

### 核心回答

**AQS（AbstractQueuedSynchronizer）** = JUC 的基石。它维护了一个 **volatile int state**（同步状态）和一个 **CLH 变体 FIFO 队列**（等待线程队列）。所有 JUC 同步器（ReentrantLock、Semaphore、CountDownLatch、ReentrantReadWriteLock）都是基于它实现的。

```
        ┌──────────────────────────────────┐
        │            AQS                   │
        │  state（volatile int，同步状态）  │
        │  head ←→ Node ←→ ... ←→ tail    │
        │  （CLH 变体 FIFO 双向队列）       │
        └──────┬───────┬───────────────────┘
               │       │
    ┌──────────┘       └──────────┐
    ↓                             ↓
  ReentrantLock                CountDownLatch
  (state: 0=未锁, N=重入N次)    (state: 计数)
    ↓                             
  Semaphore、ReentrantReadWriteLock...
```

**ReentrantLock 如何工作**：

```java
// 非公平锁（默认）
// lock() 流程：
void lock() {
    // ① 先 CAS 抢一次（"插队"——非公平的体现）
    if (compareAndSetState(0, 1)) {
        setExclusiveOwnerThread(currentThread);  // 抢到，结束
    } else {
        acquire(1);  // ② 没抢到，走 AQS 标准流程
    }
}

// AQS.acquire() 标准流程：
// 1. tryAcquire() → 子类实现，CAS 再试一次
// 2. 失败 → addWaiter() → 构建 Node，CAS 加入队尾
// 3. acquireQueued() → 死循环尝试获取锁
//    - 前驱是 head → 再 tryAcquire()
//    - 失败 → shouldParkAfterFailedAcquire() → park() 挂起

// unlock() 流程：
void unlock() {
    // tryRelease() → state-- → 如果是重入锁，减到 0 才释放
    // 释放后 → unparkSuccessor() → 唤醒队头的下一个节点
}
```

**公平锁 vs 非公平锁**：

```java
// 非公平锁（默认）：新来的线程可以直接 CAS 抢锁，不管队列
// 公平锁：新来的线程先检查队列 → 有人排队就乖乖去队尾

// 非公平锁性能更好，因为减少了线程切换（刚释放锁的线程可能立刻又抢到）
// 公平锁不产生"饥饿"，但吞吐量略低
```

### 深度扩展

**Node 的等待状态（waitStatus）**：

| 状态 | 含义 |
|------|------|
| 0 | 初始状态 |
| SIGNAL (-1) | 后继节点需要被唤醒 |
| CONDITION (-2) | 在 Condition 队列中等待 |
| PROPAGATE (-3) | 共享模式下唤醒需要传播 |
| CANCELLED (1) | 超时或中断，已取消 |

```java
// 响应中断：acquireInterruptibly() → park 被中断 → 抛 InterruptedException
// 超时获取：tryAcquireNanos() → parkNanos() 超时返回 false
// 这些变体都是通过 park 的返回值区分"被唤醒"还是"被中断/超时"
```

**可重入性的实现**：

```java
// ReentrantLock.tryAcquire():
if (state == 0) {
    // 没锁，CAS 抢
} else if (currentThread == getExclusiveOwnerThread()) {
    // 自己就是持有者 → state += 1（重入计数）
    int nextc = c + acquires;
    setState(nextc);
    return true;
}
// 释放时 state -= 1，减到 0 才真正释放
```

### 面试追问

**Q**: `Condition` 是怎么实现的？
**A**: AQS 的 `ConditionObject` 维护了另一条**单向链表**（条件队列）。`await()` = 释放锁 + 加入条件队列 + park。`signal()` = 把条件队列的头节点移到 AQS 的阻塞队列尾部。

### 常见错误

- ❌ "ReentrantLock 的 state = 1 表示锁被占用"——不准确，state 是重入计数。0 = 无锁，N = 重入 N 次
- ❌ 搞混非公平锁的"抢"和"插队"——非公平只是在 `lock()` 入口多了一次 CAS，不是无限制插队

### 一句话总结

> **AQS = volatile state + CLH FIFO 队列。state=0 未锁/state>0 重入次数；lock() CAS 抢锁 → 失败入队 park；unlock() state-- → 唤醒后继。**

---

## Q3: ThreadPoolExecutor 7 参数与拒绝策略 ⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: 线程池参数、工作流程、拒绝策略选型

> 面试官问："ThreadPoolExecutor 的 7 个参数分别是什么？任务提交后线程池的执行流程是怎样的？"

### 核心回答

**7 个核心参数**：

```java
new ThreadPoolExecutor(
    corePoolSize,       // ① 核心线程数（常驻，即使空闲也不回收，除非 allowCoreThreadTimeOut）
    maximumPoolSize,    // ② 最大线程数
    keepAliveTime,      // ③ 非核心线程空闲存活时间
    unit,               // ④ 存活时间单位
    workQueue,          // ⑤ 阻塞队列（任务排队的地方）
    threadFactory,      // ⑥ 线程工厂（命名线程、设置守护/优先级）
    handler             // ⑦ 拒绝策略（队列满 + 线程数达到 max）
);
```

**任务提交流程**：

```
新任务 arrive
    ↓
核心线程数 < corePoolSize？
    ├─ 是 → 创建新线程执行（⚡ 即使有空闲核心线程）
    ↓ 否
队列已满？
    ├─ 否 → 任务入队，等待空闲线程取出执行
    ↓ 是
当前线程数 < maximumPoolSize？
    ├─ 是 → 创建新线程执行（非核心线程）
    ↓ 否
执行拒绝策略
```

**关键点**：核心线程满了**不是直接创建新线程**，而是**先放队列**。队列满了才扩容到 max。

**四种拒绝策略**：

| 策略 | 行为 |
|------|------|
| **AbortPolicy**（默认） | 抛 `RejectedExecutionException` |
| **CallerRunsPolicy** | 由**调用线程**直接执行（自然的流量削峰） |
| **DiscardPolicy** | 直接丢弃（无异常） |
| **DiscardOldestPolicy** | 丢弃队列中最老的任务，重新提交 |

### 深度扩展

**如何合理设置线程数？**

```java
// CPU 密集型：线程数 = CPU 核数 + 1
// IO 密集型：线程数 = CPU 核数 * (1 + 平均等待时间 / 平均计算时间)
// 或更简单：线程数 = CPU 核数 * 2（作为起点，结合压测调整）

// 在 Spring Boot 中：
@Bean
public ThreadPoolTaskExecutor taskExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(Runtime.getRuntime().availableProcessors());
    executor.setMaxPoolSize(Runtime.getRuntime().availableProcessors() * 2);
    executor.setQueueCapacity(500);
    executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
    executor.setThreadNamePrefix("async-task-");
    executor.initialize();
    return executor;
}
```

**常见的"坑"**：

1. **用 `Executors.newCachedThreadPool()`**——最大线程数 Integer.MAX_VALUE，流量洪峰时创建海量线程 → OOM
2. **用 `Executors.newFixedThreadPool()` 配合无界队列**——队列无限增长 → OOM
3. **corePoolSize = 0**——所有线程在 keepAliveTime 后被回收，流量高峰时频繁创建/销毁
4. **CallerRunsPolicy 配合异步 Controller**——用调用线程（如 Tomcat 线程）同步执行，导致 HTTP 响应变慢

**Spring 的 `ThreadPoolTaskExecutor` vs JDK `ThreadPoolExecutor`**：
- Spring 的包装类，底层封装了 ThreadPoolExecutor
- 支持 `@Async` 注解
- 可配置 `waitForTasksToCompleteOnShutdown` 优雅关闭

### 面试追问

**Q**: 线程池的核心线程会被回收吗？
**A**: 默认不会。设置 `allowCoreThreadTimeOut(true)` 后，核心线程在空闲超过 keepAliveTime 后也会被回收。

**Q**: 提交任务后线程池怎么知道有没有线程可用？
**A**: 内部 `workers` HashSet + CAS 追加。线程池不预先创建线程（除非 `prestartCoreThread()`），任务来了才根据需要创建。

### 常见错误

- ❌ 选 DiscardPolicy 不记录日志——任务丢了都不知道
- ❌ 主线程等待子线程用 `Thread.sleep()` 估算时间——该用 `Future.get()` 或 `awaitTermination`

### 一句话总结

> **核心 → 队列 → 最大 → 拒绝。优先创建核心线程，满了排队，队列再满才扩到最大，全满则执行拒绝策略。**

---

## Q4: volatile 的可见性原理与内存屏障 ⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: volatile、JMM、内存屏障、Happens-Before

> 面试官问："volatile 关键字的作用是什么？它是如何保证可见性和禁止指令重排的？"

### 核心回答

**volatile 两大作用**：

1. **保证可见性**：一个线程对 volatile 变量的修改，其他线程**立即可见**（读的时候总能读到最新值）
2. **禁止指令重排序**：volatile 变量前后的指令不会被编译器/CPU 重排序

**它不保证原子性**——`volatile int i = 0; i++` 在多线程下仍然不安全（因为 `i++` 是读-改-写 3 步）。

**内存屏障（Memory Barrier）是实现机制**：

```java
// volatile 写：
// ① 插入 StoreStore 屏障 → 保证写之前的普通写已完成
// ② 插入 StoreLoad 屏障 → 保证此次写对后续读可见

// volatile 读：
// ① 插入 LoadLoad 屏障 → 保证读之后的读不会被重排到此次读之前
// ② 插入 LoadStore 屏障 → 保证读之后的写不会被重排到此次读之前
```

**JMM Happens-Before 规则（volatile 相关）**：

> **对一个 volatile 变量的写，Happens-Before 于后续对这个 volatile 变量的读。**

```java
// 线程 A
volatile boolean flag = false;
int data = 0;

data = 42;        // ① 普通写
flag = true;      // ② volatile 写（StoreStore 屏障保证 ① 不会被重排到 ② 之后）

// 线程 B
if (flag) {       // ③ volatile 读
    int x = data; // ④ 由于 HB 规则，① Happens-Before 于 ④ → x = 42
}
```

### 深度扩展

**volatile 的经典用法**：

```java
// 1. 状态标志（停止线程）
class Task implements Runnable {
    private volatile boolean running = true;
    public void run() { while (running) { doWork(); } }
    public void stop() { running = false; }
}

// 2. DCL（Double-Checked Locking）单例
class Singleton {
    private volatile static Singleton instance;  // ← volatile 必须！
    public static Singleton getInstance() {
        if (instance == null) {
            synchronized (Singleton.class) {
                if (instance == null) {
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }
}
```

**为什么 DCL 必须加 volatile？**

```java
// new Singleton() 不是原子操作：
// ① 分配内存
// ② 调用构造函数初始化
// ③ instance 指向分配的内存地址

// 没有 volatile → ② 和 ③ 可能重排 → ③ 先执行
// 线程 A：执行了 ① → ③ → 切换
// 线程 B：看到 instance != null → 返回未初始化的对象！
// volatile 的 StoreLoad 屏障禁止了 ② 和 ③ 的重排序
```

**volatile 不保证原子性的经典场景**：

```java
volatile int count = 0;
// 10 个线程各执行 1000 次 count++
// 最终 count 几乎一定不是 10000
// 因为 count++ = temp = count; temp = temp + 1; count = temp;
// 两步之间可能被其他线程插入
```

### 面试追问

**Q**: volatile 和 atomic 类的区别？
**A**: volatile 保证可见性但不保证原子性；`AtomicInteger` 通过 CAS 同时保证可见性和原子性。

### 常见错误

- ❌ "volatile 变量是线程安全的"——可见 != 原子，`count++` 照样出错
- ❌ DCL 不加 volatile——高版本 JDK 可能因 JIT 优化而不会立即出错，但在理论上不安全

### 一句话总结

> **volatile = 可见性 + 有序性，但 ≠ 原子性。内存屏障禁止重排，写 HP 于后续读。DCL 单例必须 volatile。**

---

## Q5: ThreadLocal 内存泄漏原因与解决方案 ⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: ThreadLocal 原理、弱引用、内存泄漏

> 面试官问："ThreadLocal 为什么会发生内存泄漏？怎么防止？"

### 核心回答

**ThreadLocal 内部结构**：

```
Thread
  └── threadLocals (ThreadLocalMap)
       └── Entry[] (数组)
            └── Entry: key(弱引用 → ThreadLocal) + value(强引用 → 数据)
```

**内存泄漏的原因**：

```java
// 关键：Entry 的 key 是弱引用，value 是强引用！
static class Entry extends WeakReference<ThreadLocal<?>> {
    Object value;  // ← 强引用！问题就在这里
}

// 泄漏链路：
// 1. 外部失去了对 ThreadLocal 对象的强引用
// 2. GC 时，Entry 的 key（弱引用）被回收 → key = null
// 3. 但 value 仍然是强引用，无法被 GC
// 4. Thread → ThreadLocalMap → Entry → value（永远不会被回收！）
// 5. 线程池中线程复用 → Thread 一直存活 → value 一直泄漏
```

**解决方案**：

```java
// ✅ 方案 1：每次用完必须 remove()
ThreadLocal<UserContext> context = new ThreadLocal<>();
try {
    context.set(new UserContext(user));
    // 业务逻辑...
} finally {
    context.remove();  // 必！须！调！用！
}

// ✅ 方案 2：JDK 8 之后 ThreadLocal 的 get/set 方法
// 在发现 key == null 的 Entry 时，会自动清理（expungeStaleEntry）
// 但这只是"补救"，不保证一定及时清理
```

### 深度扩展

**为什么 Entry 的 key 用弱引用？**
这是一个"两害相权取其轻"的设计——如果 key 也是强引用，那么只要 Thread 活着，ThreadLocal 就永远不会被回收。弱引用允许 ThreadLocal 本身被回收，而 value 的泄漏通过 `remove()` 或 JDK 8 的自动清理来解决。

**四种引用在 ThreadLocal 中的体现**：

```
ThreadLocalRef（强引用）→ ThreadLocal 对象
                              ↑
Entry.key（弱引用）────────────┘
Entry.value（强引用）→ 业务数据
```

**线程池场景下的泄漏**：

```java
// 线程池线程复用时，ThreadLocal 不清 → 上次请求的数据污染下次请求
// 例如：用户认证信息 ThreadLocal 不清 → 另一个用户看到前一个用户的数据
// 这是比内存泄漏更严重的安全问题！

// ✅ Tomcat filter 处理完后清理：
filterChain.doFilter(request, response);
// 在 finally 中清理所有 ThreadLocal
```

### 面试追问

**Q**: 除了 `remove()`，还有什么办法防止内存泄漏？
**A**: 可以使用`InheritableThreadLocal`（父子线程传递）或使用框架帮你管理的 ThreadLocal（如 Spring 的 `RequestContextHolder`，在请求结束后自动清理）。但最可靠的还是手动 `remove()`。

### 常见错误

- ❌ "在线程池中用了 ThreadLocal 但从没调用 remove()"——这是最常见的泄漏场景
- ❌ 在 finally 中忘了 remove()

### 一句话总结

> **key 弱引用会 GC，value 强引用不会。线程池 + 忘 remove = 内存泄漏 + 数据串台。finally 中 remove 是铁律。**

---

## Q6: CAS 原理与 ABA 问题 ⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: CAS 原理、unsafe、ABA

> 面试官问："CAS 是什么？它是如何实现的？ABA 问题是什么，怎么解决？"

### 核心回答

**CAS（Compare And Swap）** = 乐观锁的底层实现。一条 CPU 原子指令（`cmpxchg`），包含 3 个操作数：

```
CAS(V, A, B)：如果内存位置 V 的值 == 期望值 A，则更新为 B
```

```java
// AtomicInteger.incrementAndGet() 底层
public final int incrementAndGet() {
    return unsafe.getAndAddInt(this, valueOffset, 1) + 1;
}

// Unsafe.getAndAddInt 的核心循环：
while (!compareAndSwapInt(obj, offset, expect, expect + 1))
    // CAS 失败 → 重试 → 重新读 expect
```

**ABA 问题**：

```
时间线：
T0: 变量 V = A
T1: 线程 1 CAS(A → B)，成功，V = B
T2: 线程 1 CAS(B → A)，成功，V = A
T3: 线程 2 CAS(A → C)，成功（以为 V 没变过！）

表面上看 V 还是 A，但实际上已经被改过又改回来了
```

**解决方案——版本号**：

```java
// AtomicStampedReference：带有"戳记"（版本号）的 CAS
AtomicStampedReference<Integer> ref = new AtomicStampedReference<>(100, 0);
int stamp = ref.getStamp();

// CAS 时同时检查值和版本号
boolean ok = ref.compareAndSet(100, 200, stamp, stamp + 1);
// 两对值比较 → 值(100→200) + 版本号(0→1)

// AtomicMarkableReference：简化版，只标记 true/false（如垃圾回收标记）
```

### 深度扩展

**CAS 的性能问题**：

1. **自旋开销**：高竞争下 CAS 循环消耗 CPU——这就是为什么高竞争场景更适合用锁（没抢到的线程 park 而不是空转）
2. **多变量 CAS**：不能同时 CAS 多个变量——用 `AtomicReference` 把多个字段封装成不可变对象再整体 CAS
3. **只能保证一个共享变量的原子操作**——JDK 9 的 `VarHandle` 部分缓解了这个问题

**synchronized vs CAS 的选择**：

```java
// 低竞争：CAS（无锁，吞吐量高）
AtomicInteger counter = new AtomicInteger();

// 高竞争：synchronized / Lock（自旋失败后线程挂起，不浪费 CPU）
synchronized (lock) { counter++; }

// 实际应用：ConcurrentHashMap 1.8 
// 桶为空 → CAS 插入（无锁，低竞争场景）
// 桶非空 → synchronized 锁桶（有锁，避免 CAS 空转）
```

### 面试追问

**Q**: Java 中的 CAS 底层是用什么实现的？
**A**: `Unsafe.compareAndSwapInt()` → native → `cmpxchg` CPU 指令（x86）。同时配合 `lock` 前缀保证多核环境下的可见性（锁缓存行/总线）。

### 常见错误

- ❌ "AtomicInteger 完全不阻塞，所以比 synchronized 快"——高竞争下 CAS 空转可能比 synchronized 更耗 CPU
- ❌ 忽略 ABA 问题——虽然多数场景不致命，但链式数据结构（链表、栈）中可能导致丢失节点

### 一句话总结

> **CAS = CPU 原子指令 cmpxchg。ABA 用版本号（AtomicStampedReference）解决。低竞争用 CAS，高竞争用锁。**

---

## Q7: CountDownLatch / CyclicBarrier / Semaphore 区别 ⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: 并发工具类、使用场景

> 面试官问："CountDownLatch、CyclicBarrier、Semaphore 分别用于什么场景？有什么区别？"

### 核心回答

| 工具 | 作用 | 核心差异 |
|------|------|---------|
| **CountDownLatch** | 一个线程等待 N 个线程完成任务 | **一次性**，count=0 后不可重置 |
| **CyclicBarrier** | N 个线程互相等待，都到齐后**一起继续** | **可循环**使用，支持回调 |
| **Semaphore** | 控制**同时访问**的线程数 | 许可证可以**获取和释放** |

```java
// CountDownLatch：主线程等子线程完成
CountDownLatch latch = new CountDownLatch(3);
for (int i = 0; i < 3; i++) {
    new Thread(() -> {
        doWork();
        latch.countDown();  // 减一
    }).start();
}
latch.await();  // 阻塞，直到 count = 0
System.out.println("全部完成！");

// CyclicBarrier：N 个人都到了才开会
CyclicBarrier barrier = new CyclicBarrier(5, () -> 
    System.out.println("人到齐了，开会！"));
for (int i = 0; i < 5; i++) {
    new Thread(() -> {
        arrive();
        barrier.await();  // 都到了才继续
        discuss();        // 所有人一起从这里继续
    }).start();
}
// barrier.reset() 可以重置循环使用

// Semaphore：停车场只有 3 个车位
Semaphore semaphore = new Semaphore(3);  // 3 个许可
semaphore.acquire();  // 获取许可（没许可就阻塞）
doSomething();
semaphore.release();  // 归还许可
```

### 深度扩展

**CyclicBarrier 的内部实现**：使用 ReentrantLock + Condition。每次 `await()` → `--count` → 如果 count != 0 则 `trip.await()` → 否则 `trip.signalAll()` + 执行 barrierAction。

**为什么 CountDownLatch 不能重置？**
CountDownLatch 共享的是"等待事件发生"的语义——事件发生后就过去了，不能"反发生"。CyclicBarrier 共享的是"同步点"的语义，可以重复使用。

**Semaphore 的公平模式**：

```java
// 公平 Semaphore：按等待时间顺序发放许可
Semaphore fair = new Semaphore(5, true);  // 第二个参数 = 公平

// 非公平 Semaphore（默认）：新来的线程可以直接 CAS 抢许可
// 类似于 ReentrantLock 的公平/非公平选择
```

### 面试追问

**Q**: `CyclicBarrier` 的 `await()` 抛 `BrokenBarrierException` 是什么意思？
**A**: 屏障被破坏——某个等待线程超时或被中断，屏障不再完整。可以通过 `isBroken()` 检查。

### 常见错误

- ❌ "CountDownLatch 是所有线程互相等待"——是**一个**等**多个**，不是互相等
- ❌ CyclicBarrier 忘记处理 await 的异常

### 一句话总结

> **Latch = 一等多（一次性），Barrier = 多互等（可循环），Semaphore = 限流（许可证）。**

---

## Q8: CompletableFuture 的使用与原理 ⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: 异步编排、Future 增强

> 面试官问："CompletableFuture 相比 Future 有什么优势？常用的编排方法有哪些？"

### 核心回答

**Future 的局限**：
- `get()` 会阻塞调用线程
- 不支持回调
- 不支持多个 Future 的组合（并行查两个 API，合并结果）
- 没有异常处理机制

**CompletableFuture 解决了以上所有问题**：

```java
// 1. 异步执行 + 回调
CompletableFuture.supplyAsync(() -> getUserInfo(userId))
    .thenApply(user -> enrichUser(user))        // 转换结果
    .thenAccept(user -> saveToCache(user))      // 消费结果（不返回）
    .exceptionally(e -> { log.error(e); return null; });  // 异常处理

// 2. 组合两个异步结果
CompletableFuture<User> userFuture = CompletableFuture.supplyAsync(() -> getUser(id));
CompletableFuture<Order> orderFuture = CompletableFuture.supplyAsync(() -> getOrder(id));
CompletableFuture<Result> resultFuture = userFuture.thenCombine(orderFuture, 
    (user, order) -> new Result(user, order));  // 两者都完成后合并

// 3. 任一完成即处理
CompletableFuture.anyOf(future1, future2, future3)
    .thenAccept(result -> System.out.println("最快的返回了: " + result));

// 4. 全部完成后处理
CompletableFuture.allOf(future1, future2, future3)
    .thenRun(() -> System.out.println("全部完成"));
```

**常用 API 速查**：

| 方法 | 输入 | 输出 | 说明 |
|------|------|------|------|
| `thenApply` | T → U | `CF<U>` | 转换结果 |
| `thenAccept` | T → void | `CF<Void>` | 消费结果 |
| `thenRun` | 无 → void | `CF<Void>` | 执行后续动作 |
| `thenCombine` | (T, U) → V | `CF<V>` | 合并两个 CF 结果 |
| `thenCompose` | T → `CF<U>` | `CF<U>` | 扁平化串联（防嵌套 CF） |
| `applyToEither` | T → U | `CF<U>` | 任一个完成就执行 |
| `exceptionally` | Throwable → T | `CF<T>` | 异常恢复 |
| `handle` | (T, Throwable) → U | `CF<U>` | 结果 + 异常一起处理 |

### 深度扩展

**thenApply vs thenCompose**：

```java
// thenApply：同步转换，返回 CompletableFuture<CompletableFuture<U>>（嵌套）
CompletableFuture<CompletableFuture<User>> nested = 
    CompletableFuture.supplyAsync(() -> id)
        .thenApply(id -> CompletableFuture.supplyAsync(() -> getUser(id)));

// thenCompose：扁平化，返回 CompletableFuture<U>
CompletableFuture<User> flat = 
    CompletableFuture.supplyAsync(() -> id)
        .thenCompose(id -> CompletableFuture.supplyAsync(() -> getUser(id)));
```

**线程池注意事项**：

```java
// ❌ 默认使用 ForkJoinPool.commonPool()（共享池，不适合 IO 密集型）
CompletableFuture.supplyAsync(() -> blockingIO());

// ✅ 传入自定义线程池
Executor executor = Executors.newFixedThreadPool(10);
CompletableFuture.supplyAsync(() -> blockingIO(), executor);

// thenApplyAsync vs thenApply
// thenApply：使用前一个任务的线程执行
// thenApplyAsync：使用指定（或默认）线程池执行
```

### 面试追问

**Q**: 多个 CompletableFuture 都完成后拿到所有结果，怎么写？
**A**: `allOf(...).thenApply(v -> futures.stream().map(CompletableFuture::join).collect(toList()))`。

### 常见错误

- ❌ 用 `join()` 阻塞等待而不加超时——和 Future.get() 一样的问题
- ❌ 在 `supplyAsync` 中使用共享的 ForkJoinPool 执行 IO——应该用自定义线程池

### 一句话总结

> **CompletableFuture = 异步 + 回调 + 编排 + 异常处理。thenApply 转换，thenCombine 合并，thenCompose 扁平化，exceptionally 兜底。**

---

## 参考阅读

- [并发编程基础](../concurrent/basics.md)
- [锁机制详解](../concurrent/lock.md)
- [JUC 工具类](../concurrent/juc-tools.md)
- [线程池详解](../concurrent/threadpool.md)
- [ThreadLocal 详解](../concurrent/threadlocal.md)
