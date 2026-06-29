---
title: Maven & Gradle 构建工具
icon: hammer
order: 1
category:
  - 开发工具
tag:
  - Maven
  - Gradle
  - 构建工具
  - 依赖管理
  - POM
---

# Maven & Gradle 构建工具

> 📖 从手动下载 jar 包到构建工具的自动化管理，是 Java 开发效率的一次飞跃。Maven 用"约定优于配置"的理念统一了项目结构、依赖管理和构建生命周期；Gradle 在此基础上通过增量构建和构建缓存实现了更快的构建速度。本文以 Maven 为主，涵盖坐标、生命周期、POM 配置、依赖传递与冲突解决，再用 Gradle 做对比——帮你理清两个工具的差异和选择场景。

---

## 一、为什么需要构建工具？

```
手动管理 jar 的时代（上古痛点）：

  1. 下载 spring-context.jar → 发现它依赖 spring-core.jar
  2. 下载 spring-core.jar → 发现它依赖 commons-logging.jar
  3. 下载 commons-logging.jar → 发现版本冲突...
  4. 重复 N 次 → JAR HELL！

构建工具的解决方案：
  ┌──────────────────────────────────────────────────┐
  │  Maven / Gradle                                  │
  │  ├─ 依赖管理：声明一个坐标，自动下载依赖+传递依赖   │
  │  ├─ 构建自动化：编译→测试→打包→部署 一条命令      │
  │  ├─ 项目标准化：统一目录结构（约定优于配置）        │
  │  └─ 依赖冲突解决：自动处理版本冲突                  │
  └──────────────────────────────────────────────────┘
```

---

## 二、Maven 核心概念

### 2.1 Maven 坐标 —— 唯一定位一个构件

Maven 用三要素（GAV）来唯一标识一个构件：

```xml
<groupId>org.springframework.boot</groupId>        <!-- 组织/项目组 -->
<artifactId>spring-boot-starter-web</artifactId>   <!-- 模块名 -->
<version>3.2.0</version>                           <!-- 版本号 -->
<!-- 完整坐标：org.springframework.boot:spring-boot-starter-web:3.2.0 -->
```

```
坐标命名约定：
  groupId：   公司域名的反写（cn.hutool、org.mybatis、com.alibaba）
              → org.springframework → Spring 官方项目
              → com.github.pagehelper → 社区项目

  artifactId：模块/项目的名字，小写+中划线
              → spring-boot-starter-web
              → mybatis-spring-boot-starter

  version：   语义化版本号（MAJOR.MINOR.PATCH）
              → 3.2.0：主版本.次版本.修订版本
              → SNAPSHOT：快照版（开发中）
              → RELEASE / M1 / RC1：里程碑/发布候选版
```

### 2.2 标准目录结构 —— 约定优于配置

```
Maven 标准项目结构（所有 Maven 项目都长这样）：

project-root/
├── pom.xml                          ← 项目对象模型（核心配置文件）
├── src/
│   ├── main/
│   │   ├── java/                    ← 业务代码
│   │   │   └── com/example/
│   │   ├── resources/               ← 配置文件（classpath 根路径）
│   │   │   ├── application.yml
│   │   │   └── logback.xml
│   │   └── filters/                 ← 资源过滤
│   └── test/
│       ├── java/                    ← 测试代码
│       └── resources/               ← 测试配置
└── target/                          ← 构建输出（编译后的 class、jar 包等）
```

### 2.3 Maven 生命周期

Maven 定义了三个独立的生命周期（每个生命周期包含多个阶段 phase）：

```
Clean 生命周期：       Default 生命周期：              Site 生命周期：
  pre-clean              validate（验证项目正确性）       pre-site
  clean ← 最常用         compile（编译源代码）           site
  post-clean             test（运行测试）                post-site
                         package（打包成 jar/war）       site-deploy
                         verify（验证测试结果）
                         install（安装到本地仓库）
                         deploy（部署到远程仓库）
```

