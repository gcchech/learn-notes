---
title: 字符串深度解析
icon: font
order: 5
category:
  - Java
  - 基础
tag:
  - String
  - 字符串常量池
  - StringBuilder
  - intern
---

# Java 字符串深度解析：不可变性、常量池与性能优化

> 📖 String 是 Java 中最常用的类——没有之一。它看似简单，但背后有三个精心设计的机制：不可变性、字符串常量池、编译期优化。理解它们，你才能在面试和实际开发中游刃有余。

---

## 一、String 不可变性

### 1.1 源码层面的不可变

打开 JDK 源码，String 类的定义如下：

```java
public final class String
    implements java.io.Serializable, Comparable<String>, CharSequence {

    /** 字符串的值，用字节数组存储 */
    private final byte[] value;  // JDK 9+ 用 byte[]（Compact Strings）
    // JDK 8：private final char[] value;

    /** 缓存字符串的哈希码 */
    private int hash;  // 默认 0，首次调用 hashCode() 时计算并缓存

    // 构造器、方法...
}
```

**不可变的三个保障**：

| 设计 | 作用 |
|------|------|
| `final class` | 不能被继承，防止子类破坏不可变性 |
| `private final byte[] value` | 数组引用不可变 + 外部无法直接访问 |
| 所有修改操作返回新对象 | `substring()`、`concat()`、`replace()` 等都不修改原字符串 |

```java
String s = "Hello";
s.toUpperCase();         // 返回了新字符串 "HELLO"，但 s 没有变
System.out.println(s);   // 输出：Hello —— 原对象纹丝不动
```

### 1.2 不可变的好处

```
一、线程安全
   String 天然不可变 → 多线程随意共享，无需加锁
   这是 Java 并发编程中最省心的类型

二、字符串常量池
   只有不可变，同一个字符串字面量才能被多处安全共享
   如果 String 可变，常量池就毫无意义

三、Hash 缓存
   String 经常作为 HashMap 的 key
   不可变意味着 hashCode 可以放心缓存，永远不变
   首次计算后存入 private int hash，之后再调用 hashCode() 直接返回

四、安全性
   类名、文件路径、数据库连接串都是 String
   如果 String 可变，攻击者可以篡改这些关键字符串
```

### 1.3 JDK 9 的 Compact Strings

JDK 9 之前，`String` 内部用 `char[]` 存储（每个 char 占 2 字节）。但绝大多数英文字符只需要 1 字节——浪费了 50% 的内存。

JDK 9 引入 **Compact Strings**：内部改为 `byte[]` 存储，另加一个 `coder` 标记：

```java
// JDK 9+ String 源码
public final class String implements java.io.Serializable, Comparable<String>, CharSequence {
    private final byte[] value;    // byte[] 替代 char[]
    private final byte coder;      // LATIN1(0) 或 UTF16(1)
    // LATIN1：每个字符占 1 字节
    // UTF16：每个字符占 2 字节
}
```

**优化效果**：纯英文/数字字符串内存占用减半，垃圾回收压力也随之降低。

---

## 二、⭐️ 字符串常量池

### 2.1 字面量 vs new String()——经典面试题

```java
String s1 = "hello";           // 字面量 → 放入常量池
String s2 = "hello";           // 常量池中已存在 → 复用
String s3 = new String("hello"); // 强制在堆上创建新对象
String s4 = new String("hello"); // 又在堆上创建了另一个新对象

System.out.println(s1 == s2);  // true  —— 同一个常量池对象
System.out.println(s1 == s3);  // false —— 常量池 vs 堆对象
System.out.println(s3 == s4);  // false —— 两个不同的堆对象
```

**内存布局图解**：

```
     栈                  字符串常量池                堆
  ┌──────┐           ┌─────────────┐        ┌─────────────┐
  │  s1  │ ────────▶ │  "hello"    │        │             │
  ├──────┤           └─────────────┘        │             │
  │  s2  │ ────────▶        ↑              ├─────────────┤
  ├──────┤                  │              │ "hello"(s3) │ ◀── s3
  │  s3  │ ─────────────────┼──────────────│             │
  ├──────┤                  │              ├─────────────┤
  │  s4  │ ─────────────────┼──────────────│ "hello"(s4) │ ◀── s4
  └──────┘                  │              └─────────────┘
                     s1 和 s2 指向同一个常量池对象
                     s3 和 s4 各自指向堆上新创建的对象
```

