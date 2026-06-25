---
title: HashMap 深度解析
icon: map
order: 4
category:
  - Java
  - 集合框架
tag:
  - HashMap
  - ConcurrentHashMap
  - 红黑树
  - 扩容
  - 哈希冲突
  - LRU
---

# HashMap 深度解析：从 1.7 到 1.8 的源码演进

> 📖 `HashMap` 是面试中频率最高的集合类，没有之一。本文从源码层面逐层剖析：hash 扰动函数如何让散列更均匀？1.7 的头插法为什么在并发扩容时形成死循环？1.8 为什么引入红黑树（以及为什么阈值是 8）？`ConcurrentHashMap` 从分段锁到 CAS+synchronized 经历了怎样的设计演进？

---

## 一、HashMap 的整体结构

JDK 8+ 的 `HashMap` 底层 = **数组 + 链表 + 红黑树**：

```
HashMap 内部结构（JDK 8+）

  table (Node<K,V>[])
  ┌───┬───┬───┬───┬───┬───┬───┬───┐
  │ 0 │ 1 │ 2 │ 3 │ 4 │ 5 │ ... │ n-1│
  └─┬─┘ │ └─┬─┘ │   │   │     │     │
    │   │   │   │   │   │     │     │
    ▼   │   ▼   │   │   │     ▼     │
  Node  │   Node│   │   │   TreeNode│
  (a)   ▼   (d) │   │   │    (f)    │
      Node      │   │   │  ┌──┴──┐  │
      (b)       │   │   │  │     │  │
        │       │   │   │ TreeNode(g)│
        ▼       │   │   │  │     │  │
      Node      │   │   │ (h)  (i)  │
      (c)       │   │   │           │
                │   │   │  红黑树    │
    链表 (< 8)  │   │   │           │
                │   │   │           │
                ▼   ▼   ▼           ▼
              空的桶  空的桶  空的桶  空的桶
```

**核心常量**：

```java
public class HashMap<K,V> extends AbstractMap<K,V>
        implements Map<K,V>, Cloneable, Serializable {

    // 默认初始容量 —— 必须是 2 的幂
    static final int DEFAULT_INITIAL_CAPACITY = 1 << 4;  // 16

    // 最大容量
    static final int MAXIMUM_CAPACITY = 1 << 30;  // 约 10 亿

    // 默认负载因子 —— 0.75 是时间和空间的折中
    static final float DEFAULT_LOAD_FACTOR = 0.75f;

    // 链表 → 红黑树阈值（链表长度 >= 8 且数组长度 >= 64）
    static final int TREEIFY_THRESHOLD = 8;

    // 红黑树 → 链表阈值（树中节点数 <= 6 时退化为链表）
    static final int UNTREEIFY_THRESHOLD = 6;

    // 最小树化容量（数组长度 < 64 时，先扩容而非树化）
    static final int MIN_TREEIFY_CAPACITY = 64;
}
```

---

## 二、⭐️ hash 扰动函数——高 16 位与低 16 位混合

### 2.1 计算索引

HashMap 的索引计算分两步：

```java
// 第一步：计算 hash 值（扰动函数）
static final int hash(Object key) {
    int h;
    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}

// 第二步：用 hash 对数组长度取模
// 因为数组长度 n 是 2 的幂，所以 (n - 1) & hash 等价于 hash % n，但快得多
int index = (n - 1) & hash;
```

### 2.2 为什么需要扰动函数？

**因为 table 长度通常很小**（初始 16），如果直接用 hashCode 的低几位，高位信息完全浪费了：

```java
// 假设 table.length = 16（即 n - 1 = 15 = 0b1111）
// 没有扰动时：只用 hashCode 的低 4 位
// 不同 key 只要低 4 位相同，就会落在同一个桶 → 哈希冲突严重

// 扰动后：高 16 位 ^ 低 16 位 → 高位信息融入低位 → 散列更均匀
//     hashCode:    0001 1010 1100 0011 0100 0101 0111 1001
//     >>> 16:      0000 0000 0000 0000 0001 1010 1100 0011
//     XOR:         0001 1010 1100 0011 0101 1111 1011 1010
//     & 0b1111:                                       1010 → index = 10
```

> 🎯 **核心设计**：`(h ^ (h >>> 16))` 把 hashCode 的高 16 位和低 16 位混合，让高位也参与 index 计算，减少哈希冲突。

---

