(function installProjectileRuntime(root) {
  const arenaGeometry = root.GSS0ArenaGeometry;
  if (!arenaGeometry) throw new Error("PROJECT GSS0 circular arena geometry is not loaded");
  const designerBalance = root.GSS0_DESIGNER_CONFIG?.balance || {};
  const bladeOrbitSpeed = Number.isFinite(designerBalance.moduleBladeOrbitSpeed) ? designerBalance.moduleBladeOrbitSpeed : 0.6;
  const bladeOrbitRadius = Number.isFinite(designerBalance.moduleBladeOrbitRadiusCells) ? designerBalance.moduleBladeOrbitRadiusCells : 2;
  const bladeConvergeSpeed = Number.isFinite(designerBalance.moduleBladeOrbitConvergeSpeedCellsPerSecond)
    ? designerBalance.moduleBladeOrbitConvergeSpeedCellsPerSecond
    : 8;

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
      projectile.kind = state.kind === "blade" ? "blade" : "shot";
      projectile.ownerEntityId = state.ownerEntityId;
      projectile.vxCells = state.vx;
      projectile.vyCells = state.vy;
      projectile.speedCells = Math.hypot(state.vx, state.vy);
      projectile.color = state.color;
      projectile.baseSize = state.size;
      projectile.size = state.size;
      projectile.homing = state.homing || 0;
      projectile.targetId = state.targetId ?? null;
      projectile.targetSegmentIndex = Number.isInteger(state.targetSegmentIndex) ? state.targetSegmentIndex : -1;
      projectile.bounces = state.bounces || 0;
      if (projectile.kind === "blade") {
        projectile.orbitStartedAt = Number(state.orbitStartedAt) || 0;
        projectile.orbitStartAngle = Number(state.orbitStartAngle) || 0;
        projectile.orbitStartRadius = Math.max(0, Number(state.orbitStartRadius) || 0);
        projectile.orbitAngle = projectile.orbitStartAngle;
      }
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

    update(delta, targetById, ownerById, arena, gameTime) {
      const dt = Math.max(0, Math.min(0.05, delta));
      const worldMinimum = Number.isFinite(arena.worldMin) ? arena.worldMin : 0;
      const centerCol = Number.isFinite(arena.centerCol) ? arena.centerCol : (this.gridSize - 1) * 0.5;
      const centerRow = Number.isFinite(arena.centerRow) ? arena.centerRow : (this.gridSize - 1) * 0.5;
      const radius = Number.isFinite(arena.boundaryRadius)
        ? arena.boundaryRadius
        : arenaGeometry.boundaryRadius(Number.isFinite(arena.worldSize) ? arena.worldSize : this.gridSize);
      for (const projectile of this.items) {
        if (projectile.kind === "blade") {
          const owner = ownerById(projectile.ownerEntityId);
          if (owner) {
            const previousCol = projectile.col;
            const previousRow = projectile.row;
            const elapsed = Math.max(0, (Number(gameTime) || 0) - projectile.orbitStartedAt);
            const maximumShift = bladeConvergeSpeed * elapsed;
            const radius = projectile.orbitStartRadius + Math.max(
              -maximumShift,
              Math.min(maximumShift, bladeOrbitRadius - projectile.orbitStartRadius)
            );
            const angle = projectile.orbitStartAngle + bladeOrbitSpeed * elapsed;
            projectile.orbitAngle = angle;
            projectile.col = owner.col + Math.cos(angle) * radius;
            projectile.row = owner.row + Math.sin(angle) * radius;
            if (dt > 0) {
              projectile.vxCells = (projectile.col - previousCol) / dt;
              projectile.vyCells = (projectile.row - previousRow) / dt;
            }
          }
        } else {
          const targetEntity = projectile.targetId === null ? null : targetById(projectile.targetId);
          const target = targetEntity && projectile.targetSegmentIndex >= 0
            ? targetEntity.segments?.[projectile.targetSegmentIndex] || targetEntity
            : targetEntity;
          if (projectile.homing > 0 && target) {
            const current = Math.atan2(projectile.vyCells, projectile.vxCells);
            const desired = Math.atan2(target.row - projectile.row, target.col - projectile.col);
            const angle = rotateToward(current, desired, projectile.homing * dt);
            projectile.vxCells = Math.cos(angle) * projectile.speedCells;
            projectile.vyCells = Math.sin(angle) * projectile.speedCells;
          }

          projectile.col += projectile.vxCells * dt;
          projectile.row += projectile.vyCells * dt;
          const constrained = arenaGeometry.constrainPoint(projectile.col, projectile.row, centerCol, centerRow, radius);
          if (constrained.collided && projectile.bounces !== 0) {
            projectile.col = constrained.col;
            projectile.row = constrained.row;
            const reflected = arenaGeometry.reflectVector(
              projectile.vxCells,
              projectile.vyCells,
              constrained.normalCol,
              constrained.normalRow
            );
            projectile.vxCells = reflected.col;
            projectile.vyCells = reflected.row;
            if (projectile.bounces > 0) projectile.bounces -= 1;
          }
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
