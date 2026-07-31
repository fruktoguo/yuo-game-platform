(function attachPlayerStateCodec(root) {
  "use strict";

  const MAGIC = 0x4753;
  const VERSION = 2;
  const HEADER_BYTES = 46;
  const SEGMENT_BYTES = 4;
  const MAX_SEGMENTS = 512;
  const SEGMENT_COORDINATE_SCALE = 128;

  function encode(sequence, player) {
    const segments = player?.segments || [];
    const segmentCount = Math.min(MAX_SEGMENTS, segments.length);
    const bytes = new Uint8Array(HEADER_BYTES + segmentCount * SEGMENT_BYTES);
    const view = new DataView(bytes.buffer);
    view.setUint16(0, MAGIC, true);
    view.setUint8(2, VERSION);
    view.setUint8(3, 0);
    view.setUint32(4, sequence, true);
    const values = [
      player.col,
      player.row,
      player.angle,
      player.desiredAngle,
      player.speed,
      player.knockbackX || 0,
      player.knockbackY || 0,
      player.collisionCooldown || 0,
      player.slow || 0
    ];
    for (let index = 0; index < values.length; index += 1) view.setFloat32(8 + index * 4, values[index], true);
    view.setUint16(44, segmentCount, true);
    let offset = HEADER_BYTES;
    for (let index = 0; index < segmentCount; index += 1) {
      const segment = segments[index];
      view.setInt16(offset, fixedCoordinate(segment.col), true);
      view.setInt16(offset + 2, fixedCoordinate(segment.row), true);
      offset += SEGMENT_BYTES;
    }
    return bytes;
  }

  function fixedCoordinate(value) {
    return Math.max(-32768, Math.min(32767, Math.round(value * SEGMENT_COORDINATE_SCALE)));
  }

  root.GSS0PlayerStateCodec = Object.freeze({ version: VERSION, encode });
})(globalThis);
