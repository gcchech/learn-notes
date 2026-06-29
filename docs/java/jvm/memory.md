---
title: JVM 内存结构
icon: microchip
order: 1
category:
  - Java
  - JVM
tag:
  - JVM
  - 内存模型
  - 堆
  - 栈
  - 方法区
  - 元空间
  - 逃逸分析
  - 对象布局
---

# JVM 内存结构：从整体架构到对象创建

> 📖 JVM 内存结构是 Java 开发者从 "会用" 走向 "理解" 的第一道门。本文从 HotSpot JVM 的整体架构出发，深入剖析运行时数据区的五大组成部分——堆、方法区（元空间）、虚拟机栈、本地方法栈、程序计数器，覆盖栈帧结构、堆分代模型、对象的内存布局（Mark Word + Klass Pointer + 实例数据 + 对齐填充）、对象创建全过程（类检查→TLAB分配→对象头→init），以及逃逸分析与栈上分配等编译器优化，为后续 GC 和调优打下底层基础。

---

## 一、JVM 整体架构概览

在深入内存结构之前，先对 JVM 的全貌有一个清晰的认识：

```
┌─────────────────────────────────────────────────────────────────────┐
│                         HotSpot JVM 架构                             │
├───────────┬───────────────────┬───────────────┬─────────────────────┤
│  类加载器  │   运行时数据区      │   执行引擎     │   本地接口 (JNI)     │
│  ┌──────┐ │  ┌─────────────┐  │  ┌─────────┐  │  ┌───────────────┐  │
│  │启动类 │ │  │  堆 (Heap)   │  │  │ 解释器   │  │  │ 本地方法库     │  │
│  │加载器 │ │  │  ┌───────┐  │  │  ├─────────┤  │  └───────────────┘  │
│  ├──────┤ │  │  │年轻代  │  │  │  │ JIT编译器 │                      │
│  │扩展类 │ │  │  │┌─────┐│  │  │  │ (C1/C2)  │                      │
│  │加载器 │ │  │  ││Eden ││  │  │  ├─────────┤                      │
│  ├──────┤ │  │  │├─────┤│  │  │  │ GC回收器 │                      │
│  │应用类 │ │  │  ││ S0  ││  │  │  └─────────┘                      │
│  │加载器 │ │  │  │├─────┤│  │  │                                     │
│  └──────┘ │  │  ││ S1  ││  │  │                                     │
│           │  │  ├───────┤  │  │                                     │
│           │  │  │老年代  │  │  │                                     │
│           │  │  └───────┘  │  │                                     │
│           │  ├─────────────┤  │                                     │
│           │  │  方法区      │  │                                     │
│           │  │ (元空间)     │  │                                     │
│           │  ├─────────────┤  │                                     │
│           │  │ 虚拟机栈     │  │                                     │
│           │  ├─────────────┤  │                                     │
│           │  │ 本地方法栈   │  │                                     │
│           │  ├─────────────┤  │                                     │
│           │  │ 程序计数器   │  │                                     │
│           │  └─────────────┘  │                                     │
└───────────┴───────────────────┴───────────────┴─────────────────────┘
```

这条流水线的核心流程是：**类加载器** 将 `.class` 文件加载到内存 → **运行时数据区** 存储类元数据、对象实例、方法调用栈等 → **执行引擎** 负责解释执行或编译执行字节码 → **本地接口** 桥接调用 C/C++ 写的本地方法（如 `Object.hashCode()` 底层实现）。

本文聚焦中间一层—— **运行时数据区**。

> 🎯 **关键概念**：JVM 内存 ≠ Java 内存模型(JMM)。前者描述的是 JVM 运行时数据存储的物理结构（这块内存在哪、存什么），后者描述的是多线程访问共享变量的可见性规则（一个线程的写何时对其他线程可见）。两者经常被混淆，但完全是两回事。

---

## 二、运行时数据区总览

根据《Java 虚拟机规范》，运行时数据区分为 **线程共享** 和 **线程私有** 两大类：

