---
title: 面向对象编程
icon: project-diagram
order: 4
category:
  - Java
  - 基础
tag:
  - 面向对象
  - 封装
  - 继承
  - 多态
  - 接口
  - 抽象类
---

# Java 面向对象编程：封装、继承、多态与接口设计

> 📖 本文是 Java 基础知识系列的第四篇，进入 Java 核心中的核心——面向对象编程（OOP）。如果说基本语法是"识字"，那 OOP 就是"写作"——它教会你如何用对象来组织和构建程序。

---

## 一、为什么 Java 是面向对象的？

Java 的设计哲学是「万物皆对象」。与 C 语言的过程式编程（数据 + 函数分离）不同，Java 将**数据**和**操作数据的方法**绑定在一起，封装成一个个**对象**。

```java
// 过程式思维（C 风格）—— 数据和方法分离
int age = 18;
void setAge(int a) { age = a; }

// 面向对象思维（Java）—— 数据和方法绑定
class Person {
    private int age;               // 数据
    public void setAge(int age) {  // 操作方法
        this.age = age;
    }
}
```

> 💡 **本质理解**：面向对象不是多了封装/继承/多态这三个术语，而是代表一种**组织代码的方式**——用对象间的协作来描述系统行为。你写的每一行 Java 代码都在做这件事。

---

## 二、封装（Encapsulation）

### 2.1 什么是封装？

封装 = **隐藏内部实现细节 + 暴露可控的访问接口**。

```java
public class BankAccount {
    // 数据私有——外部无法直接触碰
    private double balance;
    private final String accountNumber;

    public BankAccount(String accountNumber) {
        this.accountNumber = accountNumber;
        this.balance = 0.0;
    }

    // 通过公开方法访问——可以做校验、日志、权限检查
    public void deposit(double amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("存款金额必须大于 0");
        }
        this.balance += amount;
        // 可以在这加日志记录、短信通知等
    }

    public double getBalance() {
        return balance;  // 外部只能读，不能直接改
    }

    public String getAccountNumber() {
        return accountNumber;  // 卡号创建后不可变
    }
}
```

暴露内部细节的危险示例：

```java
// ❌ 直接把字段设为 public —— 任何代码都能随意修改
public class BadAccount {
    public double balance;  // 有人设置 balance = -10000 怎么办？
}

// ✅ 真正的封装
public class GoodAccount {
    private double balance;  // 仅类内部可访问
    // 通过方法控制写入
}
```

### 2.2 访问权限修饰符完整规则

Java 中有四种访问级别，决定了类和成员的可见范围：

| 修饰符 | 类内部 | 同包 | 子类（不同包） | 任意位置 |
|--------|--------|------|---------------|---------|
| `private` | ✅ | ❌ | ❌ | ❌ |
| (default) 包级别 | ✅ | ✅ | ❌ | ❌ |
| `protected` | ✅ | ✅ | ✅ | ❌ |
| `public` | ✅ | ✅ | ✅ | ✅ |

```java
package com.example.a;

public class Parent {
    private   int a = 1;  // 仅本类可见
              int b = 2;  // 同包可见（包级别）
    protected int c = 3;  // 同包 + 子类可见
    public    int d = 4;  // 所有类可见
}

// 不同包中的子类
package com.example.b;

import com.example.a.Parent;

public class Child extends Parent {
    void test() {
        // System.out.println(a);  // ❌ private，编译错误
        // System.out.println(b);  // ❌ default，不同包不可见
        System.out.println(c);     // ✅ protected，子类可见
        System.out.println(d);     // ✅ public，所有类可见
        System.out.println(super.c);
    }
}
```

> 💡 **最佳实践**：
> - 字段一律 `private`，通过 getter/setter 暴露
> - 工具方法用 `private`，对外接口用 `public`
> - `protected` 用于设计给子类继承的方法
> - 谨慎使用包级别——依赖包结构耦合

---

## 三、继承（Inheritance）

### 3.1 extends 语法与单继承

Java **只支持单继承**（一个类只能有一个直接父类），用 `extends` 关键字：