## 三、⭐️ ⭐️ put 全过程——最核心的方法

### 3.1 put 流程图

```
put(key, value)
  │
  ├─→ 1. 计算 hash: hash(key) = (h = key.hashCode()) ^ (h >>> 16)
  │
  ├─→ 2. 数组为空？→ resize() 初始化
  │
  ├─→ 3. 计算 index = (n - 1) & hash
  │     └─→ table[index] == null？→ 直接放入 new Node → 结束
  │
  ├─→ 4. 桶不空 → 遍历桶中的节点
  │     ├─→ 第一个节点 hash 相同 && key 相同？→ 覆盖旧值
  │     ├─→ 是 TreeNode？→ 走红黑树的 putTreeVal()
  │     └─→ 是链表？→ 遍历链表
  │           ├─→ 找到相同 key？→ 覆盖旧值
  │           └─→ 遍历到末尾未找到？→ 尾插新节点
  │                 └─→ 插入后链表长度 >= 8？→ treeifyBin()
  │                       └─→ 数组长度 < 64？→ resize()（扩容）
  │                       └─→ 数组长度 >= 64？→ 转为红黑树
  │
  ├─→ 5. size++，检查是否需要 resize()
  │     └─→ size > threshold（容量 × 负载因子）→ resize()
  │
  └─→ 6. 返回旧值（如果是更新）或 null（如果是新增）
```

### 3.2 JDK 1.7 vs 1.8 的核心差异

| 维度 | JDK 1.7 | JDK 1.8 |
|------|---------|---------|
| 底层结构 | 数组 + 链表 | 数组 + 链表 + 红黑树 |
| 插入方式 | **头插法**（新节点插在链表头部） | **尾插法**（新节点插在链表尾部） |
| hash 扰动 | 4 次扰动（多次移位+异或） | 1 次扰动 `(h ^ h>>>16)` |
| 扩容时机 | 先扩容再插入 | 先插入再扩容 |
| 扩容后节点位置 | 全部 rehash | 高位/低位链优化（无需 rehash） |
| 并发问题 | 扩容时**可能形成死循环** | 死循环已修复，但仍会丢数据 |

### 3.3 为什么 1.7 头插法改为 1.8 尾插法？

**核心原因**：1.7 多线程扩容时，头插法 + 并发可能造成**链表成环 → CPU 100%**。

```java
// JDK 1.7 的 transfer() —— 并发扩容，头插法
void transfer(Entry[] newTable, boolean rehash) {
    for (Entry<K,V> e : table) {
        while (null != e) {
            Entry<K,V> next = e.next;          // ① 保存下一个
            int i = indexFor(e.hash, newCapacity);  // ② 计算新位置
            e.next = newTable[i];              // ③ 头插！e 指向新桶的头
            newTable[i] = e;                   // ④ e 成为新桶的头
            e = next;                          // ⑤ 处理下一个
        }
    }
}

// 并发场景：
// 线程 A 执行到 ① 被挂起（e=A, next=B）
// 线程 B 完成了整个 transfer → B.next = A（头插导致顺序反转）
// 线程 A 恢复 → 按反转的链表继续遍历 → A.next = B → 形成 A ↔ B 循环！
```

JDK 1.8 改为尾插法后，扩容不会反转链表顺序，避免了成环问题。但仍存在数据覆盖等并发问题——**HashMap 天生不是线程安全的**。

---

## 四、⭐️ resize 扩容——2 倍扩容 + 高低位优化

### 4.1 扩容触发条件

```java
// 扩容条件：size > capacity * loadFactor
// 默认 threshold = 16 * 0.75 = 12
// 即：HashMap 中有 13 个元素时触发扩容

final Node<K,V>[] resize() {
    Node<K,V>[] oldTab = table;
    int oldCap = (oldTab == null) ? 0 : oldTab.length;
    int oldThr = threshold;
    int newCap, newThr = 0;

    if (oldCap > 0) {
        // 普通扩容：新容量 = 旧容量 × 2
        newCap = oldCap << 1;
        newThr = oldThr << 1;   // 新阈值 = 旧阈值 × 2
    } else {
        // 初始化：使用默认值
        newCap = DEFAULT_INITIAL_CAPACITY;  // 16
        newThr = (int)(DEFAULT_LOAD_FACTOR * DEFAULT_INITIAL_CAPACITY);  // 12
    }
    // ... 创建新数组，迁移数据
}
```

