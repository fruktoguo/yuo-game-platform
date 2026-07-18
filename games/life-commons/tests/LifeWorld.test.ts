import { describe, expect, it } from 'vitest';
import { decodeWorldSnapshot } from '../src/shared/binary';
import {
  CLAIMABLE_MAX_X,
  CLAIMABLE_MAX_Y,
  CLAIMABLE_MIN_X,
  CLAIMABLE_MIN_Y,
  MAX_CUSTOM_PATTERN_CELLS,
  SECTOR_FULL_OCCUPANCY_CELLS,
  SECTOR_SIZE,
  SECTOR_VICTORY_COUNT,
  WORLD_CELL_COUNT,
  WORLD_WIDTH,
} from '../src/shared/constants';
import type { PlacementAction } from '../src/shared/protocol';
import { sectorOrigin } from '../src/shared/sectors';
import { LifeWorld } from '../src/server/LifeWorld';
import type { StoredPlayer, StoredWorldState } from '../src/server/WorldStore';

describe('多人世界操作', () => {
  it('放置、扣能量和持久化保持一致', async () => {
    let saved: StoredWorldState | null = null;
    const world = new LifeWorld({ save: async (state) => { saved = state; } }, null);
    const { player } = world.connectPlayer('client-alpha-0001', '测试玩家');
    const before = decodeWorldSnapshot(world.getSnapshot());
    const index = before.owners.findIndex((ownerId) => ownerId === 0);
    const action = placementAt(index, 'stamp');

    const result = world.place(player.ownerId, action);
    expect(result).toEqual({ ok: true, result: { changed: 1, cost: 1, energy: 999 } });
    const after = decodeWorldSnapshot(world.getSnapshot());
    expect(after.owners[index]).toBe(player.ownerId);
    expect(after.ages[index]).toBe(1);

    await world.stop();
    expect(saved).not.toBeNull();
    expect(saved!.players[0].connected).toBe(false);
    expect(saved!.ownersBase64.length).toBeGreaterThan(100);
  });

  it('同名在线玩家会获得稳定的唯一昵称', async () => {
    const world = new LifeWorld({ save: async () => undefined }, null);
    const first = world.connectPlayer('client-alpha-0002', '同名玩家').player;
    const second = world.connectPlayer('client-beta-00003', '同名玩家').player;
    expect(first.name).toBe('同名玩家');
    expect(second.name).toBe('同名玩家·2');
    expect(first.color).not.toBe(second.color);
    await world.stop();
  });

  it('断线重连沿用原归属编号', async () => {
    const world = new LifeWorld({ save: async () => undefined }, null);
    const first = world.connectPlayer('client-alpha-0003', '归来者').player;
    world.disconnectPlayer(first.ownerId);
    const reconnected = world.connectPlayer('client-alpha-0003', '归来者').player;
    expect(reconnected.ownerId).toBe(first.ownerId);
    expect(reconnected.color).toBe(first.color);
    expect(reconnected.connected).toBe(true);
    await world.stop();
  });

  it('橡皮擦只能删除自己的细胞并按格恢复能量', async () => {
    const world = new LifeWorld({ save: async () => undefined }, null);
    const first = world.connectPlayer('client-alpha-0004', '清理者').player;
    const second = world.connectPlayer('client-beta-00004', '旁观者').player;
    const snapshot = decodeWorldSnapshot(world.getSnapshot());
    const emptyIndex = findEmptyIndex(snapshot.owners);
    expect(world.place(first.ownerId, placementAt(emptyIndex, 'stamp')).ok).toBe(true);

    expect(world.place(second.ownerId, placementAt(emptyIndex, 'erase'))).toEqual({ ok: false, error: '只能清除自己的细胞' });
    expect(decodeWorldSnapshot(world.getSnapshot()).owners[emptyIndex]).toBe(first.ownerId);
    expect(world.place(first.ownerId, placementAt(emptyIndex, 'erase'))).toEqual({
      ok: true,
      result: { changed: 1, cost: 0, energy: 1_000 },
    });

    const neutralIndex = snapshot.owners.findIndex((ownerId) => ownerId === 65_535);
    expect(world.place(first.ownerId, placementAt(neutralIndex, 'erase'))).toEqual({ ok: false, error: '只能清除自己的细胞' });
    await world.stop();
  });

  it('自定义图案受服务端上限和有限边界约束', async () => {
    const world = new LifeWorld({ save: async () => undefined }, null);
    const player = world.connectPlayer('client-alpha-0005', '设计者').player;
    const snapshot = decodeWorldSnapshot(world.getSnapshot());
    const centerIndex = findEmptyArea(snapshot.owners, 3);
    const customAction: PlacementAction = {
      ...placementAt(centerIndex, 'stamp'),
      customPattern: { name: '双生', cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }] },
    };
    expect(world.place(player.ownerId, customAction)).toEqual({
      ok: true,
      result: { changed: 2, cost: 3, energy: 997 },
    });

    const overflowAction: PlacementAction = {
      ...placementAt(0, 'stamp'),
      customPattern: { name: '越界', cells: [{ x: -1, y: 0 }] },
    };
    expect(world.place(player.ownerId, overflowAction)).toEqual({ ok: false, error: '图案超出世界边界' });
    expect(world.place(player.ownerId, {
      ...placementAt(0, 'stamp'),
      patternId: 'glider',
    })).toEqual({ ok: false, error: '图案超出世界边界' });

    const tooManyCells = Array.from({ length: MAX_CUSTOM_PATTERN_CELLS + 1 }, (_, index) => ({ x: index % 16, y: Math.floor(index / 16) }));
    expect(world.place(player.ownerId, {
      ...placementAt(centerIndex, 'stamp'),
      customPattern: { name: '过大', cells: tooManyCells },
    })).toEqual({ ok: false, error: '自定义图案无效' });
    await world.stop();
  });

  it('每分钟自然恢复十点能量', async () => {
    const world = new LifeWorld({ save: async () => undefined }, null);
    const player = world.connectPlayer('client-alpha-0006', '等待者').player;
    const startedAt = Date.now();
    world.stepOnce(startedAt);
    const snapshot = decodeWorldSnapshot(world.getSnapshot());
    const emptyIndex = findEmptyArea(snapshot.owners, 5);
    const cells = Array.from({ length: 10 }, (_, index) => ({ x: index % 5, y: Math.floor(index / 5) }));
    expect(world.place(player.ownerId, {
      ...placementAt(emptyIndex, 'stamp'),
      customPattern: { name: '恢复测试', cells },
    })).toEqual({
      ok: true,
      result: { changed: 10, cost: 14, energy: 986 },
    });
    for (let second = 1; second <= 60; second += 1) world.stepOnce(startedAt + second * 1_000);
    expect(world.getPlayer(player.ownerId)?.energy).toBeCloseTo(996, 6);
    await world.stop();
  });

  it('同一玩家占据一半可争夺区域时获胜并开始下一赛季', async () => {
    const owners = new Uint16Array(WORLD_CELL_COUNT);
    const ages = new Uint8Array(WORLD_CELL_COUNT);
    for (let sector = 0; sector < SECTOR_VICTORY_COUNT; sector += 1) {
      const origin = sectorOrigin(sector);
      for (let cell = 0; cell < 8; cell += 1) {
        const index = origin.y * WORLD_WIDTH + origin.x + cell;
        owners[index] = 1;
        ages[index] = 1;
      }
    }
    const state: StoredWorldState = {
      version: 4,
      width: WORLD_WIDTH,
      height: WORLD_WIDTH,
      tick: 9,
      nextOwnerId: 2,
      ownersBase64: Buffer.from(owners.buffer).toString('base64'),
      agesBase64: Buffer.from(ages.buffer).toString('base64'),
      players: [storedPlayer(1, 'victory-account', '区域胜者')],
      season: { id: 3, startedAt: Date.now(), challenge: { type: 'population', title: '测试目标', target: 100, progress: 0, completed: false } },
      sectorOwners: [],
      hallOfFame: [],
    };
    const world = new LifeWorld({ save: async () => undefined }, state);
    expect(world.getMeta().season.id).toBe(4);
    expect(world.getMeta().hallOfFame[0]?.name).toBe('区域胜者');
    expect(world.getMeta().season.victoryAtSectors).toBe(32);
    await world.stop();
  });

  it('完全占据区会整次拒绝跨界图案，降至 15% 以下后立即解锁', async () => {
    const owners = new Uint16Array(WORLD_CELL_COUNT);
    const ages = new Uint8Array(WORLD_CELL_COUNT);
    const origin = sectorOrigin(0);
    for (let cell = 0; cell < SECTOR_FULL_OCCUPANCY_CELLS; cell += 1) {
      const x = origin.x + cell % SECTOR_SIZE;
      const y = origin.y + Math.floor(cell / SECTOR_SIZE);
      const index = y * WORLD_WIDTH + x;
      owners[index] = 1;
      ages[index] = 1;
    }
    const state: StoredWorldState = {
      version: 4,
      width: WORLD_WIDTH,
      height: WORLD_WIDTH,
      tick: 1,
      nextOwnerId: 3,
      ownersBase64: Buffer.from(owners.buffer).toString('base64'),
      agesBase64: Buffer.from(ages.buffer).toString('base64'),
      players: [storedPlayer(1, 'full-owner-account', '守方'), storedPlayer(2, 'attacker-account', '攻方')],
      season: { id: 1, startedAt: Date.now(), challenge: { type: 'births', title: '测试目标', target: 100, progress: 0, completed: false } },
      sectorOwners: [],
      hallOfFame: [],
    };
    const world = new LifeWorld({ save: async () => undefined }, state);
    const first = world.connectPlayer('full-owner-account', '守方').player;
    const second = world.connectPlayer('attacker-account', '攻方').player;
    expect(world.getMeta().fullyOccupiedSectorOwners[0]).toBe(first.ownerId);
    const grayIndex = origin.y * WORLD_WIDTH + origin.x - 1;
    const crossingAction: PlacementAction = {
      ...placementAt(grayIndex, 'stamp'),
      customPattern: { name: '跨界图案', cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }] },
    };
    expect(world.place(second.ownerId, crossingAction)).toEqual({ ok: false, error: '图案触及其他玩家完全占据的区域' });
    expect(decodeWorldSnapshot(world.getSnapshot()).owners[grayIndex]).toBe(0);
    const ownEmptyIndex = (origin.y + SECTOR_SIZE - 1) * WORLD_WIDTH + origin.x + SECTOR_SIZE - 1;
    expect(world.place(first.ownerId, placementAt(ownEmptyIndex, 'stamp')).ok).toBe(true);
    expect(world.place(first.ownerId, placementAt(ownEmptyIndex, 'erase')).ok).toBe(true);
    expect(world.place(first.ownerId, placementAt(origin.y * WORLD_WIDTH + origin.x, 'erase')).ok).toBe(true);
    expect(world.getMeta().fullyOccupiedSectorOwners[0]).toBe(0);
    expect(world.place(second.ownerId, crossingAction)).toEqual({ ok: true, result: { changed: 2, cost: 3, energy: 997 } });
    const outerAction: PlacementAction = {
      ...placementAt(0, 'stamp'),
      customPattern: { name: '外围图案', cells: Array.from({ length: 8 }, (_, x) => ({ x, y: 0 })) },
    };
    expect(world.place(second.ownerId, outerAction).ok).toBe(true);
    expect(world.getPlayer(second.ownerId)?.sectors).toBe(0);
    await world.stop();
  });

  it('玩家颜色由服务端拒绝过暗值并持久化有效值', async () => {
    const world = new LifeWorld({ save: async () => undefined }, null);
    const player = world.connectPlayer('color-account-0001', '调色者').player;
    expect(world.setPlayerColor(player.ownerId, '#071012')).toEqual({ ok: false, error: '颜色过暗或格式无效，请选择更明亮的颜色' });
    expect(world.setPlayerColor(player.ownerId, '#58D8B4')).toMatchObject({ ok: true, player: { color: '#58d8b4' } });
    expect(world.getMeta().playerColors).toContainEqual({ ownerId: player.ownerId, color: '#58d8b4' });
    await world.stop();
  });

  it('版本 1 存档中的旧能量上限迁移为 1,000', async () => {
    const owners = new Uint16Array(256 * 256);
    const ages = new Uint8Array(256 * 256);
    owners[0] = 1;
    ages[0] = 1;
    const state: StoredWorldState = {
      version: 1,
      width: 256,
      height: 256,
      tick: 1,
      nextOwnerId: 2,
      ownersBase64: Buffer.from(owners.buffer).toString('base64'),
      agesBase64: Buffer.from(ages.buffer).toString('base64'),
      players: [{
        ownerId: 1,
        clientId: 'legacy-client-1',
        name: '旧玩家',
        color: '#51d6b1',
        connected: false,
        energy: 17,
        score: 0,
        births: 0,
        population: 0,
        peakPopulation: 0,
        sectors: 0,
        lastSeenAt: Date.now(),
      }],
      season: {
        id: 1,
        startedAt: Date.now(),
        challenge: { type: 'births', title: '旧目标', target: 100, progress: 0, completed: false },
      },
      sectorOwners: [],
      hallOfFame: [],
    };
    const world = new LifeWorld({ save: async () => undefined }, state);
    expect(world.getPlayer(1)?.energy).toBe(1_000);
    expect(decodeWorldSnapshot(world.getSnapshot()).owners[CLAIMABLE_MIN_Y * WORLD_WIDTH + CLAIMABLE_MIN_X]).toBe(1);
    await world.stop();
  });
});

