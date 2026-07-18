# Breakline 联机 3D 台球

YUO Game Platform 内的双人实时联机标准 8 球游戏。浏览器使用 Three.js 渲染，服务器使用 cannon-es 执行权威物理与规则判定，Socket.IO 负责房间、观战和快照同步。

玩家身份完全来自平台签发的游戏会话，房间事件不接受客户端自报账号或昵称。服务器只在球运动时执行 120 Hz 物理子步进，以 20 Hz 发送压缩快照，适合资源有限的单实例部署。

## 本地开发

从平台根目录启动 PostgreSQL 与全部服务：

```bash
npm run infra:up
npm run dev
```

开发客户端位于 `http://127.0.0.1:5173`，服务端位于 `http://127.0.0.1:3102`；正常入口始终是平台大厅。

## 验证

```bash
npm run typecheck -w @yuo/billiards-arena
npm run test -w @yuo/billiards-arena
npm run build -w @yuo/billiards-arena
npm run check:e2e
```

根级端到端验收会创建两个平台账号，验证双人入座、准备、聊天、母球放置、击球动画与桌面/移动布局。生产容器和反向代理由平台根目录统一管理。
