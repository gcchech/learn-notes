---
title: Queue、Deque 与 BlockingQueue
icon: list-ol
order: 5
category:
  - Java
  - 集合框架
tag:
  - Queue
  - Deque
  - PriorityQueue
  - BlockingQueue
  - 二叉堆
---

# Queue 家族：优先级队列、双端队列与阻塞队列

> 📖 队列是最经典的"生产者-消费者"模式背后的数据结构。Java 在 `java.util` 包中提供了三层队列抽象：`Queue`（普通队列）、`Deque`（双端队列）、`BlockingQueue`（阻塞队列）。从 `PriorityQueue` 的二叉堆到 `ArrayDeque` 的循环数组，再到 `BlockingQueue` 的生产者-消费者实现——本文一次性讲透。

---

## 一、Queue 接口——FIFO 队列

### 1.1 两种风格的方法

`Queue` 接口的方法分为两套：一套**抛异常**，一套**返回特殊值**：

| 操作 | 抛异常版本 | 返回特殊值版本 | 说明 |
|------|-----------|--------------|------|
| 入队 | `add(e)` | `offer(e)` | offer 失败返回 false（容量有限时） |
| 出队 | `remove()` | `poll()` | poll 在队列空时返回 null |
| 查看队首 | `element()` | `peek()` | peek 在队列空时返回 null |

```java
Queue<String> queue = new LinkedList<>();

// 入队
queue.offer("a");     // 推荐：不会抛异常
queue.offer("b");
queue.offer("c");
System.out.println(queue);  // [a, b, c]

// 查看队首
System.out.println(queue.peek());  // "a" —— 只看不取

// 出队
System.out.println(queue.poll());  // "a" —— 取出并移除
System.out.println(queue.poll());  // "b"
System.out.println(queue.poll());  // "c"
System.out.println(queue.poll());  // null —— 队列已空
// System.out.println(queue.remove()); // ❌ NoSuchElementException

// 容量有限的队列（如 ArrayBlockingQueue）
Queue<String> bounded = new ArrayBlockingQueue<>(2);
bounded.offer("a");   // true
bounded.offer("b");   // true
bounded.offer("c");   // false —— 队列满了！
// bounded.add("c");  // ❌ IllegalStateException: Queue full
```

> 🎯 **最佳实践**：日常开发优先使用 `offer/poll/peek` 三件套，避免不必要的异常。

---

## 二、Deque 接口——双端队列，栈+队列二合一

### 2.1 Deque 方法一览

`Deque`（Double-Ended Queue）两端都可以插入和删除：

```java
//         头部                        尾部
//    First (Head)                Last (Tail)
//    offerFirst(e)  ←─── deque ───→  offerLast(e)
//    pollFirst()  ←──────────────→  pollLast()
//    peekFirst()  ←──────────────→  peekLast()
//    push(e) / pop()  (栈操作，头部)
```

| 操作 | 头部抛异常 | 头部特殊值 | 尾部抛异常 | 尾部特殊值 |
|------|----------|----------|----------|----------|
| 入队 | `addFirst(e)` | `offerFirst(e)` | `addLast(e)` | `offerLast(e)` |
| 出队 | `removeFirst()` | `pollFirst()` | `removeLast()` | `pollLast()` |
| 查看 | `getFirst()` | `peekFirst()` | `getLast()` | `peekLast()` |

```java
Deque<String> deque = new ArrayDeque<>();

// 两端入队
deque.offerFirst("a");  // 头部入 → [a]
deque.offerLast("b");   // 尾部入 → [a, b]
deque.offerFirst("c");  // 头部入 → [c, a, b]
System.out.println(deque);  // [c, a, b]

// 两端出队
System.out.println(deque.pollFirst());  // "c" → [a, b]
System.out.println(deque.pollLast());   // "b" → [a]

// Deque 也可以当栈使用（在头部操作）
Deque<String> stack = new ArrayDeque<>();
stack.push("a");    // push = addFirst
stack.push("b");    // push = addFirst
stack.push("c");    // push = addFirst
System.out.println(stack.pop());  // "c" —— pop = removeFirst
System.out.println(stack.pop());  // "b"
System.out.println(stack.pop());  // "a"

// ✅ 推荐：用 Deque 做栈，代替过时的 Stack 类
// ❌ Stack<String> s = new Stack<>();  // 已过时
```

> 🎯 **面试重点**：`Deque` 同时实现了 Queue 和 Stack 的功能。JDK 官方推荐用 `ArrayDeque` 代替旧的 `Stack` 类——后者继承自 `Vector`，所有方法 synchronized，设计臃肿。

---

## 三、⭐️ ArrayDeque——循环数组，比 LinkedList 更好

### 3.1 底层结构

