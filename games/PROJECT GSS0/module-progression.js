(() => {
  "use strict";

  const config = globalThis.GSS0_DESIGNER_CONFIG;
  const modules = globalThis.GSS0ModuleCatalog;
  if (config?.schemaVersion !== 11 || !Array.isArray(modules) || modules.length === 0) {
    throw new Error("PROJECT GSS0 机体成长规则依赖加载失败");
  }

  const balance = config.balance;
  const cooldownPercentages = config.moduleCooldownPercentages;
  const moduleById = Object.fromEntries(modules.map((module) => [module.id, module]));
  const maxModuleLevel = Math.max(1, Math.round(Number(balance.maxModuleLevel) || 5));
  const compressionBase = Math.max(2, Math.round(balance.experienceCompressionBase));
  const slotUnlockLevels = Object.freeze([
    balance.moduleSlotUnlockLevel1,
    balance.moduleSlotUnlockLevel2,
    balance.moduleSlotUnlockLevel3,
    balance.moduleSlotUnlockLevel4
  ].map((level) => Math.max(1, Math.round(level))).sort((left, right) => left - right));
  const experienceTiers = Object.freeze([
    Object.freeze({ tier: 0, value: 1, color: "#c7cdcf", accent: "#f4f7f7", name: "灰色经验机体" }),
    Object.freeze({ tier: 1, value: compressionBase, color: "#38a9ff", accent: "#dff5ff", name: "蓝色经验机体" }),
    Object.freeze({ tier: 2, value: compressionBase * compressionBase, color: "#f3c600", accent: "#fff3a6", name: "金色经验机体" })
  ]);

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function safeLevel(level) {
    return clamp(Math.floor(Number(level) || 1), 1, maxModuleLevel);
  }

  function effectLevel(level) {
    return clamp(Math.floor(Number(level) || 0), 0, maxModuleLevel);
  }

  function moduleLevel(segment) {
    return segment?.module ? safeLevel(segment.moduleLevel) : 0;
  }

  function moduleLevelsFromSegments(segments) {
    const levels = Object.create(null);
    for (const segment of segments || []) {
      if (!segment?.module) continue;
      levels[segment.module] = Math.min(maxModuleLevel, (levels[segment.module] || 0) + moduleLevel(segment));
    }
    return levels;
  }

  function moduleSlotCapacity(playerLevel) {
    const level = Math.max(0, Math.floor(Number(playerLevel) || 0));
    let capacity = Math.max(1, Math.round(balance.initialModuleSlots));
    for (const unlockLevel of slotUnlockLevels) if (level >= unlockLevel) capacity += 1;
    return capacity;
  }

  function baseCooldownSeconds(moduleId) {
    const percentage = Number(cooldownPercentages[moduleId]);
    if (!Number.isFinite(percentage)) throw new Error(`PROJECT GSS0 主动机体 ${moduleId} 缺少冷却百分比`);
    return balance.activeSkillBaseCooldown * clamp(percentage, 0, 1000) / 100;
  }

  function activeCooldownSeconds(moduleId, level = 1, cooldownRateBonus = 0) {
    return baseCooldownSeconds(moduleId) / safeLevel(level) / Math.max(0.05, 1 + Math.max(0, cooldownRateBonus));
  }

  function experienceTier(tier) {
    return experienceTiers[clamp(Math.floor(Number(tier) || 0), 0, experienceTiers.length - 1)];
  }

  function experienceValue(tier) {
    return experienceTier(tier).value;
  }

  function findCompressionIndexes(segments, tier) {
    if (tier >= experienceTiers.length - 1) return [];
    const indexes = [];
    for (let index = 0; index < (segments?.length || 0); index += 1) {
      const segment = segments[index];
      if (!segment?.neutral || (segment.experienceTier || 0) !== tier) continue;
      indexes.push(index);
      if (indexes.length === compressionBase) return indexes;
    }
    return [];
  }

  function linearRewardAmount(perLevel, level) {
    return Math.max(0, perLevel) * Math.max(0, Math.floor(Number(level) || 0));
  }

  function rollLinearRewards(amount, random = Math.random) {
    const safeAmount = Math.max(0, Number(amount) || 0);
    return Math.floor(safeAmount) + (random() < safeAmount % 1 ? 1 : 0);
  }

  function reduction(level, perLevel, maximum = 1) {
    return Math.min(maximum, Math.max(0, perLevel) * effectLevel(level));
  }

  const effects = Object.freeze({
    repulseRangePixels: (level) => balance.moduleRepulseRangePerLevelPixels * effectLevel(level),
    armorCooldownRateBonus: (level) => balance.moduleArmorCooldownRatePerLevel * effectLevel(level),
    stabilizerSlowReduction: (level) => reduction(level, balance.moduleStabilizerSlowReductionPerLevel),
    stabilizerLockReduction: (level) => reduction(level, balance.moduleStabilizerLockReductionPerLevel),
    magnetPickupRangeCells: (level) => balance.moduleMagnetPickupRangePerLevel * effectLevel(level),
    hasteSpeedBonus: (level) => balance.moduleHasteSpeedPerLevel * effectLevel(level),
    hasteTurnRateBonus: (level) => balance.moduleHasteTurnRatePerLevel * effectLevel(level),
    chronosSlowReduction: (level) => reduction(level, balance.moduleChronosSlowPerLevel),
    tractorRangeCells: (level) => balance.moduleTractorRangePerLevel * effectLevel(level),
    tractorPullSpeed: (level) => balance.moduleTractorPullSpeedPerLevel * effectLevel(level),
    fortuneExpectedDrops: (level) => linearRewardAmount(balance.moduleFortuneExpectedDropsPerLevel, level),
    guidanceProjectileSpeedBonus: (level) => balance.moduleGuidanceProjectileSpeedPerLevel * effectLevel(level),
    guidanceHomingBonus: (level) => balance.moduleGuidanceHomingPerLevel * effectLevel(level),
    feastDuration: () => balance.moduleFeastDuration,
    feastSpeedBonus: (level) => balance.moduleFeastSpeedPerLevel * effectLevel(level),
    salvageExpectedDrops: (level) => linearRewardAmount(balance.moduleSalvageExpectedDropsPerLevel, level),
    amplifierCooldownRateBonus: (level) => balance.moduleAmplifierCooldownRatePerLevel * effectLevel(level),
    bufferKnockbackReduction: (level) => reduction(level, balance.moduleBufferKnockbackReductionPerLevel),
    decoyAvoidanceReduction: (level) => reduction(level, balance.moduleDecoyAvoidanceReductionPerLevel, balance.moduleDecoyMaxAvoidanceReduction),
    emergencyDuration: (level) => Math.min(balance.moduleEmergencyMaxDuration, balance.moduleEmergencyDurationPerLevel * effectLevel(level)),
    collectorPickupRadiusCells: (level) => balance.moduleCollectorPickupRadiusPerLevel * effectLevel(level),
    beaconWaveRateBonus: (level) => balance.moduleBeaconWaveRatePerLevel * effectLevel(level),
    momentumKnockbackBonus: (level) => balance.moduleMomentumKnockbackPerLevel * effectLevel(level),
    progressorMaxSpeedBonus: (level) => balance.moduleProgressorMaxSpeedPerLevel * effectLevel(level),
    cacheKillsPerTrigger: () => Math.max(1, Math.round(balance.moduleCacheKillsPerTrigger)),
    thornsProjectileCount: () => Math.max(1, Math.round(balance.moduleThornsProjectileCount))
  });

  function formatNumber(value, digits = 2) {
    return String(Number(Number(value).toFixed(digits)));
  }

  function formatSeconds(value) {
    return `${formatNumber(value)}秒`;
  }

  function formatPercent(value, sign = true) {
    const amount = formatNumber(value * 100, 1);
    return `${sign && value >= 0 ? "+" : ""}${amount}%`;
  }

  function passiveStats(moduleId, level) {
    switch (moduleId) {
      case "echo": return [{ label: "撞击发射", value: safeLevel(level), format: (value) => `${value}枚` }];
      case "repulse": return [{ label: "作用半径", value: effects.repulseRangePixels(level), format: (value) => `${formatNumber(value)}px` }];
      case "armor": return [{ label: "护盾冷却速度", value: effects.armorCooldownRateBonus(level), format: formatPercent }];
      case "stabilizer": return [
        { label: "反弹减速时间", value: effects.stabilizerSlowReduction(level), format: (value) => formatPercent(-value, false) },
        { label: "转向锁定时间", value: effects.stabilizerLockReduction(level), format: (value) => formatPercent(-value, false) }
      ];
      case "magnet": return [{ label: "蛇头吃球范围", value: effects.magnetPickupRangeCells(level), format: (value) => `+${formatNumber(value)}格` }];
      case "haste": return [
        { label: "移动速度", value: effects.hasteSpeedBonus(level), format: formatPercent },
        { label: "转向速度", value: effects.hasteTurnRateBonus(level), format: (value) => `+${formatNumber(value)}弧度/秒` }
      ];
      case "chronos": return [{ label: "敌蛇移动速度", value: effects.chronosSlowReduction(level), format: (value) => formatPercent(-value, false) }];
      case "tractor": return [
        { label: "牵引范围", value: effects.tractorRangeCells(level), format: (value) => `${formatNumber(value)}格` },
        { label: "牵引速度", value: effects.tractorPullSpeed(level), format: (value) => `${formatNumber(value)}格/秒` }
      ];
      case "fortune": return [{ label: "每次击破额外掉落期望", value: effects.fortuneExpectedDrops(level), format: (value) => `${formatNumber(value)}枚` }];
      case "guidance": return [
        { label: "子弹飞行速度", value: effects.guidanceProjectileSpeedBonus(level), format: formatPercent },
        { label: "追踪转向速度", value: effects.guidanceHomingBonus(level), format: (value) => `+${formatNumber(value)}弧度/秒` }
      ];
      case "feast": return [{ label: "增益移动速度", value: effects.feastSpeedBonus(level), format: formatPercent }];
      case "salvage": return [{ label: "每节受损机体回收期望", value: effects.salvageExpectedDrops(level), format: (value) => `${formatNumber(value)}枚球` }];
      case "amplifier": return [{ label: "主动技能冷却速度", value: effects.amplifierCooldownRateBonus(level), format: formatPercent }];
      case "buffer": return [{ label: "物理击退减免", value: effects.bufferKnockbackReduction(level), format: formatPercent }];
      case "decoy": return [{ label: "敌蛇避让强度", value: effects.decoyAvoidanceReduction(level), format: (value) => formatPercent(-value, false) }];
      case "emergency": return [{ label: "吃球无敌时间", value: effects.emergencyDuration(level), format: formatSeconds }];
      case "collector": return [{ label: "全身吃球半径", value: effects.collectorPickupRadiusCells(level), format: (value) => `+${formatNumber(value)}格` }];
      case "beacon": return [{ label: "波次倒计时速度", value: effects.beaconWaveRateBonus(level), format: formatPercent }];
      case "momentum": return [{ label: "敌蛇受到的击退", value: effects.momentumKnockbackBonus(level), format: formatPercent }];
      case "progressor": return [{ label: "满经验移动速度", value: effects.progressorMaxSpeedBonus(level), format: formatPercent }];
      case "cache": return [{ label: `每${effects.cacheKillsPerTrigger()}次击破生成`, value: safeLevel(level), format: (value) => `${value}枚球` }];
      default: return [{ label: "效果强度", value: safeLevel(level), format: (value) => `${value * 100}%` }];
    }
  }

  function moduleUpgradePreview(moduleId, currentLevel = 0) {
    const module = moduleById[moduleId];
    if (!module) throw new Error(`PROJECT GSS0 未知机体 ${moduleId}`);
    const fromLevel = clamp(Math.floor(Number(currentLevel) || 0), 0, maxModuleLevel);
    const toLevel = Math.min(maxModuleLevel, fromLevel + 1);
    const stats = module.activeCooldown
      ? [{ label: "冷却时间", before: fromLevel > 0 ? activeCooldownSeconds(moduleId, fromLevel) : null, after: activeCooldownSeconds(moduleId, toLevel), format: formatSeconds }]
      : passiveStats(moduleId, toLevel).map((stat, index) => ({
        ...stat,
        before: fromLevel > 0 ? passiveStats(moduleId, fromLevel)[index]?.value ?? null : null,
        after: stat.value
      }));
    return Object.freeze({
      kind: fromLevel > 0 ? "upgrade" : "new",
      fromLevel,
      toLevel,
      levelLabel: fromLevel >= maxModuleLevel
        ? `等级 ${maxModuleLevel}（已满级）`
        : fromLevel > 0 ? `等级 ${fromLevel} → 等级 ${toLevel}` : "等级 1",
      lines: Object.freeze(stats.map((stat) => Object.freeze({
        label: stat.label,
        text: stat.before == null
          ? `${stat.label} ${stat.format(stat.after)}`
          : `${stat.label} ${stat.format(stat.before)} → ${stat.format(stat.after)}`
      })))
    });
  }

  function chooseUpgradeIds(availableModules, segments, playerLevel, random = Math.random, count = 3) {
    const levels = moduleLevelsFromSegments(segments);
    const ownedIds = new Set(Object.keys(levels));
    const capacity = moduleSlotCapacity(playerLevel);
    const canAddNew = ownedIds.size < capacity;
    const newPool = canAddNew ? availableModules.filter((module) => !ownedIds.has(module.id)) : [];
    const upgradePool = availableModules.filter((module) => ownedIds.has(module.id) && levels[module.id] < maxModuleLevel);
    const choices = [];
    const targetCount = Math.min(Math.max(0, Math.floor(count)), newPool.length + upgradePool.length);

    while (choices.length < targetCount) {
      const preferNew = canAddNew && random() < clamp(balance.newModuleOfferChance, 0, 1);
      let pool = preferNew ? newPool : upgradePool;
      if (pool.length === 0) pool = preferNew ? upgradePool : newPool;
      if (pool.length === 0) break;
      const index = Math.floor(clamp(random(), 0, 0.999999999) * pool.length);
      const [choice] = pool.splice(index, 1);
      const otherPool = pool === newPool ? upgradePool : newPool;
      const duplicateIndex = otherPool.findIndex((module) => module.id === choice.id);
      if (duplicateIndex >= 0) otherPool.splice(duplicateIndex, 1);
      choices.push(choice.id);
    }
    return choices;
  }

  globalThis.GSS0ModuleProgression = Object.freeze({
    maxModuleLevel,
    compressionBase,
    slotUnlockLevels,
    experienceTiers,
    effects,
    moduleLevel,
    moduleLevelsFromSegments,
    moduleSlotCapacity,
    baseCooldownSeconds,
    activeCooldownSeconds,
    experienceTier,
    experienceValue,
    findCompressionIndexes,
    rollLinearRewards,
    moduleUpgradePreview,
    chooseUpgradeIds
  });
})();
