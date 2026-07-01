---
title: Spring IoC 容器源码解析
icon: mug-hot
order: 1
category:
  - Java
  - 源码解析
tag:
  - Spring
  - IoC
  - 依赖注入
  - Bean 生命周期
  - 循环依赖
  - 三级缓存
  - BeanFactory
  - ApplicationContext
---

# Spring IoC 容器源码解析：从 Bean 定义到依赖注入的全链路

> 📖 IoC（Inversion of Control，控制反转）是 Spring Framework 的核心思想——它将对象的创建、配置、装配权从开发者反转为框架，开发者只需声明"我需要什么"，框架自然会把依赖注入进来。本文从 `BeanFactory` 与 `ApplicationContext` 的体系结构出发，逐层剖析 Bean 的定义加载、生命周期管理、依赖注入流程，以及著名的**三级缓存**如何解决循环依赖问题。

---

## 一、Spring IoC 容器的体系结构

### 1.1 IoC 与 DI 的关系

```
控制反转（IoC）
    │
    │  是一种设计思想：将对象的创建权从调用方反转为框架
    │
    ├── 依赖查找（Dependency Lookup）
    │     主动拉取：ctx.getBean("beanName", Foo.class)
    │
    └── 依赖注入（Dependency Injection）★ Spring 的主要实现方式
          被动接收：通过构造器/setter/字段自动推送依赖
```

**IoC 是思想，DI 是实现**。Spring 提供了两种容器来承载 IoC：

| 容器 | 接口 | 特点 | 适用场景 |
|------|------|------|----------|
| **BeanFactory** | `org.springframework.beans.factory.BeanFactory` | 基础容器，延迟初始化（懒加载） | 资源受限环境（如 Applet） |
| **ApplicationContext** | `org.springframework.context.ApplicationContext` | 高级容器，启动时预初始化所有单例 Bean | **99% 的实际项目** |

### 1.2 ApplicationContext 继承体系

```
BeanFactory  ← 基础容器接口（getBean、containsBean、isSingleton...）
    ↑
HierarchicalBeanFactory  ← 支持父子容器
    ↑
ListableBeanFactory  ← 可枚举所有 Bean
    ↑
ApplicationContext  ← 组合了 Environment、MessageSource、ResourceLoader、ApplicationEventPublisher
    ↑
ConfigurableApplicationContext  ← 添加 refresh()、close() 生命周期方法
    ↑
AbstractApplicationContext  ← ★ 模板方法模式：定义了 refresh() 的 13 步骨架
    ↑
AbstractRefreshableApplicationContext  ← 支持多次 refresh（每次重新创建 BeanFactory）
    ↑
AbstractRefreshableConfigApplicationContext
    ↑
ClassPathXmlApplicationContext  ← XML 配置
AnnotationConfigApplicationContext  ← 注解配置（Spring Boot 时代主流）
```

**设计模式解读**：

- **模板方法模式**：`AbstractApplicationContext.refresh()` 定义了容器初始化的 13 个步骤骨架，子类只需实现抽象方法（如 `refreshBeanFactory()`、`getBeanFactory()`）
- **工厂模式**：`BeanFactory` 本身就是一个巨大的工厂，通过 `getBean()` 创建/获取对象
- **策略模式**：不同的 `ApplicationContext` 实现采用不同的配置加载策略（XML vs 注解 vs Groovy）

---

## 二、⭐️ Bean 的定义——BeanDefinition

### 2.1 什么是 BeanDefinition？

Spring 不会直接管理你写的 Java 类，而是把每个 Bean **元数据化**为 `BeanDefinition`：

