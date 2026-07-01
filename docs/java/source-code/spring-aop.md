---
title: Spring AOP 源码解析
icon: puzzle-piece
order: 2
category:
  - Java
  - 源码解析
tag:
  - Spring
  - AOP
  - 动态代理
  - JDK 代理
  - CGLIB
  - 切面
  - Advisor
  - 事务管理
---

# Spring AOP 源码解析：从代理创建到拦截链调用的完整链路

> 📖 AOP（Aspect-Oriented Programming，面向切面编程）是 Spring 的两大核心特性之一。它通过**动态代理**技术，在不修改源码的情况下为对象添加横切逻辑（如事务、日志、权限）。本文从 JDK 动态代理与 CGLIB 的底层差异出发，逐层剖析 Spring AOP 的代理创建时机、Advisor 链的构建逻辑、拦截器调用流程，以及 `@Transactional` 是如何借助 AOP 实现声明式事务的。

---

## 一、AOP 的核心概念速览

```
┌─────────────────────────────────────────────────────────────────┐
│                         AOP 核心概念关系图                        │
└─────────────────────────────────────────────────────────────────┘

   JoinPoint（连接点）
   程序中所有可以增强的点（方法执行、异常抛出等）
     │
     │  按条件筛选
     ▼
   Pointcut（切入点）
   真正被增强的连接点集合
   （如： UserService 中所有 public 方法）
     │                                       
     │  与增强逻辑绑定                          
     ▼                                       
   Advice（通知）                            Aspect（切面）
   增强逻辑本身                              切入点 + 通知的捆绑
   类型：                                  （如：记录所有 Service
   - Before（前置）                          方法的执行耗时）
   - AfterReturning（返回后）
   - AfterThrowing（异常后）
   - After（最终）
   - Around（环绕 ★ 最强大）
     │
     │  Advice + Pointcut = Advisor
     ▼
   Advisor（通知器）
   一个切面对应多个 Advisor
```

### 1.1 Advice 的五种类型与执行顺序

```
Around 前置
   │
   ▼
Before
   │
   ▼
目标方法执行
   │
   ▼
AfterReturning / AfterThrowing（只执行一个）
   │
   ▼
After（始终执行，类似 finally）
   │
   ▼
Around 后置
```

---

## 二、⭐️ 代理技术的底层：JDK 动态代理 vs CGLIB

Spring AOP 根据目标类是否实现接口，自动选择代理策略：

| 对比维度 | JDK 动态代理 | CGLIB 代理 |
|---------|-------------|-----------|
| **原理** | 基于接口，生成 `$Proxy` 类实现目标接口 | 基于继承，生成目标类的子类 |
| **要求** | 目标类必须实现接口 | 目标类不能被 `final` 修饰，方法不能被 `final` 修饰 |
| **性能** | 创建开销小，反射调用稍慢 | 创建开销大（生成字节码），方法调用快 |
| **默认策略** | Spring Boot 1.x 默认 | Spring Boot 2.x+ 默认（`spring.aop.proxy-target-class=true`） |

### 2.1 JDK 动态代理源码分析

```java
// JDK 动态代理的核心类：java.lang.reflect.Proxy
// 核心方法：newProxyInstance()

public static Object newProxyInstance(ClassLoader loader,
        Class<?>[] interfaces, InvocationHandler h) {

    // ① 安全检查：验证 interfaces 是否可被类加载器访问
    // ② 生成代理类字节码：ProxyGenerator.generateProxyClass()
    //    生成的类名格式：com.sun.proxy.$Proxy0
    // ③ 通过类加载器加载代理类
    // ④ 通过反射调用代理类的构造器（接收 InvocationHandler 参数）
    // ⑤ 返回代理实例
}

// 代理类的大致结构（反编译 $Proxy0.class）：
public final class $Proxy0 extends Proxy implements UserService {
    // 所有接口方法的调用都会被转发到 InvocationHandler.invoke()
    public void save(User user) {
        super.h.invoke(this, m3, new Object[]{user});
    }
}
```

### 2.2 CGLIB 代理源码分析

