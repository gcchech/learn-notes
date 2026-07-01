---
title: MySQL 架构与 InnoDB 存储引擎源码解析
icon: server
order: 5
category:
  - Java
  - 源码解析
tag:
  - MySQL
  - InnoDB
  - B+ 树
  - 索引
  - MVCC
  - 事务
  - 锁
  - Buffer Pool
  - Redo Log
  - Undo Log
---

# MySQL 架构与 InnoDB 存储引擎源码解析

> 📖 MySQL 是互联网行业使用最广泛的关系型数据库，而 InnoDB 是其默认且最重要的存储引擎。本文从 MySQL 的 Server 层与存储引擎层的双层架构出发，深入剖析 InnoDB 的 B+ 树索引结构、事务实现（MVCC + Undo Log + Redo Log）、行锁与间隙锁机制、Buffer Pool 的内存管理策略，以及一条 SQL 从网络连接到返回结果的完整执行链路。

---

## 一、⭐️ MySQL 的整体架构——Server 层 + 存储引擎层

```
┌──────────────────────────────────────────────────────────────────────┐
│                        MySQL 整体架构（双层设计）                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────── Server 层 ───────────────────────────┐  │
│  │                                                                   │  │
│  │  ① 连接器（Connection Handler）                                   │  │
│  │     负责建立连接、权限认证、连接管理（线程池）                       │  │
│  │                         ↓                                         │  │
│  │  ② 查询缓存（Query Cache：MySQL 8.0 已移除）                      │  │
│  │                         ↓                                         │  │
│  │  ③ 解析器（Parser）                                               │  │
│  │     词法分析（Lex）→ 语法分析（Yacc）→ 生成 AST 语法树            │  │
│  │                         ↓                                         │  │
│  │  ④ 优化器（Optimizer）                                            │  │
│  │     ★ 选择索引、决定连接顺序、优化子查询、条件下推                    │  │
│  │     ★ 基于代价模型（CBO）：估算 CPU/IO 开销，选择最优方案           │  │
│  │                         ↓                                         │  │
│  │  ⑤ 执行器（Executor）                                             │  │
│  │     调用存储引擎 API，逐行读取数据，判断是否满足条件                 │  │
│  │                                                                   │  │
│  └──────────────────────────────┬────────────────────────────────────┘  │
│                                  │                                       │
│                    ★ 统一的存储引擎 API 接口                             │
│                    （handler.h / handler.cc）                            │
│                                  │                                       │
│  ┌─────────────────────────── 存储引擎层 ───────────────────────────┐  │
│  │                                                                   │  │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │  │
│  │   │  InnoDB  │  │ MyISAM   │  │  Memory  │  │ Archive  │        │  │
│  │   │ ★ 默认   │  │          │  │          │  │          │        │  │
│  │   │ 支持事务  │  │ 不支持   │  │ 内存表   │  │ 压缩存储  │        │  │
│  │   │ 行锁     │  │ 表锁     │  │ Hash索引 │  │          │        │  │
│  │   │ MVCC    │  │          │  │          │  │          │        │  │
│  │   └──────────┘  └──────────┘  └──────────┘  └──────────┘        │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**关键设计**：

- **Server 层**：与存储引擎无关，负责连接、解析、优化、执行
- **存储引擎层**：插件式，可替换，负责数据的实际存取
- 两层之间通过**统一的 Handler API** 交互（如 `ha_innobase::rnd_next()` 读取下一行）

---

## 二、⭐️ 一条 SELECT 语句的执行全过程

以 `SELECT * FROM user WHERE id = 10` 为例：

```
1. 连接器
   ├── 建立 TCP 连接（三次握手）
   ├── 权限认证（用户名 + 密码 + 主机）
   └── 查询当前连接权限（之后修改权限不影响已有连接）

2. 解析器
   ├── 词法分析：SELECT → 关键字、* → 通配符、user → 表名...
   └── 语法分析：生成 AST 语法树，校验语法是否正确

3. 优化器
   ├── 分析可用的索引：PRIMARY KEY(id) → 可用
   ├── 估算索引代价：主键索引 → 1 次 B+ 树查找 → 代价很小
   ├── 生成执行计划：使用 PRIMARY 索引，const 类型访问
   └── 输出 EXPLAIN 结果

