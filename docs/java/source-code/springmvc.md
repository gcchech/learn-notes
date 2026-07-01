---
title: SpringMVC 请求处理源码解析
icon: code-branch
order: 3
category:
  - Java
  - 源码解析
tag:
  - SpringMVC
  - DispatcherServlet
  - HandlerMapping
  - HandlerAdapter
  - 参数解析
  - 返回值处理
  - 拦截器
---

# SpringMVC 源码解析：从 HTTP 请求到 Controller 方法的完整链路

> 📖 SpringMVC 是 Java Web 开发中最经典的 MVC 框架，其核心是一套精巧的**请求分发与处理机制**。本文从 `DispatcherServlet` 的初始化出发，逐层剖析 `HandlerMapping` 如何定位 Controller、`HandlerAdapter` 如何执行方法、**参数解析器**如何将 HTTP 参数自动绑定到 Java 对象、**返回值处理器**如何将方法返回值渲染为 HTTP 响应，以及**拦截器链**如何在请求前后织入横切逻辑。

---

## 一、⭐️ SpringMVC 的总体架构

### 1.1 核心组件全景图

```
HTTP 请求
  │
  ▼
┌─────────────────────────────────────────────────────────────────┐
│  DispatcherServlet（前端控制器 ★ 核心调度中枢）                   │
│                                                                  │
│  ① 根据请求 URL 查找合适的 Handler                               │
│  ② 找到能处理该 Handler 的 HandlerAdapter                        │
│  ③ 执行拦截器的 preHandle                                       │
│  ④ HandlerAdapter 真正调用 Controller 方法                       │
│  ⑤ 执行拦截器的 postHandle                                      │
│  ⑥ 渲染视图（或直接写出 JSON）                                   │
│  ⑦ 执行拦截器的 afterCompletion                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 九大组件的初始化

SpringMVC 在 `DispatcherServlet` 中定义了**九大策略组件**，全部在初始化阶段从 IoC 容器中加载：

```java
// DispatcherServlet.java —— initStrategies()
protected void initStrategies(ApplicationContext context) {
    // ① ★ HandlerMapping —— 根据请求找到 Handler（Controller 方法）
    initHandlerMappings(context);
    //    默认：RequestMappingHandlerMapping（解析 @RequestMapping）

    // ② ★ HandlerAdapter —— 真正调用 Handler
    initHandlerAdapters(context);
    //    默认：RequestMappingHandlerAdapter（处理 @RequestMapping 方法）

    // ③ ★ HandlerExceptionResolver —— 异常解析器
    initHandlerExceptionResolvers(context);
    //    默认：ExceptionHandlerExceptionResolver（处理 @ExceptionHandler）

    // ④ ViewResolver —— 视图解析器
    initViewResolvers(context);

    // ⑤ MultipartResolver —— 文件上传解析器
    initMultipartResolver(context);

    // ⑥ LocaleResolver —— 国际化解析器
    initLocaleResolver(context);

    // ⑦ ThemeResolver —— 主题解析器
    initThemeResolver(context);

    // ⑧ FlashMapManager —— 重定向 Flash 属性管理
    initFlashMapManager(context);

    // ⑨ RequestToViewNameTranslator —— 无视图名时的默认视图名
    initRequestToViewNameTranslator(context);
}
```

---

## 二、⭐️ DispatcherServlet.doDispatch() —— 请求处理的主流程

这是 SpringMVC 中**最重要的方法**，一切请求都从这里分发：

```java
// DispatcherServlet.java（SpringMVC 源码核心，简化版）
protected void doDispatch(HttpServletRequest request,
        HttpServletResponse response) throws Exception {

    HttpServletRequest processedRequest = request;
    HandlerExecutionChain mappedHandler = null;   // 处理器执行链
    ModelAndView mv = null;

    try {
        // ① 检查是否为文件上传请求 → 包装为 MultipartHttpServletRequest
        processedRequest = checkMultipart(request);

        // ② ★ 获取 Handler：遍历所有 HandlerMapping，找到能处理该请求的 Handler
        mappedHandler = getHandler(processedRequest);
        if (mappedHandler == null) {
            // 没有找到 Handler → 404
            noHandlerFound(processedRequest, response);
            return;
        }

        // ③ ★ 获取 HandlerAdapter：找到能执行该 Handler 的适配器
        HandlerAdapter ha = getHandlerAdapter(mappedHandler.getHandler());

        // ④ ★ 执行拦截器的 preHandle（正序）
        if (!mappedHandler.applyPreHandle(processedRequest, response)) {
            return;  // 任何一个拦截器返回 false → 停止处理
        }

        // ⑤ ★★★ 核心：HandlerAdapter 真正调用 Controller 方法
        mv = ha.handle(processedRequest, response, mappedHandler.getHandler());

        // ⑥ ★ 执行拦截器的 postHandle（倒序）
        mappedHandler.applyPostHandle(processedRequest, response, mv);

    } catch (Exception ex) {
        // 进入异常处理流程
        processDispatchResult(processedRequest, response, mappedHandler, mv, ex);
    }

    // ⑦ 渲染结果（视图 / JSON）
    processDispatchResult(processedRequest, response, mappedHandler, mv, null);
}
```

---

## 三、⭐️ HandlerMapping —— 请求 URL 如何映射到 Controller 方法？

### 3.1 RequestMappingHandlerMapping 的初始化

```java
// RequestMappingHandlerMapping 的父类继承链：
// AbstractHandlerMapping
//   ↑
// AbstractHandlerMethodMapping<T>
//   ↑
// RequestMappingHandlerMapping ★

