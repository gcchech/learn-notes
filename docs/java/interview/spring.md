---
title: Spring 面试高频题
icon: leaf
order: 5
category:
  - Java
  - 面试宝典
tag:
  - Spring
  - IoC
  - AOP
  - 事务
  - Bean
  - Spring Boot
---

# Spring 面试高频题

Spring 框架是 Java 后端开发的"标配"，IoC、AOP、事务管理、Bean 生命周期是面试中出现频率最高的知识点。以下 10 题覆盖了从容器原理到 Spring Boot 自动配置的高频考点。

---

## Q1: Spring IoC 容器的初始化流程是怎样的？⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: IoC 容器、Bean 生命周期、Spring 启动流程

> 面试官问："说说 Spring 的 IoC 容器是从哪一步开始加载 Bean 的？整个初始化过程分为几个阶段？"

### 核心回答

Spring IoC 容器的初始化流程可以概括为**三个大阶段**：

1. **Resource 定位**：找到配置文件（XML、注解、Java Config），加载为 `Resource` 对象。
2. **BeanDefinition 加载**：将 `Resource` 解析为 `BeanDefinition`（Bean 的元数据描述），注册到 `BeanDefinitionRegistry`。
3. **Bean 实例化**：根据 `BeanDefinition` 创建 Bean 实例，完成依赖注入和初始化。

以 `AbstractApplicationContext.refresh()` 方法为例，核心 12 步：

```
1. prepareRefresh()              → 准备上下文（设置启动时间、校验属性）
2. obtainFreshBeanFactory()      → 创建 BeanFactory，加载 BeanDefinition
3. prepareBeanFactory()          → 配置 BeanFactory（类加载器、后置处理器）
4. postProcessBeanFactory()      → 空方法，留给子类扩展
5. invokeBeanFactoryPostProcessors() → ⭐执行 BeanFactoryPostProcessor（可修改 BeanDefinition）
6. registerBeanPostProcessors()  → 注册 BeanPostProcessor
7. initMessageSource()           → 国际化
8. initApplicationEventMulticaster() → 事件广播器
9. onRefresh()                   → 子类扩展（Spring Boot 在这里启动 Tomcat）
10. registerListeners()          → 注册事件监听器
11. finishBeanFactoryInitialization() → ⭐实例化所有非懒加载的单例 Bean
12. finishRefresh()              → 发布 ContextRefreshedEvent
```

### 深度扩展

**BeanDefinition 包含哪些信息？**

| 属性 | 说明 |
|------|------|
| `beanClassName` | 全限定类名 |
| `scope` | singleton / prototype |
| `lazyInit` | 是否懒加载 |
| `dependsOn` | 依赖的 Bean 名称 |
| `initMethodName` / `destroyMethodName` | 初始化和销毁方法 |
| `propertyValues` | 属性值（用于属性注入） |
| `constructorArgumentValues` | 构造器参数 |

**BeanFactory vs ApplicationContext**：

| 对比 | BeanFactory | ApplicationContext |
|------|-------------|-------------------|
| 定位 | 底层 IoC 容器，提供基本 DI 能力 | 应用上下文，继承 BeanFactory |
| Bean 实例化 | 懒加载（首次 getBean 时才创建） | 预加载（容器启动时创建所有单例 Bean） |
| 附加功能 | 无 | 国际化、事件发布、资源加载、AOP |
| 内存占用 | 低（适合移动设备） | 较高 |

**为什么 Spring Boot 启动更快？**
Spring Boot 的 `SpringApplication.run()` 在 `onRefresh()` 阶段通过内嵌 Tomcat 启动 Web 容器，`finishBeanFactoryInitialization()` 阶段只实例化真正需要的 Bean（按需加载 + 自动配置条件注解过滤）。

### 面试追问

**Q**: `BeanFactoryPostProcessor` 和 `BeanPostProcessor` 有什么区别？
**A**: `BeanFactoryPostProcessor` 在 BeanDefinition 注册后、Bean 实例化前执行，可以修改 BeanDefinition 的元数据（如 `${}` 占位符替换）。`BeanPostProcessor` 在 Bean 实例化后、初始化前后执行，可以代理和增强 Bean（AOP 的核心）。

**Q**: Spring 启动过程中哪些步骤最容易出问题？
**A**: 第 5 步 `invokeBeanFactoryPostProcessors`（配置错误、依赖缺失）、第 11 步 `finishBeanFactoryInitialization`（循环依赖、Bean 创建失败）。

### 常见错误

- ❌ 混淆 `BeanFactoryPostProcessor` 和 `BeanPostProcessor` 的执行时机——前者在实例化前，后者在实例化后
- ❌ 认为 `ApplicationContext` 和 `BeanFactory` 是同一个东西——`ApplicationContext` 是 `BeanFactory` 的超集

### 一句话总结

> **IoC 容器初始化 = 定位资源 → 加载 BeanDefinition → 实例化 Bean。`refresh()` 方法 12 步是最经典的面试回答框架，其中第 5 步和第 11 步是核心。**