4. 执行器
   ├── 调用 ha_innobase::index_read() → 走主键索引查找
   ├── 在 Buffer Pool 的 B+ 树中二分查找定位到 id=10 的叶子节点
   ├── 通过 undo log + ReadView 判断该行对当前事务是否可见（MVCC）
   └── 返回结果行 → Server 层 → 发送给客户端
```

---

## 三、⭐️⭐️ InnoDB 的内存结构——Buffer Pool

Buffer Pool 是 InnoDB 的**内存心脏**，所有数据操作都在此完成。

### 3.1 Buffer Pool 的内存布局

```
┌──────────────────────────────────────────────────────────────┐
│                     InnoDB Buffer Pool                        │
│                     （默认 128MB，innodb_buffer_pool_size）      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │                   数据页（Data Pages）                 │     │
│  │   ┌──────┬──────┬──────┬──────┬──────┬──────┬──...  │     │
│  │   │ 16KB │ 16KB │ 16KB │ 16KB │ 16KB │ 16KB │       │     │
│  │   └──────┴──────┴──────┴──────┴──────┴──────┴──...  │     │
│  │   ★ 每个页 16KB，与磁盘页大小一致                      │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │                 索引页（Index Pages）                  │     │
│  │   B+ 树的节点（根节点、内部节点、叶子节点）              │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │                  Undo 页（Undo Pages）                 │     │
│  │   存储事务回滚所需的旧版本数据                          │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │              自适应哈希索引（Adaptive Hash Index）      │     │
│  │   对热点页的 B+ 树查找自动创建哈希索引                   │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Buffer Pool 的管理结构——Free List / LRU List / Flush List

```c
// InnoDB 源码结构（简化，源码位于 storage/innobase/buf/）
struct buf_pool_t {
    // ★ Free List：空闲页链表（还未被使用的缓冲页）
    //   初始化时所有页都加入此链表
    UT_LIST_BASE_NODE_T(buf_page_t) free;

    // ★ LRU List：最近最少使用链表（所有已使用的缓冲页）
    //   按使用频率排序，淘汰时从尾部（最久未使用）驱逐
    //   采用 5/8 点分代策略（midpoint insertion）：
    //     ┌────── old 区 ──────┬────── new 区 ──────┐
    //     │ 3/8                │ 5/8                  │
    //     │ (热数据候选淘汰区)   │ (热点数据保护区)       │
    //     新页面先插入 old 区的头部（midpoint）
    //     再次被访问时，移动到 new 区的头部
    UT_LIST_BASE_NODE_T(buf_page_t) LRU;

    // ★ Flush List：脏页链表（内存中已修改但未刷盘的页）
    //   按 page 的 oldest_modification（最早修改 LSN）排序
    //   刷盘时从链表尾部取出最老的脏页，顺序写盘（利用磁盘顺序 IO）
    UT_LIST_BASE_NODE_T(buf_page_t) flush_list;
};
```

### 3.3 LRU 淘汰的改进——分代（Midpoint Insertion）

```
标准 LRU 的问题：
  全表扫描会将热点数据全部挤出 Buffer Pool

InnoDB 的改进（innodb_old_blocks_pct = 37，即 3/8）：
  ┌──────────────────────────┬───────────────────────────┐
  │       Young 区 (5/8)     │       Old 区 (3/8)        │
  │      热点页保护区         │      候选淘汰区            │
  └──────────────────────────┴───────────────────────────┘
                                   ↑
                                   新页面插入这里（midpoint）

  ★ 新读取的页 → 插入到 Old 区头部（靠近 LRU 尾部）
  ★ innodb_old_blocks_time（默认 1000ms）：
      在 Old 区停留超过 1 秒后被再次访问 → 移动到 Young 区头部
      在 Old 区停留不到 1 秒就被访问 → 不移动（认为是大表扫描）
  ★ 这样即使全表扫描，也只会污染 Old 区，热点数据仍在 Young 区
```

---

## 四、⭐️⭐️⭐️ B+ 树索引——数据结构与算法实现

### 4.1 B+ 树的基本结构