### 4.2 JDK 1.8 的高低位链优化

1.8 的扩容不需要重新计算 hash——因为数组长度始终是 2 的幂，新位置只由**新增的那一位**决定：

```java
// JDK 1.8 扩容后元素位置的判断
// oldCap = 16 (0b10000)，newCap = 32
// 扩容后多出来的决定位就是 oldCap 对应的那一位

// 假设 key.hashCode() = 0101 0011，oldCap = 16
// 旧 index = hash & (16-1) = hash & 0b1111 = 0b0011 = 3
// 新 index = hash & (32-1) = hash & 0b11111 = 0b10011 = 19
// 新 index = 3 (0b00011) 或 3 + 16 = 19 (0b10011)
// 关键是看 hash & oldCap 的第 5 位是 0 还是 1

// 源码实现
Node<K,V> loHead = null, loTail = null;  // 低位链（新位置 = 原位置）
Node<K,V> hiHead = null, hiTail = null;  // 高位链（新位置 = 原位置 + oldCap）
Node<K,V> next;
do {
    next = e.next;
    if ((e.hash & oldCap) == 0) {
        // 低位：保留在原位置
        if (loTail == null) loHead = e;
        else loTail.next = e;
        loTail = e;
    } else {
        // 高位：移到原位置 + oldCap
        if (hiTail == null) hiHead = e;
        else hiTail.next = e;
        hiTail = e;
    }
} while ((e = next) != null);
// 低位链放回原位置，高位链放入原位置 + oldCap
if (loTail != null) {
    loTail.next = null;
    newTab[j] = loHead;
}
if (hiTail != null) {
    hiTail.next = null;
    newTab[j + oldCap] = hiHead;
}
```

> 🎯 **一句话总结**：1.7 扩容要 rehash 每个元素；1.8 只需判断 `(e.hash & oldCap) == 0` —— 是 0 留在原位，不是 0 移到 `原位置 + oldCap`。

### 4.3 为什么容量必须是 2 的幂？

```java
// ① 取模优化：hash % n 等价于 hash & (n-1)，前提是 n 是 2 的幂
// ② 扩容优化：1.8 的高低链优化也依赖 2 的幂特性
// ③ 散列均匀：n-1 的二进制全是 1（如 16-1=0b1111），hash 的所有低位都能参与定位

// tableSizeFor 保证容量是 2 的幂——即使你传了 17，也会调到 32
public HashMap(int initialCapacity) {
    this(initialCapacity, DEFAULT_LOAD_FACTOR);
    // 内部会调用 tableSizeFor(initialCapacity)
}

static final int tableSizeFor(int cap) {
    int n = cap - 1;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    return (n < 0) ? 1 : (n >= MAXIMUM_CAPACITY) ? MAXIMUM_CAPACITY : n + 1;
}
// 输入 17 → 输出 32（找到 >= 17 的最小的 2 的幂）
```

---

## 五、⭐️ 红黑树化——为什么阈值是 8？

### 5.1 树化条件

链表转为红黑树需要**两个条件同时满足**：

1. 链表长度 >= `TREEIFY_THRESHOLD`（8）
2. 数组长度 >= `MIN_TREEIFY_CAPACITY`（64）

```java
final void treeifyBin(Node<K,V>[] tab, int hash) {
    int n = tab.length;
    if (tab == null || n < MIN_TREEIFY_CAPACITY)  // 64
        resize();  // 数组还不够大 → 扩容，不树化
    else {
        // 真正转为红黑树
        TreeNode<K,V> hd = null, tl = null;
        // 将 Node 链表转为 TreeNode 链表...
        // 然后调用 hd.treeify(tab) 转为红黑树
    }
}
```

### 5.2 为什么阈值是 8？

根据源码注释中的泊松分布计算，当负载因子为 0.75 时，链表长度达到 8 的概率约为 **0.00000006**（6 千万分之一）：

```
0:    0.60653066
1:    0.30326533
2:    0.07581633
3:    0.01263606
4:    0.00157952
5:    0.00015795
6:    0.00001316
7:    0.00000094
8:    0.00000006   ← 极其罕见
```

> 💡 **设计哲学**：正常情况下（hash 均匀分布），链表长度几乎不可能达到 8。如果达到了，说明 hash 碰撞异常严重——此时用红黑树（O(log n)）替代链表（O(n)）能极大改善查找性能。

