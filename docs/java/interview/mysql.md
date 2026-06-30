---
title: MySQL 面试高频题
icon: mysql
order: 1
category:
  - Java
  - 面试宝典
tag:
  - MySQL
  - 索引
  - 事务
  - 锁
  - SQL优化
  - 分库分表
---

# MySQL 面试高频题

数据库是后端面试的**必考项**，MySQL 的索引、事务、锁机制更是重中之重。以下 10 题覆盖了面试中最高频的 MySQL 考点。

---

## Q1: 联合唯一索引 (A,B,C)，A、B 值相同但 C 为 NULL，能插入多条重复行吗？⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: 联合索引、NULL 语义、唯一约束

> 面试官问："有一张表，联合唯一索引是 (A, B, C)，我插入两条数据，A 和 B 的值都相同，C 都是 NULL，这两条能都插入成功吗？为什么？"

### 核心回答

**可以插入成功，且多条都可以。** 核心原因在于 SQL 标准中 `NULL` 表示"未知值"，两个 NULL 之间**不视为相等**（`NULL = NULL` 在 SQL 中返回 `NULL`，而非 `TRUE`）。因此，联合唯一索引在判断是否冲突时，会将包含 NULL 的键视为不同的键值，从而允许多行插入。

```sql
-- 建表验证
CREATE TABLE interview_test (
    id INT PRIMARY KEY AUTO_INCREMENT,
    A INT NOT NULL,
    B INT NOT NULL,
    C INT,
    UNIQUE KEY uk_abc (A, B, C)
);

INSERT INTO interview_test (A, B, C) VALUES (1, 1, NULL); -- ✅ 成功
INSERT INTO interview_test (A, B, C) VALUES (1, 1, NULL); -- ✅ 也成功！
INSERT INTO interview_test (A, B, C) VALUES (1, 1, NULL); -- ✅ 仍然成功！

SELECT * FROM interview_test;
-- 结果：3 行 (1, 1, NULL)
```

### 深度扩展

**不同数据库的行为差异**：

- **MySQL（InnoDB）**：遵循 SQL 标准，NULL 不等于 NULL，允许多个 NULL 存在于唯一索引中。
- **Oracle / PostgreSQL**：同样遵循标准，唯一约束允许多个 NULL。
- **SQL Server**：**例外！** 唯一约束只允许一个 NULL，如果需要多个 NULL 需使用筛选唯一索引（`WHERE C IS NOT NULL`）。

**InnoDB 内部实现**：在 InnoDB 的索引记录中，NULL 列在记录头中有专门的 NULL 位图标记。当索引键包含 NULL 时，InnoDB 不会将 NULL 值部分写入键值比较，而是通过记录的主键来区分，因此不会触发唯一性冲突。

**如果业务需要 NULL 也唯一怎么办？**

```sql
-- 方案1：使用生成列将 NULL 映射为哨兵值
ALTER TABLE interview_test ADD COLUMN C_not_null INT 
  GENERATED ALWAYS AS (COALESCE(C, -999999)) STORED;
CREATE UNIQUE INDEX uk_abc_fixed ON interview_test (A, B, C_not_null);

-- 方案2：设计层面避免 NULL（推荐），使用有意义的默认值
-- 例如用 0 或 -1 代替 NULL，确保业务语义与数据约束一致
```

### 面试追问

**Q**: `COUNT(C)` 和 `COUNT(*)` 在有 NULL 行时结果一样吗？
**A**: 不一样。`COUNT(列名)` 忽略 NULL 值，`COUNT(*)` 统计所有行。如果 C 列有 5 行都是 NULL，`COUNT(C)` 返回 0，`COUNT(*)` 返回 5。

**Q**: 如果我把 C 从 NULL 改成 0，已经存在的重复行会怎样？
**A**: 直接 UPDATE 会报唯一约束冲突。需要先清理重复数据（保留一行，删除其余），再更新值。生产环境操作前务必先 `SELECT ... GROUP BY ... HAVING COUNT(*) > 1` 排查重复数据。

### 常见错误

- ❌ **混淆 NULL 与空字符串**：`NULL` 和 `''` 是不同的，唯一索引中多个 `''` 是**会冲突的**
- ❌ **认为 MySQL 和 SQL Server 行为一致**：尤其在使用不同数据库的技术栈中容易踩坑
- ❌ **直接用 UPDATE SET C = 0 去改 NULL**：如果已经插入了重复的 NULL 行，UPDATE 会直接报错

### 一句话总结

> **NULL 在唯一索引中代表"未知"，两个未知值不相等，所以允许重复插入。这是标准 SQL 行为，而非 MySQL 的 Bug。**

