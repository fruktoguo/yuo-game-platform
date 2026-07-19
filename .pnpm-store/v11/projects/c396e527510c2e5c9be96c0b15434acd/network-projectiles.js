(function installProjectileRuntime(root) {
  function angleDelta(from, to) {
    let delta = (to - from + Math.PI) % (Math.PI * 2) - Math.PI;
    if (delta < -Math.PI) delta += Math.PI * 2;
    return delta;
  }

  function rotateToward(from, to, maximum) {
    const delta = angleDelta(from, to);
    return from + Math.max(-maximum, Math.min(maximum, delta));
  }

  class ProjectileRuntime {
    constructor(gridSize) {
      this.gridSize = gridSize;
      this.byId = new Map();
      this.items = [];
    }

    clear() {
      this.byId.clear();
      this.items.length = 0;
    }

    reset(states) {
      this.clear();
      for (const state of states || []) this.upsert(state);
    }

    applyEvents(events) {
      for (const event of events || []) {
        if (event?.type === "spawn" || event?.type === "update") this.upsert(event.projectile);
        else if (event?.type === "destroy") this.remove(event.id);
      }
    }

    upsert(state) {
      if (!state || !Number.isFinite(state.id)) return null;
      let projectile = this.byId.get(state.id);
      if (!projectile) {
        projectile = { id: state.id, listIndex: this.items.length, col: state.col, row: state.row };
        this.byId.set(state.id, projectile);
        this.items.push(projectile);
      } else {
        projectile.col = state.col;
        projectile.row = state.row;
      }
      projectile.vxCells = state.vx;
      projectile.vyCells = state.vy;
      projectile.speedCells = Math.hypot(state.vx, state.vy);
      projectile.color = state.color;
      projectile.baseSize = state.size;
      projectile.size = state.size;
      projectile.homing = state.homing || 0;
      projectile.targetId = state.targetId ?? null;
      projectile.bounces = state.bounces || 0;
      return projectile;
    }

    remove(id) {
      const projectile = this.byId.get(id);
      if (!projectile) return;
      const last = this.items.pop();
      if (last && last !== projectile) {
        this.items[projectile.listIndex] = last;
        last.listIndex = projectile.listIndex;
      }
      this.byId.delete(id);
    }

    update(delta, targetById, arena) {
      const dt = Math.max(0, Math.min(0.05, delta));
      const worldMinimum = Number.isFinite(arena.worldMin) ? arena.worldMin : 0;
      const worldMaximum = Number.isFinite(arena.worldMax) ? arena.worldMax : this.gridSize - 1;
      const minimum = worldMinimum - 0.5;
      const maximum = worldMaximum + 0.5;
      for (const projectile of this.items) {
        const target = projectile.targetId === null ? null : targetById(projectile.targetId);
        if (projectile.homing > 0 && target) {
          const current = Math.atan2(projectile.vyCells, projectile.vxCells);
          const desired = Math.atan2(target.row - projectile.row, target.col - projectile.col);
          const angle = rotateToward(current, desired, projectile.homing * dt);
          projectile.vxCells = Math.cos(angle) * projectile.speedCells;
          projectile.vyCells = Math.sin(angle) * projectile.speedCells;
        }

        projectile.col += projectile.vxCells * dt;
        projectile.row += projectile.vyCells * dt;
        const hitHorizontal = projectile.col < minimum || projectile.col > maximum;
        const hitVertical = projectile.row < minimum || projectile.row > maximum;
        if ((hitHorizontal || hitVertical) && projectile.bounces > 0) {
          projectile.col = Math.max(minimum, Math.min(maximum, projectile.col));
          projectile.row = Math.max(minimum, Math.min(maximum, projectile.row));
          if (hitHorizontal) projectile.vxCells *= -1;
          if (hitVertical) projectile.vyCells *= -1;
          projectile.bounces -= 1;
          projectile.targetId = null;
        }

        projectile.x = arena.left + (projectile.col - worldMinimum + 0.5) * arena.cellSize;
        projectile.y = arena.top + (projectile.row - worldMinimum + 0.5) * arena.cellSize;
        projectile.vx = projectile.vxCells * arena.cellSize;
        projectile.vy = projectile.vyCells * arena.cellSize;
        projectile.size = projectile.baseSize * (arena.baseCellSize ? arena.cellSize / arena.baseCellSize : 1);
      }
    }
  }

  root.GSS0ProjectileRuntime = Object.freeze({
    create(gridSize) {
      return new ProjectileRuntime(gridSize);
    },
  });
})(globalThis);
