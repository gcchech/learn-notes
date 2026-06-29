---
title: Java 8 核心特性
icon: star
order: 1
category:
  - Java
  - 新特性
tag:
  - Java8
  - Lambda
  - Stream
  - Optional
  - CompletableFuture
  - 函数式接口
  - 日期时间API
---

# Java 8 核心特性：Lambda、Stream 与函数式编程

> 📖 Java 8 是 Java 历史上最具里程碑意义的版本——2014 年 3 月发布至今，它引入的函数式编程范式彻底改变了 Java 的编码风格。从 Lambda 表达式和方法引用，到 Stream API 的声明式数据处理，从 Optional 消灭空指针，到 CompletableFuture 的异步编排，再到全新的 `java.time` 日期时间 API——本文覆盖 Java 8 的核心新特性，既是面试高频考点，也是日常开发的必备技能。

---

## 一、Lambda 表达式

### 1.1 从匿名内部类到 Lambda

```java
// ❌ 旧写法：匿名内部类 —— 6 行代码，只有 1 行有用
new Thread(new Runnable() {
    @Override
    public void run() {
        System.out.println("Hello");
    }
}).start();

// ✅ Lambda 写法：一行搞定
new Thread(() -> System.out.println("Hello")).start();
```

**Lambda 语法**：

```java
// 完整形式：(参数列表) -> { 方法体 }
(int a, int b) -> { return a + b; }

// 类型推断（省略参数类型）
(a, b) -> { return a + b; }

// 单条语句（省略 {} 和 return）
(a, b) -> a + b;

// 单个参数（省略 ()）
x -> x * 2;

// 无参数
() -> System.out.println("Hello");
```

### 1.2 函数式接口（@FunctionalInterface）

Lambda 的本质是**函数式接口的实例**——即只有一个抽象方法的接口：

```java
@FunctionalInterface  // 注解：编译期检查（可选但推荐）
interface MyFunction {
    int apply(int x);  // 只有一个抽象方法！default 和 static 不算

    // 可以有多个 default 方法
    default String describe() { return "MyFunction"; }
}

// 三种等价写法：
MyFunction f1 = (int x) -> x * 2;           // Lambda
MyFunction f2 = x -> x * 2;                  // 简化 Lambda
MyFunction f3 = new MyFunction() {            // 匿名内部类（旧）
    @Override
    public int apply(int x) { return x * 2; }
};
```

### 1.3 方法引用 —— Lambda 的简写

方法引用是 Lambda 的一种更紧凑的写法——当 Lambda 体只是调用一个已有方法时使用：

```java
// 四种方法引用

// 1. 静态方法引用：ClassName::staticMethod
Function<String, Integer> f1 = Integer::parseInt;  // 等价于 s -> Integer.parseInt(s)

// 2. 实例方法引用（特定对象）：instance::method
String prefix = "Hello ";
Function<String, String> f2 = prefix::concat;      // 等价于 s -> prefix.concat(s)

// 3. 实例方法引用（任意对象）：ClassName::instanceMethod
Function<String, Integer> f3 = String::length;     // 等价于 s -> s.length()

// 4. 构造器引用：ClassName::new
Supplier<ArrayList<String>> f4 = ArrayList::new;   // 等价于 () -> new ArrayList<>()
Function<Integer, int[]> f5 = int[]::new;          // 等价于 n -> new int[n]
```

```java
// 实际使用对比
List<String> names = Arrays.asList("Alice", "Bob", "Charlie");

// Lambda 写法
names.forEach(name -> System.out.println(name));

// 方法引用（更简洁）
names.forEach(System.out::println);
```

---

## 二、核心函数式接口

`java.util.function` 包提供了丰富的函数式接口，覆盖绝大多数场景：

| 接口 | 方法签名 | 说明 | 示例 |
|------|------|------|------|
| **Function<T,R>** | `R apply(T t)` | 输入 T，输出 R（转换） | `String::length` |
| **Consumer`<T>`** | `void accept(T t)` | 消费 T，无返回 | `System.out::println` |
| **Supplier`<T>`** | `T get()` | 无输入，提供 T | `() -> new User()` |
| **Predicate`<T>`** | `boolean test(T t)` | 断言/过滤 | `s -> s.isEmpty()` |
| **BiFunction<T,U,R>** | `R apply(T t, U u)` | 两个输入，一个输出 | `(a,b) -> a + b` |
| **UnaryOperator`<T>`** | `T apply(T t)` | Function 的特例（输入=输出） | `String::toUpperCase` |
| **BinaryOperator`<T>`** | `T apply(T t1, T t2)` | BiFunction 的特例 | `Integer::sum` |