---

## Q2: Spring Bean 的生命周期是怎样的？⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: Bean 生命周期、Aware 接口、BeanPostProcessor

> 面试官问："一个 Spring Bean 从创建到销毁，中间经历了哪些步骤？"

### 核心回答

Spring Bean 的生命周期分为 **4 个阶段、12 个步骤**：

```
① 实例化阶段
  Bean 对象实例化 → 属性填充（依赖注入）

② 初始化前阶段
  执行 Aware 接口回调 → BeanPostProcessor.postProcessBeforeInitialization()

③ 初始化阶段
  @PostConstruct → InitializingBean.afterPropertiesSet() → init-method

④ 初始化后 & 销毁阶段
  BeanPostProcessor.postProcessAfterInitialization() → Bean 就绪
  → 容器关闭 → @PreDestroy → DisposableBean.destroy() → destroy-method
```

**完整流程（按顺序）**：

```
1. createBeanInstance()          → 实例化（构造器/工厂方法）
2. populateBean()                → 属性赋值 + 依赖注入（@Autowired）
3. setBeanName()                 → Aware: BeanNameAware
4. setBeanClassLoader()          → Aware: BeanClassLoaderAware
5. setBeanFactory()              → Aware: BeanFactoryAware
6. [AOP 代理开始] postProcessBeforeInitialization() → BeanPostProcessor 前置
7. @PostConstruct                → JSR-250 注解
8. afterPropertiesSet()          → InitializingBean 接口
9. init-method                   → XML/Bean注解 指定
10. postProcessAfterInitialization() → BeanPostProcessor 后置（AOP 代理在此生成）
11. Bean 就绪，可使用
12. 容器关闭 → @PreDestroy → destroy() → destroy-method
```

### 深度扩展

**为什么 AOP 代理在 `postProcessAfterInitialization` 生成？**

因为 AOP 需要在目标 Bean 完全初始化完成后才能创建代理对象——代理对象持有对原始目标 Bean 的引用。如果代理在初始化前生成，目标 Bean 的 `@PostConstruct` 和 `afterPropertiesSet()` 方法就不会在原始 Bean 上执行，而是在代理上执行，导致逻辑错误。

**三级 Aware 接口的区别**：

| Aware 接口 | 注入内容 | 使用场景 |
|------------|---------|---------|
| `BeanNameAware` | Bean 在容器中的名称 | 日志、调试 |
| `BeanFactoryAware` | 当前 BeanFactory | 需要手动获取其他 Bean |
| `ApplicationContextAware` | 当前 ApplicationContext | 获取上下文、发布事件 |

**循环依赖在生命周期中的解决时机**：

Spring 通过**三级缓存**在 `populateBean()` 阶段解决循环依赖——提前暴露了一个"半成品"（刚实例化、未填充属性的 Bean）的引用，缓存于 `singletonFactories`。

### 面试追问

**Q**: 为什么构造器注入的循环依赖无法解决？
**A**: 构造器注入时 Bean 还没有完成实例化（步骤 1 未完成），三级缓存中没有"半成品"可用，自然会失败。Spring 只能解决 Setter 注入的循环依赖（步骤 1 已完成，有半成品）。

**Q**: 如果 Bean 实现了多个 Aware 接口，执行顺序是什么？
**A**: `BeanNameAware` → `BeanClassLoaderAware` → `BeanFactoryAware` → `ApplicationContextAware`，按接口依赖层级递增。

### 常见错误

- ❌ 混淆 `@PostConstruct` 和 `postProcessBeforeInitialization` 的顺序——`@PostConstruct` 在 `postProcessBeforeInitialization` **之后**执行
- ❌ 认为 `@PostConstruct` 等同于 `init-method`——确实写在一起，但 `@PostConstruct` 通过 `CommonAnnotationBeanPostProcessor` 执行，优先级最高

### 一句话总结

> **Bean 生命周期：实例化 → 属性填充 → Aware → BeanPostProcessorBefore → @PostConstruct → afterPropertiesSet → init-method → BeanPostProcessorAfter（AOP代理）→ 就绪 → 销毁。**

---

## Q3: Spring AOP 的实现原理是什么？JDK 动态代理和 CGLIB 有什么区别？⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: AOP 原理、动态代理、CGLIB、AspectJ

> 面试官问："Spring AOP 底层是怎么实现的？什么时候用 JDK 动态代理，什么时候用 CGLIB？"

### 核心回答

Spring AOP 基于**动态代理**实现，运行时为目标 Bean 生成代理对象，将横切逻辑织入。

**两种代理方式的对比**：

| 对比维度 | JDK 动态代理 | CGLIB 代理 |
|---------|-------------|-----------|
| **机制** | 基于接口，生成接口实现类 | 基于继承，生成目标类子类 |
| **要求** | 必须实现接口 | 不能是 final 类 / final 方法 |
| **性能** | 反射调用，JDK 8+ 优化后与 CGLIB 持平 | 字节码增强，创建代理慢但运行快 |
| **默认** | Spring Boot 1.x 默认 | Spring Boot 2.x+ 默认 |

