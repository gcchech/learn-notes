---
title: 集合框架面试高频题
icon: cubes
order: 3
category:
  - Java
  - 面试宝典
tag:
  - 集合
  - HashMap
  - ConcurrentHashMap
  - ArrayList
  - fail-fast
---

# 集合框架面试高频题

Java 集合是面试中"必问"的基础模块。HashMap、ConcurrentHashMap、ArrayList 的三连问几乎是标配。以下 8 题覆盖了从数据结构到源码细节的高频考点。

---

## Q1: HashMap 的 put 全流程与 1.7 → 1.8 演进 ⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: HashMap 原理、数据结构、扩容机制

> 面试官问："HashMap 的 put 方法内部做了什么？JDK 1.7 和 1.8 在实现上有哪些关键区别？"

### 核心回答

**put 方法全流程（1.8）**：

```
① 计算 hash 值：(key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16)
   让高位参与运算，减少低位相同时的碰撞

② 判断 table 是否初始化 → 未初始化则 resize() 初始化

③ 计算桶位置：(n - 1) & hash → 定位到数组索引

④ 桶为空 → 直接放入（new Node）

⑤ 桶不为空 → 判断是链表还是红黑树
   ├── 链表 → 尾插法遍历
   │   ├── 找到 key 相同 → 替换 value（返回旧值）
   │   └── 找不到 → 插入链表尾部 → 检查是否树化（链表长度 ≥ 8 & 数组 ≥ 64）
   └── 红黑树 → 调用 putTreeVal()

⑥ 插入后 size++ → 检查是否超过 threshold → resize() 扩容
```

### 1.7 vs 1.8 核心区别

| 维度 | JDK 1.7 | JDK 1.8 |
|------|---------|---------|
| **数据结构** | 数组 + 链表 | 数组 + 链表 + **红黑树** |
| **插入方式** | 头插法（`transfer()` 头插） | **尾插法** |
| **扩容时机** | 先扩容再插入 | 先插入再扩容 |
| **扩容条件** | size ≥ threshold && 当前桶非空 | size > threshold |
| **hash 计算** | 4 次扰动 | 1 次扰动（高 16 位 ^ 低 16 位） |
| **扩容死锁** | **可能死锁**（并发 rehash 成环） | 安全（尾插法，但并发仍有数据丢失） |

**为什么引入红黑树？**
极端情况下（所有 key 的 hash 相同），链表退化为 O(n) 查询。红黑树保证最坏 O(log n)，防止 hash 碰撞攻击（攻击者构造大量碰撞 key 导致 CPU 满载）。

### 深度扩展

**为什么容量必须是 2 的幂？**

```java
// (n - 1) & hash 等价于 hash % n，但位运算更快
// n = 16 → (n-1) = 15 = 0b1111
// 任何 hash & 1111 的结果都在 0-15 之间
// 如果 n 不是 2 的幂，(n-1) 的二进制末尾不全是 1，部分桶永远不会被用到
```

**扩容时 1.8 的高低位拆分**：

```java
// 1.7 需要重新 hash → 重新计算桶位置
// 1.8 只需判断新增的 1 bit 是 0 还是 1
// hash & oldCap == 0 → 位置不变
// hash & oldCap != 0 → 位置 = 原位置 + oldCap
```

**1.7 扩容死锁是怎么发生的？**

```java
// 线程 A 执行到 transfer()，刚完成链表反序的一部分，挂起
// 线程 B 完成了完整的 rehash，形成了新的链表
// 线程 A 恢复 → 继续用原来的头插法反转 → 形成环形链表
// 下次 get() 或 put() 进入环 → CPU 100% 死循环
```

### 面试追问

**Q**: 为什么树化阈值是 8，降级阈值是 6？
**A**: 8 来自泊松分布——理想情况下链表长度为 8 的概率约 0.00000006%，极其罕见。出现基本意味着 hash 函数有问题或受到碰撞攻击。降级 6 而不是 8 避免了反复树化-退化的抖动。

