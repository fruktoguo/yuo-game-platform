import { describe, expect, it } from 'vitest';
import {
  LAUNCH_REQUIREMENTS,
  MANUAL_GATHER_AMOUNT,
  MANUAL_GATHER_DURATION_MS,
  MAX_OFFLINE_SECONDS,
  RESOURCE_IDS,
  isProductionLineUnlocked,
  isResourceUnlocked,
  isTechnologyVisible,
} from '../src/shared/catalog';
import type { FactoryCommand } from '../src/shared/protocol';
import {
  advanceFactoryTo,
  createFactoryState,
  executeFactoryCommand,
  getFactoryModifiers,
  getPowerView,
  migrateFactoryState,
  toFactorySnapshot,
  toFactorySync,
} from '../src/server/FactoryEngine';

const actorId = 'account-a';

describe('远星工造生产模拟', () => {
  it('从计时采集推进到基础自动化并由服务端结算产量', () => {
    const state = createFactoryState(1_000);
    let now = 1_100;
    for (const resourceId of ['ironOre', 'ironOre', 'stone', 'stone'] as const) {
      expect(executeFactoryCommand(state, command({ type: 'gather', resourceId }), actorId, now).ok).toBe(true);
      now += MANUAL_GATHER_DURATION_MS;
      expect(advanceFactoryTo(state, now).completedManualJobs).toBe(1);
      now += 100;
    }
    expect(state.resources.ironOre).toBe(35 + MANUAL_GATHER_AMOUNT * 2);
    expect(state.missionStage).toBe(1);

    state.resources.ironOre = 500;
    state.resources.stone = 500;
    expect(executeFactoryCommand(state, command({ type: 'build', lineId: 'ironDrill' }), actorId, now).ok).toBe(true);
    expect(executeFactoryCommand(state, command({ type: 'build', lineId: 'coalDrill' }), actorId, now + 100).ok).toBe(true);
    expect(executeFactoryCommand(state, command({ type: 'build', lineId: 'ironFurnace' }), actorId, now + 200).ok).toBe(true);
    expect(state.missionStage).toBe(2);

    state.resources.coal = 500;
    const ironBefore = state.resources.ironPlate;
    const result = advanceFactoryTo(state, now + 10_000);
    expect(result.simulatedSeconds).toBeGreaterThan(9);
    expect(state.resources.ironPlate).toBeGreaterThan(ironBefore);
    expect(state.rates.ironPlate).toBeGreaterThan(0);
  });

  it('同一玩家只能执行一个手动采集作业', () => {
    const state = createFactoryState(1_000);
    const ironBefore = state.resources.ironOre;
    expect(executeFactoryCommand(state, command({ type: 'gather', resourceId: 'ironOre' }), actorId, 1_100).ok).toBe(true);
    expect(toFactorySnapshot(state, 1_100).manualJobs).toEqual([
      [actorId, 'ironOre', 1_100, 1_100 + MANUAL_GATHER_DURATION_MS],
    ]);
    expect(executeFactoryCommand(state, command({ type: 'gather', resourceId: 'stone' }), actorId, 1_200).ok).toBe(false);
    expect(advanceFactoryTo(state, 1_100 + MANUAL_GATHER_DURATION_MS - 1).completedManualJobs).toBe(0);
    expect(state.resources.ironOre).toBe(ironBefore);
    expect(advanceFactoryTo(state, 1_100 + MANUAL_GATHER_DURATION_MS).completedManualJobs).toBe(1);
    expect(state.resources.ironOre).toBe(ironBefore + MANUAL_GATHER_AMOUNT);
  });

  it('资源、设施和科技只在阶段与前置条件满足后可见', () => {
    const state = createFactoryState(0);
    expect(RESOURCE_IDS.filter((id) => isResourceUnlocked(id, state.missionStage, state.technologies))).toEqual(['ironOre', 'stone']);
    expect(isProductionLineUnlocked('ironDrill', state.missionStage, state.technologies)).toBe(false);
    expect(isTechnologyVisible('automation', state.missionStage, state.technologies)).toBe(false);

    state.missionStage = 2;
    expect(isResourceUnlocked('circuit', state.missionStage, state.technologies)).toBe(true);
    expect(isResourceUnlocked('crudeOil', state.missionStage, state.technologies)).toBe(false);
    expect(isTechnologyVisible('automation', state.missionStage, state.technologies)).toBe(true);
    expect(isTechnologyVisible('logistics', state.missionStage, state.technologies)).toBe(false);
    state.technologies.push('automation');
    expect(isTechnologyVisible('logistics', state.missionStage, state.technologies)).toBe(true);
    state.resources.circuit = 0;
    expect(isResourceUnlocked('circuit', state.missionStage, state.technologies)).toBe(true);
  });

  it('科研必须由运行中的实验室消耗多类科学包', () => {
    const state = createFactoryState(0);
    state.missionStage = 2;
    state.resources.automationScience = 100;
    const withoutLab = executeFactoryCommand(state, command({ type: 'research', technologyId: 'automation' }), actorId, 100);
    expect(withoutLab.ok).toBe(false);
    expect(withoutLab.error).toContain('实验室');

    state.lines.researchLab = { count: 1, active: 1, priority: 1 };
    expect(executeFactoryCommand(state, command({ type: 'research', technologyId: 'automation' }), actorId, 200).ok).toBe(true);
    expect(state.resources.automationScience).toBe(70);
    expect(state.technologies).toContain('automation');
    expect(executeFactoryCommand(state, command({ type: 'research', technologyId: 'logistics' }), actorId, 300).ok).toBe(true);
    expect(state.resources.automationScience).toBe(30);
  });

  it('批量建造按总成本和数量上限进行原子结算', () => {
    const state = createFactoryState(0);
    state.missionStage = 1;
    state.resources.ironOre = 500;
    state.resources.stone = 500;
    expect(executeFactoryCommand(state, command({ type: 'build', lineId: 'ironDrill', amount: 5 }), actorId, 100).ok).toBe(true);
    expect(state.lines.ironDrill).toEqual({ count: 5, active: 5, priority: 1 });
    expect(state.resources.ironOre).toBe(400);
    expect(state.resources.stone).toBe(425);

    state.lines.ironDrill.count = 118;
    state.lines.ironDrill.active = 118;
    const rejected = executeFactoryCommand(state, command({ type: 'build', lineId: 'ironDrill', amount: 5 }), actorId, 200);
    expect(rejected.ok).toBe(false);
    expect(state.lines.ironDrill.count).toBe(118);
  });

  it('电力不足按供电比例降速，蒸汽机组只按实际负载耗煤', () => {
    const state = createFactoryState(0);
    state.resources.ironOre = 1_000;
    state.resources.coal = 1_000;
    state.lines.ironFurnace = { count: 10, active: 10, priority: 1 };
    expect(getPowerView(state).satisfaction).toBeCloseTo(22 / 25, 3);
    advanceFactoryTo(state, 10_000);
    expect(state.resources.ironPlate).toBeCloseTo(70.4, 1);

    const powered = createFactoryState(0);
    powered.resources.ironOre = 1_000;
    powered.resources.coal = 1_000;
    powered.lines.ironFurnace = { count: 10, active: 10, priority: 1 };
    powered.lines.steamPowerPlant = { count: 1, active: 1, priority: 1 };
    advanceFactoryTo(powered, 10_000);
    expect(powered.resources.ironPlate).toBeCloseTo(80, 1);
    const extraSmeltingCoal = (powered.resources.ironPlate - state.resources.ironPlate) / 0.8 * 0.12;
    expect(state.resources.coal - powered.resources.coal - extraSmeltingCoal).toBeCloseTo(0.165, 2);
  });

  it('协作岗位提升对应部门效率且重复岗位收益递减', () => {
    const baseline = createFactoryState(0);
    baseline.lines.ironDrill = { count: 1, active: 1, priority: 1 };
    advanceFactoryTo(baseline, 10_000);
    const baselineGain = baseline.resources.ironOre - 35;

    const specialized = createFactoryState(0);
    specialized.lines.ironDrill = { count: 1, active: 1, priority: 1 };
    expect(executeFactoryCommand(specialized, command({ type: 'assignSpecialization', specializationId: 'extraction' }), 'a', 1).ok).toBe(true);
    advanceFactoryTo(specialized, 10_000);
    const firstGain = specialized.resources.ironOre - 35;
    expect(firstGain / baselineGain).toBeCloseTo(1.12, 2);

    const duplicated = createFactoryState(0);
    duplicated.lines.ironDrill = { count: 1, active: 1, priority: 1 };
    executeFactoryCommand(duplicated, command({ type: 'assignSpecialization', specializationId: 'extraction' }), 'a', 1);
    executeFactoryCommand(duplicated, command({ type: 'assignSpecialization', specializationId: 'extraction' }), 'b', 2);
    advanceFactoryTo(duplicated, 10_000);
    const duplicatedGain = duplicated.resources.ironOre - 35;
    expect(duplicatedGain / baselineGain).toBeCloseTo(1.17, 2);
  });

  it('共享优先级决定稀缺原料先供给哪条产线', () => {
    const highCircuit = createFactoryState(0);
    highCircuit.resources.ironPlate = 1;
    highCircuit.resources.wire = 10;
    highCircuit.lines.gearAssembler = { count: 1, active: 1, priority: 0 };
    highCircuit.lines.circuitAssembler = { count: 1, active: 1, priority: 2 };
    advanceFactoryTo(highCircuit, 1_000);
    expect(highCircuit.resources.circuit).toBeCloseTo(0.5, 3);

    const highGear = createFactoryState(0);
    highGear.resources.ironPlate = 1;
    highGear.resources.wire = 10;
    highGear.lines.gearAssembler = { count: 1, active: 1, priority: 2 };
    highGear.lines.circuitAssembler = { count: 1, active: 1, priority: 0 };
    advanceFactoryTo(highGear, 1_000);
    expect(highGear.resources.gear).toBeCloseTo(0.5, 3);
    expect(highGear.resources.circuit).toBe(0);
  });

  it('物流、产能和能效基础设施提供有上限的全厂增益', () => {
    const state = createFactoryState(0);
    state.lines.logisticsHub = { count: 8, active: 8, priority: 1 };
    state.lines.productivityCenter = { count: 8, active: 8, priority: 1 };
    state.lines.efficiencyGrid = { count: 8, active: 8, priority: 1 };
    expect(getFactoryModifiers(state)).toEqual({ throughput: 0.2, productivity: 0.12, powerEfficiency: 0.32 });
  });

  it('离线补算最多推进二十四小时且不逐毫秒循环', () => {
    const state = createFactoryState(0);
    state.lines.ironDrill = { count: 1, active: 1, priority: 1 };
    const result = advanceFactoryTo(state, (MAX_OFFLINE_SECONDS + 3_600) * 1_000);
    expect(result.simulatedSeconds).toBe(MAX_OFFLINE_SECONDS);
    expect(result.discardedSeconds).toBe(3_600);
    expect(state.lastSimulatedAt).toBe((MAX_OFFLINE_SECONDS + 3_600) * 1_000);
  });

  it('只允许在火箭、卫星和发射井全部满足时完成发射', () => {
    const state = createFactoryState(0);
    state.technologies.push('rocketSilo');
    state.lines.rocketSilo = { count: 1, active: 1, priority: 1 };
    for (const [resourceId, amount] of Object.entries(LAUNCH_REQUIREMENTS)) {
      state.resources[resourceId as keyof typeof state.resources] = amount ?? 0;
    }
    expect(executeFactoryCommand(state, command({ type: 'launch' }), actorId, 9_000).ok).toBe(true);
    expect(state.phase).toBe('completed');
    expect(state.completedAt).toBe(9_000);
  });

  it('常规同步保持固定数组顺序和受控载荷', () => {
    const state = createFactoryState(0);
    const snapshot = toFactorySnapshot(state, 1_000);
    const sync = toFactorySync(state, 1_000);
    expect(snapshot.resources).toHaveLength(RESOURCE_IDS.length);
    expect(sync.resources).toHaveLength(RESOURCE_IDS.length);
    expect(Buffer.byteLength(JSON.stringify(snapshot))).toBeLessThan(16_000);
    expect(Buffer.byteLength(JSON.stringify(sync))).toBeLessThan(4_000);
  });

  it('把旧版抽象资源、设施和科技迁移到完整工业目录', () => {
    const migrated = migrateFactoryState({
      version: 1,
      sequence: 8,
      phase: 'running',
      createdAt: 100,
      lastSimulatedAt: 200,
      totalRuntimeSeconds: 50,
      completedAt: null,
      missionStage: 4,
      resources: { ironOre: 10, research: 80, frame: 12, controlUnit: 9, propellant: 30 },
      rates: { ironOre: 1 },
      lines: { gearPress: { count: 2, active: 1 }, launchPad: { count: 1, active: 0 } },
      technologies: ['powerGrid', 'metallurgy', 'deepSpace'],
      contributors: { a: { manualGathered: 10, buildingsBuilt: 2, technologiesUnlocked: 1, commands: 5 } },
    });
    expect(migrated).not.toBeNull();
    expect(migrated?.version).toBe(2);
    expect(migrated?.resources.automationScience).toBe(40);
    expect(migrated?.resources.lowDensityStructure).toBe(12);
    expect(migrated?.lines.gearAssembler.count).toBe(2);
    expect(migrated?.lines.rocketSilo.count).toBe(1);
    expect(migrated?.technologies).toContain('steamPower');
    expect(migrated?.contributors.a.specialization).toBeNull();
  });
});

type CommandInput = FactoryCommand extends infer Command
  ? Command extends { requestId: string }
    ? Omit<Command, 'requestId'>
    : never
  : never;

function command(input: CommandInput): FactoryCommand {
  return { requestId: `request-${Math.random().toString(36).slice(2)}`, ...input } as FactoryCommand;
}
