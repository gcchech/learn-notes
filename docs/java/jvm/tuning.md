---
title: JVM 调优实战
icon: gauge-high
order: 4
category:
  - Java
  - JVM
tag:
  - JVM调优
  - 内存泄漏
  - OOM
  - Arthas
  - CPU飙高
  - GC调优
  - 线上排查
---

# JVM 调优实战：参数、排查与 Arthas

> 📖 JVM 调优不是会调几个参数就够了——真正的能力在于"出了问题怎么排查"。本文从常用 JVM 参数配置出发，覆盖四种常见 OOM 场景的定位思路（堆/元空间/直接内存/线程过多）、CPU 飙高排查的完整链路（top→top -H→jstack→十六进制定位代码行）、内存泄漏的黄金排查流程（jstat→jmap→MAT），并以 Arthas 的六大命令（dashboard/thread/heapdump/classloader/monitor/watch）作为线上排查的利器。最后通过两个真实调优案例——频繁 Full GC 和 CMS 并发失败——展示从症状到解决方案的完整思考链路。

---

## 一、常用 JVM 参数速查

### 1.1 内存相关参数

```bash
# ===== 堆 =====
-Xms2g                           # 初始堆大小（生产建议与 -Xmx 相同）
-Xmx2g                           # 最大堆大小
-Xmn1g                           # 新生代大小（或 -XX:NewRatio）
-XX:NewRatio=2                   # 老年代/新生代 = 2:1（默认）
-XX:SurvivorRatio=8              # Eden/Survivor = 8:1（默认）

# ===== 元空间 =====
-XX:MetaspaceSize=128m           # 元空间初始大小（达到后触发 GC）
-XX:MaxMetaspaceSize=256m        # 元空间最大值（强烈建议设置！）

# ===== 栈 =====
-Xss1m                           # 每个线程的栈大小（默认约 1M）

# ===== 直接内存 =====
-XX:MaxDirectMemorySize=512m     # 最大直接内存（默认 = -Xmx）

# ===== 堆外内存总限制 =====
-XX:NativeMemoryTracking=summary # 开启本地内存追踪（有一定性能开销）
```

### 1.2 GC 相关参数

```bash
# ===== GC 选择 =====
-XX:+UseSerialGC                 # Serial + Serial Old
-XX:+UseParallelGC               # Parallel Scavenge + Parallel Old（JDK 8 默认）
-XX:+UseG1GC                     # G1（JDK 9+ 默认）
-XX:+UseZGC                      # ZGC（JDK 17+ 推荐超大堆）

# ===== GC 日志（JDK 9+ 统一格式）=====
-Xlog:gc*=info:file=/var/log/app/gc.log:time,level,tags:filecount=10,filesize=50M

# ===== GC 调优 =====
-XX:MaxGCPauseMillis=200         # 期望最大停顿时间（G1 的核心参数）
-XX:GCTimeRatio=99               # 吞吐量目标：GC 时间占比 1/(1+99)=1%
-XX:InitiatingHeapOccupancyPercent=45  # G1 老年代占 45% 触发并发标记周期
-XX:G1HeapRegionSize=4m          # G1 Region 大小
-XX:ParallelGCThreads=4          # 并行 GC 线程数（默认 = CPU 核数）
-XX:ConcGCThreads=2              # 并发 GC 线程数（默认 ≈ ParallelGCThreads/4）

# ===== CMS 遗留（JDK < 14）=====
-XX:+UseConcMarkSweepGC          # 启用 CMS（JDK 9 废弃，JDK 14 移除）
-XX:CMSInitiatingOccupancyFraction=70  # 老年代 70% 触发 CMS
-XX:+UseCMSCompactAtFullCollection     # Full GC 时整理碎片
```

### 1.3 OOM/Dump 参数

