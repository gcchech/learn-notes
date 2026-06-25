---
title: ArrayList vs LinkedList
icon: list
order: 2
category:
  - Java
  - 集合框架
tag:
  - ArrayList
  - LinkedList
  - 扩容
  - 性能
  - Vector
---

# ArrayList vs LinkedList：扩容机制与源码解析

> 📖 `List` 是使用最频繁的接口，而它的两个核心实现——`ArrayList` 和 `LinkedList`——是面试中的经典对比题。"数组 vs 链表"的答案你可能背得滚瓜烂熟，但真正从源码层面理解它们的本质区别，才是写出高性能代码的关键。

---

## 一、List 接口——有序、可重复、有索引

```java
// List 在 Collection 之上增加了索引相关操作
public interface List<E> extends Collection<E> {
    // --- 按索引操作 ---
    E get(int index);               // 获取指定位置元素
    E set(int index, E element);    // 替换指定位置元素（返回旧值）
    void add(int index, E element); // 在指定位置插入
    E remove(int index);            // 按索引删除（返回删除的元素）

    // --- 查找 ---
    int indexOf(Object o);          // 从前向后找，返回第一个匹配的索引
    int lastIndexOf(Object o);      // 从后向前找

    // --- 范围操作 ---
    List<E> subList(int fromIndex, int toIndex);  // 子列表视图（fromInclusive, toExclusive）

    // --- 排序 ---
    default void sort(Comparator<? super E> c) { ... }

    // --- 遍历（JDK 8+） ---
    default void replaceAll(UnaryOperator<E> operator) { ... }
}
```

```java
// List 核心操作演示
List<String> list = new ArrayList<>(Arrays.asList("a", "b", "c", "d"));

System.out.println(list.get(2));     // c —— O(1) 索引访问
list.add(2, "x");                   // 在索引 2 处插入 → [a, b, x, c, d]
list.remove(1);                     // 删除索引 1 → [a, x, c, d]
System.out.println(list.indexOf("c")); // 2

// subList 是视图——修改会反映到原 List
List<String> sub = list.subList(1, 3);  // [x, c]
sub.set(0, "y");
System.out.println(list);           // [a, y, c, d] —— 原 List 也变了！

// sort 的便利
list.sort(String::compareTo);       // 字典序排序
```

---

## 二、⭐️ ArrayList——数组实现的动态列表

### 2.1 底层数据结构

`ArrayList` 底层就是一个 `Object[]`：

```java
// ArrayList 核心字段（JDK 8+）
public class ArrayList<E> extends AbstractList<E>
        implements List<E>, RandomAccess, Cloneable, java.io.Serializable {

    private static final int DEFAULT_CAPACITY = 10;          // 默认初始容量
    private static final Object[] EMPTY_ELEMENTDATA = {};     // 空数组（用于空参构造）
    private static final Object[] DEFAULTCAPACITY_EMPTY_ELEMENTDATA = {};  // 默认容量的空数组
    transient Object[] elementData;   // 真正存数据的数组（transient：手动序列化）
    private int size;                 // 当前元素个数（不是数组长度！）
}
```

> 💡 **为什么 elementData 是 transient？** 因为扩容机制下 elementData 数组通常存在未使用的空位。默认序列化整个数组会浪费空间，所以 ArrayList 自定义了 `writeObject()/readObject()`，只序列化前 `size` 个有效元素。

### 2.2 构造方法——延迟分配

```java
// ① 无参构造——数组初始为空数组 {}，第一次 add 时才扩容到 10
List<String> list1 = new ArrayList<>();

// ② 指定容量——避免频繁扩容，是高效的写法
List<String> list2 = new ArrayList<>(100);

// ③ 从其他集合创建
List<String> list3 = new ArrayList<>(Arrays.asList("a", "b", "c"));
```

### 2.3 ⭐️ 扩容机制——核心面试题

**扩容是 ArrayList 最重要的内部机制**。每次 add 时发现数组满了，就会触发扩容：

```java
// ArrayList.add() 源码逻辑（简化）
public boolean add(E e) {
    // 1. 确保容量够用
    ensureCapacityInternal(size + 1);
    // 2. 放入元素
    elementData[size++] = e;
    return true;
}

private void ensureCapacityInternal(int minCapacity) {
    // 如果是默认空数组，minCapacity 至少是 DEFAULT_CAPACITY (10)
    if (elementData == DEFAULTCAPACITY_EMPTY_ELEMENTDATA) {
        minCapacity = Math.max(DEFAULT_CAPACITY, minCapacity);
    }
    // 容量不够 → 扩容
    if (minCapacity - elementData.length > 0) {
        grow(minCapacity);
    }
}

private void grow(int minCapacity) {
    int oldCapacity = elementData.length;
    int newCapacity = oldCapacity + (oldCapacity >> 1);  // 1.5 倍！
    if (newCapacity - minCapacity < 0) {
        newCapacity = minCapacity;
    }
    if (newCapacity - MAX_ARRAY_SIZE > 0) {
        newCapacity = hugeCapacity(minCapacity);
    }
    elementData = Arrays.copyOf(elementData, newCapacity);  // 复制到新数组
}
```

