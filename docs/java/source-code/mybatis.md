---
title: MyBatis 源码解析
icon: database
order: 4
category:
  - Java
  - 源码解析
tag:
  - MyBatis
  - ORM
  - SqlSession
  - Mapper 代理
  - 插件机制
  - 缓存
  - Executor
---

# MyBatis 源码解析：从 SQL 配置到 Mapper 执行的完整流程

> 📖 MyBatis 是 Java 生态中最流行的持久层框架之一，它的核心魅力在于**半自动化的 SQL 映射**——开发者可以完全掌控 SQL，同时享受框架带来的参数映射、结果集映射、缓存、插件等便利。本文从 `SqlSessionFactory` 的构建出发，逐层剖析 Mapper 代理对象的创建原理、`Executor` 的执行流程、`StatementHandler` 的参数绑定与结果映射，以及 MyBatis 两级缓存和插件机制的设计精髓。

---

## 一、⭐️ MyBatis 整体架构概览

### 1.1 核心组件关系图

```
┌──────────────────────────────────────────────────────────────────┐
│                       MyBatis 架构分层                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  接口层                                                           │
│  ┌─────────────┐                                                  │
│  │  SqlSession │ ← 用户操作入口：selectOne、insert、getMapper...  │
│  └──────┬──────┘                                                  │
│         │                                                         │
│  核心处理层                                                        │
│  ┌──────▼──────────────────────────────────────────────┐          │
│  │  Executor（执行器）                                    │          │
│  │   └── BaseExecutor（模板方法）                         │          │
│  │        ├── SimpleExecutor（每次创建 Statement）        │          │
│  │        ├── ReuseExecutor（复用 Statement）             │          │
│  │        ├── BatchExecutor（批量处理）                   │          │
│  │        └── CachingExecutor（★ 二级缓存装饰器）         │          │
│  └──────┬──────────────────────────────────────────────┘          │
│         │                                                         │
│  ┌──────▼──────────────────────────────────────────────┐          │
│  │  StatementHandler（语句处理器）                        │          │
│  │   ├── ParameterHandler（参数绑定）                    │          │
│  │   ├── ResultSetHandler（结果集映射）                  │          │
│  │   └── Statement 创建与管理                            │          │
│  └──────┬──────────────────────────────────────────────┘          │
│         │                                                         │
│  基础支持层                                                        │
│  ┌──────▼──────────────────────────────────────────────┐          │
│  │  配置解析、XML Mapper 解析、类型转换、数据源、事务、缓存  │          │
│  └─────────────────────────────────────────────────────┘          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 一条 SQL 的执行全链路

```
getMapper(UserMapper.class)
  → MapperProxy.invoke()
    → MapperMethod.execute()
      → SqlSession.selectOne()
        → CachingExecutor.query()
          → BaseExecutor.query()
            → SimpleExecutor.doQuery()
              → StatementHandler 创建 PreparedStatement
              → ParameterHandler 设置 SQL 参数
              → PreparedStatement.execute()
              → ResultSetHandler 映射结果为 Java 对象
```

---

## 二、⭐️ 配置加载与 SqlSessionFactory 构建

### 2.1 mybatis-config.xml 解析流程

```java
// SqlSessionFactoryBuilder.build()
public SqlSessionFactory build(InputStream inputStream) {
    // ① ★ 创建 XMLConfigBuilder 解析 mybatis-config.xml
    XMLConfigBuilder parser = new XMLConfigBuilder(inputStream, null, null);
    // ② ★ 解析出 Configuration 对象（全局唯一的配置中心）
    Configuration configuration = parser.parse();
    // ③ 构建 DefaultSqlSessionFactory
    return new DefaultSqlSessionFactory(configuration);
}
```

### 2.2 Configuration —— 全局配置中心

```java
public class Configuration {

    // ★ 核心注册表 —— 所有 Mapper 的 SQL 语句都注册在这里
    protected final MappedStatementMap mappedStatements =
            new StrictMap<MappedStatement>("Mapped Statements collection");

    // ★ Mapper 接口注册表 —— 记录哪些接口是 MyBatis Mapper
    protected final MapperRegistry mapperRegistry = new MapperRegistry(this);