---

## Q2: MySQL 索引底层为什么用 B+ 树？⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: 索引数据结构、磁盘 IO、B+ 树特性

> 面试官问："MySQL 的 InnoDB 存储引擎为什么选择 B+ 树作为索引结构，而不是红黑树、B 树或者哈希表？"

### 核心回答

B+ 树被选中的核心原因是**为磁盘 IO 优化**，具体体现在三个关键特性上：

1. **矮胖结构 → 减少磁盘 IO**：B+ 树是多路平衡树，每个节点可以存储大量键值（InnoDB 默认 16KB/页，可存约 1170 个索引键），使得树的高度极低。百万级数据只需 2-3 层，即 2-3 次磁盘 IO 即可定位数据。

2. **叶子节点双向链表 → 范围查询友好**：所有数据按顺序存储在叶子节点，叶子节点之间通过双向指针连接。`BETWEEN`、`ORDER BY`、`LIMIT` 等范围操作只需定位起点，然后顺序扫描链表即可，不需要反复回溯。

3. **数据只存叶子节点 → 查询效率稳定**：所有查询都要走到叶子节点才能拿到数据，相比 B 树（非叶子节点也存数据），B+ 树的查询效率更稳定，都是 O(树高)。

**对比其他结构**：

| 数据结构 | 为什么不用？ |
|----------|-------------|
| **红黑树** | 二叉结构导致树太高（百万数据约 20 层），每次磁盘 IO 只能读一个节点，效率极差 |
| **B 树** | 非叶子节点也存数据，导致每个节点能存的键更少、树更高；且范围查询需要中序遍历，跨节点成本高 |
| **哈希表** | 等值查询 O(1) 确实快，但**不支持范围查询**、排序、最左前缀匹配，限制太大 |

### 深度扩展

**B+ 树在 InnoDB 中的具体结构**：

```
                    [50 | 100]              ← 非叶子节点（只存键，不存数据）
                   /     |      \
          [10|20|30]  [60|70|80]  [110|...]  ← 非叶子节点
          /  /  /  \    ...         ...
        [叶子节点链表: 1→5→10→15→20→...]     ← 叶子节点（存完整行数据，双向链表）
```

- InnoDB 页大小为 16KB，一个 bigint 索引键占 8 字节 + 指针 6 字节 ≈ 14 字节，一个非叶子节点可存约 **1170 个键**
- 每个叶子节点存一行或多行数据（取决于行大小），假设一行 1KB，一个叶子节点约 16 行
- **3 层 B+ 树可存**：1170 × 1170 × 16 ≈ **2100 万行**

**为什么是 B+ 树而不是跳表（SkipList）？**
跳表虽然也是 O(log N) 且范围查询友好（Redis 的 ZSet 就用跳表），但跳表节点大小不固定、层级随机，**无法利用磁盘的预读特性**。数据库场景需要顺序的、页对齐的 IO，B+ 树的一个节点恰好对应一个磁盘页。

### 面试追问

**Q**: 为什么 MySQL 不用 B+ 树做 Hash 索引？
**A**: 不是"不用"，而是可以选。Memory 引擎默认 Hash 索引（等值查询快），InnoDB 也支持自适应哈希索引（Adaptive Hash Index），当检测到频繁的等值查询时会自动在 B+ 树上建立 Hash 索引缓存。

### 常见错误

- ❌ 说"B 树和 B- 树是两种树"——B 树和 B- 树是同一种，B- 是 B-tree 的音译
- ❌ 把红黑树说成"二叉树的一种"就带过了——需要指出磁盘 IO 和内存查询的根本区别

### 一句话总结

> **B+ 树 = 磁盘 IO 最小化（矮胖） + 范围查询 O(顺序扫描) + 查询效率稳定（O(树高)），是磁盘场景的最优解。**

---

## Q3: 聚簇索引 vs 非聚簇索引，回表是什么？⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: 聚簇索引、回表查询、覆盖索引

> 面试官问："InnoDB 的聚簇索引是什么？和 MyISAM 的非聚簇索引有什么区别？什么情况下会发生回表？"

### 核心回答

**聚簇索引（Clustered Index）** = 索引结构和数据行在**同一个 B+ 树**中，叶子节点直接存储**完整的行数据**。

**非聚簇索引（Non-clustered Index / 二级索引）** = 索引 B+ 树的叶子节点存储的是**主键值**，而不是完整行数据。

**回表**：通过二级索引查到主键 ID 后，**再到聚簇索引中去查完整行数据**的过程。

