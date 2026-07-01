---
title: 计算机网络面试高频题
icon: network-wired
order: 7
category:
  - Java
  - 面试宝典
tag:
  - 网络
  - TCP
  - HTTP
  - HTTPS
  - OSI
  - DNS
---

# 计算机网络面试高频题

计算机网络是后端开发的基石，TCP 三次握手/四次挥手、HTTP/HTTPS、TCP 可靠传输是面试中最高频的考点。以下 10 题覆盖了从传输层到应用层的核心知识点。

---

## Q1: TCP 三次握手和四次挥手的过程 ⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: TCP 连接建立/释放、状态机、TIME_WAIT

> 面试官问："说说 TCP 的三次握手和四次挥手过程。为什么握手是三次，挥手是四次？"

### 核心回答

**三次握手**：

```
Client                          Server
  |                                |
  | ──── SYN, seq=x ────────────→ |  SYN_SENT → SYN_RCVD
  |                                |
  | ←── SYN+ACK, seq=y, ack=x+1 ─ |  SYN_RCVD
  |                                |
  | ──── ACK, seq=x+1, ack=y+1 ─→ |  ESTABLISHED
  |                                |
  ESTABLISHED                   ESTABLISHED
```

**为什么是三次？**
- 第一次：Client 告诉 Server"我能发"
- 第二次：Server 告诉 Client"我能收到，我也能发"
- 第三次：Client 告诉 Server"我也能收到"
- 三次的最小次数确认双方的收发能力都正常。**两次不够**：假设只有两次握手，Client 收到 Server 的 SYN+ACK 后连接即建立，但如果 Client 的第一个 SYN 在网络中延迟、Client 已经放弃该连接，Server 却因为收到这个延迟的 SYN 而建立了连接——浪费服务端资源。

**四次挥手**：

```
Client                          Server
  |                                |
  | ──── FIN, seq=u ────────────→ |  FIN_WAIT_1 → CLOSE_WAIT
  |                                |
  | ←── ACK, seq=v, ack=u+1 ───── |  FIN_WAIT_2
  |                                |
  | ←── FIN, seq=w, ack=u+1 ───── |  LAST_ACK
  |                                |
  | ──── ACK, seq=u+1, ack=w+1 ─→ |  TIME_WAIT → CLOSED
  |                                |
  等待 2MSL → CLOSED
```

**为什么是四次？**
TCP 是全双工的，一个方向关闭后，另一个方向可能还有数据要发。Server 收到 Client 的 FIN 后，先 ACK 表示"我知道你要关了"，但还可以继续发剩余数据（Client 仍能接收），发完后再发 FIN。所以 `ACK` 和 `FIN` 分两次发，共四次。

### 深度扩展

**TIME_WAIT 为什么要等 2MSL？**

```
2MSL = 2 × Maximum Segment Lifetime（报文最大存活时间，通常 2 分钟，Linux 默认 60s）

两个原因：
1. 保证最后一个 ACK 能到达 Server：
   - 如果 ACK 丢了，Server 会重发 FIN
   - Client 在 TIME_WAIT 期间还能接收并重发 ACK

2. 让旧连接的所有报文在网络中消失：
   - 为该连接占用的端口（IP:Port）留一个"冷却期"
   - 防止旧连接的数据包混入新连接
```

**常见的 TCP 状态**：

| 状态 | 含义 |
|------|------|
| `LISTEN` | 服务端等待连接 |
| `SYN_SENT` | 客户端发送 SYN 后 |
| `SYN_RCVD` | 服务端收到 SYN，发送 SYN+ACK 后 |
| `ESTABLISHED` | 连接建立，正常传输 |
| `FIN_WAIT_1` | 主动关闭方发送 FIN |
| `FIN_WAIT_2` | 主动关闭方收到 ACK |
| `CLOSE_WAIT` | 被动关闭方收到 FIN（等待应用层关闭） |
| `LAST_ACK` | 被动关闭方发送 FIN |
| `TIME_WAIT` | 主动关闭方等待 2MSL |

### 面试追问

**Q**: SYN 泛洪攻击是什么？怎么防御？
**A**: 攻击者发送大量 SYN 包但不回复最后的 ACK，服务端半连接队列（SYN Queue）被占满，正常请求无法建立连接。防御：① `syncookies`（不分配队列资源，用 cookie 验证）；② 缩短 SYN Timeout；③ 增大 SYN Queue。

**Q**: `CLOSE_WAIT` 堆积怎么办？
**A**: 被动关闭方收到 FIN 后，`CLOSE_WAIT` 状态需要应用显式调用 `close()` 才会进入 `LAST_ACK`。`CLOSE_WAIT` 堆积 = 应用层忘记关闭连接（代码 Bug：未关闭 Socket / 连接池泄漏）。

### 常见错误

- ❌ 说"四次挥手可以合并为三次"——理论上如果被动关闭方刚好没有数据要发，ACK 和 FIN 可以在一个包中发送（变成三次），但这是特殊情况
- ❌ 混淆 `TIME_WAIT` 和 `CLOSE_WAIT`——TIME_WAIT 是主动关闭方，CLOSE_WAIT 是被动关闭方

