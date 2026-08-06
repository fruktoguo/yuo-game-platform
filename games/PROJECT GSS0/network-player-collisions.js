(function attachPlayerCollisions(root) {
  "use strict";

  const arenaGeometry = root.GSS0ArenaGeometry;
  if (!arenaGeometry) throw new Error("PROJECT GSS0 circular arena geometry is not loaded");

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

  function enemyHeadContactRange(options, enemy, playerHeadRadius, dynamicEnemyHeadRadius) {
    return dynamicEnemyHeadRadius
      ? playerHeadRadius + Math.max(0, Number(options.enemyHeadRadius(enemy)) || 0)
      : options.enemyHeadRange;
  }

  function enemyBodyContactRange(options, enemy, segment, index, playerHeadRadius, dynamicEnemyBodyRadius) {
    return dynamicEnemyBodyRadius
      ? playerHeadRadius + Math.max(0, Number(options.enemyBodyRadius(enemy, segment, index)) || 0)
      : options.bodyRange;
  }

  function enemyHeadToPlayerBodyRange(options, enemy, playerBodyRadius, dynamicEnemyHeadRadius) {
    return dynamicEnemyHeadRadius
      ? playerBodyRadius + Math.max(0, Number(options.enemyHeadRadius(enemy)) || 0)
      : (options.enemyBodyRange || options.bodyRange);
  }

  function detect(player, enemies, players, options) {
    if (!player) return null;
    const wall = arenaGeometry.wallNormal(
      player.col,
      player.row,
      options.centerCol,
      options.centerRow,
      options.arenaRadius
    );
    if (wall) {
      return {
        kind: "wall",
        normalCol: wall.col,
        normalRow: wall.row
      };
    }

    const bodyRangeSquared = options.bodyRange * options.bodyRange;
    const playerHeadRangeSquared = options.playerHeadRange * options.playerHeadRange;
    const playerHeadRadius = Math.max(0, Number(options.playerHeadRadius) || 0);
    const playerBodyRadius = Math.max(0, Number(options.playerBodyRadius) || 0);
    const dynamicEnemyHeadRadius = typeof options.enemyHeadRadius === "function";
    const dynamicEnemyBodyRadius = typeof options.enemyBodyRadius === "function";

    if (player.collisionCooldown <= 0) {
      const selfContact = bodyConnectionContact(player, player, options.selfRange * options.selfRange, 2);
      if (selfContact) return { kind: "self", point: selfContact.point };
    }

    if (player.protectedState || player.invulnerable > 0) {
      for (const enemy of enemies || []) {
        if (enemy.dead) continue;
        const headRange = enemyHeadContactRange(options, enemy, playerHeadRadius, dynamicEnemyHeadRadius);
        const bodyRange = enemyHeadToPlayerBodyRange(options, enemy, playerBodyRadius, dynamicEnemyHeadRadius);
        const contact = contactWithSnake(enemy, player, headRange * headRange, bodyRange * bodyRange);
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
      if (contact) return { kind: "protected-player", targetId: other.entityId, point: contact.point };
    }

    if (player.invulnerable <= 0 && player.collisionCooldown <= 0) {
      for (const enemy of enemies || []) {
        if (enemy.dead) continue;
        for (let index = 0; index < enemy.segments.length; index += 1) {
          const segment = enemy.segments[index];
          const contactRange = enemyBodyContactRange(options, enemy, segment, index, playerHeadRadius, dynamicEnemyBodyRadius);
          if (distanceSquared(player, segment) < contactRange * contactRange) {
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
        const contactRange = enemyHeadContactRange(options, enemy, playerHeadRadius, dynamicEnemyHeadRadius);
        if (enemy.dead || enemy.collisionCooldown > 0 || distanceSquared(player, enemy) >= contactRange * contactRange) continue;
        return { kind: "enemy-head", targetId: enemy.id, ...normalBetween(player, enemy) };
      }
      for (const other of players || []) {
        if (other === player || other.isSelf || other.ghost || other.collisionCooldown > 0 || distanceSquared(player, other) >= playerHeadRangeSquared) continue;
        return { kind: "player-head", targetId: other.entityId, ...normalBetween(player, other) };
      }
    }

    for (const enemy of enemies || []) {
      if (enemy.dead || enemy.collisionCooldown > 0) continue;
      const contactRange = enemyHeadToPlayerBodyRange(options, enemy, playerBodyRadius, dynamicEnemyHeadRadius);
      const contact = bodyConnectionContact(enemy, player, contactRange * contactRange);
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