`ArrayDeque` 底层是一个**循环数组**，用 `head` 和 `tail` 两个指针管理双端操作：

```java
public class ArrayDeque<E> extends AbstractCollection<E>
        implements Deque<E>, Cloneable, Serializable {

    transient Object[] elements;   // 循环数组
    transient int head;            // 头部索引
    transient int tail;            // 尾部索引（下一个可插入位置）

    // 默认初始容量 16
    public ArrayDeque() {
        elements = new Object[16];
    }

    // 指定容量会向上取到 2 的幂
    public ArrayDeque(int numElements) {
        elements = new Object[calculateSize(numElements)];
    }
}
```

```
ArrayDeque 循环数组示意（容量 8）

  elements: [e, f, null, null, a, b, c, d]
             ↑          ↑     ↑
           tail=2     head=4  (tail 追着 head 走)

  按队列角度看：head=4 开始 → a,b,c,d → 到末尾 → 循环到 e,f → tail=2
  实际顺序：[a, b, c, d, e, f]
```

### 3.2 为什么 ArrayDeque 比 LinkedList 快？

| 对比维度 | ArrayDeque | LinkedList |
|---------|-----------|------------|
| 底层 | 循环数组 | 双向链表 |
| 内存 | 紧凑，无额外对象头 | 每个节点一个对象（~24 字节开销） |
| 缓存友好 | ✅ 连续内存，CPU 缓存友好 | ❌ 节点分散，缓存不友好 |
| 扩容 | O(n) 复制，但摊销 O(1) | 无需扩容，每次 add 新建节点 |
| GC 压力 | 低（一个数组对象） | 高（每个元素产生一个 Node 垃圾） |

```java
// 性能对比：ArrayDeque vs LinkedList 作为队列
Deque<Integer> arrayDeque = new ArrayDeque<>();
Deque<Integer> linkedList = new LinkedList<>();

// 100 万次 offer/poll —— ArrayDeque 通常快 30%~50%
```

### 3.3 核心操作都是 O(1)

```java
// addFirst —— head 前移（循环）
public void addFirst(E e) {
    elements[head = (head - 1) & (elements.length - 1)] = e;
    if (head == tail) doubleCapacity();  // 数组满了 → 扩容
}

// addLast —— tail 后移（循环）
public void addLast(E e) {
    elements[tail] = e;
    if ((tail = (tail + 1) & (elements.length - 1)) == head)
        doubleCapacity();
}

// pollFirst —— head 后移
public E pollFirst() {
    int h = head;
    E result = (E) elements[h];
    if (result == null) return null;
    elements[h] = null;  // 帮助 GC
    head = (h + 1) & (elements.length - 1);
    return result;
}
```

> 💡 `(head - 1) & (elements.length - 1)` 是循环数组取模的经典写法——前提是数组长度是 2 的幂。这与 HashMap 的索引计算是同一个技巧。

---

## 四、⭐️ PriorityQueue——二叉堆实现的优先级队列

### 4.1 什么是优先级队列？

`PriorityQueue` 不是按 FIFO 顺序出队，而是按**优先级**出队——每次 poll 都返回**最小**（或按 Comparator 定义的最优先）的元素：

```java
// 默认：自然顺序（数字从小到大，字符串字典序）
PriorityQueue<Integer> pq = new PriorityQueue<>();
pq.offer(5);
pq.offer(1);
pq.offer(3);
pq.offer(2);
pq.offer(4);

System.out.println(pq.peek());  // 1 —— 最小元素在堆顶
System.out.println(pq.poll());  // 1
System.out.println(pq.poll());  // 2
System.out.println(pq.poll());  // 3
System.out.println(pq.poll());  // 4
System.out.println(pq.poll());  // 5

// 定制顺序：用 Comparator 实现大顶堆（从大到小）
PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Comparator.reverseOrder());
maxHeap.offer(5);
maxHeap.offer(1);
maxHeap.offer(3);
System.out.println(maxHeap.poll());  // 5 —— 最大先出
```

### 4.2 底层：二叉堆（Binary Heap）

`PriorityQueue` 底层是一个**平衡二叉堆**（默认小顶堆），存储在数组中：

```java
public class PriorityQueue<E> extends AbstractQueue<E> {
    transient Object[] queue;   // 平衡二叉堆，queue[0] 是堆顶
    private int size = 0;
    private final Comparator<? super E> comparator;

    // 默认初始容量 11（注意：不是 16！）
    private static final int DEFAULT_INITIAL_CAPACITY = 11;
}
```

**二叉堆的父子关系**（基于数组索引）：

