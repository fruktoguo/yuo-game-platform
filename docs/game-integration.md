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

## 存档

世界型游戏使用 `AtomicGzipJsonStore<T>` 保存低频完整快照，并在存档结构中记录 `accountId`。高频或需要跨实例查询的数据使用 PostgreSQL；房间内临时物理状态保留在内存。

高频实时游戏应由服务端判定移动、碰撞和得分。客户端输入载荷只包含最小控制意图；状态广播使用版本化快照并在客户端渲染层插值，禁止为每帧状态触发 React 整体更新。PROJECT GSS0 的输入仅包含递增序号和目标方向，不允许客户端提交位置、速度、击杀或模块状态。

放置型游戏不应维持空房间逐帧循环。远星工造只对在线房间进行 2 Hz 结算，并以 0.5 Hz 发送常规动态同步；空房间在成员返回时按服务端时间差补算，最多使用 360 个自适应时间片。日常同步只发送固定资源顺序的数值数组，建筑、科研或任务阶段变化才发送完整快照。客户端命令携带请求号，服务端按账号和房间幂等去重。

## 积分

游戏服务端通过 `PlatformServiceClient.createWalletEntry()` 提交奖励、消费或退款。每个业务结果必须生成稳定且全游戏唯一的 `idempotencyKey`；同一键只允许重放完全相同的命令，参数不一致会返回 `IDEMPOTENCY_CONFLICT`。客户端不得调用内部积分接口。
