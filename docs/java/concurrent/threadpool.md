---
title: 线程池详解
icon: layer-group
order: 4
category:
  - Java
  - 并发编程
tag:
  - 线程池
  - ThreadPoolExecutor
  - ForkJoinPool
  - 拒绝策略
---

# 线程池详解：从 ThreadPoolExecutor 到 ForkJoinPool

> 📖 线程池是 Java 并发编程中最常用的基础设施——合理配置的线程池能成倍提升系统吞吐量，而不合理的配置可能引发 OOM 或性能雪崩。本文从 `ThreadPoolExecutor` 的 7 个核心参数出发，逐层剖析线程池的执行流程、拒绝策略、正确关闭姿势，以及 `ForkJoinPool` 的工作窃取算法。

---

## 一、为什么需要线程池？

直接 `new Thread()` 的三大痛点：

```
问题 1：创建/销毁开销大
  每次 new Thread() → JVM 调用 OS 创建内核线程 → 用完销毁
  处理一个请求只需 1ms，创建线程却花了 0.5ms

问题 2：线程数不可控
  请求高峰 → 无限制创建线程 → CPU 频繁上下文切换 → 性能雪崩
  每个线程默认占用约 1MB 栈内存，10000 个线程 ≈ 10GB 内存 → OOM

问题 3：缺乏管理能力
  无法统计线程执行情况
  无法优雅关闭
  任务与线程强耦合
```

**线程池的解决方案**：

- **复用线程**：线程用完不销毁，放回池中供下次使用
- **控制数量**：限制最大线程数，防止资源耗尽
- **任务解耦**：提交任务 ≠ 创建线程，任务排队等待执行
- **可管理**：统计、监控、优雅关闭

---

## 二、ThreadPoolExecutor 的 7 个核心参数

```java
public ThreadPoolExecutor(
    int corePoolSize,              // ① 核心线程数
    int maximumPoolSize,           // ② 最大线程数
    long keepAliveTime,            // ③ 空闲线程存活时间
    TimeUnit unit,                 // ④ 时间单位
    BlockingQueue<Runnable> workQueue,  // ⑤ 任务队列
    ThreadFactory threadFactory,   // ⑥ 线程工厂
    RejectedExecutionHandler handler    // ⑦ 拒绝策略
)
```

| 参数 | 含义 | 常见配置误区 |
|------|------|------------|
| `corePoolSize` | 常驻线程数（即使空闲也不回收，除非 `allowCoreThreadTimeOut(true)`） | 设太小——CPU 空闲但任务排队；设太大——内存浪费 |
| `maximumPoolSize` | 允许的最大线程数 | 设太大——线程爆炸；设等于 corePoolSize——无弹性 |
| `keepAliveTime` | 超过 corePoolSize 的空闲线程存活时间 | 0 表示立即回收（非核心线程） |
| `workQueue` | 任务暂存队列 | **最常见的坑**：用了无界队列导致 max 参数失效 |
| `threadFactory` | 创建新线程的工厂（命名、设置守护、优先级） | 不自定义——线程全叫 `pool-1-thread-1`，排查困难 |
| `handler` | 线程池满载 + 队列满时的处理策略 | 不配置 → 默认抛异常，可能导致任务丢失 |

---

## 三、☆ 线程池执行流程（面试高频）

```
新任务提交
    │
    ▼
┌─────────────────────────┐
│ 当前线程数 < corePoolSize ? │
└──────────┬──────────────┘
     YES   │         NO
     ▼     │         ▼
  创建新线程  │  ┌────────────────────┐
  执行任务    │  │ workQueue.offer()  │
             │  │   任务能入队？       │
             │  └──────┬─────────────┘
             │    YES  │        NO（队列满）
             │    ▼    │        ▼
             │  任务排队  │  ┌───────────────────────────┐
             │  等待执行  │  │ 当前线程数 < maximumPoolSize? │
             │          │  └──────┬────────────────────┘
             │          │    YES  │        NO
             │          │    ▼    │        ▼
             │          │  创建新线程 │   ┌──────────────┐
             │          │  执行任务   │   │ 拒绝策略处理  │
             │          │            │   └──────────────┘
```

