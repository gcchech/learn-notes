---
title: Redis 面试高频题
icon: database
order: 6
category:
  - Java
  - 面试宝典
tag:
  - Redis
  - 缓存
  - 数据结构
  - 持久化
  - 集群
  - 缓存穿透
---

# Redis 面试高频题

Redis 是后端开发中最常用的中间件之一，也是面试中几乎必问的技术。缓存策略、数据结构、持久化、集群方案是高频考点。以下 10 题覆盖了从底层数据结构到生产级缓存设计的核心知识点。

---

## Q1: Redis 为什么这么快？单线程模型怎么理解？⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: Redis 性能原理、单线程模型、IO 多路复用

> 面试官问："Redis 为什么这么快？Redis 6.0 之前是单线程的，为什么单线程还能这么快？"

### 核心回答

Redis 快的原因有四个层面：

1. **纯内存操作**：所有数据都在内存中，读写不经过磁盘（持久化是异步的），内存访问纳秒级。
2. **单线程避免竞争**：无锁、无上下文切换开销，不需要考虑并发安全问题。
3. **IO 多路复用**：单线程通过 epoll/kqueue 同时监听多个 socket，非阻塞 IO + 事件驱动。
4. **高效的数据结构**：SDS、ziplist、skiplist 等都是为 Redis 定制优化的，不是简单的标准库封装。

**"单线程"到底指什么？**

Redis 的**网络 IO 和命令执行**是单线程的，但以下操作是多线程的：
- Redis 4.0+：`UNLINK` 异步删除大 key
- Redis 6.0+：IO 线程（网络读写多线程，命令执行仍单线程）
- 持久化：fork 子进程执行 RDB/AOF rewrite
- 主从同步：独立的 replication 线程

### 深度扩展

**IO 多路复用的工作流程**：

```
传统阻塞 IO（BIO）：
  Client1 → accept → read（阻塞）→ process → write → accept → read（阻塞）→ ...
  同一时刻只能服务一个客户端

IO 多路复用（epoll）：
  accept → epoll_wait(socket1, socket2, socket3, ...)
       → socket2 可读 → read(socket2) → process → write(socket2)
       → socket5 可读 → read(socket5) → process → write(socket5)
  → 回到 epoll_wait 继续监听
```

**Redis 6.0 的多线程 IO**：

```
Redis 6.0 处理模型：
  [Main Thread]  读取命令、执行命令、响应客户端
  [IO Thread 1]  网络数据读取（read stage）
  [IO Thread 2]  网络数据写入（write stage）
  ...
  [IO Thread N]

线程分工：
  - 配置 io-threads 4 → 4 个 IO 线程
  - 默认关闭（io-threads 1），只有高并发场景建议开启
  - 命令执行仍然是单线程，保证原子性
```

**性能数据**：普通服务器 QPS 可达 10 万+，Pipeline 模式下更高。主要瓶颈通常不在 Redis 本身，而在网络带宽。

### 面试追问

**Q**: 为什么命令执行必须是单线程？
**A**: 因为 Redis 的数据结构（如 SDS、跳表）没有并发安全设计。如果命令执行多线程，需要大量加锁，反而可能降低性能。单线程 + 内存操作已经足够快。

**Q**: 单线程模型有什么缺点？
**A**: ① 一个慢命令（KEYS、HGETALL、大 key 删除）会阻塞整个 Redis；② 无法充分利用多核 CPU（Redis 6.0 的 IO 线程部分缓解）。

### 常见错误

- ❌ 说"Redis 绝对单线程"——忽略了持久化子进程、异步删除、IO 多线程
- ❌ 说"单线程就是慢"——CPU 不是 Redis 的瓶颈，内存和网络才是

### 一句话总结

> **Redis 快 = 内存操作 + 单线程无锁 + IO 多路复用 + 定制数据结构。纯内存操作为王，单线程反而减少了锁竞争的开销。**

---

## Q2: Redis 的 5 种基本数据类型及底层实现原理 ⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: 数据类型、底层编码方式、使用场景

> 面试官问："Redis 有哪 5 种基本数据类型？各自底层是怎么实现的？"

### 核心回答

**5 种基本数据类型**：

| 类型 | 底层编码（以小换大） | 使用场景 |
|------|---------------------|---------|
| **String** | int → embstr → raw | 计数器、分布式锁、Token、序列化对象 |
| **List** | quicklist（ziplist 组成的双向链表） | 消息队列、最新列表、时间线 |
| **Set** | intset → hashtable | 去重、标签、好友推荐（交集） |
| **ZSet** | ziplist → skiplist + dict | 排行榜、延时队列、带权重的集合 |
| **Hash** | ziplist → hashtable | 对象存储、购物车、用户属性 |