**选择策略（源码 `DefaultAopProxyFactory`）**：

```
if (target 实现了接口)  →  JDK 动态代理
else                    →  CGLIB 代理
```

如果目标对象实现了接口但想强制使用 CGLIB，配置 `@EnableAspectJAutoProxy(proxyTargetClass = true)` 或在 `application.properties` 中设置 `spring.aop.proxy-target-class=true`。

### 深度扩展

**JDK 动态代理核心源码**：

```java
// Proxy.newProxyInstance() 内部：
// 1. 调用 getProxyClass() 生成代理类的字节码（实现所有接口 + Proxy）
// 2. 通过 InvocationHandler.invoke() 路由所有方法调用

public interface InvocationHandler {
    Object invoke(Object proxy, Method method, Object[] args) throws Throwable;
}
```

**CGLIB 核心机制**：

```java
// CGLIB 使用 ASM 字节码框架直接操作 class 字节码：
// 1. 生成目标类子类的字节码
// 2. 重写所有非 final 方法，方法中调用 MethodInterceptor.intercept()
// 3. 通过 FastClass 机制加速方法调用（索引定位，而非反射遍历）

public interface MethodInterceptor {
    Object intercept(Object obj, Method method, Object[] args, MethodProxy proxy) throws Throwable;
}
```

**为什么 Spring Boot 2.x 默认用 CGLIB？**
- 不强制要求使用接口（简化开发）
- `MethodProxy`（FastClass 索引）比反射调用快
- 避免"注入的 Bean 与代理类型不一致"的问题（JDK 代理返回的是接口类型，注入时可能报错）

**AOP 的执行链：责任链模式**：

```
请求 → 环绕通知 (@Around)  →  前置通知 (@Before)
     → 目标方法
     → 后置通知 (@AfterReturning / @AfterThrowing)
     → 最终通知 (@After)
     → 环绕通知  →  返回结果
```

Spring 将每个通知封装为 `MethodInterceptor`，通过 `ReflectiveMethodInvocation.proceed()` 形成责任链依次调用。

### 面试追问

**Q**: Spring AOP 和 AspectJ 有什么区别？
**A**: Spring AOP 是**运行时动态代理**（切面逻辑在内存中动态生成），只支持方法级别的切面。AspectJ 是**编译时/加载时字节码织入**（修改 class 文件），功能更强（支持构造器、字段、静态方法切入），性能更好（无运行时开销），但需要特殊的编译工具（ajc）。

**Q**: 同一个方法内调用另一个增强方法，AOP 会生效吗？
**A**: 不会。因为 `this.methodB()` 走的是 `this` 引用（原始对象），而不是代理对象。解决方法：通过 `AopContext.currentProxy()` 获取代理对象调用，或注入自身。

### 常见错误

- ❌ 认为 JDK 动态代理不需要实现接口——JDK 代理**强制要求**接口
- ❌ final 类或 final 方法用 CGLIB——会报错，因为 CGLIB 无法继承 final 类
- ❌ 在 `@PostConstruct` 中调用被增强的方法——此时 AOP 代理可能还未生成

### 一句话总结

> **JDK 代理 = 接口 + InvocationHandler；CGLIB = 继承 + MethodInterceptor。Spring Boot 2.x 默认 CGLIB，AOP 核心是责任链模式的拦截器链。**

---

## Q4: Spring 事务的传播行为和实现原理是什么？⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: 事务传播、隔离级别、PlatformTransactionManager

> 面试官问："说说 Spring 事务的 7 种传播行为。`REQUIRED` 和 `REQUIRES_NEW` 有什么区别？"

### 核心回答

**7 种传播行为**：

| 传播行为 | 含义 | 记忆口诀 |
|---------|------|---------|
| **REQUIRED** (默认) | 当前有事务则加入，无则新建 | "必须有" |
| **REQUIRES_NEW** | 总是开启新事务，挂起当前事务 | "要新的" |
| **SUPPORTS** | 有事务则加入，无则不开启事务 | "随缘" |
| **NOT_SUPPORTED** | 以非事务方式运行，挂起当前事务 | "不要事务" |
| **MANDATORY** | 必须在事务中，无事务则抛异常 | "强制" |
| **NEVER** | 必须以非事务运行，有事务则抛异常 | "绝不" |
| **NESTED** | 有事务则创建嵌套事务（savepoint），无则同 REQUIRED | "嵌套" |

**核心对比**：

```
REQUIRED     →  加入外层事务，一起提交/回滚（荣辱与共）
REQUIRES_NEW →  独立事务，内层和外层互不影响（各自独立）
NESTED       →  嵌套事务，内层回滚不影响外层，外层回滚会回滚内层（子从父）
```

### 深度扩展

**Spring 事务底层实现**：