```java
// 函数式接口的组合能力
Function<Integer, Integer> times2 = x -> x * 2;
Function<Integer, Integer> plus3 = x -> x + 3;

// compose：先执行参数，再执行自己
Function<Integer, Integer> times2ThenPlus3 = plus3.compose(times2);
System.out.println(times2ThenPlus3.apply(5));  // (5*2) + 3 = 13

// andThen：先执行自己，再执行参数
Function<Integer, Integer> plus3ThenTimes2 = times2.andThen(plus3);
System.out.println(plus3ThenTimes2.apply(5));  // (5+3) * 2 = 16

// Predicate 的组合
Predicate<String> notEmpty = s -> !s.isEmpty();
Predicate<String> shorterThan5 = s -> s.length() < 5;
Predicate<String> valid = notEmpty.and(shorterThan5);  // 与
valid = notEmpty.or(shorterThan5);                       // 或
valid = notEmpty.negate();                                // 非
```

---

## 三、Stream API —— 声明式数据处理

Stream 不是数据结构，它只是**对数据源的视图**——不存储数据、不改变数据源、延迟执行。

### 3.1 创建 Stream

```java
// 1. 从集合创建
List<String> list = Arrays.asList("a", "b", "c");
Stream<String> s1 = list.stream();          // 串行流
Stream<String> s2 = list.parallelStream();   // 并行流

// 2. 从数组创建
Stream<String> s3 = Arrays.stream(new String[]{"a", "b"});
Stream<Integer> s4 = Stream.of(1, 2, 3);

// 3. 无限流（惰性求值，需要 limit）
Stream<Integer> s5 = Stream.iterate(0, n -> n + 2);  // 0, 2, 4, 6, ...
Stream<Double> s6 = Stream.generate(Math::random);    // 随机数流

// 4. 其他
IntStream intStream = IntStream.range(1, 10);          // 1..9（不含10）
IntStream intStream2 = IntStream.rangeClosed(1, 10);   // 1..10（含10）
```

### 3.2 中间操作（Intermediate Operations）—— 惰性求值

中间操作返回新的 Stream，**只在终端操作调用时才真正执行**：

```java
List<String> names = Arrays.asList("Alice", "Bob", "Charlie", "David", "Eve");

// filter：过滤
names.stream()
    .filter(s -> s.startsWith("A"))  // 只保留 "Alice"

// map：转换（一对一）
    .map(String::toUpperCase)        // "ALICE"

// flatMap：展平（一对多）
    .flatMap(s -> Arrays.stream(s.split("")))  // "A","L","I","C","E"

// distinct：去重（依赖 equals/hashCode）
    .distinct()

// sorted：排序
    .sorted()                         // 自然顺序
    .sorted(Comparator.reverseOrder()) // 自定义比较器

// peek：调试（不改变流内容）
    .peek(System.out::println)

// limit / skip：截取/跳过
    .limit(3)                         // 只取前 3 个
    .skip(1)                          // 跳过第 1 个
```

```java
// ⚠️ 关键理解：惰性求值 —— 中间操作不会立即执行！
Stream<String> stream = names.stream()
    .filter(s -> {
        System.out.println("filter: " + s);
        return s.length() > 3;
    });
// 此时没有任何输出！因为还没有终端操作！

// 加上终端操作才会触发：
System.out.println(stream.count());
// 输出顺序：filter: Alice → filter: Bob → ... → filter: Eve → 4
```

### 3.3 终端操作（Terminal Operations）—— 触发执行

```java
List<String> names = Arrays.asList("Alice", "Bob", "Charlie");

// ===== collect：收集到集合 =====
List<String> upperNames = names.stream()
    .map(String::toUpperCase)
    .collect(Collectors.toList());     // toList / toSet / toMap

// ===== reduce：规约（聚合）=====
int sum = Stream.of(1, 2, 3, 4, 5)
    .reduce(0, Integer::sum);          // 0 + 1 + 2 + 3 + 4 + 5 = 15

// ===== forEach：遍历（不保证顺序）=====
names.stream().forEach(System.out::println);

// ===== 匹配操作（短路）=====
boolean anyStartsWithA = names.stream().anyMatch(s -> s.startsWith("A"));  // true
boolean allLongerThan2 = names.stream().allMatch(s -> s.length() > 2);    // true
boolean noneEmpty      = names.stream().noneMatch(String::isEmpty);      // true

// ===== 查找（短路）=====
Optional<String> first = names.stream().findFirst();   // 第一个元素
Optional<String> any   = names.stream().findAny();      // 任意元素（并行流更高效）

// ===== 统计 =====
long count = names.stream().count();                    // 元素个数
Optional<String> max = names.stream().max(Comparator.naturalOrder());
```

