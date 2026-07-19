import {
  BASE_POWER_SUPPLY,
  BASE_STORAGE_CAPACITY,
  COMPLETED_MISSION_STAGE,
  LAUNCH_REQUIREMENTS,
  MANUAL_GATHER_AMOUNT,
  MANUAL_GATHER_DURATION_MS,
  MAX_OFFLINE_SECONDS,
  PRODUCTION_LINE_BY_ID,
  PRODUCTION_LINE_DEFINITIONS,
  PRODUCTION_LINES,
  RAW_RESOURCE_IDS,
  RESOURCE_BY_ID,
  RESOURCE_IDS,
  SPECIALIZATION_BY_ID,
  SPECIALIZATION_IDS,
  TECHNOLOGY_BY_ID,
  TECHNOLOGY_IDS,
  createResourceAmounts,
  getResourceCapacity,
  isProductionLineUnlocked,
  isResourceUnlocked,
  isTechnologyVisible,
  type LineCategory,
  type ProductionLineDefinition,
  type ProductionLineId,
  type ProductionPriority,
  type ResourceAmounts,
  type ResourceId,
  type SpecializationId,
  type TechnologyId,
} from '../shared/catalog';
import type {
  FactoryCommand,
  FactoryModifiersView,
  FactorySnapshot,
  FactorySync,
  ManualGatherJobTuple,
  ManualGatherResourceId,
  MissionView,
  ObjectiveView,
  PowerView,
} from '../shared/protocol';

export interface ProductionLineState {
  count: number;
  active: number;
  priority: ProductionPriority;
}

export interface ContributorState {
  manualGathered: number;
  buildingsBuilt: number;
  technologiesUnlocked: number;
  commands: number;
  assistedProduction: number;
  specialization: SpecializationId | null;
}

export interface ManualGatherJobState {
  resourceId: ManualGatherResourceId;
  startedAt: number;
  completesAt: number;
}

export interface FactoryState {
  version: 2;
  sequence: number;
  phase: 'running' | 'completed';
  createdAt: number;
  lastSimulatedAt: number;
  totalRuntimeSeconds: number;
  completedAt: number | null;
  missionStage: number;
  resources: ResourceAmounts;
  rates: ResourceAmounts;
  lines: Record<ProductionLineId, ProductionLineState>;
  technologies: TechnologyId[];
  contributors: Record<string, ContributorState>;
  manualJobs: Record<string, ManualGatherJobState>;
}

export interface AdvanceResult {
  simulatedSeconds: number;
  discardedSeconds: number;
  changed: boolean;
  missionChanged: boolean;
  completedManualJobs: number;
}

export interface CommandExecution {
  ok: boolean;
  error?: string;
  message?: string;
  kind?: 'build' | 'research' | 'launch' | 'role' | 'priority';
}

interface SimulationLineContext {
  definition: ProductionLineDefinition & { id: ProductionLineId };
  active: number;
  roleMultiplier: number;
  specialists: ContributorState[];
}

interface SimulationContext {
  modifiers: FactoryModifiersView;
  storageCapacity: number;
  productionLines: SimulationLineContext[];
  powerDemand: number;
  freePowerSupply: number;
  fueledGenerators: Array<ProductionLineDefinition & { id: ProductionLineId }>;
}

const MAX_SIMULATION_STEP_SECONDS = 30;
const MAX_SIMULATION_STEPS = 360;
const EPSILON = 1e-7;
const LEGACY_STAGE_MAP = [0, 1, 2, 3, 5, 8, COMPLETED_MISSION_STAGE] as const;

export function createFactoryState(now = Date.now()): FactoryState {
  const resources = createResourceAmounts();
  resources.ironOre = 35;
  resources.stone = 30;
  resources.coal = 20;
  return {
    version: 2,
    sequence: 1,
    phase: 'running',
    createdAt: now,
    lastSimulatedAt: now,
    totalRuntimeSeconds: 0,
    completedAt: null,
    missionStage: 0,
    resources,
    rates: createResourceAmounts(),
    lines: createProductionLineStates(),
    technologies: [],
    contributors: {},
    manualJobs: {},
  };
}