```java
// 核心接口
public interface PlatformTransactionManager {
    TransactionStatus getTransaction(TransactionDefinition definition) throws TransactionException;
    void commit(TransactionStatus status) throws TransactionException;
    void rollback(TransactionStatus status) throws TransactionException;
}

// 核心实现类
DataSourceTransactionManager   →  JDBC
JpaTransactionManager          →  JPA
HibernateTransactionManager    →  Hibernate
```

**事务执行流程**：

```
1. @Transactional 注解被 TransactionInterceptor 拦截
2. 根据传播行为判断：是否需要事务
3. 从 DataSource 获取连接，setAutoCommit(false)
4. 执行业务方法
5. 成功则 commit()，异常则 rollback()
6. 归还连接
```

**`@Transactional` 失效场景（高频考点）**：

| 失效场景 | 原因 | 解决方案 |
|---------|------|---------|
| 非 public 方法 | Spring AOP 只能代理 public 方法 | 改为 public 或使用 AspectJ |
| 同类方法调用 | `this.method()` 不走代理 | `AopContext.currentProxy()` 或注入自身 |
| 异常被 catch | 事务管理器感知不到异常 | 手动 `TransactionAspectSupport.currentTransactionStatus().setRollbackOnly()` |
| rollbackFor 不匹配 | 默认只回滚 RuntimeException 和 Error | 设置 `rollbackFor = Exception.class` |
| 数据库引擎不支持 | MyISAM 不支持事务 | 使用 InnoDB |

### 面试追问

**Q**: `REQUIRES_NEW` 场景：外层事务回滚，内层事务提交，会怎样？
**A**: 内层新事务独立于外层，内层提交了就不会再回滚。即使外层回滚，内层的数据已经持久化。

**Q**: `NESTED` 的实现原理是什么？
**A**: 基于 JDBC 的 `Savepoint` 机制。`conn.setSavepoint()` 创建一个还原点，内层回滚时执行 `conn.rollback(savepoint)`（只回滚到还原点），提交时释放还原点。如果数据库不支持 Savepoint（如部分 NoSQL），NESTED 退化为 REQUIRED。

### 常见错误

- ❌ 认为 `@Transactional` 标注在 Controller 上可以生效——通常建议放到 Service 层，因为一次请求可能调用多个 Service 方法
- ❌ 长事务——事务内做 RPC 调用可能导致事务超时、锁长时间不释放
- ❌ 忘记 `rollbackFor`——受检异常（Checked Exception）默认不回滚

### 一句话总结

> **REQUIRED 共用、REQUIRES_NEW 独立、NESTED 可部分回滚。事务底层 = AOP + PlatformTransactionManager + DataSource setAutoCommit。**

---

## Q5: Spring 如何解决循环依赖？三级缓存是什么？⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: 循环依赖、三级缓存、Bean 创建流程

> 面试官问："Spring 是怎么解决循环依赖的？讲讲三级缓存各自的作用。"

### 核心回答

Spring 通过**三级缓存**解决 Setter 注入的循环依赖：

```
一级缓存（singletonObjects）  →  完全初始化好的单例 Bean（成品）
二级缓存（earlySingletonObjects） →  提前暴露的半成品 Bean（已经过 AOP 代理）
三级缓存（singletonFactories）   →  生成半成品 Bean 的工厂（可返回原始对象或 AOP 代理）
```

**解决流程（A ↔ B 循环依赖）**：

```
1. 创建 A → 完成实例化 → 把 A 的 ObjectFactory 放入三级缓存
2. A.populateBean() → 发现需要注入 B → 去获取 B
3. 创建 B → 完成实例化 → B.populateBean() → 发现需要注入 A
4. B 从三级缓存拿到 A 的 ObjectFactory → 调用 getObject() → 得到 A 的半成品
5. B 中注入了 A 的引用（半成品） → B 完成初始化 → B 放入一级缓存
6. A 从一级缓存拿到完整的 B → 注入到 A → A 继续初始化 → A 放入一级缓存
```

### 深度扩展

**三级缓存源码结构**：

```java
// 一级缓存：成品
Map<String, Object> singletonObjects = new ConcurrentHashMap<>(256);

// 二级缓存：暴露的半成品（early reference）
Map<String, Object> earlySingletonObjects = new ConcurrentHashMap<>(16);

// 三级缓存：ObjectFactory（λ 表达式）
Map<String, ObjectFactory<?>> singletonFactories = new HashMap<>(16);
```

**为什么需要三级缓存？二级不够吗？**

如果只有二级缓存，`getSingleton()` 只能返回原始对象。但如果 A 需要 AOP 代理（被 `@Transactional` 标注），应该提前生成代理对象放入缓存，否则 B 注入的是原始对象，而容器最后返回的是代理对象——**同一个 Bean 的两个引用不一致**。

三级缓存的 `ObjectFactory.getObject()` 会调用 `getEarlyBeanReference()`：
- 如果 Bean 有 AOP 切面 → 提前生成代理 → 放入二级缓存
- 如果 Bean 没有 AOP → 直接返回原始对象

