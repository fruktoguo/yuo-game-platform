import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  FOUNDRY_ICON_IDS,
  PRODUCTION_LINE_DEFINITIONS,
  RESOURCE_DEFINITIONS,
  RESOURCE_IDS,
  SPECIALIZATION_DEFINITIONS,
  TECHNOLOGY_DEFINITIONS,
  TECHNOLOGY_IDS,
} from '../src/shared/catalog';

describe('远星工造内容目录', () => {
  it('资源、设施和科技标识唯一且定义完整', () => {
    expect(new Set(RESOURCE_IDS).size).toBe(RESOURCE_IDS.length);
    expect(new Set(RESOURCE_DEFINITIONS.map((item) => item.id))).toEqual(new Set(RESOURCE_IDS));
    expect(new Set(PRODUCTION_LINE_DEFINITIONS.map((item) => item.id)).size).toBe(PRODUCTION_LINE_DEFINITIONS.length);
    expect(new Set(TECHNOLOGY_DEFINITIONS.map((item) => item.id))).toEqual(new Set(TECHNOLOGY_IDS));
  });

  it('每种库存资源都有自动生产或能源副产来源', () => {
    const produced = new Set(PRODUCTION_LINE_DEFINITIONS.flatMap((line) => Object.keys(line.outputs)));
    for (const line of PRODUCTION_LINE_DEFINITIONS) {
      if (line.fuel?.byproductId) produced.add(line.fuel.byproductId);
    }
    expect(RESOURCE_IDS.filter((id) => !produced.has(id))).toEqual([]);
  });

  it('科技前置只引用目录中更早出现的项目', () => {
    const order = new Map(TECHNOLOGY_DEFINITIONS.map((technology, index) => [technology.id, index]));
    for (const technology of TECHNOLOGY_DEFINITIONS) {
      for (const prerequisite of technology.prerequisites) {
        expect(TECHNOLOGY_IDS).toContain(prerequisite);
        expect(order.get(prerequisite)!).toBeLessThan(order.get(technology.id)!);
      }
    }
  });

  it('目录引用的所有 Game-icons 图形都存在于单文件 sprite', async () => {
    const sprite = await readFile(new URL('../src/client/assets/game-icons.svg', import.meta.url), 'utf8');
    const referenced = new Set([
      ...RESOURCE_DEFINITIONS.map((item) => item.icon),
      ...PRODUCTION_LINE_DEFINITIONS.map((item) => item.icon),
      ...TECHNOLOGY_DEFINITIONS.map((item) => item.icon),
      ...SPECIALIZATION_DEFINITIONS.map((item) => item.icon),
    ]);
    expect([...referenced].filter((id) => !FOUNDRY_ICON_IDS.includes(id))).toEqual([]);
    expect([...referenced].filter((id) => !sprite.includes(`id="gi-${id}"`))).toEqual([]);
  });
});