```bash
# ===== OOM 排查必加（强烈建议 100% 加上！）=====
-XX:+HeapDumpOnOutOfMemoryError  # OOM 时自动导出堆快照
-XX:HeapDumpPath=/var/log/app/   # 堆快照保存路径
-XX:ErrorFile=/var/log/app/hs_err_pid%p.log  # JVM 崩溃日志

# ===== 主动导出 =====
-XX:+PrintFlagsFinal             # 打印所有 JVM 参数最终值
-XX:+PrintCommandLineFlags       # 打印命令行参数
```

### 1.4 一套生产级 JVM 配置

```bash
# JDK 17 + G1（最常见的 Web 服务配置）
java \
  -Xms4g -Xmx4g \                          # 堆 4G，最大最小设一样
  -Xss512k \                                # 线程栈 512K（微服务线程不多）
  -XX:MaxMetaspaceSize=256m \              # 元空间上限
  -XX:MaxDirectMemorySize=512m \           # 直接内存上限
  -XX:+UseG1GC \                           # 使用 G1
  -XX:MaxGCPauseMillis=200 \               # STW 目标 200ms
  -XX:InitiatingHeapOccupancyPercent=45 \  # 老年代 45% 启动并发标记
  -XX:G1ReservePercent=10 \                # 保留 10% 空闲
  -XX:+HeapDumpOnOutOfMemoryError \        # OOM 时 dump
  -XX:HeapDumpPath=/var/log/app/dump/ \    # dump 路径
  -XX:ErrorFile=/var/log/app/hs_err_pid%p.log \
  -XX:+PrintCommandLineFlags \
  -Xlog:gc*=info:file=/var/log/app/gc.log:time,level,tags:filecount=10,filesize=50M \
  -jar app.jar
```

---

## 二、内存泄漏排查 —— 黄金四步法

内存泄漏（Memory Leak）和内存溢出（OOM）不是一回事——泄漏是原因，溢出是结果。

```
内存泄漏：不再使用的对象没有被 GC 回收（如静态 Map 不断 put 不放）
内存溢出：没有可分配的内存（堆满了/OOM）

关系：内存泄漏积累 → 最终导致内存溢出
```

### 第一步：jstat —— 宏观监控

```bash
# jstat -gc <pid> <interval_ms> <count>
# 看 GC 情况：每分钟一次，连续 10 次
jstat -gc 12345 60000 10

# 输出（关键列）：
#  S0C    S1C    S0U    S1U      EC       EU        OC         OU       MC     MU    YGC     YGCT    FGC    FGCT     GCT
# 5120.0 5120.0  0.0   1024.0  40960.0  20480.0   81920.0    61440.0  128m   100m   42      1.250   3      2.100    3.350
#  ↑ Survivor     ↑ Eden             ↑ 老年代               ↑ 元空间     ↑ YoungGC ↑耗时 ↑ FullGC ↑耗时 ↑ 总GC耗时
#  容量  已用     容量  已用          容量  已用             容量 已用

# ⚠️ 重点关注：
#  OU (Old Used) 持续增长，每次 Young GC 后不下降
#     → 对象不断"逃逸"到老年代且不释放 → 内存泄漏嫌疑！
#
#  FGC 频繁增加
#     → Full GC 频繁 → 老年代清理不掉 → 内存泄漏或配置不当
#
#  MU (Metaspace Used) 持续增长
#     → 可能类加载器泄漏或动态代理过多
```

```bash
# 另一个角度：查看 GC 占比
jstat -gcutil 12345 1000 10
# 输出：S0 S1 E O M YGC YGCT FGC FGCT GCT
# 关注 O（老年代使用率）和 FGC（Full GC 次数）
# 如果 Full GC 后 O 仍然很高 → 内存泄漏
```

### 第二步：jmap —— 导出堆快照

```bash
# 方式1：导出堆快照（会触发 STW，生产慎用）
jmap -dump:format=b,file=heap.bin <pid>

# 方式2：只统计存活对象（先触发 Full GC，更危险）
jmap -histo:live <pid> | head -30
# 各列：num   #instances   #bytes   class name
# 找那些实例数或占用空间异常大的类

# 方式3（推荐）：-XX:+HeapDumpOnOutOfMemoryError 自动导出
# 或者用 jcmd（更安全的方式）
jcmd <pid> GC.heap_dump heap.bin
```

