import {
  Body,
  Box,
  ContactMaterial,
  GSSolver,
  Material,
  SAPBroadphase,
  Sphere,
  Vec3,
  World,
} from 'cannon-es';
import { randomUUID } from 'node:crypto';
import { createRackOrder, CUSHION, POCKETS, TABLE } from '../shared/geometry';
import type {
  BallInHandView,
  BallSnapshot,
  GameEvent,
  GameSnapshot,
  PlacementConstraint,
  PlayerGroup,
  ShotPayload,
} from '../shared/protocol';
import { evaluateShot, getBallGroup, type PocketRecord, type ShotFacts } from '../shared/rules';

const PHYSICS_HZ = 120;
const BROADCAST_HZ = 20;
const FIXED_STEP = 1 / PHYSICS_HZ;
const MAX_SHOT_SECONDS = 18;
const REST_SPEED = 0.018;
const REST_STEPS = 30;

interface ActiveShot {
  shooterId: string;
  breakShot: boolean;
  firstContact: number | null;
  pocketed: PocketRecord[];
  cuePocketed: boolean;
  railAfterContact: boolean;
  objectRailContacts: Set<number>;
  startedAt: number;
  spinX: number;
  spinY: number;
  directionX: number;
  directionZ: number;
  followApplied: boolean;
}

interface GameEngineCallbacks {
  onSnapshot: (snapshot: GameSnapshot, reliable: boolean) => void;
  onEvent: (event: GameEvent) => void;
  onStateChange: () => void;
  onFinished: (winnerId: string) => void;
}

export class GameEngine {
  private readonly world = new World({ gravity: new Vec3(0, 0, 0) });
  private readonly players: [string, string];
  private readonly callbacks: GameEngineCallbacks;
  private readonly ballBodies = new Map<number, Body>();
  private readonly bodyToBall = new Map<number, number>();
  private readonly railBodies = new Set<number>();
  private readonly pocketed = new Set<number>();
  private readonly lastPositions = new Map<number, { x: number; z: number }>();
  private readonly groups = new Map<string, PlayerGroup>();
  private currentPlayerIndex: 0 | 1;
  private breakerId: string;
  private phase: GameSnapshot['phase'] = 'placing';
  private turnNumber = 1;
  private sequence = 0;
  private tableOpen = true;
  private breakPending = true;
  private calledPocket: number | null = null;
  private ballInHand: BallInHandView | null = null;
  private winnerId: string | null = null;
  private status = '等待开球方放置母球';
  private activeShot: ActiveShot | null = null;
  private timer: NodeJS.Timeout | null = null;
  private restSteps = 0;
  private stepCounter = 0;
  private lastCollisionEventAt = 0;

  constructor(players: [string, string], breakerIndex: 0 | 1, callbacks: GameEngineCallbacks) {
    this.players = players;
    this.currentPlayerIndex = breakerIndex;
    this.breakerId = players[breakerIndex];
    this.callbacks = callbacks;
    this.groups.set(players[0], null);
    this.groups.set(players[1], null);
    this.configureWorld();
    this.rackBalls();
    this.ballInHand = {
      playerId: this.breakerId,
      constraint: 'kitchen',
      placed: false,
    };
  }

  get currentPlayerId(): string {
    return this.players[this.currentPlayerIndex];
  }

  getGroup(playerId: string): PlayerGroup {
    return this.groups.get(playerId) ?? null;
  }

  getRemaining(playerId: string): number {
    const group = this.getGroup(playerId);
    if (!group) return 7;
    let remaining = 0;
    for (let ball = 1; ball <= 15; ball += 1) {
      if (getBallGroup(ball) === group && !this.pocketed.has(ball)) remaining += 1;
    }
    return remaining;
  }

