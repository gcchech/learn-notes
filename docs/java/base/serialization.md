---
title: 序列化
icon: download
order: 10
category:
  - Java
  - 基础
tag:
  - 序列化
  - Serializable
  - transient
  - JSON
---

# Java 序列化：从 Serializable 到 JSON

> 📖 序列化是分布式系统的基石——它让对象可以跨网络传输、持久化到磁盘、在进程间共享。Java 原生序列化曾经是唯一选择，但在 2026 年的今天，JSON/Protobuf 等跨语言方案已经成为主流。理解序列化的原理和陷阱，能帮你在架构选型时做出正确判断。

---

## 一、什么是序列化？

```
序列化（Serialization）    = 对象 → 字节序列
反序列化（Deserialization）= 字节序列 → 对象

用途：
  ┌──────────┐   序列化    ┌──────────┐   网络传输   ┌──────────┐
  │ JVM 进程A │ ─────────▶ │ 字节序列   │ ─────────▶ │ JVM 进程B │
  │  对象     │            │ 010010…   │            │  对象     │
  └──────────┘             └──────────┘            └──────────┘
```

典型应用场景：
- **RPC 调用**：Dubbo、gRPC 通过网络传输参数和返回值
- **消息队列**：Kafka、RocketMQ 传输消息体
- **缓存存储**：Redis 存储 Session 对象
- **深克隆**：通过序列化+反序列化实现对象的完整拷贝

---

## 二、Java 原生序列化

### 2.1 Serializable 接口

Java 原生序列化只需实现一个标记接口——`Serializable`：

```java
public class User implements Serializable {
    private static final long serialVersionUID = 1L;  // ⚠️ 强烈建议显式定义

    private String name;
    private int age;
    // getter/setter/构造器省略
}

// 序列化
User user = new User("张三", 18);
try (ObjectOutputStream oos = new ObjectOutputStream(
        new FileOutputStream("user.ser"))) {
    oos.writeObject(user);
}

// 反序列化
try (ObjectInputStream ois = new ObjectInputStream(
        new FileInputStream("user.ser"))) {
    User restored = (User) ois.readObject();
    System.out.println(restored.getName());  // 张三
}
```

### 2.2 ⭐️ serialVersionUID ——版本兼容的守护神

`serialVersionUID` 是序列化版本号。反序列化时，JVM 会对比字节流中的 `serialVersionUID` 和本地类的 `serialVersionUID`——如果不一致，抛出 `InvalidClassException`：

```java
// 场景：序列化时的 User 类
public class User implements Serializable {
    private static final long serialVersionUID = 1L;
    private String name;
    private int age;
}

// 场景：半年后，User 类新增了字段
public class User implements Serializable {
    private static final long serialVersionUID = 1L;  // 保持不变
    private String name;
    private int age;
    private String email;  // 🆕 新增字段——反序列化时 email 为 null，不会报错
}
```

| serialVersionUID 场景 | 行为 |
|----------------------|------|
| 不定义 | JVM 根据类结构自动生成（字段变了就变 → 不兼容） |
| 定义且不变 | 兼容（旧数据新增字段为 null/默认值，删除字段被忽略） |
| 定义但改了 | 不兼容（抛 InvalidClassException） |

> 🎯 **最佳实践**：所有 `Serializable` 类**必须显式定义 `serialVersionUID`**。默认生成的值对类结构极其敏感（类名、字段、方法签名都会影响），一旦细微改动就不兼容。

### 2.3 transient——让我隐身

`transient` 关键字让特定字段**不参与序列化**：

```java
public class User implements Serializable {
    private static final long serialVersionUID = 1L;

    private String name;
    private transient String password;  // 密码不序列化——安全！
    private transient int cachedHash;   // 缓存值不序列化——可以重新计算

    // 反序列化后 password 为 null，cachedHash 为 0
}
```

**典型 transient 场景**：
- 敏感信息（密码、Token、密钥）
- 缓存/衍生字段（可重新计算）
- 与系统资源相关的字段（数据库连接、文件句柄）
- `static` 字段本身就不参与序列化（属于类，不属于对象）

### 2.4 自定义序列化——writeObject/readObject

如果默认序列化不够用，可以定义自己的序列化逻辑：

```java
public class SafeUser implements Serializable {
    private static final long serialVersionUID = 1L;

    private String name;
    private transient String password;
    private transient char[] passwordHash;  // 存哈希而非明文

    // 自定义序列化
    private void writeObject(ObjectOutputStream out) throws IOException {
        out.defaultWriteObject();           // 先做默认序列化
        out.writeObject(hash(password));    // 只存密码哈希
    }

    // 自定义反序列化
    private void readObject(ObjectInputStream in) throws IOException, ClassNotFoundException {
        in.defaultReadObject();             // 先做默认反序列化
        this.passwordHash = (char[]) in.readObject();
        // password 保持 null
    }

    private static char[] hash(String password) {
        // 实际项目中用 BCrypt 等算法
        return password.toCharArray();
    }
}
```

> 💡 `writeObject`/`readObject` 方法必须是 `private`——JVM 通过反射调用它们，private 防止子类重写破坏序列化逻辑。

---

## 三、Java 原生序列化的缺陷

### 3.1 安全漏洞——史上最著名的反序列化攻击

