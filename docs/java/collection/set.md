---
title: HashSet vs TreeSet vs LinkedHashSet
icon: filter
order: 3
category:
  - Java
  - 集合框架
tag:
  - HashSet
  - TreeSet
  - LinkedHashSet
  - hashCode
  - equals
---

# Set 家族：HashSet、TreeSet、LinkedHashSet

> 📖 `Set` 代表数学中的集合——元素不可重复。三个核心实现各有专长：`HashSet` 追求极致速度，`TreeSet` 保证排序，`LinkedHashSet` 记住插入顺序。而这一切的基础，是那个面试必问的话题——**hashCode 和 equals 的契约**。

---

## 一、Set 接口——不可重复的集合

```java
public interface Set<E> extends Collection<E> {
    // Set 没有新增方法！所有规范通过 Javadoc 定义
    // 核心约束：不包含重复元素（equals 判定）
}
```

```java
Set<String> set = new HashSet<>();

set.add("apple");
set.add("banana");
set.add("apple");  // 重复元素——添加失败，返回 false
System.out.println(set);        // [banana, apple]（无序！）
System.out.println(set.size()); // 2

set.contains("apple");  // true
set.remove("banana");   // true
```

---

## 二、⭐️ HashSet——基于 HashMap 的无序集合

### 2.1 底层原理：HashSet 就是 HashMap

`HashSet` 的源码出奇地简单——它就是对一个 `HashMap` 的包装：

```java
public class HashSet<E> extends AbstractSet<E>
        implements Set<E>, Cloneable, java.io.Serializable {

    private transient HashMap<E, Object> map;

    // 所有值都指向同一个哑元对象
    private static final Object PRESENT = new Object();

    // 构造方法——创建一个 HashMap
    public HashSet() {
        map = new HashMap<>();
    }

    // add → HashMap.put(key, PRESENT)
    public boolean add(E e) {
        return map.put(e, PRESENT) == null;  // put 返回 null 表示新增成功
    }

    // remove → HashMap.remove(key)
    public boolean remove(Object o) {
        return map.remove(o) == PRESENT;
    }

    // contains → HashMap.containsKey(key)
    public boolean contains(Object o) {
        return map.containsKey(o);
    }

    // iterator → HashMap.keySet().iterator()
    public Iterator<E> iterator() {
        return map.keySet().iterator();
    }

    // size → map.size()
    public int size() {
        return map.size();
    }
}
```

> 🎯 **一句话**：`HashSet` 的 add 就是把元素当作 key 放进 HashMap，value 统一是 `PRESENT`。所以理解 HashSet 的前提是理解 HashMap——这将在下一篇《HashMap 深度解析》中展开。

### 2.2 ⭐️ hashCode 与 equals 契约——面试必问

**问题**：`HashSet` 如何判断两个元素是否"重复"？

答案：**先比 hashCode，再比 equals**。

```java
// HashMap.put() 内部的判断逻辑（简化）
if (p.hash == hash &&
    ((k = p.key) == key || (key != null && key.equals(k)))) {
    // 哈希值相同 &&（同一个引用 || equals 为 true）
    // → 认为是同一个 key，覆盖旧值
}
```

**hashCode/equals 契约**：

1. 如果 `a.equals(b) == true`，则 `a.hashCode()` 必须等于 `b.hashCode()`
2. 如果 `a.equals(b) == false`，则 `a.hashCode()` 可以相等（哈希冲突），也可以不等
3. 如果 `a.hashCode() != b.hashCode()`，则 `a.equals(b)` 一定为 false

```java
// 反面教材：违反契约的后果
class BadStudent {
    private String name;
    private int id;

    public BadStudent(String name, int id) {
        this.name = name;
        this.id = id;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof BadStudent)) return false;
        BadStudent s = (BadStudent) o;
        return id == s.id && Objects.equals(name, s.name);
    }
    // ❌ 重写了 equals 但没有重写 hashCode！
}

// 后果演示
Set<BadStudent> students = new HashSet<>();
students.add(new BadStudent("张三", 1));
students.add(new BadStudent("张三", 1));  // 期望去重，但实际上...

System.out.println(students.size());  // 输出 2 —— 去重失败！
// 原因：两个对象 equals 为 true 但 hashCode 不同（继承自 Object），
// HashMap 将它们放入了不同的桶，根本不会触发 equals 比较
```

**正确做法**：

```java
class GoodStudent {
    private String name;
    private int id;

    public GoodStudent(String name, int id) {
        this.name = name;
        this.id = id;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof GoodStudent)) return false;
        GoodStudent s = (GoodStudent) o;
        return id == s.id && Objects.equals(name, s.name);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, id);  // ✅ 必须同时重写
    }
}

Set<GoodStudent> students = new HashSet<>();
students.add(new GoodStudent("张三", 1));
students.add(new GoodStudent("张三", 1));

System.out.println(students.size());  // 输出 1 —— 去重成功！
```