### 一句话总结

> **三次握手确认双方收发能力（两次不够），四次挥手因为全双工（ACK 和 FIN 分开发）。TIME_WAIT 等 2MSL 是为了 ACK 能重传 + 旧数据消散。**

---

## Q2: TCP 如何保证可靠传输？⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: 确认应答、重传机制、滑动窗口、流量/拥塞控制

> 面试官问："TCP 是怎么保证数据可靠传输的？如果中间有丢包怎么办？"

### 核心回答

TCP 通过 **6 大机制** 保证可靠传输：

1. **序列号与确认应答（SEQ + ACK）**：每个字节有编号，接收方回复 ACK（期望收到的下一个字节号）。
2. **超时重传**：发送方在一定时间内未收到 ACK → 重发。
3. **快速重传**：收到 3 个相同的 ACK（Dup ACK）→ 不等超时立即重传。
4. **滑动窗口（流量控制）**：接收方告知自己能接收的窗口大小，发送方根据窗口控制发送速率。
5. **拥塞控制**：慢启动 → 拥塞避免 → 快重传 → 快恢复，防止网络拥塞。
6. **校验和**：检测传输中数据是否出错。

### 深度扩展

**超时重传时间（RTO）的计算**：

```
RTO = SRTT + 4 × RTTVAR

SRTT（平滑 RTT）= (1 - α) × SRTT + α × RTT   (α = 1/8)
RTTVAR（RTT 偏差）= (1 - β) × RTTVAR + β × |SRTT - RTT|  (β = 1/4)

RTO 是动态计算的，适应网络波动，RTO 至少 200ms（MinRTO）
```

**拥塞控制的四个阶段**：

```
cwnd = 拥塞窗口（congestion window）
ssthresh = 慢启动阈值（slow start threshold）

1. 慢启动（Slow Start）
   cwnd 从 1 开始，每收到一个 ACK，cwnd + 1（指数增长：1→2→4→8→...）
   直到 cwnd ≥ ssthresh

2. 拥塞避免（Congestion Avoidance）
   cwnd 每 RTT + 1（线性增长：...→ 9→10→11→...）

3. 快重传（Fast Retransmit）
   收到 3 个 Dup ACK → 立即重传丢失的报文段

4. 快恢复（Fast Recovery）
   快重传后不进入慢启动：
   ssthresh = cwnd / 2
   cwnd = ssthresh + 3
   继续拥塞避免（而非从 1 重新开始）

RTO 超时 → 回到慢启动：
   ssthresh = cwnd / 2, cwnd = 1
```

**滑动窗口示意图**：

```
发送窗口：
  [已发送已确认 | 已发送未确认 | 可以发送 | 不能发送]
               ↑             ↑         ↑
              SND.UNA     SND.NXT   SND.UNA + SND.WND

接收窗口：
  [已确认 | 已接收 | 可以接收 | 不能接收]
           ↑        ↑         ↑
          RCV.NXT  ...      RCV.NXT + RCV.WND
```

### 面试追问

**Q**: 为什么 TCP 是面向字节流的，而 UDP 是面向报文的？
**A**: TCP 发送方把数据当作连续的无边界的字节流，不保留应用层的消息边界（这就是"粘包"的原因）。UDP 保留应用层的消息边界，一个 `sendto()` 对应一个数据报，一个 `recvfrom()` 接收一个完整数据报。

**Q**: TCP 的 Keep-Alive 和 HTTP 的 Keep-Alive 有什么区别？
**A**: TCP Keep-Alive 是 TCP 层的保活机制（默认 2 小时探测一次），确认对方是否还存活。HTTP Keep-Alive 是 HTTP/1.1 的连接复用（一个 TCP 连接处理多个 HTTP 请求）。

### 常见错误

- ❌ 混淆"流量控制"和"拥塞控制"——流量控制是接收方窗口（点对点），拥塞控制是网络容量（全局网络）
- ❌ 认为 TCP 绝对可靠——TCP 只保证数据到达传输层，不保证应用层收到并处理（进程崩溃）

### 一句话总结

> **TCP 可靠性 = 序列号 + ACK + 超时重传 + 快重传 + 滑动窗口（流量控制） + 拥塞控制（慢启动/拥塞避免/快恢复）。六大机制各司其职。**

---

## Q3: HTTP 各版本的区别与演进 ⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: HTTP/1.0、HTTP/1.1、HTTP/2、HTTP/3

> 面试官问："HTTP/1.1 和 HTTP/2 有什么区别？HTTP/3 做了什么改进？"

### 核心回答

| 特性 | HTTP/1.0 | HTTP/1.1 | HTTP/2 | HTTP/3 |
|------|----------|----------|--------|--------|
| **连接** | 短连接（每次请求新建连接） | 长连接（Keep-Alive，默认复用） | 多路复用（单连接并行） | 多路复用 + 0-RTT |
| **队头阻塞** | 请求级别 | 连接级别 | 流级别（TCP 层仍有） | **彻底解除了**（基于 QUIC/UDP） |
| **头部压缩** | 无 | 无 | HPACK（静态表+动态表+Huffman编码） | QPACK（改进 HPACK） |
| **服务器推送** | 无 | 无 | ✅ Server Push | ✅ |
| **传输层** | TCP | TCP | TCP | **QUIC（UDP）** |
| **加密** | 可选 | 可选 | 可选（实际强制 TLS 1.2+） | 默认加密（TLS 1.3 集成在 QUIC 中） |
| **发布时间** | 1996 | 1999 | 2015 | 2022 |