### 2.2 常量池的位置变化

| JDK 版本 | 位置 | 说明 |
|----------|------|------|
| JDK 6 及以前 | 永久代（PermGen） | 固定大小，容易出现 OOM: PermGen space |
| JDK 7 | **堆**（Heap） | 移到堆中，可以被 GC 回收，用 `-XX:StringTableSize` 设置大小 |
| JDK 8+ | **堆**（Heap） | 元空间替代永久代，字符串常量池仍在堆 |

```java
// JDK 7+ 常量池在堆中的验证
// 设置 -Xmx10m -XX:-UseGCOverheadLimit
List<String> list = new ArrayList<>();
long i = 0;
while (true) {
    list.add(String.valueOf(i++).intern());  // 最终抛出 java.lang.OutOfMemoryError: Java heap space
}
// 报的是"堆空间"OOM，不是"永久代"OOM → 证明常量池在堆中
```

### 2.3 ⭐️ intern() 方法

`intern()` 的作用：**如果常量池中已有等值字符串，返回池中的引用；否则将此字符串加入常量池并返回引用**。

```java
String s1 = new String("hello");   // 创建两个对象：常量池 "hello" + 堆上的新 String
String s2 = s1.intern();           // 返回常量池中 "hello" 的引用
System.out.println(s1 == s2);      // false —— 堆对象 vs 常量池对象

// JDK 7+ 的变化：常量池在堆中，intern() 可以直接存堆中对象的引用
String s3 = new String("ja") + new String("va");  // 在堆上创建 "java"
String s4 = s3.intern();           // 常量池中没有 "java" → 把 s3 的引用存入常量池
System.out.println(s3 == s4);      // true（JDK 7+）！因为常量池存的是 s3 的引用
```

**`new String("hello")` 创建了几个对象？**——经典面试连环问：

```java
// 场景一：常量池中还没有 "hello"
String s = new String("hello");
// 答案：2 个
//   ① 字面量 "hello" → 常量池
//   ② new String(...) → 堆上的新对象

// 场景二：常量池中已有 "hello"（比如前面已经用过）
String s2 = new String("hello");
// 答案：1 个
//   常量池已有，"hello" 直接用 → 只在堆上创建一个新对象
```

**JDK 7 的 intern() 陷阱——必须注意**：

```java
// JDK 6：常量池在永久代（独立内存区域）
// intern() 会把字符串拷贝一份到永久代 → 两个独立对象
String s = new String("abc");        // 字面量 "abc" → 常量池；new → 堆上另一对象
s.intern();                           // "abc" 已在池中，无实际效果
System.out.println(s == "abc");       // JDK 6: false —— 永久代中的 "abc" ≠ 堆上的 s

// ⚠️ 常见误区：为什么下面这段在 JDK 7+ 也输出 false？
// 原因：上方 println(s == "abc") 已经触发了字面量 "abc" 的解析
//       JVM 在首次遇到 ldc 指令时将 "abc" 加入常量池
//       此时常量池中已有 "abc"，s2.intern() 返回池中引用，而非 s2 自身
String s2 = new StringBuilder().append("a").append("bc").toString();
String s3 = s2.intern();              // 池中已有 "abc" → 返回池中的 "abc"，并非 s2
System.out.println(s3 == s2);         // JDK 7+: false —— s2 并未被存入常量池

// ✅ 正确演示 JDK 7+ 行为——需同时满足三个条件：
// ① 字符串不能在常量池中 → 用非 final 变量拼接，编译器不做常量折叠
// ② 拼接结果不能与类中任何字面量同值 → 用唯一字符串避开冲突
// ③ 比较对象必须是 intern() 返回值与原对象自身 → 而非与字面量比较
String x = "jdk7";
String y = "InternCheck";
String s4 = x + y;                    // 运行时拼接 → 堆上新对象 "jdk7InternCheck"
String s5 = s4.intern();              // 池中无 "jdk7InternCheck" → 存入 s4 的引用
System.out.println(s5 == s4);         // JDK 7+: true —— intern() 直接返回了 s4 自身

// JDK 7+ 的核心变化：常量池在堆中，intern() 可以持有堆对象的引用（而非拷贝）
// 验证 intern() 效果的最可靠方式：直接比较 s.intern() == s（而非与字面量比较）
```

