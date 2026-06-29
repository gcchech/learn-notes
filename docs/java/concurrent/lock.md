---
title: JUC 锁机制与 AQS
icon: lock
order: 2
category:
  - Java
  - 并发编程
tag:
  - AQS
  - ReentrantLock
  - ReadWriteLock
  - StampedLock
  - Condition
---

# JUC 锁机制：AQS 原理与 Lock 体系

> 📖 `synchronized` 用起来简单，但缺乏灵活性——不能尝试获取锁、不能超时、不可中断。Java 5 引入的 `Lock` 体系填补了这些空白，而它们全部建立在同一个基石之上：**AQS（AbstractQueuedSynchronizer）**。本文从 AQS 源码入手，逐层剖析 `ReentrantLock`、`ReadWriteLock` 和 `StampedLock` 的实现原理，帮你理解 JUC 锁体系的完整设计。

---

## 一、为什么需要 Lock？synchronized 的局限

先回顾 `synchronized` 的四个 "做不到"：

```java
// ❌ 1. 不能尝试获取锁（非阻塞）
//    没拿到锁就直接进 BLOCKED 状态，不能先去做别的事

// ❌ 2. 不能超时获取
//    不能 "这个锁我最多等 3 秒，拿不到就放弃"

// ❌ 3. 不能被中断
//    线程在等待 synchronized 锁时，interrupt() 无效

// ❌ 4. 不能实现公平锁
//    synchronized 只能是非公平的
```

而 `ReentrantLock` 全部支持：

```java
Lock lock = new ReentrantLock();

// ✅ 尝试获取（立即返回）
if (lock.tryLock()) {
    try { /* 拿到锁 */ } finally { lock.unlock(); }
} else {
    /* 去做别的事 */
}

// ✅ 超时获取
if (lock.tryLock(3, TimeUnit.SECONDS)) {
    try { /* 拿到锁 */ } finally { lock.unlock(); }
}

// ✅ 可中断获取
lock.lockInterruptibly();  // 等锁时可被 interrupt() 唤醒

// ✅ 公平锁
Lock fairLock = new ReentrantLock(true);  // 先到先得
```

---

## 二、☆ AQS —— JUC 的基石

`AbstractQueuedSynchronizer`（AQS）是一个**模板方法模式**的同步框架。`ReentrantLock`、`Semaphore`、`CountDownLatch`、`ReentrantReadWriteLock` 等 JUC 工具全部建立在 AQS 之上。

### 2.1 AQS 的核心三要素

```
AQS 核心结构：

  1. state (volatile int)     ← 同步状态（锁=0/1，信号量=剩余许可数）
  2. CLH 变体队列             ← 存放等待线程的双向链表
  3. CAS 操作                 ← 原子修改 state
```

```java
public abstract class AbstractQueuedSynchronizer
        extends AbstractOwnableSynchronizer {

    // 核心字段
    private transient volatile Node head;   // 队列头部（持有锁的线程出队后）
    private transient volatile Node tail;   // 队列尾部
    private volatile int state;             // 同步状态

    // CAS 操作
    protected final boolean compareAndSetState(int expect, int update) {
        return U.compareAndSetInt(this, STATE, expect, update);
    }

    // 需要子类实现的方法（模板方法）
    protected boolean tryAcquire(int arg) { throw new UnsupportedOperationException(); }
    protected boolean tryRelease(int arg) { throw new UnsupportedOperationException(); }
    protected int tryAcquireShared(int arg) { throw new UnsupportedOperationException(); }
    protected boolean tryReleaseShared(int arg) { throw new UnsupportedOperationException(); }
    protected boolean isHeldExclusively() { throw new UnsupportedOperationException(); }
}
```

### 2.2 AQS 的 CLH 变体队列

AQS 内部使用一个 **FIFO 双向链表**（CLH 锁的变体），每个节点代表一个等待线程：

```java
static final class Node {
    volatile int waitStatus;     // 节点状态
    volatile Node prev;          // 前驱节点
    volatile Node next;          // 后继节点
    volatile Thread thread;      // 等待的线程
    Node nextWaiter;             // Condition 队列中的下一个节点

    // waitStatus 的 4 种值
    static final int CANCELLED =  1;  // 节点已取消
    static final int SIGNAL    = -1;  // 后继节点需要被唤醒
    static final int CONDITION = -2;  // 节点在 Condition 队列中
    static final int PROPAGATE = -3;  // 共享模式下需要传播唤醒

    // waitStatus = 0 表示默认值（新节点）
}
```

