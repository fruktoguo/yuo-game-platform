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

  function closestPointOnSegment(point, start, end) {
    const deltaCol = end.col - start.col;
    const deltaRow = end.row - start.row;
    const lengthSquared = deltaCol * deltaCol + deltaRow * deltaRow;
    const progress = lengthSquared > 0.000001
      ? Math.max(0, Math.min(1, ((point.col - start.col) * deltaCol + (point.row - start.row) * deltaRow) / lengthSquared))
      : 0;
    return {
      col: start.col + deltaCol * progress,
      row: start.row + deltaRow * progress
    };
  }

  function bodyConnectionContact(point, snake, rangeSquared, firstSegmentIndex = 0) {
    for (let index = firstSegmentIndex; index < (snake.segments || []).length; index += 1) {
      const segment = snake.segments[index];
      const previous = index > 0 ? snake.segments[index - 1] : snake;
      const contactPoint = closestPointOnSegment(point, previous, segment);
      if (distanceSquared(point, contactPoint) < rangeSquared) {
        return { point: contactPoint, segment, segmentIndex: index };
      }
    }
    return null;
  }

  function contactWithSnake(head, snake, headRangeSquared, bodyRangeSquared) {
    if (distanceSquared(head, snake) < headRangeSquared) return { point: snake, part: "head" };
    const contact = bodyConnectionContact(head, snake, bodyRangeSquared);
    return contact ? { point: contact.point, part: "body", segmentIndex: contact.segmentIndex } : null;
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
    const enemyBodyRangeSquared = (options.enemyBodyRange || options.bodyRange) ** 2;
    const playerHeadRangeSquared = options.playerHeadRange * options.playerHeadRange;
    const enemyHeadRangeSquared = options.enemyHeadRange * options.enemyHeadRange;

    if (player.collisionCooldown <= 0) {
      const selfContact = bodyConnectionContact(player, player, options.selfRange * options.selfRange, 2);
      if (selfContact) return { kind: "self", point: selfContact.point };
    }

    if (player.protectedState || player.invulnerable > 0) {
      for (const enemy of enemies || []) {
        if (enemy.dead) continue;
        const contact = contactWithSnake(enemy, player, enemyHeadRangeSquared, enemyBodyRangeSquared);
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
      if (other === player || other.isSelf || other.ghost || !other.protectedState || player.collisionCooldown > 0) continue;
      const contact = contactWithSnake(player, other, playerHeadRangeSquared, bodyRangeSquared);
      if (contact?.part === "body") {
        return { kind: "player-body", targetId: other.entityId, segmentIndex: contact.segmentIndex, point: contact.point };
      }
      if (contact) return { kind: "protected-player", targetId: other.entityId, point: contact.point };
    }

    if (player.invulnerable <= 0 && player.collisionCooldown <= 0) {
      for (const enemy of enemies || []) {
        if (enemy.dead) continue;
        for (let index = 0; index < enemy.segments.length; index += 1) {
          if (distanceSquared(player, enemy.segments[index]) < bodyRangeSquared) {
            return { kind: "enemy-body", targetId: enemy.id, segmentIndex: index, point: enemy.segments[index] };
          }
        }
      }
      for (const other of players || []) {
        if (other === player || other.isSelf || other.ghost || other.protectedState) continue;
        if (distanceSquared(player, other) >= playerHeadRangeSquared) {
          const contact = bodyConnectionContact(player, other, bodyRangeSquared);
          if (contact) {
            return { kind: "player-body", targetId: other.entityId, segmentIndex: contact.segmentIndex, point: contact.point };
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
        if (other === player || other.isSelf || other.ghost || other.collisionCooldown > 0 || distanceSquared(player, other) >= playerHeadRangeSquared) continue;
        return { kind: "player-head", targetId: other.entityId, ...normalBetween(player, other) };
      }
    }

    for (const enemy of enemies || []) {
      if (enemy.dead) continue;
      const contact = bodyConnectionContact(enemy, player, enemyBodyRangeSquared);
      if (contact) {
        return {
          kind: "enemy-hit-body",
          targetId: enemy.id,
          segmentIndex: contact.segmentIndex,
          point: contact.point,
          ...normalBetween(contact.point, enemy)
        };
      }
    }
    return null;
  }

  root.GSS0PlayerCollisions = Object.freeze({ detect });
})(globalThis);
