---
title: 类加载机制
icon: puzzle-piece
order: 3
category:
  - Java
  - JVM
tag:
  - 类加载
  - 双亲委派
  - ClassLoader
  - SPI
  - 自定义类加载器
  - Tomcat
---

# 类加载机制：双亲委派、SPI 与打破规则

> 📖 一个 `.class` 文件如何变成一个可用的 `Class` 对象？为何 String 不能被篡改？SPI（如 JDBC 驱动）如何让核心库调用第三方实现？Tomcat 为什么要打破双亲委派？——本文从类生命周期的七个阶段出发，深入双亲委派模型的源码和设计意图，剖析 "打破双亲委派" 的两大经典案例（SPI 与 Tomcat），并给出自定义类加载器的正确姿势。

---

## 一、类的生命周期

一个 Java 类从 `.class` 文件到被使用再到卸载，经历七个阶段：

```
类的生命周期：

  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────────┐  ┌──────┐  ┌──────┐
  │ 加载  │─▶│ 验证  │─▶│ 准备  │─▶│ 解析  │─▶│  初始化    │─▶│ 使用  │─▶│ 卸载  │
  │Loading│  │Verify│  │Prepare│  │Resolve│  │Initialization│  │Using │  │Unload│
  └──────┘  └──────┘  └──────┘  └──────┘  └──────────┘  └──────┘  └──────┘
      │                                                          │
      └────── 连接(Linking)：验证 + 准备 + 解析 = 3个子阶段 ──────┘

  动态解析：解析阶段可以在初始化之后（动态绑定/晚期绑定）
  - 静态解析：编译时就能确定调用目标的（如静态方法、私有方法、构造器）
  - 动态解析：运行时才能确定的（如接口方法、重写方法）
```

### 1.1 加载（Loading）

将 `.class` 文件的字节码加载到内存，生成代表该类的 `java.lang.Class` 对象。

```
加载阶段做了三件事：

1. 通过全限定名获取类的二进制字节流
   → 从 classpath 读、从网络读、从数据库读、动态生成（代理类）
   → 这就是"类加载器"发挥作用的地方

2. 将字节流的静态结构转换为方法区的运行时数据结构
   → 类的元数据被放入方法区/元空间

3. 在堆中生成该类的 java.lang.Class 对象
   → 作为方法区中类元数据的访问入口
```

### 1.2 连接（Linking）

**验证（Verify）**——确保 `.class` 文件的字节码安全：

```
验证阶段检查什么？

│ 文件格式验证
├─ 是否以魔数 0xCAFEBABE 开头？
├─ 主次版本号是否在当前 JVM 接受范围内？
└─ 常量池是否有不支持的常量类型？

│ 元数据验证
├─ 该类是否有父类（除 Object 外）？
├─ 是否继承了 final 类？
└─ 抽象方法是否全部被实现？

│ 字节码验证（最复杂）
├─ 类型转换是否合法？（如 int 赋值给 String）
├─ 跳转指令会不会跳到方法体之外？
└─ 操作数栈的数据类型是否匹配？

│ 符号引用验证（解析阶段）
├─ 符号引用的目标类是否存在？
└─ 是否有权限访问目标类/字段/方法？
```

**准备（Prepare）**——为 static 变量分配内存并赋**默认零值**（不是赋初始值！）：

```java
// 阶段 1：准备阶段
public static int value = 123;
// 此时 value 的值是 0（默认零值），不是 123！

// 阶段 2：初始化阶段
// 此时 value 的值才变成 123

// 例外：static final 常量
public static final int CONST = 123;
// 准备阶段就直接赋值为 123（javac 编译时生成 ConstantValue 属性）
```

**解析（Resolve）**——将常量池中的符号引用替换为直接引用：

```
符号引用 → 直接引用

  符号引用（Symbolic Reference）：
    → 字面量形式描述，如 "java/lang/String"
    → 与 JVM 的内存布局无关

  直接引用（Direct Reference）：
    → 直接指向目标的指针/偏移量/句柄
    → 与 JVM 内存布局相关
```

### 1.3 初始化（Initialization）

执行类构造器 `<clinit>()` 方法——JVM 保证父类的 `<clinit>()` 先于子类执行：