**Q**: HashMap 的负载因子 0.75 是怎么定的？
**A**: 空间和时间的折中。太高 → 碰撞概率大增；太低 → 频繁扩容浪费空间。0.75 是泊松分布推导出的经验最优值。

### 常见错误

- ❌ 说"1.8 的 HashMap 用了红黑树就线程安全了"——仍然不安全，并发下会丢数据
- ❌ 把死循环归因于红黑树——死循环发生在 1.7 头插法的 rehash

### 一句话总结

> **数组 + 链表 + 红黑树。1.7 头插死循环，1.8 尾插 + 树化。容量 2 的幂，负载因子 0.75，树化阈值 8。**

---

## Q2: ConcurrentHashMap 1.7 vs 1.8 实现对比 ⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: 并发安全、分段锁 → CAS + synchronized 演进

> 面试官问："ConcurrentHashMap 在 JDK 1.7 和 1.8 中分别是如何保证线程安全的？为什么 1.8 放弃了分段锁？"

### 核心回答

**1.7 分段锁（Segment）**：

```
ConcurrentHashMap (1.7)
└── Segment[] (默认 16 个，不可扩容)
    └── HashEntry[] (每个 Segment 内部是一个小 HashMap)
        └── HashEntry 链表
```

- 使用 **ReentrantLock** 锁住整个 Segment
- **并发度 = Segment 数量**（默认 16）→ 最多 16 个线程同时写不同 Segment
- put 时需要**先定位 Segment，再 lock()**，扫描 HashEntry 链表
- **弱一致性**：`size()` 先不加锁统计 3 次，不一致再加锁全统计

**1.8 CAS + synchronized + 红黑树**：

```
ConcurrentHashMap (1.8)
└── Node[] (与 HashMap 结构一致)
    ├── 链表
    └── 红黑树（TreeBin 包装，根节点加锁）
```

- 初始化：CAS 竞争 `sizeCtl`
- **桶为空 → CAS 直接插入**（无锁）
- **桶非空 → synchronized 锁住头节点**（锁粒度 = 单个桶）
- 扩容支持**多线程协同**（`transfer()` 每个线程领取一个步长的迁移任务）

| 对比维度 | JDK 1.7 | JDK 1.8 |
|----------|---------|---------|
| 锁粒度 | Segment（分段） | 桶级别（更细） |
| 锁实现 | ReentrantLock | synchronized + CAS |
| 数据结构 | 数组 + 链表 | 数组 + 链表 + 红黑树 |
| 并发扩容 | 不支持（单线程） | **多线程协同扩容** |
| size 计算 | 先无锁 3 次，再全锁 | 分段计数 + sum（`baseCount` + `CounterCell[]`） |

**为什么放弃分段锁？**
1. synchronized 在 JDK 6 后经过锁升级优化，性能已不输 ReentrantLock
2. 锁粒度从 Segment 降到桶级别，并发度大幅提升（不再是固定 16）
3. 分段锁无法实现多线程协同扩容
4. 与 1.8 HashMap 的数据结构保持一致（红黑树）

### 深度扩展

**1.8 sizeCtl 多义性**：

```java
// sizeCtl 是 ConcurrentHashMap 的核心控制字段，含义随状态变化：
sizeCtl = 0    → 未初始化（默认容量）
sizeCtl = -1   → 正在初始化
sizeCtl < -1   → 正在扩容（-(1 + 扩容线程数)），多线程协同
sizeCtl > 0    → 初始化后 = 扩容阈值（0.75n），扩容时为迁移触发值
```

**多线程协同扩容**：

```java
// transfer() 方法：每个线程分配一个区间（stride = 最少 16 个桶）
// 用 transferIndex 从后往前分配区间（CAS 递减）
// 线程 A: 处理桶 48-63
// 线程 B: 处理桶 32-47
// ...
// 最后一个线程负责收尾（检查所有桶是否迁移完毕）
```

