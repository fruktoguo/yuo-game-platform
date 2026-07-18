import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BALL_COLORS, createRackOrder, POCKETS, TABLE } from '../../shared/geometry';
import type { GameEvent, GameSnapshot, PlacementConstraint } from '../../shared/protocol';
import { calculateRollingStep } from './RollingMotion';
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
  placementConstraint: PlacementConstraint | null;
}

interface RendererCallbacks {
  onAim: (angle: number) => void;
  onPlaceCue: (position: { x: number; z: number }) => void;
  onCallPocket: (pocket: number) => void;
  onPowerChange: (power: number) => void;
  onInteraction: () => void;
}

interface BallTarget {
  x: number;
  z: number;
  vx: number;
  vz: number;
  pocketed: boolean;
}

interface AimCollision {
  distance: number;
  ball: BallTarget | null;
  impactX: number;
  impactZ: number;
  normalX: number;
  normalZ: number;
}

interface ShotAnimation {
  elapsed: number;
  angle: number;
  power: number;
  cueX: number;
  cueZ: number;
  impactShown: boolean;
}

interface ImpactEffect {
  mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  age: number;
  duration: number;
  startScale: number;
  growth: number;
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
  private readonly rollAxis = new THREE.Vector3();
  private readonly rollQuaternion = new THREE.Quaternion();
  private readonly tablePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly ballMeshes = new Map<number, THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhysicalMaterial>>();
  private readonly ballTargets = new Map<number, BallTarget>();
  private readonly snapshotInterpolator = new SnapshotInterpolator();
  private readonly pocketRings: Array<THREE.Mesh<THREE.RingGeometry, THREE.MeshStandardMaterial>> = [];
  private readonly impactEffects: ImpactEffect[] = [];
  private readonly handledEventIds = new Set<string>();
  private readonly callbacks: RendererCallbacks;
  private readonly clock = new THREE.Clock();
  private readonly resizeObserver: ResizeObserver;
  private readonly cueGroup = new THREE.Group();
  private readonly aimLine: THREE.Line;
  private readonly objectAimLine: THREE.Line;
  private readonly cueDeflectionLine: THREE.Line;
  private readonly aimContactRing: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private readonly ghostBall: THREE.Mesh;
  private readonly placementGhost: THREE.Mesh;
  private readonly placementZone: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private snapshot: GameSnapshot | null = null;
  private interaction: SceneInteraction = {
    canAim: false,
    canPlace: false,
    canCallPocket: false,
    aimAngle: 0,
    power: 0.55,
    calledPocket: null,
    cameraMode: 'cinematic',
    placementConstraint: null,
  };
  private animationFrame = 0;
  private lastRenderAt = 0;
  private disposed = false;
  private confetti: THREE.Points | null = null;
  private confettiVelocity: Float32Array | null = null;
  private lastWinnerId: string | null = null;
  private receivedInteraction = false;
  private snapCamera = false;
  private aimPointerId: number | null = null;
  private shotAnimation: ShotAnimation | null = null;
  private cameraImpulse = 0;
  private readonly reducedRenderQuality = window.matchMedia('(max-width: 760px)').matches || (navigator.hardwareConcurrency ?? 8) <= 4;
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private readonly softwareRenderer: boolean;