```java
public class InitOrderDemo {
    static class Parent {
        public static int A = 1;
        static { A = 2; }
    }

    static class Child extends Parent {
        public static int B = A;  // B = 2（父类初始化已完成）
    }

    public static void main(String[] args) {
        System.out.println(Child.B);  // 2
    }
}

// <clinit>() 方法 = 所有 static 变量赋值 + static 代码块的合并
// Parent.<clinit>():
//   A = 1;
//   A = 2;          // static {} 块
//
// Child.<clinit>():
//   B = A;           // 此时 A 已经是 2
```

> ⭐️ **关键**：`<clinit>()` 方法不需要显式调用父类的 `<clinit>()`——JVM 自动保证在子类 `<clinit>()` 执行前，父类的 `<clinit>()` 已经执行完毕。所以第一个被执行的 `<clinit>()` 一定是 `Object`。

---

## 二、类加载时机 —— 什么时候触发初始化？

《Java 虚拟机规范》规定了 **6 种主动引用** 触发初始化（除此之外都是被动引用）：

```
6 种主动引用场景：

1. new 关键字、读取/设置静态字段、调用静态方法
   注：static final 的常量（编译时常量）不会触发！
   ─────────────────────────────────────────────
2. 反射调用（Class.forName()、Class.getMethod() 等）
   ─────────────────────────────────────────────
3. 初始化子类时，必须先初始化父类
   接口: 用到父接口的字段/方法时才初始化父接口
   ─────────────────────────────────────────────
4. main() 方法所在的类（启动类）
   ─────────────────────────────────────────────
5. MethodHandle 和 VarHandle（JDK 7+ 动态语言支持）
   ─────────────────────────────────────────────
6. 接口 default 方法被实现类的子类调用时
```

```java
// 被动引用示例——不会触发初始化！
public class PassiveRefDemo {
    public static void main(String[] args) {
        // 1. 通过子类引用父类的静态字段 → 只初始化父类，不初始化子类
        System.out.println(Child.value);  // Parent 初始化，Child 不初始化

        // 2. 通过数组定义引用类 → 不触发初始化
        Parent[] arr = new Parent[10];  // 不触发 Parent 初始化

        // 3. 引用编译时常量 → 不触发初始化
        System.out.println(Parent.CONST);  // 编译时常量不触发初始化
    }
}

class Parent {
    static int value = 1;
    static final int CONST = 123;  // 编译时就确定了 → 不触发 <clinit>
    static { System.out.println("Parent init"); }
}

class Child extends Parent {
    static { System.out.println("Child init"); }
}
```

---

## 三、类加载器的层次结构

### 3.1 三大核心类加载器

JVM 提供了三层类加载器（从 JDK 9 模块化后稍有调整）：

```
JDK 8 及以前：

  ┌──────────────────────────────────────────────┐
  │  Bootstrap ClassLoader（启动类加载器）         │
  │  → C++ 实现，不是 ClassLoader 的子类           │
  │  → 加载 <JAVA_HOME>/jre/lib/rt.jar            │
  │  → 如 java.lang.String, java.util.ArrayList   │
  │  → getParent() 返回 null                      │
  └──────────────────┬───────────────────────────┘
                     │
                     ▼
  ┌──────────────────────────────────────────────┐
  │  Extension ClassLoader（扩展类加载器）          │
  │  → sun.misc.Launcher$ExtClassLoader           │
  │  → 加载 <JAVA_HOME>/jre/lib/ext/ 目录下的 jar │
  │  → JDK 9 后被平台类加载器(PlatformClassLoader)替代│
  └──────────────────┬───────────────────────────┘
                     │
                     ▼
  ┌──────────────────────────────────────────────┐
  │  Application ClassLoader（应用类加载器）        │
  │  → sun.misc.Launcher$AppClassLoader           │
  │  → 加载 classpath 下的类（你的业务代码）         │
  │  → ClassLoader.getSystemClassLoader() 的返回值  │
  └──────────────────────────────────────────────┘

JDK 9+（模块化）：
  Bootstrap → Platform ClassLoader → App ClassLoader
  （Extension → Platform，加载路径和职责有调整）
```

