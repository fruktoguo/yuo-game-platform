import type { GridPoint } from './protocol';

const MAGIC = 0x4753;
const VERSION = 1;
const HEADER_BYTES = 46;
const SEGMENT_BYTES = 12;
const MAX_SEGMENTS = 512;

export interface PlayerMovementSegment extends GridPoint {
  angle: number;
}

export interface PlayerMovementState extends GridPoint {
  sequence: number;
  angle: number;
  desiredAngle: number;
  speed: number;
  knockbackX: number;
  knockbackY: number;
  collisionCooldown: number;
  slow: number;
  segments: PlayerMovementSegment[];
}

export function encodePlayerMovementState(state: PlayerMovementState): Uint8Array {
  const segmentCount = Math.min(MAX_SEGMENTS, state.segments.length);
  const bytes = new Uint8Array(HEADER_BYTES + segmentCount * SEGMENT_BYTES);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, MAGIC, true);
  view.setUint8(2, VERSION);
  view.setUint8(3, 0);
  view.setUint32(4, state.sequence, true);
  const values = [
    state.col,
    state.row,
    state.angle,
    state.desiredAngle,
    state.speed,
    state.knockbackX,
    state.knockbackY,
    state.collisionCooldown,
    state.slow,
  ];
  for (let index = 0; index < values.length; index += 1) view.setFloat32(8 + index * 4, values[index], true);
  view.setUint16(44, segmentCount, true);
  let offset = HEADER_BYTES;
  for (let index = 0; index < segmentCount; index += 1) {
    const segment = state.segments[index];
    view.setFloat32(offset, segment.col, true);
    view.setFloat32(offset + 4, segment.row, true);
    view.setFloat32(offset + 8, segment.angle, true);
    offset += SEGMENT_BYTES;
  }
  return bytes;
}

export function decodePlayerMovementState(payload: ArrayBuffer | ArrayBufferView): PlayerMovementState {
  const bytes = payload instanceof ArrayBuffer
    ? new Uint8Array(payload)
    : new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength);
  if (bytes.byteLength < HEADER_BYTES) throw new Error('Player movement packet is incomplete');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint16(0, true) !== MAGIC || view.getUint8(2) !== VERSION) throw new Error('Player movement packet version is invalid');
  const segmentCount = view.getUint16(44, true);
  if (segmentCount > MAX_SEGMENTS || bytes.byteLength !== HEADER_BYTES + segmentCount * SEGMENT_BYTES) {
    throw new Error('Player movement packet length is invalid');
  }
  const state: PlayerMovementState = {
    sequence: view.getUint32(4, true),
    col: view.getFloat32(8, true),
    row: view.getFloat32(12, true),
    angle: view.getFloat32(16, true),
    desiredAngle: view.getFloat32(20, true),
    speed: view.getFloat32(24, true),
    knockbackX: view.getFloat32(28, true),
    knockbackY: view.getFloat32(32, true),
    collisionCooldown: view.getFloat32(36, true),
    slow: view.getFloat32(40, true),
    segments: [],
  };
  let offset = HEADER_BYTES;
  for (let index = 0; index < segmentCount; index += 1) {
    state.segments.push({
      col: view.getFloat32(offset, true),
      row: view.getFloat32(offset + 4, true),
      angle: view.getFloat32(offset + 8, true),
    });
    offset += SEGMENT_BYTES;
  }
  return state;
}
