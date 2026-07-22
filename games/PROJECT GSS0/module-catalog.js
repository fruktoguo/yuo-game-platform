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
    { id: "spark", name: "高速枪节", category: "攻击", color: "#ff9f43", shape: "triangle", cooldown: "", activeCooldown: true, desc: "向随机方向发射1枚子弹。" },
    { id: "frost", name: "冰棱节", category: "攻击", color: "#58d8ff", shape: "diamond", cooldown: "", activeCooldown: true, desc: "发射冰晶弹并永久降低敌蛇50%移动速度" },
    { id: "prism", name: "三棱镜节", category: "攻击", color: "#ff5da2", shape: "hex", cooldown: "", activeCooldown: true, desc: "扇形发射3枚子弹。" },
    { id: "nova", name: "星爆节", category: "攻击", color: "#ff7043", shape: "star", cooldown: "", activeCooldown: true, desc: "向8个方向各发射1枚子弹。" },
    { id: "tesla", name: "雷鸣环节", category: "攻击", color: "#f7e85b", shape: "ring", cooldown: "", activeCooldown: true, desc: "电击最近的敌蛇，并向155px内的新目标跳跃；最多命中3条敌蛇，每条受到1伤害。" },
    { id: "laser", name: "霓虹线圈", category: "攻击", color: "#39f5a6", shape: "capsule", cooldown: "", activeCooldown: true, desc: "瞬间命中最近的敌蛇，造成1伤害。" },
    { id: "missile", name: "追迹弹舱", category: "攻击", color: "#ef476f", shape: "triangle", cooldown: "", activeCooldown: true, desc: "发射1枚能够自动追踪敌蛇的追迹弹。" },
    { id: "mine", name: "磁暴雷节", category: "攻击", color: "#9a7cff", shape: "square", cooldown: "", activeCooldown: true, desc: "布置永久存在的磁雷；引爆时对范围内每个敌方部位分别造成1伤害，玩家触发时自身只被击退。" },
    { id: "blade", name: "旋刃节", category: "攻击", color: "#e8eef7", shape: "diamond", cooldown: "被动效果", desc: "每级生成1枚环绕机体的旋刃，对命中的部位造成1伤害。" },
    { id: "pulse", name: "脉冲核心", category: "攻击", color: "#3eb7ff", shape: "ring", cooldown: "", activeCooldown: true, desc: "释放半径6格的冲击波，对范围内每个敌方部位分别造成1伤害。" },
    { id: "venom", name: "腐蚀囊节", category: "攻击", color: "#8be04e", shape: "hex", cooldown: "", activeCooldown: true, desc: "发射腐蚀弹，命中后施加可无限叠加的永久中毒；中毒间隔3秒，每层中毒随机摧毁1节身体。" },
    { id: "echo", name: "回声弹匣", category: "攻击", color: "#ff8bd7", shape: "capsule", cooldown: "被动效果", desc: "蛇头撞击敌蛇或墙壁时，每级向随机方向发射2枚子弹。" },
    { id: "rail", name: "贯穿轨炮节", category: "攻击", color: "#7ef9ff", shape: "capsule", cooldown: "", activeCooldown: true, desc: "发射可无限穿透的轨炮弹。" },
    { id: "ricochet", name: "弹射晶节", category: "攻击", color: "#ffcf5a", shape: "diamond", cooldown: "", activeCooldown: true, desc: "发射可无限反弹墙壁的晶体弹。" },
    { id: "cluster", name: "裂变弹舱", category: "攻击", color: "#ff6b4a", shape: "hex", cooldown: "", activeCooldown: true, desc: "发射追踪爆弹，在半径5格内爆炸并命中每个敌方部位。" },
    { id: "fan", name: "烈焰扇节", category: "攻击", color: "#ff3f68", shape: "triangle", cooldown: "", activeCooldown: true, desc: "扇形发射5枚子弹。" },
    { id: "gravity", name: "引力井节", category: "攻击", color: "#a56cff", shape: "ring", cooldown: "", activeCooldown: true, desc: "在此机体的位置生成引力井，持续拉扯并减速敌蛇。" },
    { id: "shield", name: "碧玉护盾", category: "生存", color: "#48e0bf", shape: "hex", cooldown: "", activeCooldown: true, desc: "周期性获得1层可抵御任意一次伤害的护盾，最多储存5层。" },
    { id: "phase", name: "幻相节", category: "生存", color: "#bb8cff", shape: "diamond", cooldown: "", activeCooldown: true, desc: "抵消1次头部撞上敌蛇身体时受到的伤害，短暂无敌并保持航向。" },
    { id: "repulse", name: "斥力环节", category: "生存", color: "#75dfff", shape: "ring", cooldown: "被动效果", desc: "持续将靠近蛇头的敌蛇航向推向外侧，每级提供110px作用半径。" },
    { id: "armor", name: "黑曜装甲", category: "生存", color: "#b7c0ce", shape: "square", cooldown: "被动效果", desc: "每级使护盾与相位的冷却速度+18%。" },
    { id: "thorns", name: "截击反应节", category: "生存", color: "#9ee55f", shape: "star", cooldown: "", activeCooldown: true, desc: "敌蛇撞上身体并被摧毁时，生成1枚球并发射6枚环形弹。" },
    { id: "stabilizer", name: "平衡陀螺", category: "生存", color: "#67d5c8", shape: "ring", cooldown: "被动效果", desc: "每级使反弹减速时间-25%、转向锁定时间-20%。" },
    { id: "magnet", name: "磁吸环节", category: "辅助", color: "#f5cb4c", shape: "ring", cooldown: "被动效果", desc: "每级使蛇头吃球范围+0.55格。" },
    { id: "haste", name: "涡轮节", category: "辅助", color: "#ff8457", shape: "triangle", cooldown: "被动效果", desc: "每级使玩家转向速度提高20%。" },
    { id: "chronos", name: "时缓晶节", category: "辅助", color: "#91a7ff", shape: "diamond", cooldown: "被动效果", desc: "每级使所有敌蛇移动速度-8%。" },
    { id: "tractor", name: "引力环节", category: "辅助", color: "#3ed8b5", shape: "ring", cooldown: "被动效果", desc: "吸引附近的球；每级提供3.5格范围与1.8格/秒牵引速度。" },
    { id: "fortune", name: "幸运星节", category: "发育", color: "#ffd166", shape: "star", cooldown: "被动效果", desc: "击破敌蛇时，每级使额外掉落球的期望+0.18枚。" },
    { id: "guidance", name: "弹道校准节", category: "辅助", color: "#78a9ff", shape: "capsule", cooldown: "被动效果", desc: "每级使所有子弹飞行速度+12%，并增加0.35弧度/秒追踪速度。" },
    { id: "feast", name: "吞噬涡轮", category: "辅助", color: "#ffb23f", shape: "triangle", cooldown: "被动效果", desc: "吃球后2.5秒内，每级提高12%移动速度；再次吃球刷新持续时间。" },
    { id: "salvage", name: "回收炉节", category: "发育", color: "#c7f464", shape: "hex", cooldown: "被动效果", desc: "技能削去敌蛇身体时，每级使每节受损机体回收球的期望+0.14枚。" },
    { id: "regen", name: "再生芽节", category: "发育", color: "#ff6f91", shape: "circle", cooldown: "", activeCooldown: true, desc: "周期性在本机体附近生成1枚球。" },
    { id: "bloom", name: "战利花房", category: "发育", color: "#ff88c7", shape: "circle", cooldown: "", activeCooldown: true, desc: "击破敌蛇时额外生成1枚球，触发后进入冷却。" },
    { id: "amplifier", name: "超频增幅节", category: "辅助", color: "#f2f5fa", shape: "capsule", cooldown: "被动效果", desc: "每级使所有主动技能的冷却恢复速度提高10%。" },
    { id: "needle", name: "钨针贯节", category: "攻击", color: "#d8f3ff", shape: "capsule", cooldown: "", activeCooldown: true, desc: "发射具有1次穿透的钨针。" },
    { id: "mortar", name: "震荡榴巢", category: "攻击", color: "#ff8a5b", shape: "hex", cooldown: "", activeCooldown: true, desc: "发射追踪榴弹，爆炸时命中范围内的每个敌方部位。" },
    { id: "sweep", name: "清扫光栅", category: "攻击", color: "#65e7ff", shape: "capsule", cooldown: "", activeCooldown: true, desc: "向目标方向释放贯穿全场的宽幅光栅，对路径内每个敌方部位分别造成1伤害。" },
    { id: "sniper", name: "裁决镜节", category: "攻击", color: "#f2f2f2", shape: "diamond", cooldown: "", activeCooldown: true, desc: "瞬间命中最近的敌蛇，造成2伤害。" },
    { id: "flak", name: "近炸蜂巢", category: "攻击", color: "#ffcf4d", shape: "hex", cooldown: "", activeCooldown: true, desc: "在目标处引爆弹幕，对范围内每个敌方部位分别造成1伤害。" },
    { id: "fork", name: "双生电极", category: "攻击", color: "#d58cff", shape: "ring", cooldown: "", activeCooldown: true, desc: "向目标两侧各发射1枚追迹电弹。" },
    { id: "anchor", name: "迟滞锚弹", category: "攻击", color: "#6f8cff", shape: "triangle", cooldown: "", activeCooldown: true, desc: "发射追踪锚弹并让命中的敌蛇长时间减速。" },
    { id: "saw", name: "切割链环", category: "攻击", color: "#f06a7b", shape: "ring", cooldown: "", activeCooldown: true, desc: "持续切割靠近本机体的敌蛇，每次造成1伤害；每条敌蛇独立计算受击冷却。" },
    { id: "flare", name: "灼蚀信标", category: "攻击", color: "#ff6b35", shape: "star", cooldown: "", activeCooldown: true, desc: "发射灼蚀弹，命中后再造成4次1伤害。" },
    { id: "scatter", name: "碎晶霰舱", category: "攻击", color: "#70d6ff", shape: "hex", cooldown: "", activeCooldown: true, desc: "扇形发射7枚子弹。" },
    { id: "lance", name: "破阵光矛", category: "攻击", color: "#b9fff4", shape: "triangle", cooldown: "", activeCooldown: true, desc: "发射具有5次穿透的大型光矛。" },
    { id: "execute", name: "终结协议", category: "攻击", color: "#ff3f55", shape: "diamond", cooldown: "", activeCooldown: true, desc: "瞬间摧毁生命值为1的敌蛇；没有有效目标时保留冷却。" },
    { id: "crossfire", name: "十字火控", category: "攻击", color: "#ffb347", shape: "square", cooldown: "", activeCooldown: true, desc: "向目标方向、反方向和两侧各发射1枚具有1次穿透的重弹。" },
    { id: "phasebolt", name: "相位回旋节", category: "攻击", color: "#b49cff", shape: "circle", cooldown: "", activeCooldown: true, desc: "发射可追踪敌人并无限反弹墙壁的相位弹。" },
    { id: "barrage", name: "镜反弹幕节", category: "攻击", color: "#9be7ff", shape: "star", cooldown: "", activeCooldown: true, desc: "向四周发射16枚可无限反弹墙壁的子弹。" },
    { id: "ram", name: "破障冲角", category: "攻击", color: "#f3c600", shape: "triangle", cooldown: "被动效果", desc: "每级使玩家蛇头撞击敌蛇任意部位时造成的伤害+1。" },
    { id: "buffer", name: "动能缓冲节", category: "辅助", color: "#8fa6ad", shape: "square", cooldown: "被动效果", desc: "蛇头撞击任意单位时，每级使受到的击退力与减速时间降低20%。" },
    { id: "decoy", name: "诱导涂层", category: "生存", color: "#ff7a90", shape: "diamond", cooldown: "被动效果", desc: "每级使敌蛇对玩家身体的避让强度-12%，最多-55%。" },
    { id: "emergency", name: "应急屏障节", category: "生存", color: "#62e6bf", shape: "hex", cooldown: "被动效果", desc: "身体吃球后全身无敌；每级持续0.37秒，最多0.9秒。" },
    { id: "collector", name: "全身采集节", category: "辅助", color: "#d4f05c", shape: "ring", cooldown: "被动效果", desc: "每级使自身所有身体节的吃球半径+0.09格。" },
    { id: "beacon", name: "增压信标", category: "发育", color: "#ffc857", shape: "star", cooldown: "被动效果", desc: "每级使所有敌蛇的生成数量增加15%；与其它数量来源乘算。" },
    { id: "momentum", name: "冲量增幅器", category: "攻击", color: "#ff965c", shape: "triangle", cooldown: "被动效果", desc: "蛇头撞击敌蛇蛇头时，每级使造成的击退力提高100%。" },
    { id: "progressor", name: "临界推进节", category: "辅助", color: "#38d6c5", shape: "capsule", cooldown: "被动效果", desc: "每级使玩家移动速度提高20%。" },
    { id: "nursery", name: "尾部育成舱", category: "发育", color: "#ff8ec7", shape: "circle", cooldown: "", activeCooldown: true, desc: "定期在蛇尾附近生成1枚球。" },
    { id: "cache", name: "战果缓存节", category: "发育", color: "#b7e36b", shape: "hex", cooldown: "被动效果", desc: "每击破5名敌人，按机体等级生成等量的球。" },
    { id: "insight", name: "经验增幅节", category: "发育", color: "#9ade61", shape: "hex", cooldown: "被动效果", desc: "吃球时，每级有10%概率额外获得1点经验。" },
    { id: "headstrike", name: "裂首冲锥", category: "攻击", color: "#ff4f64", shape: "triangle", cooldown: "被动效果", desc: "蛇头撞击敌蛇蛇头时，每级额外造成2伤害。" },
    { id: "vitality", name: "生命扩容节", category: "生存", color: "#52e0a4", shape: "hex", cooldown: "被动效果", desc: "每级使最大生命值+6；装载或升级时同步恢复6生命。" },
    { id: "renewal", name: "恒愈芯节", category: "生存", color: "#6df0c4", shape: "circle", cooldown: "被动效果", desc: "每级使每秒生命恢复+0.5。" },
    { id: "plating", name: "层叠装甲", category: "生存", color: "#9da8b0", shape: "square", cooldown: "被动效果", desc: "每级使受到的所有伤害降低10%。" },
    { id: "replicator", name: "孢子复制节", category: "发育", color: "#b7ef70", shape: "circle", cooldown: "被动效果", desc: "吃球时，每级有6%概率在蛇尾后方生成1枚球。此机体生成的球也可以再次触发此效果。" },
    { id: "medkit", name: "摄生转化节", category: "生存", color: "#65e6ae", shape: "diamond", cooldown: "被动效果", desc: "吃球时，每级恢复1生命。" },
    { id: "adrenaline", name: "失压推进节", category: "辅助", color: "#ffbd59", shape: "triangle", cooldown: "被动效果", desc: "每损失3%最大生命值，每级使移动速度提高1%。" },
    { id: "berserk", name: "逆境撞针", category: "攻击", color: "#ff5964", shape: "star", cooldown: "被动效果", desc: "每损失30%最大生命值，每级使蛇头伤害+1。" },
    { id: "recovery", name: "愈合增幅节", category: "生存", color: "#73f2c2", shape: "ring", cooldown: "被动效果", desc: "每级使所有来源的生命恢复效果提高20%。" },
    { id: "wallbreaker", name: "壁垒共振节", category: "攻击", color: "#ff9d42", shape: "square", cooldown: "被动效果", desc: "每级使敌蛇撞墙与互撞的伤害和击退提高50%" },
    { id: "tailguard", name: "尾部隔离舱", category: "辅助", color: "#e8eef5", shape: "capsule", cooldown: "被动效果", desc: "每级在蛇尾追加2节无特殊效果的白色拦截机体。" },
    { id: "deathburst", name: "猎杀齐射节", category: "攻击", color: "#ff8d6b", shape: "star", cooldown: "被动效果", desc: "任意敌蛇死亡时，每级向随机方向发射3枚子弹。" },
    { id: "crisis", name: "危态代偿节", category: "生存", color: "#ff6f91", shape: "diamond", cooldown: "被动效果", desc: "生命低于50%时，每级使每秒生命恢复+1；否则每级使每秒生命恢复-1。" },
    { id: "linkage", name: "延展耦合节", category: "辅助", color: "#62d8ff", shape: "capsule", cooldown: "被动效果", desc: "每级使自身机体连接距离提高20%。" },
    { id: "arsenal", name: "武装扩容节", category: "攻击", color: "#ffcf66", shape: "hex", cooldown: "被动效果", desc: "每级使攻击尺寸提高10%。" },
    { id: "doublehit", name: "倍击撞针", category: "攻击", color: "#ff5d73", shape: "triangle", cooldown: "被动效果", desc: "造成撞击伤害时，每级有20%概率使伤害翻倍。" },
    { id: "multishot", name: "齐射增殖节", category: "攻击", color: "#72e5ff", shape: "star", cooldown: "被动效果", desc: "每次发射子弹时，每级有10%概率使发射数量翻倍。" },
    { id: "rebound", name: "跳弹增幅节", category: "攻击", color: "#ffe36b", shape: "diamond", cooldown: "被动效果", desc: "每级使所有子弹的墙壁反弹次数+1。" },
    { id: "incendiary", name: "焚身导弹节", category: "攻击", color: "#ff572f", shape: "triangle", cooldown: "", activeCooldown: true, desc: "瞄准生命值最高的敌蛇发射追踪燃烧弹；命中造成1伤害，存活时再燃烧摧毁其当前生命值50%向上取整的随机机体节。" }
  ];

  function describeModule(moduleId, balance = defaultBalance) {
    const fallback = moduleBlueprints.find((module) => module.id === moduleId)?.desc || "";
    switch (moduleId) {
      case "frost":
        return `发射冰晶弹并永久降低敌蛇${formatPercent(setting(balance, "moduleFrostSlowPerHit", 0.5))}移动速度`;
      case "blade":
        return "每级生成1枚环绕机体的旋刃，对命中的部位造成1伤害。";
      case "pulse":
        return `释放半径${formatNumber(setting(balance, "modulePulseRadiusCells", 6))}格的冲击波，对范围内每个敌方部位分别造成1伤害。`;
      case "venom":
        return `发射腐蚀弹，命中后施加可无限叠加的永久中毒；中毒间隔${formatNumber(setting(balance, "poisonTickInterval", 3))}秒，每层中毒随机摧毁1节身体。`;
      case "cluster":
        return `发射追踪爆弹，在半径${formatNumber(setting(balance, "moduleClusterBlastRadiusCells", 5))}格内爆炸并命中每个敌方部位。`;
      case "shield":
        return `周期性获得1层可抵御任意一次伤害的护盾，最多储存${formatNumber(setting(balance, "moduleShieldMaxCharges", 5))}层。`;
      case "echo":
        return `蛇头撞击敌蛇或墙壁时，每级向随机方向发射${formatNumber(setting(balance, "moduleEchoProjectilesPerLevel", 2))}枚子弹。`;
      case "barrage":
        return `向四周发射${formatNumber(setting(balance, "moduleBarrageProjectileCount", 16))}枚可无限反弹墙壁的子弹。`;
      case "repulse":
        return `持续将靠近蛇头的敌蛇航向推向外侧，每级提供${formatNumber(setting(balance, "moduleRepulseRangePerLevelPixels", 110))}px作用半径。`;
      case "armor":
        return `每级使护盾与相位的冷却速度+${formatPercent(setting(balance, "moduleArmorCooldownRatePerLevel", 0.18))}。`;
      case "thorns":
        return `敌蛇撞上身体并被摧毁时，生成1枚球并发射${formatNumber(setting(balance, "moduleThornsProjectileCount", 6))}枚环形弹。`;
      case "stabilizer":
        return `每级使反弹减速时间-${formatPercent(setting(balance, "moduleStabilizerSlowReductionPerLevel", 0.25))}、转向锁定时间-${formatPercent(setting(balance, "moduleStabilizerLockReductionPerLevel", 0.2))}。`;
      case "magnet":
        return `每级使蛇头吃球范围+${formatNumber(setting(balance, "moduleMagnetPickupRangePerLevel", 0.55))}格。`;
      case "haste":
        return `每级使玩家转向速度提高${formatPercent(setting(balance, "moduleHasteTurnRatePerLevel", 0.2))}。`;
      case "chronos":
        return `每级使所有敌蛇移动速度-${formatPercent(setting(balance, "moduleChronosSlowPerLevel", 0.08))}。`;
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
        return `每级使所有主动技能的冷却恢复速度提高${formatPercent(setting(balance, "moduleAmplifierCooldownRatePerLevel", 0.1))}。`;
      case "buffer":
        return `蛇头撞击任意单位时，每级使受到的击退力与减速时间降低${formatPercent(setting(balance, "moduleBufferCollisionReductionPerLevel", 0.2))}。`;
      case "decoy":
        return `每级使敌蛇对玩家身体的避让强度-${formatPercent(setting(balance, "moduleDecoyAvoidanceReductionPerLevel", 0.12))}，最多-${formatPercent(setting(balance, "moduleDecoyMaxAvoidanceReduction", 0.55))}。`;
      case "emergency":
        return `身体吃球后全身无敌；每级持续${formatNumber(setting(balance, "moduleEmergencyDurationPerLevel", 0.37))}秒，最多${formatNumber(setting(balance, "moduleEmergencyMaxDuration", 0.9))}秒。`;
      case "collector":
        return `每级使自身所有身体节的吃球半径+${formatNumber(setting(balance, "moduleCollectorPickupRadiusPerLevel", 0.09))}格。`;
      case "beacon":
        return `每级使所有敌蛇的生成数量增加${formatPercent(setting(balance, "moduleBeaconEnemyCountPerLevel", 0.15))}；与其它数量来源乘算。`;
      case "momentum":
        return `蛇头撞击敌蛇蛇头时，每级使造成的击退力提高${formatPercent(setting(balance, "moduleMomentumKnockbackPerLevel", 1))}。`;
      case "progressor":
        return `每级使玩家移动速度提高${formatPercent(setting(balance, "moduleProgressorSpeedPerLevel", 0.2))}。`;
      case "insight":
        return `吃球时，每级有${formatPercent(setting(balance, "moduleBonusXpChancePerLevel", 0.1))}概率额外获得1点经验。`;
      case "headstrike":
        return `蛇头撞击敌蛇蛇头时，每级额外造成${formatNumber(setting(balance, "moduleHeadCollisionDamagePerLevel", 2))}伤害。`;
      case "vitality":
        return `每级使最大生命值+${formatNumber(setting(balance, "moduleMaxHealthPerLevel", 6))}；装载或升级时同步恢复等量生命。`;
      case "renewal":
        return `每级使每秒生命恢复+${formatNumber(setting(balance, "moduleHealthRegenPerLevel", 0.5))}。`;
      case "plating":
        return `每级使受到的所有伤害降低${formatPercent(setting(balance, "moduleDamageReductionPerLevel", 0.1))}。`;
      case "replicator":
        return `吃球时，每级有${formatPercent(setting(balance, "moduleFoodReplicationChancePerLevel", 0.06))}概率在蛇尾后方生成1枚球。此机体生成的球也可以再次触发此效果。`;
      case "medkit":
        return `吃球时，每级恢复${formatNumber(setting(balance, "moduleFoodHealPerLevel", 1))}生命。`;
      case "adrenaline":
        return `每损失${formatPercent(setting(balance, "moduleMissingHealthSpeedStep", 0.03))}最大生命值，每级使移动速度提高${formatPercent(setting(balance, "moduleMissingHealthSpeedPerStepPerLevel", 0.01))}。`;
      case "berserk":
        return `每损失${formatPercent(setting(balance, "moduleMissingHealthHeadDamageStep", 0.3))}最大生命值，每级使蛇头伤害+${formatNumber(setting(balance, "moduleMissingHealthHeadDamagePerStepPerLevel", 1))}。`;
      case "recovery":
        return `每级使所有来源的生命恢复效果提高${formatPercent(setting(balance, "moduleHealingReceivedPerLevel", 0.2))}。`;
      case "wallbreaker":
        return `每级使敌蛇撞墙与互撞的伤害和击退提高${formatPercent(setting(balance, "moduleEnemyWallDamagePerLevel", 0.5))}`;
      case "tailguard":
        return `每级在蛇尾追加${formatNumber(setting(balance, "moduleTailGuardSegmentsPerLevel", 2))}节无特殊效果的白色拦截机体。`;
      case "deathburst":
        return `任意敌蛇死亡时，每级向随机方向发射${formatNumber(setting(balance, "moduleDeathBurstProjectilesPerLevel", 2))}枚子弹。`;
      case "crisis":
        return `生命低于${formatPercent(setting(balance, "moduleCrisisHealthThreshold", 0.5))}时，每级使每秒生命恢复+${formatNumber(setting(balance, "moduleCrisisRegenPerLevel", 1))}；否则每级使每秒生命恢复-${formatNumber(setting(balance, "moduleCrisisRegenPerLevel", 1))}。`;
      case "linkage":
        return `每级使自身机体连接距离提高${formatPercent(setting(balance, "moduleLinkageSpacingPerLevel", 0.2))}。`;
      case "arsenal":
        return `每级使子弹、旋刃、爆炸范围与激光半径提高${formatPercent(setting(balance, "moduleAttackSizePerLevel", 0.1))}。`;
      case "doublehit":
        return `造成撞击伤害时，每级有${formatPercent(setting(balance, "moduleCollisionDoubleChancePerLevel", 0.2))}概率使伤害翻倍。`;
      case "multishot":
        return `每次发射子弹时，每级有${formatPercent(setting(balance, "moduleProjectileDoubleChancePerLevel", 0.1))}概率使发射数量翻倍。`;
      case "rebound":
        return `每级使所有子弹的墙壁反弹次数+${formatNumber(setting(balance, "moduleProjectileBouncesPerLevel", 1))}。`;
      case "incendiary":
        return `瞄准生命值最高的敌蛇发射追踪燃烧弹；命中造成1伤害，存活时再燃烧摧毁其当前生命值${formatPercent(setting(balance, "burnHealthFraction", 0.5))}向上取整的随机机体节。`;
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
