import * as THREE from 'three';
import { BALL_COLORS, createRackOrder, POCKETS, TABLE } from '../../shared/geometry';
import type { GameSnapshot } from '../../shared/protocol';
import { SnapshotInterpolator } from './SnapshotInterpolator';

export type CameraMode = 'aim' | 'overhead' | 'cinematic';

export interface SceneInteraction {
  canAim: boolean;
  canPlace: boolean;
  canCallPocket: boolean;
  aimAngle: number;
  power: number;
  calledPocket: number | null;
  cameraMode: CameraMode;
}

interface RendererCallbacks {
  onAim: (angle: number) => void;
  onPlaceCue: (position: { x: number; z: number }) => void;
  onCallPocket: (pocket: number) => void;
  onInteraction: () => void;
}

interface BallTarget {
  x: number;
  z: number;
  vx: number;
  vz: number;
  pocketed: boolean;
}

export class BilliardsRenderer {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(42, 1, 0.05, 30);
  private readonly desiredCamera = new THREE.PerspectiveCamera(42, 1, 0.05, 30);
  private readonly cameraTarget = new THREE.Vector3();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly pointerIntersection = new THREE.Vector3();
  private readonly unitScale = new THREE.Vector3(1, 1, 1);
  private readonly tablePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly ballMeshes = new Map<number, THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhysicalMaterial>>();
  private readonly ballTargets = new Map<number, BallTarget>();
  private readonly snapshotInterpolator = new SnapshotInterpolator();
  private readonly pocketRings: THREE.Mesh[] = [];
  private readonly callbacks: RendererCallbacks;
  private readonly clock = new THREE.Clock();
  private readonly resizeObserver: ResizeObserver;
  private readonly cueGroup = new THREE.Group();
  private readonly aimLine: THREE.Line;
  private readonly ghostBall: THREE.Mesh;
  private readonly placementGhost: THREE.Mesh;
  private snapshot: GameSnapshot | null = null;
  private interaction: SceneInteraction = {
    canAim: false,
    canPlace: false,
    canCallPocket: false,
    aimAngle: 0,
    power: 0.55,
    calledPocket: null,
    cameraMode: 'cinematic',
  };
  private animationFrame = 0;
  private disposed = false;
  private confetti: THREE.Points | null = null;
  private confettiVelocity: Float32Array | null = null;
  private lastWinnerId: string | null = null;
  private receivedInteraction = false;
  private snapCamera = false;
  private aimPointerId: number | null = null;
  private readonly reducedRenderQuality = window.matchMedia('(max-width: 760px)').matches || (navigator.hardwareConcurrency ?? 8) <= 4;