**核心规律**：小数据用小结构（ziplist / intset），大数据或单元素过大切换为大结构（hashtable / skiplist / quicklist）。

### 深度扩展

**String 三种编码**：

```
int     : 纯数字且不超过 long 范围 → 指针直接存整数值（无额外内存）
embstr  : ≤ 44 字节的小字符串 → 一次内存分配，对象和数据连续存储
raw     : > 44 字节的大字符串 → 两次内存分配，对象和数据分开存储
```

**quicklist 的巧妙设计（Redis 3.2+）**：

```
List 底层 = quicklist（快速列表）

quicklist Node  →  quicklist Node  →  quicklist Node
     ↓                   ↓                   ↓
  ziplist             ziplist             ziplist
  [A B C D]           [E F G H]           [I J K L]

每个 ziplist 大小通过 list-max-ziplist-size 控制（默认 -2 = 8KB）
```

**跳表（skiplist）为什么不用红黑树？**

| 对比 | 跳表 | 红黑树 |
|------|------|--------|
| 实现复杂度 | 简单（100 行代码） | 复杂（旋转 + 染色） |
| 范围查询 | O(log N) 定位起点后 O(M) 顺序扫描 | 需要中序遍历，复杂 |
| ZRANK/ZREVRANK | 跳表节点有 span 字段直接计算 | 需要维护子树大小 |
| 并发改造 | 容易（ConcurrentSkipListMap） | 困难 |

**ziplist（压缩列表）的核心设计**：

```
普通链表：每个节点存储 prev + next 指针 → 每个节点至少 8 字节开销

ziplist：连续内存块
[zlbytes][zltail][zllen][entry1][entry2]...[entryN][zlend]
每个 entry = [prevlen][encoding][data]
  - prevlen: 前一个 entry 的长度（1 或 5 字节）
  - encoding: 数据的编码格式（1/2/5 字节）
  - data: 实际数据

节省了大量指针开销，适合小集合。
缺点：修改时需要级联更新（prevlen 可能变化），不适合大集合。
```

### 面试追问

**Q**: `SCAN` 命令的底层实现？为什么不阻塞？
**A**: `SCAN` 基于**游标（cursor）**分批遍历，每次返回少量 key 和下一个 cursor。底层使用**高位进位加法**（reverse binary iteration），保证在字典扩缩容时不会重复或遗漏 key。

**Q**: 一个 ZSet 里存了 100 万条数据，ZADD 一条的复杂度是多少？
**A**: O(log N)，约 20 次比较（跳表高度）。100 万条数据 ≈ 2^20，跳表平均高度 ≈ log(1000000) ≈ 20。

### 常见错误

- ❌ 把 Redis 的 String 当成 Java String——Redis String 是二进制安全的，可以存图片、序列化对象
- ❌ ZSet 说底层"只有跳表"——其实是 skiplist + dict 双结构，dict 负责按成员 O(1) 查找分值
- ❌ List 说底层是 linkedlist——Redis 3.2 后就废弃了 linkedlist，统一用 quicklist

### 一句话总结

> **Redis 5 种类型：String / List / Set / ZSet / Hash。底层以快为主，小数据用 ziplist/intset 省内存，大数据切为跳表/hashtable/quicklist。**

---

## Q3: Redis 缓存三大问题：穿透、击穿、雪崩 ⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: 缓存穿透、缓存击穿、缓存雪崩、布隆过滤器

> 面试官问："说说什么叫缓存穿透、缓存击穿、缓存雪崩？分别怎么解决？"

### 核心回答

| 问题 | 现象 | 原因 | 解决方案 |
|------|------|------|---------|
| **缓存穿透** | 查询不存在的数据，每次都打到数据库 | 恶意攻击 or 业务查询不存在的数据 | 布隆过滤器、缓存空值 |
| **缓存击穿** | 热点 key 过期瞬间，大量请求打到数据库 | 热点 key 过期 + 高并发 | 互斥锁、逻辑过期、永不过期 |
| **缓存雪崩** | 大量 key 同时过期，或 Redis 宕机，请求全部打到数据库 | 大量 key 过期时间相同 / Redis 故障 | 过期时间加随机值、高可用集群、多级缓存 |

**记忆方式**：
- 穿透：数据**从来不存在**（打穿了缓存和数据库之间的"墙"）
- 击穿：**单个热点**过期（单点击破）
- 雪崩：**大批量** key 同时过期（像雪崩一样压垮数据库）

### 深度扩展

**布隆过滤器（Bloom Filter）原理**：