```java
// 验证执行流程
ThreadPoolExecutor executor = new ThreadPoolExecutor(
    2,      // corePoolSize
    4,      // maximumPoolSize
    60, TimeUnit.SECONDS,
    new ArrayBlockingQueue<>(3)  // 有界队列，容量 3
);

// 提交 8 个任务
for (int i = 0; i < 8; i++) {
    final int id = i;
    try {
        executor.execute(() -> {
            System.out.println("Task-" + id + " started by " +
                Thread.currentThread().getName());
            try { Thread.sleep(5000); } catch (InterruptedException e) { }
        });
        System.out.println("Task-" + id + " submitted, poolSize="
            + executor.getPoolSize() + ", queueSize="
            + executor.getQueue().size());
    } catch (RejectedExecutionException e) {
        System.out.println("Task-" + id + " REJECTED!");
    }
}
// 执行结果分析：
// Task 0-1：直接创建核心线程（corePoolSize=2）
// Task 2-4：入队（队列容量 3）
// Task 5-6：core 满了 + 队列满了 → 创建非核心线程（最多到 max=4）
// Task 7：  队列满 + 线程数=max → 触发拒绝策略
```

### 3.1 workQueue 的三种选择

| 队列类型 | 特点 | 适用场景 |
|---------|------|---------|
| `ArrayBlockingQueue` | 有界数组队列，需指定容量 | **推荐**，避免无限堆积 |
| `LinkedBlockingQueue` | 链表队列，默认 `Integer.MAX_VALUE`（无界！） | ⚠️ 必须指定容量，否则 OOM |
| `SynchronousQueue` | 无容量，任务必须立即被线程处理 | CachedThreadPool，适合快速完成的短任务 |
| `PriorityBlockingQueue` | 无界优先级队列 | 按优先级执行的任务 |
| `DelayedWorkQueue` | 延迟队列（内部使用） | ScheduledThreadPoolExecutor |

> 🎯 **核心原则**：**永远使用有界队列**。无界队列（`LinkedBlockingQueue` 默认）会让 `maximumPoolSize` 形同虚设——任务全部入队，永远不创建新线程，最终 OOM。

---

## 四、4 种拒绝策略

当线程数 = maximumPoolSize 且队列满时，触发**拒绝策略**：

### 4.1 AbortPolicy（默认）

```java
// 直接抛出 RejectedExecutionException
ThreadPoolExecutor executor = new ThreadPoolExecutor(
    1, 1, 0, TimeUnit.SECONDS,
    new ArrayBlockingQueue<>(1),
    new ThreadPoolExecutor.AbortPolicy()  // 默认，可省略
);

executor.execute(() -> { while (true) {} });  // 占用唯一线程
executor.execute(() -> {});  // 入队
executor.execute(() -> {});  // 触发 AbortPolicy → RejectedExecutionException
```

### 4.2 CallerRunsPolicy

```java
// 由提交任务的线程（调用者）自己执行
new ThreadPoolExecutor.CallerRunsPolicy()

// 效果：主线程 execute() 被阻塞，直到任务执行完
// 优点：自带"反压"效果——提交速度自动变慢
// 缺点：主线程被占用，可能影响其他逻辑
```

### 4.3 DiscardPolicy

```java
// 直接丢弃，不抛异常（静静丢弃）
new ThreadPoolExecutor.DiscardPolicy()

// ⚠️ 危险！任务可能被静默丢弃，排查困难
```

### 4.4 DiscardOldestPolicy

```java
// 丢弃队列中最老的任务，然后重试 execute
new ThreadPoolExecutor.DiscardOldestPolicy()

// 效果：最新任务优先（LIFO 偏向）
// 适合消息具有时效性的场景（旧消息已无价值）
```

### 4.5 自定义拒绝策略

```java
RejectedExecutionHandler customHandler = (r, executor) -> {
    // 方案 1：记录日志 + 重试
    System.err.println("Task rejected: " + r + ", retrying in 1s...");
    try { Thread.sleep(1000); } catch (InterruptedException e) { }
    executor.execute(r);  // 重试（可能再次被拒 → 递归风险）

    // 方案 2：降级——写入 MQ / 数据库
    // messageQueue.send(r);
};

// 方案 3：实现类似 Dubbo 的"抛异常 + 日志"策略
// 同时上报监控指标 → 触发告警
```