```
AQS 同步队列示意：

  head                            tail
  ┌──────┐   ┌──────┐   ┌──────┐
  │ Node │◀──│ Node │◀──│ Node │
  │(空壳) │──▶│Thread│──▶│Thread│
  └──────┘   │  B   │   │  C   │
             └──────┘   └──────┘
  waitStatus: SIGNAL(-1)   SIGNAL(-1)
  (head 是哨兵，不关联线程，仅用于唤醒后继)
```

### 2.3 独占模式 acquire 流程（ReentrantLock 的核心）

```java
// AQS 的 acquire 方法（final，子类不能覆写）
public final void acquire(int arg) {
    if (!tryAcquire(arg) &&                              // ① 快速尝试获取
        acquireQueued(addWaiter(Node.EXCLUSIVE), arg))   // ② 入队 + 自旋
        selfInterrupt();                                 // ③ 弥补中断
}

// 完整流程：
// 1. tryAcquire(arg) → 子类实现（如 ReentrantLock 的 CAS state 0→1）
//    ├─ 成功 → 返回，线程继续执行
//    └─ 失败 ↓
// 2. addWaiter(Node.EXCLUSIVE) → CAS 将当前线程包装成 Node 加入队尾
// 3. acquireQueued(node, arg) → 自旋：
//    ├─ 如果前驱是 head → 再次 tryAcquire
//    │   ├─ 成功 → 设置自己为新 head，返回
//    │   └─ 失败 ↓
//    ├─ shouldParkAfterFailedAcquire() → 将前驱设为 SIGNAL
//    └─ parkAndCheckInterrupt() → LockSupport.park() 挂起线程
```

```java
// 简化版 acquireQueued（核心逻辑）
final boolean acquireQueued(final Node node, int arg) {
    boolean interrupted = false;
    for (;;) {
        final Node p = node.predecessor();  // 前驱节点
        if (p == head && tryAcquire(arg)) { // 前驱是 head，再试一次
            setHead(node);                  // 自己成为新 head
            p.next = null;                  // 帮助 GC
            return interrupted;
        }
        // 检查是否需要挂起
        if (shouldParkAfterFailedAcquire(p, node) &&  // 将前驱设为 SIGNAL
            parkAndCheckInterrupt())                  // LockSupport.park(this)
            interrupted = true;
    }
}
```

### 2.4 独占模式 release 流程

```java
public final boolean release(int arg) {
    if (tryRelease(arg)) {          // ① 子类实现，如 state-1=0 则返回 true
        Node h = head;
        if (h != null && h.waitStatus != 0)
            unparkSuccessor(h);     // ② 唤醒 head 的后继节点
        return true;
    }
    return false;
}
```

### 2.5 共享模式 vs 独占模式

AQS 支持两种同步模式，对应不同的子类实现：

| 模式 | 模板方法 | 子类实现 | 典型应用 |
|------|---------|---------|---------|
| **独占** | `acquire()` / `release()` | `tryAcquire()` / `tryRelease()` | ReentrantLock |
| **共享** | `acquireShared()` / `releaseShared()` | `tryAcquireShared()` / `tryReleaseShared()` | Semaphore, CountDownLatch |

```java
// 共享模式的传播唤醒（关键区别！）
// 独占模式：release 只唤醒一个后继
// 共享模式：releaseShared 唤醒后继后，后继如果是 SHARED 类型，继续向后传播
```

---

## 三、☆ ReentrantLock —— 可重入的独占锁

### 3.1 基本结构

