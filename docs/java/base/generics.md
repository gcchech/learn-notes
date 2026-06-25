---
title: 泛型
icon: layer-group
order: 7
category:
  - Java
  - 基础
tag:
  - 泛型
  - 类型擦除
  - 通配符
  - PECS
---

# Java 泛型：类型擦除、通配符与 PECS 原则

> 📖 泛型是 Java 5 引入的最重要特性之一。它让你在编译期就能捕获类型错误，而不是等到运行时抛 ClassCastException。但 Java 泛型有一个"公开的秘密"——类型擦除——理解了它，你就真正理解了泛型。

---

## 一、为什么需要泛型？

### 1.1 Java 5 之前的噩梦

```java
// Java 5 之前——集合中什么都能放，取出来全是 Object
List list = new ArrayList();
list.add("hello");
list.add(123);        // 不会报错——因为 List 存储的是 Object
list.add(new Date());

// 取出来必须强制转型——运行时才知道类型对不对
String s = (String) list.get(0);  // OK
String s2 = (String) list.get(1); // ❌ 运行时 ClassCastException！Integer 不能转 String
```

### 1.2 泛型带来的改变

```java
// Java 5+ ——编译期就告诉你类型不对
List<String> list = new ArrayList<>();
list.add("hello");
// list.add(123);   // ❌ 编译错误——类型安全！
String s = list.get(0);  // 不需要强制转型
```

泛型的好处：**编译期类型检查** + **消除强制转型** + **代码可读性**。

---

## 二、泛型类、泛型接口、泛型方法

### 2.1 泛型类

```java
// 泛型类——类型参数 T
public class Box<T> {
    private T value;

    public void set(T value) { this.value = value; }
    public T get() { return value; }
}

Box<String> stringBox = new Box<>();
stringBox.set("hello");
String s = stringBox.get();  // 无需强转

Box<Integer> intBox = new Box<>();
intBox.set(42);
```

### 2.2 泛型接口

```java
// 泛型接口
public interface Pair<K, V> {
    K getKey();
    V getValue();
}

// 实现时指定具体类型
public class OrderedPair implements Pair<String, Integer> {
    @Override
    public String getKey() { return "count"; }
    @Override
    public Integer getValue() { return 100; }
}

// 或者实现类也保持泛型
public class SimplePair<K, V> implements Pair<K, V> {
    private K key;
    private V value;
    // ...
}
```

### 2.3 泛型方法

泛型方法的类型参数独立于类，可以定义在任何地方：

```java
// 泛型方法——类型参数在返回值之前声明
public static <T> T getMiddle(T[] array) {
    return array[array.length / 2];
}

// 调用
String[] names = {"a", "b", "c"};
String mid = Utils.<String>getMiddle(names);  // 显式指定类型
String mid2 = Utils.getMiddle(names);          // 类型推导

// 多个类型参数
public static <K, V> Map<K, V> mapOf(K key, V value) {
    Map<K, V> map = new HashMap<>();
    map.put(key, value);
    return map;
}
```

---

## 三、⭐️ 类型擦除——Java 泛型的核心秘密

### 3.1 什么是类型擦除？

Java 泛型通过 **类型擦除（Type Erasure）** 实现——编译器在编译期抹去泛型信息，生成的字节码中不包含泛型类型参数：

```java
// 源码
List<String> list1 = new ArrayList<>();
List<Integer> list2 = new ArrayList<>();

// 编译后——泛型信息被擦除，两者都是普通 List
List list1 = new ArrayList();
List list2 = new ArrayList();

System.out.println(list1.getClass() == list2.getClass());  // true
// 运行时它们完全是同一个类：java.util.ArrayList
```

### 3.2 擦除规则

| 无界类型 | 擦除为 | 示例 |
|---------|--------|------|
| `T`（无界） | `Object` | `<T>` → `Object` |
| `T extends Number` | `Number` | `T` 被替换为 `Number` |
| `T extends Comparable<T>` | `Comparable` | 多边界时取第一个 |

```java
// 擦除前
public class Box<T extends Number> {
    private T value;
    public T get() { return value; }
}

// 擦除后（等价于）
public class Box {
    private Number value;
    public Number get() { return value; }
}
```

### 3.3 擦除带来的限制

**① 不能用基本类型做泛型参数**

```java
List<int> list;  // ❌ 编译错误！擦除后 T → Object，基本类型不能赋值给 Object
List<Integer> list;  // ✅ 用包装类
```

**② 不能创建泛型数组**