### 深度扩展

**HTTP/2 多路复用原理**：

```
HTTP/1.1 连接复用：
  [Req1] → ... → [Res1]
                       [Req2] → ... → [Res2]
                                       [Req3] → ... → [Res3]
  串行请求响应，队头阻塞（前面的慢会堵后面的）

HTTP/2 多路复用：
  TCP 连接
    ├── Stream 1: [HEADERS][DATA] → [HEADERS][DATA]（响应）
    ├── Stream 3: [HEADERS][DATA] → [HEADERS][DATA]
    ├── Stream 5: [HEADERS][DATA] → [HEADERS][DATA]
    └── Stream 7: [HEADERS][DATA] → ...

  所有 Stream 并行在一条 TCP 连接上传输
  帧（Frame）交错发送，接收方按 Stream ID 重组
```

**HTTP/3 为什么换成 QUIC？**

```
TCP 的队头阻塞问题：
  TCP 保证字节流有序交付，丢了一个包 → 后续所有包都要等它重传
  在 HTTP/2 中，一个 Stream 丢包会阻塞所有 Stream（因为共用同一个 TCP 连接）

QUIC 的解决方案：
  - 基于 UDP，在用户态实现可靠传输
  - 每个 Stream 独立——Stream A 的丢包只阻塞 Stream A，不影响 Stream B
  - 0-RTT 握手：缓存服务端配置，直接发送数据

QUIC 连接迁移：
  TCP 连接由四元组（srcIP, srcPort, dstIP, dstPort）标识
  QUIC 连接由 Connection ID（64 位随机数）标识
  WiFi → 4G 切换 IP 变化 → TCP 必须重新握手，QUIC 直接继续传输
```

**HPACK 头部压缩**：

```
静态表（61 个预定义头部）：
  :method: GET    → 索引 2
  :status: 200    → 索引 8
  content-type    → 索引 31

动态表（首次传输后缓存）：
  首次：user-agent: Mozilla/5.0...  → 完整传输 + 存入动态表
  后续：user-agent → 只发索引

压缩率：HTTP/1.1 平均头部 700-800 字节 → HTTP/2 压缩后约 100-200 字节
```

### 面试追问

**Q**: HTTP/2 的 Server Push 有什么问题？
**A**: ① 服务端推送的资源客户端可能已经有缓存（浪费带宽）；② 推送的资源可能阻塞更重要的资源加载。Chrome 已经宣布移除 HTTP/2 Server Push，改用 `<link rel="preload">` 和 103 Early Hints。

**Q**: WebSocket 和 HTTP/2 的区别？
**A**: HTTP/2 支持 Server Push（服务端→客户端），但不支持双向任意消息（客户端→服务端最方便的方式还是请求-响应）。WebSocket 是全双工协议，客户端和服务端可以在任意时刻互相推送消息，适合聊天、实时推送场景。

### 常见错误

- ❌ 说 HTTP/2 解决了队头阻塞——HTTP/2 只解决了 HTTP 层的队头阻塞，TCP 层的队头阻塞仍然存在（HTTP/3 才真正解决了）
- ❌ 说 HTTP/2 必须用 HTTPS——协议本身不强制，但主流浏览器都要求 HTTP/2 over TLS（h2），不支持 h2c（明文 HTTP/2）

### 一句话总结

> **HTTP/1.1 = Keep-Alive + 队头阻塞；HTTP/2 = 多路复用 + HPACK 头部压缩（TCP 层仍有队头阻塞）；HTTP/3 = QUIC(UDP) + 0-RTT + 彻底解决队头阻塞 + 连接迁移。**

---

## Q4: HTTP 和 HTTPS 的区别？HTTPS 的加密过程是怎样的？⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: HTTPS、TLS 握手、对称/非对称加密、证书

> 面试官问："HTTPS 为什么是安全的？浏览器和服务器是怎么建立安全连接的？"

### 核心回答

**HTTP vs HTTPS**：

| 对比 | HTTP | HTTPS |
|------|------|-------|
| 安全性 | 明文传输 | 加密传输 |
| 端口 | 80 | 443 |
| 加密层 | 无 | TLS（前身 SSL） |
| 证书 | 不需要 | 需要 CA 颁发的数字证书 |
| SEO | 搜索引擎降权 | 搜索引擎优先收录 |

**HTTPS = HTTP + TLS**：TLS 层在 HTTP 和 TCP 之间，负责握手、加密、身份认证。

### 深度扩展

**TLS 1.2 握手（4 次往返）**：