```
对于索引 i 的元素：
  - 父节点索引：(i - 1) / 2
  - 左子节点：2 * i + 1
  - 右子节点：2 * i + 2

数组状态（小顶堆）：
  queue = [1, 3, 2, 5, 4]
  堆结构：
       1       ← queue[0]
      / \
     3   2     ← queue[1], queue[2]
    / \
   5   4       ← queue[3], queue[4]
```

### 4.3 add 过程——上浮（siftUp）

```java
// 简化的 siftUp 逻辑
private void siftUp(int k, E x) {
    while (k > 0) {
        int parent = (k - 1) >>> 1;   // 父节点索引
        Object e = queue[parent];
        if (comparator.compare(x, (E) e) >= 0)
            break;  // 找到了合适位置
        queue[k] = e;  // 父节点下沉
        k = parent;
    }
    queue[k] = x;  // 新元素放入最终位置
}

// 示例：向 [1, 3, 5, 7] 添加 2
// ① 放在末尾 → [1, 3, 5, 7, 2]
// ② 2 < 父节点 3 → 交换 → [1, 2, 5, 7, 3]
// ③ 2 > 父节点 1 → 停止
```

### 4.4 poll 过程——下沉（siftDown）

```java
// 简化的 siftDown 逻辑
private void siftDown(int k, E x) {
    int half = size >>> 1;
    while (k < half) {  // 非叶子节点
        int child = (k << 1) + 1;  // 左子节点
        Object c = queue[child];
        int right = child + 1;
        // 选出左右子节点中较小的
        if (right < size &&
            comparator.compare((E) c, (E) queue[right]) > 0)
            c = queue[child = right];
        if (comparator.compare(x, (E) c) <= 0)
            break;
        queue[k] = c;  // 子节点上浮
        k = child;
    }
    queue[k] = x;
}

// 示例：poll [1, 2, 5, 7, 3]
// ① 取出 1，末尾 3 放到堆顶 → [3, 2, 5, 7]
// ② 3 > 子节点 2 → 2 上浮 → [2, 3, 5, 7]
// ③ 3 已经是叶子 → 停止
```

> 🎯 **时间复杂度**：add（siftUp）= O(log n)，poll（siftDown）= O(log n)，peek = O(1)。

### 4.5 PriorityQueue 的遍历陷阱

```java
PriorityQueue<Integer> pq = new PriorityQueue<>(Arrays.asList(5, 1, 3, 2, 4));

// ⚠️ 注意：用 for-each 遍历得到的不是排序顺序！
for (int x : pq) {
    System.out.print(x + " ");  // 输出：1 2 3 5 4 —— 堆的内部顺序，不是排序结果！
}

// ✅ 要按优先级顺序，必须用 poll()
while (!pq.isEmpty()) {
    System.out.print(pq.poll() + " ");  // 1 2 3 4 5 —— 正确的排序输出
}
```

---

## 五、⭐️ BlockingQueue——生产者-消费者的基石

### 5.1 BlockingQueue 接口

`BlockingQueue` 在 Queue 的基础上增加了**阻塞等待**的能力：

```java
public interface BlockingQueue<E> extends Queue<E> {
    // 入队——队列满时阻塞等待
    void put(E e) throws InterruptedException;

    // 出队——队列空时阻塞等待
    E take() throws InterruptedException;

    // 带超时的版本
    boolean offer(E e, long timeout, TimeUnit unit) throws InterruptedException;
    E poll(long timeout, TimeUnit unit) throws InterruptedException;

    // 剩余容量
    int remainingCapacity();

    // 批量操作
    int drainTo(Collection<? super E> c);  // 排空到指定集合
}
```

```java
// 经典生产者-消费者模式
BlockingQueue<String> queue = new LinkedBlockingQueue<>(10);

// 生产者线程
Thread producer = new Thread(() -> {
    try {
        for (int i = 0; i < 100; i++) {
            String item = "Item-" + i;
            queue.put(item);  // 队列满了就阻塞，直到消费者取走
            System.out.println("生产: " + item);
        }
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
    }
});

// 消费者线程
Thread consumer = new Thread(() -> {
    try {
        while (true) {
            String item = queue.take();  // 队列空了就阻塞，直到生产者放入
            System.out.println("消费: " + item);
            Thread.sleep(500);  // 模拟处理耗时
        }
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
    }
});

producer.start();
consumer.start();
```

### 5.2 常见 BlockingQueue 实现对比