  getSnapshot(): GameSnapshot {
    this.sequence += 1;
    return {
      sequence: this.sequence,
      serverTime: Date.now(),
      phase: this.phase,
      turnNumber: this.turnNumber,
      currentPlayerId: this.currentPlayerId,
      breakerId: this.breakerId,
      tableOpen: this.tableOpen,
      calledPocket: this.calledPocket,
      ballInHand: this.ballInHand,
      balls: this.createBallSnapshots(),
      winnerId: this.winnerId,
      status: this.status,
    };
  }

  placeCue(playerId: string, x: number, z: number): string | null {
    if (this.phase !== 'placing' || this.ballInHand?.playerId !== playerId) return '当前不能放置母球';
    const invalidReason = this.validateCuePosition(x, z, this.ballInHand.constraint);
    if (invalidReason) return invalidReason;

    this.removeBallBody(0);
    const body = this.createBallBody(0, x, z);
    this.ballBodies.set(0, body);
    this.bodyToBall.set(body.id, 0);
    this.lastPositions.set(0, { x, z });
    this.pocketed.delete(0);
    this.ballInHand = { ...this.ballInHand, placed: true };
    this.phase = 'aiming';
    this.status = this.breakPending ? '开球方正在瞄准' : '母球已放置，可以击球';
    this.emitReliableState();
    return null;
  }

  callPocket(playerId: string, pocket: number): string | null {
    if (this.phase !== 'aiming' || this.currentPlayerId !== playerId) return '当前不能指定袋口';
    if (!this.canTargetEight(playerId)) return '清台后才能指定 8 号球袋口';
    if (!Number.isInteger(pocket) || pocket < 0 || pocket >= POCKETS.length) return '袋口编号无效';
    this.calledPocket = pocket;
    this.status = `已指定 ${pocket + 1} 号袋口`;
    this.emitReliableState();
    return null;
  }

  shoot(playerId: string, shot: ShotPayload): string | null {
    if (this.phase !== 'aiming' || this.currentPlayerId !== playerId) return '还未轮到你击球';
    const cue = this.ballBodies.get(0);
    if (!cue) return '请先放置母球';
    if (this.canTargetEight(playerId) && this.calledPocket === null) return '击打 8 号球前必须先指定袋口';
    if (![shot.angle, shot.power, shot.spinX, shot.spinY].every(Number.isFinite)) return '击球参数无效';

    const power = clamp(shot.power, 0.05, 1);
    const directionX = Math.cos(shot.angle);
    const directionZ = Math.sin(shot.angle);
    const speed = 0.55 + power * 4.55;
    cue.velocity.set(directionX * speed, 0, directionZ * speed);
    cue.angularVelocity.set(clamp(shot.spinY, -1, 1) * 42, clamp(shot.spinX, -1, 1) * 38, 0);
    cue.wakeUp();

    this.activeShot = {
      shooterId: playerId,
      breakShot: this.breakPending,
      firstContact: null,
      pocketed: [],
      cuePocketed: false,
      railAfterContact: false,
      objectRailContacts: new Set<number>(),
      startedAt: Date.now(),
      spinX: clamp(shot.spinX, -1, 1),
      spinY: clamp(shot.spinY, -1, 1),
      directionX,
      directionZ,
      followApplied: false,
    };
    this.phase = 'rolling';
    this.ballInHand = null;
    this.status = '球正在运动';
    this.restSteps = 0;
    this.stepCounter = 0;
    this.emitEvent({ type: 'shot', intensity: power });
    this.emitReliableState();
    this.startSimulation();
    return null;
  }

  forfeit(loserId: string, message = '对手离开，比赛结束'): void {
    if (this.phase === 'finished') return;
    this.stopSimulation();
    const winnerId = this.players.find((id) => id !== loserId);
    if (!winnerId) return;
    this.winnerId = winnerId;
    this.phase = 'finished';
    this.status = message;
    this.emitEvent({ type: 'win', message });
    this.emitReliableState();
    this.callbacks.onFinished(winnerId);
  }