**1.8 size 计数方案——LongAdder 思想**：

```java
// 写竞争激烈时，单变量的 CAS 会频繁失败
// 解决方案：baseCount + CounterCell[] 数组
// 无竞争 → CAS 更新 baseCount
// 有竞争 → 每个线程在随机一个 CounterCell 上 CAS 累加（Cell 扩容/分散）
// size() = baseCount + sum(CounterCell[])
```

1.8 ConcurrentHashMap 内部也有类似 CounterCell 的分段计数。
### 常见错误

- ❌ "ConcurrentHashMap 所有操作都是线程安全的"——单个 `put`/`get` 是线程安全的，但**复合操作不是**。如果想 `putIfAbsent`，HashMap 先 `containsKey` 再 `put` 是两步——并发下不是原子的

### 一句话总结

> **1.7 = 16 个 Segment 分段锁（ReentrantLock），1.8 = CAS + synchronized 锁桶 + 多线程协同扩容。粒度更细、并发度更高。**

---

## Q3: ArrayList 扩容机制 ⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: 动态数组、扩容策略、性能影响

> 面试官问："ArrayList 的扩容机制是怎样的？为什么说在尾部追加快，中间插入慢？"

### 核心回答

**扩容流程**：

```java
// 默认容量 10，扩容为原来的 1.5 倍
// JDK 6 之前是 (oldCapacity * 3) / 2 + 1
// JDK 7+ 是 oldCapacity + (oldCapacity >> 1)

// 源码（简化）
private void grow(int minCapacity) {
    int oldCapacity = elementData.length;
    int newCapacity = oldCapacity + (oldCapacity >> 1); // 1.5x
    if (newCapacity - minCapacity < 0)
        newCapacity = minCapacity;  // 1.5x 不够用 → 直接用所需容量
    if (newCapacity - MAX_ARRAY_SIZE > 0)
        newCapacity = hugeCapacity(minCapacity);
    elementData = Arrays.copyOf(elementData, newCapacity);
    // ↑ Arrays.copyOf 底层调用 System.arraycopy() → native → 内存拷贝
}
```

**各操作的时间复杂度**：

| 操作 | 复杂度 | 原因 |
|------|--------|------|
| 尾部追加 `add(E)` | O(1) 均摊 | 偶尔扩容 O(n)，均摊 O(1) |
| 中间插入 `add(i, E)` | O(n) | `System.arraycopy` 搬移 i 后的所有元素 |
| 随机访问 `get(i)` | O(1) | 数组直接寻址 |
| 中间删除 `remove(i)` | O(n) | 同上，搬移 i 后的元素 |
| 按值删除 `remove(Object)` | O(n) | 先遍历找位置 + 再搬移 |

**为什么是 1.5 倍而不是 2 倍？**
这是一个空间和时间的折中。1.5 倍增加的容量较少，浪费的空间较少，但扩容频率更高。2 倍每次扩容更"大手笔"但可能浪费更多内存。1.5 是在经验上较好的平衡点。

### 深度扩展

**扩容的性能陷阱**：

```java
// 坏的做法：频繁扩容
ArrayList<Integer> list = new ArrayList<>();
for (int i = 0; i < 1000000; i++) {
    list.add(i);  // 扩容约 30 次，每次都 Arrays.copyOf → O(n) 拷贝
}

// 好的做法：预估容量
ArrayList<Integer> list = new ArrayList<>(1000000);
// 一次性分配空间，零扩容拷贝
```

**线程安全的替代方案**：

```java
// 1. Collections.synchronizedList —— 装饰器模式
List<String> syncList = Collections.synchronizedList(new ArrayList<>());

// 2. CopyOnWriteArrayList —— 写时复制，适合读多写少
CopyOnWriteArrayList<String> cowList = new CopyOnWriteArrayList<>();
// 写操作：加 ReentrantLock → 复制整个数组 → 在新数组上修改 → 替换引用
// 读操作：无锁直接读（因为写不修改原数组）
```

