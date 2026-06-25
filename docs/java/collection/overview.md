---
title: 集合框架概览
icon: cubes
order: 1
category:
  - Java
  - 集合框架
tag:
  - 集合
  - Collection
  - Map
  - Iterator
  - fail-fast
---

# Java 集合框架：从 ArrayList 到 ConcurrentHashMap

> 📖 集合是 Java 中最常用的工具——每天我们都在和 ArrayList、HashMap 打交道。但"会用"只是第一步，"理解原理"才能写出高性能、少出 bug 的代码。本文从集合框架的整体架构出发，带你建立完整的知识地图。

---

## 一、为什么需要集合框架？

在 Java 诞生初期，存储多个对象只能靠数组（`String[]`）或 `Vector`/`Hashtable`。数组长度固定不可变，操作单一，缺少便利方法。Java 2（JDK 1.2）引入了 **Java Collections Framework（JCF）**，提供了一套统一、可复用的数据容器体系。

```java
// 没有集合框架时——数组的痛点
String[] arr = new String[3];
arr[0] = "hello";
arr[1] = "world";
arr[2] = "!";
// arr[3] = "?";  // ❌ ArrayIndexOutOfBoundsException——长度固定！
// 删除元素？需要自己写循环 + System.arraycopy——极其繁琐

// 有了集合框架——一行代码搞定大部分操作
List<String> list = new ArrayList<>();
list.add("hello");
list.add("world");
list.remove("world");          // 删除
list.contains("hello");        // 查找
list.addAll(Arrays.asList("a", "b", "c"));  // 批量添加
```

集合框架统一了数据容器的接口，让开发者**面向接口编程**——切换底层实现只需要改一行 new 的类名。

---

## 二、集合框架体系全景

Java 集合框架的两大主体系：**Collection**（单列集合）和 **Map**（双列集合）。

### 2.1 Collection 体系

```
                        Iterable (接口)
                            |
                        Collection (接口)
                  /         |          \
               List        Set        Queue / Deque
              /    \      /   \         /      \
       ArrayList  LinkedList  HashSet  TreeSet  ArrayDeque  PriorityQueue
         |           |           |
       Vector    (双向链表)   LinkedHashSet
```

**核心接口职责**：

| 接口 | 特点 | 代表实现 | 一句话记忆 |
|------|------|---------|-----------|
| `List` | 有序、可重复、有索引 | `ArrayList`, `LinkedList` | "排队列表，可以插队" |
| `Set` | 无序（或排序）、不可重复 | `HashSet`, `TreeSet` | "数学集合，独一无二" |
| `Queue` | 先进先出（FIFO） | `LinkedList`, `ArrayDeque` | "排队处理，先到先得" |
| `Deque` | 双端队列，两端可进出 | `ArrayDeque` | "两头通，栈+队列二合一" |

### 2.2 Map 体系

```
                        Map<K,V> (接口)
                  /        |           \
           HashMap    Hashtable    SortedMap
              |          |           /    \
         LinkedHashMap  Properties  TreeMap  ConcurrentMap
                                           (继承自 ConcurrentMap 接口)
                                          /           \
                                 ConcurrentHashMap  ConcurrentSkipListMap
```

**核心实现职责**：

| 接口/类 | 特点 | 底层结构 | 线程安全 |
|---------|------|---------|---------|
| `HashMap` | 键值对，O(1) 查询 | JDK 8+ 数组+链表+红黑树 | ❌ |
| `LinkedHashMap` | 保持插入/访问顺序 | HashMap + 双向链表 | ❌ |
| `TreeMap` | 按键排序 | 红黑树 | ❌ |
| `Hashtable` | 古老实现，全方法 synchronized | 数组+链表 | ✅（已过时） |
| `ConcurrentHashMap` | 分段锁/CAS，高并发 | JDK 8+ 同 HashMap | ✅ |

> 💡 **记忆技巧**：Collection 接口名 = 单列，Map 接口名 = 双列（键值对）。实现了 `Iterable` 的类都可以用 for-each 遍历。

---

## 三、⭐️ Collection 接口的核心方法

`Collection` 是所有单列集合的根接口，定义了集合操作的基本规范：

