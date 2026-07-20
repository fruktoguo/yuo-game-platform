(function attachPlayerStateCodec(root) {
  "use strict";

  const MAGIC = 0x4753;
  const VERSION = 1;
  const HEADER_BYTES = 46;
  const SEGMENT_BYTES = 12;
  const MAX_SEGMENTS = 512;

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
      view.setFloat32(offset, segment.col, true);
      view.setFloat32(offset + 4, segment.row, true);
      view.setFloat32(offset + 8, segment.angle || 0, true);
      offset += SEGMENT_BYTES;
    }
    return bytes;
  }

  root.GSS0PlayerStateCodec = Object.freeze({ encode });
})(globalThis);
