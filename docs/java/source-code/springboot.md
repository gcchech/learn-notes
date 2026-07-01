---
title: Spring Boot 自动配置源码解析
icon: rocket
order: 6
category:
  - Java
  - 源码解析
tag:
  - Spring Boot
  - 自动配置
  - SpringBootApplication
  - EnableAutoConfiguration
  - spring.factories
  - Conditional
  - 内嵌 Tomcat
  - 启动流程
---

# Spring Boot 自动配置源码解析：从启动到自动装配的全链路

> 📖 "约定大于配置"是 Spring Boot 的核心理念，而**自动配置（Auto-Configuration）**是其最精妙的技术实现。你只需引入一个 starter 依赖，框架就能自动配置好 DataSource、JdbcTemplate、TransactionManager……这一切是如何发生的？本文从 `@SpringBootApplication` 的三合一注解组合出发，逐层剖析 `@EnableAutoConfiguration` 的加载机制、`spring.factories` 与 `AutoConfiguration.imports` 的注册发现、`@Conditional` 的条件装配原理、`SpringApplication.run()` 的完整启动流程，以及内嵌 Tomcat 的创建与启动。

---

## 一、⭐️ @SpringBootApplication —— 一个注解，三个功能

```java
// @SpringBootApplication 的定义
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Inherited

@SpringBootConfiguration              // ① = @Configuration
@EnableAutoConfiguration              // ② ★ 自动配置的核心
@ComponentScan(                       // ③ 组件扫描
    excludeFilters = {
        @Filter(type = FilterType.CUSTOM,
                classes = TypeExcludeFilter.class),
        @Filter(type = FilterType.CUSTOM,
                classes = AutoConfigurationExcludeFilter.class)
    }
)
public @interface SpringBootApplication {

    // 排除特定的自动配置类
    @AliasFor(annotation = EnableAutoConfiguration.class)
    Class<?>[] exclude() default {};

    // 排除特定的自动配置类名
    @AliasFor(annotation = EnableAutoConfiguration.class)
    String[] excludeName() default {};

    // 扫描的基础包
    @AliasFor(annotation = ComponentScan.class, attribute = "basePackages")
    String[] scanBasePackages() default {};
}
```

**三合一解析**：

| 注解 | 作用 | 等价于 |
|------|------|--------|
| `@SpringBootConfiguration` | 标识该类为配置类 | `@Configuration`（Spring 标准注解） |
| `@EnableAutoConfiguration` | **触发自动配置** | 核心：通过 `@Import` 导入 `AutoConfigurationImportSelector` |
| `@ComponentScan` | 扫描当前包及子包的组件 | Spring 标准注解，但排除了自动配置类 |

---

## 二、⭐️⭐️ @EnableAutoConfiguration —— 自动配置的入口

### 2.1 注解定义

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Inherited

@AutoConfigurationPackage               // ① 注册自动配置包（用于 JPA Entity 扫描等）
@Import(AutoConfigurationImportSelector.class)  // ② ★★★ 核心：通过 @Import 导入选择器
public @interface EnableAutoConfiguration {
}
```

### 2.2 AutoConfigurationImportSelector —— 自动配置类的加载器

```java
// AutoConfigurationImportSelector.java
// 实现了 DeferredImportSelector 接口
// 特点：在所有 @Configuration 类处理完毕后才执行（保证用户自定义 Bean 优先注册）

@Override
public String[] selectImports(AnnotationMetadata annotationMetadata) {
    if (!isEnabled(annotationMetadata)) {
        return NO_IMPORTS;  // 自动配置被禁用（spring.boot.enableautoconfiguration=false）
    }

    // ① ★ 获取 AutoConfigurationEntry（所有需要导入的自动配置类）
    AutoConfigurationEntry autoConfigurationEntry =
            getAutoConfigurationEntry(annotationMetadata);

    // ② 返回配置类全限定名数组（这些类会被 @Import 机制导入到 IoC 容器中）
    return StringUtils.toStringArray(autoConfigurationEntry.getConfigurations());
}