export function advanceFactoryTo(state: FactoryState, now = Date.now()): AdvanceResult {
  if (now <= state.lastSimulatedAt) {
    const previousMission = state.missionStage;
    const completedManualJobs = settleManualGatherJobs(state, now);
    if (completedManualJobs > 0) {
      advanceMission(state);
      state.sequence += 1;
    }
    return {
      simulatedSeconds: 0,
      discardedSeconds: 0,
      changed: completedManualJobs > 0,
      missionChanged: previousMission !== state.missionStage,
      completedManualJobs,
    };
  }

  const elapsedSeconds = (now - state.lastSimulatedAt) / 1_000;
  state.lastSimulatedAt = now;
  if (state.phase === 'completed') {
    state.rates = createResourceAmounts();
    return { simulatedSeconds: 0, discardedSeconds: elapsedSeconds, changed: false, missionChanged: false, completedManualJobs: 0 };
  }

  const simulatedSeconds = Math.min(elapsedSeconds, MAX_OFFLINE_SECONDS);
  const discardedSeconds = Math.max(0, elapsedSeconds - simulatedSeconds);
  const previousMission = state.missionStage;
  const before = { ...state.resources };
  const context = createSimulationContext(state);
  const maxStepSeconds = Math.max(MAX_SIMULATION_STEP_SECONDS, simulatedSeconds / MAX_SIMULATION_STEPS);
  let remaining = simulatedSeconds;
  while (remaining > EPSILON) {
    const step = Math.min(maxStepSeconds, remaining);
    simulateStep(state, step, context);
    remaining -= step;
  }

  const automatedDelta = Object.fromEntries(
    RESOURCE_IDS.map((id) => [id, state.resources[id] - before[id]]),
  ) as ResourceAmounts;
  const completedManualJobs = settleManualGatherJobs(state, now);

  state.totalRuntimeSeconds += simulatedSeconds;
  for (const id of RESOURCE_IDS) {
    state.resources[id] = normalizeAmount(state.resources[id]);
    state.rates[id] = simulatedSeconds > 0 ? normalizeRate(automatedDelta[id] / simulatedSeconds) : 0;
  }
  advanceMission(state);
  state.sequence += 1;
  return {
    simulatedSeconds,
    discardedSeconds,
    changed: completedManualJobs > 0 || RESOURCE_IDS.some((id) => Math.abs(automatedDelta[id]) > EPSILON),
    missionChanged: previousMission !== state.missionStage,
    completedManualJobs,
  };
}

export function executeFactoryCommand(
  state: FactoryState,
  command: FactoryCommand,
  accountId: string,
  now = Date.now(),
): CommandExecution {
  if (state.phase === 'completed') return { ok: false, error: '本轮轨道火箭已经发射' };
  const contributor = contributorFor(state, accountId);
  let result: CommandExecution;

  switch (command.type) {
    case 'gather':
      result = startManualGather(state, accountId, command.resourceId, now);
      break;
    case 'build':
      result = buildLine(state, command.lineId, command.amount ?? 1);
      if (result.ok) contributor.buildingsBuilt += command.amount ?? 1;
      break;
    case 'dismantle':
      result = dismantleLine(state, command.lineId);
      break;
    case 'setActive':
      result = setActiveCount(state, command.lineId, command.active);
      break;
    case 'setPriority':
      result = setProductionPriority(state, command.lineId, command.priority);
      break;
    case 'research':
      result = unlockTechnology(state, command.technologyId);
      if (result.ok) contributor.technologiesUnlocked += 1;
      break;
    case 'assignSpecialization':
      result = assignSpecialization(state, accountId, command.specializationId);
      break;
    case 'launch':
      result = launchRocket(state, now);
      break;
  }

  if (!result.ok) return result;
  contributor.commands += 1;
  advanceMission(state);
  state.sequence += 1;
  return result;
}

export function toFactorySnapshot(state: FactoryState, serverTime = Date.now()): FactorySnapshot {
  return {
    sequence: state.sequence,
    serverTime,
    simulatedAt: state.lastSimulatedAt,
    phase: state.phase,
    resources: RESOURCE_IDS.map((id) => roundForWire(state.resources[id])),
    rates: RESOURCE_IDS.map((id) => roundForWire(state.rates[id])),
    manualJobs: toManualGatherJobTuples(state),
    lines: PRODUCTION_LINE_DEFINITIONS.map((line) => {
      const lineState = state.lines[line.id];
      return [line.id, lineState.count, lineState.active, lineState.priority];
    }),
    technologies: [...state.technologies],
    mission: getMissionView(state),
    power: getPowerView(state),
    modifiers: getFactoryModifiers(state),
    storageCapacity: getStorageCapacity(state),
    totalRuntimeSeconds: Math.round(state.totalRuntimeSeconds),
    completedAt: state.completedAt,
  };
}

export function toFactorySync(state: FactoryState, serverTime = Date.now()): FactorySync {
  const power = getPowerView(state);
  return {
    sequence: state.sequence,
    serverTime,
    simulatedAt: state.lastSimulatedAt,
    resources: RESOURCE_IDS.map((id) => roundForWire(state.resources[id])),
    rates: RESOURCE_IDS.map((id) => roundForWire(state.rates[id])),
    manualJobs: toManualGatherJobTuples(state),
    power: [power.supply, power.demand, power.satisfaction],
    totalRuntimeSeconds: Math.round(state.totalRuntimeSeconds),
  };
}

export function getContributionScore(state: FactoryState, accountId: string): number {
  const contributor = state.contributors[accountId];
  if (!contributor) return 0;
  return Math.round(
    contributor.manualGathered
    + contributor.buildingsBuilt * 30
    + contributor.technologiesUnlocked * 180
    + contributor.assistedProduction * 3
    + contributor.commands,
  );
}

export function getContributorSpecialization(state: FactoryState, accountId: string): SpecializationId | null {
  return state.contributors[accountId]?.specialization ?? null;
}

export function getStorageCapacity(state: FactoryState): number {
  return BASE_STORAGE_CAPACITY + PRODUCTION_LINE_DEFINITIONS.reduce((sum, definition) => (
    sum + state.lines[definition.id].count * (definition.storageBonus ?? 0)
  ), 0);
}