```
┌──────────────────────────────────────────────────────────────┐
│                    线程共享区域                                 │
│  ┌──────────────────────┐  ┌──────────────────────────────┐  │
│  │       堆 (Heap)       │  │      方法区 (Method Area)      │  │
│  │                      │  │  ┌─────────────────────────┐ │  │
│  │  - 存放对象实例+数组   │  │  │  JDK 8+: 元空间(Metaspace)│ │  │
│  │  - GC 的主要战场      │  │  │  JDK 7-: 永久代(PermGen) │ │  │
│  │  - 所有线程共享       │  │  │  存放类元数据/常量池等    │ │  │
│  └──────────────────────┘  │  └─────────────────────────┘ │  │
│                            └──────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│                    线程私有区域                                 │
│  ┌──────────┐  ┌───────────┐  ┌───────────────────────────┐  │
│  │ 程序计数器 │  │ 虚拟机栈    │  │      本地方法栈            │  │
│  │(PC寄存器) │  │(VM Stack) │  │   (Native Method Stack)  │  │
│  │          │  │           │  │                          │  │
│  │ 存下一条  │  │ 栈帧存储   │  │  与虚拟机栈功能相同          │  │
│  │ 字节码指令 │  │ 方法调用栈 │  │  但服务于 native 方法       │  │
│  │          │  │ 每个方法   │  │                          │  │
│  │          │  │ 对应一个   │  │  HotSpot 实现中两者合二为一  │  │
│  │          │  │ 栈帧       │  │                          │  │
│  └──────────┘  └───────────┘  └───────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

| 区域 | 线程共享？ | 存放内容 | 异常 |
|------|:---:|------|------|
| **堆 (Heap)** | ✅ 共享 | 对象实例、数组 | OutOfMemoryError: Java heap space |
| **方法区 (Method Area)** | ✅ 共享 | 类元数据、运行时常量池、静态变量、JIT 编译缓存 | OutOfMemoryError: Metaspace |
| **虚拟机栈 (VM Stack)** | ❌ 私有 | 栈帧（局部变量表、操作数栈等） | StackOverflowError / OutOfMemoryError |
| **本地方法栈 (Native Stack)** | ❌ 私有 | native 方法调用 | StackOverflowError / OutOfMemoryError |
| **程序计数器 (PC Register)** | ❌ 私有 | 当前线程执行的字节码行号 | 无（唯一不抛 Error 的区域） |

---

## 三、程序计数器（Program Counter Register）

这是内存中最小的区域，也是唯一不会 OOM 的区域。

```
线程执行流程：
  ┌────────┐    ┌────────┐    ┌────────┐  PC寄存器 → 0
  │ iconst_1│───▶│ iconst_2│───▶│ iadd    │  PC寄存器 → 1
  └────────┘    └────────┘    └────────┘  PC寄存器 → 2
```

```java
// 一段简单代码的字节码与 PC 移动
public int add() {
    int a = 1;   // 0: iconst_1    1: istore_1
    int b = 2;   // 2: iconst_2    3: istore_2
    return a + b;// 4: iload_1     5: iload_2    6: iadd   7: ireturn
}
// PC 寄存器依次指向：0, 1, 2, 3, 4, 5, 6, 7
```

**核心要点**：

- 每个线程有独立的 PC 寄存器（线程私有），它们互不影响
- 如果当前执行的是 **Java 方法**：PC 指向当前字节码指令的地址
- 如果当前执行的是 **native 方法**：PC 值为 `undefined`（因为 native 代码不由 JVM 解释）
- **为什么不会 OOM？** PC 只存一个固定的指针/偏移量，大小固定且是线程创建时分配

---

## 四、虚拟机栈（VM Stack）与栈帧

### 4.1 栈的总体结构

每创建一个线程，JVM 就会创建一个对应的虚拟机栈。每个 Java 方法的调用与返回，都对应一个栈帧（Stack Frame）的**入栈与出栈**：

```
虚拟机栈（线程级别）：
┌─────────────────────────┐
│  栈帧 3: methodC()       │ ← 当前栈顶（正在执行）    ──┐
│  ┌─────────────────┐    │                             │
│  │ 局部变量表        │    │                             │
│  │ 操作数栈          │    │                             │
│  │ 动态链接          │    │   后进先出 (LIFO)
│  │ 返回地址          │    │   方法调用 = 压栈
│  └─────────────────┘    │   方法返回 = 弹栈
├─────────────────────────┤                             │
│  栈帧 2: methodB()       │                             │
├─────────────────────────┤                             │
│  栈帧 1: main()          │                             │
├─────────────────────────┤                             │
│  栈底                     │   ────────────────────────┘
└─────────────────────────┘
```

```java
public class StackDemo {
    public static void main(String[] args) {
        methodA();  // 栈帧 main → 栈帧 A → 栈帧 main
    }

    static void methodA() {
        int x = 1;
        methodB(x);  // 栈帧 A → 栈帧 B → 栈帧 A
    }

    static void methodB(int val) {
        int y = val + 1;
        System.out.println(y);
    }  // 栈帧 B 出栈 → 栈帧 A 继续 → 栈帧 A 出栈 → main 继续
}
```

### 4.2 栈帧的四大部件

```
┌──────────────────────────────┐
│         栈帧 (Stack Frame)     │
├──────────────────────────────┤
│ ① 局部变量表 (Local Variables) │
│    ┌─────────────────────┐    │
│    │ 0: this (实例方法)    │    │
│    │ 1: int a            │    │
│    │ 2: double b         │    │
│    │ 4: String c         │    │
│    │ 5: Object d         │    │
│    └─────────────────────┘    │
├──────────────────────────────┤
│ ② 操作数栈 (Operand Stack)      │
│    计算过程的临时中转站          │
├──────────────────────────────┤
│ ③ 动态链接 (Dynamic Linking)    │
│    指向运行时常量池中方法的引用   │
├──────────────────────────────┤
│ ④ 返回地址 (Return Address)     │
│    方法调用后的下一条指令地址     │
└──────────────────────────────┘
```

#### ① 局部变量表

存储方法参数和方法内定义的局部变量，**以槽（Slot）为单位**，每个 Slot 存 32 位数据：

```java
public void demo(int a, double b, String c) {
    int d = 1;
    Object e = new Object();
}
```

```
局部变量表布局（实例方法，第 0 个 Slot 是 this）：
┌───────┬───────┬───────┬───────┬───────┬───────┬───────┐
│ Slot0 │ Slot1 │ Slot2 │ Slot3 │ Slot4 │ Slot5 │ Slot6 │
│ this  │ int a │ double b  │ String c │ int d │ Object e│
│       │       │ (占2个Slot)│          │       │        │
└───────┴───────┴───────┴───────┴───────┴───────┴───────┘
```

> ⭐️ **注意**：`long` 和 `double` 占用2个连续的 Slot（64 位），因为每个 Slot 是 32 位。对 `double` 类型的 Slot 操作必须原子进行，不会分两次读一个 64 位值。

#### ② 操作数栈

Java 虚拟机是基于栈的指令集架构（而非寄存器架构），几乎所有计算都在操作数栈上进行：

```java
// 源码
int a = 1;
int b = 2;
int c = a + b;

