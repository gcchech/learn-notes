---
title: 反射与注解
icon: magnifying-glass
order: 8
category:
  - Java
  - 基础
tag:
  - 反射
  - 注解
  - 动态代理
  - Spring
---

# Java 反射与注解：运行时类型操作与元编程

> 📖 反射（Reflection）和注解（Annotation）是 Java 框架的灵魂。Spring 的依赖注入、MyBatis 的 ORM 映射、JUnit 的测试执行——所有这些框架的核心机制都建立在反射和注解之上。理解它们，你就能看懂框架源码。

---

## 一、反射的核心：Class 对象

### 1.1 什么是 Class 对象？

JVM 加载一个类时，会在方法区创建一个唯一的 `Class` 对象——这个对象包含了该类的**全部元信息**（字段、方法、构造器、注解……）。反射就是通过这个 Class 对象来操作类。

### 1.2 获取 Class 对象的四种方式

```java
// 方式一：类名.class（最常用，编译期确定）
Class<String> clazz1 = String.class;

// 方式二：对象.getClass()（运行时获取）
String s = "hello";
Class<?> clazz2 = s.getClass();

// 方式三：Class.forName()（动态加载，框架最爱）
Class<?> clazz3 = Class.forName("java.lang.String");  // 抛 ClassNotFoundException

// 方式四：类加载器（底层方式）
Class<?> clazz4 = ClassLoader.getSystemClassLoader().loadClass("java.lang.String");
```

| 方式 | 时机 | 使用场景 |
|------|------|---------|
| `类名.class` | 编译期已知 | 工具类、日志定义 |
| `对象.getClass()` | 运行时已知对象 | 多态场景下判断实际类型 |
| `Class.forName()` | 动态加载 | **框架配置**（Spring Bean 加载、JDBC 驱动） |
| `ClassLoader.loadClass()` | 不触发类初始化 | 类加载器相关操作 |

### 1.3 Class.forName() vs ClassLoader.loadClass()

```java
// Class.forName() —— 执行类的初始化（包括 static 代码块）
Class.forName("com.mysql.cj.jdbc.Driver");
// JDBC 驱动用 forName() 就是因为在 static 代码块中注册自己

// ClassLoader.loadClass() —— 只加载，不初始化
ClassLoader.getSystemClassLoader().loadClass("com.example.MyClass");
// Spring 用 loadClass() 做延迟加载，提高了启动速度
```

---

## 二、反射的核心 API

### 2.1 创建对象

```java
Class<User> clazz = User.class;

// 方式一：调用无参构造器（JDK 9 前用 newInstance()，已废弃）
User user = clazz.getDeclaredConstructor().newInstance();

// 方式二：调用有参构造器
Constructor<User> constructor = clazz.getDeclaredConstructor(String.class, int.class);
User user2 = constructor.newInstance("张三", 18);
```

### 2.2 访问字段

```java
class User {
    private String name;  // private 字段！
    public int age;
}

User user = new User();
Class<? extends User> clazz = user.getClass();

// 获取 public 字段
Field ageField = clazz.getField("age");
ageField.set(user, 25);

// 获取任意字段（包括 private）
Field nameField = clazz.getDeclaredField("name");
nameField.setAccessible(true);  // ⚠️ 突破 private 限制！
nameField.set(user, "张三");

System.out.println(nameField.get(user));  // 张三
```

### 2.3 调用方法

```java
class Calculator {
    private int add(int a, int b) {  // private 方法！
        return a + b;
    }

    public static void sayHello() {
        System.out.println("Hello");
    }
}

// 调用 private 方法
Calculator calc = new Calculator();
Method addMethod = Calculator.class.getDeclaredMethod("add", int.class, int.class);
addMethod.setAccessible(true);  // 突破 private
int result = (int) addMethod.invoke(calc, 3, 5);
System.out.println(result);  // 8

// 调用 static 方法（第一个参数传 null）
Method sayHello = Calculator.class.getDeclaredMethod("sayHello");
sayHello.invoke(null);  // 输出：Hello
```

### 2.4 反射性能问题

反射比直接调用慢，但 JDK 不断优化这个问题：