```java
// 查看各个类加载器
public class ClassLoaderDemo {
    public static void main(String[] args) {
        // String 由 Bootstrap 加载 → null（因为 Bootstrap 是 C++ 的）
        System.out.println(String.class.getClassLoader());
        // 输出: null

        // 自己的类由 AppClassLoader 加载
        System.out.println(ClassLoaderDemo.class.getClassLoader());
        // 输出: sun.misc.Launcher$AppClassLoader@18b4aac2

        // 获取各级 ClassLoader
        ClassLoader appCL = ClassLoaderDemo.class.getClassLoader();
        System.out.println(appCL);
        // sun.misc.Launcher$AppClassLoader

        System.out.println(appCL.getParent());
        // sun.misc.Launcher$ExtClassLoader (JDK 8) / PlatformClassLoader (JDK 9+)

        System.out.println(appCL.getParent().getParent());
        // null ← Bootstrap ClassLoader
    }
}
```

### 3.2 双亲委派模型（Parents Delegation Model）

#### 什么是双亲委派？

一个类加载器收到加载请求后，不自己先加载，而是**委托给父加载器**，直到 Bootstrap；父加载器加载不了时，子加载器才尝试自己加载。

```
双亲委派工作流程：

  请求 "com.example.User" 加载
        │
        ▼
  ┌─────────────┐ ①委托父类加载
  │ AppClassLoader│─────────────┐
  └─────────────┘              │
                        ▼
                ┌─────────────┐ ②委托父类加载
                │ Ext/Platform │─────────────┐
                └─────────────┘              │
                                      ▼
                              ┌─────────────┐ ③尝试加载
                              │  Bootstrap  │──▶ 能找到？
                              └─────────────┘    │
                                    │            │
                              ┌─ 找到 ──────────┘
                              │   返回 Class 对象
                              │
                              ▼ 找不到
                        ┌─────────────┐ ④尝试加载
                        │ Ext/Platform │──▶ 能找到？
                        └─────────────┘    │
                              │            │
                              ├─ 找到 ─────┘
                              │
                              ▼ 找不到
                        ┌─────────────┐ ⑤尝试加载
                        │ AppClassLoader│──▶ 能找到？
                        └─────────────┘    │
                              │            │
                              ├─ 找到 ─────┘
                              │
                              ▼ 找不到
                        ClassNotFoundException
```

#### 源码分析

双亲委派的核心代码在 `ClassLoader.loadClass()` 中：

```java
// JDK 17 ClassLoader.loadClass() 源码（简化 + 注释）
protected Class<?> loadClass(String name, boolean resolve)
        throws ClassNotFoundException {
    synchronized (getClassLoadingLock(name)) {

        // 步骤 1：检查是否已经加载过
        Class<?> c = findLoadedClass(name);
        if (c == null) {
            try {
                // 步骤 2：委托给父类加载器
                if (parent != null) {
                    c = parent.loadClass(name, false);  // 递归向上
                } else {
                    // parent == null → 用 Bootstrap ClassLoader
                    c = findBootstrapClassOrNull(name);
                }
            } catch (ClassNotFoundException e) {
                // 父加载器找不到 → 忽略异常，往下走
            }

            if (c == null) {
                // 步骤 3：父加载器都找不到 → 自己加载
                c = findClass(name);  // ← 开发者重写这个方法
            }
        }

        if (resolve) {
            resolveClass(c);  // 触发连接阶段
        }
        return c;
    }
}
```

```java
// 自定义类加载器的正确姿势 —— 只重写 findClass()，不重写 loadClass()
class MyClassLoader extends ClassLoader {
    @Override
    protected Class<?> findClass(String name) throws ClassNotFoundException {
        // 1. 读取 .class 文件的字节码
        byte[] bytes = loadClassData(name);

        // 2. 调用 defineClass() 将其转换为 Class 对象
        return defineClass(name, bytes, 0, bytes.length);
    }

    private byte[] loadClassData(String name) {
        // 从文件系统/网络/数据库 读取字节码
        // ...
    }
}
```

### 3.3 为什么需要双亲委派？

