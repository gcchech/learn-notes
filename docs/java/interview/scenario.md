---
title: 场景设计题
icon: clipboard-question
order: 9
category:
  - Java
  - 面试宝典
tag:
  - 场景设计
  - 短链设计
  - 秒杀系统
  - 限流
  - 排行榜
  - 海量数据
---

# 场景设计题

场景设计题是高级面试中的"压轴题"，考察候选人的全局视野、技术选型能力和对高并发、高可用、海量数据的综合理解。回答这类问题不在于"标准答案"，而在于**分析思路、权衡过程和设计理由**。以下 8 题覆盖了最常见的场景设计高频题。

---

## Q1: 如何设计一个短链系统（短网址）？⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: 系统设计、哈希算法、Base62、发号器

> 面试官问："设计一个短链系统，类似 TinyURL。支持将长 URL（如 `https://www.example.com/a/very/long/url...`）转换为短链（如 `https://t.cn/Ab3xK9`），并支持高并发访问。"

### 核心回答

**核心流程**：

```
① 短链生成：
  长 URL → 生成唯一 ID → Base62 编码 → 短链

② 短链跳转：
  用户访问短链 → 解析短链码 → 查缓存/数据库获取长 URL → 302 重定向
```

**核心设计点**：

| 问题 | 方案 |
|------|------|
| **唯一 ID 生成** | 雪花算法或基于数据库的发号器 |
| **短链码** | 唯一 ID → Base62 编码（[0-9a-zA-Z]，62 进制短） |
| **高性能跳转** | Redis 缓存（热点短链直接返回） + 布隆过滤器（防止缓存穿透） |
| **长链到短链的幂等** | 同一长链返回同一短链 → 对长链做 MD5 → 存入 `long_to_short` 映射表 |
| **短链过期** | 创建时间 + TTL（定期任务清理） |

**容量估算**（以生成 10 亿条短链估算）：

```
短链长度：Base62 编码，7 位 = 62^7 ≈ 3.5 万亿（足够）
存储：每条记录（ID + 长 URL + 创建时间 + 过期时间）≈ 500 字节
总存储：1 亿 × 500B ≈ 50GB（10 亿条 ≈ 500GB，需分库分表）
QPS：读（跳转）远高于写（生成），读写比 ≈ 100:1
```

### 深度扩展

**Base62 编码实现**：

```java
public class Base62Encoder {
    private static final String CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    
    public static String encode(long id) {
        StringBuilder sb = new StringBuilder();
        while (id > 0) {
            sb.append(CHARS.charAt((int) (id % 62)));
            id /= 62;
        }
        return sb.reverse().toString();
    }
    
    public static long decode(String code) {
        long result = 0;
        for (char c : code.toCharArray()) {
            result = result * 62 + CHARS.indexOf(c);
        }
        return result;
    }
}
// id=1000000 → encode → "68GP" (4 位短码)
```

**跳转服务的核心逻辑**：

```java
@GetMapping("/{code}")
public ResponseEntity<Void> redirect(@PathVariable String code) {
    // 1. 查本地缓存（Caffeine）
    String longUrl = caffeineCache.get(code);
    if (longUrl != null) {
        return ResponseEntity.status(302).header("Location", longUrl).build();
    }
    
    // 2. 查 Redis
    longUrl = redis.get("short:" + code);
    if (longUrl != null) {
        caffeineCache.put(code, longUrl);
        return ResponseEntity.status(302).header("Location", longUrl).build();
    }
    
    // 3. 查数据库（布隆过滤器先判断是否存在）
    if (!bloomFilter.mightContain(code)) {
        return ResponseEntity.notFound().build();
    }
    Long id = Base62Encoder.decode(code);
    longUrl = db.findById(id);
    if (longUrl == null) {
        return ResponseEntity.notFound().build();
    }
    
    // 4. 回写缓存
    redis.setex("short:" + code, 3600 * 24, longUrl);
    caffeineCache.put(code, longUrl);
    return ResponseEntity.status(302).header("Location", longUrl).build();
}
```

**302 vs 301**：

| | 302 临时重定向 | 301 永久重定向 |
|--|-------------|-------------|
| 浏览器行为 | 每次请求都走短链服务 | 后续直接访问长链（不经过短链服务） |
| 数据分析 | ✅ 可以统计点击量、来源 | ❌ 统计不到 |
| 推荐 | ✅ **用 302**（可收集访问数据） | 除非确定永不变更 |

### 面试追问

**Q**: 如何保证同一长链返回同一短链？
**A**: ① 先对长 URL 做 MD5 → 查 `long_to_short` 映射表；② 如果存在则直接返回已有短链；③ 如果不存在则分配新 ID，同时插入 `short_to_long` 和 `long_to_short` 两张表。