这样保证**无论是否循环依赖，容器返回的都是同一个引用**。

**解决不了的情况**：

| 情况 | 原因 |
|------|------|
| 构造器注入的循环依赖 | Bean 未完成实例化，三级缓存中没有半成品（`BeanCurrentlyInCreationException`） |
| prototype 作用域的循环依赖 | 不经过三级缓存，无法解决 |
| `@Async` 标注的循环依赖 | `@Async` 的代理在 `postProcessAfterInitialization` 生成，比提前暴露晚 |

### 面试追问

**Q**: 二级缓存能否省略？
**A**: 理论上可以，但需要每次从 `ObjectFactory.getObject()` 获取——`getEarlyBeanReference()` 可能多次调用，产生不一致的代理对象。二级缓存的作用是**缓存**提前暴露的对象，避免重复调用 `getEarlyBeanReference()`。

### 常见错误

- ❌ 说"Spring 能解决所有循环依赖"——构造器注入和 prototype 无法解决
- ❌ 混淆三级缓存的顺序——创建时：三级 → 二级 → 一级；获取时：一级 → 二级 → 三级

### 一句话总结

> **三级缓存 = 一级（成品） + 二级（半成品快照） + 三级（半成品工厂）。核心：提前暴露半成品引用，解决 Setter 注入的循环依赖。**

---

## Q6: Spring Boot 的自动配置原理是什么？⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: 自动配置、`@SpringBootApplication`、`spring.factories`、条件注解

> 面试官问："Spring Boot 的自动配置是怎么做到的？`@SpringBootApplication` 这个注解背后做了什么？"

### 核心回答

Spring Boot 的自动配置通过**三层机制**实现：

1. **`@EnableAutoConfiguration`**：通过 `@Import(AutoConfigurationImportSelector.class)` 加载自动配置类
2. **`spring.factories` → `spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`**：列出所有自动配置类（Spring Boot 3.x 改成了 `.imports` 文件）
3. **条件注解**：每个自动配置类使用 `@ConditionalOnClass`、`@ConditionalOnMissingBean` 等按需激活

**启动流程**：

```
@SpringBootApplication
  ├── @SpringBootConfiguration  →  @Configuration
  ├── @EnableAutoConfiguration  →  @Import(AutoConfigurationImportSelector.class)
  └── @ComponentScan            →  扫描当前包及子包

auto：
AutoConfigurationImportSelector.selectImports()
  → SpringFactoriesLoader.loadFactoryNames(EnableAutoConfiguration.class)
  → 从 spring-boot-autoconfigure.jar/META-INF/spring/...AutoConfiguration.imports 读取
  → 过滤（条件注解判断）
  → 加载条件满足的自动配置类
```

### 深度扩展

**条件注解大全**：

| 条件注解 | 条件 |
|---------|------|
| `@ConditionalOnClass` | classpath 中存在指定类 |
| `@ConditionalOnMissingClass` | classpath 中不存在指定类 |
| `@ConditionalOnBean` | 容器中存在指定 Bean |
| `@ConditionalOnMissingBean` | 容器中不存在指定 Bean |
| `@ConditionalOnProperty` | 配置文件中存在指定属性 |
| `@ConditionalOnWebApplication` | 是 Web 应用 |
| `@ConditionalOnExpression` | SpEL 表达式为 true |
| `@ConditionalOnJava` | JDK 版本满足条件 |

**以 DataSource 自动配置为例**：

```java
@AutoConfiguration
@ConditionalOnClass({ DataSource.class, EmbeddedDatabaseType.class })
@EnableConfigurationProperties(DataSourceProperties.class)
@Import({ DataSourcePoolMetadataProvidersConfiguration.class, ... })
public class DataSourceAutoConfiguration {

    @Configuration(proxyBeanMethods = false)
    @ConditionalOnMissingBean(DataSource.class)
    @ConditionalOnProperty(name = "spring.datasource.type")  // 配置指定了数据源类型
    static class Generic {
        @Bean
        DataSource dataSource(DataSourceProperties properties) {
            // 根据配置创建 DataSource（HikariCP 作为默认连接池）
            return properties.initializeDataSourceBuilder().build();
        }
    }
}
```

**Spring Boot 2.x → 3.x 变化**：

- 2.x：`META-INF/spring.factories` 中列出 `EnableAutoConfiguration` 的全限定类名
- 3.x：`META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`（每行一个全限定类名，更简洁）

### 面试追问

**Q**: 如何自定义一个 Starter？
**A**: 三步：① 写一个 `xxx-spring-boot-autoconfigure` 模块，包含 `XxxProperties`（`@ConfigurationProperties`）+ `XxxAutoConfiguration`（条件注解 + 创建 Bean）；② 在 `.imports` 文件中声明自动配置类；③ 写 `xxx-spring-boot-starter` 空模块引入 autoconfigure 和所需依赖。

**Q**: 如何关闭某个自动配置？
**A**: `@SpringBootApplication(exclude = DataSourceAutoConfiguration.class)` 或 `spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration`。