### 5.3 为什么不直接全部用红黑树？

红黑树节点（`TreeNode`）占用的空间是链表节点（`Node`）的约 **2 倍**。对于绝大多数桶（0~1 个元素的情况占了 90%），用红黑树得不偿失。

### 5.4 反树化——为什么阈值是 6 而不是 8？

```java
// 当 remove 导致树节点数 <= 6 时，退化为链表
static final int UNTREEIFY_THRESHOLD = 6;
```

为什么不和 8 对称？**留一个缓冲区间（7）防止频繁转换**。如果阈值也是 8，一个元素反复 add/remove 会导致链表和红黑树来回切换，白白耗费 CPU。

---

## 六、get 过程——O(1) 的秘密

```java
public V get(Object key) {
    Node<K,V> e;
    return (e = getNode(hash(key), key)) == null ? null : e.value;
}

final Node<K,V> getNode(int hash, Object key) {
    Node<K,V>[] tab = table;
    int n = tab.length;
    // 1. 计算 index → 桶不为空
    Node<K,V> first = tab[(n - 1) & hash];
    if (first != null) {
        // 2. 先检查第一个节点（大多数情况桶里只有一个或没有节点）
        if (first.hash == hash && ((k = first.key) == key
                || (key != null && key.equals(k)))) {
            return first;  // 命中！O(1)
        }
        // 3. 第一个没命中 → 遍历链表或红黑树
        if (first instanceof TreeNode) {
            return ((TreeNode<K,V>)first).getTreeNode(hash, key);  // O(log n)
        }
        do {
            if (e.hash == hash && ((k = e.key) == key
                    || (key != null && key.equals(k)))) {
                return e;  // O(n)，但 n 通常 ≤8
            }
        } while ((e = e.next) != null);
    }
    return null;
}
```

---

## 七、⭐️ ConcurrentHashMap——线程安全的 HashMap

### 7.1 JDK 1.7：分段锁（Segment）

```java
// JDK 1.7 ConcurrentHashMap 结构
public class ConcurrentHashMap<K, V> {
    final Segment<K,V>[] segments;  // 默认 16 个 Segment

    static final class Segment<K,V> extends ReentrantLock {
        transient volatile HashEntry<K,V>[] table;  // 每个 Segment 有自己的 HashEntry 数组
    }
}

// put 时：先 hash 定位到 Segment，然后 lock() 该 Segment
// 并发度 = Segment 数量（默认 16）→ 最多 16 个线程同时写
```

缺点：
- 跨 Segment 操作（如 `size()`）需要锁所有 Segment
- 最大并发度受限于 Segment 数量
- 每个 Segment 一个 ReentrantLock 对象，内存开销大

### 7.2 JDK 1.8：CAS + synchronized

```java
// JDK 1.8 放弃分段锁，结构和普通 HashMap 一样（数组+链表+红黑树）
// 线程安全通过 CAS + synchronized 保证

final V putVal(K key, V value, boolean onlyIfAbsent) {
    // 1. 数组为空 → CAS 初始化（只有一个线程成功）
    if (tab == null) {
        // CAS 设置 sizeCtl → 竞争初始化权
        if (U.compareAndSetInt(this, SIZECTL, sc, -1)) {
            // 初始化...
            tab = initTable();
        }
    }

    // 2. 目标桶为空 → CAS 放入（无锁）
    if ((f = tabAt(tab, i = (n - 1) & hash)) == null) {
        if (casTabAt(tab, i, null, new Node<K,V>(hash, key, value, null)))
            break;  // CAS 成功 → 无需加锁
    }

    // 3. 桶不空 → synchronized 锁住桶的第一个节点
    synchronized (f) {
        // 遍历链表或红黑树，查找/插入
    }

    // 4. 链表长度 >= 8 → 转为红黑树
    // 5. 扩容：每个线程都可以帮忙迁移（多线程并发扩容）
}
```

> 🎯 **1.7 → 1.8 的设计演进**：
> - 放弃 Segment 概念，锁粒度细化到**每个桶的头部节点**
> - 初始化用 CAS 竞争，桶为空用 CAS 插入
> - 只有桶不空时才 synchronized —— 此时锁的是桶的第一个节点
> - 支持**多线程并发扩容**（helpTransfer 机制）

### 7.3 ConcurrentHashMap 为什么不能存 null？

