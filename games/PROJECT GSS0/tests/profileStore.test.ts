import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { SnakeProfileStore } from '../src/server/ProfileStore';

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('SnakeProfileStore', () => {
  it('原子保存并恢复 Ultra PvPvE 累计战绩', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'snake-profile-'));
    directories.push(directory);
    const path = join(directory, 'profiles.json.gz');
    const store = await SnakeProfileStore.open(path);
    const first = store.recordRun({
      accountId: 'account-a', entityId: 1, name: '玩家甲', score: 120,
      level: 4, survivalTime: 82.5, kills: 3, botKills: 2, pvpKills: 1,
    }, 100);
    expect(first).toMatchObject({ brokeScoreRecord: true, brokeLevelRecord: true, brokeSurvivalRecord: true });
    await store.save();

    const restored = await SnakeProfileStore.open(path);
    expect(restored.get('account-a')).toEqual({
      bestScore: 120,
      bestLevel: 4,
      bestSurvivalTime: 82.5,
      totalKills: 3,
      totalBotKills: 2,
      totalPvpKills: 1,
      gamesPlayed: 1,
    });
    const second = restored.recordRun({
      accountId: 'account-a', entityId: 1, name: '玩家甲', score: 80,
      level: 3, survivalTime: 61, kills: 2, botKills: 1, pvpKills: 1,
    }, 200);
    expect(second.brokeScoreRecord).toBe(false);
    expect(second.profile).toEqual({
      bestScore: 120,
      bestLevel: 4,
      bestSurvivalTime: 82.5,
      totalKills: 5,
      totalBotKills: 3,
      totalPvpKills: 2,
      gamesPlayed: 2,
    });
  });
});