```
Bloom Filter = 一个 bit 数组 + K 个 Hash 函数

初始化（预热所有存在的 key）：
  id=100 → hash1→bit[3]=1, hash2→bit[7]=1, hash3→bit[15]=1
  id=200 → hash1→bit[2]=1, hash2→bit[8]=1, hash3→bit[12]=1

查询 id=999：
  hash1→bit[2]=1 ✅
  hash2→bit[9]=0 ❌ → 一定不存在！
  
特点：
  ✅ 判断不存在 → 100% 准确
  ⚠️ 判断存在 → 可能误判（不同 key 的 hash 位可能重合）
  
误判率公式：f ≈ (1 - e^(-kn/m))^k
  m=10亿位(125MB), n=1000万, k=7 → 误判率约 0.8%
```

**互斥锁解决缓存击穿**：

```java
public String getData(String key) {
    String value = redis.get(key);
    if (value != null) return value;
    
    // 抢锁，只让一个请求去查数据库
    String lockKey = "lock:" + key;
    if (redis.setnx(lockKey, "1")) {
        try {
            redis.expire(lockKey, 30); // 防止死锁
            // 双重检查：拿到锁后再查一次缓存
            value = redis.get(key);
            if (value != null) return value;
            
            value = db.query(key);
            redis.set(key, value, 60 * 60);
        } finally {
            redis.del(lockKey);
        }
    } else {
        // 没抢到锁，休眠重试
        Thread.sleep(50);
        return getData(key); // 递归重试
    }
    return value;
}
```

**逻辑过期方案（不设 TTL，value 里存过期时间）**：

```
逻辑过期相比互斥锁的优点：
- 不阻塞读请求（直接返回旧值）
- 异步更新缓存（开一个线程去查数据库）

缺点：
- 数据可能短暂不一致（返回的旧值）
- 适用场景：对最终一致性容忍的业务（如用户昵称、文章简介）
```

### 面试追问

**Q**: 布隆过滤器删除元素怎么办？
**A**: 标准布隆过滤器不支持删除（因为重置 bit 会影响其他 key）。需要用**计数布隆过滤器**（Counting Bloom Filter），每个 bit 换为计数器。但 Redis 的 `BF.RESERVE` 也不支持删除，实际中用 Redis 维护一个"已删除"的 Set 做增量去重。

**Q**: 缓存击穿，如果有 1000 个线程同时访问，怎么只让一个去查数据库？
**A**: 使用 `SETNX` + expire 实现分布式互斥锁。或者使用同步锁（`synchronized`）在单机场景下控制。更优雅的方案是 Guava 的 `LoadingCache`（支持同步加载）。

### 常见错误

- ❌ 缓存穿透只缓存空值 + 过期时间短——如果攻击者每次换一个不存在的 key，空值缓存无法防御，必须加布隆过滤器
- ❌ 互斥锁忘记设置过期时间——造成死锁
- ❌ 永不过期方案导致内存无限增长——需要配合 LRU/LFU 淘汰策略

### 一句话总结

> **穿透：布隆过滤器 + 缓存空值；击穿：互斥锁 + 逻辑过期；雪崩：随机 TTL + 高可用集群 + 多级缓存。三道必考题，从定义到方案到代码至少掌握两层深度。**

---

## Q4: Redis 持久化 RDB 和 AOF 有什么区别？⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: RDB、AOF、混合持久化

> 面试官问："Redis 的 RDB 和 AOF 两种持久化方式有什么优缺点？生产环境应该怎么选？"

### 核心回答

| 对比维度 | RDB（Redis Database） | AOF（Append Only File） |
|---------|---------------------|------------------------|
| **原理** | 某一时刻的全量数据快照 | 每次写操作的命令日志 |
| **文件大小** | 小（压缩的二进制） | 大（文本命令） |
| **恢复速度** | 快（直接加载） | 慢（逐条重放命令） |
| **数据安全** | 低（可能丢失最后一次快照后的数据） | 高（默认每秒 fsync） |
| **IO 开销** | 间歇性高（fork + 写磁盘） | 持续低（顺序写日志） |
| **适用场景** | 冷备、全量备份 | 对数据完整性要求高的场景 |

**生产环境最佳实践：混合持久化（Redis 4.0+）**

```
混合持久化 = RDB 快照 + 增量 AOF

AOF 文件结构：
  [RDB 全量数据] [AOF 增量命令]
  ↑              ↑
  文件前半部分    文件后半部分

rewrite 时：fork 子进程 → 用 RDB 格式写内存数据 → 增量命令用 AOF 格式追加

优点：RDB 的恢复速度 + AOF 的数据安全性
```

### 深度扩展

**RDB 的 fork 子进程原理**：