// 关键：实现了 InitializingBean 接口
// 在 Spring 容器启动时，afterPropertiesSet() 会被自动调用

@Override
public void afterPropertiesSet() {
    initHandlerMethods();  // ★ 扫描所有 Controller，注册映射关系
}

protected void initHandlerMethods() {
    // ① 遍历容器中所有 Bean
    for (String beanName : getCandidateBeanNames()) {
        // ② 检查 Bean 类上是否有 @Controller 或 @RequestMapping
        if (isHandler(beanType)) {
            // ③ ★ 解析该 Bean 中所有带 @RequestMapping 的方法
            detectHandlerMethods(beanName);
        }
    }
}

protected void detectHandlerMethods(Object handler) {
    Class<?> handlerType = handler.getClass();
    // ① 遍历类的所有方法
    for (Method method : handlerType.getMethods()) {
        // ② ★ 解析方法上的 @RequestMapping（包括类级别的合并）
        RequestMappingInfo mapping = getMappingForMethod(method, handlerType);
        if (mapping != null) {
            // ③ ★ 注册映射：URL patterns → HandlerMethod
            registerHandlerMethod(handler, method, mapping);
        }
    }
}
```

### 3.2 映射注册的核心数据结构

```java
// AbstractHandlerMethodMapping 内部维护的映射表
// MappingRegistry 持有以下数据结构：

// ★ 核心映射：URL pattern → HandlerMethod
Map<T, HandlerMethod> mappingLookup = new LinkedHashMap<>();

// ★ URL → HandlerMethod 的快速查找（CORS 请求用）
Map<String, List<HandlerMethod>> urlLookup = new LinkedHashMap<>();

// ★ 映射名 → HandlerMethod 列表
Map<String, List<HandlerMethod>> nameLookup = new ConcurrentHashMap<>();

// ★ 所有注册的 HandlerMethod
Map<HandlerMethod, CorsConfiguration> corsLookup = new ConcurrentHashMap<>();
```

### 3.3 URL 匹配的细节

```java
// RequestMappingInfoHandlerMapping.lookupHandlerMethod()
// 当一个请求到达时：

protected HandlerMethod lookupHandlerMethod(String lookupPath,
        HttpServletRequest request) {
    List<Match> matches = new ArrayList<>();

    // ① ★ 遍历所有注册的 URL Pattern，找到匹配的
    List<T> directPathMatches = this.mappingRegistry.getMappingsByUrl(lookupPath);
    if (directPathMatches != null) {
        addMatchingMappings(directPathMatches, matches, request);
    }

    if (matches.isEmpty()) {
        // ② 没有精确匹配 → 遍历所有 pattern 做通配符匹配
        addMatchingMappings(this.mappingRegistry.getMappings().keySet(),
                matches, request);
    }

    // ③ ★ 多个匹配时，选择最优的（最具体的 pattern）
    matches.sort((m1, m2) -> m1.compareTo(m2, lookupPath));
    Match bestMatch = matches.get(0);

    // ④ ★ 如果最佳匹配有多个（相同的匹配度），选择最接近的
    //    比较规则：方法数 → 参数匹配度 → headers → consumes → produces
    handleMatch(bestMatch.mapping, lookupPath, request);

    return bestMatch.handlerMethod;
}
```

---

## 四、⭐️ HandlerAdapter —— 如何真正调用 Controller 方法？

### 4.1 RequestMappingHandlerAdapter 的执行流程

```java
// RequestMappingHandlerAdapter.handleInternal()
@Override
protected ModelAndView handleInternal(HttpServletRequest request,
        HttpServletResponse response, HandlerMethod handlerMethod)
        throws Exception {

    ModelAndView mav;
    // ① 检查 Session 同步（@SessionAttributes）
    // ② ★ 核心：调用 Controller 方法
    mav = invokeHandlerMethod(request, response, handlerMethod);
    return mav;
}