---

## 五、Executors 工厂方法 —— 为什么阿里规约禁止？

### 5.1 四种工厂方法及其陷阱

```java
// ❌ newFixedThreadPool(n)：核心=n, 最大=n, 队列无界
// 问题：无界队列 → 任务堆积 → OOM
public static ExecutorService newFixedThreadPool(int nThreads) {
    return new ThreadPoolExecutor(nThreads, nThreads,
            0L, TimeUnit.MILLISECONDS,
            new LinkedBlockingQueue<Runnable>());  // ← 默认 Integer.MAX_VALUE!
}

// ❌ newCachedThreadPool()：核心=0, 最大=Integer.MAX_VALUE, SynchronousQueue
// 问题：每来一个任务就创建一个线程（没空闲时）→ 线程爆炸 → OOM
public static ExecutorService newCachedThreadPool() {
    return new ThreadPoolExecutor(0, Integer.MAX_VALUE,
            60L, TimeUnit.SECONDS,
            new SynchronousQueue<Runnable>());
}

// ❌ newSingleThreadExecutor()：核心=1, 最大=1, 队列无界
// 问题：同 FixedThreadPool，无界队列 → OOM
public static ExecutorService newSingleThreadExecutor() {
    return new FinalizableDelegatedExecutorService(
        new ThreadPoolExecutor(1, 1,
                0L, TimeUnit.MILLISECONDS,
                new LinkedBlockingQueue<Runnable>()));  // ← 还是无界！
}

// ⚠️ newScheduledThreadPool(n)：最大=Integer.MAX_VALUE
// 可用于定时任务，但要注意最大线程数
```

### 5.2 正确的创建方式

```java
// ✅ 手动 new ThreadPoolExecutor，所有参数显式指定
ThreadPoolExecutor executor = new ThreadPoolExecutor(
    4,                                        // 核心线程数
    8,                                        // 最大线程数
    60, TimeUnit.SECONDS,                     // 空闲 60s 回收
    new ArrayBlockingQueue<>(200),            // 有界队列 200
    new ThreadFactory() {                     // 自定义线程工厂
        private final AtomicInteger counter = new AtomicInteger(1);
        @Override
        public Thread newThread(Runnable r) {
            Thread t = new Thread(r, "order-processor-" + counter.getAndIncrement());
            t.setUncaughtExceptionHandler((th, ex) ->
                log.error("Uncaught in thread " + th.getName(), ex));
            return t;
        }
    },
    new ThreadPoolExecutor.CallerRunsPolicy() // 拒绝策略
);

// 允许核心线程超时回收（提高资源利用率）
executor.allowCoreThreadTimeOut(true);
```

---

## 六、线程池监控与调优

### 6.1 关键监控指标

```java
ThreadPoolExecutor executor = ...;

// 核心指标
executor.getPoolSize();             // 当前线程数（含核心+非核心）
executor.getActiveCount();          // 正在执行任务的线程数
executor.getQueue().size();         // 队列中等待的任务数
executor.getCompletedTaskCount();   // 已完成任务总数（累计）
executor.getLargestPoolSize();      // 历史最大线程数
executor.getTaskCount();            // 历史总任务数（含已完成+队列中+正在执行）

// 状态判断
executor.isShutdown();
executor.isTerminating();
executor.isTerminated();
```

### 6.2 线程数如何设置？

没有银弹公式，但有参考思路：

```java
// CPU 密集型：线程数 = CPU 核心数 + 1
// 原因：线程一直在计算，太多会导致频繁上下文切换
int cpuCores = Runtime.getRuntime().availableProcessors();
int poolSize = cpuCores + 1;

// I/O 密集型：线程数 = CPU 核心数 * (1 + 平均等待时间 / 平均计算时间)
// 或简化为：CPU 核心数 * 2
// 原因：线程大部分时间在等 I/O，多些线程可以"填满"CPU

// 混合型：分开用不同的线程池处理
// 或通过压测找到最佳值
```