export function getFactoryModifiers(state: FactoryState): FactoryModifiersView {
  let throughput = 0;
  let productivity = 0;
  let powerEfficiency = 0;
  for (const definition of PRODUCTION_LINE_DEFINITIONS) {
    const active = state.lines[definition.id].active;
    throughput += active * (definition.throughputBonus ?? 0);
    productivity += active * (definition.productivityBonus ?? 0);
    powerEfficiency += active * (definition.powerEfficiencyBonus ?? 0);
  }
  return {
    throughput: roundForWire(Math.min(0.65, throughput)),
    productivity: roundForWire(Math.min(0.25, productivity)),
    powerEfficiency: roundForWire(Math.min(0.45, powerEfficiency)),
  };
}

export function getPowerView(state: FactoryState): PowerView {
  const modifiers = getFactoryModifiers(state);
  const demand = getRawPowerDemand(state) * (1 - modifiers.powerEfficiency);
  let supply = BASE_POWER_SUPPLY;
  for (const definition of PRODUCTION_LINE_DEFINITIONS) {
    if (!definition.powerSupply) continue;
    const active = state.lines[definition.id].active;
    if (active <= 0) continue;
    if (definition.fuel && !canFuelGeneratorRun(state, definition)) continue;
    supply += active * definition.powerSupply;
  }
  return {
    supply: roundForWire(supply),
    demand: roundForWire(demand),
    satisfaction: demand <= EPSILON ? 1 : roundForWire(Math.min(1, supply / demand)),
  };
}

export function getMissionView(state: FactoryState): MissionView {
  if (state.phase === 'completed') {
    return {
      stage: COMPLETED_MISSION_STAGE,
      title: '轨道火箭发射成功',
      status: '本轮协作工业任务完成',
      objectives: [],
      progress: 1,
    };
  }

  const stages: Array<{ title: string; status: string; objectives: ObjectiveView[] }> = [
    {
      title: '建立采掘前哨',
      status: '协作采集第一批建材',
      objectives: [
        objective('iron-stock', '铁矿库存', state.resources.ironOre, 50),
        objective('stone-stock', '岩石库存', state.resources.stone, 40),
      ],
    },
    {
      title: '启动基础自动化',
      status: '让采掘和冶炼持续运转',
      objectives: [
        objective('iron-drill', '铁矿采掘机', state.lines.ironDrill.count, 1),
        objective('coal-drill', '煤层采掘机', state.lines.coalDrill.count, 1),
        objective('iron-furnace', '铁板熔炉', state.lines.ironFurnace.count, 1),
      ],
    },
    {
      title: '建立自动化科研',
      status: '生产首批科学包并启动实验室',
      objectives: [
        objective('circuit-stock', '电子电路库存', state.resources.circuit, 20),
        objective('automation-science', '自动化科学包', state.resources.automationScience, 30),
        objective('research-lab', '运行中的实验室', state.lines.researchLab.active, 1),
      ],
    },
    {
      title: '铺设物流与动力网',
      status: '建立蒸汽电网和物流科研链',
      objectives: [
        objective('logistics-tech', '基础物流研究', hasTechnology(state, 'logistics') ? 1 : 0, 1),
        objective('steam-power', '燃煤蒸汽机组', state.lines.steamPowerPlant.count, 1),
        objective('logistic-science', '物流科学包', state.resources.logisticScience, 30),
      ],
    },
    {
      title: '打通石油化工',
      status: '建立原油、塑料、硫磺和化工科研链',
      objectives: [
        objective('oil-tech', '基础炼油研究', hasTechnology(state, 'oilProcessing') ? 1 : 0, 1),
        objective('oil-pump', '油田抽油机', state.lines.oilPumpjack.count, 1),
        objective('chemical-science-line', '化工科学装配线', state.lines.chemicalScienceAssembler.count, 1),
        objective('chemical-science', '化工科学包', state.resources.chemicalScience, 25),
      ],
    },
    {
      title: '建立高级制造',
      status: '完成处理器、电炉和生产科学前置研究',
      objectives: [
        objective('processing-unit', '处理器库存', state.resources.processingUnit, 15),
        objective('electric-furnace-line', '电炉组件厂', state.lines.electricFurnaceWorks.count, 1),
        objective('production-science-tech', '生产科学研究', hasTechnology(state, 'productionScience') ? 1 : 0, 1),
      ],
    },
    {
      title: '扩张生产科学',
      status: '用铁路、电炉和模块支撑终局科研',
      objectives: [
        objective('production-science-line', '生产科学装配线', state.lines.productionScienceAssembler.count, 1),
        objective('production-science-stock', '生产科学包', state.resources.productionScience, 60),
        objective('utility-tech', '效用科学研究', hasTechnology(state, 'utilityScience') ? 1 : 0, 1),
      ],
    },
    {
      title: '整合机器人与效用科学',
      status: '完成所有火箭工业前置科技',
      objectives: [
        objective('utility-line', '效用科学装配线', state.lines.utilityScienceAssembler.count, 1),
        objective('utility-stock', '效用科学包', state.resources.utilityScience, 80),
        objective('rocket-silo-tech', '火箭发射井研究', hasTechnology(state, 'rocketSilo') ? 1 : 0, 1),
      ],
    },
    {
      title: '建设轨道发射基地',
      status: '部署三条火箭组件线和发射井',
      objectives: [
        objective('low-density-line', '轻质结构装配线', state.lines.lowDensityStructureAssembler.count, 1),
        objective('rocket-fuel-line', '火箭燃料精炼线', state.lines.rocketFuelAssembler.count, 1),
        objective('rocket-control-line', '火箭控制装配线', state.lines.rocketControlUnitAssembler.count, 1),
        objective('rocket-silo', '轨道火箭发射井', state.lines.rocketSilo.count, 1),
        objective('satellite-line', '轨道卫星总装线', state.lines.satelliteAssembler.count, 1),
      ],
    },
    {
      title: '组装并发射火箭',
      status: '备齐火箭部件和轨道卫星',
      objectives: Object.entries(LAUNCH_REQUIREMENTS).map(([id, target]) => objective(
        `launch-${id}`,
        `${RESOURCE_BY_ID[id as ResourceId].name}库存`,
        state.resources[id as ResourceId],
        target ?? 0,
      )),
    },
  ];

  const stage = Math.min(state.missionStage, stages.length - 1);
  const selected = stages[stage];
  const progress = selected.objectives.length === 0
    ? 1
    : selected.objectives.reduce((sum, item) => sum + Math.min(1, item.current / item.target), 0) / selected.objectives.length;
  return { stage, ...selected, progress: roundForWire(progress) };
}