### 面试追问

**Q**: ArrayList 和 LinkedList 怎么选？
**A**: 随机访问多用 ArrayList（O(1) vs O(n)），频繁头部插入/删除用 LinkedList（O(1) vs O(n)）。但实际上 LinkedList 内存不连续、缓存不友好，大多数场景 ArrayList 表现更好。

### 常见错误

- ❌ "ArrayList 扩容是从旧数组复制到新数组，耗时 O(n)"——扩容确实 O(n)，但是**均摊**到每次插入是 O(1)
- ❌ 在循环中 `list.add(0, element)` ——每次 O(n)，循环就是 O(n²)

### 一句话总结

> **默认容量 10，1.5 倍扩容，Arrays.copyOf 搬数据。尾部追加均摊 O(1)，中间插入 O(n)。能预估容量就别让它频繁扩容。**

---

## Q4: HashMap 为什么用红黑树而不是 AVL 树 ⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: 红黑树特性、AVL vs 红黑树取舍

> 面试官问："HashMap 在链表超过 8 时转为红黑树，为什么选择红黑树而不是 AVL 树？"

### 核心回答

**核心原因：插入-删除-查找的综合性能权衡。**

| 特性 | 红黑树 | AVL 树 |
|------|--------|--------|
| 平衡约束 | 宽松（最长路径 ≤ 2× 最短路径） | 严格（所有子树高度差 ≤ 1） |
| 查找效率 | O(log n)，稍慢（因树偏高） | O(log n)，最快（严格平衡） |
| 插入/删除 | **旋转次数少**（最多 2-3 次） | 旋转次数多（可能需要回溯到根） |
| 适用场景 | **插入/删除频繁** | 查找远多于插入/删除 |

**HashMap 选择红黑树的原因**：
1. HashMap 中 put/remove（涉及插入和删除）非常频繁，红黑树的**再平衡代价更低**
2. 红黑树的查找 O(log n) 虽然常数项比 AVL 高，但在内存中 log n 基数很小，差异微乎其微
3. 红黑树实现相对简洁，JDK 源码中 `TreeNode` 的 rotateLeft/rotateRight 和 balanceInsertion 逻辑比 AVL 的多次回溯旋转更可控

### 深度扩展

**HashMap 红黑树源码结构**：

```java
// HashMap.TreeNode 继承 LinkedHashMap.Entry 继承 HashMap.Node
// 同时维护了红黑树和双向链表（用于按插入顺序遍历 + split 操作）
static final class TreeNode<K,V> extends LinkedHashMap.Entry<K,V> {
    TreeNode<K,V> parent;
    TreeNode<K,V> left;
    TreeNode<K,V> right;
    TreeNode<K,V> prev;  // 双向链表指针
    boolean red;
}
```

**退化为链表**：
当红黑树节点数 ≤ 6 时，`untreeify()` 退化为链表。这是为了在元素减少后避免维护红黑树的额外开销。

### 面试追问

**Q**: 为什么不用跳表（SkipList）？
**A**: 出于内存和实现复杂度的权衡。跳表需要维护多层索引，内存占用更大。红黑树在 Java 中已有成熟的 TreeMap 实现可参考。

**Q**: 为什么选择 8 而不是更小的数？
**A**: 基于泊松分布——理想哈希条件下长度为 8 的链表概率仅亿分之六。过早树化可能误将正常的短链表转为占用更多内存的红黑树。

### 常见错误

- ❌ "红黑树查找比 AVL 快"——查找上 AVL 更快，红黑树胜在插入/删除

### 一句话总结

> **红黑树牺牲了一点查找效率换取大幅提升的插入/删除性能，这对 put/remove 频繁的 HashMap 正好匹配。**

---