```java
// 你写的类
@Component
public class UserService {
    @Autowired
    private OrderService orderService;
}

// Spring 内部将其转化为一个 BeanDefinition 对象
// BeanDefinition 持有了 Bean 的全部元信息：
public interface BeanDefinition extends AttributeAccessor, BeanMetadataElement {

    // Bean 的 Class 全限定名
    String getBeanClassName();

    // 作用域：singleton / prototype
    String getScope();

    // 是否懒加载
    boolean isLazyInit();

    // 依赖的 Bean 名称（显式声明的）
    String[] getDependsOn();

    // 是否为自动装配候选
    boolean isAutowireCandidate();

    // 是否为主候选 Bean（@Primary）
    boolean isPrimary();

    // 工厂方法名（@Bean 注解的方法）
    String getFactoryMethodName();

    // 构造器参数
    ConstructorArgumentValues getConstructorArgumentValues();

    // 属性值（用于 setter 注入 / 字段注入）
    MutablePropertyValues getPropertyValues();

    // 初始化方法名
    String getInitMethodName();

    // 销毁方法名
    String getDestroyMethodName();
}
```

### 2.2 BeanDefinition 的来源

Spring 扫描到 Bean 的方式主要有三种：

| 方式 | 入口 | 生成的 BeanDefinition 类型 |
|------|------|--------------------------|
| **XML 配置** | `<bean id="..." class="..."/>` | `GenericBeanDefinition` |
| **@Component 扫描** | `@ComponentScan` → `ClassPathBeanDefinitionScanner` | `ScannedGenericBeanDefinition` |
| **@Bean 方法** | `@Configuration` 类中的 `@Bean` 方法 | `ConfigurationClassBeanDefinition` |

### 2.3 @ComponentScan 扫描流程（源码核心）

```java
// ClassPathBeanDefinitionScanner.java（简化的核心逻辑）
public int scan(String... basePackages) {
    int beanCount = 0;
    for (String basePackage : basePackages) {
        // ① 扫描指定包下所有 .class 文件，封装为 Resource
        Set<BeanDefinition> candidates = findCandidateComponents(basePackage);
        for (BeanDefinition candidate : candidates) {
            // ② 解析 @Scope、@Lazy、@Primary、@DependsOn 等元注解
            AnnotationConfigUtils.processCommonDefinitionAnnotations(
                    (AnnotatedBeanDefinition) candidate);
            // ③ 检查是否满足 @Conditional 条件
            if (checkCandidate(beanName, candidate)) {
                // ④ 注册到 BeanDefinitionRegistry
                registerBeanDefinition(beanName, candidate);
                beanCount++;
            }
        }
    }
    return beanCount;
}
```

**关键步骤说明**：

1. **路径解析**：将 `basePackage`（如 `com.example`）转换为文件系统路径 `classpath*:com/example/**/*.class`
2. **`@Component` 判定**：通过 `MetadataReader` 读取 `.class` 文件的字节码注解信息，判断类是否被 `@Component`（或其派生注解 `@Service`、`@Repository`、`@Controller`）标注
3. **排除过滤器**：应用 `excludeFilters`（通常是自定义的 `TypeFilter`）
4. **Scope 代理处理**：如果 `@Scope(proxyMode = ...)` 非默认值，将 BeanDefinition 包装为 `ScopedProxyFactoryBean`

---

## 三、⭐️⭐️ Bean 的生命周期——13 个关键节点

这是 Spring IoC 最核心的知识点。Bean 从定义到就绪经历了以下完整流程：

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Spring Bean 完整生命周期                          │
└─────────────────────────────────────────────────────────────────────┘

1. BeanDefinition 注册
      │  ClassPathBeanDefinitionScanner 扫描并注册到 registry
      ▼
2. BeanDefinition 合并（getMergedLocalBeanDefinition）
      │  合并父 Bean 定义和子 Bean 定义的属性
      ▼
3. 实例化前（InstantiationAwareBeanPostProcessor.postProcessBeforeInstantiation）
      │  返回非 null 则直接返回代理对象，跳过后续流程
      ▼
4. 实例化（createBeanInstance）
      │  ① Supplier 回调 → ② FactoryMethod → ③ 构造器注入（AutowiredAnnotationBeanPostProcessor 决定用哪个构造器）
      ▼