protected AutoConfigurationEntry getAutoConfigurationEntry(
        AnnotationMetadata annotationMetadata) {

    // ① ★ 从 spring.factories 或 .imports 文件中读取所有候选的自动配置类
    List<String> configurations =
            getCandidateConfigurations(annotationMetadata, attributes);

    // ② ★ 去重
    configurations = removeDuplicates(configurations);

    // ③ ★ 排除用户指定的配置类（exclude / excludeName 属性）
    Set<String> exclusions = getExclusions(annotationMetadata, attributes);
    configurations.removeAll(exclusions);

    // ④ ★ 过滤：保留满足 @Conditional 条件的配置类
    configurations = filter(configurations, autoConfigurationMetadata);

    // ⑤ 触发 AutoConfigurationImportEvent（供 Actuator 等监听）
    fireAutoConfigurationImportEvents(configurations, exclusions);

    return new AutoConfigurationEntry(configurations, exclusions);
}
```

---

## 三、⭐️⭐️ spring.factories 与 AutoConfiguration.imports —— 配置发现机制

### 3.1 Spring Boot 2.x —— spring.factories

Spring Boot 2.x 使用 `META-INF/spring.factories` 文件来声明自动配置类：

```properties
# META-INF/spring.factories（Spring Boot 2.x 的配置发现方式）

org.springframework.boot.autoconfigure.EnableAutoConfiguration=\
org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,\
org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration,\
org.springframework.boot.autoconfigure.web.servlet.WebMvcAutoConfiguration,\
org.springframework.boot.autoconfigure.web.embedded.EmbeddedWebServerFactoryCustomizerAutoConfiguration,\
...

# spring.factories 中还可以声明其他类型的扩展点：
# ApplicationContextInitializer
# ApplicationListener
# EnvironmentPostProcessor
# FailureAnalyzer
# ...
```

### 3.2 Spring Boot 3.x —— AutoConfiguration.imports

Spring Boot 3.x 改用了更规范的 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`：

```
# META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
# 每行一个自动配置类的全限定名（Spring Boot 3.x 新方式）

org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration
org.springframework.boot.autoconfigure.jdbc.JdbcTemplateAutoConfiguration
org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration
...
```

### 3.3 加载源码分析

```java
// SpringFactoriesLoader.java（Spring Boot 核心类）
// 负责加载 spring.factories 或 .imports 文件中声明的类

// Spring Boot 2.x 的方式：
public static List<String> loadFactoryNames(
        Class<?> factoryType, @Nullable ClassLoader classLoader) {

    // ① 遍历所有 jar 包中的 META-INF/spring.factories 文件
    // ② 找到 key = factoryType.getName() 的值
    // ③ 返回所有匹配的类名列表
    // ④ ★ 这意味着：第三方 starter 只要在自己的 jar 中提供 spring.factories
    //       就能被 Spring Boot 自动发现！
}

// Spring Boot 3.x 的方式：
// ImportCandidates.load(AutoConfiguration.class, classLoader)
// ① 遍历所有 jar 包中的 META-INF/spring/...AutoConfiguration.imports 文件
// ② 读取所有行（排除注释和空行）
// ③ 返回全限定类名列表
```

---

## 四、⭐️⭐️ @Conditional —— 条件装配的精髓

有了候选的自动配置类列表，Spring Boot 还需要判断：**这个配置类在当前环境中是否应该生效？**

### 4.1 @Conditional 注解体系

```java
// Spring @Conditional 基础接口
public interface Condition {
    // 返回 true → Bean 生效；false → 跳过
    boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata);
}

// Spring Boot 扩展了丰富的 @Conditional 派生注解：

@ConditionalOnClass           // ★ classpath 中存在指定类时才生效
@ConditionalOnMissingClass    // classpath 中不存在指定类时才生效
@ConditionalOnBean            // ★ IoC 容器中存在指定 Bean 时才生效
@ConditionalOnMissingBean     // ★ IoC 容器中不存在指定 Bean 时才生效
@ConditionalOnProperty        // ★ 配置文件中有指定属性时才生效
@ConditionalOnResource        // classpath 中存在指定资源文件时才生效
@ConditionalOnWebApplication  // ★ 是 Web 应用时才生效
@ConditionalOnExpression      // SpEL 表达式结果为 true 时才生效
@ConditionalOnJava            // Java 版本满足条件时才生效
@ConditionalOnSingleCandidate // 指定类型只有一个候选 Bean 时才生效
```

