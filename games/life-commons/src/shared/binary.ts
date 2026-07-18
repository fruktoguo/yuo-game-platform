const FULL_MAGIC = 0x4c_43_46_31;
const PATCH_MAGIC_V1 = 0x4c_43_50_31;
const PATCH_MAGIC_V2 = 0x4c_43_50_32;
const FULL_HEADER_BYTES = 16;
const PATCH_HEADER_BYTES = 12;
const PATCH_V1_RECORD_BYTES = 5;
const PATCH_V2_RECORD_BYTES = 7;

export interface DecodedWorldSnapshot {
  width: number;
  height: number;
  tick: number;
  owners: Uint16Array;
  ages: Uint8Array;
}

export interface CellPatch {
  index: number;
  ownerId: number;
  age: number;
}

export interface DecodedWorldPatch {
  tick: number;
  changes: CellPatch[];
}

export function encodeWorldSnapshot(width: number, height: number, tick: number, owners: Uint16Array, ages: Uint8Array): ArrayBuffer {
  const count = width * height;
  if (owners.length !== count || ages.length !== count) throw new Error('世界快照数组长度不匹配');
  const buffer = new ArrayBuffer(FULL_HEADER_BYTES + count * 3);
  const view = new DataView(buffer);
  view.setUint32(0, FULL_MAGIC);
  view.setUint16(4, width, true);
  view.setUint16(6, height, true);
  view.setUint32(8, tick, true);
  view.setUint32(12, count, true);
  let offset = FULL_HEADER_BYTES;
  for (let index = 0; index < count; index += 1) {
    view.setUint16(offset, owners[index], true);
    view.setUint8(offset + 2, ages[index]);
    offset += 3;
  }
  return buffer;
}

export function decodeWorldSnapshot(buffer: ArrayBuffer): DecodedWorldSnapshot {
  const view = new DataView(buffer);
  if (view.byteLength < FULL_HEADER_BYTES || view.getUint32(0) !== FULL_MAGIC) throw new Error('世界快照格式无效');
  const width = view.getUint16(4, true);
  const height = view.getUint16(6, true);
  const tick = view.getUint32(8, true);
  const count = view.getUint32(12, true);
  if (count !== width * height || view.byteLength !== FULL_HEADER_BYTES + count * 3) throw new Error('世界快照尺寸无效');
  const owners = new Uint16Array(count);
  const ages = new Uint8Array(count);
  let offset = FULL_HEADER_BYTES;
  for (let index = 0; index < count; index += 1) {
    owners[index] = view.getUint16(offset, true);
    ages[index] = view.getUint8(offset + 2);
    offset += 3;
  }
  return { width, height, tick, owners, ages };
}

export function encodeWorldPatch(tick: number, changes: readonly CellPatch[]): ArrayBuffer {
  const buffer = new ArrayBuffer(PATCH_HEADER_BYTES + changes.length * PATCH_V2_RECORD_BYTES);
  const view = new DataView(buffer);
  view.setUint32(0, PATCH_MAGIC_V2);
  view.setUint32(4, tick, true);
  view.setUint32(8, changes.length, true);
  let offset = PATCH_HEADER_BYTES;
  for (const change of changes) {
    view.setUint32(offset, change.index, true);
    view.setUint16(offset + 4, change.ownerId, true);
    view.setUint8(offset + 6, change.age);
    offset += PATCH_V2_RECORD_BYTES;
  }
  return buffer;
}

export function decodeWorldPatch(buffer: ArrayBuffer): DecodedWorldPatch {
  const view = new DataView(buffer);
  if (view.byteLength < PATCH_HEADER_BYTES) throw new Error('世界增量格式无效');
  const magic = view.getUint32(0);
  if (magic !== PATCH_MAGIC_V1 && magic !== PATCH_MAGIC_V2) throw new Error('世界增量格式无效');
  const tick = view.getUint32(4, true);
  const count = view.getUint32(8, true);
  const recordBytes = magic === PATCH_MAGIC_V2 ? PATCH_V2_RECORD_BYTES : PATCH_V1_RECORD_BYTES;
  if (view.byteLength !== PATCH_HEADER_BYTES + count * recordBytes) throw new Error('世界增量尺寸无效');
  const changes: CellPatch[] = new Array(count);
  let offset = PATCH_HEADER_BYTES;
  for (let index = 0; index < count; index += 1) {
    changes[index] = {
      index: magic === PATCH_MAGIC_V2 ? view.getUint32(offset, true) : view.getUint16(offset, true),
      ownerId: view.getUint16(offset + (magic === PATCH_MAGIC_V2 ? 4 : 2), true),
      age: view.getUint8(offset + (magic === PATCH_MAGIC_V2 ? 6 : 4)),
    };
    offset += recordBytes;
  }
  return { tick, changes };
}