5. 实例化后（MergedBeanDefinitionPostProcessor.postProcessMergedBeanDefinition）
      │  缓存 @Autowired、@Value 的注入元数据
      ▼
6. 属性填充前（InstantiationAwareBeanPostProcessor.postProcessAfterInstantiation）
      │  返回 false 则跳过属性填充
      ▼
7. 属性填充（populateBean）
      │  ① AutowiredAnnotationBeanPostProcessor 处理 @Autowired @Value
      │  ② CommonAnnotationBeanPostProcessor 处理 @Resource
      ▼
8. 感知回调（Aware 接口）
      │  BeanNameAware → BeanClassLoaderAware → BeanFactoryAware
      ▼
9. 初始化前（BeanPostProcessor.postProcessBeforeInitialization）
      │  @PostConstruct 在此阶段被 CommonAnnotationBeanPostProcessor 调用
      ▼
10. 初始化（invokeInitMethods）
      │  ① InitializingBean.afterPropertiesSet()
      │  ② @Bean(initMethod = "xxx")
      ▼
11. 初始化后（BeanPostProcessor.postProcessAfterInitialization）
      │  ★ AOP 代理对象在此生成（AbstractAutoProxyCreator）
      ▼
12. Bean 就绪 ✅ —— 放入单例池（singletonObjects 一级缓存）
      │
      ▼  （容器关闭时）
13. 销毁
      ① @PreDestroy → ② DisposableBean.destroy() → ③ @Bean(destroyMethod = "xxx")
```

### 3.1 核心源码：AbstractAutowireCapableBeanFactory.doCreateBean()

```java
// AbstractAutowireCapableBeanFactory.java（Spring 源码简化版）
protected Object doCreateBean(String beanName, RootBeanDefinition mbd,
                               @Nullable Object[] args) throws BeanCreationException {

    // ① 实例化 BeanWrapper
    BeanWrapper instanceWrapper = createBeanInstance(beanName, mbd, args);
    Object bean = instanceWrapper.getWrappedInstance();

    // ② 允许后处理器修改合并后的 BeanDefinition
    //    （一般是 AutowiredAnnotationBeanPostProcessor 缓存注入元数据）
    applyMergedBeanDefinitionPostProcessors(mbd, beanType, beanName);

    // ③ ★ 提前暴露工厂对象（解决循环依赖的关键）
    //    将 ObjectFactory 放入 singletonFactories（三级缓存）
    boolean earlySingletonExposure = (mbd.isSingleton()
            && this.allowCircularReferences
            && isSingletonCurrentlyInCreation(beanName));
    if (earlySingletonExposure) {
        addSingletonFactory(beanName,
                () -> getEarlyBeanReference(beanName, mbd, bean));
    }

    // ④ 属性填充（依赖注入）
    Object exposedObject = bean;
    populateBean(beanName, mbd, instanceWrapper);

    // ⑤ 初始化（aware、init-method、BeanPostProcessor）
    exposedObject = initializeBean(beanName, exposedObject, mbd);

    // ⑥ 循环依赖校验
    if (earlySingletonExposure) {
        Object earlySingletonReference = getSingleton(beanName, false);
        if (earlySingletonReference != null) {
            // 如果经过初始化后 Bean 被包装了（比如 AOP 代理），
            // 而之前暴露给其他 Bean 的是原始版本，则需要替换
            if (exposedObject != bean) {
                // ... 确保最终暴露的是代理后的版本
            }
        }
    }

    // ⑦ 注册到销毁回调
    registerDisposableBeanIfNecessary(beanName, bean, mbd);

    return exposedObject;
}
```

---

## 四、⭐️ 依赖注入的实现原理

### 4.1 @Autowired 的处理流程

`@Autowired` 的注入由 **AutowiredAnnotationBeanPostProcessor** 负责，它在 Bean 创建的**属性填充阶段**（`populateBean()`）工作：

```java
// AutowiredAnnotationBeanPostProcessor 的核心工作流程