```java
// ConcurrentHashMap 不允许 key 或 value 为 null
ConcurrentHashMap<String, String> map = new ConcurrentHashMap<>();
map.put(null, "value");  // ❌ NullPointerException
map.put("key", null);    // ❌ NullPointerException

// HashMap 允许（key 最多一个 null，value 允许多个 null）
HashMap<String, String> map2 = new HashMap<>();
map2.put(null, "value");  // ✅
map2.put("key", null);    // ✅
```

**为什么？** 在并发环境下，`get(key)` 返回 `null` 无法区分是「key 不存在」还是「value 就是 null」。HashMap 单线程下可以调用 `containsKey()` 来区分，但 ConcurrentHashMap 中 `get` 和 `containsKey` 之间可能有其他线程修改——这就是二义性（Ambiguity Problem）。

---

## 八、⭐️ LinkedHashMap 实现 LRU 缓存

`LinkedHashMap` 在 HashMap 基础上维护了一个双向链表，可以按**插入顺序**或**访问顺序**遍历：

```java
// accessOrder = true → 访问顺序（get 会把元素移到链表尾部）
// accessOrder = false → 插入顺序（默认）

// 实现一个简单的 LRU 缓存
class LRUCache<K, V> extends LinkedHashMap<K, V> {
    private final int maxSize;

    public LRUCache(int maxSize) {
        // accessOrder = true → 按访问顺序
        super(maxSize, 0.75f, true);
        this.maxSize = maxSize;
    }

    @Override
    protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
        return size() > maxSize;  // 超过容量自动删除最老的条目
    }
}

// 使用
LRUCache<String, String> cache = new LRUCache<>(3);
cache.put("a", "1");
cache.put("b", "2");
cache.put("c", "3");
cache.get("a");          // 访问 a → a 移到末尾
cache.get("b");          // 访问 b → b 移到末尾
cache.put("d", "4");     // 容量超限 → 删除最老的 c（因为 c 最近最少使用）

System.out.println(cache.keySet());  // [a, b, d]
// c 被淘汰，a 和 b 因为被访问过所以留下来了
```

---

## 九、总结

| 知识点 | 核心要点 |
|--------|---------|
| HashMap 结构 | JDK 8: 数组+链表+红黑树 |
| hash 扰动 | `(h ^ h>>>16)` 混合高低位，减少冲突 |
| 索引计算 | `(n-1) & hash`，n 必须是 2 的幂 |
| put 流程 | 算 hash → 找桶 → 空则放/不空则遍历 → 覆盖或新增 → 可能树化 → 可能扩容 |
| 1.7→1.8 | 头插→尾插；纯链表→链表+红黑树；rehash→高低链优化；hash 扰动简化 |
| 1.7 死循环 | 头插法并发扩容时反转链表导致成环；1.8 尾插法已修复 |
| 树化阈值 | 链表 ≥ 8 **且**数组 ≥ 64；反树化 ≤ 6（留了缓冲区间防抖动） |
| 扩容优化 | `(hash & oldCap) == 0` 留原位，否则移 `原位置 + oldCap` |
| ConcurrentHashMap 1.7 | Segment 分段锁，默认 16 段，跨段操作需全锁 |
| ConcurrentHashMap 1.8 | CAS + synchronized，锁桶的第一个节点，支持多线程并发扩容 |
| null 限制 | HashMap 允许 key/value null；ConcurrentHashMap 不允许（二义性问题） |
| LinkedHashMap | 双向链表维护顺序；`accessOrder=true` 可实现 LRU 缓存 |

下一篇我们将讨论 **Queue 与 Deque**——`PriorityQueue` 的二叉堆实现、`ArrayDeque` 为什么比 `LinkedList` 更适合做队列、以及 `BlockingQueue` 在生产-消费模式中的应用。

---

## 参考

- [HashMap JavaDoc (JDK 17)](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/HashMap.html)
- [ConcurrentHashMap JavaDoc (JDK 17)](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html)
- [An Introduction to the Java Collections Framework - Oracle](https://docs.oracle.com/javase/tutorial/collections/)
- [JavaGuide - HashMap 源码分析](https://javaguide.cn/java/collection/hashmap-source-code.html)
- [javabetter.cn - HashMap](https://javabetter.cn/collection/hashmap.html)
- [Effective Java - Item 52: Refer to objects by their interfaces](https://www.oreilly.com/library/view/effective-java/9780134686097/)