### 第三步：jstack —— 线程快照

```bash
# 导出线程栈
jstack <pid> > jstack.txt

# 看哪些线程在干什么
# 关注：
#   - BLOCKED 状态的线程（锁等待）
#   - RUNNABLE 但长时间运行的线程
#   - 大量 WAITING 状态的同名线程（如 http-nio-8080-exec-*）

# 统计线程状态分布
jstack <pid> | grep "java.lang.Thread.State" | sort | uniq -c
# 正常输出示例：
#   2 BLOCKED
#   5 RUNNABLE
#  23 WAITING (parking)
#  45 TIMED_WAITING (parking)
#
# 如果有几十个 BLOCKED → 死锁或锁竞争问题
# 如果有几百个线程 → 线程池配置不当或线程泄漏
```

### 第四步：MAT / JProfiler —— 分析 dump 文件

导出 `heap.bin` 后，用 Eclipse MAT（Memory Analyzer Tool）分析：

```
MAT 分析入门流程：

1. File → Open Heap Dump → 选择 heap.bin

2. 查看 Overview 页面的 Leak Suspects Report
   → 自动找出最可能的泄漏对象

3. 确认泄漏的黄金路径——支配树（Dominator Tree）：
   → 某个对象支配了大量的堆空间
   → 它就是泄漏的根！

4. 看 GC Roots 引用链（Path to GC Roots）：
   选中可疑对象 → Path to GC Roots → exclude weak references
   → 看是哪个 GC Root（static 字段/Thread/ClassLoader）hold 住了它
```

```java
// ❌ 经典内存泄漏场景 1：未关闭的资源
public class LeakExample1 {
    // 内存泄漏！
    private static Map<String, Object> cache = new HashMap<>();

    public void put(String key, Object val) {
        cache.put(key, val);
        // 永远不会 remove → 越来越多 → OOM
    }
}

// ✅ 修复：用 LRU 缓存
public class FixedExample1 {
    private static Map<String, Object> cache =
        new LinkedHashMap<String, Object>(16, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<String, Object> eldest) {
                return size() > 1000;  // 最多 1000 条 → 自动淘汰
            }
        };
}
```

```java
// ❌ 经典内存泄漏场景 2：内部类持有外部引用
public class LeakExample2 {
    private byte[] bigData = new byte[10 * 1024 * 1024];  // 10MB

    public Runnable createTask() {
        // 匿名内部类隐式持有外部类 LeakExample2 的引用
        // 即使 LeakExample2 实例不再使用，只要 task 被持有，bigData 就回收不了
        return new Runnable() {
            @Override
            public void run() {
                System.out.println("task running");
            }
        };
    }
}

// ✅ 修复：用静态内部类或 Lambda（Lambda 不持有外部引用如果不用外部变量）
public class FixedExample2 {
    private byte[] bigData = new byte[10 * 1024 * 1024];

    public Runnable createTask() {
        int localVar = 1;  // 基本类型
        return () -> System.out.println("task " + localVar);  // 不引用 bigData
    }
}
```

```java
// ❌ 经典内存泄漏场景 3：ThreadLocal 未清理
public class LeakExample3 {
    private static ThreadLocal<User> userContext = new ThreadLocal<>();

    public void handleRequest(User user) {
        userContext.set(user);  // 当前线程的 ThreadLocalMap 持有了 User
        doBusiness();
        // ⚠️ 忘记 remove()！Tomcat 线程池复用线程 → 线程不消亡 → User 永不释放！
    }
}

// ✅ 修复：finally 中 remove
public class FixedExample3 {
    private static ThreadLocal<User> userContext = new ThreadLocal<>();

    public void handleRequest(User user) {
        try {
            userContext.set(user);
            doBusiness();
        } finally {
            userContext.remove();  // 必须 remove！
        }
    }
}
```