```java
// CGLIB 通过动态生成目标类的子类来实现代理
// 核心类：org.springframework.cglib.proxy.Enhancer

Enhancer enhancer = new Enhancer();
enhancer.setSuperclass(TargetClass.class);           // 设置父类
enhancer.setCallback(new MethodInterceptor() {       // 设置回调
    @Override
    public Object intercept(Object obj, Method method, Object[] args,
            MethodProxy proxy) throws Throwable {
        // 前置增强
        System.out.println("before...");
        // 调用目标方法（★ 使用 FastClass 机制，避免反射）
        Object result = proxy.invokeSuper(obj, args);
        // 后置增强
        System.out.println("after...");
        return result;
    }
});
TargetClass proxy = (TargetClass) enhancer.create();

// CGLIB 生成的代理类结构：
public class TargetClass$$EnhancerByCGLIB$$xxxx extends TargetClass
        implements Factory {
    // 重写所有非 final 方法
    @Override
    public void save(User user) {
        MethodInterceptor interceptor = (MethodInterceptor) callbacks[0];
        interceptor.intercept(this, CGLIB$save$0$Method,
                new Object[]{user}, CGLIB$save$0$Proxy);
    }
}
```

### 2.3 CGLIB 的 FastClass 机制

CGLIB 的**高性能秘密**在于 `FastClass`：它避免了 JDK 反射调用的性能开销。

```java
// JDK 代理调用目标方法：通过反射
method.invoke(target, args);  // 慢：每次都要查找方法、检查权限

// CGLIB 通过 FastClass 直接通过索引访问方法：
// ① 生成 TargetClass 的 FastClass（名为 TargetClass$$FastClassByCGLIB）
// ② 每个方法对应一个索引号（int）
// ③ 调用时直接用索引定位方法：fastClass.invoke(index, obj, args)  // 快：类似虚方法表

// 性能对比（大致量级）：
// 反射调用：微秒级
// FastClass 调用：纳秒级
```

---

## 三、⭐️⭐️ Spring AOP 的代理创建——时机与流程

### 3.1 代理创建的入口：AbstractAutoProxyCreator

Spring AOP 的代理创建发生在 **Bean 生命周期的初始化后阶段**（`postProcessAfterInitialization`）：

```java
// AbstractAutoProxyCreator.java（Spring AOP 的核心）
@Override
public Object postProcessAfterInitialization(@Nullable Object bean,
        String beanName) {
    if (bean != null) {
        // ① 根据 beanName 和 beanClass 生成缓存 Key
        Object cacheKey = getCacheKey(bean.getClass(), beanName);
        // ② 检查是否已经处理过（避免为同一 Bean 创建多个代理）
        if (this.earlyProxyReferences.remove(cacheKey) != bean) {
            // ③ ★ 核心：判断是否需要创建代理，如果需要就包装
            return wrapIfNecessary(bean, beanName, cacheKey);
        }
    }
    return bean;
}

protected Object wrapIfNecessary(Object bean, String beanName, Object cacheKey) {
    // ① 跳过基础设施类（Advice、Pointcut、Advisor 等）
    if (isInfrastructureClass(bean.getClass())) return bean;

    // ② ★ 查找所有匹配该 Bean 的 Advisor
    Object[] specificInterceptors = getAdvicesAndAdvisorsForBean(
            bean.getClass(), beanName, null);
    //    内部逻辑：
    //    a. 遍历容器中所有的 Advisor
    //    b. 对每个 Advisor，调用其 Pointcut 的 matches() 方法
    //       → 通过 MethodMatcher 判断当前 Bean 的任意方法是否匹配切入点表达式
    //    c. 收集所有匹配的 Advisor

    if (specificInterceptors != DO_NOT_PROXY) {
        // ③ ★ 创建代理对象
        Object proxy = createProxy(bean.getClass(), beanName,
                specificInterceptors, new SingletonTargetSource(bean));
        return proxy;
    }

    return bean;
}
```

### 3.2 创建代理的决策过程

```java
// DefaultAopProxyFactory.createAopProxy()
public AopProxy createAopProxy(AdvisedSupport config) {
    // 判断使用哪种代理方式
    if (config.isOptimize() || config.isProxyTargetClass()
            || hasNoUserSuppliedProxyInterfaces(config)) {
        Class<?> targetClass = config.getTargetClass();
        if (targetClass.isInterface() || Proxy.isProxyClass(targetClass)) {
            // 目标类是接口或已是 JDK 代理 → 使用 JDK 代理
            return new JdkDynamicAopProxy(config);
        }
        // 目标类是具体类 → 使用 CGLIB
        return new ObjenesisCglibAopProxy(config);
    } else {
        // 有指定接口 → 使用 JDK 代理
        return new JdkDynamicAopProxy(config);
    }
}
```