export function migrateFactoryState(value: unknown): FactoryState | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const version = source.version;
  if (version !== 1 && version !== 2) return null;
  if (source.phase !== 'running' && source.phase !== 'completed') return null;
  if (!isFiniteNumber(source.createdAt) || !isFiniteNumber(source.lastSimulatedAt) || !isNonNegativeNumber(source.totalRuntimeSeconds)) return null;
  if (!isPositiveInteger(source.sequence) || !isNonNegativeInteger(source.missionStage)) return null;
  if (!source.resources || typeof source.resources !== 'object' || !source.rates || typeof source.rates !== 'object') return null;
  if (!source.lines || typeof source.lines !== 'object' || !Array.isArray(source.technologies) || !source.contributors || typeof source.contributors !== 'object') return null;

  const resources = createResourceAmounts();
  const rates = createResourceAmounts();
  copyKnownAmounts(resources, source.resources, false);
  copyKnownAmounts(rates, source.rates, true);
  if (version === 1) migrateLegacyResources(resources, source.resources as Record<string, unknown>);

  const lines = createProductionLineStates();
  copyKnownLines(lines, source.lines as Record<string, unknown>);
  if (version === 1) migrateLegacyLines(lines, source.lines as Record<string, unknown>);

  const technologies = migrateTechnologies(source.technologies, version);
  const contributors = migrateContributors(source.contributors as Record<string, unknown>);
  const manualJobs = migrateManualJobs(source.manualJobs);
  const completedAt = source.completedAt === null || source.completedAt === undefined
    ? null
    : isFiniteNumber(source.completedAt) ? source.completedAt : null;
  if (source.phase === 'completed' && completedAt === null) return null;

  const legacyStage = Math.min(LEGACY_STAGE_MAP.length - 1, Number(source.missionStage));
  const missionStage = version === 1
    ? LEGACY_STAGE_MAP[legacyStage]
    : Math.min(COMPLETED_MISSION_STAGE, Number(source.missionStage));

  return {
    version: 2,
    sequence: Number(source.sequence),
    phase: source.phase,
    createdAt: source.createdAt,
    lastSimulatedAt: source.lastSimulatedAt,
    totalRuntimeSeconds: source.totalRuntimeSeconds,
    completedAt,
    missionStage: source.phase === 'completed' ? COMPLETED_MISSION_STAGE : missionStage,
    resources,
    rates,
    lines,
    technologies,
    contributors,
    manualJobs,
  };
}

export function isFactoryState(value: unknown): value is FactoryState {
  return migrateFactoryState(value) !== null;
}

function createSimulationContext(state: FactoryState): SimulationContext {
  const modifiers = getFactoryModifiers(state);
  const storageCapacity = getStorageCapacity(state);
  const productionLines = PRODUCTION_LINE_DEFINITIONS
    .filter((definition) => state.lines[definition.id].active > 0 && Object.keys(definition.outputs).length > 0)
    .sort((left, right) => state.lines[right.id].priority - state.lines[left.id].priority)
    .map((definition) => {
      const specialists = specialistsForCategory(state, definition.category);
      return {
        definition,
        active: state.lines[definition.id].active,
        roleMultiplier: specializationMultiplierForCount(specialists.length),
        specialists,
      };
    });
  let freePowerSupply = BASE_POWER_SUPPLY;
  const fueledGenerators: Array<ProductionLineDefinition & { id: ProductionLineId }> = [];
  for (const definition of PRODUCTION_LINE_DEFINITIONS) {
    const active = state.lines[definition.id].active;
    if (!definition.powerSupply || active <= 0) continue;
    if (definition.fuel) fueledGenerators.push(definition);
    else freePowerSupply += active * definition.powerSupply;
  }
  return {
    modifiers,
    storageCapacity,
    productionLines,
    powerDemand: getRawPowerDemand(state) * (1 - modifiers.powerEfficiency),
    freePowerSupply,
    fueledGenerators,
  };
}