> 🎯 **扩容公式**：`newCapacity = oldCapacity + (oldCapacity >> 1)` = **1.5 倍**。注意 JDK 6 及之前是 `(oldCapacity * 3) / 2 + 1`，JDK 7+ 去掉了 +1。

**扩容演示**：

```java
// 通过反射验证扩容过程
ArrayList<Integer> list = new ArrayList<>();
// list 此时 elementData 为空数组 {}，size = 0

list.add(1);
// 第一次 add → 扩容到 10，elementData.length = 10

for (int i = 2; i <= 11; i++) {
    list.add(i);
}
// 第 11 次 add → 10 * 1.5 = 15，elementData.length = 15

for (int i = 12; i <= 16; i++) {
    list.add(i);
}
// 第 16 次 add → 15 * 1.5 = 22，elementData.length = 22

// 用 addAll 一次性加很多 → 扩容到能满足所有元素的大小
list.addAll(Arrays.asList(1, 2, 3, 4, 5, 6, 7, 8, 9, 10));
// 先算 22 * 1.5 = 33，不够 32？一次到位
```

**最佳实践——预估容量**：

```java
// ❌ 差——10 → 15 → 22 → 33 → 49 → 73 → 109... 多次扩容+复制
List<Integer> list = new ArrayList<>();
for (int i = 0; i < 1000; i++) {
    list.add(i);
}

// ✅ 好——一次分配到位，0 次扩容
List<Integer> list = new ArrayList<>(1000);
for (int i = 0; i < 1000; i++) {
    list.add(i);
}
```

### 2.4 随机访问与 RandomAccess 接口

`ArrayList` 实现了 `RandomAccess` 标记接口——代表支持 O(1) 随机访问：

```java
// Collections.binarySearch 内部会判断是否实现 RandomAccess
if (list instanceof RandomAccess) {
    // 用 index-based 循环 → get(i) 是 O(1)
    return indexedBinarySearch(list, key);
} else {
    // 用 iterator → get(i) 可能是 O(n)
    return iteratorBinarySearch(list, key);
}
```

### 2.5 在指定位置插入/删除——O(n)

```java
// add(int index, E e) 的实现
public void add(int index, E element) {
    rangeCheckForAdd(index);
    ensureCapacityInternal(size + 1);
    System.arraycopy(elementData, index, elementData, index + 1, size - index);
    // ↑ 把 index 及之后的元素整体后移一位 —— O(n) ！
    elementData[index] = element;
    size++;
}

// 演示
List<String> list = new ArrayList<>(Arrays.asList("a", "b", "c", "d"));
list.add(1, "x");  // index=1 之后的 [b,c,d] 全部后移一位
// 插入前：[a, b, c, d]
// 插入后：[a, x, b, c, d] —— 后面 3 个元素被移动了
```

---

## 三、⭐️ LinkedList——双向链表，同时也是 Queue 和 Deque

### 3.1 底层数据结构

`LinkedList` 是一个**双向链表**，同时实现了 `List` 和 `Deque` 接口：

```java
public class LinkedList<E>
    extends AbstractSequentialList<E>
    implements List<E>, Deque<E>, Cloneable, java.io.Serializable {

    transient int size = 0;
    transient Node<E> first;  // 头节点
    transient Node<E> last;   // 尾节点

    // 内部节点类
    private static class Node<E> {
        E item;
        Node<E> next;
        Node<E> prev;
        Node(Node<E> prev, E element, Node<E> next) {
            this.item = element;
            this.next = next;
            this.prev = prev;
        }
    }
}
```

```
LinkedList 内部结构示意：

   first                               last
    ↓                                   ↓
  ┌─────┐     ┌─────┐     ┌─────┐     ┌─────┐
  │prev │ ←—— │prev │ ←—— │prev │ ←—— │prev │
  │ a   │     │ b   │     │ c   │     │ d   │
  │next │ ——→ │next │ ——→ │next │ ——→ │next │
  └─────┘     └─────┘     └─────┘     └─────┘
    ↑           ↑           ↑           ↑
  index 0    index 1    index 2    index 3
```

### 3.2 为什么 get(index) 是 O(n)？

