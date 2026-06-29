---
title: Java 9~21 演进之路
icon: rocket
order: 2
category:
  - Java
  - 新特性
tag:
  - Java9
  - Java11
  - Java17
  - Java21
  - 模块化
  - var
  - record
  - 虚拟线程
  - 模式匹配
  - LTS
---

# Java 9~21 演进之路：从模块化到虚拟线程

> 📖 从 2017 年 Java 9 发布模块化系统，到 2023 年 Java 21 正式带来虚拟线程——这八年间的 13 个版本是 Java 历史上变化最密集的时期。本文按版本梳理关键特性：模块化（Java 9）、`var`（Java 10）、标准化的 HttpClient（Java 11）、Switch 表达式（Java 14）、`record` 与模式匹配（Java 14~16）、Sealed Classes（Java 17）、虚拟线程（Java 21），并在最后给出 **8→11→17→21** 的升级路径与实践建议。

---

## 一、Java 9（2017.09）—— 模块化时代

### 1.1 模块系统（Project Jigsaw）—— Java 9 的灵魂

Java 9 最核心的变化：用 `module-info.java` 显式声明模块的依赖和暴露：

```java
// module-info.java —— 每个模块的根目录下
module com.example.myapp {
    // 依赖的模块
    requires java.sql;            // 编译+运行都需要
    requires static lombok;      // 编译时需要，运行时可选
    requires transitive spring.core; // 依赖传递：依赖 myapp 的模块自动获得 spring.core

    // 暴露的包（只有 exports 的包对外可见）
    exports com.example.myapp.api;
    exports com.example.myapp.dto to com.example.client; // 只对 client 模块开放

    // 开放的包（允许反射访问）
    opens com.example.myapp.entity to com.example.orm;
}
```

```
传统 classpath  vs  模块系统

  classpath：                               module path：
  ┌─────────────────────┐                 ┌─────────────────────┐
  │ 所有 jar 平铺在一起    │                 │ 模块有明确的依赖图      │
  │ 任何 public 类都可见  │  ─── vs ───▶   │ 只有 exports 的包可见  │
  │ 运行时才报类找不到     │                 │ 启动时就检查依赖完整性    │
  │ JAR Hell（版本冲突）   │                 │ 强封装 + 可靠配置        │
  └─────────────────────┘                 └─────────────────────┘
```

### 1.2 其他关键特性

```java
// ===== 集合工厂方法：不可变集合 =====
List<String> list = List.of("a", "b", "c");           // 不可变！add/set/remove → 抛异常
Set<Integer> set = Set.of(1, 2, 3);                  // 不可变，元素不可重复
Map<String, Integer> map = Map.of("a", 1, "b", 2);   // 最多 10 个键值对
Map<String, Integer> map2 = Map.ofEntries(            // 超过 10 个用 ofEntries
    Map.entry("a", 1),
    Map.entry("b", 2)
);
// ⚠️ 这些集合不接受 null 元素！null → NullPointerException

// ===== 接口私有方法 =====
interface Calculator {
    default int add(int a, int b) {
        log("adding");              // default 方法调用 private 方法
        return a + b;
    }
    private void log(String msg) {  // 接口的 private 方法（default 和 static 共享）
        System.out.println(msg);
    }
}

// ===== Stream API 增强 =====
// takeWhile：从头开始取，直到条件不满足（遇到第一个不满足的就停）
Stream.of(1, 2, 3, 4, 5).takeWhile(n -> n < 4)  // [1, 2, 3]

// dropWhile：从头开始丢弃，直到条件不满足（与 takeWhile 互补）
Stream.of(1, 2, 3, 4, 5).dropWhile(n -> n < 4)  // [4, 5]

// ofNullable：安全的单元素流
Stream.ofNullable(null)   // Stream.empty() — 不抛 NPE
Stream.ofNullable("hi")   // Stream.of("hi")

// iterate 增强：支持终止条件
Stream.iterate(0, n -> n < 10, n -> n + 2)  // [0, 2, 4, 6, 8]

// ===== Optional 增强 =====
Optional.of("hello").ifPresentOrElse(
    System.out::println,
    () -> System.out.println("empty")       // ifPresentOrElse
);
Optional.of("hello").or(() -> Optional.of("fallback"));   // or()
Optional.of("hello").stream();                             // stream()
```