function simulateStep(state: FactoryState, seconds: number, context: SimulationContext): void {
  const powerScale = consumeGeneratorFuelAndGetPowerScale(state, seconds, context);
  for (const lineContext of context.productionLines) {
    const { definition, active, roleMultiplier, specialists } = lineContext;
    let operatingUnits = active * seconds * powerScale * (1 + context.modifiers.throughput) * roleMultiplier;
    for (const [resourceId, rate] of amountEntries(definition.inputs)) {
      if (rate > 0) operatingUnits = Math.min(operatingUnits, state.resources[resourceId] / rate);
    }
    for (const [resourceId, rawOutputRate] of amountEntries(definition.outputs)) {
      const inputRate = definition.inputs[resourceId] ?? 0;
      const outputRate = rawOutputRate * (1 + context.modifiers.productivity);
      const netRate = outputRate - inputRate;
      if (netRate <= EPSILON) continue;
      const capacity = getResourceCapacity(resourceId, context.storageCapacity);
      operatingUnits = Math.min(operatingUnits, Math.max(0, capacity - state.resources[resourceId]) / netRate);
    }
    if (operatingUnits <= EPSILON) continue;

    for (const [resourceId, rate] of amountEntries(definition.inputs)) state.resources[resourceId] -= rate * operatingUnits;
    let totalOutput = 0;
    for (const [resourceId, rate] of amountEntries(definition.outputs)) {
      const output = rate * operatingUnits * (1 + context.modifiers.productivity);
      state.resources[resourceId] += output;
      totalOutput += output;
    }
    creditSpecialists(specialists, totalOutput, roleMultiplier);
  }
}

function consumeGeneratorFuelAndGetPowerScale(state: FactoryState, seconds: number, context: SimulationContext): number {
  if (context.powerDemand <= EPSILON) return 1;
  let supplied = context.freePowerSupply;
  let remainingDemand = Math.max(0, context.powerDemand - supplied);

  for (const definition of context.fueledGenerators) {
    if (!definition.fuel || !definition.powerSupply || remainingDemand <= EPSILON) continue;
    const active = state.lines[definition.id].active;
    const capacity = active * definition.powerSupply;
    const fullFuel = active * definition.fuel.perSecond * seconds;
    const requiredUtilization = Math.min(1, remainingDemand / capacity);
    let availableUtilization = fullFuel <= EPSILON ? 1 : Math.min(1, state.resources[definition.fuel.resourceId] / fullFuel);
    if (definition.fuel.byproductId) {
      const byproductCapacity = getResourceCapacity(definition.fuel.byproductId, context.storageCapacity);
      availableUtilization = Math.min(
        availableUtilization,
        fullFuel <= EPSILON ? 1 : Math.max(0, byproductCapacity - state.resources[definition.fuel.byproductId]) / fullFuel,
      );
    }
    const utilization = Math.min(requiredUtilization, availableUtilization);
    if (utilization <= EPSILON) continue;
    const consumed = fullFuel * utilization;
    state.resources[definition.fuel.resourceId] -= consumed;
    if (definition.fuel.byproductId) state.resources[definition.fuel.byproductId] += consumed;
    const generated = capacity * utilization;
    supplied += generated;
    remainingDemand = Math.max(0, remainingDemand - generated);
  }
  return Math.min(1, supplied / context.powerDemand);
}

function startManualGather(
  state: FactoryState,
  accountId: string,
  resourceId: ManualGatherResourceId,
  now: number,
): CommandExecution {
  if (!RAW_RESOURCE_IDS.includes(resourceId)) return { ok: false, error: '只能手动采集基础资源' };
  if (!isResourceUnlocked(resourceId, state.missionStage, state.technologies)) return { ok: false, error: '该资源尚未解锁' };
  if (state.manualJobs[accountId]) return { ok: false, error: '已有手动采集作业正在进行' };
  const capacity = getResourceCapacity(resourceId, getStorageCapacity(state));
  if (state.resources[resourceId] >= capacity - EPSILON) return { ok: false, error: '该资源仓储已满' };
  state.manualJobs[accountId] = {
    resourceId,
    startedAt: now,
    completesAt: now + MANUAL_GATHER_DURATION_MS,
  };
  return { ok: true };
}

function settleManualGatherJobs(state: FactoryState, now: number): number {
  let completed = 0;
  const storageCapacity = getStorageCapacity(state);
  for (const [accountId, job] of Object.entries(state.manualJobs)) {
    if (job.completesAt > now) continue;
    const before = state.resources[job.resourceId];
    const capacity = getResourceCapacity(job.resourceId, storageCapacity);
    state.resources[job.resourceId] = Math.min(capacity, before + MANUAL_GATHER_AMOUNT);
    contributorFor(state, accountId).manualGathered += state.resources[job.resourceId] - before;
    delete state.manualJobs[accountId];
    completed += 1;
  }
  return completed;
}

function toManualGatherJobTuples(state: FactoryState): ManualGatherJobTuple[] {
  return Object.entries(state.manualJobs)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([accountId, job]) => [accountId, job.resourceId, job.startedAt, job.completesAt]);
}

function buildLine(state: FactoryState, lineId: ProductionLineId, amount: 1 | 5 | 10): CommandExecution {
  const definition = PRODUCTION_LINE_BY_ID[lineId];
  if (!definition) return { ok: false, error: '生产设施不存在' };
  if (!isProductionLineUnlocked(lineId, state.missionStage, state.technologies)) return { ok: false, error: '该生产设施尚未解锁' };
  const line = state.lines[lineId];
  if (line.count + amount > definition.maxCount) return { ok: false, error: '本次建造会超过设施数量上限' };
  if (!canAfford(state.resources, definition.buildCost, amount)) return { ok: false, error: '建造资源不足' };
  applyCost(state.resources, definition.buildCost, -1, amount);
  line.count += amount;
  if (!definition.passive) line.active += amount;
  return { ok: true, kind: 'build', message: `建造了 ${amount > 1 ? `${amount} 座` : ''}${definition.name}` };
}