> 🎯 **面试口诀**：「等则哈希等，反则不一定；哈希不等则一定不等。」重写 equals 必须重写 hashCode，否则 HashMap/HashSet 去重失效。

### 2.3 使用可变对象作为 key 的陷阱

```java
Set<GoodStudent> students = new HashSet<>();
GoodStudent s = new GoodStudent("张三", 1);
students.add(s);

s.setName("李四");  // ⚠️ 修改了已存入 HashSet 的对象！

// 现在 student 的 hashCode 变了，但它在 HashSet 中的位置没变
System.out.println(students.contains(s));  // false —— 找不到了！
// 原因：用"李四"的 hashCode 去找，但 s 在"张三"的桶里

students.remove(s);  // 也删不掉——找不到
System.out.println(students.size());       // 1 —— 元素还在，但永远删不掉 → 内存泄漏
```

> ⚠️ **教训**：存入 HashSet/HashMap 的对象最好不要是可变的。如果必须用可变对象，确保修改 key 的字段不影响 hashCode/equals 的结果。

---

## 三、⭐️ TreeSet——红黑树实现的排序集合

### 3.1 底层原理：TreeSet 就是 TreeMap

和 `HashSet` 类似，`TreeSet` 也包装了一个 `TreeMap`：

```java
public class TreeSet<E> extends AbstractSet<E>
        implements NavigableSet<E>, Cloneable, java.io.Serializable {

    private transient NavigableMap<E, Object> m;  // 实际是 TreeMap

    public TreeSet() {
        this(new TreeMap<>());
    }

    public boolean add(E e) {
        return m.put(e, PRESENT) == null;
    }
}
```

`TreeMap` 底层是**红黑树**——一种自平衡的二叉搜索树，查找、插入、删除都是 O(log n)。

### 3.2 排序规则——Comparable vs Comparator

`TreeSet` 按元素"大小"排序。排序规则有两种指定方式：

```java
// 方式一：元素实现 Comparable 接口（自然排序）
class Person implements Comparable<Person> {
    private String name;
    private int age;

    public Person(String name, int age) { this.name = name; this.age = age; }

    @Override
    public int compareTo(Person other) {
        return Integer.compare(this.age, other.age);  // 按年龄升序
    }

    @Override
    public String toString() { return name + "(" + age + ")"; }
}

TreeSet<Person> set1 = new TreeSet<>();
set1.add(new Person("张三", 25));
set1.add(new Person("李四", 20));
set1.add(new Person("王五", 30));
System.out.println(set1);  // [李四(20), 张三(25), 王五(30)] —— 按年龄排序

// 方式二：构造时传入 Comparator（定制排序——优先级更高！）
TreeSet<Person> set2 = new TreeSet<>((p1, p2) ->
    p1.getName().compareTo(p2.getName())  // 按名字字典序
);
// Comparator 的优先级高于 Comparable
```

> 🎯 **排序规则优先级**：`Comparator` > `Comparable`。如果传了 Comparator 就用 Comparator，否则要求元素必须实现 Comparable。

### 3.3 TreeSet 的特殊方法——范围查询

`TreeSet` 实现了 `NavigableSet` 接口，提供了一系列范围查询方法：

```java
TreeSet<Integer> set = new TreeSet<>(Arrays.asList(1, 3, 5, 7, 9, 11, 13));

// --- 极值 ---
set.first();            // 1 —— 最小元素
set.last();             // 13 —— 最大元素

// --- 比给定元素小/大的最接近元素 ---
set.lower(5);           // 3 —— 严格小于 5 的最大元素
set.floor(5);           // 5 —— 小于等于 5 的最大元素
set.ceiling(6);         // 7 —— 大于等于 6 的最小元素
set.higher(5);          // 7 —— 严格大于 5 的最小元素

// --- 子集视图 ---
set.subSet(3, 11);       // [3, 5, 7, 9] —— 左闭右开 [3, 11)
set.headSet(5);           // [1, 3] —— 小于 5 的
set.tailSet(7);           // [7, 9, 11, 13] —— 大于等于 7 的

// --- 逆序 ---
NavigableSet<Integer> descending = set.descendingSet();
System.out.println(descending);  // [13, 11, 9, 7, 5, 3, 1]

// --- 弹出极值 ---
set.pollFirst();         // 弹出并返回 1
set.pollLast();          // 弹出并返回 13
```

> 💡 这些都是红黑树带来的 O(log n) 操作——`HashSet` 做不到，它只能无序遍历。

### 3.4 ⚠️ TreeSet 的小心机：compareTo 替代 equals

```java
// TreeSet 判断重复不靠 equals，靠 compareTo / Comparator！
TreeSet<String> set = new TreeSet<>((a, b) -> a.length() - b.length());

set.add("hello");  // 长度 5
set.add("world");  // 长度 5 → compareTo 返回 0 → 被视为"重复"！
System.out.println(set);  // [hello] —— world 被排除了！

// 经典陷阱：按字符串长度排序 → "abc" 和 "xyz" 虽然 equals 为 false，
// 但由于 compareTo 返回 0，TreeSet 认为它们是相同的元素
```