**Q**: 短链被恶意遍历怎么办？
**A**: ① 短链码加随机盐（不只依赖递增 ID）；② 访问频率限制（同一 IP 限制 QPS）；③ 私密短链加访问密码或 Token 验证。

### 常见错误

- ❌ 只用 MD5 哈希截断生成短链——MD5 碰撞会导致两个不同长链映射到同一个短链
- ❌ 跳转用 301——无法统计数据（点击量、来源、设备）
- ❌ 短链码过长——7 位 Base62 已经够 3.5 万亿条，不需要 10 位

### 一句话总结

> **短链系统 = 唯一 ID 生成器 → Base62 编码 → 302 重定向。核心优化：Redis 缓存 + 布隆过滤器防穿透 + MD5 幂等映射。7 位短码够用，301 适合永久，302 适合需统计。**

---

## Q2: 如何设计一个秒杀系统？⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: 高并发、缓存、削峰、异步、幂等

> 面试官问："设计一个秒杀系统，100 万人同时抢 1000 件商品，怎么保证不超卖、系统不崩溃？"

### 核心回答

**核心架构分层**：

```
用户端 → CDN（静态化） → Nginx 限流 → 网关 → 秒杀服务 → Redis（库存扣减）
                                                              ↓
                                                       MQ（异步下单）→ 订单服务 → DB
```

**6 大核心设计**：

| 策略 | 方案 | 解决什么 |
|------|------|---------|
| **前端限流** | 按钮置灰、倒计时、验证码 | 过滤无效流量 |
| **Nginx 限流** | `limit_req_zone` 令牌桶，QPS 控制 | 拦住大部分流量 |
| **CDN 静态化** | 秒杀页面静态化，推送到 CDN | 减少服务器压力 |
| **Redis 库存扣减** | Lua 脚本原子扣减，`DECR` 到 0 即止 | 不超卖，高性能 |
| **MQ 削峰** | 扣减成功的请求入 MQ，异步创建订单 | 解耦，保护订单系统 |
| **最终结果查询** | 轮询查询订单状态，或 MQ 推送结果 | 不用同步等待 |

### 深度扩展

**Redis 原子扣库存（Lua 脚本）**：

```lua
-- 原子扣减库存，不会超卖
local key = KEYS[1]   -- stock:product:1001
local quantity = tonumber(ARGV[1])
local current = tonumber(redis.call('get', key) or '0')

if current >= quantity then
    redis.call('decrby', key, quantity)
    return 1  -- 扣减成功
else
    return 0  -- 库存不足
end
```

**服务端核心流程**：

```java
public SeckillResult seckill(Long userId, Long productId) {
    // 1. 内存标记：商品已售罄（减少 Redis 请求）
    if (soldOutCache.isSoldOut(productId)) {
        return SeckillResult.soldOut();
    }
    
    // 2. Redis 去重：同一用户不能重复秒杀
    String dedupKey = "seckill:user:" + productId + ":" + userId;
    if (!redis.setnx(dedupKey, "1", 3600)) {
        return SeckillResult.repeated();
    }
    
    // 3. Lua 脚本原子扣减库存
    Long result = redis.execute(luaScript, 
        Collections.singletonList("stock:product:" + productId));
    
    if (result == 0) {
        soldOutCache.markSoldOut(productId);
        return SeckillResult.soldOut();
    }
    
    // 4. 异步发 MQ 创建订单
    mq.send(new CreateOrderMsg(userId, productId));
    
    // 5. 返回"排队中"（不阻塞等待订单创建）
    return SeckillResult.queuing();
}
```

**Nginx 限流配置**：

```nginx
# 限流：每秒 1000 个请求（令牌桶，burst=2000 排队）
limit_req_zone $binary_remote_addr zone=seckill:10m rate=10r/s;

location /seckill/submit {
    limit_req zone=seckill burst=20 nodelay;
    proxy_pass http://seckill-service;
}
```

### 面试追问

**Q**: 秒杀中 Redis 宕机了怎么办？
**A**: ① Redis 集群多副本（主从 + 哨兵快速切换）；② 如果 Redis 完全不可用，降级为"活动暂停"（比超卖好）；③ 配置本地缓存的库存快照（Redis 故障时从本地缓存读库存状态，只读不写）。

**Q**: 为什么要用 MQ 削峰，而不是直接写数据库？
**A**: 数据库的连接数和 QPS 有限（通常几千），秒杀瞬间几十万请求直接写 DB 会导致数据库崩溃。MQ 作为缓冲区平滑消费，订单系统按自身处理能力匀速消费。

### 常见错误

- ❌ 数据库直接扣库存——`UPDATE stock SET count = count - 1 WHERE count > 0` 在高并发下性能差且容易死锁
- ❌ 同步等待订单创建——用户请求线程被阻塞，线程池很快打满
- ❌ 不做前端限流——大量无效请求打到服务器，浪费带宽和 CPU（验证码 + 按钮防抖可过滤 80%+ 无效流量）