```java
// JDK 7 前：setAccessible() 每次都要检查 SecurityManager
// JDK 7-17：逐步优化，反射性能已接近直接调用
// JDK 18+：MethodHandles 和 LambdaMetafactory 进一步优化

// 实测建议：高频调用的场景，用 setAccessible(true) + 缓存 Method 对象
// 不要在循环中反复 getDeclaredMethod()——它本身就有性能开销
```

---

## 三、注解的定义与处理

### 3.1 注解的分类

```
注解按生命周期分为三种：

┌──────────────────────────────────────────┐
│  源代码（.java）→ 编译期 → 字节码（.class）→ 运行时 │
│                                              │
│  @Retention(SOURCE)     → 编译期就丢弃        │
│    @Override, @SuppressWarnings              │
│                                              │
│  @Retention(CLASS)      → 保留到字节码         │
│    @NonNull (Lombok 常用)                     │
│                                              │
│  @Retention(RUNTIME)    → 运行时可通过反射读取   │
│    @Autowired, @Test, @Transactional          │
└──────────────────────────────────────────┘
```

### 3.2 元注解——注解的注解

| 元注解 | 作用 |
|--------|------|
| `@Retention` | 指定注解的保留策略：SOURCE / CLASS / RUNTIME |
| `@Target` | 指定注解可以用在什么地方：TYPE / FIELD / METHOD / PARAMETER…… |
| `@Documented` | 注解信息会出现在 javadoc 中 |
| `@Inherited` | 子类会继承父类的该注解 |
| `@Repeatable` | JDK 8+，允许同一个注解重复标注 |

### 3.3 自定义运行时注解

```java
// ① 定义注解
@Retention(RetentionPolicy.RUNTIME)  // 保留到运行时
@Target(ElementType.FIELD)           // 只能用在字段上
public @interface NotBlank {
    String message() default "字段不能为空";
    int minLength() default 1;
}

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface LogExecution {
    String value() default "";  // 如果只有 value 一个属性，使用时可以省略属性名
}

// ② 使用注解
public class UserForm {
    @NotBlank(message = "用户名不能为空")
    private String username;

    @NotBlank(minLength = 6, message = "密码至少 6 位")
    private String password;
}

public class UserService {
    @LogExecution("查询用户")
    public User getUser(Long id) {
        // ...
    }
}

// ③ 处理注解——通过反射读取注解信息
public class Validator {
    public static void validate(Object obj) throws Exception {
        Class<?> clazz = obj.getClass();
        for (Field field : clazz.getDeclaredFields()) {
            NotBlank annotation = field.getAnnotation(NotBlank.class);
            if (annotation != null) {
                field.setAccessible(true);
                String value = (String) field.get(obj);
                if (value == null || value.trim().length() < annotation.minLength()) {
                    throw new IllegalArgumentException(annotation.message());
                }
            }
        }
    }
}

// 使用
UserForm form = new UserForm();
form.setUsername("");  // 空字符串
Validator.validate(form);  // 抛出：IllegalArgumentException: 用户名不能为空
```

### 3.4 ⭐️ 编译时注解处理器

运行时注解通过反射实现，**编译时注解处理器**（如 Lombok）则完全不同：

```java
// Lombok 的 @Data 就是编译时注解
@Data
public class User {
    private String name;
    private int age;
}
// 编译时，Lombok 的注解处理器读取 @Data → 生成
// getter/setter/equals/hashCode/toString 方法
// → 直接写入 .class 文件，运行时没有任何反射开销
```

编译时注解处理器的关键类是 `javax.annotation.processing.AbstractProcessor`，它在 `javac` 编译阶段被调用。

**运行时 vs 编译时**：

| 维度 | 运行时注解 | 编译时注解 |
|------|-----------|-----------|
| 实现方式 | 反射 | APT（Annotation Processing Tool） |
| 处理时机 | 程序运行时 | 编译期 |
| 性能 | 有反射开销 | 零运行时开销 |
| 代表 | @Autowired、@Test | Lombok @Data、MapStruct |

---

## 四、动态代理

### 4.1 JDK 动态代理

JDK 动态代理基于**接口**——被代理的类必须实现至少一个接口：