```
双亲委派的安全保障：

  场景：假设没有双亲委派
  → 用户自己写了一个 java.lang.String 类（包含恶意代码）
  → AppClassLoader 可能会直接加载这个冒牌 String
  → 整个程序中所有用到 String 的地方都被污染
  → 💥 灾难性后果！

  有双亲委派：
  → 请求 java.lang.String → AppCL → ExtCL → Bootstrap
  → Bootstrap 发现 rt.jar 中有 java.lang.String → 直接加载正规版本
  → 用户的冒牌 String 永远不会被加载
  → ✅ 核心类库被保护！

换句话说：双亲委派保证了"越核心的类，越由核心的加载器加载"
```

```java
// 尝试创建一个 java.lang.String（测试双亲委派）
// 结果：可以编译通过，但运行时抛 SecurityException 或 ClassNotFoundException
// JVM 不允许包名以 java. 开头的类由用户自定义的 ClassLoader 加载
package java;
public class String {
    public static void main(String[] args) {
        System.out.println("My String");  // 能编译，不能运行
    }
}
// java.lang.SecurityException: Prohibited package name: java
```

---

## 四、打破双亲委派 —— 当规则成为束缚

### 4.1 SPI（Service Provider Interface）—— 核心库如何调用第三方实现？

```
经典场景：JDBC

  java.sql.DriverManager 是由 Bootstrap 加载的（在 rt.jar 中）
  但它需要加载具体的数据库驱动（MySQL Driver、Pg Driver 等）
  这些驱动是由 AppClassLoader 加载的（在 classpath 中）

  按双亲委派：Bootstrap → Ext → App（方向是"向上"委托）
  但 Bootstrap 怎么"往下"找 AppClassLoader 加载的类呢？ ← 方向反了！
```

```java
// JDBC 4.0+ 的 SPI 机制（简化原理）
// 在 META-INF/services/java.sql.Driver 文件中：
// com.mysql.cj.jdbc.Driver

// DriverManager 的静态初始化块：
public class DriverManager {
    static {
        loadInitialDrivers();  // 用 ServiceLoader 加载所有驱动
    }

    private static void loadInitialDrivers() {
        // ServiceLoader 内部使用线程上下文类加载器
        ServiceLoader<Driver> loadedDrivers = ServiceLoader.load(Driver.class);
        for (Driver d : loadedDrivers) {
            drivers.add(new DriverInfo(d));
        }
    }
}
```

**SPI 的解决方案——线程上下文类加载器（Thread Context ClassLoader）**：

```
SPI 打破双亲委派的方式：

  ① DriverManager (Bootstrap 加载) 需要找到 MySQL Driver (AppClassLoader 加载)
  ② 直接"向下"找 → 双亲委派不支持

  解决方案：线程上下文类加载器
    → Thread.currentThread().getContextClassLoader()
    → 默认设置为 AppClassLoader
    → Bootstrap 加载的类通过这个"后门"拿到 AppClassLoader
    → 用 AppClassLoader 去加载第三方驱动

  ServiceLoader.load(Driver.class) 内部：
    1. 获取线程上下文类加载器 = AppClassLoader
    2. 用 AppClassLoader 扫描 META-INF/services/java.sql.Driver
    3. 加载文件中列出的驱动类
```

```java
// 线程上下文类加载器的使用
Thread.currentThread().getContextClassLoader();  // 获取
Thread.currentThread().setContextClassLoader(cl); // 设置

// JDBC 驱动的另一种手动加载方式（老式写法）
Class.forName("com.mysql.cj.jdbc.Driver");
// forName 默认使用调用者的类加载器 → 即 AppClassLoader
```

> 🎯 **核心理解**：SPI 打破了双亲委派，但用的不是"修改 loadClass"而是"线程上下文类加载器"这个取巧方案——让父加载器（Bootstrap）能借用子加载器（AppCL）的能力。这是一种**被动打破**——不是重写代码，而是绕过规则。

### 4.2 Tomcat 的类加载器 —— 为什么要主动打破？

Tomcat 是一个 Web 容器，需要同时运行多个 Web 应用——每个应用的类加载必须相互隔离：