function dismantleLine(state: FactoryState, lineId: ProductionLineId): CommandExecution {
  const definition = PRODUCTION_LINE_BY_ID[lineId];
  if (!definition) return { ok: false, error: '生产设施不存在' };
  if (!isProductionLineUnlocked(lineId, state.missionStage, state.technologies)) return { ok: false, error: '该生产设施尚未解锁' };
  const line = state.lines[lineId];
  if (line.count <= 0) return { ok: false, error: '没有可拆除的设施' };
  line.count -= 1;
  line.active = Math.min(line.active, line.count);
  const storageCapacity = getStorageCapacity(state);
  for (const [resourceId, amount] of amountEntries(definition.buildCost)) {
    const capacity = getResourceCapacity(resourceId, storageCapacity);
    state.resources[resourceId] = Math.min(capacity, state.resources[resourceId] + amount * 0.5);
  }
  return { ok: true, kind: 'build', message: `拆除了 ${definition.name}` };
}

function setActiveCount(state: FactoryState, lineId: ProductionLineId, requested: number): CommandExecution {
  const definition = PRODUCTION_LINE_BY_ID[lineId];
  const line = state.lines[lineId];
  if (!definition || !line) return { ok: false, error: '生产设施不存在' };
  if (!isProductionLineUnlocked(lineId, state.missionStage, state.technologies)) return { ok: false, error: '该生产设施尚未解锁' };
  if (definition.passive) return { ok: false, error: '该设施无需启停' };
  if (!Number.isInteger(requested) || requested < 0 || requested > line.count) return { ok: false, error: '运行数量无效' };
  line.active = requested;
  return { ok: true };
}

function setProductionPriority(
  state: FactoryState,
  lineId: ProductionLineId,
  priority: ProductionPriority,
): CommandExecution {
  const definition = PRODUCTION_LINE_BY_ID[lineId];
  const line = state.lines[lineId];
  if (!definition || !line) return { ok: false, error: '生产设施不存在' };
  if (!isProductionLineUnlocked(lineId, state.missionStage, state.technologies)) return { ok: false, error: '该生产设施尚未解锁' };
  if (Object.keys(definition.outputs).length === 0) return { ok: false, error: '该设施不参与物料分配' };
  if (priority !== 0 && priority !== 1 && priority !== 2) return { ok: false, error: '生产优先级无效' };
  line.priority = priority;
  const label = priority === 2 ? '高' : priority === 0 ? '低' : '标准';
  return { ok: true, kind: 'priority', message: `将 ${definition.name} 调整为${label}优先级` };
}

function unlockTechnology(state: FactoryState, technologyId: TechnologyId): CommandExecution {
  const definition = TECHNOLOGY_BY_ID[technologyId];
  if (!definition) return { ok: false, error: '研究项目不存在' };
  if (hasTechnology(state, technologyId)) return { ok: false, error: '该技术已经完成' };
  if (!isTechnologyVisible(technologyId, state.missionStage, state.technologies)) return { ok: false, error: '该研究项目尚未开放' };
  if (state.lines.researchLab.active < 1) return { ok: false, error: '至少需要一座运行中的研究实验室' };
  if (!canAfford(state.resources, definition.cost)) return { ok: false, error: '科学包不足' };
  applyCost(state.resources, definition.cost, -1);
  state.technologies.push(technologyId);
  return { ok: true, kind: 'research', message: `完成研究：${definition.name}` };
}

function assignSpecialization(
  state: FactoryState,
  accountId: string,
  specializationId: SpecializationId,
): CommandExecution {
  const definition = SPECIALIZATION_BY_ID[specializationId];
  if (!definition) return { ok: false, error: '协作岗位不存在' };
  const contributor = contributorFor(state, accountId);
  if (contributor.specialization === specializationId) return { ok: false, error: '已经承担该协作岗位' };
  contributor.specialization = specializationId;
  return { ok: true, kind: 'role', message: `承担了协作岗位：${definition.name}` };
}

function launchRocket(state: FactoryState, now: number): CommandExecution {
  if (!hasTechnology(state, 'rocketSilo')) return { ok: false, error: '尚未掌握火箭发射井技术' };
  if (state.lines.rocketSilo.count < 1) return { ok: false, error: '尚未建造轨道火箭发射井' };
  if (!canAfford(state.resources, LAUNCH_REQUIREMENTS)) return { ok: false, error: '火箭或轨道卫星尚未备齐' };
  applyCost(state.resources, LAUNCH_REQUIREMENTS, -1);
  state.phase = 'completed';
  state.completedAt = now;
  state.missionStage = COMPLETED_MISSION_STAGE;
  state.rates = createResourceAmounts();
  state.manualJobs = {};
  return { ok: true, kind: 'launch', message: '轨道火箭发射成功，本轮协作任务完成' };
}