```
Client                                  Server
  |                                        |
  | ① ClientHello ──────────────────────→ | 支持的加密套件、TLS版本、随机数1
  |                                        |
  | ← ② ServerHello + Certificate + Done ── | 选加密套件、随机数2、证书（公钥）
  |                                        |
  | ③ ClientKeyExchange(公钥加密pre-master) → | 随机数3（pre-master secret）
  |    ChangeCipherSpec + Finished ──────→ | "接下来加密通信" + 验证
  |                                        |
  | ← ④ ChangeCipherSpec + Finished ───── | "接下来加密通信" + 验证
  |                                        |

会话密钥 = PRF(随机数1, 随机数2, pre-master secret)
```

**为什么用非对称加密 + 对称加密混合？**

```
非对称加密（RSA/ECDHE）：安全但慢（比对称加密慢 100-1000 倍）
  用途：握手阶段交换"会话密钥"（仅少量数据）

对称加密（AES）：快
  用途：握手完成后，用会话密钥加密所有 HTTP 数据（大量数据）

混合 = 非对称加密交换密钥 + 对称加密传输数据（取其长，避其短）
```

**数字证书的验证链**：

```
浏览器验证流程：
  服务器的证书 → 签发者（中间 CA）的签名验证
  → 中间 CA 的证书 → 根 CA 的签名验证
  → 根 CA 的证书（已预装在操作系统/浏览器中）

证书内容：
  - 域名
  - 公钥
  - 颁发者信息
  - 有效期
  - 数字签名（CA 的私钥加密的证书哈希）
```

### 面试追问

**Q**: TLS 1.3 相比 1.2 有什么改进？
**A**: ① 握手从 2-RTT 降到 1-RTT；② 移除了不安全的加密算法（RSA 密钥交换、CBC 模式）；③ 0-RTT 重连（之前连接过的服务器可以直接发数据）；④ 加密了证书信息（防止中间件嗅探域名）。

**Q**: 抓包工具（Charles/Fiddler）为什么能抓到 HTTPS 的内容？
**A**: 抓包工具在本地安装了自己的根证书 → 对客户端冒充服务器（用自己的证书和客户端握手）→ 对服务器冒充客户端（建立代理连接）→ 形成中间人（MITM）。所以安装不明来源的根证书是极危险的。

### 常见错误

- ❌ 说 HTTPS 比 HTTP 慢很多——TLS 1.3 + HTTP/2 的 HTTPS 在首次握手中多了 1-RTT，但后续请求受益于多路复用，整体反而可能更快
- ❌ 混淆对称加密和非对称加密的用途——非对称只用于交换密钥，对称用于加密数据

### 一句话总结

> **HTTPS = HTTP + TLS。TLS 握手用非对称加密安全交换密钥，之后用对称加密高效传输数据。数字证书 + PKI 保证身份可信。**

---

## Q5: TCP 的粘包和拆包问题 ⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: TCP 字节流、粘包、拆包、Netty 解决方案

> 面试官问："TCP 传输中粘包和拆包是怎么回事？Netty 是怎么解决的？"

### 核心回答

**粘包和拆包的原因**：TCP 是**面向字节流**的协议，不保留应用层的消息边界。

```
发送方发了 3 个包：  [P1] [P2] [P3]

TCP 缓冲区后可能变成：
  粘包：[P1P2] [P3]         （两次 read 合成一次）
  拆包：[P1_前半][P1_后半P2] [P3]  （一个包被拆成两次 read）
  正常：[P1] [P2] [P3]      （可能但不可控）
```

**原因分析**：
- 发送方：Nagle 算法合并小包，发送缓冲区满了才发
- 接收方：应用读取速度跟不上 TCP 接收速度，缓冲区堆积
- TCP 的 MSS（最大报文段长度）限制：大于 MSS 的包必然被拆

### 深度扩展

**Netty 的解决方案**：

| 解码器 | 原理 | 适用场景 |
|--------|------|---------|
| **FixedLengthFrameDecoder** | 固定长度消息 | 定长协议 |
| **LineBasedFrameDecoder** | 以 `\n` 或 `\r\n` 分隔 | 文本协议（命令行） |
| **DelimiterBasedFrameDecoder** | 自定义分隔符 | 自定义协议分隔 |
| **LengthFieldBasedFrameDecoder** | 消息头 + 消息体，头中存长度 | **最通用、推荐** |
| **HttpObjectDecoder** | 解析 HTTP 协议格式 | HTTP 协议 |

**LengthFieldBasedFrameDecoder 详解**：

```
协议设计：
[长度字段(4字节) | 数据内容(变长)]
  ↑ 长度值不包括自身长度

解码器参数：
  maxFrameLength        → 最大帧长（防攻击）
  lengthFieldOffset     → 长度字段在帧中的偏移
  lengthFieldLength     → 长度字段的字节数
  lengthAdjustment      → 长度值之外需要调整的量
  initialBytesToStrip   → 解码后移除前几个字节

示例：msg = [4字节长度] + [数据体]
  new LengthFieldBasedFrameDecoder(65535, 0, 4, 0, 4)
  // 解析：长度从 offset=0 开始，占 4 字节，长度=数据体长度（adjustment=0），strip 掉前 4 字节
```

### 面试追问

