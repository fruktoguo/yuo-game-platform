# Yuo戏大厅

[![构建并部署生产环境](https://github.com/fruktoguo/yuo-game-platform/actions/workflows/deploy.yml/badge.svg)](https://github.com/fruktoguo/yuo-game-platform/actions/workflows/deploy.yml)

统一账号、游戏目录、启动会话和通用积分的轻量 Web 游戏平台。当前包含生命战争、Breakline 台球与全服同场 PvPvE 的炫彩贪吃蛇 Ultra。

[在线体验](https://pool.yuohira.com) · [架构说明](docs/architecture.md) · [游戏接入指南](docs/game-integration.md)

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
- 炫彩贪吃蛇 Ultra：通过大厅启动，保留原版 PvE、人机、模块、特效和声音，并在同一战场叠加多人 PvP；服务端位于 `127.0.0.1:3103`

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

五个运行容器均配置 Docker 硬内存上限，当前合计 2.00 GiB；`check:limits` 保证包括后续游戏在内的总额不会超过 2 GiB。

## DST 平台接入

当前本地账号实现位于身份提供者边界内。DST 新平台接入时实现 `IdentityProvider`，通过 OIDC Authorization Code + PKCE 或服务端授权码交换映射到全局 `accountId`，不需要修改游戏协议、积分账本或大厅业务。

生产部署前必须替换 `.env.example` 中列出的服务令牌和游戏会话密钥，并启用 `COOKIE_SECURE=true`。

当前生产拓扑、2 GiB 总预算和回滚流程见 [生产部署文档](docs/deployment.md)。
`main` 分支的自动构建与受限 SSH 发布机制见 [GitHub Actions 自动部署](docs/github-actions-deployment.md)。

## 开源协议

本项目基于 [MIT License](LICENSE) 开源。生产部署前必须生成独立的数据库密码、服务令牌和游戏会话密钥；仓库中的开发默认值与 `.env.example` 占位符不得用于公网环境。
