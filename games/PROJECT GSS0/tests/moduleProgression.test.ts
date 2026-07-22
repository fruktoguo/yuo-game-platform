import { describe, expect, it } from 'vitest';
import { MODULES } from '../src/shared/modules';
import { MODULE_PROGRESSION } from '../src/shared/moduleProgression';

describe('机体成长规则', () => {
  it('使用五进制经验面额并识别可压缩的经验机体', () => {
    expect(MODULE_PROGRESSION.experienceTiers.map((tier) => tier.value)).toEqual([1, 5, 25]);
    const segments = [
      ...Array.from({ length: 5 }, () => ({ neutral: true, experienceTier: 0 })),
      ...Array.from({ length: 4 }, () => ({ neutral: true, experienceTier: 1 })),
    ];
    expect(MODULE_PROGRESSION.findCompressionIndexes(segments, 0)).toEqual([0, 1, 2, 3, 4]);
    expect(MODULE_PROGRESSION.findCompressionIndexes(segments, 1)).toEqual([]);
  });

  it('在 8、12、18、25 级依次扩容并封顶为九槽', () => {
    expect([0, 7, 8, 11, 12, 17, 18, 24, 25, 99].map(MODULE_PROGRESSION.moduleSlotCapacity)).toEqual([
      5, 5, 6, 6, 7, 7, 8, 8, 9, 9,
    ]);
  });

  it('未满槽时独立抽取新机体，满槽后只提供无重复的已有升级', () => {
    const owned = [{ module: MODULES[0].id, moduleLevel: 1 }];
    const newChoices = MODULE_PROGRESSION.chooseUpgradeIds(MODULES, owned, 0, () => 0.1, 3);
    expect(new Set(newChoices).size).toBe(3);
    expect(newChoices).not.toContain(MODULES[0].id);

    const full = MODULES.slice(0, 5).map((module) => ({ module: module.id, moduleLevel: 1 }));
    const fullChoices = MODULE_PROGRESSION.chooseUpgradeIds(MODULES, full, 0, () => 0.25, 3);
    expect(new Set(fullChoices).size).toBe(3);
    expect(fullChoices.every((id) => full.some((segment) => segment.module === id))).toBe(true);

    expect(MODULE_PROGRESSION.chooseUpgradeIds([MODULES[0]], owned, 0, () => 0.1, 3)).toEqual([MODULES[0].id]);
  });

  it('按空槽比例抽取新机体，并保证空槽期至少出现一个新选项', () => {
    const owned = MODULES.slice(0, 2).map((module) => ({ module: module.id, moduleLevel: 1 }));
    const rolls = [0.7, 0, 0.6, 0];
    const weightedChoices = MODULE_PROGRESSION.chooseUpgradeIds(MODULES, owned, 8, () => rolls.shift() ?? 0, 2);
    expect(weightedChoices.filter((id) => !owned.some((segment) => segment.module === id))).toHaveLength(1);

    const guaranteeOwned = MODULES.slice(0, 3).map((module) => ({ module: module.id, moduleLevel: 1 }));
    const guaranteedChoices = MODULE_PROGRESSION.chooseUpgradeIds(MODULES, guaranteeOwned, 8, () => 0.99, 2);
    expect(guaranteedChoices.some((id) => !guaranteeOwned.some((segment) => segment.module === id))).toBe(true);
  });

  it('自动模式填满槽位前只选择新机体', () => {
    const owned = [{ module: MODULES[0].id, moduleLevel: 1 }];
    const newChoices = MODULE_PROGRESSION.chooseAutomaticUpgradeIds(MODULES, owned, 0, () => 0.99, 3);
    expect(newChoices).toHaveLength(3);
    expect(newChoices.every((id) => id !== MODULES[0].id)).toBe(true);

    const full = MODULES.slice(0, 5).map((module) => ({ module: module.id, moduleLevel: 1 }));
    const fullChoices = MODULE_PROGRESSION.chooseAutomaticUpgradeIds(MODULES, full, 0, () => 0.25, 3);
    expect(fullChoices.every((id) => full.some((segment) => segment.module === id))).toBe(true);
  });

  it('主动冷却按等级反比成长并在五级封顶', () => {
    expect(MODULE_PROGRESSION.activeCooldownSeconds('spark', 1)).toBe(3.6);
    expect(MODULE_PROGRESSION.activeCooldownSeconds('spark', 2)).toBe(1.8);
    expect(MODULE_PROGRESSION.activeCooldownSeconds('spark', 3)).toBe(1.2);
    expect(MODULE_PROGRESSION.maxModuleLevel).toBe(5);
    expect(MODULE_PROGRESSION.activeCooldownSeconds('spark', 5)).toBeCloseTo(0.72);
    expect(MODULE_PROGRESSION.activeCooldownSeconds('spark', 100)).toBeCloseTo(0.72);
  });

  it('被动效果从零级开始，并在升级卡展示前后实际变化', () => {
    expect(MODULE_PROGRESSION.effects.hasteTurnRateBonus(0)).toBe(0);
    expect(MODULE_PROGRESSION.effects.hasteTurnRateBonus(3)).toBeCloseTo(0.6);
    expect(MODULE_PROGRESSION.effects.hasteTurnRateBonus(100)).toBeCloseTo(1);
    const active = MODULE_PROGRESSION.moduleUpgradePreview('spark', 2);
    expect(active.levelLabel).toBe('等级 2 → 等级 3');
    expect(active.lines[0].text).toBe('冷却时间 1.8秒 → 1.2秒');
    const passive = MODULE_PROGRESSION.moduleUpgradePreview('haste', 2);
    expect(passive.lines.map((line) => line.text)).toEqual([
      '转向速度 +40% → +60%',
    ]);
    expect(MODULE_PROGRESSION.moduleUpgradePreview('vitality', 4).lines[0].text).toBe('最大生命值 +20 → +25');
    expect(MODULE_PROGRESSION.moduleUpgradePreview('replicator', 4).lines[0].text).toBe('复制球概率 24% → 30%');
  });

  it('为机体栏提供当前等级的实际效果摘要', () => {
    expect(MODULE_PROGRESSION.moduleCurrentEffect('spark', 2)).toMatchObject({
      level: 2,
      levelLabel: '等级 2',
      lines: [{ label: '冷却时间', text: '冷却时间 1.8秒' }],
    });
    expect(MODULE_PROGRESSION.moduleCurrentEffect('haste', 2).lines.map((line) => line.text)).toEqual([
      '转向速度 +40%',
    ]);
  });

  it('满级机体不会再次进入升级候选', () => {
    const maxed = [{ module: MODULES[0].id, moduleLevel: 5 }];
    expect(MODULE_PROGRESSION.chooseUpgradeIds([MODULES[0]], maxed, 0, () => 0.1, 3)).toEqual([]);
  });

  it('概率型奖励以线性期望生成整数结果', () => {
    expect(MODULE_PROGRESSION.rollLinearRewards(2.4, () => 0.2)).toBe(3);
    expect(MODULE_PROGRESSION.rollLinearRewards(2.4, () => 0.8)).toBe(2);
  });
});