---

## 三、字符串拼接的底层优化

### 3.1 `+` 拼接的编译优化

编译器会对 `+` 拼接做激进优化：

```java
// 源代码
String s = "Hello" + " " + "World";

// 编译后（常量折叠）
String s = "Hello World";  // 编译器直接合并为一个常量！
```

```java
// 源代码
String s1 = "Hello";
String s2 = s1 + " World";

// 编译后（等价于）
String s2 = new StringBuilder().append(s1).append(" World").toString();
```

用 `javap -c` 验证：

```
// s1 + " World" 的字节码：
new           #7   // class java/lang/StringBuilder
dup
invokespecial #8   // Method StringBuilder."<init>":()V
aload_1
invokevirtual #9   // Method StringBuilder.append:(String)Ljava/lang/StringBuilder;
ldc           #10  // String " World"
invokevirtual #9   // Method StringBuilder.append
invokevirtual #11  // Method StringBuilder.toString:()Ljava/lang/String;
```

### 3.2 循环拼接的性能陷阱

```java
// ❌ 低效——每次循环创建一个新的 StringBuilder
String result = "";
for (int i = 0; i < 10000; i++) {
    result += i;  // 等价于 result = new StringBuilder().append(result).append(i).toString()
}
// 循环 10000 次 = 创建了 10000 个 StringBuilder 对象 + 10000 个中间 String 对象

// ✅ 高效——只创建一个 StringBuilder
StringBuilder sb = new StringBuilder();
for (int i = 0; i < 10000; i++) {
    sb.append(i);
}
String result = sb.toString();
```

### 3.3 JDK 9 的 StringConcatFactory

JDK 9 引入 `StringConcatFactory` + `invokedynamic`，进一步优化了字符串拼接：

```
JDK 8 及之前：
  "+" → StringBuilder → append → toString()

JDK 9+：
  "+" → invokedynamic → StringConcatFactory.makeConcat()
  直接计算最终字符串长度 → 一次分配 byte[] → 直接填充
  跳过了 StringBuilder 的中间步骤，更快更省内存
```

---

## 四、StringBuilder vs StringBuffer

| 维度 | StringBuilder | StringBuffer |
|------|--------------|--------------|
| 线程安全 | ❌ 不安全 | ✅ 安全（synchronized） |
| 性能 | **快** | 慢（同步开销） |
| 使用场景 | 单线程（99% 的情况） | 多线程拼接字符串 |
| 继承关系 | 都继承 `AbstractStringBuilder` | 都继承 `AbstractStringBuilder` |
| JDK | JDK 5 | JDK 1.0 |

**扩容机制**：

```java
// AbstractStringBuilder 的扩容源码（JDK 8+）
private void ensureCapacityInternal(int minimumCapacity) {
    if (minimumCapacity - value.length > 0) {
        value = Arrays.copyOf(value,
            newCapacity(minimumCapacity));
    }
}

private int newCapacity(int minCapacity) {
    int newCapacity = (value.length << 1) + 2;  // 翻倍 + 2
    if (newCapacity - minCapacity < 0) {
        newCapacity = minCapacity;  // 还不够就用需求大小
    }
    return (newCapacity <= 0 || MAX_ARRAY_SIZE - newCapacity < 0)
        ? hugeCapacity(minCapacity) : newCapacity;
}
```

**结论**：`newCapacity = oldCapacity × 2 + 2`，翻倍扩容。

---

## 五、字符串比较

### 5.1 == vs equals()

```java
String a = "hello";
String b = new String("hello");
String c = "hello";

a == b        // false  —— 不同对象
a.equals(b)   // true   —— 内容相同
a == c        // true   —— 同一个常量池对象
```

### 5.2 高频面试题集锦