## Q5: fail-fast 机制原理 ⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: fail-fast、modCount、ConcurrentModificationException

> 面试官问："用增强 for 循环遍历 ArrayList 时，如果在循环体内删除元素会发生什么？为什么？"

### 核心回答

**`ConcurrentModificationException`** 就是 fail-fast 机制的体现。

```java
List<String> list = new ArrayList<>(Arrays.asList("A", "B", "C"));

// ❌ 会抛 ConcurrentModificationException
for (String s : list) {
    if ("B".equals(s)) {
        list.remove(s);  // modCount++ → 与 expectedModCount 不一致 → 抛异常
    }
}

// ❌ 同样会抛
Iterator<String> it = list.iterator();
while (it.hasNext()) {
    String s = it.next();
    list.remove(s);  // 同样的错误
}
```

**原理**：

```java
// ArrayList 内部有一个 modCount 字段，记录"结构修改"次数
// add/remove/clear 等操作都会使 modCount++

// 创建迭代器时：
int expectedModCount = modCount;  // 记录当时的版本号

// 每次 next() / remove() 时检查：
final void checkForComodification() {
    if (modCount != expectedModCount)
        throw new ConcurrentModificationException();
}

// 如果遍历期间调用了 list.remove() → modCount++ 
// → 迭代器的 expectedModCount 没变 → 检测到不一致 → 抛异常
```

**正确的删除方式**：

```java
// ✅ 使用迭代器的 remove()
Iterator<String> it = list.iterator();
while (it.hasNext()) {
    if ("B".equals(it.next())) {
        it.remove();  // 迭代器自己的 remove → 同步更新 expectedModCount
    }
}

// ✅ Java 8+ 使用 removeIf
list.removeIf("B"::equals);
```

### 深度扩展

**fail-fast vs fail-safe**：

| 机制 | fail-fast | fail-safe |
|------|-----------|-----------|
| 代表集合 | ArrayList, HashMap | CopyOnWriteArrayList, ConcurrentHashMap |
| 检测方式 | `modCount` 版本号对比 | 操作快照/副本（不抛异常） |
| 并发修改 | 立即抛异常 | 允许，但遍历的是旧数据 |
| 性能 | 额外检查开销极小 | 复制开销大 |

**为什么非并发集合也要 fail-fast？**
fail-fast 不是为了解决并发问题，而是**尽早暴露 bug**。多线程环境下，fail-fast 尽力而为地检测到并发修改并抛异常，帮你发现"本不该有并发"的代码问题——而不是默默产生脏数据。

### 面试追问

**Q**: 单线程会触发 fail-fast 吗？
**A**: 会。增强 for 循环中直接 `list.remove()` 就是最常见案例。

### 常见错误

- ❌ "fail-fast 是用来保证线程安全的"——它不是保证，而是**检测**，且只在"尽力而为"的基础上
- ❌ 忘记增强 for 循环底层就是 Iterator

### 一句话总结

> **modCount 是版本号，迭代器记录创建时的版本。一旦检测到版本不一致（其他线程或本线程修改了）→ 立即抛 ConcurrentModificationException。**

---

## Q6: TreeMap / LinkedHashMap 的区别与使用场景 ⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: Map 实现对比、排序/有序特性

> 面试官问："HashMap、TreeMap、LinkedHashMap 分别有什么特点？在什么场景下选用哪个？"

### 核心回答

| 实现 | 底层 | 顺序保证 | null key | 时间复杂度 | 使用场景 |
|------|------|----------|----------|-----------|---------|
| **HashMap** | 数组 + 链表 + 红黑树 | 无顺序 | 允许 1 个 null key | O(1) | 通用场景 |
| **LinkedHashMap** | HashMap + 双向链表 | **插入顺序**或**访问顺序** | 允许 1 个 null key | O(1) | LRU 缓存 |
| **TreeMap** | 红黑树 | **自然排序**或**Comparator 排序** | **不允许 null key** | O(log n) | 需要排序的场景 |
| **Hashtable** | 同 HashMap | 无顺序 | **不允许 null** | O(1) | 遗留代码 |