```
1. Redis 调用 fork() 创建子进程
2. Linux 的 Copy-On-Write（写时复制）：
   - 父进程和子进程开始时共享同一块物理内存
   - 只有父进程修改数据时，才复制该页到新内存
3. 子进程遍历内存数据 → 写入 RDB 文件
4. 父进程继续处理请求（修改的数据复制到新页）

内存开销估算：
  如果 4GB 数据，写入 QPS 10000，修改率 50%：
  fork 期间额外内存 ≈ 4GB × 50% = 2GB（实际可能更少，因为页粒度）
```

**AOF 三种刷盘策略**：

| 策略 | appendfsync | 说明 | 丢失 | 性能 |
|------|------------|------|------|------|
| Always | `always` | 每条命令同步刷盘 | 不丢 | 最慢 |
| Everysec | `everysec` | 每秒刷盘一次（默认） | 最多 1 秒数据 | 适中 |
| No | `no` | 由操作系统决定刷盘时机 | 可能丢失很多 | 最快 |

**AOF 重写（Rewrite）**：

```
AOF 文件优化前：
  SET count 1 → SET count 2 → SET count 3 → SET count 4
  （4 条命令，优化后只需 1 条: SET count 4）

重写流程：
  1. fork 子进程
  2. 子进程根据内存数据生成新的 AOF
  3. 父进程把重写期间的命令写入 AOF 重写缓冲区
  4. 子进程完成后，父进程追加重写缓冲区内容
  5. 原子替换旧 AOF 文件
```

### 面试追问

**Q**: RDB 的 `bgsave` 和 `save` 有什么区别？
**A**: `save` 在主线程执行，会阻塞所有请求（生产禁用）；`bgsave` fork 子进程执行，不阻塞主线程。

**Q**: 如果同时开启 RDB 和 AOF，重启时用哪个？
**A**: 优先用 AOF（数据更完整）。AOF 可用且未被标记为损坏时，Redis 会忽略 RDB 文件。

### 常见错误

- ❌ 只用 RDB 没有 AOF——宕机丢失的数据量较大（两次 bgsave 之间）
- ❌ AOF 文件不设置 rewrite 策略——AOF 文件越来越大，最终撑满磁盘
- ❌ fork 子进程时内存不足——fork 需要额外的内存（COW），大内存实例需预留内存

### 一句话总结

> **RDB = 全量快照（恢复快，可能丢数据）；AOF = 命令日志（数据安全，恢复慢）。生产用混合持久化：RDB 做全量基座 + AOF 做增量补偿。**

---

## Q5: Redis 的过期删除策略和内存淘汰机制 ⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: 惰性删除、定期删除、LRU、LFU

> 面试官问："Redis 的 key 过期了，是立刻被删除的吗？内存满了怎么办？"

### 核心回答

**过期键删除策略** = 惰性删除 + 定期删除：

1. **惰性删除（Lazy Expire）**：访问 key 时检查是否过期，过期则删除。省 CPU 但可能内存泄漏（冷数据没人访问就一直不删）。

2. **定期删除（Active Expire）**：Redis 每 100ms（`hz: 10`）随机抽取一批带过期时间的 key，检查和删除其中过期的。CPU 和内存的平衡。

**为什么不用定时器？**
如果为每个 key 设置定时器，100 万个 key 就要 100 万个定时器，CPU 开销巨大。

### 深度扩展

**内存淘汰机制 8 种**：

| 策略 | 含义 | 场景 |
|------|------|------|
| **noeviction**（默认） | 不淘汰，写请求直接报错 | 不需要淘汰的业务 |
| **allkeys-lru** | 所有 key 中淘汰**最近最少使用** | **通用缓存（推荐）** |
| **volatile-lru** | 有过期时间的 key 中淘汰 LRU | 部分持久 + 部分缓存 |
| **allkeys-lfu** | 所有 key 中淘汰**最不频繁使用** | 热点数据明确 |
| **volatile-lfu** | 有过期时间的 key 中淘汰 LFU | 热点 + 时效混合 |
| **allkeys-random** | 所有 key 中随机淘汰 | 访问均匀 |
| **volatile-random** | 有过期时间的 key 中随机淘汰 | 类似场景 |
| **volatile-ttl** | 有过期时间的 key 中淘汰 TTL 最短的 | 关注即将过期的数据 |

**Redis 的近似 LRU 算法**：

```
标准 LRU（LinkedHashMap 实现）：
  需要双向链表 + HashMap，内存开销大

Redis LRU 近似算法：
  1. 每个对象维护 24 bit 的访问时间戳（LRU_CLOCK）
  2. 淘汰时随机抽样 N 个 key（maxmemory-samples，默认 5）
  3. 淘汰其中 LRU_CLOCK 最小的（即最久没访问的）

近似精度可通过增大 maxmemory-samples 提升（值越大越接近标准 LRU）
```

**LFU 的实现**：