---

## 三、四种常见 OOM 场景与定位

### 3.1 堆溢出 —— java.lang.OutOfMemoryError: Java heap space

**最常见**的 OOM——堆中创建了太多对象。

```java
// 复现
List<byte[]> list = new ArrayList<>();
while (true) {
    list.add(new byte[1024 * 1024]);  // 每次 1MB → 撑爆堆
}
```

```
排查思路：

1. 看 GC 日志：Full GC 后堆占用仍然 > 95% → 不是 GC 配置问题，是内存泄漏
2. MAT 分析 dump → 找 Dominator Tree 中占比最大的对象
3. 该对象的 GC Root 引用链 → 找到谁 hold 住了它
4. 根因分析：
   - 是不是缓存放太多？ → 限制缓存大小
   - 是不是查询结果集太大？ → 分页
   - 是不是某个接口流量暴涨？ → 限流
```

### 3.2 元空间溢出 —— OutOfMemoryError: Metaspace

类元数据太多了——常见于动态生成类（CGLib 代理、反射、Groovy 脚本引擎）：

```java
// 复现：疯狂创建动态代理类
// -XX:MaxMetaspaceSize=10m
while (true) {
    Enhancer enhancer = new Enhancer();
    enhancer.setSuperclass(Object.class);
    enhancer.setUseCache(false);  // 禁用缓存 → 每次都生成新类
    enhancer.setCallback((MethodInterceptor) (obj, method, args, proxy) -> proxy.invokeSuper(obj, args));
    enhancer.create();  // 不断生成新类 → 撑爆元空间
}
```

```
排查思路：

1. jstat -gc <pid> 看 MU 列（Metaspace Used）→ 持续增长
2. Arthas: classloader → 查看哪个 ClassLoader 加载了最多类
3. Arthas: sc -d com.example.* → 看哪些类被反复加载
4. jmap -clstats <pid> → 统计每个 ClassLoader 加载的类数量

常见根因：
  - CGLib/动态代理没用缓存 → 每个代理对象生成一个新类
  - Groovy/JS 脚本引擎每次 eval 生成新类
  - Lambda 表达式（但 Lambda 生成的类很少，一般不是主因）
  - 异常的反射使用
```

### 3.3 直接内存溢出 —— OutOfMemoryError: Direct buffer memory

NIO 的 ByteBuffer.allocateDirect() 分配的直接内存耗尽了（注意：这个 OOM **不走堆**！）：

```java
// 复现
// -XX:MaxDirectMemorySize=100m
List<ByteBuffer> list = new ArrayList<>();
while (true) {
    list.add(ByteBuffer.allocateDirect(1024 * 1024));  // 每次 1MB 直接内存
}
```

```
⚠️ 直接内存 OOM 的特殊性：
  - heap dump 中看不到直接内存！（它不在堆里）
  - MAT 分析 heap.bin 时看不到 ByteBuffer 里的数据
  - 要靠 NativeMemoryTracking 来分析

排查思路：

1. 开启 NMT（有 5%~10% 性能开销，建议临时开启）：
   java -XX:NativeMemoryTracking=detail -jar app.jar

2. 查看本地内存分布：
   jcmd <pid> VM.native_memory summary

3. 找出直接内存大户：
   jcmd <pid> VM.native_memory summary.diff

4. 检查是否有 -XX:+DisableExplicitGC
   → 禁了 System.gc() → DirectByteBuffer 的虚引用清理线程可能无法工作

5. 如果是 NIO 使用不当 → 检查是不是忘了关闭 Channel/Buffer
```

### 3.4 无法创建本地线程 —— OutOfMemoryError: unable to create new native thread

这个 OOM 的 root cause**通常不是内存不够了**，而是线程数超了系统限制：