---

## 二、Java 10（2018.03）—— 局部变量类型推断

```java
// var：编译器自动推断类型（仅限局部变量！）
var list = new ArrayList<String>();     // 推断为 ArrayList<String>
var map = Map.of("a", 1);              // 推断为 Map<String, Integer>
var stream = list.stream();            // 推断为 Stream<String>

// ⚠️ var 的限制
// ❌ 不能用于：字段、方法参数、方法返回值
// class Foo { var x = 1; }            // 编译错误
// public var method() { return 1; }   // 编译错误

// ❌ 不能初始化为 null
// var x = null;                       // 编译错误！无法推断类型

// ❌ 不能用于 Lambda（Lambda 需要显式的函数式接口类型）
// var f = (String s) -> s.length();   // 编译错误

// ✅ 适用场景
var user = new User("Alice", 25);      // 冗长的构造 → 一行搞定
for (var entry : map.entrySet()) {     // 复杂的泛型
    // entry 推断为 Map.Entry<String, Integer>
}

// 其他 Java 10 增强
List.copyOf(originalList);             // 返回不可变副本
Collectors.toUnmodifiableList();       // 收集到不可变列表
Optional.empty().orElseThrow();        // JDK 10+ 无参版 orElseThrow
```

---

## 三、Java 11（2018.09，LTS）—— 企业迁移的第一个目标

### 3.1 HttpClient —— 标准化的 HTTP 客户端

JDK 9 孵化、JDK 11 正式落地的标准 HTTP 客户端，取代了老旧的 `HttpURLConnection`：

```java
HttpClient client = HttpClient.newBuilder()
    .connectTimeout(Duration.ofSeconds(10))
    .followRedirects(HttpClient.Redirect.NORMAL)
    .build();

// === GET 请求 ===
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com/users/1"))
    .header("Accept", "application/json")
    .timeout(Duration.ofSeconds(5))
    .GET()
    .build();

// 同步
HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.statusCode());  // 200
System.out.println(response.body());        // JSON 字符串

// 异步
CompletableFuture<HttpResponse<String>> future =
    client.sendAsync(request, HttpResponse.BodyHandlers.ofString());
future.thenApply(HttpResponse::body).thenAccept(System.out::println);

// === POST 请求 ===
HttpRequest postRequest = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com/users"))
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString("{\"name\":\"Alice\"}"))
    .build();
```

### 3.2 字符串新方法

```java
// isBlank：空白字符串判断（比 isEmpty 更实用）
"   ".isBlank();     // true  （只有空白字符）
"".isBlank();        // true
"  a  ".isBlank();   // false

// strip 系列：Unicode 感知（trim() 只处理 ASCII 空格）
"   hello   ".strip();          // "hello" — 去掉了 Unicode 空格
"   hello ".trim();                  // " hello " — trim 不认识  
" hello ".stripLeading();                 // "hello "
" hello ".stripTrailing();                // " hello"

// lines：按行分割 → Stream
"line1\nline2\nline3".lines().count();    // 3

// repeat：重复字符串
"abc".repeat(3);                          // "abcabcabc"
```

### 3.3 其他重要变化

```java
// Files 增强
Files.readString(Path.of("config.json"));    // 直接读成 String
Files.writeString(path, "content");           // 直接写 String

// var 用于 Lambda 参数（为注解使用）
(var s1, var s2) -> s1 + s2;                 // 等价于 (String s1, String s2) -> s1 + s2
(@Nullable var s) -> s.length();             // var 允许在参数上加注解

// 新 GC
-XX:+UseZGC          // ZGC 实验性引入（JDK 15 正式）
-XX:+UnlockExperimentalVMOptions -XX:+UseEpsilonGC  // Epsilon（空操作 GC，用于性能测试）

// 删除项：Java EE 模块、CORBA 模块
// Jakarta EE 接管了 javax.* 的命名空间
// 如果你从 JDK 8 升级 → 注意 javax.xml.bind 等需要额外加 JAXB 依赖
```