```
Redis 4.0+ 引入 LFU：
  24 bit 字段拆分：
    [高 16 bit: 上次衰减时间] [低 8 bit: 访问频率计数器]

  计数器增长：不是每次访问 +1，而是概率性增长
    p = 1 / (counter × lfu_log_factor + 1)  ← lfu_log_factor 默认 10

  计数器衰减：随时间递减
    每过 lfu_decay_time 分钟（默认 1），counter - 1

设计巧妙处：新 key 不会立即排挤老 key（counter 小），热点 key 的 counter 稳定增长
```

### 面试追问

**Q**: Redis 内存满了，但 key 都没有过期时间，会怎样？
**A**: 默认 `noeviction` 策略下，所有写操作（SET、LPUSH 等）直接返回 `OOM command not allowed` 错误。DEL 等删除操作不受影响。

**Q**: 主从架构中，从节点如何处理过期 key？
**A**: 主节点删除 key 后，向从节点发送 DEL 命令。从节点**不会主动删除**过期 key（即使 TTL 已经过期），这是为了保证主从一致性。

### 常见错误

- ❌ 设置 TTL 但用 `allkeys-lru` 淘汰策略——TTL 对 LRU 是辅助的，有可能优先淘汰热点 key
- ❌ `maxmemory` 设置太小——会导致频繁淘汰，性能下降
- ❌ 忽略 `maxmemory-samples` 的影响——值太小 LRU 效果变差，值太大 CPU 消耗增加

### 一句话总结

> **删除策略 = 惰性（访问时删） + 定期（后台随机抽检）。内存淘汰 = 8 种策略，最高频考点是 allkeys-lru（近似 LRU 随机抽样）和 allkeys-lfu。**

---

## Q6: Redis 主从同步和哨兵机制 ⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: 主从同步、哨兵、故障转移

> 面试官问："Redis 主从同步是怎么实现的？哨兵和 Cluster 模式有什么区别？"

### 核心回答

**主从同步的三个阶段**：

```
① 全量同步（首次连接 / 复制积压缓冲区溢出）
  Slave: PSYNC ? -1 （请求全量同步）
  Master: FULLRESYNC runid offset
  Master: bgsave → RDB → 发给 Slave
  Master: 把 RDB 生成期间的写命令写入 replication buffer → 发给 Slave
  Slave: 清空旧数据 → 加载 RDB → 执行 buffer 中的命令

② 部分同步（短暂断开重连）
  Slave: PSYNC runid offset （带上次同步的 runid 和 offset）
  Master: 检查 replication backlog 中是否有 offset 后的数据
    - 有 → CONTINUE，只发 offset 之后的增量命令
    - 无 → 回到 ① 全量同步

③ 命令传播（同步完成后持续）
  主节点将每个写命令发给所有从节点
```

### 深度扩展

**哨兵（Sentinel）机制**：

```
哨兵集群的工作流程：

1. 主观下线（SDOWN）
   每个 Sentinel 每秒 ping Master/Slave/其他 Sentinel
   超过 down-after-milliseconds（默认 30s）无响应 → 主观下线

2. 客观下线（ODOWN）
   超过 quorum（法定人数）个 Sentinel 都认为 Master 主观下线
   → 客观下线 → 触发故障转移

3. 选举 Sentinel 的 Leader（Raft 算法）
   每个 Sentinel 向其他 Sentinel 请求投票
   第一个拿到超过半数票的成为 Leader
   
4. 故障转移（Failover）
   Leader Sentinel:
   - 从健康的 Slave 中选出一个新 Master
     （优先级 > 复制偏移量 > runid 字母序）
   - 让其他 Slave 改为复制新 Master
   - 旧 Master 恢复后变成 Slave
```

**Sentinel vs Cluster**：

| 对比维度 | Sentinel 哨兵 | Cluster 集群 |
|---------|-------------|-------------|
| 数据分布 | 所有节点数据一致 | 数据分片（16384 个 slot） |
| 高可用 | 哨兵自动故障转移 | 自带故障转移 |
| 扩展性 | 垂直扩展（加内存） | 水平扩展（加分片） |
| 客户端 | 客户端只需知道 Sentinel 地址 | 客户端需要支持 Cluster 协议 |
| 适用规模 | 中小规模、数据量不大 | 大规模、TB 级数据 |

### 面试追问

**Q**: 主从同步的数据延迟问题怎么解决？
**A**: ① 尽可能让主从在同一机架/机房（低延迟）；② `repl-diskless-sync` 开启无盘同步（跳过 RDB 磁盘写入）；③ 对于强一致性要求的数据，用 `WAIT` 命令等待从节点确认。

**Q**: 为什么至少需要 3 个哨兵？
**A**: ① 故障发现需要 quorum 投票（2 个哨兵）；② 如果只有 2 个哨兵，1 个挂掉后达不到 quorum，无法故障转移。3 个哨兵可以容忍 1 个故障。

