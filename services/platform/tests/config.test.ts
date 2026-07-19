import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';

describe('平台身份配置', () => {
  it('默认仅启用本地身份实现', () => {
    const config = loadConfig({});
    expect(config.auth).toEqual({ localEnabled: true, external: null });
  });

  it('通过环境变量独立选择外部平台和协议实现', () => {
    const config = loadConfig({
      AUTH_LOCAL_ENABLED: 'false',
      AUTH_EXTERNAL_IMPLEMENTATION: 'newapi-node-studio-v1',
      AUTH_EXTERNAL_PROVIDER_ID: 'sample-platform',
      AUTH_EXTERNAL_PROVIDER_NAME: '示例账号平台',
      AUTH_EXTERNAL_ENTRY_URL: 'http://127.0.0.1:4100/game-handoff',
      AUTH_EXTERNAL_ISSUER_URL: 'http://127.0.0.1:4100',
      AUTH_EXTERNAL_HANDOFF_SECRET: 'test-external-handoff-secret-32-bytes',
      AUTH_EXTERNAL_HANDOFF_MAX_TTL_SECONDS: '180',
      AUTH_EXTERNAL_VALIDATION_TIMEOUT_MS: '1200',
    });
    expect(config.auth.localEnabled).toBe(false);
    expect(config.auth.external).toMatchObject({
      implementation: 'newapi-node-studio-v1',
      providerId: 'sample-platform',
      providerName: '示例账号平台',
      handoffMaxTtlSeconds: 180,
      validationTimeoutMs: 1200,
    });
  });

  it('拒绝关闭全部身份实现', () => {
    expect(() => loadConfig({ AUTH_LOCAL_ENABLED: 'false' })).toThrow('至少需要启用一种身份认证实现');
  });

  it('拒绝公网 HTTP 身份服务', () => {
    expect(() => loadConfig({
      AUTH_EXTERNAL_IMPLEMENTATION: 'newapi-node-studio-v1',
      AUTH_EXTERNAL_PROVIDER_ID: 'sample-platform',
      AUTH_EXTERNAL_PROVIDER_NAME: '示例账号平台',
      AUTH_EXTERNAL_ENTRY_URL: 'http://identity.example.com/handoff',
      AUTH_EXTERNAL_ISSUER_URL: 'https://identity.example.com',
      AUTH_EXTERNAL_HANDOFF_SECRET: 'test-external-handoff-secret-32-bytes',
    })).toThrow('AUTH_EXTERNAL_ENTRY_URL 必须使用 HTTPS');
  });
});