---

## 四、Java 12~13（2019）—— Switch 表达式与文本块

### 4.1 Switch 表达式（JDK 12 预览 → JDK 14 正式）

```java
// ❌ 旧式 switch（语句）：case 穿透、冗长
String result;
switch (day) {
    case MONDAY:
    case FRIDAY:
        result = "work";
        break;             // ⚠️ 忘了 break → 掉到下一个 case
    case SATURDAY:
    case SUNDAY:
        result = "rest";
        break;
    default:
        result = "unknown";
}

// ✅ 新式 switch（表达式）：箭头语法、无穿透
String result = switch (day) {
    case MONDAY, FRIDAY -> "work";         // 箭头 → 单行
    case SATURDAY, SUNDAY -> "rest";
    default -> "unknown";
};

// 多行逻辑用 {} + yield
String schedule = switch (day) {
    case MONDAY -> {
        System.out.println("Monday blues...");
        yield "work work work";             // yield 返回结果（不是 break！）
    }
    case SATURDAY -> "party!";
    default -> "unknown";
};
```

### 4.2 文本块（JDK 13 预览 → JDK 15 正式）

```java
// ❌ 旧式：拼接多行字符串 → 满屏转义、可读性差
String json = "{\n" +
              "  \"name\": \"Alice\",\n" +
              "  \"age\": 25\n" +
              "}";

// ✅ 文本块：三个双引号括起来，所见即所得
String json = """
    {
      "name": "Alice",
      "age": 25
    }
    """;

// 缩进对齐：编译器会自动去除"公共前导空白"
String html = """
    <html>
        <body>
            <p>Hello World</p>
        </body>
    </html>
    """;
// 公共前导空白是 4 个空格 → 全部去除 4 格 → body 缩进 4 格，p 缩进 8 格

// 防止换行：行尾加 \
String query = """
    SELECT id, name, age \
    FROM users \
    WHERE age > 18 \
    ORDER BY id
    """;
// 结果：单行 SQL
```

### 4.3 Java 12~13 其他增强

```java
// Collectors.teeing：两个 collector 的结果合并（JDK 12）
record AvgCount(double avg, long count) {}
AvgCount result = Stream.of(1, 2, 3, 4, 5)
    .collect(Collectors.teeing(
        Collectors.averagingInt(i -> i),   // 第一个 collector：平均
        Collectors.counting(),              // 第二个 collector：计数
        AvgCount::new                       // 合并
    ));

// String.indent()（JDK 12）
"hello".indent(2);   // "  hello\n"
"  hello".indent(-1);// " hello\n"

// String.transform(Function)（JDK 12）
"hello".transform(String::toUpperCase).transform(s -> s + " WORLD");  // "HELLO WORLD"
```

---

## 五、Java 14~16（2020~2021）—— record 与模式匹配

### 5.1 record —— 不可变数据载体（JDK 14 预览 → JDK 16 正式）