### 3.4 Collectors 工具类

```java
List<Person> people = Arrays.asList(
    new Person("Alice", 25, "Beijing"),
    new Person("Bob", 30, "Shanghai"),
    new Person("Charlie", 25, "Beijing"),
    new Person("David", 35, "Shanghai")
);

// toList / toSet / toMap
List<String> names = people.stream()
    .map(Person::getName)
    .collect(Collectors.toList());

Map<String, Integer> nameAgeMap = people.stream()
    .collect(Collectors.toMap(Person::getName, Person::getAge));

// groupingBy：分组（最重要的 collector）
Map<String, List<Person>> byCity = people.stream()
    .collect(Collectors.groupingBy(Person::getCity));
// {Beijing=[Alice, Charlie], Shanghai=[Bob, David]}

// 多级分组
Map<String, Map<Integer, List<Person>>> byCityAndAge = people.stream()
    .collect(Collectors.groupingBy(Person::getCity,
             Collectors.groupingBy(Person::getAge)));

// partitioningBy：按布尔值分两组
Map<Boolean, List<Person>> over30 = people.stream()
    .collect(Collectors.partitioningBy(p -> p.getAge() > 30));

// 统计
Double avgAge = people.stream()
    .collect(Collectors.averagingInt(Person::getAge));
IntSummaryStatistics stats = people.stream()
    .collect(Collectors.summarizingInt(Person::getAge));
// IntSummaryStatistics{count=4, sum=115, min=25, average=28.75, max=35}

// joining：字符串拼接
String allNames = people.stream()
    .map(Person::getName)
    .collect(Collectors.joining(", ", "[", "]"));
// [Alice, Bob, Charlie, David]
```

### 3.5 基本类型流 —— 避免装箱开销

```java
// IntStream / LongStream / DoubleStream 避免了 Integer/Long/Double 的装箱
IntStream intStream = IntStream.range(1, 100);

// mapToInt → 获得 IntStream
int sum = people.stream()
    .mapToInt(Person::getAge)    // Stream<Person> → IntStream
    .sum();                       // IntStream 的专用方法

// boxed() → 回到包装类型流
Stream<Integer> boxed = intStream.boxed();
```

### 3.6 Stream 使用注意事项

```java
// ❌ 错误 1：重复消费 —— Stream 只能用一次！
Stream<String> stream = names.stream();
stream.forEach(System.out::println);
stream.forEach(System.out::println);  // IllegalStateException: stream already operated upon

// ❌ 错误 2：在 lambda 中修改外部变量
int total = 0;
// names.stream().forEach(s -> total++); // 编译错误！外部变量必须是 final/effectively-final
// 改用：
int total2 = names.stream().mapToInt(String::length).sum();

// ✅ 正确做法：用 collect 或 reduce 做累加
int[] counter = {0};  // 技巧：数组引用本身是 final
names.stream().forEach(s -> counter[0]++);  // 可以改数组内容（但不推荐）
```

---

## 四、Optional —— 优雅处理 null

Optional 是一个容器对象——它要么包含一个非 null 值，要么为空。用 Optional 替代 null 返回值，迫使调用者显式处理"不存在"的情况。

