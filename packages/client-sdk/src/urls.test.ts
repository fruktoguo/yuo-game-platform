import { describe, expect, it } from 'vitest';
import { resolveGameEndpoint, resolveGameSocketPath } from './index';

describe('游戏子路径地址解析', () => {
  it('在独立域名根路径下保持原有接口地址', () => {
    expect(resolveGameEndpoint('/api/platform/session', 'https://life.example.com/?launch_code=x').toString())
      .toBe('https://life.example.com/api/platform/session');
    expect(resolveGameSocketPath('https://life.example.com/')).toBe('/socket.io');
  });

  it('在统一域名下继承游戏目录前缀', () => {
    expect(resolveGameEndpoint('api/platform/session', 'https://pool.example.com/life/?launch_code=x').toString())
      .toBe('https://pool.example.com/life/api/platform/session');
    expect(resolveGameSocketPath('https://pool.example.com/billiards/?room=ABC123')).toBe('/billiards/socket.io');
  });
});