// 步骤 1：在 postProcessMergedBeanDefinition 中查找注入点
@Override
public void postProcessMergedBeanDefinition(RootBeanDefinition beanDefinition,
        Class<?> beanType, String beanName) {
    // 遍历类的所有字段和方法，找到 @Autowired 和 @Value 标注的
    InjectionMetadata metadata = findAutowiringMetadata(beanName, beanType, null);
    metadata.checkConfigMembers(beanDefinition);
}

// 步骤 2：在 postProcessProperties 中执行注入
@Override
public PropertyValues postProcessProperties(PropertyValues pvs,
        Object bean, String beanName) {
    InjectionMetadata metadata = findAutowiringMetadata(beanName,
            bean.getClass(), pvs);
    try {
        // 依次处理每个注入点
        metadata.inject(bean, beanName, pvs);
    } catch (BeanCreationException ex) {
        throw ex;
    }
    return pvs;
}
```

### 4.2 注入的候选者选择——@Qualifier 与 @Primary 规则

```java
// DefaultListableBeanFactory.doResolveDependency()（简化逻辑）
public Object doResolveDependency(DependencyDescriptor descriptor,
        String beanName, Set<String> autowiredBeanNames,
        TypeConverter typeConverter) throws BeansException {

    // ① 获取注入目标的类型（字段/方法参数的类型）
    Class<?> type = descriptor.getDependencyType();

    // ② 通过类型查找所有匹配的 Bean
    Map<String, Object> matchingBeans =
            findAutowireCandidates(beanName, type, descriptor);

    if (matchingBeans.isEmpty()) {
        // ③ 没有候选，检查 @Autowired(required = true/false)
        if (descriptor.isRequired()) {
            throw new NoSuchBeanDefinitionException(type);
        }
        return null;
    }

    if (matchingBeans.size() > 1) {
        // ④ ★ 多个候选时的抉择：
        //    优先级顺序：@Primary > @Priority > 按名称匹配
        String autowiredCandidate = determineAutowireCandidate(
                matchingBeans, descriptor);
        if (autowiredCandidate == null) {
            // 最后尝试按字段名匹配
            autowiredCandidate = descriptor.getDependencyName();
        }
    }

    // ⑤ 从 BeanFactory 中获取最终的候选 Bean
    return getBean(autowiredCandidate);
}
```

### 4.3 @Resource 与 @Autowired 的区别

| 对比维度 | @Autowired | @Resource |
|---------|-----------|-----------|
| **来源** | Spring 原生（`org.springframework.beans.factory.annotation`） | JSR-250（`javax.annotation`） |
| **注入方式** | 默认按类型（byType），配合 `@Qualifier` 按名称 | 默认按名称（byName），找不到再按类型（byType） |
| **处理类** | `AutowiredAnnotationBeanPostProcessor` | `CommonAnnotationBeanPostProcessor` |
| **required** | 支持 `required = false` | 不支持 |
| **查找范围** | 仅 Spring 容器 | 支持 JNDI 等外部资源 |

---

## 五、⭐️⭐️⭐️ 循环依赖与三级缓存（面试必问）

### 5.1 什么是循环依赖？

```java
@Component
public class A {
    @Autowired
    private B b;  // A 依赖 B
}

@Component
public class B {
    @Autowired
    private A a;  // B 也依赖 A
}
// A 创建时需要 B，B 创建时需要 A → 形成闭环
```

### 5.2 Spring 的三级缓存设计

```java
public class DefaultSingletonBeanRegistry extends SimpleAliasRegistry {

    /** 一级缓存：存放完全创建好的 Bean（成品池） */
    private final Map<String, Object> singletonObjects =
            new ConcurrentHashMap<>(256);

    /** 二级缓存：存放早期暴露的 Bean（半成品，未完成属性填充） */
    private final Map<String, Object> earlySingletonObjects =
            new ConcurrentHashMap<>(16);