### 一句话总结

> **秒杀 = CDN 静态化 + Nginx 限流 + Redis Lua 原子扣库存 + MQ 削峰 + 异步结果查询。核心原则：层层过滤，尽量少访问后端，Redis 扛并发，MQ 保护数据库。**

---

## Q3: 如何设计一个排行榜系统？⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: Redis ZSet、实时排名、分段榜单

> 面试官问："设计一个游戏排行榜，支持实时更新分数，查询用户排名和 Top 100 榜单。"

### 核心回答

**Redis ZSet 天然适合排行榜**：

| 操作 | Redis 命令 | 复杂度 |
|------|----------|--------|
| 更新分数 | `ZADD leaderboard score userId` | O(log N) |
| 查询分数 | `ZSCORE leaderboard userId` | O(1) |
| 查询排名（升序） | `ZRANK leaderboard userId` | O(log N) |
| 查询排名（降序） | `ZREVRANK leaderboard userId` | O(log N) |
| 查询 Top 100 | `ZREVRANGE leaderboard 0 99 WITHSCORES` | O(log N + 100) |
| 查询用户附近排名 | `ZREVRANGE leaderboard rank-5 rank+5` | O(log N + 11) |

```java
// 更新分数
redis.zadd("leaderboard", newScore, userId);

// 查询排名（从 0 开始，需 +1）
Long rank = redis.zrevrank("leaderboard", userId); // O(log N)
if (rank != null) return rank + 1;

// 查询 Top 100
Set<ZSetOperations.TypedTuple<String>> top100 = 
    redis.zrevrangeWithScores("leaderboard", 0, 99);
```

### 深度扩展

**大规模排行榜的分段设计**：

```
问题：10 亿用户的排行榜，ZSet 内存占用大、ZREVRANK 仍为 O(log N)

分段方案：
- 顶级段（Top 1000）：Redis ZSet（热数据，实时更新）
- 中间段（1001 - 10 万）：从 Redis 按偏移量查询
- 底部分段：按分数段分桶（如 0-100, 101-200, ...）

查询排名：
  1. Redis ZSet 查自己所在桶
  2. 桶内 ZSet 查桶内排名
  3. 总排名 = 桶内排名 + 更高桶的人数

近似排名：误差 ≤ 1%（用 HyperLogLog 估计桶内人数）
```

**历史榜单和实时榜单**：

| 榜单类型 | 存储方案 | TTL |
|---------|---------|-----|
| 实时榜 | Redis ZSet | 永不过期 |
| 日榜 | Redis ZSet + 每天重置 | 当天 23:59:59 |
| 周榜 | Redis ZSet + 每周重置 | 周日 23:59:59 |
| 历史日榜 | Redis ZSet → 每天凌晨归档到 MySQL | MySQL 永久存储 |

```java
// 日榜 Key 命名设计
String dailyKey = "daily:rank:" + LocalDate.now(); // daily:rank:2026-07-01
String weeklyKey = "weekly:rank:" + weekOfYear;     // weekly:rank:27
String monthlyKey = "monthly:rank:" + yearMonth;    // monthly:rank:2026-07
```

### 面试追问

**Q**: ZSet 底层是跳表 + 哈希表，为什么不用 B+ 树？
**A**: 跳表实现更简单、范围查询更直观（跳表天然有序，B+ 树需要中序遍历）、改造成并发数据结构更容易。Redis 是内存数据库，不需要考虑磁盘 IO 优化（B+ 树的强项）。

**Q**: 分数相同时怎么确定排名？
**A**: `ZADD leaderboard score userId` 按字典序排序。如果需要"先达到该分数的排在前面"，可以将时间戳编码到分数中：`score = originalScore + 1 - timestamp/1e13`（时间戳作为小数部分，先到达的分数略低，但在降序排名中反而靠前）。

### 常见错误

- ❌ 每次请求都 `ZREVRANGE 0 -1` 查全量——海量数据下 O(N) 会卡死 Redis
- ❌ 用 MySQL `ORDER BY score DESC LIMIT 100` 做排行榜——千万级数据实时排序性能极差
- ❌ 日榜 Key 不用 TTL——不同天的榜单无限积累，内存撑爆

### 一句话总结

> **排行榜 = Redis ZSet（跳表 + 哈希表，O(log N) 插入和排名查询）。大规模用分段热冷分离（Top N 用 ZSet，底层用分桶近似排名）。日榜/周榜用带日期的 Key + 定时归档到 MySQL。**

---

## Q4: 如何设计一个接口限流系统？⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: 令牌桶、漏桶、滑动窗口、Sentinel