```java
// LinkedList.get() 源码
public E get(int index) {
    checkElementIndex(index);
    return node(index).item;  // 先找到节点，再取值
}

Node<E> node(int index) {
    // 小小的优化：判断 index 在前半段还是后半段
    if (index < (size >> 1)) {
        // 前半段 → 从 first 向后遍历
        Node<E> x = first;
        for (int i = 0; i < index; i++)
            x = x.next;
        return x;
    } else {
        // 后半段 → 从 last 向前遍历
        Node<E> x = last;
        for (int i = size - 1; i > index; i--)
            x = x.prev;
        return x;
    }
}
```

> 💡 **小优化**：LinkedList 的 `node(index)` 并不从头傻傻地遍历到底，而是判断 index 离头近还是尾近——但这仍然是 O(n/2) = **O(n)**。

### 3.3 头尾插入/删除——O(1)

```java
// 头部插入（LinkedList 实现了 Deque 接口）
LinkedList<String> list = new LinkedList<>();
list.addFirst("a");  // O(1)
list.addFirst("b");  // O(1) —— 只需要修改 first 指针
System.out.println(list);  // [b, a]

// 尾部插入
list.addLast("c");   // O(1)

// 头部删除
list.removeFirst();  // O(1)

// 这些都是通过修改 prev/next 指针完成的，无需移动元素
```

### 3.4 LinkedList 的"三重身份"

```java
LinkedList<String> list = new LinkedList<>();

// ① 作为 List —— 按索引操作
list.add("a");              // 追加到尾部
list.get(0);                // 按索引获取（O(n)）

// ② 作为 Queue —— FIFO 队列
Queue<String> queue = list;
queue.offer("b");           // 入队 → addLast()
queue.poll();               // 出队 → removeFirst()
queue.peek();               // 查看队首 → getFirst()

// ③ 作为 Deque —— 双端队列 / 栈
Deque<String> deque = list;
deque.push("c");            // 压栈 → addFirst()
deque.pop();                // 弹栈 → removeFirst()
```

> 💡 虽然 `LinkedList` 实现了 `Deque`，但 **JDK 官方推荐用 `ArrayDeque` 替代 `LinkedList` 做栈和队列使用**——ArrayDeque 没有节点对象的额外开销，性能更好。

---

## 四、ArrayList vs LinkedList 性能实测

> ⚠️ **基准测试要用 `System.nanoTime()` + JVM 预热 + 多次迭代**，`System.currentTimeMillis()` 精度仅 10-15ms，对于毫秒级的操作完全不可靠。

```java
import java.util.*;

public class ListBenchmark {
    static final int SIZE = 100_000;
    static final int WARMUP_ROUNDS = 3;

    public static void main(String[] args) {
        // --- JVM 预热（触发 JIT 编译，避免把编译开销算进测试） ---
        for (int r = 0; r < WARMUP_ROUNDS; r++) {
            List<Integer> warm = new ArrayList<>();
            for (int i = 0; i < 10000; i++) warm.add(i);
            warm = new LinkedList<>();
            for (int i = 0; i < 10000; i++) warm.add(i);
        }

        // --- 尾部追加 ---
        System.gc();
        long start = System.nanoTime();
        List<Integer> alAdd = new ArrayList<>();
        for (int i = 0; i < SIZE; i++) alAdd.add(i);
        long alTail = System.nanoTime() - start;

        System.gc();
        start = System.nanoTime();
        List<Integer> llAdd = new LinkedList<>();
        for (int i = 0; i < SIZE; i++) llAdd.add(i);
        long llTail = System.nanoTime() - start;

        // --- 头部插入 ---
        System.gc();
        start = System.nanoTime();
        List<Integer> alHead = new ArrayList<>();
        for (int i = 0; i < SIZE; i++) alHead.add(0, i);
        long alHeadTime = System.nanoTime() - start;

        System.gc();
        start = System.nanoTime();
        List<Integer> llHead = new LinkedList<>();
        for (int i = 0; i < SIZE; i++) llHead.add(0, i);
        long llHeadTime = System.nanoTime() - start;

        // --- 随机访问 ---
        System.gc();
        start = System.nanoTime();
        for (int i = 0; i < SIZE; i++) alAdd.get((i * 97) % SIZE);
        long alGet = System.nanoTime() - start;

        System.gc();
        start = System.nanoTime();
        for (int i = 0; i < SIZE; i++) llAdd.get((i * 97) % SIZE);
        long llGet = System.nanoTime() - start;

        // 输出（ns → ms）
        System.out.printf("ArrayList  尾部追加: %.2f ms%n", alTail / 1_000_000.0);
        System.out.printf("LinkedList 尾部追加: %.2f ms%n", llTail / 1_000_000.0);
        System.out.printf("ArrayList  头部插入: %.2f ms%n", alHeadTime / 1_000_000.0);
        System.out.printf("LinkedList 头部插入: %.2f ms%n", llHeadTime / 1_000_000.0);
        System.out.printf("ArrayList  随机访问: %.2f ms%n", alGet / 1_000_000.0);
        System.out.printf("LinkedList 随机访问: %.2f ms%n", llGet / 1_000_000.0);
    }
}
```