```
Tomcat 的挑战：

应用 A (AppClassLoader 的子)          应用 B (AppClassLoader 的子)
├─ com.example.User (v1.0)           ├─ com.example.User (v2.0)
├─ Spring 5.3                        ├─ Spring 6.1
└─ org.apache.commons.io 2.11        └─ org.apache.commons.io 2.15

如果 Tomcat 用标准的双亲委派：
  → 类都交给父加载器 → 不同版本的同一类名会冲突！
  → 应用之间可以互相看到对方的类 → 安全问题！
```

```
Tomcat 的类加载器层次（打破双亲委派）：

  ┌─────────────────────┐
  │  Bootstrap           │  ← JVM 核心类
  └──────────┬──────────┘
             │
  ┌──────────┴──────────┐
  │  System              │  ← Tomcat 内部用（catalina.jar 等）
  └──────────┬──────────┘
             │
  ┌──────────┴──────────┐
  │  Common              │  ← 所有 Web 应用共享的 jar（放在 $CATALINA_HOME/lib）
  │  (shared libs)       │
  └─────┬──────────┬─────┘
        │          │             ← ⚠️ 打破了双亲委派！这里不向上委托！
  ┌─────┴──┐  ┌───┴──────┐
  │WebApp A│  │WebApp B  │    ← 每个 Web 应用独立的类加载器
  │ ┌────┐│  │ ┌──────┐ │
  │ │/WEB ││  │ │/WEB  │ │
  │ │ -INF││  │ │ -INF │ │
  │ └────┘│  │ └──────┘ │
  └────────┘  └──────────┘

  关键规则：
  1. 每个 WebApp 的类加载器先自己加载 → 找不到才向上委托（与双亲委派相反！）
  2. WebApp A 看不到 WebApp B 的类 → 应用隔离
  3. Common 的类对所有 WebApp 可见 → 共享基础库
```

```java
// Tomcat WebappClassLoaderBase 的核心逻辑（极度简化）
public class WebappClassLoader extends URLClassLoader {

    @Override
    public Class<?> loadClass(String name) throws ClassNotFoundException {
        synchronized (getClassLoadingLock(name)) {

            // ① 查找本地缓存
            Class<?> clazz = findLoadedClass(name);

            // ② 检查是否应该"先让父加载"（JVM 核心类、Tomcat 核心类）
            if (clazz == null && filter(name)) {
                clazz = super.loadClass(name);  // 走双亲委派
            }

            // ③ ⚠️ 关键差异：先自己加载！
            if (clazz == null) {
                try {
                    clazz = findClass(name);  // WebApp 本地先加载
                } catch (ClassNotFoundException e) {
                    // 自己找不到 → 再委托给父加载器
                }
            }

            // ④ 自己还是找不到 → 委托父加载器
            if (clazz == null) {
                clazz = super.loadClass(name);
            }

            return clazz;
        }
    }
}
```

> 🎯 **Tomcat 的打破方式是"倒转"委托顺序**：默认先自己加载，找不到再委托父加载器。这保证了 WebApp 的 `/WEB-INF/classes` 和 `/WEB-INF/lib` 中的类优先级最高。

---

## 五、自定义类加载器

### 5.1 何时需要自定义？

| 场景 | 示例 |
|------|------|
| 从非标准位置加载类 | 网络、加密 zip 包、数据库 |
| 热部署/热替换 | 不停机更新类（如 Tomcat 开发模式） |
| 隔离类冲突 | 同 jar 不同版本并存 |
| 字节码增强 | 加载时修改字节码（AOP、插桩） |
| 加密/解密 class 文件 | 保护代码安全 |

### 5.2 正确姿势