Java 原生序列化有一个致命问题：**反序列化时会调用 `readObject()`**，攻击者可以构造恶意字节流在反序列化时执行任意代码：

```java
// 2015 年的 Apache Commons Collections 反序列化漏洞
// 影响了 WebLogic、JBoss、Jenkins、WebSphere 等几乎所有 Java 中间件
//
// 攻击原理：
// 1. 攻击者构造一个精心设计的 Commons Collections 对象链
// 2. 序列化后发给目标服务（如通过 HTTP 参数）
// 3. 目标服务反序列化时触发链式调用 → 远程代码执行
//
// 影响：等同于控制服务器
```

**防御措施**（JDK 9+）：

```java
// 使用反序列化过滤器（JDK 9+）
ObjectInputFilter filter = ObjectInputFilter.Config.createFilter(
    "com.example.model.*;!*"  // 只允许 com.example.model 包下的类
);
ObjectInputFilter.Config.setSerialFilter(filter);

// 或者用 jdk.serialFilter 系统属性
// -Djdk.serialFilter=com.example.model.*;!*
```

### 3.2 其他缺陷总结

| 缺陷 | 说明 |
|------|------|
| 不可读 | 序列化结果是二进制，无法人工查看和调试 |
| Java 专属 | 跨语言调用不可能（Go/Python/JS 无法反序列化） |
| 性能差 | 比 JSON/Protobuf 慢，体积大 |
| 版本脆弱 | 不兼容的类变更导致反序列化失败 |
| 安全风险 | 反序列化漏洞历史上造成了无数次安全事故 |

---

## 四、现代替代方案

### 4.1 方案对比

| 方案 | 格式 | 可读性 | 跨语言 | 性能 | 适用场景 |
|------|------|--------|--------|------|---------|
| **Jackson/Gson** | JSON 文本 | ✅ 高 | ✅ | 中 | REST API、配置文件 |
| **Protobuf** | 二进制 | ❌ | ✅ | **高** | gRPC、高性能 RPC |
| **MessagePack** | 二进制 | ❌ | ✅ | 高 | 替代 JSON 做缓存 |
| **Java 原生** | 二进制 | ❌ | ❌ | 中 | 遗留系统、深克隆 |

### 4.2 Jackson——事实标准的 JSON 方案

```java
import com.fasterxml.jackson.databind.ObjectMapper;

// 序列化
ObjectMapper mapper = new ObjectMapper();
User user = new User("张三", 18);
String json = mapper.writeValueAsString(user);
// {"name":"张三","age":18}

// 反序列化
User restored = mapper.readValue(json, User.class);
```

**Jackson 的泛型处理**（结合反射篇的 TypeReference）：

```java
// 反序列化泛型集合
String json = "[{\"name\":\"张三\",\"age\":18}, {\"name\":\"李四\",\"age\":20}]";

// ❌ 这样无法得到正确的泛型类型
List<User> list = mapper.readValue(json, List.class);
// list 中的元素实际上是 LinkedHashMap，不是 User！

// ✅ 正确方式——利用匿名内部类的泛型信息
List<User> list = mapper.readValue(json, new TypeReference<List<User>>() {});
```

### 4.3 深克隆的现代实现

```java
// 传统方式——通过序列化深克隆（慢，且要求 Serializable）
public static <T extends Serializable> T deepClone(T obj) {
    try (ByteArrayOutputStream bos = new ByteArrayOutputStream();
         ObjectOutputStream oos = new ObjectOutputStream(bos)) {
        oos.writeObject(obj);
        try (ObjectInputStream ois = new ObjectInputStream(
                 new ByteArrayInputStream(bos.toByteArray()))) {
            return (T) ois.readObject();
        }
    } catch (Exception e) {
        throw new RuntimeException(e);
    }
}

// ✅ 推荐方式——用 Jackson 序列化+反序列化
public static <T> T deepClone(T obj, Class<T> clazz) {
    ObjectMapper mapper = new ObjectMapper();
    try {
        String json = mapper.writeValueAsString(obj);
        return mapper.readValue(json, clazz);
    } catch (Exception e) {
        throw new RuntimeException(e);
    }
}
```

---

## 五、总结

| 知识点 | 核心要点 |
|--------|---------|
| 序列化本质 | 对象 → 字节序列 → 跨网络/持久化/跨进程 |
| Serializable | 标记接口，使用 `ObjectOutputStream`/`ObjectInputStream` |
| serialVersionUID | **必须显式定义**，保证版本兼容 |
| transient | 标记不参与序列化的字段（密码、缓存、资源引用） |
| 安全风险 | 反序列化漏洞历史影响巨大，JDK 9+ 支持过滤器 |
| 现代替代 | JSON（Jackson/Gson）用于 REST，Protobuf 用于高性能 RPC |

至此，Java SE 基础的核心模块全部结束。从下一篇起，我们将进入 **Java 集合框架**——ArrayList 扩容机制、HashMap 1.7 vs 1.8 的源码分析、ConcurrentHashMap 的线程安全设计。

---

## 参考

- [Java Object Serialization Specification](https://docs.oracle.com/javase/8/docs/platform/serialization/spec/serialTOC.html)
- [OWASP - Deserialization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html)
- [Jackson Documentation](https://github.com/FasterXML/jackson-docs)
- [JavaGuide - 序列化](https://javaguide.cn/java/basis/java-basic-questions-01.html)