// invokeHandlerMethod() —— 核心中的核心
protected ModelAndView invokeHandlerMethod(HttpServletRequest request,
        HttpServletResponse response, HandlerMethod handlerMethod)
        throws Exception {

    // ① ★ 包装为 ServletInvocableHandlerMethod
    ServletInvocableHandlerMethod invocableMethod =
            createInvocableHandlerMethod(handlerMethod);

    // ② 设置参数解析器（Argument Resolvers）
    invocableMethod.setHandlerMethodArgumentResolvers(
            this.argumentResolvers.getResolvers());

    // ③ 设置返回值处理器（Return Value Handlers）
    invocableMethod.setHandlerMethodReturnValueHandlers(
            this.returnValueHandlers.getHandlers());

    // ④ ★ 准备 ModelAndViewContainer（Model 数据的暂存容器）
    ModelAndViewContainer mavContainer = new ModelAndViewContainer();

    // ⑤ 调用 @InitBinder 方法 → 注册数据绑定器
    // ⑥ 调用 @ModelAttribute 方法 → 填充 Model

    // ⑦ ★★★ 真正执行 Controller 方法
    invocableMethod.invokeAndHandle(request, response, mavContainer);

    // ⑧ 构建 ModelAndView
    return getModelAndView(mavContainer);
}
```

### 4.2 ServletInvocableHandlerMethod.invokeAndHandle()

```java
public void invokeAndHandle(ServletWebRequest webRequest,
        ModelAndViewContainer mavContainer, Object... providedArgs)
        throws Exception {

    // ① ★ 调用方法：参数解析 → 反射调用 → 得到返回值
    Object returnValue = invokeForRequest(webRequest, mavContainer, providedArgs);

    // ② ★ 处理返回值：使用 ReturnValueHandler 将返回值写入 response
    try {
        this.returnValueHandlers.handleReturnValue(
                returnValue,
                getReturnValueType(returnValue),
                mavContainer, webRequest);
    } catch (Exception ex) {
        throw ex;
    }
}
```

---

## 五、⭐️⭐️ 参数解析器——HandlerMethodArgumentResolver

这是 SpringMVC 中最精妙的设计之一：**如何将 HTTP 请求中的各种参数自动绑定到 Java 方法的形参上？**

### 5.1 参数解析器接口

```java
public interface HandlerMethodArgumentResolver {

    // 判断该解析器是否支持当前参数
    boolean supportsParameter(MethodParameter parameter);

    // ★ 解析参数：从 request 中提取数据，转换为方法参数所需的类型
    Object resolveArgument(MethodParameter parameter,
            @Nullable ModelAndViewContainer mavContainer,
            NativeWebRequest webRequest,
            @Nullable WebDataBinderFactory binderFactory) throws Exception;
}
```

### 5.2 内置的 26 个参数解析器（默认注册）

SpringMVC 默认注册了 26 个参数解析器，按顺序匹配：

| 编号 | 解析器类 | 负责处理的参数类型 |
|------|---------|-------------------|
| 1 | `RequestParamMethodArgumentResolver` | `@RequestParam` 标注的参数 |
| 2 | `PathVariableMethodArgumentResolver` | `@PathVariable` 标注的参数 |
| 3 | `RequestResponseBodyMethodProcessor` | `@RequestBody` 标注的参数 |
| 4 | `RequestHeaderMethodArgumentResolver` | `@RequestHeader` 标注的参数 |
| 5 | `ServletRequestMethodArgumentResolver` | `HttpServletRequest` 等 |
| 6 | `ServletResponseMethodArgumentResolver` | `HttpServletResponse` 等 |
| 7 | `ModelAttributeMethodProcessor` | `@ModelAttribute` 或 POJO 参数 |
| 8 | `RequestPartMethodArgumentResolver` | `@RequestPart`（文件上传部分） |
| 9 | `SessionAttributeMethodArgumentResolver` | `@SessionAttribute` |
| 10 | ... | 还包括 `Principal`、`Locale`、`TimeZone` 等 |

### 5.3 @RequestBody 参数解析的核心源码

```java
// RequestResponseBodyMethodProcessor.resolveArgument()
@Override
public Object resolveArgument(MethodParameter parameter,
        ModelAndViewContainer mavContainer, NativeWebRequest webRequest,
        WebDataBinderFactory binderFactory) throws Exception {

    // ① ★ 使用 HttpMessageConverter 读取请求体并反序列化
    Object arg = readWithMessageConverters(webRequest, parameter,
            parameter.getNestedGenericParameterType());

    // ② ★ 如果参数有 @Valid 或 @Validated 注解 → 触发校验
    if (arg != null && parameter.hasParameterAnnotation(Validated.class)) {
        validateIfApplicable(binder, parameter);
        if (binder.getBindingResult().hasErrors()) {
            // 校验失败 → 抛出 MethodArgumentNotValidException
            throw new MethodArgumentNotValidException(parameter,
                    binder.getBindingResult());
        }
    }

    return arg;
}

