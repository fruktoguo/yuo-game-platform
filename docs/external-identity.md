# 外部身份接入

## 兼容层边界

游戏平台不依赖某个固定服务器、域名或账号品牌。核心认证流程只使用经过适配器验证的四个字段：

- `provider`：部署方定义的身份提供者标识。
- `subject`：身份平台内稳定且不可复用的用户标识。
- `username`：创建平台账号时使用的用户名快照。
- `displayName`：大厅显示名称。

平台以 `provider + subject` 查找账号，不会按用户名自动合并身份。外部访问令牌只用于服务端即时回查，API Key 不进入平台账号、会话、数据库或浏览器响应。

## 默认独立模式

仓库默认配置为：

```dotenv
AUTH_LOCAL_ENABLED=true
AUTH_EXTERNAL_IMPLEMENTATION=disabled
```

此模式只开放本地注册和登录，开发、私有部署及其他开源使用者不需要 NewAPI 或 `dst` 环境。

## NewAPI 兼容实现

当前内置的 `newapi-node-studio-v1` 适配器复用 NewAPI 向 Node Studio 发送的 v1 加密交接格式。部署示例：

```dotenv
AUTH_LOCAL_ENABLED=true
AUTH_EXTERNAL_IMPLEMENTATION=newapi-node-studio-v1
AUTH_EXTERNAL_PROVIDER_ID=newapi
AUTH_EXTERNAL_PROVIDER_NAME=NewAPI
AUTH_EXTERNAL_ENTRY_URL=https://identity.example.com/api/game-platform/handoff
AUTH_EXTERNAL_ISSUER_URL=https://identity.example.com
AUTH_EXTERNAL_HANDOFF_SECRET=replace-with-at-least-32-random-bytes
AUTH_EXTERNAL_HANDOFF_MAX_TTL_SECONDS=300
AUTH_EXTERNAL_VALIDATION_TIMEOUT_MS=5000
```

`AUTH_LOCAL_ENABLED=false` 可以关闭本地账号，但配置加载时至少要保留一种可用认证实现。生产环境的入口和签发方必须使用 HTTPS；只有 `localhost`、`127.0.0.1` 和 `::1` 允许 HTTP。

变量含义：

| 变量 | 说明 |
| --- | --- |
| `AUTH_EXTERNAL_IMPLEMENTATION` | 适配器实现；`disabled` 或 `newapi-node-studio-v1`。 |
| `AUTH_EXTERNAL_PROVIDER_ID` | 写入身份关联表的稳定 provider，部署后不要随意更改。 |
| `AUTH_EXTERNAL_PROVIDER_NAME` | 大厅登录按钮显示名称。 |
| `AUTH_EXTERNAL_ENTRY_URL` | 用户点击外部登录后跳转到的身份平台入口。 |
| `AUTH_EXTERNAL_ISSUER_URL` | 允许签发交接包并用于账号回查的 NewAPI 根地址。 |
| `AUTH_EXTERNAL_HANDOFF_SECRET` | 双方独立共享的交接密钥，至少 32 字节。 |
| `AUTH_EXTERNAL_HANDOFF_MAX_TTL_SECONDS` | 交接包最大有效期，范围 30 至 900 秒。 |
| `AUTH_EXTERNAL_VALIDATION_TIMEOUT_MS` | 回查外部账号的超时，范围 500 至 30000 毫秒。 |

## 身份平台需要实现的入口

仅修改游戏大厅 ENV 不会自动在 NewAPI 中创建菜单或交接入口。身份平台还需要新增一个专用于游戏大厅的入口，不能复用 Node Studio 已绑定的接收地址。该入口完成当前用户鉴权后，以表单 POST 方式发送：

```text
POST https://game.example.com/api/v1/auth/external/newapi/handoff
Content-Type: application/x-www-form-urlencoded

payload=v1.<base64url nonce>.<base64url ciphertext-and-tag>
```

回调路径中的 `newapi` 必须与 `AUTH_EXTERNAL_PROVIDER_ID` 相同。表单必须由 `AUTH_EXTERNAL_ENTRY_URL` 或 `AUTH_EXTERNAL_ISSUER_URL` 所在源直接提交，平台会校验浏览器的 `Origin` 请求头，拒绝第三方页面转交凭据。交接明文沿用 Node Studio v1 结构：

```json
{
  "version": 1,
  "issued_at": 1784450000,
  "expires_at": 1784450120,
  "api_base_url": "https://identity.example.com",
  "user": {
    "id": 42,
    "username": "player",
    "access_token": "temporary-user-access-token"
  },
  "api_keys": []
}
```

加密参数与 Node Studio v1 保持一致：

- 密钥为 `SHA-256(AUTH_EXTERNAL_HANDOFF_SECRET)`。
- 算法为 AES-256-GCM，随机 nonce 为 12 字节，认证标签为 16 字节。
- AAD 固定为 `new-api-node-studio:v1`。
- 密文部分是 `ciphertext + authentication tag`，各段使用无填充 base64url。

平台解密后会校验有效期与 `api_base_url`，再携带 `Authorization: Bearer <access_token>` 和 `New-Api-User: <id>` 请求 `AUTH_EXTERNAL_ISSUER_URL/api/user/self`。只有回查成功且用户 ID 一致时才建立本地 HttpOnly 会话。

## 安全与扩展约束

- 游戏大厅应使用独立交接密钥，不与 Node Studio、API Key 或其他应用共享。
- 当前 Compose 只运行一个平台实例，短期交接包的重复消费由进程内保护拦截。若扩展为多实例，需要新增共享的一次性凭据存储后再开放流量。
- `providerId` 是持久身份命名空间。更换身份平台或 subject 语义时应使用新的 provider，避免错误接管旧账号。
- 新协议应新增一个 `ExternalIdentityAdapter` 实现并加入配置选择，不要把品牌路由或平台专属字段写入大厅组件和核心账号服务。