```java
// ===== 创建 Optional =====
Optional<String> opt1 = Optional.of("hello");       // 值必须非 null → 否则 NPE
Optional<String> opt2 = Optional.ofNullable(null);  // 值可为 null     → 返回 Optional.empty()
Optional<String> opt3 = Optional.empty();           // 显式空

// ===== 判断是否包含值 =====
opt1.isPresent();   // true
opt1.isEmpty();     // false（JDK 11+）

// ===== 安全获取值 =====
String val1 = opt1.get();              // ⚠️ 如果值不存在 → NoSuchElementException！少用！
String val2 = opt1.orElse("default");  // 值不存在时返回默认值
String val3 = opt1.orElseGet(() ->     // 值不存在时从 Supplier 获取（惰性）
    computeDefault());

// ⚠️ orElse vs orElseGet 的关键区别
String s1 = Optional.of("hello").orElse(expensiveOp());  // expensiveOp() 一定会执行！
String s2 = Optional.of("hello").orElseGet(() -> expensiveOp());  // expensiveOp() 不会执行！

// ===== 抛出异常 =====
String val4 = opt1.orElseThrow();                     // JDK 10+ → NoSuchElementException
String val5 = opt1.orElseThrow(IllegalStateException::new);  // 自定义异常

// ===== 转换 =====
Optional<Integer> len = opt1.map(String::length);           // map 内部自动包装 Optional
Optional<Integer> len2 = opt1.flatMap(s -> Optional.of(s.length()));  // flatMap 手动返回 Optional

// ===== 过滤 =====
Optional<String> filtered = opt1.filter(s -> s.length() > 3);  // 不满足 → empty()

// ===== 消费 =====
opt1.ifPresent(System.out::println);         // 有值时执行
opt1.ifPresentOrElse(                         // JDK 9+
    System.out::println,                      // 有值时执行
    () -> System.out.println("empty"));       // 空时执行
```

```java
// ✅ Optional 的正确使用模式
public class UserService {
    // ❌ 不要用 Optional 做字段！！！
    // private Optional<String> name;  // Optional 不是 Serializable！

    // ✅ 返回值用 Optional 包装"可能为 null"的情况
    public Optional<User> findUserById(Long id) {
        // 方法签名明确告诉调用者：结果可能为空
        User user = userRepository.findById(id);
        return Optional.ofNullable(user);
    }
}

// 调用链的链式处理
String city = userService.findUserById(1L)
    .map(User::getAddress)           // Optional<Address>
    .map(Address::getCity)           // Optional<String>
    .orElse("Unknown");
```

---

## 五、接口的默认方法与静态方法

### 5.1 默认方法 —— 接口演化

JDK 8 起，接口可以有**带方法体的 default 方法**——这解决了"接口增加方法→所有实现类必须改"的痛点：

```java
interface Vehicle {
    void start();

    // 默认方法：给所有实现类提供一个通用实现
    default void honk() {
        System.out.println("Beep!");
    }

    // 静态方法：可以通过接口名直接调用
    static Vehicle create(String type) {
        return switch (type) {
            case "car" -> new Car();
            case "bike" -> new Bike();
            default -> throw new IllegalArgumentException(type);
        };
    }
}

class Car implements Vehicle {
    @Override
    public void start() { System.out.println("Car starting"); }
    // honk() 继承了默认实现，不需要强制重写
}
```

### 5.2 多继承冲突解决

```java
interface A {
    default void hello() { System.out.println("A"); }
}

interface B {
    default void hello() { System.out.println("B"); }
}

// ❌ 编译错误：两个接口有同名 default 方法，必须手动解决冲突
class C implements A, B {
    // 必须重写，明确选择
    @Override
    public void hello() {
        A.super.hello();  // 调用 A 的实现
        // 或 B.super.hello();  // 调用 B 的实现
        // 或全新实现
    }
}
```

> ⭐️ **优先级规则**：类优先 → 子接口优先 → 冲突则必须手动指定。`class` 中的方法优先级最高的。

---

## 六、新的日期时间 API（java.time）

Java 8 引入 `java.time` 包，彻底解决了老 API（`java.util.Date`、`java.util.Calendar`）的三个核心问题：**不可变性**（线程安全）、**API 清晰度**（Date 的月份从 0 开始？）、**时区处理**。

### 6.1 核心类一览

```
┌────────────────────────────────────────────────────────────┐
│                    java.time 核心类                          │
├────────────────────────────────────────────────────────────┤
│ LocalDate        → 日期（年月日）         2024-01-15         │
│ LocalTime        → 时间（时分秒纳秒）     14:30:00.123       │
│ LocalDateTime    → 日期+时间             2024-01-15T14:30:00 │
│ ZonedDateTime    → 带时区的日期时间                         │
│ Instant          → 时间戳（1970-01-01 以来的毫秒/纳秒）       │
│ Duration         → 时间间隔（秒/纳秒精度）                    │
│ Period           → 日期间隔（年月日精度）                     │
│ DateTimeFormatter→ 格式化/解析                              │
└────────────────────────────────────────────────────────────┘
```