**Q**: UDP 有粘包问题吗？
**A**: 没有。UDP 是面向报文的，一个 `sendto()` 发送一个数据报，一个 `recvfrom()` 接收一个完整数据报。如果接收 buffer 不够大，多余部分会被截断（而非粘包）。

**Q**: 除了 Netty 的方案，应用层还能怎么解决粘包？
**A**: ① 定长消息（用空格补齐）；② 分隔符（\n、\r\n）；③ 消息头 + 消息体（HTTP、Dubbo 都是这种）；④ 应用层协议自带边界（HTTP Content-Length、WebSocket 帧格式）。

### 常见错误

- ❌ 说"TCP 粘包是 TCP 的 Bug"——TCP 的设计就是字节流，粘包不是 Bug 而是特性/约束
- ❌ 依赖 TCP 的边界来设计协议——"一个 write 对应一个 read"是不可靠的假设

### 一句话总结

> **TCP 粘包/拆包的本质：TCP 是字节流，不保留消息边界。解决：Netty 的 LengthFieldBasedFrameDecoder（消息头存长度），这也是大多数协议的通用做法。**

---

## Q6: 从输入 URL 到页面展示，发生了什么？⭐️⭐️⭐️

**难度**: ⭐️⭐️⭐️ | **考察点**: 综合网络知识、DNS、HTTP、渲染

> 面试官问："在浏览器里输入一个 URL 并回车，到页面完整展示，中间经历了哪些步骤？"

### 核心回答

这道题考察对网络全链路的理解，按**时间顺序**分 8 个步骤：

```
① URL 解析：校验合法性，提取协议、域名、端口、路径
② DNS 解析：域名 → IP 地址（浏览器缓存 → OS 缓存 → 路由器缓存 → DNS 递归查询）
③ TCP 连接：三次握手（如果是 HTTPS，之后还有 TLS 握手）
④ 发送 HTTP 请求：构造请求行 + 头部 + 请求体，发送到服务器
⑤ 服务器处理：接收请求 → 路由分发 → 业务逻辑 → 查询数据库/缓存 → 生成响应
⑥ 浏览器接收响应：接收 HTTP 响应（状态行 + 头部 + 响应体）
⑦ 渲染页面：解析 HTML → 构建 DOM 树 → 解析 CSS → 构建 CSSOM 树 → 合成 Render Tree → 布局 → 绘制
⑧ 连接关闭或复用：四次挥手 或 Keep-Alive 保持连接
```

### 深度扩展

**DNS 解析的详细层级**：

```
1. 浏览器 DNS 缓存（chrome://net-internals/#dns）
2. 操作系统 hosts 文件（/etc/hosts 或 C:\Windows\System32\drivers\etc\hosts）
3. 操作系统 DNS 缓存
4. 路由器 DNS 缓存
5. 本地 DNS 服务器（ISP 提供，如 114.114.114.114）
6. DNS 递归查询：
   根 DNS → com 顶级域 DNS → example.com 权威 DNS → IP 地址
```

**关键优化技术**：

| 优化手段 | 作用 | 示例 |
|---------|------|------|
| **DNS 预解析** | 提前解析 DNS | `<link rel="dns-prefetch" href="//cdn.example.com">` |
| **TCP 预连接** | 提前建立 TCP 连接 | `<link rel="preconnect" href="https://api.example.com">` |
| **CDN 加速** | 就近访问，减少延迟 | 静态资源托管在 CDN |
| **HTTP 缓存** | 304 Not Modified | ETag / Last-Modified |
| **资源预加载** | 提前加载关键资源 | `<link rel="preload">` |
| **Gzip/Brotli** | 压缩传输内容 | Content-Encoding: br |

**浏览器渲染流程**：

```
HTML ──解析──→ DOM 树
                     ↘
                      合成 → Render Tree → Layout（布局） → Paint（绘制） → Composite（合成）
                     ↗
CSS  ──解析──→ CSSOM 树

脚本阻塞：
  <script> 默认阻塞 HTML 解析（下载 + 执行）
  <script async>：异步下载，下载完立即执行（不保证顺序）
  <script defer>：异步下载，等 HTML 解析完再按顺序执行

CSS 阻塞：
  CSS 的下载和解析**不会**阻塞 HTML 解析
  但**会**阻塞 Render Tree 的构建和 JavaScript 的执行
```

### 面试追问

**Q**: `window.onload` 和 `DOMContentLoaded` 有什么区别？
**A**: `DOMContentLoaded`：HTML 解析完成，DOM 树构建完成（此时图片可能还没加载完）。`window.onload`：所有资源（包括图片、CSS、JS）全部加载完成。

**Q**: 白屏时间和首屏时间怎么优化？
**A**: ① 服务端渲染（SSR）；② 关键 CSS 内联、非关键 CSS 延迟加载；③ JS 拆分 + 懒加载；④ CDN + 预解析 + 预连接；⑤ 图片懒加载 + WebP 格式。

### 常见错误

- ❌ 漏掉 DNS 解析步骤——直接跳到 TCP 连接
- ❌ 混淆 TCP 握手和 TLS 握手——HTTPS 场景下，TCP 握手之后还有 TLS 握手
- ❌ 忘记提到缓存机制——强缓存（Cache-Control）和协商缓存（ETag）

