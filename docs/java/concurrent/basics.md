---
title: 并发编程基础
icon: bolt
order: 1
category:
  - Java
  - 并发编程
tag:
  - 线程
  - synchronized
  - volatile
  - wait-notify
  - 锁升级
  - JMM
---

# 并发编程基础：线程、锁与内存可见性

> 📖 并发编程是 Java 高级开发的分水岭。从线程的创建方式到 `synchronized` 的锁升级过程（偏向锁→轻量级锁→重量级锁），从 `volatile` 的底层内存屏障到 `wait/notify` 的正确姿势——本文覆盖并发编程的核心基础知识，为后续 AQS、线程池、JUC 工具类打下坚实基础。

---

## 一、并发与并行

在深入并发编程之前，先厘清两个基本概念：

```
并发 (Concurrency)：同一时间段内，多个任务交替执行
并行 (Parallelism)：同一时刻，多个任务同时执行（需要多核 CPU）

操作系统视角：
  CPU 核心 1：  [任务A]──[任务B]──[任务A]──[任务B]──   ← 并发
  CPU 核心 1：  [任务A]────────[任务A]──────────────   ← 并行
  CPU 核心 2：  [任务B]────────[任务B]──────────────
```

**为什么要用并发？**

- **充分利用多核 CPU**：单线程只能跑满一个核心
- **提高响应速度**：主线程不阻塞，后台线程处理耗时任务
- **提高吞吐量**：一个请求一个线程，同时处理多个请求
- **简化建模**：某些场景（如生产者-消费者）天然适合多线程建模

---

## 二、线程的创建方式

### 2.1 继承 Thread 类

```java
class MyThread extends Thread {
    @Override
    public void run() {
        System.out.println(Thread.currentThread().getName() + " is running");
    }
}

// 使用
MyThread t = new MyThread();
t.start();  // ✅ 启动新线程，JVM 回调 run()
// t.run(); // ❌ 只是普通方法调用，不会创建新线程
```

> ⚠️ **注意**：`start()` 只能调用一次，重复调用会抛出 `IllegalThreadStateException`。`start()` 底层调用 `native` 方法，由操作系统创建真正的线程。

### 2.2 实现 Runnable 接口

```java
class MyRunnable implements Runnable {
    @Override
    public void run() {
        System.out.println(Thread.currentThread().getName() + " is running");
    }
}

// 使用
Thread t = new Thread(new MyRunnable());
t.start();

// Java 8 Lambda 简化
Thread t2 = new Thread(() -> System.out.println("Hello from Lambda!"));
t2.start();
```

### 2.3 实现 Callable + Future

`Runnable` 的局限：没有返回值，不能抛出受检异常。`Callable` 解决了这两个问题：

```java
// Callable<V>：有返回值，可抛异常
Callable<Integer> task = () -> {
    Thread.sleep(1000);
    return 42;
};

// FutureTask 是 Runnable 和 Future 的桥梁
FutureTask<Integer> futureTask = new FutureTask<>(task);
Thread t = new Thread(futureTask);
t.start();

// 在主线程中获取结果（阻塞等待）
System.out.println("结果：" + futureTask.get());  // 42

// Future 的其他方法
futureTask.isDone();       // 任务是否完成
futureTask.isCancelled();   // 任务是否被取消
futureTask.cancel(true);    // 取消任务
futureTask.get(2, TimeUnit.SECONDS);  // 超时等待
```

### 2.4 三种创建方式对比

| 方式 | 优点 | 缺点 | 使用场景 |
|------|------|------|---------|
| 继承 Thread | 简单直接 | Java 单继承，无法继承其他类 | 极少使用 |
| 实现 Runnable | 可继承其他类，任务与线程分离 | 无返回值 | 简单异步任务 |
| Callable + Future | 有返回值，可抛受检异常 | 写法略繁琐 | 需要获取结果的异步计算 |

> 🎯 **最佳实践**：始终使用 `Runnable`/`Callable` 接口，将任务与线程解耦。结合线程池使用效果更佳（见下一模块）。

---

## 三、线程的生命周期 → ☆ 6 种状态 + 转换图

Java 线程在 `java.lang.Thread.State` 枚举中定义了 **6 种状态**：