  constructor(private readonly container: HTMLElement, callbacks: RendererCallbacks) {
    this.callbacks = callbacks;
    this.scene.background = new THREE.Color('#080b0c');
    this.scene.fog = new THREE.FogExp2('#080b0c', 0.055);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', stencil: false });
    this.softwareRenderer = navigator.webdriver || isSoftwareRenderer(this.renderer);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.usesReducedQuality ? 1.25 : 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.98;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.domElement.className = 'game-canvas';
    this.container.appendChild(this.renderer.domElement);

    this.createLighting();
    this.createTable();
    this.createBalls();
    this.createCue();
    this.aimLine = this.createAimLine('#f7df9c', 0.86, true);
    this.objectAimLine = this.createAimLine('#73d7c1', 0.72, false);
    this.cueDeflectionLine = this.createAimLine('#d5e9e4', 0.48, true);
    this.aimContactRing = this.createAimContactRing();
    this.ghostBall = this.createGhostBall('#f7f2e8', 0.3, true);
    this.placementGhost = this.createGhostBall('#f8f0dd', 0.52, false);
    this.placementZone = this.createPlacementZone();
    this.scene.add(
      this.aimLine,
      this.objectAimLine,
      this.cueDeflectionLine,
      this.aimContactRing,
      this.ghostBall,
      this.placementGhost,
      this.placementZone,
    );
    this.applyDecorativeRack();

    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp);
    this.renderer.domElement.addEventListener('pointercancel', this.handlePointerCancel);
    this.renderer.domElement.addEventListener('lostpointercapture', this.handlePointerCancel);
    this.renderer.domElement.addEventListener('pointerleave', this.handlePointerLeave);
    this.renderer.domElement.addEventListener('wheel', this.handleWheel, { passive: false });
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
        mesh.quaternion.identity();
        mesh.visible = !ball.pocketed;
      } else if (!ball.pocketed) {
        mesh.visible = true;
      }
    }
    this.renderer.shadowMap.needsUpdate = true;
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
    this.renderer.shadowMap.needsUpdate = true;
  }

  handleEvent(event: GameEvent | null): void {
    if (!event || this.handledEventIds.has(event.id)) return;
    this.handledEventIds.add(event.id);
    if (this.handledEventIds.size > 96) {
      const oldest = this.handledEventIds.values().next().value;
      if (oldest) this.handledEventIds.delete(oldest);
    }
    const point = this.locateEvent(event);
    if (!point) return;
    const color = event.type === 'pocket'
      ? '#e8bd63'
      : event.type === 'cushion'
        ? '#56b99a'
        : event.type === 'shot'
          ? '#f4dfb1'
          : '#e9f7f2';
    this.createImpactEffect(point.x, point.z, color, event.intensity ?? 0.5, event.type === 'pocket' ? 0.09 : 0.035);
  }

  triggerShot(angle: number, power: number): void {
    const cue = this.ballTargets.get(0);
    if (!cue || cue.pocketed) return;
    this.shotAnimation = {
      elapsed: 0,
      angle,
      power,
      cueX: cue.x,
      cueZ: cue.z,
      impactShown: false,
    };
    this.cameraImpulse = this.reducedMotion ? 0 : power * 0.018;
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
    this.renderer.domElement.removeEventListener('wheel', this.handleWheel);
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
    const hemisphere = new THREE.HemisphereLight('#c9dde2', '#251712', 0.86);
    this.scene.add(hemisphere);

    const key = new THREE.SpotLight('#fff0ca', 42, 9, Math.PI / 4.5, 0.52, 1.35);
    key.position.set(-0.55, 3.6, 0.28);
    key.target.position.set(0, 0, 0);
    key.castShadow = true;
    const shadowSize = this.usesReducedQuality ? 768 : 1024;
    key.shadow.mapSize.set(shadowSize, shadowSize);
    key.shadow.bias = -0.00012;
    key.shadow.normalBias = 0.012;
    this.scene.add(key, key.target);

    const rim = new THREE.DirectionalLight('#6db8c7', 1);
    rim.position.set(2.7, 1.9, -2.4);
    this.scene.add(rim);

    const warmFill = new THREE.PointLight('#d37b52', 1.05, 5.5, 2);
    warmFill.position.set(-2.6, 0.6, 2.1);
    this.scene.add(warmFill);
  }

  private createTable(): void {
    const anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    const floorTexture = createFloorTexture(anisotropy);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 8),
      new THREE.MeshStandardMaterial({ map: floorTexture, color: '#4e5756', roughness: 0.9, metalness: 0.04 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.71;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const rug = new THREE.Mesh(
      new RoundedBoxGeometry(4.45, 0.018, 2.78, 4, 0.08),
      new THREE.MeshStandardMaterial({ color: '#24151a', roughness: 0.94, metalness: 0 }),
    );
    rug.position.y = -0.696;
    rug.receiveShadow = true;
    this.scene.add(rug);

    const woodTexture = createWoodTexture(anisotropy);
    const woodMaterial = new THREE.MeshPhysicalMaterial({
      map: woodTexture,
      color: '#6d3522',
      roughness: 0.4,
      metalness: 0.04,
      clearcoat: 0.3,
      clearcoatRoughness: 0.36,
      envMapIntensity: 0.55,
    });
    const darkWoodMaterial = new THREE.MeshPhysicalMaterial({
      map: woodTexture,
      color: '#321b15',
      roughness: 0.38,
      clearcoat: 0.38,
      clearcoatRoughness: 0.3,
    });
    const brassMaterial = new THREE.MeshPhysicalMaterial({
      color: '#c9a45d',
      roughness: 0.25,
      metalness: 0.78,
      clearcoat: 0.36,
    });
    const cushionMaterial = new THREE.MeshStandardMaterial({ color: '#0a5b45', roughness: 0.74, metalness: 0 });
    const cushionNoseMaterial = new THREE.MeshStandardMaterial({ color: '#073f33', roughness: 0.62, metalness: 0 });

    const outerWidth = TABLE.width + 0.5;
    const outerHeight = TABLE.height + 0.5;
    this.addRoundedBox(0, -0.12, 0, outerWidth, 0.18, outerHeight, darkWoodMaterial, 0.055);

    this.addRoundedBox(0, -0.31, -outerHeight / 2 + 0.045, outerWidth - 0.2, 0.36, 0.09, darkWoodMaterial, 0.026);
    this.addRoundedBox(0, -0.31, outerHeight / 2 - 0.045, outerWidth - 0.2, 0.36, 0.09, darkWoodMaterial, 0.026);
    this.addRoundedBox(-outerWidth / 2 + 0.045, -0.31, 0, 0.09, 0.36, outerHeight - 0.2, darkWoodMaterial, 0.026);
    this.addRoundedBox(outerWidth / 2 - 0.045, -0.31, 0, 0.09, 0.36, outerHeight - 0.2, darkWoodMaterial, 0.026);

    for (const x of [-1.08, 1.08]) {
      for (const z of [-0.46, 0.46]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.082, 0.47, 20), darkWoodMaterial);
        leg.position.set(x, -0.48, z);
        leg.castShadow = true;
        leg.receiveShadow = true;
        this.scene.add(leg);
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.083, 0.083, 0.035, 20), brassMaterial);
        foot.position.set(x, -0.69, z);
        foot.castShadow = true;
        this.scene.add(foot);
      }
    }

    const feltTexture = createFeltTexture(anisotropy);
    const felt = new THREE.Mesh(
      new RoundedBoxGeometry(TABLE.width + 0.015, 0.032, TABLE.height + 0.015, 3, 0.018),
      new THREE.MeshStandardMaterial({ map: feltTexture, color: '#83bfa8', roughness: 0.98, metalness: 0 }),
    );
    felt.position.y = -0.014;
    felt.receiveShadow = true;
    this.scene.add(felt);

    const halfWidth = TABLE.width / 2;
    const halfHeight = TABLE.height / 2;
    const cornerGap = 0.135;
    const sideGap = 0.085;
    const topLength = halfWidth - cornerGap - sideGap;
    const leftCenter = -(sideGap + topLength / 2);
    const rightCenter = sideGap + topLength / 2;
    [leftCenter, rightCenter].forEach((x) => {
      for (const side of [-1, 1]) {
        this.addRoundedBox(x, 0.057, side * (halfHeight + 0.087), topLength, 0.132, 0.18, woodMaterial, 0.026);
        this.addRoundedBox(x, 0.047, side * (halfHeight + 0.018), topLength - 0.018, 0.078, 0.073, cushionMaterial, 0.018);
        this.addRoundedBox(x, 0.044, side * (halfHeight - 0.021), topLength - 0.026, 0.04, 0.018, cushionNoseMaterial, 0.008);
      }
    });
    const sideLength = TABLE.height - cornerGap * 2;
    for (const side of [-1, 1]) {
      this.addRoundedBox(side * (halfWidth + 0.087), 0.057, 0, 0.18, 0.132, sideLength, woodMaterial, 0.026);
      this.addRoundedBox(side * (halfWidth + 0.018), 0.047, 0, 0.073, 0.078, sideLength - 0.018, cushionMaterial, 0.018);
      this.addRoundedBox(side * (halfWidth - 0.021), 0.044, 0, 0.018, 0.04, sideLength - 0.026, cushionNoseMaterial, 0.008);
    }

    POCKETS.forEach((pocket, index) => {
      const radius = pocket.kind === 'corner' ? TABLE.cornerPocketRadius : TABLE.pocketRadius;
      const mouth = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 1.18, radius * 1.08, 0.026, 40),
        new THREE.MeshStandardMaterial({ color: '#020303', roughness: 0.98, metalness: 0 }),
      );
      mouth.position.set(pocket.x, -0.005, pocket.z);
      this.scene.add(mouth);

      const linerGeometry = new THREE.CylinderGeometry(radius * 0.96, radius * 0.55, 0.19, 20, 2, true);
      const liner = new THREE.Mesh(
        linerGeometry,
        new THREE.MeshStandardMaterial({ color: '#111412', roughness: 0.9, side: THREE.DoubleSide }),
      );
      liner.position.set(pocket.x, -0.095, pocket.z);
      this.scene.add(liner);

      const net = new THREE.LineSegments(
        new THREE.EdgesGeometry(linerGeometry, 18),
        new THREE.LineBasicMaterial({ color: '#8e806a', transparent: true, opacity: 0.32, depthWrite: false }),
      );
      net.position.copy(liner.position);
      this.scene.add(net);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(radius * 1.16, radius * 1.29, 40),
        new THREE.MeshStandardMaterial({
          color: '#181c1a',
          emissive: '#d2a855',
          emissiveIntensity: 0,
          roughness: 0.42,
          metalness: 0.28,
          side: THREE.DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(pocket.x, 0.012, pocket.z);
      ring.userData.pocket = index;
      this.pocketRings.push(ring);
      this.scene.add(ring);
    });

    const sightMaterial = new THREE.MeshPhysicalMaterial({ color: '#efe4ca', metalness: 0.18, roughness: 0.24, clearcoat: 0.8 });
    [-0.95, -0.63, -0.32, 0.32, 0.63, 0.95].forEach((x) => {
      this.addSight(x, -TABLE.height / 2 - 0.092, sightMaterial);
      this.addSight(x, TABLE.height / 2 + 0.092, sightMaterial);
    });
    [-0.39, -0.2, 0.2, 0.39].forEach((z) => {
      this.addSight(-TABLE.width / 2 - 0.092, z, sightMaterial);
      this.addSight(TABLE.width / 2 + 0.092, z, sightMaterial);
    });

    const headLineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(TABLE.headStringX, 0.006, -TABLE.height / 2),
      new THREE.Vector3(TABLE.headStringX, 0.006, TABLE.height / 2),
    ]);
    const headLine = new THREE.Line(headLineGeometry, new THREE.LineDashedMaterial({ color: '#a7cabc', dashSize: 0.018, gapSize: 0.016, transparent: true, opacity: 0.2 }));
    headLine.computeLineDistances();
    this.scene.add(headLine);

    for (const x of [TABLE.headStringX, TABLE.footSpotX]) {
      const spot = new THREE.Mesh(
        new THREE.CircleGeometry(0.008, 20),
        new THREE.MeshBasicMaterial({ color: '#b9d3c8', transparent: true, opacity: 0.32, depthWrite: false }),
      );
      spot.rotation.x = -Math.PI / 2;
      spot.position.set(x, 0.007, 0);
      this.scene.add(spot);
    }
  }

  private addRoundedBox(
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
    material: THREE.Material,
    radius: number,
  ): THREE.Mesh {
    const safeRadius = Math.min(radius, width / 2, height / 2, depth / 2) * 0.9;
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 3, safeRadius), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  private addSight(x: number, z: number, material: THREE.Material): void {
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.012, 0), material);
    mesh.scale.set(1.5, 0.35, 1);
    mesh.position.set(x, 0.128, z);
    mesh.rotation.y = Math.PI / 4;
    this.scene.add(mesh);
  }

  private createBalls(): void {
    const widthSegments = this.usesReducedQuality ? 28 : 40;
    const heightSegments = this.usesReducedQuality ? 20 : 28;
    for (let number = 0; number <= 15; number += 1) {
      const texture = createBallTexture(number);
      const material = new THREE.MeshPhysicalMaterial({
        map: texture,
        roughness: 0.14,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        ior: 1.52,
        reflectivity: 0.62,
        envMapIntensity: 1.12,
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(TABLE.ballRadius, widthSegments, heightSegments), material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.number = number;
      this.ballMeshes.set(number, mesh);
      this.scene.add(mesh);
    }
  }

  private createCue(): void {
    const maple = new THREE.MeshPhysicalMaterial({ color: '#d9b779', roughness: 0.27, clearcoat: 0.72, clearcoatRoughness: 0.2 });
    const walnut = new THREE.MeshPhysicalMaterial({ color: '#532b20', roughness: 0.25, clearcoat: 0.82, clearcoatRoughness: 0.18 });
    const wrap = new THREE.MeshPhysicalMaterial({ color: '#171a19', roughness: 0.58, clearcoat: 0.18 });
    const ferruleMaterial = new THREE.MeshPhysicalMaterial({ color: '#eee7d7', roughness: 0.22, clearcoat: 0.64 });
    const tipMaterial = new THREE.MeshStandardMaterial({ color: '#2e6e83', roughness: 0.78 });

    const addCueSegment = (length: number, centerX: number, radiusStart: number, radiusEnd: number, material: THREE.Material) => {
      const segment = new THREE.Mesh(new THREE.CylinderGeometry(radiusEnd, radiusStart, length, 18), material);
      segment.rotation.z = -Math.PI / 2;
      segment.position.x = centerX;
      segment.castShadow = true;
      this.cueGroup.add(segment);
    };

    addCueSegment(0.018, -0.009, 0.0062, 0.0062, tipMaterial);
    addCueSegment(0.09, -0.063, 0.0063, 0.007, ferruleMaterial);
    addCueSegment(0.95, -0.583, 0.007, 0.012, maple);
    addCueSegment(0.2, -1.158, 0.012, 0.014, walnut);
    addCueSegment(0.24, -1.378, 0.014, 0.0155, wrap);
    addCueSegment(0.16, -1.578, 0.0155, 0.0175, walnut);

    const buttCap = new THREE.Mesh(new THREE.SphereGeometry(0.0175, 16, 10), walnut);
    buttCap.scale.x = 0.45;
    buttCap.position.x = -1.661;
    buttCap.castShadow = true;
    this.cueGroup.add(buttCap);
    this.scene.add(this.cueGroup);
  }

  private createAimLine(color: string, opacity: number, dashed: boolean): THREE.Line {
    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]);
    const material = dashed
      ? new THREE.LineDashedMaterial({ color, dashSize: 0.045, gapSize: 0.026, transparent: true, opacity, depthWrite: false })
      : new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    line.renderOrder = 4;
    return line;
  }

  private createAimContactRing(): THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial> {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(TABLE.ballRadius * 0.9, TABLE.ballRadius * 1.14, 36),
      new THREE.MeshBasicMaterial({ color: '#f8e5ac', transparent: true, opacity: 0.56, side: THREE.DoubleSide, depthWrite: false }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.visible = false;
    mesh.renderOrder = 5;
    return mesh;
  }

  private createGhostBall(color: string, opacity: number, wireframe: boolean): THREE.Mesh {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(TABLE.ballRadius * 1.03, 22, 14),
      new THREE.MeshBasicMaterial({ color, wireframe, transparent: true, opacity, depthWrite: false }),
    );
    mesh.visible = false;
    mesh.renderOrder = 5;
    return mesh;
  }

  private createPlacementZone(): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
    const width = TABLE.headStringX + TABLE.width / 2;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, TABLE.height - 0.02),
      new THREE.MeshBasicMaterial({ color: '#e4c37b', transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(-TABLE.width / 2 + width / 2, 0.005, 0);
    mesh.visible = false;
    mesh.renderOrder = 1;
    return mesh;
  }

  private applyDecorativeRack(): void {
    const order = createRackOrder(() => 0.42);
    const spacing = TABLE.ballRadius * 2.025;
    this.ballMeshes.forEach((mesh) => {
      mesh.visible = false;
      mesh.scale.setScalar(1);
      mesh.quaternion.identity();
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
      const placement = this.normalizePlacementPoint(point);
      const valid = this.isCuePlacementValid(placement.x, placement.z);
      const material = this.placementGhost.material as THREE.MeshBasicMaterial;
      material.color.set(valid ? '#f8f0dd' : '#d5535c');
      material.opacity = valid ? 0.52 : 0.68;
      this.placementGhost.position.set(placement.x, TABLE.ballRadius, placement.z);
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
      const placement = this.normalizePlacementPoint(point);
      this.callbacks.onPlaceCue(placement);
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
      this.renderer.domElement.classList.add('is-aiming');
      this.renderer.domElement.setPointerCapture(event.pointerId);
      this.updateAimFromPoint(point);
    }
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (this.aimPointerId !== event.pointerId) return;
    const point = this.getTablePoint(event);
    if (point) this.updateAimFromPoint(point);
    this.aimPointerId = null;
    this.renderer.domElement.classList.remove('is-aiming');
    if (this.renderer.domElement.hasPointerCapture(event.pointerId)) this.renderer.domElement.releasePointerCapture(event.pointerId);
  };

  private readonly handlePointerCancel = (event: PointerEvent): void => {
    if (this.aimPointerId === event.pointerId) {
      this.aimPointerId = null;
      this.renderer.domElement.classList.remove('is-aiming');
    }
  };

  private readonly handlePointerLeave = (): void => {
    if (this.interaction.canPlace && this.aimPointerId === null) this.placementGhost.visible = false;
  };

  private readonly handleWheel = (event: WheelEvent): void => {
    if (!this.interaction.canAim) return;
    event.preventDefault();
    const direction = event.deltaY > 0 ? -1 : 1;
    this.callbacks.onPowerChange(THREE.MathUtils.clamp(this.interaction.power + direction * 0.025, 0.05, 1));
    this.callbacks.onInteraction();
  };

  private updateAimFromPoint(point: THREE.Vector3): void {
    const cue = this.ballTargets.get(0);
    if (cue && !cue.pocketed) this.callbacks.onAim(Math.atan2(point.z - cue.z, point.x - cue.x));
  }

  private normalizePlacementPoint(point: THREE.Vector3): { x: number; z: number } {
    const margin = TABLE.ballRadius + 0.008;
    const maximumX = this.interaction.placementConstraint === 'kitchen'
      ? TABLE.headStringX
      : TABLE.width / 2 - margin;
    return {
      x: THREE.MathUtils.clamp(point.x, -TABLE.width / 2 + margin, maximumX),
      z: THREE.MathUtils.clamp(point.z, -TABLE.height / 2 + margin, TABLE.height / 2 - margin),
    };
  }

  private isCuePlacementValid(x: number, z: number): boolean {
    for (const [number, ball] of this.ballTargets) {
      if (number === 0 || ball.pocketed) continue;
      if (Math.hypot(ball.x - x, ball.z - z) < TABLE.ballRadius * 2.08) return false;
    }
    return POCKETS.every((pocket) => Math.hypot(pocket.x - x, pocket.z - z) >= TABLE.pocketRadius * 1.15);
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
    const now = performance.now();
    const targetFps = document.hidden ? 5 : this.softwareRenderer ? 15 : this.reducedRenderQuality ? 30 : 60;
    const minimumFrameTime = 1_000 / targetFps;
    if (now - this.lastRenderAt < minimumFrameTime - 1) return;
    this.lastRenderAt = now;
    if (this.renderer.domElement.offsetParent === null) {
      this.clock.getDelta();
      return;
    }
    const delta = Math.min(this.clock.getDelta(), 0.05);
    this.updateBalls(delta, now);
    this.updateAim(delta);
    this.updatePockets();
    this.updateCamera(delta);
    this.updateImpactEffects(delta);
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
        const previousX = mesh.position.x;
        const previousZ = mesh.position.z;
        mesh.position.x = THREE.MathUtils.lerp(previousX, target.x, sinkBlend);
        mesh.position.z = THREE.MathUtils.lerp(previousZ, target.z, sinkBlend);
        this.applyBallRoll(mesh, mesh.position.x - previousX, mesh.position.z - previousZ);
        mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, -0.18, sinkBlend);
        mesh.rotateOnWorldAxis(THREE.Object3D.DEFAULT_UP, delta * (number % 2 === 0 ? 4.2 : -4.2));
        if (mesh.position.y < -0.12) mesh.visible = false;
        continue;
      }
      let resetPosition = false;
      if (!mesh.visible) {
        mesh.position.set(target.x, TABLE.ballRadius, target.z);
        mesh.scale.setScalar(1);
        resetPosition = true;
      }
      mesh.visible = true;
      mesh.scale.lerp(this.unitScale, settleBlend);
      const previousX = mesh.position.x;
      const previousZ = mesh.position.z;
      mesh.position.x = target.x;
      mesh.position.z = target.z;
      mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, TABLE.ballRadius, settleBlend);
      if (!resetPosition) this.applyBallRoll(mesh, target.x - previousX, target.z - previousZ);
    }
  }

  private applyBallRoll(mesh: THREE.Mesh, deltaX: number, deltaZ: number): void {
    if (Math.hypot(deltaX, deltaZ) > TABLE.ballRadius * 12) return;
    const step = calculateRollingStep(deltaX, deltaZ, TABLE.ballRadius);
    if (!step) return;
    this.rollAxis.set(step.axisX, 0, step.axisZ);
    this.rollQuaternion.setFromAxisAngle(this.rollAxis, step.angle);
    mesh.quaternion.premultiply(this.rollQuaternion).normalize();
  }

  private updateAim(delta: number): void {
    const cue = this.ballTargets.get(0);
    const active = Boolean(cue && !cue.pocketed && this.interaction.canAim && this.snapshot?.phase === 'aiming');
    this.placementZone.visible = this.interaction.canPlace && this.interaction.placementConstraint === 'kitchen';
    if (this.shotAnimation) {
      this.updateShotAnimation(delta);
    } else {
      this.cueGroup.visible = active;
    }
    this.aimLine.visible = active;
    this.objectAimLine.visible = false;
    this.cueDeflectionLine.visible = false;
    this.aimContactRing.visible = false;
    this.ghostBall.visible = false;
    this.placementGhost.visible = this.interaction.canPlace && this.placementGhost.visible;
    if (!active || !cue) return;

    const directionX = Math.cos(this.interaction.aimAngle);
    const directionZ = Math.sin(this.interaction.aimAngle);
    const collision = this.findAimCollision(cue.x, cue.z, directionX, directionZ);
    this.setLinePoints(this.aimLine, cue.x, cue.z, collision.impactX, collision.impactZ);

    if (collision.ball) {
      this.ghostBall.position.set(collision.impactX, TABLE.ballRadius, collision.impactZ);
      this.ghostBall.visible = true;

      this.aimContactRing.position.set(collision.ball.x, 0.01, collision.ball.z);
      this.aimContactRing.scale.setScalar(1 + Math.sin(this.clock.elapsedTime * 4) * 0.05);
      this.aimContactRing.visible = true;

      const objectLength = Math.min(
        Math.max(0, this.distanceToBoundary(collision.ball.x, collision.ball.z, collision.normalX, collision.normalZ) - TABLE.ballRadius),
        0.42 + this.interaction.power * 0.52,
      );
      this.setLinePoints(
        this.objectAimLine,
        collision.ball.x,
        collision.ball.z,
        collision.ball.x + collision.normalX * objectLength,
        collision.ball.z + collision.normalZ * objectLength,
      );
      this.objectAimLine.visible = objectLength > 0.02;

      const dot = directionX * collision.normalX + directionZ * collision.normalZ;
      const tangentX = directionX - collision.normalX * dot;
      const tangentZ = directionZ - collision.normalZ * dot;
      const tangentLength = Math.hypot(tangentX, tangentZ);
      if (tangentLength > 0.12) {
        const deflectionLength = (0.2 + this.interaction.power * 0.22) * Math.min(1, tangentLength * 1.7);
        this.setLinePoints(
          this.cueDeflectionLine,
          collision.impactX,
          collision.impactZ,
          collision.impactX + tangentX / tangentLength * deflectionLength,
          collision.impactZ + tangentZ / tangentLength * deflectionLength,
        );
        this.cueDeflectionLine.visible = true;
      }
    }

    const tipGap = TABLE.ballRadius + 0.018 + this.interaction.power * 0.082;
    this.cueGroup.position.set(cue.x - directionX * tipGap, TABLE.ballRadius + 0.004, cue.z - directionZ * tipGap);
    this.cueGroup.rotation.y = -this.interaction.aimAngle;
  }

  private updateShotAnimation(delta: number): void {
    const shot = this.shotAnimation;
    if (!shot) return;
    shot.elapsed += delta;
    const strikeAt = 0.095;
    const duration = 0.29;
    const restGap = TABLE.ballRadius + 0.018 + shot.power * 0.082;
    const strikeGap = TABLE.ballRadius * 0.9;
    let gap: number;
    if (shot.elapsed <= strikeAt) {
      const progress = shot.elapsed / strikeAt;
      gap = THREE.MathUtils.lerp(restGap, strikeGap, progress * progress);
    } else {
      const progress = THREE.MathUtils.clamp((shot.elapsed - strikeAt) / (duration - strikeAt), 0, 1);
      const rebound = 1 - Math.pow(1 - progress, 3);
      gap = THREE.MathUtils.lerp(strikeGap, TABLE.ballRadius + 0.045, rebound);
      if (!shot.impactShown) {
        shot.impactShown = true;
        this.createImpactEffect(shot.cueX, shot.cueZ, '#f7e4b6', shot.power, 0.032);
      }
    }
    const directionX = Math.cos(shot.angle);
    const directionZ = Math.sin(shot.angle);
    this.cueGroup.position.set(shot.cueX - directionX * gap, TABLE.ballRadius + 0.004, shot.cueZ - directionZ * gap);
    this.cueGroup.rotation.y = -shot.angle;
    this.cueGroup.visible = true;
    if (shot.elapsed >= duration) {
      this.shotAnimation = null;
      this.cueGroup.visible = false;
    }
  }

  private setLinePoints(line: THREE.Line, fromX: number, fromZ: number, toX: number, toZ: number): void {
    const positions = line.geometry.attributes.position as THREE.BufferAttribute;
    positions.setXYZ(0, fromX, TABLE.ballRadius + 0.006, fromZ);
    positions.setXYZ(1, toX, TABLE.ballRadius + 0.006, toZ);
    positions.needsUpdate = true;
    line.computeLineDistances();
  }

  private findAimCollision(x: number, z: number, directionX: number, directionZ: number): AimCollision {
    let distance = this.distanceToBoundary(x, z, directionX, directionZ);
    let hitBall: BallTarget | null = null;
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
        hitBall = ball;
      }
    }
    distance = Math.max(0.04, distance);
    const impactX = x + directionX * distance;
    const impactZ = z + directionZ * distance;
    if (!hitBall) return { distance, ball: null, impactX, impactZ, normalX: 0, normalZ: 0 };
    const normalLength = Math.max(0.000_001, Math.hypot(hitBall.x - impactX, hitBall.z - impactZ));
    return {
      distance,
      ball: hitBall,
      impactX,
      impactZ,
      normalX: (hitBall.x - impactX) / normalLength,
      normalZ: (hitBall.z - impactZ) / normalLength,
    };
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
      material.emissiveIntensity = selected ? 2.2 : selectable ? 0.38 + Math.sin(time * 3 + index) * 0.16 : 0;
      material.color.set(selected ? '#c5a15f' : selectable ? '#51452e' : '#181c1a');
      ring.scale.setScalar(selected ? 1.1 : selectable ? 1 + Math.sin(time * 3 + index) * 0.025 : 1);
    });
  }

  private updateCamera(delta: number): void {
    const desired = this.desiredCamera;
    const cue = this.ballTargets.get(0);
    const target = this.cameraTarget;
    desired.up.set(0, 1, 0);
    let useLookAt = true;
    if (this.interaction.cameraMode === 'overhead') {
      const framedWidth = TABLE.width + 0.52;
      const framedHeight = TABLE.height + 0.52;
      const halfVertical = Math.max(framedHeight * 0.54, framedWidth / (Math.max(0.4, this.camera.aspect) * 2) * 1.08);
      const height = THREE.MathUtils.clamp(halfVertical / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)), 2.3, 5.65);
      desired.position.set(0, height, 0.001);
      desired.rotation.set(-Math.PI / 2, 0, 0);
      useLookAt = false;
    } else if (this.interaction.cameraMode === 'aim' && cue && !cue.pocketed) {
      const speed = Math.hypot(cue.vx, cue.vz);
      const followAngle = this.snapshot?.phase === 'rolling' && speed > 0.08 ? Math.atan2(cue.vz, cue.vx) : this.interaction.aimAngle;
      const directionX = Math.cos(followAngle);
      const directionZ = Math.sin(followAngle);
      desired.position.set(cue.x - directionX * 0.92, 0.55, cue.z - directionZ * 0.92);
      target.set(cue.x + directionX * 0.72, 0.018, cue.z + directionZ * 0.72);
    } else {
      const narrowBoost = THREE.MathUtils.clamp(1.25 - this.camera.aspect, 0, 0.42);
      desired.position.set(-3.02 - narrowBoost * 0.75, 2.3 + narrowBoost * 0.65, 2.22 + narrowBoost * 0.7);
      target.set(0.08, -0.02, 0);
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
    if (this.cameraImpulse > 0.0001) {
      const phase = this.clock.elapsedTime * 95;
      this.camera.position.x += Math.sin(phase) * this.cameraImpulse;
      this.camera.position.z += Math.cos(phase * 0.83) * this.cameraImpulse * 0.7;
      this.cameraImpulse *= Math.exp(-delta * 18);
    }
  }

  private locateEvent(event: GameEvent): { x: number; z: number } | null {
    if (event.type === 'pocket' && event.pocket !== undefined) return POCKETS[event.pocket] ?? null;
    if (event.type === 'shot') {
      const cue = this.ballTargets.get(0);
      return cue && !cue.pocketed ? { x: cue.x, z: cue.z } : null;
    }

    const balls = [...this.ballTargets.values()].filter((ball) => !ball.pocketed);
    if (event.type === 'collision') {
      let closest: { x: number; z: number; distance: number } | null = null;
      for (let index = 0; index < balls.length; index += 1) {
        for (let other = index + 1; other < balls.length; other += 1) {
          const distance = Math.hypot(balls[index].x - balls[other].x, balls[index].z - balls[other].z);
          if (!closest || distance < closest.distance) {
            closest = {
              x: (balls[index].x + balls[other].x) / 2,
              z: (balls[index].z + balls[other].z) / 2,
              distance,
            };
          }
        }
      }
      if (closest && closest.distance < TABLE.ballRadius * 2.8) return closest;
    }

    const fastest = balls.reduce<BallTarget | null>((current, ball) => {
      if (!current) return ball;
      return Math.hypot(ball.vx, ball.vz) > Math.hypot(current.vx, current.vz) ? ball : current;
    }, null);
    return fastest ? { x: fastest.x, z: fastest.z } : null;
  }

  private createImpactEffect(x: number, z: number, color: string, intensity: number, radius: number): void {
    if (this.reducedMotion && this.impactEffects.length > 0) return;
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: THREE.MathUtils.clamp(0.42 + intensity * 0.42, 0.42, 0.9),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.RingGeometry(radius * 0.56, radius, 36), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.038, z);
    mesh.renderOrder = 8;
    this.scene.add(mesh);
    this.impactEffects.push({
      mesh,
      age: 0,
      duration: this.reducedMotion ? 0.12 : 0.38 + intensity * 0.14,
      startScale: 0.45,
      growth: radius > 0.06 ? 1.15 : 2.25,
    });
  }

  private updateImpactEffects(delta: number): void {
    for (let index = this.impactEffects.length - 1; index >= 0; index -= 1) {
      const effect = this.impactEffects[index];
      effect.age += delta;
      const progress = THREE.MathUtils.clamp(effect.age / effect.duration, 0, 1);
      const scale = effect.startScale + effect.growth * (1 - Math.pow(1 - progress, 2));
      effect.mesh.scale.setScalar(scale);
      effect.mesh.material.opacity = (1 - progress) * 0.82;
      effect.mesh.position.y += delta * 0.018;
      if (progress < 1) continue;
      this.scene.remove(effect.mesh);
      effect.mesh.geometry.dispose();
      effect.mesh.material.dispose();
      this.impactEffects.splice(index, 1);
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
    this.renderer.shadowMap.needsUpdate = true;
  }

  private get usesReducedQuality(): boolean {
    return this.reducedRenderQuality || this.softwareRenderer;
  }
}