```java
// ❌ 旧式：POJO 数据类 → 几十行样板代码
class Point {
    private final int x;
    private final int y;

    public Point(int x, int y) { this.x = x; this.y = y; }
    public int x() { return x; }
    public int y() { return y; }
    public boolean equals(Object o) { /* ... */ }
    public int hashCode() { /* ... */ }
    public String toString() { return "Point[x=" + x + ", y=" + y + "]"; }
}

// ✅ record：一行搞定！编译器自动生成构造器、访问器、equals、hashCode、toString
record Point(int x, int y) {}

// 使用
Point p = new Point(3, 4);
System.out.println(p.x());       // 3（访问器是 x() 而不是 getX()）
System.out.println(p);           // Point[x=3, y=4]
Point p2 = new Point(3, 4);
System.out.println(p.equals(p2)); // true

// record 可以自定义构造器（紧凑构造器或规范构造器）
record Person(String name, int age) {
    // 紧凑构造器：不需要写参数列表和赋值，编译器自动补全
    public Person {
        if (age < 0) throw new IllegalArgumentException("age must be >= 0");
        if (name == null || name.isBlank()) throw new IllegalArgumentException("name required");
    }
}

// record 可以实现接口、有静态方法、有实例方法
record Rectangle(double width, double height) implements Comparable<Rectangle> {
    public double area() { return width * height; }

    @Override
    public int compareTo(Rectangle other) {
        return Double.compare(this.area(), other.area());
    }
}
```

### 5.2 模式匹配 instanceof（JDK 14 预览 → JDK 16 正式）

```java
// ❌ 旧式：instanceof + 强制转型 → 冗余
if (obj instanceof String) {
    String s = (String) obj;    // 类型已经在上面检查过了，还要手动转型
    System.out.println(s.length());
}

// ✅ 模式匹配 instanceof：一步完成检查+绑定
if (obj instanceof String s) {          // 匹配成功 → s 被赋值为 (String) obj
    System.out.println(s.length());     // s 在作用域内
}

// 组合条件
if (obj instanceof String s && s.length() > 5) {
    System.out.println("Long string: " + s);
}

// 也可以用在取反（但变量只在 true 分支可用）
if (!(obj instanceof String s)) {
    return;  // 不是 String，提前退出
}
// s 在这里可用（取反 + return 的特殊模式）
System.out.println(s.length());
```

### 5.3 其他版本特性

```java
// Java 14：NPE 增强信息（-XX:+ShowCodeDetailsInExceptionMessages）
String name = user.getAddress().getCity().toUpperCase();
// ❌ 旧 NPE：NullPointerException——不知道哪个方法返回了 null
// ✅ 新 NPE：NullPointerException: Cannot invoke "City.toUpperCase()"
//               because the return value of "Address.getCity()" is null

// Java 15：Sealed Classes 首次预览（JDK 17 正式，见下节）

// Java 16：
// - record 正式
// - instanceof 模式匹配正式
// - jpackage 打包工具正式（生成平台原生安装包）
// - 默认强封装 JDK 内部 API（--illegal-access=deny）
```

---

## 六、Java 17（2021.09，LTS）—— 企业迁移新基线

### 6.1 Sealed Classes（密封类）—— 限制继承

`sealed` 让你显式声明"哪些类可以继承我"：

```java
// 定义一个封闭的类型体系 → 编译器知道所有子类 → 模式匹配可以穷举
sealed class Shape
    permits Circle, Rectangle, Triangle { }

final class Circle extends Shape {
    double radius;
}

non-sealed class Rectangle extends Shape {  // non-sealed → 开放给任意子类
    double width, height;
}

final class Triangle extends Shape {
    double base, height;
}

// 模式匹配可以穷举所有子类（不需要 default）
double area(Shape shape) {
    return switch (shape) {
        case Circle c    -> Math.PI * c.radius * c.radius;
        case Rectangle r -> r.width * r.height;
        case Triangle t  -> t.base * t.height / 2;
        // 不需要 default！编译器知道就这三种子类
    };
}
```

```
sealed 的三种 permits 修饰符：
  final       → 不能再被继承
  sealed      → 继续限制继承
  non-sealed  → 开放给任意子类（打破密封）
```

### 6.2 其他增强

```java
// 增强伪随机数生成器（JEP 356）
RandomGenerator g = RandomGenerator.of("L64X128MixRandom");
int num = g.nextInt(100);

// macOS/AArch64 支持（Apple M1/M2 芯片）
// ZGC 正式（不再实验性）
// 废弃 Applet API 和 SecurityManager
```

---

## 七、Java 18~21（2022~2023）—— 虚拟线程时代