```
              ┌──────────────────────────────────────────┐
              │                                          │
              ▼                                          │
         ┌─────────┐  start()   ┌──────────┐            │
         │  NEW    │ ─────────▶ │ RUNNABLE │◀───────────┘
         └─────────┘            └────┬─────┘   等待拿到锁
                                     │        (synchronized)
                    ┌────────────────┼────────────────────┐
                    │                │                    │
                    ▼                ▼                    ▼
            ┌──────────────┐ ┌────────────┐  ┌────────────────┐
            │   BLOCKED    │ │  WAITING   │  │ TIMED_WAITING  │
            │  (等锁)       │ │ (无限等待)  │  │  (限时等待)     │
            └──────────────┘ └─────┬──────┘  └───────┬────────┘
                    │              │                  │
                    │              ▼                  │
                    │      ┌──────────────┐           │
                    └─────▶│  TERMINATED  │◀──────────┘
                           └──────────────┘
```

### 3.1 各状态详解

| 状态 | 含义 | 进入条件 |
|------|------|---------|
| **NEW** | 线程已创建，尚未启动 | `new Thread()` |
| **RUNNABLE** | 正在 JVM 中执行（包括 "就绪" 和 "运行中"） | `thread.start()` |
| **BLOCKED** | 等待获取 `synchronized` 监视器锁 | 进入 synchronized 块/方法时锁被占用 |
| **WAITING** | 无限期等待另一个线程的通知 | `wait()`, `join()`, `LockSupport.park()` |
| **TIMED_WAITING** | 限时等待，超时自动返回 | `sleep(ms)`, `wait(ms)`, `join(ms)`, `parkNanos()` |
| **TERMINATED** | 线程执行完毕或异常退出 | `run()` 正常返回 或 未捕获异常 |

### 3.2 关键状态转换

```java
// NEW → RUNNABLE → TERMINATED
Thread t = new Thread(() -> System.out.println("done"));
System.out.println(t.getState());  // NEW
t.start();
System.out.println(t.getState());  // RUNNABLE (或 TERMINATED，看执行速度)
t.join();
System.out.println(t.getState());  // TERMINATED

// RUNNABLE → WAITING → RUNNABLE
Object lock = new Object();
Thread waiter = new Thread(() -> {
    synchronized (lock) {
        try {
            lock.wait();  // 释放锁，进入 WAITING
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
});
waiter.start();
Thread.sleep(100);  // 确保 waiter 进入 wait
System.out.println(waiter.getState());  // WAITING

synchronized (lock) {
    lock.notify();  // 唤醒 waiter → 从 WAITING 变为 BLOCKED（等待重新获取锁）
}
// 退出 synchronized 块后，waiter 拿到锁，从 BLOCKED → RUNNABLE
```

> 🎯 **注意**：`RUNNABLE` 涵盖了 OS 层面的 ready 和 running 两种状态。Java 将线程调度的细节交给操作系统，JVM 层面不区分 "就绪" 和 "运行中"。

---

## 四、线程的常用方法

### 4.1 start() vs run()

```java
Thread t = new Thread(() -> System.out.println(Thread.currentThread().getName()));

t.run();   // ❌ 输出 "main" —— 直接在当前线程调用，没创建新线程
t.start(); // ✅ 输出 "Thread-0" —— JVM 创建新线程并回调 run()
```

`start()` 只能调用一次，底层调用 native 方法创建 OS 线程，再由新线程执行 `run()`。

### 4.2 sleep() vs wait()

这是面试最高频的对比之一：

| 对比维度 | `Thread.sleep()` | `Object.wait()` |
|---------|------------------|-----------------|
| 所属类 | Thread 静态方法 | Object 实例方法 |
| 是否释放锁 | ❌ 不释放锁 | ✅ 释放锁 |
| 唤醒方式 | 时间到自动醒 / interrupt() | notify() / notifyAll() / 时间到 / interrupt() |
| 调用条件 | 任何地方 | 必须在 synchronized 块中 |
| 用途 | 暂停执行 | 线程间通信 |

```java
Object lock = new Object();

// sleep：抱着锁睡觉
synchronized (lock) {
    Thread.sleep(5000);  // 线程暂停 5 秒，但锁没释放！其他线程进不来
}

// wait：释放锁等待
synchronized (lock) {
    lock.wait();  // 释放 lock，线程进入 WAITING，其他线程可以获得锁
}
```

### 4.3 join() —— 等待线程结束