```java
T[] array = new T[10];  // ❌ 编译错误！擦除后 T → Object，运行时不知道 T 是什么

// 变通方案
T[] array = (T[]) new Object[10];  // 可以，但会收到 unchecked 警告

// 推荐方案——使用 ArrayList
List<T> list = new ArrayList<>();
```

**③ 不能 instanceof 检查泛型类型**

```java
if (obj instanceof List<String>) { }  // ❌ 非法！运行时泛型信息已被擦除
if (obj instanceof List<?>) { }       // ✅ 合法——无界通配符
if (obj instanceof List) { }          // ✅ 合法——原始类型

// 为什么？因为运行时 List<String> 和 List<Integer> 都是同一个 List 类
// JVM 无法区分，所以 instanceof 检查没有意义
```

**④ 不能 new 泛型类型**

```java
<T> T create() {
    return new T();  // ❌ 编译错误！运行时 T 已被擦除，不知道调哪个构造器
}

// 变通方案——传入 Class 对象
<T> T create(Class<T> clazz) throws Exception {
    return clazz.getDeclaredConstructor().newInstance();
}
```

**⑤ 不能重载仅泛型参数不同的方法（擦除后签名相同）**

```java
// ❌ 编译错误——擦除后两个方法都是 void print(List)
void print(List<String> list) { }
void print(List<Integer> list) { }
```

### 3.4 桥接方法——擦除后的多态补偿

类型擦除后，为了保持多态，编译器会生成**桥接方法（Bridge Method）**：

```java
// 源码
class Node<T> {
    private T data;
    public void setData(T data) { this.data = data; }
}

class MyNode extends Node<Integer> {
    @Override
    public void setData(Integer data) { super.setData(data); }
}
```

擦除后，`Node.setData()` 的参数是 `Object`，而 `MyNode.setData()` 的参数是 `Integer`——两个方法签名不同，不是真正的重写！编译器自动生成桥接方法解决：

```java
// MyNode 编译后（等价于）
class MyNode extends Node {
    // 程序员写的——参数是 Integer
    public void setData(Integer data) { super.setData(data); }

    // 编译器生成的桥接方法——参数是 Object，保证多态
    public void setData(Object data) {
        this.setData((Integer) data);  // 转发到实际方法
    }
}
```

---

## 四、⭐️ 通配符与 PECS 原则

### 4.1 三种通配符

| 通配符 | 名称 | 含义 | 读写能力 |
|--------|------|------|---------|
| `?` | 无界通配符 | 任意类型 | 只能读（读出来是 Object） |
| `? extends T` | 上界通配符 | T 或其子类 | 只能读，不能写 |
| `? super T` | 下界通配符 | T 或其父类 | 可以写（写 T 或其子类），读出来是 Object |

### 4.2 ? extends——上界通配符（生产者）

```java
// 上界通配符：只能读，不能写
List<? extends Number> numbers = new ArrayList<Integer>();  // OK
// numbers.add(100);  // ❌ 编译错误！不知道具体是哪种 Number 子类
Number n = numbers.get(0);  // ✅ 读取：保证返回 Number 或其子类

// 为什么不能写？
// List<? extends Number> 可能是 List<Integer>、List<Double>、List<Number>……
// 如果你放了一个 Double 进去，而实际是 List<Integer> → 类型不安全
```

关于 `add(null)` 的特殊情况：

```java
List<? extends Number> list = new ArrayList<Integer>();
list.add(null);  // ✅ 唯一可以 add 的值——因为 null 可以赋值给任何引用类型
```

### 4.3 ? super——下界通配符（消费者）

```java
// 下界通配符：可以写，但读受限
List<? super Integer> list = new ArrayList<Number>();  // OK
list.add(100);          // ✅ 可以写 Integer 或其子类
list.add(Integer.valueOf(200));  // ✅
// Integer i = list.get(0);  // ❌ 编译错误！读出来是 Object

// 为什么不能读成具体类型？
// List<? super Integer> 可能是 List<Integer>、List<Number>、List<Object>
// 无法确定读出来的具体是什么类型
Object o = list.get(0);  // ✅ 只能用 Object 接收
```

### 4.4 PECS 原则——设计泛型 API 的黄金法则

> **P**roducer **E**xtends，**C**onsumer **S**uper

```
如果一个参数化类型只「生产」（提供）值 → 用 ? extends T
如果一个参数化类型只「消费」（接收）值 → 用 ? super T
```

**经典案例——`Collections.copy()` 的设计**：

