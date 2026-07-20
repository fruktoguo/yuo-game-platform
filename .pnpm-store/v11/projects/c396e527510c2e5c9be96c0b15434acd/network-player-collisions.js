(function attachPlayerCollisions(root) {
  "use strict";

  function distanceSquared(left, right) {
    const dx = left.col - right.col;
    const dy = left.row - right.row;
    return dx * dx + dy * dy;
  }

  function normalBetween(left, right) {
    let col = left.col - right.col;
    let row = left.row - right.row;
    if (Math.hypot(col, row) < 0.001) {
      col = Math.cos(left.angle || 0) - Math.cos(right.angle || 0);
      row = Math.sin(left.angle || 0) - Math.sin(right.angle || 0);
    }
    if (Math.hypot(col, row) < 0.001) {
      col = -Math.cos(left.angle || 0);
      row = -Math.sin(left.angle || 0);
    }
    return { normalCol: col, normalRow: row };
  }

  function contactWithSnake(head, snake, headRangeSquared, bodyRangeSquared) {
    if (distanceSquared(head, snake) < headRangeSquared) return { point: snake, part: "head" };
    for (let index = 0; index < (snake.segments || []).length; index += 1) {
      const segment = snake.segments[index];
      if (distanceSquared(head, segment) < bodyRangeSquared) return { point: segment, part: "body", segmentIndex: index };
    }
    return null;
  }

  function detect(player, enemies, players, options) {
    if (!player) return null;
    if (player.col < options.worldMin || player.col > options.worldMax || player.row < options.worldMin || player.row > options.worldMax) {
      return {
        kind: "wall",
        normalCol: player.col < options.worldMin ? 1 : player.col > options.worldMax ? -1 : 0,
        normalRow: player.row < options.worldMin ? 1 : player.row > options.worldMax ? -1 : 0
      };
    }

    const bodyRangeSquared = options.bodyRange * options.bodyRange;
    const playerHeadRangeSquared = options.playerHeadRange * options.playerHeadRange;
    const enemyHeadRangeSquared = options.enemyHeadRange * options.enemyHeadRange;

    if (player.collisionCooldown <= 0) {
      for (let index = 2; index < player.segments.length; index += 1) {
        if (distanceSquared(player, player.segments[index]) < options.selfRange * options.selfRange) {
          return { kind: "self", point: player.segments[index] };
        }
      }
    }

    if (player.protectedState || player.invulnerable > 0) {
      for (const enemy of enemies || []) {
        if (enemy.dead) continue;
        const contact = contactWithSnake(enemy, player, enemyHeadRangeSquared, bodyRangeSquared);
        if (contact) {
          return {
            kind: "enemy-protected",
            targetId: enemy.id,
            point: contact.point,
            ...normalBetween(contact.point, enemy)
          };
        }
      }
      return null;
    }

    for (const other of players || []) {
      if (other === player || other.isSelf || !other.protectedState || player.collisionCooldown > 0) continue;
      const contact = contactWithSnake(player, other, playerHeadRangeSquared, bodyRangeSquared);
      if (contact) return { kind: "protected-player", targetId: other.entityId, point: contact.point };
    }

    if (player.invulnerable <= 0) {
      for (const enemy of enemies || []) {
        if (enemy.dead) continue;
        for (let index = 0; index < enemy.segments.length; index += 1) {
          if (distanceSquared(player, enemy.segments[index]) < bodyRangeSquared) {
            return { kind: "enemy-body", targetId: enemy.id, segmentIndex: index, point: enemy.segments[index] };
          }
        }
      }
      for (const other of players || []) {
        if (other === player || other.isSelf || other.protectedState) continue;
        for (let index = 0; index < other.segments.length; index += 1) {
          if (distanceSquared(player, other.segments[index]) < bodyRangeSquared) {
            return { kind: "player-body", targetId: other.entityId, segmentIndex: index, point: other.segments[index] };
          }
        }
      }
    }

    if (player.collisionCooldown <= 0) {
      for (const enemy of enemies || []) {
        if (enemy.dead || enemy.collisionCooldown > 0 || distanceSquared(player, enemy) >= enemyHeadRangeSquared) continue;
        return { kind: "enemy-head", targetId: enemy.id, ...normalBetween(player, enemy) };
      }
      for (const other of players || []) {
        if (other === player || other.isSelf || other.collisionCooldown > 0 || distanceSquared(player, other) >= playerHeadRangeSquared) continue;
        return { kind: "player-head", targetId: other.entityId, ...normalBetween(player, other) };
      }
    }

    for (const enemy of enemies || []) {
      if (enemy.dead) continue;
      for (let index = 0; index < player.segments.length; index += 1) {
        const segment = player.segments[index];
        if (distanceSquared(enemy, segment) >= bodyRangeSquared) continue;
        return {
          kind: "enemy-hit-body",
          targetId: enemy.id,
          segmentIndex: index,
          point: segment,
          ...normalBetween(segment, enemy)
        };
      }
    }
    return null;
  }

  root.GSS0PlayerCollisions = Object.freeze({ detect });
})(globalThis);