// readWithMessageConverters() 内部逻辑：
// 遍历所有注册的 HttpMessageConverter
// → 找到第一个能处理该 Content-Type 和返回类型的 Converter
// → 调用 converter.read() 反序列化
// 典型的调用链：
//   Content-Type: application/json
//   → MappingJackson2HttpMessageConverter
//   → Jackson ObjectMapper.readValue(requestBody, targetType)
```

### 5.4 @RequestParam 参数解析的核心源码

```java
// RequestParamMethodArgumentResolver.resolveArgument()
@Override
protected Object resolveName(String name, MethodParameter parameter,
        NativeWebRequest request) throws Exception {

    // ① 从 request 的多个来源中查找参数值（优先级由高到低）
    //    a. MultipartFile（文件上传）
    //    b. Query Parameter（URL ?key=value）
    //    c. Form Data（POST 表单）
    Object arg = null;
    MultipartRequest multipartRequest =
            (MultipartRequest) request.getNativeRequest();
    List<MultipartFile> files = multipartRequest.getFiles(name);
    if (!files.isEmpty()) {
        arg = (files.size() == 1) ? files.get(0) : files;
    }
    if (arg == null) {
        String[] paramValues = request.getParameterValues(name);
        if (paramValues != null) {
            arg = (paramValues.length == 1) ? paramValues[0] : paramValues;
        }
    }
    return arg;
}
```

---

## 六、⭐️⭐️ 返回值处理器——HandlerMethodReturnValueHandler

### 6.1 返回值处理器接口

```java
public interface HandlerMethodReturnValueHandler {

    // 判断是否支持该返回值类型
    boolean supportsReturnType(MethodParameter returnType);

    // ★ 处理返回值：写入 HttpServletResponse
    void handleReturnValue(@Nullable Object returnValue,
            MethodParameter returnType,
            ModelAndViewContainer mavContainer,
            NativeWebRequest webRequest) throws Exception;
}
```

### 6.2 默认注册的返回值处理器

| 处理器类 | 处理的返回值 |
|---------|------------|
| `ModelAndViewMethodReturnValueHandler` | `ModelAndView` |
| `ViewMethodReturnValueHandler` | `View` 对象 |
| `ModelMethodProcessor` | `Model` 对象 |
| `RequestResponseBodyMethodProcessor` | `@ResponseBody` 标注的方法 |
| `HttpEntityMethodProcessor` | `HttpEntity` / `ResponseEntity` |
| `CallableMethodReturnValueHandler` | `Callable`（异步请求） |
| `DeferredResultMethodReturnValueHandler` | `DeferredResult`（异步结果） |
| `StreamingResponseBodyReturnValueHandler` | `StreamingResponseBody` |

### 6.3 @ResponseBody 的核心源码

```java
// RequestResponseBodyMethodProcessor.handleReturnValue()
@Override
public void handleReturnValue(@Nullable Object returnValue,
        MethodParameter returnType, ModelAndViewContainer mavContainer,
        NativeWebRequest webRequest) throws Exception {

    // ① 标记请求已处理（不需要视图解析）
    mavContainer.setRequestHandled(true);

    // ② ★ 创建 Servlet 输出流
    ServletServerHttpResponse outputMessage =
            createOutputMessage(webRequest);

    // ③ ★ 使用 HttpMessageConverter 将返回值序列化到响应体
    writeWithMessageConverters(returnValue, returnType, webRequest, outputMessage);
}