---

## 四、⭐️⭐️ 拦截器链的构建与调用

当一个被代理的 Bean 的方法被调用时，实际的执行路径如下：

```
客户端调用
    │
    ▼
代理对象（JdkDynamicAopProxy / CglibAopProxy）
    │
    ▼
AdvisedSupport.getInterceptorsAndDynamicInterceptionAdvice()
    │  ★ 获取拦截器链（方法级别的 Advisor 匹配）
    ▼
ReflectiveMethodInvocation.proceed()
    │  ★ 责任链模式：逐个调用拦截器
    ▼
    ┌─────────────────────────────────────────┐
    │ Interceptor 1: MethodBeforeAdviceInterceptor
    │   → 调用 @Before 通知
    ├─────────────────────────────────────────┤
    │ Interceptor 2: AspectJAroundAdvice
    │   → 进入 @Around 的 proceed() 前半段
    ├─────────────────────────────────────────┤
    │ ...（其他拦截器）
    ├─────────────────────────────────────────┤
    │ ★ 目标方法执行：invokeJoinpoint()
    ├─────────────────────────────────────────┤
    │ AspectJAroundAdvice 执行 @Around 后半段
    ├─────────────────────────────────────────┤
    │ AfterReturningAdviceInterceptor
    │   → 调用 @AfterReturning 通知
    ├─────────────────────────────────────────┤
    │ AspectJAfterAdvice（@After，类似 finally）
    └─────────────────────────────────────────┘
```

### 4.1 核心源码：ReflectiveMethodInvocation.proceed()

```java
// ReflectiveMethodInvocation.java
public Object proceed() throws Throwable {
    // currentInterceptorIndex 从 -1 开始
    // ★ 当索引达到拦截器数量时，调用目标方法
    if (this.currentInterceptorIndex == this.interceptorsAndDynamicMethodMatchers.size() - 1) {
        return invokeJoinpoint();  // 调用目标方法
    }

    // 获取下一个拦截器
    Object interceptorOrInterceptionAdvice =
        this.interceptorsAndDynamicMethodMatchers.get(++this.currentInterceptorIndex);

    // ★ 动态切入点匹配：运行时再次判断是否匹配
    //   （例如 @annotation 类型的切入点，需要运行时获取注解参数）
    if (interceptorOrInterceptionAdvice instanceof InterceptorAndDynamicMethodMatcher) {
        InterceptorAndDynamicMethodMatcher dm =
            (InterceptorAndDynamicMethodMatcher) interceptorOrInterceptionAdvice;
        if (dm.methodMatcher.matches(this.method, this.targetClass, this.arguments)) {
            return dm.interceptor.invoke(this);  // 匹配 → 调用拦截器
        } else {
            // 不匹配 → 递归调用下一个拦截器
            return proceed();
        }
    } else {
        // ★ 静态匹配的拦截器：直接调用
        return ((MethodInterceptor) interceptorOrInterceptionAdvice).invoke(this);
    }
}
```

### 4.2 五种 Advice 对应的拦截器

| Advice 类型 | 对应拦截器 | 源码位置 |
|------------|-----------|---------|
| `@Before` | `MethodBeforeAdviceInterceptor` | 在 `invoke()` 中先调用 advice，再调用 `mi.proceed()` |
| `@AfterReturning` | `AfterReturningAdviceInterceptor` | 在 `invoke()` 中先 `proceed()`，成功后再调用 advice |
| `@AfterThrowing` | `AspectJAfterThrowingAdvice` | 在 `invoke()` 中 try-catch，异常时调用 advice |
| `@After` | `AspectJAfterAdvice` | 在 `invoke()` 中 try-finally，finally 中调用 advice |
| `@Around` | `AspectJAroundAdvice` | 最灵活，手动控制 `proceed()` 的时机 |

---

## 五、⭐ @EnableAspectJAutoProxy 的原理解析

```java
// @EnableAspectJAutoProxy 注解的定义
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Import(AspectJAutoProxyRegistrar.class)  // ★ 关键：通过 @Import 导入
public @interface EnableAspectJAutoProxy {
    // 是否使用 CGLIB 代理（false = 有接口就用 JDK 代理）
    boolean proxyTargetClass() default false;
    // 是否暴露代理对象到 AopContext（用于嵌套方法调用场景）
    boolean exposeProxy() default false;
}
```