### 一句话总结

> **URL → DNS → TCP(+TLS) → HTTP → 服务器 → 渲染。从网络层到应用层的完整链路，每个环节都有缓存和优化空间。**

---

## Q7: TCP 和 UDP 的区别 ⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: TCP vs UDP、适用场景

> 面试官问："TCP 和 UDP 有什么区别？各适合什么场景？"

### 核心回答

| 对比维度 | TCP | UDP |
|---------|-----|-----|
| **连接** | 面向连接（三次握手） | 无连接 |
| **可靠性** | 可靠（确认应答、重传） | 不可靠（发完不管） |
| **有序性** | 保证顺序（序列号） | 不保证顺序 |
| **传输方式** | 面向字节流 | 面向数据报 |
| **头部开销** | 20 字节（最小） | 8 字节 |
| **速度** | 慢（握手 + 控制机制） | 快 |
| **多播/广播** | 不支持 | 支持 |
| **适用场景** | HTTP、文件传输、邮件 | 音视频通话、直播、DNS、DHCP、游戏 |

### 深度扩展

**TCP 和 UDP 头部对比**：

```
TCP 头部（20-60 字节）：
  [源端口(16)][目的端口(16)]
  [序号 seq(32)]
  [确认号 ack(32)]
  [数据偏移(4)][保留(6)][URG|ACK|PSH|RST|SYN|FIN(6)][窗口大小(16)]
  [校验和(16)][紧急指针(16)]
  [选项(可变)]

UDP 头部（8 字节）：
  [源端口(16)][目的端口(16)]
  [长度(16)][校验和(16)]
```

**为什么游戏多用 UDP？**

- 实时性 > 可靠性（过期的帧没有意义）
- 丢几帧对体验影响小，重传反而增加延迟
- 但现代游戏引擎通常基于 UDP 封装自己的可靠传输层（如 KCP），实现"不可靠的实时数据 + 可靠的关键数据"

### 面试追问

**Q**: DNS 为什么用 UDP？
**A**: ① DNS 查询通常一个请求-响应就够了（不超过 512 字节/一个包）；② 速度快（无握手）；③ 如果响应超过 512 字节（EDNS0 支持大包）或需要区域传输，会用 TCP 兜底。

**Q**: QUIC 协议为什么基于 UDP 而不是直接基于 IP？
**A**: ① UDP 是"可部署"的——现有的 NAT/防火墙/路由器都支持 UDP，而全新的 IP 协议需要整个互联网升级硬件/固件；② 用户可以态实现，不需要修改操作系统内核。

### 常见错误

- ❌ 说 TCP 一定比 UDP 慢——在特定场景下（无丢包、低延迟），UDP 快的优势不明显；TCP 的硬件卸载（TSO/GRO）在服务器级网卡上效率很高
- ❌ 说 UDP 完全不可靠——UDP 的校验和是可选的，但它仍然提供了基本的校验和机制

### 一句话总结

> **TCP = 可靠、面向连接、有序、字节流（像打电话）；UDP = 快速、无连接、无序、数据报（像发短信）。选型看场景对可靠性和实时性的权衡。**

---

## Q8: Cookie、Session、Token（JWT）的区别 ⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: 身份认证、跨域、JWT

> 面试官问："Cookie 和 Session 是什么关系？JWT Token 比 Session 好在哪里？"

### 核心回答

| 对比维度 | Cookie | Session | JWT Token |
|---------|--------|---------|-----------|
| **存储位置** | 浏览器（客户端） | 服务器内存/Redis | 客户端（localStorage/Cookie） |
| **安全性** | 可被篡改（需 HttpOnly + Secure） | 安全（服务端存） | 防篡改（签名验证，但 payload 不加密） |
| **扩展性** | 受域名限制 | 分布式需要共享 Session（Redis） | 天然无状态，任何服务可验证 |
| **跨域** | 默认不允许 | 依赖 Cookie 传递 sessionId | 可放 Header，天然跨域 |
| **开销** | 小 | 每次请求查 Redis | 每次请求验签（CPU） |

**Cookie + Session 工作流程**：

```
1. 用户登录 → 服务器创建 Session，生成 sessionId
2. 服务器通过 Set-Cookie: JSESSIONID=xxx 返回 sessionId
3. 浏览器自动在后续请求的 Cookie 中携带 sessionId
4. 服务器根据 sessionId 查到 Session 数据（用户信息）
```

**JWT 工作流程**：

```
1. 用户登录 → 服务器生成 JWT：
   jwt = base64(Header).base64(Payload).sign(Signature)
2. 返回 jwt 给客户端（可以放在响应体中）
3. 客户端存 jwt（localStorage / Cookie）
4. 后续请求在 Authorization: Bearer <jwt> 头中携带
5. 服务器用密钥验签，无需查数据库即可获取用户信息
```

### 深度扩展

**Cookie 的关键属性**：

| 属性 | 作用 |
|------|------|
| `HttpOnly` | 禁止 JavaScript 读取（防 XSS 窃取 Cookie） |
| `Secure` | 仅 HTTPS 传输 |
| `SameSite` | 防 CSRF：`Strict`（禁止跨站发送）、`Lax`（允许 GET 跨站）、`None`（无限制） |
| `Domain` | 指定作用域域名 |
| `Path` | 指定作用域路径 |