### 4.2 经典案例：DataSourceAutoConfiguration 的条件装配

```java
// DataSourceAutoConfiguration.java（简化）
@AutoConfiguration                    // Spring Boot 3.x 新增注解（= @Configuration）
@ConditionalOnClass({                 // ★ classpath 中有 DataSource 类 和 EmbeddedDatabaseType 类
    DataSource.class,
    EmbeddedDatabaseType.class
})
@EnableConfigurationProperties(       // 绑定 spring.datasource.* 配置属性
    DataSourceProperties.class
)
@Import({
    DataSourcePoolMetadataProvidersConfiguration.class,
    DataSourceCheckpointRestoreConfiguration.class
})
public class DataSourceAutoConfiguration {

    // ★ 内嵌数据库（H2/HSQL/Derby）配置
    @Configuration
    @ConditionalOnProperty(          // ★ 只在 spring.sql.init.enabled = true 时生效
        prefix = "spring.sql.init",
        name = "enabled",
        havingValue = "true",
        matchIfMissing = true
    )
    static class EmbeddedDatabaseConfiguration {
        // 创建内嵌 DataSource
    }

    // ★ 连接池配置
    @Configuration
    @ConditionalOnMissingBean({DataSource.class, XADataSource.class})
    @ConditionalOnProperty(name = "spring.datasource.type")
    static class PooledDataSourceConfiguration {
        @Bean
        DataSource dataSource(DataSourceProperties properties) {
            // 使用 HikariCP（默认）创建 DataSource
            return properties.initializeDataSourceBuilder()
                              .type(HikariDataSource.class)
                              .build();
        }
    }
}
```

### 4.3 条件注解的实现原理

```java
// SpringBootCondition —— 所有 Spring Boot 条件注解的基类
public abstract class SpringBootCondition implements Condition {

    @Override
    public final boolean matches(ConditionContext context,
            AnnotatedTypeMetadata metadata) {

        // ① 获取条件注解的元数据
        //    例如：@ConditionalOnClass(name = "com.mysql.cj.jdbc.Driver")
        //    → className = "com.mysql.cj.jdbc.Driver"

        // ② ★ 调用子类的 getMatchOutcome() 方法
        //    例如：OnClassCondition 会检查 classpath 中是否有该类
        ConditionOutcome outcome = getMatchOutcome(context, metadata);

        // ③ 记录条件评估日志（供 ConditionEvaluationReport 使用）
        //    这是 Actuator /autoconfig 端点能看到哪个条件匹配/不匹配的原因
        if (!outcome.isMatch()) {
            // 记录不匹配的详细信息：哪个条件、为什么不匹配
            ConditionEvaluationReport report =
                ConditionEvaluationReport.find(context.getBeanFactory());
            report.recordConditionEvaluation(metadata, outcome);
        }

        return outcome.isMatch();
    }
}

// OnClassCondition.getMatchOutcome() —— 最常用的条件检查
// 检查 classpath 中是否存在指定的类
ConditionOutcome getMatchOutcome(ConditionContext context,
        AnnotatedTypeMetadata metadata) {

    // ① 读取 @ConditionalOnClass 的属性 → 获取类名列表
    // ② 遍历每个类名，用 Class.forName() 尝试加载
    // ③ 全部加载成功 → match；任何一个加载失败 → no match
    // ★ 注意：这里不会实际初始化类，只是加载（通过 ClassLoader.loadClass()）
}
```

---

## 五、⭐️⭐️⭐️ SpringApplication.run() —— 启动流程剖析

### 5.1 启动的完整 12 步

