---
title: 异常处理
icon: triangle-exclamation
order: 6
category:
  - Java
  - 基础
tag:
  - 异常
  - try-catch
  - 受检异常
  - try-with-resources
---

# Java 异常处理：从 try-catch 到最佳实践

> 📖 异常处理是程序健壮性的基石。Java 有一整套独特的异常体系——受检异常（Checked Exception）是它区别于大多数语言的设计选择。这一篇将带你从异常分类到最佳实践，彻底搞懂 Java 异常处理。

---

## 一、异常体系概览

### 1.1 完整的类层次结构

```
java.lang.Throwable
├── java.lang.Error                     ← 系统错误，程序无法处理
│   ├── OutOfMemoryError               ← 堆内存不足
│   ├── StackOverflowError             ← 栈溢出（无限递归）
│   ├── NoClassDefFoundError           ← 类定义找不到
│   └── VirtualMachineError            ← JVM 自身错误
│
└── java.lang.Exception                 ← 程序可以处理的异常
    ├── RuntimeException               ← 非受检异常（不需要显式捕获）
    │   ├── NullPointerException
    │   ├── IndexOutOfBoundsException
    │   ├── IllegalArgumentException
    │   ├── ClassCastException
    │   └── ArithmeticException        ← 如除零
    │
    └── 其他 Exception                  ← 受检异常（必须处理）
        ├── IOException
        ├── SQLException
        ├── ClassNotFoundException
        ├── InterruptedException
        └── FileNotFoundException
```

> 🎯 **一句话区分**：「Error 是老天爷的问题（JVM 崩了），Exception 是程序员的问题。」

### 1.2 Error vs Exception vs RuntimeException

| 类型 | 可否处理 | 典型场景 | 处理建议 |
|------|---------|---------|---------|
| `Error` | ❌ 不应该尝试处理 | OOM、StackOverflow | 让程序终止，排查代码问题 |
| `受检异常` | ✅ **必须处理**（编译期强制） | IO 操作、数据库操作、反射 | try-catch 或向上 throws |
| `非受检异常` | ✅ 可选择处理 | NPE、数组越界、类型转换 | 预防为主，用代码逻辑避免 |

---

## 二、受检异常 vs 非受检异常

这是 Java 社区争论最多的话题之一。

### 2.1 受检异常的哲学

Java 的设计者认为：**有些异常是可以预期的、程序有义务处理的**。比如读取文件时，文件可能不存在——这是调用者必须面对的现实。

```java
// ❌ 编译错误：受检异常必须处理
public String readFile(String path) {
    return Files.readString(Path.of(path));  // 编译不通过！
}
// IOException 是受检异常，编译器强制要求处理

// ✅ 方式一：try-catch
public String readFile(String path) {
    try {
        return Files.readString(Path.of(path));
    } catch (IOException e) {
        return "文件读取失败: " + e.getMessage();
    }
}

// ✅ 方式二：throws 抛给上层
public String readFile(String path) throws IOException {
    return Files.readString(Path.of(path));
}
```

### 2.2 Kotlin 为什么取消了受检异常？

Kotlin 的设计者认为受检异常存在实际缺陷：

```java
// Java 中受检异常最被诟病的场景
@FunctionalInterface
interface Consumer<T> {
    void accept(T t);  // 没有声明 throws
}

// 如果你想在 Lambda 中抛受检异常……
list.forEach(item -> {
    // throw new IOException();  // ❌ Consumer 的 accept 没有声明 throws
});
// 导致受检异常和函数式编程/Lambda 不兼容
```

Java 社区的态度也在转变——Spring 框架把所有异常都包装成了非受检的 `RuntimeException`。

### 2.3 实践中的选择

| 场景 | 推荐 |
|------|------|
| 调用者可以有效处理的错误（文件不存在→创建文件） | 受检异常 |
| 编程错误（NPE、下标越界） | 非受检异常——让程序崩溃，修复代码 |
| 框架/中间件 | 非受检异常——避免污染调用链每一层的签名 |

---

## 三、try-catch-finally 深度解析

### 3.1 多 catch 的顺序规则

```java
try {
    // 可能抛出异常的代码
} catch (FileNotFoundException e) {     // ① 子类在前
    System.err.println("文件找不到");
} catch (IOException e) {               // ② 父类在后
    System.err.println("IO 异常");
} catch (Exception e) {                 // ③ 兜底
    System.err.println("未知异常");
}
// ⚠️ 如果把 IOException 放在 FileNotFoundException 前面 → 编译错误
//   "已捕获到异常 java.io.FileNotFoundException"
```

JDK 7 开始支持**多异常合并**：

```java
try {
    // ...
} catch (IOException | SQLException e) {  // 一个 catch 处理多种异常
    // e 隐式为 final，不能重新赋值
    logger.error("IO 或数据库异常", e);
}
```

### 3.2 finally 的执行时机

`finally` 中的代码**几乎总是执行**：