> 🎯 **最佳实践**：不要拍脑袋定线程数。先基于上述公式给一个初始值，然后**压测**找到最佳配置。线程池参数应该做成**可动态调整的配置**（如配置中心下发），而不是硬编码。

### 6.3 优雅关闭

```java
// ❌ 错误做法 1：直接杀进程
// ❌ 错误做法 2：不管线程池，JVM 退出时任务丢失

// ✅ 正确姿势：分步关闭
executor.shutdown();  // ① 停止接收新任务，等待已提交任务完成

try {
    // ② 等待一段时间让任务执行完
    if (!executor.awaitTermination(60, TimeUnit.SECONDS)) {
        executor.shutdownNow();  // ③ 超时：强制中断
        // ④ 再等一等
        if (!executor.awaitTermination(10, TimeUnit.SECONDS)) {
            System.err.println("线程池未能完全关闭");
        }
    }
} catch (InterruptedException e) {
    executor.shutdownNow();  // 被中断也尝试 shutdownNow
    Thread.currentThread().interrupt();  // 保留中断状态
}
```

`shutdown()` vs `shutdownNow()`：

| 方法 | 停止接收新任务 | 处理队列中任务 | 中断执行中线程 | 返回 |
|------|:---:|:---:|:---:|------|
| `shutdown()` | ✅ | ✅ 会处理完 | ❌ | void |
| `shutdownNow()` | ✅ | ❌ 不处理 | ✅ 中断 | `List<Runnable>` 未执行的任务 |

---

## 七、线程池的 5 种状态

```java
// ThreadPoolExecutor 内部用一个 AtomicInteger ctl 同时维护
//   - 高 3 位：运行状态
//   - 低 29 位：工作线程数

// 5 种状态的生命周期：
private static final int RUNNING    = -1 << COUNT_BITS;  // 接受新任务 + 处理队列
private static final int SHUTDOWN   =  0 << COUNT_BITS;  // 不接受新任务，处理队列
private static final int STOP       =  1 << COUNT_BITS;  // 不接受新任务，不处理队列，中断线程
private static final int TIDYING    =  2 << COUNT_BITS;  // 所有任务终止，workerCount=0
private static final int TERMINATED =  3 << COUNT_BITS;  // terminated() 已调用
```

```
状态转换：

   RUNNING ── shutdown() ──▶ SHUTDOWN ── 队列空+线程空 ──▶ TIDYING ──▶ TERMINATED
      │                        │
      └── shutdownNow() ──────▶ STOP ──── 线程空 ──────────▶ TIDYING ──▶ TERMINATED
```

---

## 八、☆ ForkJoinPool —— 工作窃取算法

### 8.1 与 ThreadPoolExecutor 的本质区别

```
ThreadPoolExecutor：一个共享队列 + 多个线程
  [任务1][任务2][任务3][任务4][任务5]  ← 共享队列（所有线程竞争）
     ↑      ↑
  Thread A  Thread B

ForkJoinPool：每个线程有自己的双端队列 + 工作窃取
  Thread A: [任务1][任务2][任务3]  ← 自己的 deque（尾部操作，无竞争）
  Thread B: [任务4][任务5]        ← 自己的 deque
             ↑
          Thread B 空闲时从 Thread A 的 deque **头部**偷任务！
```

### 8.2 工作窃取（Work-Stealing）

```java
// ForkJoinPool 的核心思想：
// 1. 每个工作线程有自己的双端队列（deque）
// 2. 线程从自己队列的尾部（LIFO）取任务——无竞争
// 3. 线程空闲时，从其他线程队列的头部（FIFO）偷任务
//    —— 大任务通常在头部（刚 fork），偷大任务性价比最高

// ForkJoinTask 的两个核心方法
// fork():   将任务放入当前线程的队列（异步执行）
// join():   等待任务结果（阻塞）
```

### 8.3 使用示例