```java
// SpringApplication.run()
public ConfigurableApplicationContext run(String... args) {
    long startTime = System.currentTimeMillis();

    // ① 创建 BootstrapContext（Spring Boot 3.x 新增）
    DefaultBootstrapContext bootstrapContext = createBootstrapContext();

    // ② ★ 设置 java.awt.headless 系统属性
    configureHeadlessProperty();

    // ③ ★ 获取 SpringApplicationRunListeners
    //    通过 spring.factories 机制加载
    //    默认：EventPublishingRunListener（发布事件）
    SpringApplicationRunListeners listeners = getRunListeners(args);
    listeners.starting(bootstrapContext);

    try {
        // ④ ★ 准备环境（Environment）
        //    解析命令行参数、系统属性、环境变量、配置文件（application.yml）
        ApplicationArguments applicationArguments =
                new DefaultApplicationArguments(args);
        ConfigurableEnvironment environment =
                prepareEnvironment(listeners, bootstrapContext, applicationArguments);
        // ⑤ 配置需要忽略的 BeanInfo
        configureIgnoreBeanInfo(environment);

        // ⑥ ★ 打印 Banner（那个大大的 Spring 字符画）
        Banner printedBanner = printBanner(environment);

        // ⑦ ★★★ 创建 ApplicationContext
        //    根据 webApplicationType 决定：
        //    - SERVLET → AnnotationConfigServletWebServerApplicationContext
        //    - REACTIVE → AnnotationConfigReactiveWebServerApplicationContext
        //    - NONE → AnnotationConfigApplicationContext
        context = createApplicationContext();
        context.setApplicationStartup(this.applicationStartup);

        // ⑧ ★ 准备 ApplicationContext
        //    a. 注册主配置类（@SpringBootApplication 标注的类）
        //    b. 执行所有的 ApplicationContextInitializer
        //    c. 加载所有的 Bean（自动配置在此生效）
        prepareContext(bootstrapContext, context, environment,
                listeners, applicationArguments, printedBanner);

        // ⑨ ★★★ 刷新 ApplicationContext
        //    这是 Spring 的 AbstractApplicationContext.refresh()
        //    所有的 Bean 在此阶段创建、自动配置在此阶段生效
        //    内嵌 Tomcat 在此阶段启动（onRefresh() 中）
        refreshContext(context);

        // ⑩ 刷新后处理（模板方法，默认为空）
        afterRefresh(context, applicationArguments);

        // ⑪ 记录启动耗时
        Duration timeTakenToStartup = Duration.ofMillis(
                System.currentTimeMillis() - startTime);

        // ⑫ ★ 发布 ApplicationStartedEvent
        listeners.started(context, timeTakenToStartup);

        // ⑬ ★ 调用 CommandLineRunner 和 ApplicationRunner
        callRunners(context, applicationArguments);

        // ⑭ 发布 ApplicationReadyEvent（应用完全就绪）
        listeners.ready(context, timeTakenToReady);

    } catch (Throwable ex) {
        // 启动失败 → 发布 ApplicationFailedEvent
        handleRunFailure(context, ex, listeners);
        throw new IllegalStateException(ex);
    }

    return context;
}
```

### 5.2 Web 应用类型推断

```java
// SpringApplication.deduceWebApplicationType()
private WebApplicationType deduceWebApplicationType() {
    // ① 如果 classpath 中有 DispatcherServlet → SERVLET
    //    （org.springframework.web.servlet.DispatcherServlet）
    if (ClassUtils.isPresent(DISPATCHER_SERVLET_CLASS, null)
            && !ClassUtils.isPresent(DISPATCHER_HANDLER_CLASS, null)) {
        return WebApplicationType.SERVLET;      // ★ 最常见：Spring MVC
    }

    // ② 如果有 DispatcherHandler 但没有 DispatcherServlet → REACTIVE
    if (ClassUtils.isPresent(DISPATCHER_HANDLER_CLASS, null)
            && !ClassUtils.isPresent(DISPATCHER_SERVLET_CLASS, null)) {
        return WebApplicationType.REACTIVE;     // Spring WebFlux
    }

    // ③ 都没有 → NONE（普通 Java 应用）
    return WebApplicationType.NONE;
}
```

---

## 六、⭐️ 内嵌 Tomcat 的创建与启动