```java
class Animal {
    protected String name;

    public Animal(String name) {
        this.name = name;
    }

    public void eat() {
        System.out.println(name + " 正在吃");
    }
}

class Dog extends Animal {
    public Dog(String name) {
        super(name);  // 必须调用父类构造器
    }

    public void bark() {
        System.out.println(name + " 汪汪叫");
    }
}

Dog dog = new Dog("旺财");
dog.eat();   // 继承自 Animal
dog.bark();  // Dog 自己的方法
```

### 3.2 super 关键字

`super` 有三大用途：

```java
class Child extends Parent {
    public Child() {
        super();       // ① 调用父类构造器（必须在第一行）
    }

    void doSomething() {
        super.method();  // ② 调用父类被重写的方法
    }

    void printField() {
        System.out.println(super.field);  // ③ 访问父类被隐藏的字段
    }
}
```

**重要**：子类构造器如果不显式调用 `super()`，编译器自动插入**无参** `super()` 调用。如果父类没有无参构造器，子类必须显式调用有参的 `super(...)`：

```java
class Parent {
    public Parent(String name) {}  // 只有有参构造器
}

class Child extends Parent {
    public Child() {
        super("default");  // ✅ 必须显式调用，否则编译错误
    }
}
```

### 3.3 方法重写（Override）vs 方法重载（Overload）

这是面试中的高频考点，经常被拿来对比：

| 维度 | 重写（Override） | 重载（Overload） |
|------|-----------------|-----------------|
| 发生位置 | 父类和子类之间 | 同一个类内部 |
| 方法签名 | **完全相同**（方法名 + 参数列表） | 方法名相同，**参数列表不同** |
| 返回类型 | 相同或其子类型（协变返回类型） | 可以不同 |
| 访问权限 | 不能比父类更严格 | 可以任意 |
| 异常 | 不能抛出父类未列出的受检异常 | 可以任意 |
| 运行时绑定 | ✅（动态绑定，多态的基础） | ❌（编译期决定调用哪个） |
| 注解 | `@Override`（强烈建议加） | 无需注解 |

```java
class Animal {
    public void makeSound() {
        System.out.println("动物发出声音");
    }

    // 重载
    public void makeSound(int times) {
        for (int i = 0; i < times; i++) {
            makeSound();
        }
    }
}

class Cat extends Animal {
    @Override  // ✅ 编译器会检查是否真的重写了
    public void makeSound() {
        System.out.println("喵喵喵");
    }
}
```

> 💡 **为什么要用 `@Override` 注解？** 如果你不小心拼错了方法名（比如 `makeSoudn()`），编译器不会报错（它以为你定义了一个新方法），但加上 `@Override` 注解后编译器会发现父类没有同名方法，直接报错——在编码阶段就拦截错误。

### 3.4 Object 类的通用方法

Java 中**所有类都隐式继承 `java.lang.Object`**。Object 提供了几个需要重点理解的方法：

```java
public class Object {
    public final native Class<?> getClass();        // 获取运行时类
    public native int hashCode();                    // 哈希码
    public boolean equals(Object obj);               // 判断相等
    public String toString();                        // 字符串表示
    protected native Object clone();                 // 浅克隆
    protected void finalize();                       // 垃圾回收前回调（已废弃）
    // wait/notify/notifyAll 用于线程通信
}
```

**equals() 与 hashCode() 的约定**——这是面试中最常问的 Object 方法话题：

```
1. 如果重写 equals()，必须重写 hashCode()
2. 两个对象 equals() 返回 true，则 hashCode() 必须相等
3. 两个对象 equals() 返回 false，hashCode() 可以相等（哈希冲突）
4. 反过来，hashCode() 相等的两个对象，equals() 不一定为 true
```

```java
public class Person {
    private String name;
    private int age;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Person p)) return false;
        return age == p.age && Objects.equals(name, p.name);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, age);
    }
}
```

> ⚠️ **为什么必须同时重写？** 如果只重写 `equals()` 而不重写 `hashCode()`，两个 equals 返回 true 的对象可能散列到 HashMap 的不同桶里，导致 HashMap 无法正确存储和查找——存入 `map.put(p1, v)` 后用 `map.get(p2)`（p1.equals(p2)==true）可能返回 null。

---

## 四、⭐️ 多态（Polymorphism）

### 4.1 什么是多态？

多态 = **同一个类型的不同实例，对同一消息产生不同的响应**。