```java
// ===== 创建 =====
LocalDate date = LocalDate.now();              // 2024-01-15
LocalDate date2 = LocalDate.of(2024, 1, 15);   // 指定日期
LocalTime time = LocalTime.of(14, 30, 0);      // 14:30:00
LocalDateTime dt = LocalDateTime.of(2024, 1, 15, 14, 30);

// JDBC 映射：JDBC 4.2+ 直接支持 java.time
// PreparedStatement.setObject(1, date);    // 直接用

// ===== 计算（返回新对象，原对象不变——不可变性）=====
LocalDate nextWeek = date.plusWeeks(1);          // +1 周
LocalDate lastMonth = date.minusMonths(1);        // -1 月
LocalDate firstDay = date.withDayOfMonth(1);     // 本月第一天
boolean isBefore = date.isBefore(date2);
boolean isAfter = date.isAfter(date2);

// TemporalAdjusters：高级调整
LocalDate nextMonday = date.with(TemporalAdjusters.next(DayOfWeek.MONDAY));
LocalDate lastDayOfMonth = date.with(TemporalAdjusters.lastDayOfMonth());

// ===== 时间间隔 =====
Period period = Period.between(date, date2);         // 日期间隔：P1M10D
long days = period.getDays();                         // 10
Duration duration = Duration.between(time, time.plusHours(2));  // 时间间隔：PT2H
long seconds = duration.getSeconds();                 // 7200

// ===== 格式化 =====
DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
String str = dt.format(fmt);                          // "2024-01-15 14:30:00"
LocalDateTime parsed = LocalDateTime.parse(str, fmt);  // 解析回来

// ===== 时区 =====
ZonedDateTime zdt = dt.atZone(ZoneId.of("Asia/Shanghai"));
ZonedDateTime nyTime = zdt.withZoneSameInstant(ZoneId.of("America/New_York"));

// ===== Instant（时间戳）=====
Instant now = Instant.now();                           // UTC 时间戳
long epochMilli = now.toEpochMilli();                  // 毫秒数
Instant fromEpoch = Instant.ofEpochMilli(epochMilli);  // 从毫秒数恢复
```

```java
// ⭐️ 老 API ↔ 新 API 互转
// Date → Instant
Instant instant = new Date().toInstant();

// Instant → Date
Date date = Date.from(Instant.now());

// Calendar → LocalDateTime
LocalDateTime ldt = LocalDateTime.ofInstant(
    Calendar.getInstance().toInstant(),
    ZoneId.systemDefault());
```

---

## 七、CompletableFuture —— 异步编排

`CompletableFuture` 实现了 `Future` 和 `CompletionStage` 接口，提供了 **链式、可组合、非阻塞** 的异步编程能力：

```java
// ===== 创建异步任务 =====
CompletableFuture<String> cf1 = CompletableFuture.supplyAsync(() -> {
    // 有返回值的异步任务（使用 ForkJoinPool.commonPool()）
    return fetchFromRemote();
});

CompletableFuture<Void> cf2 = CompletableFuture.runAsync(() -> {
    // 无返回值的异步任务
    sendLog();
});

// 指定线程池
Executor executor = Executors.newFixedThreadPool(4);
CompletableFuture<String> cf3 = CompletableFuture.supplyAsync(() -> {
    return heavyCompute();
}, executor);
```

```java
// ===== 链式调用（thenApply / thenAccept / thenRun）=====
CompletableFuture<String> future = CompletableFuture
    .supplyAsync(() -> {
        return "Hello";                           // 异步获取数据
    })
    .thenApply(s -> {
        return s + " World";                      // 转换结果（有输入有输出）
    })
    .thenApply(String::toUpperCase);               // 继续转换

System.out.println(future.join());                 // "HELLO WORLD"

// thenAccept：消费结果（有输入无输出）
future.thenAccept(System.out::println);

// thenRun：不关心结果（无输入无输出）
future.thenRun(() -> System.out.println("Done"));
```

```java
// ===== 组合两个异步任务 =====

// thenCompose：两任务有依赖关系（flatMap 的异步版本）
CompletableFuture<String> composed = findUser(1L)
    .thenCompose(user -> findOrders(user.getId()));  // 用第一个的结果启动第二个

// thenCombine：两任务独立，合并结果
CompletableFuture<Integer> combined = fetchPrice()
    .thenCombine(fetchDiscount(), (price, discount) -> price - discount);

// 等待全部完成
CompletableFuture<Void> all = CompletableFuture.allOf(cf1, cf2, cf3);

// 等待任意一个完成
CompletableFuture<Object> any = CompletableFuture.anyOf(cf1, cf2, cf3);
```