### 5.1 AspectJAutoProxyRegistrar 注册流程

```java
// AspectJAutoProxyRegistrar.java
@Override
public void registerBeanDefinitions(
        AnnotationMetadata importingClassMetadata,
        BeanDefinitionRegistry registry) {

    // ★ 核心：向容器注册 AnnotationAwareAspectJAutoProxyCreator
    AopConfigUtils.registerAspectJAnnotationAutoProxyCreatorIfNecessary(registry);

    // 处理 proxyTargetClass 和 exposeProxy 属性
    // ...
}

// AnnotationAwareAspectJAutoProxyCreator 继承链：
// AbstractAutoProxyCreator
//   ↑
// AbstractAdvisorAutoProxyCreator
//   ↑
// AspectJAwareAdvisorAutoProxyCreator
//   ↑
// AnnotationAwareAspectJAutoProxyCreator ★（实际注册的 BeanPostProcessor）
```

**这个 BeanPostProcessor 做了三件事**：

1. **查找切面**：在容器中查找所有 `@Aspect` 标注的 Bean
2. **解析 Advisor**：将每个 `@Aspect` Bean 中的通知方法解析为 Advisor 列表
3. **创建代理**：在 `postProcessAfterInitialization` 中为匹配切入点的 Bean 创建 AOP 代理

---

## 六、⭐️ @Transactional 是如何借助 AOP 实现的？

`@Transactional` 是 Spring AOP 最典型的应用场景之一。其底层是通过 `TransactionInterceptor` 实现的环绕通知：

```java
// TransactionInterceptor.java（Spring 事务管理的核心拦截器）
@Override
public Object invoke(MethodInvocation invocation) throws Throwable {
    // ① 获取目标类（可能是代理后的）
    Class<?> targetClass = (invocation.getThis() != null)
            ? AopUtils.getTargetClass(invocation.getThis()) : null;

    // ② ★ 核心：调用 TransactionAspectSupport.invokeWithinTransaction()
    return invokeWithinTransaction(
            invocation.getMethod(), targetClass,
            invocation::proceed    // 目标方法的回调
    );
}

// TransactionAspectSupport.invokeWithinTransaction() 简化逻辑：
protected Object invokeWithinTransaction(Method method, Class<?> targetClass,
        InvocationCallback invocation) throws Throwable {

    // ① 获取事务属性：从 @Transactional 注解中读取
    //    propagation、isolation、timeout、readOnly、rollbackFor 等
    TransactionAttribute txAttr = getTransactionAttribute(method, targetClass);

    // ② ★ 获取事务管理器（PlatformTransactionManager）
    TransactionManager tm = determineTransactionManager(txAttr);

    // ③ ★ 创建事务（如果传播行为要求的话）
    TransactionInfo txInfo = createTransactionIfNecessary(tm, txAttr, joinpointIdentification);

    Object retVal;
    try {
        // ④ 执行目标方法（业务逻辑）
        retVal = invocation.proceedWithInvocation();
    } catch (Throwable ex) {
        // ⑤ 异常时回滚（判断是否匹配 rollbackFor）
        completeTransactionAfterThrowing(txInfo, ex);
        throw ex;
    } finally {
        // ⑥ 清理事务上下文
        cleanupTransactionInfo(txInfo);
    }
    // ⑦ 正常返回时提交事务
    commitTransactionAfterReturning(txInfo);
    return retVal;
}
```

### 6.1 事务传播行为的源码体现

```java
// AbstractPlatformTransactionManager.getTransaction()（简化）

// PROPAGATION_REQUIRED（默认）：
if (txAttr.getPropagationBehavior() == PROPAGATION_REQUIRED) {
    if (existingTransaction != null) {
        return existingTransaction;  // 有事务则加入
    }
    return createNewTransaction();   // 无事务则创建
}

// PROPAGATION_REQUIRES_NEW：
if (txAttr.getPropagationBehavior() == PROPAGATION_REQUIRES_NEW) {
    if (existingTransaction != null) {
        suspend(existingTransaction);  // 挂起当前事务
    }
    return createNewTransaction();     // 始终创建新事务
}

// PROPAGATION_NESTED：
if (txAttr.getPropagationBehavior() == PROPAGATION_NESTED) {
    if (existingTransaction != null) {
        // 创建保存点（Savepoint）
        return createNestedTransaction(existingTransaction);
    }
    return createNewTransaction();
}
```