### 常见错误

- ❌ 主从 + 哨兵模式下，客户端直接连接 Master 写数据——故障转移后 Master 地址会变，应该连接 Sentinel 获取 Master 地址
- ❌ 从节点设置为 `replica-serve-stale-data no` 时读请求全部失败——部分同步失败中的从节点会拒绝读请求

### 一句话总结

> **主从同步 = 全量 RDB + 增量 backlog + 持续命令传播。哨兵 = 监控 + 通知 + 自动故障转移。Cluster = 数据分片 + 去中心化高可用。**

---

## Q7: 如何用 Redis 实现分布式锁？⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: 分布式锁、SETNX、Redlock、看门狗机制

> 面试官问："用 Redis 实现一个分布式锁，需要注意哪些问题？Redisson 的看门狗机制是什么？"

### 核心回答

**一个正确的 Redis 分布式锁需要解决以下问题**：

1. **原子性加锁**：`SET key value NX PX 30000`（一条命令完成加锁 + 设 TTL）
2. **锁释放的安全性**：只能释放自己的锁（value = UUID + 线程 ID，释放时比对）
3. **自动续期（看门狗）**：锁的业务逻辑运行时间长，锁不能提前过期
4. **可重入**：同一线程多次获取同一把锁不阻塞

```java
// 错误示例 ❌
setnx lockKey 1          // Step 1: 加锁
expire lockKey 30        // Step 2: 设过期
// 如果 Step 1 之后进程崩溃，锁永远不释放！

// 正确示例 ✅
SET lockKey uniqueValue NX PX 30000  // 一条命令，原子性保证

// 释放锁（Lua 脚本保证原子性）
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
```

### 深度扩展

**Redisson 的看门狗机制（Watch Dog）**：

```
Redisson 锁的工作流程：

1. 加锁：SET lockKey uuid:threadId NX PX 30000
2. 启动看门狗线程（每 10 秒执行一次）：
   if (锁还存在 && 当前线程还持有) {
       延长 TTL 到 30000   // 续期到初始 TTL
   }
3. 解锁：执行 Lua 脚本释放锁 + 停止看门狗

看门狗的优势：不需要预估业务执行时间
看门狗的代价：万一服务宕机，锁最多存活 30 秒（初始 TTL）
```

![核心加锁流程]

**Redlock（红锁）算法**：

```
问题：单 Redis 节点宕机，锁数据丢失怎么办？

Redlock 算法（Redis 作者提出的官方分布式锁方案）：
1. 获取当前时间（毫秒）
2. 依次向 N 个独立的 Redis 节点请求锁（SET NX PX）
3. 计算获取锁的总耗时 = 当前时间 - 第 1 步时间
4. 如果超过半数节点（N/2+1）获取锁成功，且总耗时 < 锁的 TTL → 获取锁成功
5. 锁的有效时间 = TTL - 总耗时
6. 所有节点都加锁失败 → 向所有节点发送释放锁请求

争议：Redis 作者推荐 Redlock，但分布式系统专家 M. Kleppmann 认为 Redlock 
无法保证安全性（时钟跳跃、GC 停顿等）。实际生产环境中，大部分公司使用单 Redis / 
主从 + 哨兵的方案已经够用。
```

### 面试追问

**Q**: 分布式锁的 TTL 设多长合适？
**A**: 业务上预估最长执行时间 × 2~3 倍。但更好的方案是用看门狗自动续期，TTL 只作为兜底防止死锁。

**Q**: Redisson 的公平锁（FairLock）和非公平锁有什么区别？
**A**: 公平锁按照请求顺序排队获取锁（Redis Queue 实现），非公平锁随机竞争（默认）。ZooKeeper 天然支持公平锁，Redis 默认是非公平的。

### 常见错误

- ❌ `SETNX` + `EXPIRE` 分两步——不是原子操作，进程崩溃会死锁
- ❌ 直接 `DEL key` 释放锁——可能释放了别人的锁，必须比对 value
- ❌ 不做锁续期——业务执行时间超过 TTL，锁提前过期

### 一句话总结

> **分布式锁 = 原子加锁（SET NX PX） + 唯一标识（UUID + 线程 ID） + Lua 解锁 + 看门狗续期。单节点够用，强安全要求用 Redlock 或 ZooKeeper。**

---

## Q8: Redis 集群数据分片（Cluster）原理 ⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: 哈希槽、数据分布、重定向、故障转移

> 面试官问："Redis Cluster 是怎么做数据分片的？16384 个哈希槽是什么概念？"

### 核心回答

Redis Cluster 通过**哈希槽（Hash Slot）**进行数据分片：