```java
// JDK 源码
public static <T> void copy(List<? super T> dest, List<? extends T> src) {
    // dest：消费者——接收 T 类型的数据 → 用 ? super T
    // src：生产者——提供 T 类型的数据 → 用 ? extends T
    for (int i = 0; i < src.size(); i++) {
        dest.set(i, src.get(i));
    }
}

// 使用——PECS 让 copy 方法极其灵活
List<Object> dest = new ArrayList<>(Arrays.asList(null, null, null));
List<Integer> src = Arrays.asList(1, 2, 3);
Collections.copy(dest, src);  // 可以把 List<Integer> 复制到 List<Object>！
```

**PECS 判断练习**：

```java
// ① 把 src 中的元素弹出并压入 dest
public static <T> void pushAll(Collection<? extends T> src,  // 生产 T → extends
                               Collection<? super T> dest) { // 消费 T → super
    for (T item : src) dest.add(item);
}

// ② 从列表中取最大元素
public static <T extends Comparable<? super T>> T max(List<? extends T> list) {
    // T extends Comparable：T 可以比较
    // ? super T：Comparable 是消费者（比较逻辑消费 T）
    // ? extends T：List 是生产者（提供 T）
}
```

### 4.5 ? 无界通配符

```java
// 无界通配符——最宽松，但也最受限
void printList(List<?> list) {
    for (Object elem : list) {  // 只能读为 Object
        System.out.println(elem);
    }
    // list.add("hello");  // ❌ 不能写（null 除外）
    list.add(null);  // ✅ 唯一能 add 的
}

// List<?> vs List<Object>
List<?> list1 = new ArrayList<String>();  // ✅ OK —— ? 匹配任意类型
List<Object> list2 = new ArrayList<String>();  // ❌ 编译错误！List<String> 不是 List<Object> 的子类
```

> 🎯 **核心理解**：`List<String>` 不是 `List<Object>` 的子类！即使 `String` 是 `Object` 的子类。泛型没有继承关系——这被称为**泛型的不可变性（Invariance）**。

---

## 五、泛型与反射——擦除后的"后门"

虽然类型被擦除了，但保留了一些有限的反射信息：

```java
// 获取泛型超类信息
public class StringList extends ArrayList<String> { }

// 通过反射获取父类的泛型参数
Type superClass = StringList.class.getGenericSuperclass();  // ArrayList<String>
if (superClass instanceof ParameterizedType pt) {
    Type[] typeArgs = pt.getActualTypeArguments();
    System.out.println(typeArgs[0]);  // class java.lang.String
}
```

这也是 **Gson**、**Jackson** 等 JSON 库能正确反序列化泛型类型的原理：

```java
// Gson 的 TypeToken——利用匿名内部类保留泛型信息
Type listType = new TypeToken<List<String>>(){}.getType();
List<String> list = gson.fromJson(json, listType);
// 匿名内部类 TypeToken<List<String>>(){} 的泛型超类是 TypeToken<List<String>>
// 通过 getGenericSuperclass() 可以获取 List<String> 的泛型参数
```

---

## 六、总结

| 知识点 | 核心要点 |
|--------|---------|
| 泛型本质 | 编译期类型安全检查，消除强制转型 |
| 类型擦除 | 编译后泛型信息消失 → List\<String\> 和 List\<Integer\> 运行时是同一个类 |
| 擦除限制 | 不能用基本类型、不能 new 泛型数组、不能 instanceof 具体泛型、不能重载擦除后同签名的方法 |
| 桥接方法 | 编译器自动生成，保证擦除后的多态正常工作 |
| 上界通配符 | `? extends T`：生产者，只能读不能写 |
| 下界通配符 | `? super T`：消费者，可以写但读受限 |
| PECS | Producer Extends，Consumer Super——泛型 API 设计的黄金法则 |
| 泛型不可变 | `List\<String\>` 不是 `List\<Object\>` 的子类 |

下一篇我们将进入 **反射与注解**——Class 对象的四种获取方式、动态创建对象和调用方法、注解的定义与处理器，以及 Spring 框架中无处不在的反射机制。

---

## 参考

- [Java Language Specification - Chapter 4.5: Type Erasure](https://docs.oracle.com/javase/specs/jls/se17/html/jls-4.html#jls-4.5)
- [Effective Java (3rd Edition) - Item 26-33: Generics](https://www.oreilly.com/library/view/effective-java/9780134686097/)
- [Angelika Langer's Java Generics FAQ](https://angelikalanger.com/GenericsFAQ/JavaGenericsFAQ.html) — 最全面的 Java 泛型 FAQ
- [JavaGuide - 泛型](https://javaguide.cn/java/basis/java-basic-questions-01.html)