> 面试官问："设计一个 API 限流系统，要能针对不同用户/接口设置不同的限流规则。"

### 核心回答

**四种经典限流算法**：

| 算法 | 原理 | 优点 | 缺点 |
|------|------|------|------|
| **计数器（固定窗口）** | 每个时间窗口有固定计数器，超过即拒绝 | 简单 | 临界突变（窗口交界处双倍流量） |
| **滑动窗口** | 将时间窗口更细粒度拆分（如 1 秒拆为 10 个 100ms 格子） | 平滑，解决临界突变 | 内存开销略高 |
| **漏桶** | 固定速率流出，流入超过桶容量则溢出 | 流量平滑 | 无法应对突发流量 |
| **令牌桶**⭐ | 固定速率往桶里放令牌，请求要先拿到令牌 | 可应对**合理突发** | 实现稍复杂 |

**推荐：令牌桶（Token Bucket）**——既能平滑流量，又能应对合理的突发。

### 深度扩展

**Redis 实现滑动窗口限流**：

```lua
-- 滑动窗口限流（按秒拆分）
-- key: rate:user:123:api:/order
-- window: 1s, limit: 100（1 秒内最多 100 次）

local key = KEYS[1]
local window = tonumber(ARGV[1])  -- 窗口大小（秒）
local limit = tonumber(ARGV[2])   -- 限制次数
local now = redis.call('TIME')[1]

-- 移除窗口外的旧记录
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

-- 统计当前窗口内的请求数
local count = redis.call('ZCARD', key)

if count < limit then
    -- 用纳秒 + 随机数作为 score，保证不重复
    redis.call('ZADD', key, now + math.random(), now)
    redis.call('EXPIRE', key, window + 1)
    return 1  -- 通过
else
    return 0  -- 限流
end
```

**令牌桶算法的 Java 实现**：

```java
public class TokenBucket {
    private final long capacity;           // 桶容量
    private final double rate;             // 令牌生成速率（个/秒）
    private double tokens;                 // 当前令牌数
    private long lastRefillTime;          // 上次填充时间

    public TokenBucket(long capacity, double rate) {
        this.capacity = capacity;
        this.rate = rate;
        this.tokens = capacity;
        this.lastRefillTime = System.nanoTime();
    }

    public synchronized boolean tryAcquire() {
        refill();
        if (tokens >= 1) {
            tokens -= 1;
            return true;
        }
        return false;
    }

    private void refill() {
        long now = System.nanoTime();
        double elapsed = (now - lastRefillTime) / 1e9; // 转换为秒
        tokens = Math.min(capacity, tokens + elapsed * rate);
        lastRefillTime = now;
    }
}
// 使用：1 秒生成 100 个令牌，最多积压 200 个（应对 2 倍突发）
TokenBucket bucket = new TokenBucket(200, 100);
```

**多维度限流设计**：

```
规则分级：
  全局：所有接口的总 QPS 上限（如 10000）
  接口级：/order/submit 接口 QPS 上限（如 1000）
  用户级：同一用户 QPS 上限（如 10）
  IP 级：同一 IP QPS 上限（如 5）

逐级检查：
  IP 限流 → 用户限流 → 接口限流 → 全局限流 → 通过

存储选择：
  单机限流：Guava RateLimiter（内存，不需要网络开销）
  分布式限流：Redis + Lua（跨服务，一致性好）
  生产推荐：Sentinel（内置这些算法，开箱即用）
```

### 面试追问

**Q**: 令牌桶和漏桶有什么区别？
**A**: 漏桶是"匀速"流出——无论有没有请求，速率固定。令牌桶是允许"突发"——积累了 N 个令牌可以一次性被消费。生产环境大多用令牌桶（应对突发流量），接口级限流用漏桶（保护下游）。

**Q**: 限流被拒后返回什么 HTTP 状态码？
**A**: `429 Too Many Requests`。同时在响应头中添加 `X-RateLimit-Remaining`（剩余次数）和 `Retry-After`（建议重试时间）。

### 常见错误

- ❌ 固定窗口不做滑动窗口处理——窗口边界瞬间双倍流量（00:59 和 01:00 两秒内各 100 次 = 200 次/秒）
- ❌ 限流只做接口级不做用户级——一个恶意用户可以把接口配额耗尽，影响所有用户
- ❌ 所有接口都在 Redis 做限流——热点接口可以加本地缓存限流计数，减少 Redis 压力

### 一句话总结

> **限流算法：令牌桶（允许合理突发，最推荐） > 滑动窗口（平滑） > 漏桶（匀速） > 固定窗口（临界突变）。生产用 Sentinel 或 Redis Lua 脚本，多维度：IP → 用户 → 接口 → 全局。**

---

## Q5: 如何设计一个消息队列？⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: MQ 核心原理、存储、消费、可靠性