```java
public class ReentrantLock implements Lock, java.io.Serializable {
    private final Sync sync;  // 内部 AQS 子类

    // 抽象内部类继承 AQS
    abstract static class Sync extends AbstractQueuedSynchronizer {
        abstract void lock();

        // 非公平的 tryAcquire
        final boolean nonfairTryAcquire(int acquires) {
            final Thread current = Thread.currentThread();
            int c = getState();
            if (c == 0) {
                if (compareAndSetState(0, acquires)) {  // CAS 抢锁
                    setExclusiveOwnerThread(current);
                    return true;
                }
            }
            else if (current == getExclusiveOwnerThread()) {  // 重入检测
                int nextc = c + acquires;
                if (nextc < 0) throw new Error("Maximum lock count exceeded");
                setState(nextc);
                return true;
            }
            return false;
        }

        // tryRelease
        protected final boolean tryRelease(int releases) {
            int c = getState() - releases;
            if (Thread.currentThread() != getExclusiveOwnerThread())
                throw new IllegalMonitorStateException();
            boolean free = false;
            if (c == 0) {  // 完全释放（重入次数归零）
                free = true;
                setExclusiveOwnerThread(null);
            }
            setState(c);
            return free;
        }
    }

    // 非公平锁（默认）
    static final class NonfairSync extends Sync {
        final void lock() {
            if (compareAndSetState(0, 1))      // 先抢一次！
                setExclusiveOwnerThread(Thread.currentThread());
            else
                acquire(1);  // 失败走 AQS 标准流程
        }
        protected final boolean tryAcquire(int acquires) {
            return nonfairTryAcquire(acquires);
        }
    }

    // 公平锁
    static final class FairSync extends Sync {
        final void lock() {
            acquire(1);  // 直接走 AQS 流程，不抢
        }
        protected final boolean tryAcquire(int acquires) {
            // 比非公平多一步：检查队列里有没有等待更久的线程
            if (getState() == 0 && !hasQueuedPredecessors() &&
                compareAndSetState(0, acquires)) {
                setExclusiveOwnerThread(current);
                return true;
            }
            // ... 重入逻辑
        }
    }
}
```

### 3.2 公平锁 vs 非公平锁

```java
// 非公平锁（默认）：新来的线程可能 "插队"
ReentrantLock nonFairLock = new ReentrantLock();      // 等同于 new ReentrantLock(false)

// 公平锁：严格按照队列顺序，先到先得
ReentrantLock fairLock = new ReentrantLock(true);
```

```
非公平锁的 "插队" 过程：

  队列:  [B] → [C] → [D]   (B 在等待，C、D 在其后)

  线程 A 释放锁:
    state = 0
    unparkSuccessor(head) → 唤醒 B

  同时，新来的线程 E 调用 lock():
    CAS(0→1) → 成功！E 插队成功！
    被唤醒的 B 再次 CAS → 失败，继续等

  这就是 "非公平"：后到的线程可能比等待队列中的线程先拿到锁。

公平锁则不然：hasQueuedPredecessors() 检查队列中有没有等待者，
有的话直接放弃 CAS，乖乖排队。
```

| 对比维度 | 非公平锁 | 公平锁 |
|---------|:---:|:---:|
| 吞吐量 | ✅ 更高（减少线程切换） | ❌ 更低（每次都要切换） |
| 线程饥饿 | ⚠️ 可能 | ✅ 不会 |
| 默认 | ✅ `new ReentrantLock()` | - |
| 适用场景 | 对吞吐量敏感 | 对公平性敏感 |

> 🎯 **默认用非公平锁**。非公平锁性能更好——它减少了上下文切换（新线程直接拿到锁，省去挂起-唤醒的开销）。只有确实需要严格的 FIFO 顺序时（如防止某个线程饿死）才用公平锁。

### 3.3 可重入性

`ReentrantLock` 和 `synchronized` 一样支持可重入——同一个线程可以多次获取同一把锁：

```java
public class ReentrantExample {
    private final ReentrantLock lock = new ReentrantLock();

    public void outer() {
        lock.lock();
        try {
            System.out.println("outer: holdCount=" + lock.getHoldCount());  // 1
            inner();  // 同一个线程再次获取锁
        } finally {
            lock.unlock();
        }
    }

    public void inner() {
        lock.lock();
        try {
            System.out.println("inner: holdCount=" + lock.getHoldCount());  // 2
        } finally {
            lock.unlock();  // ⚠️ 获取几次就要释放几次！
        }
    }
}
```

内部实现：重入时 `state++`，释放时 `state--`，`state==0` 才真正释放锁。