    /** 三级缓存：存放生成 Bean 的 ObjectFactory（工厂池） */
    private final Map<String, ObjectFactory<?>> singletonFactories =
            new HashMap<>(16);

    /** 正在创建中的 Bean 名称集合（用于检测循环依赖） */
    private final Set<String> singletonsCurrentlyInCreation =
            Collections.newSetFromMap(new ConcurrentHashMap<>(16));
}
```

### 5.3 循环依赖的解决流程

```
场景：A 依赖 B，B 依赖 A（都是单例）

═══════════════════════════════════════════════════════════════════
创建 A 的流程
═══════════════════════════════════════════════════════════════════

① A 实例化（调用构造器）
   → A 的原始对象诞生（但属性 b 尚未注入）
   → 将 A 的 ObjectFactory 放入 三级缓存（singletonFactories）
   → 将 "A" 加入 singletonsCurrentlyInCreation

② A 属性填充（populateBean）
   → 发现需要注入 B
   → 调用 getBean("B")
   │
   │  ═══════════════════════════════════════════════════════
   │  创建 B 的流程
   │  ═══════════════════════════════════════════════════════
   │
   │  ③ B 实例化
   │     → B 的原始对象诞生
   │     → 将 B 的 ObjectFactory 放入 三级缓存
   │     → 将 "B" 加入 singletonsCurrentlyInCreation
   │
   │  ④ B 属性填充
   │     → 发现需要注入 A
   │     → 调用 getBean("A")
   │     → ☆ 此时发现 "A" 正在创建中（在 singletonsCurrentlyInCreation 里）
   │     → ☆ 触发三级缓存查找链：
   │        ① 查一级缓存 singletonObjects → 没有（A 还没创建完）
   │        ② 查二级缓存 earlySingletonObjects → 没有
   │        ③ 查三级缓存 singletonFactories → ★ 找到了！
   │     → 调用 A 的 ObjectFactory.getObject()
   │        → 执行 getEarlyBeanReference() → 如果需要 AOP，返回代理对象
   │     → 将半成品的 A 从三级缓存升级到二级缓存 ★
   │     → B 拿到 A 的引用，完成属性填充
   │     → B 初始化完成
   │     → B 进入一级缓存 singletonObjects
   │
  ③ A 拿到 B 的引用，完成属性填充
  ④ A 初始化（BeanPostProcessor 等）
  ⑤ A 进入一级缓存 singletonObjects
  ⑥ 从二级缓存 earlySingletonObjects 中移除 A（如果有的话）
```

### 5.4 核心源码：getSingleton() 的三级缓存查找链

```java
// DefaultSingletonBeanRegistry.java（Spring 源码核心逻辑）
protected Object getSingleton(String beanName, boolean allowEarlyReference) {
    // ① 先查一级缓存 —— 成品 Bean
    Object singletonObject = this.singletonObjects.get(beanName);
    if (singletonObject == null && isSingletonCurrentlyInCreation(beanName)) {
        synchronized (this.singletonObjects) {
            // ② 再查二级缓存 —— 早期暴露的半成品 Bean
            singletonObject = this.earlySingletonObjects.get(beanName);
            if (singletonObject == null && allowEarlyReference) {
                // ③ 最后查三级缓存 —— ObjectFactory
                ObjectFactory<?> singletonFactory =
                        this.singletonFactories.get(beanName);
                if (singletonFactory != null) {
                    // 调用工厂方法获取对象（可能触发 AOP 代理创建）
                    singletonObject = singletonFactory.getObject();
                    // 升级到二级缓存（下次无需再执行工厂方法）
                    this.earlySingletonObjects.put(beanName, singletonObject);
                    // 从三级缓存中移除
                    this.singletonFactories.remove(beanName);
                }
            }
        }
    }
    return singletonObject;
}
```

### 5.5 为什么需要三级缓存？二级行不行？

这是一个经典的追问。**理论上二级缓存可以解决"纯"循环依赖，但三级缓存的存在是为了处理 AOP 代理**。

```
如果只有二级缓存：
  A 创建 → A 的原始对象放入二级缓存 → B 依赖 A → B 拿到 A 的原始对象
  → A 的初始化后置处理器（BeanPostProcessor）将 A 包装成代理 → 矛盾！
  现在 B 持有的是原始 A，而容器中应该暴露的是代理 A

