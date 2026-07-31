import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const packageManifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { name: string };
const serverSource = readFileSync(new URL('../src/server/index.ts', import.meta.url), 'utf8');
const roomHubSource = readFileSync(new URL('../src/server/RoomHub.ts', import.meta.url), 'utf8');
const viteSource = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');

describe('PROJECT GSS0 怀旧服隔离', () => {
  it('使用独立的工作区包和平台游戏身份', () => {
    expect(packageManifest.name).toBe('@yuo/neon-snake-arena-classic');
    expect(serverSource).toContain("gameId: 'neon-snake-arena-classic'");
    expect(roomHubSource).toContain("principal.gameId !== 'neon-snake-arena-classic'");
    expect(serverSource).not.toContain("gameId: 'neon-snake-arena',");
  });

  it('使用独立的端口、会话 Cookie 和战绩文件', () => {
    expect(serverSource).toContain('process.env.PORT, 3105');
    expect(serverSource).toContain("'data/snake-classic-profiles.json.gz'");
    expect(serverSource).toContain("cookieName: 'yuo_snake_classic_game_session'");
    expect(serverSource).toContain('dev-snake-classic-service-token-change-before-production-2026');
    expect(serverSource).toContain('dev-snake-classic-game-session-secret-change-before-production-2026');
    expect(viteSource).toContain('port: 5179');
    expect(viteSource).toContain("'http://127.0.0.1:3105'");
  });
});