```java
// ✅ 正确示范：重写 findClass()，保留双亲委派逻辑
public class PathClassLoader extends ClassLoader {

    private String classPath;

    public PathClassLoader(String classPath) {
        this.classPath = classPath;
    }

    @Override
    protected Class<?> findClass(String name) throws ClassNotFoundException {
        // 1. 读取字节码
        byte[] data = getClassBytes(name);
        if (data == null) {
            throw new ClassNotFoundException(name);
        }
        // 2. defineClass → 转换为 Class 对象
        return defineClass(name, data, 0, data.length);
    }

    private byte[] getClassBytes(String name) {
        String path = classPath + "/" + name.replace('.', '/') + ".class";
        try (InputStream is = new FileInputStream(path);
             ByteArrayOutputStream bos = new ByteArrayOutputStream()) {
            byte[] buf = new byte[4096];
            int len;
            while ((len = is.read(buf)) != -1) {
                bos.write(buf, 0, len);
            }
            return bos.toByteArray();
        } catch (IOException e) {
            return null;
        }
    }
}

// ❌ 错误示范：重写 loadClass() — 破坏双亲委派（除非你很清楚在做什么）
class BrokenClassLoader extends ClassLoader {
    @Override
    public Class<?> loadClass(String name) throws ClassNotFoundException {
        // 直接自己加载，完全绕过双亲委派 → Object/String 都可能加载失败
        return findClass(name);
    }
}
```

### 5.3 一个"打破双亲委派"的完整例子

```java
// 场景：需要加载两个版本不同的同一类库
// 方案：用两个独立的类加载器各自加载 → 互相隔离

public class IsolatedClassLoader extends URLClassLoader {

    public IsolatedClassLoader(URL[] urls) {
        // parent 设为 null → 只让 Bootstrap 有加载机会（打破双亲委派）
        super(urls, null);
    }

    @Override
    protected Class<?> loadClass(String name, boolean resolve)
            throws ClassNotFoundException {
        synchronized (getClassLoadingLock(name)) {

            Class<?> c = findLoadedClass(name);

            if (c == null) {
                // 只让核心类走父加载器（Bootstrap），其余自己加载
                if (name.startsWith("java.")) {
                    c = ClassLoader.getPlatformClassLoader().loadClass(name);
                } else {
                    try {
                        c = findClass(name);  // 自己先加载 → 打破双亲委派
                    } catch (ClassNotFoundException e) {
                        // 自己找不到，再尝试用父加载器
                        c = ClassLoader.getPlatformClassLoader().loadClass(name);
                    }
                }
            }

            if (resolve) {
                resolveClass(c);
            }
            return c;
        }
    }
}

// 使用
URL v1Path = new File("libs/my-lib-1.0.jar").toURI().toURL();
URL v2Path = new File("libs/my-lib-2.0.jar").toURI().toURL();

IsolatedClassLoader clV1 = new IsolatedClassLoader(new URL[]{v1Path});
IsolatedClassLoader clV2 = new IsolatedClassLoader(new URL[]{v2Path});

Class<?> clsV1 = clV1.loadClass("com.example.Util");
Class<?> clsV2 = clV2.loadClass("com.example.Util");

System.out.println(clsV1 == clsV2);  // false ← 两个独立加载的类！
```

---

## 六、类的卸载条件

类卸载需要满足**非常严格**的条件：

```
类的卸载条件（全部满足才会卸载）：

1. 该类的所有实例都被回收
   → 堆中没有任何该类的对象

2. 加载该类的 ClassLoader 已被回收
   → 这是最难的条件！Bootstrap/Ext/App 永远不会被回收

3. 该类的 java.lang.Class 对象没有被引用
   → 没有通过反射等方法持有 Class 对象

结论：
  - Bootstrap 加载的类 → 永不卸载
  - Ext/Platform 加载的类 → 几乎永不卸载
  - AppClassLoader 加载的类 → 应用退出才卸载
  - 自定义 ClassLoader 加载的类 → ✅ 类加载器回收后，类可以被卸载
```

```java
// 验证类卸载（JDK 17）-XX:+TraceClassUnloading
public class ClassUnloadingDemo {
    public static void main(String[] args) throws Exception {
        URL classUrl = new File("target/classes/").toURI().toURL();
        String className = "com.example.MyClass";

        // 自定义类加载器加载类
        URLClassLoader cl = new URLClassLoader(new URL[]{classUrl});
        Class<?> cls = cl.loadClass(className);
        Object obj = cls.getDeclaredConstructor().newInstance();

        // 断开引用
        obj = null;
        cls = null;
        cl = null;

        // 触发 GC
        System.gc();

        // 如果元空间 GC 发生，且类卸载条件满足 → 类被卸载
        // 用 -XX:+TraceClassUnloading 可以看到卸载日志
    }
}
```