  constructor(private readonly container: HTMLElement, callbacks: RendererCallbacks) {
    this.callbacks = callbacks;
    this.scene.background = new THREE.Color('#050c0a');
    this.scene.fog = new THREE.FogExp2('#050c0a', 0.085);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.reducedRenderQuality ? 1.4 : 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.className = 'game-canvas';
    this.container.appendChild(this.renderer.domElement);

    this.createLighting();
    this.createTable();
    this.createBalls();
    this.createCue();
    this.aimLine = this.createAimLine();
    this.ghostBall = this.createGhostBall('#ffffff', 0.32);
    this.placementGhost = this.createGhostBall('#f8f0dd', 0.55);
    this.scene.add(this.aimLine, this.ghostBall, this.placementGhost);
    this.applyDecorativeRack();

    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp);
    this.renderer.domElement.addEventListener('pointercancel', this.handlePointerCancel);
    this.renderer.domElement.addEventListener('lostpointercapture', this.handlePointerCancel);
    this.renderer.domElement.addEventListener('pointerleave', this.handlePointerLeave);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.resize();
    this.animate();
  }

  setSnapshot(snapshot: GameSnapshot | null): void {
    if (!snapshot) {
      this.snapshot = null;
      this.ballTargets.clear();
      this.snapshotInterpolator.clear();
      this.applyDecorativeRack();
      return;
    }
    const previousSnapshot = this.snapshot;
    const pushResult = this.snapshotInterpolator.push(snapshot);
    if (!pushResult.accepted) return;
    this.snapshot = snapshot;
    for (const ball of snapshot.balls) {
      this.ballTargets.set(ball.number, ball);
      const mesh = this.ballMeshes.get(ball.number);
      if (!mesh) continue;
      const previousBall = previousSnapshot?.balls.find((candidate) => candidate.number === ball.number);
      if (pushResult.reset || (previousBall?.pocketed && !ball.pocketed)) {
        mesh.position.set(ball.x, TABLE.ballRadius, ball.z);
        mesh.scale.setScalar(1);
        mesh.visible = !ball.pocketed;
      } else if (!ball.pocketed) {
        mesh.visible = true;
      }
    }
    if (snapshot.winnerId && snapshot.winnerId !== this.lastWinnerId) this.launchConfetti();
    this.lastWinnerId = snapshot.winnerId;
  }

  setInteraction(interaction: SceneInteraction): void {
    if (!this.receivedInteraction) {
      this.receivedInteraction = true;
      this.snapCamera = true;
    }
    if (!interaction.canAim) this.aimPointerId = null;
    this.interaction = interaction;
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.animationFrame);
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp);
    this.renderer.domElement.removeEventListener('pointercancel', this.handlePointerCancel);
    this.renderer.domElement.removeEventListener('lostpointercapture', this.handlePointerCancel);
    this.renderer.domElement.removeEventListener('pointerleave', this.handlePointerLeave);
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if ('map' in material && material.map instanceof THREE.Texture) material.map.dispose();
        material.dispose();
      });
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private createLighting(): void {
    const hemisphere = new THREE.HemisphereLight('#cce7df', '#25160e', 1.25);
    this.scene.add(hemisphere);

    const key = new THREE.SpotLight('#fff4d2', 42, 9, Math.PI / 4.5, 0.55, 1.4);
    key.position.set(-0.5, 3.8, 0.35);
    key.target.position.set(0, 0, 0);
    key.castShadow = true;
    const shadowSize = this.reducedRenderQuality ? 1024 : 1536;
    key.shadow.mapSize.set(shadowSize, shadowSize);
    key.shadow.bias = -0.00015;
    this.scene.add(key, key.target);

    const rim = new THREE.DirectionalLight('#66a9bd', 1.65);
    rim.position.set(2.4, 1.8, -2.2);
    this.scene.add(rim);
  }

  private createTable(): void {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 18),
      new THREE.MeshStandardMaterial({ color: '#07100e', roughness: 0.92, metalness: 0.02 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.22;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(TABLE.width + 0.38, 0.24, TABLE.height + 0.38),
      new THREE.MeshPhysicalMaterial({ color: '#321c13', roughness: 0.3, clearcoat: 0.62, clearcoatRoughness: 0.2 }),
    );
    base.position.y = -0.12;
    base.castShadow = true;
    base.receiveShadow = true;
    this.scene.add(base);

    const felt = new THREE.Mesh(
      new THREE.BoxGeometry(TABLE.width, 0.035, TABLE.height),
      new THREE.MeshStandardMaterial({ color: '#0d6b4f', roughness: 0.96, metalness: 0 }),
    );
    felt.position.y = -0.014;
    felt.receiveShadow = true;
    this.scene.add(felt);

    const woodMaterial = new THREE.MeshPhysicalMaterial({ color: '#5b3020', roughness: 0.33, clearcoat: 0.55 });
    const cushionMaterial = new THREE.MeshStandardMaterial({ color: '#07533e', roughness: 0.8 });
    const outerWidth = 0.19;
    this.addBox(0, 0.055, -TABLE.height / 2 - outerWidth / 2, TABLE.width + outerWidth * 2, 0.11, outerWidth, woodMaterial);
    this.addBox(0, 0.055, TABLE.height / 2 + outerWidth / 2, TABLE.width + outerWidth * 2, 0.11, outerWidth, woodMaterial);
    this.addBox(-TABLE.width / 2 - outerWidth / 2, 0.055, 0, outerWidth, 0.11, TABLE.height, woodMaterial);
    this.addBox(TABLE.width / 2 + outerWidth / 2, 0.055, 0, outerWidth, 0.11, TABLE.height, woodMaterial);

    const halfWidth = TABLE.width / 2;
    const halfHeight = TABLE.height / 2;
    const cornerGap = 0.115;
    const sideGap = 0.105;
    const topLength = halfWidth - cornerGap - sideGap;
    const leftCenter = -(sideGap + topLength / 2);
    const rightCenter = sideGap + topLength / 2;
    [leftCenter, rightCenter].forEach((x) => {
      this.addBox(x, 0.04, -halfHeight - 0.018, topLength, 0.07, 0.07, cushionMaterial);
      this.addBox(x, 0.04, halfHeight + 0.018, topLength, 0.07, 0.07, cushionMaterial);
    });
    const sideLength = TABLE.height - cornerGap * 2;
    this.addBox(-halfWidth - 0.018, 0.04, 0, 0.07, 0.07, sideLength, cushionMaterial);
    this.addBox(halfWidth + 0.018, 0.04, 0, 0.07, 0.07, sideLength, cushionMaterial);

    POCKETS.forEach((pocket, index) => {
      const radius = pocket.kind === 'corner' ? TABLE.cornerPocketRadius : TABLE.pocketRadius;
      const pocketMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius * 0.92, 0.055, 32),
        new THREE.MeshStandardMaterial({ color: '#030504', roughness: 0.98 }),
      );
      pocketMesh.position.set(pocket.x, -0.01, pocket.z);
      this.scene.add(pocketMesh);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 1.08, 0.007, 10, 40),
        new THREE.MeshStandardMaterial({ color: '#b99555', emissive: '#4d3514', emissiveIntensity: 0.2, roughness: 0.36, metalness: 0.65 }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(pocket.x, 0.016, pocket.z);
      ring.userData.pocket = index;
      this.pocketRings.push(ring);
      this.scene.add(ring);
    });

    const sightMaterial = new THREE.MeshStandardMaterial({ color: '#e1c68e', metalness: 0.58, roughness: 0.32 });
    [-0.95, -0.63, -0.32, 0.32, 0.63, 0.95].forEach((x) => {
      this.addSight(x, -TABLE.height / 2 - 0.12, sightMaterial);
      this.addSight(x, TABLE.height / 2 + 0.12, sightMaterial);
    });
    [-0.39, -0.2, 0.2, 0.39].forEach((z) => {
      this.addSight(-TABLE.width / 2 - 0.12, z, sightMaterial);
      this.addSight(TABLE.width / 2 + 0.12, z, sightMaterial);
    });

    const headLineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(TABLE.headStringX, 0.008, -TABLE.height / 2),
      new THREE.Vector3(TABLE.headStringX, 0.008, TABLE.height / 2),
    ]);
    const headLine = new THREE.Line(headLineGeometry, new THREE.LineBasicMaterial({ color: '#85b6a5', transparent: true, opacity: 0.22 }));
    this.scene.add(headLine);
  }

  private addBox(x: number, y: number, z: number, width: number, height: number, depth: number, material: THREE.Material): void {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  private addSight(x: number, z: number, material: THREE.Material): void {
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.012, 0), material);
    mesh.scale.set(1.5, 0.35, 1);
    mesh.position.set(x, 0.116, z);
    this.scene.add(mesh);
  }

  private createBalls(): void {
    for (let number = 0; number <= 15; number += 1) {
      const texture = createBallTexture(number);
      const material = new THREE.MeshPhysicalMaterial({
        map: texture,
        roughness: 0.18,
        metalness: 0,
        clearcoat: 0.92,
        clearcoatRoughness: 0.12,
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(TABLE.ballRadius, 30, 20), material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.number = number;
      this.ballMeshes.set(number, mesh);
      this.scene.add(mesh);
    }
  }

  private createCue(): void {
    const wood = new THREE.MeshPhysicalMaterial({ color: '#c99a55', roughness: 0.3, clearcoat: 0.65 });
    const dark = new THREE.MeshPhysicalMaterial({ color: '#221611', roughness: 0.28, clearcoat: 0.6 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.012, 1.38, 14), wood);
    shaft.rotation.z = Math.PI / 2;
    shaft.castShadow = true;
    const butt = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.017, 0.42, 14), dark);
    butt.rotation.z = Math.PI / 2;
    butt.position.x = -0.68;
    butt.castShadow = true;
    this.cueGroup.add(shaft, butt);
    this.scene.add(this.cueGroup);
  }

  private createAimLine(): THREE.Line {
    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]);
    const material = new THREE.LineDashedMaterial({ color: '#f8e6b8', dashSize: 0.045, gapSize: 0.03, transparent: true, opacity: 0.78 });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    return line;
  }

  private createGhostBall(color: string, opacity: number): THREE.Mesh {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(TABLE.ballRadius * 1.03, 22, 14),
      new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity }),
    );
    mesh.visible = false;
    return mesh;
  }

  private applyDecorativeRack(): void {
    const order = createRackOrder(() => 0.42);
    const spacing = TABLE.ballRadius * 2.025;
    this.ballMeshes.forEach((mesh) => {
      mesh.visible = false;
      mesh.scale.setScalar(1);
    });
    const cue = this.ballMeshes.get(0)!;
    cue.position.set(TABLE.headStringX - 0.3, TABLE.ballRadius, 0);
    cue.visible = true;
    let index = 0;
    for (let row = 0; row < 5; row += 1) {
      const x = TABLE.footSpotX + row * spacing * Math.sqrt(3) / 2;
      for (let column = 0; column <= row; column += 1) {
        const mesh = this.ballMeshes.get(order[index++])!;
        mesh.position.set(x, TABLE.ballRadius, (column - row / 2) * spacing);
        mesh.visible = true;
      }
    }
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const point = this.getTablePoint(event);
    if (!point) return;
    if (this.interaction.canPlace) {
      const x = THREE.MathUtils.clamp(point.x, -TABLE.width / 2 + TABLE.ballRadius, TABLE.width / 2 - TABLE.ballRadius);
      const z = THREE.MathUtils.clamp(point.z, -TABLE.height / 2 + TABLE.ballRadius, TABLE.height / 2 - TABLE.ballRadius);
      this.placementGhost.position.set(x, TABLE.ballRadius, z);
      this.placementGhost.visible = true;
    }
    if (this.interaction.canAim && this.aimPointerId === event.pointerId) this.updateAimFromPoint(point);
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    this.callbacks.onInteraction();
    const point = this.getTablePoint(event);
    if (!point) return;
    if (this.interaction.canPlace) {
      this.callbacks.onPlaceCue({
        x: THREE.MathUtils.clamp(point.x, -TABLE.width / 2 + TABLE.ballRadius, TABLE.width / 2 - TABLE.ballRadius),
        z: THREE.MathUtils.clamp(point.z, -TABLE.height / 2 + TABLE.ballRadius, TABLE.height / 2 - TABLE.ballRadius),
      });
      return;
    }
    if (this.interaction.canCallPocket) {
      const nearest = this.findPocketAtPoint(point);
      if (nearest >= 0) {
        this.callbacks.onCallPocket(nearest);
        return;
      }
    }
    if (this.interaction.canAim) {
      this.aimPointerId = event.pointerId;
      this.renderer.domElement.setPointerCapture(event.pointerId);
      this.updateAimFromPoint(point);
    }
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (this.aimPointerId !== event.pointerId) return;
    const point = this.getTablePoint(event);
    if (point) this.updateAimFromPoint(point);
    this.aimPointerId = null;
    if (this.renderer.domElement.hasPointerCapture(event.pointerId)) this.renderer.domElement.releasePointerCapture(event.pointerId);
  };

  private readonly handlePointerCancel = (event: PointerEvent): void => {
    if (this.aimPointerId === event.pointerId) this.aimPointerId = null;
  };

  private readonly handlePointerLeave = (): void => {
    if (this.interaction.canPlace && this.aimPointerId === null) this.placementGhost.visible = false;
  };

  private updateAimFromPoint(point: THREE.Vector3): void {
    const cue = this.ballTargets.get(0);
    if (cue && !cue.pocketed) this.callbacks.onAim(Math.atan2(point.z - cue.z, point.x - cue.x));
  }

  private findPocketAtPoint(point: THREE.Vector3): number {
    let nearest = -1;
    let distance = 0.14;
    POCKETS.forEach((pocket, index) => {
      const next = Math.hypot(point.x - pocket.x, point.z - pocket.z);
      if (next < distance) {
        nearest = index;
        distance = next;
      }
    });
    return nearest;
  }

  private getTablePoint(event: PointerEvent): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.raycaster.ray.intersectPlane(this.tablePlane, this.pointerIntersection);
  }

  private animate = (): void => {
    if (this.disposed) return;
    this.animationFrame = requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.05);
    this.updateBalls(delta, performance.now());
    this.updateAim();
    this.updatePockets();
    this.updateCamera(delta);
    this.updateConfetti(delta);
    this.renderer.render(this.scene, this.camera);
  };

  private updateBalls(delta: number, now: number): void {
    const settleBlend = 1 - Math.exp(-delta * 14);
    const sinkBlend = 1 - Math.exp(-delta * 8);
    for (let number = 0; number <= 15; number += 1) {
      const target = this.snapshotInterpolator.sample(number, now) ?? this.ballTargets.get(number);
      if (!target) continue;
      const mesh = this.ballMeshes.get(number);
      if (!mesh) continue;
      if (target.pocketed) {
        if (!mesh.visible) continue;
        mesh.position.x = target.x;
        mesh.position.z = target.z;
        mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, -0.13, sinkBlend);
        const nextScale = THREE.MathUtils.lerp(mesh.scale.x, 0.08, sinkBlend);
        mesh.scale.setScalar(nextScale);
        if (mesh.position.y < -0.1 || mesh.scale.x < 0.12) mesh.visible = false;
        continue;
      }
      if (!mesh.visible) {
        mesh.position.set(target.x, TABLE.ballRadius, target.z);
        mesh.scale.setScalar(1);
      }
      mesh.visible = true;
      mesh.scale.lerp(this.unitScale, settleBlend);
      mesh.position.x = target.x;
      mesh.position.z = target.z;
      mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, TABLE.ballRadius, settleBlend);
      mesh.rotation.z -= (target.vx / TABLE.ballRadius) * delta;
      mesh.rotation.x += (target.vz / TABLE.ballRadius) * delta;
    }
  }

  private updateAim(): void {
    const cue = this.ballTargets.get(0);
    const active = Boolean(cue && !cue.pocketed && this.interaction.canAim && this.snapshot?.phase === 'aiming');
    this.cueGroup.visible = active;
    this.aimLine.visible = active;
    this.ghostBall.visible = false;
    this.placementGhost.visible = this.interaction.canPlace && this.placementGhost.visible;
    if (!active || !cue) return;

    const directionX = Math.cos(this.interaction.aimAngle);
    const directionZ = Math.sin(this.interaction.aimAngle);
    const collision = this.findAimCollision(cue.x, cue.z, directionX, directionZ);
    const endX = cue.x + directionX * collision.distance;
    const endZ = cue.z + directionZ * collision.distance;
    const positions = this.aimLine.geometry.attributes.position as THREE.BufferAttribute;
    positions.setXYZ(0, cue.x, TABLE.ballRadius + 0.006, cue.z);
    positions.setXYZ(1, endX, TABLE.ballRadius + 0.006, endZ);
    positions.needsUpdate = true;
    this.aimLine.computeLineDistances();

    if (collision.hitBall) {
      this.ghostBall.position.set(
        cue.x + directionX * (collision.distance + TABLE.ballRadius * 2),
        TABLE.ballRadius,
        cue.z + directionZ * (collision.distance + TABLE.ballRadius * 2),
      );
      this.ghostBall.visible = true;
    }

    const pullback = 0.73 + this.interaction.power * 0.11;
    this.cueGroup.position.set(cue.x - directionX * pullback, TABLE.ballRadius + 0.013, cue.z - directionZ * pullback);
    this.cueGroup.rotation.y = -this.interaction.aimAngle;
  }

  private findAimCollision(x: number, z: number, directionX: number, directionZ: number): { distance: number; hitBall: boolean } {
    let distance = this.distanceToBoundary(x, z, directionX, directionZ);
    let hitBall = false;
    for (const [number, ball] of this.ballTargets) {
      if (number === 0 || ball.pocketed) continue;
      const dx = ball.x - x;
      const dz = ball.z - z;
      const projection = dx * directionX + dz * directionZ;
      if (projection <= 0) continue;
      const perpendicularSquared = dx * dx + dz * dz - projection * projection;
      const combinedRadius = TABLE.ballRadius * 2.03;
      if (perpendicularSquared >= combinedRadius * combinedRadius) continue;
      const hitDistance = projection - Math.sqrt(combinedRadius * combinedRadius - perpendicularSquared);
      if (hitDistance > 0 && hitDistance < distance) {
        distance = hitDistance;
        hitBall = true;
      }
    }
    return { distance: Math.max(0.04, distance), hitBall };
  }

  private distanceToBoundary(x: number, z: number, directionX: number, directionZ: number): number {
    const marginX = TABLE.width / 2 - TABLE.ballRadius;
    const marginZ = TABLE.height / 2 - TABLE.ballRadius;
    const xDistance = Math.abs(directionX) < 0.000_001 ? Number.POSITIVE_INFINITY : directionX > 0 ? (marginX - x) / directionX : (-marginX - x) / directionX;
    const zDistance = Math.abs(directionZ) < 0.000_001 ? Number.POSITIVE_INFINITY : directionZ > 0 ? (marginZ - z) / directionZ : (-marginZ - z) / directionZ;
    return Math.min(xDistance > 0 ? xDistance : Number.POSITIVE_INFINITY, zDistance > 0 ? zDistance : Number.POSITIVE_INFINITY);
  }

  private updatePockets(): void {
    const time = this.clock.elapsedTime;
    this.pocketRings.forEach((ring, index) => {
      const material = ring.material as THREE.MeshStandardMaterial;
      const selected = this.interaction.calledPocket === index;
      const selectable = this.interaction.canCallPocket;
      material.emissiveIntensity = selected ? 2.5 : selectable ? 0.55 + Math.sin(time * 3 + index) * 0.24 : 0.16;
      ring.scale.setScalar(selected ? 1.12 : selectable ? 1 + Math.sin(time * 3 + index) * 0.035 : 1);
    });
  }

  private updateCamera(delta: number): void {
    const desired = this.desiredCamera;
    const cue = this.ballTargets.get(0);
    const target = this.cameraTarget;
    desired.up.set(0, 1, 0);
    let useLookAt = true;
    if (this.interaction.cameraMode === 'overhead') {
      const halfVertical = Math.max(TABLE.height * 0.72, TABLE.width / Math.max(0.4, this.camera.aspect) * 0.62);
      const height = THREE.MathUtils.clamp(halfVertical / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)), 2.15, 5.2);
      desired.position.set(0, height, 0);
      desired.rotation.set(-Math.PI / 2, 0, 0);
      useLookAt = false;
    } else if (this.interaction.cameraMode === 'aim' && cue && !cue.pocketed) {
      const directionX = Math.cos(this.interaction.aimAngle);
      const directionZ = Math.sin(this.interaction.aimAngle);
      desired.position.set(cue.x - directionX * 1.02, 0.72, cue.z - directionZ * 1.02);
      target.set(cue.x + directionX * 0.62, 0.015, cue.z + directionZ * 0.62);
    } else {
      desired.position.set(-2.05, 1.65, 1.62);
      target.set(0.1, 0, 0);
    }
    if (useLookAt) desired.lookAt(target);
    if (this.snapCamera) {
      this.camera.position.copy(desired.position);
      this.camera.quaternion.copy(desired.quaternion);
      this.snapCamera = false;
    } else {
      const blend = 1 - Math.exp(-delta * 4.8);
      this.camera.position.lerp(desired.position, blend);
      this.camera.quaternion.slerp(desired.quaternion, blend);
    }
  }

  private launchConfetti(): void {
    if (this.confetti) {
      this.scene.remove(this.confetti);
      this.confetti.geometry.dispose();
      (this.confetti.material as THREE.Material).dispose();
    }
    const count = 180;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const palette = ['#f1c75b', '#f2eee1', '#b63b42', '#2b8b69', '#4c78b8'];
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * 1.2;
      positions[index * 3 + 1] = 0.9 + Math.random() * 0.45;
      positions[index * 3 + 2] = (Math.random() - 0.5) * 0.55;
      velocities[index * 3] = (Math.random() - 0.5) * 0.75;
      velocities[index * 3 + 1] = 0.3 + Math.random() * 0.75;
      velocities[index * 3 + 2] = (Math.random() - 0.5) * 0.75;
      const color = new THREE.Color(palette[index % palette.length]);
      color.toArray(colors, index * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.confetti = new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.026, vertexColors: true, transparent: true, opacity: 0.95 }));
    this.confettiVelocity = velocities;
    this.scene.add(this.confetti);
  }

  private updateConfetti(delta: number): void {
    if (!this.confetti || !this.confettiVelocity) return;
    const positions = this.confetti.geometry.attributes.position as THREE.BufferAttribute;
    let visible = false;
    for (let index = 0; index < positions.count; index += 1) {
      const offset = index * 3;
      this.confettiVelocity[offset + 1] -= 1.45 * delta;
      positions.array[offset] += this.confettiVelocity[offset] * delta;
      positions.array[offset + 1] += this.confettiVelocity[offset + 1] * delta;
      positions.array[offset + 2] += this.confettiVelocity[offset + 2] * delta;
      if (positions.array[offset + 1] > -0.2) visible = true;
    }
    positions.needsUpdate = true;
    if (!visible) this.confetti.visible = false;
  }

  private resize(): void {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}

function createBallTexture(number: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d')!;
  const color = BALL_COLORS[number];
  context.fillStyle = number >= 9 ? '#f2ecdf' : color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (number >= 9) {
    context.fillStyle = color;
    context.fillRect(0, 58, canvas.width, 140);
  }
  if (number !== 0) {
    [128, 384].forEach((x) => {
      context.beginPath();
      context.arc(x, 128, 37, 0, Math.PI * 2);
      context.fillStyle = '#f7f1e5';
      context.fill();
      context.fillStyle = '#101415';
      context.font = '700 43px Arial, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(String(number), x, 130);
    });
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