```java
// 多态的核心表达式
Animal pet = new Dog();  // 声明类型是 Animal，实际类型是 Dog
pet.makeSound();          // 输出 "汪汪汪" —— 执行的是 Dog 的方法！

pet = new Cat();          // 声明类型还是 Animal，实际类型变成 Cat
pet.makeSound();          // 输出 "喵喵喵" —— 执行的是 Cat 的方法！
```

两行调用的是**同一个方法签名** `makeSound()`，但**行为完全不同**——这就是多态。

### 4.2 编译看左边，运行看右边

这句口诀概括了多态的核心机制：

```java
// 编译看左边 —— 声明类型（Animal）
// 运行看右边 —— 实际类型（Dog）
Animal a = new Dog();

a.eat();       // ✅ 能调用，因为 Animal 有 eat() 方法
a.makeSound(); // ✅ 能调用，执行的是 Dog 重写的版本
// a.bark();   // ❌ 编译错误！Animal 没有 bark() 方法

// 为什么？编译器只检查声明类型是否有这个方法
// JVM 运行时才根据实际类型去调用对应的方法
```

### 4.3 动态绑定原理

多态的实现依赖 **方法表（Method Table / vtable）**——每个类在方法区中有一张方法表，记录了该类所有方法的实际入口地址：

```
Animal 类的方法表：
  eat()      → Animal.eat()
  makeSound() → Animal.makeSound()

Dog 类的方法表：
  eat()      → Animal.eat()     （未重写，沿用父类地址）
  makeSound() → Dog.makeSound()  （重写了，指向自己的实现）
  bark()     → Dog.bark()

Cat 类的方法表：
  eat()      → Animal.eat()
  makeSound() → Cat.makeSound()
```

JVM 执行 `pet.makeSound()` 时：
1. 从 `pet` 所属类的方法表中查找 `makeSound()`
2. 执行找到的方法
3. 如果该方法被子类重写过，方法表中指向的就是子类的实现

这就是**动态绑定**——调用哪个方法在**运行时**根据对象的实际类型决定，不是在编译期决定。

### 4.4 向上转型与向下转型

```java
// 向上转型——自动的，安全的
Animal a = new Dog();  // Dog → Animal，自动
// a 只能访问 Animal 中定义的方法

// 向下转型——手动的，需要检查
if (a instanceof Dog dog) {  // Java 16+ 模式匹配写法
    dog.bark();  // 安全使用
}

// 传统写法
if (a instanceof Dog) {
    Dog d = (Dog) a;  // 手动强转
    d.bark();
}
```

向下转型可能抛出 `ClassCastException`：

```java
Animal a = new Cat();
Dog d = (Dog) a;  // ❌ 运行时 ClassCastException！Cat 不能转 Dog
```

---

## 五、⭐️ 抽象类 vs 接口

### 5.1 对比矩阵

抽象类和接口是 Java 中实现抽象的两个工具，它们的区别是经典面试题：

| 维度 | 抽象类（abstract class） | 接口（interface） |
|------|------------------------|-------------------|
| 实例化 | ❌ 不能被实例化 | ❌ 不能被实例化 |
| 构造器 | ✅ 可以定义构造器（给子类用） | ❌ 不能有构造器 |
| 成员变量 | 可以定义任意类型的字段 | 只能定义 `public static final` 常量 |
| 方法 | 可以有抽象方法，也可以有**已实现的方法** | 抽象方法 + `default` 方法 + `static` 方法（JDK 8+） |
| 实现数量 | 一个类只能继承一个 | 一个类可以实现**多个**接口 |
| 访问修饰符 | 可以用任意修饰符 | 方法默认 `public`（JDK 9+ 支持 `private` 方法） |
| 设计意图 | 「is-a」关系——父与子的本质关系 | 「can-do」能力——跨体系的行为契约 |
| 典型场景 | 模板方法模式、共享状态 | 解耦、多实现、函数式接口 |

### 5.2 代码对比