### 3.4 ReentrantLock 的辅助方法

```java
ReentrantLock lock = new ReentrantLock();

lock.getHoldCount();       // 当前线程重入次数
lock.isHeldByCurrentThread(); // 是否被当前线程持有
lock.isLocked();           // 是否被任意线程持有
lock.hasQueuedThreads();   // 是否有线程在等待
lock.getQueueLength();     // 等待队列长度
lock.hasWaiters(condition); // Condition 上是否有等待线程
```

---

## 四、☆ Condition —— Lock 体系的 wait/notify

`Condition` 是 `Lock` 体系的等待/通知机制，对应 `synchronized` 的 `wait/notify`：

| synchronized | Lock |
|-------------|------|
| `lock.wait()` | `condition.await()` |
| `lock.notify()` | `condition.signal()` |
| `lock.notifyAll()` | `condition.signalAll()` |
| 一个对象一个等待集合 | **一个 Lock 可以创建多个 Condition** |

### 4.1 基本用法

```java
Lock lock = new ReentrantLock();
Condition notEmpty = lock.newCondition();   // 队列非空条件
Condition notFull = lock.newCondition();    // 队列未满条件

// 生产者
lock.lock();
try {
    while (queue.size() == capacity) {
        notFull.await();   // 队列满了，等 "不满" 信号
    }
    queue.add(item);
    notEmpty.signal();     // 发出 "非空" 信号
} finally {
    lock.unlock();
}

// 消费者
lock.lock();
try {
    while (queue.isEmpty()) {
        notEmpty.await();  // 队列空了，等 "非空" 信号
    }
    Object item = queue.remove();
    notFull.signal();      // 发出 "不满" 信号
} finally {
    lock.unlock();
}
```

> 🎯 `Condition` 的核心优势：一个锁可以绑定**多个条件队列**，实现精准唤醒。而 `synchronized` 的一个锁只有一个 wait set，`notifyAll()` 会唤醒所有等待线程——很多是不满足条件的。

### 4.2 Condition 的实现原理

AQS 内部类 `ConditionObject` 实现了 `Condition` 接口：

```
AQS 中的两套队列：

  同步队列 (CLH 变体)：等待获取锁
  head → [Node A (Thread1)] → [Node B (Thread2)] → tail

  Condition 队列 (单向链表)：等待信号
  firstWaiter → [Node C] → [Node D]
                    ↑ condition.await() 加入
                    ↓ condition.signal() 转移到同步队列
```

```java
// await() 的核心流程：
// 1. 将当前线程包装成 Node 加入 Condition 队列（waitStatus=CONDITION）
// 2. 释放锁（fullyRelease）
// 3. 挂起（LockSupport.park），等待 signal
// 4. signal 后 → 重新 acquire 锁

// signal() 的核心流程：
// 1. 将 Condition 队列的第一个节点移到同步队列
// 2. 设置前驱的 waitStatus=SIGNAL
// 3. 如果前驱已取消或设置失败，直接 unpark 该节点线程
```

---

## 五、☆ ReadWriteLock —— 读写锁

### 5.1 读写锁的核心思想

读多写少场景下，`ReentrantLock` 不管是读还是写都独占——读线程之间也没法并发。

**读写锁**允许多个读线程同时持有锁，但写线程独占：

```
读-读：✅ 共享（多个线程可同时读）
读-写：❌ 互斥（读的时候不能写）
写-写：❌ 互斥（写的时候不能写）
```

```java
ReadWriteLock rwLock = new ReentrantReadWriteLock();
Lock readLock = rwLock.readLock();
Lock writeLock = rwLock.writeLock();

// 多个线程可以同时持有读锁
readLock.lock();
try {
    // 读操作
} finally {
    readLock.unlock();
}

// 写锁独占——等所有读锁释放后才能获取
writeLock.lock();
try {
    // 写操作
} finally {
    writeLock.unlock();
}
```

### 5.2 底层实现：state 一分为二

`ReentrantReadWriteLock` 内部也用 AQS，但它把 `int state` 拆成了两段：