```java
try {
    System.out.println("try 块");
    return 1;
} catch (Exception e) {
    System.out.println("catch 块");
    return 2;
} finally {
    System.out.println("finally 块");  // 即使 try 中有 return，finally 也会执行
}
// 输出：
// try 块
// finally 块
// 返回值：1
```

**唯一不执行 finally 的情况**：

```java
try {
    System.out.println("try 块");
    System.exit(0);  // 直接终止 JVM，finally 不执行
} finally {
    System.out.println("这行不会输出");
}
```

### 3.3 ⭐️ finally 中 return 的陷阱

这是面试中的经典陷阱——**当 finally 块中也有 return 时，会覆盖 try/catch 中的 return**：

```java
public static int test() {
    try {
        return 1;
    } finally {
        return 2;  // ⚠️ 最终返回 2，覆盖了 try 的 return 1
    }
}
System.out.println(test());  // 输出：2

// 更隐蔽的陷阱
public static int test2() {
    int i = 0;
    try {
        i = 1;
        return i;  // 返回什么？
    } finally {
        i = 2;     // 修改了 i，但 return 已经确定了值
    }
}
System.out.println(test2());  // 输出：1（不是 2！）
// 原因：return i 时 i 的值（1）已经被存入临时变量，finally 中修改 i 不影响返回值
```

**对于引用类型，情况更复杂**：

```java
public static StringBuilder test3() {
    StringBuilder sb = new StringBuilder("Hello");
    try {
        return sb;
    } finally {
        sb.append(" World");  // 修改了对象的内容
    }
}
System.out.println(test3());  // 输出：Hello World
// return 保存的是引用（地址），finally 中通过引用修改了同一对象的内容
```

---

## 四、⭐️ try-with-resources

### 4.1 JDK 7 的革命性语法

传统写法需要在 finally 中手动关资源，代码又臭又长：

```java
// JDK 7 之前——地狱般的写法
BufferedReader reader = null;
try {
    reader = new BufferedReader(new FileReader("test.txt"));
    String line;
    while ((line = reader.readLine()) != null) {
        System.out.println(line);
    }
} catch (IOException e) {
    e.printStackTrace();
} finally {
    if (reader != null) {
        try {
            reader.close();  // close() 本身也可能抛异常！
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
```

JDK 7 引入 try-with-resources：

```java
// JDK 7+ ——优雅
try (BufferedReader reader = new BufferedReader(new FileReader("test.txt"))) {
    String line;
    while ((line = reader.readLine()) != null) {
        System.out.println(line);
    }
} catch (IOException e) {
    e.printStackTrace();
}
// reader 会被自动关闭，不需要 finally 块
```

JDK 9 进一步简化，可以引用已有的 final 变量：

```java
// JDK 9+ ——更简洁
BufferedReader reader = new BufferedReader(new FileReader("test.txt"));
try (reader) {  // 直接使用已有变量
    // ...
}
```

### 4.2 实现原理

`try-with-resources` 依赖 `AutoCloseable` 接口：

```java
public interface AutoCloseable {
    void close() throws Exception;
}

// Closeable 继承 AutoCloseable，close() 抛 IOException
public interface Closeable extends AutoCloseable {
    void close() throws IOException;
}
```

编译器会把 try-with-resources 编译成类似这样的代码：

```java
// 源码
try (BufferedReader reader = new BufferedReader(new FileReader("test.txt"))) {
    String line = reader.readLine();
}

// 编译后（大致等价）
BufferedReader reader = new BufferedReader(new FileReader("test.txt"));
Throwable primary = null;
try {
    String line = reader.readLine();
} catch (Throwable t) {
    primary = t;
    throw t;
} finally {
    if (reader != null) {
        if (primary != null) {
            try {
                reader.close();
            } catch (Throwable suppressed) {
                primary.addSuppressed(suppressed);  // 关闭异常被抑制
            }
        } else {
            reader.close();
        }
    }
}
```

> 💡 **关键设计**：如果 `try` 块和 `close()` 都抛出了异常，`close()` 的异常会被**抑制（suppressed）**，主异常是 try 块的异常。用 `ex.getSuppressed()` 可以获取被抑制的异常。

---

## 五、throw vs throws

```java
// throws —— 声明此方法可能抛出哪些异常
public String readFile(String path) throws IOException, SQLException {
    // throw —— 实际抛出一个异常对象
    if (path == null) {
        throw new IllegalArgumentException("路径不能为空");
    }
    return Files.readString(Path.of(path));
}
```

| 关键字 | 位置 | 作用 | 数量 |
|--------|------|------|------|
| `throw` | 方法体内部 | 实际抛出异常对象 | 一次抛一个 |
| `throws` | 方法签名上 | 声明可能抛出的异常类型 | 可以声明多个 |

---

## 六、自定义异常