**JWT 的优缺点**：

```
优点：
  ✅ 无状态，服务端不需要存储
  ✅ 天然跨域，不依赖 Cookie
  ✅ 适合微服务（每个服务独立验签）
  ✅ 适合移动端（App 没有浏览器 Cookie 概念）

缺点：
  ❌ 无法主动失效（一旦签发，在过期前始终有效）→ 需要黑名单或短过期 + 刷新 Token
  ❌ payload 不加密（只是 Base64 编码）→ 不能放敏感信息
  ❌ 比 sessionId 长，增加带宽开销
  ❌ 无法实时感知用户状态变更（如角色变更需等旧 Token 过期）
```

**双 Token 机制（Access Token + Refresh Token）**：

```
Access Token： 短有效期（15-30 分钟），在 Authorization 头中携带
Refresh Token：长有效期（7-30 天），只在与授权服务器通信时使用

流程：
  Access Token 过期 → 用 Refresh Token 换新的 Access Token
  Refresh Token 过期 → 重新登录

安全性：
  - Access Token 频繁暴露，短有效期降低风险
  - Refresh Token 存储在 HttpOnly Cookie 中，不易被 XSS 窃取
```

### 面试追问

**Q**: 分布式 Session 怎么解决？
**A**: ① Sticky Session（负载均衡让同一用户固定到同一机器——不推荐，失去负载均衡意义）；② Session 复制——Tomcat 原生支持，但开销大；③ **集中存储**——Redis 存 Session（推荐，简单高效）。

**Q**: CSRF 攻击是什么？怎么防御？
**A**: 跨站请求伪造——攻击者诱导用户点击链接，利用用户已登录的 Cookie 发起恶意请求。防御：① SameSite Cookie（Strict/Lax）；② CSRF Token（表单中加随机 Token）；③ 验证 Referer/Origin 头；④ 敏感操作加二次验证。

### 常见错误

- ❌ JWT 存密码或手机号——payload 不加密，只是 Base64 编码
- ❌ 没有设置 HttpOnly + Secure 的 Cookie 存 sessionId——XSS 攻击可直接读取
- ❌ 把 JWT 放在 URL 参数中——会被浏览器历史、服务器日志、Referer 头泄露

### 一句话总结

> **Cookie = 浏览器自动携带的存储；Session = 服务端状态（需共享）；JWT = 无状态 Token（适合微服务、跨域、移动端）。实际项目中，Access Token + Refresh Token + Redis 黑名单是最佳实践。**

---

## Q9: OSI 七层模型和 TCP/IP 四层模型 ⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: 网络分层、各层协议

> 面试官问："说说 OSI 七层模型和 TCP/IP 四层模型。每层有哪些常见协议？"

### 核心回答

| OSI 七层 | TCP/IP 四层 | 功能 | 常见协议 |
|----------|-----------|------|---------|
| **应用层** | 应用层 | 为应用程序提供网络服务 | HTTP、HTTPS、DNS、FTP、SMTP、SSH |
| **表示层** | ↑ | 数据格式转换、加密解密 | TLS/SSL、JPEG、ASCII |
| **会话层** | ↑ | 建立、管理、终止会话 | RPC、NetBIOS |
| **传输层** | 传输层 | 端到端的数据传输 | **TCP、UDP** |
| **网络层** | 网络层 | 路由选择、逻辑寻址 | **IP、ICMP、ARP、OSPF、BGP** |
| **数据链路层** | 网络接口层 | 相邻节点间的可靠传输 | Ethernet、MAC、VLAN、PPP |
| **物理层** | ↑ | 比特流的物理传输 | 光纤、双绞线、WiFi、蓝牙 |

**记忆口诀**："物联网叔会使用" → **物**理层、数据**链**路层、**网**络层、传**输**层、**会**话层、表**示**层、**使用**层（应用层）。

### 深度扩展

**路由器、交换机、集线器各在哪一层？**

| 设备 | 工作层级 | 转发依据 |
|------|---------|---------|
| **集线器（Hub）** | 物理层 | 广播到所有端口 |
| **交换机（Switch）** | 数据链路层 | MAC 地址表 |
| **路由器（Router）** | 网络层 | 路由表（IP 地址） |
| **网关（Gateway）** | 传输层及以上 | 协议转换 |

**常见面试问题——ARP 协议**：

```
ARP（Address Resolution Protocol，地址解析协议）：
  作用：IP 地址 → MAC 地址
  工作在网络层和数据链路层之间

  过程：
    1. 主机 A 发 ARP 广播："192.168.1.1 的 MAC 地址是什么？"
    2. 主机 B（192.168.1.1）回复："是我，我的 MAC 是 aa:bb:cc:dd:ee:ff"
    3. 主机 A 缓存到 ARP 缓存表（arp -a 查看）
    4. 后续通信直接用 MAC 地址封装帧
```

### 面试追问