```java
// 复现
while (true) {
    new Thread(() -> {
        try { Thread.sleep(Integer.MAX_VALUE); }
        catch (InterruptedException e) { }
    }).start();
}
// 不断创建线程 → 达到 ulimit -u 或 /proc/sys/kernel/pid_max 的上限
```

```
排查公式：
  最大线程数 ≈ (系统可用内存 - 堆 - 元空间) / 线程栈大小(-Xss)

  例：
    系统内存 8GB
    -Xmx = 4GB, -Xmn = 1GB, -XX:MaxMetaspaceSize = 256MB
    线程栈 -Xss = 1MB (默认)
    OS 自身占用 ≈ 1GB
    → 剩余给线程栈的 ≈ 8 - 4 - 0.25 - 1 ≈ 2.75GB
    → 最大线程数 ≈ 2.75GB / 1MB ≈ 2800 个线程

排查步骤：

1. 检查线程数：
   cat /proc/<pid>/status | grep Threads
   ps -T <pid> | wc -l

2. 检查系统限制：
   ulimit -u          # 用户最大进程/线程数
   cat /proc/sys/kernel/pid_max  # 系统最大 PID

3. jstack 看线程都在干什么：
   - 大量 WAITING 的线程 → 线程池过大了或没有限制
   - 大量 BLOCKED 的线程 → 锁竞争
```

---

## 四、CPU 飙高排查 —— 从 top 到代码行

这是生产环境中最常见的紧急排查场景：

```
CPU 100% 排查全链路：

  ① top 找到 Java 进程 PID
     top                              → PID: 12345, CPU: 200%

  ② top -H -p 12345 找到高 CPU 的线程
     top -H -p 12345                  → TID: 12400, CPU: 98%

  ③ 十进制转十六进制
     printf "%x\n" 12400              → 0x3070

  ④ jstack 12345 导出线程栈，搜索 nid=0x3070
     jstack 12345 | grep -A 20 "nid=0x3070"
     → 找到具体的线程 → 看到代码调用栈 → 定位到具体代码行

  ⑤ 如果 CPU 高的线程在 GC → GC 过于频繁
     "GC task thread#0 (ParallelGC)"  → 看 GC 日志调整配置
```

```bash
# 完整操作序列
top                          # 找到进程 PID = 12345
top -H -p 12345              # 找到线程 TID = 12400，CPU ≈ 100%
printf "%x\n" 12400          # → 3070
jstack 12345 > jstack.txt
grep -A 20 "nid=0x3070" jstack.txt  # → 定位到具体方法和代码行

# 常见结果：
# 1. 业务线程 RUNNABLE 在某个方法里死循环/大量计算 → 改代码
# 2. GC 线程 RUNNABLE → GC 频繁 → 分析 GC 日志调整参数
# 3. 大量线程 BLOCKED → 锁竞争 → 优化锁粒度
```

```java
// ❌ 经典 CPU 飙高场景 1：死循环
public class CpuHighCase1 {
    public static void main(String[] args) {
        int i = 0;
        while (i < Integer.MAX_VALUE) {
            if (i % 100 == 0) {
                new Object();  // 创建大量对象 → GC 频繁
            }
            // 忘了 i++！→ 死循环 + 100% CPU
        }
    }
}

// ❌ 经典 CPU 飙高场景 2：HashMap 死循环（JDK 7 并发 rehash）— 著名 bug
// 多线程同时 put → rehash → 链表成环 → .get() 时 100% CPU
// ✅ JDK 8 已修复（红黑树 + 优化 rehash），但最好还是用 ConcurrentHashMap
```

---

## 五、Arthas 实战 —— 线上排查利器