### 6.1 ServletWebServerApplicationContext —— 创建内嵌 Web 服务器

```java
// ServletWebServerApplicationContext.onRefresh()
// ★ 这是 Spring Boot 创建内嵌 Tomcat 的关键时机
@Override
protected void onRefresh() {
    super.onRefresh();
    try {
        // ★ 创建 Web 服务器（Tomcat / Jetty / Undertow）
        createWebServer();
    } catch (Throwable ex) {
        throw new ApplicationContextException(
                "Unable to start web server", ex);
    }
}

private void createWebServer() {
    WebServer webServer = this.webServer;
    ServletContext servletContext = getServletContext();

    if (webServer == null && servletContext == null) {
        // ① ★ 获取 ServletWebServerFactory
        //    默认：TomcatServletWebServerFactory
        ServletWebServerFactory factory = getWebServerFactory();

        // ② ★ 通过工厂创建 Web 服务器
        //    内部：new Tomcat() → 设置端口、Context Path → 调用 tomcat.start()
        this.webServer = factory.getWebServer(getSelfInitializer());
    } else if (servletContext != null) {
        // 外部 Servlet 容器 → 调用 onStartup
        getSelfInitializer().onStartup(servletContext);
    }
}
```

### 6.2 TomcatServletWebServerFactory —— 创建并启动 Tomcat

```java
// TomcatServletWebServerFactory.getWebServer()
@Override
public WebServer getWebServer(ServletContextInitializer... initializers) {
    // ① ★ 创建 Tomcat 实例
    Tomcat tomcat = new Tomcat();

    // ② 设置基础目录（默认：系统临时目录/tomcat.xxx）
    File baseDir = (this.baseDirectory != null)
            ? this.baseDirectory
            : createTempDir("tomcat");
    tomcat.setBaseDir(baseDir.getAbsolutePath());

    // ③ ★ 创建 Connector（默认监听 server.port = 8080）
    //    默认协议：org.apache.coyote.http11.Http11NioProtocol（NIO 模式）
    Connector connector = new Connector(this.protocol);
    connector.setThrowOnFailure(true);
    tomcat.getService().addConnector(connector);
    customizeConnector(connector);  // 应用 server.port、server.max-threads 等配置

    // ④ 创建 Engine 和 Host（Tomcat 内部容器层次结构）
    Engine engine = new StandardEngine();
    Host host = new StandardHost();
    host.setAutoDeploy(false);
    engine.setDefaultHost(host);
    tomcat.getEngine().setName(host.getName());

    // ⑤ ★ 创建 Context（对应一个 Web 应用）
    //    Context Path 默认为 ""（ROOT），可通过 server.servlet.context-path 修改
    prepareContext(tomcat.getHost(), initializers);

    // ⑥ ★★★ 启动 Tomcat → 返回 TomcatWebServer
    return getTomcatWebServer(tomcat);
}

protected TomcatWebServer getTomcatWebServer(Tomcat tomcat) {
    // ★ 启动 Tomcat：调用 tomcat.start()
    //    → 启动 Connector（绑定端口、启动接收线程）
    //    → 启动 Engine → Host → Context
    return new TomcatWebServer(tomcat, getPort() >= 0);
}
```

### 6.3 Tomcat 的类加载与线程模型

```
内嵌 Tomcat 的请求处理：

网络线程（Acceptor）：
  监听端口，接收 TCP 连接
    │
    ▼
IO 线程（Poller）：
  NIO Selector 检测就绪事件
    │
    ▼
工作线程（Worker Thread，默认 200 个）：
  从线程池中取出，处理请求
  → 进入 Servlet Filter Chain
  → 进入 DispatcherServlet.doDispatch()
  → 调用 Controller 方法
```

---

## 七、⭐️ 自定义 Starter —— 理解自动配置的最佳实践

理解 Spring Boot 自动配置原理后，自定义一个 Starter 是最好的验证方式。以下是最小化的实现步骤：

### 7.1 项目结构

