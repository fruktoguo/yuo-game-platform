import { describe, expect, it } from 'vitest';
import {
  decodeWorldPatch,
  decodeWorldSnapshot,
  encodeWorldPatch,
  encodeWorldSnapshot,
} from '../src/shared/binary';
import { WORLD_CELL_COUNT } from '../src/shared/constants';

describe('世界二进制协议', () => {
  it('完整快照可以无损往返', () => {
    const owners = new Uint16Array([0, 1, 65_535, 42]);
    const ages = new Uint8Array([0, 2, 255, 19]);
    const decoded = decodeWorldSnapshot(encodeWorldSnapshot(2, 2, 91, owners, ages));
    expect(decoded.width).toBe(2);
    expect(decoded.height).toBe(2);
    expect(decoded.tick).toBe(91);
    expect([...decoded.owners]).toEqual([...owners]);
    expect([...decoded.ages]).toEqual([...ages]);
  });

  it('增量协议支持世界最后一个格子', () => {
    const changes = [
      { index: 0, ownerId: 3, age: 1 },
      { index: WORLD_CELL_COUNT - 1, ownerId: 65_535, age: 255 },
    ];
    expect(decodeWorldPatch(encodeWorldPatch(17, changes))).toEqual({ tick: 17, changes });
  });

  it('拒绝尺寸不匹配的快照', () => {
    expect(() => encodeWorldSnapshot(2, 2, 0, new Uint16Array(3), new Uint8Array(4))).toThrow('数组长度不匹配');
  });
});