```java
Thread t = new Thread(() -> {
    try { Thread.sleep(2000); } catch (InterruptedException e) { }
    System.out.println("子线程完成");
});

t.start();
t.join();  // 主线程阻塞，等待 t 执行完毕
System.out.println("主线程继续");  // 在 "子线程完成" 之后输出

// 带超时的 join
t.join(1000);  // 最多等 1 秒，超时则不继续等
```

### 4.4 interrupt() —— 中断机制

Java 使用 **协作式中断**：一个线程不能强制停止另一个线程，只能 "请求" 它停止：

```java
Thread t = new Thread(() -> {
    while (!Thread.currentThread().isInterrupted()) {  // 检查中断标志
        // 执行任务
        try {
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            // ⚠️ sleep 收到中断会清除中断标志，需要重新设置
            Thread.currentThread().interrupt();  // 重新设置中断标志
        }
    }
    System.out.println("线程优雅退出");
});

t.start();
Thread.sleep(3500);
t.interrupt();  // 设置中断标志 + 唤醒阻塞中的线程
```

三个相关方法的区别：

| 方法 | 调用方式 | 是否清除中断标志 |
|------|---------|:---:|
| `interrupt()` | 实例方法 `t.interrupt()` | —（设置标志） |
| `isInterrupted()` | 实例方法 `t.isInterrupted()` | ❌ 不清除 |
| `interrupted()` | 静态方法 `Thread.interrupted()` | ✅ 清除（当前线程） |

```java
// ⚠️ 常见陷阱
Thread.currentThread().interrupt();
System.out.println(Thread.currentThread().isInterrupted());   // true
System.out.println(Thread.interrupted());                      // true → 清除标志
System.out.println(Thread.currentThread().isInterrupted());   // false —— 已被清除！
```

### 4.5 Daemon 线程（守护线程）

```java
Thread daemon = new Thread(() -> {
    while (true) {
        System.out.println("守护线程工作中...");
        Thread.sleep(500);
    }
});
daemon.setDaemon(true);  // ⚠️ 必须在 start() 之前设置
daemon.start();

Thread.sleep(2000);
System.out.println("主线程结束");
// JVM 在所有非守护线程结束后退出，不会等待守护线程
```

> 🎯 **GC 线程**就是典型的守护线程——当所有用户线程结束后，GC 线程自动终止。

---

## 五、☆ synchronized —— 锁升级全过程

`synchronized` 是 Java 最基础的同步机制。在 JDK 6 之后，HotSpot 对它做了大量优化，引入了 **锁升级** 机制。

### 5.1 对象头与 Mark Word

每个 Java 对象在堆中的布局包含 **对象头**（Object Header），其中 **Mark Word** 记录了锁状态：

```
Java 对象内存布局 (64-bit JVM，压缩指针开启)：

┌──────────────┬──────────────┬──────────────┐
│  Mark Word   │  Klass Word  │  实例数据     │  padding │
│  (64 bits)   │  (32 bits)   │              │          │
└──────────────┴──────────────┴──────────────┴──────────┘
   对象头(96 bits)

Mark Word 在不同锁状态下的结构：

无锁 (001):
  [ unused:25 | hash:31 | unused:1 | age:4 | biased_lock:1 | 01 ]

偏向锁 (101):
  [ thread:54 | epoch:2 | unused:1 | age:4 | biased_lock:1 | 01 ]

轻量级锁 (00):
  [ ptr_to_lock_record:62 | 00 ]

重量级锁 (10):
  [ ptr_to_monitor:62 | 10 ]

GC 标记 (11):
  [ unused:62 | 11 ]
```

> 💡 锁状态由 Mark Word 的 **最后 2~3 bit** 标识。`biased_lock` 位 + 最后 2 位共同确定当前锁状态。

### 5.2 锁升级路径

```
无锁 ──▶ 偏向锁 ──▶ 轻量级锁 ──▶ 重量级锁
  │                    │
  └── 不可逆 ←─────────┘  (一旦升级，不会降级)
```