```java
// 接口
interface UserService {
    void save(String name);
    String find(Long id);
}

// 实现类
class UserServiceImpl implements UserService {
    @Override
    public void save(String name) {
        System.out.println("保存用户: " + name);
    }

    @Override
    public String find(Long id) {
        return "用户" + id;
    }
}

// 动态代理——InvocationHandler
class LoggingHandler implements InvocationHandler {
    private final Object target;  // 被代理的真实对象

    public LoggingHandler(Object target) {
        this.target = target;
    }

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        System.out.println("[LOG] 调用方法: " + method.getName());
        long start = System.currentTimeMillis();

        Object result = method.invoke(target, args);  // 调用真实方法

        long time = System.currentTimeMillis() - start;
        System.out.println("[LOG] 方法结束, 耗时: " + time + "ms");
        return result;
    }
}

// 创建代理对象
UserService target = new UserServiceImpl();
UserService proxy = (UserService) Proxy.newProxyInstance(
    target.getClass().getClassLoader(),      // 类加载器
    target.getClass().getInterfaces(),       // 接口列表
    new LoggingHandler(target)               // InvocationHandler
);

proxy.save("张三");
// 输出：
// [LOG] 调用方法: save
// 保存用户: 张三
// [LOG] 方法结束, 耗时: 0ms
```

### 4.2 CGLIB 动态代理

Spring 中如果一个类没有实现接口，会切换到 CGLIB 代理——通过**继承**生成子类：

```
JDK 动态代理 vs CGLIB：

JDK 动态代理：基于接口
  被代理类必须实现接口
  通过 Proxy.newProxyInstance() 创建
  生成的代理类是 $Proxy0 extends Proxy implements UserService

CGLIB：基于继承
  被代理类可以不实现接口
  通过生成目标类的子类来代理
  生成的代理类是 UserServiceImpl$$EnhancerByCGLIB$$xxx extends UserServiceImpl
  final 类和 final 方法无法代理
```

---

## 五、反射在 Spring 中的应用

### 5.1 依赖注入怎么工作的？

```java
// 简化的 Spring DI 实现原理
public class SimpleApplicationContext {
    private Map<String, Object> beans = new HashMap<>();

    public void registerBean(String name, Object bean) {
        beans.put(name, bean);
    }

    // 自动注入 @Autowired 标注的字段
    public void autowire() throws Exception {
        for (Object bean : beans.values()) {
            for (Field field : bean.getClass().getDeclaredFields()) {
                if (field.isAnnotationPresent(Autowired.class)) {
                    field.setAccessible(true);
                    Object dependency = beans.get(field.getName());  // 按名称查找依赖
                    field.set(bean, dependency);
                }
            }
        }
    }
}
```

### 5.2 反射相关的安全限制

```bash
# JDK 17+ 默认对 java.* 包启用强封装
# 如果反射访问 java.lang 等内部 API 会收到警告：
# WARNING: An illegal reflective access operation has occurred

# 开放特定包的访问
--add-opens java.base/java.lang=ALL-UNNAMED
# 框架（如 Spring、Hibernate）需要添加这些参数
```

---

## 六、总结

| 知识点 | 核心要点 |
|--------|---------|
| Class 对象 | 四种获取方式；forName() 初始化类，loadClass() 不初始化 |
| 反射 API | getDeclaredXxx() 获取所有成员（含 private）；setAccessible(true) 突破访问限制 |
| 注解生命周期 | SOURCE（编译期丢弃）、CLASS（字节码保留）、RUNTIME（反射可读取） |
| 自定义注解 | 属性只有 value 时可省略名称；通过 `getAnnotation()` 读取 |
| 编译时注解 | APT 在编译期处理（Lombok）；零运行时开销；不同于反射 |
| JDK 动态代理 | 基于接口；InvocationHandler；`Proxy.newProxyInstance()` |
| 框架本质 | Spring DI 的核心就是反射 + 注解的组合 |

反射和注解是 Java 框架的"元编程基础"。下一篇我们将进入 **I/O 流**——字节流与字符流、装饰器模式、NIO 的 Buffer 与 Channel，以及 Path/Files 工具类。

---

## 参考

- [Java Language Specification - Chapter 9.6: Annotation Types](https://docs.oracle.com/javase/specs/jls/se17/html/jls-9.html#jls-9.6)
- [The Java Tutorials - Reflection API](https://docs.oracle.com/javase/tutorial/reflect/)
- [JavaGuide - 反射与注解](https://javaguide.cn/java/basis/java-basic-questions-01.html)