// 编译为字节码 + 操作数栈演示
// 0: iconst_1     操作数栈: [1]
// 1: istore_1     操作数栈: []       局部变量表[1] = 1
// 2: iconst_2     操作数栈: [2]
// 3: istore_2     操作数栈: []       局部变量表[2] = 2
// 4: iload_1      操作数栈: [1]      加载 a
// 5: iload_2      操作数栈: [1,2]    加载 b
// 6: iadd         操作数栈: [3]      弹出1,2 → 相加 → 压入3
// 7: istore_3     操作数栈: []       局部变量表[3] = 3
```

```
iadd 指令执行过程示意：

  操作前           操作中           操作后
  ┌───┐           ┌──────────┐    ┌───┐
  │ 2 │ ← 栈顶      ALU 加法器  │    │ 3 │ ← 栈顶（结果压回）
  ├───┤           │ 1 + 2 = 3 │    └───┘
  │ 1 │            └──────────┘
  └───┘
```

#### ③ 动态链接

每个栈帧都包含一个指向**运行时常量池**中该方法的引用，用于方法调用时的符号引用转直接引用：

```java
public class DynamicLinkingDemo {
    public void foo() {
        bar();  // 字节码: invokespecial #3  ← #3 是常量池中 bar() 的符号引用
    }

    public void bar() {}
}
```

```
常量池中存储：
  #1 = Class           → DynamicLinkingDemo
  #2 = Methodref       → foo() 的符号引用
  #3 = Methodref       → bar() 的符号引用    ← 动态链接指向这里
  #4 = Utf8            → bar
```

#### ④ 返回地址

方法退出有两种方式：

| 退出方式 | 触发条件 | PC 寄存器的值 |
|---------|------|------|
| **正常调用完成** (Normal Method Invocation Completion) | 执行到 return 指令（ireturn/lreturn/freturn/dreturn/areturn/return） | 调用者的下一条指令地址 |
| **异常调用完成** (Abrupt Method Invocation Completion) | 方法内抛出未捕获异常 | 异常处理器(exception handler)的地址 |

### 4.3 两道"送命题"

#### StackOverflowError vs OutOfMemoryError

```java
// StackOverflowError：栈深度超过限制（最常见：递归没有出口）
public class SOFDemo {
    static int depth = 0;

    static void recurse() {
        depth++;
        recurse();  // 无限递归 → 每个调用压一个栈帧 → 栈满了
    }

    public static void main(String[] args) {
        try {
            recurse();
        } catch (StackOverflowError e) {
            System.out.println("最大深度: " + depth);  // 通常 5000~15000
        }
    }
}

// OutOfMemoryError：创建太多线程，无法分配更多栈空间
// -Xss 设得越大，每个线程栈占用越多 → 线程数上限越低 → 容易 OOM
// 公式：最大线程数 ≈ (系统可用内存 - 堆 - 方法区) / Xss
```

#### 栈内存需要 GC 吗？

**不需要**。栈帧的分配和释放是**确定性**的——方法调用时压栈、方法返回时弹栈——生命周期严格对应方法的作用域，不存在"已经不再被引用但还占着内存"的情况。这也是**栈上分配**性能高的根本原因。

---

## 五、堆（Heap）—— GC 的主战场

### 5.1 堆的分代模型

堆是 JVM 管理的**最大一块内存区域**，几乎所有对象实例都在堆上分配。HotSpot 采用分代布局（Generational Layout）：

```
┌─────────────────────────────────────────────────────────────────┐
│                         堆空间 (Heap)                             │
│  ┌─────────────────────────────────┬─────────────────────────┐  │
│  │        新生代 (Young Gen)         │    老年代 (Old/Tenured)  │  │
│  │  ┌───────┬─────────┬─────────┐  │                         │  │
│  │  │ Eden  │   S0    │   S1    │  │                         │  │
│  │  │  8    │    1    │    1    │  │                         │  │
│  │  │       │ (From)  │  (To)   │  │                         │  │
│  │  └───────┴─────────┴─────────┘  │                         │  │
│  │                                 │                         │  │
│  │  默认比例：Eden:S0:S1 = 8:1:1   │                         │  │
│  │  默认比例：New:Old = 1:2        │                         │  │
│  └─────────────────────────────────┴─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**为什么分代？—— 弱分代假说（Weak Generational Hypothesis）**：

1. **大多数对象"朝生夕死"**（Weak Generational Hypothesis）：98% 的对象很快变为垃圾 → 在新生代用复制算法高效回收
2. **活得越久，越难回收**（Strong Generational Hypothesis）：少数对象长期存活 → 放到老年代，减少扫描频率

### 5.2 新生代（Young Generation）

