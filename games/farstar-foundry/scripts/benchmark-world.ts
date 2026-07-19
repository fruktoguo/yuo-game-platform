import { performance } from 'node:perf_hooks';
import { MAX_OFFLINE_SECONDS, PRODUCTION_LINE_DEFINITIONS, RESOURCE_IDS } from '../src/shared/catalog';
import { advanceFactoryTo, createFactoryState, toFactorySync } from '../src/server/FactoryEngine';

const rooms = Array.from({ length: 100 }, (_, index) => {
  const state = createFactoryState(0);
  for (const resourceId of RESOURCE_IDS) state.resources[resourceId] = 6_000;
  for (const definition of PRODUCTION_LINE_DEFINITIONS) {
    const count = Math.min(2, definition.maxCount);
    state.lines[definition.id] = { count, active: definition.passive ? 0 : count, priority: 1 };
  }
  state.lines.warehouse = { count: 4, active: 0, priority: 1 };
  state.sequence = index + 1;
  return state;
});

const startedAt = performance.now();
for (const room of rooms) advanceFactoryTo(room, MAX_OFFLINE_SECONDS * 1_000);
const elapsed = performance.now() - startedAt;
const syncBytes = Buffer.byteLength(JSON.stringify(toFactorySync(rooms[0])));

console.log(`100 个房间补算 24 小时：${elapsed.toFixed(1)} ms`);
console.log(`单次常规同步载荷：${syncBytes} bytes`);

if (elapsed > 5_000) throw new Error(`离线补算耗时过高：${elapsed.toFixed(1)} ms`);
if (syncBytes > 4_000) throw new Error(`常规同步载荷过大：${syncBytes} bytes`);
