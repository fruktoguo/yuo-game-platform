import { performance } from 'node:perf_hooks';
import { SIMULATION_HZ, SNAPSHOT_HZ } from '../src/shared/constants';
import type { ModuleId } from '../src/shared/modules';
import { encodeUltraSnapshot } from '../src/shared/snapshotCodec';
import { UltraWorld } from '../src/server/UltraWorld';

const PLAYER_COUNT = 12;
const SIMULATED_SECONDS = 180;
const accountsByEntity = new Map<number, string>();
let currentTime = 0;
let world: UltraWorld;

world = new UltraWorld({
  random: seededRandom(0x5eed_2026),
  callbacks: {
    onUpgrade: (entityId, offer) => {
      if (!offer) return;
      const accountId = accountsByEntity.get(entityId);
      if (accountId) world.chooseUpgrade(accountId, offer.options[0] as ModuleId, currentTime);
    },
  },
});

const sequences = Array.from({ length: PLAYER_COUNT }, () => 0);
for (let index = 0; index < PLAYER_COUNT; index += 1) {
  const accountId = `benchmark-${index}`;
  const player = world.connectPlayer(accountId, `压力玩家${index + 1}`, 0);
  if (!player) throw new Error(`第 ${index + 1} 名压力玩家接入失败`);
  accountsByEntity.set(player.entityId, accountId);
  if (!world.spawn(accountId, 0)) throw new Error(`第 ${index + 1} 名压力玩家出生失败`);
}

let peakEnemies = 0;
let peakFoods = 0;
let peakProjectiles = 0;
let peakHazards = 0;
let peakJsonSnapshotBytes = 0;
let peakBinarySnapshotBytes = 0;
let peakLevel = 0;
let peakSegments = 0;
let forcedFoodId = 40_000;
let snapshotAccumulator = SIMULATION_HZ;
const startedAt = performance.now();
const stepSeconds = 1 / SIMULATION_HZ;
const benchmarkPlayers = Reflect.get(world, 'playersByAccount') as Map<string, {
  invulnerable: number;
  upgradePending: boolean;
  growth: unknown;
  growthQueue: unknown[];
}>;
const benchmarkFoods = Reflect.get(world, 'foods') as Array<{
  id: number;
  col: number;
  row: number;
  color: string;
  phase: number;
  pullTimer: number;
  special: boolean;
  isPulled: boolean;
}>;

for (let tick = 1; tick <= SIMULATED_SECONDS * SIMULATION_HZ; tick += 1) {
  currentTime = tick * stepSeconds * 1_000;
  const frame = world.getSnapshot(currentTime);
  for (const player of benchmarkPlayers.values()) player.invulnerable = 1;
  if (tick % SIMULATION_HZ === 0) {
    for (const player of frame.players) {
      if (!player.alive || player.choosingUpgrade) continue;
      const accountId = accountsByEntity.get(player.entityId);
      const internal = accountId ? benchmarkPlayers.get(accountId) : null;
      if (!internal || internal.upgradePending || internal.growth || internal.growthQueue.length > 0) continue;
      benchmarkFoods.push({
        id: forcedFoodId++, col: player.col, row: player.row, color: '#b8f53f',
        phase: 0, pullTimer: 1, special: false, isPulled: false,
      });
    }
  }
  for (let index = 0; index < PLAYER_COUNT; index += 1) {
    const accountId = `benchmark-${index}`;
    const roster = world.getRoster().find((player) => player.name === `压力玩家${index + 1}`);
    if (!roster?.alive) {
      world.spawn(accountId, currentTime);
      continue;
    }
    const orbit = tick * 0.009 + index * Math.PI * 2 / PLAYER_COUNT;
    world.applyInput(accountId, { sequence: ++sequences[index], desiredAngle: orbit });
  }
  world.step(stepSeconds, currentTime);
  snapshotAccumulator += SNAPSHOT_HZ;
  if (snapshotAccumulator < SIMULATION_HZ) continue;
  snapshotAccumulator -= SIMULATION_HZ;
  const snapshot = world.getSnapshot(currentTime);
  peakEnemies = Math.max(peakEnemies, snapshot.enemies.length + snapshot.pendingSpawns.length);
  peakFoods = Math.max(peakFoods, snapshot.foods.length);
  peakProjectiles = Math.max(peakProjectiles, snapshot.projectiles.length);
  peakHazards = Math.max(peakHazards, snapshot.hazards.length);
  peakLevel = Math.max(peakLevel, ...snapshot.players.map((player) => player.level));
  peakSegments = Math.max(peakSegments, snapshot.players.reduce((total, player) => total + player.segments.length, 0));
  peakJsonSnapshotBytes = Math.max(peakJsonSnapshotBytes, Buffer.byteLength(JSON.stringify(snapshot)));
  peakBinarySnapshotBytes = Math.max(peakBinarySnapshotBytes, encodeUltraSnapshot(snapshot).byteLength);
}

const elapsedMs = performance.now() - startedAt;
const realtimeCpuPercent = elapsedMs / (SIMULATED_SECONDS * 1_000) * 100;
console.log(JSON.stringify({
  players: PLAYER_COUNT,
  simulatedSeconds: SIMULATED_SECONDS,
  elapsedMs: Number(elapsedMs.toFixed(1)),
  realtimeCpuPercent: Number(realtimeCpuPercent.toFixed(2)),
  forcedProgression: true,
  peakLevel,
  peakSegments,
  peakEnemies,
  peakFoods,
  peakProjectiles,
  peakHazards,
  peakJsonSnapshotBytes,
  peakBinarySnapshotBytes,
  compressionRatio: Number((peakBinarySnapshotBytes / peakJsonSnapshotBytes).toFixed(3)),
  peakFullRoomEgressMbps: Number((peakBinarySnapshotBytes * SNAPSHOT_HZ * PLAYER_COUNT * 8 / 1_000_000).toFixed(2)),
}, null, 2));

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}