```
新生代工作原理：

┌────────┐ ┌────────┐ ┌────────┐      ┌────────┐ ┌────────┐ ┌────────┐
│  Eden  │ │  S0    │ │  S1    │      │  Eden  │ │  S0    │ │  S1    │
│ (有对象)│ │ (空)   │ │ (From) │ ──▶  │ (空)   │ │ (From) │ │ (To)   │
└────────┘ └────────┘ └────────┘      └────────┘ └────────┘ └────────┘
                  ↓  Minor GC                         ↓
┌────────┐ ┌────────┐ ┌────────┐      ┌────────┐ ┌────────┐ ┌────────┐
│  Eden  │ │  S1    │ │  S0    │      │  Eden  │ │  S1    │ │  S0    │
│ (新分配)│ │ (To)   │ │ (空)   │      │ (新分配)│ │ (From) │ │ (空)   │
└────────┘ └────────┘ └────────┘      └────────┘ └────────┘ └────────┘
      → Eden 中存活对象 + S0 中存活对象 → 复制到 S1(Eden + S0 → S1 清空)
      → S0 和 S1 角色互换，始终保持一个为空
```

```java
// 新生代分配示例
public class YoungGenDemo {
    private static final int _1MB = 1024 * 1024;

    public static void main(String[] args) {
        byte[] a, b, c, d;

        a = new byte[2 * _1MB];  // 分配到 Eden
        b = new byte[2 * _1MB];  // 分配到 Eden
        c = new byte[2 * _1MB];  // 分配到 Eden
        // Eden 用了 6MB

        d = new byte[2 * _1MB];  // Eden 不够 → 触发 Minor GC
        // → a, b, c 还是可达的 → 复制到 Survivor
        // → d 进入 Eden
    }
}
```

**对象进入老年代的 4 条路径**：

```
条件 1：年龄够了
  对象从 S0/S1 每熬过一次 Minor GC，年龄 +1
  到达 -XX:MaxTenuringThreshold（默认 15） → 晋升老年代
  实际上是动态计算的——JVM 会根据 Survivor 占用率动态调整

条件 2：Survivor 放不下了
  空间担保失败 → 直接进入老年代

条件 3：大对象直接进
  -XX:PretenureSizeThreshold 设置阈值（默认 0 = 关闭）
  超过阈值的对象 → 直接分配到老年代

条件 4：动态年龄判断
  Survivor 中相同年龄的对象大小总和 > Survivor 空间的一半
  → 年龄 ≥ 该年龄的对象全部晋升
```

### 5.3 老年代（Old/Tenured Generation）

老年代存放**长期存活的对象**和**大对象**，使用标记-清除或标记-整理算法回收。

| 参数 | 含义 | 默认值 |
|------|------|--------|
| `-Xms` | 初始堆大小 | 物理内存的 1/64 |
| `-Xmx` | 最大堆大小 | 物理内存的 1/4 |
| `-XX:NewRatio` | 老年代/新生代 比例 | 2（Old:Young = 2:1） |
| `-XX:SurvivorRatio` | Eden/Survivor 比例 | 8（Eden:S0:S1 = 8:1:1） |

```java
// 验证默认值（JDK 17 环境）
// java -XX:+PrintFlagsFinal -version | grep -E "NewRatio|SurvivorRatio|MaxTenuringThreshold"
// 结果：
//   MaxTenuringThreshold = 15
//   NewRatio = 2
//   SurvivorRatio = 8
```

> ⭐️ **注意**：`-Xmx` 和 `-Xms` 在生产环境**建议设为相同值**——避免堆扩容/收缩时引发的 Full GC 和性能抖动。阿里 Java 开发手册强烈建议此事。

---

## 六、方法区——从永久代到元空间

### 6.1 方法区存什么？

方法区（Method Area）是 JVM 规范的概念，存放**类元数据**：

```
┌─────────────────────────────────────────────┐
│               方法区 (Method Area)             │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐    │
│  │        类的版本信息                    │    │
│  │   ─ 类型全限定名                      │    │
│  │   ─ 父类/接口                         │    │
│  │   ─ 访问修饰符                        │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │        运行时常量池                    │    │
│  │   ─ 类/方法/字段的符号引用              │    │
│  │   ─ 字面量（字符串、数字常量）           │    │
│  │   ─ 方法/字段的描述符                  │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │        字段信息                        │    │
│  │   ─ 字段名、类型、修饰符               │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │        方法信息                        │    │
│  │   ─ 方法名、返回类型、参数、修饰符       │    │
│  │   ─ 字节码指令                         │    │
│  │   ─ 异常表                            │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │        静态变量                        │    │
│  │   ─ static 字段                      │    │
│  │   ─ static final 常量（基本类型+String） │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │        JIT 编译缓存                   │    │
│  │   ─ Code Cache                       │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### 6.2 永久代 → 元空间的进化

这是 JVM 发展史上的一个重要转折点——**JDK 8 用元空间(Metaspace)取代了永久代(PermGen)**：

```
JDK 7 及以前：                         JDK 8+：
┌────────────────────────┐            ┌────────────────────────┐
│  堆 (Heap)              │            │  堆 (Heap)              │
│  ┌──────────────────┐  │            │  ┌──────────────────┐  │
│  │     新生代        │  │            │  │     新生代        │  │
│  ├──────────────────┤  │            │  ├──────────────────┤  │
│  │     老年代        │  │            │  │     老年代        │  │
│  ├──────────────────┤  │            │  └──────────────────┘  │
│  │     永久代        │  │            └────────────────────────┘
│  │  ← 在堆内！        │  │
│  │  ← -XX:MaxPermSize │  │            元空间 (Metaspace)
│  └──────────────────┘  │            ┌────────────────────────┐
└────────────────────────┘            │     类元数据             │
                                      │  ← 在直接内存中！         │
                                      │  ← -XX:MaxMetaspaceSize  │
                                      └────────────────────────┘