```java
// 抽象类——定义「是什么」
abstract class Animal {
    protected String name;

    public Animal(String name) {
        this.name = name;
    }

    // 抽象方法——子类必须实现
    public abstract void makeSound();

    // 具体方法——子类继承默认实现
    public void eat() {
        System.out.println(name + " 正在吃");
    }
}

// 接口——定义「能做什么」
interface Flyable {
    int MAX_HEIGHT = 10000;  // 隐式 public static final

    void fly();              // 隐式 public abstract

    // default 方法——提供默认实现，子类可重写
    default void land() {
        System.out.println("降落了");
    }

    // static 方法——工具方法
    static boolean canFlyAtHeight(int height) {
        return height <= MAX_HEIGHT;
    }
}

// 一个类可以同时继承 + 实现多个接口
class Eagle extends Animal implements Flyable, Predator {
    public Eagle(String name) {
        super(name);
    }

    @Override
    public void makeSound() {
        System.out.println("唳——");
    }

    @Override
    public void fly() {
        System.out.println(name + " 在高空翱翔");
    }
}
```

### 5.3 何时用抽象类？何时用接口？

```
选择抽象类的情况：
  ✓ 多个子类共享相同的状态（字段）
  ✓ 需要构造器来初始化状态
  ✓ 子类之间有明确的 is-a 关系
  ✓ 需要 protected 或包级别的成员

选择接口的情况：
  ✓ 要给不相关的类赋予相同的能力（如 Comparable、Serializable）
  ✓ 需要多继承的效果
  ✓ 对应的实现类之间没有层次关系
  ✓ 设计一个函数式接口（只有一个抽象方法）
```

### 5.4 JDK 8+ 接口的新角色

JDK 8 引入 `default` 方法和 `static` 方法后，接口的功能大幅扩展。最典型的是 `java.util.Collection` 接口：

```java
// JDK 8 在 Collection 接口中新增的 default 方法
public interface Collection<E> extends Iterable<E> {
    // default 方法——为所有集合实现提供了 stream() 功能
    default Stream<E> stream() {
        return StreamSupport.stream(spliterator(), false);
    }

    default Stream<E> parallelStream() {
        return StreamSupport.stream(spliterator(), true);
    }

    // 所有实现了 Collection 的类自动获得了 stream() 的能力
    // 无需修改任何实现类代码——这就是"接口演化"的力量
}
```

JDK 9 更进一步允许接口定义 `private` 方法（供 default 方法内部复用）：

```java
public interface Greeting {
    default void sayHello() {
        log("Hello");
    }

    default void sayGoodbye() {
        log("Goodbye");
    }

    // private 方法——接口内部的工具方法，实现类不需要关心
    private void log(String msg) {
        System.out.println("[LOG] " + msg);
    }
}
```

---

## 六、static 与 final

### 6.1 static——属于类，不属于实例

`static` 修饰的成员**属于类本身**，在类加载时就初始化，所有实例共享：

```java
public class Counter {
    // static 变量——类变量，所有实例共享
    private static int count = 0;

    // static 常量——编译期常量（加上 final）
    public static final int MAX_COUNT = 100;

    // static 代码块——类加载时执行一次
    static {
        System.out.println("Counter 类被加载了");
    }

    // static 方法——通过类名直接调用
    public static int getCount() {
        return count;
    }

    public Counter() {
        count++;  // 每创建一个实例，count 加 1
    }
}

Counter c1 = new Counter();  // 输出：Counter 类被加载了
Counter c2 = new Counter();
System.out.println(Counter.getCount());  // 2 —— 通过类名调用 static 方法
```

**执行顺序**（面试考点）：

```
父类 static 代码块 → 子类 static 代码块 → 父类构造器 → 子类构造器
```

```java
class Parent {
    static { System.out.print("A"); }
    Parent()  { System.out.print("B"); }
}

class Child extends Parent {
    static { System.out.print("C"); }
    Child()  { System.out.print("D"); }

    public static void main(String[] args) {
        new Child();  // 输出：ACBD
    }
}
```

### 6.2 final——不可变性

| 修饰目标 | 效果 |
|---------|------|
| `final` 变量 | 值不可变（基本类型）或引用不可变（引用类型，但对象内容可以变） |
| `final` 方法 | 方法不可被子类重写 |
| `final` 类 | 类不可被继承（如 `String`、`Integer`） |