```
-- 聚簇索引查询（主键查询，不回表）
SELECT * FROM user WHERE id = 100;
-- 直接走聚簇索引 B+ 树，叶子节点就是完整行 → 0 回表

-- 二级索引查询（需要回表）
SELECT * FROM user WHERE name = '张三';
-- 1. 走 name 索引 B+ 树 → 找到 (name='张三', id=100)
-- 2. 拿 id=100 到聚簇索引再查一次 → 回表！
```

**InnoDB vs MyISAM 对比**：

| 特性 | InnoDB | MyISAM |
|------|--------|--------|
| 数据存储 | 数据即索引，聚簇索引叶子节点存完整行 | 索引和数据分离，索引叶子存的是数据文件的**物理地址** |
| 主键查询 | 1 次 B+ 树查找 | 1 次索引查找 + 1 次文件定位 |
| 二级索引查找 | 2 次 B+ 树查找（回表） | 1 次索引查找 + 1 次文件定位 |
| 必须有主键？ | 是（无显式主键时自动选唯一键或生成 row_id） | 否 |

### 深度扩展

**覆盖索引（Covering Index）——避免回表的利器**：

```sql
-- 假设有联合索引 idx_name_age (name, age)

-- 需要回表：SELECT * 会查完整行
EXPLAIN SELECT * FROM user WHERE name = '张三' AND age = 25;
-- Extra: Using index condition

-- 不用回表：查询列全在索引中
EXPLAIN SELECT name, age FROM user WHERE name = '张三' AND age = 25;
-- Extra: Using index  ← 覆盖索引！
```

**InnoDB 为什么必须要有主键？**
因为 InnoDB 的数据就组织在聚簇索引的 B+ 树中。如果建表时没有指定主键，InnoDB 会：
1. 检查是否有 `UNIQUE NOT NULL` 列 → 有则用它当聚簇索引
2. 都没有 → 自动生成一个 6 字节的隐藏列 `row_id`，单调递增

**自增主键 vs UUID 主键对聚簇索引的影响**：
- **自增主键**：每次插入都在 B+ 树的末尾追加，页分裂概率低，插入效率高
- **UUID 主键**：随机插入导致频繁的页分裂、页内数据移动，插入效率低，且导致索引碎片化，空间利用率差

### 面试追问

**Q**: `SELECT COUNT(*)` 为什么不走二级索引反而走聚簇索引？
**A**: 实际上 **InnoDB 优化器会选择最小的二级索引来 `COUNT(*)`**，因为二级索引叶子节点只存主键，每页能存的键更多，同样数据量下扫描的页数更少，IO 成本更低。

### 常见错误

- ❌ "聚簇索引比非聚簇索引快"——不一定，如果是覆盖索引，二级索引不必回表，可能比走聚簇索引更快
- ❌ 所有查询都想靠建索引解决，却忘了回表的成本——如果回表行数太多（如 >30%），优化器可能直接走全表扫描

### 一句话总结

> **聚簇索引叶子 = 数据行本身；二级索引叶子 = 主键值；回表 = 拿主键再去聚簇索引查一遍。覆盖索引（查的列全在二级索引中）可以避免回表。**

---

## Q4: 最左前缀原则详解 ⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: 联合索引、最左前缀、索引失效

> 面试官问："联合索引 (A, B, C)，哪些 WHERE 条件能用到索引？哪些用不到？为什么？"

### 核心回答

**最左前缀原则**：联合索引从左到右匹配，**只有当最左列（A）被使用时，索引才能被激活**。列的匹配必须**连续**，中间不能跳过。

```sql
-- 联合索引 idx_abc (A, B, C)

-- ✅ 全部走索引
WHERE A = 1 AND B = 2 AND C = 3   -- 全匹配
WHERE A = 1 AND B = 2              -- 匹配 A, B
WHERE A = 1                        -- 匹配 A

-- ⚠️ 部分走索引
WHERE A = 1 AND C = 3              -- 只用到 A，C 因为跳过了 B 无法使用
WHERE A > 1 AND B = 2              -- A 范围之后，B 索引失效

-- ❌ 不走索引
WHERE B = 2 AND C = 3              -- 缺少最左列 A，索引完全失效
WHERE B = 2                        -- 同理
WHERE C = 3                        -- 同理
```

**核心理解**：联合索引的 B+ 树是先按 A 排序，A 相同时按 B 排序，B 相同时按 C 排序。就像字典先按拼音首字母、再按第二个字母排列一样。你不说首字母，就无法利用这个排好序的结构。

### 深度扩展

**范围查询的"断点"效应**：