// writeWithMessageConverters 内部逻辑：
// ① 从 Accept 请求头获取客户端可接受的媒体类型
// ② 遍历所有 HttpMessageConverter，找到能序列化该返回值类型的
// ③ 设置 Content-Type 响应头
// ④ 调用 converter.write(value, contentType, outputMessage)
//
// 典型调用链（返回 Java 对象 → JSON）：
//   MappingJackson2HttpMessageConverter
//   → Jackson ObjectMapper.writeValue(outputStream, returnValue)
//   → Content-Type: application/json
```

---

## 七、⭐️ 拦截器链——HandlerInterceptor

### 7.1 拦截器的执行顺序

```
请求到达
  │
  ▼
┌──────────────────────────────────────┐
│ 拦截器 1.preHandle()                 │  ← 如果返回 false，请求终止
├──────────────────────────────────────┤
│ 拦截器 2.preHandle()                 │
├──────────────────────────────────────┤
│ 拦截器 3.preHandle()                 │
├──────────────────────────────────────┤
│                                      │
│ ★ Controller 方法执行                │
│                                      │
├──────────────────────────────────────┤
│ 拦截器 3.postHandle()                │  ← 倒序执行
├──────────────────────────────────────┤
│ 拦截器 2.postHandle()                │
├──────────────────────────────────────┤
│ 拦截器 1.postHandle()                │
├──────────────────────────────────────┤
│ （视图渲染...）                       │
├──────────────────────────────────────┤
│ 拦截器 3.afterCompletion()           │  ← 倒序执行（即使异常也会调用）
├──────────────────────────────────────┤
│ 拦截器 2.afterCompletion()           │
├──────────────────────────────────────┤
│ 拦截器 1.afterCompletion()           │
└──────────────────────────────────────┘
```

### 7.2 HandlerExecutionChain 的拦截器调度源码

```java
// HandlerExecutionChain.java
public class HandlerExecutionChain {

    private final Object handler;                    // Handler（Controller 方法）
    private final List<HandlerInterceptor> interceptorList = new ArrayList<>();
    private int interceptorIndex = -1;               // 当前执行到哪个拦截器

    // preHandle：正序执行
    boolean applyPreHandle(HttpServletRequest request,
            HttpServletResponse response) throws Exception {
        for (int i = 0; i < this.interceptorList.size(); i++) {
            HandlerInterceptor interceptor = this.interceptorList.get(i);
            if (!interceptor.preHandle(request, response, this.handler)) {
                // ★ 任何一个返回 false → 触发已执行拦截器的 afterCompletion
                triggerAfterCompletion(request, response, null);
                return false;
            }
            this.interceptorIndex = i;  // 记录已执行到的位置
        }
        return true;
    }

    // postHandle：倒序执行
    void applyPostHandle(HttpServletRequest request,
            HttpServletResponse response, @Nullable ModelAndView mv)
            throws Exception {
        for (int i = this.interceptorList.size() - 1; i >= 0; i--) {
            HandlerInterceptor interceptor = this.interceptorList.get(i);
            interceptor.postHandle(request, response, this.handler, mv);
        }
    }

    // afterCompletion：倒序执行（finally 中调用，保证一定执行）
    void triggerAfterCompletion(HttpServletRequest request,
            HttpServletResponse response, @Nullable Exception ex) {
        for (int i = this.interceptorIndex; i >= 0; i--) {
            try {
                this.interceptorList.get(i).afterCompletion(
                        request, response, this.handler, ex);
            } catch (Throwable ex2) {
                logger.error("HandlerInterceptor.afterCompletion threw exception", ex2);
            }
        }
    }
}
```

---

## 八、⭐ 异常处理——@ExceptionHandler 的原理

```java
// ExceptionHandlerExceptionResolver —— 处理 @ExceptionHandler 注解的方法
@Override
protected ModelAndView doResolveHandlerMethodException(
        HttpServletRequest request, HttpServletResponse response,
        HandlerMethod handlerMethod, Exception exception) {

    // ① ★ 查找匹配该异常类型的 @ExceptionHandler 方法
    //    先查找 Controller 内部的 @ExceptionHandler
    //    再查找 @ControllerAdvice 全局的 @ExceptionHandler
    ServletInvocableHandlerMethod exceptionHandlerMethod =
            getExceptionHandlerMethod(handlerMethod, exception);

    if (exceptionHandlerMethod == null) {
        return null;  // 没有找到 → 交给下一个 ExceptionResolver
    }

    // ② 创建异常处理的参数上下文
    //    异常对象可以作为方法参数通过 @ExceptionHandler 方法接收
    ExceptionHandlerMethodResolver resolver =
            new ExceptionHandlerMethodResolver(handlerMethod.getBeanType());

    // ③ 执行异常处理方法（参数解析、返回值处理等流程和普通 Controller 方法一致）
    exceptionHandlerMethod.invokeAndHandle(request, response,
            new ModelAndViewContainer());

    return new ModelAndView();  // 返回空的 ModelAndView（请求已处理完毕）
}
```

**异常解析器链的执行顺序**：

```
ExceptionHandlerExceptionResolver（处理 @ExceptionHandler）
    ↓ 无法处理