```
state 的 32 位拆分：

  ┌─────────────────────┬───────────────────────┐
  │  高 16 位              │  低 16 位               │
  │  读锁持有次数          │  写锁重入次数            │
  │  (所有读线程的总和)     │  (写锁的 state)          │
  └─────────────────────┴───────────────────────┘

  读锁计数 = state >>> 16      （无符号右移 16 位）
  写锁计数 = state & 0x0000FFFF  （低 16 位掩码）
```

```java
// ReentrantReadWriteLock.Sync 中的关键方法
static final int SHARED_SHIFT   = 16;
static final int SHARED_UNIT    = (1 << SHARED_SHIFT);  // 65536
static final int MAX_COUNT      = (1 << SHARED_SHIFT) - 1;  // 65535
static final int EXCLUSIVE_MASK = (1 << SHARED_SHIFT) - 1;  // 0x0000FFFF

// 获取读锁计数
static int sharedCount(int c)    { return c >>> SHARED_SHIFT; }
// 获取写锁计数
static int exclusiveCount(int c) { return c & EXCLUSIVE_MASK; }
```

### 5.3 锁降级（Lock Downgrade）

写锁可以降级为读锁，这是**允许的**：

```java
ReadWriteLock rwLock = new ReentrantReadWriteLock();
rwLock.writeLock().lock();
try {
    // 写操作
    rwLock.readLock().lock();  // 先获取读锁
} finally {
    rwLock.writeLock().unlock();  // 释放写锁 → 降级为读锁
}
// 此时还持有读锁，可以继续读
try {
    // 读操作（数据不会被其他写线程修改！）
} finally {
    rwLock.readLock().unlock();
}
```

> 🎯 **锁降级的意义**：在释放写锁之前先获取读锁，可以保证**数据可见性的连续性**——写完之后立即读，不会因为中间有其他写线程插入而读到不一致的数据。

### 5.4 读锁不能升级为写锁（会死锁）

```java
// ❌ 读锁升级 → 死锁！
rwLock.readLock().lock();
try {
    // 想要升级为写锁......
    rwLock.writeLock().lock();  // 死锁！写锁必须等所有读锁释放
    // 但自己持有读锁，永远不会释放 → 永远等不到
} finally {
    rwLock.readLock().unlock();
}
```

---

## 六、☆ StampedLock —— JDK 8 的乐观读锁

`StampedLock` 在 JDK 8 引入，是对 `ReentrantReadWriteLock` 的性能增强——它引入了 **乐观读** 模式。

### 6.1 StampedLock 的三种模式

| 模式 | 方法 | 特点 |
|------|------|------|
| **写锁** | `writeLock()` / `unlockWrite(stamp)` | 独占，与 synchronized 写锁语义相同 |
| **悲观读锁** | `readLock()` / `unlockRead(stamp)` | 共享，与 ReadWriteLock 读锁语义相同 |
| **乐观读** | `tryOptimisticRead()` / `validate(stamp)` | **无锁**！仅检查版本号 |

```java
// StampedLock 的 stamp 机制
StampedLock sl = new StampedLock();

// 写锁
long stamp = sl.writeLock();
try {
    x = 10;
    y = 20;
} finally {
    sl.unlockWrite(stamp);
}

// 悲观读锁
long stamp = sl.readLock();
try {
    int currentX = x;
    int currentY = y;
} finally {
    sl.unlockRead(stamp);
}

// ⭐ 乐观读——无锁，性能最高
long stamp = sl.tryOptimisticRead();  // 获取版本号（无锁！）
int currentX = x;                      // 直接读
int currentY = y;                      // 直接读
if (!sl.validate(stamp)) {             // 验证：这期间有人写过吗？
    // 有写入 → 升级为悲观读锁重试
    stamp = sl.readLock();
    try {
        currentX = x;
        currentY = y;
    } finally {
        sl.unlockRead(stamp);
    }
}
```

### 6.2 StampedLock vs ReadWriteLock

```
乐观读的工作原理：

  tryOptimisticRead() 返回当前版本号 (stamp)
      ↓
  直接读变量（无锁，无阻塞！）
      ↓
  validate(stamp) 检查版本号：
    如果相等 → 读取期间没有写入 → 数据有效 ✅
    如果不等 → 有人写过 → 数据可能不一致 → 重试 ❌
```