> 面试官问："如果让你自己设计一个消息队列，你需要考虑哪些方面？"

### 核心回答

**消息队列的核心模块**：

```
Producer → [Broker]
              ├── 网络层（Netty）
              ├── 协议层（自定义协议 / AMQP）
              ├── 存储层（CommitLog / 分区）
              ├── 索引层（Consumer Offset / Queue Offset）
              ├── 消费层（Push / Pull）
              └── 协调层（元数据管理 / 集群协调）
          → Consumer
```

**需要解决的核心问题**：

| 问题 | 解决方案 |
|------|---------|
| **消息可靠存储** | 顺序写磁盘（CommitLog），Kafka/RocketMQ 都是顺序写，性能接近内存 |
| **消息不丢失** | 生产者确认（ACK）+ Broker 同步刷盘/副本同步 + 消费者手动确认 |
| **消息不重复** | 消费端幂等（唯一业务 ID 去重，Redis 记录消费状态） |
| **高吞吐** | 顺序写 + 零拷贝（sendfile）+ 批量发送 + 分区并行消费 |
| **消息顺序** | 同一分区/队列保证有序，不同分区/队列无法保证 |
| **消息堆积** | 磁盘容量足够即可（RocketMQ 单机可堆积 TB 级消息） |
| **延时消息** | 时间轮（TimeWheel） + 定时任务扫描 |

### 深度扩展

**存储设计（CommitLog + ConsumeQueue）**：

```
RocketMQ 存储模型：

CommitLog（所有消息顺序写入同一文件）：
  ┌─────────────────────────────────────────┐
  │ msg1 │ msg2 │ msg3 │ msg4 │ ...          │
  └─────────────────────────────────────────┘

ConsumeQueue（Topic + Queue 的索引文件）：
  Queue-0: [offset1, size1, tag1] [offset2, size2, tag2] ...
  Queue-1: [offset3, size3, tag3] [offset4, size4, tag4] ...

优势：
  - 所有 Topic 的消息写入同一个 CommitLog → 完全顺序写
  - ConsumeQueue 很小（每条 20 字节），可以全部加载到 Page Cache
  - 消费者读 ConsumeQueue → 找到 offset → 随机读 CommitLog（但 Page Cache 命中率高）
```

**如何保证消息不丢失（全链路 ACK）**：

```
生产端：同步发送 + 重试
  SendResult result = producer.send(msg);
  if (result.getStatus() != SEND_OK) {
      // 重试或记录到 DB 后补偿
  }

Broker 端：同步刷盘 + 主从同步
  flushDiskType = SYNC_FLUSH         // 每条消息强制刷盘
  brokerRole = SYNC_MASTER           // 等 Slave 确认后才返回成功

消费端：手动提交 Offset
  consumer.registerMessageListener((MessageListenerOrderly) (msgs, ctx) -> {
      for (Message msg : msgs) {
          process(msg);
      }
      return ConsumeConcurrentlyStatus.CONSUME_SUCCESS; // 处理成功才提交
  });
```

**延时消息的时间轮实现**：

```
时间轮（TimeWheel）：类似钟表，每个槽对应一个时间单位

slot 0 → [msgA(5s后执行)]  → 当前指针
slot 1 → []
slot 2 → [msgB(7s后执行)]
...
slot 59 → [msgC(65s后执行)] → 需要转一圈（60s 一圈）

实现：
  1. msgB 延时 7 秒 → 放入 slot[(now+7) % 60] = slot 7
  2. 定时器每秒推进一格 → 到 slot 7 时执行 msgB
  3. 多层时间轮：时-分-秒（小时级延时消息放入小时轮，到时降级到分轮、秒轮）

RocketMQ 延时级别（默认）：1s 5s 10s 30s 1m 2m 3m 4m 5m 6m 7m 8m 9m 10m 20m 30m 1h 2h
```

### 面试追问

**Q**: 消息重复消费怎么解决？
**A**: 消费端做幂等。方式：① 业务唯一 ID（如订单号）存入 Redis / DB，消费前检查是否已处理；② 数据库唯一索引约束（`INSERT IGNORE` 或 `ON DUPLICATE KEY UPDATE`）。

**Q**: Kafka 和 RocketMQ 有什么区别？
**A**: Kafka 是为**日志/流处理**设计的（巨量数据、较少 Topic），适合大数据场景。RocketMQ 是为**业务消息**设计的（延迟消息、事务消息、Tag 过滤、死信队列），适合电商/金融场景。

### 常见错误

- ❌ 认为 MQ 一定比直接 RPC 快——MQ 中间多了一跳，延迟一定更高，优势在于解耦和削峰
- ❌ 用 MQ 做实时同步 RPC——MQ 是异步的，不适合需要同步返回结果的场景
- ❌ 消费者自动确认 + 业务抛异常——消息被确认但业务未处理，消息丢失