```java
public interface Collection<E> extends Iterable<E> {
    // --- 增删 ---
    boolean add(E e);               // 添加元素
    boolean remove(Object o);       // 删除元素（只删第一个匹配项）
    boolean addAll(Collection<? extends E> c);   // 批量添加
    boolean removeAll(Collection<?> c);          // 批量删除（差集）
    boolean retainAll(Collection<?> c);          // 保留交集
    void clear();                   // 清空

    // --- 查询 ---
    int size();                     // 元素个数
    boolean isEmpty();              // 是否为空
    boolean contains(Object o);     // 是否包含
    boolean containsAll(Collection<?> c);  // 是否包含全部

    // --- 转换 ---
    Object[] toArray();             // 转 Object 数组
    <T> T[] toArray(T[] a);         // 转指定类型数组

    // --- 遍历 ---
    Iterator<E> iterator();         // 获取迭代器

    // --- 流式（JDK 8+） ---
    default Stream<E> stream() { ... }
    default Stream<E> parallelStream() { ... }
}
```

```java
// 常用操作演示
Collection<String> c = new ArrayList<>();
c.add("apple");
c.add("banana");
c.add("cherry");

System.out.println(c.size());        // 3
System.out.println(c.contains("apple"));  // true
c.remove("banana");
System.out.println(c);               // [apple, cherry]

Collection<String> other = Arrays.asList("cherry", "date");
c.retainAll(other);                  // 只保留和 other 的交集
System.out.println(c);               // [cherry]
```

---

## 四、⭐️ 迭代器（Iterator）——统一的遍历方式

### 4.1 Iterator 接口

`Iterator` 是遍历集合的**标准方式**——屏蔽了不同集合的底层实现差异：

```java
public interface Iterator<E> {
    boolean hasNext();   // 还有下一个元素吗？
    E next();            // 返回下一个元素，指针后移
    default void remove() { throw new UnsupportedOperationException(); }
    default void forEachRemaining(Consumer<? super E> action) { ... }
}
```

```java
List<String> list = new ArrayList<>(Arrays.asList("a", "b", "c"));

// ① 显式使用 Iterator
Iterator<String> it = list.iterator();
while (it.hasNext()) {
    String s = it.next();
    if ("b".equals(s)) {
        it.remove();  // ✅ 用 Iterator 的 remove 安全删除
    }
}
System.out.println(list);  // [a, c]

// ② for-each 语法糖——编译器生成 Iterator 代码
for (String s : list) {
    System.out.println(s);
}
// 等价于上面的 while(hasNext()){ next() } 模式
```

> 🎯 **口诀**：for-each 的本质是 `Iterable` + `Iterator`。任何实现了 `Iterable` 接口的类都可以用 for-each。

### 4.2 Iterable 接口——for-each 的底层原理

```java
public interface Iterable<T> {
    Iterator<T> iterator();
    default void forEach(Consumer<? super T> action) { ... }
    default Spliterator<T> spliterator() { ... }
}

// Collection 继承了 Iterable，所以所有集合都支持 for-each
public interface Collection<E> extends Iterable<E> { ... }
```

### 4.3 遍历中删除——一个常见错误

```java
List<String> list = new ArrayList<>(Arrays.asList("a", "b", "c", "d"));

// ❌ 错误写法——ConcurrentModificationException
for (String s : list) {
    if ("b".equals(s)) {
        list.remove(s);  // 并发修改异常！
    }
}

// ❌ 同样错误——for-i 虽然不会抛异常，但可能漏删
for (int i = 0; i < list.size(); i++) {
    if ("b".equals(list.get(i))) {
        list.remove(i);  // 删除后索引错位，如果连续两个要删的就会漏掉第二个
    }
}

// ✅ 正确写法——用 Iterator.remove()
Iterator<String> it = list.iterator();
while (it.hasNext()) {
    if ("b".equals(it.next())) {
        it.remove();
    }
}

// ✅ 更简洁——用 removeIf（JDK 8+）
list.removeIf("b"::equals);  // 内部也是 Iterator
```

---

## 五、⭐️ fail-fast（快速失败）机制