```sql
-- 索引 idx_abc (A, B, C)

WHERE A = 1 AND B > 2 AND C = 3
-- A 等值匹配 ✔️
-- B 范围查询 → 用到索引（B+ 树在 A=1 的分段内按 B 有序）
-- C = 3 → ❌ 索引失效！B 是范围查询，B 值确定后 C 的排序被打乱

-- 验证：EXPLAIN 中 key_len 只有 A + B 的长度，C 的长度未计入
```

**"最左前缀"不等于"最左列必须出现在 WHERE 的最左边"**：
指的是索引列的最左列必须出现在查询条件中，不是说 `WHERE A = 1 AND B = 2` 中 A 必须写在最左边。`WHERE B = 2 AND A = 1` 同样走索引——MySQL 优化器会自动调整条件顺序。

**索引下推（Index Condition Pushdown, ICP）**——MySQL 5.6+ 的优化：
```sql
-- idx_name_age (name, age)
WHERE name LIKE '张%' AND age = 25
-- MySQL 5.6+：在索引层面就过滤 age = 25，减少回表次数
-- MySQL 5.5：只能用到 name LIKE '张%'，所有匹配行都回表，再在 Server 层过滤 age
```

### 面试追问

**Q**: `WHERE A = 1 ORDER BY B, C` 会不会 filesort？
**A**: 不会。A 等值 → B, C 在索引中天然有序 → 直接利用索引顺序（Extra: Using index condition）。

**Q**: `WHERE A = 1 ORDER BY C, B` 呢？
**A**: 会 filesort。索引顺序是 A→B→C，ORDER BY C, B 与索引顺序不一致。

### 常见错误

- ❌ 认为 `WHERE A LIKE '%keyword%'` 走索引——**前置模糊**导致索引失效，因为 B+ 树无法根据中间子串定位
- ❌ 在所有等值列上分别建单列索引，而不是联合索引——无法利用覆盖索引且占用更多空间

### 一句话总结

> **联合索引 = 先按 A 排，再按 B 排，再按 C 排。缺失最左列，就像翻字典不知道第一个字母——无从下手。**

---

## Q5: 事务隔离级别与 MVCC 实现原理 ⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: 事务隔离级别、MVCC、Read View、undo log

> 面试官问："MySQL 的事务隔离级别有哪些？MVCC 是如何实现可重复读的？"

### 核心回答

**四种隔离级别及其解决的问题**：

| 隔离级别 | 脏读 | 不可重复读 | 幻读 | 实现方式 |
|----------|------|-----------|------|---------|
| READ UNCOMMITTED | ❌ | ❌ | ❌ | 直接读最新数据 |
| READ COMMITTED | ✅ | ❌ | ❌ | 每次 SELECT 生成新 Read View |
| REPEATABLE READ（默认）| ✅ | ✅ | ⚠️部分解决 | 事务开始时生成 Read View |
| SERIALIZABLE | ✅ | ✅ | ✅ | 读加共享锁 |

**MVCC（Multi-Version Concurrency Control）核心原理**：

每条记录有两个隐藏列：`trx_id`（最近修改的事务 ID）和 `roll_pointer`（指向 undo log 的指针）。

```
事务读取数据时，不是加锁去读，而是通过 Read View 判断：
  - 当前活跃事务列表有哪些？
  - 这行数据的 trx_id 是否可见？

不可见 → 顺着 roll_pointer 链回溯到可见的 undo log 版本
```

**RC vs RR 的核心区别**：RC 每次 SELECT 生成新的 Read View；RR 只在第一次 SELECT 时生成一个 Read View，整个事务复用，因此实现了可重复读。

```sql
-- RC 下的行为
事务 A: START TRANSACTION;
事务 A: SELECT age FROM user WHERE id = 1; -- age = 20
事务 B: UPDATE user SET age = 30 WHERE id = 1; COMMIT;
事务 A: SELECT age FROM user WHERE id = 1; -- age = 30 ← 变了！不可重复读

-- RR 下的行为（MySQL 默认）
事务 A: START TRANSACTION;
事务 A: SELECT age FROM user WHERE id = 1; -- age = 20
事务 B: UPDATE user SET age = 30 WHERE id = 1; COMMIT;
事务 A: SELECT age FROM user WHERE id = 1; -- age = 20 ← 不变！可重复读
```

### 深度扩展

**RR 下为什么不能完全防止幻读？**

```sql
-- 事务 A 在 RR 下
SELECT * FROM user WHERE age > 20;  -- 2 行，生成 Read View

-- 事务 B
INSERT INTO user (name, age) VALUES ('王五', 25); COMMIT;

-- 事务 A
SELECT * FROM user WHERE age > 20;  -- 还是 2 行（快照读防住了幻读）
UPDATE user SET name = 'updated' WHERE age > 20;  -- 影响了 3 行！（当前读）
SELECT * FROM user WHERE age > 20;  -- 3 行，幻读出现了！
```