### 一句话总结

> **MQ 核心 = 顺序写 CommitLog（高性能存储） + ConsumeQueue 索引（快速查找） + 全链路 ACK（不丢失） + 消费端幂等（不重复）。延时消息用时间轮，顺序消息用单队列。**

---

## Q6: 海量数据找 TOP K —— 10 亿个数字找最大的 100 个 ⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: 堆排序、分治、海量数据处理

> 面试官问："10 亿个整数，找出其中最大的 100 个。内存只有 1GB，怎么做？"

### 核心回答

**单机方案：小顶堆（Min-Heap）**：

```
核心思路：
  维护一个 100 个元素的小顶堆（堆顶是最小值）
  遍历 10 亿个数字：
    - 堆不满（< 100 个）→ 直接插入
    - 堆满了 → 和堆顶比较：
        - 当前数字 > 堆顶 → 弹出堆顶，插入当前数字
        - 当前数字 ≤ 堆顶 → 跳过

时间：O(N log K) = 10 亿 × log(100) ≈ 10 亿 × 7 次比较
空间：O(K) = 100 个整数（几百字节）
```

```java
// JDK PriorityQueue 默认是小顶堆
PriorityQueue<Integer> minHeap = new PriorityQueue<>(100);

for (int num : stream) { // 流式读取，不需要一次加载所有数据
    if (minHeap.size() < 100) {
        minHeap.offer(num);
    } else if (num > minHeap.peek()) {
        minHeap.poll();
        minHeap.offer(num);
    }
}
// minHeap 里就是最大的 100 个
```

**分布式方案：分治 + 归并**：

```
步骤：
  1. 10 亿数据分桶（Hash 或 Range 分区）
     Hash(id) % 1000 → 均匀分到 1000 个桶
     每个桶 100 万条数据 → 可以单机处理

  2. 每个桶找 Top 100（小顶堆）
     1000 个桶 × 100 = 10 万个候选

  3. 10 万候选数据再找 Top 100（小顶堆 / 快速选择）
     结果 = 全局 Top 100
```

### 深度扩展

**堆排序 vs 快速排序 vs 快速选择**：

| 方法 | 时间 | 空间 | 适用场景 |
|------|------|------|---------|
| 全量排序后取 Top 100 | O(N log N) | O(N) | ❌ 内存不够 |
| 小顶堆 | O(N log K) | O(K) | ✅ K 小，流式处理 |
| 快速选择 | O(N) 平均 | O(N) | K 大，数据可全量加载 |

**其他海量数据场景**：

| 场景 | 方案 |
|------|------|
| **重复最多的数** | 哈希分桶 → 每个桶统计频率 → 全局汇总 |
| **两个大文件找相同行** | 布隆过滤器（内存够）或 外排序 + 归并 |
| **未出现的数** | 位图（2^32 bit = 512MB）→ 遍历位图找 0 |
| **URL 频次统计** | 哈希分桶 → HashMap + 小顶堆 |
| **每天最热搜索词 Top 10** | 分桶统计 → 每个桶维护一个固定大小的堆 → 汇总 |

### 面试追问

**Q**: 如果 K = 10 亿的一半（5 亿），小顶堆还有效吗？
**A**: 此时 K = N/2 = 5 亿，小顶堆的 O(N log K) ≈ O(N log N)，效率与全量排序接近。更好的方案：快速选择算法（平均 O(N)，但需全量加载到内存），或用桶排序（数据分布已知时）。

**Q**: 如果数据是动态流（不停有新数据），怎么维护 Top K？
**A**: 仍然用小顶堆。每次新数据来，和堆顶比较，大于堆顶则替换并调整堆。堆天然支持动态维护。如果 K 变大，需要重新计算。

### 常见错误

- ❌ 用全量排序——10 亿 × 4 字节 = 4GB，超过 1GB 内存且 O(N log N) 太慢
- ❌ 大数据场景下用 `Arrays.sort()`——内存直接 OOM
- ❌ 哈希分桶不均匀——用 `hash % N` 可以均匀分布，注意解决数据倾斜（个别桶特别大）

### 一句话总结

> **海量数据 Top K = 小顶堆（O(N log K)，K 小首选）。K 大用快速选择（O(N)）。分布式 = 分桶 + 各桶 Top K + 全局 Top K。位图、布隆过滤器、外排序是海量数据的三大基础工具。**

---

## Q7: 亿级用户数据统计——UV、PV 如何设计？⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: HyperLogLog、Bitmap、布隆过滤器

> 面试官问："统计一个网站每天的独立访客（UV）和页面浏览量（PV），日活 1 亿用户，怎么设计？"

### 核心回答

