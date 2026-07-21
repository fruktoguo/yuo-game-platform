import '../../module-catalog.js';
import type { GSS0ModuleId } from '../../module-catalog.js';
import { formatCooldownSeconds, moduleCooldownSeconds, moduleDesignState, moduleIsUpgradeEnabled, type ModuleDesignState } from './designerConfig';

export type ModuleCategory = '进攻' | '生存' | '辅助' | '发育';
export type ModuleShape = 'triangle' | 'diamond' | 'hex' | 'star' | 'ring' | 'capsule' | 'square' | 'circle';
export type ModuleId = GSS0ModuleId;

export interface ModuleDefinition {
  id: ModuleId;
  name: string;
  category: ModuleCategory;
  color: string;
  shape: ModuleShape;
  cooldown: string;
  activeCooldown?: true;
  desc: string;
}

const MODULE_CATALOG = globalThis.GSS0ModuleCatalog;
if (!Array.isArray(MODULE_CATALOG) || MODULE_CATALOG.length === 0) {
  throw new Error('PROJECT GSS0 机体目录加载失败');
}

export const MODULES = Object.freeze(MODULE_CATALOG.map((module): ModuleDefinition => ({
  ...module,
  cooldown: module.activeCooldown
    ? `${formatCooldownSeconds(moduleCooldownSeconds(module.id))}${module.id === 'saw' ? '/目标' : ''}`
    : module.cooldown,
})));


export const MODULE_BY_ID = Object.fromEntries(MODULES.map((module) => [module.id, module])) as Record<ModuleId, ModuleDefinition>;
export const ACTIVE_SKILL_MODULES = MODULES.filter((module) => 'activeCooldown' in module);
const configuredUpgradeModules = MODULES.filter((module) => moduleIsUpgradeEnabled(module.id));
export const UPGRADE_MODULES = configuredUpgradeModules.length > 0 ? configuredUpgradeModules : MODULES;

export function getModuleDesignState(moduleId: ModuleId): ModuleDesignState {
  return moduleDesignState(moduleId);
}

export function isModuleId(value: unknown): value is ModuleId {
  return typeof value === 'string' && Object.hasOwn(MODULE_BY_ID, value);
}