这是因为 `UPDATE` 是**当前读**，会读到最新已提交的数据。解决方式是使用**临键锁（Next-Key Lock）**。

**Read View 的判断逻辑**：

```java
// 伪代码
boolean isVisible(long trx_id, ReadView view) {
    if (trx_id == creator_trx_id) return true;           // 自己修改的
    if (trx_id < min_trx_id) return true;                // 事务在 Read View 创建前已提交
    if (trx_id >= max_trx_id) return false;               // 事务在 Read View 创建后才开始
    if (trx_id 在活跃列表中) return false;                // 事务还在活跃，未提交
    return true;                                         // 已提交（不在活跃列表且 < max）
}
```

### 面试追问

**Q**: 为什么 MySQL 默认隔离级别是 RR 而不是 RC？
**A**: 历史原因——早期的 MySQL binlog 只有 STATEMENT 格式，RC 下会导致主从数据不一致（因为 RC 下语句执行顺序不同可能导致不同结果）。虽然现在有 ROW 格式 binlog，但 MySQL 出于兼容性保持了 RR 默认。

### 常见错误

- ❌ 把 MVCC 和锁机制对立——MVCC 解决的是读-写并发（读不阻塞写），但写-写并发仍然需要锁
- ❌ 认为 RR 级别完全防止幻读——快照读可以，当前读不行

### 一句话总结

> **MVCC = 多版本数据 + Read View 可见性判断。RC 每次读刷新视图，RR 事务开始定视图。读不加锁，写不阻塞读。**

---

## Q6: 一条 SQL 在 MySQL 中的完整执行流程 ⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: MySQL 架构、查询执行流程、各组件协作

> 面试官问："从客户端发出一条 SELECT 语句到拿到结果，MySQL 内部经历了哪些步骤？"

### 核心回答

```
客户端连接
    ↓
① 连接器：验证用户、权限，建立连接（连接池管理）
    ↓
② 查询缓存（MySQL 8.0 已移除）：key = SQL 文本，value = 结果集
    ↓
③ 分析器（Parser）：词法分析 → 语法分析 → 生成解析树
    ↓
④ 优化器（Optimizer）：选择索引、决定 join 顺序、生成执行计划
    ↓
⑤ 执行器（Executor）：调用存储引擎 API，逐行读取/写入
    ↓
⑥ 存储引擎（InnoDB）：从磁盘/Buffer Pool 读取数据页
    ↓
返回结果给客户端
```

### 深度扩展

**优化器的核心决策**：

```sql
EXPLAIN SELECT * FROM user u JOIN order o ON u.id = o.user_id
WHERE u.age > 20 AND o.amount > 100;
```

优化器需要决定：
- **选哪个索引**：`idx_age` 还是 `idx_user_id`？基于统计信息（`ANALYZE TABLE`）估算扫描行数
- **JOIN 顺序**：先查 `user` 还是先查 `order`？小表驱动大表原则
- **访问方式**：ref（等值匹配）、range（范围查询）、index（索引扫描）、ALL（全表扫描）

**为什么 8.0 移除了查询缓存？**
查询缓存的失效粒度太粗——只要表有任何更新，该表的整个缓存全部失效。在高并发写入场景下，缓存几乎没有命中率，反而维护它带来了额外的锁开销（查询缓存的全局锁）。

**一条 UPDATE 的内部流程**：

```
① 执行器调用 InnoDB 查找目标行
② Buffer Pool 中有 → 直接修改内存页（标记为脏页）
③ Buffer Pool 中无 → 从磁盘读入内存 → 修改
④ 写 undo log（用于回滚 + MVCC）
⑤ 写 redo log（prepare 阶段）
⑥ 写 binlog
⑦ redo log commit（两阶段提交保证 redo log 和 binlog 一致）
⑧ 后台线程异步刷新脏页到磁盘
```

### 面试追问

**Q**: 优化器选错了索引怎么办？
**A**: 可以用 `FORCE INDEX(idx_name)` 强制指定，或 `ANALYZE TABLE` 更新统计信息，或调整 `optimizer_search_depth` 参数。

### 常见错误

- ❌ 把优化器当成"穷举所有可能性选出最优"——实际上它用的是基于成本估算的启发式算法，不是全量枚举

### 一句话总结

> **连接 → 分析 → 优化 → 执行 → 引擎，每一步都有深挖的价值。**

---

## Q7: 慢查询优化思路和方法 ⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: SQL 调优、慢查询日志、EXPLAIN 分析

> 面试官问："线上有一个慢查询，你会从哪些角度去分析和优化？"

### 核心回答