### 常见错误

- ❌ 认为 `@ComponentScan` 扫描了自动配置的包——自动配置类不在当前包下，靠 `@Import` 加载
- ❌ 自定义 Starter 中 `@ComponentScan` 扫描到自动配置——会被用户项目的 `@ComponentScan` 范围外忽略，必须用 `.imports` 声明

### 一句话总结

> **自动配置 = `@EnableAutoConfiguration` → `AutoConfigurationImportSelector` → `.imports` 文件 → 条件注解过滤。核心是约定优于配置。**

---

## Q7: Spring 用到了哪些设计模式？⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: 设计模式、Spring 架构理解

> 面试官问："Spring 框架中使用了哪些设计模式？各举一个例子。"

### 核心回答

| 设计模式 | Spring 中的应用 | 举例 |
|---------|---------------|------|
| **工厂方法** | `BeanFactory` / `ApplicationContext` | `getBean()` |
| **单例** | Bean 默认作用域 singleton | 通过容器的 `singletonObjects` Map 缓存 |
| **代理** | AOP | `JdkDynamicAopProxy` / `CglibAopProxy` |
| **模板方法** | `AbstractApplicationContext.refresh()` | 定义骨架，`postProcessBeanFactory()` 等留个子类 |
| **观察者** | ApplicationEvent / ApplicationListener | 事件广播机制 |
| **责任链** | AOP 拦截器链 | `ReflectiveMethodInvocation.proceed()` |
| **适配器** | `HandlerAdapter` | 适配不同 Controller 类型 |
| **策略** | `InstantiationStrategy` | Bean 实例化策略（反射 / CGLIB） |
| **装饰器** | `BeanWrapperImpl` | 包装 Bean 实例，提供统一属性访问 |

### 深度扩展

**模板方法模式在 `AbstractApplicationContext` 中**：

```java
public abstract class AbstractApplicationContext {
    public void refresh() {
        // 1. 准备刷新
        prepareRefresh();
        // 2. 获取 BeanFactory
        ConfigurableListableBeanFactory beanFactory = obtainFreshBeanFactory();
        // 3. 准备 BeanFactory
        prepareBeanFactory(beanFactory);
        // 4. 钩子：留给子类修改 BeanFactory
        postProcessBeanFactory(beanFactory);
        // 5. 执行 BeanFactoryPostProcessor
        invokeBeanFactoryPostProcessors(beanFactory);
        // ... 固定的步骤流程
        onRefresh();  // 钩子：Spring Boot 在这里启动 Tomcat
        // ...
    }
}
```

**适配器模式在 Spring MVC 中**：

```java
// HandlerAdapter 适配不同类型的 Controller
public interface HandlerAdapter {
    boolean supports(Object handler);  // 是否支持该 Handler
    ModelAndView handle(HttpServletRequest req, HttpServletResponse res, Object handler);
}

// 三个实现：
RequestMappingHandlerAdapter    →  适配 @RequestMapping 方法
HttpRequestHandlerAdapter       →  适配 HttpRequestHandler
SimpleControllerHandlerAdapter  →  适配 Controller 接口
```

### 面试追问

**Q**: 为什么 Spring 的 Bean 默认是单例？
**A**: 因为 Spring 容器管理的 Bean 大部分是**无状态**的（Service、DAO），单例可以复用、减少内存开销。有状态的 Bean（如 Web 层的 Request 对象）则用 prototype 或 request 作用域。

### 常见错误

- ❌ 说"Spring 的单例是 GoF 的 Singleton 模式"——Spring 的单例是容器级别的（一个 Bean 名称对应一个实例），不是类级别的（可以注册多个同类型的 Bean）
- ❌ 遗漏代理模式——AOP 底层的代理是 Spring 最重要的设计模式应用

### 一句话总结

> **Spring 是设计模式的最佳实践库：工厂（容器）、代理（AOP）、模板方法（refresh）、责任链（拦截器链）、观察者（事件），几乎涵盖了 GoF 的精华。**

---

## Q8: `@Autowired` 和 `@Resource` 有什么区别？⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: 依赖注入、注解对比

> 面试官问："`@Autowired` 和 `@Resource` 在 Spring 中有什么区别？各自在什么场景下使用？"

### 核心回答

| 对比维度 | `@Autowired` | `@Resource` |
|---------|-------------|-------------|
| **来源** | Spring 提供（`org.springframework.beans.factory.annotation`） | JSR-250（`javax.annotation` / `jakarta.annotation`） |
| **注入策略** | 默认 byType | 默认 byName（先 name 后 type） |
| **required** | 支持 `@Autowired(required = false)` | 无此属性 |
| **装配流程** | 按类型匹配 → 多个匹配时按名称匹配 → 都不行报错 | 按名称匹配 → 无匹配按类型匹配 → 都不行报错 |
| **配合注解** | `@Qualifier` 指定 Bean 名称 | `name` 属性指定 Bean 名称 |