```bash
# 常用命令 —— 每个命令对应生命周期的一个阶段
mvn clean                # 清理 target 目录
mvn compile              # 编译源代码
mvn test                 # 运行单元测试（编译+测试）
mvn package              # 打包（编译+测试+打包）
mvn install              # 安装到本地仓库
mvn clean install        # 先清理再构建→本地仓库

# 关键理解：
# mvn test → 会依次执行 validate → compile → test 三个阶段
# mvn package → 会依次执行 validate → compile → test → package
# 每个阶段会先自动执行它之前的阶段
```

### 2.4 插件（Plugin）与目标（Goal）

生命周期只是定义了阶段，具体的构建任务由**插件**完成：

```
phase（生命周期阶段） vs plugin goal（插件目标）

  compile 阶段 → 由 maven-compiler-plugin 的 compile 目标执行
  test 阶段    → 由 maven-surefire-plugin 的 test 目标执行
  package 阶段 → 由 maven-jar-plugin 的 jar 目标执行

绑定关系：
  ┌─────────┐   ┌──────────────────┐
  │ compile  │──▶│ compiler:compile  │
  ├─────────┤   ├──────────────────┤
  │  test    │──▶│ surefire:test     │
  ├─────────┤   ├──────────────────┤
  │ package  │──▶│ jar:jar / war:war │
  └─────────┘   └──────────────────┘
```

```xml
<!-- pom.xml 中配置插件 -->
<build>
    <plugins>
        <!-- 指定 JDK 版本 -->
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-compiler-plugin</artifactId>
            <version>3.11.0</version>
            <configuration>
                <source>17</source>
                <target>17</target>
                <encoding>UTF-8</encoding>
            </configuration>
        </plugin>
        <!-- 打包时包含源码 -->
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-source-plugin</artifactId>
            <version>3.3.0</version>
            <executions>
                <execution>
                    <phase>package</phase>
                    <goals><goal>jar</goal></goals>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
```

---

## 三、POM 文件详解

### 3.1 POM 基本结构

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <!-- 坐标 -->
    <groupId>com.example</groupId>
    <artifactId>my-app</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>  <!-- jar / war / pom -->

    <!-- 属性：统一管理版本号 -->
    <properties>
        <java.version>17</java.version>
        <spring-boot.version>3.2.0</spring-boot.version>
    </properties>

    <!-- 依赖 -->
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
            <!-- 版本由父 POM 的 dependencyManagement 管理 -->
        </dependency>
    </dependencies>

    <!-- 构建配置 -->
    <build>
        <plugins><!-- ... --></plugins>
    </build>
</project>
```

### 3.2 依赖管理 —— dependencyManagement

```xml
<!-- 父 POM 中：声明依赖版本（不引入！） -->
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
            <version>3.2.0</version>
        </dependency>
        <dependency>
            <groupId>com.google.guava</groupId>
            <artifactId>guava</artifactId>
            <version>33.0.0-jre</version>
        </dependency>
    </dependencies>
</dependencyManagement>

<!-- 子模块中：只管引入，不用写版本 -->
<dependencies>
    <dependency>
        <groupId>com.google.guava</groupId>
        <artifactId>guava</artifactId>
        <!-- version 继承自父 POM → 统一管理 -->
    </dependency>
</dependencies>
```

```
dependencyManagement 的作用：
  → 不是引入依赖，而是声明版本
  → 子模块引用时不需要写 version → 从父 POM 继承
  → 一键升级所有模块的某个依赖版本
  → 同一个项目中，所有子模块的 guava 版本一致