function createBallTexture(number: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext('2d')!;
  const color = BALL_COLORS[number];
  context.fillStyle = number >= 9 ? '#f2ecdf' : color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (number >= 9) {
    context.fillStyle = color;
    context.fillRect(0, 116, canvas.width, 280);
  }
  if (number === 0) {
    const dots = [
      [128, 256], [384, 150], [384, 362],
      [640, 256], [896, 150], [896, 362],
    ];
    for (const [x, y] of dots) {
      context.beginPath();
      context.arc(x, y, 18, 0, Math.PI * 2);
      context.fillStyle = '#b52c36';
      context.fill();
      context.lineWidth = 4;
      context.strokeStyle = '#7d1821';
      context.stroke();
    }
  } else {
    [256, 768].forEach((x) => {
      context.beginPath();
      context.arc(x, 256, 73, 0, Math.PI * 2);
      context.fillStyle = '#f7f1e5';
      context.fill();
      context.lineWidth = 5;
      context.strokeStyle = 'rgba(20, 24, 23, 0.2)';
      context.stroke();
      context.fillStyle = '#101415';
      context.font = '800 84px Arial, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(String(number), x, 260);
    });
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createFeltTexture(anisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#07563f';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const random = createSeededRandom(0x8ba11);
  for (let index = 0; index < 14_000; index += 1) {
    const shade = Math.floor(58 + random() * 48);
    context.fillStyle = `rgba(${12 + shade / 9}, ${shade}, ${43 + shade / 4}, ${0.035 + random() * 0.055})`;
    context.fillRect(random() * canvas.width, random() * canvas.height, 0.7 + random() * 1.4, 0.45 + random() * 0.8);
  }
  context.globalAlpha = 0.055;
  context.strokeStyle = '#d4eee2';
  context.lineWidth = 0.55;
  for (let y = 8; y < canvas.height; y += 13) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y + 1.5);
    context.stroke();
  }
  context.globalAlpha = 1;
  return configureRepeatingTexture(canvas, anisotropy, 4, 2);
}

