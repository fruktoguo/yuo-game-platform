import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 32;
const COST = 32_768;
const BLOCK_SIZE = 8;
const PARALLELISM = 1;
const MAX_MEMORY = 64 * 1024 * 1024;

export async function hashRoomPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt, KEY_LENGTH);
  return `scrypt$${COST}$${BLOCK_SIZE}$${PARALLELISM}$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export async function verifyRoomPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, costText, blockText, parallelText, saltText, keyText, extra] = encoded.split('$');
  if (algorithm !== 'scrypt' || extra !== undefined) return false;
  if (Number(costText) !== COST || Number(blockText) !== BLOCK_SIZE || Number(parallelText) !== PARALLELISM) return false;
  if (!saltText || !keyText) return false;
  try {
    const expected = Buffer.from(keyText, 'base64url');
    const actual = await deriveKey(password, Buffer.from(saltText, 'base64url'), expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function deriveKey(password: string, salt: Buffer, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, length, {
      N: COST,
      r: BLOCK_SIZE,
      p: PARALLELISM,
      maxmem: MAX_MEMORY,
    }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}