function advanceMission(state: FactoryState): void {
  while (state.phase === 'running' && state.missionStage < COMPLETED_MISSION_STAGE - 1 && missionComplete(state, state.missionStage)) {
    state.missionStage += 1;
  }
}

function missionComplete(state: FactoryState, stage: number): boolean {
  switch (stage) {
    case 0:
      return state.resources.ironOre >= 50 && state.resources.stone >= 40;
    case 1:
      return state.lines.ironDrill.count >= 1 && state.lines.coalDrill.count >= 1 && state.lines.ironFurnace.count >= 1;
    case 2:
      return state.resources.circuit >= 20 && state.resources.automationScience >= 30 && state.lines.researchLab.active >= 1;
    case 3:
      return hasTechnology(state, 'logistics') && state.lines.steamPowerPlant.count >= 1 && state.resources.logisticScience >= 30;
    case 4:
      return hasTechnology(state, 'oilProcessing') && state.lines.oilPumpjack.count >= 1
        && state.lines.chemicalScienceAssembler.count >= 1 && state.resources.chemicalScience >= 25;
    case 5:
      return state.resources.processingUnit >= 15 && state.lines.electricFurnaceWorks.count >= 1 && hasTechnology(state, 'productionScience');
    case 6:
      return state.lines.productionScienceAssembler.count >= 1 && state.resources.productionScience >= 60 && hasTechnology(state, 'utilityScience');
    case 7:
      return state.lines.utilityScienceAssembler.count >= 1 && state.resources.utilityScience >= 80 && hasTechnology(state, 'rocketSilo');
    case 8:
      return state.lines.lowDensityStructureAssembler.count >= 1
        && state.lines.rocketFuelAssembler.count >= 1
        && state.lines.rocketControlUnitAssembler.count >= 1
        && state.lines.rocketSilo.count >= 1
        && state.lines.satelliteAssembler.count >= 1;
    default:
      return false;
  }
}

function getRawPowerDemand(state: FactoryState): number {
  return PRODUCTION_LINE_DEFINITIONS.reduce((sum, definition) => sum + state.lines[definition.id].active * definition.powerDemand, 0);
}

function canFuelGeneratorRun(state: FactoryState, definition: ProductionLineDefinition): boolean {
  if (!definition.fuel || state.resources[definition.fuel.resourceId] <= EPSILON) return false;
  if (!definition.fuel.byproductId) return true;
  return state.resources[definition.fuel.byproductId] < getResourceCapacity(definition.fuel.byproductId, getStorageCapacity(state)) - EPSILON;
}

function specialistsForCategory(state: FactoryState, category: LineCategory): ContributorState[] {
  return Object.values(state.contributors).filter((contributor) => {
    if (!contributor.specialization) return false;
    return SPECIALIZATION_BY_ID[contributor.specialization].categories.includes(category);
  });
}

function specializationMultiplierForCount(count: number): number {
  if (count === 0) return 1;
  return 1 + Math.min(0.27, 0.12 + (count - 1) * 0.05);
}

function creditSpecialists(specialists: ContributorState[], output: number, multiplier: number): void {
  if (multiplier <= 1 || output <= EPSILON) return;
  if (specialists.length === 0) return;
  const credit = output * (multiplier - 1) / specialists.length;
  for (const contributor of specialists) contributor.assistedProduction += credit;
}

function contributorFor(state: FactoryState, accountId: string): ContributorState {
  state.contributors[accountId] ??= {
    manualGathered: 0,
    buildingsBuilt: 0,
    technologiesUnlocked: 0,
    commands: 0,
    assistedProduction: 0,
    specialization: null,
  };
  return state.contributors[accountId];
}

function createProductionLineStates(): Record<ProductionLineId, ProductionLineState> {
  return Object.fromEntries(PRODUCTION_LINES.map((line) => [line.id, { count: 0, active: 0, priority: 1 }])) as Record<ProductionLineId, ProductionLineState>;
}

function canAfford(resources: ResourceAmounts, cost: Readonly<Partial<ResourceAmounts>>, multiplier = 1): boolean {
  return amountEntries(cost).every(([resourceId, amount]) => resources[resourceId] + EPSILON >= amount * multiplier);
}

function applyCost(
  resources: ResourceAmounts,
  cost: Readonly<Partial<ResourceAmounts>>,
  direction: -1 | 1,
  multiplier = 1,
): void {
  for (const [resourceId, amount] of amountEntries(cost)) {
    resources[resourceId] = Math.max(0, resources[resourceId] + amount * direction * multiplier);
  }
}

function hasTechnology(state: FactoryState, technologyId: TechnologyId): boolean {
  return state.technologies.includes(technologyId);
}

function amountEntries(amounts: Readonly<Partial<ResourceAmounts>>): Array<[ResourceId, number]> {
  return Object.entries(amounts).filter((entry): entry is [ResourceId, number] => typeof entry[1] === 'number');
}

function objective(id: string, label: string, current: number, target: number): ObjectiveView {
  return { id, label, current: roundForWire(current), target, complete: current + EPSILON >= target };
}

function copyKnownAmounts(target: ResourceAmounts, value: unknown, allowNegative: boolean): void {
  if (!value || typeof value !== 'object') return;
  const source = value as Record<string, unknown>;
  for (const id of RESOURCE_IDS) {
    const amount = source[id];
    if (isFiniteNumber(amount) && (allowNegative || amount >= 0)) target[id] = amount;
  }
}