**LinkedHashMap 的访问顺序（LRU 实现）**：

```java
// 第三个参数 accessOrder = true → 访问顺序
LinkedHashMap<String, Integer> lruCache = new LinkedHashMap<String, Integer>(
    16, 0.75f, true  // accessOrder = true
) {
    @Override
    protected boolean removeEldestEntry(Map.Entry<String, Integer> eldest) {
        return size() > 100;  // 超过 100 个条目时自动删除最老的
    }
};

// 每次 get/put 都会把该条目移到链表末尾
lruCache.put("A", 1);
lruCache.put("B", 2);
lruCache.get("A");          // A 移到末尾 → 顺序变为 B, A
```

**TreeMap 排序示例**：

```java
// 默认自然排序（key 实现 Comparable）
TreeMap<Integer, String> map = new TreeMap<>();
map.put(3, "C"); map.put(1, "A"); map.put(2, "B");
// 遍历顺序：1→A, 2→B, 3→C

// 自定义排序
TreeMap<String, Integer> reverseMap = new TreeMap<>(Comparator.reverseOrder());
```

### 深度扩展

**LinkedHashMap 内部结构**：

```java
// LinkedHashMap.Entry 继承 HashMap.Node，额外维护了双向链表
static class Entry<K,V> extends HashMap.Node<K,V> {
    Entry<K,V> before, after;  // 双向链表指针
}
// 双向链表连接所有条目，head → tail 表示插入/访问顺序
```

### 面试追问

**Q**: 为什么 TreeMap 不允许 null key？
**A**: TreeMap 依赖 `compareTo()` 或 `Comparator.compare()` 进行排序。如果 key 是 null，`compareTo(null)` 会抛 `NullPointerException`。

### 常见错误

- ❌ 想当然地以为 LinkedHashMap 和 TreeMap 一样慢——LinkedHashMap 的 get/put 仍是 O(1)，只是在维护链表时有额外开销

### 一句话总结

> **HashMap = 无序 O(1)，LinkedHashMap = 插入/访问顺序 O(1)，TreeMap = 红黑树排序 O(log n)。LRU 用 LinkedHashMap accessOrder。**

---

## Q7: hashCode 与 equals 契约 ⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: Object 方法、HashMap 索引定位

> 面试官问："为什么要同时重写 `equals()` 和 `hashCode()`？只重写一个会有什么问题？"

### 核心回答

**契约规则**：
1. 两个对象 `equals()` 相等 → `hashCode()` **必须**相等
2. 两个对象 `hashCode()` 相等 → `equals()` **不一定**相等（哈希碰撞）
3. 重写 `equals()` 时**必须**重写 `hashCode()`

**为什么 HashMap 依赖这个契约？**

```java
// HashMap 查找时先找桶，再在桶内 equals 比较
// get(key) 流程：
int hash = key.hashCode();
int index = (n - 1) & hash;
// ↑ 先通过 hash 定位到桶

// 找到桶后，遍历链表/红黑树：
if (node.hash == hash && 
    (node.key == key || key.equals(node.key))) {
    return node.value;
}
// ↑ 再通过 equals 确认是哪个节点

// 如果只重写了 equals 没重写 hashCode：
// 两个"相等"的对象 → hashCode 不同 → 定位到不同桶 → get() 返回 null！
```

**重写原则**：

```java
class Person {
    String name;
    int age;
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Person)) return false;
        Person p = (Person) o;
        return age == p.age && Objects.equals(name, p.name);
        // ↑ equals 用到的字段
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(name, age);
        // ↑ hashCode 必须用与 equals 相同的字段
    }
}
```

### 深度扩展

**Objects.hash 的实现**：