```

| 对比维度 | 永久代 (JDK 7-) | 元空间 (JDK 8+) |
|---------|:---:|:---:|
| 存储位置 | 堆内存内 | **直接内存**（Native Memory） |
| 大小限制 | `-XX:MaxPermSize`，默认很小(64M~85M) | `-XX:MaxMetaspaceSize`，**默认无上限**（受物理内存限制） |
| 溢出异常 | `OutOfMemoryError: PermGen space` | `OutOfMemoryError: Metaspace` |
| 类卸载 | 较难（与堆混在一起） | 较容易（独立的直接内存空间） |
| 字符串常量池 | 在永久代（JDK 7 已移到堆） | 在堆中 |

**为什么要移到直接内存？**

1. **永久代大小难以确定**："老" JVM 时代，动态加载的类少，64M 永久代够了；但在今天的微服务时代，一个应用加载几千个类是常事（Spring Boot + MyBatis + 各种框架），按默认值必定 OOM
2. **减少 GC 复杂度**：永久代的回收条件非常苛刻（类卸载），与堆对象的回收逻辑完全不同，独立出去让 GC 更简单
3. **类卸载更灵活**：分离后，元空间的内存释放不再与堆 GC 耦合，GC 可以根据需要决定是否卸载类
4. **统一 HotSpot 和 JRockit**：Oracle 收购 Sun 后需要整合两者的优势，JRockit 从来没有永久代的概念

```java
// JDK 8 元空间配置
// -XX:MetaspaceSize=128m      → 初始元空间大小（达到后触发 GC 尝试卸载类）
// -XX:MaxMetaspaceSize=256m   → 最大元空间大小（强烈建议设上限！）
// -XX:MinMetaspaceFreeRatio   → GC 后最小空闲比（默认 40%）
// -XX:MaxMetaspaceFreeRatio   → GC 后最大空闲比（默认 70%）
```

> 🎯 **生产建议**：务必设置 `-XX:MaxMetaspaceSize`！默认无上限意味着如果代码中有动态代理或反射狂创建类（如某些 ORM 框架的 bug），直接内存会一直涨直到系统内存耗尽，排查起来远比 `Metaspace` 的明确 OOM 困难。

### 6.3 运行时常量池 vs Class 常量池 vs 字符串常量池

这个三角关系面试极高概率遇到，彻底梳理清楚：

```
┌──────────────────────────────────────────────────────────┐
│  .class 文件中的常量池 (Constant Pool Table)                │
│  → 编译时生成，静态的                                      │
│  → 存放：字面量 + 符号引用                                  │
│  → 每个类一个                                              │
└──────────────────────┬───────────────────────────────────┘
                       │ 类加载时，这些信息被加载到...
                       ▼
┌──────────────────────────────────────────────────────────┐
│  运行时常量池 (Runtime Constant Pool)                       │
│  → 方法区/元空间的一部分                                     │
│  → 运行时动态化——可以运行时添加常量（如 String.intern()）      │
│  → 每个类一个                                              │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  字符串常量池 (String Pool / String Table)                  │
│  → JDK 7+ 位于堆中（不再是方法区）                           │
│  → 全局共享，所有类共用                                      │
│  → HashSet 结构，存储字符串实例的引用                        │
│  → -XX:StringTableSize 控制大小（JDK 17 默认 65536）       │
└──────────────────────────────────────────────────────────┘
```

```java
public class StringPoolDemo {
    public static void main(String[] args) {
        // 字面量：自动入池
        String s1 = "hello";        // 字符串常量池中创建 "hello"
        String s2 = "hello";        // 直接从池中取
        System.out.println(s1 == s2);  // true ← 同一个对象

        // new String()：在堆上新建对象（不入池）
        String s3 = new String("hello");  // 堆上创建新对象
        System.out.println(s1 == s3);     // false ← 不同对象

        // intern()：主动入池
        String s4 = s3.intern();   // 如果池中已有 "hello" → 返回池中引用
        System.out.println(s1 == s4);     // true

        // 运行时拼接
        String s5 = "he" + "llo";   // 编译优化 → "hello"，直接入池
        System.out.println(s1 == s5);     // true

        String he = "he";
        String llo = "llo";
        String s6 = he + llo;       // 运行时拼接 → new StringBuilder，新对象
        System.out.println(s1 == s6);     // false
    }
}
```

> ⭐️ **关键记忆点**：
> - Class 常量池 → `.class` 文件里，编译时确定
> - 运行时常量池 → 元空间里，运行时动态
> - 字符串常量池 → **堆里**（JDK 7+），全局唯一的 String 缓存

---

## 七、对象创建全过程

从 `new` 一条指令到拿到一个完整的对象，JVM 背后做了什么？

```
new Object() 的全流程：

  ★1. 类加载检查
      └→ 检查指令参数能否在常量池中定位到类的符号引用
      └→ 检查这个类是否已加载、解析、初始化
      └→ 没有 → 先执行类加载过程

  ★2. 分配内存
      └→ 对象所需大小在类加载完成后就确定了
      └→ 从堆中划分一块内存出来：
          ├─ 指针碰撞 (Bump the Pointer)：堆规整时（Serial/ParNew）
          │    空闲指针 → 往后挪 N 字节 → 完事
          │    ┌──────┐┌──────┐┌──────┐┌────────────┐
          │    │已分配││已分配││已分配││  空闲空间    │
          │    └──────┘└──────┘└──────┘│  ↑ 指针    │
          │                           └────────────┘
          └─ 空闲列表 (Free List)：堆不规整时（CMS）
                维护一个列表记录哪些区域空闲 → 找一块够大的
          └─ 并发分配线程安全问题：
              ├─ CAS + 失败重试
              └─ TLAB (Thread Local Allocation Buffer)：主力方案

  ★3. 初始化零值
      └→ 对象的所有实例字段赋默认零值（不执行 init）
      └→ int=0, boolean=false, 引用=null 等

  ★4. 设置对象头 (Mark Word + Klass Pointer)
      └→ 见下一节

  ★5. 执行 <init>() 方法
      └→ 按照程序员的意愿初始化（构造方法、实例初始化块）