**Q**: 为什么 TCP/IP 四层模型把 OSI 的上三层合并了？
**A**: OSI 模型偏理论化，表示层和会话层在实际实现中通常与应用层合并（例如 TLS 既可以看作表示层也可以看作传输层的安全套接层）。TCP/IP 模型是实践驱动的，不纠结层层分离。

**Q**: `ping` 命令用的是哪个协议？
**A**: ICMP（Internet Control Message Protocol），属于网络层协议。`ping` 发 ICMP Echo Request，对方回 ICMP Echo Reply。

### 常见错误

- ❌ 说交换机工作在网络层——交换机工作在数据链路层（MAC 地址），路由器工作在网络层（IP 地址）
- ❌ 说 TCP 在网络层——TCP 在传输层，IP 才在网络层
- ❌ OSI 七层和应用层协议一一对应——HTTP 是应用层，但 TLS 涉及会话层和表示层的功能

### 一句话总结

> **OSI 七层 = 物数网传会表应（从上到下）；TCP/IP 四层 = 应用 + 传输 + 网络 + 网络接口。面试重点是传输层（TCP/UDP）和应用层（HTTP/DNS）的协议。**

---

## Q10: 什么是跨域？如何解决？⭐️⭐️

**难度**: ⭐️⭐️ | **考察点**: 同源策略、CORS、跨域方案

> 面试官问："浏览器为什么要限制跨域？前端到后端的跨域问题你是怎么解决的？"

### 核心回答

**同源策略**：协议 + 域名 + 端口 三者完全相同才算同源。

```
https://example.com:443/path

同源：
  https://example.com:443/other  ✅
不同源：
  http://example.com              ❌ 协议不同
  https://api.example.com         ❌ 域名不同
  https://example.com:8443        ❌ 端口不同
```

**为什么要限制**：同源策略是浏览器最核心的安全机制。如果没有它，恶意网站可以通过 JavaScript 读取你在银行网站上的 Cookie，发起转账请求（CSRF 攻击）。

### 深度扩展

**CORS（跨域资源共享）**：

```
简单请求（Method: GET/HEAD/POST + Content-Type: text/plain等）：
  浏览器自动加 Origin 头
  服务器返回 Access-Control-Allow-Origin
  
非简单请求（PUT/DELETE 或 Content-Type: application/json）：
  先发 OPTIONS 预检请求（Preflight）
    → 服务器返回 Allow-Origin, Allow-Methods, Allow-Headers
    → 浏览器确认允许后，再发正式请求

服务端设置：
  Access-Control-Allow-Origin: https://example.com  （或 * 表示允许所有）
  Access-Control-Allow-Methods: GET, POST, PUT, DELETE
  Access-Control-Allow-Headers: Content-Type, Authorization
  Access-Control-Allow-Credentials: true  （允许携带 Cookie）
  Access-Control-Max-Age: 86400  （预检请求缓存 24 小时）
```

**常见跨域方案**：

| 方案 | 原理 | 适用场景 |
|------|------|---------|
| **CORS** | 服务端添加 HTTP 头 | **推荐，标准方案** |
| **JSONP** | `<script>` 标签不受同源限制，用回调函数传递数据 | 仅 GET，老旧系统 |
| **反向代理**（Nginx） | 同源的 Nginx 代理到不同源的后端 | 生产环境，前后端分离 |
| **WebSocket** | ws 协议不受同源限制 | 实时通信 |
| **postMessage** | 跨文档通信（iframe/窗口间） | 嵌入页面通信 |
| **Spring `@CrossOrigin`** | 注解驱动 CORS | Spring Boot 单接口快速配置 |

**Nginx 反向代理解决跨域**：

```nginx
server {
    listen 80;
    server_name example.com;
    
    # 前端
    location / {
        root /var/www/frontend;
    }
    
    # 后端 API
    location /api/ {
        proxy_pass http://localhost:8080/;  # 代理到后端
        # 同域了，不存在跨域问题
    }
}
```

### 面试追问

**Q**: CORS 跨域时，Cookie 怎么传？
**A**: 前端设置 `withCredentials: true`（axios/fetch）。后端返回 `Access-Control-Allow-Credentials: true`，且 `Allow-Origin` 不能为 `*`（必须指定具体域名）。

**Q**: 为什么 JSONP 只能 GET？
**A**: JSONP 的原理是在页面中动态插入 `<script src="...">` 标签——`<script>` 标签的加载只能发 GET 请求。这个限制决定了 JSONP 不适用于涉及数据修改的接口。

### 常见错误

- ❌ `Access-Control-Allow-Origin: *` + `withCredentials: true` —— 两者互斥，浏览器会报错
- ❌ 把跨域当作"浏览器不允许请求发送"——请求实际上发出去了，后端也处理了，只是浏览器拦截了响应（简单请求），或拦截了请求（非简单请求的 OPTIONS）
- ❌ 认为改 hosts 可以解决跨域——改 hosts 只解决了 DNS 解析，端口号仍然不同

### 一句话总结

> **跨域 = 浏览器同源策略限制（协议+域名+端口）。推荐方案：CORS（开发环境）和 Nginx 反向代理（生产环境）。JSONP 仅 GET 且需后端配合，已不推荐。**
