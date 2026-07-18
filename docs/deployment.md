# 生产部署

## 服务布局

`pool.yuohira.com` 是唯一登录域名，使用单域名子路径部署。`game.yuohira.com` 通过 `308` 保留路径和查询参数跳转到 `pool.yuohira.com`，因此两个域名均可访问大厅，同时不会产生两套相互隔离的登录 Cookie：

- `/`：游戏平台与大厅，回环端口 `3100`。
- `/life/`：生命战争，回环端口 `3101`。
- `/billiards/`：Breakline 台球，回环端口 `3102`。
- `/snake/`：PROJECT GSS0，回环端口 `3103`。
- PostgreSQL：仅绑定 `127.0.0.1:54329`。

Caddy 使用 `handle_path` 移除游戏路径前缀；游戏前端以相对地址加载资源，并根据当前页面目录解析会话接口与 Socket.IO 路径。配置示例见 [Caddyfile.pool.example](../deploy/Caddyfile.pool.example)。

## 内存预算

| 服务 | 硬上限 |
| --- | ---: |
| PostgreSQL | 256 MiB |
| 平台与大厅 | 256 MiB |
| 生命战争 | 512 MiB |
| Breakline 台球 | 512 MiB |
| PROJECT GSS0 | 512 MiB |
| 合计 | 2048 MiB |

每个容器使用 Docker `mem_limit`，因此整套运行服务的理论总上限为 2.00 GiB。修改 Compose 或增加游戏后必须运行 `npm run check:limits`，总额不得超过 2 GiB。

## 发布流程

生产服务器资源有限，镜像必须在开发机完成构建和验证，再通过 `docker save` 上传；服务器禁止执行前端构建。

日常发布由 [GitHub Actions 自动部署](github-actions-deployment.md) 完成。自动流程使用受限 SSH 强制命令，只更新应用镜像；Compose、Caddy、数据卷或资源上限变更仍需人工部署。以下步骤也是首次部署和故障处理时的手动流程：

1. 运行 `npm test`、`npm run build`、`npm run check:limits` 和 `npm run check:e2e`。
2. 使用不可变时间标签构建镜像并上传服务器。
3. 在服务器部署目录设置权限为 `0600` 的 `.env`，替换全部密码、服务令牌和会话密钥。
4. 使用 `docker compose up -d --no-build --wait` 启动并等待全部健康检查。
5. 验证回环健康接口后再验证、安装并平滑重载 Caddy。
6. 从公网完成注册、三个游戏启动和多人联机验收后，才能清理旧运行容器。

生产服务使用只读根文件系统、非 root 用户、进程数限制、日志轮转和优雅停机。生命世界、贪吃蛇战绩与 PostgreSQL 分别保存在命名卷中。

## 回滚

部署前必须备份 Caddyfile、平台数据库、生命世界和贪吃蛇战绩。若新版本失败：

1. 恢复上一份 Caddyfile 并先执行 `caddy validate`。
2. 将 `GAME_PLATFORM_IMAGE` 改回上一不可变镜像标签并执行 `docker compose up -d --no-build --wait`。
3. 只有数据库或世界格式已发生不兼容写入时，才停止服务并恢复对应备份。

禁止使用 `docker compose down -v`，该命令会删除平台数据库、生命世界和贪吃蛇战绩。