```java
// ===== 异常处理 =====
CompletableFuture<String> safe = CompletableFuture
    .supplyAsync(() -> {
        if (Math.random() < 0.5) throw new RuntimeException("Service failed");
        return "OK";
    })
    .exceptionally(ex -> {          // 捕获异常，提供默认值
        log.error("Failed: {}", ex.getMessage());
        return "FALLBACK";
    })
    .handle((result, ex) -> {       // 无论成功或失败都执行（类似 finally）
        if (ex != null) return "recovered";
        return result.toUpperCase();
    });

// whenComplete：类似 finally，但不修改结果
safe.whenComplete((result, ex) -> {
    if (ex != null) log.error("Failed", ex);
    else log.info("Result: {}", result);
});
```

```java
// ===== 实战：聚合多个远程调用 =====
public UserProfile getUserProfile(Long userId) {
    CompletableFuture<User> userFuture =
        CompletableFuture.supplyAsync(() -> userService.getUser(userId));

    CompletableFuture<List<Order>> ordersFuture =
        CompletableFuture.supplyAsync(() -> orderService.getOrders(userId));

    CompletableFuture<Score> scoreFuture =
        CompletableFuture.supplyAsync(() -> scoreService.getScore(userId));

    // 三个请求并发执行，等全部完成后组装
    return CompletableFuture.allOf(userFuture, ordersFuture, scoreFuture)
        .thenApply(v -> {
            User user = userFuture.join();
            List<Order> orders = ordersFuture.join();
            Score score = scoreFuture.join();
            return new UserProfile(user, orders, score);
        })
        .join();  // 阻塞等待最终结果
}
// 三个远程调用并发执行 → 总耗时 ≈ max(各自耗时)，而不是 sum
```

> 🎯 **CompletableFuture vs Future**：Future 只能调用 `get()` 阻塞等待，无法链式处理、无法组合、无法异常处理。CompletableFuture 解决了所有这些问题。

---

## 八、总结

| 特性 | 核心要点 |
|------|---------|
| **Lambda** | 函数式接口的语法糖；`(参数) -> 表达式`；本质是生成匿名内部类的实例 |
| **方法引用** | 四种形式：静态/特定实例/任意实例/构造器；能更简洁地替代单方法 Lambda |
| **函数式接口** | `Function`(转换)、`Consumer`(消费)、`Supplier`(提供)、`Predicate`(断言)；支持 andThen/compose 组合 |
| **Stream** | 创建→中间操作（惰性）→终端操作（触发）；不存数据、不改变源、一次性 |
| **Collectors** | `toList/toMap`、`groupingBy`（分组）、`partitioningBy`（分区）、`joining`（拼接） |
| **Optional** | 显式表达"可能为空"；`map/flatMap` 链式处理；`orElseGet` 优于 `orElse`（惰性） |
| **默认方法** | 接口演化兼容；类优先于接口；冲突需手动 `Interface.super.method()` |
| **java.time** | 不可变+线程安全；`LocalDate/LocalTime/LocalDateTime/Instant/ZonedDateTime` |
| **CompletableFuture** | 链式：`thenApply/thenAccept/thenRun`；组合：`thenCompose/thenCombine`；异常：`exceptionally/handle`；并发：`allOf/anyOf` |

下一篇将纵览 **Java 9 ~ 21 的演进之路** —— 从模块系统到 `var`，从 `record` 到虚拟线程，从文本块到模式匹配，覆盖六个 LTS 版本的关键特性与8→11→17→21 升级路径。

---

## 参考

- [Oracle — Java 8 What's New](https://www.oracle.com/java/technologies/javase/8-whats-new.html)
- [Package java.util.function (Java SE 17)](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/function/package-summary.html)
- [Package java.util.stream (Java SE 17)](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/stream/package-summary.html)
- [Package java.time (Java SE 17)](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/time/package-summary.html)
- [Class CompletableFuture (Java SE 17)](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/concurrent/CompletableFuture.html)
- [JavaGuide — Java 8 新特性](https://javaguide.cn/java/new-features/java8-common-new-features.html)