**排查四步法**：

```sql
-- 第一步：开启慢查询日志，定位 SQL
SHOW VARIABLES LIKE 'slow_query%';
SHOW VARIABLES LIKE 'long_query_time';
-- 或在 Performance Schema 中查

-- 第二步：EXPLAIN 分析执行计划
EXPLAIN SELECT * FROM order WHERE user_id = 123 AND status = 1;
-- 关注 type（ALL < index < range < ref < const）
-- 关注 rows（预估扫描行数）
-- 关注 Extra（Using filesort, Using temporary 是坏消息）

-- 第三步：查看 profiling 详情
SET profiling = 1;
SHOW PROFILES;
SHOW PROFILE FOR QUERY 1;
-- 看时间花在 Sending data 还是 Creating tmp table

-- 第四步：根据分析结果优化
```

**常见优化手段**：

| 问题 | 方案 |
|------|------|
| 全表扫描 | 加索引（WHERE / JOIN / ORDER BY 列） |
| 回表太多 | 建覆盖索引，或改写为只查需要的列 |
| 大数据量排序 | 利用索引有序性避免 filesort，或调大 `sort_buffer_size` |
| JOIN 大表 | 小表驱动大表，确保 JOIN 列有索引 |
| 深分页慢 | 用游标/延迟关联（`WHERE id > last_id LIMIT N`） |
| 隐式类型转换 | 避免 `WHERE varchar_col = 123`（索引失效） |
| 函数操作索引列 | 避免 `WHERE DATE(create_time) = '2024-01-01'` → 改为范围查询 |

### 深度扩展

**深分页优化详解**：

```sql
-- 问题 SQL：OFFSET 很大时要扫描并丢弃大量行
SELECT * FROM order WHERE user_id = 1 ORDER BY id LIMIT 1000000, 10;
-- MySQL 需要扫描 1000010 行，丢弃前 1000000 行

-- 优化方案：延迟关联
SELECT * FROM order o
INNER JOIN (
    SELECT id FROM order WHERE user_id = 1 
    ORDER BY id LIMIT 1000000, 10
) tmp ON o.id = tmp.id;
-- 子查询只扫描 id（覆盖索引），回表只需 10 次
```

**JOIN 优化——小表驱动大表**：

```sql
-- user 表 100 行，order 表 100 万行
-- ✅ 好：先查 user（驱动表），再用 user.id 去匹配 order
SELECT * FROM user u JOIN order o ON u.id = o.user_id
WHERE u.status = 1;

-- 优化器会自动选择驱动表，EXPLAIN 中第一行的表就是驱动表
-- 用 STRAIGHT_JOIN 可以强制指定驱动表
```

### 面试追问

**Q**: `EXPLAIN` 中 `type=index` 和 `type=ALL` 哪个更差？
**A**: `ALL` 是全表扫描，`index` 是全索引扫描。通常 `index` 比 `ALL` 好（索引更小、IO 更少），但如果索引很大而表不大，`index` 可能更差。

### 常见错误

- ❌ 看到慢查询就加索引——先看是不是索引失效、锁等待、或返回数据量本身就大
- ❌ 用 `LIMIT 1000000, 10` 做翻页——大偏移量必须用游标分页或延迟关联

### 一句话总结

> **定位 → EXPLAIN → profiling → 针对性优化。索引不是万能药，先定位根因再动手。**

---

## Q8: MySQL 锁机制（行锁、间隙锁、临键锁）⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: InnoDB 锁类型、锁范围、死锁

> 面试官问："InnoDB 有哪些行锁？间隙锁是做什么的？什么情况下会死锁？"

### 核心回答

**InnoDB 三种行锁**：

| 锁类型 | 锁定范围 | 作用 |
|--------|---------|------|
| 记录锁（Record Lock） | 单个索引记录 | 精确命中一行时加锁 |
| 间隙锁（Gap Lock） | 索引记录之间的**间隙**（不含记录本身） | 防止其他事务在间隙中 INSERT（防幻读） |
| 临键锁（Next-Key Lock） | 记录锁 + 该记录前面的间隙 | InnoDB **默认**的行锁，= Record Lock + Gap Lock |

```
索引记录：  10    20    30    40
间隙：    (-∞,10) (10,20) (20,30) (30,40) (40,+∞)

SELECT * FROM t WHERE id = 20 FOR UPDATE;
-- 命中精确行 → 只加记录锁在 id=20 上（RC 下）
-- RR 下可能加临键锁：锁住 (10,20] 区间

SELECT * FROM t WHERE id = 25 FOR UPDATE;
-- 查询 25 不存在 → 加间隙锁在 (20,30) 上，阻止插入 21-29
```