    // InterceptorChain —— 插件链
    protected final InterceptorChain interceptorChain = new InterceptorChain();

    // TypeAliasRegistry —— 类型别名注册表
    protected final TypeAliasRegistry typeAliasRegistry = new TypeAliasRegistry();

    // TypeHandlerRegistry —— 类型处理器注册表
    protected final TypeHandlerRegistry typeHandlerRegistry = new TypeHandlerRegistry();

    // 环境（包含数据源和事务工厂）
    protected Environment environment;

    // 二级缓存开启标识
    protected boolean cacheEnabled = true;

    // 懒加载开关
    protected boolean lazyLoadingEnabled = false;

    // 激进懒加载（调用任一方法即加载全部）
    protected boolean aggressiveLazyLoading = false;

    // 下划线转驼峰
    protected boolean mapUnderscoreToCamelCase = false;
}
```

### 2.3 MappedStatement —— SQL 语句的完整描述

每个 `<select>` / `<insert>` / `<update>` / `<delete>` 节点都会被解析为一个 **MappedStatement**：

```java
public final class MappedStatement {
    private String id;                    // 唯一标识（namespace + statementId）
    private SqlCommandType sqlCommandType; // SELECT / INSERT / UPDATE / DELETE
    private SqlSource sqlSource;          // ★ SQL 源（包含 #{} 占位符的原始 SQL）
    private StatementType statementType;  // STATEMENT / PREPARED / CALLABLE
    private ResultMapType resultMapType;
    private List<ResultMap> resultMaps;   // 结果映射
    private ParameterMap parameterMap;     // 参数映射
    private Class<?> parameterType;       // 参数类型
    private String[] keyProperties;       // 主键属性
    private boolean flushCacheRequired;   // 是否清空缓存
    private boolean useCache;             // 是否使用二级缓存
    private Integer timeout;              // 超时时间
    private Integer fetchSize;            // 批量获取大小
}
```

---

## 三、⭐️⭐️ Mapper 代理——JDK 动态代理的精妙应用

这是一种优雅的设计：**你只定义接口，MyBatis 帮你生成实现**。

### 3.1 Mapper 代理的创建

```java
// MapperRegistry.getMapper()
public <T> T getMapper(Class<T> type, SqlSession sqlSession) {
    // ① 获取 MapperProxyFactory（每个 Mapper 接口对应一个工厂）
    final MapperProxyFactory<T> mapperProxyFactory =
            (MapperProxyFactory<T>) knownMappers.get(type);

    // ② ★ 创建 Mapper 代理对象
    return mapperProxyFactory.newInstance(sqlSession);
}