### 6.2 @Transactional 失效的经典场景（源码解释）

| 失效场景 | 源码层面的原因 |
|---------|--------------|
| **同类方法调用** | 调用 `this.methodB()` 不经过代理对象，AOP 拦截器链不生效 |
| **非 public 方法** | `AbstractFallbackTransactionAttributeSource` 默认只读取 public 方法上的 `@Transactional` |
| **异常被吞掉** | 事务回滚在 `completeTransactionAfterThrowing()` 中触发，catch 后不抛出则事务管理器感知不到异常 |
| **rollbackFor 不匹配** | 默认只回滚 `RuntimeException` 和 `Error`，受检异常不触发 `rollbackOn()` |
| **多线程** | 事务信息存储在 `ThreadLocal` 中（`TransactionSynchronizationManager`），跨线程不共享 |

---

## 七、AOP 调用链路完整示例

```
假设：UserService.save() 被 @Transactional 标注

调用栈（自上而下）：

1. 客户端调用 userService.save()
      │ userService 实际是 CGLIB 代理对象
2. CglibAopProxy.DynamicAdvisedInterceptor.intercept()
      │
3. ReflectiveMethodInvocation.proceed()
      │ 构建拦截器链：TransactionInterceptor
      │
4. TransactionInterceptor.invoke()
      │
5. invokeWithinTransaction()
      │ ① 开启事务（通过 DataSourceTransactionManager 获取 Connection，设置 autoCommit=false）
      │ ② 绑定 Connection 到当前线程（TransactionSynchronizationManager.bindResource()）
      │
6. invocation.proceed() → 回到 ReflectiveMethodInvocation，继续下一个拦截器
      │ （假设没有其他拦截器）
      │
7. ★ 目标方法执行：UserService.save() → userDao.insert()
      │ userDao 的 Connection 与事务 Connection 是同一个（由 TransactionSynchronizationManager 管理）
      │
8. 返回 → invokeWithinTransaction()
      │ commitTransactionAfterReturning()
      │ → DataSourceTransactionManager.doCommit()
      │ → Connection.commit()
      │ → 解绑线程资源
```

---

## 八、总结

| 概念 | 一句话总结 |
|------|-----------|
| **代理创建时机** | Bean 初始化后（`postProcessAfterInitialization`），由 `AbstractAutoProxyCreator` 触发 |
| **代理选择策略** | Spring Boot 2.x+ 默认 CGLIB；有接口且 `proxy-target-class=false` 时用 JDK 代理 |
| **拦截器链** | 每个方法调用动态匹配 Advisor，构建 MethodInterceptor 链，由 `ReflectiveMethodInvocation` 协调执行 |
| **@Transactional 原理** | 基于 `TransactionInterceptor`（环绕通知），通过 `PlatformTransactionManager` 管理事务 |
| **事务同步** | 通过 `TransactionSynchronizationManager` 将 Connection 绑定到 ThreadLocal，保证同一事务内共用连接 |
| **循环依赖中的 AOP** | 三级缓存的 `getEarlyBeanReference()` 在对象暴露给其他 Bean 时提前创建代理 |

**核心设计模式一览**：

| 设计模式 | 在 Spring AOP 中的体现 |
|---------|----------------------|
| 代理模式 | JDK 动态代理 / CGLIB 代理 |
| 责任链模式 | MethodInterceptor 拦截器链 |
| 模板方法 | `AbstractAutoProxyCreator` 中 `createProxy()` 流程 |
| 策略模式 | `AopProxy` 接口（JDK vs CGLIB 两种实现） |
| 工厂模式 | `AopProxyFactory` → `DefaultAopProxyFactory` |

---

## 参考

- [Spring Framework 官方文档 - AOP](https://docs.spring.io/spring-framework/reference/core/aop.html)
- Spring Framework 5.x / 6.x 源码：`org.springframework.aop` 包
- 《Spring 源码深度解析（第 2 版）》—— 郝佳
- 《Spring 技术内幕：深入解析 Spring 架构与设计原理》—— 计文柯