典型输出（因机器而异）：

```
ArrayList  尾部追加: 2.22 ms
LinkedList 尾部追加: 1.48 ms
ArrayList  头部插入: 467.39 ms
LinkedList 头部插入: 3.09 ms
ArrayList  随机访问: 0.70 ms
LinkedList 随机访问: 4027.52 ms
```

**结论**：`ArrayList` 随机访问碾压 `LinkedList`；`LinkedList` 只在头部插入大量数据时占优。实际开发中，绝大多数场景都是尾部追加 + 随机遍历——所以 **ArrayList 是默认选择**。

---

## 五、Vector 和 Stack——过时的线程安全实现

### 5.1 Vector

`Vector` 和 `ArrayList` 底层结构完全相同（`Object[]`），但所有方法都加了 `synchronized`：

```java
// Vector 的方法全是 synchronized
public synchronized boolean add(E e) { ... }
public synchronized E get(int index) { ... }
public synchronized E remove(int index) { ... }
```

扩容方面，Vector 默认**2 倍**（可以通过构造函数指定 `capacityIncrement`，指定后按固定步长扩容）：

```java
// Vector 构造
Vector<String> v1 = new Vector<>();              // 初始 10，扩容 2 倍
Vector<String> v2 = new Vector<>(20);            // 初始 20，扩容 2 倍
Vector<String> v3 = new Vector<>(20, 5);         // 初始 20，每次扩 5

// Stack 是 Vector 的子类
Stack<String> stack = new Stack<>();
stack.push("a");
stack.push("b");
System.out.println(stack.pop());  // "b"
```

> ⚠️ **不再推荐使用 Vector 和 Stack**。需要线程安全的 List 用 `Collections.synchronizedList()` 或 `CopyOnWriteArrayList`；需要栈用 `ArrayDeque`。

### 5.2 各 List 实现选型总结

| 实现 | 底层结构 | 特点 | 推荐场景 |
|------|---------|------|---------|
| `ArrayList` | `Object[]` | O(1) 随机访问，1.5x 扩容 | **默认首选** |
| `LinkedList` | 双向链表 | 头尾 O(1)，List/Queue/Deque 三合一 | 频繁头尾操作、不需随机访问 |
| `Vector` | `Object[]` | 全方法 synchronized，2x 扩容 | **已过时，不再使用** |
| `Stack` | extends Vector | push/pop/peek | **已过时，用 ArrayDeque 替代** |
| `CopyOnWriteArrayList` | `Object[]` 写时复制 | 读无锁，写复制整个数组 | 读多写少并发场景 |

---

## 六、总结

| 知识点 | 核心要点 |
|--------|---------|
| ArrayList 底层 | `Object[]` + 1.5 倍扩容；默认第一次 add 扩容到 10 |
| ArrayList 扩容代价 | 扩容 = `Arrays.copyOf()` → 创建新数组 + 复制元素；预估容量可避免频繁扩容 |
| ArrayList 插入/删除 | O(n)——需要移动后续元素（`System.arraycopy`） |
| LinkedList 底层 | 双向链表，内部 `Node` 类持有 prev/item/next |
| LinkedList 随机访问 | O(n)——需要遍历半个链表找到节点 |
| LinkedList 头尾操作 | O(1)——直接修改 first/last 指针 |
| RandomAccess | 标记接口，代表支持 O(1) 随机访问；`Collections` 内部据此选择遍历策略 |
| Vector | 全方法 synchronized，2 倍扩容——已过时 |
| Stack | extends Vector——设计有问题，用 `ArrayDeque` 替代 |
| 默认选择 | **优先用 ArrayList**；需要双端队列用 `ArrayDeque`；极少场景需要 `LinkedList` |

下一篇我们将进入 **Set 集合**——HashSet 的去重原理（hashCode/equals 契约）、TreeSet 的红黑树排序、LinkedHashSet 如何保持插入顺序，以及面试中绕不开的"为什么重写 equals 必须重写 hashCode"。

---

## 参考

- [ArrayList JavaDoc (JDK 17)](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/ArrayList.html)
- [LinkedList JavaDoc (JDK 17)](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/LinkedList.html)
- [Effective Java - Item 47: Prefer Collection to Stream as a return type](https://www.oreilly.com/library/view/effective-java/9780134686097/)
- [JavaGuide - ArrayList 源码分析](https://javaguide.cn/java/collection/arraylist-source-code.html)
- [javabetter.cn - ArrayList](https://javabetter.cn/collection/arraylist.html)
