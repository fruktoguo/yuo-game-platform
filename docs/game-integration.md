# 游戏接入契约

## 必需配置

- 唯一 `gameId`。
- 平台内网地址与游戏服务令牌。
- 独立的游戏会话密钥和 Cookie 名称。
- 对外启动地址。

## 服务端

使用 `GameAuthBridge` 挂载 `/api/platform/session`，并在 Socket.IO 的 `connection` 事件前安装 `socketMiddleware()`。业务代码只读取 `socket.data.platformPrincipal`，禁止接收 `accountId`、昵称或权限字段作为客户端事件载荷。

## 客户端

使用 `useGamePlatformSession()` 完成启动码兑换并清理地址栏。只有状态为 `ready` 时才创建业务 Socket 连接。

## PROJECT GSS0 本地联机烟测

在 `games/PROJECT GSS0` 运行 `npm run dev:local`，会同时启动仅供开发使用的平台会话替身、游戏服务端和 Vite。分别打开终端输出的 `127.0.0.1` 客户端 A 地址与 `localhost` 客户端 B 地址；两个主机名会隔离 Cookie，因此同一台电脑可以用两个身份完成建房、加入和 WebRTC 联机烟测。该替身只实现启动码兑换接口，不属于生产构建，也不能替代正式平台认证测试。

## 存档

世界型游戏使用 `AtomicGzipJsonStore<T>` 保存低频完整快照，并在存档结构中记录 `accountId`。高频或需要跨实例查询的数据使用 PostgreSQL；房间内临时物理状态保留在内存。

高频实时游戏通常由服务端判定移动、碰撞和得分；如果游戏明确选择 P2P，则必须把拓扑和权威边界写进游戏契约。PROJECT GSS0 的多人大厅通过 Socket.IO 完成房间与 WebRTC 信令，房主浏览器 Worker 是唯一共享世界，客户端只向房主发送递增序号的移动状态和可靠动作请求。玩家自己的技能命中走 `SkillSpawn → HitClaim → WorldCommit`：客户端提交自己的命中选择，房主按玩家归属、目标存在性和 `hitId` 账本处理，不做几何反作弊校验。状态广播仍使用版本化快照并在客户端渲染层插值，禁止为每帧状态触发 React 整体更新。房主离开即关闭房间；不提供主机迁移、Mesh、专用服务器或旧中心服协议兼容。

放置型游戏不应维持空房间逐帧循环。远星工造只对在线房间进行 2 Hz 结算，并以 0.5 Hz 发送常规动态同步；空房间在成员返回时按服务端时间差补算，最多使用 360 个自适应时间片。日常同步只发送固定资源顺序的数值数组，建筑、科研或任务阶段变化才发送完整快照。客户端命令携带请求号，服务端按账号和房间幂等去重。

## 积分

游戏服务端通过 `PlatformServiceClient.createWalletEntry()` 提交奖励、消费或退款。每个业务结果必须生成稳定且全游戏唯一的 `idempotencyKey`；同一键只允许重放完全相同的命令，参数不一致会返回 `IDEMPOTENCY_CONFLICT`。客户端不得调用内部积分接口。