```
                    ┌─────────────┐
                    │ 根节点（Root）│  ← 常驻 Buffer Pool
                    │  [10, 25]   │
                    └──┬──────┬───┘
           ┌───────────┘      └───────────┐
           ▼                              ▼
  ┌────────────────┐              ┌────────────────┐
  │ 内部节点（内节点）│              │ 内部节点        │
  │ [3, 7]         │              │ [14, 19]       │
  └──┬───┬───┬─────┘              └──┬───┬──┬──────┘
     │   │   │                       │   │  │
     ▼   ▼   ▼                       ▼   ▼  ▼
  ┌────┬────┬────┐               ┌────┬────┬────┐
  │叶子│叶子│叶子│               │叶子│叶子│叶子│
  │    │    │    │               │    │    │    │
  └────┴────┴────┘               └────┴────┴────┘
  ★ 所有叶子节点通过双向链表连接（←→）
  ★ 数据只存储在叶子节点中
  ★ 内部节点只存索引键 + 子节点指针
```

### 4.2 B+ 树的页结构（InnoDB Page，16KB）

```c
// InnoDB 中每个 B+ 树节点 = 一个 16KB 的页（Page）
// 源码位置：storage/innobase/include/page0page.h

struct page_t {
    // ┌─────────────────────────┐
    // │ File Header（38 bytes）  │ ← 页类型、页号、校验和、LSN
    // ├─────────────────────────┤
    // │ Page Header（56 bytes）  │ ← 记录数、空闲空间指针、槽数量
    // ├─────────────────────────┤
    // │ Infimum + Supremum      │ ← 最小记录和最大记录（虚拟记录）
    // │ （26 bytes）            │
    // ├─────────────────────────┤
    // │ ★ User Records          │ ← ★ 实际的用户数据行（B+ 树记录）
    // │   （...变长...）         │
    // ├─────────────────────────┤
    // │ Free Space              │ ← 空闲空间
    // │   （...变长...）         │
    // ├─────────────────────────┤
    // │ Page Directory（槽数组）  │ ← ★ 每个槽指向一组记录（二分查找定位）
    // │   （...变长...）         │
    // ├─────────────────────────┤
    // │ File Trailer（8 bytes）  │ ← 校验和 + LSN，保证页完整性
    // └─────────────────────────┘
};
```

### 4.3 页内查找——Page Directory 槽 + 二分查找

```
InnoDB 页内记录的查找过程：

1. ★ Page Directory 槽（Slot）二分查找
   目录槽将页内记录分组（每组 4~8 条记录）
   通过二分查找定位到目标槽
        │
        ▼
2. ★ 槽内顺序查找
   在确定的槽组内，沿着单向链表顺序查找目标记录
   因为槽内记录数少（4~8 条），顺序查找开销可忽略

整个过程：
O(log₂(slots)) + O(1) ~ O(log₂ n)
```

### 4.4 聚集索引与二级索引

```
聚集索引（Clustered Index）— PRIMARY KEY
  ┌──────────────────────────────────────────────┐
  │  B+ 树的叶子节点 = 完整的数据行（Row）          │
  │  主键值 → 整行数据                             │
  │  ★ 每张表只能有一个聚集索引                     │
  └──────────────────────────────────────────────┘

  ★ 如果没有显式定义主键，InnoDB 会选择：
    ① 第一个 NOT NULL UNIQUE 索引
    ② 如果都没有 → 自动创建隐藏的 6 字节 ROW_ID

二级索引（Secondary Index）— 普通索引
  ┌──────────────────────────────────────────────┐
  │  B+ 树的叶子节点 = 索引列的值 + 主键值         │
  │  ★ 通过二级索引查找 → 拿到主键值 → 回表查聚集索引 │
  └──────────────────────────────────────────────┘

回表（Using Index Condition）：
  SELECT name FROM user WHERE age = 25
  → 走 idx_age 索引 → 叶子节点拿到主键 ID → 回表取 name

覆盖索引（Using Index）：
  SELECT age, id FROM user WHERE age = 25
  → 走 idx_age 索引 → 叶子节点已包含 age 和 id → 无需回表！
```

---

## 五、⭐️⭐️⭐️ 事务实现——MVCC + Undo Log + Redo Log

### 5.1 事务四大特性与实现机制

| ACID | 含义 | InnoDB 的实现 |
|------|------|-------------|
| **A**tomicity（原子性） | 事务要么全做，要么全不做 | **Undo Log**（回滚日志） |
| **C**onsistency（一致性） | 事务前后数据满足完整性约束 | 由 AID + 应用层保证 |
| **I**solation（隔离性） | 事务之间互不干扰 | **MVCC** + **锁** |
| **D**urability（持久性） | 提交的事务数据不丢失 | **Redo Log**（重做日志） |