### 5.1 什么是 fail-fast？

fail-fast 是 Java 集合的一种**错误检测机制**——当你在**迭代集合的过程中**，集合的结构被**非迭代器自身的方法**修改了，迭代器立即抛出 `ConcurrentModificationException`，而不是继续用不确定的数据跑下去。

```java
List<String> list = new ArrayList<>(Arrays.asList("a", "b", "c"));

// 场景：线程 A 在遍历，线程 B 修改了集合
for (String s : list) {
    System.out.println(s);
    if ("b".equals(s)) {
        list.add("x");  // ❌ 抛出 ConcurrentModificationException！
    }
}
```

### 5.2 底层原理——modCount

`ArrayList`（以及大部分集合类）内部维护了一个 `modCount` 计数器，每当结构发生变化（add/remove 等），计数器 +1：

```java
// ArrayList 源码简析
public class ArrayList<E> extends AbstractList<E> {
    protected transient int modCount = 0;  // 结构修改计数器

    public boolean add(E e) {
        modCount++;  // 结构变了
        // ... 扩容 + 添加逻辑
    }
}

// AbstractList 的内部类 Itr（Iterator 实现）
private class Itr implements Iterator<E> {
    int expectedModCount = modCount;  // 创建迭代器时记录当时的 modCount

    public E next() {
        checkForComodification();  // 每次 next() 都检查
        // ...
    }

    final void checkForComodification() {
        if (modCount != expectedModCount)
            throw new ConcurrentModificationException();  // 有人改了！
    }

    // Iterator 自己的 remove() 会同步 expectedModCount
    public void remove() {
        // ... 删除元素
        expectedModCount = modCount;  // 同步最新的 modCount
    }
}
```

> 🎯 **一句话理解**：迭代器持有一张"快照编号"(`expectedModCount`)，每次操作前对比集合的当前版本号(`modCount`)。版本号对不上 → 抛异常。

### 5.3 fail-safe——CopyOnWriteArrayList

与 fail-fast 相对的是 **fail-safe** 机制——遍历时操作的是原始集合的**快照副本**，所以不会抛异常：

```java
// CopyOnWriteArrayList——写时复制，遍历的是快照
CopyOnWriteArrayList<String> list = new CopyOnWriteArrayList<>();
list.add("a");
list.add("b");
list.add("c");

// 遍历过程中修改——不会抛异常
for (String s : list) {
    System.out.print(s + " ");  // 输出：a b c
    if ("c".equals(s)) {
        list.add("d");  // ✅ 不抛异常！但本次遍历看不到新元素
        list.add("e");
    }
}
System.out.println("\n最终列表：" + list);  // [a, b, c, d, e]
```

| 对比维度 | fail-fast | fail-safe |
|---------|----------|-----------|
| **代表类** | ArrayList, HashSet, HashMap | CopyOnWriteArrayList, ConcurrentHashMap |
| **原理** | modCount 检查 | 操作快照副本 |
| **遍历中修改** | 抛 ConcurrentModificationException | 不抛异常，但遍历的是旧数据 |
| **性能** | 高（无额外复制） | 低（写操作需要复制整个数组） |
| **适用场景** | 单线程 / 少量修改 | 读多写少的并发场景 |

---

## 六、选型指南——什么时候用什么集合？

```
我需要存储...

  单列元素？ → Collection
    ├── 需要索引/可重复？ → List
    │   ├── 读多写少 → ArrayList（数组，O(1) 随机访问）
    │   └── 频繁头尾插入删除 → LinkedList（双向链表）
    ├── 元素不重复？ → Set
    │   ├── 无序，O(1) 查询 → HashSet
    │   ├── 需要排序 → TreeSet（红黑树，O(log n)）
    │   └── 需要保持插入顺序 → LinkedHashSet
    └── 先进先出？ → Queue/Deque
        ├── 普通队列 → ArrayDeque（比 LinkedList 快）
        ├── 需要优先级 → PriorityQueue（二叉堆）
        └── 并发阻塞队列 → ArrayBlockingQueue / LinkedBlockingQueue

  键值对？ → Map
    ├── O(1) 查询，无序 → HashMap
    ├── 需要保持顺序 → LinkedHashMap（插入序/访问序 LRU）
    ├── 按键排序 → TreeMap（红黑树）
    └── 高并发 → ConcurrentHashMap
```