```java
// 递归任务：计算 1+2+...+n（fork/join 框架的 Hello World）
class SumTask extends RecursiveTask<Long> {
    private static final int THRESHOLD = 10_000;
    private final long start, end;

    SumTask(long start, long end) {
        this.start = start;
        this.end = end;
    }

    @Override
    protected Long compute() {
        if (end - start <= THRESHOLD) {
            // 任务足够小 → 直接计算
            long sum = 0;
            for (long i = start; i <= end; i++) sum += i;
            return sum;
        }
        // 任务太大 → 一分为二
        long mid = (start + end) >>> 1;
        SumTask left = new SumTask(start, mid);
        SumTask right = new SumTask(mid + 1, end);
        left.fork();                         // 异步执行左半部分
        long rightResult = right.compute();  // 同步执行右半部分
        long leftResult = left.join();       // 等待左半部分
        return leftResult + rightResult;
    }
}

// 运行
ForkJoinPool pool = new ForkJoinPool();  // 或 ForkJoinPool.commonPool()
long result = pool.invoke(new SumTask(1, 100_000_000));
System.out.println(result);
```

### 8.4 ForkJoinPool.commonPool()

JDK 8 的 `parallelStream()` 默认使用 `ForkJoinPool.commonPool()`：

```java
// 以下两行使用同一个线程池
list.parallelStream().forEach(...);
CompletableFuture.supplyAsync(() -> ...);  // 不带 Executor 参数时
// commonPool 默认线程数 = CPU 核心数 - 1（至少为 1）

// ⚠️ 注意：如果在 commonPool 中执行阻塞任务（如 I/O），
// 可能导致所有 commonPool 线程被阻塞 → 整个应用卡死！
// 解决：对阻塞任务使用自定义线程池
ForkJoinPool customPool = new ForkJoinPool(10);
customPool.submit(() -> list.parallelStream().forEach(...));
```

### 8.5 ForkJoinPool vs ThreadPoolExecutor

| 对比维度 | ThreadPoolExecutor | ForkJoinPool |
|---------|:---:|:---:|
| 任务模型 | 独立任务 | 可分解为子任务（分治） |
| 队列结构 | 一个共享队列 | 每个线程一个双端队列 |
| 空闲处理 | 线程等待 | 工作窃取 |
| 适用场景 | Web 请求处理、独立异步任务 | 递归分解（排序、求和、遍历） |
| 线程数 | 固定（core/max） | 默认 CPU 核心数 |
| 任务类型 | Runnable / Callable | ForkJoinTask (RecursiveTask/RecursiveAction) |

---

## 九、总结

| 知识点 | 核心要点 |
|--------|---------|
| 7 个参数 | corePoolSize, maxPoolSize, keepAliveTime, unit, workQueue, threadFactory, handler |
| 执行流程 | 核心线程 → 入队 → 非核心线程 → 拒绝策略 |
| 有界队列 | **必须使用**，否则 maxPoolSize 失效 + OOM 风险 |
| 4 种拒绝策略 | AbortPolicy (抛异常), CallerRunsPolicy (反压), DiscardPolicy (丢弃), DiscardOldestPolicy (丢最旧) |
| Executors 工厂 | 阿里规约禁止：无界队列/无限线程 → OOM，推荐手动构造 |
| 线程数设置 | CPU 密集型：N+1；IO 密集型：N×2；实际要压测 |
| 优雅关闭 | shutdown() → awaitTermination() → shutdownNow() |
| ForkJoinPool | 工作窃取；每个线程一个 deque；parallelStream 默认用 commonPool |
| 阻塞陷阱 | 不要在 commonPool 中执行阻塞 I/O 任务 |

下一篇将深入 **ThreadLocal**——线程本地变量的实现原理、`ThreadLocalMap` 的弱引用设计、内存泄漏的根本原因与解决方案，以及阿里巴巴开源的 `TransmittableThreadLocal`。

---

## 参考

- [ThreadPoolExecutor JavaDoc (JDK 17)](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ThreadPoolExecutor.html)
- [ForkJoinPool JavaDoc (JDK 17)](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ForkJoinPool.html)
- [阿里巴巴 Java 开发手册 - 线程池](https://github.com/alibaba/p3c)
- [Brian Goetz - Java Concurrency in Practice, Chapter 6-8](https://jcip.net/)
- [Doug Lea - Fork/Join Framework Paper](http://gee.cs.oswego.edu/dl/papers/fj.pdf)