### 5.2 MVCC（多版本并发控制）

MVCC 的核心思想：**读不阻塞写，写不阻塞读**。每个事务看到的是数据的**一致性快照**。

```c
// 每行记录（聚簇索引的叶子节点）有两个隐藏列：

// ① DB_TRX_ID（6 字节）
//    最近一次修改这行数据的事务 ID

// ② DB_ROLL_PTR（7 字节）
//    回滚指针：指向 Undo Log 中该行的上一个版本

// ③ DB_ROW_ID（6 字节，如果有主键则为空）
//    隐含的 Row ID

// 数据行的多版本链：
//   当前行（DB_TRX_ID=100）
//     │ DB_ROLL_PTR
//     ▼
//   Undo Log: 旧版本（DB_TRX_ID=90）
//     │ DB_ROLL_PTR
//     ▼
//   Undo Log: 更旧版本（DB_TRX_ID=80）
//     │ DB_ROLL_PTR
//     ▼
//   ...
```

#### ReadView —— 快照读的核心

```c
// ReadView 结构（简化）
// 在 RR（可重复读）隔离级别下，事务第一次 SELECT 时创建
// 在 RC（读已提交）隔离级别下，每次 SELECT 都创建新的 ReadView

struct ReadView {
    trx_id_t m_low_limit_id;  // 当前活跃事务中最小的事务 ID
    trx_id_t m_up_limit_id;   // 下一个即将分配的事务 ID
    trx_id_t m_creator_trx_id; // 创建此 ReadView 的事务 ID
    ids_t m_ids;               // 创建 ReadView 时活跃事务 ID 列表
};

// 可见性判断算法（InnoDB 源码：row_vers_impl_t::row_vers_build_for_consistent_read）
bool is_visible(trx_id_t row_trx_id, ReadView* view) {
    // ① 如果行的事务 ID == 创建者的事务 ID
    //    → 可见（自己修改的）
    if (row_trx_id == view->m_creator_trx_id) return true;

    // ② 如果行的事务 ID < 最小活跃事务 ID
    //    → 可见（修改这行的事务在 ReadView 创建前已提交）
    if (row_trx_id < view->m_low_limit_id) return true;

    // ③ 如果行的事务 ID >= 下一个将分配的事务 ID
    //    → 不可见（修改这行的事务在 ReadView 创建后才开始）
    if (row_trx_id >= view->m_up_limit_id) return false;

    // ④ 如果行的事务 ID 在活跃事务列表中
    //    → 不可见（修改这行的事务还未提交）
    if (view->m_ids.contains(row_trx_id)) return false;

    // ⑤ 不在活跃列表中 → 已提交 → 可见
    return true;
}
```

### 5.3 Undo Log —— 回滚与 MVCC 的基石

```
Undo Log 的作用：
  ① 事务回滚：将数据恢复到执行前的状态
  ② MVCC：提供数据的历史版本

Undo Log 的类型：
  ┌────────────────────────────────────────────┐
  │ INSERT Undo Log                            │
  │   - 事务提交后立即删除（不会用于 MVCC）       │
  │   - 记录：插入的主键值                       │
  │   - 回滚操作：DELETE by PK                  │
  ├────────────────────────────────────────────┤
  │ UPDATE Undo Log                            │
  │   - 事务提交后不能立即删除（MVCC 需要）       │
  │   - 记录：被修改列的旧值                     │
  │   - 回滚操作：UPDATE 回旧值                  │
  │   - 由 Purge 线程异步清理                    │
  └────────────────────────────────────────────┘
```

### 5.4 Redo Log —— 崩溃恢复的保障

```
Redo Log 的设计：
  ① WAL（Write-Ahead Log）：先写日志，再写数据页
  ② 循环写入：两个文件（ib_logfile0, ib_logfile1），写满后从头覆盖
  ③ 物理逻辑日志：记录"对哪个页的哪个偏移量做了什么修改"

Redo Log 的写入流程：
  ┌──────────┐     ┌──────────────┐     ┌──────────┐
  │ 事务修改  │ ──→ │ Redo Log Buffer│ ──→ │ Redo Log │
  │ 数据页    │     │ （内存，16MB）  │     │ （磁盘）  │
  └──────────┘     └──────────────┘     └──────────┘
                            │                  │
                            │   ① 事务提交时    │
                            │     (REDO_COMMIT)│
                            │                  │
                            │   ② 每秒刷一次    │
                            │   ③ Buffer 满时   │
                            │   ④ Checkpoint   │

LSN（Log Sequence Number）：
  ★ 全局单调递增的日志序列号
  ★ 每次写 Redo Log，LSN 递增
  ★ 每个数据页有 Page LSN（最后一次修改时的 LSN）
  ★ 崩溃恢复时：Page LSN < 最新 Redo LSN → 需要应用 Redo Log
```