// MapperProxyFactory.newInstance()
protected T newInstance(MapperProxy<T> mapperProxy) {
    // ★ 使用 JDK 动态代理，创建 Mapper 接口的实例
    return (T) Proxy.newProxyInstance(
            mapperInterface.getClassLoader(),
            new Class[]{ mapperInterface },
            mapperProxy);
}
```

### 3.2 MapperProxy.invoke() —— 代理调用的核心

```java
@Override
public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
    // ① Object 类的方法（toString、hashCode、equals）→ 直接调用
    if (Object.class.equals(method.getDeclaringClass())) {
        return method.invoke(this, args);
    }
    // ② 接口的 default 方法 → 通过 MethodHandle 调用
    if (method.isDefault()) {
        return invokeDefaultMethod(proxy, method, args);
    }
    // ③ ★★★ Mapper 接口方法 → 走数据库查询
    // 先尝试从缓存获取 MapperMethod（每个接口方法对应一个 MapperMethod）
    MapperMethod mapperMethod = cachedMapperMethod(method);
    // 执行数据库操作
    return mapperMethod.execute(sqlSession, args);
}
```

### 3.3 MapperMethod.execute() —— 根据 SQL 类型分发

```java
public Object execute(SqlSession sqlSession, Object[] args) {
    Object result;
    switch (command.getType()) {
        case INSERT: {
            Object param = method.convertArgsToSqlCommandParam(args);
            result = rowCountResult(sqlSession.insert(command.getName(), param));
            break;
        }
        case UPDATE: {
            Object param = method.convertArgsToSqlCommandParam(args);
            result = rowCountResult(sqlSession.update(command.getName(), param));
            break;
        }
        case DELETE: {
            Object param = method.convertArgsToSqlCommandParam(args);
            result = rowCountResult(sqlSession.delete(command.getName(), param));
            break;
        }
        case SELECT:
            // ★ 根据返回类型进一步分支
            if (method.returnsVoid() && method.hasResultHandler()) {
                executeWithResultHandler(sqlSession, args);
                result = null;
            } else if (method.returnsMany()) {
                result = executeForMany(sqlSession, args);  // 返回 List
            } else if (method.returnsMap()) {
                result = executeForMap(sqlSession, args);   // 返回 Map
            } else if (method.returnsCursor()) {
                result = executeForCursor(sqlSession, args);
            } else {
                // ★ 返回单个对象
                Object param = method.convertArgsToSqlCommandParam(args);
                result = sqlSession.selectOne(command.getName(), param);
            }
            break;
        case FLUSH:
            result = sqlSession.flushStatements();
            break;
        default:
            throw new BindingException("Unknown execution method for: " + command.getName());
    }
    return result;
}
```

---

## 四、⭐️⭐️ Executor —— 执行器的模板方法模式

### 4.1 Executor 继承体系

```java
public interface Executor {
    int update(MappedStatement ms, Object parameter) throws SQLException;
    <E> List<E> query(MappedStatement ms, Object parameter,
            RowBounds rowBounds, ResultHandler resultHandler) throws SQLException;
    void commit(boolean required) throws SQLException;
    void rollback(boolean required) throws SQLException;
    Transaction getTransaction();
    CacheKey createCacheKey(MappedStatement ms, Object parameter,
            RowBounds rowBounds, BoundSql boundSql);
    boolean isCached(MappedStatement ms, CacheKey key);
    void clearLocalCache();  // 清空一级缓存
    // ...
}
```

| Executor 类型 | 特点 | 使用场景 |
|--------------|------|---------|
| **SimpleExecutor** | 每次执行 SQL 创建新的 Statement | 默认执行器 |
| **ReuseExecutor** | 复用 Statement（同一条 SQL 多次执行时） | 减少 Statement 创建开销 |
| **BatchExecutor** | 批量执行 SQL（通过 `Statement.addBatch()`） | 批量插入/更新 |
| **CachingExecutor** | ★ 装饰器模式，在 BaseExecutor 外层包装二级缓存 | 需要二级缓存时 |

### 4.2 BaseExecutor.query() —— 一级缓存的实现

```java
// BaseExecutor.java
@Override
public <E> List<E> query(MappedStatement ms, Object parameter,
        RowBounds rowBounds, ResultHandler resultHandler,
        CacheKey key, BoundSql boundSql) throws SQLException {

    if (closed) {
        throw new ExecutorException("Executor was closed.");
    }

    // ① ★ 是否需要清空一级缓存
    //    当 MappedStatement 配置了 flushCache=true（INSERT/UPDATE/DELETE 默认 true）
    if (queryStack == 0 && ms.isFlushCacheRequired()) {
        clearLocalCache();  // 清空一级缓存
    }

    List<E> list;
    try {
        queryStack++;
        // ② ★ 先查一级缓存（localCache 是 PerpetualCache，本质是 HashMap）
        list = resultHandler == null ? (List<E>) localCache.getObject(key) : null;
        if (list != null) {
            // 缓存命中 → 直接返回
            handleLocallyCachedOutputParameters(ms, key, parameter, boundSql);
        } else {
            // ③ ★ 缓存未命中 → 查询数据库
            list = queryFromDatabase(ms, parameter, rowBounds, resultHandler, key, boundSql);
        }
    } finally {
        queryStack--;
    }

    if (queryStack == 0) {
        // ④ 延迟加载处理（如果需要）
        // ...
        // ⑤ 如果当前作用域是一级缓存 STATEMENT 级别 → 查询完成后清空
        if (configuration.getLocalCacheScope() == LocalCacheScope.STATEMENT) {
            clearLocalCache();
        }
    }
    return list;
}

