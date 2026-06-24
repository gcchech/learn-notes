---
title: I/O 流
icon: file-import
order: 9
category:
  - Java
  - 基础
tag:
  - IO
  - NIO
  - 装饰器模式
  - 文件操作
---

# Java I/O 流：从字节流到 NIO

> 📖 I/O 是 Java 程序与外部世界交互的通道——文件读写、网络通信、管道传输，底层都是 I/O。Java 的 I/O 体系庞大但设计精巧，最妙的是它对**装饰器模式**的经典运用。

---

## 一、I/O 流体系总览

### 1.1 分类维度

Java I/O 按两个维度分类：

```
             字节流（以 byte 为单位）      字符流（以 char 为单位）
           ┌─────────────────────┐  ┌────────────────────────┐
输入       │ InputStream         │  │ Reader                 │
           │  └ FileInputStream  │  │  └ FileReader          │
           │  └ ByteArrayInput.. │  │  └ BufferedReader ★    │
           │  └ BufferedInput..  │  │  └ InputStreamReader    │
           │  └ ObjectInput..    │  │                        │
           └─────────────────────┘  └────────────────────────┘
输出       │ OutputStream        │  │ Writer                 │
           │  └ FileOutputStream │  │  └ FileWriter          │
           │  └ ByteArrayOutput..│  │  └ BufferedWriter      │
           │  └ BufferedOutput.. │  │  └ PrintWriter         │
           │  └ ObjectOutput..   │  │  └ OutputStreamWriter  │
           │  └ PrintStream      │  │                        │
           └─────────────────────┘  └────────────────────────┘
```

> 🎯 **记忆口诀**：Stream = 字节，Reader/Writer = 字符。

### 1.2 字节流 vs 字符流

```java
// 字节流——处理二进制数据（图片、视频、压缩包）
try (FileInputStream fis = new FileInputStream("image.png")) {
    byte[] buffer = new byte[1024];
    int bytesRead;
    while ((bytesRead = fis.read(buffer)) != -1) {
        // 处理 buffer[0..bytesRead-1]
    }
}

// 字符流——处理文本数据（.txt、.json、.xml）
try (BufferedReader reader = new BufferedReader(new FileReader("data.txt"))) {
    String line;
    while ((line = reader.readLine()) != null) {
        System.out.println(line);
    }
}
```

---

## 二、⭐️ 装饰器模式——I/O 设计的精髓

### 2.1 什么是装饰器模式？

Java I/O 的设计是装饰器模式的教科书级实现。核心思想：**不修改原有类，而是嵌套包装来增强功能**。

```java
// ① 基础组件——直接读文件（每次读一个字节，很慢）
InputStream fileInput = new FileInputStream("data.bin");

// ② 装饰一层——加缓冲（减少系统调用，快很多）
InputStream bufferedInput = new BufferedInputStream(fileInput);

// ③ 再装饰一层——加数据读取能力
DataInputStream dataInput = new DataInputStream(bufferedInput);

// ④ 最终效果——可以高效地按 int、double 等类型读取
int value = dataInput.readInt();
double price = dataInput.readDouble();

// 这三层装饰形成了嵌套结构：
// DataInputStream → BufferedInputStream → FileInputStream → 文件
```

### 2.2 嵌套组合的力量

```java
// 字节流 + 缓冲 + 按行读字符
BufferedReader reader = new BufferedReader(
    new InputStreamReader(         // ③ 字节 → 字符（桥接器）
        new BufferedInputStream(   // ② 加缓冲
            new FileInputStream("test.txt")  // ① 读文件
        ),
        StandardCharsets.UTF_8    // 指定编码
    )
);

// 等价于更常用的简化写法：
BufferedReader reader = new BufferedReader(new FileReader("test.txt"));
// FileReader 内部就是 FileInputStream + 默认编码
```

### 2.3 装饰器 vs 继承

如果用继承来实现同样的功能，会有无数种排列组合：

```
// 装饰器模式：3 个功能（缓冲 + 数据读取 + 文件输入）= 3 个类
//   FileInputStream + BufferedInputStream + DataInputStream

// 继承方案：需要创建 2³ = 8 个类！
//   FileInputStream、BufferedFileInputStream、DataFileInputStream、
//   BufferedDataFileInputStream、ByteArrayInputStream、BufferedByteArray……
//   每种功能组合 × 每种数据源都需要一个独立的类 — 类的爆炸
```

---

## 三、字符流与编码

`InputStreamReader` 是字节流到字符流的**桥梁**——它把字节按指定编码解码为字符：

```java
// 读取 GBK 编码的文件
try (BufferedReader reader = new BufferedReader(
        new InputStreamReader(
            new FileInputStream("gbk-file.txt"),
            Charset.forName("GBK")  // 指定编码
        ))) {
    String line = reader.readLine();
}

// JDK 11+ 可以直接用 Files
String content = Files.readString(Path.of("test.txt"), StandardCharsets.UTF_8);
```

### 字节流和字符流的"桥梁"类

```
字节 → 字符（输入）：InputStreamReader
字符 → 字节（输出）：OutputStreamWriter

// 这两个类属于"适配器模式"——连接两套不兼容的接口体系
```

---