### 7.1 虚拟线程（Virtual Threads）—— Java 21 正式 / JDK 19 预览

虚拟线程是 Java 并发模型的革命——与 OS 线程 1:1 的传统线程不同，一个 OS 线程上可以调度成千上万个虚拟线程：

```
传统线程模型：                     虚拟线程模型：
  Thread-1  → OS Thread-1             VThread-1 ─┐
  Thread-2  → OS Thread-2             VThread-2 ─┤
  Thread-3  → OS Thread-3             VThread-3 ─┤→ Carrier Thread-1
  (OS 线程是有限的～几千个)            VThread-4 ─┘  (M:N 映射)
                                         ...
                                       VThread-1000→ Carrier Thread-N
                                       虚拟线程是廉价的对象
```

```java
// ===== 创建虚拟线程 =====

// 方式1：Thread.startVirtualThread
Thread vThread = Thread.startVirtualThread(() -> {
    System.out.println("Running in virtual thread: " + Thread.currentThread());
});

// 方式2：Thread.Builder
Thread vThread2 = Thread.ofVirtual()
    .name("my-virtual-thread")
    .start(() -> System.out.println("Hello from virtual thread"));

// 方式3：通过 ExecutorService（最推荐）
try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
    // 提交 10000 个任务 → 每个任务一个虚拟线程 → 内部只用了少量 OS 线程
    for (int i = 0; i < 10_000; i++) {
        int taskId = i;
        executor.submit(() -> {
            Thread.sleep(Duration.ofSeconds(1));  // 虚拟线程阻塞时自动让出 OS 线程
            System.out.println("Task " + taskId + " done");
            return taskId;
        });
    }
}  // try-with-resources 自动等待所有任务完成并关闭
```

```java
// ===== 虚拟线程的三个关键原则 =====

// ① 不要池化虚拟线程！它们轻量到可以即用即建
// ❌ Executors.newThreadPool(100) ← 传统做法
// ✅ Executors.newVirtualThreadPerTaskExecutor() ← 虚拟线程做法

// ② 阻塞操作不再是性能瓶颈
// 虚拟线程在 I/O、sleep、等待锁时 → 自动让出底层 OS 线程 → 不浪费 OS 线程资源
// 阻塞不是问题，高并发才是 → 百万并发成为可能

// ③ 适合场景：大量 I/O 密集型任务
// 适用：Web 请求处理、数据库查询、远程 API 调用
// 不适用：纯 CPU 计算（没有 I/O 等待 → 虚拟线程没有优势）
```

### 7.2 模式匹配 for Switch（JDK 17 预览 → JDK 21 正式）

```java
// Switch 模式匹配：穷举 + 解构 + 条件一步完成
Object obj = // ...

String result = switch (obj) {
    case null -> "It's null";                                // null 处理
    case Integer i when i > 0 -> "Positive: " + i;          // 类型+条件
    case Integer i -> "Non-positive: " + i;
    case String s when s.length() > 10 -> "Long string";
    case String s -> "Short string: " + s;
    default -> "Unknown type";
};
```

### 7.3 Record Pattern（JDK 19 预览 → JDK 21 正式）

```java
// 嵌套解构：一次性提取 record 内部字段
record Point(int x, int y) {}
record Line(Point start, Point end) {}

void process(Object obj) {
    // 嵌套模式匹配 + 解构
    if (obj instanceof Line(Point(int x1, int y1), Point(int x2, int y2))) {
        // 一行代码提取了 Line 的所有字段和嵌套 Point 的所有坐标！
        int length = Math.abs(x2 - x1);
        System.out.println("Line from (" + x1 + "," + y1 + ") to (" + x2 + "," + y2 + ")");
    }

    // switch 中也可以：
    switch (obj) {
        case Line(Point(var x1, var y1), Point(var x2, var y2))
            -> System.out.printf("(%d,%d) → (%d,%d)%n", x1, y1, x2, y2);
        default -> System.out.println("Unknown");
    }
}
```