[Arthas](https://arthas.aliyun.com/) 是阿里开源的 Java 诊断工具，**无需重启、无需修改代码**，可以 attach 到正在运行的 JVM 上。

```bash
# 安装与启动
curl -O https://arthas.aliyun.com/arthas-boot.jar
java -jar arthas-boot.jar    # 选择要诊断的 Java 进程

# 或者用 Docker
docker exec -it <container> java -jar arthas-boot.jar
```

### 5.1 dashboard —— 实时面板

```bash
$ dashboard

# 显示：
# ┌─ 线程 ──────────────────────────────────────────────────────────┐
# │ 线程汇总: TOTAL:45  RUNNABLE:5  BLOCKED:0  WAITING:20 ...     │
# │ 线程名                          CPU%         STATE              │
# │ http-nio-8080-exec-1           23%          RUNNABLE            │
# │ C2 CompilerThread0              15%          RUNNABLE           │
# └─────────────────────────────────────────────────────────────────┘
# ┌─ 内存 ──────────────────────────────────────────────────────────┐
# │          used     total    max     usage                       │
# │ heap     512M     1024M   4096M   12.5%                        │
# │ metaspace  80M     128M    256M   31.2%                        │
# └─────────────────────────────────────────────────────────────────┘
# ┌─ GC ────────────────────────────────────────────────────────────┐
# │ gc.young.count    gc.young.time(ms)    gc.old.count ...        │
# │ 15                352                  0                        │
# └─────────────────────────────────────────────────────────────────┘

# → 一眼看清：线程状态分布、堆/元空间使用率、GC 频率
# → 按 q 退出
```

### 5.2 thread —— 线程诊断

```bash
# 显示 CPU 使用率最高的前 N 个线程（类似 top -H）
thread -n 3
# → 直接给出 CPU 最高的 3 个线程的栈信息 → 省掉了 top -H → 十六进制 → grep 这一串

# 查看当前最忙的线程栈
thread -b
# → 自动识别被 BLOCKED 的线程 → 一键定位死锁/锁竞争

# 查看线程阻塞在哪里
thread --state BLOCKED

# 查看指定线程
thread <thread_id>
```

### 5.3 heapdump —— 内存快照

```bash
# 在线导出堆快照（等同于 jmap -dump）
heapdump /tmp/heap.hprof

# 注意：会触发 Full GC 和 STW，生产环境谨慎使用
# 更安全的方式是用 live 参数
heapdump --live /tmp/heap.hprof  # 只保留存活对象
```

### 5.4 classloader —— 类加载分析

```bash
# 查看所有 ClassLoader
classloader

# 查看某个 ClassLoader 加载了哪些类
classloader -c <hashcode> -a

# 查看类的加载信息
sc -d com.example.User
# → 显示类从哪个 .jar 加载的、由哪个 ClassLoader 加载

# 查看类的数量（排查元空间泄漏）
classloader -t
# → 找出加载类数量最多的 ClassLoader
```

### 5.5 monitor / watch / trace —— 方法级监控

```bash
# monitor：实时监控方法的调用次数/成功率/RT/失败率
monitor com.example.UserService getUser -c 5
# -c 5：统计周期 5 秒
# 输出：timestamp  class  method  total  success  fail  avg-rt  fail-rate

# watch：观察方法调用的入参和返回值
watch com.example.UserService getUser '{params, returnObj, throwExp}' -x 3
# params：方法参数
# returnObj：返回值
# throwExp：异常信息
# -x 3：展开深度 3 层

# trace：跟踪方法内部的调用耗时
trace com.example.UserService getUser
# 输出树形调用链路及每个方法的耗时

# tt (TimeTunnel)：记录方法调用的时空隧道
tt -t com.example.UserService getUser
# → 记录每次调用的入参、返回值、耗时、异常
# → 可以事后回放某次调用：tt -i <index> -p
```

### 5.6 vmtool / jad —— 查看与反编译

```bash
# 查看 JVM 参数
vmtool --action getVMOptions

# 查看系统属性
vmtool --action getSystemProperties

# 反编译类（确认部署的是哪个版本）
jad com.example.UserService
# → 在线反编译，能看到实际运行的源码
# → 确认代码是否正确上线
```

### 5.7 火焰图

```bash
# 生成 CPU 火焰图（需要 profiler 命令）
profiler start
# 等待一段时间...
profiler stop --format html
# → 生成火焰图 HTML，直观看出哪些方法消耗 CPU 最多
```

---

## 六、调优案例

### 案例 1：频繁 Full GC → 新生代太小

**现象**：
- 每分钟几次 Full GC
- 每次 Full GC 后老年代降幅很小
- 应用响应 P99 很高

**分析过程**：

```bash
# jstat -gc <pid> 1s
# 观察到：
#   YGC 每 2 秒触发一次
#   FGC 每 10 秒触发一次（异常！正常应该极少）
#   Eden 使用率瞬间冲满
#   Survivor 区一直是满的
#   → 新生代太小，对象来不及在 Young GC 死掉就晋升到老年代
#   → 老年代很快满了 → Full GC
```

```
根因分析：
  当前配置：-Xmx4g -Xmn1g（NewRatio 默认还可能是 2:1）

  实际：压测流量下每秒产生约 50MB 的新对象
  → Eden 区只有 800MB (Eden:S0:S1 = 8:1:1 → 1G × 8/10 = 800M)
  → 800MB / 50MBps = 16s 就满 → 每 16s Minor GC
  → 但业务请求平均耗时 5-10s → 很多对象活到了 Minor GC 时还没死 → 进 Survivor
  → Survivor 只有 100MB → Minor GC 后 100MB 装不下 → 溢出进老年代
  → 老年代被快速填满 → Full GC
```

**解决方案**：

```bash
# 方案1：增大新生代（治标）
-Xmn2g  # 新生代从 1G → 2G
# 效果：Eden 从 800M → 1.6G → 16s 才满 → Minor GC 频率降低一半
# 但：每次 Minor GC 扫描 1.6G → 单次耗时增加

# 方案2：切换 G1（治本）
-XX:+UseG1GC
-XX:MaxGCPauseMillis=200
# 效果：G1 用 Region + Mixed GC → 不会出现"老年代突然满了→Full GC"
# G1 会在老年代到达 45% 时启动并发标记 → 提前识别垃圾
# 然后通过多次 Mixed GC 逐步回收 → 避免长时间的 Full GC
```

### 案例 2：CMS 并发失败 → 降级 Serial Old

**现象**（JDK 8 + CMS 遗留项目）：
- GC 日志出现 `concurrent mode failure`
- 随后发生一次数秒的 Full GC（Serial Old）
- 应用间歇性不可用

```bash
# GC 日志（JDK 8 格式）：
# 2024-01-15T10:30:15.123+0800: [GC (CMS Initial Mark) [1 CMS-initial-mark: 600000K(800000K)] ...]
# 2024-01-15T10:30:16.000+0800: [GC (CMS Remark) ...]
# →
# 2024-01-15T10:30:20.500+0800: [Full GC (Allocation Failure) 800000K->700000K(800000K), 5.23s]
#                               ↑ concurrent mode failure → 降级为 Serial Old
```

```
分析：
  CMS 失败日志中的关键信号：

  "concurrent mode failure"
  → 并发标记/清除期间，老年代被填满了
  → CMS 的预留空间不够（CMSInitiatingOccupancyFraction=70%）
  → 即：老年代 70% 时 CMS 启动并发标记
  → 但并发期间用户线程继续分配 → 需要预留 30% 的空间
  → 如果 30% 撑不到并发结束 → concurrent mode failure

  "promotion failed"
  → Minor GC 时，老年代没有足够空间接收晋升的对象
  → 老年代即使在 Full GC 后仍然很满
```

**解决方案**：

```bash
# 方案1：降低 CMS 触发阈值
-XX:CMSInitiatingOccupancyFraction=60  # 从 70% 降到 60%
# → 预留 40% 空间 → 并发失败的概率降低
# 但 GC 频率变高

# 方案2：增大老年代
-Xmn1g  # 新生代变小 → 老年代更大（总堆不变）
# 副作用：Minor GC 更频繁

# 方案3（根治）：切换到 G1
-XX:+UseG1GC
# G1 的核心优势：不会出现"预留空间不够→降级 Full GC"的 cascade failure
```

---

## 七、调优 Checklist

上线前必查：

```
□ -Xms 和 -Xmx 设置了相同的值
□ -XX:MaxMetaspaceSize 设置了上限
□ -XX:MaxDirectMemorySize 设置了上限（如果用了 NIO）
□ -XX:+HeapDumpOnOutOfMemoryError 已开启
□ -XX:HeapDumpPath 指向了有足够磁盘空间的目录
□ GC 日志已配置（-Xlog:gc*）
□ GC 日志文件轮转已配置
□ -XX:+PrintCommandLineFlags 已加（方便看到 JVM 实际用的参数）
□ 确认使用的 GC 收集器（jinfo -flag +PrintCommandLineFlags <pid>）
□ ThreadLocal 使用处有 finally remove
□ 线程池有明确的最大线程数限制
□ 静态集合(Map/List/Set)使用有大小限制或淘汰策略
```

---

## 八、总结

| 排查场景 | 工具 / 命令 | 关键步骤 |
|---------|------|------|
| 内存泄漏 | jstat → jmap → MAT | jstat 看老年代持续增长 → dump 分析 Dominator Tree → 找 GC Root 引用链 |
| 堆溢出 OOM | -XX:+HeapDumpOnOutOfMemoryError → MAT | 自动 dump → MAT 分析 → 最大的对象是罪魁祸首 |
| 元空间溢出 | jstat MU 列 / Arthas classloader | 哪个 ClassLoader 加载了最多的类 → 动态代理/CGLib 没缓存 |
| 直接内存 OOM | NMT (NativeMemoryTracking) | `jcmd <pid> VM.native_memory summary` → 跟踪直接内存使用 |
| 线程 OOM | ulimit -u / /proc/pid/status | 检查系统线程限制 + 线程池大小 |
| CPU 飙高 | top → top -H → jstack | top -H 找到线程 → 十六进制转 TID → jstack 定位代码行 |
| 锁竞争/死锁 | Arthas `thread -b` | 一键看 BLOCKED 线程 → 确实哪个锁→哪个线程持有 |
| 频繁 Full GC | jstat / GC 日志 | 新生代太小 or G1 触发阈值不当 → 调整参数 |
| 方法 RT 排查 | Arthas `trace` / `watch` | trace 看内部调用耗时 → 找到瓶颈方法 |

**最重要的三条原则**：

1. **每次上线前**：`-Xms`=`-Xmx`、`MaxMetaspaceSize` 设上限、开启 `HeapDumpOnOutOfMemoryError`
2. **遇到问题先别急着改参数**：先通过 jstat/GC 日志搞清楚**到底是什么瓶颈**——是新生代太小？老年代太大？对象生命周期太长？——盲目调参会引入新问题
3. **Arthas 是线上排查的最强工具**：`dashboard` 看全景、`thread -n 3` 看 CPU、`trace` 看耗时、`watch` 看入参返回值——掌握这几个命令，90% 的线上问题不需要重启

本系列 JVM 模块至此完结。下一篇将进入 **Java 新特性**阵营，首先讲解 **Java 8 核心特性**——Lambda、Stream API、Optional、CompletableFuture 和新日期时间 API。

---

## 参考

- [Arthas 官方文档](https://arthas.aliyun.com/doc/)
- [Eclipse MAT 官方文档](https://wiki.eclipse.org/MemoryAnalyzer)
- [JVMS 17 — Chapter 2: The Structure of the Java Virtual Machine](https://docs.oracle.com/javase/specs/jvms/se17/html/jvms-2.html)
- [Oracle — Java HotSpot VM Options](https://www.oracle.com/java/technologies/javase/vmoptions-jsp.html)
- [JavaGuide — JVM 调优](https://javaguide.cn/java/jvm/jvm-performance-tuning.html)
- [Alibaba Java 开发手册 — JVM 参数规约](https://github.com/alibaba/p3c)