// queryFromDatabase()
private <E> List<E> queryFromDatabase(MappedStatement ms, Object parameter,
        RowBounds rowBounds, ResultHandler resultHandler,
        CacheKey key, BoundSql boundSql) throws SQLException {

    List<E> list;
    // ① 占位符：防止循环缓存（递归查询）
    localCache.putObject(key, EXECUTION_PLACEHOLDER);
    try {
        // ② ★ 调用子类的 doQuery() —— 模板方法
        list = doQuery(ms, parameter, rowBounds, resultHandler, boundSql);
    } finally {
        // ③ 移除占位符
        localCache.removeObject(key);
    }
    // ④ ★ 将查询结果放入一级缓存
    localCache.putObject(key, list);
    if (ms.getStatementType() == StatementType.CALLABLE) {
        localOutputParameterCache.putObject(key, parameter);
    }
    return list;
}
```

### 4.3 SimpleExecutor.doQuery() —— 真正执行 SQL

```java
// SimpleExecutor.java
@Override
public <E> List<E> doQuery(MappedStatement ms, Object parameter,
        RowBounds rowBounds, ResultHandler resultHandler,
        BoundSql boundSql) throws SQLException {

    Configuration configuration = ms.getConfiguration();
    // ① ★ 创建 StatementHandler
    StatementHandler handler = configuration.newStatementHandler(
            wrapper, ms, parameter, rowBounds, resultHandler, boundSql);

    // ② ★ 获取 JDBC Statement
    Statement stmt = prepareStatement(handler);

    // ③ ★ 执行查询并映射结果
    return handler.query(stmt, resultHandler);
}

private Statement prepareStatement(StatementHandler handler) {
    // ① 从连接池获取 Connection
    Connection connection = getConnection(ms.getStatementLog());
    // ② 创建 PreparedStatement（或 Statement / CallableStatement）
    Statement stmt = handler.prepare(connection, transaction.getTimeout());
    // ③ ★ 参数绑定：将 #{} 占位符替换为实际参数值
    handler.parameterize(stmt);
    return stmt;
}
```

---

## 五、⭐️ SqlSource 与 #{} / ${} 的处理

### 5.1 SqlSource 的解析过程

```java
// SQL 解析流程
原始 XML SQL
    │
    ▼
XMLScriptBuilder.parseScriptNode()
    │  解析 <if>、<foreach>、<trim>、<where> 等动态 SQL 标签
    │  解析 #{} 和 ${}
    ▼
SqlSource 对象
    ├── DynamicSqlSource    ← 包含动态 SQL（<if>、<foreach> 等），每次执行时重新解析
    └── RawSqlSource        ← 不含动态标签，构建时直接编译为 StaticSqlSource
         └── StaticSqlSource ← 最终形式：完整 SQL + 参数映射列表
```

### 5.2 #{} 和 ${} 的根本区别

```
#{}：预编译占位符
  原始 SQL:  SELECT * FROM user WHERE id = #{userId}
  处理过程:
    ① 将 #{userId} 替换为 ?
    ② SQL 变为: SELECT * FROM user WHERE id = ?
    ③ 通过 PreparedStatement.setString(1, "123") 设置参数值
    ④ ★ 天然防 SQL 注入

${}：字符串替换
  原始 SQL:  SELECT * FROM ${tableName}
  处理过程:
    ① 直接将 ${tableName} 替换为参数值
    ② 如果 tableName = "user; DROP TABLE user;" → SQL 注入
    ③ ★ 不防注入，仅用于动态表名/列名等非值场景