| 指标 | 方案 | 内存占用（1 亿用户） | 误差 |
|------|------|-----------------|------|
| **PV** | Redis `INCR` 计数器 | 8 字节/页面 | 精确 |
| **UV** (精确) | Bitmap（`SETBIT`） | 用户 ID 范围 / 8 ≈ 12.5MB（ID 连续） | 精确 |
| **UV** (近似) | **HyperLogLog** | **12KB**（固定） | 0.81% 标准误差 |
| **UV** (去重) | 布隆过滤器 | ~120MB（误判率 0.1%） | 存在误判 |

**推荐组合**：

```
PV：Redis INCR（精确，极小内存，QPS 10 万+）
UV（页面级）：HyperLogLog（12KB 固定内存，0.81% 误差可接受）
UV（用户级去重）：Bitmap（如果用户 ID 范围小且连续）或 布隆过滤器
```

### 深度扩展

**HyperLogLog 原理（不精确但极省内存）**：

```
核心思想：不存数据本身，只存"出现过的最大前导零"

假设：hash(x) → 00101001...（二进制）
  前导零位数 = 2（"001..."）

如果见过前导零 = 5 的值 → 估计不同元素 ≈ 2^5 = 32
如果见过前导零 = 10 的值 → 估计不同元素 ≈ 2^10 = 1024

为了降低方差：
  - 分成 2^14 = 16384 个桶
  - 每个桶存见过的最大前导零（6 bit）
  - 总内存 = 16384 × 6 bit = 12 KB

Redis 使用：
  PFADD uv:20260701 userId
  PFCOUNT uv:20260701        → 返回 UV 估算值
  PFMERGE uv:weekly uv:day1 uv:day2 ... uv:day7  → 合并（但无法求交集）
```

**Bitmap 方案**：

```java
// 每个用户 ID 占 1 bit
// 用户 ID 范围 [1, 100000000] → 需要 12.5MB（10 亿 → 125MB）

// 记录 UV
redis.setbit("uv:20260701", userId, true);

// 统计 UV
Long uv = redis.bitcount("uv:20260701");

// 优点：精确、可求交集（日活 × 付费 → BITOP AND）
// 缺点：用户 ID 不连续时浪费空间
```

**实际生产方案（漏斗模型）**：

```
同一数据在不同层用不同精度：

数据采集层（日志）→ 精确
  Kafka → Flink 实时聚合
    ├─ 精确 UV（Bitmap/RocksDB 去重）
    ├─ 近似 UV（HyperLogLog，仪表盘快速展示）
    └─ 离线数仓（Hive/Spark，T+1 精确计算）

结果存储：
  Redis：实时的近似 UV（HyperLogLog）+ 精确 PV（INCR）
  MySQL/ClickHouse：T+1 的精确 UV（历史数据）
```

### 面试追问

**Q**: HyperLogLog 能求两个集合的交集吗？
**A**: 不能。HyperLogLog 不支持交集运算。只支持单集合统计和多个集合并集（`PFMERGE`）。交集需要用 Bitmap（`BITOP AND`）或布隆过滤器。

**Q**: 如果用户 ID 是 UUID 而不是自增数字，Bitmap 还能用吗？
**A**: 不能直接用。需要建立一个 UUID → 自增数字 ID 的映射表（占用大量内存），或直接用 HyperLogLog 做近似统计（推荐）。

### 常见错误

- ❌ 1 亿 PV 用 MySQL `SELECT COUNT(*)`——全表扫描，实时查询跑分钟级，Redis INCR 是毫秒级
- ❌ 用 Set 存用户 ID 统计 UV——1 亿个 UUID × 36 字节/个 = 3.6GB，内存爆炸
- ❌ 把 HyperLogLog 当成精确去重——0.81% 误差在 1 亿时可能差 80 万

### 一句话总结

> **PV = Redis INCR（精确，O(1)）；UV ≈ HyperLogLog（12KB 固定内存，0.81% 误差）；精确 UV = Bitmap（自增 ID 场景）。上生产用漏斗模型：实时近似 + 离线精确。**

---

## Q8: 接口性能优化实战——慢接口从 5 秒到 50ms ⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: 性能优化思路、缓存、异步、并行、批量

> 面试官问："一个查询接口响应要 5 秒，你怎么排查和优化？"

### 核心回答

**排查步骤**：

```
第 1 步：监控/日志确认耗时分布
  → SkyWalking/Pinpoint 全链路追踪 → 定位慢在哪个服务/哪个方法

第 2 步：确认数据库慢查询
  → 慢查询日志 → EXPLAIN → 是否走索引 → 是否有全表扫描

第 3 步：确认外部调用耗时
  → RPC 超时时间是否合理 → 是否可以做并行调用 → 是否可以异步

第 4 步：确认代码逻辑
  → 循环内查数据库（N+1 问题）
  → 锁竞争（synchronized 粒度过大）
  → 大对象序列化
```