### 5.5 崩溃恢复流程

```
MySQL 重启 → 检查 Redo Log
  │
  ├── 扫描 Redo Log，找到最近的 Checkpoint
  │
  ├── 从 Checkpoint 开始，重放所有 Redo Log
  │    → 将 Buffer Pool 恢复到崩溃前的状态
  │
  ├── 回滚未提交的事务（通过 Undo Log）
  │    → 遍历 undo 链表，找到所有 active 状态的事务，执行回滚
  │
  └── 在恢复过程中，新的连接会被阻塞，直到恢复完成
```

---

## 六、⭐️⭐️ 锁机制——行锁、间隙锁与 Next-Key Lock

### 6.1 InnoDB 的三种行锁算法

```
记录锁（Record Lock）
  ┌────────────────────┐
  │ 锁定单行记录         │
  │ 精确到索引记录       │
  │ SELECT ... FOR UPDATE│
  └────────────────────┘

间隙锁（Gap Lock）
  ┌────────────────────┐
  │ 锁定索引记录间的间隙  │
  │ ★ 防止其他事务插入   │
  │ ★ 只在 REPEATABLE READ 级别生效│
  └────────────────────┘

临键锁（Next-Key Lock）
  ┌────────────────────┐
  │ Record Lock        │
  │  + Gap Lock        │
  │ ★ 锁定记录 + 前间隙  │
  │ ★ 解决幻读的核心武器  │
  └────────────────────┘
```

### 6.2 间隙锁解决幻读的示例

```sql
-- 假设表中有 id = 5, 10, 15 三条记录

-- 事务 A
BEGIN;
SELECT * FROM t WHERE id >= 10 AND id <= 15 FOR UPDATE;
-- 锁结构：
--   Record Lock on id=10
--   Gap Lock on (10, 15)   ← 锁住 10 和 15 之间的间隙
--   Record Lock on id=15
--   Gap Lock on (15, +∞)   ← 锁住 15 之后的间隙（supremum pseudo-record）

-- 事务 B
INSERT INTO t VALUES (12);  -- ❌ 阻塞！间隙被锁住
INSERT INTO t VALUES (8);   -- ✅ 成功！8 在锁范围之外
```

### 6.3 锁的加锁过程源码分析

```c
// InnoDB 锁模块核心（简化）
// 源码位置：storage/innobase/lock/

// 加锁入口：lock_rec_lock()
// ① 检查当前事务是否已持有该记录的锁（lock_rec_has_expl()）
// ② 如果不持有 → 创建锁结构（lock_rec_create()）
// ③ 检查是否与其它事务的锁冲突（lock_rec_other_has_conflicting()）
//    冲突检测：
//    - 锁类型冲突矩阵：
//           S    X    IS   IX
//      S    ✓    ✗    ✓    ✗
//      X    ✗    ✗    ✗    ✗
//      IS   ✓    ✗    ✓    ✓
//      IX   ✗    ✗    ✓    ✓
// ④ 如果冲突 → 进入等待队列（lock_wait_suspend_thread()）
//    等待超时（innodb_lock_wait_timeout，默认 50s）或死锁检测
```

### 6.4 死锁检测

```c
// InnoDB 的死锁检测算法
// 源码位置：storage/innobase/lock/lock0lock.cc

// lock_deadlock_check()
// ① 当某个事务等待锁超过 innodb_lock_wait_timeout 时
//    或者每次加锁时（默认开启死锁检测 innodb_deadlock_detect = ON）
// ② 构建 Wait-for Graph（等待图）
//    顶点 = 事务，边 = T1 等待 T2 持有的锁
// ③ ★ 检测图中是否有环（DFS 或 拓扑排序）
//    有环 → 死锁
// ④ 选择回滚代价最小的事务（undo log 最少）
//    回滚该事务，释放其持有的锁，让其他事务继续
```

---

## 七、⭐️ 优化器——基于代价的执行计划选择

### 7.1 CBO（Cost-Based Optimizer）代价模型