```java
public static int hash(Object... values) {
    return Arrays.hashCode(values);
    // 内部公式：result = 31 * result + element.hashCode()
    // 选 31 是因为它是奇素数，乘法可优化为位运算（31 * i = (i << 5) - i）
}
```

**为什么是素数 31？**
- 素数减少碰撞（如果选偶数，乘法结果低位总是 0）
- 31 = 2^5 - 1，JVM 可能将 `31 * i` 优化为 `(i << 5) - i`
- 31 不大不小——太大容易溢出，太小碰撞率高

### 面试追问

**Q**: 如果 `equals` 判断相等的两个对象，`hashCode` 返回值不同，HashMap 会怎样？
**A**: HashMap 会把它们放到不同的桶里，导致逻辑上"相同"的 key 可以同时存在在 HashMap 中。

### 常见错误

- ❌ 用 `Objects.hash()` 计算 hashCode 却没有在 equals 中用同样字段进行比较

### 一句话总结

> **equals 相等 → hashCode 必然相等。HashMap 先 hash 定位桶，再 equals 确认身份。只重写一个 = Bug。**

---

## Q8: BlockingQueue 在有界队列下的行为 ⭐️

**难度**: ⭐️ | **考察点**: 阻塞队列、生产者-消费者模式

> 面试官问："ArrayBlockingQueue 和 LinkedBlockingQueue 有什么区别？有界队列满了之后有哪些处理策略？"

### 核心回答

| 实现 | 底层 | 有界/无界 | 锁机制 |
|------|------|-----------|--------|
| **ArrayBlockingQueue** | 数组 | **必须指定容量（有界）** | **一把锁**（put + take 共用） |
| **LinkedBlockingQueue** | 链表 | 可选（默认 Integer.MAX_VALUE 无界） | **两把锁**（putLock + takeLock） |

**有界队列满时的处理策略**：

```java
BlockingQueue<String> queue = new ArrayBlockingQueue<>(10);

// 1. put() —— 阻塞等待，直到有空位
queue.put("item");           // 满了就阻塞

// 2. offer() —— 立即返回 false
boolean ok = queue.offer("item");     // 满了返回 false
boolean ok = queue.offer("item", 1, TimeUnit.SECONDS); // 等 1 秒

// 3. add() —— 抛异常
queue.add("item");           // 满了 → IllegalStateException

// 4. ThreadPoolExecutor 的拒绝策略
// AbortPolicy       → 抛异常（默认）
// CallerRunsPolicy  → 由调用线程执行
// DiscardPolicy     → 直接丢弃
// DiscardOldestPolicy → 丢弃最老的
```

**LinkedBlockingQueue 为什么用两把锁？**
put 操作只操作链表尾部，take 只操作链表头部，两者互不冲突。两把锁可以同时进行 put 和 take，并发度更高。

### 深度扩展

**ArrayBlockingQueue 为什么只用一把锁？**
数组是连续内存，put 和 take 操作可能操作相邻位置，共享一个锁实现更简单。并且用一把锁可以支持 `drainTo()` 等批量操作——如果用两把锁，批量移动数据时两边的并发安全就复杂了。

### 面试追问

**Q**: LinkedBlockingQueue 默认是无界的，用了会有什么风险？
**A**: 生产者速度大于消费者时，队列无限增长→内存耗尽→OOM。生产环境应**显式指定容量**。

### 常见错误

- ❌ 使用无界 LinkedBlockingQueue 而不设容量，高峰期 OOM
- ❌ 生产者-消费者模式中忘记处理 InterruptedException

### 一句话总结

> **ArrayBlockingQueue 单锁数组有界，LinkedBlockingQueue 双锁链表可设界。满了用 put 阻塞，offer 返回 false，add 抛异常。**

---

## 参考阅读

- [集合框架概述](../collection/overview.md)
- [List 详解](../collection/list.md)
- [Map 详解](../collection/map.md)
- [Queue 详解](../collection/queue.md)
