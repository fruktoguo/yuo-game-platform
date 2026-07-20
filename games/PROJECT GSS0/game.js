(() => {
  "use strict";

  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const ambientCanvas = document.createElement("canvas");
  const ambientCtx = ambientCanvas.getContext("2d", { alpha: false });
  const arenaTextureCanvas = document.createElement("canvas");
  const arenaTextureCtx = arenaTextureCanvas.getContext("2d", { alpha: false });
  const arenaShadowCanvas = document.createElement("canvas");
  const arenaShadowCtx = arenaShadowCanvas.getContext("2d");
  let testMode = false;
  let localModeForced = false;
  const PLAYER_COLORS = ["#f3c600", "#08c7dc", "#ef3e4a", "#8be04e", "#b49cff", "#ff8a5b", "#70d6ff", "#ff88c7"];

  const ui = {
    shell: document.querySelector("#game-shell"),
    time: document.querySelector("#time-value"),
    kills: document.querySelector("#kill-value"),
    wave: document.querySelector("#wave-value"),
    score: document.querySelector("#score-value"),
    level: document.querySelector("#level-value"),
    xp: document.querySelector("#xp-value"),
    needed: document.querySelector("#xp-needed"),
    xpFill: document.querySelector("#xp-fill"),
    xpPips: document.querySelector("#xp-pips"),
    rack: document.querySelector("#module-rack"),
    touch: document.querySelector("#touch-indicator"),
    start: document.querySelector("#start-screen"),
    pause: document.querySelector("#pause-screen"),
    upgrade: document.querySelector("#upgrade-screen"),
    gameOver: document.querySelector("#game-over-screen"),
    options: document.querySelector("#upgrade-options"),
    upgradeLevel: document.querySelector("#upgrade-level-value"),
    best: document.querySelector("#best-value"),
    finalScore: document.querySelector("#final-score"),
    finalLevel: document.querySelector("#final-level"),
    finalKills: document.querySelector("#final-kills"),
    finalTime: document.querySelector("#final-time"),
    newBest: document.querySelector("#new-best"),
    startButton: document.querySelector("#start-button"),
    autoTestButton: document.querySelector("#auto-test-button"),
    localModeButton: document.querySelector("#local-mode-button"),
    codexButton: document.querySelector("#codex-button"),
    codex: document.querySelector("#codex-screen"),
    codexList: document.querySelector("#codex-list"),
    codexCloseButton: document.querySelector("#codex-close-button"),
    changelogButton: document.querySelector("#changelog-button"),
    changelog: document.querySelector("#changelog-screen"),
    changelogCloseButton: document.querySelector("#changelog-close-button"),
    levelUpBanner: document.querySelector("#level-up-banner"),
    lobbyButton: document.querySelector("#lobby-button"),
    fontButton: document.querySelector("#font-button"),
    fontSlider: document.querySelector("#font-slider"),
    fontOutput: document.querySelector("#font-output"),
    fontPopover: document.querySelector("#font-popover"),
    pauseButton: document.querySelector("#pause-button"),
    soundButton: document.querySelector("#sound-button"),
    soundSlider: document.querySelector("#sound-slider"),
    soundOutput: document.querySelector("#sound-output"),
    soundPopover: document.querySelector("#sound-popover"),
    motionButton: document.querySelector("#motion-button"),
    motionSlider: document.querySelector("#motion-slider"),
    motionOutput: document.querySelector("#motion-output"),
    motionPopover: document.querySelector("#motion-popover"),
    backgroundPauseButton: document.querySelector("#background-pause-button"),
    backgroundPauseToggle: document.querySelector("#background-pause-toggle"),
    backgroundPausePopover: document.querySelector("#background-pause-popover"),
    descriptionButton: document.querySelector("#description-button"),
    descriptionToggle: document.querySelector("#description-toggle"),
    descriptionPopover: document.querySelector("#description-popover"),
    resumeButton: document.querySelector("#resume-button"),
    pauseRestart: document.querySelector("#pause-restart-button"),
    pauseMenuButton: document.querySelector("#pause-menu-button"),
    restartButton: document.querySelector("#restart-button"),
    gameOverMenuButton: document.querySelector("#game-over-menu-button"),
    networkStatus: document.querySelector("#network-status"),
    scoreboard: document.querySelector("#multiplayer-scoreboard"),
    scoreboardCount: document.querySelector("#multiplayer-count"),
    scoreboardPlayers: document.querySelector("#multiplayer-players"),
    fpsMeter: document.querySelector("#fps-meter"),
    fpsValue: document.querySelector("#fps-value")
  };

  const TAU = Math.PI * 2;
  const DESIGNER_CONFIG = globalThis.GSS0_DESIGNER_CONFIG || {};
  if (DESIGNER_CONFIG.schemaVersion !== 4) throw new Error("PROJECT GSS0 设计配置版本无效，需要 schemaVersion 4");
  const DESIGNER_BALANCE = DESIGNER_CONFIG.balance || {};
  const MODULE_DESIGN_STATES = DESIGNER_CONFIG.moduleStates || {};
  const MODULE_COOLDOWN_PERCENTAGES = DESIGNER_CONFIG.moduleCooldownPercentages || {};

  function designerNumber(key, fallback, minimum, maximum, integer = false) {
    const candidate = DESIGNER_BALANCE[key];
    if (!Number.isFinite(candidate)) return fallback;
    const clamped = Math.max(minimum, Math.min(maximum, candidate));
    return integer ? Math.round(clamped) : clamped;
  }

  const ATTACK_INTERVAL_SCALE = designerNumber("attackIntervalScale", 2, 0.1, 10);
  const HEAD_ATTACK_INTERVAL = designerNumber("headAttackInterval", 1.9, 0.05, 30);
  const ACTIVE_SKILL_BASE_COOLDOWN = designerNumber("activeSkillBaseCooldown", 3, 0.05, 30);

  function moduleCooldownPercent(moduleId) {
    const candidate = MODULE_COOLDOWN_PERCENTAGES[moduleId];
    if (!Number.isFinite(candidate)) throw new Error(`PROJECT GSS0 机体 ${moduleId} 缺少冷却百分比`);
    return clamp(candidate, 0, 1000);
  }

  function moduleCooldownSeconds(moduleId) {
    return ACTIVE_SKILL_BASE_COOLDOWN * moduleCooldownPercent(moduleId) / 100;
  }

  function formatCooldownSeconds(seconds) {
    return `${Number(seconds.toFixed(2))}秒`;
  }

  function activeCooldownLabel(moduleId, perTarget = false) {
    return `${formatCooldownSeconds(moduleCooldownSeconds(moduleId))}${perTarget ? "/目标" : ""}`;
  }

  const MODULE_TUNING = Object.freeze({
    armor: { cooldownMultiplierPerStack: 0.82 },
    stabilizer: { slowMultiplierPerStack: 0.75, lockMultiplierPerStack: 0.8 },
    magnet: { pickupRangeCellsPerStack: 0.55 },
    haste: { speedPerStack: 0.045, turnRatePerStack: 0.18 },
    chronos: { enemySpeedMultiplierPerStack: 0.92 },
    tractor: { baseRangeCells: 3.5, rangeCellsPerExtraStack: 1.1, basePullSpeed: 1.8, pullSpeedPerExtraStack: 0.45 },
    fortune: { chancePerStack: 0.18, maxChance: 0.85, extraDropEveryStacks: 3 },
    guidance: { projectileSpeedPerStack: 0.12, homingPerStack: 0.35 },
    feast: { duration: 2.5, speedPerStack: 0.12 },
    salvage: { chancePerStack: 0.14, maxChance: 0.72 },
    amplifier: { cooldownMultiplierPerStack: 0.86 },
    buffer: { knockbackMultiplierPerStack: 0.82 },
    decoy: { avoidanceReductionPerStack: 0.12, minimumAvoidanceMultiplier: 0.45 },
    emergency: { baseDuration: 0.25, durationPerStack: 0.12, maxDuration: 0.9 },
    collector: { pickupRadiusCellsPerStack: 0.09 },
    beacon: { waveRatePerStack: 0.07 },
    momentum: { enemyKnockbackPerStack: 0.18 },
    progressor: { maxSpeedPerStack: 0.08 },
    repulse: { baseRangePixels: 90, rangePixelsPerStack: 20 },
    thorns: { extraStackMultiplier: 0.85, baseShots: 6, shotsPerExtraStack: 2, maxBonusShots: 10 },
    bloom: { extraStackMultiplier: 0.88 },
    cache: { baseKills: 6, killsReducedPerStack: 1, minimumKills: 2 },
    ram: { extraStackMultiplier: 0.86 }
  });
  const MODULES = [
    { id: "spark", name: "赤焰炮节", category: "输出", color: "#ff9f43", shape: "triangle", cooldown: activeCooldownLabel("spark"), activeCooldown: true, desc: "周期锁定最近敌蛇，发射一枚高速焰弹。稳定、直接的单体火力。" },
    { id: "frost", name: "冰棱节", category: "输出", color: "#58d8ff", shape: "diamond", cooldown: activeCooldownLabel("frost"), activeCooldown: true, desc: "发射冰晶弹，命中削去一节身体，并让敌蛇短暂减速。" },
    { id: "prism", name: "三棱镜节", category: "输出", color: "#ff5da2", shape: "hex", cooldown: activeCooldownLabel("prism"), activeCooldown: true, desc: "向目标方向扇形发射三枚折射弹，单轮具备较高爆发。" },
    { id: "nova", name: "星爆节", category: "输出", color: "#ff7043", shape: "star", cooldown: activeCooldownLabel("nova"), activeCooldown: true, desc: "蓄能后向四周喷射八枚星屑，近身混战时覆盖整片区域。" },
    { id: "tesla", name: "雷鸣环节", category: "输出", color: "#f7e85b", shape: "ring", cooldown: activeCooldownLabel("tesla"), activeCooldown: true, desc: "电弧在邻近敌蛇间跳跃，最多连续命中三个目标。" },
    { id: "laser", name: "霓虹线圈", category: "输出", color: "#39f5a6", shape: "capsule", cooldown: activeCooldownLabel("laser"), activeCooldown: true, desc: "定期向场上最近目标释放瞬发光束，不会打偏。" },
    { id: "missile", name: "追迹弹舱", category: "输出", color: "#ef476f", shape: "triangle", cooldown: activeCooldownLabel("missile"), activeCooldown: true, desc: "发射自动修正航向的追迹弹，擅长攻击正在绕行的敌蛇。" },
    { id: "mine", name: "磁暴雷节", category: "输出", color: "#9a7cff", shape: "square", cooldown: activeCooldownLabel("mine"), activeCooldown: true, desc: "留下永久磁雷。敌我蛇头都可触发；玩家触发时只会被击退。" },
    { id: "blade", name: "旋刃节", category: "输出", color: "#e8eef7", shape: "diamond", cooldown: activeCooldownLabel("blade", true), activeCooldown: true, desc: "彩刃在约五节身体长度外旋转，接触敌蛇时切除一节身体。" },
    { id: "pulse", name: "脉冲核心", category: "输出", color: "#3eb7ff", shape: "ring", cooldown: activeCooldownLabel("pulse"), activeCooldown: true, desc: "周期释放近距离冲击波，同时命中范围内的所有敌蛇。" },
    { id: "venom", name: "腐蚀囊节", category: "输出", color: "#8be04e", shape: "hex", cooldown: activeCooldownLabel("venom"), activeCooldown: true, desc: "发射腐蚀弹，命中后继续造成两次缓慢侵蚀伤害。" },
    { id: "echo", name: "回声弹匣", category: "输出", color: "#ff8bd7", shape: "capsule", cooldown: `随头部·${formatCooldownSeconds(HEAD_ATTACK_INTERVAL * ATTACK_INTERVAL_SCALE)}`, desc: "每次头部发射时追加一枚偏转弹，多个回声弹匣可继续叠加。" },
    { id: "rail", name: "贯穿轨炮节", category: "输出", color: "#7ef9ff", shape: "capsule", cooldown: activeCooldownLabel("rail"), activeCooldown: true, desc: "发射高速贯穿弹，最多连续穿透四个敌人。" },
    { id: "ricochet", name: "弹射晶节", category: "输出", color: "#ffcf5a", shape: "diamond", cooldown: activeCooldownLabel("ricochet"), activeCooldown: true, desc: "发射可反弹两次、最多命中三个敌人的晶体弹。" },
    { id: "cluster", name: "裂变弹舱", category: "输出", color: "#ff6b4a", shape: "hex", cooldown: activeCooldownLabel("cluster"), activeCooldown: true, desc: "发射追踪爆弹，命中时对周围所有敌人造成伤害。" },
    { id: "fan", name: "烈焰扇节", category: "输出", color: "#ff3f68", shape: "triangle", cooldown: activeCooldownLabel("fan"), activeCooldown: true, desc: "扇形喷射五枚焰弹，多枚可以命中同一条长蛇。" },
    { id: "gravity", name: "引力井节", category: "输出", color: "#a56cff", shape: "ring", cooldown: activeCooldownLabel("gravity"), activeCooldown: true, desc: "在目标位置生成引力井，初次伤害并持续拉扯、减速敌人。" },
    { id: "shield", name: "碧玉护盾", category: "防御", color: "#48e0bf", shape: "hex", cooldown: activeCooldownLabel("shield"), activeCooldown: true, desc: "储存一次碰撞防护。触发后短暂无敌并进入冷却。" },
    { id: "phase", name: "幻相节", category: "防御", color: "#bb8cff", shape: "diamond", cooldown: activeCooldownLabel("phase"), activeCooldown: true, desc: "周期获得一次相位充能，可穿过致命碰撞并保持当前航向。" },
    { id: "repulse", name: "斥力环节", category: "防御", color: "#75dfff", shape: "ring", cooldown: "常驻", desc: "持续扰动附近敌蛇的转向，让它们更难贴近你的身体。" },
    { id: "armor", name: "黑曜装甲", category: "防御", color: "#b7c0ce", shape: "square", cooldown: "常驻", desc: "压缩护盾与相位模块的冷却时间，多个装甲可叠加。" },
    { id: "thorns", name: "截击反应节", category: "防御", color: "#9ee55f", shape: "star", cooldown: activeCooldownLabel("thorns"), activeCooldown: true, desc: "敌蛇撞上身体并被摧毁时，向四周发射反击弹幕，并在撞击处生成一枚球。" },
    { id: "stabilizer", name: "平衡陀螺", category: "防御", color: "#67d5c8", shape: "ring", cooldown: "常驻", desc: "缩短玩家反弹后的减速与失控时间，多个模块可叠加。" },
    { id: "magnet", name: "磁吸环节", category: "辅助", color: "#f5cb4c", shape: "ring", cooldown: "常驻", desc: "扩大头部的球球吸收范围，多个模块可以继续叠加。" },
    { id: "haste", name: "涡轮节", category: "辅助", color: "#ff8457", shape: "triangle", cooldown: "常驻", desc: "永久提高移动速度，同时略微提升转向响应。" },
    { id: "chronos", name: "时缓晶节", category: "辅助", color: "#91a7ff", shape: "diamond", cooldown: "常驻", desc: "降低所有敌蛇的移动速度，为抢球和包抄争取空间。" },
    { id: "tractor", name: "引力环节", category: "辅助", color: "#3ed8b5", shape: "ring", cooldown: "常驻", desc: "球进入引力范围后会连续飞向蛇头，直到被真正吞下。" },
    { id: "fortune", name: "幸运星节", category: "辅助", color: "#ffd166", shape: "star", cooldown: "击破触发", desc: "敌蛇死亡时有机会额外吐出球球，模块越多，概率越高。" },
    { id: "guidance", name: "弹道校准节", category: "辅助", color: "#78a9ff", shape: "capsule", cooldown: "常驻", desc: "提高子弹速度和轻度追踪能力。" },
    { id: "feast", name: "吞噬涡轮", category: "辅助", color: "#ffb23f", shape: "triangle", cooldown: "吃球触发·2.5秒", desc: "吃球后短时间提高移动速度，多个模块增强加速幅度。" },
    { id: "salvage", name: "回收炉节", category: "恢复", color: "#c7f464", shape: "hex", cooldown: "伤害触发", desc: "技能削去敌蛇身体时，有概率将碎片回收成可吃的球球。" },
    { id: "regen", name: "再生芽节", category: "恢复", color: "#ff6f91", shape: "circle", cooldown: activeCooldownLabel("regen"), activeCooldown: true, desc: "每隔一段时间在前方培育一枚球球，仍需亲自追上并吞噬。" },
    { id: "bloom", name: "战利花房", category: "恢复", color: "#ff88c7", shape: "circle", cooldown: activeCooldownLabel("bloom"), activeCooldown: true, desc: "冷却就绪时，下一次击破敌人会额外培育一枚球。" },
    { id: "amplifier", name: "超频增幅节", category: "辅助", color: "#f2f5fa", shape: "capsule", cooldown: "常驻", desc: "加快头部和所有定时输出身体的攻击节奏。" },
    { id: "needle", name: "钨针贯节", category: "输出", color: "#d8f3ff", shape: "capsule", cooldown: activeCooldownLabel("needle"), activeCooldown: true, desc: "发射高速钨针，贯穿第一个目标后仍可继续命中下一个敌人。" },
    { id: "mortar", name: "震荡榴巢", category: "输出", color: "#ff8a5b", shape: "hex", cooldown: activeCooldownLabel("mortar"), activeCooldown: true, desc: "发射重型追踪榴弹，命中时对较大范围内的所有敌人造成伤害。" },
    { id: "sweep", name: "清扫光栅", category: "输出", color: "#65e7ff", shape: "capsule", cooldown: activeCooldownLabel("sweep"), activeCooldown: true, desc: "沿目标方向释放贯穿全场的宽幅光栅，伤害路径上的所有敌人。" },
    { id: "sniper", name: "裁决镜节", category: "输出", color: "#f2f2f2", shape: "diamond", cooldown: activeCooldownLabel("sniper"), activeCooldown: true, desc: "标定最近目标，随后瞬间削去两点长度。" },
    { id: "flak", name: "近炸蜂巢", category: "输出", color: "#ffcf4d", shape: "hex", cooldown: activeCooldownLabel("flak"), activeCooldown: true, desc: "在目标位置引爆近炸弹幕，同时命中爆区内的全部敌人。" },
    { id: "fork", name: "双生电极", category: "输出", color: "#d58cff", shape: "ring", cooldown: activeCooldownLabel("fork"), activeCooldown: true, desc: "同时发射两枚向左右偏转的追迹电弹，从两侧夹击同一目标。" },
    { id: "anchor", name: "迟滞锚弹", category: "输出", color: "#6f8cff", shape: "triangle", cooldown: activeCooldownLabel("anchor"), activeCooldown: true, desc: "发射大型低速锚弹，命中后对敌人施加更持久的减速。" },
    { id: "saw", name: "切割链环", category: "输出", color: "#f06a7b", shape: "ring", cooldown: activeCooldownLabel("saw", true), activeCooldown: true, desc: "持续切割靠近该身体节的敌人，每个目标独立计算接触冷却。" },
    { id: "flare", name: "灼蚀信标", category: "输出", color: "#ff6b35", shape: "star", cooldown: activeCooldownLabel("flare"), activeCooldown: true, desc: "发射灼蚀弹，命中后连续造成四次延迟伤害。" },
    { id: "scatter", name: "碎晶霰舱", category: "输出", color: "#70d6ff", shape: "hex", cooldown: activeCooldownLabel("scatter"), activeCooldown: true, desc: "扇形发射七枚碎晶，适合覆盖敌群或长蛇。" },
    { id: "lance", name: "破阵光矛", category: "输出", color: "#b9fff4", shape: "triangle", cooldown: activeCooldownLabel("lance"), activeCooldown: true, desc: "发射大型高速光矛，最多连续贯穿六个敌人。" },
    { id: "execute", name: "终结协议", category: "输出", color: "#ff3f55", shape: "diamond", cooldown: activeCooldownLabel("execute"), activeCooldown: true, desc: "锁定低长度敌人执行双倍打击，对其他目标造成一次普通伤害。" },
    { id: "crossfire", name: "十字火控", category: "输出", color: "#ffb347", shape: "square", cooldown: activeCooldownLabel("crossfire"), activeCooldown: true, desc: "朝目标方向及其三个垂直方向同时发射重型弹体。" },
    { id: "phasebolt", name: "相位回旋节", category: "输出", color: "#b49cff", shape: "circle", cooldown: activeCooldownLabel("phasebolt"), activeCooldown: true, desc: "发射可多次反弹并轻度追踪目标的相位弹。" },
    { id: "ram", name: "破障冲角", category: "防御", color: "#f3c600", shape: "triangle", cooldown: activeCooldownLabel("ram"), activeCooldown: true, desc: "蛇头互撞时，冷却就绪会额外削去敌人一点长度。" },
    { id: "buffer", name: "动能缓冲节", category: "防御", color: "#8fa6ad", shape: "square", cooldown: "常驻", desc: "降低玩家受到的物理击退初速度，多个模块可继续叠加。" },
    { id: "decoy", name: "诱导涂层", category: "防御", color: "#ff7a90", shape: "diamond", cooldown: "常驻", desc: "干扰敌人的身体避让判断，让精心布置的堵截更容易成功。" },
    { id: "emergency", name: "应急屏障节", category: "防御", color: "#62e6bf", shape: "hex", cooldown: "吃球触发", desc: "任意身体吃球后获得短暂无敌，多个模块会延长持续时间。" },
    { id: "collector", name: "全身采集节", category: "辅助", color: "#d4f05c", shape: "ring", cooldown: "常驻", desc: "扩大所有玩家身体节的接触吃球半径。" },
    { id: "beacon", name: "增压信标", category: "辅助", color: "#ffc857", shape: "star", cooldown: "常驻", desc: "略微加快波次倒计时，让更多敌人与球更快进入场地。" },
    { id: "momentum", name: "冲量增幅器", category: "辅助", color: "#ff965c", shape: "triangle", cooldown: "常驻", desc: "提高敌人受到的物理击退初速度，不增加玩家自身受到的击退。" },
    { id: "progressor", name: "临界推进节", category: "辅助", color: "#38d6c5", shape: "capsule", cooldown: "常驻", desc: "当前等级的升级进度越高，玩家获得的移动速度加成越多。" },
    { id: "nursery", name: "尾部育成舱", category: "恢复", color: "#ff8ec7", shape: "circle", cooldown: activeCooldownLabel("nursery"), activeCooldown: true, desc: "定期在蛇尾附近培育一枚球，仍需由敌我头部或身体实际吃取。" },
    { id: "cache", name: "战果缓存节", category: "恢复", color: "#b7e36b", shape: "hex", cooldown: "每5次击破", desc: "累计击破敌人后生成一枚球，多个模块会减少所需击破次数。" }
  ];

  const SHORT_MODULE_DESCRIPTIONS = Object.freeze({
    spark: "自动锁定并发射高速焰弹。",
    frost: "发射冰晶弹，削减并减速敌蛇。",
    prism: "朝目标扇形发射折射弹。",
    nova: "向四周释放星屑弹幕。",
    tesla: "在邻近敌蛇间释放连锁电弧。",
    laser: "瞬间照射最近的敌蛇。",
    missile: "发射自动追踪敌蛇的导弹。",
    mine: "留下磁雷，炸伤敌蛇并击退玩家。",
    blade: "让彩刃环绕机体并切割敌蛇。",
    pulse: "释放命中周围敌蛇的冲击波。",
    venom: "发射会持续腐蚀敌蛇的毒弹。",
    echo: "头部开火时追加偏转弹。",
    rail: "发射可贯穿多条敌蛇的高速弹。",
    ricochet: "发射会反弹并连续命中敌蛇的晶体弹。",
    cluster: "发射追踪爆弹，伤害落点附近敌蛇。",
    fan: "扇形喷射五枚焰弹。",
    gravity: "生成拉扯并减速敌蛇的引力井。",
    shield: "抵消致命碰撞并短暂无敌。",
    phase: "抵消致命碰撞并保持航向穿过。",
    repulse: "持续干扰附近敌蛇的转向。",
    armor: "加快护盾与相位的恢复。",
    thorns: "敌蛇撞毁在身体上时触发反击弹幕和球。",
    stabilizer: "缩短反弹后的减速与失控。",
    magnet: "扩大蛇头吃球范围。",
    haste: "提高移动速度和转向响应。",
    chronos: "降低所有敌蛇的移动速度。",
    tractor: "持续把附近的球拉向蛇头。",
    fortune: "击破敌蛇时可能额外掉球。",
    guidance: "强化子弹速度和追踪能力。",
    feast: "吃球后短暂加速。",
    salvage: "技能削减敌蛇身体时可能回收成球。",
    regen: "定期在前方培育球。",
    bloom: "蓄能完成后，击破敌蛇会额外培育球。",
    amplifier: "加快头部和定时输出模块的攻击节奏。",
    needle: "发射可继续穿透下一目标的高速钨针。",
    mortar: "发射追踪榴弹，爆炸伤害附近敌蛇。",
    sweep: "释放贯穿全场的宽幅光栅。",
    sniper: "锁定最近敌蛇并造成强力打击。",
    flak: "在目标位置引爆范围弹幕。",
    fork: "从两侧发射追踪电弹夹击目标。",
    anchor: "发射会长时间减速敌蛇的锚弹。",
    saw: "持续切割靠近身体节的敌蛇。",
    flare: "发射会持续灼蚀敌蛇的信标。",
    scatter: "扇形发射七枚碎晶弹幕。",
    lance: "发射可贯穿多条敌蛇的大型光矛。",
    execute: "对较短的敌蛇造成更强打击。",
    crossfire: "朝多个方向同时发射重型弹体。",
    phasebolt: "发射会反弹并追踪敌蛇的相位弹。",
    ram: "蛇头互撞时额外削减敌蛇身体。",
    buffer: "降低玩家受到的击退力度。",
    decoy: "削弱敌蛇对玩家身体的避让。",
    emergency: "身体吃球后获得短暂无敌。",
    collector: "扩大所有身体节的吃球范围。",
    beacon: "加快波次刷新速度。",
    momentum: "提高敌蛇受到的击退力度。",
    progressor: "升级进度越高，移动越快。",
    nursery: "定期在蛇尾附近培育球。",
    cache: "累计击破敌蛇后生成额外球。"
  });

  const MODULE_BY_ID = Object.fromEntries(MODULES.map((module) => [module.id, module]));
  const configuredUpgradeModules = MODULES.filter((module) => MODULE_DESIGN_STATES[module.id] !== "disabled");
  const UPGRADE_MODULES = configuredUpgradeModules.length ? configuredUpgradeModules : MODULES;
  const TARGET_REQUIRED_MODULES = new Set([
    "spark", "frost", "prism", "tesla", "laser", "missile", "venom",
    "rail", "ricochet", "cluster", "fan", "gravity", "needle", "mortar", "sweep",
    "sniper", "flak", "fork", "anchor", "flare", "scatter", "lance", "execute",
    "crossfire", "phasebolt"
  ]);
  const UNLIMITED_PROJECTILE_MODULES = new Set([
    "spark", "frost", "prism", "nova", "missile", "venom", "echo", "rail",
    "ricochet", "cluster", "fan", "needle", "mortar", "fork", "anchor", "flare",
    "scatter", "lance", "crossfire", "phasebolt", "thorns"
  ]);
  const FOOD_COLORS = ["#b8f53f", "#36dcff", "#ff4d96", "#ffd166", "#a98cff", "#54e1a6"];
  const ENEMY_COLORS = ["#ff5c62", "#ff8a4c", "#d95cff", "#ff477e", "#f4c542"];
  const GRID_SIZE = 24;
  const ARENA_AREA_PER_LEVEL = designerNumber("arenaAreaPerLevel", 0.05, 0, 0.5);
  const ARENA_RESIZE_RATE = designerNumber("arenaResizeRate", 2.4, 0.1, 10);
  const FOOD_WALL_MARGIN = 2;
  const ENEMY_SPAWN_WARNING_TIME = designerNumber("enemySpawnWarning", 1.5, 0, 10);
  const KNOCKBACK_INITIAL_SPEED = 10;
  const KNOCKBACK_DECAY = 8;
  const BOUNCE_SLOW_TIME = 0.78;
  const BOUNCE_LOCK_TIME = 0.34;
  const CAMERA_ZOOM = 1;
  const WAVE_BASE_INTERVAL = designerNumber("waveInterval", 6, 0.5, 120);
  const FOODS_PER_PLAYER_PER_WAVE = designerNumber("foodsPerPlayerPerWave", 2, 0, 20, true);
  const ENEMY_THREAT_BUDGET_BASE = designerNumber("enemyThreatBudgetBase", 1.5, 0.1, 50);
  const ENEMY_THREAT_BUDGET_PER_MINUTE = designerNumber("enemyThreatBudgetPerMinute", 0.36, 0, 10);
  const ENEMY_THREAT_BUDGET_LATE_START_MINUTE = designerNumber("enemyThreatBudgetLateStartMinute", 5, 0, 60);
  const ENEMY_THREAT_BUDGET_LATE_PER_MINUTE = designerNumber("enemyThreatBudgetLatePerMinute", 0.14, 0, 10);
  const ENEMY_MAX_SPAWNS_PER_PLAYER_PER_WAVE = designerNumber("enemyMaxSpawnsPerPlayerPerWave", 6, 1, 30, true);
  const ENEMY_CONCURRENT_CAP_PER_PLAYER = designerNumber("enemyConcurrentCapPerPlayer", 18, 1, 100, true);
  const ENEMY_SURGE_EVERY_WAVES = designerNumber("enemySurgeEveryWaves", 5, 0, 50, true);
  const ENEMY_SURGE_BUDGET_MULTIPLIER = designerNumber("enemySurgeBudgetMultiplier", 1.55, 1, 5);
  const ENEMY_SURGE_RECOVERY_INTERVAL_MULTIPLIER = designerNumber("enemySurgeRecoveryIntervalMultiplier", 1.4, 1, 5);
  const PROJECTILE_SPEED_SCALE = designerNumber("projectileSpeedScale", 3, 0.1, 10);
  const PROJECTILE_SIZE_SCALE = designerNumber("projectileSizeScale", 2, 0.1, 10);
  const PLAYER_BASE_SPEED = designerNumber("playerBaseSpeed", 5, 1, 12);
  const PLAYER_SPEED_PER_LEVEL = designerNumber("playerSpeedPerLevel", 0, 0, 0.5);
  const PLAYER_TURN_RATE = designerNumber("playerTurnRate", 4.2, 0.5, 12);
  const ENEMY_BASE_SPEED = designerNumber("enemyBaseSpeed", 4, 0.5, 12);
  const ENEMY_SPEED_PER_MINUTE = designerNumber("enemySpeedPerMinute", 0.01, 0, 0.2);
  const ENEMY_SPEED_MAX_MULTIPLIER = designerNumber("enemySpeedMaxMultiplier", 1.12, 1, 3);
  const ENEMY_TURN_RATE_MIN = designerNumber("enemyTurnRateMin", 2.05, 0.1, 10);
  const ENEMY_TURN_RATE_MAX = designerNumber("enemyTurnRateMax", 2.75, 0.1, 12);
  const ENEMY_HEALTH_GROWTH_INTERVAL_SECONDS = designerNumber("enemyHealthGrowthIntervalSeconds", 180, 15, 1800);
  const ENEMY_THINK_INTERVAL_MIN = designerNumber("enemyThinkIntervalMin", 0.22, 0.05, 5);
  const ENEMY_THINK_INTERVAL_MAX = designerNumber("enemyThinkIntervalMax", 0.55, 0.05, 5);
  const ENEMY_FOOD_SEARCH_LIMIT = designerNumber("enemyFoodSearchLimit", 8, 1, 32, true);
  function enemyArchetype(id, prefix, defaults) {
    const healthMin = designerNumber(`enemy${prefix}HealthMin`, defaults.healthMin, 1, 30, true);
    const healthMax = designerNumber(`enemy${prefix}HealthMax`, defaults.healthMax, 1, 30, true);
    return Object.freeze({
      id,
      unlockSeconds: designerNumber(`enemy${prefix}UnlockSeconds`, defaults.unlockSeconds, 0, 3600),
      spawnWeight: designerNumber(`enemy${prefix}SpawnWeight`, defaults.spawnWeight, 0, 20),
      threatCost: designerNumber(`enemy${prefix}ThreatCost`, defaults.threatCost, 0.1, 20),
      healthMin: Math.min(healthMin, healthMax),
      healthMax: Math.max(healthMin, healthMax),
      healthGrowthMax: designerNumber(`enemy${prefix}HealthGrowthMax`, defaults.healthGrowthMax, 0, 20, true),
      speedMultiplier: designerNumber(`enemy${prefix}SpeedMultiplier`, defaults.speedMultiplier, 0.1, 3),
      turnMultiplier: designerNumber(`enemy${prefix}TurnMultiplier`, defaults.turnMultiplier, 0.1, 3)
    });
  }
  const ENEMY_ARCHETYPES = Object.freeze([
    enemyArchetype("scout", "Scout", { unlockSeconds: 0, spawnWeight: 5, threatCost: 1, healthMin: 1, healthMax: 2, healthGrowthMax: 0, speedMultiplier: 1.08, turnMultiplier: 1.15 }),
    enemyArchetype("forager", "Forager", { unlockSeconds: 0, spawnWeight: 4, threatCost: 1.3, healthMin: 2, healthMax: 3, healthGrowthMax: 0, speedMultiplier: 0.92, turnMultiplier: 1 }),
    enemyArchetype("courier", "Courier", { unlockSeconds: 120, spawnWeight: 2, threatCost: 1.7, healthMin: 2, healthMax: 3, healthGrowthMax: 1, speedMultiplier: 1.12, turnMultiplier: 1.08 }),
    enemyArchetype("charger", "Charger", { unlockSeconds: 90, spawnWeight: 1.8, threatCost: 1.6, healthMin: 2, healthMax: 3, healthGrowthMax: 1, speedMultiplier: 0.78, turnMultiplier: 0.72 }),
    enemyArchetype("cutter", "Cutter", { unlockSeconds: 180, spawnWeight: 1.4, threatCost: 2.4, healthMin: 4, healthMax: 5, healthGrowthMax: 1, speedMultiplier: 1, turnMultiplier: 0.72 }),
    enemyArchetype("coiler", "Coiler", { unlockSeconds: 300, spawnWeight: 1.05, threatCost: 2.8, healthMin: 4, healthMax: 6, healthGrowthMax: 1, speedMultiplier: 0.78, turnMultiplier: 1.18 }),
    enemyArchetype("warden", "Warden", { unlockSeconds: 420, spawnWeight: 0.45, threatCost: 4.2, healthMin: 7, healthMax: 8, healthGrowthMax: 2, speedMultiplier: 0.72, turnMultiplier: 0.68 })
  ]);
  const ENEMY_ARCHETYPE_BY_ID = Object.freeze(Object.fromEntries(ENEMY_ARCHETYPES.map((entry) => [entry.id, entry])));
  const ENEMY_ARCHETYPE_GLYPHS = Object.freeze({ scout: "·", forager: "F", courier: "◆", charger: "!", cutter: "×", coiler: "◎", warden: "▣" });
  const ENEMY_BEHAVIOR_TUNING = Object.freeze({
    scoutFoodInterest: designerNumber("enemyScoutFoodInterest", 0.3, 0, 1),
    courierCarryThreshold: designerNumber("enemyCourierCarryThreshold", 3, 1, 100, true),
    courierFleeStrength: designerNumber("enemyCourierFleeStrength", 0.9, 0, 1),
    courierFoodClusterRadius: designerNumber("enemyCourierFoodClusterRadius", 2.5, 0.5, 10),
    chargerCooldown: designerNumber("enemyChargerCooldown", 2.8, 0.1, 20),
    chargerDetectionRange: designerNumber("enemyChargerDetectionRange", 9, 1, 30),
    chargerTelegraphDuration: designerNumber("enemyChargerTelegraphDuration", 0.7, 0.1, 5),
    chargerChargeDuration: designerNumber("enemyChargerChargeDuration", 1.1, 0.1, 5),
    chargerChargeSpeedMultiplier: designerNumber("enemyChargerChargeSpeedMultiplier", 1.85, 1, 5),
    cutterLeadDistance: designerNumber("enemyCutterLeadDistance", 3.2, 0.5, 12),
    cutterLateralDistance: designerNumber("enemyCutterLateralDistance", 2.4, 0.5, 12),
    coilerOrbitRadius: designerNumber("enemyCoilerOrbitRadius", 2.7, 0.5, 10),
    coilerRadialCorrection: designerNumber("enemyCoilerRadialCorrection", 0.9, 0, 2),
    wardenEscortDistance: designerNumber("enemyWardenEscortDistance", 2, 0.5, 10),
    wardenKnockbackMultiplier: designerNumber("enemyWardenKnockbackMultiplier", 1.5, 1, 4)
  });
  const UPGRADE_INVULNERABILITY_DURATION = designerNumber("upgradeInvulnerabilityDuration", 0.5, 0, 10);
  const RESPAWN_LOCATOR_CONVERGE_DURATION = designerNumber("respawnLocatorConvergeDuration", 1, 0.1, 10);
  const RESPAWN_LOCATOR_FADE_DURATION = designerNumber("respawnLocatorFadeDuration", 3, 0.1, 20);
  const GROWTH_NODE_DELAY = 0.045;
  const GROWTH_PULSE_DURATION = 0.3;
  const SEGMENT_BIRTH_DURATION = 0.34;
  const LEVEL_UP_TRANSITION_DURATION = 0.9;
  const LEVEL_UP_TIME_SCALE = 0.15;
  const NETWORK_BASE_SNAPSHOT_MS = 1000 / 15;
  const NETWORK_SNAPSHOT_BUFFER_SIZE = 6;
  const NETWORK_MAX_EXTRAPOLATION_MS = 90;
  const NETWORK_INPUT_INTERVAL_MS = 1000 / designerNumber("networkPlayerStateHz", 20, 5, 60, true);
  const NETWORK_COLLISION_CLAIM_COOLDOWN_MS = designerNumber("networkCollisionClaimCooldownMs", 500, 100, 2000, true);
  const NETWORK_INTERPOLATION_MIN_MS = designerNumber("networkInterpolationMinMs", 90, 40, 300, true);
  const NETWORK_INTERPOLATION_MAX_MS = designerNumber("networkInterpolationMaxMs", 120, 40, 400, true);
  const NETWORK_HEAD_COLLISION_CONTACT_ALLOWANCE = designerNumber("networkHeadCollisionContactAllowance", 0.12, 0, 1);
  const NETWORK_HEAD_COLLISION_EVENT_GRACE_MS = designerNumber("networkHeadCollisionEventGraceMs", 120, 0, 500, true);
  const NETWORK_HEAD_COLLISION_SEPARATION_RATE = designerNumber("networkHeadCollisionSeparationRate", 4, 0.1, 20);
  const NETWORK_HEAD_COLLISION_REMOTE_IMPULSE = designerNumber("networkHeadCollisionRemoteImpulse", 0.22, 0, 1);
  const NETWORK_HEAD_COLLISION_REMOTE_IMPULSE_DURATION = designerNumber("networkHeadCollisionRemoteImpulseDuration", 0.24, 0.05, 1);
  const NETWORK_FOOD_CONTACT_INTERVAL_MS = 1000 / 30;
  const NETWORK_SHAKE_BY_FEEDBACK = Object.freeze({
    growth: 1.5,
    "growth-special": 2.5,
    level: 6.5,
    food: 2.8,
    "food-special": 4,
    hit: 2.2,
    kill: 7,
    blast: 5,
    bounce: 4.5
  });
  const ENEMY_DEATH_HEAD_PARTICLES = designerNumber("enemyDeathHeadParticles", 28, 1, 100, true);
  const ENEMY_DEATH_BODY_PARTICLES = designerNumber("enemyDeathBodyParticles", 7, 1, 40, true);
  const ENEMY_DEATH_HEAD_PARTICLE_SPEED = designerNumber("enemyDeathHeadParticleSpeed", 185, 10, 500);
  const ENEMY_DEATH_BODY_PARTICLE_SPEED = designerNumber("enemyDeathBodyParticleSpeed", 105, 10, 400);
  const MAX_RENDER_FPS = designerNumber("maxRenderFps", 60, 30, 240, true);
  const MAX_RENDER_DPR = designerNumber("maxRenderDpr", 1.25, 1, 2);
  const MIN_RENDER_DPR = 1;
  const RENDER_DPR_SESSION_KEY = "gss0-render-dpr-limit";
  const AMBIENT_RENDER_INTERVAL = 1 / 30;
  const AMBIENT_RENDER_SCALE = 0.55;
  const MAX_DECORATIVE_PARTICLES = 720;
  const MAX_DECORATIVE_EFFECTS = 420;
  const ARENA_SHADOW_PADDING = 48;

  let width = 1;
  let height = 1;
  let dpr = 1;
  let arenaWorldSize = GRID_SIZE;
  let arena = { left: 16, top: 80, right: 241, bottom: 305, width: 225, height: 225, centerX: 128.5, centerY: 192.5, baseCellSize: 9.375, cellSize: 9.375, worldMin: 0, worldMax: GRID_SIZE - 1, worldSize: GRID_SIZE };
  let state = "menu";
  let lastFrame = performance.now();
  let lastCanvasRender = 0;
  let nextCanvasRenderAt = lastFrame;
  let pendingUiMotionDt = 0;
  let fpsWindowStartedAt = performance.now();
  let fpsFrameCount = 0;
  let smoothedFps = 0;
  let estimatedRefreshRate = 60;
  let fastestFrameIntervals = [];
  let lastMenuFrameState = null;
  let renderDprLimit = loadRenderDprLimit();
  let lowFpsWindows = 0;
  let gameTime = 0;
  let score = 0;
  let kills = 0;
  let level = 0;
  let xp = 0;
  let xpNeeded = 5;
  let lastNeeded = -1;
  let waveTimer = 0;
  let waveCount = 0;
  let headFireTimer = 0;
  let nextEnemyId = 1;
  let shake = 0;
  let flash = 0;
  let audioContext = null;
  let nextEatToneAt = 0;
  let soundVolume = loadSetting("ultra-snake-volume", 0.5, 0, 1);
  let fontScale = loadSetting("ultra-snake-font-scale", 1.5, 0.5, 2);
  let uiMotionStrength = loadSetting("gss0-ui-motion-strength", 1, 1, 3);
  let backgroundPauseEnabled = loadSetting("gss0-background-pause", 1, 0, 1) >= 0.5;
  let detailedDescriptionsEnabled = loadSetting("gss0-detailed-descriptions", 0, 0, 1) >= 0.5;
  let bestScore = loadBestScore();
  let recentPicks = [];
  const lastSoundAt = Object.create(null);

  let player = null;
  let visiblePlayers = [];
  let foods = [];
  let enemies = [];
  let projectiles = [];
  let hazards = [];
  let particles = [];
  let nextParticleSlot = 0;
  let effects = [];
  let pendingEnemySpawns = [];
  let growthQueue = [];
  let activeGrowth = null;
  let upgradePending = false;
  let upgradeRevealTimer = 0;
  let respawnLocatorStartedAt = -Infinity;
  let lastAmbientRender = -Infinity;

  const network = {
    enabled: false,
    multiplayer: false,
    connecting: false,
    socket: null,
    selfEntityId: null,
    principal: null,
    roster: [],
    rosterByEntity: new Map(),
    rosterStateByEntity: new Map(),
    connectedRoster: [],
    scoreboardRows: new Map(),
    scoreboardOrder: [],
    activeScoreboardIds: new Set(),
    snapshot: null,
    snapshotBuffer: [],
    receivedAt: 0,
    snapshotIntervalMs: NETWORK_BASE_SNAPSHOT_MS,
    snapshotGapMs: NETWORK_BASE_SNAPSHOT_MS,
    snapshotJitterMs: 0,
    renderServerTime: NaN,
    lastPresentationAt: 0,
    presentationSnapshot: null,
    lastHudTick: -1,
    lastSelfAlive: false,
    inputSequence: 0,
    lastInputAt: 0,
    localDesiredAngle: NaN,
    localDeathPending: false,
    collisionClaims: new Map(),
    localEnemyDeaths: new Map(),
    lastFoodContactAt: 0,
    playerViews: new Map(),
    enemyViews: new Map(),
    foodViews: new Map(),
    foodIndexes: new Map(),
    foodMotions: new Map(),
    foodRevision: 0,
    hazardViews: new Map(),
    upgradeOffer: null,
    moduleIds: []
  };
  const networkProjectileRuntime = globalThis.GSS0ProjectileRuntime?.create(GRID_SIZE);
  if (!networkProjectileRuntime) throw new Error("PROJECT GSS0 投射物运行时未加载");
  const networkPlayerPredictionRuntime = globalThis.GSS0PlayerPrediction?.create({
    knockbackDecay: KNOCKBACK_DECAY,
    segmentSpacing: 0.58
  });
  if (!networkPlayerPredictionRuntime) throw new Error("PROJECT GSS0 玩家预测运行时未加载");
  const networkPlayerStateCodec = globalThis.GSS0PlayerStateCodec;
  if (!networkPlayerStateCodec) throw new Error("PROJECT GSS0 玩家状态编码器未加载");
  const networkPlayerCollisions = globalThis.GSS0PlayerCollisions;
  if (!networkPlayerCollisions) throw new Error("PROJECT GSS0 玩家碰撞运行时未加载");
  const networkHeadCollisionRuntime = globalThis.GSS0NetworkHeadCollisions?.create({
    cooldownMs: NETWORK_COLLISION_CLAIM_COOLDOWN_MS,
    eventGraceMs: NETWORK_HEAD_COLLISION_EVENT_GRACE_MS,
    impulseDistance: NETWORK_HEAD_COLLISION_REMOTE_IMPULSE,
    impulseDuration: NETWORK_HEAD_COLLISION_REMOTE_IMPULSE_DURATION
  });
  if (!networkHeadCollisionRuntime) throw new Error("PROJECT GSS0 玩家头撞协调器未加载");
  const networkFoodClaimRuntime = globalThis.GSS0FoodClaimRuntime?.create({ maximumBatchSize: 32, retryAfterMs: 750 });
  if (!networkFoodClaimRuntime) throw new Error("PROJECT GSS0 吃球检测运行时未加载");
  const spawnPlanner = globalThis.GSS0SpawnPlanner;
  if (!spawnPlanner) throw new Error("PROJECT GSS0 出生规划器未加载");

  const keys = new Set();
  const pointer = { active: false, x: 0, y: 0, touchId: null };
  const uiMotionMedia = window.matchMedia("(hover: hover) and (pointer: fine)");
  const uiMotion = { x: 0, y: 0, targetX: 0, targetY: 0, appliedX: NaN, appliedY: NaN, appliedStrength: NaN };
  const ambientNodes = Array.from({ length: 28 }, (_, index) => ({
    x: fract(Math.sin(index * 127.1 + 18.3) * 43758.5453),
    y: fract(Math.sin(index * 311.7 + 91.9) * 24634.6345),
    phase: fract(Math.sin(index * 73.3 + 7.1) * 19541.271) * TAU,
    speed: 0.0025 + fract(Math.sin(index * 41.9) * 9341.17) * 0.0045,
    color: index % 7 === 0 ? "#f3c600" : index % 3 === 0 ? "#e7ebeb" : "#08c7dc"
  }));

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function retainInPlace(items, predicate) {
    let writeIndex = 0;
    for (let readIndex = 0; readIndex < items.length; readIndex += 1) {
      const item = items[readIndex];
      if (!predicate(item)) continue;
      items[writeIndex] = item;
      writeIndex += 1;
    }
    items.length = writeIndex;
    return items;
  }

  function spatialBucketKey(node) {
    return `${Math.floor(node.col)},${Math.floor(node.row)}`;
  }

  function fract(value) {
    return value - Math.floor(value);
  }

  function resetUIMotionTarget() {
    uiMotion.targetX = 0;
    uiMotion.targetY = 0;
  }

  function updateUIMotionTarget(event) {
    if (!uiMotionMedia.matches || event.pointerType !== "mouse") {
      resetUIMotionTarget();
      return;
    }
    let x = clamp(event.clientX / Math.max(1, window.innerWidth) * 2 - 1, -1, 1);
    let y = clamp(event.clientY / Math.max(1, window.innerHeight) * 2 - 1, -1, 1);
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    const magnitude = Math.min(1, length);
    const deadZone = 0.035;
    const normalized = clamp((magnitude - deadZone) / (1 - deadZone), 0, 1);
    const eased = normalized * normalized * (3 - 2 * normalized);
    const scale = magnitude > 0.0001 ? eased / magnitude : 0;
    uiMotion.targetX = x * scale;
    uiMotion.targetY = y * scale;
  }

  function updateUIMotion(dt) {
    if (!uiMotionMedia.matches) resetUIMotionTarget();
    const response = 1 - Math.exp(-Math.min(dt, 0.05) * 8.5);
    uiMotion.x += (uiMotion.targetX - uiMotion.x) * response;
    uiMotion.y += (uiMotion.targetY - uiMotion.y) * response;
    if (Math.abs(uiMotion.targetX - uiMotion.x) < 0.00035) uiMotion.x = uiMotion.targetX;
    if (Math.abs(uiMotion.targetY - uiMotion.y) < 0.00035) uiMotion.y = uiMotion.targetY;

    if (
      Math.abs(uiMotion.x - uiMotion.appliedX) < 0.00035
      && Math.abs(uiMotion.y - uiMotion.appliedY) < 0.00035
      && uiMotion.appliedStrength === uiMotionStrength
    ) return;

    const tiltX = -uiMotion.y * 1.3 * uiMotionStrength;
    const tiltY = uiMotion.x * 1.8 * uiMotionStrength;
    const shiftX = uiMotion.x * 4.5 * uiMotionStrength;
    const shiftY = uiMotion.y * 3 * uiMotionStrength;
    const leftShiftX = Math.max(0, uiMotion.x) * 3.2 * uiMotionStrength;
    const rightShiftX = Math.min(0, uiMotion.x) * 3.2 * uiMotionStrength;
    const topShiftY = Math.max(0, uiMotion.y) * 1.7 * uiMotionStrength;
    const bottomShiftY = Math.min(0, uiMotion.y) * 2.8 * uiMotionStrength;
    const shellStyle = document.documentElement.style;
    shellStyle.setProperty("--ui-tilt-x", `${tiltX.toFixed(3)}deg`);
    shellStyle.setProperty("--ui-tilt-y", `${tiltY.toFixed(3)}deg`);
    shellStyle.setProperty("--ui-tilt-x-soft", `${(tiltX * 0.5).toFixed(3)}deg`);
    shellStyle.setProperty("--ui-tilt-y-soft", `${(tiltY * 0.5).toFixed(3)}deg`);
    shellStyle.setProperty("--ui-shift-x", `${shiftX.toFixed(3)}px`);
    shellStyle.setProperty("--ui-shift-y", `${shiftY.toFixed(3)}px`);
    shellStyle.setProperty("--ui-shift-x-soft", `${(shiftX * 0.5).toFixed(3)}px`);
    shellStyle.setProperty("--ui-shift-y-soft", `${(shiftY * 0.5).toFixed(3)}px`);
    shellStyle.setProperty("--ui-shift-x-reverse", `${(-shiftX * 0.34).toFixed(3)}px`);
    shellStyle.setProperty("--ui-shift-y-reverse", `${(-shiftY * 0.34).toFixed(3)}px`);
    shellStyle.setProperty("--ui-left-shift-x", `${leftShiftX.toFixed(3)}px`);
    shellStyle.setProperty("--ui-right-shift-x", `${rightShiftX.toFixed(3)}px`);
    shellStyle.setProperty("--ui-top-shift-y", `${topShiftY.toFixed(3)}px`);
    shellStyle.setProperty("--ui-bottom-shift-y", `${bottomShiftY.toFixed(3)}px`);
    shellStyle.setProperty("--ui-tilt-y-reverse", `${(tiltY * 0.78).toFixed(3)}deg`);
    uiMotion.appliedX = uiMotion.x;
    uiMotion.appliedY = uiMotion.y;
    uiMotion.appliedStrength = uiMotionStrength;
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function distanceSquared(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  function sweptContactProgress(start, end, point, radius) {
    const pathCol = end.col - start.col;
    const pathRow = end.row - start.row;
    const pathLengthSquared = pathCol * pathCol + pathRow * pathRow;
    const progress = pathLengthSquared > 0.000001
      ? clamp(((point.col - start.col) * pathCol + (point.row - start.row) * pathRow) / pathLengthSquared, 0, 1)
      : 0;
    const closestCol = start.col + pathCol * progress;
    const closestRow = start.row + pathRow * progress;
    return (point.col - closestCol) ** 2 + (point.row - closestRow) ** 2 < radius * radius ? progress : null;
  }

  function angleDelta(from, to) {
    let delta = (to - from + Math.PI) % TAU - Math.PI;
    if (delta < -Math.PI) delta += TAU;
    return delta;
  }

  function rotateToward(current, target, maxStep) {
    return current + clamp(angleDelta(current, target), -maxStep, maxStep);
  }

  function formatTime(seconds) {
    const whole = Math.floor(seconds);
    const minutes = Math.floor(whole / 60).toString().padStart(2, "0");
    const remain = (whole % 60).toString().padStart(2, "0");
    return `${minutes}:${remain}`;
  }

  function loadBestScore() {
    try {
      return Number(localStorage.getItem("ultra-snake-best")) || 0;
    } catch {
      return 0;
    }
  }

  function saveBestScore(value) {
    try {
      localStorage.setItem("ultra-snake-best", String(value));
    } catch {
      // Local storage can be disabled without affecting the game.
    }
  }

  function loadSetting(key, fallback, min, max) {
    try {
      const stored = localStorage.getItem(key);
      if (stored == null) return fallback;
      const value = Number(stored);
      return Number.isFinite(value) ? clamp(value, min, max) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveSetting(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch {
      // Settings remain active for the current session when storage is disabled.
    }
  }

  function updateSettingButtonLabel(button, accessibleLabel, tooltipLabel) {
    button.setAttribute("aria-label", accessibleLabel);
    const control = button.closest(".setting-control");
    if (control) control.dataset.tooltip = tooltipLabel;
  }

  function applyFontScale(value, persist = true) {
    fontScale = clamp(value, 0.5, 2);
    document.documentElement.style.setProperty("--font-scale", fontScale.toFixed(2));
    const percent = Math.round(fontScale * 100);
    ui.fontSlider.value = String(percent);
    ui.fontOutput.textContent = `${percent}%`;
    updateSettingButtonLabel(ui.fontButton, `调节字体大小，当前 ${percent}%`, `字体大小 ${percent}%`);
    if (persist) {
      saveSetting("ultra-snake-font-scale", fontScale);
      requestAnimationFrame(resize);
    }
  }

  function applySoundVolume(value, persist = true) {
    soundVolume = clamp(value, 0, 1);
    const percent = Math.round(soundVolume * 100);
    ui.soundSlider.value = String(percent);
    ui.soundOutput.textContent = `${percent}%`;
    ui.soundButton.classList.toggle("is-muted", percent === 0);
    updateSettingButtonLabel(ui.soundButton, `调节声音大小，当前 ${percent}%`, `声音大小 ${percent}%`);
    if (persist) saveSetting("ultra-snake-volume", soundVolume);
  }

  function applyUIMotionStrength(value, persist = true) {
    uiMotionStrength = clamp(value, 1, 3);
    uiMotion.appliedStrength = NaN;
    const percent = Math.round(uiMotionStrength * 100);
    ui.motionSlider.value = String(percent);
    ui.motionOutput.textContent = `${percent}%`;
    updateSettingButtonLabel(ui.motionButton, `调节动态透视强度，当前 ${percent}%`, `动态透视强度 ${percent}%`);
    if (persist) saveSetting("gss0-ui-motion-strength", uiMotionStrength);
  }

  function applyBackgroundPause(enabled, persist = true) {
    backgroundPauseEnabled = Boolean(enabled);
    ui.backgroundPauseToggle.checked = backgroundPauseEnabled;
    ui.backgroundPauseButton.classList.toggle("is-disabled", !backgroundPauseEnabled);
    const status = backgroundPauseEnabled ? "已开启" : "已关闭";
    updateSettingButtonLabel(ui.backgroundPauseButton, `后台暂停${status}`, `后台暂停${status}`);
    if (persist) saveSetting("gss0-background-pause", backgroundPauseEnabled ? 1 : 0);
  }

  function applyDetailedDescriptions(enabled, persist = true) {
    detailedDescriptionsEnabled = Boolean(enabled);
    ui.descriptionToggle.checked = detailedDescriptionsEnabled;
    ui.descriptionButton.classList.toggle("is-active", detailedDescriptionsEnabled);
    const status = detailedDescriptionsEnabled ? "已开启" : "已关闭";
    updateSettingButtonLabel(ui.descriptionButton, `机体详细描述${status}`, `机体详细描述${status}`);
    for (const card of document.querySelectorAll(".module-card[data-module-id]")) {
      const module = MODULE_BY_ID[card.dataset.moduleId];
      const description = card.querySelector("p");
      if (module && description) description.textContent = displayedModuleDescription(module);
    }
    renderModuleRack();
    if (persist) saveSetting("gss0-detailed-descriptions", detailedDescriptionsEnabled ? 1 : 0);
  }

  function setSettingPopover(button, popover, open) {
    const control = button.closest(".setting-control");
    control.classList.toggle("is-open", open);
    button.setAttribute("aria-expanded", String(open));
    popover.setAttribute("aria-hidden", String(!open));
  }

  function closeSettingPopovers(except = null) {
    let closed = false;
    for (const [button, popover] of [
      [ui.fontButton, ui.fontPopover],
      [ui.soundButton, ui.soundPopover],
      [ui.motionButton, ui.motionPopover],
      [ui.backgroundPauseButton, ui.backgroundPausePopover],
      [ui.descriptionButton, ui.descriptionPopover]
    ]) {
      const control = button.closest(".setting-control");
      if (control === except || !control.classList.contains("is-open")) continue;
      setSettingPopover(button, popover, false);
      closed = true;
    }
    return closed;
  }

  function rebuildArenaTexture() {
    const size = arena.width;
    arenaTextureCanvas.width = Math.max(1, Math.round(size * dpr));
    arenaTextureCanvas.height = Math.max(1, Math.round(size * dpr));
    arenaTextureCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const fieldGradient = arenaTextureCtx.createLinearGradient(0, 0, size, size);
    fieldGradient.addColorStop(0, "#171b1e");
    fieldGradient.addColorStop(0.52, "#0d1113");
    fieldGradient.addColorStop(1, "#14181b");
    arenaTextureCtx.fillStyle = fieldGradient;
    arenaTextureCtx.fillRect(0, 0, size, size);

    const shadowSize = size + ARENA_SHADOW_PADDING * 2;
    arenaShadowCanvas.width = Math.max(1, Math.round(shadowSize * dpr));
    arenaShadowCanvas.height = Math.max(1, Math.round(shadowSize * dpr));
    arenaShadowCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    arenaShadowCtx.clearRect(0, 0, shadowSize, shadowSize);
    arenaShadowCtx.fillStyle = "rgba(6, 8, 9, 0.96)";
    arenaShadowCtx.shadowColor = "rgba(0, 0, 0, 0.72)";
    arenaShadowCtx.shadowBlur = 28;
    arenaShadowCtx.shadowOffsetY = 16;
    arenaShadowCtx.fillRect(ARENA_SHADOW_PADDING, ARENA_SHADOW_PADDING, size, size);
    arenaShadowCtx.shadowColor = "transparent";
    arenaShadowCtx.shadowBlur = 0;
    arenaShadowCtx.shadowOffsetY = 0;
  }

  function resizeRenderCaches() {
    ambientCanvas.width = Math.max(1, Math.round(width * AMBIENT_RENDER_SCALE));
    ambientCanvas.height = Math.max(1, Math.round(height * AMBIENT_RENDER_SCALE));
    lastAmbientRender = -Infinity;
    rebuildArenaTexture();
  }

  function resize() {
    const previousArena = arena;
    const rect = canvas.getBoundingClientRect();
    width = Math.max(320, rect.width);
    height = Math.max(420, rect.height);
    dpr = Math.min(renderDprLimit, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    updateArenaBounds();
    transformArenaVisuals(previousArena);
    resizeRenderCaches();

    if (player) {
      syncNodePosition(player);
      player.radius = playerHeadRadiusPixels();
      for (const segment of player.segments) syncNodePosition(segment);
      for (const enemy of enemies) {
        syncNodePosition(enemy);
        enemy.radius = arena.cellSize * 0.28;
        for (const segment of enemy.segments) syncNodePosition(segment);
      }
      for (const food of foods) {
        syncNodePosition(food);
        food.radius = arena.cellSize * 0.13;
      }
    }
  }

  function updateArenaBounds() {
    const viewportPadding = width <= 720 ? 16 : 14;
    const arenaSize = Math.max(225, Math.min(width - viewportPadding * 2, height - viewportPadding * 2));
    const left = (width - arenaSize) / 2;
    const top = (height - arenaSize) / 2;
    const worldMin = (GRID_SIZE - arenaWorldSize) / 2;
    arena = {
      left,
      top,
      right: left + arenaSize,
      bottom: top + arenaSize,
      width: arenaSize,
      height: arenaSize,
      centerX: left + arenaSize / 2,
      centerY: top + arenaSize / 2,
      baseCellSize: arenaSize / GRID_SIZE,
      cellSize: arenaSize / arenaWorldSize,
      worldMin,
      worldMax: worldMin + arenaWorldSize - 1,
      worldSize: arenaWorldSize
    };
  }

  function transformArenaVisuals(previous) {
    if (!previous?.cellSize || previous === arena) return;
    const ratio = arena.cellSize / previous.cellSize;
    const transformPoint = (node, xKey = "x", yKey = "y") => {
      if (!Number.isFinite(node?.[xKey]) || !Number.isFinite(node?.[yKey])) return;
      const col = previous.worldMin + (node[xKey] - previous.left) / previous.cellSize - 0.5;
      const row = previous.worldMin + (node[yKey] - previous.top) / previous.cellSize - 0.5;
      node[xKey] = arena.left + (col - arena.worldMin + 0.5) * arena.cellSize;
      node[yKey] = arena.top + (row - arena.worldMin + 0.5) * arena.cellSize;
    };
    for (const projectile of projectiles) {
      transformPoint(projectile);
      if (Number.isFinite(projectile.vx)) projectile.vx *= ratio;
      if (Number.isFinite(projectile.vy)) projectile.vy *= ratio;
      if (Number.isFinite(projectile.speed)) projectile.speed *= ratio;
      if (Number.isFinite(projectile.size)) projectile.size *= ratio;
      if (projectile.blastRadius) projectile.blastRadius *= ratio;
    }
    for (const particle of particles) {
      transformPoint(particle);
      particle.vx *= ratio;
      particle.vy *= ratio;
      if (Number.isFinite(particle.size)) particle.size *= ratio;
    }
    for (const hazard of hazards) {
      transformPoint(hazard);
      if (Number.isFinite(hazard.radius)) hazard.radius *= ratio;
    }
    for (const effect of effects) {
      transformPoint(effect);
      transformPoint(effect, "x2", "y2");
      if (Number.isFinite(effect.radius)) effect.radius *= ratio;
      if (Number.isFinite(effect.endRadius)) effect.endRadius *= ratio;
    }
  }

  function setArenaWorldSize(nextSize, constrainContents = false) {
    const safeSize = Math.max(GRID_SIZE, Number(nextSize) || GRID_SIZE);
    if (Math.abs(safeSize - arenaWorldSize) < 0.00001) return;
    const previousArena = arena;
    arenaWorldSize = safeSize;
    updateArenaBounds();
    transformArenaVisuals(previousArena);
    if (constrainContents) {
      for (const food of foods) {
        food.col = clamp(food.col, arena.worldMin, arena.worldMax);
        food.row = clamp(food.row, arena.worldMin, arena.worldMax);
      }
      for (const hazard of hazards) {
        if (!Number.isFinite(hazard.col) || !Number.isFinite(hazard.row)) continue;
        hazard.col = clamp(hazard.col, arena.worldMin, arena.worldMax);
        hazard.row = clamp(hazard.row, arena.worldMin, arena.worldMax);
      }
    }
    const playersToSync = network.enabled ? visiblePlayers : player ? [player] : [];
    for (const arenaPlayer of playersToSync) {
      syncNodePosition(arenaPlayer);
      arenaPlayer.radius = playerHeadRadiusPixels();
      for (const segment of arenaPlayer.segments || []) syncNodePosition(segment);
    }
    for (const enemy of enemies) {
      syncNodePosition(enemy);
      enemy.radius = arena.cellSize * 0.28;
      for (const segment of enemy.segments) syncNodePosition(segment);
    }
    for (const food of foods) {
      syncNodePosition(food);
      food.radius = arena.cellSize * 0.13;
    }
    for (const hazard of hazards) if (Number.isFinite(hazard.col) && Number.isFinite(hazard.row)) syncNodePosition(hazard);
  }

  function updateArenaWorldSize(dt, highestLevel) {
    const target = GRID_SIZE * Math.sqrt(1 + Math.max(0, highestLevel) * ARENA_AREA_PER_LEVEL);
    const amount = 1 - Math.exp(-ARENA_RESIZE_RATE * dt);
    const nextSize = arenaWorldSize + (target - arenaWorldSize) * amount;
    setArenaWorldSize(Math.abs(target - nextSize) < 0.0001 ? target : nextSize, true);
  }

  function cameraPosition() {
    const halfView = arena.width / (2 * CAMERA_ZOOM);
    return {
      x: clamp(player?.x || arena.centerX, arena.left + halfView, arena.right - halfView),
      y: clamp(player?.y || arena.centerY, arena.top + halfView, arena.bottom - halfView)
    };
  }

  function applyCameraTransform() {
    const camera = cameraPosition();
    ctx.translate(arena.centerX, arena.centerY);
    ctx.scale(CAMERA_ZOOM, CAMERA_ZOOM);
    ctx.translate(-camera.x, -camera.y);
  }

  function arenaPerspectiveMatrix() {
    const strength = uiMotionMedia.matches ? uiMotionStrength : 0;
    const motionX = uiMotion.x * strength;
    const motionY = uiMotion.y * strength;
    return {
      a: 1 - Math.abs(motionX) * 0.003,
      b: motionY * 0.0024,
      c: motionX * 0.0042,
      d: 1 - Math.abs(motionY) * 0.003
    };
  }

  function applyArenaPerspectiveTransform() {
    const matrix = arenaPerspectiveMatrix();
    ctx.translate(arena.centerX, arena.centerY);
    ctx.transform(matrix.a, matrix.b, matrix.c, matrix.d, 0, 0);
    ctx.translate(-arena.centerX, -arena.centerY);
  }

  function projectArenaPoint(x, y) {
    const matrix = arenaPerspectiveMatrix();
    const dx = x - arena.centerX;
    const dy = y - arena.centerY;
    return {
      x: arena.centerX + matrix.a * dx + matrix.c * dy,
      y: arena.centerY + matrix.b * dx + matrix.d * dy
    };
  }

  function unprojectArenaPoint(x, y) {
    const matrix = arenaPerspectiveMatrix();
    const determinant = matrix.a * matrix.d - matrix.b * matrix.c || 1;
    const dx = x - arena.centerX;
    const dy = y - arena.centerY;
    return {
      x: arena.centerX + (matrix.d * dx - matrix.c * dy) / determinant,
      y: arena.centerY + (-matrix.b * dx + matrix.a * dy) / determinant
    };
  }

  function screenToWorld(x, y) {
    const camera = cameraPosition();
    const point = unprojectArenaPoint(x, y);
    return {
      x: camera.x + (point.x - arena.centerX) / CAMERA_ZOOM,
      y: camera.y + (point.y - arena.centerY) / CAMERA_ZOOM
    };
  }

  function worldToScreen(x, y) {
    const camera = cameraPosition();
    return projectArenaPoint(
      arena.centerX + (x - camera.x) * CAMERA_ZOOM,
      arena.centerY + (y - camera.y) * CAMERA_ZOOM
    );
  }

  function cellCenter(col, row) {
    return {
      x: arena.left + (col - arena.worldMin + 0.5) * arena.cellSize,
      y: arena.top + (row - arena.worldMin + 0.5) * arena.cellSize
    };
  }

  function pixelToCell(x, y) {
    return {
      col: clamp(Math.floor(arena.worldMin + (x - arena.left) / arena.cellSize), Math.ceil(arena.worldMin), Math.floor(arena.worldMax)),
      row: clamp(Math.floor(arena.worldMin + (y - arena.top) / arena.cellSize), Math.ceil(arena.worldMin), Math.floor(arena.worldMax))
    };
  }

  function syncNodePosition(node) {
    const point = cellCenter(node.col, node.row);
    node.x = point.x;
    node.y = point.y;
  }

  function playerHeadRadiusPixels() {
    return 18 * arenaPieceScale();
  }

  function arenaVisualScale() {
    return arena.cellSize / arena.baseCellSize;
  }

  function arenaPieceScale() {
    return clamp(arena.baseCellSize / 34, 0.55, 1) * arenaVisualScale();
  }

  function playerBaseSpeed() {
    const hasteMultiplier = 1 + moduleCount("haste") * MODULE_TUNING.haste.speedPerStack;
    const progress = xpNeeded > 0 ? clamp(xp / xpNeeded, 0, 1) : 0;
    const progressMultiplier = 1 + moduleCount("progressor") * progress * MODULE_TUNING.progressor.maxSpeedPerStack;
    return PLAYER_BASE_SPEED * (1 + level * PLAYER_SPEED_PER_LEVEL) * hasteMultiplier * progressMultiplier;
  }

  function isInsideGrid(col, row) {
    return col >= arena.worldMin && col <= arena.worldMax && row >= arena.worldMin && row <= arena.worldMax;
  }

  function directionAngle(direction) {
    return Math.atan2(direction.dy, direction.dx);
  }

  function makeSegment(x, y, options = {}) {
    const cell = options.col == null || options.row == null ? pixelToCell(x, y) : { col: options.col, row: options.row };
    return {
      x,
      y,
      col: cell.col,
      row: cell.row,
      angle: 0,
      module: options.module || null,
      neutral: Boolean(options.neutral),
      base: Boolean(options.base),
      timer: options.timer || 0,
      ready: true,
      cooldown: 0,
      orbit: random(0, TAU),
      birthAge: options.birthAge ?? null
    };
  }

  function makeSegmentAtCell(col, row, options = {}) {
    const point = cellCenter(col, row);
    return makeSegment(point.x, point.y, { ...options, col, row });
  }

  function gameEndpoint(relativePath) {
    return new URL(String(relativePath).replace(/^\/+/, ""), new URL(".", window.location.href));
  }

  function resolveLobbyUrl() {
    const current = new URL(window.location.href);
    const configured = current.searchParams.get("lobby_url");
    if (configured) {
      try {
        const candidate = new URL(configured, current);
        if (/^https?:$/.test(candidate.protocol)) return candidate.toString();
      } catch {
        // Continue with the deployment-aware fallbacks below.
      }
    }
    if (current.hostname === "localhost" || current.hostname.startsWith("127.")) {
      return `${current.protocol}//${current.hostname}:3100/`;
    }
    if (current.pathname === "/snake" || current.pathname.startsWith("/snake/")) return new URL("/", current.origin).toString();
    if (document.referrer) {
      try {
        const referrer = new URL(document.referrer);
        if (/^https?:$/.test(referrer.protocol) && referrer.origin !== current.origin) return new URL("/", referrer.origin).toString();
      } catch {
        // A malformed referrer should not prevent returning to the local lobby.
      }
    }
    return new URL("/", current.origin).toString();
  }

  function setNetworkStatus(kind, text) {
    ui.networkStatus.classList.remove("is-online", "is-connecting", "is-error");
    if (kind) ui.networkStatus.classList.add(`is-${kind}`);
    ui.networkStatus.textContent = text;
  }

  function setNetworkButtonsDisabled(disabled) {
    ui.startButton.disabled = disabled;
    ui.autoTestButton.disabled = disabled;
  }

  function loadSocketClient() {
    if (typeof window.io === "function") return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = gameEndpoint("socket.io/socket.io.js").toString();
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("无法加载联机客户端"));
      document.head.append(script);
    });
  }

  async function bootstrapNetwork() {
    if (localModeForced || !/^https?:$/.test(window.location.protocol)) return;
    const url = new URL(window.location.href);
    const launchCode = url.searchParams.get("launch_code");
    if (launchCode) {
      network.connecting = true;
      setNetworkButtonsDisabled(true);
      setNetworkStatus("connecting", "TACTICAL SURVIVAL / 正在接入");
    }
    try {
      const response = await fetch(gameEndpoint("api/platform/session"), {
        method: launchCode ? "POST" : "GET",
        credentials: "include",
        headers: launchCode ? { "content-type": "application/json" } : undefined,
        body: launchCode ? JSON.stringify({ code: launchCode }) : undefined
      });
      if (localModeForced) return;
      if (!response.ok) {
        if (!launchCode && response.status === 401) return;
        const result = await response.json().catch(() => null);
        throw new Error(result?.error?.message || "无法建立游戏会话");
      }
      const result = await response.json();
      if (localModeForced) return;
      if (!result?.ok || !result.data) throw new Error(result?.error?.message || "游戏会话无效");
      network.principal = result.data;
      if (launchCode) {
        url.searchParams.delete("launch_code");
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      }
      await loadSocketClient();
      if (localModeForced) return;
      connectNetworkSocket();
    } catch (error) {
      if (localModeForced) return;
      network.connecting = false;
      setNetworkButtonsDisabled(false);
      setNetworkStatus("error", `联机接入失败 / ${error instanceof Error ? error.message : "请刷新重试"}`);
    }
  }

  function connectNetworkSocket() {
    if (localModeForced) return;
    const socket = window.io({
      path: gameEndpoint("socket.io").pathname,
      transports: ["websocket", "polling"],
      timeout: 8000
    });
    network.socket = socket;
    socket.on("connect", () => {
      if (localModeForced) {
        socket.disconnect();
        return;
      }
      resetNetworkPredictionInput(true);
      setNetworkStatus("connecting", "TACTICAL SURVIVAL / 正在同步");
      socket.emit("ultra:join", (result) => {
        if (localModeForced) {
          socket.disconnect();
          return;
        }
        if (!result?.ok || !result.data) {
          setNetworkStatus("error", `联机接入失败 / ${result?.error || "会话无效"}`);
          setNetworkButtonsDisabled(false);
          return;
        }
        network.enabled = true;
        network.connecting = false;
        network.selfEntityId = result.data.selfEntityId;
        network.roster = result.data.roster || [];
        clearNetworkViews();
        resetNetworkFoodViews(result.data.snapshot.foods, result.data.foodRevision);
        result.data.snapshot.foods.length = 0;
        network.snapshot = result.data.snapshot;
        network.snapshotBuffer = [networkSnapshotEntry(result.data.snapshot)];
        network.receivedAt = performance.now();
        network.snapshotIntervalMs = NETWORK_BASE_SNAPSHOT_MS;
        network.snapshotGapMs = NETWORK_BASE_SNAPSHOT_MS;
        network.snapshotJitterMs = 0;
        network.renderServerTime = NaN;
        network.lastPresentationAt = 0;
        const joinedSelf = result.data.snapshot.players.find((item) => item.entityId === network.selfEntityId);
        network.localDesiredAngle = joinedSelf?.desiredAngle ?? NaN;
        if (joinedSelf?.alive) {
          networkPlayerPredictionRuntime.reconcile(joinedSelf);
          startRespawnLocator();
        }
        networkProjectileRuntime.reset(result.data.projectiles || result.data.snapshot.projectiles || []);
        projectiles = networkProjectileRuntime.items;
        network.lastSelfAlive = Boolean(joinedSelf?.alive);
        bestScore = Math.max(bestScore, Number(result.data.profile?.bestScore) || 0);
        ui.best.textContent = Math.floor(bestScore).toLocaleString("zh-CN");
        setNetworkButtonsDisabled(false);
        setNetworkStatus("online", `ULTRA LINK / @${network.principal.username}`);
        renderNetworkRoster(result.data.snapshot.players);
        applyNetworkPresentation(result.data.snapshot, result.data.snapshot, network.snapshotBuffer[0].indexes, 1);
      });
    });
    socket.on("ultra:snapshot", (payload) => {
      if (localModeForced) return;
      const reusableEntry = network.snapshotBuffer.length >= NETWORK_SNAPSHOT_BUFFER_SIZE
        && network.snapshotBuffer[0]?.snapshot !== network.presentationSnapshot
        ? network.snapshotBuffer.shift()
        : null;
      try {
        const snapshot = globalThis.GSS0NetworkCodec.decode(payload, MODULES, reusableEntry?.snapshot);
        receiveNetworkFoodMotions(snapshot.foods);
        snapshot.foods.length = 0;
        receiveNetworkSnapshot(snapshot, reusableEntry);
      } catch (error) {
        console.error("PROJECT GSS0 快照无效", error);
      }
    });
    socket.on("ultra:foods", receiveNetworkFoodDelta);
    socket.on("ultra:projectiles", (events) => {
      if (localModeForced) return;
      networkProjectileRuntime.applyEvents(events);
      projectiles = networkProjectileRuntime.items;
    });
    socket.on("ultra:effects", receiveNetworkEffects);
    socket.on("ultra:player-head-collision", (event) => {
      if (localModeForced) return;
      networkHeadCollisionRuntime.receive(event, performance.now());
    });
    socket.on("ultra:roster", (roster) => {
      if (localModeForced) return;
      network.roster = Array.isArray(roster) ? roster : [];
      renderNetworkRoster(network.snapshot?.players);
    });
    socket.on("ultra:upgrade", (offer) => {
      if (localModeForced) return;
      network.upgradeOffer = offer;
      if (offer) showUpgrade(offer.options.map((id) => MODULE_BY_ID[id]).filter(Boolean));
      else if (state === "upgrade") {
        ui.upgrade.classList.remove("is-visible");
        state = "running";
      }
    });
    socket.on("disconnect", () => {
      if (!network.enabled) return;
      setNetworkStatus("connecting", "ULTRA LINK / 正在重连");
    });
    socket.on("connect_error", () => {
      if (localModeForced) return;
      if (network.principal) setNetworkStatus("error", "ULTRA LINK / 连接中断");
    });
  }

  function receiveNetworkSnapshot(snapshot, reusableEntry = null) {
    if (localModeForced) return;
    const receivedAt = performance.now();
    const previousSnapshot = network.snapshot;
    if (previousSnapshot && snapshot.serverTime <= previousSnapshot.serverTime) return;
    if (previousSnapshot && network.receivedAt > 0) {
      const arrivalInterval = receivedAt - network.receivedAt;
      const serverInterval = snapshot.serverTime - previousSnapshot.serverTime;
      if (arrivalInterval > 10 && arrivalInterval < 1000 && serverInterval > 10 && serverInterval < 1000) {
        const cadence = clamp(serverInterval, 50, 180);
        network.snapshotIntervalMs += (cadence - network.snapshotIntervalMs) * 0.18;
        const gapBlend = serverInterval > network.snapshotGapMs ? 0.45 : 0.16;
        network.snapshotGapMs += (serverInterval - network.snapshotGapMs) * gapBlend;
        const jitter = Math.abs(arrivalInterval - serverInterval);
        network.snapshotJitterMs += (jitter - network.snapshotJitterMs) * 0.2;
      }
    }
    network.snapshot = snapshot;
    network.snapshotBuffer.push(networkSnapshotEntry(snapshot, reusableEntry));
    if (network.snapshotBuffer.length > NETWORK_SNAPSHOT_BUFFER_SIZE) network.snapshotBuffer.splice(0, network.snapshotBuffer.length - NETWORK_SNAPSHOT_BUFFER_SIZE);
    network.receivedAt = receivedAt;
    const self = snapshot.players.find((item) => item.entityId === network.selfEntityId);
    if (self) {
      if (!Number.isFinite(network.localDesiredAngle)) network.localDesiredAngle = self.desiredAngle;
      if (self.alive) networkPlayerPredictionRuntime.syncAuthoritative(self);
    }
    const selfAlive = Boolean(self?.alive);
    if (network.lastSelfAlive && self && !self.alive && state !== "menu" && state !== "gameover") {
      if (testMode) {
        state = "running";
        ui.upgrade.classList.remove("is-visible");
        ui.gameOver.classList.remove("is-visible");
      } else {
        showNetworkGameOver(self);
      }
    }
    if (!network.lastSelfAlive && selfAlive && testMode && state !== "menu") {
      state = "running";
      ui.upgrade.classList.remove("is-visible");
      ui.gameOver.classList.remove("is-visible");
    }
    if (!network.lastSelfAlive && selfAlive) startRespawnLocator(receivedAt);
    if (self && !self.alive) networkPlayerPredictionRuntime.clear();
    network.lastSelfAlive = selfAlive;
    renderNetworkRoster(snapshot.players);
  }

  function resetNetworkPredictionInput(resetSequence = false) {
    if (resetSequence) network.inputSequence = 0;
    network.lastInputAt = 0;
    network.localDesiredAngle = NaN;
    network.localDeathPending = false;
    network.collisionClaims.clear();
    network.localEnemyDeaths.clear();
    networkHeadCollisionRuntime.clear();
    networkPlayerPredictionRuntime.clear();
  }

  function renderNetworkRoster(snapshotPlayers = []) {
    const connected = network.connectedRoster;
    const stateByEntity = network.rosterStateByEntity;
    connected.length = 0;
    network.rosterByEntity.clear();
    stateByEntity.clear();
    for (const stateItem of snapshotPlayers || []) stateByEntity.set(stateItem.entityId, stateItem);
    for (const item of network.roster) {
      network.rosterByEntity.set(item.entityId, item);
      const stateItem = stateByEntity.get(item.entityId);
      if (stateItem?.connected ?? item.connected) connected.push(item);
    }
    const multiplayer = connected.length > 1;
    network.multiplayer = multiplayer;
    ui.shell.classList.toggle("is-multiplayer", multiplayer);
    ui.scoreboard.setAttribute("aria-hidden", String(!multiplayer));
    ui.scoreboardCount.textContent = `${connected.length}P`;
    connected.sort((left, right) => {
      const leftState = stateByEntity.get(left.entityId) || left;
      const rightState = stateByEntity.get(right.entityId) || right;
      return rightState.score - leftState.score || rightState.level - leftState.level || left.playerId.localeCompare(right.playerId);
    });
    const activeIds = network.activeScoreboardIds;
    activeIds.clear();
    let orderChanged = network.scoreboardOrder.length !== connected.length;
    for (let index = 0; index < connected.length; index += 1) {
      const item = connected[index];
      const stateItem = stateByEntity.get(item.entityId) || item;
      activeIds.add(item.entityId);
      if (network.scoreboardOrder[index] !== item.entityId) orderChanged = true;
      let cells = network.scoreboardRows.get(item.entityId);
      if (!cells) {
        const row = document.createElement("li");
        const id = document.createElement("strong");
        const levelCell = document.createElement("span");
        const scoreCell = document.createElement("em");
        row.append(id, levelCell, scoreCell);
        cells = { row, id, levelCell, scoreCell, colorIndex: -1, level: NaN, score: NaN, playerId: "", name: "" };
        network.scoreboardRows.set(item.entityId, cells);
        orderChanged = true;
      }
      cells.row.classList.toggle("is-self", item.entityId === network.selfEntityId);
      cells.row.classList.toggle("is-out", !stateItem.alive);
      if (cells.colorIndex !== item.colorIndex) {
        cells.colorIndex = item.colorIndex;
        cells.row.style.setProperty("--player-color", PLAYER_COLORS[item.colorIndex % PLAYER_COLORS.length]);
      }
      if (cells.playerId !== item.playerId) {
        cells.playerId = item.playerId;
        cells.id.textContent = `@${item.playerId}`;
      }
      if (cells.name !== item.name) {
        cells.name = item.name;
        cells.id.title = item.name;
      }
      if (cells.level !== stateItem.level) {
        cells.level = stateItem.level;
        cells.levelCell.textContent = stateItem.level;
      }
      const nextScore = Math.floor(stateItem.score);
      if (cells.score !== nextScore) {
        cells.score = nextScore;
        cells.scoreCell.textContent = nextScore.toLocaleString("zh-CN");
      }
    }
    for (const [entityId, cells] of network.scoreboardRows) {
      if (activeIds.has(entityId)) continue;
      cells.row.remove();
      network.scoreboardRows.delete(entityId);
      orderChanged = true;
    }
    if (orderChanged) {
      network.scoreboardOrder.length = connected.length;
      for (let index = 0; index < connected.length; index += 1) {
        const entityId = connected[index].entityId;
        network.scoreboardOrder[index] = entityId;
        ui.scoreboardPlayers.append(network.scoreboardRows.get(entityId).row);
      }
    }
  }

  function receiveNetworkEffects(items) {
    if (localModeForced) return;
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (item.audienceEntityId != null && item.audienceEntityId !== network.selfEntityId) continue;
      if (item.type === "sound") {
        if (item.kind === "levelCharge") {
          ui.levelUpBanner.classList.remove("is-active");
          ui.shell.classList.remove("is-leveling");
          void ui.levelUpBanner.offsetWidth;
          ui.levelUpBanner.classList.add("is-active");
          ui.shell.classList.add("is-leveling");
          window.setTimeout(() => {
            ui.levelUpBanner.classList.remove("is-active");
            ui.shell.classList.remove("is-leveling");
          }, LEVEL_UP_TRANSITION_DURATION * 1000);
        }
        sound(item.kind, item.detail || 0, item.sourceEntityId);
        continue;
      }
      if (item.type === "feedback") {
        shake = Math.max(shake, NETWORK_SHAKE_BY_FEEDBACK[item.kind] || 0);
        continue;
      }
      if (item.type === "flash") {
        flash = Math.max(flash, item.strength || 0);
        continue;
      }
      if (item.type === "snakeDeath") {
        if (network.localEnemyDeaths.has(item.enemyId)) continue;
        network.localEnemyDeaths.set(item.enemyId, performance.now());
        const renderedEnemy = network.enemyViews.get(item.enemyId);
        const head = renderedEnemy || cellCenter(item.head.col, item.head.row);
        const segments = renderedEnemy?.segments?.length
          ? renderedEnemy.segments
          : item.segments.map((segment) => cellCenter(segment.col, segment.row));
        if (renderedEnemy) renderedEnemy.dead = true;
        playEnemyDeathPresentation(head, segments, item.color, {
          playSound: item.ownerEntityId != null,
          rewardSelf: item.ownerEntityId === network.selfEntityId,
          soundSourceEntityId: item.ownerEntityId
        });
        continue;
      }
      const from = cellCenter(item.col, item.row);
      if (item.type === "burst") {
        burst(from.x, from.y, item.color, item.count, item.speed);
      } else if (item.type === "ring") {
        const scale = arenaVisualScale();
        const endRadius = item.endRadiusUnit === "pixels" ? item.endRadius * scale : item.endRadius * arena.cellSize;
        effects.push({ type: "ring", x: from.x, y: from.y, color: item.color, life: item.life, maxLife: item.life, radius: item.radius * scale, endRadius });
      } else if (item.type === "beam" || item.type === "lightning") {
        const to = cellCenter(item.col2, item.row2);
        effects.push({ type: item.type, x: from.x, y: from.y, x2: to.x, y2: to.y, color: item.color, life: item.life, maxLife: item.life });
      } else if (item.type === "text") {
        effects.push({
          type: "text",
          x: from.x,
          y: from.y,
          text: item.text,
          color: item.color,
          life: item.life,
          maxLife: item.life,
          emphasis: item.text === "击破"
        });
      }
    }
  }

  function interpolateNumber(from, to, amount) {
    return Number.isFinite(from) ? from + (to - from) * amount : to;
  }

  function interpolateAngle(from, to, amount) {
    return from + angleDelta(from, to) * amount;
  }

  function previousById(items, key = "id", index = new Map()) {
    index.clear();
    for (const item of items || []) index.set(item[key], item);
    return index;
  }

  function indexNetworkSnapshot(snapshot, indexes = null) {
    const target = indexes || { players: new Map(), enemies: new Map(), hazards: new Map() };
    previousById(snapshot?.players, "entityId", target.players);
    previousById(snapshot?.enemies, "id", target.enemies);
    previousById(snapshot?.hazards, "id", target.hazards);
    return target;
  }

  function networkSnapshotEntry(snapshot, entry = null) {
    const target = entry || { snapshot: null, indexes: null };
    target.snapshot = snapshot;
    target.indexes = indexNetworkSnapshot(snapshot, target.indexes);
    return target;
  }

  function selectNetworkPresentation() {
    const buffer = network.snapshotBuffer;
    if (buffer.length === 0) return null;
    const now = performance.now();
    const frameElapsed = network.lastPresentationAt > 0 ? clamp(now - network.lastPresentationAt, 0, 250) : 0;
    network.lastPresentationAt = now;
    const latest = buffer[buffer.length - 1];
    const elapsedSinceLatest = Math.max(0, now - network.receivedAt);
    const interpolationDelay = clamp(
      Math.max(network.snapshotIntervalMs * 1.55, network.snapshotGapMs * 0.85) + network.snapshotJitterMs * 1.2,
      Math.min(NETWORK_INTERPOLATION_MIN_MS, NETWORK_INTERPOLATION_MAX_MS),
      Math.max(NETWORK_INTERPOLATION_MIN_MS, NETWORK_INTERPOLATION_MAX_MS)
    );
    const desiredServerTime = latest.snapshot.serverTime + elapsedSinceLatest - interpolationDelay;
    if (!Number.isFinite(network.renderServerTime) || Math.abs(desiredServerTime - network.renderServerTime) > 1000) {
      network.renderServerTime = desiredServerTime;
    } else {
      const timingError = desiredServerTime - network.renderServerTime;
      const playbackRate = clamp(1 + timingError / 350, 0.92, 1.08);
      network.renderServerTime = Math.min(
        latest.snapshot.serverTime + NETWORK_MAX_EXTRAPOLATION_MS,
        network.renderServerTime + frameElapsed * playbackRate
      );
    }

    if (buffer.length === 1 || network.renderServerTime <= buffer[0].snapshot.serverTime) {
      return { previous: buffer[0], current: buffer[0], amount: 1 };
    }
    if (network.renderServerTime >= latest.snapshot.serverTime) {
      const previous = buffer[Math.max(0, buffer.length - 2)];
      const duration = Math.max(1, latest.snapshot.serverTime - previous.snapshot.serverTime);
      const extrapolation = Math.min(NETWORK_MAX_EXTRAPOLATION_MS, network.renderServerTime - latest.snapshot.serverTime);
      return { previous, current: latest, amount: 1 + extrapolation / duration };
    }
    for (let index = 1; index < buffer.length; index += 1) {
      const current = buffer[index];
      if (network.renderServerTime > current.snapshot.serverTime) continue;
      const previous = buffer[index - 1];
      const duration = Math.max(1, current.snapshot.serverTime - previous.snapshot.serverTime);
      const amount = clamp((network.renderServerTime - previous.snapshot.serverTime) / duration, 0, 1);
      return { previous, current, amount };
    }
    return { previous: latest, current: latest, amount: 1 };
  }

  function clearNetworkViews() {
    network.presentationSnapshot = null;
    network.lastHudTick = -1;
    network.playerViews.clear();
    network.enemyViews.clear();
    network.foodViews.clear();
    network.foodIndexes.clear();
    network.foodMotions.clear();
    network.foodRevision = 0;
    network.hazardViews.clear();
    foods.length = 0;
    network.lastFoodContactAt = 0;
    network.moduleIds.length = 0;
    networkPlayerPredictionRuntime.clear();
    networkHeadCollisionRuntime.clear();
    networkProjectileRuntime.clear();
    networkFoodClaimRuntime.clear();
  }

  function syncNetworkFoodView(food) {
    food.x = arena.left + (food.col - arena.worldMin + 0.5) * arena.cellSize;
    food.y = arena.top + (food.row - arena.worldMin + 0.5) * arena.cellSize;
    food.radius = arena.cellSize * 0.13;
  }

  function addNetworkFoodView(food) {
    network.foodIndexes.set(food.id, foods.length);
    food.networkHidden = networkFoodClaimRuntime.shouldHide(food.id);
    foods.push(food);
  }

  function removeNetworkFoodView(id) {
    const index = network.foodIndexes.get(id);
    if (index === undefined) return;
    const last = foods.pop();
    if (index < foods.length) {
      foods[index] = last;
      network.foodIndexes.set(last.id, index);
    }
    network.foodIndexes.delete(id);
  }

  function syncNetworkFoodVisibility(ids) {
    for (const id of ids) {
      const food = network.foodViews.get(id);
      if (food) food.networkHidden = networkFoodClaimRuntime.shouldHide(id);
    }
  }

  function resetNetworkFoodViews(items, revision = 0) {
    network.foodViews.clear();
    network.foodIndexes.clear();
    network.foodMotions.clear();
    foods.length = 0;
    for (const item of items || []) {
      const food = { ...item };
      syncNetworkFoodView(food);
      network.foodViews.set(food.id, food);
      addNetworkFoodView(food);
    }
    network.foodRevision = Number.isSafeInteger(revision) ? revision : 0;
    networkFoodClaimRuntime.reconcile(network.foodViews.values(), performance.now());
    syncNetworkFoodVisibility(network.foodViews.keys());
  }

  function playNetworkFoodSpawn(food) {
    burst(food.x, food.y, food.color, food.special ? 10 : 7, 62);
    effects.push({
      type: "ring",
      x: food.x,
      y: food.y,
      color: food.color,
      life: 0.42,
      maxLife: 0.42,
      radius: 3,
      endRadius: arena.cellSize * 0.42
    });
  }

  function receiveNetworkFoodDelta(delta) {
    if (localModeForced || !delta || typeof delta !== "object") return;
    const revision = Number(delta.revision);
    if (!Number.isSafeInteger(revision) || revision <= network.foodRevision) return;
    const removedIds = Array.isArray(delta.removedIds) ? delta.removedIds : [];
    if (delta.reset) {
      network.foodViews.clear();
      network.foodIndexes.clear();
      network.foodMotions.clear();
      foods.length = 0;
    }
    for (const id of removedIds) {
      network.foodViews.delete(id);
      network.foodMotions.delete(id);
      removeNetworkFoodView(id);
    }
    const spawnedFoods = [];
    const upsertedFoods = [];
    for (const item of Array.isArray(delta.upserts) ? delta.upserts : []) {
      if (!Number.isSafeInteger(item?.id)) continue;
      let food = network.foodViews.get(item.id);
      const isNew = !food;
      if (!food) {
        food = {};
        network.foodViews.set(item.id, food);
      }
      Object.assign(food, item);
      syncNetworkFoodView(food);
      if (isNew) addNetworkFoodView(food);
      if (!food.isPulled) network.foodMotions.delete(food.id);
      upsertedFoods.push(food);
      if (isNew && !delta.reset) {
        spawnedFoods.push(food);
      }
    }
    network.foodRevision = revision;
    networkFoodClaimRuntime.applyDelta(upsertedFoods, removedIds, Boolean(delta.reset), performance.now());
    syncNetworkFoodVisibility(upsertedFoods.map((food) => food.id));
    const firstAnimatedFood = Math.max(0, spawnedFoods.length - MAX_DECORATIVE_EFFECTS);
    for (let index = firstAnimatedFood; index < spawnedFoods.length; index += 1) playNetworkFoodSpawn(spawnedFoods[index]);
    if (spawnedFoods.length > 0) sound("foodSpawn");
  }

  function receiveNetworkFoodMotions(items) {
    if (!Array.isArray(items) || items.length === 0) return;
    const now = performance.now();
    const duration = Math.max(16, network.snapshotIntervalMs);
    let added = false;
    for (const item of items) {
      if (!Number.isSafeInteger(item?.id)) continue;
      let food = network.foodViews.get(item.id);
      if (!food) {
        food = { ...item };
        network.foodViews.set(item.id, food);
        syncNetworkFoodView(food);
        addNetworkFoodView(food);
        networkFoodClaimRuntime.applyDelta([food], [], false, now);
        added = true;
      }
      network.foodMotions.set(item.id, {
        fromCol: Number.isFinite(food.col) ? food.col : item.col,
        fromRow: Number.isFinite(food.row) ? food.row : item.row,
        toCol: item.col,
        toRow: item.row,
        startedAt: now,
        duration,
        continuous: Boolean(item.isPulled)
      });
      food.color = item.color;
      food.phase = item.phase;
      food.special = item.special;
      food.isPulled = item.isPulled;
    }
    if (added) syncNetworkFoodVisibility(network.foodViews.keys());
  }

  function updateNetworkFoodMotions(now) {
    for (const [id, motion] of network.foodMotions) {
      const food = network.foodViews.get(id);
      if (!food) {
        network.foodMotions.delete(id);
        continue;
      }
      const progress = clamp((now - motion.startedAt) / motion.duration, 0, 1);
      food.col = motion.fromCol + (motion.toCol - motion.fromCol) * progress;
      food.row = motion.fromRow + (motion.toRow - motion.fromRow) * progress;
      syncNetworkFoodView(food);
      networkFoodClaimRuntime.trackFood(food);
      if (progress >= 1 && !motion.continuous) network.foodMotions.delete(id);
    }
  }

  function syncNetworkNode(view, current, previous, amount) {
    if (view.source !== current) {
      const segments = view.segments;
      const orbit = view.orbit;
      const phase = view.phase;
      const birthAge = view.birthAge;
      Object.assign(view, current);
      if (segments) view.segments = segments;
      if (Number.isFinite(orbit)) view.orbit = orbit;
      if (Number.isFinite(phase)) view.phase = phase;
      if (birthAge !== undefined) view.birthAge = birthAge;
      view.source = current;
    }
    view.col = interpolateNumber(previous?.col, current.col, amount);
    view.row = interpolateNumber(previous?.row, current.row, amount);
    view.x = arena.left + (view.col - arena.worldMin + 0.5) * arena.cellSize;
    view.y = arena.top + (view.row - arena.worldMin + 0.5) * arena.cellSize;
    return view;
  }

  function syncNetworkSegments(views, items, previousItems, amount) {
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const old = previousItems?.[index];
      const isNew = !views[index];
      const view = views[index] || {};
      syncNetworkNode(view, item, old, amount);
      if (item.module === "blade") view.orbit = interpolateAngle(old?.orbit ?? item.orbit, item.orbit, amount);
      else if (isNew) view.orbit = index * 2.399963229728653 % TAU;
      if (!old && previousItems) view.birthAge = 0;
      views[index] = view;
    }
    views.length = items.length;
  }

  function pruneNetworkViews(views, activeTick) {
    for (const [id, view] of views) if (view.seenAtTick !== activeTick) views.delete(id);
  }

  function updateSelfNetworkModules(view, segments) {
    const moduleIds = network.moduleIds;
    let changed = !view.networkModuleCounts || moduleIds.length !== segments.length;
    for (let index = 0; index < segments.length && !changed; index += 1) {
      if (moduleIds[index] !== segments[index].module) changed = true;
    }
    if (!changed) return false;
    const counts = view.networkModuleCounts || Object.create(null);
    for (const id of Object.keys(counts)) delete counts[id];
    moduleIds.length = segments.length;
    for (let index = 0; index < segments.length; index += 1) {
      const id = segments[index].module;
      moduleIds[index] = id;
      if (id) counts[id] = (counts[id] || 0) + 1;
    }
    view.networkModuleCounts = counts;
    return true;
  }

  function applyNetworkSelfPrediction(view) {
    const prediction = networkPlayerPredictionRuntime.state;
    if (!prediction.initialized) return;
    view.col = prediction.col;
    view.row = prediction.row;
    view.angle = prediction.angle;
    view.desiredAngle = network.localDesiredAngle;
    view.speed = prediction.speed;
    view.slow = prediction.slow;
    view.foodBoost = prediction.foodBoost;
    view.knockbackX = prediction.knockbackX;
    view.knockbackY = prediction.knockbackY;
    view.collisionCooldown = prediction.collisionCooldown;
    view.invulnerable = prediction.invulnerable;
    view.x = arena.left + (view.col - arena.worldMin + 0.5) * arena.cellSize;
    view.y = arena.top + (view.row - arena.worldMin + 0.5) * arena.cellSize;
    const count = Math.min(view.segments.length, prediction.segments.length);
    for (let index = 0; index < count; index += 1) {
      const segment = view.segments[index];
      const predictedSegment = prediction.segments[index];
      segment.col = predictedSegment.col;
      segment.row = predictedSegment.row;
      segment.x = arena.left + (segment.col - arena.worldMin + 0.5) * arena.cellSize;
      segment.y = arena.top + (segment.row - arena.worldMin + 0.5) * arena.cellSize;
    }
    let previousNode = view;
    for (const segment of view.segments) {
      segment.angle = Math.atan2(previousNode.row - segment.row, previousNode.col - segment.col);
      previousNode = segment;
    }
  }

  function applyNetworkPresentation(previous, current, previousIndexes, amount) {
    const snapshotChanged = network.presentationSnapshot !== current;
    const activeTick = current.tick;
    setArenaWorldSize(interpolateNumber(previous?.arenaSize, current.arenaSize, amount));
    updateNetworkFoodMotions(performance.now());
    gameTime = current.gameTime;
    waveCount = current.waveCount;
    waveTimer = current.waveTimer;
    visiblePlayers.length = 0;
    for (const item of current.players) {
      if (!item.alive || (item.entityId === network.selfEntityId && network.localDeathPending)) continue;
      const old = previousIndexes.players.get(item.entityId);
      const rosterPlayer = network.rosterByEntity.get(item.entityId);
      const playerAmount = amount;
      let view = network.playerViews.get(item.entityId);
      if (!view) {
        view = { segments: [] };
        network.playerViews.set(item.entityId, view);
      }
      const sourceChanged = view.source !== item;
      syncNetworkNode(view, item, old, playerAmount);
      const authoritativeAngle = interpolateAngle(old?.angle ?? item.angle, item.angle, playerAmount);
      view.radius = playerHeadRadiusPixels();
      view.playerColor = PLAYER_COLORS[item.colorIndex % PLAYER_COLORS.length];
      view.playerId = rosterPlayer?.playerId || item.name;
      view.isSelf = item.entityId === network.selfEntityId;
      view.angle = authoritativeAngle;
      view.desiredAngle = item.desiredAngle;
      view.protectedState = item.paused || item.choosingUpgrade || item.invulnerable > 0;
      syncNetworkSegments(view.segments, item.segments, old?.segments, playerAmount);
      if (view.isSelf && !testMode && !item.paused && !item.choosingUpgrade) applyNetworkSelfPrediction(view);
      view.protectedState = item.paused || item.choosingUpgrade || view.invulnerable > 0;
      let previousNode = view;
      for (const segment of view.segments) {
        segment.angle = Math.atan2(previousNode.row - segment.row, previousNode.col - segment.col);
        previousNode = segment;
      }
      if (sourceChanged) {
        if (item.growth) {
          const growth = view.growth || {};
          growth.color = item.growth.color;
          growth.special = item.growth.special;
          growth.elapsed = item.growth.elapsed;
          growth.nodeCount = item.growth.nodeCount;
          view.growth = growth;
        } else view.growth = null;
      }
      view.seenAtTick = activeTick;
      visiblePlayers.push(view);
    }
    pruneNetworkViews(network.playerViews, activeTick);
    const selfRaw = current.players.find((item) => item.entityId === network.selfEntityId);
    const self = visiblePlayers.find((item) => item.entityId === network.selfEntityId) || null;
    player = self;
    if (selfRaw) {
      score = selfRaw.score;
      kills = selfRaw.kills;
      level = selfRaw.level;
      xp = selfRaw.xp;
      xpNeeded = selfRaw.xpNeeded;
      gameTime = selfRaw.survivalTime;
      activeGrowth = self?.growth || null;
      if (self && snapshotChanged && updateSelfNetworkModules(self, selfRaw.segments)) renderModuleRack();
    }

    enemies.length = 0;
    for (const enemyId of network.localEnemyDeaths.keys()) {
      if (!current.enemies.some((item) => item.id === enemyId)) network.localEnemyDeaths.delete(enemyId);
    }
    for (const item of current.enemies) {
      if (network.localEnemyDeaths.has(item.id)) continue;
      const old = previousIndexes.enemies.get(item.id);
      let enemy = network.enemyViews.get(item.id);
      if (!enemy) {
        enemy = { segments: [] };
        network.enemyViews.set(item.id, enemy);
      }
      syncNetworkNode(enemy, item, old, amount);
      enemy.angle = interpolateAngle(old?.angle ?? item.angle, item.angle, amount);
      enemy.archetype = item.archetype;
      enemy.behaviorState = item.behaviorState;
      enemy.behaviorPhase = interpolateNumber(old?.behaviorPhase, item.behaviorPhase, amount);
      enemy.radius = arena.cellSize * 0.28;
      enemy.dead = false;
      syncNetworkSegments(enemy.segments, item.segments, old?.segments, amount);
      let previousNode = enemy;
      for (const segment of enemy.segments) {
        segment.angle = Math.atan2(previousNode.row - segment.row, previousNode.col - segment.col);
        previousNode = segment;
      }
      enemy.seenAtTick = activeTick;
      enemies.push(enemy);
    }
    pruneNetworkViews(network.enemyViews, activeTick);

    if (snapshotChanged) {
      hazards.length = 0;
      for (const item of current.hazards) {
        let hazard = network.hazardViews.get(item.id);
        if (!hazard) {
          hazard = {};
          network.hazardViews.set(item.id, hazard);
        }
        syncNetworkNode(hazard, item, previousIndexes.hazards.get(item.id), amount);
        hazard.radius = item.radius * arena.cellSize;
        hazard.seenAtTick = activeTick;
        hazards.push(hazard);
      }
      pruneNetworkViews(network.hazardViews, activeTick);
      pendingEnemySpawns = current.pendingSpawns.map((spawn) => ({
        ...spawn,
        headCell: { ...spawn.headCell },
        bodyCells: spawn.bodyCells.map((cell) => ({ ...cell }))
      }));
    }
    network.presentationSnapshot = current;
  }

  function networkPlayerHeadContactRange() {
    return playerHeadRadiusPixels() * 2 / arena.cellSize;
  }

  function networkPlayerView(entityId) {
    return network.playerViews.get(entityId) || null;
  }

  function processNetworkPlayerHeadCollisionEvents(now) {
    const visualRange = networkPlayerHeadContactRange() + NETWORK_HEAD_COLLISION_CONTACT_ALLOWANCE;
    const ready = networkHeadCollisionRuntime.takeReady(now, (event) => {
      const source = networkPlayerView(event.sourceEntityId);
      const target = networkPlayerView(event.targetEntityId);
      return Boolean(source && target && Math.hypot(source.col - target.col, source.row - target.row) <= visualRange);
    });
    for (const event of ready) {
      if (!networkHeadCollisionRuntime.apply(event, network.selfEntityId, now)) continue;
      if (testMode || (event.sourceEntityId !== network.selfEntityId && event.targetEntityId !== network.selfEntityId)) continue;
      if (!player || state !== "running") continue;
      const sourceIsSelf = event.sourceEntityId === network.selfEntityId;
      const other = networkPlayerView(sourceIsSelf ? event.targetEntityId : event.sourceEntityId);
      bounceNetworkSelf(
        sourceIsSelf ? event.normalCol : -event.normalCol,
        sourceIsSelf ? event.normalRow : -event.normalRow,
        other?.playerColor || "#dffcff"
      );
    }
  }

  function applyNetworkPlayerHeadCollisionOffsets(now) {
    for (const view of visiblePlayers) {
      if (view.isSelf) continue;
      const offset = networkHeadCollisionRuntime.offsetFor(view.entityId, now);
      if (!offset) continue;
      view.col += offset.col;
      view.row += offset.row;
      syncNodePosition(view);
      for (const segment of view.segments) {
        segment.col += offset.col;
        segment.row += offset.row;
        syncNodePosition(segment);
      }
    }
  }

  function stabilizeNetworkPlayerHeadSeparation(dt, now) {
    if (!player) return;
    const contactRange = networkPlayerHeadContactRange();
    let moved = false;
    for (const other of visiblePlayers) {
      if (
        other.isSelf
        || !networkHeadCollisionRuntime.isPairCooling(network.selfEntityId, other.entityId, now)
      ) continue;
      let normalCol = player.col - other.col;
      let normalRow = player.row - other.row;
      let distance = Math.hypot(normalCol, normalRow);
      if (distance >= contactRange) continue;
      const overlap = contactRange - distance;
      if (distance < 0.001) {
        normalCol = -Math.cos(player.angle);
        normalRow = -Math.sin(player.angle);
        distance = 1;
      }
      const separation = Math.min(overlap, NETWORK_HEAD_COLLISION_SEPARATION_RATE * dt);
      player.col += normalCol / distance * separation;
      player.row += normalRow / distance * separation;
      moved = true;
    }
    if (!moved) return;
    networkPlayerPredictionRuntime.adoptLocal(player);
    applyNetworkSelfPrediction(player);
  }

  function updateNetwork(dt) {
    const now = performance.now();
    const presentation = selectNetworkPresentation();
    if (presentation) applyNetworkPresentation(
      presentation.previous.snapshot,
      presentation.current.snapshot,
      presentation.previous.indexes,
      presentation.amount
    );
    processNetworkPlayerHeadCollisionEvents(now);
    networkProjectileRuntime.update(dt, (id) => network.enemyViews.get(id) || null, arena);
    projectiles = networkProjectileRuntime.items;
    for (const visiblePlayer of visiblePlayers) {
      if (visiblePlayer.growth) visiblePlayer.growth.elapsed += dt;
      for (const segment of visiblePlayer.segments) {
        if (segment.module !== "blade") segment.orbit = (segment.orbit || 0) + dt * 3.8;
        if (!segment.ready && (segment.module === "shield" || segment.module === "phase")) {
          segment.cooldown = Math.max(0, segment.cooldown - dt);
        }
        if (segment.birthAge !== null) {
          segment.birthAge += dt;
          if (segment.birthAge >= SEGMENT_BIRTH_DURATION) segment.birthAge = null;
        }
      }
    }
    for (const hazard of hazards) {
      hazard.phase += dt * 4;
      hazard.arm = Math.max(0, (hazard.arm || 0) - dt);
    }
    for (const spawn of pendingEnemySpawns) spawn.timer = Math.max(0, spawn.timer - dt);
    if (state === "running" && player) {
      if (!testMode) {
        updateInput(dt, false);
        network.localDesiredAngle = player.desiredAngle;
        const turnRate = PLAYER_TURN_RATE + moduleCount("haste") * MODULE_TUNING.haste.turnRatePerStack;
        const predictedState = networkPlayerPredictionRuntime.state;
        const slowMultiplier = predictedState.slow > 0 ? 0.48 : 1;
        const feastMultiplier = predictedState.foodBoost > 0 ? 1 + moduleCount("feast") * MODULE_TUNING.feast.speedPerStack : 1;
        networkPlayerPredictionRuntime.update(dt, network.localDesiredAngle, turnRate, playerBaseSpeed() * slowMultiplier * feastMultiplier);
        applyNetworkSelfPrediction(player);
        stabilizeNetworkPlayerHeadSeparation(dt, now);
        checkNetworkPlayerCollisions();
        sendNetworkInput();
      }
      claimNetworkFoodContacts();
    }
    applyNetworkPlayerHeadCollisionOffsets(now);
    updateEffects(dt);
    if (network.lastHudTick !== network.presentationSnapshot?.tick) {
      network.lastHudTick = network.presentationSnapshot?.tick ?? -1;
      updateHud();
    }
  }

  function sendNetworkInput(force = false, reliable = false) {
    const socket = network.socket;
    if (!socket?.connected || !player) return null;
    const now = performance.now();
    const elapsed = now - network.lastInputAt;
    if (!force && elapsed < NETWORK_INPUT_INTERVAL_MS) return null;
    network.lastInputAt = now;
    const sequence = ++network.inputSequence;
    const payload = networkPlayerStateCodec.encode(sequence, player);
    if (reliable) socket.emit("ultra:input", payload);
    else socket.volatile.emit("ultra:input", payload);
    return sequence;
  }

  function reportNetworkCollision(claim, key, onRejected = null, now = performance.now()) {
    const previous = network.collisionClaims.get(key) || 0;
    if (now - previous < NETWORK_COLLISION_CLAIM_COOLDOWN_MS) return false;
    network.collisionClaims.set(key, now);
    for (const [storedKey, claimedAt] of network.collisionClaims) {
      if (now - claimedAt > NETWORK_COLLISION_CLAIM_COOLDOWN_MS * 4) network.collisionClaims.delete(storedKey);
    }
    void emitNetworkAction("ultra:collision", claim).then((result) => {
      if (result?.ok) return;
      network.collisionClaims.delete(key);
      onRejected?.();
    });
    return true;
  }

  function bounceNetworkSelf(normalCol, normalRow, color, impulseMultiplier = 1) {
    bounceEntity(player, normalCol, normalRow, color, 0.58, impulseMultiplier);
    networkPlayerPredictionRuntime.adoptLocal(player);
    applyNetworkSelfPrediction(player);
    sendNetworkInput(true, true);
  }

  function eliminateNetworkSelf(claim, key) {
    if (network.localDeathPending || state !== "running") return;
    sendNetworkInput(true);
    network.localDeathPending = true;
    burst(player.x, player.y, "#b8f53f", 28, 170);
    showNetworkGameOver(player);
    reportNetworkCollision(claim, key);
  }

  function checkNetworkMineCollision() {
    const headRange = playerHeadRadiusPixels() / arena.cellSize + 6 / 34;
    for (const hazard of hazards) {
      if (
        hazard.kind !== "mine"
        || hazard.ownerEntityId !== network.selfEntityId
        || hazard.arm > 0
        || Math.hypot(player.col - hazard.col, player.row - hazard.row) >= headRange
      ) continue;
      const normalCol = player.col - hazard.col;
      const normalRow = player.row - hazard.row;
      const key = `mine:${hazard.id}`;
      if (!reportNetworkCollision({ kind: "mine", targetId: hazard.id, normalCol, normalRow }, key)) return true;
      bounceNetworkSelf(normalCol, normalRow, hazard.color);
      return true;
    }
    return false;
  }

  function checkNetworkPlayerCollisions() {
    if (!player?.alive || !networkPlayerPredictionRuntime.state.initialized || checkNetworkMineCollision()) return;
    const collision = networkPlayerCollisions.detect(player, enemies, visiblePlayers, {
      worldMin: arena.worldMin,
      worldMax: arena.worldMax,
      selfRange: 0.5,
      bodyRange: 0.42,
      playerHeadRange: playerHeadRadiusPixels() * 2 / arena.cellSize,
      enemyHeadRange: playerHeadRadiusPixels() / arena.cellSize + 0.28
    });
    if (!collision) return;
    if (collision.kind === "wall") {
      player.col = clamp(player.col, arena.worldMin, arena.worldMax);
      player.row = clamp(player.row, arena.worldMin, arena.worldMax);
      bounceNetworkSelf(collision.normalCol, collision.normalRow, "#b8f53f");
      return;
    }
    if (collision.kind === "self") {
      bounceNetworkSelf(player.col - collision.point.col, player.row - collision.point.row, "#f4ffdc");
      return;
    }
    if (collision.kind === "protected-player") {
      const other = visiblePlayers.find((item) => item.entityId === collision.targetId);
      bounceNetworkSelf(player.col - collision.point.col, player.row - collision.point.row, other?.playerColor || "#dffcff");
      return;
    }
    if (collision.kind === "enemy-body") {
      if (consumeDefense()) {
        networkPlayerPredictionRuntime.adoptLocal(player);
        applyNetworkSelfPrediction(player);
        sendNetworkInput(true);
        reportNetworkCollision({ kind: "enemy-body", targetId: collision.targetId, segmentIndex: collision.segmentIndex }, `enemy-body:${collision.targetId}`);
      } else {
        eliminateNetworkSelf(
          { kind: "enemy-body", targetId: collision.targetId, segmentIndex: collision.segmentIndex },
          `death:enemy:${collision.targetId}`
        );
      }
      return;
    }
    if (collision.kind === "player-body") {
      eliminateNetworkSelf(
        { kind: "player-body", targetId: collision.targetId, segmentIndex: collision.segmentIndex },
        `death:player:${collision.targetId}`
      );
      return;
    }
    if (collision.kind === "enemy-head") {
      const enemy = enemies.find((item) => item.id === collision.targetId);
      const impulseMultiplier = enemy?.archetype === "warden" ? ENEMY_BEHAVIOR_TUNING.wardenKnockbackMultiplier : 1;
      bounceNetworkSelf(collision.normalCol, collision.normalRow, "#dffcff", impulseMultiplier);
      reportNetworkCollision(
        { kind: "enemy-head", targetId: collision.targetId, normalCol: collision.normalCol, normalRow: collision.normalRow },
        `enemy-head:${collision.targetId}`
      );
      return;
    }
    if (collision.kind === "player-head") {
      const other = visiblePlayers.find((item) => item.entityId === collision.targetId);
      if (!other) return;
      const collisionAt = performance.now();
      if (networkHeadCollisionRuntime.isPairCooling(network.selfEntityId, collision.targetId, collisionAt)) return;
      const sourceCol = player.col;
      const sourceRow = player.row;
      const sequence = sendNetworkInput(true, true);
      if (!Number.isSafeInteger(sequence)) return;
      const observedAt = Number.isFinite(network.renderServerTime)
        ? network.renderServerTime
        : network.snapshot?.serverTime || Date.now();
      const collisionKey = `player-head:${Math.min(network.selfEntityId, collision.targetId)}:${Math.max(network.selfEntityId, collision.targetId)}`;
      const claim = {
        kind: "player-head",
        targetId: collision.targetId,
        sequence,
        observedAt,
        sourceCol,
        sourceRow,
        targetCol: other.col,
        targetRow: other.row,
        normalCol: collision.normalCol,
        normalRow: collision.normalRow
      };
      if (!reportNetworkCollision(claim, collisionKey, null, collisionAt)) return;
      networkHeadCollisionRuntime.markLocal(
        network.selfEntityId,
        collision.targetId,
        sequence,
        collision.normalCol,
        collision.normalRow,
        collisionAt
      );
      bounceNetworkSelf(collision.normalCol, collision.normalRow, other.playerColor || "#dffcff");
      return;
    }
    if (collision.kind === "enemy-protected") {
      reportNetworkCollision(
        { kind: "enemy-protected", targetId: collision.targetId, normalCol: collision.normalCol, normalRow: collision.normalRow },
        `enemy-protected:${collision.targetId}`
      );
      return;
    }
    const enemy = enemies.find((item) => item.id === collision.targetId);
    const key = `enemy-hit-body:${collision.targetId}`;
    if (!enemy || !reportNetworkCollision(
      { kind: "enemy-hit-body", targetId: collision.targetId, segmentIndex: collision.segmentIndex },
      key,
      () => network.localEnemyDeaths.delete(collision.targetId)
    )) return;
    network.localEnemyDeaths.set(collision.targetId, performance.now());
    enemy.dead = true;
    playEnemyDeathPresentation(enemy, enemy.segments, enemy.color, {
      playSound: true,
      rewardSelf: true,
      soundSourceEntityId: network.selfEntityId
    });
  }

  function claimNetworkFoodContacts() {
    const socket = network.socket;
    if (!socket?.connected || !player?.alive || player.paused || player.choosingUpgrade || foods.length === 0) return;
    const now = performance.now();
    if (now - network.lastFoodContactAt < NETWORK_FOOD_CONTACT_INTERVAL_MS) return;
    network.lastFoodContactAt = now;
    const headRange = 18 / 34 + 0.13 + moduleCount("magnet") * 0.55;
    const bodyRange = 0.42 + moduleCount("collector") * 0.09;
    const requestedFoodIds = networkFoodClaimRuntime.detect(player, headRange, bodyRange, now);
    if (requestedFoodIds.length === 0) return;
    syncNetworkFoodVisibility(requestedFoodIds);
    socket.emit("ultra:claim-food", { foodIds: requestedFoodIds }, (result) => {
      const claimedFoodIds = result?.ok && Array.isArray(result.data?.claimedFoodIds)
        ? result.data.claimedFoodIds.filter(Number.isSafeInteger)
        : [];
      networkFoodClaimRuntime.resolve(requestedFoodIds, claimedFoodIds);
      syncNetworkFoodVisibility(requestedFoodIds);
    });
  }

  function emitNetworkAction(event, ...args) {
    return new Promise((resolve) => {
      if (!network.socket?.connected) return resolve({ ok: false, error: "联机连接尚未就绪" });
      network.socket.emit(event, ...args, (result) => resolve(result));
    });
  }

  async function startNetworkGame(autopilot = false, restart = false) {
    ensureAudio();
    closeSettingPopovers();
    setTestMode(autopilot === true);
    const modeResult = await emitNetworkAction("ultra:autopilot", testMode);
    if (!modeResult?.ok) {
      setNetworkStatus("error", `ULTRA LINK / ${modeResult?.error || "无法切换行动模式"}`);
      return;
    }
    const result = await emitNetworkAction(restart && network.lastSelfAlive ? "ultra:restart" : "ultra:spawn");
    if (!result?.ok) {
      setNetworkStatus("error", `ULTRA LINK / ${result?.error || "暂时无法开始"}`);
      return;
    }
    resetNetworkPredictionInput();
    state = "running";
    network.lastSelfAlive = true;
    network.upgradeOffer = null;
    hideAllModals();
    particles = [];
    effects = [];
    startRespawnLocator();
    sound("start");
  }

  function showNetworkGameOver(result) {
    state = "gameover";
    shake = 16;
    flash = 0.5;
    sound("death");
    const isNewBest = result.score > bestScore;
    if (isNewBest) {
      bestScore = Math.floor(result.score);
      saveBestScore(bestScore);
    }
    ui.finalScore.textContent = Math.floor(result.score).toLocaleString("zh-CN");
    ui.finalLevel.textContent = result.level;
    ui.finalKills.textContent = result.kills;
    ui.finalTime.textContent = formatTime(result.survivalTime);
    ui.newBest.classList.toggle("is-visible", isNewBest);
    ui.best.textContent = Math.floor(bestScore).toLocaleString("zh-CN");
    window.setTimeout(() => {
      if (state === "gameover") ui.gameOver.classList.add("is-visible");
    }, 330);
  }

  function resetGame() {
    setArenaWorldSize(GRID_SIZE);
    gameTime = 0;
    score = 0;
    kills = 0;
    level = 0;
    xp = 0;
    xpNeeded = 5;
    waveTimer = 0;
    waveCount = 0;
    headFireTimer = HEAD_ATTACK_INTERVAL * ATTACK_INTERVAL_SCALE;
    nextEnemyId = 1;
    shake = 0;
    flash = 0;
    nextEatToneAt = 0;
    recentPicks = [];
    foods = [];
    enemies = [];
    projectiles = [];
    hazards = [];
    particles = [];
    effects = [];
    pendingEnemySpawns = [];
    growthQueue = [];
    activeGrowth = null;
    upgradePending = false;
    upgradeRevealTimer = 0;
    ui.levelUpBanner.classList.remove("is-active");
    ui.shell.classList.remove("is-leveling");

    const startCol = Math.floor(GRID_SIZE / 2);
    const startRow = Math.floor(GRID_SIZE / 2);
    const startPoint = cellCenter(startCol, startRow);
    player = {
      x: startPoint.x,
      y: startPoint.y,
      col: startCol,
      row: startRow,
      angle: 0,
      desiredAngle: 0,
      speed: 5,
      radius: playerHeadRadiusPixels(),
      invulnerable: 0,
      slow: 0,
      collisionCooldown: 0,
      knockbackX: 0,
      knockbackY: 0,
      foodBoost: 0,
      thornsCooldown: 0,
      ramCooldown: 0,
      bloomCooldown: 0,
      cacheKills: 0,
      segments: []
    };
    visiblePlayers = [];
    startRespawnLocator();

    renderModuleRack();
    updateHud(true);
  }

  function cellKey(col, row) {
    return `${col},${row}`;
  }

  function cellCode(col, row) {
    return (Math.round(row) & 0xffff) << 16 | (Math.round(col) & 0xffff);
  }

  function occupiedCellKeys() {
    const occupied = new Set();
    const occupyNode = (node) => occupied.add(cellKey(Math.round(node.col), Math.round(node.row)));
    if (player) {
      occupyNode(player);
      for (const segment of player.segments) occupyNode(segment);
    }
    for (const food of foods) occupied.add(cellKey(food.col, food.row));
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      occupyNode(enemy);
      for (const segment of enemy.segments) occupyNode(segment);
    }
    for (const spawn of pendingEnemySpawns) {
      for (const cell of [spawn.headCell, ...spawn.bodyCells]) occupied.add(cellKey(cell.col, cell.row));
    }
    return occupied;
  }

  function occupiedCellCodes() {
    const occupied = new Set();
    const occupyNode = (node) => occupied.add(cellCode(node.col, node.row));
    if (player) {
      occupyNode(player);
      for (const segment of player.segments) occupyNode(segment);
    }
    for (const food of foods) occupyNode(food);
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      occupyNode(enemy);
      for (const segment of enemy.segments) occupyNode(segment);
    }
    for (const spawn of pendingEnemySpawns) {
      occupyNode(spawn.headCell);
      for (const cell of spawn.bodyCells) occupyNode(cell);
    }
    return occupied;
  }

  function freeCells(wallMargin = 0, occupied = occupiedCellKeys()) {
    const cells = [];
    const margin = clamp(Math.ceil(wallMargin), 0, Math.floor((arena.worldSize - 1) / 2));
    const minimum = Math.ceil(arena.worldMin + margin);
    const maximum = Math.floor(arena.worldMax - margin);
    for (let row = minimum; row <= maximum; row += 1) {
      for (let col = minimum; col <= maximum; col += 1) {
        if (!occupied.has(cellKey(col, row))) cells.push({ col, row });
      }
    }
    return cells;
  }

  function findFreeCell(preferred = null, wallMargin = 0, occupied = occupiedCellKeys()) {
    const margin = clamp(Math.ceil(wallMargin), 0, Math.floor((arena.worldSize - 1) / 2));
    const minimum = Math.ceil(arena.worldMin + margin);
    const maximum = Math.floor(arena.worldMax - margin);
    let selected = null;
    let bestDistance = Infinity;
    let freeCount = 0;
    for (let row = minimum; row <= maximum; row += 1) {
      for (let col = minimum; col <= maximum; col += 1) {
        if (occupied.has(cellKey(col, row))) continue;
        freeCount += 1;
        if (!preferred) continue;
        const distance = Math.abs(col - preferred.col) + Math.abs(row - preferred.row);
        if (distance < bestDistance) {
          bestDistance = distance;
          selected = { col, row };
        }
      }
    }
    if (!freeCount) return margin > 0 ? null : preferred;
    if (preferred) return selected;
    let targetIndex = Math.floor(Math.random() * freeCount);
    for (let row = minimum; row <= maximum; row += 1) {
      for (let col = minimum; col <= maximum; col += 1) {
        if (occupied.has(cellKey(col, row))) continue;
        if (targetIndex === 0) return { col, row };
        targetIndex -= 1;
      }
    }
    return null;
  }

  function spawnFood(x, y, special = false, occupied = null) {
    const preferred = x == null || y == null ? null : pixelToCell(x, y);
    const cell = findFreeCell(preferred, FOOD_WALL_MARGIN, occupied || undefined);
    if (!cell) return false;
    materializeFood(cell, special);
    occupied?.add(cellKey(cell.col, cell.row));
    return true;
  }

  function spawnWaveFoods(count) {
    const cells = freeCells(FOOD_WALL_MARGIN);
    for (let index = 0; index < count && cells.length > 0; index += 1) {
      const selectedIndex = Math.floor(Math.random() * cells.length);
      const cell = cells.splice(selectedIndex, 1)[0];
      materializeFood(cell, false);
    }
  }

  function materializeFood(cell, special) {
    const point = cellCenter(cell.col, cell.row);
    const color = FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)];
    foods.push({
      x: point.x,
      y: point.y,
      col: cell.col,
      row: cell.row,
      color,
      radius: arena.cellSize * 0.13,
      phase: random(0, TAU),
      pullTimer: random(0.4, 1),
      special
    });
    burst(point.x, point.y, color, special ? 10 : 7, 62);
    effects.push({ type: "ring", x: point.x, y: point.y, color, life: 0.42, maxLife: 0.42, radius: 3, endRadius: arena.cellSize * 0.42 });
    sound("foodSpawn");
  }

  function chooseEnemySpawn(bodySegmentCount, minimumHeadDistance, occupied = occupiedCellCodes()) {
    return spawnPlanner.choose({
      minimum: Math.ceil(arena.worldMin),
      maximum: Math.floor(arena.worldMax),
      bodySegmentCount,
      minimumHeadDistance,
      occupiedCells: occupied,
      players: player ? [player] : [],
      fallbackDistance: arena.worldSize,
      random: Math.random
    });
  }

  function queueEnemySpawn(archetype, occupied = occupiedCellCodes()) {
    if (!player) return;
    const baseHealth = Math.floor(random(archetype.healthMin, archetype.healthMax + 1));
    const growthSteps = Math.floor(gameTime / ENEMY_HEALTH_GROWTH_INTERVAL_SECONDS);
    const totalLength = Math.max(1, baseHealth + Math.min(growthSteps, archetype.healthGrowthMax));
    const bodySegmentCount = totalLength - 1;
    const placement = chooseEnemySpawn(bodySegmentCount, playerBaseSpeed() * 2, occupied);
    if (!placement) return false;
    const headCell = placement.head;
    const nextCell = placement.next;
    const color = ENEMY_COLORS[(nextEnemyId - 1) % ENEMY_COLORS.length];
    const bodyCells = Array.from({ length: bodySegmentCount }, (_, index) => placement.body[Math.min(index, placement.body.length - 1)]);
    pendingEnemySpawns.push({
      id: nextEnemyId++,
      archetype: archetype.id,
      color,
      totalLength,
      headCell,
      bodyCells,
      nextCell,
      timer: ENEMY_SPAWN_WARNING_TIME,
      maxTimer: ENEMY_SPAWN_WARNING_TIME
    });
    occupied.add(cellCode(headCell.col, headCell.row));
    for (const cell of bodyCells) occupied.add(cellCode(cell.col, cell.row));
    sound("enemyWarning");
    return true;
  }

  function materializeEnemySpawn(spawn) {
    const { headCell, nextCell, bodyCells, totalLength, color } = spawn;
    const direction = { dx: nextCell.col - headCell.col, dy: nextCell.row - headCell.row };
    if (direction.dx === 0 && direction.dy === 0) direction.dx = headCell.col < arena.worldMax ? 1 : -1;
    const angle = directionAngle(direction);
    const archetype = ENEMY_ARCHETYPE_BY_ID[spawn.archetype];
    const headPoint = cellCenter(headCell.col, headCell.row);
    const enemy = {
      id: spawn.id,
      archetype: spawn.archetype,
      behaviorState: "roam",
      behaviorPhase: 0,
      x: headPoint.x,
      y: headPoint.y,
      col: headCell.col,
      row: headCell.row,
      angle,
      desiredAngle: angle,
      birthLength: totalLength,
      speed: ENEMY_BASE_SPEED * archetype.speedMultiplier,
      turnRate: random(Math.min(ENEMY_TURN_RATE_MIN, ENEMY_TURN_RATE_MAX), Math.max(ENEMY_TURN_RATE_MIN, ENEMY_TURN_RATE_MAX)) * archetype.turnMultiplier,
      radius: arena.cellSize * 0.28,
      color,
      segments: bodyCells.map((cell) => makeSegmentAtCell(cell.col, cell.row)),
      captured: 0,
      target: null,
      think: random(0.1, 0.5),
      wobble: random(0, TAU),
      slow: 0,
      knockbackX: 0,
      knockbackY: 0,
      poisonTicks: 0,
      poisonTimer: 0,
      poisonColor: null,
      bladeCooldown: 0,
      sawCooldown: 0,
      collisionCooldown: 0,
      behaviorTimer: 0,
      chargeCooldown: spawn.archetype === "charger" ? ENEMY_BEHAVIOR_TUNING.chargerCooldown * random(0.35, 0.8) : 0,
      chargeAngle: angle,
      dead: false,
      hitBounds: null
    };
    updateEnemyHitBounds(enemy);
    enemies.push(enemy);
    burst(headPoint.x, headPoint.y, color, 22, 145);
    effects.push({ type: "ring", x: headPoint.x, y: headPoint.y, color, life: 0.58, maxLife: 0.58, radius: 5, endRadius: arena.cellSize * 1.25 });
    sound("enemySpawn");
    shake = Math.max(shake, 4);
  }

  function updateEnemySpawnWarnings(dt) {
    for (let index = pendingEnemySpawns.length - 1; index >= 0; index -= 1) {
      const spawn = pendingEnemySpawns[index];
      spawn.timer -= dt;
      if (spawn.timer > 0) continue;
      pendingEnemySpawns.splice(index, 1);
      materializeEnemySpawn(spawn);
    }
  }

  function waveCountdownRate() {
    return 1 + moduleCount("beacon") * MODULE_TUNING.beacon.waveRatePerStack;
  }

  function fieldPopulationCount() {
    return foods.length + enemies.reduce((total, enemy) => total + Number(!enemy.dead), 0);
  }

  function enemyThreatBudgetPerPlayer() {
    const minute = gameTime / 60;
    const lateMinutes = Math.max(0, minute - ENEMY_THREAT_BUDGET_LATE_START_MINUTE);
    return ENEMY_THREAT_BUDGET_BASE
      + minute * ENEMY_THREAT_BUDGET_PER_MINUTE
      + lateMinutes * ENEMY_THREAT_BUDGET_LATE_PER_MINUTE;
  }

  function isSurgeWave(waveNumber = waveCount + 1) {
    return ENEMY_SURGE_EVERY_WAVES > 0 && waveNumber % ENEMY_SURGE_EVERY_WAVES === 0;
  }

  function chooseEnemyArchetype(budget) {
    const available = ENEMY_ARCHETYPES.filter((entry) => (
      entry.unlockSeconds <= gameTime
      && entry.spawnWeight > 0
      && entry.threatCost <= budget + 1e-6
    ));
    if (!available.length) return null;
    let roll = Math.random() * available.reduce((sum, entry) => sum + entry.spawnWeight, 0);
    for (const entry of available) {
      roll -= entry.spawnWeight;
      if (roll <= 0) return entry;
    }
    return available[available.length - 1];
  }

  function queueWaveEnemies(occupied) {
    const currentCount = enemies.reduce((total, enemy) => total + Number(!enemy.dead), 0) + pendingEnemySpawns.length;
    const spawnLimit = Math.min(
      Math.max(0, ENEMY_CONCURRENT_CAP_PER_PLAYER - currentCount),
      ENEMY_MAX_SPAWNS_PER_PLAYER_PER_WAVE
    );
    let budget = enemyThreatBudgetPerPlayer() * (isSurgeWave() ? ENEMY_SURGE_BUDGET_MULTIPLIER : 1);
    for (let spawned = 0; spawned < spawnLimit; spawned += 1) {
      const archetype = chooseEnemyArchetype(budget);
      if (!archetype || !queueEnemySpawn(archetype, occupied)) break;
      budget -= archetype.threatCost;
    }
  }

  function updateSpawns(dt) {
    waveTimer -= dt * waveCountdownRate();
    if (waveTimer <= 0) {
      spawnWaveFoods(FOODS_PER_PLAYER_PER_WAVE);
      const occupied = occupiedCellCodes();
      queueWaveEnemies(occupied);
      const surgeWave = isSurgeWave();
      waveCount += 1;
      waveTimer = WAVE_BASE_INTERVAL * (surgeWave ? ENEMY_SURGE_RECOVERY_INTERVAL_MULTIPLIER : 1);
    }
  }

  function setTestMode(enabled) {
    testMode = Boolean(enabled);
    ui.shell.classList.toggle("is-test-mode", testMode);
    if (testMode) ui.shell.dataset.testMode = "codex";
    else delete ui.shell.dataset.testMode;
    pointer.active = false;
  }

  function startRespawnLocator(now = performance.now()) {
    respawnLocatorStartedAt = now;
  }

  function startPureLocalGame() {
    localModeForced = true;
    const socket = network.socket;
    network.enabled = false;
    network.connecting = false;
    network.multiplayer = false;
    network.socket = null;
    network.selfEntityId = null;
    network.principal = null;
    network.roster = [];
    network.snapshot = null;
    network.snapshotBuffer.length = 0;
    network.receivedAt = 0;
    network.renderServerTime = NaN;
    network.lastPresentationAt = 0;
    network.lastSelfAlive = false;
    network.upgradeOffer = null;
    socket?.removeAllListeners?.();
    socket?.disconnect?.();
    resetNetworkPredictionInput(true);
    clearNetworkViews();
    renderNetworkRoster([]);
    setNetworkButtonsDisabled(false);
    setNetworkStatus("", "TACTICAL SURVIVAL / LOCAL");
    startGame(false);
  }

  function startGame(autopilot = false) {
    if (network.enabled) {
      void startNetworkGame(autopilot, network.lastSelfAlive);
      return;
    }
    ensureAudio();
    closeSettingPopovers();
    setTestMode(autopilot === true);
    resetGame();
    state = "running";
    hideAllModals();
    sound("start");
  }

  function hideAllModals() {
    ui.start.classList.remove("is-visible");
    ui.pause.classList.remove("is-visible");
    ui.upgrade.classList.remove("is-visible");
    ui.gameOver.classList.remove("is-visible");
    ui.codex.classList.remove("is-visible");
    ui.changelog.classList.remove("is-visible");
  }

  function setPaused(paused) {
    if (network.enabled) {
      if (paused && state === "running") {
        state = "paused";
        ui.pause.classList.add("is-visible");
        sound("pause");
        void emitNetworkAction("ultra:pause", true).then((result) => {
          if (!result?.ok && state === "paused") setPaused(false);
        });
      } else if (!paused && state === "paused") {
        state = "running";
        ui.pause.classList.remove("is-visible");
        lastFrame = performance.now();
        sound("resume");
        void emitNetworkAction("ultra:pause", false);
      }
      return;
    }
    if (paused && state === "running") {
      state = "paused";
      ui.pause.classList.add("is-visible");
      sound("pause");
    } else if (!paused && state === "paused") {
      state = "running";
      ui.pause.classList.remove("is-visible");
      lastFrame = performance.now();
      sound("resume");
    }
  }

  function returnToMenu() {
    if (network.enabled) {
      closeSettingPopovers();
      if (network.lastSelfAlive) void emitNetworkAction("ultra:leave-run");
      network.lastSelfAlive = false;
      network.upgradeOffer = null;
      resetNetworkPredictionInput();
      setTestMode(false);
      state = "menu";
      player = null;
      visiblePlayers = [];
      hideAllModals();
      ui.start.classList.add("is-visible");
      lastFrame = performance.now();
      sound("ui");
      return;
    }
    closeSettingPopovers();
    setTestMode(false);
    resetGame();
    state = "menu";
    hideAllModals();
    ui.start.classList.add("is-visible");
    lastFrame = performance.now();
    sound("ui");
  }

  async function returnToLobby() {
    closeSettingPopovers();
    ui.lobbyButton.disabled = true;
    if (network.enabled && network.lastSelfAlive) {
      await Promise.race([
        emitNetworkAction("ultra:leave-run"),
        new Promise((resolve) => window.setTimeout(resolve, 450))
      ]);
      network.lastSelfAlive = false;
    }
    window.location.assign(resolveLobbyUrl());
  }

  function gameOver() {
    if (state !== "running") return;
    state = "gameover";
    shake = 16;
    flash = 0.5;
    sound("death");
    burst(player.x, player.y, "#b8f53f", 28, 170);

    const isNewBest = score > bestScore;
    if (isNewBest) {
      bestScore = Math.floor(score);
      saveBestScore(bestScore);
    }

    ui.finalScore.textContent = Math.floor(score).toLocaleString("zh-CN");
    ui.finalLevel.textContent = level;
    ui.finalKills.textContent = kills;
    ui.finalTime.textContent = formatTime(gameTime);
    ui.newBest.classList.toggle("is-visible", isNewBest);
    ui.best.textContent = Math.floor(bestScore).toLocaleString("zh-CN");
    window.setTimeout(() => ui.gameOver.classList.add("is-visible"), 330);
  }

  function ensureAudio() {
    if (audioContext) return;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (AudioCtor) audioContext = new AudioCtor();
  }

  function playEatScaleTone(stage) {
    const scaleSemitones = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21];
    const scaleIndex = clamp(Math.round(stage) - 1, 0, scaleSemitones.length - 1);
    const frequency = 523.25 * Math.pow(2, scaleSemitones[scaleIndex] / 12);
    const now = Math.max(audioContext.currentTime, nextEatToneAt);
    const duration = 0.24;
    const volume = 0.052 * (soundVolume / 0.5);
    nextEatToneAt = now + 0.055;

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.012, now + 0.04);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);

    const sparkle = audioContext.createOscillator();
    const sparkleGain = audioContext.createGain();
    sparkle.type = "sine";
    sparkle.frequency.setValueAtTime(frequency * 2, now + 0.012);
    sparkleGain.gain.setValueAtTime(volume * 0.28, now + 0.012);
    sparkleGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.72);
    sparkle.connect(sparkleGain).connect(audioContext.destination);
    sparkle.start(now + 0.012);
    sparkle.stop(now + duration * 0.72);
  }

  function playLevelUpFanfare() {
    const now = audioContext.currentTime;
    const volume = 0.046 * (soundVolume / 0.5);
    const notes = [
      { frequency: 523.25, delay: 0, duration: 0.26, gain: 0.8 },
      { frequency: 659.25, delay: 0.11, duration: 0.28, gain: 0.88 },
      { frequency: 783.99, delay: 0.22, duration: 0.34, gain: 0.94 },
      { frequency: 1046.5, delay: 0.35, duration: 0.46, gain: 1 }
    ];

    for (const note of notes) {
      const start = now + note.delay;
      const end = start + note.duration;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(note.frequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(note.frequency * 1.012, end);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume * note.gain, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(end);

      const shimmer = audioContext.createOscillator();
      const shimmerGain = audioContext.createGain();
      shimmer.type = "sine";
      shimmer.frequency.setValueAtTime(note.frequency * 2, start + 0.018);
      shimmerGain.gain.setValueAtTime(volume * note.gain * 0.22, start + 0.018);
      shimmerGain.gain.exponentialRampToValueAtTime(0.0001, end);
      shimmer.connect(shimmerGain).connect(audioContext.destination);
      shimmer.start(start + 0.018);
      shimmer.stop(end);
    }
  }

  function sound(kind, detail = 0, sourceEntityId = null) {
    if (soundVolume <= 0) return;
    ensureAudio();
    if (!audioContext) return;
    if (audioContext.state === "suspended") void audioContext.resume();

    if (kind === "eat") {
      playEatScaleTone(Math.max(1, detail));
      return;
    }
    if (kind === "levelCharge") {
      playLevelUpFanfare();
      return;
    }

    const cooldowns = { shoot: 45, skill: 65, frost: 70, electric: 75, hit: 48, foodSpawn: 70, bounce: 90, ui: 70 };
    const wallTime = performance.now();
    const cooldown = cooldowns[kind] || 0;
    const cooldownKey = sourceEntityId == null ? kind : `${kind}:${sourceEntityId}`;
    if (cooldown && wallTime - (lastSoundAt[cooldownKey] || 0) < cooldown) return;
    lastSoundAt[cooldownKey] = wallTime;

    const settings = {
      ui: [620, 760, 0.055, "sine", 0.018],
      start: [220, 440, 0.12, "triangle", 0.05, 660],
      pause: [360, 210, 0.09, "sine", 0.024],
      resume: [260, 540, 0.1, "triangle", 0.026],
      foodSpawn: [310, 760, 0.1, "sine", 0.024, 980],
      enemyWarning: [620, 190, 0.24, "square", 0.026, 105],
      enemySpawn: [115, 430, 0.2, "sawtooth", 0.04, 620],
      bounce: [135, 310, 0.16, "square", 0.04, 72],
      shoot: [980, 430, 0.055, "square", 0.012],
      skill: [420, 820, 0.1, "triangle", 0.024],
      frost: [920, 1260, 0.13, "sine", 0.022, 1510],
      electric: [110, 930, 0.11, "square", 0.026],
      nova: [190, 680, 0.18, "sawtooth", 0.03, 1020],
      laser: [1380, 360, 0.12, "sawtooth", 0.021],
      mine: [170, 95, 0.14, "square", 0.026],
      pulse: [310, 90, 0.2, "sine", 0.034],
      regen: [410, 760, 0.24, "sine", 0.028, 980],
      hit: [150, 90, 0.08, "square", 0.025],
      kill: [180, 560, 0.18, "sawtooth", 0.045, 840],
      level: [330, 880, 0.3, "triangle", 0.06, 1320],
      select: [480, 760, 0.13, "sine", 0.042],
      shield: [760, 240, 0.2, "sine", 0.05, 1040],
      death: [170, 45, 0.48, "sawtooth", 0.065, 75]
    }[kind];
    if (!settings) return;

    const [from, to, duration, type, baseVolume, accent] = settings;
    const now = audioContext.currentTime;
    const volume = baseVolume * (soundVolume / 0.5);
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, to), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);

    if (accent) {
      const accentOscillator = audioContext.createOscillator();
      const accentGain = audioContext.createGain();
      const accentStart = now + duration * 0.12;
      accentOscillator.type = type === "square" ? "triangle" : "sine";
      accentOscillator.frequency.setValueAtTime(accent, accentStart);
      accentOscillator.frequency.exponentialRampToValueAtTime(Math.max(20, accent * 0.84), now + duration);
      accentGain.gain.setValueAtTime(volume * 0.45, accentStart);
      accentGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      accentOscillator.connect(accentGain).connect(audioContext.destination);
      accentOscillator.start(accentStart);
      accentOscillator.stop(now + duration);
    }
  }

  function moduleCount(id) {
    if (network.enabled && player?.networkModuleCounts) return player.networkModuleCounts[id] || 0;
    let count = 0;
    for (const segment of player.segments) if (segment.module === id) count += 1;
    return count;
  }

  function outputRateMultiplier() {
    return Math.pow(MODULE_TUNING.amplifier.cooldownMultiplierPerStack, moduleCount("amplifier"));
  }

  function bladeOrbitRadius() {
    return arena.cellSize * 0.58 * 5;
  }

  function repulseRangePixels() {
    const count = moduleCount("repulse");
    return count > 0
      ? MODULE_TUNING.repulse.baseRangePixels + count * MODULE_TUNING.repulse.rangePixelsPerStack
      : 0;
  }

  function formatTuningNumber(value, digits = 2) {
    return Number(value.toFixed(digits)).toString();
  }

  function formatTuningPercent(value) {
    return `${formatTuningNumber(value * 100, 1)}%`;
  }

  function moduleDescription(module) {
    const tuning = MODULE_TUNING;
    const descriptions = {
      spark: "锁定最近敌蛇发射 1 枚高速弹，命中造成 1 点伤害。",
      frost: "发射 1 枚冰晶弹，命中造成 1 点伤害，并使敌人以 55% 速度移动 2.6 秒。",
      prism: "朝同一目标扇形发射 3 枚子弹，每枚造成 1 点伤害，可同时命中同一敌人。",
      nova: "不需要目标，向八个方向各发射 1 枚星屑；每枚命中造成 1 点伤害。",
      tesla: "电击场上最近敌人，并向 155px 内的新目标跳跃；最多命中 3 条敌蛇，每条受到 1 点伤害。",
      laser: "瞬间命中场上最近敌人，造成 1 点伤害；没有飞行时间，也不会打偏。",
      missile: "发射 1 枚追迹弹，以 4.2 弧度/秒修正航向；命中造成 1 点伤害。",
      mine: "布置后 0.55 秒生效，并永久留场直到触发。敌人头部进入 62px、或玩家头部直接接触时引爆：任意身体处于爆区的敌蛇受到 1 点伤害，玩家只被击退。",
      blade: `刀刃在机体外约 2.9 格处旋转，接触敌蛇造成 1 点伤害；同一敌人的受击间隔为 ${formatCooldownSeconds(moduleCooldownSeconds("blade"))}，多份旋刃共享该间隔。`,
      pulse: "释放约 105px 半径的冲击波；任意身体进入范围的每条敌蛇受到 1 点伤害。",
      venom: "命中先造成 1 点伤害，随后再造成 2 次各 1 点的腐蚀伤害；第一次延迟约 1.4 秒，第二次再延迟约 2.3 秒。",
      echo: `头部每次向场上最近目标开火时，每节回声弹匣追加 1 枚偏转弹；每枚命中造成 1 点伤害，基础射击间隔为 ${formatCooldownSeconds(HEAD_ATTACK_INTERVAL * ATTACK_INTERVAL_SCALE)}。`,
      rail: "发射 1 枚高速贯穿弹，每个目标受到 1 点伤害，最多连续命中 4 条不同敌蛇。",
      ricochet: "发射 1 枚晶体弹，最多反弹墙壁 2 次、命中 3 条不同敌蛇；每个目标受到 1 点伤害。",
      cluster: "发射追踪爆弹，碰到敌蛇后在 72px 半径内爆炸；范围内每条敌蛇受到 1 点伤害。",
      fan: "朝同一目标扇形发射 5 枚子弹，每枚造成 1 点伤害，可同时命中同一敌人。",
      gravity: "在目标头部位置生成 95px 半径、持续 6 秒的引力井。生成时任意身体处于范围内的敌蛇受到 1 点伤害，头部停留其中时被牵引并以 55% 速度移动。",
      shield: `抵消 1 次玩家头部撞上敌人身体的致命碰撞，反击敌人 1 点并获得 1.05 秒无敌，随后冷却 ${formatCooldownSeconds(moduleCooldownSeconds("shield"))}；与幻相同时就绪时优先消耗护盾。`,
      phase: `抵消 1 次玩家头部撞上敌人身体的致命碰撞，反击敌人 1 点并获得 1.55 秒无敌；该次碰撞不会改变当前航向，随后冷却 ${formatCooldownSeconds(moduleCooldownSeconds("phase"))}。`,
      armor: `每节使护盾与相位模块冷却缩短 ${formatTuningPercent(1 - tuning.armor.cooldownMultiplierPerStack)}，按乘法叠加。`,
      stabilizer: `玩家反弹的基础减速时间为 ${formatTuningNumber(BOUNCE_SLOW_TIME)} 秒、转向锁定为 ${formatTuningNumber(BOUNCE_LOCK_TIME)} 秒；每节分别缩短 ${formatTuningPercent(1 - tuning.stabilizer.slowMultiplierPerStack)} 与 ${formatTuningPercent(1 - tuning.stabilizer.lockMultiplierPerStack)}，按乘法叠加。`,
      magnet: `每节将头部球球吸收范围扩大 ${formatTuningNumber(tuning.magnet.pickupRangeCellsPerStack)} 格。`,
      haste: `每节永久提高 ${formatTuningPercent(tuning.haste.speedPerStack)} 移动速度，并增加 ${formatTuningNumber(tuning.haste.turnRatePerStack)} 弧度/秒转向速度。`,
      chronos: `每节使所有敌蛇移动速度降低 ${formatTuningPercent(1 - tuning.chronos.enemySpeedMultiplierPerStack)}，按乘法叠加。`,
      tractor: `首节提供 ${formatTuningNumber(tuning.tractor.baseRangeCells)} 格引力范围与 ${formatTuningNumber(tuning.tractor.basePullSpeed)} 格/秒牵引速度；后续每节分别增加 ${formatTuningNumber(tuning.tractor.rangeCellsPerExtraStack)} 格与 ${formatTuningNumber(tuning.tractor.pullSpeedPerExtraStack)} 格/秒。球仍需接触身体才算吃到，途中也可能被敌人截走。`,
      fortune: `击破敌人时，每节增加 ${formatTuningPercent(tuning.fortune.chancePerStack)} 触发概率，上限 ${formatTuningPercent(tuning.fortune.maxChance)}；触发后在固定的 1 枚基础球之外再掉 1 枚，每满 ${tuning.fortune.extraDropEveryStacks} 节再多掉 1 枚。`,
      guidance: `所有玩家子弹每节提高 ${formatTuningPercent(tuning.guidance.projectileSpeedPerStack)} 飞行速度，并增加 ${formatTuningNumber(tuning.guidance.homingPerStack)} 弧度/秒追踪速度；弹幕生成时若已有目标，原本无追踪的弹幕也会锁定该目标。`,
      feast: `吃球后持续 ${formatTuningNumber(tuning.feast.duration)} 秒；每节提高 ${formatTuningPercent(tuning.feast.speedPerStack)} 移动速度。效果期间再次吃球会刷新持续时间，不会叠加多层计时。`,
      salvage: `技能每削去 1 节敌蛇身体，独立进行一次回收判定；每节提供 ${formatTuningPercent(tuning.salvage.chancePerStack)} 概率，上限 ${formatTuningPercent(tuning.salvage.maxChance)}。直接摧毁只剩头部的敌人不会触发回收。`,
      amplifier: `每节使头部和定时发射/爆发类输出模块的冷却缩短 ${formatTuningPercent(1 - tuning.amplifier.cooldownMultiplierPerStack)}，按乘法叠加；不影响旋刃、切割链环、再生芽、尾部育成舱及防御模块。`,
      buffer: `每节使玩家受到的物理击退初速度降低 ${formatTuningPercent(1 - tuning.buffer.knockbackMultiplierPerStack)}，按乘法叠加。`,
      decoy: `每节使敌人对玩家身体的避让强度降低 ${formatTuningPercent(tuning.decoy.avoidanceReductionPerStack)}，最低保留 ${formatTuningPercent(tuning.decoy.minimumAvoidanceMultiplier)}。`,
      emergency: `任意玩家身体吃球后，全身获得无敌并免疫敌人身体的致命碰撞。持续 ${formatTuningNumber(tuning.emergency.baseDuration)} 秒基础时间，每节再增加 ${formatTuningNumber(tuning.emergency.durationPerStack)} 秒，上限 ${formatTuningNumber(tuning.emergency.maxDuration)} 秒；重复触发只刷新时间。`,
      collector: `每节将所有玩家身体节的接触吃球半径扩大 ${formatTuningNumber(tuning.collector.pickupRadiusCellsPerStack)} 格。`,
      beacon: `每节使波次倒计时速度提高 ${formatTuningPercent(tuning.beacon.waveRatePerStack)}。`,
      momentum: `敌人因撞墙、撞自己、撞到其他敌人或与玩家头部相撞而反弹时，每节使其物理击退初速度提高 ${formatTuningPercent(tuning.momentum.enemyKnockbackPerStack)}；不影响玩家。`,
      progressor: `升级进度越高加速越强；经验满时每节最高提高 ${formatTuningPercent(tuning.progressor.maxSpeedPerStack)} 移动速度。`,
      repulse: `持续把靠近玩家头部的敌蛇航向拉向外侧，不造成伤害或击退。首节作用半径为 ${tuning.repulse.baseRangePixels + tuning.repulse.rangePixelsPerStack}px，后续每节扩大 ${tuning.repulse.rangePixelsPerStack}px。`,
      thorns: `敌人撞上玩家身体并被摧毁时，冷却就绪会额外生成 1 枚球并发射 ${tuning.thorns.baseShots} 枚环形弹幕；后续每节增加 ${tuning.thorns.shotsPerExtraStack} 枚，最多 ${tuning.thorns.baseShots + tuning.thorns.maxBonusShots} 枚。基础冷却 ${formatCooldownSeconds(moduleCooldownSeconds("thorns"))}，后续每节缩短 ${formatTuningPercent(1 - tuning.thorns.extraStackMultiplier)}。`,
      regen: `每节独立计时，装备后 0.2～0.8 秒生成首枚球，此后每 ${formatCooldownSeconds(moduleCooldownSeconds("regen"))} 在玩家头部前方 85～130px 附近生成 1 枚；若目标格被占用，会改放到最近空格，生成后也可能被敌人吃掉。`,
      bloom: `装备后立即就绪：下一次击破额外生成 1 枚球，随后进入 ${formatCooldownSeconds(moduleCooldownSeconds("bloom"))} 冷却；后续每节使冷却缩短 ${formatTuningPercent(1 - tuning.bloom.extraStackMultiplier)}，不会增加单次掉球数。`,
      needle: "发射 1 枚高速钨针，每个目标受到 1 点伤害；贯穿第一个目标后还能再命中 1 条敌蛇，最多命中 2 条。",
      mortar: "发射大型追踪榴弹，碰到敌蛇后在 92px 半径内爆炸；范围内每条敌蛇受到 1 点伤害。",
      sweep: "向目标方向发射贯穿全场的宽幅光栅，核心宽度约 52px；任意身体与光栅相交的每条敌蛇受到 1 点伤害。",
      sniper: "瞬间锁定场上最近敌人并造成 2 点伤害；没有蓄力等待或飞行时间。",
      flak: "以目标头部为中心引爆 84px 半径弹幕；任意身体进入爆区的每条敌蛇受到 1 点伤害。",
      fork: "向目标两侧各发射 1 枚追迹电弹，每枚造成 1 点伤害；两枚可以同时命中同一敌人。",
      anchor: "发射 1 枚大型追踪锚弹，命中造成 1 点伤害，并使敌人以 55% 速度移动 4.2 秒。",
      saw: `敌蛇接触机体周围 0.82 格范围时受到 1 点伤害；同一敌人的受击间隔为 ${formatCooldownSeconds(moduleCooldownSeconds("saw"))}，多份切割链环共享该间隔。`,
      flare: "命中先造成 1 点伤害，随后再造成 4 次各 1 点的延迟灼蚀伤害。",
      scatter: "朝同一目标扇形发射 7 枚碎晶，每枚造成 1 点伤害，可同时命中同一敌人。",
      lance: "发射 1 枚大型高速光矛，每个目标受到 1 点伤害，最多连续命中 6 条不同敌蛇。",
      execute: "锁定场上最近敌人：敌人总长度不超过 3（包含头部）时造成 2 点伤害，否则造成 1 点伤害。",
      crossfire: "朝目标方向、反方向和两侧垂直方向各发射 1 枚重弹；每枚最多命中 2 条敌蛇，每个目标受到 1 点伤害。",
      phasebolt: "发射 1 枚轻度追踪的相位弹，最多反弹墙壁 4 次；命中第一条敌蛇后造成 1 点伤害并消失。",
      cache: `首节每 ${tuning.cache.baseKills - tuning.cache.killsReducedPerStack} 次击破，在敌人的固定基础球之外额外生成 1 枚；每增加一节减少 ${tuning.cache.killsReducedPerStack} 次需求，下限 ${tuning.cache.minimumKills} 次。`,
      ram: `玩家头部与敌人头部相撞时，冷却就绪会额外造成 1 点伤害。基础冷却 ${formatCooldownSeconds(moduleCooldownSeconds("ram"))}；每增加一节使冷却缩短 ${formatTuningPercent(1 - tuning.ram.extraStackMultiplier)}。`,
      nursery: `每节独立计时，装备后 0.2～0.8 秒生成首枚球，此后每 ${formatCooldownSeconds(moduleCooldownSeconds("nursery"))} 在玩家当前尾部附近生成 1 枚；若尾部格被占用，会改放到最近空格，生成后也可能被敌人吃掉。`
    };
    let description = descriptions[module.id] || module.desc;
    if (UNLIMITED_PROJECTILE_MODULES.has(module.id)) {
      description += " 子弹不会因距离或飞行时间消失，会持续飞行到命中目标或撞上墙壁；穿透与反弹机体遵循自身规则。";
    }
    if (TARGET_REQUIRED_MODULES.has(module.id)) {
      description += " 冷却完成后会锁定场上最近目标；场上没有目标时保留充能，成功释放后才进入冷却。";
    }
    return description;
  }

  function displayedModuleDescription(module) {
    return detailedDescriptionsEnabled
      ? moduleDescription(module)
      : SHORT_MODULE_DESCRIPTIONS[module.id] || module.desc;
  }

  function resetModuleCardMotion(card) {
    card.style.setProperty("--card-tilt-x", "0deg");
    card.style.setProperty("--card-tilt-y", "0deg");
    card.style.setProperty("--card-shift-x", "0px");
    card.style.setProperty("--card-shift-y", "0px");
  }

  function updateModuleCardMotion(card, event) {
    if (!uiMotionMedia.matches || event.pointerType !== "mouse") return;
    const rect = card.getBoundingClientRect();
    let localX = clamp((event.clientX - (rect.left + rect.width * 0.5)) / Math.max(1, rect.width * 0.5), -1, 1);
    let localY = clamp((event.clientY - (rect.top + rect.height * 0.5)) / Math.max(1, rect.height * 0.5), -1, 1);
    const length = Math.hypot(localX, localY);
    if (length > 1) {
      localX /= length;
      localY /= length;
    }
    const magnitude = Math.min(1, length);
    const eased = magnitude * magnitude * (3 - 2 * magnitude);
    const scale = magnitude > 0.0001 ? eased / magnitude : 0;
    localX *= scale;
    localY *= scale;
    card.style.setProperty("--card-tilt-x", `${(-localY * 1.5 * uiMotionStrength).toFixed(3)}deg`);
    card.style.setProperty("--card-tilt-y", `${(localX * 2 * uiMotionStrength).toFixed(3)}deg`);
    card.style.setProperty("--card-shift-x", `${(localX * 1.1 * uiMotionStrength).toFixed(3)}px`);
    card.style.setProperty("--card-shift-y", `${(localY * 0.8 * uiMotionStrength).toFixed(3)}px`);
  }

  function createModuleCard(module, options = {}) {
    const interactive = typeof options.onSelect === "function";
    const card = document.createElement(interactive ? "button" : "article");
    if (interactive) card.type = "button";
    card.className = "upgrade-card module-card";
    card.dataset.moduleId = module.id;
    card.style.setProperty("--module-color", module.color);
    card.innerHTML = `
      <div class="card-top">
        <span class="module-swatch shape-${module.shape}" aria-hidden="true"><i></i></span>
        <div class="card-heading"><span>${module.category}型模块</span><h3>${module.name}</h3><small class="card-cooldown">冷却 · ${module.cooldown}</small></div>
      </div>
      <p>${displayedModuleDescription(module)}</p>
      <span class="card-action">${options.actionLabel || "机体档案"} <b aria-hidden="true">${options.actionSymbol || "+"}</b></span>
    `;
    card.addEventListener("pointermove", (event) => updateModuleCardMotion(card, event));
    card.addEventListener("pointerleave", () => resetModuleCardMotion(card));
    if (interactive) card.addEventListener("click", options.onSelect);
    return card;
  }

  function renderModuleCodex() {
    ui.codexList.replaceChildren(...MODULES.map((module, index) => createModuleCard(module, {
      actionLabel: "档案编号",
      actionSymbol: String(index + 1).padStart(2, "0")
    })));
  }

  function openCodex() {
    ensureAudio();
    closeSettingPopovers();
    renderModuleCodex();
    hideAllModals();
    ui.codex.classList.add("is-visible");
    ui.codex.scrollTop = 0;
    sound("ui");
  }

  function closeCodex() {
    ui.codex.classList.remove("is-visible");
    ui.start.classList.add("is-visible");
    sound("ui");
  }

  function openChangelog() {
    ensureAudio();
    closeSettingPopovers();
    hideAllModals();
    ui.changelog.classList.add("is-visible");
    ui.changelog.scrollTop = 0;
    sound("ui");
  }

  function closeChangelog() {
    ui.changelog.classList.remove("is-visible");
    ui.start.classList.add("is-visible");
    sound("ui");
  }

  function chooseUpgradeOptions() {
    const output = UPGRADE_MODULES.filter((item) => item.category === "输出" && !recentPicks.includes(item.id));
    const utility = UPGRADE_MODULES.filter((item) => item.category !== "输出" && !recentPicks.includes(item.id));
    const allFresh = UPGRADE_MODULES.filter((item) => !recentPicks.includes(item.id));
    const choices = [];

    function take(list) {
      const candidates = list.filter((item) => !choices.includes(item));
      if (!candidates.length) return;
      choices.push(candidates[Math.floor(Math.random() * candidates.length)]);
    }

    take(output.length ? output : UPGRADE_MODULES.filter((item) => item.category === "输出"));
    take(utility.length ? utility : UPGRADE_MODULES.filter((item) => item.category !== "输出"));
    const targetCount = Math.min(3, UPGRADE_MODULES.length);
    while (choices.length < targetCount) take(allFresh.length ? allFresh : UPGRADE_MODULES);

    for (let index = choices.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [choices[index], choices[swap]] = [choices[swap], choices[index]];
    }
    return choices;
  }

  function showUpgrade(networkChoices = null) {
    state = "upgrade";
    ui.levelUpBanner.classList.remove("is-active");
    ui.shell.classList.remove("is-leveling");
    sound("level");
    ui.upgradeLevel.textContent = level + 1;
    ui.options.replaceChildren();

    const choices = networkChoices || chooseUpgradeOptions();
    ui.options.append(...choices.map((module) => createModuleCard(module, {
      actionLabel: "装载到尾部",
      actionSymbol: "+",
      onSelect: () => selectUpgrade(module)
    })));
    ui.upgrade.classList.add("is-visible");

    if (testMode) {
      const automaticChoice = choices[Math.floor(Math.random() * choices.length)];
      window.setTimeout(() => {
        if (testMode && state === "upgrade") selectUpgrade(automaticChoice);
      }, 650);
    }
  }

  function selectUpgrade(module) {
    if (state !== "upgrade") return;
    if (network.enabled) {
      void emitNetworkAction("ultra:upgrade", module.id).then((result) => {
        if (!result?.ok) return;
        network.upgradeOffer = null;
        ui.upgrade.classList.remove("is-visible");
        state = "running";
        sound("select");
        lastFrame = performance.now();
      });
      return;
    }
    const required = xpNeeded;
    let removed = 0;
    player.segments = player.segments.filter((segment) => {
      if (segment.neutral && removed < required) {
        removed += 1;
        return false;
      }
      return true;
    });

    level += 1;
    xp = 0;
    xpNeeded = level + 5;
    const tail = player.segments[player.segments.length - 1] || player;
    const initialTimer = random(0.2, 0.8);
    player.segments.push(makeSegmentAtCell(tail.col, tail.row, { module: module.id, timer: initialTimer }));
    recentPicks.push(module.id);
    if (recentPicks.length > 6) recentPicks.shift();
    score += 250 * level;
    ui.upgrade.classList.remove("is-visible");
    state = "running";
    player.invulnerable = Math.max(player.invulnerable, UPGRADE_INVULNERABILITY_DURATION);
    sound("select");
    burst(tail.x, tail.y, module.color, 22, 130);
    effects.push({ type: "ring", x: tail.x, y: tail.y, color: module.color, life: 0.7, maxLife: 0.7, radius: 12 });
    renderModuleRack();
    updateHud(true);
    lastFrame = performance.now();
  }

  function addNeutralSegment(animate = false) {
    const tail = player.segments[player.segments.length - 1] || player;
    const segment = makeSegmentAtCell(tail.col, tail.row, { neutral: true, birthAge: animate ? 0 : null });
    player.segments.push(segment);
    return segment;
  }

  function storedNeutralCount() {
    const grown = player.segments.reduce((total, segment) => total + (segment.neutral ? 1 : 0), 0);
    return grown + growthQueue.length + (activeGrowth ? 1 : 0);
  }

  function materializePendingGrowth() {
    const pendingCount = growthQueue.length + (activeGrowth ? 1 : 0);
    activeGrowth = null;
    growthQueue.length = 0;
    for (let index = 0; index < pendingCount; index += 1) addNeutralSegment();
  }

  function startNextGrowthAnimation() {
    if (activeGrowth || !growthQueue.length) return;
    activeGrowth = {
      ...growthQueue.shift(),
      elapsed: 0,
      nodeCount: player.segments.length + 1
    };
  }

  function growthPulseForNode(index) {
    if (!activeGrowth) return 0;
    const localTime = activeGrowth.elapsed - index * GROWTH_NODE_DELAY;
    if (localTime < 0 || localTime >= GROWTH_PULSE_DURATION) return 0;
    const attack = 0.052;
    if (localTime < attack) return 1 - Math.pow(1 - localTime / attack, 3);
    const recovery = (localTime - attack) / (GROWTH_PULSE_DURATION - attack);
    return Math.pow(1 - recovery, 2);
  }

  function segmentBirthScale(segment) {
    if (segment.birthAge == null) return 1;
    const progress = clamp(segment.birthAge / SEGMENT_BIRTH_DURATION, 0, 1);
    if (progress < 0.62) {
      const appear = 1 - Math.pow(1 - progress / 0.62, 3);
      return 0.18 + appear * 1.04;
    }
    return 1.22 - (progress - 0.62) / 0.38 * 0.22;
  }

  function updateSegmentBirthAnimations(dt) {
    for (const segment of player.segments) {
      if (segment.birthAge == null) continue;
      segment.birthAge += dt;
      if (segment.birthAge >= SEGMENT_BIRTH_DURATION) segment.birthAge = null;
    }
  }

  function startLevelUpTransition() {
    upgradeRevealTimer = LEVEL_UP_TRANSITION_DURATION;
    player.invulnerable = Math.max(player.invulnerable, LEVEL_UP_TRANSITION_DURATION * LEVEL_UP_TIME_SCALE + 0.08);
    burst(player.x, player.y, "#f3c600", 54, 245);
    burst(player.x, player.y, "#08c7dc", 34, 190);
    effects.push({ type: "ring", x: player.x, y: player.y, color: "#f3c600", life: LEVEL_UP_TRANSITION_DURATION, maxLife: LEVEL_UP_TRANSITION_DURATION, radius: 8, endRadius: arena.cellSize * 3.8 });
    effects.push({ type: "ring", x: player.x, y: player.y, color: "#ffffff", life: 0.68, maxLife: 0.68, radius: 5, endRadius: arena.cellSize * 2.5 });
    effects.push({ type: "text", x: player.x, y: player.y - arena.cellSize * 0.8, text: "LEVEL UP", color: "#f3c600", life: LEVEL_UP_TRANSITION_DURATION, maxLife: LEVEL_UP_TRANSITION_DURATION });
    ui.levelUpBanner.classList.remove("is-active");
    ui.shell.classList.remove("is-leveling");
    void ui.levelUpBanner.offsetWidth;
    ui.levelUpBanner.classList.add("is-active");
    ui.shell.classList.add("is-leveling");
    sound("levelCharge");
    shake = Math.max(shake, 6.5);
    flash = Math.max(flash, 0.18);
  }

  function updateGrowthAnimation(dt, realDt = dt) {
    updateSegmentBirthAnimations(dt);
    if (upgradePending && upgradeRevealTimer > 0) {
      upgradeRevealTimer -= realDt;
      if (upgradeRevealTimer <= 0) {
        upgradePending = false;
        upgradeRevealTimer = 0;
        showUpgrade();
      }
      return;
    }

    startNextGrowthAnimation();
    if (!activeGrowth) return;

    activeGrowth.elapsed += dt;
    const totalDuration = (activeGrowth.nodeCount - 1) * GROWTH_NODE_DELAY + GROWTH_PULSE_DURATION;
    if (activeGrowth.elapsed < totalDuration) return;

    const color = activeGrowth.color;
    const special = activeGrowth.special;
    const segment = addNeutralSegment(true);
    burst(segment.x, segment.y, color, special ? 28 : 22, special ? 175 : 145);
    burst(segment.x, segment.y, "#eef5ff", special ? 18 : 12, special ? 135 : 105);
    effects.push({ type: "ring", x: segment.x, y: segment.y, color, life: 0.46, maxLife: 0.46, radius: 3, endRadius: arena.cellSize * 0.78 });
    effects.push({ type: "ring", x: segment.x, y: segment.y, color: "#ffffff", life: 0.28, maxLife: 0.28, radius: 2, endRadius: arena.cellSize * 0.46 });
    shake = Math.max(shake, special ? 2.5 : 1.5);
    activeGrowth = null;
    startNextGrowthAnimation();

    if (upgradePending && !activeGrowth && growthQueue.length === 0) {
      startLevelUpTransition();
    }
  }

  function collectFood(index, collector = player) {
    const food = foods[index];
    foods.splice(index, 1);
    xp += 1;
    score += food.special ? 35 : 20;
    growthQueue.push({ color: food.color, special: food.special });
    const completesLevel = xp >= xpNeeded;
    if (completesLevel) {
      upgradePending = true;
      materializePendingGrowth();
    } else {
      startNextGrowthAnimation();
    }
    if (moduleCount("feast") > 0) player.foodBoost = MODULE_TUNING.feast.duration;
    const emergency = moduleCount("emergency");
    if (emergency > 0) {
      const duration = Math.min(
        MODULE_TUNING.emergency.maxDuration,
        MODULE_TUNING.emergency.baseDuration + emergency * MODULE_TUNING.emergency.durationPerStack
      );
      player.invulnerable = Math.max(player.invulnerable, duration);
      effects.push({ type: "ring", x: collector.x, y: collector.y, color: MODULE_BY_ID.emergency.color, life: 0.38, maxLife: 0.38, radius: 7, endRadius: arena.cellSize * 0.72 });
    }
    burst(collector.x, collector.y, food.color, food.special ? 34 : 28, food.special ? 210 : 180);
    effects.push({ type: "ring", x: collector.x, y: collector.y, color: food.color, life: 0.58, maxLife: 0.58, radius: 5, endRadius: arena.cellSize * 1.5 });
    effects.push({ type: "ring", x: collector.x, y: collector.y, color: "#ffffff", life: 0.32, maxLife: 0.32, radius: 4, endRadius: arena.cellSize * 0.82 });
    effects.push({ type: "text", x: collector.x, y: collector.y, text: "+1", color: food.color, life: 0.72, maxLife: 0.72 });
    sound("eat", storedNeutralCount());
    shake = Math.max(shake, food.special ? 4 : 2.8);
    if (completesLevel) startLevelUpTransition();
    updateHud();
  }

  function renderModuleRack() {
    ui.rack.replaceChildren();
    if (!player) return;
    const counts = new Map();
    for (const segment of player.segments) {
      if (segment.module) counts.set(segment.module, (counts.get(segment.module) || 0) + 1);
    }
    for (const [id, count] of counts) {
      const module = MODULE_BY_ID[id];
      const item = document.createElement("span");
      item.className = `rack-module shape-${module.shape}`;
      item.style.setProperty("--module-color", module.color);
      item.title = `${module.name}：${displayedModuleDescription(module)}`;
      item.setAttribute("aria-label", `${module.name}，数量 ${count}`);
      item.innerHTML = `<i aria-hidden="true"></i>${count > 1 ? `<b>${count}</b>` : ""}`;
      ui.rack.append(item);
    }
  }

  function updateHud(force = false) {
    function setText(element, value) {
      const text = String(value);
      if (force || element.textContent !== text) element.textContent = text;
    }

    setText(ui.time, formatTime(gameTime));
    setText(ui.kills, kills);
    const population = fieldPopulationCount();
    const nextWave = waveCount ? (network.enabled ? Math.max(0, waveTimer) : Math.max(0, waveTimer) / waveCountdownRate()).toFixed(1) : "--";
    setText(ui.wave, `${waveCount}/${population} · ${nextWave}`);
    setText(ui.score, Math.floor(score).toLocaleString("zh-CN"));
    setText(ui.level, level);
    setText(ui.xp, xp);
    setText(ui.needed, xpNeeded);
    const xpWidth = `${clamp((xp / xpNeeded) * 100, 0, 100)}%`;
    if (force || ui.xpFill.style.width !== xpWidth) ui.xpFill.style.width = xpWidth;

    if (force || lastNeeded !== xpNeeded) {
      lastNeeded = xpNeeded;
      ui.xpPips.style.gridTemplateColumns = `repeat(${xpNeeded}, 1fr)`;
      ui.xpPips.replaceChildren(...Array.from({ length: xpNeeded }, () => document.createElement("span")));
    }
  }

  function testAutopilotAngle() {
    let vectorX = 0;
    let vectorY = 0;
    let nearestFood = null;
    let nearestDistance = Infinity;
    for (const food of foods) {
      const distance = (food.col - player.col) ** 2 + (food.row - player.row) ** 2;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestFood = food;
      }
    }

    if (nearestFood) {
      const targetX = nearestFood.col - player.col;
      const targetY = nearestFood.row - player.row;
      const targetLength = Math.hypot(targetX, targetY) || 1;
      vectorX += targetX / targetLength;
      vectorY += targetY / targetLength;
    } else {
      const centerX = (arena.worldMin + arena.worldMax) / 2 - player.col;
      const centerY = (arena.worldMin + arena.worldMax) / 2 - player.row;
      const centerLength = Math.hypot(centerX, centerY) || 1;
      vectorX += centerX / centerLength;
      vectorY += centerY / centerLength;
    }

    const wallMargin = 3.2;
    if (player.col < arena.worldMin + wallMargin) vectorX += (arena.worldMin + wallMargin - player.col) * 1.4;
    if (player.col > arena.worldMax + 1 - wallMargin) vectorX -= (player.col - (arena.worldMax + 1 - wallMargin)) * 1.4;
    if (player.row < arena.worldMin + wallMargin) vectorY += (arena.worldMin + wallMargin - player.row) * 1.4;
    if (player.row > arena.worldMax + 1 - wallMargin) vectorY -= (player.row - (arena.worldMax + 1 - wallMargin)) * 1.4;

    const repel = (node, strength, range) => {
      const awayX = player.col - node.col;
      const awayY = player.row - node.row;
      const distanceSquaredValue = awayX * awayX + awayY * awayY;
      if (distanceSquaredValue <= 0.001 || distanceSquaredValue >= range * range) return;
      const factor = strength / distanceSquaredValue;
      vectorX += awayX * factor;
      vectorY += awayY * factor;
    };

    for (let index = 3; index < player.segments.length; index += 1) repel(player.segments[index], 1.4, 2.4);
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      repel(enemy, 3.2, 3.5);
      for (const segment of enemy.segments) repel(segment, 2.4, 2.8);
    }
    if (network.enabled) {
      for (const other of visiblePlayers) {
        if (other === player || other.protectedState) continue;
        repel(other, 3.2, 3.5);
        for (const segment of other.segments) repel(segment, 2.8, 3);
      }
    }

    return Math.atan2(vectorY, vectorX);
  }

  function updateInput(dt, applyTurn = true) {
    if (player.collisionCooldown > 0) {
      player.desiredAngle = player.angle;
      return;
    }
    let dx = 0;
    let dy = 0;
    if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= 1;
    if (keys.has("ArrowRight") || keys.has("KeyD")) dx += 1;
    if (keys.has("ArrowUp") || keys.has("KeyW")) dy -= 1;
    if (keys.has("ArrowDown") || keys.has("KeyS")) dy += 1;

    if (dx || dy) {
      player.desiredAngle = Math.atan2(dy, dx);
    } else if (testMode) {
      player.desiredAngle = testAutopilotAngle();
    } else if (pointer.active) {
      const pointerWorld = screenToWorld(pointer.x, pointer.y);
      const px = pointerWorld.x - player.x;
      const py = pointerWorld.y - player.y;
      if (px * px + py * py > 16) player.desiredAngle = Math.atan2(py, px);
    }
    const turnRate = PLAYER_TURN_RATE + moduleCount("haste") * MODULE_TUNING.haste.turnRatePerStack;
    if (applyTurn) player.angle = rotateToward(player.angle, player.desiredAngle, turnRate * dt);
  }

  function followContinuousSegments(headCol, headRow, segments, spacing) {
    let previous = { col: headCol, row: headRow };
    for (const segment of segments) {
      const dx = previous.col - segment.col;
      const dy = previous.row - segment.row;
      const distance = Math.hypot(dx, dy) || 1;
      segment.angle = Math.atan2(dy, dx);
      if (distance > spacing) {
        segment.col = previous.col - dx / distance * spacing;
        segment.row = previous.row - dy / distance * spacing;
        syncNodePosition(segment);
      }
      previous = segment;
    }
  }

  function bounceEntity(entity, normalX, normalY, color, segmentSpacing, extraImpulseMultiplier = 1) {
    let normalLength = Math.hypot(normalX, normalY);
    if (normalLength < 0.001) {
      normalX = -Math.cos(entity.angle);
      normalY = -Math.sin(entity.angle);
      normalLength = 1;
    }
    const nx = normalX / normalLength;
    const ny = normalY / normalLength;
    const velocityX = Math.cos(entity.angle);
    const velocityY = Math.sin(entity.angle);
    const approach = velocityX * nx + velocityY * ny;
    let bounceX = approach < 0 ? velocityX - 2 * approach * nx : nx;
    let bounceY = approach < 0 ? velocityY - 2 * approach * ny : ny;
    bounceX += nx * 0.5;
    bounceY += ny * 0.5;
    const bounceLength = Math.hypot(bounceX, bounceY) || 1;
    const bounceAngle = Math.atan2(bounceY / bounceLength, bounceX / bounceLength);

    const impulseMultiplier = entity === player
      ? Math.pow(MODULE_TUNING.buffer.knockbackMultiplierPerStack, moduleCount("buffer")) * extraImpulseMultiplier
      : 1 + moduleCount("momentum") * MODULE_TUNING.momentum.enemyKnockbackPerStack;
    entity.knockbackX = nx * KNOCKBACK_INITIAL_SPEED * impulseMultiplier;
    entity.knockbackY = ny * KNOCKBACK_INITIAL_SPEED * impulseMultiplier;
    entity.angle = bounceAngle;
    entity.desiredAngle = bounceAngle;
    const stabilization = entity === player ? moduleCount("stabilizer") : 0;
    const slowDuration = BOUNCE_SLOW_TIME * Math.pow(MODULE_TUNING.stabilizer.slowMultiplierPerStack, stabilization);
    const lockDuration = BOUNCE_LOCK_TIME * Math.pow(MODULE_TUNING.stabilizer.lockMultiplierPerStack, stabilization);
    entity.slow = Math.max(entity.slow || 0, slowDuration);
    entity.collisionCooldown = lockDuration;
    if (entity !== player && entity.archetype === "charger" && (entity.behaviorState === "telegraph" || entity.behaviorState === "charge")) {
      entity.behaviorState = "roam";
      entity.behaviorPhase = 0;
      entity.behaviorTimer = 0;
      entity.chargeCooldown = ENEMY_BEHAVIOR_TUNING.chargerCooldown;
      entity.chargeAngle = bounceAngle;
      entity.think = 0;
    }
    syncNodePosition(entity);
    followContinuousSegments(entity.col, entity.row, entity.segments, segmentSpacing);
    if (entity !== player) updateEnemyHitBounds(entity);
    burst(entity.x, entity.y, color, 13, 135);
    effects.push({ type: "ring", x: entity.x, y: entity.y, color, life: 0.38, maxLife: 0.38, radius: 5, endRadius: arena.cellSize * 0.85 });
    sound("bounce");
    shake = Math.max(shake, 4.5);
  }

  function applyKnockbackDecay(entity, dt) {
    const damping = Math.exp(-KNOCKBACK_DECAY * dt);
    entity.knockbackX = (entity.knockbackX || 0) * damping;
    entity.knockbackY = (entity.knockbackY || 0) * damping;
    if (Math.hypot(entity.knockbackX, entity.knockbackY) < 0.04) {
      entity.knockbackX = 0;
      entity.knockbackY = 0;
    }
  }

  function wallBounceNormal(col, row) {
    let x = 0;
    let y = 0;
    if (col < arena.worldMin) x += 1;
    else if (col > arena.worldMax) x -= 1;
    if (row < arena.worldMin) y += 1;
    else if (row > arena.worldMax) y -= 1;
    return x || y ? { x, y } : null;
  }

  function findSelfCollision(entity, threshold) {
    for (let index = 2; index < entity.segments.length; index += 1) {
      const segment = entity.segments[index];
      if (Math.hypot(entity.col - segment.col, entity.row - segment.row) < threshold) return segment;
    }
    return null;
  }

  function movePlayer(dt) {
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.slow = Math.max(0, player.slow - dt);
    player.collisionCooldown = Math.max(0, player.collisionCooldown - dt);
    player.foodBoost = Math.max(0, player.foodBoost - dt);
    player.thornsCooldown = Math.max(0, player.thornsCooldown - dt);
    player.ramCooldown = Math.max(0, player.ramCooldown - dt);
    player.bloomCooldown = Math.max(0, player.bloomCooldown - dt);
    const slowMultiplier = player.slow > 0 ? 0.48 : 1;
    const feastMultiplier = player.foodBoost > 0 ? 1 + moduleCount("feast") * MODULE_TUNING.feast.speedPerStack : 1;
    player.speed = playerBaseSpeed() * slowMultiplier * feastMultiplier;
    player.col += (Math.cos(player.angle) * player.speed + player.knockbackX) * dt;
    player.row += (Math.sin(player.angle) * player.speed + player.knockbackY) * dt;
    applyKnockbackDecay(player, dt);
    syncNodePosition(player);
    followContinuousSegments(player.col, player.row, player.segments, 0.58);
  }

  function updateFood(dt) {
    const tractor = moduleCount("tractor");
    const tractorRange = MODULE_TUNING.tractor.baseRangeCells + Math.max(0, tractor - 1) * MODULE_TUNING.tractor.rangeCellsPerExtraStack;
    const tractorSpeed = MODULE_TUNING.tractor.basePullSpeed + Math.max(0, tractor - 1) * MODULE_TUNING.tractor.pullSpeedPerExtraStack;
    for (const food of foods) {
      food.isPulled = false;
      if (tractor <= 0) continue;
      const deltaCol = player.col - food.col;
      const deltaRow = player.row - food.row;
      const distance = Math.hypot(deltaCol, deltaRow);
      if (distance <= 0.001 || distance > tractorRange) continue;
      const step = Math.min(distance, tractorSpeed * dt);
      food.col += deltaCol / distance * step;
      food.row += deltaRow / distance * step;
      food.isPulled = true;
      syncNodePosition(food);
    }

    if (upgradePending) return;
    const magnetRange = moduleCount("magnet") * MODULE_TUNING.magnet.pickupRangeCellsPerStack;
    const pieceScale = arenaPieceScale();
    const collectorBonus = moduleCount("collector") * arena.cellSize * MODULE_TUNING.collector.pickupRadiusCellsPerStack;
    for (let index = foods.length - 1; index >= 0; index -= 1) {
      const food = foods[index];
      const pickupRadius = player.radius + food.radius + magnetRange * arena.cellSize;
      let collector = Math.hypot(player.x - food.x, player.y - food.y) <= pickupRadius ? player : null;
      if (!collector) {
        collector = player.segments.find((segment) => {
          const visualRadius = (segment.module ? 11 : segment.neutral ? 10 : 8) * pieceScale;
          return Math.hypot(segment.x - food.x, segment.y - food.y) <= visualRadius + food.radius + collectorBonus;
        }) || null;
      }
      if (collector) {
        collectFood(index, collector);
        if (upgradePending || state === "upgrade") break;
      }
    }
  }

  function nearestEnemy(origin, maxDistance = Infinity) {
    let nearest = null;
    let best = maxDistance * maxDistance;
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const distance = distanceSquared(origin, enemy);
      if (distance < best) {
        best = distance;
        nearest = enemy;
      }
    }
    return nearest;
  }

  function createPlayerProjectile(origin, angle, options = {}) {
    const guidance = moduleCount("guidance");
    const guidanceMultiplier = 1 + guidance * MODULE_TUNING.guidance.projectileSpeedPerStack;
    const scale = arenaVisualScale();
    const speed = (options.speed || 300) * guidanceMultiplier * PROJECTILE_SPEED_SCALE * scale;
    const homing = (options.homing || 0) + guidance * MODULE_TUNING.guidance.homingPerStack;
    const target = options.target && !options.target.dead ? options.target : null;
    const projectile = {
      kind: "shot",
      x: origin.x,
      y: origin.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      speed,
      life: Infinity,
      color: options.color || "#dffcff",
      size: (options.size || 4) * PROJECTILE_SIZE_SCALE * scale,
      pierce: options.pierce || 0,
      bounces: options.bounces || 0,
      blastRadius: (options.blastRadius || 0) * scale,
      slow: options.slow || 0,
      poison: options.poison || 0,
      homing,
      target: homing > 0 ? target : null,
      hitIds: []
    };
    projectiles.push(projectile);
    return projectile;
  }

  function spawnShot(origin, target, options = {}) {
    if (!target || target.dead) return false;
    const angle = Math.atan2(target.y - origin.y, target.x - origin.x) + (options.angleOffset || 0);
    createPlayerProjectile(origin, angle, { ...options, target });
    return true;
  }

  function updateHeadWeapon(dt) {
    headFireTimer -= dt;
    if (headFireTimer > 0) return;
    const target = nearestEnemy(player);
    if (!target) {
      headFireTimer = 0;
      return;
    }
    const fired = spawnShot(player, target, { color: "#dffcff", speed: 360, size: 3.7 });
    const echoes = moduleCount("echo");
    for (let index = 0; index < echoes; index += 1) {
      const direction = index % 2 ? 1 : -1;
      const tier = Math.floor(index / 2) + 1;
      spawnShot(player, target, {
        color: MODULE_BY_ID.echo.color,
        speed: 330,
        size: 3.4,
        angleOffset: direction * tier * 0.13
      });
    }
    if (fired) {
      sound("shoot");
      headFireTimer = HEAD_ATTACK_INTERVAL * outputRateMultiplier() * ATTACK_INTERVAL_SCALE;
    }
  }

  function playSkillSound(moduleId) {
    const sounds = {
      frost: "frost",
      tesla: "electric",
      nova: "nova",
      laser: "laser",
      mine: "mine",
      pulse: "pulse",
      regen: "regen"
    };
    sound(sounds[moduleId] || "skill");
  }

  function updateModules(dt) {
    const rate = outputRateMultiplier();

    for (const segment of player.segments) {
      if (!segment.module) continue;
      segment.timer -= dt;
      segment.orbit += dt * 3.8;

      if (segment.module === "shield" || segment.module === "phase") {
        if (!segment.ready) {
          segment.cooldown -= dt;
          if (segment.cooldown <= 0) {
            segment.ready = true;
            effects.push({ type: "ring", x: segment.x, y: segment.y, color: MODULE_BY_ID[segment.module].color, life: 0.5, maxLife: 0.5, radius: 10 });
          }
        }
        continue;
      }

      if (segment.module === "blade") {
        const orbitRadius = bladeOrbitRadius();
        const bladeX = segment.x + Math.cos(segment.orbit) * orbitRadius;
        const bladeY = segment.y + Math.sin(segment.orbit) * orbitRadius;
        for (const enemy of enemies) {
          if (enemy.dead || enemy.bladeCooldown > 0) continue;
          if (pointHitsEnemy(bladeX, bladeY, 10 * arenaVisualScale(), enemy)) {
            enemy.bladeCooldown = moduleCooldownSeconds("blade");
            damageEnemy(enemy, 1, bladeX, bladeY, MODULE_BY_ID.blade.color);
          }
        }
        continue;
      }

      if (segment.module === "saw") {
        const contactRadius = arena.cellSize * 0.82;
        for (const enemy of enemies) {
          if (enemy.dead || enemy.sawCooldown > 0) continue;
          if (pointHitsEnemy(segment.x, segment.y, contactRadius, enemy)) {
            enemy.sawCooldown = moduleCooldownSeconds("saw");
            damageEnemy(enemy, 1, enemy.x, enemy.y, MODULE_BY_ID.saw.color);
            effects.push({ type: "ring", x: segment.x, y: segment.y, color: MODULE_BY_ID.saw.color, life: 0.3, maxLife: 0.3, radius: 5, endRadius: contactRadius });
            playSkillSound("saw");
          }
        }
        continue;
      }

      if (segment.module === "regen" && segment.timer <= 0) {
        const distance = random(85, 130) * arenaVisualScale();
        const x = player.x + Math.cos(player.angle) * distance;
        const y = player.y + Math.sin(player.angle) * distance;
        spawnFood(x, y, true);
        playSkillSound("regen");
        effects.push({ type: "ring", x, y, color: MODULE_BY_ID.regen.color, life: 0.9, maxLife: 0.9, radius: 8 });
        segment.timer = moduleCooldownSeconds("regen");
        continue;
      }

      if (segment.module === "nursery" && segment.timer <= 0) {
        const tail = player.segments[player.segments.length - 1] || player;
        spawnFood(tail.x, tail.y, true);
        playSkillSound("regen");
        effects.push({ type: "ring", x: tail.x, y: tail.y, color: MODULE_BY_ID.nursery.color, life: 0.75, maxLife: 0.75, radius: 6, endRadius: arena.cellSize * 0.9 });
        segment.timer = moduleCooldownSeconds("nursery");
        continue;
      }

      if (segment.timer > 0) continue;
      const target = nearestEnemy(segment);
      if (TARGET_REQUIRED_MODULES.has(segment.module) && !target) {
        segment.timer = 0;
        continue;
      }

      switch (segment.module) {
        case "spark":
          if (spawnShot(segment, target, { color: MODULE_BY_ID.spark.color, speed: 390, size: 4.5 })) playSkillSound("spark");
          segment.timer = moduleCooldownSeconds("spark") * rate;
          break;
        case "frost":
          if (spawnShot(segment, target, { color: MODULE_BY_ID.frost.color, speed: 310, size: 5, slow: 2.6 })) playSkillSound("frost");
          segment.timer = moduleCooldownSeconds("frost") * rate;
          break;
        case "prism":
          if (target) {
            for (const offset of [-0.17, 0, 0.17]) spawnShot(segment, target, { color: MODULE_BY_ID.prism.color, speed: 330, angleOffset: offset });
            playSkillSound("prism");
          }
          segment.timer = moduleCooldownSeconds("prism") * rate;
          break;
        case "nova":
          for (let index = 0; index < 8; index += 1) {
            const angle = index * TAU / 8 + segment.orbit * 0.15;
            createPlayerProjectile(segment, angle, { color: MODULE_BY_ID.nova.color, speed: 250, size: 4.4, target });
          }
          playSkillSound("nova");
          effects.push({ type: "ring", x: segment.x, y: segment.y, color: MODULE_BY_ID.nova.color, life: 0.45, maxLife: 0.45, radius: 8 });
          segment.timer = moduleCooldownSeconds("nova") * rate;
          break;
        case "tesla":
          if (target) {
            fireTesla(segment, target);
            playSkillSound("tesla");
          }
          segment.timer = moduleCooldownSeconds("tesla") * rate;
          break;
        case "laser":
          if (target) {
            damageEnemy(target, 1, target.x, target.y, MODULE_BY_ID.laser.color);
            effects.push({ type: "beam", x: segment.x, y: segment.y, x2: target.x, y2: target.y, color: MODULE_BY_ID.laser.color, life: 0.2, maxLife: 0.2 });
            playSkillSound("laser");
          }
          segment.timer = moduleCooldownSeconds("laser") * rate;
          break;
        case "missile":
          if (spawnShot(segment, target, { color: MODULE_BY_ID.missile.color, speed: 230, size: 6, homing: 4.2 })) playSkillSound("missile");
          segment.timer = moduleCooldownSeconds("missile") * rate;
          break;
        case "mine":
          hazards.push({ kind: "mine", x: segment.x, y: segment.y, col: segment.col, row: segment.row, life: Infinity, arm: 0.55, radius: 62 * arenaVisualScale(), color: MODULE_BY_ID.mine.color, phase: random(0, TAU) });
          playSkillSound("mine");
          segment.timer = moduleCooldownSeconds("mine") * rate;
          break;
        case "pulse":
          firePulse(segment);
          playSkillSound("pulse");
          segment.timer = moduleCooldownSeconds("pulse") * rate;
          break;
        case "venom":
          if (spawnShot(segment, target, { color: MODULE_BY_ID.venom.color, speed: 285, size: 5.5, poison: 2 })) playSkillSound("venom");
          segment.timer = moduleCooldownSeconds("venom") * rate;
          break;
        case "rail":
          if (spawnShot(segment, target, { color: MODULE_BY_ID.rail.color, speed: 520, size: 4.8, pierce: 3 })) playSkillSound("rail");
          segment.timer = moduleCooldownSeconds("rail") * rate;
          break;
        case "ricochet":
          if (spawnShot(segment, target, { color: MODULE_BY_ID.ricochet.color, speed: 340, size: 5.2, pierce: 2, bounces: 2 })) playSkillSound("ricochet");
          segment.timer = moduleCooldownSeconds("ricochet") * rate;
          break;
        case "cluster":
          if (spawnShot(segment, target, { color: MODULE_BY_ID.cluster.color, speed: 245, size: 7, homing: 3.6, blastRadius: 72 })) playSkillSound("cluster");
          segment.timer = moduleCooldownSeconds("cluster") * rate;
          break;
        case "fan":
          if (target) {
            for (const offset of [-0.34, -0.17, 0, 0.17, 0.34]) {
              spawnShot(segment, target, { color: MODULE_BY_ID.fan.color, speed: 300, size: 4.6, angleOffset: offset });
            }
            playSkillSound("fan");
          }
          segment.timer = moduleCooldownSeconds("fan") * rate;
          break;
        case "gravity":
          if (target) {
            const gravityRadius = 95 * arenaVisualScale();
            hazards.push({ kind: "gravity", x: target.x, y: target.y, col: target.col, row: target.row, life: 6, arm: 0, radius: gravityRadius, color: MODULE_BY_ID.gravity.color, phase: random(0, TAU) });
            for (const enemy of enemies) {
              if (!enemy.dead && pointHitsEnemy(target.x, target.y, gravityRadius, enemy)) damageEnemy(enemy, 1, enemy.x, enemy.y, MODULE_BY_ID.gravity.color);
            }
            playSkillSound("gravity");
          }
          segment.timer = moduleCooldownSeconds("gravity") * rate;
          break;
        case "needle":
          if (spawnShot(segment, target, { color: MODULE_BY_ID.needle.color, speed: 560, size: 3.8, pierce: 1 })) playSkillSound("needle");
          segment.timer = moduleCooldownSeconds("needle") * rate;
          break;
        case "mortar":
          if (spawnShot(segment, target, { color: MODULE_BY_ID.mortar.color, speed: 205, size: 8, homing: 3.2, blastRadius: 92 })) playSkillSound("mortar");
          segment.timer = moduleCooldownSeconds("mortar") * rate;
          break;
        case "sweep":
          if (target && fireSweepBeam(segment, target)) playSkillSound("sweep");
          segment.timer = moduleCooldownSeconds("sweep") * rate;
          break;
        case "sniper":
          if (target) {
            damageEnemy(target, 2, target.x, target.y, MODULE_BY_ID.sniper.color);
            effects.push({ type: "beam", x: segment.x, y: segment.y, x2: target.x, y2: target.y, color: MODULE_BY_ID.sniper.color, life: 0.28, maxLife: 0.28 });
            playSkillSound("sniper");
          }
          segment.timer = moduleCooldownSeconds("sniper") * rate;
          break;
        case "flak":
          if (target && fireFlakBurst(target)) playSkillSound("flak");
          segment.timer = moduleCooldownSeconds("flak") * rate;
          break;
        case "fork":
          if (target) {
            spawnShot(segment, target, { color: MODULE_BY_ID.fork.color, speed: 300, size: 5, angleOffset: -0.24, homing: 2.5 });
            spawnShot(segment, target, { color: MODULE_BY_ID.fork.color, speed: 300, size: 5, angleOffset: 0.24, homing: 2.5 });
            playSkillSound("fork");
          }
          segment.timer = moduleCooldownSeconds("fork") * rate;
          break;
        case "anchor":
          if (spawnShot(segment, target, { color: MODULE_BY_ID.anchor.color, speed: 180, size: 8.5, homing: 2, slow: 4.2 })) playSkillSound("anchor");
          segment.timer = moduleCooldownSeconds("anchor") * rate;
          break;
        case "flare":
          if (spawnShot(segment, target, { color: MODULE_BY_ID.flare.color, speed: 270, size: 5.8, poison: 4 })) playSkillSound("flare");
          segment.timer = moduleCooldownSeconds("flare") * rate;
          break;
        case "scatter":
          if (target) {
            for (const offset of [-0.42, -0.28, -0.14, 0, 0.14, 0.28, 0.42]) {
              spawnShot(segment, target, { color: MODULE_BY_ID.scatter.color, speed: 305, size: 4.2, angleOffset: offset });
            }
            playSkillSound("scatter");
          }
          segment.timer = moduleCooldownSeconds("scatter") * rate;
          break;
        case "lance":
          if (spawnShot(segment, target, { color: MODULE_BY_ID.lance.color, speed: 590, size: 7, pierce: 5 })) playSkillSound("lance");
          segment.timer = moduleCooldownSeconds("lance") * rate;
          break;
        case "execute":
          if (target) {
            const damage = target.segments.length + 1 <= 3 ? 2 : 1;
            damageEnemy(target, damage, target.x, target.y, MODULE_BY_ID.execute.color);
            effects.push({ type: "beam", x: segment.x, y: segment.y, x2: target.x, y2: target.y, color: MODULE_BY_ID.execute.color, life: 0.2, maxLife: 0.2 });
            playSkillSound("execute");
          }
          segment.timer = moduleCooldownSeconds("execute") * rate;
          break;
        case "crossfire":
          if (target && fireCrossfire(segment, target)) playSkillSound("crossfire");
          segment.timer = moduleCooldownSeconds("crossfire") * rate;
          break;
        case "phasebolt":
          if (spawnShot(segment, target, { color: MODULE_BY_ID.phasebolt.color, speed: 320, size: 6, bounces: 4, homing: 1.6 })) playSkillSound("phasebolt");
          segment.timer = moduleCooldownSeconds("phasebolt") * rate;
          break;
        default:
          break;
      }
    }

    for (const enemy of enemies) {
      enemy.bladeCooldown = Math.max(0, enemy.bladeCooldown - dt);
      enemy.sawCooldown = Math.max(0, enemy.sawCooldown - dt);
      if (enemy.slow > 0) enemy.slow -= dt;
      if (enemy.poisonTicks > 0) {
        enemy.poisonTimer -= dt;
        if (enemy.poisonTimer <= 0) {
          enemy.poisonTimer = 1.15 * ATTACK_INTERVAL_SCALE;
          enemy.poisonTicks -= 1;
          damageEnemy(enemy, 1, enemy.x, enemy.y, enemy.poisonColor || MODULE_BY_ID.venom.color);
        }
      }
    }
  }

  function fireTesla(origin, first) {
    const hit = [];
    let current = first;
    let from = origin;
    for (let jump = 0; jump < 3 && current; jump += 1) {
      hit.push(current);
      damageEnemy(current, 1, current.x, current.y, MODULE_BY_ID.tesla.color);
      effects.push({ type: "lightning", x: from.x, y: from.y, x2: current.x, y2: current.y, color: MODULE_BY_ID.tesla.color, life: 0.24, maxLife: 0.24 });
      from = { x: current.x, y: current.y };
      let next = null;
      const jumpRange = 155 * arenaVisualScale();
      let best = jumpRange * jumpRange;
      for (const enemy of enemies) {
        if (enemy.dead || hit.includes(enemy)) continue;
        const dist = distanceSquared(from, enemy);
        if (dist < best) {
          best = dist;
          next = enemy;
        }
      }
      current = next;
    }
  }

  function firePulse(origin) {
    const radius = 105 * arenaVisualScale();
    effects.push({ type: "ring", x: origin.x, y: origin.y, color: MODULE_BY_ID.pulse.color, life: 0.55, maxLife: 0.55, radius: 16, endRadius: radius });
    for (const enemy of enemies) {
      if (!enemy.dead && pointHitsEnemy(origin.x, origin.y, radius, enemy)) {
        damageEnemy(enemy, 1, enemy.x, enemy.y, MODULE_BY_ID.pulse.color);
      }
    }
  }

  function lineHitsEnemy(origin, directionX, directionY, range, halfWidth, enemy) {
    const nodes = [enemy, ...enemy.segments];
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      const relativeX = node.x - origin.x;
      const relativeY = node.y - origin.y;
      const projection = relativeX * directionX + relativeY * directionY;
      if (projection < 0 || projection > range) continue;
      const perpendicular = Math.abs(relativeX * directionY - relativeY * directionX);
      const nodeRadius = index === 0 ? enemy.radius : 9 * arenaVisualScale();
      if (perpendicular <= halfWidth + nodeRadius) return true;
    }
    return false;
  }

  function fireSweepBeam(origin, target) {
    const angle = Math.atan2(target.y - origin.y, target.x - origin.x);
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    const range = Math.max(arena.width, arena.height) * 1.15;
    const endX = origin.x + directionX * range;
    const endY = origin.y + directionY * range;
    let hits = 0;
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      if (!lineHitsEnemy(origin, directionX, directionY, range, 26 * arenaVisualScale(), enemy)) continue;
      damageEnemy(enemy, 1, enemy.x, enemy.y, MODULE_BY_ID.sweep.color);
      hits += 1;
    }
    effects.push({ type: "beam", x: origin.x, y: origin.y, x2: endX, y2: endY, color: MODULE_BY_ID.sweep.color, width: 52 * arenaVisualScale(), life: 0.24, maxLife: 0.24 });
    return hits > 0;
  }

  function fireFlakBurst(target) {
    const radius = 84 * arenaVisualScale();
    let hits = 0;
    effects.push({ type: "ring", x: target.x, y: target.y, color: MODULE_BY_ID.flak.color, life: 0.5, maxLife: 0.5, radius: 8, endRadius: radius });
    burst(target.x, target.y, MODULE_BY_ID.flak.color, 18, 155);
    for (const enemy of enemies) {
      if (enemy.dead || !pointHitsEnemy(target.x, target.y, radius, enemy)) continue;
      damageEnemy(enemy, 1, enemy.x, enemy.y, MODULE_BY_ID.flak.color);
      hits += 1;
    }
    return hits > 0;
  }

  function fireCrossfire(origin, target) {
    const baseAngle = Math.atan2(target.y - origin.y, target.x - origin.x);
    for (let index = 0; index < 4; index += 1) {
      const angle = baseAngle + index * Math.PI / 2;
      createPlayerProjectile(origin, angle, {
        target,
        speed: 285,
        color: MODULE_BY_ID.crossfire.color,
        size: 6.2,
        pierce: 1
      });
    }
    effects.push({ type: "ring", x: origin.x, y: origin.y, color: MODULE_BY_ID.crossfire.color, life: 0.4, maxLife: 0.4, radius: 5, endRadius: arena.cellSize });
    return true;
  }

  function triggerBodyIntercept(enemy, collisionPoint, stacks) {
    const tuning = MODULE_TUNING.thorns;
    const shotCount = tuning.baseShots + Math.min(tuning.maxBonusShots, Math.max(0, stacks - 1) * tuning.shotsPerExtraStack);
    const startAngle = random(0, TAU);
    const target = nearestEnemy(collisionPoint);
    for (let index = 0; index < shotCount; index += 1) {
      const angle = startAngle + index * TAU / shotCount;
      createPlayerProjectile(collisionPoint, angle, {
        target,
        speed: 280,
        color: MODULE_BY_ID.thorns.color,
        size: 4.2
      });
    }
    spawnFood(enemy.x, enemy.y, true);
    burst(collisionPoint.x, collisionPoint.y, MODULE_BY_ID.thorns.color, 18, 145);
    effects.push({ type: "ring", x: collisionPoint.x, y: collisionPoint.y, color: MODULE_BY_ID.thorns.color, life: 0.55, maxLife: 0.55, radius: 8, endRadius: arena.cellSize * 1.4 });
    playSkillSound("thorns");
  }

  function playerBodyAvoidance(enemy) {
    if (!player.segments.length) return null;
    const range = 3.2;
    const forwardX = Math.cos(enemy.desiredAngle);
    const forwardY = Math.sin(enemy.desiredAngle);
    const probeCol = enemy.col + forwardX * 0.7;
    const probeRow = enemy.row + forwardY * 0.7;
    let awayX = 0;
    let awayY = 0;
    let totalWeight = 0;

    for (const segment of player.segments) {
      const toBodyX = segment.col - probeCol;
      const toBodyY = segment.row - probeRow;
      const distance = Math.hypot(toBodyX, toBodyY);
      if (distance <= 0.001 || distance >= range) continue;
      const ahead = (toBodyX * forwardX + toBodyY * forwardY) / distance;
      if (ahead < -0.35) continue;
      const proximity = 1 - distance / range;
      const weight = proximity * proximity * (0.7 + Math.max(0, ahead) * 1.15);
      awayX -= toBodyX / distance * weight;
      awayY -= toBodyY / distance * weight;
      totalWeight += weight;
    }

    if (totalWeight < 0.02) return null;
    const decoyMultiplier = Math.max(
      MODULE_TUNING.decoy.minimumAvoidanceMultiplier,
      1 - moduleCount("decoy") * MODULE_TUNING.decoy.avoidanceReductionPerStack
    );
    return {
      angle: Math.atan2(awayY, awayX),
      strength: clamp(totalWeight * 1.85, 0.28, 0.96) * decoyMultiplier
    };
  }

  function resolveEnemyCollisions() {
    for (let firstIndex = 0; firstIndex < enemies.length; firstIndex += 1) {
      const first = enemies[firstIndex];
      if (first.dead || first.collisionCooldown > 0) continue;

      for (let secondIndex = firstIndex + 1; secondIndex < enemies.length; secondIndex += 1) {
        const second = enemies[secondIndex];
        if (second.dead || second.collisionCooldown > 0) continue;

        let normalX = first.col - second.col;
        let normalY = first.row - second.row;
        const hitDistance = (first.radius + second.radius) / arena.cellSize;
        if (normalX * normalX + normalY * normalY >= hitDistance * hitDistance) continue;

        if (Math.hypot(normalX, normalY) < 0.001) {
          normalX = Math.cos(first.angle) - Math.cos(second.angle);
          normalY = Math.sin(first.angle) - Math.sin(second.angle);
        }
        if (Math.hypot(normalX, normalY) < 0.001) {
          normalX = -Math.cos(first.angle);
          normalY = -Math.sin(first.angle);
        }

        bounceEntity(first, normalX, normalY, first.color, 0.54);
        bounceEntity(second, -normalX, -normalY, second.color, 0.54);
        break;
      }
    }

    const bodyBuckets = new Map();
    for (const owner of enemies) {
      if (owner.dead) continue;
      for (const segment of owner.segments) {
        const key = spatialBucketKey(segment);
        const bucket = bodyBuckets.get(key);
        const entry = { owner, segment };
        if (bucket) bucket.push(entry);
        else bodyBuckets.set(key, [entry]);
      }
    }
    const bodyRangeSquared = 0.46 ** 2;
    for (const enemy of enemies) {
      if (enemy.dead || enemy.collisionCooldown > 0) continue;
      let bodyHit = null;
      const minimumCol = Math.floor(enemy.col - 0.46);
      const maximumCol = Math.floor(enemy.col + 0.46);
      const minimumRow = Math.floor(enemy.row - 0.46);
      const maximumRow = Math.floor(enemy.row + 0.46);
      for (let col = minimumCol; col <= maximumCol && !bodyHit; col += 1) {
        for (let row = minimumRow; row <= maximumRow && !bodyHit; row += 1) {
          const bucket = bodyBuckets.get(`${col},${row}`);
          if (!bucket) continue;
          for (const entry of bucket) {
            if (entry.owner === enemy || distanceSquared(enemy, entry.segment) >= bodyRangeSquared) continue;
            bodyHit = entry.segment;
            break;
          }
        }
      }

      if (bodyHit) {
        bounceEntity(enemy, enemy.col - bodyHit.col, enemy.row - bodyHit.row, enemy.color, 0.54);
      }
    }
  }

  function nearestFoodsForEnemy(origin, limit) {
    const candidates = [];
    for (const food of foods) {
      const candidate = { food, distance: distanceSquared(food, origin) };
      let insertAt = candidates.length;
      while (insertAt > 0 && candidate.distance < candidates[insertAt - 1].distance) insertAt -= 1;
      if (insertAt >= limit) continue;
      candidates.splice(insertAt, 0, candidate);
      if (candidates.length > limit) candidates.pop();
    }
    return candidates.map((candidate) => candidate.food);
  }

  function densestEnemyFood(origin, candidates, radius) {
    if (!candidates.length) return null;
    const radiusSquared = radius * radius;
    let selected = candidates[0];
    let bestScore = -Infinity;
    for (const candidate of candidates) {
      let cluster = 0;
      for (const other of candidates) if (distanceSquared(candidate, other) <= radiusSquared) cluster += 1;
      const score = cluster * 4 - distanceSquared(candidate, origin) * 0.02;
      if (score <= bestScore) continue;
      bestScore = score;
      selected = candidate;
    }
    return selected;
  }

  function chooseEnemyIntent(enemy) {
    const candidates = nearestFoodsForEnemy(enemy, ENEMY_FOOD_SEARCH_LIMIT);
    enemy.wobble += random(-1.2, 1.2);
    switch (enemy.archetype) {
      case "scout":
        enemy.target = Math.random() < ENEMY_BEHAVIOR_TUNING.scoutFoodInterest && candidates.length
          ? candidates[Math.floor(Math.random() * candidates.length)]
          : null;
        enemy.behaviorState = enemy.target ? "forage" : "roam";
        break;
      case "courier":
        if (enemy.captured >= ENEMY_BEHAVIOR_TUNING.courierCarryThreshold) {
          enemy.target = null;
          enemy.behaviorState = "flee";
        } else {
          enemy.target = densestEnemyFood(enemy, candidates, ENEMY_BEHAVIOR_TUNING.courierFoodClusterRadius);
          enemy.behaviorState = enemy.target ? "forage" : "roam";
        }
        break;
      case "cutter":
        enemy.target = null;
        enemy.behaviorState = "intercept";
        break;
      case "coiler":
        enemy.target = densestEnemyFood(enemy, candidates, ENEMY_BEHAVIOR_TUNING.coilerOrbitRadius);
        enemy.behaviorState = enemy.target ? "orbit" : "roam";
        break;
      case "warden":
        enemy.target = candidates[0] || null;
        enemy.behaviorState = "escort";
        break;
      default:
        enemy.target = candidates.length ? candidates[Math.floor(Math.pow(Math.random(), 1.8) * candidates.length)] : null;
        enemy.behaviorState = enemy.target ? "forage" : "roam";
        break;
    }
  }

  function steerEnemy(enemy, activeFoods) {
    if (enemy.behaviorState === "flee") {
      const away = Math.atan2(enemy.row - player.row, enemy.col - player.col);
      enemy.desiredAngle += angleDelta(enemy.desiredAngle, away) * ENEMY_BEHAVIOR_TUNING.courierFleeStrength;
      enemy.behaviorPhase = clamp(enemy.captured / ENEMY_BEHAVIOR_TUNING.courierCarryThreshold, 0, 1);
      return;
    }
    if (enemy.behaviorState === "intercept") {
      const side = Math.sin(enemy.wobble) >= 0 ? 1 : -1;
      const targetCol = player.col
        + Math.cos(player.angle) * ENEMY_BEHAVIOR_TUNING.cutterLeadDistance
        + Math.cos(player.angle + side * Math.PI / 2) * ENEMY_BEHAVIOR_TUNING.cutterLateralDistance;
      const targetRow = player.row
        + Math.sin(player.angle) * ENEMY_BEHAVIOR_TUNING.cutterLeadDistance
        + Math.sin(player.angle + side * Math.PI / 2) * ENEMY_BEHAVIOR_TUNING.cutterLateralDistance;
      enemy.desiredAngle = Math.atan2(targetRow - enemy.row, targetCol - enemy.col);
      enemy.behaviorPhase = 0.5 + side * 0.5;
      return;
    }
    if (enemy.behaviorState === "orbit" && enemy.target && activeFoods.has(enemy.target)) {
      const radialAngle = Math.atan2(enemy.target.row - enemy.row, enemy.target.col - enemy.col);
      const distance = Math.sqrt(distanceSquared(enemy, enemy.target));
      const orbitDirection = enemy.id % 2 === 0 ? 1 : -1;
      const tangent = radialAngle + orbitDirection * Math.PI / 2;
      const radialError = (distance - ENEMY_BEHAVIOR_TUNING.coilerOrbitRadius) / ENEMY_BEHAVIOR_TUNING.coilerOrbitRadius;
      const correctionTarget = radialError >= 0 ? radialAngle : radialAngle + Math.PI;
      const correction = clamp(Math.abs(radialError) * ENEMY_BEHAVIOR_TUNING.coilerRadialCorrection, 0, 0.88);
      enemy.desiredAngle = tangent + angleDelta(tangent, correctionTarget) * correction;
      enemy.behaviorPhase = (gameTime * 0.25 + enemy.id * 0.17) % 1;
      return;
    }
    if (enemy.behaviorState === "escort") {
      let carrier = null;
      for (const candidate of enemies) {
        if (candidate === enemy || candidate.dead || candidate.captured <= 0) continue;
        if (!carrier || candidate.captured > carrier.captured) carrier = candidate;
      }
      if (carrier) {
        const side = enemy.id % 2 === 0 ? 1 : -1;
        const angle = carrier.angle + side * Math.PI / 2;
        const targetCol = carrier.col + Math.cos(angle) * ENEMY_BEHAVIOR_TUNING.wardenEscortDistance;
        const targetRow = carrier.row + Math.sin(angle) * ENEMY_BEHAVIOR_TUNING.wardenEscortDistance;
        enemy.desiredAngle = Math.atan2(targetRow - enemy.row, targetCol - enemy.col);
        enemy.behaviorPhase = clamp(carrier.captured / 8, 0, 1);
        return;
      }
    }
    if (enemy.target && activeFoods.has(enemy.target)) {
      const ideal = Math.atan2(enemy.target.row - enemy.row, enemy.target.col - enemy.col);
      const error = Math.sin(gameTime * 1.7 + enemy.wobble) * 0.42 + Math.sin(gameTime * 0.47 + enemy.id) * 0.2;
      enemy.desiredAngle = ideal + error;
      enemy.behaviorPhase = 0;
      return;
    }
    enemy.target = null;
    enemy.behaviorState = "roam";
    enemy.behaviorPhase = 0;
    enemy.desiredAngle += Math.sin(gameTime + enemy.wobble) * 0.05;
  }

  function updateChargerBehavior(enemy, dt) {
    enemy.chargeCooldown = Math.max(0, enemy.chargeCooldown - dt);
    if (enemy.behaviorState === "telegraph") {
      enemy.behaviorTimer -= dt;
      enemy.behaviorPhase = clamp(1 - enemy.behaviorTimer / ENEMY_BEHAVIOR_TUNING.chargerTelegraphDuration, 0, 1);
      enemy.desiredAngle = enemy.chargeAngle;
      enemy.angle = rotateToward(enemy.angle, enemy.chargeAngle, dt * enemy.turnRate * 1.8);
      if (enemy.behaviorTimer <= 0) {
        enemy.behaviorState = "charge";
        enemy.behaviorTimer = ENEMY_BEHAVIOR_TUNING.chargerChargeDuration;
        enemy.behaviorPhase = 0;
        enemy.angle = enemy.chargeAngle;
      }
      return 0.12;
    }
    if (enemy.behaviorState === "charge") {
      enemy.behaviorTimer -= dt;
      enemy.behaviorPhase = clamp(1 - enemy.behaviorTimer / ENEMY_BEHAVIOR_TUNING.chargerChargeDuration, 0, 1);
      enemy.angle = enemy.chargeAngle;
      enemy.desiredAngle = enemy.chargeAngle;
      if (enemy.behaviorTimer <= 0) {
        enemy.behaviorState = "roam";
        enemy.behaviorPhase = 0;
        enemy.chargeCooldown = ENEMY_BEHAVIOR_TUNING.chargerCooldown;
        enemy.think = 0;
        return 1;
      }
      return ENEMY_BEHAVIOR_TUNING.chargerChargeSpeedMultiplier;
    }
    if (enemy.chargeCooldown <= 0 && distanceSquared(enemy, player) <= ENEMY_BEHAVIOR_TUNING.chargerDetectionRange ** 2) {
      enemy.target = null;
      enemy.behaviorState = "telegraph";
      enemy.behaviorTimer = ENEMY_BEHAVIOR_TUNING.chargerTelegraphDuration;
      enemy.behaviorPhase = 0;
      enemy.chargeAngle = Math.atan2(player.row - enemy.row, player.col - enemy.col);
      enemy.desiredAngle = enemy.chargeAngle;
      return 0.12;
    }
    return 1;
  }

  function updateEnemies(dt) {
    const chronosMultiplier = Math.pow(MODULE_TUNING.chronos.enemySpeedMultiplierPerStack, moduleCount("chronos"));
    const timeSpeedMultiplier = Math.min(ENEMY_SPEED_MAX_MULTIPLIER, 1 + gameTime / 60 * ENEMY_SPEED_PER_MINUTE);
    const repulseRange = repulseRangePixels();
    const activeFoods = new Set(foods);
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      enemy.collisionCooldown = Math.max(0, enemy.collisionCooldown - dt);
      const behaviorSpeedMultiplier = enemy.archetype === "charger"
        ? updateChargerBehavior(enemy, dt)
        : 1;
      const steeringLocked = enemy.behaviorState === "telegraph" || enemy.behaviorState === "charge";
      if (enemy.collisionCooldown <= 0) {
        if (!steeringLocked) {
          enemy.think -= dt;
          if (enemy.think <= 0) {
            enemy.think = random(Math.min(ENEMY_THINK_INTERVAL_MIN, ENEMY_THINK_INTERVAL_MAX), Math.max(ENEMY_THINK_INTERVAL_MIN, ENEMY_THINK_INTERVAL_MAX));
            chooseEnemyIntent(enemy);
          }
          steerEnemy(enemy, activeFoods);
        }
        const wallDistance = 1.35;
        if (!steeringLocked && (enemy.col < arena.worldMin + wallDistance || enemy.col > arena.worldMax - wallDistance || enemy.row < arena.worldMin + wallDistance || enemy.row > arena.worldMax - wallDistance)) {
          const center = (arena.worldMin + arena.worldMax) / 2;
          enemy.desiredAngle = Math.atan2(center - enemy.row, center - enemy.col) + Math.sin(enemy.wobble) * 0.18;
        }

        const avoidance = steeringLocked ? null : playerBodyAvoidance(enemy);
        if (avoidance) enemy.desiredAngle += angleDelta(enemy.desiredAngle, avoidance.angle) * avoidance.strength;

        if (!steeringLocked && repulseRange > 0) {
          const distance = Math.sqrt(distanceSquared(player, enemy));
          if (distance < repulseRange) {
            const awayAngle = distance > 0.001
              ? Math.atan2(enemy.row - player.row, enemy.col - player.col)
              : enemy.angle + Math.PI;
            const proximity = 1 - distance / repulseRange;
            const steering = 0.38 + proximity * 0.44;
            enemy.desiredAngle += angleDelta(enemy.desiredAngle, awayAngle) * steering;
          }
        }

        if (!steeringLocked) enemy.angle = rotateToward(enemy.angle, enemy.desiredAngle, dt * enemy.turnRate);
      }
      const statusMultiplier = enemy.slow > 0 ? 0.55 : 1;
      const speed = enemy.speed * timeSpeedMultiplier * behaviorSpeedMultiplier * chronosMultiplier * statusMultiplier;
      const previousPosition = { col: enemy.col, row: enemy.row };
      const nextCol = enemy.col + (Math.cos(enemy.angle) * speed + enemy.knockbackX) * dt;
      const nextRow = enemy.row + (Math.sin(enemy.angle) * speed + enemy.knockbackY) * dt;
      let playerCollision = null;
      const protectedPlayer = player.invulnerable > 0;
      if ((protectedPlayer || player.collisionCooldown <= 0) && enemy.collisionCooldown <= 0) {
        const headProgress = sweptContactProgress(
          previousPosition,
          { col: nextCol, row: nextRow },
          player,
          (player.radius + enemy.radius) / arena.cellSize
        );
        if (headProgress !== null) playerCollision = protectedPlayer
          ? { kind: "protected", point: player, progress: headProgress }
          : { kind: "head", progress: headProgress };
      }
      for (const segment of player.segments) {
        if (protectedPlayer && enemy.collisionCooldown > 0) continue;
        const progress = sweptContactProgress(previousPosition, { col: nextCol, row: nextRow }, segment, 0.46);
        if (progress === null || (playerCollision && playerCollision.progress <= progress)) continue;
        playerCollision = protectedPlayer
          ? { kind: "protected", point: segment, progress }
          : { kind: "body", segment, progress };
      }
      if (playerCollision) {
        enemy.col = previousPosition.col + (nextCol - previousPosition.col) * playerCollision.progress;
        enemy.row = previousPosition.row + (nextRow - previousPosition.row) * playerCollision.progress;
        syncNodePosition(enemy);
        updateEnemyHitBounds(enemy);
        if (playerCollision.kind === "protected") {
          bounceEntity(
            enemy,
            enemy.col - playerCollision.point.col,
            enemy.row - playerCollision.point.row,
            player.playerColor || "#f3c600",
            0.54
          );
        } else if (playerCollision.kind === "body") {
          const thorns = moduleCount("thorns");
          const thornsReady = thorns > 0 && player.thornsCooldown <= 0;
          killEnemy(enemy);
          if (thornsReady) {
            triggerBodyIntercept(enemy, playerCollision.segment, thorns);
            player.thornsCooldown = moduleCooldownSeconds("thorns")
              * Math.pow(MODULE_TUNING.thorns.extraStackMultiplier, thorns - 1);
          }
        } else {
          let normalX = player.col - enemy.col;
          let normalY = player.row - enemy.row;
          if (Math.hypot(normalX, normalY) < 0.001) {
            normalX = Math.cos(player.angle) - Math.cos(enemy.angle);
            normalY = Math.sin(player.angle) - Math.sin(enemy.angle);
          }
          if (Math.hypot(normalX, normalY) < 0.001) {
            normalX = -Math.cos(player.angle);
            normalY = -Math.sin(player.angle);
          }
          const ram = moduleCount("ram");
          if (ram > 0 && player.ramCooldown <= 0) {
            damageEnemy(enemy, 1, enemy.x, enemy.y, MODULE_BY_ID.ram.color);
            player.ramCooldown = moduleCooldownSeconds("ram") * Math.pow(MODULE_TUNING.ram.extraStackMultiplier, ram - 1);
            effects.push({ type: "ring", x: player.x, y: player.y, color: MODULE_BY_ID.ram.color, life: 0.42, maxLife: 0.42, radius: 6, endRadius: arena.cellSize });
            playSkillSound("ram");
          }
          const impulseMultiplier = enemy.archetype === "warden" ? ENEMY_BEHAVIOR_TUNING.wardenKnockbackMultiplier : 1;
          bounceEntity(player, normalX, normalY, "#dffcff", 0.58, impulseMultiplier);
          if (!enemy.dead) bounceEntity(enemy, -normalX, -normalY, enemy.color, 0.54);
        }
        continue;
      }
      const wallNormal = wallBounceNormal(nextCol, nextRow);
      if (wallNormal) {
        enemy.col = clamp(nextCol, arena.worldMin, arena.worldMax);
        enemy.row = clamp(nextRow, arena.worldMin, arena.worldMax);
        bounceEntity(enemy, wallNormal.x, wallNormal.y, enemy.color, 0.54);
        continue;
      }
      enemy.col = nextCol;
      enemy.row = nextRow;
      applyKnockbackDecay(enemy, dt);
      syncNodePosition(enemy);
      followContinuousSegments(enemy.col, enemy.row, enemy.segments, 0.54);
      updateEnemyHitBounds(enemy);

      if (enemy.collisionCooldown <= 0) {
        const ownBodyHit = findSelfCollision(enemy, 0.48);
        if (ownBodyHit) {
          bounceEntity(enemy, enemy.col - ownBodyHit.col, enemy.row - ownBodyHit.row, enemy.color, 0.54);
          continue;
        }
      }

      for (let index = foods.length - 1; index >= 0; index -= 1) {
        const food = foods[index];
        let collector = Math.hypot(enemy.col - food.col, enemy.row - food.row) <= 0.4 ? enemy : null;
        if (!collector) {
          collector = enemy.segments.find((segment) => Math.hypot(segment.col - food.col, segment.row - food.row) <= 0.4) || null;
        }
        if (!collector) continue;
        foods.splice(index, 1);
        activeFoods.delete(food);
        enemy.captured += 1;
        enemy.target = null;
        if (enemy.archetype === "courier" && enemy.captured >= ENEMY_BEHAVIOR_TUNING.courierCarryThreshold) {
          enemy.behaviorState = "flee";
          enemy.think = 0;
        }
        burst(collector.x, collector.y, enemy.color, 5, 55);
        effects.push({ type: "text", x: collector.x, y: collector.y - arena.cellSize * 0.4, text: `×${enemy.captured}`, color: enemy.color, life: 0.55, maxLife: 0.55 });
        break;
      }

    }
    resolveEnemyCollisions();
    retainInPlace(enemies, (enemy) => !enemy.dead);
  }

  function updateEnemyHitBounds(enemy) {
    let minX = enemy.x;
    let maxX = enemy.x;
    let minY = enemy.y;
    let maxY = enemy.y;
    for (const segment of enemy.segments) {
      minX = Math.min(minX, segment.x);
      maxX = Math.max(maxX, segment.x);
      minY = Math.min(minY, segment.y);
      maxY = Math.max(maxY, segment.y);
    }
    enemy.hitBounds = { minX, maxX, minY, maxY };
  }

  function pointHitsEnemy(x, y, radius, enemy) {
    const bounds = enemy.hitBounds;
    const segmentRadius = 9 * arenaVisualScale();
    const broadPadding = radius + Math.max(enemy.radius, segmentRadius);
    if (
      bounds
      && (
        x < bounds.minX - broadPadding
        || x > bounds.maxX + broadPadding
        || y < bounds.minY - broadPadding
        || y > bounds.maxY + broadPadding
      )
    ) return false;
    const hitRadius = radius + enemy.radius;
    if ((enemy.x - x) ** 2 + (enemy.y - y) ** 2 < hitRadius * hitRadius) return true;
    for (const segment of enemy.segments) {
      const hitSegmentRadius = radius + segmentRadius;
      if ((segment.x - x) ** 2 + (segment.y - y) ** 2 < hitSegmentRadius * hitSegmentRadius) return true;
    }
    return false;
  }

  function explodeProjectile(projectile) {
    effects.push({ type: "ring", x: projectile.x, y: projectile.y, color: projectile.color, life: 0.52, maxLife: 0.52, radius: 7, endRadius: projectile.blastRadius });
    burst(projectile.x, projectile.y, projectile.color, 20, 165);
    for (const enemy of enemies) {
      if (!enemy.dead && pointHitsEnemy(projectile.x, projectile.y, projectile.blastRadius, enemy)) {
        damageEnemy(enemy, 1, enemy.x, enemy.y, projectile.color);
      }
    }
    shake = Math.max(shake, 5);
  }

  function expireProjectile(projectile) {
    const x = clamp(projectile.x, arena.left, arena.right);
    const y = clamp(projectile.y, arena.top, arena.bottom);
    effects.push({
      type: "ring",
      x,
      y,
      color: projectile.color,
      life: 0.26,
      maxLife: 0.26,
      radius: Math.max(2, projectile.size * 0.65),
      endRadius: Math.max(9, projectile.size * 2.4)
    });
    burst(x, y, projectile.color, 4, 55);
  }

  function updateProjectiles(dt) {
    for (const projectile of projectiles) {
      projectile.life -= dt;
      let endedByImpact = false;
      if (projectile.homing && projectile.target && !projectile.target.dead) {
        const current = Math.atan2(projectile.vy, projectile.vx);
        const target = Math.atan2(projectile.target.y - projectile.y, projectile.target.x - projectile.x);
        const angle = rotateToward(current, target, projectile.homing * dt);
        projectile.vx = Math.cos(angle) * projectile.speed;
        projectile.vy = Math.sin(angle) * projectile.speed;
      }
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;

      const hitHorizontalWall = projectile.x < arena.left || projectile.x > arena.right;
      const hitVerticalWall = projectile.y < arena.top || projectile.y > arena.bottom;
      if (hitHorizontalWall || hitVerticalWall) {
        if ((projectile.bounces || 0) > 0) {
          projectile.x = clamp(projectile.x, arena.left, arena.right);
          projectile.y = clamp(projectile.y, arena.top, arena.bottom);
          if (hitHorizontalWall) projectile.vx *= -1;
          if (hitVerticalWall) projectile.vy *= -1;
          projectile.bounces -= 1;
          projectile.target = null;
        } else {
          projectile.life = 0;
        }
      }

      for (const enemy of enemies) {
        if (enemy.dead) continue;
        if (projectile.hitIds?.includes(enemy.id)) continue;
        if (pointHitsEnemy(projectile.x, projectile.y, projectile.size, enemy)) {
          if (projectile.blastRadius) {
            explodeProjectile(projectile);
            projectile.life = 0;
            endedByImpact = true;
            break;
          }
          damageEnemy(enemy, 1, projectile.x, projectile.y, projectile.color);
          projectile.hitIds?.push(enemy.id);
          if (projectile.slow) enemy.slow = Math.max(enemy.slow, projectile.slow);
          if (projectile.poison) {
            enemy.poisonTicks += projectile.poison;
            enemy.poisonTimer = 0.7 * ATTACK_INTERVAL_SCALE;
            enemy.poisonColor = projectile.color;
          }
          if (projectile.pierce > 0) projectile.pierce -= 1;
          else {
            projectile.life = 0;
            endedByImpact = true;
            break;
          }
        }
      }
      if (projectile.life <= 0 && !endedByImpact) expireProjectile(projectile);
    }
    retainInPlace(projectiles, (projectile) => projectile.life > 0 && projectile.x >= arena.left && projectile.x <= arena.right && projectile.y >= arena.top && projectile.y <= arena.bottom);
  }

  function updateHazards(dt) {
    for (const hazard of hazards) {
      hazard.life -= dt;
      hazard.phase += dt * 4;

      if (hazard.kind === "gravity") {
        for (const enemy of enemies) {
          if (enemy.dead) continue;
          const dx = hazard.x - enemy.x;
          const dy = hazard.y - enemy.y;
          const distance = Math.hypot(dx, dy);
          if (distance <= 0.001 || distance >= hazard.radius) continue;
          const pull = 0.5 * (1 - distance / hazard.radius) * dt;
          enemy.col += dx / distance * pull;
          enemy.row += dy / distance * pull;
          enemy.slow = Math.max(enemy.slow, 0.2);
          syncNodePosition(enemy);
          followContinuousSegments(enemy.col, enemy.row, enemy.segments, 0.54);
        }
        continue;
      }

      hazard.arm -= dt;
      if (hazard.arm > 0) continue;
      const enemyTrigger = nearestEnemy(hazard, hazard.radius);
      const playerTrigger = Math.hypot(player.x - hazard.x, player.y - hazard.y) < player.radius + 6 * arenaVisualScale();
      if (!enemyTrigger && !playerTrigger) continue;
      effects.push({ type: "ring", x: hazard.x, y: hazard.y, color: hazard.color, life: 0.5, maxLife: 0.5, radius: 10, endRadius: hazard.radius });
      burst(hazard.x, hazard.y, hazard.color, 18, 150);
      for (const enemy of enemies) {
        if (!enemy.dead && pointHitsEnemy(hazard.x, hazard.y, hazard.radius, enemy)) damageEnemy(enemy, 1, enemy.x, enemy.y, hazard.color);
      }
      if (playerTrigger) bounceEntity(player, player.x - hazard.x, player.y - hazard.y, hazard.color, 0.58);
      hazard.life = 0;
      sound("mine");
      shake = Math.max(shake, 5);
    }
    retainInPlace(hazards, (hazard) => hazard.life > 0);
  }

  function damageEnemy(enemy, amount, x, y, color) {
    if (!enemy || enemy.dead) return;
    const impactX = Number.isFinite(x) ? x : enemy.x;
    const impactY = Number.isFinite(y) ? y : enemy.y;
    const impactColor = color || enemy.color || "#ffffff";
    let appliedDamage = 0;
    let destroysHead = false;
    for (let index = 0; index < amount; index += 1) {
      appliedDamage += 1;
      if (!enemy.segments.length) {
        destroysHead = true;
        break;
      }
      const removed = enemy.segments.pop();
      burst(removed.x, removed.y, impactColor, 7, 95);

      const salvageChance = Math.min(
        MODULE_TUNING.salvage.maxChance,
        moduleCount("salvage") * MODULE_TUNING.salvage.chancePerStack
      );
      if (salvageChance > 0 && Math.random() < salvageChance) spawnFood(removed.x + random(-10, 10), removed.y + random(-10, 10), true);
    }
    burst(impactX, impactY, impactColor, 8, 115);
    effects.push({ type: "ring", x: impactX, y: impactY, color: impactColor, life: 0.34, maxLife: 0.34, radius: 3, endRadius: 16 });
    effects.push({ type: "text", x: impactX, y: impactY - 12, text: `-${appliedDamage}`, color: impactColor, life: 0.62, maxLife: 0.62 });
    sound("hit");
    shake = Math.max(shake, 2.2);
    if (destroysHead) killEnemy(enemy);
  }

  function killEnemy(enemy) {
    if (!enemy || enemy.dead) return;
    enemy.dead = true;
    const dropOccupied = occupiedCellKeys();
    kills += 1;
    score += 100 + enemy.captured * 25;
    playEnemyDeathPresentation(enemy, enemy.segments, enemy.color, { playSound: true, rewardSelf: true });
    spawnFood(enemy.x, enemy.y, false, dropOccupied);

    const cache = moduleCount("cache");
    if (cache > 0) {
      player.cacheKills += 1;
      const cacheThreshold = Math.max(
        MODULE_TUNING.cache.minimumKills,
        MODULE_TUNING.cache.baseKills - cache * MODULE_TUNING.cache.killsReducedPerStack
      );
      if (player.cacheKills >= cacheThreshold) {
        player.cacheKills = 0;
        spawnFood(enemy.x, enemy.y, true, dropOccupied);
        effects.push({ type: "ring", x: enemy.x, y: enemy.y, color: MODULE_BY_ID.cache.color, life: 0.65, maxLife: 0.65, radius: 8, endRadius: arena.cellSize });
      }
    }

    const bloom = moduleCount("bloom");
    if (bloom > 0 && player.bloomCooldown <= 0) {
      spawnFood(enemy.x, enemy.y, true, dropOccupied);
      player.bloomCooldown = moduleCooldownSeconds("bloom") * Math.pow(MODULE_TUNING.bloom.extraStackMultiplier, bloom - 1);
    }

    let dropCount = enemy.captured;
    enemy.captured = 0;
    const fortuneChance = Math.min(
      MODULE_TUNING.fortune.maxChance,
      moduleCount("fortune") * MODULE_TUNING.fortune.chancePerStack
    );
    if (Math.random() < fortuneChance) {
      dropCount += 1 + Math.floor(moduleCount("fortune") / MODULE_TUNING.fortune.extraDropEveryStacks);
    }
    for (let index = 0; index < dropCount; index += 1) {
      const angle = index * 2.4 + random(-0.25, 0.25);
      const distance = 22 + Math.sqrt(index + 1) * 12;
      spawnFood(enemy.x + Math.cos(angle) * distance, enemy.y + Math.sin(angle) * distance, true, dropOccupied);
    }
    updateHud();
  }

  function playEnemyDeathParticles(head, segments, color) {
    for (const segment of segments || []) {
      burst(segment.x, segment.y, color, ENEMY_DEATH_BODY_PARTICLES, ENEMY_DEATH_BODY_PARTICLE_SPEED);
    }
    burst(head.x, head.y, color, ENEMY_DEATH_HEAD_PARTICLES, ENEMY_DEATH_HEAD_PARTICLE_SPEED);
  }

  function playEnemyDeathPresentation(head, segments, color, options = {}) {
    playEnemyDeathParticles(head, segments, color);
    effects.push({ type: "ring", x: head.x, y: head.y, color, life: 0.72, maxLife: 0.72, radius: 12, endRadius: 88 });
    effects.push({ type: "ring", x: head.x, y: head.y, color: "#ffffff", life: 0.42, maxLife: 0.42, radius: 7, endRadius: 52 });
    effects.push({ type: "text", x: head.x, y: head.y - 22, text: "击破", color: "#ffffff", life: 1.05, maxLife: 1.05, emphasis: true });
    if (options.playSound) sound("kill", 0, options.soundSourceEntityId);
    if (options.rewardSelf) shake = Math.max(shake, 7);
  }

  function consumeDefense(enemy = null) {
    const armor = moduleCount("armor");
    const shield = player.segments.find((segment) => segment.module === "shield" && segment.ready);
    const phase = player.segments.find((segment) => segment.module === "phase" && segment.ready);
    const defense = shield || phase;
    if (!defense) return false;

    defense.ready = false;
    const baseCooldown = moduleCooldownSeconds(defense.module);
    defense.cooldown = baseCooldown * Math.pow(MODULE_TUNING.armor.cooldownMultiplierPerStack, armor);
    player.invulnerable = defense.module === "phase" ? 1.55 : 1.05;
    sound("shield");
    effects.push({ type: "ring", x: player.x, y: player.y, color: MODULE_BY_ID[defense.module].color, life: 0.7, maxLife: 0.7, radius: 18, endRadius: 76 });
    burst(player.x, player.y, MODULE_BY_ID[defense.module].color, 18, 130);
    return true;
  }

  function checkPlayerCollisions() {
    if (state !== "running") return;
    const wallNormal = wallBounceNormal(player.col, player.row);
    if (wallNormal) {
      player.col = clamp(player.col, arena.worldMin, arena.worldMax);
      player.row = clamp(player.row, arena.worldMin, arena.worldMax);
      bounceEntity(player, wallNormal.x, wallNormal.y, "#b8f53f", 0.58);
      return;
    }

    if (player.collisionCooldown <= 0) {
      const ownBodyHit = findSelfCollision(player, 0.5);
      if (ownBodyHit) {
        bounceEntity(player, player.col - ownBodyHit.col, player.row - ownBodyHit.row, "#f4ffdc", 0.58);
        return;
      }
    }

    if (player.invulnerable <= 0) {
      for (const enemy of enemies) {
        if (enemy.dead) continue;
        for (const segment of enemy.segments) {
          if (Math.hypot(player.col - segment.col, player.row - segment.row) < 0.42) {
            if (consumeDefense(enemy)) damageEnemy(enemy, 1, segment.x, segment.y, "#ffffff");
            else gameOver();
            return;
          }
        }
      }
    }

    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const headHitDistance = (player.radius + enemy.radius) / arena.cellSize;
      if (Math.hypot(player.col - enemy.col, player.row - enemy.row) >= headHitDistance) continue;
      if (player.collisionCooldown > 0 || enemy.collisionCooldown > 0) return;

      let normalX = player.col - enemy.col;
      let normalY = player.row - enemy.row;
      if (Math.hypot(normalX, normalY) < 0.001) {
        normalX = Math.cos(player.angle) - Math.cos(enemy.angle);
        normalY = Math.sin(player.angle) - Math.sin(enemy.angle);
      }
      if (Math.hypot(normalX, normalY) < 0.001) {
        normalX = -Math.cos(player.angle);
        normalY = -Math.sin(player.angle);
      }

      const ram = moduleCount("ram");
      if (ram > 0 && player.ramCooldown <= 0) {
        damageEnemy(enemy, 1, enemy.x, enemy.y, MODULE_BY_ID.ram.color);
        player.ramCooldown = moduleCooldownSeconds("ram") * Math.pow(MODULE_TUNING.ram.extraStackMultiplier, ram - 1);
        effects.push({ type: "ring", x: player.x, y: player.y, color: MODULE_BY_ID.ram.color, life: 0.42, maxLife: 0.42, radius: 6, endRadius: arena.cellSize });
        playSkillSound("ram");
      }

      const impulseMultiplier = enemy.archetype === "warden" ? ENEMY_BEHAVIOR_TUNING.wardenKnockbackMultiplier : 1;
      bounceEntity(player, normalX, normalY, "#dffcff", 0.58, impulseMultiplier);
      if (!enemy.dead) bounceEntity(enemy, -normalX, -normalY, enemy.color, 0.54);
      return;
    }
  }

  function burst(x, y, color, count, speed) {
    if (particles.length === 0) nextParticleSlot = 0;
    const scale = arenaVisualScale();
    for (let index = 0; index < count; index += 1) {
      const angle = random(0, TAU);
      const velocity = random(speed * 0.25, speed) * scale;
      const life = random(0.25, 0.75);
      const particle = {
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life,
        maxLife: life,
        color,
        size: random(1.4, 3.6) * scale
      };
      if (particles.length < MAX_DECORATIVE_PARTICLES) particles.push(particle);
      else {
        particles[nextParticleSlot] = particle;
        nextParticleSlot = (nextParticleSlot + 1) % MAX_DECORATIVE_PARTICLES;
      }
    }
  }

  function updateEffects(dt) {
    for (const particle of particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.pow(0.04, dt);
      particle.vy *= Math.pow(0.04, dt);
    }
    retainInPlace(particles, (particle) => particle.life > 0);
    if (particles.length < MAX_DECORATIVE_PARTICLES) nextParticleSlot %= Math.max(1, particles.length);

    for (const effect of effects) effect.life -= dt;
    retainInPlace(effects, (effect) => effect.life > 0);
    if (effects.length > MAX_DECORATIVE_EFFECTS) effects.splice(0, effects.length - MAX_DECORATIVE_EFFECTS);
    shake = Math.max(0, shake - dt * 28);
    flash = Math.max(0, flash - dt * 2.5);
  }

  function update(dt) {
    if (network.enabled) {
      updateNetwork(dt);
      return;
    }
    if (state !== "running") {
      if (state === "upgrade" && player) updateSegmentBirthAnimations(dt);
      updateEffects(dt);
      return;
    }

    const transitionActive = upgradePending && upgradeRevealTimer > 0;
    const worldDt = transitionActive ? dt * LEVEL_UP_TIME_SCALE : dt;
    updateArenaWorldSize(worldDt, level);

    gameTime += worldDt;
    score += worldDt * (3 + level * 0.35);
    updateGrowthAnimation(worldDt, dt);
    if (state !== "running") {
      updateEffects(dt);
      updateHud();
      return;
    }
    updateEnemySpawnWarnings(worldDt);
    updateSpawns(worldDt);
    updateInput(worldDt);
    movePlayer(worldDt);
    updateFood(worldDt);
    if (state !== "running") return;
    updateHeadWeapon(worldDt);
    updateModules(worldDt);
    updateEnemies(worldDt);
    updateProjectiles(worldDt);
    updateHazards(worldDt);
    checkPlayerCollisions();
    updateEffects(dt);
    updateHud();
  }

  function renderAmbientLayer(time) {
    const layerWidth = ambientCanvas.width;
    const layerHeight = ambientCanvas.height;
    ambientCtx.fillStyle = "#07090a";
    ambientCtx.fillRect(0, 0, layerWidth, layerHeight);

    ambientCtx.save();
    ambientCtx.globalAlpha = 0.46;
    ambientCtx.fillStyle = "#14191c";
    ambientCtx.beginPath();
    ambientCtx.moveTo(0, layerHeight * 0.18);
    ambientCtx.lineTo(layerWidth * 0.28, 0);
    ambientCtx.lineTo(layerWidth * 0.44, 0);
    ambientCtx.lineTo(0, layerHeight * 0.34);
    ambientCtx.closePath();
    ambientCtx.fill();
    ambientCtx.fillStyle = "#202529";
    ambientCtx.beginPath();
    ambientCtx.moveTo(layerWidth, layerHeight * 0.7);
    ambientCtx.lineTo(layerWidth * 0.72, layerHeight);
    ambientCtx.lineTo(layerWidth * 0.58, layerHeight);
    ambientCtx.lineTo(layerWidth, layerHeight * 0.56);
    ambientCtx.closePath();
    ambientCtx.fill();
    ambientCtx.restore();

    const sweepX = (time * 15) % (layerWidth + 240) - 120;
    const sweepGradient = ambientCtx.createLinearGradient(sweepX - 90, 0, sweepX + 90, 0);
    sweepGradient.addColorStop(0, "rgba(8, 199, 220, 0)");
    sweepGradient.addColorStop(0.48, "rgba(8, 199, 220, 0.055)");
    sweepGradient.addColorStop(0.5, "rgba(243, 198, 0, 0.09)");
    sweepGradient.addColorStop(0.52, "rgba(8, 199, 220, 0.055)");
    sweepGradient.addColorStop(1, "rgba(8, 199, 220, 0)");
    ambientCtx.save();
    ambientCtx.fillStyle = sweepGradient;
    ambientCtx.transform(1, 0, -0.24, 1, 0, 0);
    ambientCtx.fillRect(sweepX - 90, 0, 180, layerHeight);
    ambientCtx.restore();

    ambientCtx.save();
    ambientCtx.lineWidth = 0.75;
    for (let path = 0; path < 8; path += 1) {
      ambientCtx.beginPath();
      for (let point = 0; point <= 8; point += 1) {
        const x = point / 8 * layerWidth;
        const baseY = layerHeight * (0.1 + path * 0.115);
        const y = baseY
          + Math.sin(point * 1.83 + path * 2.17 + time * (0.08 + path * 0.006)) * layerHeight * 0.018
          + Math.sin(point * 0.41 - time * 0.05 + path) * layerHeight * 0.011;
        if (point === 0) ambientCtx.moveTo(x, y);
        else ambientCtx.lineTo(x, y);
      }
      ambientCtx.strokeStyle = path % 3 === 0 ? "rgba(8, 199, 220, 0.12)" : "rgba(231, 235, 235, 0.055)";
      ambientCtx.stroke();
    }
    ambientCtx.restore();

    for (const node of ambientNodes) {
      node.renderX = fract(node.x + time * node.speed + Math.sin(time * 0.09 + node.phase) * 0.009) * layerWidth;
      node.renderY = clamp(node.y + Math.sin(time * 0.13 + node.phase) * 0.027, 0.025, 0.975) * layerHeight;
    }
    const connectionDistance = Math.min(layerWidth, layerHeight) * 0.24;
    ambientCtx.lineWidth = 0.65;
    for (let first = 0; first < ambientNodes.length; first += 1) {
      for (let second = first + 1; second < ambientNodes.length; second += 1) {
        const dx = ambientNodes[first].renderX - ambientNodes[second].renderX;
        const dy = ambientNodes[first].renderY - ambientNodes[second].renderY;
        const distance = Math.hypot(dx, dy);
        if (distance >= connectionDistance) continue;
        const alpha = (1 - distance / connectionDistance) * 0.15;
        ambientCtx.strokeStyle = `rgba(8, 199, 220, ${alpha.toFixed(3)})`;
        ambientCtx.beginPath();
        ambientCtx.moveTo(ambientNodes[first].renderX, ambientNodes[first].renderY);
        ambientCtx.lineTo(ambientNodes[second].renderX, ambientNodes[second].renderY);
        ambientCtx.stroke();
      }
    }

    for (let index = 0; index < ambientNodes.length; index += 1) {
      const node = ambientNodes[index];
      const pulse = 0.55 + Math.sin(time * 1.2 + node.phase) * 0.25;
      ambientCtx.globalAlpha = pulse;
      ambientCtx.fillStyle = node.color;
      if (index % 5 === 0) {
        ambientCtx.fillRect(node.renderX - 5, node.renderY - 0.75, 10, 1.5);
        ambientCtx.fillRect(node.renderX - 0.75, node.renderY - 5, 1.5, 10);
      } else {
        ambientCtx.fillRect(node.renderX - 1.25, node.renderY - 1.25, 2.5, 2.5);
      }
    }
    ambientCtx.globalAlpha = 1;
    lastAmbientRender = time;
  }

  function drawBackground(time) {
    if (time - lastAmbientRender >= AMBIENT_RENDER_INTERVAL) renderAmbientLayer(time);
    ctx.drawImage(ambientCanvas, 0, 0, ambientCanvas.width, ambientCanvas.height, 0, 0, width, height);

    ctx.save();
    applyArenaPerspectiveTransform();
    ctx.drawImage(
      arenaShadowCanvas,
      0,
      0,
      arenaShadowCanvas.width,
      arenaShadowCanvas.height,
      arena.left - ARENA_SHADOW_PADDING,
      arena.top - ARENA_SHADOW_PADDING,
      arena.width + ARENA_SHADOW_PADDING * 2,
      arena.height + ARENA_SHADOW_PADDING * 2
    );
    ctx.beginPath();
    ctx.rect(arena.left, arena.top, arena.width, arena.height);
    ctx.clip();
    applyCameraTransform();
    ctx.drawImage(
      arenaTextureCanvas,
      0,
      0,
      arenaTextureCanvas.width,
      arenaTextureCanvas.height,
      arena.left,
      arena.top,
      arena.width,
      arena.height
    );

    drawArenaFloorPattern();

    ctx.fillStyle = "rgba(243, 198, 0, 0.055)";
    const stripePhase = (time * arena.cellSize * 0.12) % (arena.cellSize * 3);
    for (let index = -Math.ceil(arena.worldSize); index < Math.ceil(arena.worldSize) * 2; index += 3) {
      const offset = index * arena.cellSize + stripePhase;
      ctx.save();
      ctx.translate(arena.left + offset, arena.top);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(0, -arena.cellSize * 0.08, arena.width * 1.45, arena.cellSize * 0.08);
      ctx.restore();
    }

    const scanY = arena.top + (time * 0.045 % 1) * arena.height;
    const scanGradient = ctx.createLinearGradient(0, scanY - arena.cellSize * 1.4, 0, scanY + arena.cellSize * 1.4);
    scanGradient.addColorStop(0, "rgba(8, 199, 220, 0)");
    scanGradient.addColorStop(0.5, "rgba(8, 199, 220, 0.045)");
    scanGradient.addColorStop(1, "rgba(8, 199, 220, 0)");
    ctx.fillStyle = scanGradient;
    ctx.fillRect(arena.left, scanY - arena.cellSize * 1.4, arena.width, arena.cellSize * 2.8);

    ctx.restore();

    ctx.save();
    applyArenaPerspectiveTransform();
    ctx.beginPath();
    ctx.rect(arena.left, arena.top, arena.width, arena.height);
    ctx.clip();
    applyCameraTransform();
    ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
    ctx.shadowBlur = 8;
    ctx.strokeStyle = "rgba(239, 242, 242, 0.6)";
    ctx.lineWidth = 1 / CAMERA_ZOOM;
    ctx.strokeRect(arena.left + 0.5, arena.top + 0.5, arena.width - 1, arena.height - 1);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#f3c600";
    ctx.lineWidth = 3 / CAMERA_ZOOM;
    const mark = Math.max(16, arena.cellSize * 0.8);
    ctx.beginPath();
    ctx.moveTo(arena.left, arena.top + mark);
    ctx.lineTo(arena.left, arena.top);
    ctx.lineTo(arena.left + mark, arena.top);
    ctx.moveTo(arena.right - mark, arena.top);
    ctx.lineTo(arena.right, arena.top);
    ctx.lineTo(arena.right, arena.top + mark * 0.45);
    ctx.moveTo(arena.left, arena.bottom - mark * 0.45);
    ctx.lineTo(arena.left, arena.bottom);
    ctx.lineTo(arena.left + mark, arena.bottom);
    ctx.moveTo(arena.right - mark, arena.bottom);
    ctx.lineTo(arena.right, arena.bottom);
    ctx.lineTo(arena.right, arena.bottom - mark);
    ctx.stroke();

    ctx.fillStyle = "#f3c600";
    ctx.fillRect(arena.left, arena.top, mark * 0.58, 4);
    ctx.fillStyle = "#08c7dc";
    ctx.fillRect(arena.right - mark * 0.45, arena.bottom - 4, mark * 0.45, 4);
    ctx.fillStyle = "rgba(239, 242, 242, 0.82)";
    ctx.fillRect(arena.left, arena.bottom - 3, arena.width, 3);
    ctx.fillStyle = "#f3c600";
    ctx.fillRect(arena.left, arena.bottom - 3, arena.width * 0.28, 3);
    ctx.fillStyle = "#08c7dc";
    ctx.fillRect(arena.right - arena.width * 0.16, arena.bottom - 3, arena.width * 0.16, 3);
    ctx.restore();
  }

  function drawArenaFloorPattern() {
    const firstLine = Math.floor(arena.worldMin);
    const lastLine = Math.ceil(arena.worldMax + 1);
    for (let index = firstLine; index <= lastLine; index += 1) {
      const offset = arena.left + (index - arena.worldMin) * arena.cellSize;
      const major = ((index % 6) + 6) % 6 === 0;
      ctx.beginPath();
      ctx.moveTo(offset, arena.top);
      ctx.lineTo(offset, arena.bottom);
      ctx.moveTo(arena.left, offset - arena.left + arena.top);
      ctx.lineTo(arena.right, offset - arena.left + arena.top);
      ctx.lineWidth = major ? 1.35 : 0.7;
      ctx.strokeStyle = major ? "rgba(231, 235, 235, 0.18)" : "rgba(198, 205, 207, 0.065)";
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(235, 238, 238, 0.35)";
    ctx.font = `700 ${Math.max(7, arena.cellSize * 0.23)}px Bahnschrift, Arial Narrow, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    for (let index = firstLine; index < lastLine; index += 1) {
      if (((index % 4) + 4) % 4 !== 0) continue;
      const offset = (index - arena.worldMin) * arena.cellSize;
      const label = String(((index % 100) + 100) % 100 + 1).padStart(2, "0");
      ctx.fillText(label, arena.left + offset + 3, arena.top + 3);
      ctx.save();
      ctx.translate(arena.left + 3, arena.top + offset + arena.cellSize - 3);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }

    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.fillRect(arena.left, arena.top, arena.width, arena.cellSize * 0.18);
    ctx.fillRect(arena.left, arena.bottom - arena.cellSize * 0.18, arena.width, arena.cellSize * 0.18);
  }

  function drawFood(time) {
    for (const food of foods) {
      if (food.networkHidden) continue;
      const pulse = 1 + Math.sin(time * 5 + food.phase) * 0.08;
      ctx.save();
      if (food.isPulled) {
        const pullTarget = network.enabled
          ? visiblePlayers.reduce((nearest, candidate) => !nearest || distanceSquared(candidate, food) < distanceSquared(nearest, food) ? candidate : nearest, null)
          : player;
        if (pullTarget) {
        ctx.globalAlpha = 0.45 + Math.sin(time * 12 + food.phase) * 0.12;
        ctx.strokeStyle = MODULE_BY_ID.tractor.color;
        ctx.lineWidth = Math.max(1, arena.cellSize * 0.045);
        ctx.setLineDash([arena.cellSize * 0.2, arena.cellSize * 0.12]);
        ctx.beginPath();
        ctx.moveTo(food.x, food.y);
        ctx.lineTo(pullTarget.x, pullTarget.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        }
      }
      ctx.translate(food.x, food.y);
      ctx.scale(pulse, pulse);
      ctx.rotate(Math.PI / 4 + Math.sin(time * 1.6 + food.phase) * 0.08);
      ctx.shadowColor = food.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#111518";
      ctx.strokeStyle = food.color;
      ctx.lineWidth = Math.max(1, food.radius * 0.34);
      const outer = food.radius * 1.52;
      ctx.fillRect(-outer, -outer, outer * 2, outer * 2);
      ctx.strokeRect(-outer, -outer, outer * 2, outer * 2);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = food.color;
      ctx.beginPath();
      ctx.arc(0, 0, food.radius * 0.82, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#f4f6f5";
      ctx.fillRect(-food.radius * 0.18, -food.radius * 0.62, food.radius * 0.36, food.radius * 1.24);
      ctx.fillRect(-food.radius * 0.62, -food.radius * 0.18, food.radius * 1.24, food.radius * 0.36);
      ctx.restore();
    }
  }

  function drawEnemySpawnWarnings(time) {
    const warningColor = "#ff3d5d";
    const blink = 0.48 + Math.abs(Math.sin(time * 12)) * 0.52;
    for (const spawn of pendingEnemySpawns) {
      const progress = 1 - clamp(spawn.timer / spawn.maxTimer, 0, 1);
      const head = cellCenter(spawn.headCell.col, spawn.headCell.row);
      const markerSize = arena.cellSize * 0.28;

      ctx.save();
      ctx.globalAlpha = 0.3 + blink * 0.48;
      ctx.strokeStyle = warningColor;
      ctx.lineCap = "round";
      ctx.setLineDash([arena.cellSize * 0.12, arena.cellSize * 0.13]);
      ctx.lineWidth = Math.max(1, arena.cellSize * 0.045);
      ctx.beginPath();
      ctx.moveTo(head.x, head.y);
      for (const cell of spawn.bodyCells) {
        const x = arena.left + (cell.col - arena.worldMin + 0.5) * arena.cellSize;
        const y = arena.top + (cell.row - arena.worldMin + 0.5) * arena.cellSize;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      const size = markerSize * 0.52;
      ctx.globalAlpha = 0.24 + blink * 0.3;
      ctx.beginPath();
      for (const cell of spawn.bodyCells) {
        const x = arena.left + (cell.col - arena.worldMin + 0.5) * arena.cellSize;
        const y = arena.top + (cell.row - arena.worldMin + 0.5) * arena.cellSize;
        ctx.moveTo(x - size, y - size);
        ctx.lineTo(x + size, y + size);
        ctx.moveTo(x + size, y - size);
        ctx.lineTo(x - size, y + size);
      }
      ctx.stroke();

      const ringRadius = arena.cellSize * (0.68 - progress * 0.28);
      ctx.globalAlpha = 0.28 + blink * 0.52;
      ctx.fillStyle = "rgba(255, 61, 93, 0.12)";
      ctx.shadowColor = warningColor;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(head.x, head.y, ringRadius, 0, TAU);
      ctx.fill();
      ctx.stroke();

      ctx.globalAlpha = 0.65 + blink * 0.35;
      ctx.lineWidth = Math.max(2, arena.cellSize * 0.09);
      ctx.beginPath();
      ctx.moveTo(head.x - markerSize, head.y - markerSize);
      ctx.lineTo(head.x + markerSize, head.y + markerSize);
      ctx.moveTo(head.x + markerSize, head.y - markerSize);
      ctx.lineTo(head.x - markerSize, head.y + markerSize);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.globalAlpha = 0.72 + blink * 0.28;
      ctx.fillStyle = "#ffffff";
      ctx.font = `900 ${Math.max(10, arena.cellSize * 0.38)}px Bahnschrift, Arial Narrow, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(ENEMY_ARCHETYPE_GLYPHS[spawn.archetype] || "!", head.x, head.y);
      ctx.restore();
    }
  }

  function drawLink(from, to, color, widthValue, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = "round";
    ctx.lineWidth = widthValue;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  }

  function drawLinkedPath(head, segments, color, widthValue, alpha = 1) {
    if (segments.length === 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = widthValue;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(head.x, head.y);
    for (const segment of segments) ctx.lineTo(segment.x, segment.y);
    ctx.stroke();
    ctx.restore();
  }

  function drawEnemyBehaviorCue(enemy, pieceScale) {
    if (enemy.archetype !== "charger" || (enemy.behaviorState !== "telegraph" && enemy.behaviorState !== "charge")) return;
    const charging = enemy.behaviorState === "charge";
    const pulse = 0.45 + Math.abs(Math.sin(visualTime * 18)) * 0.55;
    const directionX = Math.cos(enemy.angle);
    const directionY = Math.sin(enemy.angle);
    const lineLength = Math.min(arena.worldSize * 0.55, ENEMY_BEHAVIOR_TUNING.chargerDetectionRange) * arena.cellSize;
    ctx.save();
    ctx.globalAlpha = charging ? 0.7 : 0.25 + pulse * 0.45;
    ctx.strokeStyle = charging ? "#ffffff" : enemy.color;
    ctx.lineWidth = Math.max(2, 2.5 * pieceScale);
    ctx.setLineDash(charging ? [] : [10 * pieceScale, 8 * pieceScale]);
    ctx.lineDashOffset = -visualTime * 38;
    ctx.beginPath();
    ctx.moveTo(enemy.x + directionX * 16 * pieceScale, enemy.y + directionY * 16 * pieceScale);
    ctx.lineTo(enemy.x + directionX * lineLength, enemy.y + directionY * lineLength);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "#ffffff";
    ctx.globalAlpha = charging ? 0.72 : 0.3 + pulse * 0.5;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, (20 + (1 - enemy.behaviorPhase) * 12) * pieceScale, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function drawEnemySegment(enemy, segment, pieceScale) {
    ctx.save();
    ctx.translate(segment.x, segment.y);
    ctx.scale(pieceScale, pieceScale);
    ctx.rotate(segment.angle);
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 6;
    ctx.fillStyle = "#171b1e";
    ctx.strokeStyle = enemy.color;
    ctx.lineWidth = enemy.archetype === "warden" ? 2.5 : 1.8;
    ctx.beginPath();
    switch (enemy.archetype) {
      case "scout":
        ctx.moveTo(10, 0); ctx.lineTo(0, 6); ctx.lineTo(-9, 0); ctx.lineTo(0, -6); ctx.closePath();
        break;
      case "courier":
        ctx.roundRect(-11, -7, 22, 14, 3);
        break;
      case "charger":
        ctx.moveTo(11, 0); ctx.lineTo(1, 9); ctx.lineTo(-9, 6); ctx.lineTo(-5, 0); ctx.lineTo(-9, -6); ctx.lineTo(1, -9); ctx.closePath();
        break;
      case "cutter":
        ctx.moveTo(10, 0); ctx.lineTo(0, 11); ctx.lineTo(-5, 4); ctx.lineTo(-11, 0); ctx.lineTo(-5, -4); ctx.lineTo(0, -11); ctx.closePath();
        break;
      case "coiler":
        ctx.arc(0, 0, 9, 0, TAU);
        break;
      case "warden":
        ctx.moveTo(8, -9); ctx.lineTo(11, -4); ctx.lineTo(11, 4); ctx.lineTo(8, 9); ctx.lineTo(-8, 9); ctx.lineTo(-11, 4); ctx.lineTo(-11, -4); ctx.lineTo(-8, -9); ctx.closePath();
        break;
      default:
        ctx.moveTo(10, 0); ctx.lineTo(4, 9); ctx.lineTo(-8, 7); ctx.lineTo(-11, 0); ctx.lineTo(-8, -7); ctx.lineTo(4, -9); ctx.closePath();
        break;
    }
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = enemy.color;
    ctx.globalAlpha = 0.76;
    if (enemy.archetype === "coiler") {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0.2, TAU * 0.86);
      ctx.stroke();
    } else if (enemy.archetype === "courier") {
      ctx.fillRect(-5, -5, 9, 10);
      ctx.fillStyle = "#f4f6f5";
      ctx.fillRect(-2, -4, 2, 8);
    } else if (enemy.archetype === "cutter") {
      ctx.fillRect(-7, -1.5, 14, 3);
    } else if (enemy.archetype === "warden") {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.strokeRect(-6, -5, 12, 10);
    } else {
      ctx.fillRect(-7, -2, 11, 4);
    }
    ctx.restore();
  }

  function drawEnemyHead(enemy, pieceScale) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.scale(pieceScale, pieceScale);
    ctx.rotate(enemy.angle);
    ctx.shadowColor = enemy.color;
    ctx.shadowBlur = enemy.archetype === "warden" ? 19 : 14;
    ctx.fillStyle = "#101416";
    ctx.strokeStyle = enemy.archetype === "warden" ? enemy.color : "#eff1f0";
    ctx.lineWidth = enemy.archetype === "warden" ? 3 : 1.7;
    ctx.beginPath();
    switch (enemy.archetype) {
      case "scout":
        ctx.moveTo(19, 0); ctx.lineTo(-8, 9); ctx.lineTo(-3, 0); ctx.lineTo(-8, -9); ctx.closePath();
        break;
      case "courier":
        ctx.moveTo(18, 0); ctx.lineTo(9, 9); ctx.lineTo(-11, 9); ctx.lineTo(-16, 4); ctx.lineTo(-16, -4); ctx.lineTo(-11, -9); ctx.lineTo(9, -9); ctx.closePath();
        break;
      case "charger":
        ctx.moveTo(21, 0); ctx.lineTo(8, 7); ctx.lineTo(3, 15); ctx.lineTo(-1, 9); ctx.lineTo(-14, 10); ctx.lineTo(-10, 0); ctx.lineTo(-14, -10); ctx.lineTo(-1, -9); ctx.lineTo(3, -15); ctx.lineTo(8, -7); ctx.closePath();
        break;
      case "cutter":
        ctx.moveTo(18, 0); ctx.lineTo(2, 15); ctx.lineTo(-3, 9); ctx.lineTo(-15, 5); ctx.lineTo(-11, 0); ctx.lineTo(-15, -5); ctx.lineTo(-3, -9); ctx.lineTo(2, -15); ctx.closePath();
        break;
      case "coiler":
        ctx.arc(0, 0, 14, 0, TAU);
        break;
      case "warden":
        ctx.moveTo(16, 0); ctx.lineTo(10, 13); ctx.lineTo(-8, 15); ctx.lineTo(-17, 8); ctx.lineTo(-17, -8); ctx.lineTo(-8, -15); ctx.lineTo(10, -13); ctx.closePath();
        break;
      default:
        ctx.moveTo(18, 0); ctx.lineTo(8, 12); ctx.lineTo(-7, 11); ctx.lineTo(-15, 5); ctx.lineTo(-12, 0); ctx.lineTo(-15, -5); ctx.lineTo(-7, -11); ctx.lineTo(8, -12); ctx.closePath();
        break;
    }
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    if (enemy.archetype === "coiler") {
      ctx.lineWidth = 3;
      ctx.strokeStyle = enemy.color;
      ctx.arc(0, 0, 8, 0.25, TAU * 0.9);
      ctx.stroke();
    } else if (enemy.archetype === "warden") {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.4;
      ctx.strokeRect(-10, -9, 18, 18);
      ctx.fillRect(8, -8, 5, 16);
    } else if (enemy.archetype === "cutter") {
      ctx.fillRect(-8, -2, 24, 4);
    } else if (enemy.archetype === "courier") {
      ctx.fillRect(-12, -6, 10, 12);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-8, -5, 2, 10);
    } else {
      ctx.moveTo(enemy.archetype === "charger" ? 21 : 18, 0);
      ctx.lineTo(7, 6);
      ctx.lineTo(7, -6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#f7f8f7";
    ctx.fillRect(2, -7, 5, 3);
    ctx.fillRect(2, 4, 5, 3);
    ctx.fillStyle = "#080a0b";
    ctx.fillRect(4, -7, 2, 3);
    ctx.fillRect(4, 4, 2, 3);
    ctx.restore();
  }

  function drawEnemy(enemy) {
    const pieceScale = arenaPieceScale();
    drawEnemyBehaviorCue(enemy, pieceScale);
    drawLinkedPath(enemy, enemy.segments, "rgba(4, 6, 7, 0.92)", (enemy.archetype === "warden" ? 14 : 11) * pieceScale);
    drawLinkedPath(enemy, enemy.segments, enemy.color, (enemy.archetype === "cutter" ? 3.4 : 2.2) * pieceScale, 0.72);
    for (let index = enemy.segments.length - 1; index >= 0; index -= 1) drawEnemySegment(enemy, enemy.segments[index], pieceScale);
    drawEnemyHead(enemy, pieceScale);

    if (enemy.captured > 0) {
      ctx.save();
      ctx.translate(enemy.x, enemy.y - 25 * pieceScale);
      ctx.scale(pieceScale, pieceScale);
      ctx.fillStyle = "rgba(8, 10, 11, 0.94)";
      ctx.strokeStyle = enemy.color;
      ctx.lineWidth = 1;
      ctx.fillRect(-13, -8, 26, 16);
      ctx.strokeRect(-13, -8, 26, 16);
      ctx.fillStyle = "#f4f6f5";
      ctx.font = "800 9px Bahnschrift, Arial Narrow, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`● ${enemy.captured}`, 0, 0);
      ctx.restore();
    }
  }

  function drawModuleShape(module, size) {
    ctx.beginPath();
    if (module.shape === "circle") {
      ctx.arc(0, 0, size * 0.58, 0, TAU);
    } else if (module.shape === "ring") {
      ctx.arc(0, 0, size * 0.55, 0, TAU);
    } else if (module.shape === "triangle") {
      ctx.moveTo(size * 0.7, 0);
      ctx.lineTo(-size * 0.5, size * 0.58);
      ctx.lineTo(-size * 0.5, -size * 0.58);
      ctx.closePath();
    } else if (module.shape === "diamond") {
      ctx.moveTo(size * 0.68, 0);
      ctx.lineTo(0, size * 0.68);
      ctx.lineTo(-size * 0.68, 0);
      ctx.lineTo(0, -size * 0.68);
      ctx.closePath();
    } else if (module.shape === "capsule") {
      ctx.roundRect(-size * 0.72, -size * 0.38, size * 1.44, size * 0.76, size * 0.35);
    } else if (module.shape === "star") {
      for (let index = 0; index < 10; index += 1) {
        const radius = index % 2 === 0 ? size * 0.72 : size * 0.31;
        const angle = index * Math.PI / 5 - Math.PI / 2;
        if (index === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      }
      ctx.closePath();
    } else if (module.shape === "hex") {
      for (let index = 0; index < 6; index += 1) {
        const angle = index * TAU / 6;
        if (index === 0) ctx.moveTo(Math.cos(angle) * size * 0.67, Math.sin(angle) * size * 0.67);
        else ctx.lineTo(Math.cos(angle) * size * 0.67, Math.sin(angle) * size * 0.67);
      }
      ctx.closePath();
    } else {
      ctx.rect(-size * 0.55, -size * 0.55, size * 1.1, size * 1.1);
    }
  }

  function drawPlayerIdLabel(target, pieceScale) {
    const label = `@${target.playerId || target.name || "PLAYER"}`;
    const labelScale = fontScale;
    const textPadding = 14 * labelScale;
    const cornerCut = 5 * labelScale;
    const maxWidth = clamp(arena.cellSize * 5.2, 112, 172) * labelScale;
    const minFontSize = 7 * labelScale;
    let fontSize = clamp(10 * pieceScale, 8, 11) * labelScale;
    ctx.save();
    ctx.font = `900 ${fontSize}px Bahnschrift, Arial Narrow, sans-serif`;
    while (fontSize > minFontSize && ctx.measureText(label).width > maxWidth - textPadding) {
      fontSize -= 0.5 * labelScale;
      ctx.font = `900 ${fontSize}px Bahnschrift, Arial Narrow, sans-serif`;
    }
    const textWidth = Math.min(maxWidth - textPadding, ctx.measureText(label).width);
    const widthValue = textWidth + textPadding;
    const heightValue = fontSize + 10 * labelScale;
    const x = target.x - widthValue / 2;
    const y = target.y - 31 * pieceScale * labelScale - heightValue;
    ctx.fillStyle = target.isSelf ? "rgba(243,198,0,0.96)" : "rgba(8,11,13,0.9)";
    ctx.strokeStyle = target.isSelf ? "#ffffff" : target.playerColor;
    ctx.lineWidth = (target.isSelf ? 1.4 : 1) * labelScale;
    ctx.beginPath();
    ctx.moveTo(x + cornerCut, y);
    ctx.lineTo(x + widthValue, y);
    ctx.lineTo(x + widthValue - cornerCut, y + heightValue);
    ctx.lineTo(x, y + heightValue);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = target.isSelf ? "#090b0c" : "#f6f7f6";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, target.x, y + heightValue / 2 + 0.5 * labelScale, maxWidth - textPadding);
    ctx.restore();
  }

  function drawRespawnLocator(now) {
    if (state !== "running" || !player || !Number.isFinite(respawnLocatorStartedAt)) return;
    if (network.enabled && (!player.isSelf || player.alive === false)) return;
    const elapsed = Math.max(0, (now - respawnLocatorStartedAt) / 1000);
    const totalDuration = RESPAWN_LOCATOR_CONVERGE_DURATION + RESPAWN_LOCATOR_FADE_DURATION;
    if (elapsed >= totalDuration) return;

    const center = worldToScreen(player.x, player.y);
    const pieceScale = arenaPieceScale();
    const finalRadius = 25 * pieceScale;
    const startRadius = Math.max(
      Math.hypot(center.x, center.y),
      Math.hypot(width - center.x, center.y),
      Math.hypot(center.x, height - center.y),
      Math.hypot(width - center.x, height - center.y)
    ) + finalRadius;
    const convergeProgress = clamp(elapsed / RESPAWN_LOCATOR_CONVERGE_DURATION, 0, 1);
    const easedProgress = 1 - Math.pow(1 - convergeProgress, 3);
    const radius = startRadius + (finalRadius - startRadius) * easedProgress;
    const fadeProgress = clamp((elapsed - RESPAWN_LOCATOR_CONVERGE_DURATION) / RESPAWN_LOCATOR_FADE_DURATION, 0, 1);
    const innerInset = 4 * pieceScale;

    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(Math.PI / 8);
    ctx.globalAlpha = 1 - fadeProgress;
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = Math.max(1, 1.2 * pieceScale);
    ctx.strokeRect(-radius + innerInset, -radius + innerInset, (radius - innerInset) * 2, (radius - innerInset) * 2);
    ctx.strokeStyle = "#f3c600";
    ctx.shadowColor = "#f3c600";
    ctx.shadowBlur = 12;
    ctx.lineWidth = Math.max(1.8, 2.4 * pieceScale);
    ctx.setLineDash([6 * pieceScale, 4 * pieceScale]);
    ctx.lineDashOffset = -elapsed * finalRadius;
    ctx.strokeRect(-radius, -radius, radius * 2, radius * 2);
    ctx.restore();
  }

  function drawPlayer(target = player) {
    if (!target) return;
    const previousPlayer = player;
    const previousGrowth = activeGrowth;
    player = target;
    activeGrowth = target.growth || (target === previousPlayer ? previousGrowth : null);
    ctx.save();
    const pieceScale = arenaPieceScale();
    const protectedVisual = player.protectedState || player.invulnerable > 0;
    if (protectedVisual) ctx.globalAlpha = 0.48 + Math.sin(gameTime * 28) * 0.28;
    const repulseRange = repulseRangePixels();
    if (repulseRange > 0) {
      ctx.save();
      ctx.globalAlpha = 0.12 + Math.sin(gameTime * 2.2) * 0.025;
      ctx.strokeStyle = MODULE_BY_ID.repulse.color;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([arena.cellSize * 0.18, arena.cellSize * 0.24]);
      ctx.lineDashOffset = -gameTime * 12;
      ctx.beginPath();
      ctx.arc(player.x, player.y, repulseRange, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    let previous = player;
    for (const segment of player.segments) {
      const color = segment.module ? MODULE_BY_ID[segment.module].color : segment.neutral ? "rgba(222, 226, 226, 0.8)" : "rgba(116, 124, 127, 0.72)";
      drawLink(previous, segment, "rgba(5, 7, 8, 0.9)", (segment.module ? 10 : 9) * pieceScale, 0.82);
      drawLink(previous, segment, color, 2.1 * pieceScale, 0.78);
      previous = segment;
    }

    for (let index = player.segments.length - 1; index >= 0; index -= 1) {
      const segment = player.segments[index];
      const growthPulse = growthPulseForNode(index + 1);
      const visualScale = segmentBirthScale(segment) * (1 + growthPulse * 0.46);
      ctx.save();
      ctx.translate(segment.x, segment.y);
      ctx.scale(pieceScale * visualScale, pieceScale * visualScale);
      ctx.rotate(segment.angle);
      if (growthPulse > 0) {
        ctx.shadowColor = activeGrowth.color;
        ctx.shadowBlur = 12 + growthPulse * 10;
      }

      if (segment.module) {
        const module = MODULE_BY_ID[segment.module];
        ctx.shadowColor = module.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = "#151a1d";
        ctx.strokeStyle = module.color;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(11, 0);
        ctx.lineTo(5, 10);
        ctx.lineTo(-8, 8);
        ctx.lineTo(-11, 0);
        ctx.lineTo(-8, -8);
        ctx.lineTo(5, -10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 4;
        drawModuleShape(module, 8.6);
        if (module.shape === "ring") {
          ctx.strokeStyle = module.color;
          ctx.lineWidth = 2.4;
          ctx.stroke();
        } else {
          ctx.fillStyle = module.color;
          ctx.fill();
        }

        if ((segment.module === "shield" || segment.module === "phase") && !segment.ready) {
          const total = moduleCooldownSeconds(segment.module) * Math.pow(MODULE_TUNING.armor.cooldownMultiplierPerStack, moduleCount("armor"));
          const progress = 1 - clamp(segment.cooldown / total, 0, 1);
          ctx.shadowBlur = 0;
          ctx.strokeStyle = "rgba(255,255,255,0.65)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 14.5, -Math.PI / 2, -Math.PI / 2 + TAU * progress);
          ctx.stroke();
        }
      } else if (segment.neutral) {
        ctx.fillStyle = "rgba(184, 190, 191, 0.74)";
        ctx.strokeStyle = "rgba(246, 247, 246, 0.9)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(4, 8);
        ctx.lineTo(-8, 7);
        ctx.lineTo(-10, 0);
        ctx.lineTo(-8, -7);
        ctx.lineTo(4, -8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "rgba(32, 37, 39, 0.76)";
        ctx.fillRect(-5, -1.5, 10, 3);
      } else {
        ctx.fillStyle = "#343b3e";
        ctx.strokeStyle = "#a9afb1";
        ctx.lineWidth = 1.2;
        ctx.fillRect(-8, -7, 16, 14);
        ctx.strokeRect(-8, -7, 16, 14);
      }
      ctx.restore();

      if (segment.module === "blade") {
        const orbitRadius = bladeOrbitRadius();
        const x = segment.x + Math.cos(segment.orbit) * orbitRadius;
        const y = segment.y + Math.sin(segment.orbit) * orbitRadius;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(pieceScale, pieceScale);
        ctx.rotate(segment.orbit * 2);
        ctx.shadowColor = MODULE_BY_ID.blade.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = MODULE_BY_ID.blade.color;
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-6, 4);
        ctx.lineTo(-2, 0);
        ctx.lineTo(-6, -4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.save();
    ctx.translate(player.x, player.y);
    const headGrowthPulse = growthPulseForNode(0);
    const headScale = 1 + headGrowthPulse * 0.44;
    ctx.scale(pieceScale * headScale, pieceScale * headScale);
    ctx.rotate(player.angle);
    ctx.shadowColor = headGrowthPulse > 0 ? activeGrowth.color : (player.playerColor || "rgba(243,198,0,0.7)");
    ctx.shadowBlur = 14 + headGrowthPulse * 9;
    ctx.fillStyle = "#e7e9e8";
    ctx.strokeStyle = "#090b0c";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(19, 0);
    ctx.lineTo(9, 13);
    ctx.lineTo(-7, 12);
    ctx.lineTo(-16, 6);
    ctx.lineTo(-12, 0);
    ctx.lineTo(-16, -6);
    ctx.lineTo(-7, -12);
    ctx.lineTo(9, -13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#15191b";
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(7, 7);
    ctx.lineTo(1, 5);
    ctx.lineTo(1, -5);
    ctx.lineTo(7, -7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = player.playerColor || "#f3c600";
    ctx.fillRect(-12, -9, 4, 18);
    ctx.fillStyle = "#08c7dc";
    ctx.fillRect(4, -6, 7, 3);
    ctx.fillRect(4, 3, 7, 3);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillRect(-5, -10, 8, 2);
    ctx.restore();
    ctx.restore();
    if (network.multiplayer) drawPlayerIdLabel(player, pieceScale);
    player = previousPlayer;
    activeGrowth = previousGrowth;
  }

  function drawPolygonPath(x, y, radius, sides = 8, rotation = -Math.PI / 8) {
    ctx.beginPath();
    for (let index = 0; index < sides; index += 1) {
      const angle = rotation + index * TAU / sides;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function drawHazards(time) {
    for (const hazard of hazards) {
      const pulse = 1 + Math.sin(time * 8 + hazard.phase) * 0.12;
      ctx.save();
      ctx.translate(hazard.x, hazard.y);

      if (hazard.kind === "gravity") {
        ctx.globalAlpha = 0.24 + Math.sin(time * 5 + hazard.phase) * 0.08;
        ctx.fillStyle = hazard.color;
        ctx.strokeStyle = hazard.color;
        ctx.lineWidth = 2;
        drawPolygonPath(0, 0, hazard.radius * pulse, 12, hazard.phase * 0.08);
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = 0.9;
        ctx.shadowColor = hazard.color;
        ctx.shadowBlur = 14;
        ctx.fillStyle = "#080a0b";
        drawPolygonPath(0, 0, 14 * pulse, 8, Math.PI / 8);
        ctx.fill();
        ctx.strokeStyle = "#f3c600";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
        continue;
      }

      ctx.scale(pulse, pulse);
      ctx.rotate(hazard.phase);
      ctx.shadowColor = hazard.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#171b1e";
      ctx.strokeStyle = hazard.color;
      ctx.lineWidth = 2;
      drawPolygonPath(0, 0, 11, 4, Math.PI / 4);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.rotate(-hazard.phase);
      ctx.fillStyle = "#f3c600";
      ctx.fillRect(-6, -1.5, 12, 3);
      ctx.fillRect(-1.5, -6, 3, 12);
      ctx.restore();
    }
  }

  function drawProjectiles() {
    for (const projectile of projectiles) {
      ctx.save();
      const velocity = Math.hypot(projectile.vx, projectile.vy) || 1;
      const directionX = projectile.vx / velocity;
      const directionY = projectile.vy / velocity;
      const trailLength = Math.min(30, 8 + projectile.size * 3.2);
      ctx.strokeStyle = "rgba(5, 7, 8, 0.82)";
      ctx.lineWidth = Math.max(2, projectile.size * 1.25);
      ctx.beginPath();
      ctx.moveTo(projectile.x, projectile.y);
      ctx.lineTo(projectile.x - directionX * trailLength, projectile.y - directionY * trailLength);
      ctx.stroke();
      ctx.strokeStyle = projectile.color;
      ctx.globalAlpha = 0.84;
      ctx.lineWidth = Math.max(1, projectile.size * 0.48);
      ctx.beginPath();
      ctx.moveTo(projectile.x, projectile.y);
      ctx.lineTo(projectile.x - directionX * trailLength, projectile.y - directionY * trailLength);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = projectile.color;
      ctx.shadowColor = projectile.color;
      ctx.shadowBlur = 9;
      drawPolygonPath(projectile.x, projectile.y, projectile.size * 1.15, 4, Math.atan2(projectile.vy, projectile.vx));
      ctx.fill();
      ctx.restore();
    }
  }

  function drawEffects() {
    for (const particle of particles) {
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;

    for (const effect of effects) {
      const progress = 1 - effect.life / effect.maxLife;
      const alpha = clamp(effect.life / effect.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      if (effect.type === "ring") {
        const end = effect.endRadius || effect.radius + 45;
        const radius = effect.radius + (end - effect.radius) * progress;
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 3 * (1 - progress) + 0.5;
        drawPolygonPath(effect.x, effect.y, radius, 8, Math.PI / 8 + progress * 0.12);
        ctx.stroke();
      } else if (effect.type === "beam") {
        ctx.strokeStyle = effect.color;
        ctx.shadowColor = effect.color;
        ctx.shadowBlur = 12;
        ctx.lineWidth = (effect.width || 4) * alpha;
        ctx.beginPath();
        ctx.moveTo(effect.x, effect.y);
        ctx.lineTo(effect.x2, effect.y2);
        ctx.stroke();
      } else if (effect.type === "lightning") {
        ctx.strokeStyle = effect.color;
        ctx.shadowColor = effect.color;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(effect.x, effect.y);
        for (let index = 1; index < 6; index += 1) {
          const t = index / 6;
          const x = effect.x + (effect.x2 - effect.x) * t + random(-6, 6);
          const y = effect.y + (effect.y2 - effect.y) * t + random(-6, 6);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(effect.x2, effect.y2);
        ctx.stroke();
      } else if (effect.type === "text") {
        ctx.fillStyle = effect.color;
        ctx.strokeStyle = "rgba(4, 7, 8, 0.92)";
        ctx.lineWidth = effect.emphasis ? 4 : 3;
        ctx.lineJoin = "round";
        ctx.font = `900 ${effect.emphasis ? 15 : 12}px Bahnschrift, Arial Narrow, sans-serif`;
        ctx.textAlign = "center";
        const textY = effect.y - progress * (effect.emphasis ? 32 : 24);
        ctx.strokeText(effect.text, effect.x, textY);
        ctx.fillText(effect.text, effect.x, textY);
      }
      ctx.restore();
    }
  }

  function drawOffscreenIndicators(time) {
    const inset = 13;
    const left = arena.left + inset;
    const right = arena.right - inset;
    const top = arena.top + inset;
    const bottom = arena.bottom - inset;

    function marker(x, y, color, kind) {
      const screen = worldToScreen(x, y);
      if (screen.x >= left && screen.x <= right && screen.y >= top && screen.y <= bottom) return;
      const dx = screen.x - arena.centerX;
      const dy = screen.y - arena.centerY;
      const scale = Math.min(
        Math.abs(dx) > 0.001 ? (arena.width / 2 - inset) / Math.abs(dx) : Infinity,
        Math.abs(dy) > 0.001 ? (arena.height / 2 - inset) / Math.abs(dy) : Infinity
      );
      const markerX = arena.centerX + dx * scale;
      const markerY = arena.centerY + dy * scale;
      ctx.save();
      ctx.translate(markerX, markerY);
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      if (kind === "warning") {
        const size = 6 + Math.abs(Math.sin(time * 10)) * 2;
        ctx.beginPath();
        ctx.moveTo(-size, -size);
        ctx.lineTo(size, size);
        ctx.moveTo(size, -size);
        ctx.lineTo(-size, size);
        ctx.stroke();
      } else if (kind === "enemy") {
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-4, -4, 8, 8);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(arena.left, arena.top, arena.width, arena.height);
    ctx.clip();
    for (const food of foods) if (!food.networkHidden) marker(food.x, food.y, food.color, "food");
    for (const enemy of enemies) if (!enemy.dead) marker(enemy.x, enemy.y, enemy.color, "enemy");
    for (const spawn of pendingEnemySpawns) {
      const point = cellCenter(spawn.headCell.col, spawn.headCell.row);
      marker(point.x, point.y, "#ff3d5d", "warning");
    }
    ctx.restore();
  }

  function render(now) {
    const visualTime = now / 1000;
    drawBackground(visualTime);
    ctx.save();
    applyArenaPerspectiveTransform();
    ctx.beginPath();
    ctx.rect(arena.left, arena.top, arena.width, arena.height);
    ctx.clip();
    if (shake > 0) ctx.translate(random(-shake, shake), random(-shake, shake));
    applyCameraTransform();
    drawFood(visualTime);
    drawEnemySpawnWarnings(visualTime);
    drawHazards(visualTime);
    for (const enemy of enemies) drawEnemy(enemy);
    if (network.enabled) {
      for (const networkPlayer of visiblePlayers) drawPlayer(networkPlayer);
    } else if (player) {
      drawPlayer();
    }
    drawProjectiles();
    drawEffects();
    ctx.restore();
    drawOffscreenIndicators(visualTime);

    if (flash > 0) {
      ctx.fillStyle = `rgba(255, 79, 112, ${flash * 0.24})`;
      ctx.fillRect(0, 0, width, height);
    }
    drawRespawnLocator(now);
  }

  function updateFpsMeter(now, frameInterval) {
    fpsFrameCount += 1;
    if (frameInterval >= 4 && frameInterval <= 50) recordFastFrameInterval(frameInterval);
    const elapsed = now - fpsWindowStartedAt;
    if (elapsed < 500) return;
    const rawFps = fpsFrameCount * 1000 / Math.max(1, elapsed);
    const observedRefreshRate = sampledRefreshRate();
    if (observedRefreshRate >= 50) estimatedRefreshRate = Math.max(estimatedRefreshRate, observedRefreshRate);
    smoothedFps = smoothedFps > 0 ? smoothedFps + (rawFps - smoothedFps) * 0.32 : rawFps;
    const rounded = Math.round(smoothedFps);
    ui.fpsValue.textContent = String(rounded);
    ui.fpsMeter.classList.toggle("is-low", rawFps < Math.max(52, estimatedRefreshRate * 0.72));
    tuneRenderResolution(rawFps);
    fpsWindowStartedAt = now;
    fpsFrameCount = 0;
  }

  function tuneRenderResolution(fps) {
    if (state !== "running" || document.hidden) {
      lowFpsWindows = 0;
      return;
    }
    const targetFps = Math.max(52, estimatedRefreshRate * 0.78);
    lowFpsWindows = fps < targetFps ? lowFpsWindows + 1 : 0;
    if (lowFpsWindows < 2 || renderDprLimit <= MIN_RENDER_DPR) return;
    const step = fps < targetFps * 0.65 ? 0.25 : 0.125;
    const nextLimit = Math.max(MIN_RENDER_DPR, renderDprLimit - step);
    renderDprLimit = nextLimit;
    lowFpsWindows = 0;
    try { sessionStorage.setItem(RENDER_DPR_SESSION_KEY, String(renderDprLimit)); } catch {}
    resize();
  }

  function recordFastFrameInterval(interval) {
    let insertAt = fastestFrameIntervals.length;
    while (insertAt > 0 && interval < fastestFrameIntervals[insertAt - 1]) insertAt -= 1;
    fastestFrameIntervals.splice(insertAt, 0, interval);
    if (fastestFrameIntervals.length > 5) fastestFrameIntervals.pop();
  }

  function sampledRefreshRate() {
    if (fastestFrameIntervals.length === 0) return estimatedRefreshRate;
    const averageInterval = fastestFrameIntervals.reduce((total, interval) => total + interval, 0) / fastestFrameIntervals.length;
    fastestFrameIntervals = [];
    const observed = 1000 / averageInterval;
    const commonRates = [50, 60, 75, 90, 100, 120, 144, 165, 180, 240];
    let nearest = commonRates[0];
    for (const rate of commonRates) if (Math.abs(rate - observed) < Math.abs(nearest - observed)) nearest = rate;
    return Math.abs(nearest - observed) / nearest <= 0.12 ? nearest : clamp(observed, 50, 240);
  }

  function loadRenderDprLimit() {
    try {
      const stored = Number(sessionStorage.getItem(RENDER_DPR_SESSION_KEY));
      if (Number.isFinite(stored)) return clamp(stored, MIN_RENDER_DPR, MAX_RENDER_DPR);
    } catch {}
    return MAX_RENDER_DPR;
  }

  function frame(now) {
    const frameInterval = Math.max(0, now - lastFrame);
    const dt = Math.min(0.033, frameInterval / 1000);
    lastFrame = now;
    pendingUiMotionDt = Math.min(0.1, pendingUiMotionDt + dt);
    update(dt);
    const menuFrameState = state === "menu";
    if (menuFrameState !== lastMenuFrameState) {
      lastMenuFrameState = menuFrameState;
      ui.shell.classList.toggle("is-menu", menuFrameState);
      ui.fpsMeter.setAttribute("aria-hidden", String(menuFrameState));
      nextCanvasRenderAt = now;
    }
    const renderFps = state === "running" ? MAX_RENDER_FPS : Math.min(30, MAX_RENDER_FPS);
    const renderInterval = 1000 / renderFps;
    if (now + 0.25 >= nextCanvasRenderAt) {
      const renderedFrameInterval = lastCanvasRender > 0 ? now - lastCanvasRender : renderInterval;
      updateUIMotion(pendingUiMotionDt);
      pendingUiMotionDt = 0;
      render(now);
      lastCanvasRender = now;
      updateFpsMeter(now, renderedFrameInterval);
      do nextCanvasRenderAt += renderInterval;
      while (nextCanvasRenderAt <= now - renderInterval);
    }
    requestAnimationFrame(frame);
  }

  function updatePointer(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    if (event.pointerType === "touch") {
      ui.touch.style.left = `${event.clientX}px`;
      ui.touch.style.top = `${event.clientY}px`;
    }
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (state !== "running") return;
    pointer.active = true;
    pointer.touchId = event.pointerId;
    updatePointer(event);
    canvas.setPointerCapture?.(event.pointerId);
    if (event.pointerType === "touch") ui.touch.classList.add("is-visible");
  });

  canvas.addEventListener("pointermove", (event) => {
    if (state !== "running") return;
    if (event.pointerType === "mouse") pointer.active = true;
    if (event.pointerType === "touch" && pointer.touchId !== event.pointerId) return;
    updatePointer(event);
  });

  function endPointer(event) {
    if (event.pointerType === "touch" && pointer.touchId === event.pointerId) {
      pointer.active = false;
      pointer.touchId = null;
      ui.touch.classList.remove("is-visible");
    }
  }

  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  window.addEventListener("pointermove", updateUIMotionTarget, { passive: true });
  window.addEventListener("pointerout", (event) => {
    if (!event.relatedTarget) resetUIMotionTarget();
  }, { passive: true });

  window.addEventListener("keydown", (event) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
    if (event.code === "Escape" && closeSettingPopovers()) {
      event.preventDefault();
      return;
    }
    if (event.code === "Escape" && ui.codex.classList.contains("is-visible")) {
      event.preventDefault();
      closeCodex();
      return;
    }
    if (event.code === "Escape" && ui.changelog.classList.contains("is-visible")) {
      event.preventDefault();
      closeChangelog();
      return;
    }
    keys.add(event.code);
    if (player && state === "running") {
      const tapDirections = {
        ArrowLeft: Math.PI,
        KeyA: Math.PI,
        ArrowRight: 0,
        KeyD: 0,
        ArrowUp: -Math.PI / 2,
        KeyW: -Math.PI / 2,
        ArrowDown: Math.PI / 2,
        KeyS: Math.PI / 2
      };
      const direction = tapDirections[event.code];
      if (direction != null) {
        pointer.active = false;
        player.desiredAngle = direction;
      }
    }
    if ((event.code === "Escape" || event.code === "KeyP") && (state === "running" || state === "paused")) setPaused(state === "running");
    if (event.code === "Enter" && !ui.codex.classList.contains("is-visible") && !ui.changelog.classList.contains("is-visible") && (state === "menu" || state === "gameover")) {
      startGame(state === "gameover" && testMode);
    }
  });

  window.addEventListener("keyup", (event) => keys.delete(event.code));
  window.addEventListener("blur", () => {
    keys.clear();
    resetUIMotionTarget();
    if (backgroundPauseEnabled && !testMode && state === "running") setPaused(true);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && backgroundPauseEnabled && !testMode && state === "running") setPaused(true);
  });
  window.addEventListener("resize", resize);

  ui.startButton.addEventListener("click", () => startGame(false));
  ui.autoTestButton.addEventListener("click", () => startGame(true));
  ui.localModeButton.addEventListener("click", startPureLocalGame);
  ui.lobbyButton.addEventListener("click", () => void returnToLobby());
  ui.codexButton.addEventListener("click", openCodex);
  ui.codexCloseButton.addEventListener("click", closeCodex);
  ui.changelogButton.addEventListener("click", openChangelog);
  ui.changelogCloseButton.addEventListener("click", closeChangelog);
  ui.restartButton.addEventListener("click", () => startGame(testMode));
  ui.gameOverMenuButton.addEventListener("click", returnToMenu);
  ui.pauseRestart.addEventListener("click", () => startGame(testMode));
  ui.pauseMenuButton.addEventListener("click", returnToMenu);
  ui.resumeButton.addEventListener("click", () => setPaused(false));
  ui.pauseButton.addEventListener("click", () => {
    if (state === "running") setPaused(true);
    else if (state === "paused") setPaused(false);
  });

  ui.fontButton.addEventListener("click", (event) => {
    event.stopPropagation();
    ensureAudio();
    const control = ui.fontButton.closest(".setting-control");
    const open = !control.classList.contains("is-open");
    closeSettingPopovers(control);
    setSettingPopover(ui.fontButton, ui.fontPopover, open);
    sound("ui");
  });

  ui.soundButton.addEventListener("click", (event) => {
    event.stopPropagation();
    ensureAudio();
    const control = ui.soundButton.closest(".setting-control");
    const open = !control.classList.contains("is-open");
    closeSettingPopovers(control);
    setSettingPopover(ui.soundButton, ui.soundPopover, open);
    sound("ui");
  });

  ui.motionButton.addEventListener("click", (event) => {
    event.stopPropagation();
    ensureAudio();
    const control = ui.motionButton.closest(".setting-control");
    const open = !control.classList.contains("is-open");
    closeSettingPopovers(control);
    setSettingPopover(ui.motionButton, ui.motionPopover, open);
    sound("ui");
  });

  ui.backgroundPauseButton.addEventListener("click", (event) => {
    event.stopPropagation();
    ensureAudio();
    const control = ui.backgroundPauseButton.closest(".setting-control");
    const open = !control.classList.contains("is-open");
    closeSettingPopovers(control);
    setSettingPopover(ui.backgroundPauseButton, ui.backgroundPausePopover, open);
    sound("ui");
  });

  ui.descriptionButton.addEventListener("click", (event) => {
    event.stopPropagation();
    ensureAudio();
    const control = ui.descriptionButton.closest(".setting-control");
    const open = !control.classList.contains("is-open");
    closeSettingPopovers(control);
    setSettingPopover(ui.descriptionButton, ui.descriptionPopover, open);
    sound("ui");
  });

  ui.fontPopover.addEventListener("click", (event) => event.stopPropagation());
  ui.soundPopover.addEventListener("click", (event) => event.stopPropagation());
  ui.motionPopover.addEventListener("click", (event) => event.stopPropagation());
  ui.backgroundPausePopover.addEventListener("click", (event) => event.stopPropagation());
  ui.descriptionPopover.addEventListener("click", (event) => event.stopPropagation());
  ui.fontSlider.addEventListener("input", () => applyFontScale(Number(ui.fontSlider.value) / 100));
  ui.fontSlider.addEventListener("change", () => {
    ensureAudio();
    sound("ui");
  });
  ui.soundSlider.addEventListener("input", () => applySoundVolume(Number(ui.soundSlider.value) / 100));
  ui.soundSlider.addEventListener("change", () => {
    ensureAudio();
    sound("ui");
  });
  ui.motionSlider.addEventListener("input", () => applyUIMotionStrength(Number(ui.motionSlider.value) / 100));
  ui.motionSlider.addEventListener("change", () => {
    ensureAudio();
    sound("ui");
  });
  ui.backgroundPauseToggle.addEventListener("change", () => {
    ensureAudio();
    applyBackgroundPause(ui.backgroundPauseToggle.checked);
    sound("ui");
  });
  ui.descriptionToggle.addEventListener("change", () => {
    ensureAudio();
    applyDetailedDescriptions(ui.descriptionToggle.checked);
    sound("ui");
  });
  document.addEventListener("click", () => closeSettingPopovers());

  applyFontScale(fontScale, false);
  applySoundVolume(soundVolume, false);
  applyUIMotionStrength(uiMotionStrength, false);
  applyBackgroundPause(backgroundPauseEnabled, false);
  applyDetailedDescriptions(detailedDescriptionsEnabled, false);
  setTestMode(false);
  ui.best.textContent = Math.floor(bestScore).toLocaleString("zh-CN");
  resize();
  resetGame();
  state = "menu";
  void bootstrapNetwork();
  requestAnimationFrame(frame);
})();