```sql
-- 一条 SQL 可能有多个执行计划，优化器需要选择代价最小的

SELECT * FROM user WHERE age > 25 AND name LIKE '张%';

-- 可能的计划 A：走 idx_age 索引
-- 可能的计划 B：走 idx_name 索引
-- 可能的计划 C：全表扫描

-- 每种计划的代价计算：
-- Total Cost = IO Cost（读取页数 × IO 系数）
--             + CPU Cost（处理行数 × CPU 系数）
```

### 7.2 统计信息——优化器的数据依据

```sql
-- 表级统计信息（innodb_table_stats）
SELECT * FROM mysql.innodb_table_stats WHERE table_name = 'user';
-- n_rows: 估算的总行数（通过随机采样 20 个叶子节点估算）
-- clustered_index_size: 聚集索引大小（页数）
-- sum_of_other_index_sizes: 其他索引大小之和

-- 索引级统计信息（innodb_index_stats）
SELECT * FROM mysql.innodb_index_stats WHERE table_name = 'user';
-- stat_name: 统计项名称（如 n_diff_pfx01 = 不同前缀值的数量）
-- stat_value: 统计值（如 n_diff_pfx01 的值 = 基数 Cardinality）
-- sample_size: 采样页数
```

### 7.3 索引选择的核心决策

```
优化器如何选择索引：

① 分析 WHERE 条件，找出所有可用索引
② 对每个可用索引：
    a. 估算需要扫描的行数（rows）
       rows ≈ n_rows / cardinality * 命中比例
    b. 估算回表次数
       如果是二级索引 → SELECT 的列不在索引中 → 需要回表 ×N 次
    c. 计算总代价 = rows × IO_weight + 回表次数 × IO_weight
③ 选择代价最小的索引
④ 如果全表扫描代价更小 → 放弃索引

★ 典型导致索引选择错误的原因：
  - 统计信息不准确（Cardinality 过期）
  - 回表代价被低估 → 优化器选择了看似 rows 少的二级索引
  - 解决方案：ANALYZE TABLE / FORCE INDEX / 优化 SQL
```

---

## 八、总结

| 概念 | 一句话总结 |
|------|-----------|
| **双层架构** | Server 层（连接/解析/优化/执行）+ 存储引擎层（InnoDB/MyISAM/Memory） |
| **Buffer Pool** | 内存数据缓存区（默认 128MB），Free/LRU/Flush 三个链表管理 |
| **B+ 树** | 所有数据存储在叶子节点，内部节点只存索引键，叶子节点双向链表连接 |
| **聚集索引** | 叶子节点 = 完整行数据；二级索引叶子节点 = 索引列 + 主键值 |
| **MVCC** | 通过 DB_TRX_ID + DB_ROLL_PTR + Undo Log + ReadView 实现快照读 |
| **Undo Log** | 回滚 + MVCC 版本链；INSERT Undo 提交后删除，UPDATE Undo 由 Purge 清理 |
| **Redo Log** | WAL + 循环写入 + LSN + Checkpoint；保障持久性和崩溃恢复 |
| **Next-Key Lock** | Record Lock + Gap Lock，RR 级别下解决幻读 |
| **CBO 优化器** | 基于统计信息的代价估算，选择最低代价的执行计划 |

**隔离级别与实现对照**：

| 隔离级别 | 脏读 | 不可重复读 | 幻读 | InnoDB 实现 |
|---------|-----|----------|-----|------------|
| READ UNCOMMITTED | ✗ | ✗ | ✗ | 不加锁，直接读最新版本 |
| READ COMMITTED | ✓ | ✗ | ✗ | 每次 SELECT 创建新 ReadView |
| REPEATABLE READ | ✓ | ✓ | ✓ | 事务开始创建 ReadView + Next-Key Lock |
| SERIALIZABLE | ✓ | ✓ | ✓ | 所有 SELECT 自动转为 SELECT ... FOR SHARE |

---

## 参考

- [MySQL 官方文档](https://dev.mysql.com/doc/)
- MySQL 8.0 源码：`storage/innobase/` 目录
- 《MySQL 技术内幕：InnoDB 存储引擎（第 2 版）》—— 姜承尧
- 《高性能 MySQL（第 4 版）》—— Silvia Botros & Jeremy Tinley
- 《数据库系统概念（第 7 版）》—— Abraham Silberschatz
