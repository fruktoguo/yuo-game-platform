import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzip } from 'node:zlib';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import { AtomicGzipJsonStore } from '../src';

const gunzipAsync = promisify(gunzip);
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe('原子 gzip 存档', () => {
  it('串行保存并始终读取最后一个完整版本', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'game-platform-store-'));
    temporaryDirectories.push(directory);
    const path = join(directory, 'world.json.gz');
    const store = new AtomicGzipJsonStore<{ version: number; cells: number[] }>(path, {
      validate: (value): value is { version: number; cells: number[] } => Boolean(value && typeof value === 'object' && 'version' in value && 'cells' in value),
    });
    await Promise.all([
      store.save({ version: 1, cells: [1] }),
      store.save({ version: 2, cells: [1, 2] }),
      store.save({ version: 3, cells: [1, 2, 3] }),
    ]);
    expect(await store.load()).toEqual({ version: 3, cells: [1, 2, 3] });
    expect(JSON.parse((await gunzipAsync(await readFile(path))).toString('utf8'))).toEqual({ version: 3, cells: [1, 2, 3] });
  });

  it('不存在存档时返回 null', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'game-platform-store-'));
    temporaryDirectories.push(directory);
    const store = new AtomicGzipJsonStore(join(directory, 'missing.json.gz'), {
      validate: (_value): _value is Record<string, never> => true,
    });
    expect(await store.load()).toBeNull();
  });
});