  dispose(): void {
    this.stopSimulation();
  }

  private configureWorld(): void {
    this.world.broadphase = new SAPBroadphase(this.world);
    const solver = new GSSolver();
    solver.iterations = 12;
    this.world.solver = solver;
    this.world.allowSleep = false;

    const ballMaterial = new Material('ball');
    const cushionMaterial = new Material('cushion');
    this.world.defaultContactMaterial.friction = 0;
    this.world.defaultContactMaterial.restitution = 0.92;
    this.world.addContactMaterial(new ContactMaterial(ballMaterial, ballMaterial, {
      friction: 0.002,
      restitution: 0.94,
    }));
    this.world.addContactMaterial(new ContactMaterial(ballMaterial, cushionMaterial, {
      friction: 0.015,
      restitution: 0.82,
    }));

    this.addCushions(cushionMaterial);
    this.world.addEventListener('beginContact', (event: { bodyA: Body; bodyB: Body }) => {
      this.handleContact(event.bodyA, event.bodyB);
    });

    this.ballMaterial = ballMaterial;
  }

  private ballMaterial!: Material;

  private addCushions(material: Material): void {
    const halfWidth = TABLE.width / 2;
    const halfHeight = TABLE.height / 2;
    const thickness = TABLE.cushionThickness;
    const innerFaceInset = CUSHION.noseCenterInset + CUSHION.noseThickness / 2;
    const horizontalRailZ = halfHeight - innerFaceInset + thickness / 2;
    const verticalRailX = halfWidth - innerFaceInset + thickness / 2;

    const topSegmentLength = halfWidth - CUSHION.cornerGap - CUSHION.sideGap;
    const collisionSegmentLength = topSegmentLength - CUSHION.noseEndInset * 2;
    const leftSegmentCenter = -(CUSHION.sideGap + topSegmentLength / 2);
    const rightSegmentCenter = CUSHION.sideGap + topSegmentLength / 2;
    this.addRail(leftSegmentCenter, -horizontalRailZ, collisionSegmentLength, thickness, material);
    this.addRail(rightSegmentCenter, -horizontalRailZ, collisionSegmentLength, thickness, material);
    this.addRail(leftSegmentCenter, horizontalRailZ, collisionSegmentLength, thickness, material);
    this.addRail(rightSegmentCenter, horizontalRailZ, collisionSegmentLength, thickness, material);

    const sideSegmentLength = TABLE.height - CUSHION.cornerGap * 2 - CUSHION.noseEndInset * 2;
    this.addRail(-verticalRailX, 0, thickness, sideSegmentLength, material);
    this.addRail(verticalRailX, 0, thickness, sideSegmentLength, material);
  }

  private addRail(x: number, z: number, width: number, depth: number, material: Material): void {
    const body = new Body({ mass: 0, material });
    body.addShape(new Box(new Vec3(width / 2, TABLE.ballRadius, depth / 2)));
    body.position.set(x, TABLE.ballRadius, z);
    this.world.addBody(body);
    this.railBodies.add(body.id);
  }

  private rackBalls(): void {
    for (const body of this.ballBodies.values()) this.world.removeBody(body);
    this.ballBodies.clear();
    this.bodyToBall.clear();
    this.pocketed.clear();
    this.lastPositions.clear();

    const order = createRackOrder();
    const spacing = TABLE.ballRadius * 2.025;
    let orderIndex = 0;
    for (let row = 0; row < 5; row += 1) {
      const x = TABLE.footSpotX + row * spacing * Math.sqrt(3) / 2;
      for (let column = 0; column <= row; column += 1) {
        const z = (column - row / 2) * spacing;
        const number = order[orderIndex++];
        const body = this.createBallBody(number, x, z);
        this.ballBodies.set(number, body);
        this.bodyToBall.set(body.id, number);
        this.lastPositions.set(number, { x, z });
      }
    }
    this.lastPositions.set(0, { x: TABLE.headStringX - 0.25, z: 0 });
    this.pocketed.add(0);
  }