function createWoodTexture(anisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#7d4027';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const random = createSeededRandom(0x51a2d);
  for (let line = 0; line < 92; line += 1) {
    const baseY = line / 91 * canvas.height + (random() - 0.5) * 4;
    context.beginPath();
    for (let x = 0; x <= canvas.width; x += 12) {
      const y = baseY + Math.sin(x * (0.012 + random() * 0.002) + line * 0.62) * (1.4 + random() * 2.1);
      if (x === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = line % 4 === 0 ? 'rgba(51, 20, 12, 0.23)' : 'rgba(244, 172, 104, 0.11)';
    context.lineWidth = line % 7 === 0 ? 1.8 : 0.8;
    context.stroke();
  }
  for (const [x, y, radius] of [[220, 88, 24], [742, 174, 31], [928, 62, 16]] as const) {
    for (let ring = 0; ring < 5; ring += 1) {
      context.beginPath();
      context.ellipse(x, y, radius + ring * 7, radius * 0.32 + ring * 2.2, -0.08, 0, Math.PI * 2);
      context.strokeStyle = `rgba(55, 22, 13, ${0.2 - ring * 0.026})`;
      context.lineWidth = 1.4;
      context.stroke();
    }
  }
  return configureRepeatingTexture(canvas, anisotropy, 2.2, 1);
}

function createFloorTexture(anisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#171b1c';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const random = createSeededRandom(0x772e1);
  for (let index = 0; index < 5_000; index += 1) {
    const light = Math.floor(30 + random() * 24);
    context.fillStyle = `rgba(${light}, ${light + 3}, ${light + 4}, ${0.045 + random() * 0.08})`;
    context.fillRect(random() * 512, random() * 512, 1 + random() * 2, 1 + random() * 2);
  }
  context.strokeStyle = 'rgba(158, 165, 163, 0.07)';
  context.lineWidth = 2;
  for (let offset = 0; offset <= 512; offset += 128) {
    context.beginPath();
    context.moveTo(offset, 0);
    context.lineTo(offset, 512);
    context.stroke();
    context.beginPath();
    context.moveTo(0, offset);
    context.lineTo(512, offset);
    context.stroke();
  }
  return configureRepeatingTexture(canvas, anisotropy, 6, 4);
}

function configureRepeatingTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeatX: number,
  repeatY: number,
): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = anisotropy;
  return texture;
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = Math.imul(state ^ state >>> 15, 1 | state);
    state ^= state + Math.imul(state ^ state >>> 7, 61 | state);
    return ((state ^ state >>> 14) >>> 0) / 4_294_967_296;
  };
}

function isSoftwareRenderer(renderer: THREE.WebGLRenderer): boolean {
  const context = renderer.getContext();
  const debugInfo = context.getExtension('WEBGL_debug_renderer_info');
  const rendererName = String(debugInfo
    ? context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    : context.getParameter(context.RENDERER));
  return /swiftshader|llvmpipe|software/i.test(rendererName);
}
