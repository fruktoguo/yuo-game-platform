import { performance } from 'node:perf_hooks';
import { encodeWorldPatch } from '../src/shared/binary';
import { WORLD_CELL_COUNT, WORLD_HEIGHT, WORLD_WIDTH } from '../src/shared/constants';
import { evolveGeneration } from '../src/server/lifeRules';

let owners = new Uint16Array(WORLD_CELL_COUNT);
let ages = new Uint8Array(WORLD_CELL_COUNT);
let nextOwners = new Uint16Array(WORLD_CELL_COUNT);
let nextAges = new Uint8Array(WORLD_CELL_COUNT);
const populations = new Uint32Array(65_536);
const births = new Uint32Array(65_536);
const elders = new Uint32Array(65_536);
let randomState = 0x2f6e2b1;

for (let index = 0; index < owners.length; index += 1) {
  randomState = (randomState * 1_664_525 + 1_013_904_223) >>> 0;
  if (randomState / 0x1_0000_0000 > 0.82) owners[index] = index % 32 + 1;
  ages[index] = owners[index] === 0 ? 0 : 1;
}

const generations = 300;
let totalPatchBytes = 0;
const startedAt = performance.now();
for (let generation = 0; generation < generations; generation += 1) {
  const result = evolveGeneration(owners, ages, WORLD_WIDTH, WORLD_HEIGHT, {
    nextOwners,
    nextAges,
    populations,
    births,
    elders,
  });
  totalPatchBytes += encodeWorldPatch(generation, result.changes).byteLength;
  [owners, nextOwners] = [nextOwners, owners];
  [ages, nextAges] = [nextAges, ages];
}
const elapsed = performance.now() - startedAt;
const average = elapsed / generations;
const budgetUsage = average / 200 * 100;

console.log(`世界尺寸：${WORLD_WIDTH} × ${WORLD_HEIGHT}`);
console.log(`连续演化：${generations} 代 / ${elapsed.toFixed(1)} ms`);
console.log(`平均耗时：${average.toFixed(3)} ms/代，使用 5Hz 单代预算的 ${budgetUsage.toFixed(2)}%`);
console.log(`平均增量：${(totalPatchBytes / generations / 1024).toFixed(2)} KiB/代`);

if (average > 80) throw new Error('世界演化性能低于部署预算');