```

### 3.3 scope —— 依赖的作用域

| scope | 编译 | 测试 | 运行时 | 打包 | 典型用途 |
|-------|:---:|:---:|:---:|:---:|------|
| **compile**（默认） | ✅ | ✅ | ✅ | ✅ | Spring、Guava、Logback |
| **provided** | ✅ | ✅ | ❌ | ❌ | Servlet API、Lombok |
| **runtime** | ❌ | ✅ | ✅ | ✅ | JDBC 驱动、SLF4J 实现 |
| **test** | ❌ | ✅ | ❌ | ❌ | JUnit、Mockito、H2 |
| **system** | ✅ | ✅ | ✅ | ❌ | ⚠️ 已废弃，不推荐使用 |
| **import** | — | — | — | — | 导入 dependencyManagement（BOM） |

```xml
<!-- scope 典型用法 -->
<dependencies>
    <!-- compile：全局可用 -->
    <dependency>
        <groupId>com.google.guava</groupId>
        <artifactId>guava</artifactId>
    </dependency>

    <!-- provided：容器/运行时提供，不打包进 war -->
    <dependency>
        <groupId>javax.servlet</groupId>
        <artifactId>javax.servlet-api</artifactId>
        <scope>provided</scope>
        <!-- Tomcat 自带 servlet-api，打包进去会冲突 -->
    </dependency>

    <!-- runtime：编译不需要，运行时需要（SPI 经典场景） -->
    <dependency>
        <groupId>mysql</groupId>
        <artifactId>mysql-connector-java</artifactId>
        <scope>runtime</scope>
    </dependency>

    <!-- test：仅测试可用 -->
    <dependency>
        <groupId>org.junit.jupiter</groupId>
        <artifactId>junit-jupiter</artifactId>
        <scope>test</scope>
    </dependency>

    <!-- import：导入 BOM（Bill of Materials）-->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-dependencies</artifactId>
        <version>3.2.0</version>
        <type>pom</type>
        <scope>import</scope>
    </dependency>
</dependencies>
```

---

## 四、依赖传递与冲突解决

### 4.1 依赖传递的三个原则

```
① 最短路径优先
   A → B → C → D (v1.0)     ← D 的距离 = 3
   A → E → D (v2.0)         ← D 的距离 = 2（更短！）
   → 最终使用 D v2.0

② 第一声明优先（路径长度相同时）
   A → B → D (v1.0)         ← 在 pom.xml 中先声明 B
   A → C → D (v2.0)         ← 在 pom.xml 中后声明 C
   → 最终使用 D v1.0（先声明的优先）

③ 覆盖优先
   直接在当前模块声明 D v3.0 → 无论传递的是什么版本，全部覆盖
```

### 4.2 依赖冲突调试

```bash
# 查看依赖树（排查冲突的利器）
mvn dependency:tree

# 输出示例：
# com.example:my-app:jar:1.0.0
# +- org.springframework.boot:spring-boot-starter-web:jar:3.2.0:compile
# |  +- org.springframework.boot:spring-boot-starter-tomcat:jar:3.2.0:compile
# |  |  \- org.apache.tomcat.embed:tomcat-embed-core:jar:10.1.16:compile
# ...
# \- com.google.guava:guava:jar:33.0.0-jre:compile (omitted for conflict with 32.1.0-jre)
#                                                    ↑ 冲突说明：版本被覆盖了

# 查找某个依赖从哪里引入
mvn dependency:tree -Dincludes=com.google.guava:guava
# 只显示 guava 的依赖路径
```

### 4.3 排除与可选依赖

```xml
<!-- 排除传递依赖 -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <exclusions>
        <!-- 排除默认的 Tomcat，改用 Jetty -->
        <exclusion>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-tomcat</artifactId>
        </exclusion>
        <!-- 排除有漏洞的旧版日志 -->
        <exclusion>
            <groupId>commons-logging</groupId>
            <artifactId>commons-logging</artifactId>
        </exclusion>
    </exclusions>
</dependency>

<!-- optional：这个依赖不向下传递 -->
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>  <!-- 用到这个模块的项目需要手动引入 lombok -->
</dependency>
```

---

## 五、多模块项目

```xml
<!-- 父 POM（packaging = pom）—— 聚合+统一管理 -->
<!-- my-project/pom.xml -->
<groupId>com.example</groupId>
<artifactId>my-project</artifactId>
<version>1.0.0</version>
<packaging>pom</packaging>

<modules>
    <module>common</module>      <!-- 公共模块 -->
    <module>service</module>     <!-- 业务服务 -->
    <module>web</module>         <!-- Web 层 -->
</modules>

<dependencyManagement>
    <!-- 统一版本管理 -->
</dependencyManagement>

<!-- 子模块 POM —— 声明 parent -->
<!-- my-project/web/pom.xml -->
<parent>
    <groupId>com.example</groupId>
    <artifactId>my-project</artifactId>
    <version>1.0.0</version>
    <relativePath>../pom.xml</relativePath>