```

### TLAB —— 为分配提速的核心机制

每次对象分配都去抢堆上的全局锁？那多线程下的分配性能就毁了。JVM 的方案是**TLAB（Thread Local Allocation Buffer）**：

```
堆内存：
┌──────────────────────────────────────────────────────────────────┐
│  Thread-1 的 TLAB    │  Thread-2 的 TLAB    │    共享的空闲区      │
│  ┌────────────────┐  │  ┌────────────────┐  │                    │
│  │ 已分配 │ 未分配 │  │  │ 已分配 │ 未分配 │  │                    │
│  │  (obj) │  ↑top  │  │  │  (obj) │  ↑top  │  │    ↑ 共享指针     │
│  └────────────────┘  │  └────────────────┘  │                    │
└──────────────────────────────────────────────────────────────────┘

每个线程在 Eden 区分配一小块专属缓冲区（默认占 Eden 的 1%）
→ 线程在自己的 TLAB 内用指针碰撞分配 → 无锁、极快！
→ TLAB 用完 → 再分配一块新的 TLAB（此时需要 CAS）
→ 大对象（超过 TLAB 大小）→ 直接在共享区域分配
```

```java
// TLAB 验证
// java -XX:+PrintFlagsFinal -version | grep TLAB
// UseTLAB = true                              ← 默认开启
// TLABSize = 0                                ← 0 表示自动计算
// TLABWasteTargetPercent = 1                  ← TLAB 浪费的目标百分比
```

---

## 八、对象的内存布局

一个 Java 对象在堆上的实际存储布局如下：

```
┌──────────────────────────────────────────────────────┐
│              Java 对象内存布局                          │
├──────────────┬───────────────┬──────────┬────────────┤
│  Mark Word   │  Klass Pointer │ 实例数据  │ 对齐填充    │
│  (标记字)     │  (类型指针)    │          │ (Padding)  │
├──────────────┼───────────────┼──────────┼────────────┤
│ 8 或 12 字节  │  4 或 8 字节   │  不定    │ 补齐到8倍数 │
│ 32位JVM: 8B  │ 压缩后: 4B    │          │            │
│ 64位JVM: 8B  │ 未压缩: 8B    │          │            │
└──────────────┴───────────────┴──────────┴────────────┘
```

### 8.1 Mark Word —— Java 对象的多功能头部

Mark Word 是内存布局中最精妙的设计——它在不同状态下复用同一块空间存储不同的信息：

```
Mark Word（64 位 JVM，简化示意）：

┌─────────────────── 无锁状态 ───────────────────┐
│ unused:25 │ hash:31 │ unused:1 │ age:4 │ bias:1 │ 01 │
└─────────────────────────────────────────────────┘
                                           └ lock标志位

┌─────────────────── 偏向锁状态 ──────────────────┐
│ thread:54 │ epoch:2 │ unused:1 │ age:4 │ bias:1 │ 01 │
└─────────────────────────────────────────────────┘
         JDK 18+ 已默认禁用偏向锁 (JEP 374)

┌─────────────────── 轻量级锁状态 ────────────────┐
│           ptr_to_lock_record:62          │  00   │
└─────────────────────────────────────────────────┘
        指向线程栈中 Lock Record 的指针

┌─────────────────── 重量级锁状态 ────────────────┐
│          ptr_to_object_monitor:62        │  10   │
└─────────────────────────────────────────────────┘
        指向 ObjectMonitor 的指针

┌─────────────────── GC 标记状态 ─────────────────┐
│                unused:62                  │  11   │
└─────────────────────────────────────────────────┘
        GC 过程使用的临时标记
```

```java
// 查看 Mark Word（借助 JOL —— Java Object Layout 库）
// 依赖：org.openjdk.jol:jol-core:0.17

import org.openjdk.jol.info.ClassLayout;
import org.openjdk.jol.vm.VM;

public class ObjectLayoutDemo {
    public static void main(String[] args) {
        Object obj = new Object();
        System.out.println(VM.current().details());
        System.out.println(ClassLayout.parseInstance(obj).toPrintable());
    }
}