function placementAt(index: number, mode: PlacementAction['mode']): PlacementAction {
  return {
    mode,
    x: index % WORLD_WIDTH,
    y: Math.floor(index / WORLD_WIDTH),
    patternId: 'cell',
    rotation: 0,
    flipped: false,
    brushSize: 1,
  };
}

function findEmptyIndex(owners: Uint16Array): number {
  const index = owners.findIndex((ownerId) => ownerId === 0);
  if (index < 0) throw new Error('测试世界没有空格');
  return index;
}

function findEmptyArea(owners: Uint16Array, size: number): number {
  for (let y = CLAIMABLE_MIN_Y + 20; y < CLAIMABLE_MAX_Y - size - 20; y += 1) {
    for (let x = CLAIMABLE_MIN_X + 20; x < CLAIMABLE_MAX_X - size - 20; x += 1) {
      let empty = true;
      for (let offsetY = 0; offsetY < size && empty; offsetY += 1) {
        for (let offsetX = 0; offsetX < size; offsetX += 1) {
          if (owners[(y + offsetY) * WORLD_WIDTH + x + offsetX] !== 0) {
            empty = false;
            break;
          }
        }
      }
      if (empty) return y * WORLD_WIDTH + x;
    }
  }
  throw new Error('测试世界没有足够的空白区域');
}

function storedPlayer(ownerId: number, accountId: string, name: string): StoredPlayer {
  return {
    ownerId,
    accountId,
    name,
    color: ownerId === 1 ? '#51d6b1' : '#f2b84b',
    connected: false,
    energy: 1_000,
    score: 0,
    births: 0,
    population: 0,
    peakPopulation: 0,
    sectors: 0,
    fullyOccupiedSectors: 0,
    lastSeenAt: Date.now(),
  };
}