**使用建议**：Spring 项目中优先使用 `@Autowired`（生态统一），非 Spring 环境（如标准 Java EE）用 `@Resource`。

### 深度扩展

**`@Autowired` 底层实现**：

```java
// AutowiredAnnotationBeanPostProcessor
// 1. 扫描 @Autowired 注解的字段或方法
// 2. 根据类型去容器中查找候选 Bean
// 3. 如果多个候选 Bean，优先按字段名匹配
// 4. 匹配不到且 required=true → NoSuchBeanDefinitionException

// 示例：多个 Bean 时按名称匹配
@Service("userService1") public class UserServiceImpl1 implements UserService {}
@Service("userService2") public class UserServiceImpl2 implements UserService {}

@Autowired
private UserService userService1;  // → 注入 UserServiceImpl1（字段名 = Bean 名）
```

**`@Resource` 的执行逻辑**：

```java
// CommonAnnotationBeanPostProcessor
// 1. 如果指定了 name → 只按名称查找，找不到报错
// 2. 如果没有指定 name → 按字段名查找
// 3. 如果字段名找不到 → 按类型查找
// 4. 类型查找多个匹配 → 报错（不会按字段名二次降级）
```

### 面试追问

**Q**: 构造器注入、Setter 注入、字段注入，哪种更好？为什么？
**A**: **构造器注入更好**。原因：① 依赖不可变（final 字段）；② 确保依赖不为 null（编译时保证）；③ 便于单元测试（不需要 Spring 容器）；④ 避免循环依赖（提前发现问题）。

**Q**: `@Autowired` 能注入 Map 或 List 吗？
**A**: 可以。`@Autowired Map<String, XxxInterface>` 会自动收集所有 `XxxInterface` 类型的 Bean（key=Bean 名称，value=Bean 实例）。Spring Boot 的设计模式（Strategy Pattern）经常用这个特性。

### 常见错误

- ❌ 认为 `@Autowired` 和 `@Resource` 完全等价——byType vs byName 的默认策略不同
- ❌ 依赖注入的字段用 `static` 修饰——Spring 的 DI 基于实例，`static` 字段不会被注入
- ❌ 构造器注入时忘记处理多个实现类——同样需要 `@Qualifier`

### 一句话总结

> **`@Autowired` = Spring 生态，默认 byType；`@Resource` = JSR-250，默认 byName。推荐用构造器注入 + `@Qualifier` 组合，清晰且不可变。**

---

## Q9: Spring MVC 的请求处理流程是怎样的？⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: DispatcherServlet、HandlerMapping、HandlerAdapter

> 面试官问："用户一个 HTTP 请求进来，Spring MVC 是怎么处理的？从 Tomcat 到 Controller 经过了哪些步骤？"

### 核心回答

Spring MVC 的请求处理链路：

```
HTTP 请求 → Tomcat（容器层）
         → Filter 链（doFilter）
         → DispatcherServlet（前端控制器）
         → HandlerMapping（处理器映射：匹配 URL → Handler）
         → HandlerAdapter（处理器适配：执行 Controller 方法）
         → HandlerInterceptor.preHandle()（拦截器前置）
         → Controller.method()（业务处理）
         → HandlerInterceptor.postHandle()（拦截器后置）
         → ViewResolver（视图解析）
         → 渲染视图 → HTTP 响应
```

### 深度扩展

**DispatcherServlet 的核心方法**：

```java
protected void doDispatch(HttpServletRequest request, HttpServletResponse response) {
    // 1. 获取 Handler（通过 HandlerMapping）
    HandlerExecutionChain mappedHandler = getHandler(request);
    
    // 2. 获取 HandlerAdapter
    HandlerAdapter ha = getHandlerAdapter(mappedHandler.getHandler());
    
    // 3. 执行拦截器的 preHandle()
    if (!mappedHandler.applyPreHandle(request, response)) return;
    
    // 4. 执行 Handler（Controller 方法）
    ModelAndView mv = ha.handle(request, response, mappedHandler.getHandler());
    
    // 5. 执行拦截器的 postHandle()
    mappedHandler.applyPostHandle(request, response, mv);
    
    // 6. 解析视图并渲染
    processDispatchResult(request, response, mappedHandler, mv);
}
```

**HandlerMapping 实现类**：

| 实现 | 匹配策略 |
|------|---------|
| `RequestMappingHandlerMapping` | `@RequestMapping` / `@GetMapping` 等注解 |
| `BeanNameUrlHandlerMapping` | Bean 名称以 "/" 开头的 Bean |
| `SimpleUrlHandlerMapping` | 直接配置 URL → Bean 映射 |
| `RouterFunctionMapping` | WebFlux 的函数式路由（Spring 5+） |

**Interceptor vs Filter**：

| 对比 | HandlerInterceptor | Filter |
|------|-------------------|--------|
| 容器 | Spring 容器 | Servlet 容器（Tomcat） |
| 范围 | 只拦截 Controller 请求 | 拦截所有请求 |
| 能力 | 可访问 Handler 和 ModelAndView | 只能操作 Request/Response |
| 执行顺序 | Filter → Interceptor → Controller |

