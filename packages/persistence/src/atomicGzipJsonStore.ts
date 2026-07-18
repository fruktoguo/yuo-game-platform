import { constants } from 'node:fs';
import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { gunzip, gzip } from 'node:zlib';
import { promisify } from 'node:util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export interface AtomicGzipJsonStoreOptions<T> {
  validate: (value: unknown) => value is T;
  compressionLevel?: number;
}

export class AtomicGzipJsonStore<T> {
  private saveChain: Promise<void> = Promise.resolve();

  constructor(
    private readonly path: string,
    private readonly options: AtomicGzipJsonStoreOptions<T>,
  ) {}

  async load(): Promise<T | null> {
    try {
      await access(this.path, constants.R_OK);
      const compressed = await readFile(this.path);
      const json = await gunzipAsync(compressed);
      const value: unknown = JSON.parse(json.toString('utf8'));
      if (!this.options.validate(value)) throw new Error(`存档格式无效：${this.path}`);
      return value;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  save(value: T): Promise<void> {
    this.saveChain = this.saveChain.catch(() => undefined).then(async () => {
      await mkdir(dirname(this.path), { recursive: true });
      const compressed = await gzipAsync(
        Buffer.from(JSON.stringify(value)),
        { level: this.options.compressionLevel ?? 6 },
      );
      const temporaryPath = `${this.path}.tmp`;
      await writeFile(temporaryPath, compressed, { mode: 0o600 });
      await rename(temporaryPath, this.path);
    });
    return this.saveChain;
  }
}