**优化手段（从快到慢排列）**：

| 手段 | 适用场景 | 效果 |
|------|---------|------|
| **加索引** | 慢查询 | 秒级 → 毫秒级 |
| **加缓存** | 热点数据、读多写少 | 数据库压力降 90%+ |
| **并行调用** | 多个无依赖的 RPC/DB 调用 | 5 个 200ms 调用并行后 ≈ 200ms（非 1000ms） |
| **异步化** | 非核心流程（发通知、写日志） | 接口响应不阻塞 |
| **批量处理** | 循环内 RPC/DB | N 次 → 1 次 |
| **SQL 优化** | 避免 SELECT * / 大偏移量分页 / JOIN 过多 | 2-10 倍提升 |
| **分库分表** | 单表数据过大 | 写入 QPS 线性扩展 |
| **精简响应字段** | 返回大量不需要的字段 | 带宽和序列化开销降低 |

### 深度扩展

**N+1 问题（最常见性能杀手）**：

```java
// ❌ 慢：N+1 查询
List<User> users = userDao.findAll();       // 1 次查询
for (User user : users) {
    Order order = orderDao.findByUserId(user.getId()); // N 次查询
    // 有 1000 个用户，就查 1001 次数据库
}

// ✅ 快：批量查询 + Map 映射
List<User> users = userDao.findAll();
List<Long> userIds = users.stream().map(User::getId).toList();
List<Order> orders = orderDao.findByUserIds(userIds);  // 1 次批量查询
Map<Long, Order> orderMap = orders.stream()
    .collect(Collectors.toMap(Order::getUserId, o -> o));
// 1000 个用户 → 2 次查询
```

**并行调用优化**：

```java
// ❌ 串行调用：耗时 200ms + 300ms + 150ms = 650ms
UserInfo user = userService.getUser(id);         // 200ms
OrderInfo order = orderService.getOrder(id);      // 300ms
CouponInfo coupon = couponService.getCoupon(id);  // 150ms

// ✅ 并行调用：耗时 ≈ max(200ms, 300ms, 150ms) = 300ms
CompletableFuture<UserInfo> userFuture = 
    CompletableFuture.supplyAsync(() -> userService.getUser(id));
CompletableFuture<OrderInfo> orderFuture = 
    CompletableFuture.supplyAsync(() -> orderService.getOrder(id));
CompletableFuture<CouponInfo> couponFuture = 
    CompletableFuture.supplyAsync(() -> couponService.getCoupon(id));

CompletableFuture.allOf(userFuture, orderFuture, couponFuture).join();
UserInfo user = userFuture.get();
OrderInfo order = orderFuture.get();
CouponInfo coupon = couponFuture.get();
```

**常见优化清单**：

```
☐ 数据库索引（WHERE / JOIN / ORDER BY 字段）
☐ 循环内 N+1 问题
☐ 无依赖 RPC 调用并行化
☐ 添加 Redis 缓存（热点数据）
☐ 添加本地缓存（Caffeine，极热数据）
☐ SQL 避免 SELECT *（只查需要的字段）
☐ 大偏移量分页改成游标分页（WHERE id > lastId LIMIT 100）
☐ 非核心逻辑异步化（发通知、记录日志）
☐ 慢查询改为读只读从库
☐ 接口返回字段精简（少用 @JsonIgnore，但裁剪无用返回）
```

### 面试追问

**Q**: Redis 缓存一定能让接口变快吗？
**A**: 不一定。如果缓存命中率低（冷数据、缓存频繁过期），多了一次 Redis 网络往返反而更慢。如果查询数据库本身只需 1ms，加 Redis 缓存可能 2ms（多一层网络开销）。

**Q**: 加了索引为什么查询还是很慢？
**A**: ① 索引失效（LIKE '%xxx'、OR、类型隐式转换、函数操作）；② 回表太多（需要覆盖索引）；③ MySQL 优化器选择错误（强制用 FORCE INDEX）；④ 表数据过大导致 B+ 树层次深（分库分表）。

### 常见错误

- ❌ 优化之前不测量——没有 APM 数据就"我觉得这里慢"地乱改
- ❌ 什么都加缓存——缓存不是免费的（内存成本、一致性成本、代码复杂度）
- ❌ 并行化不配线程池——直接用 `CompletableFuture.supplyAsync()` 无自定义线程池，默认 ForkJoinPool 可能被其他任务拖慢

### 一句话总结

> **慢接口优化 = 监控定位（全链路追踪）→ 数据库（索引 + N+1 + 慢查询）→ 缓存（热点数据）→ 并行（无依赖调用并行）→ 异步（非核心逻辑不阻塞）。动手前先测量，优化后要验证。**