> 🎯 **核心规则**：`TreeSet` 用 `compareTo`/`compare` 判断元素是否相同，返回 0 即视为相同。这和 `equals` 是两个独立的概念——**在 TreeSet 中，compareTo 返回值比 equals 更重要**。

---

## 四、LinkedHashSet——记住插入顺序

### 4.1 底层原理

`LinkedHashSet` 继承自 `HashSet`，但基于 `LinkedHashMap`：

```java
public class LinkedHashSet<E>
    extends HashSet<E>
    implements Set<E>, Cloneable, java.io.Serializable {

    // 调的是 HashSet 的包级私有构造，创建 LinkedHashMap 而非 HashMap
    public LinkedHashSet() {
        super(16, .75f, true);
    }
}

// HashSet 的包级私有构造——专门给 LinkedHashSet 用
HashSet(int initialCapacity, float loadFactor, boolean dummy) {
    map = new LinkedHashMap<>(initialCapacity, loadFactor);
}
```

`LinkedHashMap` 在 HashMap 的基础上增加了一个双向链表，记录元素的插入顺序（或访问顺序）：

```java
// LinkedHashSet 保持插入顺序
Set<String> set = new LinkedHashSet<>();
set.add("cherry");
set.add("banana");
set.add("apple");

System.out.println(set);  // [cherry, banana, apple] —— 按插入顺序！
// 对比 HashSet：输出可能是 [banana, cherry, apple] —— 无序
```

### 4.2 三种 Set 对比

```java
// 同一批数据，三种 Set 的表现完全不同
String[] data = {"banana", "apple", "cherry", "apple"};

Set<String> hashSet = new HashSet<>();
for (String s : data) hashSet.add(s);
System.out.println("HashSet:       " + hashSet);
// HashSet:       [banana, cherry, apple]  —— 无序（取决于哈希分布）

Set<String> treeSet = new TreeSet<>();
for (String s : data) treeSet.add(s);
System.out.println("TreeSet:       " + treeSet);
// TreeSet:       [apple, banana, cherry]  —— 字典序

Set<String> linkedSet = new LinkedHashSet<>();
for (String s : data) linkedSet.add(s);
System.out.println("LinkedHashSet: " + linkedSet);
// LinkedHashSet: [banana, apple, cherry]  —— 插入顺序
```

| Set 实现 | 底层 | 是否有序 | 排序规则 | 性能 |
|---------|------|:---:|------|:---:|
| `HashSet` | `HashMap` | ❌ 无序 | 哈希分布 | O(1) |
| `TreeSet` | `TreeMap`（红黑树） | ✅ 有序 | Comparable 或 Comparator | O(log n) |
| `LinkedHashSet` | `LinkedHashMap` | ✅ 有序 | 插入顺序（或访问顺序） | O(1)，但常量大一点 |

---

## 五、总结

| 知识点 | 核心要点 |
|--------|---------|
| HashSet 底层 | 包装 HashMap，元素作 key，`PRESENT` 常量作 value |
| 去重原理 | 先 hashCode 分桶，再 equals 判等——两步判定 |
| hashCode/equals 契约 | equals 相等 → hashCode 必等；重写 equals 必须重写 hashCode |
| 可变对象陷阱 | 存入后修改 → hashCode 变了 → 对象找不到了 → 内存泄漏 |
| TreeSet 底层 | 包装 TreeMap（红黑树），O(log n) |
| TreeSet 排序 | Comparator 优先于 Comparable；compareTo 返回 0 即视为"重复" |
| TreeSet 高级操作 | first/last、lower/floor/ceiling/higher、subSet/headSet/tailSet |
| LinkedHashSet | 继承 HashSet，内部用 LinkedHashMap + 双向链表保持顺序 |
| 选型建议 | 大多数场景用 HashSet；需要排序用 TreeSet；需要记住插入顺序用 LinkedHashSet |

下一篇我们将进入本模块的核心——**HashMap 深度解析**。hash 扰动函数、数组+链表+红黑树的结构演进（1.7→1.8）、resize 扩容的全过程、链表树化阈值 8 和反树化阈值 6 的设计奥秘、以及 ConcurrentHashMap 的线程安全设计。

---

## 参考

- [Oracle Java Tutorials - Set Interface](https://docs.oracle.com/javase/tutorial/collections/interfaces/set.html)
- [Effective Java - Item 11: Always override hashCode when you override equals](https://www.oreilly.com/library/view/effective-java/9780134686097/)
- [Object.hashCode() JavaDoc](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/Object.html#hashCode())
- [JavaGuide - HashSet](https://javaguide.cn/java/collection/hashset.html)
- [javabetter.cn - HashSet](https://javabetter.cn/collection/hashset.html)