```

---

## 六、⭐️ 参数映射与结果集映射

### 6.1 ParameterHandler —— 参数设置

```java
// DefaultParameterHandler.setParameters()
@Override
public void setParameters(PreparedStatement ps) {
    // parameterMappings 是解析 #{} 时生成的参数映射列表
    List<ParameterMapping> parameterMappings = boundSql.getParameterMappings();
    if (parameterMappings != null) {
        for (int i = 0; i < parameterMappings.size(); i++) {
            ParameterMapping parameterMapping = parameterMappings.get(i);

            // ① 获取参数值（通过反射从 parameterObject 中取出）
            Object value = typeParameterHandler.getParameterValue(parameterMapping);

            // ② ★ 选择合适的 TypeHandler 将 Java 对象转为 JDBC 类型
            TypeHandler typeHandler = parameterMapping.getTypeHandler();
            //    JdbcType jdbcType = parameterMapping.getJdbcType();
            //    typeHandler.setParameter(ps, i + 1, value, jdbcType);

            // ③ ★ 调用 PreparedStatement.setXxx()
            typeHandler.setParameter(ps, i + 1, value, jdbcType);
        }
    }
}
```

### 6.2 ResultSetHandler —— 结果集映射

```java
// DefaultResultSetHandler.handleResultSets()
@Override
public List<Object> handleResultSets(Statement stmt) throws SQLException {
    final List<Object> multipleResults = new ArrayList<>();

    int resultSetCount = 0;
    // ① 获取第一个 ResultSet
    ResultSetWrapper rsw = getFirstResultSet(stmt);

    // ② 获取该 MappedStatement 配置的 ResultMap 列表
    List<ResultMap> resultMaps = mappedStatement.getResultMaps();

    while (rsw != null && resultMaps.size() > resultSetCount) {
        ResultMap resultMap = resultMaps.get(resultSetCount);

        // ③ ★ 核心：将 ResultSet 行映射为 Java 对象列表
        handleResultSet(rsw, resultMap, multipleResults, null);

        // ④ 获取下一个 ResultSet（存储过程可能返回多个结果集）
        rsw = getNextResultSet(stmt);
        resultSetCount++;
    }
    return collapseSingleResultList(multipleResults);
}
```

### 6.3 自动映射（Auto Mapping）原理

```java
// DefaultResultSetHandler.automapColumns()
private List<UnMappedColumnAutoMapping> autoMapColumns(
        ResultSetWrapper rsw, ResultMap resultMap, ResultSet resultSet) {

    List<UnMappedColumnAutoMapping> autoMapping = new ArrayList<>();

    // ① 遍历 ResultSet 的所有列
    for (String column : rsw.getColumnNames()) {
        String propertyName = column;
        // ② 下划线转驼峰（如果 mapUnderscoreToCamelCase = true）
        //    user_name → userName
        if (configuration.isMapUnderscoreToCamelCase()) {
            propertyName = metaClass.findProperty(
                    underlineToCamelhump(column));
        }

        // ③ 查找目标类中同名的属性
        if (resultType.getPropertyType(propertyName) != null) {
            // ④ 选择合适的 TypeHandler 进行类型转换
            TypeHandler<?> typeHandler =
                    rsw.getTypeHandler(propertyType, column);
            autoMapping.add(new UnMappedColumnAutoMapping(
                    column, propertyName, typeHandler, propertyType));
        }
    }
    return autoMapping;
}
```

---

## 七、⭐️ 插件机制（InterceptorChain）

MyBatis 的插件机制是其**最灵活的设计之一**，允许在四大核心对象的方法调用上进行拦截增强。

### 7.1 可拦截的四大对象

| 拦截对象 | 可拦截的方法 |
|---------|------------|
| **Executor** | `update`、`query`、`flushStatements`、`commit`、`rollback`、`getTransaction`、`close` |
| **StatementHandler** | `prepare`、`parameterize`、`batch`、`update`、`query` |
| **ParameterHandler** | `getParameterObject`、`setParameters` |
| **ResultSetHandler** | `handleResultSets`、`handleOutputParameters` |

### 7.2 插件拦截原理 —— JDK 动态代理套娃

```java
// InterceptorChain.pluginAll()
public Object pluginAll(Object target) {
    for (Interceptor interceptor : interceptors) {
        // ★ 每个 Interceptor 将 target 包装一层代理
        //    如果有 3 个插件 → 包装 3 层代理（套娃）
        target = interceptor.plugin(target);
    }
    return target;
}