</parent>

<artifactId>web</artifactId>
<!-- groupId 和 version 继承自 parent → 可以省略 -->

<dependencies>
    <dependency>
        <groupId>com.example</groupId>
        <artifactId>common</artifactId>  <!-- 内部模块依赖，version 由父 POM 管理 -->
    </dependency>
</dependencies>
```

```bash
# 多模块构建
mvn clean install    # 在根目录执行 → 按依赖顺序构建所有子模块

mvn clean install -pl web -am
# -pl web：只构建 web 模块
# -am (also-make)：同时构建 web 的依赖模块（common/service）

mvn clean install -pl web -amd
# -amd (also-make-dependents)：同时构建依赖 web 的模块

mvn clean install -T 4
# -T 4：4 个线程并行构建（加快速度）
```

---

## 六、Gradle —— Maven 的现代替代

### 6.1 Gradle vs Maven

| 维度 | Maven | Gradle |
|------|-------|--------|
| 构建脚本 | XML（POM） | Groovy DSL / **Kotlin DSL** |
| 性能 | 普通 | 增量构建 + 构建缓存 + 守护进程 → **更快** |
| 灵活性 | 插件机制固定，定制困难 | 脚本化 → 任意定制 |
| 学习曲线 | 低（XML 大家都会） | 中（需要学 DSL 和 Task 模型） |
| 社区生态 | 最大（几乎所有开源项目用 Maven） | 大（Android 官方、Spring 官方已迁移） |
| 约定优于配置 | 严格（几乎改不了） | 灵活（可覆盖几乎所有默认值） |

### 6.2 Gradle 核心概念

```kotlin
// build.gradle.kts（Kotlin DSL — 推荐写法）
plugins {
    id("java")
    id("org.springframework.boot") version "3.2.0"
    id("io.spring.dependency-management") version "1.1.4"
}

group = "com.example"
version = "1.0.0"

java {
    sourceCompatibility = JavaVersion.VERSION_17
}

repositories {
    mavenCentral()  // 或 maven { url = uri("https://...") }
}