```java
// ① 常量池 + 编译期优化
String s1 = "hello";
String s2 = "hel" + "lo";         // 编译期折叠 → "hello"
System.out.println(s1 == s2);     // true

// ② 变量参与拼接 → 运行时 StringBuilder
String s3 = "hel";
String s4 = s3 + "lo";            // 运行时拼接 → 新对象
System.out.println(s1 == s4);     // false

// ③ final 变量参与拼接 → 编译期优化
final String s5 = "hel";
String s6 = s5 + "lo";            // final 变量 → 编译期常量 → 折叠！
System.out.println(s1 == s6);     // true

// ④ intern() 的 JDK 7+ 行为
String s7 = new StringBuilder().append("ja").append("va").toString();
System.out.println(s7.intern() == s7);  // JDK 7+: true

String s8 = new StringBuilder().append("hello").append("world").toString();
System.out.println(s8.intern() == s8);  // true（首次 intern 存入引用）

// ⑤ 对比 Integer 的缓存
Integer i1 = 100, i2 = 100;
System.out.println(i1 == i2);     // true —— Integer 缓存 [-128, 127]
Integer i3 = 200, i4 = 200;
System.out.println(i3 == i4);     // false —— 超出缓存范围
```

---

## 六、实用方法速查

### 6.1 日常高频 API

```java
// 判空
String s = "  ";
s.isEmpty();       // false —— 只检查 length == 0
s.isBlank();       // true  —— JDK 11+，检查是否全为空白字符
s.trim();          // "abc" —— 去首尾空格（JDK 1.0）
s.strip();         // "abc" —— JDK 11+，去首尾 Unicode 空白字符

// 格式化（JDK 15+）
"Hello %s".formatted("World");        // "Hello World"
String.format("Hello %s", "World");   // "Hello World"

// 文本块（JDK 15+）
String json = """
{
    "name": "张三",
    "age": 18
}
""";
// 等价于 "{\n    \"name\": \"张三\",\n    \"age\": 18\n}\n"

// 字符串换行
"line1\nline2\nline3".lines().count();  // 3 —— JDK 11+

// 重复
"abc".repeat(3);  // "abcabcabc" —— JDK 11+

// 缩进
"abc".indent(4);  // "    abc\n" —— JDK 12+
```

### 6.2 编码相关

```java
// String 与 byte[] 转换
String s = "你好";
byte[] utf8 = s.getBytes(StandardCharsets.UTF_8);     // UTF-8：6 字节（每个汉字 3 字节）
byte[] gbk = s.getBytes(Charset.forName("GBK"));       // GBK：4 字节（每个汉字 2 字节）

new String(utf8, StandardCharsets.UTF_8);  // "你好"
new String(gbk, Charset.forName("GBK"));   // "你好"
// new String(gbk, StandardCharsets.UTF_8);  // 乱码！
```

---

## 七、总结

| 知识点 | 核心要点 |
|--------|---------|
| 不可变性 | `final class` + `private final byte[]`；带来线程安全、常量池、Hash 缓存、系统安全 |
| 常量池 | 字面量在池中共享；`new String()` 在堆上；JDK 7 移入堆；`intern()` 返回池中引用 |
| 编译优化 | 常量折叠 + `+` → StringBuilder；JDK 9+ 用 invokedynamic 更高效 |
| StringBuilder vs StringBuffer | 前者单线程高性能，后者线程安全但慢；扩容机制：`×2 + 2` |
| == vs equals | == 比地址，equals() 比值（String 已重写 equals()，逐字符比较） |
| 新特性 | Compact Strings(JDK 9)、isBlank/strip/repeat/lines(JDK 11)、文本块(JDK 15) |

掌握 String 的底层机制后，下一篇我们将进入 **异常处理**——try-catch-finally、try-with-resources、受检与非受检异常的选择，以及那些让你在代码审查中被点赞的异常处理最佳实践。

---

## 参考

- [Java Language Specification - Chapter 3.10.5: String Literals](https://docs.oracle.com/javase/specs/jls/se17/html/jls-3.html#jls-3.10.5)
- [JEP 254: Compact Strings](https://openjdk.org/jeps/254) — JDK 9 Compact Strings 提案
- [JEP 280: Indify String Concatenation](https://openjdk.org/jeps/280) — JDK 9 字符串拼接优化
- [JavaGuide - String](https://javaguide.cn/java/basis/java-basic-questions-01.html)