> ⭐️ **实际影响**：类的卸载在生产中最重要的场景是——频繁创建自定义 ClassLoader 的应用（如 Jasper 编译 JSP 生成了大量类加载器）。如果类加载器没有被回收 → 类也卸载不掉 → 元空间持续增长 → OOM: Metaspace。解决方法：不要把自定义 ClassLoader 的引用泄漏。

---

## 七、JDK 9+ 模块化对类加载的影响

JDK 9 的模块系统（Project Jigsaw）对类加载机制做了重要调整：

```java
// JDK 9+ 的三个内置加载器（不再是之前的三个）
// Bootstrap ClassLoader → 保持不变，但只加载核心模块
// Platform ClassLoader → 取代 Extension ClassLoader
// App ClassLoader      → 仍是应用类加载器

// 获取各加载器的方法（JDK 9+）
ClassLoader.getPlatformClassLoader();    // Platform ClassLoader
ClassLoader.getSystemClassLoader();      // App ClassLoader
```

```
JDK 9+ 的模块化类加载：

  传统方式 (classpath):              模块方式 (module path):
  ┌──────────────────┐              ┌──────────────────────┐
  │ 所有 jar 放一起    │              │ 模块有明确的依赖声明     │
  │ 加载时找不到就报错 │              │ module-info.java      │
  │ 无强封装           │              │ requires / exports    │
  └──────────────────┘              │ 强封装（非 exports 不可见） │
                                     └──────────────────────┘

  ClassLoader 对模块的影响：
  - 每个模块的类由一个 ClassLoader 加载
  - 模块的依赖关系在启动时验证
  - 不再有"运行时找不到类"的问题 → 启动时就失败了
```

---

## 八、总结

| 知识点 | 核心要点 |
|--------|---------|
| 类生命周期 | 加载→验证→准备→解析→初始化→使用→卸载；验证确保安全，准备赋零值，初始化执行 `<clinit>()` |
| 初始化时机 | 6 种主动引用触发；子类引用父类静态字段不初始化子类，编译时常量不触发初始化 |
| 双亲委派 | Bootstrap→Platform→App 逐级委托；`loadClass()` 实现；保护核心类不被篡改 |
| 打破1：SPI | 线程上下文类加载器——让 Bootstrap 能"向下"借用 AppCL；JDBC Driver 加载的经典案例 |
| 打破2：Tomcat | 倒转委托顺序——先自己加载再向上；实现多 WebApp 隔离和同 jar 多版本并存 |
| 自定义类加载器 | 正确姿势：只重写 `findClass()`；错误姿势：重写 `loadClass()` 破坏双亲委派 |
| 类卸载 | 三个条件同时满足；只有自定义 ClassLoader 加载的类才能被卸载 |
| JDK 9+ 变化 | Extension→Platform；模块化增加强封装；启动时验证模块依赖 |

**打破双亲委派的三种方式**：
1. **SPI 式（被动绕过）**：线程上下文类加载器——父借子力
2. **Tomcat 式（主动倒转）**：重写 `loadClass()` 改变委托顺序——先子后父
3. **自定义 ClassLoader 式（破坏）**：parent 设为 null，自己全权负责（慎用）

下一篇将进入 **JVM 调优实战**——从常用参数配置到内存泄漏排查（jstat/jmap/jstack/MAT），从 OOM 场景定位（堆/元空间/直接内存/线程过多）到 CPU 飙高问题排查，以及 Arthas 的实战使用。

---

## 参考

- [The Java Virtual Machine Specification, Java SE 17 Edition — Chapter 5: Loading, Linking, and Initializing](https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-5.html)
- [JEP 261: Module System (Project Jigsaw)](https://openjdk.org/jeps/261)
- [Apache Tomcat Class Loader How-To](https://tomcat.apache.org/tomcat-10.1-doc/class-loader-howto.html)
- [ServiceLoader (Java Platform SE 17)](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/ServiceLoader.html)
- [JavaGuide — 类加载详解](https://javaguide.cn/java/jvm/class-loading-process.html)