## 四、NIO 基础

### 4.1 NIO 的三个核心组件

| 组件 | 角色 | 比喻 |
|------|------|------|
| **Buffer** | 数据容器（一块内存区域） | 卡车——装载数据 |
| **Channel** | 数据传输通道（双向） | 高速公路——数据流动的管道 |
| **Selector** | 多路复用器，一个线程管理多个 Channel | 调度中心——监控多个通道的状态 |

### 4.2 Buffer 的三种模式

```java
// Buffer 有三个关键属性：capacity、position、limit
ByteBuffer buffer = ByteBuffer.allocate(1024);  // capacity = 1024

// 写模式
buffer.put("hello".getBytes());  // position 移动
buffer.putInt(42);

// 切换到读模式——flip()
buffer.flip();  // limit = position, position = 0

// 读取数据
byte[] bytes = new byte[buffer.limit()];
buffer.get(bytes);
System.out.println(new String(bytes));  // hello + 42 的二进制

// 清空——切换到写模式
buffer.clear();  // position = 0, limit = capacity（旧数据还在但会被覆盖）
```

```
Buffer 状态转换：

[写模式]               flip()              [读模式]
position 随写入前进  ──────────▶   position=0, limit=原position
                     ◀──────────
                      clear()/compact()
```

### 4.3 Channel 的双向特性

```java
// 传统 IO 的 InputStream/OutputStream 是单向的
// NIO 的 Channel 是双向的（可读可写）

try (FileChannel channel = FileChannel.open(
         Path.of("data.bin"),
         StandardOpenOption.READ,
         StandardOpenOption.WRITE)) {

    ByteBuffer buffer = ByteBuffer.allocate(1024);

    // 读
    int bytesRead = channel.read(buffer);
    buffer.flip();

    // 写
    channel.write(buffer, 0);  // 写到文件指定位置
}
```

### 4.4 BIO vs NIO

| 维度 | BIO（传统 IO） | NIO（New IO） |
|------|---------------|--------------|
| 数据单位 | Stream（流） | Buffer + Channel |
| 方向 | 单向（InputStream / OutputStream） | **双向**（Channel 可读可写） |
| 阻塞 | 阻塞（read() 一直等到有数据） | 非阻塞（Selector 多路复用） |
| 适用场景 | 连接数少、数据量大 | **连接数多**（如聊天服务器、IoT） |
| 性能 | 连接多时线程爆炸 | 一个线程管理上千连接 |

---

## 五、Path 与 Files 工具类（JDK 7+）

JDK 7 引入了 `java.nio.file.Path` 和 `java.nio.file.Files`，极大简化了文件操作：

```java
Path path = Path.of("/home/user/docs/readme.txt");

// 文件信息
Files.exists(path);            // 是否存在
Files.size(path);              // 文件大小
Files.isDirectory(path);       // 是否是目录
Files.getLastModifiedTime(path);

// 一次性读取/写入
String content = Files.readString(path);  // JDK 11+
List<String> lines = Files.readAllLines(path);
Files.writeString(path, "Hello, World!");  // JDK 11+

// 复制/移动/删除
Files.copy(src, dest, StandardCopyOption.REPLACE_EXISTING);
Files.move(src, dest);
Files.delete(path);            // 文件不存在会抛异常
Files.deleteIfExists(path);    // 更安全

// 遍历目录
try (Stream<Path> stream = Files.walk(Path.of("/home/user"), 2)) {  // 深度=2
    stream.filter(Files::isRegularFile)
          .forEach(System.out::println);
}

// 创建目录
Files.createDirectories(Path.of("/a/b/c"));  // 自动创建所有不存在的父目录
```

**Path vs File**：

```java
// 旧方式（JDK 6 及以前）
File file = new File("/home/user/test.txt");
if (file.exists()) { /* ... */ }

// 新方式（JDK 7+）
Path path = Path.of("/home/user/test.txt");
if (Files.exists(path)) { /* ... */ }

// Path 的优势：更清晰的 API、更好的异常消息、支持符号链接、与 NIO 无缝集成
```

---

## 六、总结

| 知识点 | 核心要点 |
|--------|---------|
| IO 分类 | 字节流（Stream）= 二进制；字符流（Reader/Writer）= 文本 |
| 装饰器模式 | I/O 系统的核心设计——嵌套包装增强功能，避免类爆炸 |
| InputStreamReader | 字节 → 字符的桥梁（适配器模式），可指定编码 |
| Buffer | NIO 数据容器，三种模式转换：写 → flip() → 读 → clear() |
| Channel | 双向通道，替代单向 Stream |
| Path/Files | JDK 7+ 推荐的现代文件操作 API，替代 java.io.File |

下一篇我们将进入 **序列化**——Serializable 接口、transient 关键字、serialVersionUID 的作用，以及为什么现代应用更倾向于用 JSON 替代 Java 原生序列化。

---

## 参考

- [Java I/O Tutorial](https://docs.oracle.com/javase/tutorial/essential/io/)
- [Java NIO Package](https://docs.oracle.com/javase/8/docs/api/java/nio/package-summary.html)
- [JavaGuide - IO](https://javaguide.cn/java/basis/java-basic-questions-01.html)