**死锁的典型场景**：

```sql
-- 事务 A                          事务 B
START TRANSACTION;                 START TRANSACTION;
UPDATE t SET v=1 WHERE id=1;       UPDATE t SET v=2 WHERE id=2;
-- 拿到 id=1 的记录锁               -- 拿到 id=2 的记录锁
UPDATE t SET v=1 WHERE id=2;       UPDATE t SET v=1 WHERE id=1;
-- 等待 B 释放 id=2 的锁 ❌          -- 等待 A 释放 id=1 的锁 ❌
                                    -- → 死锁！InnoDB 检测到后回滚较小的事务
```

### 深度扩展

**间隙锁只在 RR 隔离级别下生效**：RC 级别下没有间隙锁（除外键约束和唯一键冲突检查外），因为 RC 不解决幻读。

**加锁规则（RR 级别下）**：
- 唯一索引等值查询命中 → **记录锁**（退化为行锁）
- 唯一索引等值查询未命中 → **间隙锁**（锁住记录应该在的间隙）
- 普通索引等值查询 → **临键锁** + 下一个间隙锁
- 范围查询 → 所有扫描到的行加**临键锁**

**一个容易忽略的死锁场景**：

```sql
-- 事务 A: INSERT ... ON DUPLICATE KEY UPDATE
-- 如果多个事务同时插入同一条"正好在间隙中"的记录，
-- 会先加共享的间隙锁，然后都试图升级为排他记录锁 → 互相等待 → 死锁
```

### 面试追问

**Q**: 如何查看当前锁等待情况？
**A**: `SELECT * FROM information_schema.INNODB_TRX` 看事务，`INNODB_LOCKS`（8.0 用 `performance_schema.data_locks`）看锁，`INNODB_LOCK_WAITS` 看等待关系。

### 常见错误

- ❌ 认为加锁就是锁住"行"——实际上锁的是**索引记录**，没命中索引会锁全表
- ❌ 在 RR 级别不加索引导致间隙锁范围过大

### 一句话总结

> **记录锁锁行，间隙锁锁虚无，临键锁锁行+前隙。RR 下默认临键锁，解决幻读问题。**

---

## Q9: undo log / redo log / binlog 的区别与作用 ⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: MySQL 日志系统、崩溃恢复、主从复制

> 面试官问："MySQL 的 undo log、redo log、binlog 分别是什么？有什么区别？"

### 核心回答

| 维度 | undo log | redo log | binlog |
|------|----------|----------|--------|
| **作用** | 事务回滚 + MVCC | 崩溃恢复（crash-safe） | 主从复制 + 数据恢复 |
| **记录内容** | 数据修改前的**旧版本** | 物理层面的"对某页某偏移做了某修改" | SQL 语句或行变更的**逻辑日志** |
| **所属层** | InnoDB 引擎层 | InnoDB 引擎层 | Server 层（所有引擎共用） |
| **写入方式** | 顺序写 undo 段 | 循环写（ib_logfile），固定大小 | 追加写（binlog.000001...），可切换文件 |
| **刷盘策略** | 与事务同步 | `innodb_flush_log_at_trx_commit` | `sync_binlog` |

**为什么需要 redo log？**
MySQL 的内存（Buffer Pool）与磁盘是异步的。如果每次修改都直接写磁盘，随机 IO 会极慢。redo log 是**顺序写**的小文件，先写 redo log（很快），再后异步刷脏页。崩溃时通过 redo log 重放恢复未刷盘的修改——这就是 **WAL（Write-Ahead Logging）** 的核心思想。

**为什么需要 binlog？**
redo log 是 InnoDB 独有，其他引擎（如 MyISAM）不能用。binlog 是 Server 层的通用日志，用于主从复制（Slave 重放 binlog）和基于时间点的数据恢复。

### 深度扩展

**两阶段提交（Two-Phase Commit）保证 redo log 和 binlog 一致性**：

```
        写入 redo log (prepare 阶段)
              ↓
        写入 binlog
              ↓
        写入 redo log (commit 阶段)
```

如果崩溃发生在任一阶段：
- prepare 后、binlog 前崩溃 → 回滚（binlog 中无记录）
- binlog 后、commit 前崩溃 → 提交（binlog 已有记录，从库需要同步）

**相关核心参数**：

```sql
-- redo log 刷盘策略
innodb_flush_log_at_trx_commit = 1  -- 每次提交刷盘（最安全）
                                0  -- 每秒刷一次（可能丢 1s 数据）
                                2  -- 写 OS cache，每秒刷（可能丢 1s 数据）

-- binlog 刷盘策略
sync_binlog = 1  -- 每次提交刷盘（最安全，但性能开销大）
            = 0  -- 交给 OS 决定（性能最好，但可能丢数据）
```

