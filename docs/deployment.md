# 生产部署

## 服务布局

`game.dstopology.com` 是唯一登录域名，使用单域名子路径部署：

- `/`：游戏平台与大厅，回环端口 `3100`。
- `/life/`：生命战争，回环端口 `3101`。
- `/billiards/`：Breakline 台球，回环端口 `3102`。
- `/snake/`：PROJECT GSS0，回环端口 `3103`。
- `/foundry/`：远星工造，回环端口 `3104`。
- PostgreSQL：仅绑定 `127.0.0.1:54329`。

`dst` 生产服务器使用 Nginx 移除游戏路径前缀，并代理 Socket.IO 的 WebSocket 升级；配置见 [game.dstopology.com.conf](../deploy/nginx/game.dstopology.com.conf)。若改用 Caddy，可参考 [Caddyfile.pool.example](../deploy/Caddyfile.pool.example)。游戏前端以相对地址加载资源，并根据当前页面目录解析会话接口与 Socket.IO 路径。

生产 `.env` 中的平台公开地址和全部游戏启动地址必须使用同一个规范域：

```dotenv
PUBLIC_BASE_URL=https://game.dstopology.com
LIFE_LAUNCH_URL=https://game.dstopology.com/life/
BILLIARDS_LAUNCH_URL=https://game.dstopology.com/billiards/
SNAKE_LAUNCH_URL=https://game.dstopology.com/snake/
FOUNDRY_LAUNCH_URL=https://game.dstopology.com/foundry/
```

只修改 Nginx 而保留旧 `PUBLIC_BASE_URL` 会使游戏启动响应中的 `lobby_url` 继续指向旧域名，用户从游戏返回大厅时会跨域并丢失登录态。

## 外部身份认证

默认部署不依赖任何外部账号平台：`AUTH_EXTERNAL_IMPLEMENTATION=disabled` 且 `AUTH_LOCAL_ENABLED=true`。需要接入外部平台时，在部署环境的 `.env` 中选择适配器并配置入口、签发方和独立共享密钥；不要把真实密钥提交到仓库。

完整变量和 NewAPI 兼容协议见[外部身份接入文档](external-identity.md)。启用前还需要身份平台提供一个专用于游戏大厅的交接入口，接收地址为 `PUBLIC_BASE_URL + /api/v1/auth/external/{providerId}/handoff`。

## 内存预算

| 服务 | 硬上限 |
| --- | ---: |
| PostgreSQL | 256 MiB |
| 平台与大厅 | 256 MiB |
| 生命战争 | 384 MiB |
| Breakline 台球 | 384 MiB |
| PROJECT GSS0 | 384 MiB |
| 远星工造 | 256 MiB |
| 合计 | 1920 MiB |

每个容器使用 Docker `mem_limit`，因此整套运行服务的理论总上限为 2.00 GiB。修改 Compose 或增加游戏后必须运行 `npm run check:limits`，总额不得超过 2 GiB。

## 发布流程

生产服务器资源有限，镜像必须在开发机完成构建和验证，再通过 `docker save` 上传；服务器禁止执行前端构建。

生产部署目录固定为 `/opt/game-platform`。日常发布由 [GitHub Actions 自动部署](github-actions-deployment.md) 完成。自动流程使用受限 SSH 强制命令，只更新应用镜像；Compose、Nginx、数据卷或资源上限变更仍需人工部署。以下步骤也是首次部署和故障处理时的手动流程：

1. 运行 `npm test`、`npm run build`、`npm run check:limits` 和 `npm run check:e2e`。
2. 使用不可变时间标签构建镜像并上传服务器。
3. 在服务器部署目录设置权限为 `0600` 的 `.env`，替换全部密码、服务令牌和会话密钥。
4. 使用 `docker compose up -d --no-build --wait` 启动并等待全部健康检查。
5. 验证回环健康接口后执行 `nginx -t`，安装站点并平滑执行 `systemctl reload nginx`。
6. 从公网完成注册、四个游戏启动和多人联机验收后，才能清理旧运行容器。

生产服务使用只读根文件系统、非 root 用户、进程数限制、日志轮转和优雅停机。生命世界、PROJECT GSS0 战绩、远星工造房间与 PostgreSQL 分别保存在命名卷中。

## 回滚

部署前必须备份 Nginx 站点、平台数据库、生命世界、PROJECT GSS0 战绩和远星工造房间。若新版本失败：

1. 恢复上一份 Nginx 站点并先执行 `nginx -t`。
2. 将 `GAME_PLATFORM_IMAGE` 改回上一不可变镜像标签并执行 `docker compose up -d --no-build --wait`。
3. 只有数据库或世界格式已发生不兼容写入时，才停止服务并恢复对应备份。

禁止使用 `docker compose down -v`，该命令会删除平台数据库、生命世界、PROJECT GSS0 战绩和远星工造房间。