### 7.4 其他 Java 21 特性

```java
// ===== Sequenced Collections（有序集合统一接口）=====
// 解决了"List/Deque/SortedSet 都有 getFirst/getLast 但接口不统一"的历史遗留问题
SequencedCollection<String> seq = new ArrayList<>(List.of("a", "b", "c"));
seq.getFirst();     // "a" — 原来是 list.get(0)
seq.getLast();      // "c" — 原来是 list.get(list.size()-1)
seq.addFirst("z");  // 添加到开头
seq.addLast("d");   // 添加到末尾
seq.removeFirst();  // 移除第一个
seq.removeLast();   // 移除最后一个
seq.reversed();     // 倒序视图

// ===== Scoped Values（作用域值，JDK 20 孵化 → JDK 21 正式）=====
// ThreadLocal 的轻量级替代——不可变、有明确的作用域、更好的性能
class Framework {
    static final ScopedValue<User> LOGGED_IN_USER = ScopedValue.newInstance();

    void handle(User user) {
        ScopedValue.where(LOGGED_IN_USER, user)
            .run(() -> service.process());  // 在这个作用域内，任意深处都能读到 LOGGED_IN_USER
    }
}

// ===== String Templates（字符串模板，JDK 21 预览）=====
String name = "Alice";
int age = 25;
String msg = STR."Hello \{name}, you are \{age} years old";
// 等价于 "Hello Alice, you are 25 years old"

// ===== Structured Concurrency（结构化并发，JDK 21 预览）=====
// 将多个并发任务组织为一个工作单元，整体管理生命周期
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    Future<String> user = scope.fork(() -> fetchUser());
    Future<Integer> order = scope.fork(() -> fetchOrder());
    scope.join();           // 等待两者都完成
    scope.throwIfFailed();  // 任一失败→抛异常
    return new Result(user.resultNow(), order.resultNow());
}
```

---

## 八、升级路径：8 → 11 → 17 → 21

```
推荐升级路线（版本已 EOL 标注）：

  Java 8  ────▶  Java 11  ────▶  Java 17  ────▶  Java 21
  (2014.03)    (2018.09 LTS)   (2021.09 LTS)   (2023.09 LTS)
  已停止免费更新  已EOL*           主力LTS            最新LTS

  *JDK 11 的 Oracle 免费支持已于 2023/10 结束，但其他发行版（Azul/Eclipse）仍在支持
```

### 8.1 8 → 11 的兼容性注意事项

| 风险点 | 说明 | 解决方案 |
|--------|------|---------|
| **Java EE 模块被移除** | `javax.xml.bind`、`javax.activation` 等不再随 JDK 分发 | 添加 JAXB、JAX-WS、Activation 等独立依赖 |
| **CORBA 移除** | `org.omg.CORBA` 等移除 | 找替代方案或从 JDK 8 拷 jar（不推荐） |
| **Nashorn 废弃** | JS 引擎标记废弃（JDK 15 移除） | 用 GraalVM JS 替代 |
| **内部 API 被强封装** | `Unsafe` 等 `sun.misc` API 不可访问 | JDK 9~15 可用 `--add-opens` 临时打开 |
| **GC 默认值变化** | JDK 8 Parallel → JDK 9+ G1 | 性能特征变化，需重新验证 |
| **classloader 变化** | Extension→Platform，`URLClassLoader` 不再支持某些操作 | 检查自定义类加载器 |

### 8.2 11 → 17 的兼容性注意事项

| 风险点 | 说明 | 解决方案 |
|--------|------|---------|
| **强封装 JDK 内部** | `--illegal-access=deny` 成为默认 | 排查所有 `--add-opens/--add-exports` |
| **CMS 移除** | 如果是 CMS 用户必须切换 GC | 迁移到 G1/ZGC |
| **Nashorn 移除** | 彻底删除 JS 引擎 | 用 GraalVM JS |
| **SecurityManager 废弃** | 未来版本将移除 | 不在新代码中使用 |
| **Applet 废弃** | 彻底告别 Applet | 无需处理（早已不用） |