### 面试追问

**Q**: 如果 redo log 是循环写的，会不会覆盖还没刷脏页的日志？
**A**: 不会。InnoDB 有 checkpoint 机制，脏页刷盘后对应的 redo log 空间才能被覆盖。如果 checkpoint 推进太慢且 redo log 写满了，InnoDB 会暂停写入，强制刷脏页推进 checkpoint——这就是"日志写满导致性能抖动"的原因。

### 常见错误

- ❌ 把 redo log 和 binlog 混淆——redo log 是物理的、引擎层的、循环写；binlog 是逻辑的、Server 层的、追加写
- ❌ 认为 binlog 能用于崩溃恢复——binlog 只是逻辑日志，不知道具体哪个数据页需要恢复

### 一句话总结

> **undo 回滚，redo 恢复，binlog 复制。redo = 引擎层物理日志（WAL），binlog = Server 层逻辑日志（主从）。**

---

## Q10: 分库分表的设计思路和常见方案 ⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: 分库分表、数据迁移、分布式 ID

> 面试官问："什么情况下需要分库分表？怎么分？会带来哪些问题？"

### 核心回答

**分库分表的触发阈值**（经验值）：
- 单表数据量 > 2000万 或 磁盘占用 > 10GB → 考虑分表
- 单库 QPS > 2000 / TPS > 1000 → 考虑分库
- 单库连接数吃紧、无法通过加从库解决 → 分库

**分片方式**：

| 方式 | 说明 | 优点 | 缺点 |
|------|------|------|------|
| **垂直分库** | 按业务拆分库（用户库、订单库、商品库） | 业务解耦，独立扩容 | 跨库 JOIN 困难 |
| **垂直分表** | 大表拆为多个小表（主表 + 扩展表） | 减少行宽度，提高缓存命中率 | 多一次查询 |
| **水平分库** | 按分片键把数据分散到多个库 | 突破单库瓶颈 | 分布式事务、跨分片查询 |
| **水平分表** | 同库内按分片键拆多张表 | 减少单表数据量 | 同库仍有连接数瓶颈 |

**分片键选择原则**：
- 查询频率最高的字段（如 `user_id`、`order_id`）
- 尽量避免跨分片查询（如按 `user_id` 分片时，查 `order_id` 就要扫所有分片）
- 数据分布均匀（不要用性别这种低基数字段）

### 深度扩展

**分库分表带来的挑战与解决方案**：

| 挑战 | 方案 |
|------|------|
| **分布式 ID** | 雪花算法（Snowflake）、美团 Leaf、数据库号段模式 |
| **跨分片查询** | 基因法（订单 ID 嵌入用户 ID）、异构索引表（ES/HBase） |
| **跨分片 JOIN** | 字段冗余（反范式）、应用层 JOIN、或直接用 ES 做宽表 |
| **跨分片事务** | 避免（重新设计），或上分布式事务（Seata、TCC） |
| **数据迁移** | 双写 → 历史数据迁移 → 灰度切读 → 停旧写（停机窗口或平滑迁移） |
| **分布式分页** | 全局排序难，通常用 ES 或限制只支持"下一页"（游标分页） |

**平滑迁移方案（停机时间最小化）**：

```
阶段 1: 双写 —— 新数据同时写旧库和新分库
阶段 2: 历史数据迁移 —— 分批把旧数据迁移到新分库（低峰期）
阶段 3: 灰度读 —— 少量流量读新分库，验证正确性
阶段 4: 全量切换 —— 全部读写新分库
阶段 5: 清理旧库
```

### 面试追问

**Q**: 雪花算法生成的 ID 为什么趋势递增？全局唯一是怎么保证的？
**A**: 结构：1 bit 符号位 + 41 bit 时间戳（毫秒）+ 10 bit 机器 ID + 12 bit 序列号。时间戳在高位保证了趋势递增；机器 ID + 序列号保证了同一毫秒内的全局唯一。

### 常见错误

- ❌ 过早分库分表——数据量不大时引入的复杂度远超收益
- ❌ 用 UUID 做主键——在分库分表中，UUID 的随机性导致 B+ 树频繁页分裂，写入性能差

### 一句话总结

> **分库分表是最后的手段。优先考虑索引优化、缓存、读写分离。真的要分时，选好分片键、做好平滑迁移方案。**

---

## 参考阅读

- [MySQL 官方文档 - InnoDB 锁与事务模型](https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-transaction-model.html)
- 本笔记关联：Java 并发编程中的锁机制与 MySQL 行锁的思想相通