function migrateLegacyResources(target: ResourceAmounts, source: Record<string, unknown>): void {
  const aliases: Array<[string, ResourceId, number?]> = [
    ['research', 'automationScience', 0.5],
    ['frame', 'lowDensityStructure'],
    ['controlUnit', 'rocketControlUnit'],
    ['propellant', 'rocketFuel'],
  ];
  for (const [legacyId, currentId, scale = 1] of aliases) {
    const amount = source[legacyId];
    if (isNonNegativeNumber(amount)) target[currentId] = Math.max(target[currentId], amount * scale);
  }
}

function copyKnownLines(target: Record<ProductionLineId, ProductionLineState>, source: Record<string, unknown>): void {
  for (const definition of PRODUCTION_LINE_DEFINITIONS) copyLineState(target[definition.id], source[definition.id]);
}

function migrateLegacyLines(target: Record<ProductionLineId, ProductionLineState>, source: Record<string, unknown>): void {
  const aliases: Array<[string, ProductionLineId]> = [
    ['gearPress', 'gearAssembler'],
    ['wireDrawer', 'wireAssembler'],
    ['coalGenerator', 'steamPowerPlant'],
    ['solarArray', 'solarField'],
    ['frameAssembler', 'lowDensityStructureAssembler'],
    ['controlAssembler', 'rocketControlUnitAssembler'],
    ['propellantPlant', 'rocketFuelAssembler'],
    ['launchPad', 'rocketSilo'],
  ];
  for (const [legacyId, currentId] of aliases) {
    if (target[currentId].count === 0) copyLineState(target[currentId], source[legacyId]);
  }
}

function copyLineState(target: ProductionLineState, value: unknown): void {
  if (!value || typeof value !== 'object') return;
  const source = value as Record<string, unknown>;
  if (!isNonNegativeInteger(source.count) || !isNonNegativeInteger(source.active) || source.active > source.count) return;
  target.count = source.count;
  target.active = source.active;
  if (source.priority === 0 || source.priority === 1 || source.priority === 2) target.priority = source.priority;
}

function migrateTechnologies(value: unknown[], version: unknown): TechnologyId[] {
  const technologies = new Set<TechnologyId>();
  for (const id of value) {
    if (typeof id === 'string' && TECHNOLOGY_IDS.includes(id as TechnologyId)) technologies.add(id as TechnologyId);
  }
  if (version === 1) {
    const legacy = new Set(value.filter((id): id is string => typeof id === 'string'));
    if (legacy.has('powerGrid')) technologies.add('steamPower');
    if (legacy.has('metallurgy')) technologies.add('steelProcessing');
    if (legacy.has('deepSpace')) {
      technologies.add('advancedOilProcessing');
      technologies.add('lowDensityStructure');
      technologies.add('rocketFuelTechnology');
      technologies.add('rocketControl');
    }
    if (legacy.has('orbitalLaunch')) technologies.add('rocketSilo');
  }
  return TECHNOLOGY_IDS.filter((id) => technologies.has(id));
}

function migrateContributors(value: Record<string, unknown>): Record<string, ContributorState> {
  const contributors: Record<string, ContributorState> = {};
  for (const [accountId, raw] of Object.entries(value)) {
    if (!accountId || !raw || typeof raw !== 'object') continue;
    const source = raw as Record<string, unknown>;
    contributors[accountId] = {
      manualGathered: isNonNegativeNumber(source.manualGathered) ? source.manualGathered : 0,
      buildingsBuilt: isNonNegativeInteger(source.buildingsBuilt) ? source.buildingsBuilt : 0,
      technologiesUnlocked: isNonNegativeInteger(source.technologiesUnlocked) ? source.technologiesUnlocked : 0,
      commands: isNonNegativeInteger(source.commands) ? source.commands : 0,
      assistedProduction: isNonNegativeNumber(source.assistedProduction) ? source.assistedProduction : 0,
      specialization: typeof source.specialization === 'string' && SPECIALIZATION_IDS.includes(source.specialization as SpecializationId)
        ? source.specialization as SpecializationId
        : null,
    };
  }
  return contributors;
}

function migrateManualJobs(value: unknown): Record<string, ManualGatherJobState> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const jobs: Record<string, ManualGatherJobState> = {};
  for (const [accountId, raw] of Object.entries(value)) {
    if (!accountId || !raw || typeof raw !== 'object') continue;
    const source = raw as Record<string, unknown>;
    if (!RAW_RESOURCE_IDS.includes(source.resourceId as ManualGatherResourceId)) continue;
    if (!isFiniteNumber(source.startedAt) || !isFiniteNumber(source.completesAt) || source.completesAt <= source.startedAt) continue;
    jobs[accountId] = {
      resourceId: source.resourceId as ManualGatherResourceId,
      startedAt: source.startedAt,
      completesAt: source.completesAt,
    };
  }
  return jobs;
}

function normalizeAmount(value: number): number {
  if (!Number.isFinite(value) || value < EPSILON) return 0;
  return Math.round(value * 1_000_000) / 1_000_000;
}

function normalizeRate(value: number): number {
  if (!Number.isFinite(value) || Math.abs(value) < EPSILON) return 0;
  return Math.round(value * 1_000_000) / 1_000_000;
}

function roundForWire(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}
