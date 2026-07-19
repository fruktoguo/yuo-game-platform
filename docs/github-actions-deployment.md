# GitHub Actions 自动部署

推送到 `main` 后，[构建并部署生产环境](../.github/workflows/deploy.yml) 会自动执行单元测试、类型检查、生产构建、2 GiB 内存上限检查、Docker 镜像构建和生产部署。`workflow_dispatch` 允许在 GitHub Actions 页面手动重跑同一流程，不需要 Environment 审批。

## 权限边界

仓库只保存一把专用部署私钥和服务器 ED25519 Host Key。对应服务器公钥使用 `restrict` 和强制命令，不能打开 Shell、申请 TTY、转发端口或执行任意 `sudo`。强制入口只接受 40 位提交 SHA、64 位镜像摘要和标准输入中的镜像归档。

生产服务器继续使用人工审核并固定安装的 Compose 与 Nginx 配置。自动流程只能更新 `GAME_PLATFORM_IMAGE` 并重建已有服务，不能通过仓库中的 Compose 增加宿主机挂载、特权容器或额外端口。需要修改服务拓扑、内存配额、数据卷或反向代理时，必须单独验证并人工安装配置。

直接推送者仍然可以发布任意应用代码，并可在容器权限范围内访问游戏服务已有的环境变量和数据卷。因此只能向可信账号授予仓库写入权限，且不得在该仓库添加权限范围更大的服务器密钥。

## GitHub 配置

仓库变量：

- `DEPLOY_HOST`：生产服务器地址。
- `DEPLOY_PORT`：SSH 端口。
- `DEPLOY_USER`：受限部署用户。

仓库 Secret：

- `DEPLOY_SSH_KEY`：专用 ED25519 私钥。
- `DEPLOY_KNOWN_HOSTS`：固定的服务器 ED25519 Host Key 记录。

## 服务器入口

服务器安装两份 root 所有、普通用户不可写的脚本：

- `/usr/local/bin/github-yuo-deploy-entry`：解析并限制 `SSH_ORIGINAL_COMMAND`。
- `/usr/local/sbin/deploy-yuo-game-platform`：接收、校验、备份、部署、健康检查与回滚。
- `/etc/sudoers.d/game-deploy`：仅允许部署用户以 root 调用固定部署脚本。

部署前会备份 `.env`、Compose、PostgreSQL、生命世界，以及当前存在的 PROJECT GSS0 战绩或远星工造房间存档到 `backups/github-*`。镜像加载后会根据服务器已安装的 Compose 校验所有 Node.js 服务入口文件；入口路径不一致时会在修改 `.env` 和重建容器之前终止。容器更新失败时自动恢复上一镜像配置，但不会自动覆盖数据库或游戏存档，避免回滚过程丢失部署期间的新写入。每次保留最近五个 `sha-*` 镜像标签用于快速回滚。