### 面试追问

**Q**: `@ResponseBody` 和 `@RestController` 的关系是什么？
**A**: `@RestController` = `@Controller` + `@ResponseBody`。标注后，所有方法返回值不走 ViewResolver，直接序列化为 JSON/XML 写入 Response Body（通过 `HttpMessageConverter`）。

**Q**: Spring MVC 如何处理 JSON 请求体的参数绑定？
**A**: `RequestBodyAdvice` + `HttpMessageConverter`（默认用 Jackson 的 `MappingJackson2HttpMessageConverter`）。`@RequestBody User user` → Jackson 反序列化 JSON → User 对象。

### 常见错误

- ❌ 混淆 Filter 和 Interceptor 的执行顺序——Filter 先执行，Interceptor 在 DispatcherServlet 之后才介入
- ❌ 请求体读多次的问题——`HttpServletRequest` 的 InputStream 只能读一次，需要用 `ContentCachingRequestWrapper` 包装

### 一句话总结

> **Spring MVC 请求流程 = DispatcherServlet → HandlerMapping → HandlerAdapter → Controller → ViewResolver → 响应。核心是前端控制器模式。**

---

## Q10: Spring 的事务隔离级别与数据库隔离级别有什么关联？⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: 事务隔离级别、脏读/不可重复读/幻读

> 面试官问："Spring 中定义了 5 种事务隔离级别，它们和数据库的 4 种隔离级别如何对应？"

### 核心回答

Spring 的 5 种隔离级别前 4 种对应数据库标准，第 5 种是 Spring 特有：

| Spring 隔离级别 | 对应数据库级别 | 脏读 | 不可重复读 | 幻读 |
|---------------|-------------|------|-----------|------|
| `DEFAULT` | 使用数据库默认（MySQL: REPEATABLE_READ） | - | - | - |
| `READ_UNCOMMITTED` | 读未提交 | ✅ 会有 | ✅ 会有 | ✅ 会有 |
| `READ_COMMITTED` | 读已提交 | ❌ 无 | ✅ 会有 | ✅ 会有 |
| `REPEATABLE_READ` | 可重复读 | ❌ 无 | ❌ 无 | ✅ 会有（InnoDB 通过间隙锁解决了） |
| `SERIALIZABLE` | 串行化 | ❌ 无 | ❌ 无 | ❌ 无 |

**Spring 的隔离级别是数据库隔离级别的上层封装**：Spring 将 `@Transactional(isolation = Isolation.READ_COMMITTED)` 翻译为 `Connection.setTransactionIsolation(Connection.TRANSACTION_READ_COMMITTED)`。

### 深度扩展

**三个并发读问题的定义**：

| 问题 | 现象 | 举例 |
|------|------|------|
| **脏读** | 读到其他事务未提交的数据 | A 更新 age=25（未提交），B 读到 age=25，A 回滚，B 读到了不存在的数据 |
| **不可重复读** | 同一事务内两次读取同一行数据，结果不同 | A 第一次读 age=20，B 更新为 30 并提交，A 第二次读 age=30 |
| **幻读** | 同一事务内两次查询返回的行数不同 | A 第一次查 10 行，B 插入 1 行并提交，A 第二次查 11 行 |

**InnoDB 如何解决幻读？**

MySQL InnoDB 在 REPEATABLE_READ 级别下通过**间隙锁（Gap Lock）+ 临键锁（Next-Key Lock）**解决了幻读问题：
- 间隙锁锁定索引记录之间的间隙
- 临键锁 = 行锁 + 间隙锁，防止其他事务在间隙中插入数据

### 面试追问

**Q**: 实际项目中一般用哪个隔离级别？
**A**: 大多数业务用 **READ_COMMITTED**（兼顾并发和一致性），金融场景用 REPEATABLE_READ 或更高的 SERIALIZABLE。MySQL 默认 REPEATABLE_READ，但互联网公司更倾向于 `READ_COMMITTED` + 乐观锁/悲观锁处理并发。

**Q**: 隔离级别越高性能越低吗？
**A**: 一般是的，隔离级别越高，锁的粒度越大（从无锁到表锁）。但也要看具体数据库的实现——MySQL InnoDB 的 REPEATABLE_READ 有 MVCC 机制，性能与 READ_COMMITTED 差距并不大。

### 常见错误

- ❌ 认为 MySQL 的 REPEATABLE_READ 解决了所有幻读问题——快照读解决了，但 `SELECT ... FOR UPDATE` 的当前读仍可能出现幻读
- ❌ 隔离级别在运行时动态修改——必须在事务开始前设置，事务中间修改无效

### 一句话总结

> **Spring 隔离级别是数据库隔离级别的封装，DEFAULT 最常用（跟随数据库），InnoDB 的 REPEATABLE_READ 通过 MVCC + 间隙锁解决了幻读。**