```
CRC16(key) % 16384 → 哈希槽编号

总共 16384 个槽，每个 Master 节点负责一部分：
  Master 1: 槽 0-5460     (5461 个)
  Master 2: 槽 5461-10922 (5462 个)
  Master 3: 槽 10923-16383 (5461 个)
```

**为什么是 16384？**
- 16384 个槽的状态信息可以用 2048 字节的 bitmap 表示（16384/8=2048），心跳消息负载小
- 每个节点之间需要交换槽信息，65536 个槽（CRC16 最大值）需要 8KB 的 bitmap，心跳包过大
- 16384 在 1000 个节点以下足够均匀分布数据

### 深度扩展

**MOVED 和 ASK 重定向**：

```
Client 访问 Master 1 上不存在的 key：
  Master 1 → 计算 CRC16(key) % 16384 = 7000 → 槽 7000 在 Master 2
  Master 1 → 返回 MOVED 7000 Master2_IP:Port
  Client  → 连接 Master 2，执行命令

ASK 重定向（槽迁移中）：
  Master 1 → 返回 ASK 7000 Master2_IP:Port
  Client  → 先发送 ASKING 命令给 Master 2 → 再执行原命令
  （ASK 是临时重定向，MOVED 是永久重定向）
```

**Gossip 协议**：

```
节点间通过 Gossip 协议交换信息：
  PING/PONG 消息包含：
    - 当前节点信息
    - 少数其他节点的信息（随机选取）
    - 节点状态（在线/PFAIL/FAIL）
  
  每个节点每秒随机 ping 几个节点，通过"谣言传播"全网达成一致

去中心化：没有集中元数据节点，任一节点都知道所有节点的槽分布
```

### 面试追问

**Q**: Cluster 模式下的批量操作（MGET）怎么处理？
**A**: 不同 key 可能分布在不同的槽 → 不同节点。① 客户端用 Hash Tag（`{user}:1`, `{user}:2` → 用 `{user}` 计算槽，相同 key 在同一节点）；② 客户端自己分组，按节点分别发送 MGET。

**Q**: Cluster 的故障转移是怎么触发的？
**A**: 与哨兵类似，节点间通过 Gossip 协议 PING/PONG 检测 → 半数以上 Master 认为某节点 PFAIL → 升级为 FAIL → 该节点的 Slave 发起选举 → 得到半数 Master 投票 → 提升为新 Master。

### 常见错误

- ❌ 设计 Cluster 的 key 不考虑 Hash Tag——批量操作跨节点时全部失败
- ❌ Cluster 节点数设计为 2——半数机制导致 1 个 Master 下线时没有足够的 Master 投票

### 一句话总结

> **Redis Cluster = 16384 个哈希槽（CRC16(key) % 16384） + Gossip 协议通信 + MOVED/ASK 重定向。去中心化设计，节点数建议 ≥ 3 Master。**

---

## Q9: Redis 的 Pipeline 和事务有什么区别？⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: Pipeline、事务、Lua 脚本

> 面试官问："Redis 怎么批量执行命令？Pipeline、事务、Lua 脚本各有什么优劣？"

### 核心回答

| 特性 | Pipeline | 事务（MULTI/EXEC） | Lua 脚本 |
|------|----------|-------------------|---------|
| **原子性** | ❌ 不保证 | ✅ 命令打包执行（不中断） | ✅ 整个脚本原子执行 |
| **网络 IO** | 批量发送，减少 RTT | 逐条发送，EXEC 时批量执行 | 一次发送脚本 |
| **中间结果** | 可以获取每条命令的结果 | EXEC 后才返回所有结果 | 脚本内部可以使用中间值 |
| **条件判断** | ❌ 不支持 | ❌ 不支持（无回滚） | ✅ 支持（if/else/for） |
| **适用场景** | 批量写入/读取，不要求原子性 | 简单的原子操作组合 | 复杂的原子操作 + 条件逻辑 |

### 深度扩展

**Pipeline 原理**：

```
无 Pipeline：
  Client → SET k1 v1 → Server → OK
  Client → SET k2 v2 → Server → OK
  Client → SET k3 v3 → Server → OK
  3 次 RTT

有 Pipeline：
  Client → SET k1 v1, SET k2 v2, SET k3 v3 → Server → OK, OK, OK
  1 次 RTT

注意：Pipeline 打包的命令之间可能被其他客户端的命令插入执行
```

**Lua 脚本的优势**：

```lua
-- 原子性扣减库存（无超卖）
local key = KEYS[1]
local quantity = tonumber(ARGV[1])
local current = tonumber(redis.call('get', key) or '0')

if current >= quantity then
    redis.call('decrby', key, quantity)
    return 1  -- 扣减成功
else
    return 0  -- 库存不足
end
```