> ⚠️ **JDK 15+ 的重要变更**：偏向锁在 JDK 15 中被标记为废弃（[JEP 374](https://openjdk.org/jeps/374)），JDK 18+ 默认禁用。原因是现代应用大多使用线程池，线程复用使得偏向锁的收益大幅降低，而维护偏向锁的撤销逻辑增加了复杂度。如果你的 JDK 版本 ≥ 18，锁升级路径简化为：**无锁 → 轻量级锁 → 重量级锁**。

#### 阶段 1：偏向锁（Biased Locking）

**思想**：大多数时候锁不仅没有竞争，而且总是由**同一个线程**多次获取。偏向锁在 Mark Word 中记录线程 ID，该线程再次进入时无需 CAS 操作。

```
获取偏向锁：
  1. 检查 Mark Word 的 biased_lock 位是否为 1，最后 2 位是否为 01
  2. 如果是 0 0 1（无锁），CAS 将当前线程 ID 写入 Mark Word
  3. 如果已经是当前线程的偏向锁 → 直接进入（零开销！）
  4. 如果是其他线程的偏向锁 → 撤销偏向锁，升级为轻量级锁

撤销偏向锁（到达 safepoint）：
  1. 暂停持有偏向锁的线程
  2. 检查线程是否还存活
  3. 遍历线程栈，将锁记录更新为轻量级锁
  4. 唤醒线程
```

```java
// 演示偏向锁延迟（JDK < 15 且未禁用偏向锁时）
// JVM 启动后偏向锁有 4 秒延迟（-XX:BiasedLockingStartupDelay=4000）
// 可以用 -XX:BiasedLockingStartupDelay=0 取消延迟

Object lock = new Object();
synchronized (lock) {
    // 第一次：轻量级锁（还在延迟期内）
}
// 4 秒后：
synchronized (lock) {
    // 偏向锁：Mark Word 记录了当前线程 ID
}
```

#### 阶段 2：轻量级锁（Lightweight Lock）

**思想**：当锁被多个线程**交替**访问（没有同时竞争），用 CAS 自旋代替 OS 互斥量。

```
获取轻量级锁：
  1. 在当前线程栈帧中创建 Lock Record
  2. 将 Mark Word 拷贝到 Lock Record（Displaced Mark Word）
  3. CAS 将 Mark Word 替换为指向 Lock Record 的指针
  4. CAS 成功 → 获得轻量级锁
  5. CAS 失败 → 检查是否是自己持有的（重入）→ 还是真正的竞争

重入（同一个线程）：
  Lock Record 的 Displaced Mark Word 设为 null（标记为重入）
  退出时遇到 null 就知道不需要 CAS 恢复 Mark Word

释放轻量级锁：
  1. 从 Lock Record 取回 Displaced Mark Word
  2. CAS 将 Mark Word 恢复为 Displaced Mark Word
  3. CAS 失败 → 说明升级为了重量级锁
```

```
线程栈中 Lock Record 的结构（每个 synchronized 块一个）：

  线程栈帧
  ┌────────────────────────┐
  │  Lock Record 1         │  ← synchronized 块 A
  │  ├ displaced mark word │
  │  └ owner = null        │
  ├────────────────────────┤
  │  Lock Record 2         │  ← synchronized 块 B（嵌套/重入）
  │  ├ displaced mark word │
  │  └ owner = null        │
  └────────────────────────┘
```

```java
// 轻量级锁的经典场景：两个线程交替执行
Object lock = new Object();

// 线程 A
synchronized (lock) { /* do work */ }  // CAS 成功，轻量级锁
// 线程 B（线程 A 已退出）
synchronized (lock) { /* do work */ }  // CAS 成功，轻量级锁
// 没有竞争！两个线程交替获取锁 → 轻量级锁足够
```

#### 阶段 3：重量级锁（Heavyweight Lock）

当轻量级锁 CAS 自旋失败达到阈值（默认 10 次），升级为重量级锁——底层调用 OS 的 `pthread_mutex`，未拿到锁的线程被挂起进入 **BLOCKED** 状态。

```
重量级锁结构：

  Java 对象
  ┌──────────────┐
  │  Mark Word   │ ──▶ ObjectMonitor (C++ 对象)
  └──────────────┘     ┌─────────────────────┐
                       │  _owner             │ ← 持有锁的线程
                       │  _EntryList         │ ← BLOCKED 线程队列
                       │  _WaitSet           │ ← wait() 的线程
                       │  _recursions        │ ← 重入次数
                       └─────────────────────┘
```

```java
// 重量级锁场景：多个线程真正竞争
Object lock = new Object();

// 线程 A 持有锁
new Thread(() -> {
    synchronized (lock) {
        sleep(5000);  // 长时间持锁，B 和 C 会自旋失败 → 膨胀
    }
}).start();

sleep(100);
// 线程 B 竞争 → CAS 自旋 10 次失败 → 升级重量级锁
new Thread(() -> { synchronized (lock) { /* ... */ } }).start();
// 线程 C 竞争 → 直接进入 EntryList（BLOCKED）
new Thread(() -> { synchronized (lock) { /* ... */ } }).start();
```

### 5.3 JIT 对 synchronized 的优化

除了锁升级，JIT 编译器还做了两种优化：

**锁消除（Lock Elimination）**：

```java
// 优化前
public String concat() {
    StringBuffer sb = new StringBuffer();  // 局部变量，不可能逃逸
    sb.append("a");    // append 是 synchronized 的
    sb.append("b");
    return sb.toString();
}

// JIT 分析：sb 是局部变量，不会被其他线程访问
// 消除所有 synchronized → 等效于 StringBuilder
```

**锁粗化（Lock Coarsening）**：

```java
// 优化前：反复加锁解锁
for (int i = 0; i < 1000; i++) {
    synchronized (lock) {
        count++;
    }
}

// JIT 粗化：一次加锁搞定
synchronized (lock) {
    for (int i = 0; i < 1000; i++) {
        count++;
    }
}
```

### 5.4 synchronized vs 显式锁选择

| 对比维度 | synchronized | JUC Lock |
|---------|:---:|:---:|
| 自动释放 | ✅ 代码块结束/异常自动释放 | ❌ 必须 finally 中 unlock |
| 尝试获取锁 | ❌ 不支持 | ✅ tryLock() |
| 超时获取 | ❌ 不支持 | ✅ tryLock(time, unit) |
| 可中断 | ❌ 不可中断 | ✅ lockInterruptibly() |
| 公平锁 | ❌ 只能非公平 | ✅ 可选公平/非公平 |
| 多条件 | ❌ 一个对象只有一个条件 | ✅ 多个 Condition |
| 性能（低竞争） | ✅ 高（偏向锁/轻量级锁） | 相近 |
| 性能（高竞争） | 相近 | ✅ 更好（可定制策略） |

> 🎯 **选择建议**：优先用 `synchronized`——代码更简洁、JVM 自动优化。需要 `tryLock`、超时、可中断、公平锁、多条件等待时再用 JUC Lock。

---

## 六、☆ volatile —— 轻量级同步机制

### 6.1 JMM（Java Memory Model）简介

JMM 定义了 Java 程序中 **内存访问** 的规则——核心问题是：一个线程写的值，另一个线程何时能看到？

```
JMM 抽象模型：

  线程 A                    主内存                   线程 B
  ┌──────────┐          ┌──────────────┐          ┌──────────┐
  │ 工作内存  │  ◀──▶   │  共享变量     │  ◀──▶   │ 工作内存  │
  │ (CPU缓存) │  读写    │  (主存)       │  读写    │ (CPU缓存) │
  └──────────┘          └──────────────┘          └──────────┘

问题：线程 A 修改了变量，但值还在 A 的工作内存中，线程 B 看不到！
```

```java
// ❌ 经典问题：线程不可见
public class VisibilityProblem {
    private static boolean flag = false;  // 没有 volatile！

    public static void main(String[] args) throws InterruptedException {
        new Thread(() -> {
            while (!flag) {  // 线程可能永远看不到 flag 变为 true
                // JIT 可能优化为：if (!flag) while(true) {}
            }
            System.out.println("线程退出");
        }).start();

        Thread.sleep(1000);
        flag = true;  // 主线程修改，但子线程可能看不到！
        System.out.println("flag 已设为 true");
    }
}
```

### 6.2 volatile 的三大特性

#### 特性1：保证可见性

```java
private static volatile boolean flag = false;  // ✅ 加了 volatile

// 写 volatile 变量时，JVM 插入 Store 屏障 → 强制刷新到主内存
// 读 volatile 变量时，JVM 插入 Load 屏障 → 强制从主内存读取
```

**内存屏障（Memory Barrier）** 是 CPU 级别的指令，volatile 通过插入屏障实现可见性和有序性：

| 屏障类型 | 作用 |
|---------|------|
| **LoadLoad** | 禁止 Load1 与 Load2 重排 |
| **StoreStore** | 禁止 Store1 与 Store2 重排 |
| **LoadStore** | 禁止 Load1 与 Store2 重排 |
| **StoreLoad** | 禁止 Store1 与 Load2 重排（最昂贵的屏障） |

```java
// volatile 写操作 = StoreStore + volatile写 + StoreLoad
// volatile 读操作 = LoadLoad + volatile读 + LoadStore
```

#### 特性2：禁止指令重排序

```java
// ❌ 不加 volatile：可能先赋值再初始化（指令重排）
public class Singleton {
    private static Singleton instance;  // 没有 volatile！

    public static Singleton getInstance() {
        if (instance == null) {                 // 第一次检查
            synchronized (Singleton.class) {
                if (instance == null) {         // 第二次检查
                    instance = new Singleton(); // 问题在这里！
                }
            }
        }
        return instance;
    }
}
```

`instance = new Singleton()` 不是原子操作，它分为三步：

```
1. memory  = allocate()       // 分配内存空间
2. ctor(instance)             // 初始化对象
3. instance = memory          // 将引用指向内存地址

JIT 可能重排为 1→3→2：
  - 如果线程 A 刚执行完步骤 3（还没初始化），线程 B 看到 instance != null
  - 线程 B 拿到的就是一个 未初始化的对象！ ❌
```

```java
// ✅ 加 volatile 禁止指令重排
private static volatile Singleton instance;  // DCL 的正确写法

// volatile 保证：
// 步骤 3（赋值）必须在步骤 2（初始化）之后执行
```

#### 特性3：volatile 不保证原子性

```java
private static volatile int count = 0;

// 多个线程执行 count++ → 结果不是 10000！
for (int i = 0; i < 10000; i++) {
    new Thread(() -> {
        count++;  // ⚠️ 读取-修改-写入，不是原子操作！
    }).start();
}
// count++ 分解：① 读 count  ② 加 1  ③ 写 count
// volatile 只保证 ① 读到最新值，③ 写入后立即可见
// 但 ② 之间的竞态条件无能为力
// 解决方案：AtomicInteger / synchronized / Lock
```

### 6.3 volatile 的适用场景

| 场景 | 示例 | 原因 |
|------|------|------|
| 状态标志 | `volatile boolean running` | 只写一次，读多次 |
| DCL 单例 | `volatile Singleton instance` | 禁止指令重排 |
| 独立观察 | `volatile int temperature` | 每次读都是最新值 |
| 读写锁的 state | AQS 中的 `volatile int state` | CAS + volatile 组合 |

```java
// ✅ volatile 的最经典用法：状态标志
class TaskRunner {
    private volatile boolean running = true;

    public void run() {
        while (running) {  // 每次循环都从主内存读
            // do work
        }
    }

    public void stop() {
        running = false;   // 写入立即刷新到主内存
    }
}
```

---

## 七、☆ wait/notify —— 线程间通信

### 7.1 基本用法

`wait()`、`notify()`、`notifyAll()` 是 `Object` 的方法，必须在 `synchronized` 块中调用：

```java
Object lock = new Object();
boolean condition = false;

// 等待线程
new Thread(() -> {
    synchronized (lock) {
        while (!condition) {  // ⚠️ 必须用 while，不能用 if！
            try {
                lock.wait();  // 释放 lock，进入 WAITING
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        System.out.println("条件满足，继续执行");
    }
}).start();

// 通知线程
new Thread(() -> {
    synchronized (lock) {
        condition = true;
        lock.notify();  // 或 lock.notifyAll()
    }
}).start();
```

### 7.2 为什么 wait() 必须在 synchronized 中？

两个原因：

1. **竞态条件**：如果 wait 不在同步块里，"检查条件" 和 "进入等待" 之间可能被插入 notify：

```java
// ❌ 如果 wait 能在 synchronized 外调用：
while (!condition) {
    // ← 如果 notify 在这里执行（wait 还没调用），信号就丢失了！
    lock.wait();  // 永远等不到 notify
}
```

2. **语义一致性**：wait 和 notify 操作同一个条件变量，这本身就是互斥资源——与读写共享变量需要加锁是同一个道理。

### 7.3 虚假唤醒（Spurious Wakeup）

线程可能在 **没有 notify/notifyAll、没有被中断、没有超时** 的情况下被唤醒——这就是虚假唤醒（操作系统层面的原因）：

```java
// ❌ 错误写法——if 只检查一次
synchronized (lock) {
    if (queue.isEmpty()) {
        lock.wait();  // 被虚假唤醒后，直接往下走！queue 还是空的！
    }
    return queue.remove();
}

// ✅ 正确写法——while 循环检查
synchronized (lock) {
    while (queue.isEmpty()) {  // 醒来后重新检查条件
        lock.wait();
    }
    return queue.remove();
}
```

### 7.4 wait() vs sleep() 面试终极对比

```java
Object lock = new Object();

// 线程 A
new Thread(() -> {
    synchronized (lock) {
        try {
            System.out.println("A: 进入 wait");
            lock.wait();       // ① 释放 lock ② 进入 WAITING
            System.out.println("A: 被唤醒");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}).start();

// 线程 B
new Thread(() -> {
    synchronized (lock) {     // 能进来！因为 A 的 wait() 释放了锁
        try {
            System.out.println("B: 进入 sleep");
            Thread.sleep(3000);  // 抱着锁睡 3 秒
            System.out.println("B: sleep 结束");
            lock.notify();       // 唤醒 A（A 需要等 B 释放锁）
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }  // B 释放锁 → A 获取锁 → A 从 wait() 返回
}).start();
```

| 对比维度 | `Object.wait()` | `Thread.sleep()` |
|---------|:---:|:---:|
| 所属类 | Object | Thread |
| 释放同步锁 | ✅ 释放 | ❌ 不释放 |
| 调用条件 | 必须在 synchronized 中 | 任意位置 |
| 唤醒方式 | notify/notifyAll/interrupt | 超时/interrupt |
| 线程状态 | WAITING / TIMED_WAITING | TIMED_WAITING |
| 用途 | 线程间协作通信 | 暂停一段时间 |

### 7.5 notify() vs notifyAll()

```java
// notify()：只唤醒一个等待线程（随机选择）
// notifyAll()：唤醒所有等待线程

// ⚠️ 总是优先使用 notifyAll()，除非你非常确定只需要唤醒一个
// 原因：notify() 唤醒的线程可能不是处理当前条件的正确线程

// 示例：生产者-消费者，等待条件不同
synchronized (lock) {
    // 消费者 A 在等 "队列非空"
    // 消费者 B 在等 "队列非空"
    // 生产者 C 调用 notify() —— 如果唤醒了另一个生产者，就无效了
    // notifyAll() 确保所有消费者都有机会检查条件
}
```

> 🎯 **金科玉律**：`wait()` 永远放在 `while` 循环中，`notify()` 机制下永远使用 `notifyAll()`。这两个习惯能避免 99% 的 wait/notify 问题。

---

## 八、总结

| 知识点 | 核心要点 |
|--------|---------|
| 线程创建 | Runnable/Callable 解耦任务与线程；Future 获取异步结果 |
| 6 种状态 | NEW→RUNNABLE↔BLOCKED/WAITING/TIMED_WAITING→TERMINATED |
| start vs run | start() 创建新线程；run() 只是普通方法调用 |
| sleep vs wait | sleep 不释放锁；wait 释放锁且必须在 synchronized 中 |
| interrupt | 协作式中断；阻塞方法抛 InterruptedException 会清除标志 |
| 锁升级 (JDK<15) | 偏向锁 → 轻量级锁（CAS 自旋）→ 重量级锁（OS mutex） |
| 锁升级 (JDK≥18) | 无锁 → 轻量级锁 → 重量级锁（偏向锁已默认禁用） |
| volatile | 保证可见性+禁止指令重排，**不保证原子性** |
| DCL | `volatile` 必不可少，防止指令重排导致的半初始化对象 |
| wait 条件 | 必须用 `while` 而非 `if`，防止虚假唤醒 |
| notify | 优先使用 `notifyAll()`，避免信号丢失 |

下一篇将深入 **AQS（AbstractQueuedSynchronizer）**——JUC 的基石。你将理解 `ReentrantLock`、`ReadWriteLock`、`StampedLock` 的底层原理，以及它们与 `synchronized` 的详细对比和选型指南。

---

## 参考

- [Java Language Specification - Threads and Locks (Chapter 17)](https://docs.oracle.com/javase/specs/jls/se17/html/jls-17.html)
- [JEP 374: Deprecate and Disable Biased Locking](https://openjdk.org/jeps/374)
- [Java Memory Model (JSR-133)](https://www.cs.umd.edu/~pugh/java/memoryModel/jsr133.pdf)
- [Brian Goetz - Java Concurrency in Practice](https://jcip.net/)
- [OpenJDK Wiki - Synchronization](https://wiki.openjdk.org/display/HotSpot/Synchronization)
- [JavaGuide - 并发编程](https://javaguide.cn/java/concurrent/)