三级缓存的妙处：
  三级缓存存的是 ObjectFactory（一个函数），而非对象本身
  当 B 需要 A 时，调用 ObjectFactory.getObject()
  → 内部执行 getEarlyBeanReference()
  → 如果 A 需要 AOP 代理，这里就会生成代理对象
  → ★ 保证了"暴露给其他 Bean 的引用"和"最终放入容器的引用"是同一个对象
```

### 5.6 循环依赖的局限

| 场景 | 能否解决 | 原因 |
|------|---------|------|
| **单例 + setter 注入** | ✅ 可以 | 构造和注入分离，可以先暴露原始对象 |
| **单例 + 构造器注入** | ❌ 不行 | 构造器调用时必须提供依赖，此时依赖的 Bean 还未创建 |
| **prototype + 任意注入** | ❌ 不行 | prototype Bean 不缓存，无法提前暴露 |
| **@Async / @Transactional 导致代理** | ⚠️ 需要注意 | 代理对象与原始对象不是同一个，需要 @Lazy 打破循环 |

**构造器循环依赖的报错**：

```
Requested bean is currently in creation:
  Is there an unresolvable circular reference?
```

---

## 六、⭐ BeanFactoryPostProcessor 与 BeanPostProcessor

### 6.1 两者的定位完全不同

```
BeanFactoryPostProcessor
  时机：BeanDefinition 注册完成后，Bean 实例化之前
  作用：修改 BeanDefinition（如修改属性值、更换 scope）
  典型：PropertySourcesPlaceholderConfigurer 解析 ${...} 占位符

BeanPostProcessor
  时机：每个 Bean 初始化前后
  作用：修改 Bean 实例（如包装代理、修改属性值）
  典型：AutowiredAnnotationBeanPostProcessor 处理 @Autowired
```

### 6.2 执行时序

```
AbstractApplicationContext.refresh()
  │
  ├── invokeBeanFactoryPostProcessors(beanFactory)
  │     遍历所有 BeanFactoryPostProcessor，按优先级执行
  │     ★ PropertySourcesPlaceholderConfigurer 解析 ${db.url}
  │     ★ ConfigurationClassPostProcessor 处理 @Configuration 类
  │
  ├── registerBeanPostProcessors(beanFactory)
  │     注册所有 BeanPostProcessor 到 BeanFactory
  │     ★ 此时只是注册，还没有执行
  │
  ├── finishBeanFactoryInitialization(beanFactory)
  │     ★ 开始实例化所有非懒加载的单例 Bean
  │     每个 Bean 的创建过程中，BeanPostProcessor 按顺序执行
```

### 6.3 ConfigurationClassPostProcessor —— @Configuration 的处理核心

```java
// ConfigurationClassPostProcessor 是 Spring 中最重要的 BeanFactoryPostProcessor
// 它负责解析 @Configuration 类，处理 @Bean、@Import、@ComponentScan 等