```java
// 业务异常基类（非受检）
public class BusinessException extends RuntimeException {
    private final int code;

    public BusinessException(int code, String message) {
        super(message);
        this.code = code;
    }

    public int getCode() {
        return code;
    }
}

// 具体业务异常
public class UserNotFoundException extends BusinessException {
    public UserNotFoundException(Long userId) {
        super(404, "用户不存在: " + userId);
    }
}

// 使用
if (user == null) {
    throw new UserNotFoundException(userId);
}
```

**自定义异常的设计建议**：

```java
// ✅ 提供四个构造器（与标准库一致）
public class MyException extends Exception {
    public MyException() { super(); }
    public MyException(String message) { super(message); }
    public MyException(String message, Throwable cause) { super(message, cause); }
    public MyException(Throwable cause) { super(cause); }
}
```

---

## 七、异常处理最佳实践

### 7.1 十条铁律

```java
// ① ❌ 永远不要吞异常
try {
    doSomething();
} catch (Exception e) {
    // 空 catch 块——异常被无声吞没
}

// ✅ 至少记录日志
try {
    doSomething();
} catch (Exception e) {
    log.error("操作失败", e);
    throw new ServiceException("操作失败", e);  // 包装后重新抛出
}

// ② ❌ 不要在循环中使用 try-catch
for (int i = 0; i < 10000; i++) {
    try {
        process(i);
    } catch (Exception e) { }
}
// try-catch 在循环内会产生大量冗余的异常表条目，且异常本身开销巨大

// ✅ 异常应该是真正的"例外"，用代码逻辑避免
// if (i >= 0 && i < array.length) { process(i); }

// ③ ❌ 不要用异常做流程控制
try {
    return Integer.parseInt(str);
} catch (NumberFormatException e) {
    return -1;  // 用异常做分支判断——性能极差
}
// ✅ 用正则或其他方式先验证

// ④ ✅ 异常链——保留根因
try {
    readFile();
} catch (IOException e) {
    throw new ServiceException("文件处理失败", e);  // 保留原始异常
}
// 调用方可以通过 ex.getCause() 追溯到根因

// ⑤ ✅ finally 中不要有 return/throw
// 会吞掉 try/catch 中的异常或返回值

// ⑥ ✅ 优先使用标准异常
throw new IllegalArgumentException("年龄不能为负数");  // ✅
throw new MyCustomAgeException();  // ❌ 除非有特殊需要

// ⑦ ✅ 异常消息要包含关键上下文
throw new UserNotFoundException(userId);  // ✅
throw new RuntimeException("出错");       // ❌ 不知道哪里出错

// ⑧ ✅ 资源关闭用 try-with-resources（见第四章）

// ⑨ ✅ 日志级别匹配异常严重程度
catch (IOException e) { log.warn("文件访问异常", e); }
catch (OutOfMemoryError e) { log.error("内存溢出", e); }

// ⑩ ✅ 尽早抛出，延迟捕获
// 在底层抛出具体的异常，在顶层统一捕获处理（如 Spring 的全局异常处理器）
```

### 7.2 异常与性能

异常在 Java 中的性能代价很高——**填充堆栈跟踪（`fillInStackTrace()`）是最昂贵的操作**：

```java
// 正常流程 vs 异常流程的性能对比
long start = System.nanoTime();
for (int i = 0; i < 10000; i++) {
    try {
        throw new Exception();
    } catch (Exception e) {
        // 抛 10000 次异常 ≈ 几百毫秒
    }
}
long end = System.nanoTime();
System.out.println("用时: " + (end - start) / 1_000_000 + "ms");
// 对比正常代码：同样循环 10000 次只用不到 1ms
```

这也是为什么**不要用异常做流程控制**——不只是不优雅，是真的慢。

---

## 八、总结

| 知识点 | 核心要点 |
|--------|---------|
| 异常体系 | Throwable → Error（不可处理）+ Exception；Exception → 受检 + 非受检 |
| 受检异常 | Java 独有设计，编译器强制处理；但与 Lambda/函数式编程不兼容 |
| try-catch-finally | 多 catch 子类在前；finally 中不要 return/throw；System.exit() 阻止 finally |
| try-with-resources | JDK 7+ 自动关资源；基于 AutoCloseable；异常抑制机制 |
| throw vs throws | throw 在方法体内实际抛出；throws 在签名上声明；两者本质不同 |
| 最佳实践 | 不吞异常、保留根因、不用异常做流程控制、消息带上下文、尽早抛延迟捕 |

掌握异常处理后，你的代码健壮性将上一个大台阶。下一篇我们将进入 **泛型**——类型擦除、通配符、PECS 原则，以及那些让你在集合框架中游刃有余的核心机制。

---

## 参考

- [Java Language Specification - Chapter 11: Exceptions](https://docs.oracle.com/javase/specs/jls/se17/html/jls-11.html)
- [Effective Java (3rd Edition) - Chapter 10: Exceptions](https://www.oreilly.com/library/view/effective-java/9780134686097/)
- [JavaGuide - 异常处理](https://javaguide.cn/java/basis/java-basic-questions-01.html)