| 实现 | 底层结构 | 是否定长 | 锁机制 | 特点 |
|------|---------|:---:|------|------|
| `ArrayBlockingQueue` | 数组 | ✅ 定长 | 单锁（putLock==takeLock） | 内存紧凑，公平性可配置 |
| `LinkedBlockingQueue` | 单向链表 | 可选（默认 Integer.MAX_VALUE） | 双锁（putLock + takeLock） | 支持更高并发，默认无界 |
| `PriorityBlockingQueue` | 二叉堆（数组） | ❌ 无界 | 单锁 | 按优先级出队 |
| `SynchronousQueue` | 无内部容量 | ✅ 容量 0 | — | 生产者和消费者必须「手递手」交接 |
| `DelayQueue` | PriorityQueue | ❌ 无界 | 单锁 | 元素到期才能取出 |
| `LinkedTransferQueue` | 单向链表 | ❌ 无界 | CAS + 自旋 | 高性能，JDK 7 引入 |

```java
// ArrayBlockingQueue —— 容量固定，可选公平锁
BlockingQueue<String> abq = new ArrayBlockingQueue<>(100, true);  // fair=true 保证 FIFO

// LinkedBlockingQueue —— 推荐指定容量，避免无界导致 OOM
BlockingQueue<String> lbq = new LinkedBlockingQueue<>(1000);

// SynchronousQueue —— 没有容量的"传球"队列
BlockingQueue<String> sq = new SynchronousQueue<>();
// sq.put("a");  // 会一直阻塞，直到有另一个线程来 take()

// 典型应用：Executors.newCachedThreadPool() 使用 SynchronousQueue
// 新任务必须立即有线程处理，否则创建新线程

// DelayQueue —— 延迟任务
class DelayedTask implements Delayed {
    private final long executeTime;
    private final String name;

    public DelayedTask(String name, long delayMs) {
        this.name = name;
        this.executeTime = System.currentTimeMillis() + delayMs;
    }

    @Override
    public long getDelay(TimeUnit unit) {
        return unit.convert(executeTime - System.currentTimeMillis(), TimeUnit.MILLISECONDS);
    }

    @Override
    public int compareTo(Delayed o) {
        return Long.compare(this.executeTime, ((DelayedTask) o).executeTime);
    }
}

DelayQueue<DelayedTask> dq = new DelayQueue<>();
dq.put(new DelayedTask("task1", 3000));  // 3 秒后到期
// dq.take() 会阻塞 3 秒，直到 task1 到期
```

### 5.3 双锁设计——LinkedBlockingQueue 为什么用两把锁？

```java
// ArrayBlockingQueue —— 一把锁，读写互斥
// 生产者 put 时消费者不能 take（锁被占用）

// LinkedBlockingQueue —— 两把锁
// putLock：生产者之间互斥
// takeLock：消费者之间互斥
// 生产者和消费者之间不互斥！可以同时进行 put 和 take
```

```
LinkedBlockingQueue 内部：
  head → [node1] → [node2] → ... → [nodeN] ← last
              ↑                      ↑
         takeLock                putLock
         (头部出队)              (尾部入队)

  只要队列不空不满，put 和 take 互不影响 → 更高并发
```

---

## 六、总结

| 知识点 | 核心要点 |
|--------|---------|
| Queue 方法 | offer/poll/peek（返回特殊值）优于 add/remove/element（抛异常） |
| Deque | 双端操作；可当栈用（push/pop）；JDK 推荐代替 Stack |
| ArrayDeque | 循环数组，O(1) 头尾操作，比 LinkedList 内存更省、缓存更友好 |
| PriorityQueue | 二叉堆实现；add/poll O(log n)，peek O(1)；默认小顶堆 |
| 遍历陷阱 | for-each PriorityQueue 得到的是堆内部顺序，不是排序结果；排序必须 poll |
| BlockingQueue | put/take 阻塞等待；生产者-消费者的标准实现 |
| ArrayBlockingQueue | 单锁，定长 |
| LinkedBlockingQueue | 双锁（putLock+takeLock），默认无界，建议指定容量 |
| SynchronousQueue | 容量为 0，生产者必须等消费者"手递手" |
| DelayQueue | 基于 PriorityQueue，元素到期才能 poll |

集合框架的 5 篇到此全部完成。下一篇将进入 **并发编程**模块——线程的生命周期与状态转换、wait/notify 机制、`synchronized` 的锁升级过程（偏向锁→轻量级锁→重量级锁）、以及 volatile 的内存可见性原理。

---

## 参考

- [Oracle Java Tutorials - Queue Interface](https://docs.oracle.com/javase/tutorial/collections/interfaces/queue.html)
- [ArrayDeque JavaDoc (JDK 17)](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/ArrayDeque.html)
- [PriorityQueue JavaDoc (JDK 17)](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/PriorityQueue.html)
- [BlockingQueue JavaDoc (JDK 17)](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/BlockingQueue.html)
- [Java Concurrency in Practice - Chapter 5: Building Blocks](https://jcip.net/)
- [JavaGuide - Queue](https://javaguide.cn/java/collection/)