// 典型的插件实现（如 PageHelper 分页插件）
@Intercepts({
    @Signature(
        type = Executor.class,        // 拦截 Executor
        method = "query",             // 拦截 query 方法
        args = {MappedStatement.class, Object.class,
                RowBounds.class, ResultHandler.class}
    )
})
public class ExamplePlugin implements Interceptor {
    @Override
    public Object intercept(Invocation invocation) throws Throwable {
        // ★ 前置增强逻辑
        System.out.println("before query...");
        // 执行原方法
        Object result = invocation.proceed();
        // ★ 后置增强逻辑
        System.out.println("after query...");
        return result;
    }

    @Override
    public Object plugin(Object target) {
        // ★ 用 Plugin.wrap() 创建代理
        //    内部会根据 @Intercepts 注解判断是否需要拦截该对象
        return Plugin.wrap(target, this);
    }
}
```

### 7.3 Plugin.wrap() 源码

```java
// Plugin.java —— MyBatis 插件机制的核心
public static Object wrap(Object target, Interceptor interceptor) {
    // ① 获取 @Intercepts 注解中声明的拦截点
    Map<Class<?>, Set<Method>> signatureMap = getSignatureMap(interceptor);

    // ② 获取目标对象的类型
    Class<?> type = target.getClass();

    // ③ ★ 获取目标对象实现的接口中，哪些在 signatureMap 中
    //    例如：target = SimpleExecutor，其接口 Executor 在 signatureMap 中
    Class<?>[] interfaces = getAllInterfaces(type, signatureMap);

    if (interfaces.length > 0) {
        // ④ ★ 创建 JDK 动态代理：只拦截 signatureMap 中声明的方法
        return Proxy.newProxyInstance(
            type.getClassLoader(),
            interfaces,
            new Plugin(target, interceptor, signatureMap)
        );
    }
    // ⑤ 没有需要拦截的接口 → 返回原对象
    return target;
}

// Plugin.invoke() —— 代理的调用处理
@Override
public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
    // ① 检查当前方法是否在拦截声明中
    Set<Method> methods = signatureMap.get(method.getDeclaringClass());
    if (methods != null && methods.contains(method)) {
        // ② ★ 命中拦截 → 调用插件的 intercept() 方法
        return interceptor.intercept(new Invocation(target, method, args));
    }
    // ③ 未命中 → 直接调用原方法
    return method.invoke(target, args);
}
```

---

## 八、⭐️ 两级缓存机制

### 8.1 一级缓存（Local Cache）—— SqlSession 级别

```
特性：
  - 作用域：SqlSession（同一个 Session 内的查询可以共享）
  - 默认开启，无法关闭
  - 存储：PerpetualCache（本质是 HashMap<CacheKey, Object>）
  - 清空时机：
    ① 执行 INSERT / UPDATE / DELETE（flushCacheRequired=true）
    ② 手动调用 sqlSession.clearCache()
    ③ SqlSession.close()
  - 问题：跨 SqlSession 不共享，且可能产生脏读
```

### 8.2 二级缓存（Second Level Cache）—— Mapper 级别

```
特性：
  - 作用域：namespace（同一 Mapper 的不同 SqlSession 共享）
  - 默认关闭，需要配置 <cache/> 或 @CacheNamespace
  - 存储：可自定义（PerpetualCache、Ehcache、Redis 等）
  - 执行流程：
    CachingExecutor.query()
      → 生成 CacheKey
      → 查二级缓存 → 命中则返回
      → 未命中 → 委托给 BaseExecutor（一级缓存 → 数据库）
      → 将结果放入二级缓存
  - 清空时机：当前 Mapper 的 INSERT/UPDATE/DELETE 执行时清空
```

### 8.3 CacheKey 的构成

```java
// CacheKey 用于唯一标识一次查询（作为缓存的 Key）
public class CacheKey implements Cloneable, Serializable {
    // CacheKey 由以下元素组合而成：
    // ① MappedStatement.id（namespace + statementId）
    // ② rowBounds.getOffset() / rowBounds.getLimit()（分页信息）
    // ③ 实际执行的 SQL 语句（经过动态 SQL 解析后的）
    // ④ 参数值列表
    // ⑤ Environment.id（多数据源环境下的数据源标识）

