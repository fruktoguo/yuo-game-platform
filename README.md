# Yuo戏大厅

[![构建并部署生产环境](https://github.com/fruktoguo/yuo-game-platform/actions/workflows/deploy.yml/badge.svg)](https://github.com/fruktoguo/yuo-game-platform/actions/workflows/deploy.yml)

统一账号、游戏目录、启动会话和通用积分的轻量 Web 游戏平台。当前包含生命战争、Breakline 台球、PROJECT GSS0 与多人协作文字放置游戏远星工造。

[在线体验](https://game.dstopology.com) · [架构说明](docs/architecture.md) · [游戏接入指南](docs/game-integration.md)

## 目录

- `apps/lobby`：账号登录、注册、游戏目录和积分界面。
- `services/platform`：身份、会话、游戏启动和积分账本服务。
- `games/*`：接入平台账号的独立游戏。
- `packages/contracts`：跨服务版本化契约。
- `packages/client-sdk`：大厅 API 和游戏会话启动客户端。
- `packages/server-sdk`：游戏服务端票据兑换、Cookie 与 Socket 鉴权。
- `packages/persistence`：PostgreSQL 迁移与原子 gzip 游戏存档。
- `packages/realtime`：共享实时限流组件。
- `deploy`：反向代理示例与生产部署入口。

## 本地运行

```bash
npm install
npm run infra:up
npm run build
npm start
```

入口：

- 游戏大厅：`http://127.0.0.1:3100`
- 生命战争：通过大厅启动，服务端位于 `127.0.0.1:3101`
- Breakline 台球：通过大厅启动，服务端位于 `127.0.0.1:3102`
- PROJECT GSS0：通过大厅启动；单人保持原版肉鸽贪吃蛇规则，第二名玩家加入后自动切换共享世界联机模式；服务端位于 `127.0.0.1:3103`
- 远星工造：通过大厅启动；支持密码房间、岗位协作、离线推进，以及从手工采集、自动化、炼油、铁路、核电到轨道火箭的完整生产链；服务端位于 `127.0.0.1:3104`

开发模式使用 `npm run dev`，大厅 Vite 地址为 `http://127.0.0.1:5175`。

## 验证

```bash
npm run typecheck
npm test
npm run build
npm run check:limits
npm run check:e2e
```

`check:e2e` 按生产构建验收完整跨游戏流程，执行前需已运行 `npm run infra:up`、`npm run build` 和 `npm start`。脚本默认使用系统 Chrome，也可通过 `CHROME_PATH` 指定浏览器；截图写入已忽略的 `artifacts/e2e`。

根目录的 `build:packages` 会按依赖顺序生成共享包的 Node/浏览器运行产物。新增游戏必须依赖共享包公开入口，禁止跨目录引用其他游戏或平台服务源码。

六个运行容器均配置 Docker 硬内存上限，当前合计 1.875 GiB；`check:limits` 保证包括后续游戏在内的总额不会超过 2 GiB。远星工造仅为在线房间执行 2 Hz 生产结算，以 0.5 Hz 发送常规动态同步；空置房间在成员返回时按时间差补算，最多使用 360 个自适应时间片，常规同步使用固定顺序数值数组控制 CPU 与网络开销。

## 外部身份平台接入

大厅的身份兼容层不绑定具体服务器或品牌。默认使用本地账号；部署方可以通过 ENV 选择外部身份实现，将经过验证的 `provider + subject` 映射到全局 `accountId`，不需要修改游戏协议、积分账本或大厅业务。

仓库已提供 `newapi-node-studio-v1` 适配器，用于兼容 NewAPI 向 Node Studio 发送的加密交接协议。具体变量、交接契约和平台侧要求见[外部身份接入文档](docs/external-identity.md)。

生产部署前必须替换 `.env.example` 中列出的服务令牌和游戏会话密钥，并启用 `COOKIE_SECURE=true`。

当前生产拓扑、2 GiB 总预算和回滚流程见 [生产部署文档](docs/deployment.md)。
`main` 分支的自动构建与受限 SSH 发布机制见 [GitHub Actions 自动部署](docs/github-actions-deployment.md)。

## 开源协议

本项目基于 [MIT License](LICENSE) 开源。生产部署前必须生成独立的数据库密码、服务令牌和游戏会话密钥；仓库中的开发默认值与 `.env.example` 占位符不得用于公网环境。