### 8.3 17 → 21

这是平滑升级——17 到 21 的兼容性很好：

```bash
# 主要变化：
# ✅ 虚拟线程 → 新功能，不影响旧代码
# ✅ 模式匹配 → 新语法，不影响旧代码
# ✅ Sequenced Collections → 新接口，旧类不影响
# ⚠️ 30-bit x86 废弃 → 还在用 32 位系统？不太可能
# ⚠️ 动态加载 agent 未来将受限 → 排查 APM/监控工具的接入方式

# 升级命令（只需要改 JDK，代码不改也能跑）：
java -version  # 确认 JDK 21
```

---

## 九、总结

```
Java 版本演进时间线（LTS 标注）：

  2014    2017    2018    2018     2020    2021    2021     2023
   │       │       │       │        │       │       │        │
  Java8   Java9  Java10  Java11   Java14  Java16  Java17   Java21
  [LTS]   模块化   var    [LTS]    record  正式    [LTS]    [LTS]
                               +++兼容                              虚拟线程
                                                                    模式匹配
                                                                    正式
```

| 版本 | 关键特性 | 状态 |
|------|------|:---:|
| **Java 8** | Lambda、Stream、Optional、CompletableFuture、java.time | LTS（遗留） |
| **Java 9** | 模块系统、集合工厂方法、接口私有方法 | 已 EOL |
| **Java 10** | `var` 局部变量类型推断 | 已 EOL |
| **Java 11** | HttpClient 标准化、字符串增强、ZGC(实验) | LTS（逐渐退役） |
| **Java 12~13** | Switch 表达式预览、文本块预览 | 已 EOL |
| **Java 14** | Switch 表达式正式、record 预览、NPE 增强 | 已 EOL |
| **Java 15** | 文本块正式、Sealed Classes 预览、ZGC 正式 | 已 EOL |
| **Java 16** | record 正式、instanceof 模式匹配正式、jpackage | 已 EOL |
| **Java 17** | Sealed Classes 正式、增强 PRNG、macOS/AArch64 | **LTS（推荐基线）** |
| **Java 21** | 虚拟线程、Record Pattern、Switch 模式匹配、Scoped Values、Sequenced Collections、String Templates(预览) | **LTS（最新）** |

**关键迁移建议**：
1. **现在还在 Java 8**：尽快迁移到 Java 17（最低）或 Java 21（推荐），Java 8 早已停止免费安全更新
2. **现在在 Java 11**：可以直接跳到 Java 21，中间没有破坏性变化
3. **现在在 Java 17**：平滑升级到 Java 21，虚拟线程是最值得拥抱的理由
4. **虚拟线程是下个十年的并发模型**——对 I/O 密集型应用可以说是免费的午餐

下一篇将进入 **开发工具** 模块，首先是 **Maven / Gradle 构建工具**。

---

## 参考

- [OpenJDK — JEP Index](https://openjdk.org/jeps)
- [Oracle — JDK Release Notes](https://www.oracle.com/java/technologies/javase/jdk-relnotes-index.html)
- [JEP 444: Virtual Threads (JDK 21)](https://openjdk.org/jeps/444)
- [JEP 441: Pattern Matching for switch (JDK 21)](https://openjdk.org/jeps/441)
- [JEP 440: Record Patterns (JDK 21)](https://openjdk.org/jeps/440)
- [JEP 409: Sealed Classes (JDK 17)](https://openjdk.org/jeps/409)
- [JEP 395: Records (JDK 16)](https://openjdk.org/jeps/395)
- [JEP 394: Pattern Matching for instanceof (JDK 16)](https://openjdk.org/jeps/394)
- [JEP 200: The Modular JDK (JDK 9)](https://openjdk.org/jeps/200)
- [Oracle — Java 8 to 11 Migration Guide](https://docs.oracle.com/en/java/javase/11/migrate/)