// 64 位 JVM + 开启压缩指针 的输出：
// OFFSET  SIZE   TYPE DESCRIPTION        VALUE
//      0     4        (object header)    01 00 00 00 (00000001 ...)
//      4     4        (object header)    00 00 00 00 (00000000 ...)
//      8     4        (object header)    e5 01 00 f8 (...)
//     12     4        (loss due to the next object alignment)
// Instance size: 16 bytes
//
// 解读：
//   第 0-7 字节：Mark Word（8 字节）
//   第 8-11 字节：Klass Pointer（4 字节，压缩后）
//   第 12-15 字节：对齐填充（因为 new Object() 没有实例数据，补到 16 字节）
```

### 8.2 Klass Pointer —— 找到对象"是谁"

Klass Pointer 指向方法区中该对象所属类的元数据（Klass 对象），JVM 通过它获取：

- 对象的类型信息（`obj.getClass()` 就是读这个指针）
- 方法表（虚方法分派）
- 对象大小信息

```java
Object obj = new Object();
// obj（堆中）的 Klass Pointer → 指向方法区中的 InstanceKlass
// InstanceKlass 中存储了 java.lang.Object 的所有元信息
```

### 8.3 压缩指针（Compressed Oops）

JDK 6+ 默认开启的优化——64 位 JVM 下指针占用 8 字节，但对于 < 32GB 的堆，高 32 位都是 0，用 4 字节 + 移位完全可以表示：

```
压缩指针原理（堆 < 32GB 时）：
  对象都是 8 字节对齐的 → 地址低 3 位总是 000
  → 存储时丢弃低 3 位 → 使用时左移 3 位恢复
  → 32 位 × 8 = 最大 32GB 堆

  压缩前：00000000 00000000 00000000 10101010 10101000 10100000 10100000 00000000  (64位)
                     丢弃高32位，低3位已知为0
  存储值：                                          10101010 10101000 10100000 10100 (32位)
  恢复时：  左移 3 位，高 32 位补 0
```

| 压缩方案 | 64位原生 | 32位压缩 | 节省 | 前提条件 |
|---------|:---:|:---:|:---:|------|
| Klass Pointer | 8 字节 | **4 字节** | 省 4B | 默认开启 |
| 引用类型字段 | 8 字节 | **4 字节** | 省 4B | 堆 < 32GB（约等于内存 < 32GB）|

```java
// 对比 Object 对象大小
// 64位 不开压缩指针：8(MarkWord) + 8(KlassPtr) + 0(实例数据) + 0(不用对齐) = 16B
// 64位 开启压缩指针：8(MarkWord) + 4(KlassPtr) + 0(实例数据) + 4(对齐) = 16B
// Object 大小都是 16B（巧合），但带字段的对象会看到差异

// 有实例字段的对象
class Person {
    int id;     // 4 字节
    String name;// 引用类型 4 字节（压缩）vs 8 字节（不压缩）
}
// 开启压缩：8(MarkWord) + 4(KlassPtr) + 4(id) + 4(name) = 20B → 对齐 24B
// 不开启：  8(MarkWord) + 8(KlassPtr) + 4(id) + 4(对齐) + 8(name) = 32B
```

---

## 九、逃逸分析与栈上分配

这是 JIT 编译器的杀手锏优化——**如果一个对象不会逃逸出当前线程/方法，就直接把它拆散分配在栈上**，省去了 GC 的压力。

### 9.1 什么是逃逸？

```java
public class EscapeAnalysisDemo {
    // ✅ 不逃逸 —— 对象的作用域完全在方法内部
    public static String concat() {
        StringBuilder sb = new StringBuilder();  // sb 不逃逸出 concat()
        sb.append("Hello");
        sb.append("World");
        return sb.toString();  // sb 本身没有返回，返回的是 String
    }

    // ❌ 方法逃逸 —— 对象被返回给调用者
    public static StringBuilder methodEscape() {
        StringBuilder sb = new StringBuilder();  // sb 逃逸出方法
        sb.append("Hello");
        return sb;  // sb 被返回 → 逃逸！
    }

    // ❌ 线程逃逸 —— 对象被赋值给静态变量（其他线程可见）
    private static StringBuilder global;

    public static void threadEscape() {
        StringBuilder sb = new StringBuilder();  // sb 逃逸到全局
        global = sb;  // 赋给静态变量 → 逃逸到其他线程！
    }
}
```

### 9.2 两个核心优化

```
逃逸分析
    │
    ├── 优化 1: 栈上分配 (Stack Allocation)
    │   对象完全没逃逸 → 对象在栈上分配 → 方法结束自动释放
    │   无需 GC 参与！零 GC 开销！
    │
    │   concat() 方法：
    │   ┌────────────────────┐
    │   │ 栈帧 concat()       │
    │   │  ┌──────────────┐  │
    │   │  │ StringBuilder │  │  ← 在栈上！方法结束立即销毁
    │   │  │ (char[16])   │  │
    │   │  └──────────────┘  │
    │   └────────────────────┘
    │
    └── 优化 2: 标量替换 (Scalar Replacement)
        将对象打散成基本类型（标量）—— 连对象本身都不创建了！

    标量替换前：
      class Point { int x; int y; }
      Point p = new Point(); p.x = 1; p.y = 2;
      int sum = p.x + p.y;

    标量替换后（JIT 等价变换）：
      int x = 1; int y = 2;   // 直接分配到局部变量表！
      int sum = x + y;        // 没有 Point 对象了！

    → 完全消除对象分配，内存访问变成寄存器/栈访问
