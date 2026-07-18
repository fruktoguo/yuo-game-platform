# 生命战争

YUO Game Platform 内的全服多人康威生命战争。中央 8×8 区域用于争夺，外围灰色区域可自由投放但不计占领；玩家率先占据 32 个区域即获胜，达到区域像素 15% 后可阻止他人向该区域投放图案。标准 B3/S23 演化、区域归属、颜色、能量和投放校验均由服务器权威执行。

游戏不再接受浏览器提交的昵称或账号标识，只能通过平台大厅签发的一次性启动码进入。世界存档使用共享 `AtomicGzipJsonStore` 原子写入，完整玩法见 [docs/game-design.md](docs/game-design.md)。

## 本地开发

从平台根目录启动 PostgreSQL 与全部服务：

```bash
npm run infra:up
npm run dev
```

开发客户端位于 `http://127.0.0.1:5174`，服务端位于 `http://127.0.0.1:3101`；正常入口始终是平台大厅。

## 验证

```bash
npm run typecheck -w @yuo/life-commons
npm run test -w @yuo/life-commons
npm run build -w @yuo/life-commons
npm run check:e2e
```

生产容器和反向代理由平台根目录统一管理，本游戏目录不维护独立部署配置。