  private createBallBody(number: number, x: number, z: number): Body {
    const body = new Body({
      mass: TABLE.ballMass,
      material: this.ballMaterial,
      linearDamping: 0.34,
      angularDamping: 0.48,
      position: new Vec3(x, TABLE.ballRadius, z),
      shape: new Sphere(TABLE.ballRadius),
    });
    body.linearFactor.set(1, 0, 1);
    body.angularFactor.set(1, 1, 1);
    this.world.addBody(body);
    return body;
  }

  private startSimulation(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.simulateFrame(), 1000 / 60);
  }

  private stopSimulation(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  private simulateFrame(): void {
    if (!this.activeShot) {
      this.stopSimulation();
      return;
    }

    for (let substep = 0; substep < 2; substep += 1) {
      this.applyCueSpin();
      this.world.step(FIXED_STEP);
      this.detectPockets();
      this.capturePositions();
    }

    this.stepCounter += 1;
    if (this.stepCounter % Math.round(60 / BROADCAST_HZ) === 0) {
      this.callbacks.onSnapshot(this.getSnapshot(), false);
    }

    const maxSpeed = this.getMaxSpeed();
    this.restSteps = maxSpeed < REST_SPEED ? this.restSteps + 1 : 0;
    const elapsedSeconds = (Date.now() - this.activeShot.startedAt) / 1000;
    if (this.restSteps >= REST_STEPS || elapsedSeconds >= MAX_SHOT_SECONDS) {
      this.settleAllBalls();
      this.resolveShot();
    }
  }

  private applyCueSpin(): void {
    const shot = this.activeShot;
    const cue = this.ballBodies.get(0);
    if (!shot || !cue) return;

    if (shot.firstContact === null && Math.abs(shot.spinX) > 0.01) {
      const vx = cue.velocity.x;
      const vz = cue.velocity.z;
      const bend = shot.spinX * 0.16 * FIXED_STEP;
      cue.velocity.x = vx * Math.cos(bend) - vz * Math.sin(bend);
      cue.velocity.z = vx * Math.sin(bend) + vz * Math.cos(bend);
    }

    if (shot.firstContact !== null && !shot.followApplied && Math.abs(shot.spinY) > 0.01) {
      cue.velocity.x += shot.directionX * shot.spinY * 0.72;
      cue.velocity.z += shot.directionZ * shot.spinY * 0.72;
      shot.followApplied = true;
    }
  }

  private handleContact(bodyA: Body, bodyB: Body): void {
    const shot = this.activeShot;
    if (!shot) return;
    const ballA = this.bodyToBall.get(bodyA.id);
    const ballB = this.bodyToBall.get(bodyB.id);

    if (ballA !== undefined && ballB !== undefined) {
      if (shot.firstContact === null) {
        if (ballA === 0 && ballB !== 0) shot.firstContact = ballB;
        if (ballB === 0 && ballA !== 0) shot.firstContact = ballA;
      }
      const intensity = bodyA.velocity.vsub(bodyB.velocity).length();
      const now = Date.now();
      if (intensity > 0.18 && now - this.lastCollisionEventAt > 45) {
        this.lastCollisionEventAt = now;
        this.emitEvent({ type: 'collision', intensity: clamp(intensity / 4, 0.08, 1) });
      }
      return;
    }

    const rail = this.railBodies.has(bodyA.id) ? bodyA : this.railBodies.has(bodyB.id) ? bodyB : null;
    const ballBody = rail === bodyA ? bodyB : rail === bodyB ? bodyA : null;
    const ball = ballBody ? this.bodyToBall.get(ballBody.id) : undefined;
    if (!rail || ball === undefined) return;

    if (shot.firstContact !== null) {
      shot.railAfterContact = true;
      if (ball !== 0) shot.objectRailContacts.add(ball);
    }
    const intensity = ballBody!.velocity.length();
    if (intensity > 0.25) this.emitEvent({ type: 'cushion', intensity: clamp(intensity / 4, 0.05, 0.7) });
  }

  private detectPockets(): void {
    for (const [number, body] of [...this.ballBodies.entries()]) {
      const pocketIndex = POCKETS.findIndex((pocket) => {
        const radius = pocket.kind === 'corner' ? TABLE.cornerPocketRadius : TABLE.pocketRadius;
        return Math.hypot(body.position.x - pocket.x, body.position.z - pocket.z) < radius;
      });
      if (pocketIndex === -1 && Math.abs(body.position.x) <= TABLE.width / 2 + 0.08 && Math.abs(body.position.z) <= TABLE.height / 2 + 0.08) continue;

      const resolvedPocket = pocketIndex === -1 ? this.findNearestPocket(body.position.x, body.position.z) : pocketIndex;
      const pocket = POCKETS[resolvedPocket];
      this.lastPositions.set(number, { x: pocket.x, z: pocket.z });
      this.removeBallBody(number);
      this.pocketed.add(number);
      if (this.activeShot) {
        this.activeShot.pocketed.push({ ball: number, pocket: resolvedPocket });
        if (number === 0) this.activeShot.cuePocketed = true;
      }
      this.emitEvent({ type: 'pocket', ball: number, pocket: resolvedPocket, intensity: 1 });
    }
  }

  private findNearestPocket(x: number, z: number): number {
    let nearest = 0;
    let distance = Number.POSITIVE_INFINITY;
    POCKETS.forEach((pocket, index) => {
      const next = Math.hypot(x - pocket.x, z - pocket.z);
      if (next < distance) {
        distance = next;
        nearest = index;
      }
    });
    return nearest;
  }

  private resolveShot(): void {
    const shot = this.activeShot;
    if (!shot) return;
    this.stopSimulation();
    this.activeShot = null;

    const shooterIndex = this.players.indexOf(shot.shooterId) as 0 | 1;
    const opponentIndex = (shooterIndex === 0 ? 1 : 0) as 0 | 1;
    const shooterGroup = this.getGroup(shot.shooterId);
    const decision = evaluateShot({
      breakShot: shot.breakShot,
      tableOpen: this.tableOpen,
      shooterGroup,
      shooterCleared: shooterGroup !== null && this.getRemaining(shot.shooterId) === 0,
      calledPocket: this.calledPocket,
    }, this.toShotFacts(shot));

    if (decision.rerack) {
      this.currentPlayerIndex = decision.foul ? opponentIndex : shooterIndex;
      this.breakerId = this.currentPlayerId;
      this.groups.set(this.players[0], null);
      this.groups.set(this.players[1], null);
      this.tableOpen = true;
      this.breakPending = true;
      this.calledPocket = null;
      this.turnNumber += 1;
      this.rackBalls();
      this.phase = 'placing';
      this.ballInHand = { playerId: this.currentPlayerId, constraint: 'kitchen', placed: false };
      this.status = decision.message;
      this.emitEvent({ type: 'turn', message: decision.message });
      this.emitReliableState();
      return;
    }

    if (decision.assignedGroup) {
      this.groups.set(shot.shooterId, decision.assignedGroup);
      this.groups.set(this.players[opponentIndex], decision.assignedGroup === 'solids' ? 'stripes' : 'solids');
      this.tableOpen = false;
    }
    this.breakPending = false;

    if (decision.winner) {
      const winnerIndex = decision.winner === 'shooter' ? shooterIndex : opponentIndex;
      this.currentPlayerIndex = winnerIndex;
      this.winnerId = this.players[winnerIndex];
      this.phase = 'finished';
      this.status = decision.message;
      this.calledPocket = null;
      this.emitEvent({ type: 'win', message: decision.message });
      this.emitReliableState();
      this.callbacks.onFinished(this.winnerId);
      return;
    }

    this.currentPlayerIndex = decision.keepTurn ? shooterIndex : opponentIndex;
    this.calledPocket = null;
    this.turnNumber += 1;
    this.status = decision.message;
    if (decision.ballInHand) {
      this.removeBallBody(0);
      this.pocketed.add(0);
      this.phase = 'placing';
      this.ballInHand = { playerId: this.currentPlayerId, constraint: 'anywhere', placed: false };
    } else {
      this.phase = 'aiming';
      this.ballInHand = null;
    }
    this.emitEvent({ type: 'turn', message: decision.message });
    this.emitReliableState();
  }

  private toShotFacts(shot: ActiveShot): ShotFacts {
    return {
      firstContact: shot.firstContact,
      pocketed: shot.pocketed,
      cuePocketed: shot.cuePocketed,
      railAfterContact: shot.railAfterContact,
      objectRailContacts: [...shot.objectRailContacts],
    };
  }

  private validateCuePosition(x: number, z: number, constraint: PlacementConstraint): string | null {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return '母球位置无效';
    const margin = TABLE.ballRadius + 0.008;
    if (x < -TABLE.width / 2 + margin || x > TABLE.width / 2 - margin || z < -TABLE.height / 2 + margin || z > TABLE.height / 2 - margin) {
      return '母球必须放在台面有效区域内';
    }
    if (constraint === 'kitchen' && x > TABLE.headStringX) return '开球时母球必须放在开球线后方';
    for (const [number, body] of this.ballBodies) {
      if (number === 0) continue;
      if (Math.hypot(body.position.x - x, body.position.z - z) < TABLE.ballRadius * 2.08) return '母球不能与其他球重叠';
    }
    for (const pocket of POCKETS) {
      if (Math.hypot(pocket.x - x, pocket.z - z) < TABLE.pocketRadius * 1.15) return '母球不能放在袋口';
    }
    return null;
  }

  private canTargetEight(playerId: string): boolean {
    const group = this.getGroup(playerId);
    return group !== null && this.getRemaining(playerId) === 0;
  }

  private getMaxSpeed(): number {
    let maxSpeed = 0;
    for (const body of this.ballBodies.values()) maxSpeed = Math.max(maxSpeed, body.velocity.length());
    return maxSpeed;
  }

  private settleAllBalls(): void {
    for (const body of this.ballBodies.values()) {
      body.velocity.setZero();
      body.angularVelocity.setZero();
    }
    this.capturePositions();
  }

  private capturePositions(): void {
    for (const [number, body] of this.ballBodies) {
      this.lastPositions.set(number, { x: body.position.x, z: body.position.z });
    }
  }

  private createBallSnapshots(): BallSnapshot[] {
    const snapshots: BallSnapshot[] = [];
    for (let number = 0; number <= 15; number += 1) {
      const body = this.ballBodies.get(number);
      const position = body ? { x: body.position.x, z: body.position.z } : this.lastPositions.get(number) ?? { x: 0, z: 0 };
      snapshots.push({
        number,
        x: round(position.x),
        z: round(position.z),
        vx: round(body?.velocity.x ?? 0),
        vz: round(body?.velocity.z ?? 0),
        pocketed: this.pocketed.has(number),
      });
    }
    return snapshots;
  }

  private removeBallBody(number: number): void {
    const body = this.ballBodies.get(number);
    if (!body) return;
    this.world.removeBody(body);
    this.bodyToBall.delete(body.id);
    this.ballBodies.delete(number);
  }

  private emitReliableState(): void {
    this.callbacks.onSnapshot(this.getSnapshot(), true);
    this.callbacks.onStateChange();
  }

  private emitEvent(event: Omit<GameEvent, 'id' | 'at'>): void {
    this.callbacks.onEvent({ ...event, id: randomUUID(), at: Date.now() });
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