```

```java
// 逃逸分析验证
// -XX:+PrintFlagsFinal 查看默认值
// -XX:+DoEscapeAnalysis       → 默认开启
// -XX:+EliminateAllocations   → 标量替换（默认开启）
//
// 实验：对比开启/关闭逃逸分析的 GC 次数
// 开启：java -Xmx1G -Xms1G -XX:+PrintGC EscapeTest
// 关闭：java -Xmx1G -Xms1G -XX:+PrintGC -XX:-DoEscapeAnalysis EscapeTest

public class EscapeTest {
    public static void main(String[] args) {
        long start = System.currentTimeMillis();
        for (int i = 0; i < 100_000_000; i++) {
            alloc();
        }
        long end = System.currentTimeMillis();
        System.out.println("耗时: " + (end - start) + "ms");
        // 开启逃逸分析：耗时 ~10ms，GC 0次（对象在栈上/标量替换）
        // 关闭逃逸分析：耗时 ~800ms+，GC 几十次（堆上疯狂分配）
    }

    static void alloc() {
        Point p = new Point(1, 2);  // 没有逃逸！
    }

    static class Point {
        int x, y;
        Point(int x, int y) { this.x = x; this.y = y; }
    }
}
```

> 🎯 **面试要点**：逃逸分析是一项分析技术，本身不直接优化；它服务的是**栈上分配**和**标量替换**两个具体优化。另外需要注意，**HotSpot 目前实际并没有实现真正的栈上分配**（即对象标量分解后在栈上分配各个字段），而是通过**标量替换**——将对象完全消解成标量，从而间接达到"无需在堆上分配对象"的效果。这个细节是很多面试参考资料的常见错误。

---

## 十、本地方法栈（Native Method Stack）

本地方法栈与虚拟机栈功能一致，只是服务对象不同：

| | 虚拟机栈 | 本地方法栈 |
|---|:---:|:---:|
| 服务对象 | Java 方法 | Native 方法（C/C++） |
| 入栈出栈 | 栈帧 | 本地方法帧 |
| 实现 | HotSpot 中两者合二为一 |

```java
public class NativeStackDemo {
    public static void main(String[] args) {
        // Thread.start() 会最终调用 native 的 start0() 方法
        new Thread(() -> {
            System.out.println("Hello");
            // 这个 println 底层调用 native 方法做输出
        }).start();
    }
}

// Thread 类中的 native 方法声明：
// private native void start0();
// public static native Thread currentThread();
// public static native void yield();
// 这些 native 方法的栈帧就在本地方法栈中
```

---

## 十一、总结

| 内存区域 | 线程共享 | 核心内容 | 异常 | 💡 关键点 |
|---------|:---:|------|------|------|
| **程序计数器** | ❌ | 当前字节码指令地址 | 无 | 唯一不 OOM 的区域；native 方法时值为 undefined |
| **虚拟机栈** | ❌ | 栈帧（局部变量表+操作数栈+动态链接+返回地址） | StackOverflowError / OOM | 方法调用压栈、返回弹栈；无需 GC |
| **本地方法栈** | ❌ | Native 方法调用 | StackOverflowError / OOM | HotSpot 与虚拟机栈合并实现 |
| **堆** | ✅ | 对象实例、数组 | OOM: Java heap space | GC 主战场；分代（新生代+老年代）；TLAB 加速分配 |
| **方法区** | ✅ | 类元数据、运行时常量池、静态变量、JIT 缓存 | OOM: Metaspace | JDK 8 从永久代移到元空间（直接内存） |

**对象创建全链路**：类加载检查 → **TLAB 分配**（或 CAS 竞争）→ 初始化零值 → 设置对象头（Mark Word + Klass Pointer）→ `<init>()` 方法

**对象内存布局**：`Mark Word（8B） + Klass Pointer（4/8B） + 实例数据 + 对齐填充（8倍数）`

**三层常量池**：
- `.class` 常量池 → 文件级、编译时
- 运行时常量池 → 元空间、运行时
- 字符串常量池 → 堆中（JDK 7+）、全局唯一

**逃逸分析的结论**：不逃逸的对象会被**标量替换**掉，使用栈上的局部变量等价替代堆对象，从而完全消除堆分配。这是 JIT 最强大也最"透明"的优化之一。

下一篇将深入 **垃圾回收（GC）**——从引用计数到可达性分析，从标记-清除到 G1/ZGC，从 GC Roots 到三色标记法。你将理解：GC 到底在回收什么？为什么会有 Stop-The-World？Major GC 和 Full GC 的区别在哪？

---

## 参考

- [The Java Virtual Machine Specification, Java SE 17 Edition](https://docs.oracle.com/javase/specs/jvms/se17/html/)
- [JEP 122: Remove the Permanent Generation](https://openjdk.org/jeps/122)
- [JEP 374: Deprecate and Disable Biased Locking](https://openjdk.org/jeps/374)
- [OpenJDK Wiki - Synchronization](https://wiki.openjdk.org/display/HotSpot/Synchronization)
- [Java Object Layout (JOL)](https://github.com/openjdk/jol)
- [HotSpot Glossary of Terms](https://openjdk.org/groups/hotspot/docs/HotSpotGlossary.html)
- [JavaGuide - JVM 内存结构](https://javaguide.cn/java/jvm/memory-area.html)
- [Alexey Shipilev - JVM Anatomy Quarks](https://shipilev.net/jvm/anatomy-quarks/)