```
my-spring-boot-starter/
├── pom.xml
└── src/main/java/com/example/starter/
    ├── MyService.java                    # 核心业务类
    ├── MyProperties.java                 # 配置属性类
    └── MyAutoConfiguration.java          # ★ 自动配置类
└── src/main/resources/
    └── META-INF/
        └── spring/
            └── org.springframework.boot.autoconfigure.AutoConfiguration.imports
                # (Spring Boot 3.x) 内容：com.example.starter.MyAutoConfiguration
```

### 7.2 自动配置类

```java
@AutoConfiguration // = @Configuration（Spring Boot 3.x）
@EnableConfigurationProperties(MyProperties.class)
@ConditionalOnClass(MyService.class)       // 核心类存在时生效
@ConditionalOnProperty(
    prefix = "my.starter",
    name = "enabled",
    havingValue = "true",
    matchIfMissing = true                  // 默认生效
)
public class MyAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean              // ★ 用户自定义 Bean 优先
    public MyService myService(MyProperties properties) {
        return new MyService(properties);
    }
}
```

---

## 八、Spring Boot 启动诊断工具

### 8.1 自动配置报告

```bash
# ① application.yml 中开启 debug 模式，查看详细的自动配置报告
# application.yml
debug: true

# 启动时会打印类似以下信息：
# ============================
# CONDITIONS EVALUATION REPORT
# ============================
#
# Positive matches:
# -----------------
#    DataSourceAutoConfiguration matched:
#       - @ConditionalOnClass found required class 'javax.sql.DataSource'
#       - @ConditionalOnProperty (spring.datasource.url) matched
#
# Negative matches:
# -----------------
#    RabbitAutoConfiguration did not match:
#       - @ConditionalOnClass did not find required class
#         'com.rabbitmq.client.Channel'
```

### 8.2 Actuator 端点

```yaml
# 启用 Actuator 后，可以访问以下端点：
management:
  endpoints:
    web:
      exposure:
        include: beans,conditions,configprops,env,health,info

# GET /actuator/conditions  → 查看所有自动配置的条件评估结果
# GET /actuator/beans       → 查看所有注册的 Bean
# GET /actuator/configprops → 查看所有 @ConfigurationProperties
# GET /actuator/env         → 查看 Environment 中的属性
```

---

## 九、总结

| 概念 | 一句话总结 |
|------|-----------|
| **@SpringBootApplication** | `@Configuration` + `@EnableAutoConfiguration` + `@ComponentScan` 的三合一 |
| **@EnableAutoConfiguration** | 通过 `@Import(AutoConfigurationImportSelector.class)` 触发自动配置 |
| **配置发现** | Spring Boot 2.x → `spring.factories`；Spring Boot 3.x → `AutoConfiguration.imports` |
| **条件装配** | `@ConditionalOnClass`/`@ConditionalOnBean`/`@ConditionalOnProperty` 等，决定配置是否生效 |
| **启动流程** | `SpringApplication.run()` 的 12+ 步骤（环境准备 → Context 创建 → refresh → 内嵌服务器启动） |
| **内嵌 Tomcat** | `ServletWebServerApplicationContext.onRefresh()` → `TomcatServletWebServerFactory` → `tomcat.start()` |
| **配置优先级** | 用户自定义 Bean（`@ConditionalOnMissingBean`）> 自动配置默认 Bean |

**Spring Boot 3.x 主要变更**：

| 变更点 | 2.x | 3.x |
|-------|-----|-----|
| Java 基线 | Java 8 | Java 17 |
| 配置发现 | `META-INF/spring.factories` | `META-INF/spring/...AutoConfiguration.imports` |
| @Configuration | `@Configuration` | `@AutoConfiguration`（新注解，语义更明确） |
| Jakarta EE | `javax.*` | `jakarta.*` |
| 观察性 | Spring Boot Actuator | Micrometer + Observation API |

---

## 参考

- [Spring Boot 官方文档](https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/)
- Spring Boot 2.x / 3.x 源码：`org.springframework.boot.autoconfigure` 包
- 《Spring Boot 编程思想（核心篇）》—— 小马哥（mercyblitz）
- 《Spring 实战（第 6 版）》—— Craig Walls