// 核心流程：
// ① 找到所有 @Configuration 类
// ② 用 ConfigurationClassParser 解析每个类
//     → 处理 @PropertySource
//     → 处理 @ComponentScan
//     → 处理 @Import（普通类、ImportSelector、ImportBeanDefinitionRegistrar）
//     → 处理 @Bean 方法
//     → 处理 @ImportResource
// ③ 将解析出的 BeanDefinition 注册到容器
```

---

## 七、ApplicationContext.refresh() —— 容器初始化的 13 步

这是 Spring 源码中最经典的模板方法：

```java
// AbstractApplicationContext.java
public void refresh() throws BeansException, IllegalStateException {
    synchronized (this.startupShutdownMonitor) {
        // ① 准备刷新：记录启动时间、激活状态、初始化 PropertySources
        prepareRefresh();

        // ② 获取 BeanFactory：子类实现，默认创建 DefaultListableBeanFactory
        ConfigurableListableBeanFactory beanFactory = obtainFreshBeanFactory();

        // ③ 准备 BeanFactory：设置类加载器、SpEL 解析器、注册默认 BeanPostProcessor
        prepareBeanFactory(beanFactory);

        try {
            // ④ 后置处理 BeanFactory：留给子类扩展（如添加 Servlet 相关的 BeanPostProcessor）
            postProcessBeanFactory(beanFactory);

            // ⑤ ★ 执行 BeanFactoryPostProcessor（关键步骤）
            //    ConfigurationClassPostProcessor 在此阶段解析 @Configuration
            invokeBeanFactoryPostProcessors(beanFactory);

            // ⑥ ★ 注册 BeanPostProcessor（只是注册，拦截器就位）
            registerBeanPostProcessors(beanFactory);

            // ⑦ 初始化 MessageSource（国际化）
            initMessageSource();

            // ⑧ 初始化事件广播器
            initApplicationEventMulticaster();

            // ⑨ 模板方法：留给子类（SpringBoot 在此创建内嵌 Tomcat）
            onRefresh();

            // ⑩ 注册监听器
            registerListeners();

            // ⑪ ★ 实例化所有非懒加载的单例 Bean（最关键的一步）
            finishBeanFactoryInitialization(beanFactory);

            // ⑫ 完成刷新：发布 ContextRefreshedEvent
            finishRefresh();
        } catch (BeansException ex) {
            // 销毁已创建的 Bean
            destroyBeans();
            // 重置 active 标志
            cancelRefresh(ex);
            throw ex;
        }
    }
}
```

---

## 八、总结

| 概念 | 一句话总结 |
|------|-----------|
| **IoC 容器** | ApplicationContext 是核心，内部持有 DefaultListableBeanFactory |
| **BeanDefinition** | 每个 Bean 的元数据快照，包含 scope、lazy、构造参数等全部信息 |
| **Bean 生命周期** | 13 个节点：实例化 → 属性填充 → Aware 回调 → 初始化前 → 初始化 → 初始化后（AOP） |
| **依赖注入** | AutowiredAnnotationBeanPostProcessor 在 populateBean 阶段注入 @Autowired 字段 |
| **三级缓存** | singletonObjects(成品) → earlySingletonObjects(半成品) → singletonFactories(工厂) |
| **AOP 代理时机** | 在 BeanPostProcessor.postProcessAfterInitialization 阶段创建 |
| **refresh() 方法** | 13 步模板方法，invokeBeanFactoryPostProcessors 和 finishBeanFactoryInitialization 是核心 |
| **循环依赖** | 单例 setter 注入可解（三级缓存），构造器注入不可解 |

**关键设计模式一览**：

| 设计模式 | 在 Spring IoC 中的体现 |
|---------|----------------------|
| 工厂模式 | BeanFactory / ApplicationContext |
| 单例模式 | 默认 scope 为 singleton |
| 模板方法 | AbstractApplicationContext.refresh() |
| 策略模式 | 不同的 ApplicationContext 实现 |
| 观察者模式 | ApplicationEvent / ApplicationListener |
| 责任链模式 | BeanPostProcessor 的处理链 |
| 代理模式 | AOP 代理（JDK 动态代理 / CGLIB） |

---

## 参考

- [Spring Framework 官方文档 - IoC Container](https://docs.spring.io/spring-framework/reference/core/beans.html)
- Spring Framework 5.x / 6.x 源码：`org.springframework.beans` 和 `org.springframework.context` 包
- 《Spring 源码深度解析（第 2 版）》—— 郝佳
- 《Spring 技术内幕：深入解析 Spring 架构与设计原理》—— 计文柯