dependencies {
    // 语法：implementation/compileOnly/runtimeOnly/testImplementation + "group:artifact:version"
    implementation("org.springframework.boot:spring-boot-starter-web")
    compileOnly("org.projectlombok:lombok")
    runtimeOnly("com.mysql:mysql-connector-j")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

tasks.withType<Test> {
    useJUnitPlatform()
}
```

### 6.3 Gradle 依赖配置

| Gradle 配置 | Maven scope 等价 | 说明 |
|-------------|:---:|------|
| `implementation` | compile | **推荐！** 依赖不泄露给消费者（编译时更快） |
| `api` | compile | 依赖暴露给消费者（常用库的模块用 api） |
| `compileOnly` | provided | 编译时需要，不打包 |
| `runtimeOnly` | runtime | 运行时需要 |
| `testImplementation` | test | 测试时需要 |

```
implementation vs api（Gradle 独有的"编译避让"优化）：

  模块 A 使用 implementation 依赖 B
  → 模块 C 依赖 A → C 编译时看不到 B → 编译更快
  → A 的 B 版本变化时，不需要重新编译 C

  模块 A 使用 api 依赖 B
  → 模块 C 依赖 A → C 编译时能看到 B → B 成为 A 的公开 API 的一部分
  → B 的版本变化 → C 也需要重新编译

  ★ 默认用 implementation，只有"依赖的类型出现在公开方法签名中"时才用 api
```

### 6.4 Gradle Task 模型

```kotlin
// Gradle 没有 Maven 那样的固定生命周期，而是用 Task（任务）组成的 DAG（有向无环图）
tasks.register("hello") {
    doLast {
        println("Hello, Gradle!")
    }
}

task("build") {
    dependsOn("compile", "test")  // build 依赖 compile 和 test
}

// 查看所有任务
// gradle tasks

// 常用命令
// gradle build        → 编译+测试+打包
// gradle test         → 运行测试
// gradle clean        → 清理
// gradle bootRun      → 启动 Spring Boot（需要 Spring Boot 插件）
```

### 6.5 Gradle Wrapper

```bash
# Gradle 自带 Wrapper —— 不需要全局安装 Gradle
# 项目根目录下：
./gradlew build        # Linux/Mac
gradlew.bat build      # Windows

# gradle-wrapper.properties 指定 Gradle 版本：
# distributionUrl=https\://services.gradle.org/distributions/gradle-8.5-bin.zip
# → 团队成员用统一版本，CI 环境也是 → 告别"我本地能跑"的问题
```

---

## 七、Maven 常用技巧

### 7.1 跳过测试

```bash
mvn clean install -DskipTests       # 不执行测试（但编译测试代码）
mvn clean install -Dmaven.test.skip=true  # 不编译测试代码（更快）
```

### 7.2 离线模式

```bash
mvn -o clean install  # 离线模式——不从远程仓库下载（依赖已全部在本地时使用）
```

### 7.3 查看有效 POM

```bash
# 合并了父 POM、settings.xml 后的最终 POM
mvn help:effective-pom
# 有时候配置不生效 → 看有效 POM 能查出原因
```

### 7.4 settings.xml —— 全局配置

```xml
<!-- ~/.m2/settings.xml（用户级）或 MAVEN_HOME/conf/settings.xml（全局级）-->
<settings>
    <!-- 镜像：加速下载 -->
    <mirrors>
        <mirror>
            <id>aliyun</id>
            <mirrorOf>central</mirrorOf>
            <url>https://maven.aliyun.com/repository/public</url>
        </mirror>
    </mirrors>

    <!-- 私服认证 -->
    <servers>
        <server>
            <id>my-repo</id>
            <username>admin</username>
            <password>${env.MAVEN_PASSWORD}</password>  <!-- 支持环境变量 -->
        </server>
    </servers>

    <!-- 全局 profiles -->
    <profiles>
        <profile>
            <id>jdk17</id>
            <activation>
                <activeByDefault>true</activeByDefault>
            </activation>
            <properties>
                <maven.compiler.source>17</maven.compiler.source>
                <maven.compiler.target>17</maven.compiler.target>
            </properties>
        </profile>
    </profiles>
</settings>
```

---

## 八、总结

| 维度 | 核心要点 |
|------|---------|
| **Maven 坐标** | GAV（groupId+artifactId+version）三要素唯一定位构件 |
| **生命周期** | Clean / Default / Site 三个独立周期；`mvn clean install` |
| **scope** | compile(默认)/provided(容器提供)/runtime(运行)/test(测试)/import(BOM) |
| **依赖冲突** | 最短路径优先 → 第一声明优先 → 直接声明覆盖；`mvn dependency:tree` 排查 |
| **dependencyManagement** | 父 POM 统一声明版本，子模块免写版本号 |
| **exclusions** | 排除不想要的传递依赖（如排除默认 Tomcat 换 Jetty） |
| **optional** | 不向下传递——Lombok 的典型用法 |
| **Gradle** | 增量构建+构建缓存 → 更快；Kotlin DSL；implementation vs api |
| **选型** | 新项目：传统组织用 Maven，追求速度和新特性用 Gradle；Android：Gradle |

**Maven vs Gradle 选择建议**：
- 如果你的团队对 XML 熟悉、不想学新 DSL → **Maven**（社区最大、资料最多）
- 如果构建速度是痛点、需要高度定制、或做 Android → **Gradle**
- Spring Boot 官方已迁移到 Gradle（但其 start.spring.io 两者都支持）

下一篇将进入 **Git 高效使用指南**——从核心对象模型到分支策略，从 merge/rebase 到实用的 git hooks。

---

## 参考

- [Apache Maven — Official Documentation](https://maven.apache.org/guides/index.html)
- [Gradle — User Manual](https://docs.gradle.org/current/userguide/userguide.html)
- [Maven Central Repository](https://central.sonatype.com/)
- [Spring Boot — Build Tool Plugins](https://docs.spring.io/spring-boot/docs/3.2.x/reference/html/build-tool-plugins.html)