Redis 7.0+ 推荐用 **Redis Functions** 替代部分 Lua 脚本（可持久化、可版本管理）。

### 面试追问

**Q**: Pipeline 能替代事务吗？
**A**: 不能。Pipeline 只是减少网络往返，不保证原子性。中间如果有命令失败，其他命令继续执行。

**Q**: Redis 事务不支持回滚，为什么还要用事务？
**A**: Redis 的事务保证"打包执行"——命令不会被其他客户端的命令插入打断。不支持回滚是为了保持简单和高效（Redis 认为事务中的命令失败是编程错误，应该在开发阶段解决）。

### 常见错误

- ❌ Lua 脚本写死 key——应该用 KEYS 数组传入（保证 cluster 模式下的哈希槽正确）
- ❌ 高并发用事务而非 Lua——Lua 的执行粒度更细、效率更高
- ❌ Pipeline 命令过多——一次发送几万条命令可能导致 TCP 缓冲区溢出

### 一句话总结

> **Pipeline = 减少 RTT（不保证原子性）；事务 = 打包执行（中间不被打断）；Lua = 原子执行 + 条件逻辑。核心业务逻辑优先用 Lua。**

---

## Q10: 如何保证缓存与数据库的一致性？⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: 缓存一致性、延迟双删、Canal

> 面试官问："更新数据时，先删缓存再更新数据库，还是先更新数据库再删缓存？为什么？"

### 核心回答

**方案对比**：

| 方案 | 操作顺序 | 问题 | 结论 |
|------|---------|------|------|
| **先删缓存 → 更新 DB** | 删缓存 → 写 DB | 写 DB 期间其他请求把旧数据写回缓存 | ❌ 极不安全 |
| **先更新 DB → 删缓存** | 写 DB → 删缓存 | 缓存删除失败则数据不一致 | ⭐ 推荐，配合重试 |
| **延迟双删** | 删缓存 → 写 DB → 延迟再删缓存 | 复杂度高，延迟时间难定 | ⭐⭐ 更安全 |

**推荐方案：先更新数据库 + 删除缓存 + 删除失败重试**

```java
public void updateData(String key, Object newData) {
    // 1. 更新数据库
    db.update(newData);
    // 2. 删除缓存
    try {
        redis.del(key);
    } catch (Exception e) {
        // 3. 删除失败 → 放入重试队列
        mq.send(new DeleteCacheMsg(key));
    }
}
```

### 深度扩展

**为什么是"删除缓存"而不是"更新缓存"？**

- 删除缓存是幂等的（`DEL key` 执行多次结果一样）
- 避免并发写引起的缓存脏数据（两个写操作以错误顺序更新缓存）
- 写多读少时，频繁更新缓存浪费资源

**更完善的方案：Canal + Binlog 异步更新**

```
MySQL binlog → Canal 监听 → 解析变更 → 投递到 MQ → 消费者更新/删除缓存

优点：
- 完全解耦：业务代码不感知缓存
- 保证最终一致性：只要 binlog 提交了，缓存一定会被更新
- 统一处理：所有表的缓存更新逻辑集中管理
```

**读写分离下的延迟问题**：

```
主库写入 → 主从同步延迟（通常 10-100ms）
→ 从库还没同步 → 用户读取从库拿到旧数据 → 写回缓存

解决方案：
- 缓存 TTL 设短一些（容忍短暂不一致）
- 关键场景强制读主库
- 延迟双删：写入后 sleep(主从延迟 × 2) 再删一次缓存
```

### 面试追问

**Q**: 删除缓存重试一直失败怎么办？
**A**: 引入死信队列 + 人工介入。大多数情况下，合理的 TTL 可以兜底（缓存自然过期后重新加载正确数据）。极端情况下数据不一致的时间 = TTL。

**Q**: 为什么不直接用 `@CacheEvict` + `@CachePut`？
**A**: Spring Cache 注解适合单机场景，分布式环境需要注意：① 缓存穿透问题（建议结合布隆过滤器）；② `@CachePut` 是更新缓存，不如删除缓存安全；③ 需配置 Redis 序列化方式（Jackson2JsonRedisSerializer）。

### 常见错误

- ❌ 先删缓存后改数据库——在改数据库之前，其他请求已经读到并将旧数据写入缓存
- ❌ 删除缓存不设 TTL——缓存永不过期，删除失败后数据永久不一致
- ❌ 高并发下加锁更新缓存——牺牲了缓存读的性能优势，得不偿失

### 一句话总结

> **缓存一致性 = 先改 DB 再删缓存 + 删除失败重试 + 合理 TTL 兜底。强一致性用 Canal + Binlog，一般场景 TTL 兜底即可。**