```java
// final 变量——引用不可变，但对象内容可以变
final List<String> list = new ArrayList<>();
list.add("hello");  // ✅ 可以修改对象内容
// list = new LinkedList<>();  // ❌ 编译错误！引用不能重新指向

// 想让内容也不可变——用不可变集合
final List<String> unmodifiable = Collections.unmodifiableList(new ArrayList<>());
// unmodifiable.add("hello");  // ❌ 运行时 UnsupportedOperationException
```

> 💡 **String 为什么设计为 final？**
> - **安全性**：String 被 JVM 广泛使用（类名、方法名、文件路径），不可变保证了安全
> - **字符串常量池**：不可变使得字符串可以安全地被多处共享
> - **hash 缓存**：String 的 hashCode 可以缓存，因为字符串内容永远不会变

---

## 七、内部类

### 7.1 四种内部类

Java 允许在一个类的内部定义另一个类——带来更好的封装性和代码组织：

```java
public class Outer {
    private int outerField = 10;
    private static int staticField = 20;

    // ① 成员内部类——与 Outer 的实例绑定
    class Inner {
        public void display() {
            System.out.println(outerField);  // 可以直接访问外部类的成员
        }
    }

    // ② 静态内部类——与 Outer 的类绑定
    static class StaticNested {
        public void display() {
            // System.out.println(outerField); // ❌ 不能访问实例成员
            System.out.println(staticField);   // ✅ 只能访问 static 成员
        }
    }

    public void method() {
        int localVar = 30;  // 必须是 effectively final（JDK 8+）

        // ③ 局部内部类——定义在方法内部
        class LocalInner {
            public void display() {
                System.out.println(localVar);  // 可以访问局部变量
            }
        }
        new LocalInner().display();
    }

    // ④ 匿名内部类——没有类名，直接 new
    Runnable r = new Runnable() {
        @Override
        public void run() {
            System.out.println("Hello from anonymous inner class");
        }
    };
}
```

### 7.2 使用场景与选择

| 类型 | 使用场景 | 实例 |
|------|---------|------|
| 成员内部类 | 内部类需要频繁访问外部类的实例成员 | 复杂 GUI 组件的事件处理器 |
| 静态内部类 | 内部类不需要访问外部类实例，仅为了组织代码 | HashMap 的 `Node`、`Entry` |
| 局部内部类 | 类只在某个方法内使用一次 | 方法内的临时实现 |
| 匿名内部类 | 只需要一次性的实现，通常是接口或抽象类的快速实例化 | 事件监听器、Thread 的 Runnable |

```java
// 匿名内部类的常见用法（JDK 7 之前）
button.addActionListener(new ActionListener() {
    @Override
    public void actionPerformed(ActionEvent e) {
        System.out.println("按钮被点击了");
    }
});

// JDK 8+ 用 Lambda 更简洁
button.addActionListener(e -> System.out.println("按钮被点击了"));
```

---

## 八、总结

| 知识点 | 核心要点 |
|--------|---------|
| 封装 | 数据私有 + 公开接口；四种访问修饰符的精确控制范围 |
| 继承 | 单继承、super 的三种用法、Override vs Overload、equals/hashCode 约定 |
| 多态 | 编译看左边运行看右边、动态绑定本质（方法表）、向上/向下转型 |
| 抽象类 vs 接口 | 抽象类是 is-a（有状态），接口是 can-do（能力）；JDK 8+ 接口有了 default/static 方法 |
| static | 属于类而非实例，初始化顺序：父类 static → 子类 static → 父类构造器 → 子类构造器 |
| final | 修饰变量 = 不可变，修饰方法 = 不可重写，修饰类 = 不可继承 |
| 内部类 | 成员内部类、静态内部类、局部内部类、匿名内部类——四种形态各有用途 |

面向对象编程是 Java 的灵魂。下一篇我们将进入 **字符串深度解析**——String 不可变性、字符串常量池、intern() 的底层原理，以及 StringBuilder 与 StringBuffer 的性能差异。

---

## 参考

- [Java Language Specification - Chapter 8: Classes](https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html) — Java 类的官方规范
- [Effective Java (3rd Edition) - Item 10~12](https://www.oreilly.com/library/view/effective-java/9780134686097/) — 覆盖 equals/hashCode/toString 的最佳实践
- [JavaGuide - 面向对象](https://javaguide.cn/java/basis/java-basic-questions-01.html) — JavaGuide 相关知识点