    // ★ 所有元素通过 hashCode 和 equals 的组合保证唯一性
}
```

---

## 九、⭐️ MyBatis-Spring 整合原理

MyBatis 与 Spring 的整合有两个关键点：

### 9.1 SqlSessionTemplate —— 线程安全的 SqlSession 代理

```java
// SqlSessionTemplate 是 SqlSession 接口的一个线程安全实现
// 内部维护了一个 SqlSession 动态代理：

SqlSession sqlSessionProxy = (SqlSession) Proxy.newProxyInstance(
    SqlSessionFactory.class.getClassLoader(),
    new Class[]{SqlSession.class},
    new SqlSessionInterceptor());

// SqlSessionInterceptor.invoke()
private class SqlSessionInterceptor implements InvocationHandler {
    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        // ① ★ 从 TransactionSynchronizationManager 获取当前事务绑定的 SqlSession
        SqlSession sqlSession = SqlSessionUtils.getSqlSession(
            SqlSessionTemplate.this.sqlSessionFactory,
            SqlSessionTemplate.this.executorType,
            SqlSessionTemplate.this.exceptionTranslator);

        // ② 调用真正的 SqlSession 方法
        Object result = method.invoke(sqlSession, args);

        // ③ 如果不是 Spring 事务管理的 → 立即提交并关闭
        //    如果是 Spring 事务管理的 → 不关闭，等事务完成后再关闭
        return result;
    }
}
```

### 9.2 MapperScannerConfigurer —— 批量生成 Mapper 代理

```java
// MapperScannerConfigurer 实现了 BeanDefinitionRegistryPostProcessor
// 在 Spring 容器启动时，自动扫描指定包下的 Mapper 接口

// ① 扫描指定包下的所有接口
// ② 对每个接口，创建一个 MapperFactoryBean 的 BeanDefinition
//    实际上注册的是一个 FactoryBean
// ③ MapperFactoryBean.getObject() 返回 sqlSession.getMapper(mapperInterface)
// ④ 最终注入到 @Autowired 字段上的是 Mapper 代理对象
```

---

## 十、总结

| 概念 | 一句话总结 |
|------|-----------|
| **Configuration** | MyBatis 的全局配置中心，持有所有 MappedStatement、TypeHandler、Interceptor |
| **SqlSession** | 一次数据库会话的门面，所有操作通过它触发（非线程安全） |
| **Mapper 代理** | JDK 动态代理 + MapperProxy，让接口方法调用自动映射到 SQL 执行 |
| **Executor** | 执行器的模板方法模式，BaseExecutor 实现一级缓存，CachingExecutor 装饰二级缓存 |
| **StatementHandler** | JDBC Statement 的包装，协调参数绑定和结果映射 |
| **#{} vs ${}** | #{} 是预编译占位符（防注入）；${} 是字符串替换（不防注入） |
| **插件机制** | JDK 动态代理套娃，拦截 Executor / StatementHandler / ParameterHandler / ResultSetHandler |
| **一级缓存** | SqlSession 级别，HashMap，默认开启，脏读风险 |
| **二级缓存** | Mapper 级别（namespace），跨 SqlSession 共享，需显式开启 |

**核心设计模式一览**：

| 设计模式 | 在 MyBatis 中的体现 |
|---------|--------------------|
| 代理模式 | MapperProxy（JDK 动态代理）、Plugin（插件拦截） |
| 模板方法 | BaseExecutor（定义骨架，子类实现 doQuery/doUpdate） |
| 装饰器模式 | CachingExecutor 装饰 BaseExecutor，添加二级缓存 |
| 工厂模式 | SqlSessionFactory、MapperProxyFactory |
| 建造者模式 | SqlSessionFactoryBuilder、XMLConfigBuilder |
| 责任链模式 | InterceptorChain（插件链式包装） |

---

## 参考

- [MyBatis 官方文档](https://mybatis.org/mybatis-3/zh/index.html)
- MyBatis 3.x 源码：`org.apache.ibatis` 包
- 《MyBatis 3 源码深度解析》—— 江荣波
- 《通用源码阅读指导书——MyBatis 源码详解》—— 易哥
