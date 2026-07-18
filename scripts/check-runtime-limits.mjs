import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const result = spawnSync('docker', ['compose', 'config', '--format', 'json'], {
  cwd: process.cwd(),
  encoding: 'utf8',
});
if (result.status !== 0) throw new Error(result.stderr || '无法读取 Docker Compose 配置');

const compose = JSON.parse(result.stdout);
const serviceNames = ['postgres', 'platform', 'life-commons', 'billiards-arena', 'neon-snake-arena'];
const maximumBytes = 2 * 1024 ** 3;
let totalBytes = 0;

for (const serviceName of serviceNames) {
  const configured = Number(compose.services?.[serviceName]?.mem_limit);
  assert.ok(Number.isSafeInteger(configured) && configured > 0, `${serviceName} 必须配置硬内存上限`);
  totalBytes += configured;
}

assert.ok(totalBytes <= maximumBytes, `整套游戏服务内存上限 ${(totalBytes / 1024 ** 3).toFixed(2)} GiB 超过 2 GiB`);
console.log(`运行内存硬上限合计：${(totalBytes / 1024 ** 3).toFixed(2)} GiB / 2.00 GiB`);