### 常用集合的性能速查

| 集合类 | 随机访问 | 插入 | 删除 | 查找 | 内存占用 |
|--------|:---:|:---:|:---:|:---:|:---:|
| `ArrayList` | O(1) | O(n) | O(n) | O(n) | 低 |
| `LinkedList` | O(n) | O(1)* | O(1)* | O(n) | 高（大量节点对象） |
| `HashSet`/`HashMap` | — | O(1) | O(1) | O(1) | 中 |
| `TreeSet`/`TreeMap` | — | O(log n) | O(log n) | O(log n) | 中 |
| `LinkedHashSet/Map` | — | O(1) | O(1) | O(1) | 中（额外链表开销） |
| `ArrayDeque` | — | O(1)* | O(1)* | — | 低 |

> \* 指在头部/尾部操作。LinkedList 在指定位置插入仍需 O(n) 遍历找到位置。

---

## 七、Collections 工具类

`java.util.Collections` 提供了大量操作集合的静态方法：

```java
List<Integer> list = new ArrayList<>(Arrays.asList(3, 1, 4, 1, 5, 9, 2, 6));

// --- 排序与查找 ---
Collections.sort(list);                // [1, 1, 2, 3, 4, 5, 6, 9]
int idx = Collections.binarySearch(list, 5);  // 二分查找（要求有序）
Collections.reverse(list);             // 反转
Collections.shuffle(list);             // 随机打乱
Collections.swap(list, 0, 1);          // 交换两个位置

// --- 极值 ---
int max = Collections.max(list);
int min = Collections.min(list);

// --- 填充 ---
Collections.fill(list, 0);              // 所有元素替换为 0

// --- 不可变集合 ---
List<String> unmodifiable = Collections.unmodifiableList(
    new ArrayList<>(Arrays.asList("a", "b", "c"))
);
// unmodifiable.add("d");  // ❌ UnsupportedOperationException

// --- 线程安全包装 ---
List<String> syncList = Collections.synchronizedList(new ArrayList<>());
// 返回一个所有方法都加了 synchronized 的包装类

// --- 空集合 ---
List<String> empty = Collections.emptyList();  // 返回不可变的空 List，比 null 更安全
```

---

## 八、总结

| 知识点 | 核心要点 |
|--------|---------|
| 两大体系 | Collection（单列）+ Map（双列），根接口定义了统一规范 |
| Collection 子接口 | List（有序可重复）、Set（不可重复）、Queue/Deque（FIFO/双端） |
| Iterator | 统一的遍历方式，for-each 语法糖的底层原理 |
| 遍历中删除 | 用 Iterator.remove() 或 removeIf()，不要用集合自己的 remove() |
| fail-fast | modCount 检查 → ConcurrentModificationException；ArrayList/HashMap 都是 fail-fast |
| fail-safe | CopyOnWriteArrayList 遍历快照副本，不抛异常，适合读多写少 |
| 选型口诀 | 查多用 ArrayList，插删多用 LinkedList；去重用 Set；键值对用 Map；排序用 Tree；并发用 Concurrent |
| Collections 工具类 | sort、binarySearch、unmodifiableList、synchronizedList 等常用方法 |

下一篇我们将深入 **ArrayList 与 LinkedList**——ArrayList 的扩容机制（1.5 倍）、LinkedList 的双向链表结构、两者的性能实测对比，以及面试中必问的"ArrayList 和 LinkedList 到底怎么选"。

---

## 参考

- [Oracle Java Tutorials - Collections Framework](https://docs.oracle.com/javase/tutorial/collections/index.html)
- [Java Language Specification - Chapter 10: Arrays](https://docs.oracle.com/javase/specs/jls/se17/html/jls-10.html)
- [Java Collections Framework Official Documentation](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/doc-files/coll-index.html)
- [JavaGuide - 集合框架](https://javaguide.cn/java/collection/)
- [javabetter.cn - 集合框架](https://javabetter.cn/collection/)