```java
// 性能对比示意：读多写少场景
// ReentrantReadWriteLock：每次读都要 CAS 修改 state（读计数器）
//      ↓ 高并发下 CAS 自旋 → 性能瓶颈
// StampedLock 乐观读：完全不碰共享变量！无 CAS、无锁！
//      ↓ 只需 validate 时一次 volatile 读
```

| 对比维度 | ReentrantReadWriteLock | StampedLock |
|---------|:---:|:---:|
| 重入 | ✅ 支持 | ❌ 不支持 |
| 乐观读 | ❌ 不支持 | ✅ 支持 |
| 读性能（高并发） | 一般（CAS 竞争） | ✅ 优秀（无锁读） |
| Condition | ✅ 支持 | ❌ 不支持 |
| 公平锁 | ✅ 支持 | ❌ 只有非公平 |
| 中断 | ✅ 支持 | ❌ 不支持 |

> ⚠️ **StampedLock 的注意事项**：
> 1. **不可重入**：同一个线程不能重复获取同一把锁，否则死锁
> 2. **不支持 Condition**：没法做 await/signal
> 3. **用完必须释放**：否则后续线程永久阻塞
> 4. **适合读多写少的场景**：乐观读在这种场景下有数量级的性能提升

---

## 七、核心选型指南

```
  synchronized        JUC Lock
       │                  │
       │         ┌────────┼────────┬──────────────┐
       │         │        │        │              │
  (低竞争优先)  ReentrantLock  ReadWriteLock  StampedLock
                 (灵活锁)      (读多写少)     (极高并发读)
```

| 场景 | 推荐方案 | 原因 |
|------|---------|------|
| 简单同步，低竞争 | `synchronized` | 写法简洁，JVM 自动优化（锁升级/消除/粗化） |
| 需要 tryLock / 超时 / 可中断 | `ReentrantLock` | synchronized 不支持这些 |
| 需要公平锁 | `new ReentrantLock(true)` | synchronized 只能非公平 |
| 需要多个 Condition | `ReentrantLock` + `Condition` | synchronized 只有一个 wait set |
| 读多写少 | `ReentrantReadWriteLock` | 读线程可以并发 |
| 读极多且需要极致性能 | `StampedLock` 乐观读 | 无锁读，CAS 竞争降到最低 |
| 高竞争下的独占锁 | `ReentrantLock` | 比 synchronized 性能略好 |

---

## 八、总结

| 知识点 | 核心要点 |
|--------|---------|
| AQS 原理 | volatile state + CLH 变体队列 + CAS；子类实现 tryAcquire/tryRelease 等模板方法 |
| AQS 两种模式 | 独占 (acquire/release) 用于 Lock；共享 (acquireShared/releaseShared) 用于 Semaphore 等 |
| ReentrantLock | 基于 AQS 独占模式；state=0 未锁，state>0 表示被持有+重入次数 |
| 公平 vs 非公平 | 非公平：新线程先 CAS 抢一次；公平：检查 hasQueuedPredecessors() |
| Condition | Object.wait/notify 的 Lock 版本；一个 Lock 可创建多个 Condition |
| ReadWriteLock | state 高低 16 位分别计数；写锁是独占模式，读锁是共享模式 |
| 锁降级 | 写→读 降级允许（先获取读锁再释放写锁）；读→写 升级不允许（会死锁） |
| StampedLock | 乐观读无锁；不可重入；不支持 Condition；极高读并发场景最优 |

下一篇将讲解基于 AQS 共享模式构建的 **JUC 工具类**——`CountDownLatch`、`CyclicBarrier`、`Semaphore` 与原子类的底层原理和使用场景。

---

## 参考

- [AQS 源码 (JDK 17)](https://github.com/openjdk/jdk/blob/jdk-17-ga/src/java.base/share/classes/java/util/concurrent/locks/AbstractQueuedSynchronizer.java)
- [ReentrantLock JavaDoc](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/locks/ReentrantLock.html)
- [StampedLock JavaDoc](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/locks/StampedLock.html)
- [Brian Goetz - Java Concurrency in Practice, Chapter 13: Explicit Locks](https://jcip.net/)
- [Doug Lea - The java.util.concurrent Synchronizer Framework](https://gee.cs.oswego.edu/dl/papers/aqs.pdf)
