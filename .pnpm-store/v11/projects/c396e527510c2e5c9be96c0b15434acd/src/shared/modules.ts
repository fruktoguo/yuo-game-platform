import { moduleDesignState, moduleIsUpgradeEnabled, type ModuleDesignState } from './designerConfig';

export type ModuleCategory = '输出' | '防御' | '辅助' | '恢复';
export type ModuleShape = 'triangle' | 'diamond' | 'hex' | 'star' | 'ring' | 'capsule' | 'square' | 'circle';

export interface ModuleDefinition {
  id: string;
  name: string;
  category: ModuleCategory;
  color: string;
  shape: ModuleShape;
  cooldown: string;
  desc: string;
}

export const MODULES = [
  { id: 'spark', name: '赤焰炮节', category: '输出', color: '#ff9f43', shape: 'triangle', cooldown: '5.4秒', desc: '周期锁定最近敌蛇，发射一枚高速焰弹。稳定、直接的单体火力。' },
  { id: 'frost', name: '冰棱节', category: '输出', color: '#58d8ff', shape: 'diamond', cooldown: '7秒', desc: '发射冰晶弹，命中削去一节身体，并让敌蛇短暂减速。' },
  { id: 'prism', name: '三棱镜节', category: '输出', color: '#ff5da2', shape: 'hex', cooldown: '14.1秒', desc: '向目标方向扇形发射三枚折射弹，单轮具备较高爆发。' },
  { id: 'nova', name: '星爆节', category: '输出', color: '#ff7043', shape: 'star', cooldown: '18.5秒', desc: '蓄能后向四周喷射八枚星屑，近身混战时覆盖整片区域。' },
  { id: 'tesla', name: '雷鸣环节', category: '输出', color: '#f7e85b', shape: 'ring', cooldown: '13.5秒', desc: '电弧在邻近敌蛇间跳跃，最多连续命中三个目标。' },
  { id: 'laser', name: '霓虹线圈', category: '输出', color: '#39f5a6', shape: 'capsule', cooldown: '10.2秒', desc: '定期向最近目标释放瞬发光束，射程远且不会打偏。' },
  { id: 'missile', name: '追迹弹舱', category: '输出', color: '#ef476f', shape: 'triangle', cooldown: '10.6秒', desc: '发射自动修正航向的追迹弹，擅长攻击正在绕行的敌蛇。' },
  { id: 'mine', name: '磁暴雷节', category: '输出', color: '#9a7cff', shape: 'square', cooldown: '22.8秒', desc: '留下永久磁雷。敌我蛇头都可触发；玩家触发时只会被击退。' },
  { id: 'blade', name: '旋刃节', category: '输出', color: '#e8eef7', shape: 'diamond', cooldown: '0.96秒/目标', desc: '彩刃在约五节身体长度外旋转，接触敌蛇时切除一节身体。' },
  { id: 'pulse', name: '脉冲核心', category: '输出', color: '#3eb7ff', shape: 'ring', cooldown: '16.2秒', desc: '周期释放近距离冲击波，同时命中范围内的所有敌蛇。' },
  { id: 'venom', name: '腐蚀囊节', category: '输出', color: '#8be04e', shape: 'hex', cooldown: '11秒', desc: '发射腐蚀弹，命中后继续造成两次缓慢侵蚀伤害。' },
  { id: 'echo', name: '回声弹匣', category: '输出', color: '#ff8bd7', shape: 'capsule', cooldown: '随头部·3.8秒', desc: '每次头部发射时追加一枚偏转弹，多个回声弹匣可继续叠加。' },
  { id: 'rail', name: '贯穿轨炮节', category: '输出', color: '#7ef9ff', shape: 'capsule', cooldown: '14秒', desc: '发射高速贯穿弹，最多连续穿透四个敌人。' },
  { id: 'ricochet', name: '弹射晶节', category: '输出', color: '#ffcf5a', shape: 'diamond', cooldown: '14.5秒', desc: '发射可反弹两次、最多命中三个敌人的晶体弹。' },
  { id: 'cluster', name: '裂变弹舱', category: '输出', color: '#ff6b4a', shape: 'hex', cooldown: '16秒', desc: '发射追踪爆弹，命中时对周围所有敌人造成伤害。' },
  { id: 'fan', name: '烈焰扇节', category: '输出', color: '#ff3f68', shape: 'triangle', cooldown: '15秒', desc: '近距离扇形喷射五枚短程焰弹，贴近时爆发极高。' },
  { id: 'gravity', name: '引力井节', category: '输出', color: '#a56cff', shape: 'ring', cooldown: '20秒', desc: '在目标位置生成引力井，初次伤害并持续拉扯、减速敌人。' },
  { id: 'shield', name: '碧玉护盾', category: '防御', color: '#48e0bf', shape: 'hex', cooldown: '18秒', desc: '储存一次碰撞防护。触发后短暂无敌并进入冷却。' },
  { id: 'phase', name: '幻相节', category: '防御', color: '#bb8cff', shape: 'diamond', cooldown: '22秒', desc: '周期获得一次相位充能，可穿过致命碰撞并保持当前航向。' },
  { id: 'repulse', name: '斥力环节', category: '防御', color: '#75dfff', shape: 'ring', cooldown: '常驻', desc: '持续扰动附近敌蛇的转向，让它们更难贴近你的身体。' },
  { id: 'armor', name: '黑曜装甲', category: '防御', color: '#b7c0ce', shape: 'square', cooldown: '常驻', desc: '压缩护盾与相位模块的冷却时间，多个装甲可叠加。' },
  { id: 'thorns', name: '截击反应节', category: '防御', color: '#9ee55f', shape: 'star', cooldown: '6秒', desc: '敌蛇撞上身体并被摧毁时，向四周发射反击弹幕，并在撞击处生成一枚球。' },
  { id: 'stabilizer', name: '平衡陀螺', category: '防御', color: '#67d5c8', shape: 'ring', cooldown: '常驻', desc: '缩短玩家反弹后的减速与失控时间，多个模块可叠加。' },
  { id: 'magnet', name: '磁吸环节', category: '辅助', color: '#f5cb4c', shape: 'ring', cooldown: '常驻', desc: '扩大头部的球球吸收范围，多个模块可以继续叠加。' },
  { id: 'haste', name: '涡轮节', category: '辅助', color: '#ff8457', shape: 'triangle', cooldown: '常驻', desc: '永久提高移动速度，同时略微提升转向响应。' },
  { id: 'chronos', name: '时缓晶节', category: '辅助', color: '#91a7ff', shape: 'diamond', cooldown: '常驻', desc: '降低所有敌蛇的移动速度，为抢球和包抄争取空间。' },
  { id: 'tractor', name: '引力环节', category: '辅助', color: '#3ed8b5', shape: 'ring', cooldown: '常驻', desc: '球进入引力范围后会连续飞向蛇头，直到被真正吞下。' },
  { id: 'fortune', name: '幸运星节', category: '辅助', color: '#ffd166', shape: 'star', cooldown: '击破触发', desc: '敌蛇死亡时有机会额外吐出球球，模块越多，概率越高。' },
  { id: 'guidance', name: '弹道校准节', category: '辅助', color: '#78a9ff', shape: 'capsule', cooldown: '常驻', desc: '提高子弹速度、存续距离和轻度追踪能力。' },
  { id: 'feast', name: '吞噬涡轮', category: '辅助', color: '#ffb23f', shape: 'triangle', cooldown: '吃球触发·2.5秒', desc: '吃球后短时间提高移动速度，多个模块增强加速幅度。' },
  { id: 'salvage', name: '回收炉节', category: '恢复', color: '#c7f464', shape: 'hex', cooldown: '伤害触发', desc: '技能削去敌蛇身体时，有概率将碎片回收成可吃的球球。' },
  { id: 'regen', name: '再生芽节', category: '恢复', color: '#ff6f91', shape: 'circle', cooldown: '17秒', desc: '每隔一段时间在前方培育一枚球球，仍需亲自追上并吞噬。' },
  { id: 'bloom', name: '战利花房', category: '恢复', color: '#ff88c7', shape: 'circle', cooldown: '30秒', desc: '冷却就绪时，下一次击破敌人会额外培育一枚球。' },
  { id: 'amplifier', name: '超频增幅节', category: '辅助', color: '#f2f5fa', shape: 'capsule', cooldown: '常驻', desc: '加快头部和所有定时输出身体的攻击节奏。' },
  { id: 'needle', name: '钨针贯节', category: '输出', color: '#d8f3ff', shape: 'capsule', cooldown: '8.8秒', desc: '发射高速钨针，贯穿第一个目标后仍可继续命中下一个敌人。' },
  { id: 'mortar', name: '震荡榴巢', category: '输出', color: '#ff8a5b', shape: 'hex', cooldown: '17秒', desc: '发射重型追踪榴弹，命中时对较大范围内的所有敌人造成伤害。' },
  { id: 'sweep', name: '清扫光栅', category: '输出', color: '#65e7ff', shape: 'capsule', cooldown: '14.4秒', desc: '沿目标方向释放贯穿全场的宽幅光栅，伤害路径上的所有敌人。' },
  { id: 'sniper', name: '裁决镜节', category: '输出', color: '#f2f2f2', shape: 'diamond', cooldown: '18秒', desc: '长时间标定最近目标，随后瞬间削去两点长度。' },
  { id: 'flak', name: '近炸蜂巢', category: '输出', color: '#ffcf4d', shape: 'hex', cooldown: '15.2秒', desc: '在目标位置引爆近炸弹幕，同时命中爆区内的全部敌人。' },
  { id: 'fork', name: '双生电极', category: '输出', color: '#d58cff', shape: 'ring', cooldown: '13.2秒', desc: '同时发射两枚向左右偏转的追迹电弹，从两侧夹击同一目标。' },
  { id: 'anchor', name: '迟滞锚弹', category: '输出', color: '#6f8cff', shape: 'triangle', cooldown: '14.8秒', desc: '发射大型低速锚弹，命中后对敌人施加更持久的减速。' },
  { id: 'saw', name: '切割链环', category: '输出', color: '#f06a7b', shape: 'ring', cooldown: '1.4秒/目标', desc: '持续切割靠近该身体节的敌人，每个目标独立计算接触冷却。' },
  { id: 'flare', name: '灼蚀信标', category: '输出', color: '#ff6b35', shape: 'star', cooldown: '14秒', desc: '发射灼蚀弹，命中后连续造成四次延迟伤害。' },
  { id: 'scatter', name: '碎晶霰舱', category: '输出', color: '#70d6ff', shape: 'hex', cooldown: '19秒', desc: '近距离扇形发射七枚碎晶，适合处理贴近身体的敌群。' },
  { id: 'lance', name: '破阵光矛', category: '输出', color: '#b9fff4', shape: 'triangle', cooldown: '18秒', desc: '发射大型高速光矛，最多连续贯穿六个敌人。' },
  { id: 'execute', name: '终结协议', category: '输出', color: '#ff3f55', shape: 'diamond', cooldown: '16秒', desc: '锁定低长度敌人执行双倍打击，对其他目标造成一次普通伤害。' },
  { id: 'crossfire', name: '十字火控', category: '输出', color: '#ffb347', shape: 'square', cooldown: '20秒', desc: '朝目标方向及其三个垂直方向同时发射重型弹体。' },
  { id: 'phasebolt', name: '相位回旋节', category: '输出', color: '#b49cff', shape: 'circle', cooldown: '16秒', desc: '发射可多次反弹并轻度追踪目标的相位弹。' },
  { id: 'ram', name: '破障冲角', category: '防御', color: '#f3c600', shape: 'triangle', cooldown: '5秒', desc: '蛇头互撞时，冷却就绪会额外削去敌人一点长度。' },
  { id: 'buffer', name: '动能缓冲节', category: '防御', color: '#8fa6ad', shape: 'square', cooldown: '常驻', desc: '降低玩家受到的物理击退初速度，多个模块可继续叠加。' },
  { id: 'decoy', name: '诱导涂层', category: '防御', color: '#ff7a90', shape: 'diamond', cooldown: '常驻', desc: '干扰敌人的身体避让判断，让精心布置的堵截更容易成功。' },
  { id: 'emergency', name: '应急屏障节', category: '防御', color: '#62e6bf', shape: 'hex', cooldown: '吃球触发', desc: '任意身体吃球后获得短暂无敌，多个模块会延长持续时间。' },
  { id: 'collector', name: '全身采集节', category: '辅助', color: '#d4f05c', shape: 'ring', cooldown: '常驻', desc: '扩大所有玩家身体节的接触吃球半径。' },
  { id: 'beacon', name: '增压信标', category: '辅助', color: '#ffc857', shape: 'star', cooldown: '常驻', desc: '略微加快波次倒计时，让更多敌人与球更快进入场地。' },
  { id: 'momentum', name: '冲量增幅器', category: '辅助', color: '#ff965c', shape: 'triangle', cooldown: '常驻', desc: '提高敌人受到的物理击退初速度，不增加玩家自身受到的击退。' },
  { id: 'progressor', name: '临界推进节', category: '辅助', color: '#38d6c5', shape: 'capsule', cooldown: '常驻', desc: '当前等级的升级进度越高，玩家获得的移动速度加成越多。' },
  { id: 'nursery', name: '尾部育成舱', category: '恢复', color: '#ff8ec7', shape: 'circle', cooldown: '24秒', desc: '定期在蛇尾附近培育一枚球，仍需由敌我头部或身体实际吃取。' },
  { id: 'cache', name: '战果缓存节', category: '恢复', color: '#b7e36b', shape: 'hex', cooldown: '每5次击破', desc: '累计击破敌人后生成一枚球，多个模块会减少所需击破次数。' },
] as const satisfies readonly ModuleDefinition[];

export type ModuleId = typeof MODULES[number]['id'];
export const MODULE_BY_ID = Object.fromEntries(MODULES.map((module) => [module.id, module])) as Record<ModuleId, ModuleDefinition>;
const configuredUpgradeModules = MODULES.filter((module) => moduleIsUpgradeEnabled(module.id));
export const UPGRADE_MODULES = configuredUpgradeModules.length > 0 ? configuredUpgradeModules : MODULES;

export function getModuleDesignState(moduleId: ModuleId): ModuleDesignState {
  return moduleDesignState(moduleId);
}

export function isModuleId(value: unknown): value is ModuleId {
  return typeof value === 'string' && Object.hasOwn(MODULE_BY_ID, value);
}
