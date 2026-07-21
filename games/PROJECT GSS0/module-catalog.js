(() => {
  "use strict";

  const defaultBalance = globalThis.GSS0_DESIGNER_CONFIG?.balance || {};

  function setting(balance, key, fallback) {
    const value = Number(balance?.[key]);
    return Number.isFinite(value) ? value : fallback;
  }

  function formatNumber(value, digits = 2) {
    return String(Number(Number(value).toFixed(digits)));
  }

  function formatPercent(value) {
    return `${formatNumber(value * 100, 1)}%`;
  }

  const moduleBlueprints = [
    { id: "spark", name: "赤焰炮节", category: "输出", color: "#ff9f43", shape: "triangle", cooldown: "", activeCooldown: true, desc: "发射1枚高速焰弹，造成1伤害。" },
    { id: "frost", name: "冰棱节", category: "输出", color: "#58d8ff", shape: "diamond", cooldown: "", activeCooldown: true, desc: "发射冰晶弹，造成1伤害并让敌蛇短暂减速。" },
    { id: "prism", name: "三棱镜节", category: "输出", color: "#ff5da2", shape: "hex", cooldown: "", activeCooldown: true, desc: "扇形发射3枚折射弹，每枚造成1伤害。" },
    { id: "nova", name: "星爆节", category: "输出", color: "#ff7043", shape: "star", cooldown: "", activeCooldown: true, desc: "向8个方向各发射1枚星屑弹，每枚造成1伤害。" },
    { id: "tesla", name: "雷鸣环节", category: "输出", color: "#f7e85b", shape: "ring", cooldown: "", activeCooldown: true, desc: "电击最近的敌蛇，并向155px内的新目标跳跃；最多命中3条敌蛇，每条受到1伤害。" },
    { id: "laser", name: "霓虹线圈", category: "输出", color: "#39f5a6", shape: "capsule", cooldown: "", activeCooldown: true, desc: "瞬间命中最近的敌蛇，造成1伤害。" },
    { id: "missile", name: "追迹弹舱", category: "输出", color: "#ef476f", shape: "triangle", cooldown: "", activeCooldown: true, desc: "发射1枚追迹弹，造成1伤害。" },
    { id: "mine", name: "磁暴雷节", category: "输出", color: "#9a7cff", shape: "square", cooldown: "", activeCooldown: true, desc: "布置永久存在的磁雷；引爆时使范围内每条敌蛇受到1伤害，玩家触发时自身只被击退。" },
    { id: "blade", name: "旋刃节", category: "输出", color: "#e8eef7", shape: "diamond", cooldown: "", activeCooldown: true, desc: "生成1枚环绕机体旋转的刀刃，接触敌蛇时造成1伤害；每条敌蛇独立计算受击冷却。" },
    { id: "pulse", name: "脉冲核心", category: "输出", color: "#3eb7ff", shape: "ring", cooldown: "", activeCooldown: true, desc: "释放冲击波，使范围内每条敌蛇受到1伤害。" },
    { id: "venom", name: "腐蚀囊节", category: "输出", color: "#8be04e", shape: "hex", cooldown: "", activeCooldown: true, desc: "发射腐蚀弹，命中造成1伤害，随后再造成2次1伤害。" },
    { id: "echo", name: "回声弹匣", category: "输出", color: "#ff8bd7", shape: "capsule", cooldown: "被动效果", desc: "蛇头每次开火时，每级追加1枚偏转弹，造成1伤害。" },
    { id: "rail", name: "贯穿轨炮节", category: "输出", color: "#7ef9ff", shape: "capsule", cooldown: "", activeCooldown: true, desc: "发射贯穿弹，对最多4条敌蛇各造成1伤害。" },
    { id: "ricochet", name: "弹射晶节", category: "输出", color: "#ffcf5a", shape: "diamond", cooldown: "", activeCooldown: true, desc: "发射晶体弹，最多反弹墙壁2次并对3条敌蛇各造成1伤害。" },
    { id: "cluster", name: "裂变弹舱", category: "输出", color: "#ff6b4a", shape: "hex", cooldown: "", activeCooldown: true, desc: "发射追踪爆弹，使爆炸范围内每条敌蛇受到1伤害。" },
    { id: "fan", name: "烈焰扇节", category: "输出", color: "#ff3f68", shape: "triangle", cooldown: "", activeCooldown: true, desc: "扇形发射5枚焰弹，每枚造成1伤害。" },
    { id: "gravity", name: "引力井节", category: "输出", color: "#a56cff", shape: "ring", cooldown: "", activeCooldown: true, desc: "在目标处生成引力井，生成时造成1伤害，并持续拉扯、减速范围内的敌蛇。" },
    { id: "shield", name: "碧玉护盾", category: "防御", color: "#48e0bf", shape: "hex", cooldown: "", activeCooldown: true, desc: "抵消1次头部撞上敌蛇身体的致命碰撞，反击1伤害并短暂无敌。" },
    { id: "phase", name: "幻相节", category: "防御", color: "#bb8cff", shape: "diamond", cooldown: "", activeCooldown: true, desc: "抵消1次头部撞上敌蛇身体的致命碰撞，反击1伤害，短暂无敌并保持航向。" },
    { id: "repulse", name: "斥力环节", category: "防御", color: "#75dfff", shape: "ring", cooldown: "被动效果", desc: "持续将靠近蛇头的敌蛇航向推向外侧，每级提供110px作用半径。" },
    { id: "armor", name: "黑曜装甲", category: "防御", color: "#b7c0ce", shape: "square", cooldown: "被动效果", desc: "每级使护盾与相位的冷却速度+18%。" },
    { id: "thorns", name: "截击反应节", category: "防御", color: "#9ee55f", shape: "star", cooldown: "", activeCooldown: true, desc: "敌蛇撞上身体并被摧毁时，生成1枚球并发射6枚环形弹。" },
    { id: "stabilizer", name: "平衡陀螺", category: "防御", color: "#67d5c8", shape: "ring", cooldown: "被动效果", desc: "每级使反弹减速时间-25%、转向锁定时间-20%，最多-90%。" },
    { id: "magnet", name: "磁吸环节", category: "辅助", color: "#f5cb4c", shape: "ring", cooldown: "被动效果", desc: "每级使蛇头吃球范围+0.55格。" },
    { id: "haste", name: "涡轮节", category: "辅助", color: "#ff8457", shape: "triangle", cooldown: "被动效果", desc: "每级提高4.5%移动速度，并增加0.18弧度/秒转向速度。" },
    { id: "chronos", name: "时缓晶节", category: "辅助", color: "#91a7ff", shape: "diamond", cooldown: "被动效果", desc: "每级使所有敌蛇移动速度-8%，最多-90%。" },
    { id: "tractor", name: "引力环节", category: "辅助", color: "#3ed8b5", shape: "ring", cooldown: "被动效果", desc: "吸引附近的球；每级提供3.5格范围与1.8格/秒牵引速度。" },
    { id: "fortune", name: "幸运星节", category: "辅助", color: "#ffd166", shape: "star", cooldown: "被动效果", desc: "击破敌蛇时，每级使额外掉落球的期望+0.18枚。" },
    { id: "guidance", name: "弹道校准节", category: "辅助", color: "#78a9ff", shape: "capsule", cooldown: "被动效果", desc: "每级使所有子弹飞行速度+12%，并增加0.35弧度/秒追踪速度。" },
    { id: "feast", name: "吞噬涡轮", category: "辅助", color: "#ffb23f", shape: "triangle", cooldown: "被动效果", desc: "吃球后2.5秒内，每级提高12%移动速度；再次吃球刷新持续时间。" },
    { id: "salvage", name: "回收炉节", category: "恢复", color: "#c7f464", shape: "hex", cooldown: "被动效果", desc: "技能削去敌蛇身体时，每级使每节受损机体回收球的期望+0.14枚。" },
    { id: "regen", name: "再生芽节", category: "恢复", color: "#ff6f91", shape: "circle", cooldown: "", activeCooldown: true, desc: "定期在蛇头前方生成1枚球。" },
    { id: "bloom", name: "战利花房", category: "恢复", color: "#ff88c7", shape: "circle", cooldown: "", activeCooldown: true, desc: "击破敌蛇时额外生成1枚球，触发后进入冷却。" },
    { id: "amplifier", name: "超频增幅节", category: "辅助", color: "#f2f5fa", shape: "capsule", cooldown: "被动效果", desc: "每级使蛇头与所有主动技能的冷却速度+14%。" },
    { id: "needle", name: "钨针贯节", category: "输出", color: "#d8f3ff", shape: "capsule", cooldown: "", activeCooldown: true, desc: "发射1枚钨针，对最多2条敌蛇各造成1伤害。" },
    { id: "mortar", name: "震荡榴巢", category: "输出", color: "#ff8a5b", shape: "hex", cooldown: "", activeCooldown: true, desc: "发射追踪榴弹，使爆炸范围内每条敌蛇受到1伤害。" },
    { id: "sweep", name: "清扫光栅", category: "输出", color: "#65e7ff", shape: "capsule", cooldown: "", activeCooldown: true, desc: "向目标方向释放贯穿全场的宽幅光栅，使路径上的每条敌蛇受到1伤害。" },
    { id: "sniper", name: "裁决镜节", category: "输出", color: "#f2f2f2", shape: "diamond", cooldown: "", activeCooldown: true, desc: "瞬间命中最近的敌蛇，造成2伤害。" },
    { id: "flak", name: "近炸蜂巢", category: "输出", color: "#ffcf4d", shape: "hex", cooldown: "", activeCooldown: true, desc: "在目标处引爆弹幕，使范围内每条敌蛇受到1伤害。" },
    { id: "fork", name: "双生电极", category: "输出", color: "#d58cff", shape: "ring", cooldown: "", activeCooldown: true, desc: "向目标两侧各发射1枚追迹电弹，每枚造成1伤害。" },
    { id: "anchor", name: "迟滞锚弹", category: "输出", color: "#6f8cff", shape: "triangle", cooldown: "", activeCooldown: true, desc: "发射追踪锚弹，造成1伤害并让敌蛇长时间减速。" },
    { id: "saw", name: "切割链环", category: "输出", color: "#f06a7b", shape: "ring", cooldown: "", activeCooldown: true, desc: "持续切割靠近本机体的敌蛇，每次造成1伤害；每条敌蛇独立计算受击冷却。" },
    { id: "flare", name: "灼蚀信标", category: "输出", color: "#ff6b35", shape: "star", cooldown: "", activeCooldown: true, desc: "发射灼蚀弹，命中造成1伤害，随后再造成4次1伤害。" },
    { id: "scatter", name: "碎晶霰舱", category: "输出", color: "#70d6ff", shape: "hex", cooldown: "", activeCooldown: true, desc: "扇形发射7枚碎晶，每枚造成1伤害。" },
    { id: "lance", name: "破阵光矛", category: "输出", color: "#b9fff4", shape: "triangle", cooldown: "", activeCooldown: true, desc: "发射大型光矛，对最多6条敌蛇各造成1伤害。" },
    { id: "execute", name: "终结协议", category: "输出", color: "#ff3f55", shape: "diamond", cooldown: "", activeCooldown: true, desc: "瞬间命中最近的敌蛇；总长度不超过3时造成2伤害，否则造成1伤害。" },
    { id: "crossfire", name: "十字火控", category: "输出", color: "#ffb347", shape: "square", cooldown: "", activeCooldown: true, desc: "向目标方向、反方向和两侧各发射1枚重弹；每枚对最多2条敌蛇造成1伤害。" },
    { id: "phasebolt", name: "相位回旋节", category: "输出", color: "#b49cff", shape: "circle", cooldown: "", activeCooldown: true, desc: "发射轻度追踪的相位弹，最多反弹墙壁4次，命中造成1伤害。" },
    { id: "ram", name: "破障冲角", category: "防御", color: "#f3c600", shape: "triangle", cooldown: "", activeCooldown: true, desc: "头部与敌蛇头部相撞时额外造成1伤害。" },
    { id: "buffer", name: "动能缓冲节", category: "防御", color: "#8fa6ad", shape: "square", cooldown: "被动效果", desc: "每级使玩家受到的物理击退-18%，最多-90%。" },
    { id: "decoy", name: "诱导涂层", category: "防御", color: "#ff7a90", shape: "diamond", cooldown: "被动效果", desc: "每级使敌蛇对玩家身体的避让强度-12%，最多-55%。" },
    { id: "emergency", name: "应急屏障节", category: "防御", color: "#62e6bf", shape: "hex", cooldown: "被动效果", desc: "身体吃球后全身无敌；每级持续0.37秒，最多0.9秒。" },
    { id: "collector", name: "全身采集节", category: "辅助", color: "#d4f05c", shape: "ring", cooldown: "被动效果", desc: "每级使自身所有身体节的吃球半径+0.09格。" },
    { id: "beacon", name: "增压信标", category: "辅助", color: "#ffc857", shape: "star", cooldown: "被动效果", desc: "每级使波次倒计时速度+7%。" },
    { id: "momentum", name: "冲量增幅器", category: "辅助", color: "#ff965c", shape: "triangle", cooldown: "被动效果", desc: "每级使敌蛇受到的物理击退+18%。" },
    { id: "progressor", name: "临界推进节", category: "辅助", color: "#38d6c5", shape: "capsule", cooldown: "被动效果", desc: "升级进度越高移动越快；经验满时，每级最多提高8%移动速度。" },
    { id: "nursery", name: "尾部育成舱", category: "恢复", color: "#ff8ec7", shape: "circle", cooldown: "", activeCooldown: true, desc: "定期在蛇尾附近生成1枚球。" },
    { id: "cache", name: "战果缓存节", category: "恢复", color: "#b7e36b", shape: "hex", cooldown: "被动效果", desc: "每击破5名敌人，按机体等级生成等量的球。" }
  ];

  function describeModule(moduleId, balance = defaultBalance) {
    const fallback = moduleBlueprints.find((module) => module.id === moduleId)?.desc || "";
    const reductionMaximum = formatPercent(setting(balance, "moduleEffectReductionMaximum", 0.9));
    switch (moduleId) {
      case "echo":
        return "蛇头每次开火时，每级追加1枚偏转弹，造成1伤害。";
      case "repulse":
        return `持续将靠近蛇头的敌蛇航向推向外侧，每级提供${formatNumber(setting(balance, "moduleRepulseRangePerLevelPixels", 110))}px作用半径。`;
      case "armor":
        return `每级使护盾与相位的冷却速度+${formatPercent(setting(balance, "moduleArmorCooldownRatePerLevel", 0.18))}。`;
      case "thorns":
        return `敌蛇撞上身体并被摧毁时，生成1枚球并发射${formatNumber(setting(balance, "moduleThornsProjectileCount", 6))}枚环形弹。`;
      case "stabilizer":
        return `每级使反弹减速时间-${formatPercent(setting(balance, "moduleStabilizerSlowReductionPerLevel", 0.25))}、转向锁定时间-${formatPercent(setting(balance, "moduleStabilizerLockReductionPerLevel", 0.2))}，最多-${reductionMaximum}。`;
      case "magnet":
        return `每级使蛇头吃球范围+${formatNumber(setting(balance, "moduleMagnetPickupRangePerLevel", 0.55))}格。`;
      case "haste":
        return `每级提高${formatPercent(setting(balance, "moduleHasteSpeedPerLevel", 0.045))}移动速度，并增加${formatNumber(setting(balance, "moduleHasteTurnRatePerLevel", 0.18))}弧度/秒转向速度。`;
      case "chronos":
        return `每级使所有敌蛇移动速度-${formatPercent(setting(balance, "moduleChronosSlowPerLevel", 0.08))}，最多-${reductionMaximum}。`;
      case "tractor":
        return `吸引附近的球；每级提供${formatNumber(setting(balance, "moduleTractorRangePerLevel", 3.5))}格范围与${formatNumber(setting(balance, "moduleTractorPullSpeedPerLevel", 1.8))}格/秒牵引速度。`;
      case "fortune":
        return `击破敌蛇时，每级使额外掉落球的期望+${formatNumber(setting(balance, "moduleFortuneExpectedDropsPerLevel", 0.18))}枚。`;
      case "guidance":
        return `每级使所有子弹飞行速度+${formatPercent(setting(balance, "moduleGuidanceProjectileSpeedPerLevel", 0.12))}，并增加${formatNumber(setting(balance, "moduleGuidanceHomingPerLevel", 0.35))}弧度/秒追踪速度。`;
      case "feast":
        return `吃球后${formatNumber(setting(balance, "moduleFeastDuration", 2.5))}秒内，每级提高${formatPercent(setting(balance, "moduleFeastSpeedPerLevel", 0.12))}移动速度；再次吃球刷新持续时间。`;
      case "salvage":
        return `技能削去敌蛇身体时，每级使每节受损机体回收球的期望+${formatNumber(setting(balance, "moduleSalvageExpectedDropsPerLevel", 0.14))}枚。`;
      case "amplifier":
        return `每级使蛇头与所有主动技能的冷却速度+${formatPercent(setting(balance, "moduleAmplifierCooldownRatePerLevel", 0.14))}。`;
      case "buffer":
        return `每级使玩家受到的物理击退-${formatPercent(setting(balance, "moduleBufferKnockbackReductionPerLevel", 0.18))}，最多-${reductionMaximum}。`;
      case "decoy":
        return `每级使敌蛇对玩家身体的避让强度-${formatPercent(setting(balance, "moduleDecoyAvoidanceReductionPerLevel", 0.12))}，最多-${formatPercent(setting(balance, "moduleDecoyMaxAvoidanceReduction", 0.55))}。`;
      case "emergency":
        return `身体吃球后全身无敌；每级持续${formatNumber(setting(balance, "moduleEmergencyDurationPerLevel", 0.37))}秒，最多${formatNumber(setting(balance, "moduleEmergencyMaxDuration", 0.9))}秒。`;
      case "collector":
        return `每级使自身所有身体节的吃球半径+${formatNumber(setting(balance, "moduleCollectorPickupRadiusPerLevel", 0.09))}格。`;
      case "beacon":
        return `每级使波次倒计时速度+${formatPercent(setting(balance, "moduleBeaconWaveRatePerLevel", 0.07))}。`;
      case "momentum":
        return `每级使敌蛇受到的物理击退+${formatPercent(setting(balance, "moduleMomentumKnockbackPerLevel", 0.18))}。`;
      case "progressor":
        return `升级进度越高移动越快；经验满时，每级最多提高${formatPercent(setting(balance, "moduleProgressorMaxSpeedPerLevel", 0.08))}移动速度。`;
      case "cache":
        return `每击破${formatNumber(setting(balance, "moduleCacheKillsPerTrigger", 5))}名敌人，按机体等级生成等量的球。`;
      default:
        return fallback;
    }
  }

  const modules = moduleBlueprints.map((module) => Object.freeze({
    ...module,
    desc: describeModule(module.id, defaultBalance)
  }));

  globalThis.GSS0DescribeModule = describeModule;
  globalThis.GSS0ModuleCatalog = Object.freeze(modules);
})();