ResponseStatusExceptionResolver（处理 @ResponseStatus）
    ↓ 无法处理
DefaultHandlerExceptionResolver（SpringMVC 内置异常的默认处理）
    ↓ 无法处理
自定义 HandlerExceptionResolver
```

---

## 九、HttpMessageConverter —— HTTP 消息转换器

`HttpMessageConverter` 是 `@RequestBody` 和 `@ResponseBody` 的底层支撑，负责 HTTP 请求/响应体与 Java 对象之间的双向转换。

```java
public interface HttpMessageConverter<T> {

    // 是否能读取该类型（反序列化：请求体 → Java 对象）
    boolean canRead(Class<?> clazz, @Nullable MediaType mediaType);

    // 是否能写入该类型（序列化：Java 对象 → 响应体）
    boolean canWrite(Class<?> clazz, @Nullable MediaType mediaType);

    // ★ 读取请求体，反序列化为 Java 对象
    T read(Class<? extends T> clazz, HttpInputMessage inputMessage)
            throws IOException, HttpMessageNotReadableException;

    // ★ 将 Java 对象序列化写入响应体
    void write(T t, @Nullable MediaType contentType,
            HttpOutputMessage outputMessage)
            throws IOException, HttpMessageNotWritableException;
}
```

### 9.1 默认注册的 HttpMessageConverter

| Converter | 处理的 Content-Type | 底层依赖 |
|-----------|-------------------|---------|
| `StringHttpMessageConverter` | `text/plain` | `String.getBytes()` |
| `MappingJackson2HttpMessageConverter` | `application/json` | Jackson `ObjectMapper` |
| `FormHttpMessageConverter` | `application/x-www-form-urlencoded` | `MultiValueMap` |
| `ResourceHttpMessageConverter` | `*/*`（Resource 类型） | 文件下载 |
| `ByteArrayHttpMessageConverter` | `*/*`（byte[] 类型） | 原始字节 |
| `SourceHttpMessageConverter` | `text/xml`、`application/xml` | `javax.xml.transform` |

---

## 十、总结

| 概念 | 一句话总结 |
|------|-----------|
| **DispatcherServlet** | 前端控制器，doDispatch() 是整个请求处理的主入口 |
| **HandlerMapping** | 根据 URL pattern 找到对应的 HandlerMethod（Controller 方法） |
| **HandlerAdapter** | 适配器模式，真正调用 Handler 的方法（反射） |
| **ArgumentResolver** | 策略模式，将 HTTP 参数自动转为 Java 方法参数（26 个内置解析器） |
| **ReturnValueHandler** | 策略模式，将 Java 返回值写入 HTTP 响应（`@ResponseBody` → JSON） |
| **HttpMessageConverter** | 请求体/响应体的序列化/反序列化（Jackson JSON 是最常用的实现） |
| **Interceptor** | 责任链模式，三阶段回调（pre → post → afterCompletion） |
| **ExceptionResolver** | 异常处理的策略链（@ExceptionHandler 优先级最高） |

**核心设计模式一览**：

| 设计模式 | 在 SpringMVC 中的体现 |
|---------|----------------------|
| 前端控制器 | `DispatcherServlet` |
| 策略模式 | `HandlerMapping`、`HandlerAdapter`、`ArgumentResolver`、`ReturnValueHandler` |
| 适配器模式 | `HandlerAdapter` 接口 |
| 责任链模式 | `HandlerInterceptor` 链 |
| 模板方法 | `AbstractHandlerMethodAdapter` 等抽象类 |
| 组合模式 | `HandlerExecutionChain` |

---

## 参考

- [Spring Framework 官方文档 - Web MVC](https://docs.spring.io/spring-framework/reference/web/webmvc.html)
- Spring Framework 5.x / 6.x 源码：`org.springframework.web.servlet` 包
- 《Spring 源码深度解析（第 2 版）》—— 郝佳
- 《Spring MVC 学习指南》—— Paul Deck
