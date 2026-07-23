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
  const enemySpriteCache = new Map();
  const corrosionParticleSpriteCache = new Map();
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
    health: document.querySelector("#health-value"),
    maxHealth: document.querySelector("#health-max"),
    healthFill: document.querySelector("#health-fill"),
    shieldFill: document.querySelector("#shield-fill"),
    healthGroup: document.querySelector("#health-group"),
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
    multiplayerModeButton: document.querySelector("#multiplayer-mode-button"),
    localModeButton: document.querySelector("#local-mode-button"),
    codexButton: document.querySelector("#codex-button"),
    codex: document.querySelector("#codex-screen"),
    codexList: document.querySelector("#codex-list"),
    codexCategoryButtons: [...document.querySelectorAll("#codex-category-filter button")],
    codexCount: document.querySelector("#codex-count"),
    codexCloseButton: document.querySelector("#codex-close-button"),
    enemyCodexButton: document.querySelector("#enemy-codex-button"),
    enemyCodex: document.querySelector("#enemy-codex-screen"),
    enemyCodexList: document.querySelector("#enemy-codex-list"),
    enemyCodexCloseButton: document.querySelector("#enemy-codex-close-button"),
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
    cameraButton: document.querySelector("#camera-button"),
    cameraPopover: document.querySelector("#camera-popover"),
    cameraModeOutput: document.querySelector("#camera-mode-output"),
    cameraModeFixed: document.querySelector("#camera-mode-fixed"),
    cameraModeFollow: document.querySelector("#camera-mode-follow"),
    cameraZoomStatus: document.querySelector("#camera-zoom-status"),
    cameraZoomOutput: document.querySelector("#camera-zoom-output"),
    screenShakeButton: document.querySelector("#screen-shake-button"),
    screenShakeToggle: document.querySelector("#screen-shake-toggle"),
    screenShakePopover: document.querySelector("#screen-shake-popover"),
    backgroundPauseButton: document.querySelector("#background-pause-button"),
    backgroundPauseToggle: document.querySelector("#background-pause-toggle"),
    backgroundPausePopover: document.querySelector("#background-pause-popover"),
    automaticModeButton: document.querySelector("#automatic-mode-button"),
    automaticModeToggle: document.querySelector("#automatic-mode-toggle"),
    automaticModuleSelectionToggle: document.querySelector("#automatic-module-selection-toggle"),
    automaticRestartToggle: document.querySelector("#automatic-restart-toggle"),
    automaticModePopover: document.querySelector("#automatic-mode-popover"),
    resumeButton: document.querySelector("#resume-button"),
    pauseRestart: document.querySelector("#pause-restart-button"),
    pauseMenuButton: document.querySelector("#pause-menu-button"),
    restartButton: document.querySelector("#restart-button"),
    gameOverMenuButton: document.querySelector("#game-over-menu-button"),
    networkStatus: document.querySelector("#network-status"),
    p2pLobby: document.querySelector("#p2p-lobby-screen"),
    p2pLobbyClose: document.querySelector("#p2p-lobby-close"),
    p2pLobbyStatus: document.querySelector("#p2p-lobby-status"),
    p2pLobbyBrowser: document.querySelector("#p2p-lobby-browser"),
    p2pRoomRefresh: document.querySelector("#p2p-room-refresh"),
    p2pRoomList: document.querySelector("#p2p-room-list"),
    p2pCreateForm: document.querySelector("#p2p-create-form"),
    p2pCreateName: document.querySelector("#p2p-create-name"),
    p2pCreateMax: document.querySelector("#p2p-create-max"),
    p2pCreatePrivate: document.querySelector("#p2p-create-private"),
    p2pJoinForm: document.querySelector("#p2p-join-form"),
    p2pJoinCode: document.querySelector("#p2p-join-code"),
    p2pRoomWaiting: document.querySelector("#p2p-room-waiting"),
    p2pRoomName: document.querySelector("#p2p-room-name"),
    p2pRoomCode: document.querySelector("#p2p-room-code"),
    p2pRoomCopy: document.querySelector("#p2p-room-copy"),
    p2pRoomMode: document.querySelector("#p2p-room-mode"),
    p2pMemberCount: document.querySelector("#p2p-member-count"),
    p2pMemberList: document.querySelector("#p2p-member-list"),
    p2pHostSettings: document.querySelector("#p2p-host-settings"),
    p2pHostDifficulty: document.querySelector("#p2p-host-difficulty"),
    p2pHostJoinProgress: document.querySelector("#p2p-host-join-progress"),
    p2pRoomHint: document.querySelector("#p2p-room-hint"),
    p2pRoomReady: document.querySelector("#p2p-room-ready"),
    p2pRoomStart: document.querySelector("#p2p-room-start"),
    p2pRoomLeave: document.querySelector("#p2p-room-leave"),
    scoreboard: document.querySelector("#multiplayer-scoreboard"),
    scoreboardCount: document.querySelector("#multiplayer-count"),
    scoreboardPlayers: document.querySelector("#multiplayer-players"),
    fpsMeter: document.querySelector("#fps-meter"),
    fpsValue: document.querySelector("#fps-value")
  };

  const TAU = Math.PI * 2;
  const DESIGNER_CONFIG = globalThis.GSS0_DESIGNER_CONFIG || {};
  if (DESIGNER_CONFIG.schemaVersion !== 42) throw new Error("PROJECT GSS0 设计配置版本无效，需要 schemaVersion 42");
  const DESIGNER_BALANCE = DESIGNER_CONFIG.balance || {};
  const MODULE_DESIGN_STATES = DESIGNER_CONFIG.moduleStates || {};

  function designerNumber(key, fallback, minimum, maximum, integer = false) {
    const candidate = DESIGNER_BALANCE[key];
    if (!Number.isFinite(candidate)) return fallback;
    const clamped = Math.max(minimum, Math.min(maximum, candidate));
    return integer ? Math.round(clamped) : clamped;
  }

  const FROST_SLOW_PER_STACK = designerNumber("frostSlowPerStack", 0.2, 0, 1);
  const FROST_MINIMUM_SPEED_RATIO = designerNumber("frostMinimumSpeedRatio", 0.1, 0, 1);
  const BURN_TICK_INTERVAL = designerNumber("burnTickInterval", 0.3, 0.05, 10);
  const BURN_DAMAGE_PER_TICK = designerNumber("burnDamagePerTick", 1, 0, 1000, true);
  const CORROSION_TICK_INTERVAL = designerNumber("corrosionTickInterval", 3, 0.05, 30);
  const CORROSION_DAMAGE_PER_TICK = designerNumber("corrosionDamagePerTick", 1, 0, 1000, true);
  const BURN_HEALTH_FRACTION = designerNumber("burnHealthFraction", 0.5, 0, 1);
  const ENEMY_STATUS_PARTICLE_DENSITY = Math.round(designerNumber("enemyStatusParticleDensity", 3, 1, 8));
  const ENEMY_STATUS_PARTICLE_SIZE_SCALE = designerNumber("enemyStatusParticleSizeScale", 1.6, 0.5, 4);
  const ENEMY_STATUS_PARTICLE_GLOW_SCALE = designerNumber("enemyStatusParticleGlowScale", 1.8, 0.5, 4);
  const MODULE_INCENDIARY_PROJECTILE_SPEED = designerNumber("moduleIncendiaryProjectileSpeed", 230, 1, 1000);
  const MODULE_INCENDIARY_PROJECTILE_SIZE = designerNumber("moduleIncendiaryProjectileSize", 7, 1, 30);
  const MODULE_INCENDIARY_HOMING = designerNumber("moduleIncendiaryHoming", 5, 0, 20);
  const MODULE_MINE_BLAST_RADIUS_PIXELS = designerNumber("moduleMineBlastRadiusPixels", 62, 1, 500);
  const MODULE_MINE_VISUAL_RADIUS_PIXELS = designerNumber("moduleMineVisualRadiusPixels", 15, 1, 60);
  const XP_REQUIREMENT_BASE = designerNumber("xpRequirementBase", 5, 1, 100, true);
  const XP_REQUIREMENT_PER_LEVEL = designerNumber("xpRequirementPerLevel", 2, 0, 20, true);

  function experienceRequiredForLevel(currentLevel) {
    return XP_REQUIREMENT_BASE + Math.max(0, Math.floor(currentLevel)) * XP_REQUIREMENT_PER_LEVEL;
  }

  function moduleCooldownSeconds(moduleId, moduleLevel = 1, cooldownRateBonus = 0) {
    return MODULE_PROGRESSION.activeCooldownSeconds(moduleId, moduleLevel, cooldownRateBonus);
  }

  function formatCooldownSeconds(seconds) {
    return `${Number(seconds.toFixed(2))}秒`;
  }

  function activeCooldownLabel(moduleId, perTarget = false) {
    return `${formatCooldownSeconds(moduleCooldownSeconds(moduleId))}${perTarget ? "/目标" : ""}`;
  }

  const MODULE_CATALOG = globalThis.GSS0ModuleCatalog;
  const MODULE_PROGRESSION = globalThis.GSS0ModuleProgression;
  if (!Array.isArray(MODULE_CATALOG) || MODULE_CATALOG.length === 0 || !MODULE_PROGRESSION) {
    throw new Error("PROJECT GSS0 机体目录加载失败");
  }
  const MODULE_EFFECTS = MODULE_PROGRESSION.effects;
  const MODULES = MODULE_CATALOG.map((module) => Object.freeze({
    ...module,
    cooldown: module.activeCooldown
      ? activeCooldownLabel(module.id, module.id === "saw")
      : module.cooldown
  }));

  const MODULE_BY_ID = Object.fromEntries(MODULES.map((module) => [module.id, module]));
  const configuredUpgradeModules = MODULES.filter((module) => MODULE_DESIGN_STATES[module.id] !== "disabled");
  const UPGRADE_MODULES = configuredUpgradeModules.length ? configuredUpgradeModules : MODULES;
  const CODEX_MODULES = MODULES.filter((module) => MODULE_DESIGN_STATES[module.id] !== "disabled");
  const CODEX_ARCHIVE_NUMBERS = new Map(CODEX_MODULES.map((module, index) => [module.id, index + 1]));
  let moduleCodexCategory = "all";
  const TARGET_REQUIRED_MODULES = new Set([
    "frost", "prism", "tesla", "laser", "missile", "venom",
    "rail", "ricochet", "cluster", "fan", "gravity", "needle", "mortar", "sweep",
    "sniper", "flak", "fork", "anchor", "flare", "scatter", "lance", "execute",
    "crossfire", "phasebolt", "incendiary"
  ]);
  const UNLIMITED_PROJECTILE_MODULES = new Set([
    "spark", "frost", "prism", "nova", "missile", "venom", "echo", "rail",
    "ricochet", "cluster", "fan", "needle", "mortar", "fork", "anchor", "flare",
    "scatter", "lance", "crossfire", "phasebolt", "barrage", "thorns"
  ]);
  const FOOD_COLORS = ["#b8f53f", "#36dcff", "#ff4d96", "#ffd166", "#a98cff", "#54e1a6"];
  const ENEMY_COLORS = ["#ff5c62", "#ff8a4c", "#d95cff", "#ff477e", "#f4c542"];
  const GRID_SIZE = 24;
  const SNAKE_BODY_SIZE_SCALE = designerNumber("snakeBodySizeScale", 0.775, 0.25, 2);
  const SNAKE_SEGMENT_SPACING = designerNumber("snakeSegmentSpacing", 0.45, 0.1, 1.5);
  const ENEMY_HEAD_RADIUS_CELLS = 0.28 * SNAKE_BODY_SIZE_SCALE;
  const SNAKE_BODY_CONTACT_RANGE = 0.42 * SNAKE_BODY_SIZE_SCALE;
  const ENEMY_BODY_CONTACT_RANGE = 0.46 * SNAKE_BODY_SIZE_SCALE;
  const PLAYER_SELF_COLLISION_RANGE = 0.5 * SNAKE_BODY_SIZE_SCALE;
  const ENEMY_SELF_COLLISION_RANGE = 0.48 * SNAKE_BODY_SIZE_SCALE;
  const ARENA_BASE_SIZE = Math.sqrt(designerNumber("arenaBaseArea", 300, 64, 4096));
  const ARENA_AREA_PER_LEVEL = designerNumber("arenaAreaPerLevel", 0.03, 0, 0.5);
  const ARENA_RESIZE_RATE = designerNumber("arenaResizeRate", 2.4, 0.1, 10);
  const cameraFollowZoomFirst = designerNumber("cameraFollowZoomMin", 0.75, 0.25, 5);
  const cameraFollowZoomLast = designerNumber("cameraFollowZoomMax", 2.5, 0.25, 5);
  const CAMERA_FOLLOW_ZOOM_MIN = Math.min(cameraFollowZoomFirst, cameraFollowZoomLast);
  const CAMERA_FOLLOW_ZOOM_MAX = Math.max(cameraFollowZoomFirst, cameraFollowZoomLast);
  const CAMERA_FOLLOW_ZOOM_DEFAULT = clamp(
    designerNumber("cameraFollowZoomDefault", 1.5, 0.25, 5),
    CAMERA_FOLLOW_ZOOM_MIN,
    CAMERA_FOLLOW_ZOOM_MAX
  );
  const CAMERA_FOLLOW_RENDER_OVERSCAN_PIXELS = designerNumber("cameraFollowRenderOverscanPixels", 120, 0, 600, true);
  const CAMERA_FOLLOW_FOOD_INDICATOR_LIMIT = designerNumber("cameraFollowFoodIndicatorLimit", 6, 0, 100, true);
  const CAMERA_FOLLOW_ENEMY_INDICATOR_LIMIT = designerNumber("cameraFollowEnemyIndicatorLimit", 8, 0, 100, true);
  const FOOD_WALL_MARGIN = 2;
  const ENEMY_SPAWN_WARNING_TIME = designerNumber("enemySpawnWarning", 1.5, 0, 10);
  const ENEMY_SPAWN_ACTIVATION_DURATION = designerNumber("enemySpawnActivationDuration", 0.38, 0.05, 3);
  const ENEMY_SPAWN_ACTIVATION_PARTICLE_COUNT = designerNumber("enemySpawnActivationParticleCount", 5, 0, 30, true);
  const ENEMY_SPAWN_ACTIVATION_PARTICLE_SPEED = designerNumber("enemySpawnActivationParticleSpeed", 90, 0, 500);
  const ENEMY_SPAWN_ACTIVATION_RADIUS_CELLS = designerNumber("enemySpawnActivationRadiusCells", 0.52, 0, 3);
  const KNOCKBACK_INITIAL_SPEED = 10;
  const KNOCKBACK_DECAY = 8;
  const KNOCKBACK_STOP_SPEED = 0.04;
  const BOUNCE_SLOW_TIME = 0.78;
  const BOUNCE_LOCK_TIME = 0.34;
  const WAVE_BASE_INTERVAL = designerNumber("waveInterval", 6, 0.5, 120);
  const FOODS_PER_PLAYER_PER_WAVE = designerNumber("foodsPerPlayerPerWave", 2, 0, 20, true);
  const ENEMY_PRESSURE_WAVE_INTERVAL = designerNumber("enemyPressureWaveInterval", 5, 0, 50, true);
  const ENEMY_PRESSURE_COUNT_MULTIPLIER = designerNumber("enemyPressureEnemyCountMultiplier", 2, 1, 10, true);
  const ENEMY_PRESSURE_THREAT_MULTIPLIER = designerNumber("enemyPressureThreatMultiplier", 2, 1, 10);
  const ENEMY_EXPECTED_DPS_INTERVAL = designerNumber("enemyExpectedDpsInterval", 6, 0.1, 60);
  const ENEMY_THREAT_TIME_COEFFICIENT = designerNumber("enemyThreatTimeCoefficient", 6, 0, 120);
  const ENEMY_THREAT_GROWTH_PER_WAVE = designerNumber("enemyThreatGrowthPerWave", 0.02, 0, 1);
  const ENEMY_HEALTH_WEIGHT_VARIATION = designerNumber("enemyHealthWeightVariation", 0.25, 0, 1);
  const PROJECTILE_SPEED_SCALE = designerNumber("projectileSpeedScale", 3, 0.1, 10);
  const PROJECTILE_SIZE_SCALE = designerNumber("projectileSizeScale", 2, 0.1, 10);
  const PLAYER_BASE_SPEED = designerNumber("playerBaseSpeed", 5, 1, 12);
  const PLAYER_MAX_HEALTH = designerNumber("playerMaxHealth", 30, 0, 100);
  const PLAYER_HEALTH_REGEN_PER_SECOND = designerNumber("playerHealthRegenPerSecond", 1, 0, 1);
  const PLAYER_ENEMY_BODY_COLLISION_DAMAGE = designerNumber("playerEnemyBodyCollisionDamage", 10, 0, 10000);
  const PLAYER_WALL_COLLISION_DAMAGE = designerNumber("playerWallCollisionDamage", 5, 0, 10000);
  const PLAYER_KNOCKBACK_REAR_BLOCKED_ANGLE = designerNumber("playerKnockbackRearBlockedAngleDegrees", 60, 0, 180) * Math.PI / 180;
  const PLAYER_KNOCKBACK_REAR_CORRECTION_ANGLE = designerNumber("playerKnockbackRearCorrectionAngleDegrees", 150, 90, 180) * Math.PI / 180;
  const PLAYER_COLLISION_DAMAGE = designerNumber("playerCollisionDamage", 1, 0, 1000, true);
  const ENEMY_COLLISION_DAMAGE = designerNumber("enemyCollisionDamage", 1, 0, 1000, true);
  const PLAYER_TURN_RATE = designerNumber("playerTurnRate", 4.2, 0.5, 12);
  const AUTOMATIC_SHARP_TURN_THRESHOLD = designerNumber("automaticSharpTurnThresholdDegrees", 70, 0, 180) * Math.PI / 180;
  const AUTOMATIC_SELF_AVOIDANCE_STRENGTH = designerNumber("automaticSelfAvoidanceStrength", 3.2, 0, 20);
  const AUTOMATIC_SELF_AVOIDANCE_RANGE = designerNumber("automaticSelfAvoidanceRange", 3.2, 0, 10);
  const AUTOMATIC_TEAMMATE_AVOIDANCE_STRENGTH = designerNumber("automaticTeammateAvoidanceStrength", 3.4, 0, 20);
  const AUTOMATIC_TEAMMATE_AVOIDANCE_RANGE = designerNumber("automaticTeammateAvoidanceRange", 3.5, 0, 10);
  const ENEMY_BASE_SPEED = designerNumber("enemyBaseSpeed", 4, 0.5, 12);
  const ENEMY_SPEED_GROWTH_PER_WAVE = designerNumber("enemySpeedPerWave", 0.01, 0, 0.1);
  const ENEMY_SPEED_MAX_MULTIPLIER = designerNumber("enemySpeedMaxMultiplier", 1.12, 1, 3);
  const ENEMY_TURN_RATE = designerNumber("enemyTurnRate", 2.4, 0.1, 12);
  const ENEMY_THINK_INTERVAL_MIN = designerNumber("enemyThinkIntervalMin", 0.22, 0.05, 5);
  const ENEMY_THINK_INTERVAL_MAX = designerNumber("enemyThinkIntervalMax", 0.55, 0.05, 5);
  const ENEMY_FOOD_SEARCH_LIMIT = designerNumber("enemyFoodSearchLimit", 8, 1, 32, true);
  const ENEMY_WALL_AVOIDANCE_DISTANCE = designerNumber("enemyWallAvoidanceDistance", 1.35, 0.5, 6);
  const ENEMY_SPAWN_SAFETY_DISTANCE = designerNumber("enemySpawnSafetyDistance", 5, 0, 30);
  const ENEMY_SPAWN_FORWARD_PATH_HALF_WIDTH = designerNumber("enemySpawnForwardPathHalfWidth", 1.5, 0, 10);
  const waveDirectorApi = globalThis.GSS0WaveDirector;
  if (!waveDirectorApi) throw new Error("PROJECT GSS0 波次导演未加载");
  const enemyWaveDirector = waveDirectorApi.create({
    schedule: DESIGNER_CONFIG.waveEnemyCountSchedule,
    pressureWaveInterval: ENEMY_PRESSURE_WAVE_INTERVAL,
    pressureEnemyCountMultiplier: ENEMY_PRESSURE_COUNT_MULTIPLIER,
    pressureThreatMultiplier: ENEMY_PRESSURE_THREAT_MULTIPLIER,
    expectedDpsInterval: ENEMY_EXPECTED_DPS_INTERVAL,
    threatTimeCoefficient: ENEMY_THREAT_TIME_COEFFICIENT,
    threatGrowthPerWave: ENEMY_THREAT_GROWTH_PER_WAVE,
    speedGrowthPerWave: ENEMY_SPEED_GROWTH_PER_WAVE,
    speedMaxMultiplier: ENEMY_SPEED_MAX_MULTIPLIER,
    foodExperiencePerWave: FOODS_PER_PLAYER_PER_WAVE,
    xpRequirementBase: XP_REQUIREMENT_BASE,
    xpRequirementPerLevel: XP_REQUIREMENT_PER_LEVEL,
    healthWeightVariation: ENEMY_HEALTH_WEIGHT_VARIATION
  });
  function enemyArchetype(id, prefix, defaults) {
    return Object.freeze({
      id,
      unlockSeconds: designerNumber(`enemy${prefix}UnlockSeconds`, defaults.unlockSeconds, 0, 3600),
      spawnWeight: designerNumber(`enemy${prefix}SpawnWeight`, defaults.spawnWeight, 0, 20),
      healthWeight: designerNumber(`enemy${prefix}HealthWeight`, defaults.healthWeight, 0.01, 20),
      speedMultiplier: designerNumber(`enemy${prefix}SpeedMultiplier`, defaults.speedMultiplier, 0.1, 3),
      turnMultiplier: designerNumber(`enemy${prefix}TurnMultiplier`, defaults.turnMultiplier, 0.1, 3)
    });
  }
  const ENEMY_ARCHETYPES = Object.freeze([
    enemyArchetype("scout", "Scout", { unlockSeconds: 0, spawnWeight: 10, healthWeight: 1, speedMultiplier: 1, turnMultiplier: 1 }),
    enemyArchetype("forager", "Forager", { unlockSeconds: 0, spawnWeight: 5, healthWeight: 2, speedMultiplier: 0.75, turnMultiplier: 1 }),
    enemyArchetype("courier", "Courier", { unlockSeconds: 120, spawnWeight: 2.5, healthWeight: 4, speedMultiplier: 0.6, turnMultiplier: 1 }),
    enemyArchetype("charger", "Charger", { unlockSeconds: 60, spawnWeight: 3, healthWeight: 1, speedMultiplier: 1.5, turnMultiplier: 0.5 }),
    enemyArchetype("cutter", "Cutter", { unlockSeconds: 120, spawnWeight: 1.5, healthWeight: 2, speedMultiplier: 1.8, turnMultiplier: 1.8 }),
    enemyArchetype("coiler", "Coiler", { unlockSeconds: 180, spawnWeight: 2, healthWeight: 2, speedMultiplier: 1.5, turnMultiplier: 2 }),
    enemyArchetype("warden", "Warden", { unlockSeconds: 240, spawnWeight: 1, healthWeight: 8, speedMultiplier: 0.6, turnMultiplier: 0.9 })
  ]);
  const ENEMY_ARCHETYPE_BY_ID = Object.freeze(Object.fromEntries(ENEMY_ARCHETYPES.map((entry) => [entry.id, entry])));
  const ENEMY_PLAYER_BODY_AVOIDANCE = new Set(["courier", "charger", "cutter", "coiler", "warden"]);
  const ENEMY_ARCHETYPE_GLYPHS = Object.freeze({ scout: "·", forager: "F", courier: "◆", charger: "!", cutter: "×", coiler: "◎", warden: "▣" });
  const ENEMY_BEHAVIOR_TUNING = Object.freeze({
    bodyAvoidanceRange: designerNumber("enemyBodyAvoidanceRange", 3.2, 0.5, 10),
    scoutFoodRange: designerNumber("enemyScoutFoodRange", 6, 0, 30),
    courierFoodClusterRadius: designerNumber("enemyCourierFoodClusterRadius", 2.5, 0.5, 10),
    chargerTrackingWobble: designerNumber("enemyChargerTrackingWobble", 0.16, 0, 0.6),
    cutterLeadDistance: designerNumber("enemyCutterLeadDistance", 3.2, 0.5, 12),
    cutterLateralDistance: designerNumber("enemyCutterLateralDistance", 2.4, 0.5, 12),
    coilerFoodRange: designerNumber("enemyCoilerFoodRange", 6, 0, 30),
    wardenFoodRange: designerNumber("enemyWardenFoodRange", 6, 0, 30),
    wardenKnockbackMultiplier: designerNumber("enemyWardenKnockbackMultiplier", 2, 1, 4)
  });
  const UPGRADE_INVULNERABILITY_DURATION = designerNumber("upgradeInvulnerabilityDuration", 0.5, 0, 10);
  const RESPAWN_LOCATOR_CONVERGE_DURATION = designerNumber("respawnLocatorConvergeDuration", 1, 0.1, 10);
  const RESPAWN_LOCATOR_FADE_DURATION = designerNumber("respawnLocatorFadeDuration", 3, 0.1, 20);
  const MULTIPLAYER_GHOST_SPEED = designerNumber("multiplayerGhostSpeed", 0.6, 0.05, 3);
  const MULTIPLAYER_GHOST_PLEA_INTERVAL = designerNumber("multiplayerGhostPleaInterval", 0.65, 0.1, 5);
  const MULTIPLAYER_GHOST_PLEA_DURATION = designerNumber("multiplayerGhostPleaDuration", 0.9, 0.1, 3);
  const MULTIPLAYER_GHOST_OPACITY = designerNumber("multiplayerGhostOpacity", 0.36, 0.05, 0.9);
  const MULTIPLAYER_GHOST_PULSE_STRENGTH = designerNumber("multiplayerGhostPulseStrength", 0.12, 0, 0.4);
  const MULTIPLAYER_GHOST_PULSE_RATE = designerNumber("multiplayerGhostPulseRate", 1.1, 0.1, 5);
  const PLAYER_DAMAGE_EFFECT_DURATION = designerNumber("playerDamageEffectDuration", 0.65, 0.1, 5);
  const PLAYER_DAMAGE_FLASH_STRENGTH = designerNumber("playerDamageFlashStrength", 0.55, 0, 2);
  const PLAYER_DAMAGE_SHAKE_STRENGTH = designerNumber("playerDamageShakeStrength", 9, 0, 30);
  const PLAYER_DAMAGE_PARTICLE_COUNT = designerNumber("playerDamageParticleCount", 26, 0, 200, true);
  const PLAYER_DAMAGE_PARTICLE_SPEED = designerNumber("playerDamageParticleSpeed", 190, 0, 1000);
  const ENEMY_DAMAGE_NUMBER_DURATION = designerNumber("enemyDamageNumberDuration", 0.82, 0.1, 3);
  const COMBAT_TEXT_FONT_SIZE = designerNumber("combatTextFontSize", 38, 8, 96, true);
  const FOOD_BIRTH_DURATION = designerNumber("foodBirthDuration", 0.36, 0.05, 2);
  const MODULE_BLADE_ORBIT_SPEED = designerNumber("moduleBladeOrbitSpeed", 0.6, 0, 20);
  const MODULE_BLADE_ORBIT_CONVERGE_SPEED = designerNumber("moduleBladeOrbitConvergeSpeedCellsPerSecond", 8, 0, 30);
  const GROWTH_NODE_DELAY = 0.045;
  const GROWTH_PULSE_DURATION = 0.3;
  const SEGMENT_BIRTH_DURATION = 0.34;
  const LEVEL_UP_TRANSITION_DURATION = 0.9;
  const LEVEL_UP_TIME_SCALE = 0.15;
  const NETWORK_BASE_SNAPSHOT_MS = 1000 / 15;
  const NETWORK_SNAPSHOT_BUFFER_SIZE = 6;
  const NETWORK_MAX_EXTRAPOLATION_MS = 90;
  const NETWORK_INPUT_INTERVAL_MS = 1000 / designerNumber("networkPlayerStateHz", 20, 5, 60, true);
  const NETWORK_REMOTE_CORRECTION_THRESHOLD_CELLS = designerNumber("networkRemoteCorrectionThresholdCells", 0.75, 0.1, 10);
  const NETWORK_REMOTE_CORRECTION_SPEED_CELLS_PER_SECOND = designerNumber("networkRemoteCorrectionSpeedCellsPerSecond", 18, 1, 100);
  const networkRemoteCorrectionMinMs = designerNumber("networkRemoteCorrectionMinMs", 120, 0, 1000, true);
  const networkRemoteCorrectionMaxMs = designerNumber("networkRemoteCorrectionMaxMs", 450, 50, 2000, true);
  const NETWORK_REMOTE_CORRECTION_MIN_MS = Math.min(networkRemoteCorrectionMinMs, networkRemoteCorrectionMaxMs);
  const NETWORK_REMOTE_CORRECTION_MAX_MS = Math.max(networkRemoteCorrectionMinMs, networkRemoteCorrectionMaxMs);
  const NETWORK_COLLISION_CLAIM_COOLDOWN_MS = designerNumber("networkCollisionClaimCooldownMs", 500, 100, 2000, true);
  const NETWORK_INTERPOLATION_MIN_MS = designerNumber("networkInterpolationMinMs", 90, 40, 300, true);
  const NETWORK_INTERPOLATION_MAX_MS = designerNumber("networkInterpolationMaxMs", 120, 40, 400, true);
  const NETWORK_SNAPSHOT_STALL_TIMEOUT_MS = Math.max(NETWORK_BASE_SNAPSHOT_MS * 15, NETWORK_INTERPOLATION_MAX_MS * 4);
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
    hurt: PLAYER_DAMAGE_SHAKE_STRENGTH,
    kill: 7,
    blast: 5,
    bounce: 4.5
  });
  const ENEMY_DEATH_HEAD_PARTICLES = designerNumber("enemyDeathHeadParticles", 28, 1, 100, true);
  const ENEMY_DEATH_BODY_PARTICLES = designerNumber("enemyDeathBodyParticles", 7, 1, 40, true);
  const ENEMY_DEATH_HEAD_PARTICLE_SPEED = designerNumber("enemyDeathHeadParticleSpeed", 185, 10, 500);
  const ENEMY_DEATH_BODY_PARTICLE_SPEED = designerNumber("enemyDeathBodyParticleSpeed", 105, 10, 400);
  const ENEMY_BODY_RECONNECT_DURATION = designerNumber("enemyBodyReconnectDuration", 0.28, 0.05, 2);
  const ENEMY_HEAD_REFORM_DURATION = designerNumber("enemyHeadReformDuration", 0.42, 0.05, 2);
  const EXPERIENCE_COMPRESSION_DURATION = designerNumber("experienceCompressionDuration", 0.42, 0.05, 3);
  const EXPERIENCE_COMPRESSION_CASCADE_DELAY = designerNumber("experienceCompressionCascadeDelay", 0.18, 0, 2);
  const EXPERIENCE_COMPRESSION_GRAY_PARTICLES = designerNumber("experienceCompressionGrayParticles", 24, 1, 100, true);
  const EXPERIENCE_COMPRESSION_GOLD_PARTICLES = designerNumber("experienceCompressionGoldParticles", 42, 1, 160, true);
  const EXPERIENCE_COMPRESSION_GRAY_SHAKE = designerNumber("experienceCompressionGrayShake", 1.8, 0, 12);
  const EXPERIENCE_COMPRESSION_GOLD_SHAKE = designerNumber("experienceCompressionGoldShake", 5.2, 0, 16);
  const MAX_RENDER_FPS = designerNumber("maxRenderFps", 120, 30, 240, true);
  const MIN_RENDER_DPR = designerNumber("minRenderDpr", 0.65, 0.5, 1);
  const MAX_RENDER_DPR = Math.max(MIN_RENDER_DPR, designerNumber("maxRenderDpr", 1.25, 0.5, 2));
  const RENDER_DPR_SESSION_KEY = "gss0-render-dpr-limit";
  const AMBIENT_RENDER_INTERVAL = 1 / 30;
  const AMBIENT_RENDER_SCALE = 0.55;
  const MAX_DECORATIVE_PARTICLES = 720;
  const MAX_DECORATIVE_EFFECTS = 420;
  const ARENA_SHADOW_PADDING = 48;
  const FRAME_ERROR_LOG_INTERVAL_MS = 1000;

  let width = 1;
  let height = 1;
  let dpr = 1;
  let arenaWorldSize = ARENA_BASE_SIZE;
  let arena = { left: 16, top: 80, right: 241, bottom: 305, width: 225, height: 225, centerX: 128.5, centerY: 192.5, baseCellSize: 225 / ARENA_BASE_SIZE, cellSize: 225 / ARENA_BASE_SIZE, worldMin: (GRID_SIZE - ARENA_BASE_SIZE) / 2, worldMax: (GRID_SIZE + ARENA_BASE_SIZE) / 2 - 1, worldSize: ARENA_BASE_SIZE };
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
  let consecutiveFrameErrors = 0;
  let lastFrameErrorLogAt = -Infinity;
  let gameTime = 0;
  let score = 0;
  let kills = 0;
  let level = 0;
  let xp = 0;
  let xpNeeded = experienceRequiredForLevel(0);
  let lastNeeded = -1;
  let waveTimer = 0;
  let waveCount = 0;
  let nextEnemyId = 1;
  let nextLocalFoodId = 1;
  let nextLocalHazardId = 1;
  let shake = 0;
  let flash = 0;
  let audioContext = null;
  let nextEatToneAt = 0;
  const SOUND_DESIGN_REFERENCE_VOLUME = 0.5;
  const SOUND_MAX_VOLUME = 3;
  let soundVolume = loadSetting("ultra-snake-volume", 1, 0, SOUND_MAX_VOLUME);
  let fontScale = loadSetting("ultra-snake-font-scale", 1.5, 0.5, 2);
  let uiMotionStrength = loadSetting("gss0-ui-motion-strength", 1, 1, 3);
  let cameraMode = loadSetting("gss0-camera-mode", 1, 0, 1) >= 0.5 ? "follow" : "fixed";
  let followCameraZoom = loadSetting(
    "gss0-follow-camera-zoom",
    CAMERA_FOLLOW_ZOOM_DEFAULT,
    CAMERA_FOLLOW_ZOOM_MIN,
    CAMERA_FOLLOW_ZOOM_MAX
  );
  let screenShakeEnabled = loadSetting("gss0-screen-shake", 1, 0, 1) >= 0.5;
  let backgroundPauseEnabled = loadSetting("gss0-background-pause", 1, 0, 1) >= 0.5;
  let automaticModeEnabled = loadSetting("gss0-automatic-mode", 0, 0, 1) >= 0.5;
  let automaticModuleSelectionEnabled = loadSetting("gss0-automatic-module-selection", 0, 0, 1) >= 0.5;
  let automaticRestartEnabled = loadSetting("gss0-automatic-restart", 0, 0, 1) >= 0.5;
  let automaticModeSyncRevision = 0;
  let bestScore = loadBestScore();
  let recentPicks = [];
  const lastSoundAt = Object.create(null);

  let player = null;
  let visiblePlayers = [];
  let foods = [];
  const locallyPulledFoods = new Set();
  const localFoodContacts = new Map();
  const activeEnemyFoods = new Set();
  let enemies = [];
  const enemySpatialBuckets = new Map();
  const enemySpatialBucketPool = [];
  const enemyMovementStart = { col: 0, row: 0 };
  const enemyMovementEnd = { col: 0, row: 0 };
  let projectiles = [];
  const projectileContactBuffer = [];
  let hazards = [];
  let corrosionFieldTrailPoint = null;
  let particles = [];
  const particlePool = [];
  let nextParticleSlot = 0;
  let effects = [];
  let pendingEnemySpawns = [];
  let growthQueue = [];
  let activeGrowth = null;
  let upgradePending = false;
  let upgradeRevealTimer = 0;
  let respawnLocatorStartedAt = -Infinity;
  let lastAmbientRender = -Infinity;
  const renderWorldBounds = {
    active: false,
    left: -Infinity,
    top: -Infinity,
    right: Infinity,
    bottom: Infinity,
    viewportLeft: -Infinity,
    viewportTop: -Infinity,
    viewportRight: Infinity,
    viewportBottom: Infinity
  };
  const foodIndicatorCandidates = [];
  const foodIndicatorDistances = [];
  const enemyIndicatorCandidates = [];
  const enemyIndicatorDistances = [];
  let indicatorCameraX = 0;
  let indicatorCameraY = 0;

  const network = {
    enabled: false,
    connecting: false,
    transport: null,
    boundTransport: null,
    p2pClient: null,
    lobbyReady: false,
    lobbyBusy: false,
    rooms: [],
    room: null,
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
    lastResyncRequestAt: -Infinity,
    renderServerTime: NaN,
    renderGameTime: NaN,
    lastPresentationAt: 0,
    presentationSnapshot: null,
    lastHudTick: -1,
    lastSelfAlive: false,
    inputSequence: 0,
    lastInputAt: 0,
    localDesiredAngle: NaN,
    localDeathPending: false,
    collisionClaims: new Map(),
    localHurtPredictions: [],
    localEnemyDeaths: new Map(),
    enemyBodyDamageOps: new Map(),
    pendingEnemyHeadReforms: new Map(),
    pendingVisualEffects: [],
    lastFoodContactAt: 0,
    playerViews: new Map(),
    enemyViews: new Map(),
    foodViews: new Map(),
    foodIndexes: new Map(),
    foodMotions: new Map(),
    foodRevision: 0,
    foodDeltaUpserts: [],
    foodDeltaSpawns: [],
    hazardViews: new Map(),
    hazardIndexes: new Map(),
    spawnViews: new Map(),
    spawnIndexes: new Map(),
    activatingSpawnViews: new Map(),
    worldObjectRevision: 0,
    upgradeOffer: null,
    moduleIds: []
  };
  const networkSnapshotCodec = globalThis.GSS0NetworkCodec;
  if (!networkSnapshotCodec) throw new Error("PROJECT GSS0 网络快照解码器未加载");
  const networkProjectileRuntime = globalThis.GSS0ProjectileRuntime?.create(GRID_SIZE);
  if (!networkProjectileRuntime) throw new Error("PROJECT GSS0 投射物运行时未加载");
  const networkPlayerPredictionRuntime = globalThis.GSS0PlayerPrediction?.create({
    knockbackDecay: KNOCKBACK_DECAY,
    knockbackStopSpeed: KNOCKBACK_STOP_SPEED,
    segmentSpacing: playerSegmentSpacing
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
  const localFoodSpatialRuntime = globalThis.GSS0FoodClaimRuntime.create();
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

  function closestPointOnGridSegment(point, start, end) {
    const deltaCol = end.col - start.col;
    const deltaRow = end.row - start.row;
    const lengthSquared = deltaCol * deltaCol + deltaRow * deltaRow;
    const progress = lengthSquared > 0.000001
      ? clamp(((point.col - start.col) * deltaCol + (point.row - start.row) * deltaRow) / lengthSquared, 0, 1)
      : 0;
    return {
      col: start.col + deltaCol * progress,
      row: start.row + deltaRow * progress
    };
  }

  function sweptCapsuleContactProgress(start, end, capsuleStart, capsuleEnd, radius) {
    const pathCol = end.col - start.col;
    const pathRow = end.row - start.row;
    const capsuleCol = capsuleEnd.col - capsuleStart.col;
    const capsuleRow = capsuleEnd.row - capsuleStart.row;
    const offsetCol = start.col - capsuleStart.col;
    const offsetRow = start.row - capsuleStart.row;
    const pathLengthSquared = pathCol * pathCol + pathRow * pathRow;
    const capsuleLengthSquared = capsuleCol * capsuleCol + capsuleRow * capsuleRow;
    const pathCapsuleDot = pathCol * capsuleCol + pathRow * capsuleRow;
    const pathOffsetDot = pathCol * offsetCol + pathRow * offsetRow;
    const capsuleOffsetDot = capsuleCol * offsetCol + capsuleRow * offsetRow;
    let pathProgress = 0;
    let capsuleProgress = 0;

    if (pathLengthSquared <= 0.000001) {
      capsuleProgress = capsuleLengthSquared > 0.000001
        ? clamp(capsuleOffsetDot / capsuleLengthSquared, 0, 1)
        : 0;
    } else if (capsuleLengthSquared <= 0.000001) {
      pathProgress = clamp(-pathOffsetDot / pathLengthSquared, 0, 1);
    } else {
      const denominator = pathLengthSquared * capsuleLengthSquared - pathCapsuleDot * pathCapsuleDot;
      pathProgress = denominator > 0.000001
        ? clamp((pathCapsuleDot * capsuleOffsetDot - pathOffsetDot * capsuleLengthSquared) / denominator, 0, 1)
        : 0;
      capsuleProgress = (pathCapsuleDot * pathProgress + capsuleOffsetDot) / capsuleLengthSquared;
      if (capsuleProgress < 0) {
        capsuleProgress = 0;
        pathProgress = clamp(-pathOffsetDot / pathLengthSquared, 0, 1);
      } else if (capsuleProgress > 1) {
        capsuleProgress = 1;
        pathProgress = clamp((pathCapsuleDot - pathOffsetDot) / pathLengthSquared, 0, 1);
      }
    }

    const pathContactCol = start.col + pathCol * pathProgress;
    const pathContactRow = start.row + pathRow * pathProgress;
    const capsuleContactCol = capsuleStart.col + capsuleCol * capsuleProgress;
    const capsuleContactRow = capsuleStart.row + capsuleRow * capsuleProgress;
    return (pathContactCol - capsuleContactCol) ** 2 + (pathContactRow - capsuleContactRow) ** 2 < radius * radius
      ? pathProgress
      : null;
  }

  function bodyConnectionContact(point, snake, range, firstSegmentIndex = 0) {
    const rangeSquared = range * range;
    for (let index = firstSegmentIndex; index < snake.segments.length; index += 1) {
      const segment = snake.segments[index];
      const previous = index > 0 ? snake.segments[index - 1] : snake;
      const connectionCol = segment.col - previous.col;
      const connectionRow = segment.row - previous.row;
      const connectionLengthSquared = connectionCol * connectionCol + connectionRow * connectionRow;
      const progress = connectionLengthSquared > 0.000001
        ? clamp(((point.col - previous.col) * connectionCol + (point.row - previous.row) * connectionRow) / connectionLengthSquared, 0, 1)
        : 0;
      const contactCol = previous.col + connectionCol * progress;
      const contactRow = previous.row + connectionRow * progress;
      const deltaCol = point.col - contactCol;
      const deltaRow = point.row - contactRow;
      if (deltaCol * deltaCol + deltaRow * deltaRow < rangeSquared) {
        return { point: { col: contactCol, row: contactRow }, segment, segmentIndex: index };
      }
    }
    return null;
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
    soundVolume = clamp(value, 0, SOUND_MAX_VOLUME);
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

  function applyFollowCameraZoom(value, persist = true) {
    followCameraZoom = clamp(value, CAMERA_FOLLOW_ZOOM_MIN, CAMERA_FOLLOW_ZOOM_MAX);
    ui.cameraZoomOutput.textContent = `${Math.round(followCameraZoom * 100)}%`;
    if (persist) saveSetting("gss0-follow-camera-zoom", followCameraZoom);
  }

  function applyCameraMode(value, persist = true) {
    cameraMode = value === "follow" ? "follow" : "fixed";
    const followsHead = cameraMode === "follow";
    const label = followsHead ? "跟随蛇头" : "固定视角";
    ui.cameraModeFixed.checked = !followsHead;
    ui.cameraModeFollow.checked = followsHead;
    ui.cameraModeOutput.textContent = label;
    ui.cameraZoomStatus.classList.toggle("is-visible", followsHead);
    ui.cameraZoomStatus.setAttribute("aria-hidden", String(!followsHead));
    ui.cameraButton.classList.toggle("is-follow", followsHead);
    ui.shell.classList.toggle("is-follow-camera", followsHead);
    updateSettingButtonLabel(ui.cameraButton, `摄像机模式，当前${label}`, `摄像机 ${label}`);
    pointer.active = false;
    if (persist) saveSetting("gss0-camera-mode", followsHead ? 1 : 0);
  }

  function triggerScreenShake(strength) {
    if (!screenShakeEnabled) return;
    shake = Math.max(shake, strength);
  }

  function applyScreenShake(enabled, persist = true) {
    screenShakeEnabled = Boolean(enabled);
    ui.screenShakeToggle.checked = screenShakeEnabled;
    ui.screenShakeButton.classList.toggle("is-disabled", !screenShakeEnabled);
    if (!screenShakeEnabled) shake = 0;
    const status = screenShakeEnabled ? "已开启" : "已关闭";
    updateSettingButtonLabel(ui.screenShakeButton, `屏幕震动${status}`, `屏幕震动${status}`);
    if (persist) saveSetting("gss0-screen-shake", screenShakeEnabled ? 1 : 0);
  }

  function applyBackgroundPause(enabled, persist = true) {
    backgroundPauseEnabled = Boolean(enabled);
    ui.backgroundPauseToggle.checked = backgroundPauseEnabled;
    ui.backgroundPauseButton.classList.toggle("is-disabled", !backgroundPauseEnabled);
    const status = backgroundPauseEnabled ? "已开启" : "已关闭";
    updateSettingButtonLabel(ui.backgroundPauseButton, `后台暂停${status}`, `后台暂停${status}`);
    if (persist) saveSetting("gss0-background-pause", backgroundPauseEnabled ? 1 : 0);
  }

  function automaticModePreferences() {
    return {
      enabled: automaticModeEnabled,
      autoSelectModules: automaticModuleSelectionEnabled,
      autoRestart: automaticRestartEnabled
    };
  }

  function applyAutomaticModuleSelection(enabled, persist = true) {
    automaticModuleSelectionEnabled = Boolean(enabled);
    ui.automaticModuleSelectionToggle.checked = automaticModuleSelectionEnabled;
    if (automaticModeEnabled && automaticModuleSelectionEnabled && state === "upgrade") scheduleAutomaticUpgrade();
    if (persist) saveSetting("gss0-automatic-module-selection", automaticModuleSelectionEnabled ? 1 : 0);
  }

  function scheduleAutomaticRestart() {
    if (!automaticModeEnabled || !automaticRestartEnabled || network.enabled || state !== "gameover") return;
    window.setTimeout(() => {
      if (automaticModeEnabled && automaticRestartEnabled && !network.enabled && state === "gameover") startGame();
    }, 0);
  }

  function applyAutomaticRestart(enabled, persist = true) {
    automaticRestartEnabled = Boolean(enabled);
    ui.automaticRestartToggle.checked = automaticRestartEnabled;
    scheduleAutomaticRestart();
    if (persist) saveSetting("gss0-automatic-restart", automaticRestartEnabled ? 1 : 0);
  }

  function updateAutomaticModeState(enabled, persist = true) {
    automaticModeEnabled = Boolean(enabled);
    ui.automaticModeToggle.checked = automaticModeEnabled;
    ui.automaticModeButton.classList.toggle("is-active", automaticModeEnabled);
    ui.shell.classList.toggle("is-automatic-mode", automaticModeEnabled);
    const status = automaticModeEnabled ? "已开启" : "已关闭";
    updateSettingButtonLabel(ui.automaticModeButton, `自动战斗${status}，按 A 键切换`, `自动战斗${status} · A 键切换`);
    if (automaticModeEnabled) ui.shell.dataset.automaticMode = "enabled";
    else delete ui.shell.dataset.automaticMode;
    pointer.active = false;
    if (!automaticModeEnabled && network.enabled && player?.alive) {
      networkPlayerPredictionRuntime.adoptLocal(player);
      network.localDesiredAngle = player.desiredAngle;
    }
    if (automaticModeEnabled) {
      if (!network.enabled && state === "upgrade") showUpgrade();
      else scheduleAutomaticUpgrade();
      scheduleAutomaticRestart();
    }
    if (persist) saveSetting("gss0-automatic-mode", automaticModeEnabled ? 1 : 0);
  }

  function reconcileAutomaticNetworkState() {
    if (!network.enabled) return;
    if (automaticModeEnabled) {
      resetNetworkPredictionInput();
      if (automaticRestartEnabled && state === "gameover") {
        enterRunningState();
        ui.gameOver.classList.remove("is-visible");
      }
      const self = network.snapshot?.players.find((item) => item.entityId === network.selfEntityId);
      if (self && !self.alive && !automaticRestartEnabled && state !== "menu" && state !== "gameover") showNetworkGameOver(self);
      return;
    }
    if (player?.alive && state === "running") {
      networkPlayerPredictionRuntime.adoptLocal(player);
      network.localDesiredAngle = player.desiredAngle;
      sendNetworkInput(true, true);
    }
    const self = network.snapshot?.players.find((item) => item.entityId === network.selfEntityId);
    if (self && !self.alive && state !== "menu" && state !== "gameover") showNetworkGameOver(self);
  }

  function setAutomaticMode(enabled, persist = true, synchronizeNetwork = true) {
    const previous = automaticModeEnabled;
    updateAutomaticModeState(enabled, persist);
    if (!synchronizeNetwork || !network.enabled || !network.transport?.connected) return;
    const revision = ++automaticModeSyncRevision;
    void emitNetworkAction("ultra:autopilot", automaticModePreferences()).then((result) => {
      if (revision !== automaticModeSyncRevision) return;
      if (!result?.ok) {
        updateAutomaticModeState(previous, persist);
        reconcileAutomaticNetworkState();
        setNetworkStatus("error", `ULTRA LINK / ${result?.error || "无法切换自动战斗"}`);
        return;
      }
      reconcileAutomaticNetworkState();
    });
  }

  function setAutomaticModuleSelection(enabled, persist = true, synchronizeNetwork = true) {
    const previous = automaticModuleSelectionEnabled;
    applyAutomaticModuleSelection(enabled, persist);
    if (!synchronizeNetwork || !network.enabled || !network.transport?.connected) return;
    const revision = ++automaticModeSyncRevision;
    void emitNetworkAction("ultra:autopilot", automaticModePreferences()).then((result) => {
      if (revision !== automaticModeSyncRevision) return;
      if (!result?.ok) {
        applyAutomaticModuleSelection(previous, persist);
        setNetworkStatus("error", `ULTRA LINK / ${result?.error || "无法同步自动选机设置"}`);
      }
    });
  }

  function setAutomaticRestart(enabled, persist = true, synchronizeNetwork = true) {
    const previous = automaticRestartEnabled;
    applyAutomaticRestart(enabled, persist);
    if (!synchronizeNetwork || !network.enabled || !network.transport?.connected) return;
    const revision = ++automaticModeSyncRevision;
    void emitNetworkAction("ultra:autopilot", automaticModePreferences()).then((result) => {
      if (revision !== automaticModeSyncRevision) return;
      if (!result?.ok) {
        applyAutomaticRestart(previous, persist);
        setNetworkStatus("error", `ULTRA LINK / ${result?.error || "无法同步自动重开设置"}`);
        return;
      }
      reconcileAutomaticNetworkState();
    });
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
      [ui.cameraButton, ui.cameraPopover],
      [ui.screenShakeButton, ui.screenShakePopover],
      [ui.backgroundPauseButton, ui.backgroundPausePopover],
      [ui.automaticModeButton, ui.automaticModePopover]
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
        enemy.radius = arena.cellSize * ENEMY_HEAD_RADIUS_CELLS;
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
      baseCellSize: arenaSize / ARENA_BASE_SIZE,
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
    const safeSize = Math.max(ARENA_BASE_SIZE, Number(nextSize) || ARENA_BASE_SIZE);
    if (Math.abs(safeSize - arenaWorldSize) < 0.00001) return;
    const previousArena = arena;
    arenaWorldSize = safeSize;
    updateArenaBounds();
    transformArenaVisuals(previousArena);
    if (constrainContents) {
      for (const food of foods) {
        const previousCol = food.col;
        const previousRow = food.row;
        food.col = clamp(food.col, arena.worldMin, arena.worldMax);
        food.row = clamp(food.row, arena.worldMin, arena.worldMax);
        if (!network.enabled && (food.col !== previousCol || food.row !== previousRow)) localFoodSpatialRuntime.trackFood(food);
      }
    }
    if (constrainContents || network.enabled) {
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
      enemy.radius = arena.cellSize * ENEMY_HEAD_RADIUS_CELLS;
      for (const segment of enemy.segments) syncNodePosition(segment);
    }
    for (const food of foods) {
      syncNodePosition(food);
      food.radius = arena.cellSize * 0.13;
    }
    for (const hazard of hazards) if (Number.isFinite(hazard.col) && Number.isFinite(hazard.row)) syncNodePosition(hazard);
  }

  function updateArenaWorldSize(dt, highestLevel) {
    const target = ARENA_BASE_SIZE * Math.sqrt(1 + Math.max(0, highestLevel) * ARENA_AREA_PER_LEVEL);
    const amount = 1 - Math.exp(-ARENA_RESIZE_RATE * dt);
    const nextSize = arenaWorldSize + (target - arenaWorldSize) * amount;
    setArenaWorldSize(Math.abs(target - nextSize) < 0.0001 ? target : nextSize, true);
  }

  function cameraPosition() {
    if (cameraMode === "follow" && player) return { x: player.x, y: player.y };
    return { x: arena.centerX, y: arena.centerY };
  }

  function cameraZoom() {
    return cameraMode === "follow" ? followCameraZoom : 1;
  }

  function cameraViewportBounds() {
    if (cameraMode === "follow") {
      return { left: 0, top: 0, right: width, bottom: height, width, height, centerX: width / 2, centerY: height / 2 };
    }
    return arena;
  }

  function applyCameraViewportClip() {
    const viewport = cameraViewportBounds();
    ctx.beginPath();
    ctx.rect(viewport.left, viewport.top, viewport.width, viewport.height);
    ctx.clip();
  }

  function applyCameraTransform() {
    const camera = cameraPosition();
    const zoom = cameraZoom();
    ctx.translate(arena.centerX, arena.centerY);
    ctx.scale(zoom, zoom);
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
    const zoom = cameraZoom();
    const point = unprojectArenaPoint(x, y);
    return {
      x: camera.x + (point.x - arena.centerX) / zoom,
      y: camera.y + (point.y - arena.centerY) / zoom
    };
  }

  function worldToScreen(x, y) {
    const camera = cameraPosition();
    const zoom = cameraZoom();
    return projectArenaPoint(
      arena.centerX + (x - camera.x) * zoom,
      arena.centerY + (y - camera.y) * zoom
    );
  }

  function updateRenderWorldBounds() {
    if (cameraMode !== "follow") {
      renderWorldBounds.active = false;
      return;
    }
    const topLeft = screenToWorld(0, 0);
    const topRight = screenToWorld(width, 0);
    const bottomLeft = screenToWorld(0, height);
    const bottomRight = screenToWorld(width, height);
    const viewportLeft = Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
    const viewportTop = Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);
    const viewportRight = Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
    const viewportBottom = Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);
    const overscan = CAMERA_FOLLOW_RENDER_OVERSCAN_PIXELS / cameraZoom();
    renderWorldBounds.active = true;
    renderWorldBounds.viewportLeft = viewportLeft;
    renderWorldBounds.viewportTop = viewportTop;
    renderWorldBounds.viewportRight = viewportRight;
    renderWorldBounds.viewportBottom = viewportBottom;
    renderWorldBounds.left = viewportLeft - overscan;
    renderWorldBounds.top = viewportTop - overscan;
    renderWorldBounds.right = viewportRight + overscan;
    renderWorldBounds.bottom = viewportBottom + overscan;
  }

  function pointIntersectsRenderBounds(x, y, radius = 0) {
    return !renderWorldBounds.active
      || x + radius >= renderWorldBounds.left
      && x - radius <= renderWorldBounds.right
      && y + radius >= renderWorldBounds.top
      && y - radius <= renderWorldBounds.bottom;
  }

  function lineIntersectsRenderBounds(from, to, margin = 0) {
    return !renderWorldBounds.active
      || Math.max(from.x, to.x) + margin >= renderWorldBounds.left
      && Math.min(from.x, to.x) - margin <= renderWorldBounds.right
      && Math.max(from.y, to.y) + margin >= renderWorldBounds.top
      && Math.min(from.y, to.y) - margin <= renderWorldBounds.bottom;
  }

  function rectIntersectsRenderBounds(left, top, right, bottom, margin = 0) {
    return !renderWorldBounds.active
      || right + margin >= renderWorldBounds.left
      && left - margin <= renderWorldBounds.right
      && bottom + margin >= renderWorldBounds.top
      && top - margin <= renderWorldBounds.bottom;
  }

  function snakeIntersectsRenderBounds(head, segments, margin = 0) {
    if (!renderWorldBounds.active || pointIntersectsRenderBounds(head.x, head.y, margin)) return true;
    let previous = head;
    for (const segment of segments) {
      if (pointIntersectsRenderBounds(segment.x, segment.y, margin)
        || lineIntersectsRenderBounds(previous, segment, margin)) return true;
      previous = segment;
    }
    return false;
  }

  function pointIsOutsideCameraViewport(x, y) {
    return renderWorldBounds.active && (
      x < renderWorldBounds.viewportLeft
      || x > renderWorldBounds.viewportRight
      || y < renderWorldBounds.viewportTop
      || y > renderWorldBounds.viewportBottom
    );
  }

  function resetOffscreenIndicatorCandidates() {
    foodIndicatorCandidates.length = 0;
    foodIndicatorDistances.length = 0;
    enemyIndicatorCandidates.length = 0;
    enemyIndicatorDistances.length = 0;
    if (renderWorldBounds.active) {
      const camera = cameraPosition();
      indicatorCameraX = camera.x;
      indicatorCameraY = camera.y;
    }
  }

  function trackNearestOffscreenIndicator(target, candidates, distances, limit) {
    if (limit <= 0 || !pointIsOutsideCameraViewport(target.x, target.y)) return;
    const distance = (target.x - indicatorCameraX) ** 2 + (target.y - indicatorCameraY) ** 2;
    if (candidates.length < limit) {
      candidates.push(target);
      distances.push(distance);
      return;
    }
    let farthestIndex = 0;
    for (let index = 1; index < distances.length; index += 1) {
      if (distances[index] > distances[farthestIndex]) farthestIndex = index;
    }
    if (distance >= distances[farthestIndex]) return;
    candidates[farthestIndex] = target;
    distances[farthestIndex] = distance;
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

  function enemySegmentRadiusPixels() {
    return 9 * arenaVisualScale() * SNAKE_BODY_SIZE_SCALE;
  }

  function arenaVisualScale() {
    return arena.cellSize / arena.baseCellSize;
  }

  function arenaPieceScale() {
    return arena.baseCellSize / 34 * arenaVisualScale() * SNAKE_BODY_SIZE_SCALE;
  }

  function missingHealthFraction(target = player) {
    if (!target || target.maxHealth <= 0) return 0;
    return clamp(1 - target.health / target.maxHealth, 0, 1);
  }

  function playerMoveSpeedBonus() {
    const feast = player?.foodBoost > 0 ? MODULE_EFFECTS.feastSpeedBonus(moduleCount("feast")) : 0;
    return MODULE_EFFECTS.progressorSpeedBonus(moduleCount("progressor"))
      + MODULE_EFFECTS.missingHealthSpeedBonus(moduleCount("adrenaline"), missingHealthFraction())
      + feast;
  }

  function playerBaseSpeed() {
    return PLAYER_BASE_SPEED * (1 + playerMoveSpeedBonus());
  }

  function playerTurnRate() {
    return PLAYER_TURN_RATE * (1 + MODULE_EFFECTS.hasteTurnRateBonus(moduleCount("haste")));
  }

  function playerSegmentSpacing() {
    return SNAKE_SEGMENT_SPACING * (1 + MODULE_EFFECTS.segmentSpacingBonus(moduleCount("linkage")));
  }

  function playerHeadDamage(hitEnemyHead = false) {
    return PLAYER_COLLISION_DAMAGE
      + moduleCount("ram")
      + MODULE_EFFECTS.missingHealthHeadDamageBonus(moduleCount("berserk"), missingHealthFraction())
      + (hitEnemyHead ? MODULE_EFFECTS.headCollisionDamageBonus(moduleCount("headstrike")) : 0);
  }

  function playerHealthRegenRate() {
    const healthFraction = player?.maxHealth > 0 ? clamp(player.health / player.maxHealth, 0, 1) : 0;
    return PLAYER_HEALTH_REGEN_PER_SECOND
      + MODULE_EFFECTS.healthRegenBonus(moduleCount("renewal"))
      + MODULE_EFFECTS.crisisRegen(moduleCount("crisis"), healthFraction);
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
      moduleLevel: options.moduleLevel ?? (options.module ? 1 : 0),
      neutral: Boolean(options.neutral),
      tailGuard: Boolean(options.tailGuard),
      experienceTier: options.experienceTier ?? 0,
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
    return window.GSS0LobbyNavigation.resolveLobbyUrl({
      currentHref: window.location.href,
      referrer: document.referrer
    });
  }

  function setNetworkStatus(kind, text) {
    ui.networkStatus.classList.remove("is-online", "is-connecting", "is-error");
    if (kind) ui.networkStatus.classList.add(`is-${kind}`);
    ui.networkStatus.textContent = text;
  }

  function setNetworkButtonsDisabled(disabled) {
    ui.multiplayerModeButton.disabled = disabled || !network.lobbyReady;
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
      await connectP2PLobby();
    } catch (error) {
      if (localModeForced) return;
      network.connecting = false;
      setNetworkButtonsDisabled(false);
      setNetworkStatus("error", `联机接入失败 / ${error instanceof Error ? error.message : "请刷新重试"}`);
    }
  }

  function waitForP2PRuntime() {
    if (window.GSS0P2P?.createClient) return Promise.resolve(window.GSS0P2P);
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        window.removeEventListener("gss0:p2p-ready", ready);
        reject(new Error("P2P 客户端模块加载超时"));
      }, 10000);
      const ready = () => {
        window.clearTimeout(timeout);
        window.removeEventListener("gss0:p2p-ready", ready);
        if (window.GSS0P2P?.createClient) resolve(window.GSS0P2P);
        else reject(new Error("P2P 客户端模块无效"));
      };
      window.addEventListener("gss0:p2p-ready", ready, { once: true });
    });
  }

  async function connectP2PLobby() {
    if (localModeForced || network.p2pClient) return;
    const runtime = await waitForP2PRuntime();
    const client = await runtime.createClient({
      ioFactory: (options) => window.io(options),
      socketPath: gameEndpoint("socket.io").pathname,
      principal: network.principal || {}
    });
    if (localModeForced) {
      client.close();
      return;
    }
    network.p2pClient = client;
    network.lobbyReady = true;
    network.connecting = false;
    network.rooms = client.rooms || [];
    network.room = client.room || null;
    client.on("rooms", (rooms) => {
      network.rooms = Array.isArray(rooms) ? rooms : [];
      renderP2PRoomList();
    });
    client.on("room", (room) => {
      network.room = room || null;
      renderP2PRoom(room || null);
    });
    client.on("status", (status) => {
      const kind = status?.kind === "error" ? "error" : status?.kind === "connecting" ? "connecting" : "online";
      setNetworkStatus(kind, status?.text || "P2P 大厅");
      if (ui.p2pLobbyStatus) ui.p2pLobbyStatus.textContent = status?.text || "P2P 大厅";
    });
    client.on("room-closed", (reason) => {
      network.enabled = false;
      network.room = null;
      network.transport = null;
      network.boundTransport = null;
      network.lastSelfAlive = false;
      clearNetworkViews();
      renderP2PRoom(null);
      setNetworkStatus("error", reason || "房间已关闭");
      if (ui.p2pLobbyStatus) ui.p2pLobbyStatus.textContent = reason || "房间已关闭";
      if (ui.p2pLobby && !localModeForced) ui.p2pLobby.classList.add("is-visible");
    });
    client.on("game-ready", (payload) => initializeP2PGame(payload));
    client.on("game-error", (message) => {
      setNetworkStatus("error", message || "P2P 游戏连接失败");
      if (ui.p2pLobbyStatus) ui.p2pLobbyStatus.textContent = message || "P2P 游戏连接失败";
    });
    setNetworkButtonsDisabled(false);
    setNetworkStatus("online", `P2P LOBBY / @${network.principal?.username || client.profile?.bestScore || "PLAYER"}`);
    if (ui.p2pLobbyStatus) ui.p2pLobbyStatus.textContent = "选择建立房间或加入房间";
    renderP2PRoomList();
    renderP2PRoom(network.room);
  }

  function initializeP2PGame(payload) {
    const transport = payload?.transport;
    const joinData = payload?.joinData;
    if (!transport || !joinData) return;
    if (!validateNetworkProtocols(joinData.snapshotProtocolVersion, joinData.playerStateProtocolVersion, network.p2pClient)) return;
    network.transport = transport;
    network.room = payload.room || network.room;
    network.enabled = true;
    network.connecting = false;
    network.selfEntityId = joinData.selfEntityId;
    network.roster = joinData.roster || [];
    clearNetworkViews();
    resetNetworkFoodViews(joinData.snapshot.foods, joinData.foodRevision);
    resetNetworkWorldObjects(joinData.snapshot.hazards, joinData.snapshot.pendingSpawns, joinData.snapshot.worldObjectRevision);
    joinData.snapshot.foods.length = 0;
    joinData.snapshot.hazards.length = 0;
    joinData.snapshot.pendingSpawns.length = 0;
    joinData.snapshot.worldObjectsComplete = false;
    network.snapshot = joinData.snapshot;
    network.snapshotBuffer = [networkSnapshotEntry(joinData.snapshot)];
    network.receivedAt = performance.now();
    network.snapshotIntervalMs = NETWORK_BASE_SNAPSHOT_MS;
    network.snapshotGapMs = NETWORK_BASE_SNAPSHOT_MS;
    network.snapshotJitterMs = 0;
    network.lastResyncRequestAt = -Infinity;
    network.renderServerTime = NaN;
    network.renderGameTime = joinData.snapshot.gameTime;
    network.lastPresentationAt = 0;
    const joinedSelf = joinData.snapshot.players.find((item) => item.entityId === network.selfEntityId);
    network.localDesiredAngle = joinedSelf?.desiredAngle ?? NaN;
    if (joinedSelf?.alive) {
      networkPlayerPredictionRuntime.reconcile(joinedSelf);
      startRespawnLocator();
    }
    networkProjectileRuntime.reset(joinData.projectiles || joinData.snapshot.projectiles || []);
    projectiles = networkProjectileRuntime.items;
    network.lastSelfAlive = Boolean(joinedSelf?.alive);
    bestScore = Math.max(bestScore, Number(joinData.profile?.bestScore) || 0);
    ui.best.textContent = Math.floor(bestScore).toLocaleString("zh-CN");
    bindP2PGameTransport(transport);
    renderNetworkRoster(joinData.snapshot.players);
    applyNetworkPresentation(joinData.snapshot, joinData.snapshot, network.snapshotBuffer[0].indexes, 1, performance.now());
    ui.p2pLobby.classList.remove("is-visible");
    ui.start.classList.remove("is-visible");
    setNetworkButtonsDisabled(false);
    setNetworkStatus("online", network.p2pClient?.isHost ? "P2P HOST / SHARED WORLD" : "P2P CLIENT / CONNECTED");
    void startNetworkGame(Boolean(joinedSelf?.alive));
  }

  function bindP2PGameTransport(transport) {
    if (network.boundTransport === transport) return;
    network.boundTransport = transport;
    transport.on("ultra:snapshot", (payload) => {
      if (localModeForced || !network.enabled) return;
      const reusableEntry = network.snapshotBuffer.length >= NETWORK_SNAPSHOT_BUFFER_SIZE
        && network.snapshotBuffer[0]?.snapshot !== network.presentationSnapshot
        ? network.snapshotBuffer.shift()
        : null;
      try {
        const snapshot = networkSnapshotCodec.decode(payload, MODULES, reusableEntry?.snapshot);
        receiveNetworkFoodMotions(snapshot.foods);
        receiveNetworkWorldObjectSnapshot(snapshot);
        snapshot.foods.length = 0;
        receiveNetworkSnapshot(snapshot, reusableEntry);
      } catch (error) {
        console.error("PROJECT GSS0 快照无效", error);
        requestNetworkSnapshotResync();
      }
    });
    transport.on("ultra:foods", receiveNetworkFoodDelta);
    transport.on("ultra:world-objects", receiveNetworkWorldObjectDelta);
    transport.on("ultra:projectiles", (events) => {
      if (localModeForced) return;
      networkProjectileRuntime.applyEvents(events);
      projectiles = networkProjectileRuntime.items;
    });
    transport.on("ultra:skill-spawn", receiveNetworkSkillSpawn);
    transport.on("ultra:effects", receiveNetworkEffects);
    transport.on("ultra:player-head-collision", (event) => {
      if (!localModeForced) networkHeadCollisionRuntime.receive(event, performance.now());
    });
    transport.on("ultra:roster", (roster) => {
      if (localModeForced) return;
      network.roster = Array.isArray(roster) ? roster : [];
      renderNetworkRoster(network.snapshot?.players);
    });
    transport.on("ultra:upgrade", (offer) => {
      if (localModeForced) return;
      network.upgradeOffer = offer;
      if (offer) showUpgrade(offer.options.map((id) => MODULE_BY_ID[id]).filter(Boolean));
      else if (state === "upgrade") {
        ui.upgrade.classList.remove("is-visible");
        enterRunningState();
      }
    });
    transport.on("ultra:world-commit", (commit) => receiveNetworkWorldCommit(commit));
  }

  function receiveNetworkSkillSpawn(spawn) {
    if (
      localModeForced
      || !network.enabled
      || !network.transport?.connected
      || !spawn
      || spawn.ownerEntityId !== network.selfEntityId
      || spawn.ownerPeerId !== network.p2pClient?.peerId
    ) return;
    const claim = {
      hitId: spawn.hitId,
      spawnId: spawn.spawnId,
      ownerPeerId: spawn.ownerPeerId,
      ownerEntityId: spawn.ownerEntityId,
      targetId: spawn.targetId,
      targetSegmentIndex: spawn.targetSegmentIndex,
      moduleId: spawn.moduleId ?? null,
      amount: spawn.amount,
      impactCol: spawn.impactCol,
      impactRow: spawn.impactRow,
      observedAt: performance.now()
    };
    network.transport.emit("ultra:hit-claim", claim, (result) => {
      if (!result?.ok && result?.error) setNetworkStatus("error", `P2P 命中未提交 / ${result.error}`);
    });
  }

  function openP2PLobby() {
    if (!network.lobbyReady) {
      setNetworkStatus("connecting", "正在连接 P2P 大厅");
      return;
    }
    closeSettingPopovers();
    ui.start.classList.remove("is-visible");
    ui.p2pLobby.classList.add("is-visible");
    renderP2PRoomList();
    renderP2PRoom(network.room);
    void network.p2pClient?.refreshRooms();
  }

  function closeP2PLobby() {
    if (network.enabled) return;
    ui.p2pLobby.classList.remove("is-visible");
    ui.start.classList.add("is-visible");
  }

  function renderP2PRoomList() {
    if (!ui.p2pRoomList) return;
    ui.p2pRoomList.replaceChildren();
    const rooms = Array.isArray(network.rooms) ? network.rooms : [];
    if (rooms.length === 0) {
      const empty = document.createElement("div");
      empty.className = "p2p-room-empty";
      empty.textContent = "当前没有公开房间。\n创建一个房间，等队友加入。";
      ui.p2pRoomList.append(empty);
      return;
    }
    for (const room of rooms) {
      const card = document.createElement("article");
      card.className = `p2p-room-card${room.status === "playing" ? " is-playing" : ""}`;
      const copy = document.createElement("div");
      const title = document.createElement("h4");
      title.textContent = room.name;
      const detail = document.createElement("p");
      detail.textContent = `${room.hostName} · ${room.memberCount}/${room.maxPlayers} 人 · ${room.status === "playing" ? "进行中" : "等待中"} · ${room.code}`;
      copy.append(title, detail);
      const join = document.createElement("button");
      join.className = "secondary-button";
      join.type = "button";
      join.textContent = room.status === "playing" ? "加入进行中" : "加入";
      join.disabled = room.memberCount >= room.maxPlayers;
      join.addEventListener("click", () => void joinP2PRoom({ roomId: room.id }));
      card.append(copy, join);
      ui.p2pRoomList.append(card);
    }
  }

  function renderP2PRoom(room) {
    network.room = room || null;
    const hasRoom = Boolean(room);
    ui.p2pLobbyBrowser.hidden = hasRoom;
    ui.p2pRoomWaiting.hidden = !hasRoom;
    if (!hasRoom) return;
    ui.p2pRoomName.textContent = room.name;
    ui.p2pRoomCode.textContent = room.code;
    ui.p2pRoomMode.textContent = `${room.config.modeId === "standard" ? "标准模式" : room.config.modeId} · 难度 ${room.config.difficulty} · 房主运行共享世界`;
    ui.p2pMemberCount.textContent = `${room.members.length}/${room.config.maxPlayers}`;
    ui.p2pMemberList.replaceChildren();
    for (const member of room.members) {
      const row = document.createElement("li");
      row.className = "p2p-member-row";
      const name = document.createElement("strong");
      name.textContent = member.name || member.playerId;
      const meta = document.createElement("span");
      meta.className = member.isHost ? "p2p-member-badge" : member.ready ? "p2p-member-ready" : "";
      meta.textContent = member.isHost ? "房主" : member.ready ? "已准备" : "未准备";
      row.append(name, meta);
      ui.p2pMemberList.append(row);
    }
    const isHost = Boolean(network.p2pClient?.isHost);
    ui.p2pHostSettings.hidden = !isHost;
    ui.p2pRoomReady.hidden = isHost || room.status === "playing";
    ui.p2pRoomStart.hidden = !isHost || room.status !== "waiting";
    ui.p2pRoomReady.textContent = room.members.find((member) => member.peerId === network.p2pClient?.peerId)?.ready ? "取消准备" : "准备";
    ui.p2pRoomHint.textContent = room.status === "playing" ? "正在建立房主星型 P2P 连接…" : isHost ? "所有玩家准备后开始行动。" : "等待房主开始行动。";
    ui.p2pHostDifficulty.value = String(room.config.difficulty);
    ui.p2pHostJoinProgress.value = String(room.config.allowJoinInProgress);
  }

  async function joinP2PRoom(payload) {
    if (!network.p2pClient || network.lobbyBusy) return;
    network.lobbyBusy = true;
    ui.p2pLobbyStatus.textContent = "正在加入房间…";
    const result = await network.p2pClient.joinRoom(payload);
    network.lobbyBusy = false;
    if (!result?.ok) ui.p2pLobbyStatus.textContent = result?.error || "加入房间失败";
  }

  async function createP2PRoom() {
    if (!network.p2pClient || network.lobbyBusy) return;
    network.lobbyBusy = true;
    ui.p2pLobbyStatus.textContent = "正在创建房间…";
    const result = await network.p2pClient.createRoom({
      name: ui.p2pCreateName.value.trim(),
      isPrivate: ui.p2pCreatePrivate.checked,
      config: { maxPlayers: Number(ui.p2pCreateMax.value) }
    });
    network.lobbyBusy = false;
    if (!result?.ok) ui.p2pLobbyStatus.textContent = result?.error || "创建房间失败";
  }

  async function leaveP2PRoom() {
    if (!network.p2pClient || network.lobbyBusy) return;
    network.lobbyBusy = true;
    ui.p2pLobbyStatus.textContent = "正在离开房间…";
    const result = await network.p2pClient.leaveRoom();
    network.lobbyBusy = false;
    if (!result?.ok) {
      ui.p2pLobbyStatus.textContent = result?.error || "离开房间失败";
      return;
    }
    network.room = null;
    renderP2PRoom(null);
    ui.p2pLobbyStatus.textContent = "已离开房间，可以建立或加入新的房间";
  }

  function updateP2PRoomConfig() {
    if (!network.p2pClient?.isHost || !network.room) return;
    const config = {
      difficulty: Number(ui.p2pHostDifficulty.value),
      allowJoinInProgress: ui.p2pHostJoinProgress.value === "true"
    };
    void network.p2pClient.updateConfig(config).then((result) => {
      if (!result?.ok) ui.p2pLobbyStatus.textContent = result?.error || "房主设置更新失败";
    });
  }

  async function copyP2PRoomCode() {
    const code = network.room?.code || ui.p2pRoomCode.textContent?.trim();
    if (!code) return;
    try {
      await navigator.clipboard?.writeText(code);
    } catch {
      const helper = document.createElement("textarea");
      helper.value = code;
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.append(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
    }
    ui.p2pLobbyStatus.textContent = `房间码 ${code} 已复制`;
  }

  function receiveNetworkWorldCommit(_commit) {
    // World commits are reliable receipts. The next snapshot reconciles the
    // exact enemy shape while this event lets a Unity client play the impact
    // immediately without waiting for the 15 Hz snapshot cadence.
  }

  const NETWORK_PROTOCOL_REFRESH_KEY = "gss0-network-protocol-refresh";

  function validateNetworkProtocols(snapshotServerVersion, playerStateServerVersion, connection) {
    const snapshotClientVersion = networkSnapshotCodec.version;
    const playerStateClientVersion = networkPlayerStateCodec.version;
    if (
      Number.isSafeInteger(snapshotServerVersion)
      && snapshotServerVersion === snapshotClientVersion
      && Number.isSafeInteger(playerStateServerVersion)
      && playerStateServerVersion === playerStateClientVersion
    ) {
      try {
        window.sessionStorage.removeItem(NETWORK_PROTOCOL_REFRESH_KEY);
      } catch {
        // Storage can be unavailable in privacy-restricted browser contexts.
      }
      return true;
    }
    network.connecting = false;
    setNetworkButtonsDisabled(false);
    const signature = [
      snapshotClientVersion ?? "unknown",
      snapshotServerVersion ?? "unknown",
      playerStateClientVersion ?? "unknown",
      playerStateServerVersion ?? "unknown"
    ].join(":");
    let shouldReload = false;
    try {
      shouldReload = window.sessionStorage.getItem(NETWORK_PROTOCOL_REFRESH_KEY) !== signature;
      if (shouldReload) window.sessionStorage.setItem(NETWORK_PROTOCOL_REFRESH_KEY, signature);
    } catch {
      // Avoid an unbounded refresh loop when session storage is unavailable.
    }
    if (shouldReload) {
      setNetworkStatus("connecting", "联机版本已更新 / 正在刷新");
      window.location.reload();
      return false;
    }
    connection?.disconnect?.();
    connection?.close?.();
    setNetworkStatus("error", "联机资源版本不一致 / 请刷新页面");
    return false;
  }

  function requestNetworkSnapshotResync(now = performance.now()) {
    if (
      !network.enabled
      || !network.transport?.connected
      || now - network.lastResyncRequestAt < NETWORK_SNAPSHOT_STALL_TIMEOUT_MS
    ) return;
    network.lastResyncRequestAt = now;
    network.transport.emit("ultra:resync");
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
      if (automaticModeEnabled && automaticRestartEnabled) {
        enterRunningState();
        ui.upgrade.classList.remove("is-visible");
        ui.gameOver.classList.remove("is-visible");
      } else {
        showNetworkGameOver(self);
      }
    }
    if (!network.lastSelfAlive && selfAlive && automaticModeEnabled && state !== "menu") {
      enterRunningState();
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
    network.localHurtPredictions.length = 0;
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
    ui.shell.classList.toggle("is-multiplayer", network.enabled);
    ui.scoreboard.setAttribute("aria-hidden", String(!network.enabled));
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
        cells = { row, id, levelCell, scoreCell, colorIndex: -1, level: NaN, ghost: false, score: NaN, playerId: "", name: "" };
        network.scoreboardRows.set(item.entityId, cells);
        orderChanged = true;
      }
      cells.row.classList.toggle("is-self", item.entityId === network.selfEntityId);
      cells.row.classList.toggle("is-out", !stateItem.alive);
      cells.row.classList.toggle("is-ghost", Boolean(stateItem.ghost));
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
      if (cells.level !== stateItem.level || cells.ghost !== Boolean(stateItem.ghost)) {
        cells.level = stateItem.level;
        cells.ghost = Boolean(stateItem.ghost);
        cells.levelCell.textContent = cells.ghost ? "幽灵" : stateItem.level;
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

  function applyEnemyBodyDamageOperationsInPlace(segments, operations) {
    if (!Array.isArray(segments) || !operations?.length) return segments;
    for (const operation of operations) {
      if (segments.length !== operation.beforeCount) continue;
      const start = clamp(operation.start, 0, segments.length);
      segments.splice(start, clamp(operation.count, 0, segments.length - start));
    }
    return segments;
  }

  // Reliable hit operations project older volatile snapshots onto the already-damaged body.
  function projectedEnemySegments(items, operations, scratch) {
    if (!operations?.length) return items || [];
    let projectedCount = items?.length || 0;
    for (const operation of operations) {
      if (projectedCount !== operation.beforeCount) continue;
      const start = clamp(operation.start, 0, projectedCount);
      projectedCount -= clamp(operation.count, 0, projectedCount - start);
    }
    if (projectedCount === (items?.length || 0)) return items || [];
    scratch.length = 0;
    for (const item of items || []) scratch.push(item);
    return applyEnemyBodyDamageOperationsInPlace(scratch, operations);
  }

  function projectedEnemyHead(item, operations, scratch) {
    if (!item || !operations?.length) return item;
    scratch.length = 0;
    for (const segment of item.segments || []) scratch.push(segment);
    let head = item;
    for (const operation of operations) {
      if (scratch.length !== operation.beforeCount) continue;
      const start = clamp(operation.start, 0, scratch.length);
      const count = clamp(operation.count, 0, scratch.length - start);
      if (operation.promoteHead && count > 0) head = scratch[start + count - 1] || head;
      scratch.splice(start, count);
    }
    return head;
  }

  function isSharedNetworkVisual(item) {
    return item.audienceEntityId == null && (
      item.type === "burst"
      || item.type === "ring"
      || item.type === "beam"
      || item.type === "lightning"
      || item.type === "text"
    );
  }

  function networkEffectPoint(item, col = item.col, row = item.row) {
    let anchor = null;
    if (item.anchorKind === "enemy") anchor = network.enemyViews.get(item.anchorId);
    else if (item.anchorKind === "player") anchor = network.playerViews.get(item.anchorId);
    if (anchor && Number.isInteger(item.anchorSegmentIndex) && item.anchorSegmentIndex >= 0) {
      anchor = anchor.segments?.[item.anchorSegmentIndex] || anchor;
    }
    return Number.isFinite(anchor?.x) && Number.isFinite(anchor?.y) ? anchor : cellCenter(col, row);
  }

  function formatDamageAmount(amount) {
    return Number.isInteger(amount) ? String(amount) : String(Number(amount.toFixed(1)));
  }

  function pulseHealthHud() {
    ui.healthGroup.classList.remove("is-hit");
    void ui.healthGroup.offsetWidth;
    ui.healthGroup.classList.add("is-hit");
    window.setTimeout(() => ui.healthGroup.classList.remove("is-hit"), PLAYER_DAMAGE_EFFECT_DURATION * 1000);
  }

  function playPlayerHurtPresentation(target, amount, affectsSelf) {
    if (!target || amount <= 0) return;
    const x = Number.isFinite(target.x) ? target.x : cellCenter(target.col, target.row).x;
    const y = Number.isFinite(target.y) ? target.y : cellCenter(target.col, target.row).y;
    target.damageFlashUntil = performance.now() + PLAYER_DAMAGE_EFFECT_DURATION * 1000;
    burst(x, y, "#ff355e", PLAYER_DAMAGE_PARTICLE_COUNT, PLAYER_DAMAGE_PARTICLE_SPEED);
    effects.push({
      type: "ring",
      x,
      y,
      color: "#ff355e",
      life: PLAYER_DAMAGE_EFFECT_DURATION,
      maxLife: PLAYER_DAMAGE_EFFECT_DURATION,
      radius: Math.max(4, (target.radius || playerHeadRadiusPixels()) * 0.45),
      endRadius: Math.max(18, (target.radius || playerHeadRadiusPixels()) * 2.8)
    });
    effects.push({
      type: "text",
      x,
      y: y - (target.radius || playerHeadRadiusPixels()),
      text: `-${formatDamageAmount(amount)}`,
      color: "#ff355e",
      life: PLAYER_DAMAGE_EFFECT_DURATION,
      maxLife: PLAYER_DAMAGE_EFFECT_DURATION,
      emphasis: true
    });
    if (!affectsSelf) return;
    sound("hurt", 0, network.enabled ? network.selfEntityId : null);
    triggerScreenShake(PLAYER_DAMAGE_SHAKE_STRENGTH);
    flash = Math.max(flash, PLAYER_DAMAGE_FLASH_STRENGTH);
    pulseHealthHud();
  }

  function playPlayerHealPresentation(target, amount, affectsSelf, color = "#65e6ae") {
    if (!target || amount <= 0) return;
    const x = Number.isFinite(target.x) ? target.x : cellCenter(target.col, target.row).x;
    const y = Number.isFinite(target.y) ? target.y : cellCenter(target.col, target.row).y;
    burst(x, y, color, 22, 120);
    effects.push({ type: "ring", x, y, color, life: 0.62, maxLife: 0.62, radius: 5, endRadius: Math.max(22, (target.radius || playerHeadRadiusPixels()) * 2.2) });
    effects.push({ type: "text", x, y: y - (target.radius || playerHeadRadiusPixels()), text: `+${formatDamageAmount(amount)}`, color, life: 0.82, maxLife: 0.82, emphasis: true });
    if (!affectsSelf) return;
    sound("heal", 0, network.enabled ? network.selfEntityId : null);
    ui.healthGroup.classList.remove("is-heal");
    void ui.healthGroup.offsetWidth;
    ui.healthGroup.classList.add("is-heal");
    window.setTimeout(() => ui.healthGroup.classList.remove("is-heal"), 620);
  }

  function playGhostRevivePresentation(target) {
    if (!target) return;
    target.nextGhostPleaAt = Infinity;
    const headRadius = target.radius || playerHeadRadiusPixels();
    const side = target.entityId % 2 === 0 ? 1 : -1;
    playPlayerHealPresentation(target, Math.max(0, target.health || 0), target.entityId === network.selfEntityId, "#bcefff");
    effects.push({
      type: "text",
      x: target.x + side * headRadius * 2.4,
      y: target.y - headRadius * 0.25,
      text: "复活",
      color: "#ffffff",
      life: MULTIPLAYER_GHOST_PLEA_DURATION,
      maxLife: MULTIPLAYER_GHOST_PLEA_DURATION,
      emphasis: true
    });
  }

  function updateGhostPlea(target, now) {
    if (!target?.ghost) {
      target.nextGhostPleaAt = Infinity;
      return;
    }
    if (Number.isFinite(target.nextGhostPleaAt) && now < target.nextGhostPleaAt) return;
    target.nextGhostPleaAt = now + MULTIPLAYER_GHOST_PLEA_INTERVAL * 1000;
    const headRadius = target.radius || playerHeadRadiusPixels();
    const side = target.entityId % 2 === 0 ? 1 : -1;
    effects.push({
      type: "text",
      x: target.x + side * headRadius * 2.4,
      y: target.y - headRadius * 0.25,
      text: "救救我",
      color: "#bcefff",
      life: MULTIPLAYER_GHOST_PLEA_DURATION,
      maxLife: MULTIPLAYER_GHOST_PLEA_DURATION,
      emphasis: true
    });
  }

  function predictNetworkPlayerHurt(amount) {
    if (!player || amount <= 0) return;
    if (consumeShieldCharge()) return;
    const damage = effectivePlayerDamage(amount);
    if (damage <= 0) return;
    const now = performance.now();
    network.localHurtPredictions.push({ amount: damage, at: now });
    if (network.localHurtPredictions.length > 4) network.localHurtPredictions.shift();
    if (Number.isFinite(player.health)) player.health = Math.max(0, player.health - damage);
    playPlayerHurtPresentation(player, damage, true);
    updateHud();
  }

  function consumeNetworkHurtPrediction(amount, now = performance.now()) {
    let matched = false;
    let writeIndex = 0;
    for (const prediction of network.localHurtPredictions) {
      if (now - prediction.at > 1500) continue;
      if (!matched && Math.abs(prediction.amount - amount) < 0.01) {
        matched = true;
        continue;
      }
      network.localHurtPredictions[writeIndex++] = prediction;
    }
    network.localHurtPredictions.length = writeIndex;
    return matched;
  }

  function applyNetworkEffect(item) {
    if (item.type === "experienceSettle") {
      cancelExperienceCompressionEffects(item.ownerEntityId);
      retainInPlace(network.pendingVisualEffects, (effect) => (
        effect.type !== "experienceCompress" || effect.ownerEntityId !== item.ownerEntityId
      ));
      const target = network.playerViews.get(item.ownerEntityId);
      if (target) {
        target.growth = null;
        target.experienceSettled = true;
        for (const segment of target.segments || []) {
          if (segment.neutral) segment.birthAge = null;
        }
      }
      if (item.ownerEntityId === network.selfEntityId) activeGrowth = null;
      return;
    }
    if (item.type === "playerHurt") {
      const target = network.playerViews.get(item.playerEntityId) || cellCenter(item.col, item.row);
      const affectsSelf = item.playerEntityId === network.selfEntityId;
      target.health = item.health;
      target.maxHealth = item.maxHealth;
      if (!affectsSelf || !consumeNetworkHurtPrediction(item.amount)) {
        playPlayerHurtPresentation(target, item.amount, affectsSelf);
      }
      if (affectsSelf) updateHud();
      return;
    }
    if (item.type === "playerHeal") {
      const target = network.playerViews.get(item.playerEntityId) || cellCenter(item.col, item.row);
      const affectsSelf = item.playerEntityId === network.selfEntityId;
      target.health = item.health;
      target.maxHealth = item.maxHealth;
      playPlayerHealPresentation(target, item.amount, affectsSelf, item.color);
      if (affectsSelf) updateHud();
      return;
    }
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
      return;
    }
    if (item.type === "feedback") {
      triggerScreenShake(NETWORK_SHAKE_BY_FEEDBACK[item.kind] || 0);
      return;
    }
    if (item.type === "flash") {
      flash = Math.max(flash, item.strength || 0);
      return;
    }
    if (item.type === "enemyBodyHit" || item.type === "enemyHeadHit") {
      let operations = network.enemyBodyDamageOps.get(item.enemyId);
      if (!operations) {
        operations = [];
        network.enemyBodyDamageOps.set(item.enemyId, operations);
      }
      if (operations.some((operation) => operation.id === item.id)) return;
      const operation = {
        id: item.id,
        beforeCount: Math.max(0, Math.floor(item.beforeCount)),
        start: item.type === "enemyHeadHit" ? 0 : Math.max(0, Math.floor(item.start)),
        count: Math.max(0, Math.floor(item.count)),
        promoteHead: item.type === "enemyHeadHit"
      };
      operations.push(operation);
      const renderedEnemy = network.enemyViews.get(item.enemyId);
      if (renderedEnemy) {
        const canApply = renderedEnemy.segments.length === operation.beforeCount;
        const promotedSegment = canApply && operation.promoteHead
          ? renderedEnemy.segments[operation.start + operation.count - 1] || null
          : null;
        const renderedOldHead = canApply
          ? { x: renderedEnemy.x, y: renderedEnemy.y, col: renderedEnemy.col, row: renderedEnemy.row }
          : null;
        applyEnemyBodyDamageOperationsInPlace(renderedEnemy.segments, operations);
        if (item.type === "enemyHeadHit") {
          const oldHead = renderedOldHead || cellCenter(item.oldHead.col, item.oldHead.row);
          if (promotedSegment) setEnemyHeadFromPromotion(renderedEnemy, promotedSegment, oldHead);
          playEnemyHeadReformPresentation(renderedEnemy, oldHead, item.color, item.duration);
        } else {
          startEnemyReconnect(renderedEnemy, item.reconnectIndex, performance.now());
        }
      } else if (item.type === "enemyHeadHit") {
        network.pendingEnemyHeadReforms.set(item.enemyId, item);
      }
      return;
    }
    if (item.type === "snakeDeath") {
      if (network.localEnemyDeaths.has(item.enemyId)) return;
      network.localEnemyDeaths.set(item.enemyId, performance.now());
      network.pendingEnemyHeadReforms.delete(item.enemyId);
      const renderedEnemy = network.enemyViews.get(item.enemyId);
      const head = renderedEnemy || cellCenter(item.head.col, item.head.row);
      const segments = renderedEnemy?.segments?.length
        ? renderedEnemy.segments
        : item.segments.map((segment) => cellCenter(segment.col, segment.row));
      if (renderedEnemy) renderedEnemy.dead = true;
      playEnemyDeathPresentation(head, segments, item.color, {
        playSound: true,
        rewardSelf: item.ownerEntityId === network.selfEntityId,
        soundSourceEntityId: item.ownerEntityId
      });
      return;
    }
    if (item.type === "experienceCompress") {
      const sources = item.sources.map((source) => cellCenter(source.col, source.row));
      const target = cellCenter(item.target.col, item.target.row);
      queueExperienceCompression(
        sources,
        target,
        item.fromTier,
        item.toTier,
        item.delay || 0,
        item.ownerEntityId,
        item.ownerEntityId === network.selfEntityId
      );
      return;
    }
    const from = networkEffectPoint(item);
    if (item.type === "burst") {
      burst(from.x, from.y, item.color, item.count, item.speed);
    } else if (item.type === "ring") {
      const scale = arenaVisualScale();
      const endRadius = item.endRadiusUnit === "pixels" ? item.endRadius * scale : item.endRadius * arena.cellSize;
      effects.push({ type: "ring", x: from.x, y: from.y, color: item.color, life: item.life, maxLife: item.life, radius: item.radius * scale, endRadius });
    } else if (item.type === "beam" || item.type === "lightning") {
      const to = cellCenter(item.col2, item.row2);
      const width = item.width ? item.width * arenaVisualScale() : undefined;
      effects.push({ type: item.type, x: from.x, y: from.y, x2: to.x, y2: to.y, color: item.color, width, life: item.life, maxLife: item.life });
    } else if (item.type === "text") {
      effects.push({
        type: "text",
        x: from.x,
        y: from.y,
        text: item.text,
        color: item.color,
        life: item.life,
        maxLife: item.life,
        emphasis: Boolean(item.emphasis) || item.text === "击破",
        damageNumber: Boolean(item.damageNumber)
      });
    }
  }

  function flushPendingNetworkVisualEffects() {
    if (!Number.isFinite(network.renderServerTime) || network.pendingVisualEffects.length === 0) return;
    let writeIndex = 0;
    for (const item of network.pendingVisualEffects) {
      if (!Number.isFinite(item.serverTime) || item.serverTime <= network.renderServerTime + 4) applyNetworkEffect(item);
      else network.pendingVisualEffects[writeIndex++] = item;
    }
    network.pendingVisualEffects.length = writeIndex;
  }

  function receiveNetworkEffects(items) {
    if (localModeForced || !Array.isArray(items)) return;
    for (const item of items) {
      if (item.audienceEntityId != null && item.audienceEntityId !== network.selfEntityId) continue;
      if (
        isSharedNetworkVisual(item)
        && Number.isFinite(item.serverTime)
        && Number.isFinite(network.renderServerTime)
        && item.serverTime > network.renderServerTime + 4
      ) {
        network.pendingVisualEffects.push(item);
        continue;
      }
      applyNetworkEffect(item);
    }
    if (network.pendingVisualEffects.length > MAX_DECORATIVE_EFFECTS) {
      network.pendingVisualEffects.splice(0, network.pendingVisualEffects.length - MAX_DECORATIVE_EFFECTS);
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
    const target = indexes || { players: new Map(), enemies: new Map() };
    previousById(snapshot?.players, "entityId", target.players);
    previousById(snapshot?.enemies, "id", target.enemies);
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
    network.renderGameTime = NaN;
    network.lastHudTick = -1;
    network.playerViews.clear();
    network.enemyViews.clear();
    network.enemyBodyDamageOps.clear();
    network.pendingEnemyHeadReforms.clear();
    network.pendingVisualEffects.length = 0;
    network.foodViews.clear();
    network.foodIndexes.clear();
    network.foodMotions.clear();
    network.foodRevision = 0;
    network.hazardViews.clear();
    network.hazardIndexes.clear();
    network.spawnViews.clear();
    network.spawnIndexes.clear();
    network.activatingSpawnViews.clear();
    network.worldObjectRevision = 0;
    foods.length = 0;
    hazards.length = 0;
    pendingEnemySpawns.length = 0;
    locallyPulledFoods.clear();
    localFoodContacts.clear();
    localFoodSpatialRuntime.clear();
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
    const spawnedFoods = network.foodDeltaSpawns;
    const upsertedFoods = network.foodDeltaUpserts;
    spawnedFoods.length = 0;
    upsertedFoods.length = 0;
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
      if (isNew) {
        food.birthAge = 0;
        addNetworkFoodView(food);
      }
      if (!food.isPulled) network.foodMotions.delete(food.id);
      upsertedFoods.push(food);
      if (isNew && !delta.reset) {
        spawnedFoods.push(food);
      }
    }
    network.foodRevision = revision;
    networkFoodClaimRuntime.applyDelta(upsertedFoods, removedIds, Boolean(delta.reset), performance.now());
    for (const food of upsertedFoods) food.networkHidden = networkFoodClaimRuntime.shouldHide(food.id);
    const firstAnimatedFood = Math.max(0, spawnedFoods.length - MAX_DECORATIVE_EFFECTS);
    for (let index = firstAnimatedFood; index < spawnedFoods.length; index += 1) playNetworkFoodSpawn(spawnedFoods[index]);
    if (spawnedFoods.length > 0) sound("foodSpawn");
    spawnedFoods.length = 0;
    upsertedFoods.length = 0;
  }

  function isNewerNetworkRevision(candidate, current) {
    const difference = (candidate - current) >>> 0;
    return difference > 0 && difference < 0x80000000;
  }

  function addNetworkHazardView(hazard) {
    network.hazardIndexes.set(hazard.id, hazards.length);
    hazards.push(hazard);
  }

  function removeNetworkHazardView(id) {
    const index = network.hazardIndexes.get(id);
    if (index === undefined) return;
    const last = hazards.pop();
    if (index < hazards.length) {
      hazards[index] = last;
      network.hazardIndexes.set(last.id, index);
    }
    network.hazardIndexes.delete(id);
    network.hazardViews.delete(id);
  }

  function upsertNetworkHazardView(item) {
    if (!Number.isSafeInteger(item?.id)) return;
    let hazard = network.hazardViews.get(item.id);
    const isNew = !hazard;
    if (!hazard) {
      hazard = {};
      network.hazardViews.set(item.id, hazard);
    }
    const phase = hazard.phase;
    Object.assign(hazard, item);
    if (!isNew && Number.isFinite(phase)) hazard.phase = phase;
    syncNodePosition(hazard);
    hazard.radius = Math.max(0, Number(item.radius) || 0) * arena.cellSize;
    if (isNew) addNetworkHazardView(hazard);
  }

  function addNetworkSpawnView(spawn) {
    network.spawnIndexes.set(spawn.id, pendingEnemySpawns.length);
    pendingEnemySpawns.push(spawn);
  }

  function removeNetworkSpawnView(id) {
    const index = network.spawnIndexes.get(id);
    if (index === undefined) return;
    const spawn = network.spawnViews.get(id);
    const last = pendingEnemySpawns.pop();
    if (index < pendingEnemySpawns.length) {
      pendingEnemySpawns[index] = last;
      network.spawnIndexes.set(last.id, index);
    }
    network.spawnIndexes.delete(id);
    network.spawnViews.delete(id);
    if (spawn && !network.enemyViews.has(id)) {
      spawn.activationExpiresAt = performance.now() + NETWORK_INTERPOLATION_MAX_MS * 2;
      network.activatingSpawnViews.set(id, spawn);
    }
  }

  function upsertNetworkSpawnView(item) {
    if (!Number.isSafeInteger(item?.id)) return;
    let spawn = network.spawnViews.get(item.id);
    const isNew = !spawn;
    if (!spawn) {
      spawn = {
        headCell: {},
        bodyCells: [],
        segments: [],
        captured: 0,
        frostStacks: 0,
        corrosionStacks: 0,
        burnStacks: 0,
        dead: false
      };
      network.spawnViews.set(item.id, spawn);
    }
    spawn.id = item.id;
    spawn.archetype = item.archetype;
    spawn.color = item.color;
    spawn.angle = Number(item.angle) || 0;
    spawn.timer = Number(item.timer) || 0;
    spawn.maxTimer = Number(item.maxTimer) || 0;
    spawn.headCell.col = Number(item.headCell?.col) || 0;
    spawn.headCell.row = Number(item.headCell?.row) || 0;
    spawn.col = spawn.headCell.col;
    spawn.row = spawn.headCell.row;
    spawn.radius = arena.cellSize * ENEMY_HEAD_RADIUS_CELLS;
    syncNodePosition(spawn);
    const bodyItems = Array.isArray(item.bodyCells) ? item.bodyCells : [];
    for (let index = 0; index < bodyItems.length; index += 1) {
      const body = spawn.segments[index] || (spawn.segments[index] = {});
      body.col = Number(bodyItems[index]?.col) || 0;
      body.row = Number(bodyItems[index]?.row) || 0;
      syncNodePosition(body);
    }
    spawn.segments.length = bodyItems.length;
    spawn.bodyCells = spawn.segments;
    let previous = spawn;
    for (const segment of spawn.segments) {
      segment.angle = Math.atan2(previous.row - segment.row, previous.col - segment.col);
      previous = segment;
    }
    if (isNew) addNetworkSpawnView(spawn);
  }

  function resetNetworkWorldObjects(hazardItems, spawnItems, revision = 0) {
    network.hazardViews.clear();
    network.hazardIndexes.clear();
    network.spawnViews.clear();
    network.spawnIndexes.clear();
    network.activatingSpawnViews.clear();
    hazards.length = 0;
    pendingEnemySpawns.length = 0;
    for (const item of hazardItems || []) upsertNetworkHazardView(item);
    for (const item of spawnItems || []) upsertNetworkSpawnView(item);
    network.worldObjectRevision = Number.isSafeInteger(revision) ? revision : 0;
  }

  function receiveNetworkWorldObjectDelta(delta) {
    if (localModeForced || !delta || typeof delta !== "object") return;
    const revision = Number(delta.revision);
    if (!Number.isSafeInteger(revision) || revision === network.worldObjectRevision) return;
    if (!isNewerNetworkRevision(revision, network.worldObjectRevision)) return;
    const expectedRevision = network.worldObjectRevision >= 0xffffffff ? 1 : network.worldObjectRevision + 1;
    if (!delta.reset && revision !== expectedRevision) {
      requestNetworkSnapshotResync();
      return;
    }
    if (delta.reset) resetNetworkWorldObjects([], [], network.worldObjectRevision);
    for (const id of Array.isArray(delta.hazardRemovedIds) ? delta.hazardRemovedIds : []) removeNetworkHazardView(id);
    for (const id of Array.isArray(delta.spawnRemovedIds) ? delta.spawnRemovedIds : []) removeNetworkSpawnView(id);
    for (const item of Array.isArray(delta.hazardUpserts) ? delta.hazardUpserts : []) upsertNetworkHazardView(item);
    for (const item of Array.isArray(delta.spawnUpserts) ? delta.spawnUpserts : []) upsertNetworkSpawnView(item);
    network.worldObjectRevision = revision;
  }

  function receiveNetworkWorldObjectSnapshot(snapshot) {
    const revision = Number(snapshot?.worldObjectRevision);
    if (snapshot?.worldObjectsComplete) {
      resetNetworkWorldObjects(snapshot.hazards, snapshot.pendingSpawns, revision);
    } else if (Number.isSafeInteger(revision) && isNewerNetworkRevision(revision, network.worldObjectRevision)) {
      requestNetworkSnapshotResync();
    }
    if (Array.isArray(snapshot?.hazards)) snapshot.hazards.length = 0;
    if (Array.isArray(snapshot?.pendingSpawns)) snapshot.pendingSpawns.length = 0;
    if (snapshot) snapshot.worldObjectsComplete = false;
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
        food.birthAge = 0;
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

  function syncNetworkSegments(views, items, previousItems, amount, suppressNeutralBirth = false) {
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const old = previousItems?.[index];
      const isNew = !views[index];
      const view = views[index] || {};
      syncNetworkNode(view, item, old, amount);
      if (isNew) view.orbit = index * 2.399963229728653 % TAU;
      if (!old && previousItems) view.birthAge = suppressNeutralBirth && item.neutral ? null : 0;
      views[index] = view;
    }
    views.length = items.length;
  }

  function applyNetworkRemotePlayerCorrection(view, displayedCol, displayedRow, sourceChanged, now) {
    let correction = view.remoteCorrection;
    if (sourceChanged && Number.isFinite(displayedCol) && Number.isFinite(displayedRow)) {
      const offsetCol = displayedCol - view.col;
      const offsetRow = displayedRow - view.row;
      const distance = Math.hypot(offsetCol, offsetRow);
      const remainingDuration = correction ? Math.max(0, correction.endsAt - now) : 0;
      if (distance >= NETWORK_REMOTE_CORRECTION_THRESHOLD_CELLS || remainingDuration > 0) {
        const duration = remainingDuration > 0
          ? remainingDuration
          : clamp(
              distance / NETWORK_REMOTE_CORRECTION_SPEED_CELLS_PER_SECOND * 1000,
              NETWORK_REMOTE_CORRECTION_MIN_MS,
              NETWORK_REMOTE_CORRECTION_MAX_MS
            );
        correction = {
          col: offsetCol,
          row: offsetRow,
          startedAt: now,
          duration,
          endsAt: now + duration
        };
        view.remoteCorrection = correction;
      } else {
        correction = null;
        view.remoteCorrection = null;
      }
    }
    if (!correction) return;
    const progress = correction.duration > 0 ? clamp((now - correction.startedAt) / correction.duration, 0, 1) : 1;
    if (progress >= 1) {
      view.remoteCorrection = null;
      return;
    }
    const remaining = 1 - progress * progress * (3 - 2 * progress);
    const correctionCol = correction.col * remaining;
    const correctionRow = correction.row * remaining;
    view.col += correctionCol;
    view.row += correctionRow;
    syncNodePosition(view);
    for (const segment of view.segments) {
      segment.col += correctionCol;
      segment.row += correctionRow;
      syncNodePosition(segment);
    }
  }

  function pruneNetworkViews(views, activeTick, onPrune = null) {
    for (const [id, view] of views) {
      if (view.seenAtTick === activeTick) continue;
      views.delete(id);
      if (onPrune) onPrune(id);
    }
  }

  function updateSelfNetworkModules(view, segments) {
    const moduleIds = network.moduleIds;
    let changed = !view.networkModuleCounts || moduleIds.length !== segments.length;
    for (let index = 0; index < segments.length && !changed; index += 1) {
      const signature = segments[index].module ? `${segments[index].module}:${segments[index].moduleLevel || 1}` : null;
      if (moduleIds[index] !== signature) changed = true;
    }
    if (!changed) return false;
    const counts = view.networkModuleCounts || Object.create(null);
    for (const id of Object.keys(counts)) delete counts[id];
    moduleIds.length = segments.length;
    for (let index = 0; index < segments.length; index += 1) {
      const id = segments[index].module;
      const segmentLevel = id ? Math.max(1, segments[index].moduleLevel || 1) : 0;
      moduleIds[index] = id ? `${id}:${segmentLevel}` : null;
      if (id) counts[id] = Math.min(MODULE_PROGRESSION.maxModuleLevel, (counts[id] || 0) + segmentLevel);
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

  function applyNetworkPresentation(previous, current, previousIndexes, amount, now = performance.now()) {
    const snapshotChanged = network.presentationSnapshot !== current;
    const activeTick = current.tick;
    setArenaWorldSize(interpolateNumber(previous?.arenaSize, current.arenaSize, amount));
    updateNetworkFoodMotions(performance.now());
    network.renderGameTime = interpolateNumber(previous?.gameTime, current.gameTime, amount);
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
      const displayedCol = view.col;
      const displayedRow = view.row;
      const hadSource = Boolean(view.source);
      const wasGhost = hadSource ? Boolean(view.ghost) : Boolean(item.ghost);
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
      const experienceSettled = Boolean(view.experienceSettled);
      syncNetworkSegments(view.segments, item.segments, old?.segments, playerAmount, experienceSettled);
      if (view.isSelf && !automaticModeEnabled && !item.paused && !item.choosingUpgrade) applyNetworkSelfPrediction(view);
      else if (!view.isSelf) applyNetworkRemotePlayerCorrection(view, displayedCol, displayedRow, sourceChanged, now);
      view.protectedState = item.paused || item.choosingUpgrade || view.invulnerable > 0;
      if (hadSource && wasGhost && !item.ghost) playGhostRevivePresentation(view);
      else if (!wasGhost && item.ghost) view.nextGhostPleaAt = -Infinity;
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
          growth.spawnTailFood = item.growth.spawnTailFood;
          growth.elapsed = item.growth.elapsed;
          growth.nodeCount = item.growth.nodeCount;
          view.growth = growth;
        } else view.growth = null;
      }
      if (experienceSettled && !item.growth) view.experienceSettled = false;
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
        enemy = network.activatingSpawnViews.get(item.id) || { segments: [] };
        network.activatingSpawnViews.delete(item.id);
        network.enemyViews.set(item.id, enemy);
      }
      const damageOperations = network.enemyBodyDamageOps.get(item.id);
      const currentHead = projectedEnemyHead(item, damageOperations, enemy.currentHeadProjectionScratch ||= []);
      const previousHead = projectedEnemyHead(old, damageOperations, enemy.previousHeadProjectionScratch ||= []);
      syncNetworkNode(enemy, item, old, amount);
      if (currentHead && (currentHead !== item || previousHead !== old)) {
        enemy.col = interpolateNumber(previousHead?.col, currentHead.col, amount);
        enemy.row = interpolateNumber(previousHead?.row, currentHead.row, amount);
        syncNodePosition(enemy);
      }
      enemy.angle = interpolateAngle(old?.angle ?? item.angle, item.angle, amount);
      enemy.archetype = item.archetype;
      enemy.behaviorState = item.behaviorState;
      enemy.behaviorPhase = interpolateNumber(old?.behaviorPhase, item.behaviorPhase, amount);
      enemy.frostStacks = item.frostStacks || 0;
      enemy.corrosionStacks = item.corrosionStacks || 0;
      enemy.burnStacks = item.burnStacks || 0;
      enemy.radius = arena.cellSize * ENEMY_HEAD_RADIUS_CELLS;
      enemy.dead = false;
      const currentSegments = projectedEnemySegments(item.segments, damageOperations, enemy.currentSegmentScratch ||= []);
      const previousSegments = projectedEnemySegments(old?.segments, damageOperations, enemy.previousSegmentScratch ||= []);
      syncNetworkSegments(enemy.segments, currentSegments, previousSegments, amount);
      if (enemy.reconnectActive) enemy.reconnectActive = followEnemySegments(enemy, 0, performance.now());
      let previousNode = enemy;
      for (const segment of enemy.segments) {
        segment.angle = Math.atan2(previousNode.row - segment.row, previousNode.col - segment.col);
        previousNode = segment;
      }
      const pendingHeadReform = network.pendingEnemyHeadReforms.get(item.id);
      if (pendingHeadReform) {
        playEnemyHeadReformPresentation(
          enemy,
          cellCenter(pendingHeadReform.oldHead.col, pendingHeadReform.oldHead.row),
          pendingHeadReform.color,
          pendingHeadReform.duration
        );
        network.pendingEnemyHeadReforms.delete(item.id);
      }
      enemy.seenAtTick = activeTick;
      enemies.push(enemy);
    }
    pruneNetworkViews(network.enemyViews, activeTick, (enemyId) => {
      network.enemyBodyDamageOps.delete(enemyId);
      network.pendingEnemyHeadReforms.delete(enemyId);
    });

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
      return Boolean(source && target && !source.ghost && !target.ghost && Math.hypot(source.col - target.col, source.row - target.row) <= visualRange);
    });
    for (const event of ready) {
      if (!networkHeadCollisionRuntime.apply(event, network.selfEntityId, now)) continue;
      if (automaticModeEnabled || (event.sourceEntityId !== network.selfEntityId && event.targetEntityId !== network.selfEntityId)) continue;
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
      if (view.isSelf || view.ghost) continue;
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
    if (!player || player.ghost) return;
    const contactRange = networkPlayerHeadContactRange();
    let moved = false;
    for (const other of visiblePlayers) {
      if (
        other.isSelf
        || other.ghost
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
    if (network.receivedAt > 0 && now - network.receivedAt >= NETWORK_SNAPSHOT_STALL_TIMEOUT_MS) {
      requestNetworkSnapshotResync(now);
    }
    const presentation = selectNetworkPresentation();
    if (presentation) applyNetworkPresentation(
      presentation.previous.snapshot,
      presentation.current.snapshot,
      presentation.previous.indexes,
      presentation.amount,
      now
    );
    flushPendingNetworkVisualEffects();
    processNetworkPlayerHeadCollisionEvents(now);
    updateFoodBirthAnimations(dt);
    networkProjectileRuntime.update(
      dt,
      (id) => network.enemyViews.get(id) || null,
      (id) => network.playerViews.get(id) || null,
      arena,
      Number.isFinite(network.renderGameTime) ? network.renderGameTime : network.snapshot?.gameTime ?? 0
    );
    projectiles = networkProjectileRuntime.items;
    for (const visiblePlayer of visiblePlayers) {
      updateGhostPlea(visiblePlayer, now);
      if (visiblePlayer.growth) visiblePlayer.growth.elapsed += dt;
      for (const segment of visiblePlayer.segments) {
        segment.orbit = (segment.orbit || 0) + dt * 3.8;
        if (!segment.ready && segment.module === "phase") {
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
      if (!automaticModeEnabled) {
        updateInput(dt, false);
        network.localDesiredAngle = player.desiredAngle;
        const turnRate = player.ghost ? PLAYER_TURN_RATE : playerTurnRate();
        const predictedState = networkPlayerPredictionRuntime.state;
        const slowMultiplier = predictedState.slow > 0 ? 0.48 : 1;
        const moveSpeed = player.ghost ? MULTIPLAYER_GHOST_SPEED : playerBaseSpeed() * slowMultiplier;
        networkPlayerPredictionRuntime.update(dt, network.localDesiredAngle, turnRate, moveSpeed);
        applyNetworkSelfPrediction(player);
        if (player.ghost) {
          player.col = clamp(player.col, arena.worldMin, arena.worldMax);
          player.row = clamp(player.row, arena.worldMin, arena.worldMax);
          networkPlayerPredictionRuntime.adoptLocal(player);
          applyNetworkSelfPrediction(player);
        } else {
          stabilizeNetworkPlayerHeadSeparation(dt, now);
          checkNetworkPlayerCollisions();
        }
        sendNetworkInput();
      }
      if (!player.ghost) claimNetworkFoodContacts();
    }
    applyNetworkPlayerHeadCollisionOffsets(now);
    updateEffects(dt);
    if (network.lastHudTick !== network.presentationSnapshot?.tick) {
      network.lastHudTick = network.presentationSnapshot?.tick ?? -1;
      updateHud();
    }
  }

  function sendNetworkInput(force = false, reliable = false) {
    const transport = network.transport;
    if (!transport?.connected || !player) return null;
    const now = performance.now();
    const elapsed = now - network.lastInputAt;
    if (!force && elapsed < NETWORK_INPUT_INTERVAL_MS) return null;
    network.lastInputAt = now;
    const sequence = ++network.inputSequence;
    const payload = networkPlayerStateCodec.encode(sequence, player);
    if (reliable) transport.emit("ultra:input", payload);
    else transport.volatile.emit("ultra:input", payload);
    return sequence;
  }

  function reportNetworkCollision(claim, key, onRejected = null, now = performance.now(), stateAlreadySynced = false) {
    const previous = network.collisionClaims.get(key) || 0;
    if (now - previous < NETWORK_COLLISION_CLAIM_COOLDOWN_MS) return false;
    network.collisionClaims.set(key, now);
    for (const [storedKey, claimedAt] of network.collisionClaims) {
      if (now - claimedAt > NETWORK_COLLISION_CLAIM_COOLDOWN_MS * 4) network.collisionClaims.delete(storedKey);
    }
    if (!stateAlreadySynced) sendNetworkInput(true, true);
    void emitNetworkAction("ultra:collision", claim).then((result) => {
      if (result?.ok) return;
      network.collisionClaims.delete(key);
      onRejected?.();
    });
    return true;
  }

  function bounceNetworkSelf(normalCol, normalRow, color, impulseMultiplier = 1, mitigateCollision = false) {
    bounceEntity(player, normalCol, normalRow, color, SNAKE_SEGMENT_SPACING, impulseMultiplier, mitigateCollision);
    networkPlayerPredictionRuntime.adoptLocal(player);
    applyNetworkSelfPrediction(player);
    sendNetworkInput(true, true);
  }

  function checkNetworkMineCollision() {
    for (const hazard of hazards) {
      const headRange = playerHeadRadiusPixels() / arena.cellSize + mineVisualRadius(hazard) / arena.cellSize;
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
    if (!player?.alive || player.ghost || !networkPlayerPredictionRuntime.state.initialized || checkNetworkMineCollision()) return;
    const collision = networkPlayerCollisions.detect(player, enemies, visiblePlayers, {
      worldMin: arena.worldMin,
      worldMax: arena.worldMax,
      selfRange: PLAYER_SELF_COLLISION_RANGE,
      bodyRange: SNAKE_BODY_CONTACT_RANGE,
      enemyBodyRange: ENEMY_BODY_CONTACT_RANGE,
      playerHeadRange: playerHeadRadiusPixels() * 2 / arena.cellSize,
      enemyHeadRange: playerHeadRadiusPixels() / arena.cellSize + ENEMY_HEAD_RADIUS_CELLS
    });
    if (!collision) return;
    if (collision.kind === "wall") {
      player.col = clamp(player.col, arena.worldMin, arena.worldMax);
      player.row = clamp(player.row, arena.worldMin, arena.worldMax);
      const claimed = reportNetworkCollision(
        { kind: "wall", normalCol: collision.normalCol, normalRow: collision.normalRow },
        "wall"
      );
      if (claimed && player.invulnerable <= 0) predictNetworkPlayerHurt(PLAYER_WALL_COLLISION_DAMAGE);
      bounceNetworkSelf(collision.normalCol, collision.normalRow, "#b8f53f");
      return;
    }
    if (collision.kind === "self") {
      const knockedBack = hasActiveKnockback(player);
      const claimed = reportNetworkCollision({ kind: "self-body" }, "self-body");
      if (claimed && !knockedBack && player.invulnerable <= 0) predictNetworkPlayerHurt(PLAYER_WALL_COLLISION_DAMAGE);
      bounceNetworkSelf(player.col - collision.point.col, player.row - collision.point.row, "#f4ffdc");
      return;
    }
    if (collision.kind === "protected-player") {
      const other = visiblePlayers.find((item) => item.entityId === collision.targetId);
      bounceNetworkSelf(player.col - collision.point.col, player.row - collision.point.row, other?.playerColor || "#dffcff");
      return;
    }
    if (collision.kind === "enemy-body") {
      const defended = consumeDefense();
      const claimed = reportNetworkCollision(
        { kind: "enemy-body", targetId: collision.targetId, segmentIndex: collision.segmentIndex },
        `enemy-body:${collision.targetId}`
      );
      if (claimed && !defended) predictNetworkPlayerHurt(PLAYER_ENEMY_BODY_COLLISION_DAMAGE);
      const enemy = enemies.find((item) => item.id === collision.targetId);
      bounceNetworkSelf(player.col - collision.point.col, player.row - collision.point.row, enemy?.color || "#ff355e", 1, true);
      return;
    }
    if (collision.kind === "player-body") {
      const other = visiblePlayers.find((item) => item.entityId === collision.targetId);
      const claimed = reportNetworkCollision(
        { kind: "player-body", targetId: collision.targetId, segmentIndex: collision.segmentIndex },
        `player-body:${collision.targetId}`
      );
      if (claimed && player.invulnerable <= 0) predictNetworkPlayerHurt(PLAYER_WALL_COLLISION_DAMAGE);
      bounceNetworkSelf(
        player.col - collision.point.col,
        player.row - collision.point.row,
        other?.playerColor || "#dffcff"
      );
      return;
    }
    if (collision.kind === "enemy-head") {
      const enemy = enemies.find((item) => item.id === collision.targetId);
      const impulseMultiplier = enemy?.archetype === "warden" ? ENEMY_BEHAVIOR_TUNING.wardenKnockbackMultiplier : 1;
      bounceNetworkSelf(collision.normalCol, collision.normalRow, "#dffcff", impulseMultiplier, true);
      reportNetworkCollision(
        { kind: "enemy-head", targetId: collision.targetId, normalCol: collision.normalCol, normalRow: collision.normalRow },
        `enemy-head:${collision.targetId}`,
        null,
        performance.now(),
        true
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
      if (!reportNetworkCollision(claim, collisionKey, null, collisionAt, true)) return;
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
    const transport = network.transport;
    if (!transport?.connected || !player?.alive || player.ghost || player.paused || player.choosingUpgrade || foods.length === 0) return;
    const now = performance.now();
    if (now - network.lastFoodContactAt < NETWORK_FOOD_CONTACT_INTERVAL_MS) return;
    network.lastFoodContactAt = now;
    const headRange = playerHeadRadiusPixels() / arena.cellSize + 0.13 + MODULE_EFFECTS.magnetPickupRangeCells(moduleCount("magnet"));
    const bodyRange = SNAKE_BODY_CONTACT_RANGE + MODULE_EFFECTS.collectorPickupRadiusCells(moduleCount("collector"));
    const requestedFoodIds = networkFoodClaimRuntime.detect(player, headRange, bodyRange, now);
    if (requestedFoodIds.length === 0) return;
    syncNetworkFoodVisibility(requestedFoodIds);
    transport.emit("ultra:claim-food", { foodIds: requestedFoodIds }, (result) => {
      const claimedFoodIds = result?.ok && Array.isArray(result.data?.claimedFoodIds)
        ? result.data.claimedFoodIds.filter(Number.isSafeInteger)
        : [];
      networkFoodClaimRuntime.resolve(requestedFoodIds, claimedFoodIds);
      syncNetworkFoodVisibility(requestedFoodIds);
    });
  }

  function emitNetworkAction(event, ...args) {
    return new Promise((resolve) => {
      if (!network.transport?.connected) return resolve({ ok: false, error: "联机连接尚未就绪" });
      network.transport.emit(event, ...args, (result) => resolve(result));
    });
  }

  async function startNetworkGame(restart = false) {
    ensureAudio();
    closeSettingPopovers();
    const modeResult = await emitNetworkAction("ultra:autopilot", automaticModePreferences());
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
    enterRunningState();
    network.lastSelfAlive = true;
    network.upgradeOffer = null;
    hideAllModals();
    clearParticles();
    effects = [];
    startRespawnLocator();
    sound("start");
  }

  function showNetworkGameOver(result) {
    state = "gameover";
    triggerScreenShake(16);
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
    setArenaWorldSize(ARENA_BASE_SIZE);
    gameTime = 0;
    score = 0;
    kills = 0;
    level = 0;
    xp = 0;
    xpNeeded = experienceRequiredForLevel(0);
    waveTimer = 0;
    waveCount = 0;
    nextEnemyId = 1;
    nextLocalFoodId = 1;
    nextLocalHazardId = 1;
    shake = 0;
    flash = 0;
    nextEatToneAt = 0;
    recentPicks = [];
    locallyPulledFoods.clear();
    localFoodContacts.clear();
    localFoodSpatialRuntime.clear();
    foods = [];
    enemies = [];
    projectiles = [];
    hazards = [];
    corrosionFieldTrailPoint = null;
    clearParticles();
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
      health: PLAYER_MAX_HEALTH,
      maxHealth: PLAYER_MAX_HEALTH,
      shieldCharges: 0,
      slow: 0,
      collisionCooldown: 0,
      knockbackX: 0,
      knockbackY: 0,
      foodBoost: 0,
      thornsCooldown: 0,
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
      for (const cell of spawn.reservedCells || [spawn.headCell, ...spawn.bodyCells]) occupied.add(cellKey(cell.col, cell.row));
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
      for (const cell of spawn.reservedCells || [spawn.headCell, ...spawn.bodyCells]) occupyNode(cell);
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
    const food = {
      id: nextLocalFoodId++,
      x: point.x,
      y: point.y,
      col: cell.col,
      row: cell.row,
      color,
      radius: arena.cellSize * 0.13,
      phase: random(0, TAU),
      pullTimer: random(0.4, 1),
      birthAge: 0,
      special
    };
    foods.push(food);
    localFoodSpatialRuntime.trackFood(food);
    burst(point.x, point.y, color, special ? 10 : 7, 62);
    effects.push({ type: "ring", x: point.x, y: point.y, color, life: 0.42, maxLife: 0.42, radius: 3, endRadius: arena.cellSize * 0.42 });
    sound("foodSpawn");
  }

  function chooseEnemySpawn(bodySegmentCount, occupied = occupiedCellCodes()) {
    return spawnPlanner.choose({
      minimum: Math.ceil(arena.worldMin),
      maximum: Math.floor(arena.worldMax),
      bodySegmentCount,
      safetyDistance: ENEMY_SPAWN_SAFETY_DISTANCE,
      forwardPathHalfWidth: ENEMY_SPAWN_FORWARD_PATH_HALF_WIDTH,
      occupiedCells: occupied,
      players: player ? [player] : [],
      random: Math.random
    });
  }

  function queueEnemySpawn(archetype, assignedHealth, occupied = occupiedCellCodes()) {
    if (!player) return;
    const totalLength = Math.max(1, Math.round(assignedHealth));
    const bodySegmentCount = totalLength - 1;
    const placement = chooseEnemySpawn(bodySegmentCount, occupied);
    if (!placement) return false;
    const headCell = placement.head;
    const nextCell = placement.next;
    const direction = { dx: nextCell.col - headCell.col, dy: nextCell.row - headCell.row };
    if (direction.dx === 0 && direction.dy === 0) direction.dx = headCell.col < arena.worldMax ? 1 : -1;
    const color = ENEMY_COLORS[(nextEnemyId - 1) % ENEMY_COLORS.length];
    const bodyCells = spawnPlanner.spaceSpawnBody(headCell, placement.body, SNAKE_SEGMENT_SPACING, bodySegmentCount);
    const headPoint = cellCenter(headCell.col, headCell.row);
    const enemy = {
      id: nextEnemyId++,
      archetype: archetype.id,
      behaviorState: "roam",
      behaviorPhase: 0,
      color,
      x: headPoint.x,
      y: headPoint.y,
      col: headCell.col,
      row: headCell.row,
      angle: directionAngle(direction),
      desiredAngle: directionAngle(direction),
      birthLength: totalLength,
      speed: ENEMY_BASE_SPEED * archetype.speedMultiplier,
      turnRate: ENEMY_TURN_RATE * archetype.turnMultiplier,
      radius: arena.cellSize * ENEMY_HEAD_RADIUS_CELLS,
      segments: bodyCells.map((cell) => makeSegmentAtCell(cell.col, cell.row)),
      captured: 0,
      target: null,
      think: random(0.1, 0.5),
      wobble: random(0, TAU),
      slow: 0,
      frostStacks: 0,
      frostPotency: 0,
      knockbackX: 0,
      knockbackY: 0,
      corrosionStacks: 0,
      corrosionPotency: 0,
      corrosionTimer: 0,
      corrosionColor: null,
      corrosionFieldTimers: new Map(),
      burnStacks: 0,
      burningApplications: [],
      sawCooldown: 0,
      collisionCooldown: 0,
      dead: false,
      hitBounds: null,
      totalLength,
      headCell: { ...headCell },
      reservedCells: [headCell, ...placement.body].map((cell) => ({ ...cell })),
      nextCell: { ...nextCell },
      timer: ENEMY_SPAWN_WARNING_TIME,
      maxTimer: ENEMY_SPAWN_WARNING_TIME
    };
    enemy.bodyCells = enemy.segments;
    let previous = enemy;
    for (const segment of enemy.segments) {
      segment.angle = Math.atan2(previous.row - segment.row, previous.col - segment.col);
      previous = segment;
    }
    updateEnemyHitBounds(enemy);
    pendingEnemySpawns.push(enemy);
    occupied.add(cellCode(headCell.col, headCell.row));
    for (const cell of placement.body) occupied.add(cellCode(cell.col, cell.row));
    sound("enemyWarning");
    return true;
  }

  function materializeEnemySpawn(spawn) {
    enemies.push(spawn);
    for (const node of [spawn, ...spawn.segments]) {
      syncNodePosition(node);
      burst(node.x, node.y, spawn.color, ENEMY_SPAWN_ACTIVATION_PARTICLE_COUNT, ENEMY_SPAWN_ACTIVATION_PARTICLE_SPEED);
      effects.push({
        type: "ring",
        x: node.x,
        y: node.y,
        color: spawn.color,
        life: ENEMY_SPAWN_ACTIVATION_DURATION,
        maxLife: ENEMY_SPAWN_ACTIVATION_DURATION,
        radius: 0,
        endRadius: arena.cellSize * ENEMY_SPAWN_ACTIVATION_RADIUS_CELLS
      });
    }
    sound("enemySpawn");
    triggerScreenShake(4);
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
    return 1;
  }

  function fieldEnemyCount() {
    return enemies.reduce((total, enemy) => total + Number(!enemy.dead), 0);
  }

  function chooseEnemyArchetype() {
    const available = ENEMY_ARCHETYPES.filter((entry) => (
      entry.unlockSeconds <= gameTime
      && entry.spawnWeight > 0
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
    const plan = enemyWaveDirector.plan(waveCount + 1);
    const countMultiplier = MODULE_EFFECTS.beaconEnemyCountMultiplier(moduleCount("beacon"));
    const archetypes = [];
    for (let index = 0; index < Math.ceil(plan.enemyCount * countMultiplier); index += 1) {
      const archetype = chooseEnemyArchetype();
      if (!archetype) break;
      archetypes.push(archetype);
    }
    const allocation = enemyWaveDirector.allocateHealth(
      archetypes.map((archetype) => archetype.healthWeight),
      plan.totalThreat * countMultiplier,
      Math.random
    );
    for (let index = 0; index < archetypes.length; index += 1) {
      if (!queueEnemySpawn(archetypes[index], allocation.health[index], occupied)) break;
    }
  }

  function updateSpawns(dt) {
    waveTimer -= dt * waveCountdownRate();
    if (waveTimer <= 0) {
      spawnWaveFoods(FOODS_PER_PLAYER_PER_WAVE);
      const occupied = occupiedCellCodes();
      queueWaveEnemies(occupied);
      waveCount += 1;
      waveTimer = WAVE_BASE_INTERVAL;
    }
  }

  function startRespawnLocator(now = performance.now()) {
    respawnLocatorStartedAt = now;
  }

  function startPureLocalGame() {
    localModeForced = true;
    const client = network.p2pClient;
    network.enabled = false;
    network.connecting = false;
    network.lobbyReady = false;
    network.p2pClient = null;
    network.transport = null;
    network.boundTransport = null;
    network.room = null;
    network.selfEntityId = null;
    network.principal = null;
    network.roster = [];
    network.snapshot = null;
    network.snapshotBuffer.length = 0;
    network.receivedAt = 0;
    network.lastResyncRequestAt = -Infinity;
    network.renderServerTime = NaN;
    network.renderGameTime = NaN;
    network.lastPresentationAt = 0;
    network.lastSelfAlive = false;
    network.upgradeOffer = null;
    client?.close?.();
    resetNetworkPredictionInput(true);
    clearNetworkViews();
    renderNetworkRoster([]);
    setNetworkButtonsDisabled(false);
    setNetworkStatus("", "TACTICAL SURVIVAL / LOCAL");
    startGame();
  }

  function startGame() {
    if (network.enabled) {
      void startNetworkGame(network.lastSelfAlive);
      return;
    }
    ensureAudio();
    closeSettingPopovers();
    resetGame();
    enterRunningState();
    hideAllModals();
    sound("start");
  }

  function hideAllModals() {
    ui.start.classList.remove("is-visible");
    ui.pause.classList.remove("is-visible");
    ui.upgrade.classList.remove("is-visible");
    ui.gameOver.classList.remove("is-visible");
    ui.codex.classList.remove("is-visible");
    ui.enemyCodex.classList.remove("is-visible");
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
        ui.pause.classList.remove("is-visible");
        enterRunningState();
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
      ui.pause.classList.remove("is-visible");
      enterRunningState();
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
    window.location.replace(resolveLobbyUrl());
  }

  function gameOver() {
    if (state !== "running") return;
    state = "gameover";
    triggerScreenShake(16);
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
    window.setTimeout(() => {
      if (state !== "gameover") return;
      if (automaticModeEnabled && automaticRestartEnabled) startGame();
      else ui.gameOver.classList.add("is-visible");
    }, 330);
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
    const volume = 0.052 * (soundVolume / SOUND_DESIGN_REFERENCE_VOLUME);
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
    const volume = 0.046 * (soundVolume / SOUND_DESIGN_REFERENCE_VOLUME);
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

    const cooldowns = { shoot: 45, skill: 65, frost: 70, electric: 75, hit: 48, hurt: 180, heal: 120, foodSpawn: 70, bounce: 90, ui: 70 };
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
      hurt: [105, 38, 0.28, "sawtooth", 0.075, 430],
      heal: [310, 920, 0.24, "sine", 0.048, 1240],
      kill: [180, 560, 0.18, "sawtooth", 0.045, 840],
      level: [330, 880, 0.3, "triangle", 0.06, 1320],
      compress: [260, 760, 0.18, "triangle", 0.04, 1040],
      compressGold: [125, 690, 0.34, "sawtooth", 0.058, 980],
      select: [480, 760, 0.13, "sine", 0.042],
      shield: [760, 240, 0.2, "sine", 0.05, 1040],
      death: [170, 45, 0.48, "sawtooth", 0.065, 75]
    }[kind];
    if (!settings) return;

    const [from, to, duration, type, baseVolume, accent] = settings;
    const now = audioContext.currentTime;
    const volume = baseVolume * (soundVolume / SOUND_DESIGN_REFERENCE_VOLUME);
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
    const maximum = MODULE_PROGRESSION.maxModuleLevel;
    if (network.enabled && player?.networkModuleCounts) return Math.min(maximum, player.networkModuleCounts[id] || 0);
    let count = 0;
    for (const segment of player.segments) {
      if (segment.module === id) count += Math.max(1, segment.moduleLevel || 1);
    }
    return Math.min(maximum, count);
  }

  function activeModuleCooldown(moduleId, moduleLevel = moduleCount(moduleId), extraCooldownRateBonus = 0) {
    return moduleCooldownSeconds(
      moduleId,
      Math.max(1, moduleLevel || 1),
      MODULE_EFFECTS.amplifierCooldownRateBonus(moduleCount("amplifier")) + extraCooldownRateBonus
    );
  }

  function refreshActiveModuleCooldown(moduleId, segment) {
    const module = MODULE_BY_ID[moduleId];
    if (!module?.activeCooldown || !segment) return;
    segment.timer = 0;
    if (moduleId === "phase") {
      segment.ready = true;
      segment.cooldown = 0;
    } else if (moduleId === "thorns") {
      player.thornsCooldown = 0;
    } else if (moduleId === "bloom") {
      player.bloomCooldown = 0;
    } else if (moduleId === "saw") {
      for (const enemy of enemies) enemy.sawCooldown = 0;
    }
  }

  function bladeOrbitRadius() {
    return arena.cellSize * MODULE_EFFECTS.bladeOrbitRadiusCells();
  }

  function attackSizeMultiplier() {
    return MODULE_EFFECTS.attackSizeMultiplier(moduleCount("arsenal"));
  }

  function mineVisualRadius(hazard) {
    const scale = arenaVisualScale();
    const baseBlastRadius = MODULE_MINE_BLAST_RADIUS_PIXELS * scale;
    const sizeMultiplier = baseBlastRadius > 0 ? Math.max(0.1, hazard.radius / baseBlastRadius) : 1;
    return MODULE_MINE_VISUAL_RADIUS_PIXELS * scale * sizeMultiplier;
  }

  function repulseRangePixels() {
    const count = moduleCount("repulse");
    return count > 0 ? MODULE_EFFECTS.repulseRangePixels(count) : 0;
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
    const progression = options.progression;
    const progressionMarkup = progression
      ? `<div class="card-progression"><strong>${progression.levelLabel}</strong>${progression.lines.map((line) => `<span>${line.text}</span>`).join("")}</div>`
      : "";
    const descriptionNoteMarkup = module.note
      ? `<small class="module-description-note">${module.note}</small>`
      : "";
    card.innerHTML = `
      <div class="card-top">
        <span class="module-swatch shape-${module.shape}" aria-hidden="true"><i></i></span>
        <div class="card-heading"><span>${module.category}型模块</span><h3>${escapeModuleCardText(module.name)}</h3><small class="card-cooldown">${module.activeCooldown ? `冷却 · ${module.cooldown}` : module.cooldown}</small></div>
      </div>
      <p>${module.desc}${descriptionNoteMarkup}</p>
      ${progressionMarkup}
      <span class="card-action">${options.actionLabel || "机体档案"} <b aria-hidden="true">${options.actionSymbol || "+"}</b></span>
    `;
    card.addEventListener("pointermove", (event) => updateModuleCardMotion(card, event));
    card.addEventListener("pointerleave", () => resetModuleCardMotion(card));
    if (interactive) card.addEventListener("click", options.onSelect);
    return card;
  }

  function escapeModuleCardText(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function renderModuleCodex() {
    const modules = CODEX_MODULES.filter((module) => moduleCodexCategory === "all" || module.category === moduleCodexCategory);
    for (const button of ui.codexCategoryButtons) {
      const active = button.dataset.category === moduleCodexCategory;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    }
    ui.codexCount.textContent = `${modules.length}/${CODEX_MODULES.length} 个可用机体`;
    if (modules.length === 0) {
      const empty = document.createElement("div");
      empty.className = "codex-empty";
      empty.textContent = "该类型暂无可用机体";
      ui.codexList.replaceChildren(empty);
      return;
    }
    ui.codexList.replaceChildren(...modules.map((module) => createModuleCard(module, {
      actionLabel: "档案编号",
      actionSymbol: String(CODEX_ARCHIVE_NUMBERS.get(module.id)).padStart(2, "0")
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

  function createEnemyCodexCard(entry, index) {
    const card = document.createElement("article");
    card.className = "enemy-codex-card";
    card.dataset.enemyId = entry.id;
    card.style.setProperty("--enemy-color", entry.color);

    const visual = document.createElement("div");
    visual.className = "enemy-codex-visual";
    const canvas = document.createElement("canvas");
    canvas.width = 520;
    canvas.height = 250;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", `${entry.name}蛇头与完整身体示意`);
    visual.append(canvas);

    const copy = document.createElement("div");
    copy.className = "enemy-codex-copy";
    const role = document.createElement("span");
    role.className = "enemy-codex-role";
    role.textContent = `${entry.code} / ${entry.role}`;
    const title = document.createElement("h3");
    title.textContent = entry.name;
    const description = document.createElement("p");
    description.textContent = entry.description;
    const parameters = document.createElement("dl");
    parameters.className = "enemy-codex-parameters";
    parameters.setAttribute("aria-label", `${entry.name}参数`);
    for (const parameter of window.GSS0EnemyCodex.resolveParameters(entry.id, DESIGNER_BALANCE)) {
      const parameterItem = document.createElement("div");
      parameterItem.className = "enemy-codex-parameter";
      const label = document.createElement("dt");
      label.textContent = parameter.label;
      const value = document.createElement("dd");
      value.textContent = parameter.value;
      parameterItem.append(label, value);
      parameters.append(parameterItem);
    }
    const traits = document.createElement("ul");
    for (const trait of entry.traits) {
      const item = document.createElement("li");
      item.textContent = trait;
      traits.append(item);
    }
    const archive = document.createElement("span");
    archive.className = "enemy-codex-archive";
    archive.textContent = `敌对档案 ${String(index + 1).padStart(2, "0")}`;
    copy.append(role, title, description, parameters, traits, archive);
    card.append(visual, copy);
    window.GSS0EnemyCodex.drawPreview(canvas, entry.id);
    return card;
  }

  function renderEnemyCodex() {
    ui.enemyCodexList.replaceChildren(...window.GSS0EnemyCodex.entries.map(createEnemyCodexCard));
  }

  function openEnemyCodex() {
    ensureAudio();
    closeSettingPopovers();
    renderEnemyCodex();
    hideAllModals();
    ui.enemyCodex.classList.add("is-visible");
    ui.enemyCodex.scrollTop = 0;
    sound("ui");
  }

  function closeEnemyCodex() {
    ui.enemyCodex.classList.remove("is-visible");
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
    const chooseIds = automaticModeEnabled && automaticModuleSelectionEnabled
      ? MODULE_PROGRESSION.chooseAutomaticUpgradeIds
      : MODULE_PROGRESSION.chooseUpgradeIds;
    return chooseIds(UPGRADE_MODULES, player.segments, level + 1, Math.random, 3)
      .map((id) => MODULE_BY_ID[id])
      .filter(Boolean);
  }

  function completeLocalLevelWithoutModule() {
    const consumedExperience = player.segments.filter((segment) => segment.neutral);
    player.segments = player.segments.filter((segment) => !segment.neutral);
    level += 1;
    xp = 0;
    xpNeeded = experienceRequiredForLevel(level);
    score += 250 * level;
    upgradePending = false;
    upgradeRevealTimer = 0;
    ui.upgrade.classList.remove("is-visible");
    enterRunningState();
    player.invulnerable = Math.max(player.invulnerable, UPGRADE_INVULNERABILITY_DURATION);
    sound("select");
    for (const segment of consumedExperience) {
      burst(segment.x, segment.y, "#f3c600", 4, 80);
    }
    renderModuleRack();
    updateHud(true);
  }

  function scheduleAutomaticUpgrade() {
    if (!automaticModeEnabled || !automaticModuleSelectionEnabled || state !== "upgrade") return;
    const choices = Array.from(ui.options.querySelectorAll("button.upgrade-card"));
    if (choices.length === 0) return;
    const automaticChoice = choices[Math.floor(Math.random() * choices.length)];
    window.setTimeout(() => {
      if (automaticModeEnabled && automaticModuleSelectionEnabled && state === "upgrade" && automaticChoice.isConnected) automaticChoice.click();
    }, 650);
  }

  function showUpgrade(networkChoices = null) {
    state = "upgrade";
    ui.levelUpBanner.classList.remove("is-active");
    ui.shell.classList.remove("is-leveling");
    sound("level");
    ui.upgradeLevel.textContent = level + 1;
    ui.options.replaceChildren();

    const choices = networkChoices || chooseUpgradeOptions();
    if (choices.length === 0) {
      if (network.enabled) enterRunningState();
      else completeLocalLevelWithoutModule();
      return;
    }
    const moduleLevels = MODULE_PROGRESSION.moduleLevelsFromSegments(player?.segments || []);
    ui.options.append(...choices.map((module) => {
      const progression = MODULE_PROGRESSION.moduleUpgradePreview(module.id, moduleLevels[module.id] || 0);
      return createModuleCard(module, {
        progression,
        actionLabel: progression.kind === "new" ? "装载新机体" : "强化现有机体",
        actionSymbol: progression.kind === "new" ? "+" : "↑",
        onSelect: () => selectUpgrade(module)
      });
    }));
    ui.upgrade.classList.add("is-visible");

    scheduleAutomaticUpgrade();
  }

  function syncTailGuardSegments() {
    const targetCount = MODULE_EFFECTS.tailGuardSegmentCount(moduleCount("tailguard"));
    player.segments = player.segments.filter((segment) => !segment.tailGuard);
    for (let index = 0; index < targetCount; index += 1) {
      const tail = player.segments[player.segments.length - 1] || player;
      player.segments.push(makeSegmentAtCell(tail.col, tail.row, { tailGuard: true, birthAge: 0 }));
    }
  }

  function syncPlayerMaximumHealth(previousMaximum) {
    const nextMaximum = PLAYER_MAX_HEALTH + MODULE_EFFECTS.maxHealthBonus(moduleCount("vitality"));
    const increase = nextMaximum - previousMaximum;
    player.maxHealth = nextMaximum;
    player.health = increase > 0
      ? Math.min(nextMaximum, player.health + increase)
      : Math.min(player.health, nextMaximum);
  }

  function selectUpgrade(module) {
    if (state !== "upgrade") return;
    if (network.enabled) {
      void emitNetworkAction("ultra:upgrade", module.id).then((result) => {
        if (!result?.ok) return;
        network.upgradeOffer = null;
        ui.upgrade.classList.remove("is-visible");
        enterRunningState();
        sound("select");
      });
      return;
    }
    const existing = player.segments.find((segment) => segment.module === module.id) || null;
    const previousMaximumHealth = player.maxHealth;
    const consumedExperience = player.segments.filter((segment) => segment.neutral);
    player.segments = player.segments.filter((segment) => !segment.neutral);
    level += 1;
    xp = 0;
    xpNeeded = experienceRequiredForLevel(level);
    let upgradedSegment = existing;
    if (upgradedSegment) {
      upgradedSegment.moduleLevel = Math.min(
        MODULE_PROGRESSION.maxModuleLevel,
        Math.max(1, upgradedSegment.moduleLevel || 1) + 1
      );
    } else {
      const tail = player.segments[player.segments.length - 1] || player;
      const initialTimer = module.activeCooldown ? 0 : random(0.2, 0.8);
      upgradedSegment = makeSegmentAtCell(tail.col, tail.row, { module: module.id, moduleLevel: 1, timer: initialTimer });
      player.segments.push(upgradedSegment);
    }
    refreshActiveModuleCooldown(module.id, upgradedSegment);
    syncPlayerMaximumHealth(previousMaximumHealth);
    syncTailGuardSegments();
    recentPicks.push(module.id);
    if (recentPicks.length > 6) recentPicks.shift();
    score += 250 * level;
    ui.upgrade.classList.remove("is-visible");
    enterRunningState();
    player.invulnerable = Math.max(player.invulnerable, UPGRADE_INVULNERABILITY_DURATION);
    sound("select");
    for (const segment of consumedExperience) {
      effects.push({ type: "beam", x: segment.x, y: segment.y, x2: upgradedSegment.x, y2: upgradedSegment.y, color: module.color, life: 0.34, maxLife: 0.34, width: 2.4 });
    }
    burst(upgradedSegment.x, upgradedSegment.y, module.color, existing ? 30 : 22, existing ? 165 : 130);
    effects.push({ type: "ring", x: upgradedSegment.x, y: upgradedSegment.y, color: module.color, life: 0.7, maxLife: 0.7, radius: 12, endRadius: arena.cellSize * (existing ? 1.9 : 1.5) });
    renderModuleRack();
    updateHud(true);
  }

  function addNeutralSegment(animate = false, experienceTier = 0) {
    const tail = player.segments[player.segments.length - 1] || player;
    const segment = makeSegmentAtCell(tail.col, tail.row, { neutral: true, experienceTier, birthAge: animate ? 0 : null });
    player.segments.push(segment);
    return segment;
  }

  function storedNeutralCount() {
    const grown = player.segments.reduce((total, segment) => total + (segment.neutral ? MODULE_PROGRESSION.experienceValue(segment.experienceTier || 0) : 0), 0);
    return grown + growthQueue.length + (activeGrowth ? 1 : 0);
  }

  function activateExperienceCompression(effect) {
    if (effect.started) return;
    effect.started = true;
    const tier = MODULE_PROGRESSION.experienceTier(effect.toTier);
    const gold = effect.toTier >= 2;
    burst(effect.x, effect.y, tier.color, gold ? EXPERIENCE_COMPRESSION_GOLD_PARTICLES : EXPERIENCE_COMPRESSION_GRAY_PARTICLES, gold ? 235 : 165);
    burst(effect.x, effect.y, tier.accent, gold ? 24 : 12, gold ? 175 : 115);
    sound(gold ? "compressGold" : "compress", 0, effect.ownerEntityId ?? null);
    if (effect.isLocal) triggerScreenShake(gold ? EXPERIENCE_COMPRESSION_GOLD_SHAKE : EXPERIENCE_COMPRESSION_GRAY_SHAKE);
  }

  function queueExperienceCompression(sources, target, fromTier, toTier, delay = 0, ownerEntityId = null, isLocal = true) {
    const tier = MODULE_PROGRESSION.experienceTier(toTier);
    const effect = {
      type: "experienceCompress",
      sources: sources.map((source) => ({ x: source.x, y: source.y })),
      x: target.x,
      y: target.y,
      color: tier.color,
      accent: tier.accent,
      fromTier,
      toTier,
      delay: Math.max(0, delay),
      life: EXPERIENCE_COMPRESSION_DURATION,
      maxLife: EXPERIENCE_COMPRESSION_DURATION,
      ownerEntityId,
      isLocal,
      started: false
    };
    effects.push(effect);
    if (effect.delay <= 0) activateExperienceCompression(effect);
  }

  function cancelExperienceCompressionEffects(ownerEntityId = null) {
    retainInPlace(effects, (effect) => {
      if (effect.type !== "experienceCompress") return true;
      return ownerEntityId == null
        ? effect.ownerEntityId != null
        : effect.ownerEntityId !== ownerEntityId;
    });
  }

  function compressExperienceSegments(animate = true) {
    let cascade = 0;
    for (let tier = 0; tier < MODULE_PROGRESSION.experienceTiers.length - 1; tier += 1) {
      while (true) {
        const indexes = MODULE_PROGRESSION.findCompressionIndexes(player.segments, tier);
        if (!indexes.length) break;
        const sources = indexes.map((index) => player.segments[index]);
        const insertionIndex = indexes[0];
        for (let index = indexes.length - 1; index >= 0; index -= 1) player.segments.splice(indexes[index], 1);
        const target = sources[0] || player.segments[player.segments.length - 1] || player;
        const compressed = makeSegmentAtCell(target.col, target.row, {
          neutral: true,
          experienceTier: tier + 1,
          birthAge: animate ? 0 : null
        });
        player.segments.splice(Math.min(insertionIndex, player.segments.length), 0, compressed);
        if (animate) {
          queueExperienceCompression(sources, compressed, tier, tier + 1, cascade * EXPERIENCE_COMPRESSION_CASCADE_DELAY, null, true);
        }
        cascade += 1;
      }
    }
    return cascade;
  }

  function settlePendingExperienceGrowth() {
    const pendingGrowth = activeGrowth ? [activeGrowth, ...growthQueue] : [...growthQueue];
    activeGrowth = null;
    growthQueue.length = 0;
    for (const growth of pendingGrowth) {
      addNeutralSegment();
      if (growth.spawnTailFood) spawnFoodBehindTail();
    }
    compressExperienceSegments(false);
    for (const segment of player.segments) {
      if (segment.neutral) segment.birthAge = null;
    }
    cancelExperienceCompressionEffects();
  }

  function spawnFoodBehindTail() {
    const tail = player.segments[player.segments.length - 1] || player;
    const previous = player.segments[player.segments.length - 2] || player;
    const angle = Math.atan2(tail.y - previous.y, tail.x - previous.x);
    const distance = arena.cellSize * 1.2;
    spawnFood(tail.x + Math.cos(angle) * distance, tail.y + Math.sin(angle) * distance, true);
    effects.push({ type: "ring", x: tail.x, y: tail.y, color: MODULE_BY_ID.replicator.color, life: 0.48, maxLife: 0.48, radius: 3, endRadius: arena.cellSize * 0.9 });
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
    triggerScreenShake(6.5);
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
    compressExperienceSegments();
    burst(segment.x, segment.y, color, special ? 28 : 22, special ? 175 : 145);
    burst(segment.x, segment.y, "#eef5ff", special ? 18 : 12, special ? 135 : 105);
    effects.push({ type: "ring", x: segment.x, y: segment.y, color, life: 0.46, maxLife: 0.46, radius: 3, endRadius: arena.cellSize * 0.78 });
    effects.push({ type: "ring", x: segment.x, y: segment.y, color: "#ffffff", life: 0.28, maxLife: 0.28, radius: 2, endRadius: arena.cellSize * 0.46 });
    if (activeGrowth.spawnTailFood) spawnFoodBehindTail();
    triggerScreenShake(special ? 2.5 : 1.5);
    activeGrowth = null;
    startNextGrowthAnimation();

    if (upgradePending && !activeGrowth && growthQueue.length === 0) {
      startLevelUpTransition();
    }
  }

  function collectFood(index, collector = player) {
    const food = foods[index];
    localFoodSpatialRuntime.untrackFood(food.id);
    locallyPulledFoods.delete(food);
    foods.splice(index, 1);
    const bonusExperience = Math.random() < MODULE_EFFECTS.bonusXpChance(moduleCount("insight")) ? 1 : 0;
    xp += 1 + bonusExperience;
    score += food.special ? 35 : 20;
    growthQueue.push({
      color: food.color,
      special: food.special,
      spawnTailFood: Math.random() < MODULE_EFFECTS.foodReplicationChance(moduleCount("replicator"))
    });
    const completesLevel = xp >= xpNeeded;
    if (completesLevel) {
      upgradePending = true;
      settlePendingExperienceGrowth();
    } else {
      startNextGrowthAnimation();
    }
    if (moduleCount("feast") > 0) player.foodBoost = MODULE_EFFECTS.feastDuration();
    const emergency = moduleCount("emergency");
    if (emergency > 0) {
      player.invulnerable = Math.max(player.invulnerable, MODULE_EFFECTS.emergencyDuration(emergency));
      effects.push({ type: "ring", x: collector.x, y: collector.y, color: MODULE_BY_ID.emergency.color, life: 0.38, maxLife: 0.38, radius: 7, endRadius: arena.cellSize * 0.72 });
    }
    healPlayer(MODULE_EFFECTS.foodHeal(moduleCount("medkit")), MODULE_BY_ID.medkit.color, true);
    burst(collector.x, collector.y, food.color, food.special ? 34 : 28, food.special ? 210 : 180);
    effects.push({ type: "ring", x: collector.x, y: collector.y, color: food.color, life: 0.58, maxLife: 0.58, radius: 5, endRadius: arena.cellSize * 1.5 });
    effects.push({ type: "ring", x: collector.x, y: collector.y, color: "#ffffff", life: 0.32, maxLife: 0.32, radius: 4, endRadius: arena.cellSize * 0.82 });
    effects.push({ type: "text", x: collector.x, y: collector.y, text: `+${1 + bonusExperience}`, color: food.color, life: 0.72, maxLife: 0.72 });
    sound("eat", storedNeutralCount());
    triggerScreenShake(food.special ? 4 : 2.8);
    if (completesLevel) startLevelUpTransition();
    updateHud();
  }

  function renderModuleRack() {
    ui.rack.replaceChildren();
    if (!player) return;
    const counts = new Map();
    for (const segment of player.segments) {
      if (segment.module) counts.set(segment.module, (counts.get(segment.module) || 0) + Math.max(1, segment.moduleLevel || 1));
    }
    const capacity = MODULE_PROGRESSION.moduleSlotCapacity(level);
    ui.rack.dataset.capacity = `${counts.size}/${capacity}`;
    ui.rack.setAttribute("aria-label", `已装载身体模块，槽位 ${counts.size}/${capacity}`);
    for (const [id, count] of counts) {
      const module = MODULE_BY_ID[id];
      const item = document.createElement("span");
      const currentEffect = MODULE_PROGRESSION.moduleCurrentEffect(id, count);
      item.className = `rack-slot rack-module shape-${module.shape}`;
      item.style.setProperty("--module-color", module.color);
      item.tabIndex = 0;
      item.dataset.tooltip = `${module.name} · ${currentEffect.levelLabel}\n${currentEffect.lines.map((line) => line.text).join("\n")}`;
      item.setAttribute("aria-label", `${module.name}，${currentEffect.levelLabel}，${currentEffect.lines.map((line) => line.text).join("，")}`);
      item.innerHTML = `<i aria-hidden="true"></i><b>${count}</b>`;
      ui.rack.append(item);
    }
    for (let index = counts.size; index < capacity; index += 1) {
      const slot = document.createElement("span");
      slot.className = "rack-slot rack-slot-empty";
      slot.setAttribute("aria-hidden", "true");
      ui.rack.append(slot);
    }
  }

  function updateHud(force = false) {
    function setText(element, value) {
      const text = String(value);
      if (force || element.textContent !== text) element.textContent = text;
    }

    setText(ui.time, formatTime(gameTime));
    setText(ui.kills, kills);
    const foodCount = foods.length;
    const enemyCount = fieldEnemyCount();
    const nextWave = waveCount ? (network.enabled ? Math.max(0, waveTimer) : Math.max(0, waveTimer) / waveCountdownRate()).toFixed(1) : "--";
    setText(ui.wave, `${waveCount}/${foodCount}/${enemyCount} · ${nextWave}`);
    setText(ui.score, Math.floor(score).toLocaleString("zh-CN"));
    setText(ui.level, level);
    const currentHealth = Math.max(0, player?.health || 0);
    const maximumHealth = Math.max(0, player?.maxHealth ?? PLAYER_MAX_HEALTH);
    setText(ui.health, currentHealth.toFixed(1));
    setText(ui.maxHealth, maximumHealth.toFixed(1));
    const healthWidth = `${clamp(currentHealth / Math.max(1, maximumHealth) * 100, 0, 100)}%`;
    if (force || ui.healthFill.style.width !== healthWidth) ui.healthFill.style.width = healthWidth;
    const shieldCharges = Math.max(0, Math.round(player?.shieldCharges || 0));
    const shieldWidth = `${clamp(shieldCharges * 20, 0, 100)}%`;
    if (force || ui.shieldFill.style.width !== shieldWidth) ui.shieldFill.style.width = shieldWidth;
    ui.shieldFill.classList.toggle("is-active", shieldCharges > 0);
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

    let target = nearestFood;
    let targetDistance = nearestDistance;
    const headStrikeDamage = playerHeadDamage(true);
    for (const enemy of enemies) {
      if (enemy.dead || enemy.segments.length >= headStrikeDamage) continue;
      const distance = (enemy.col - player.col) ** 2 + (enemy.row - player.row) ** 2;
      if (distance >= targetDistance) continue;
      target = enemy;
      targetDistance = distance;
    }

    if (target) {
      const targetX = target.col - player.col;
      const targetY = target.row - player.row;
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

    for (const enemy of enemies) {
      if (enemy.dead) continue;
      for (const segment of enemy.segments) repel(segment, 2.4, 2.8);
    }
    if (network.enabled) {
      for (const other of visiblePlayers) {
        if (other === player || other.ghost) continue;
        repel(other, AUTOMATIC_TEAMMATE_AVOIDANCE_STRENGTH, AUTOMATIC_TEAMMATE_AVOIDANCE_RANGE);
        for (const segment of other.segments) repel(segment, AUTOMATIC_TEAMMATE_AVOIDANCE_STRENGTH, AUTOMATIC_TEAMMATE_AVOIDANCE_RANGE);
      }
    }
    const plannedAngle = Math.hypot(vectorX, vectorY) > 0.001 ? Math.atan2(vectorY, vectorX) : player.angle;
    const sharpTurn = Math.abs(angleDelta(player.angle, plannedAngle)) >= AUTOMATIC_SHARP_TURN_THRESHOLD;
    const selfAvoidanceStrength = sharpTurn ? AUTOMATIC_SELF_AVOIDANCE_STRENGTH : 1.4;
    const selfAvoidanceRange = sharpTurn ? AUTOMATIC_SELF_AVOIDANCE_RANGE : 2.4;
    for (let index = 3; index < player.segments.length; index += 1) repel(player.segments[index], selfAvoidanceStrength, selfAvoidanceRange);

    return Math.atan2(vectorY, vectorX);
  }

  function updateInput(dt, applyTurn = true) {
    if (player.collisionCooldown > 0) {
      player.desiredAngle = player.angle;
      return;
    }
    let dx = 0;
    let dy = 0;
    if (keys.has("ArrowLeft")) dx -= 1;
    if (keys.has("ArrowRight") || keys.has("KeyD")) dx += 1;
    if (keys.has("ArrowUp") || keys.has("KeyW")) dy -= 1;
    if (keys.has("ArrowDown") || keys.has("KeyS")) dy += 1;

    if (automaticModeEnabled) {
      player.desiredAngle = testAutopilotAngle();
    } else if (dx || dy) {
      player.desiredAngle = Math.atan2(dy, dx);
    } else if (pointer.active) {
      const pointerWorld = screenToWorld(pointer.x, pointer.y);
      const px = pointerWorld.x - player.x;
      const py = pointerWorld.y - player.y;
      if (px * px + py * py > 16) player.desiredAngle = Math.atan2(py, px);
    }
    const turnRate = playerTurnRate();
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

  function startEnemyReconnect(enemy, index, startedAt = null) {
    if (!Number.isInteger(index) || index < 0 || index >= enemy.segments.length) return;
    const previous = index === 0 ? enemy : enemy.segments[index - 1];
    const segment = enemy.segments[index];
    const gap = Math.hypot(previous.col - segment.col, previous.row - segment.row);
    if (gap <= SNAKE_SEGMENT_SPACING) return;
    segment.reconnectElapsed = 0;
    segment.reconnectGap = gap;
    segment.reconnectStartedAt = Number.isFinite(startedAt) ? startedAt : null;
    enemy.reconnectActive = true;
  }

  function followEnemySegments(enemy, dt, now = null) {
    let previous = enemy;
    let reconnectActive = false;
    for (const segment of enemy.segments) {
      let allowedDistance = SNAKE_SEGMENT_SPACING;
      if (segment.reconnectGap > SNAKE_SEGMENT_SPACING) {
        segment.reconnectElapsed = Number.isFinite(segment.reconnectStartedAt) && Number.isFinite(now)
          ? Math.max(0, (now - segment.reconnectStartedAt) / 1000)
          : (segment.reconnectElapsed || 0) + dt;
        const progress = clamp(segment.reconnectElapsed / ENEMY_BODY_RECONNECT_DURATION, 0, 1);
        const eased = 1 - (1 - progress) ** 3;
        allowedDistance += (segment.reconnectGap - SNAKE_SEGMENT_SPACING) * (1 - eased);
        if (progress >= 1) {
          segment.reconnectElapsed = 0;
          segment.reconnectGap = 0;
          segment.reconnectStartedAt = null;
        } else reconnectActive = true;
      }
      const dx = previous.col - segment.col;
      const dy = previous.row - segment.row;
      const distance = Math.hypot(dx, dy) || 1;
      segment.angle = Math.atan2(dy, dx);
      if (distance > allowedDistance) {
        segment.col = previous.col - dx / distance * allowedDistance;
        segment.row = previous.row - dy / distance * allowedDistance;
        syncNodePosition(segment);
      }
      previous = segment;
    }
    return reconnectActive;
  }

  function correctPlayerKnockbackNormal(heading, normalX, normalY) {
    if (PLAYER_KNOCKBACK_REAR_BLOCKED_ANGLE <= 0) return { x: normalX, y: normalY };
    const relativeAngle = Math.atan2(Math.sin(Math.atan2(normalY, normalX) - heading), Math.cos(Math.atan2(normalY, normalX) - heading));
    const distanceFromRear = Math.abs(Math.PI - Math.abs(relativeAngle));
    if (distanceFromRear > PLAYER_KNOCKBACK_REAR_BLOCKED_ANGLE * 0.5) return { x: normalX, y: normalY };
    const correctedAngle = heading + (relativeAngle < 0 ? -PLAYER_KNOCKBACK_REAR_CORRECTION_ANGLE : PLAYER_KNOCKBACK_REAR_CORRECTION_ANGLE);
    return { x: Math.cos(correctedAngle), y: Math.sin(correctedAngle) };
  }

  function bounceEntity(entity, normalX, normalY, color, segmentSpacing, extraImpulseMultiplier = 1, mitigatePlayerCollision = false) {
    let normalLength = Math.hypot(normalX, normalY);
    if (normalLength < 0.001) {
      normalX = -Math.cos(entity.angle);
      normalY = -Math.sin(entity.angle);
      normalLength = 1;
    }
    let nx = normalX / normalLength;
    let ny = normalY / normalLength;
    if (entity === player) ({ x: nx, y: ny } = correctPlayerKnockbackNormal(entity.angle, nx, ny));
    const velocityX = Math.cos(entity.angle);
    const velocityY = Math.sin(entity.angle);
    const approach = velocityX * nx + velocityY * ny;
    let bounceX = approach < 0 ? velocityX - 2 * approach * nx : nx;
    let bounceY = approach < 0 ? velocityY - 2 * approach * ny : ny;
    bounceX += nx * 0.5;
    bounceY += ny * 0.5;
    const bounceLength = Math.hypot(bounceX, bounceY) || 1;
    const bounceAngle = Math.atan2(bounceY / bounceLength, bounceX / bounceLength);

    const collisionReduction = entity === player && mitigatePlayerCollision
      ? MODULE_EFFECTS.bufferCollisionReduction(moduleCount("buffer"))
      : 0;
    const impulseMultiplier = (1 - collisionReduction) * extraImpulseMultiplier;
    if (impulseMultiplier > 0.001) {
      entity.knockbackX = nx * KNOCKBACK_INITIAL_SPEED * impulseMultiplier;
      entity.knockbackY = ny * KNOCKBACK_INITIAL_SPEED * impulseMultiplier;
      entity.angle = bounceAngle;
      entity.desiredAngle = bounceAngle;
    } else {
      entity.knockbackX = 0;
      entity.knockbackY = 0;
    }
    const stabilization = entity === player ? moduleCount("stabilizer") : 0;
    const slowDuration = BOUNCE_SLOW_TIME * (1 - MODULE_EFFECTS.stabilizerSlowReduction(stabilization)) * (1 - collisionReduction);
    const lockDuration = BOUNCE_LOCK_TIME * (1 - MODULE_EFFECTS.stabilizerLockReduction(stabilization)) * (1 - collisionReduction);
    entity.slow = Math.max(entity.slow || 0, slowDuration);
    entity.collisionCooldown = Math.max(0.06, lockDuration);
    syncNodePosition(entity);
    if (entity === player) followContinuousSegments(entity.col, entity.row, entity.segments, playerSegmentSpacing());
    else followEnemySegments(entity, 0);
    if (entity !== player) updateEnemyHitBounds(entity);
    burst(entity.x, entity.y, color, 13, 135);
    effects.push({ type: "ring", x: entity.x, y: entity.y, color, life: 0.38, maxLife: 0.38, radius: 5, endRadius: arena.cellSize * 0.85 });
    sound("bounce");
    triggerScreenShake(4.5);
  }

  function applyKnockbackDecay(entity, dt) {
    const damping = Math.exp(-KNOCKBACK_DECAY * dt);
    entity.knockbackX = (entity.knockbackX || 0) * damping;
    entity.knockbackY = (entity.knockbackY || 0) * damping;
    if (Math.hypot(entity.knockbackX, entity.knockbackY) < KNOCKBACK_STOP_SPEED) {
      entity.knockbackX = 0;
      entity.knockbackY = 0;
    }
  }

  function hasActiveKnockback(entity) {
    return Math.hypot(entity.knockbackX || 0, entity.knockbackY || 0) >= KNOCKBACK_STOP_SPEED;
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
    return bodyConnectionContact(entity, entity, threshold, 2)?.point || null;
  }

  function movePlayer(dt) {
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.slow = Math.max(0, player.slow - dt);
    player.collisionCooldown = Math.max(0, player.collisionCooldown - dt);
    player.foodBoost = Math.max(0, player.foodBoost - dt);
    player.thornsCooldown = Math.max(0, player.thornsCooldown - dt);
    player.bloomCooldown = Math.max(0, player.bloomCooldown - dt);
    const slowMultiplier = player.slow > 0 ? 0.48 : 1;
    player.speed = playerBaseSpeed() * slowMultiplier;
    const previousCol = player.col;
    const previousRow = player.row;
    player.col += (Math.cos(player.angle) * player.speed + player.knockbackX) * dt;
    player.row += (Math.sin(player.angle) * player.speed + player.knockbackY) * dt;
    applyKnockbackDecay(player, dt);
    syncNodePosition(player);
    followContinuousSegments(player.col, player.row, player.segments, playerSegmentSpacing());
    updateCorrosionFieldTrail(previousCol, previousRow);
  }

  function updateCorrosionFieldTrail(previousCol, previousRow) {
    const level = moduleCount("corrosionfield");
    if (!player || level <= 0) {
      corrosionFieldTrailPoint = null;
      return;
    }
    const duration = MODULE_EFFECTS.corrosionFieldDuration(level);
    if (!(duration > 0)) return;
    const radius = enemySegmentRadiusPixels();
    const spacing = Math.max(0.18 * arena.cellSize, radius * 1.25);
    const start = corrosionFieldTrailPoint || { col: previousCol, row: previousRow };
    const deltaCol = player.col - start.col;
    const deltaRow = player.row - start.row;
    const distancePixels = Math.hypot(deltaCol * arena.cellSize, deltaRow * arena.cellSize);
    if (!corrosionFieldTrailPoint) {
      addLocalCorrosionFieldPoint(player.col, player.row, duration, radius);
      corrosionFieldTrailPoint = { col: player.col, row: player.row };
      return;
    }
    if (distancePixels < spacing) return;
    const pointCount = Math.min(32, Math.floor(distancePixels / spacing));
    for (let index = 1; index <= pointCount; index += 1) {
      const ratio = Math.min(1, index * spacing / distancePixels);
      const col = start.col + deltaCol * ratio;
      const row = start.row + deltaRow * ratio;
      addLocalCorrosionFieldPoint(col, row, duration, radius);
      corrosionFieldTrailPoint = { col, row };
    }
  }

  function addLocalCorrosionFieldPoint(col, row, life, radius) {
    const hazard = {
      id: nextLocalHazardId++,
      ownerEntityId: 0,
      kind: "corrosion",
      col,
      row,
      life,
      arm: 0,
      radius,
      color: MODULE_BY_ID.corrosionfield.color,
      phase: random(0, TAU)
    };
    syncNodePosition(hazard);
    hazards.push(hazard);
  }

  function cellDistanceSquared(first, second) {
    const deltaCol = first.col - second.col;
    const deltaRow = first.row - second.row;
    return deltaCol * deltaCol + deltaRow * deltaRow;
  }

  function registerLocalFoodContacts(collector, range) {
    const rangeSquared = range * range;
    localFoodSpatialRuntime.forEachNearbyFood(collector, range, (food) => {
      if (localFoodContacts.has(food) || cellDistanceSquared(collector, food) > rangeSquared) return;
      localFoodContacts.set(food, collector);
    });
  }

  function findLocalEnemyFoodContact(enemy) {
    const contactRange = 0.4;
    const contactRangeSquared = contactRange * contactRange;
    let selectedFood = null;
    let collector = null;
    const consider = (node) => {
      localFoodSpatialRuntime.forEachNearbyFood(node, contactRange, (food) => {
        if ((selectedFood && food.id <= selectedFood.id) || cellDistanceSquared(node, food) > contactRangeSquared) return;
        selectedFood = food;
        collector = node;
      });
    };
    consider(enemy);
    for (const segment of enemy.segments) consider(segment);
    if (!selectedFood) return null;
    const index = foods.indexOf(selectedFood);
    return index >= 0 ? { food: selectedFood, collector, index } : null;
  }

  function updateFood(dt) {
    updateFoodBirthAnimations(dt);
    const tractor = moduleCount("tractor");
    const tractorRange = MODULE_EFFECTS.tractorRangeCells(tractor);
    const tractorSpeed = MODULE_EFFECTS.tractorPullSpeed(tractor);
    for (const food of locallyPulledFoods) food.isPulled = false;
    locallyPulledFoods.clear();
    if (tractor > 0) {
      for (const food of foods) {
        const deltaCol = player.col - food.col;
        const deltaRow = player.row - food.row;
        const distance = Math.hypot(deltaCol, deltaRow);
        if (distance <= 0.001 || distance > tractorRange) continue;
        const step = Math.min(distance, tractorSpeed * dt);
        food.col += deltaCol / distance * step;
        food.row += deltaRow / distance * step;
        food.isPulled = true;
        locallyPulledFoods.add(food);
        localFoodSpatialRuntime.trackFood(food);
        syncNodePosition(food);
      }
    }

    localFoodContacts.clear();
    if (upgradePending) return;
    const magnetRange = MODULE_EFFECTS.magnetPickupRangeCells(moduleCount("magnet"));
    const pieceScale = arenaPieceScale();
    const foodRadiusCells = 0.13;
    const collectorBonusCells = MODULE_EFFECTS.collectorPickupRadiusCells(moduleCount("collector"));
    registerLocalFoodContacts(player, player.radius / arena.cellSize + foodRadiusCells + magnetRange);
    for (const segment of player.segments) {
      const visualRadiusCells = (segment.module ? 11 : segment.neutral ? 10 : 8) * pieceScale / arena.cellSize;
      registerLocalFoodContacts(segment, visualRadiusCells + foodRadiusCells + collectorBonusCells);
    }
    if (localFoodContacts.size === 0) return;

    const orderedContacts = [];
    for (const [food, collector] of localFoodContacts) {
      const index = foods.indexOf(food);
      if (index >= 0) orderedContacts.push({ index, collector });
    }
    orderedContacts.sort((left, right) => right.index - left.index);
    for (const contact of orderedContacts) {
      collectFood(contact.index, contact.collector);
      if (upgradePending || state === "upgrade") break;
    }
    localFoodContacts.clear();
  }

  function updateFoodBirthAnimations(dt) {
    for (const food of foods) {
      if (food.birthAge == null) continue;
      food.birthAge += dt;
      if (food.birthAge >= FOOD_BIRTH_DURATION) food.birthAge = null;
    }
  }

  function nearestJointOnEnemy(origin, enemy) {
    let node = enemy;
    let segmentIndex = -1;
    let best = distanceSquared(origin, enemy);
    for (let index = 0; index < enemy.segments.length; index += 1) {
      const candidate = enemy.segments[index];
      const distance = distanceSquared(origin, candidate);
      if (distance >= best) continue;
      best = distance;
      node = candidate;
      segmentIndex = index;
    }
    return { enemy, node, segmentIndex, distanceSquared: best };
  }

  function nearestEnemyJoint(origin, maxDistance = Infinity, predicate = null) {
    let nearest = null;
    let best = maxDistance * maxDistance;
    for (const enemy of enemies) {
      if (enemy.dead || (predicate && !predicate(enemy))) continue;
      const candidate = nearestJointOnEnemy(origin, enemy);
      if (candidate.distanceSquared >= best) continue;
      best = candidate.distanceSquared;
      nearest = candidate;
    }
    return nearest;
  }

  function highestHealthEnemyJoint(origin) {
    let selected = null;
    let highestHealth = -1;
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const health = enemy.segments.length + 1;
      const candidate = nearestJointOnEnemy(origin, enemy);
      if (health < highestHealth || (health === highestHealth && selected && candidate.distanceSquared >= selected.distanceSquared)) continue;
      highestHealth = health;
      selected = candidate;
    }
    return selected;
  }

  function hasEnemyJointWithinDistance(origin, maxDistance) {
    const maximumDistanceSquared = maxDistance * maxDistance;
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      if (distanceSquared(origin, enemy) < maximumDistanceSquared) return true;
      for (const segment of enemy.segments) {
        if (distanceSquared(origin, segment) < maximumDistanceSquared) return true;
      }
    }
    return false;
  }

  function resolveEnemyTargetNode(enemy, segmentIndex) {
    if (!enemy || enemy.dead) return null;
    return segmentIndex >= 0 ? enemy.segments[segmentIndex] || enemy : enemy;
  }

  function createPlayerProjectile(origin, angle, options = {}) {
    const kind = options.kind === "blade" ? "blade" : "shot";
    const guidance = kind === "blade" ? 0 : moduleCount("guidance");
    const bounceBonus = MODULE_EFFECTS.projectileBounceBonus(moduleCount("rebound"));
    const guidanceMultiplier = 1 + MODULE_EFFECTS.guidanceProjectileSpeedBonus(guidance);
    const sizeMultiplier = attackSizeMultiplier();
    const scale = arenaVisualScale();
    const speed = (options.speed ?? 300) * guidanceMultiplier * PROJECTILE_SPEED_SCALE * scale;
    const homing = (options.homing || 0) + MODULE_EFFECTS.guidanceHomingBonus(guidance);
    const targetSelection = options.target;
    const target = targetSelection?.enemy && !targetSelection.enemy.dead ? targetSelection.enemy : null;
    const orbitStartAngle = kind === "blade" ? Math.atan2(origin.y - player.y, origin.x - player.x) : 0;
    const orbitStartRadius = kind === "blade" ? Math.hypot(origin.x - player.x, origin.y - player.y) : 0;
    function spawnProjectile() {
      const projectile = {
        kind,
        x: origin.x,
        y: origin.y,
        vx: kind === "blade" ? 0 : Math.cos(angle) * speed,
        vy: kind === "blade" ? 0 : Math.sin(angle) * speed,
        speed,
        life: Infinity,
        color: options.color || "#dffcff",
        size: (options.size || 4) * PROJECTILE_SIZE_SCALE * scale * sizeMultiplier,
        pierce: options.pierce || 0,
        bounces: (options.bounces || 0) < 0 ? options.bounces : (options.bounces || 0) + bounceBonus,
        blastRadius: (options.blastRadiusCells ? options.blastRadiusCells * arena.cellSize : (options.blastRadius || 0) * scale) * sizeMultiplier,
        slow: options.slow || 0,
        frostStacks: options.frostStacks || 0,
        corrosionStacks: options.corrosionStacks || 0,
        burnOnHit: Boolean(options.burnOnHit),
        homing,
        target: homing > 0 ? target : null,
        targetSegmentIndex: homing > 0 && target ? targetSelection.segmentIndex : -1,
        orbitStartedAt: kind === "blade" ? gameTime : 0,
        orbitStartAngle,
        orbitStartRadius,
        orbitAngle: orbitStartAngle,
        hitNodes: new Set()
      };
      projectiles.push(projectile);
      return projectile;
    }
    const projectile = spawnProjectile();
    const doubleChance = MODULE_EFFECTS.projectileDoubleChance(moduleCount("multishot"));
    if (doubleChance > 0 && random() < doubleChance) spawnProjectile();
    return projectile;
  }

  function spawnShot(origin, target, options = {}) {
    if (!target || target.enemy.dead) return false;
    const angle = Math.atan2(target.node.y - origin.y, target.node.x - origin.x) + (options.angleOffset || 0);
    createPlayerProjectile(origin, angle, { ...options, target });
    return true;
  }

  function triggerCollisionEcho() {
    const projectileCount = MODULE_EFFECTS.echoProjectileCount(moduleCount("echo"));
    if (projectileCount <= 0) return;
    for (let index = 0; index < projectileCount; index += 1) {
      createPlayerProjectile(player, random(0, TAU), {
        color: MODULE_BY_ID.echo.color,
        speed: 330,
        size: 3.4
      });
    }
    sound("shoot");
  }

  function applyPlayerCollisionAttack(enemy, node, hitHead) {
    if (!enemy || enemy.dead || !node) return;
    const segmentIndex = hitHead ? -1 : enemy.segments.indexOf(node);
    triggerCollisionEcho();
    let damage = playerHeadDamage(hitHead);
    const doubleChance = MODULE_EFFECTS.collisionDoubleChance(moduleCount("doublehit"));
    if (doubleChance > 0 && random() < doubleChance) damage *= 2;
    damageEnemy(enemy, damage, node.x, node.y, player.playerColor || "#f3c600", { hitSegmentIndex: segmentIndex });
    if (!enemy.dead) applyLocalRandomCollisionStatuses(enemy);
  }

  function localStatusEffectMultiplier() {
    return MODULE_EFFECTS.statusEffectMultiplier(moduleCount("statusamp"));
  }

  function applyLocalFrostStacks(enemy, stacks) {
    const safeStacks = Math.max(0, Math.floor(Number(stacks) || 0));
    if (!enemy || enemy.dead || safeStacks <= 0) return;
    const currentPotency = Number.isFinite(enemy.frostPotency) ? enemy.frostPotency : (enemy.frostStacks || 0);
    enemy.frostStacks = (enemy.frostStacks || 0) + safeStacks;
    enemy.frostPotency = currentPotency + safeStacks * localStatusEffectMultiplier();
  }

  function applyLocalBurningLayers(enemy, baseLayers, color) {
    if (!enemy || enemy.dead) return;
    const remaining = MODULE_PROGRESSION.rollLinearRewards(
      Math.max(0, Number(baseLayers) || 0) * localStatusEffectMultiplier(),
      Math.random
    );
    if (remaining <= 0) return;
    enemy.burningApplications.push({ remaining, timer: BURN_TICK_INTERVAL, color });
    enemy.burnStacks += remaining;
  }

  function applyLocalRandomCollisionStatuses(enemy) {
    const applications = MODULE_EFFECTS.statusStrikeApplications(moduleCount("statusstrike"));
    if (applications <= 0) return;
    let frostStacks = 0;
    let burnStacks = 0;
    let corrosionStacks = 0;
    for (let index = 0; index < applications; index += 1) {
      const statusIndex = Math.floor(Math.random() * 3);
      if (statusIndex === 0) frostStacks += 1;
      else if (statusIndex === 1) burnStacks += 1;
      else corrosionStacks += 1;
    }
    applyLocalFrostStacks(enemy, frostStacks);
    applyLocalBurningLayers(enemy, burnStacks, MODULE_BY_ID.incendiary.color);
    applyLocalCorrosionStack(enemy, MODULE_BY_ID.venom.color, corrosionStacks);
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
    for (const segment of player.segments) {
      if (!segment.module) continue;
      segment.orbit += dt * 3.8;
      if (segment.module === "corrosionfield") continue;
      segment.timer -= dt;

      if (segment.module === "shield") {
        const maximumCharges = MODULE_EFFECTS.shieldMaximumCharges();
        if ((player.shieldCharges || 0) < maximumCharges) {
          if (segment.timer <= 0) {
            player.shieldCharges = Math.min(maximumCharges, (player.shieldCharges || 0) + 1);
            segment.timer = activeModuleCooldown("shield", segment.moduleLevel, MODULE_EFFECTS.armorCooldownRateBonus(moduleCount("armor")));
            effects.push({ type: "ring", x: segment.x, y: segment.y, color: MODULE_BY_ID.shield.color, life: 0.5, maxLife: 0.5, radius: 10, endRadius: arena.cellSize });
            sound("shield");
          }
        } else {
          segment.timer = activeModuleCooldown("shield", segment.moduleLevel, MODULE_EFFECTS.armorCooldownRateBonus(moduleCount("armor")));
        }
        continue;
      }

      if (segment.module === "phase") {
        if (!segment.ready) {
          segment.cooldown -= dt;
          if (segment.cooldown <= 0) {
            segment.ready = true;
            effects.push({ type: "ring", x: segment.x, y: segment.y, color: MODULE_BY_ID[segment.module].color, life: 0.5, maxLife: 0.5, radius: 10 });
          }
        }
        continue;
      }

      if (segment.module === "saw") {
        const contactRadius = arena.cellSize * 0.82 * attackSizeMultiplier();
        for (const enemy of enemies) {
          if (enemy.dead || enemy.sawCooldown > 0) continue;
          if (pointHitsEnemy(segment.x, segment.y, contactRadius, enemy)) {
            enemy.sawCooldown = activeModuleCooldown("saw", segment.moduleLevel);
            damageEnemy(enemy, 1, segment.x, segment.y, MODULE_BY_ID.saw.color);
            effects.push({ type: "ring", x: segment.x, y: segment.y, color: MODULE_BY_ID.saw.color, life: 0.3, maxLife: 0.3, radius: 5, endRadius: contactRadius });
            playSkillSound("saw");
          }
        }
        continue;
      }

      if (segment.module === "regen" && segment.timer <= 0) {
        const distance = random(85, 130) * arenaVisualScale();
        const angle = random(0, TAU);
        const x = segment.x + Math.cos(angle) * distance;
        const y = segment.y + Math.sin(angle) * distance;
        spawnFood(x, y, true);
        playSkillSound("regen");
        effects.push({ type: "ring", x, y, color: MODULE_BY_ID.regen.color, life: 0.9, maxLife: 0.9, radius: 8 });
        segment.timer = activeModuleCooldown("regen", segment.moduleLevel);
        continue;
      }

      if (segment.module === "nursery" && segment.timer <= 0) {
        const tail = player.segments[player.segments.length - 1] || player;
        spawnFood(tail.x, tail.y, true);
        playSkillSound("regen");
        effects.push({ type: "ring", x: tail.x, y: tail.y, color: MODULE_BY_ID.nursery.color, life: 0.75, maxLife: 0.75, radius: 6, endRadius: arena.cellSize * 0.9 });
        segment.timer = activeModuleCooldown("nursery", segment.moduleLevel);
        continue;
      }

      if (segment.timer > 0) continue;
      const target = segment.module === "incendiary" ? highestHealthEnemyJoint(segment) : nearestEnemyJoint(segment);
      if (TARGET_REQUIRED_MODULES.has(segment.module) && !target) {
        segment.timer = 0;
        continue;
      }

      switch (segment.module) {
        case "spark":
          createPlayerProjectile(segment, random(0, TAU), { color: MODULE_BY_ID.spark.color, speed: 390, size: 4.5 });
          playSkillSound("spark");
          segment.timer = activeModuleCooldown("spark", segment.moduleLevel);
          break;
        case "frost":
          if (target) {
            for (const offset of [-0.17, 0, 0.17]) spawnShot(segment, target, { color: MODULE_BY_ID.frost.color, speed: 310, size: 5, angleOffset: offset, frostStacks: 1 });
            playSkillSound("frost");
          }
          segment.timer = activeModuleCooldown("frost", segment.moduleLevel);
          break;
        case "prism":
          if (target) {
            for (const offset of [-0.17, 0, 0.17]) spawnShot(segment, target, { color: MODULE_BY_ID.prism.color, speed: 330, angleOffset: offset });
            playSkillSound("prism");
          }
          segment.timer = activeModuleCooldown("prism", segment.moduleLevel);
          break;
        case "nova":
          for (let index = 0; index < 8; index += 1) {
            const angle = index * TAU / 8 + segment.orbit * 0.15;
            createPlayerProjectile(segment, angle, { color: MODULE_BY_ID.nova.color, speed: 250, size: 4.4, target });
          }
          playSkillSound("nova");
          effects.push({ type: "ring", x: segment.x, y: segment.y, color: MODULE_BY_ID.nova.color, life: 0.45, maxLife: 0.45, radius: 8 });
          segment.timer = activeModuleCooldown("nova", segment.moduleLevel);
          break;
        case "tesla":
          if (target) {
            fireTesla(segment, target);
            playSkillSound("tesla");
          }
          segment.timer = activeModuleCooldown("tesla", segment.moduleLevel);
          break;
        case "laser":
          if (target) {
            damageEnemy(target.enemy, 1, target.node.x, target.node.y, MODULE_BY_ID.laser.color);
            effects.push({ type: "beam", x: segment.x, y: segment.y, x2: target.node.x, y2: target.node.y, color: MODULE_BY_ID.laser.color, width: 4 * arenaVisualScale() * attackSizeMultiplier(), life: 0.2, maxLife: 0.2 });
            playSkillSound("laser");
          }
          segment.timer = activeModuleCooldown("laser", segment.moduleLevel);
          break;
        case "missile":
          if (spawnShot(segment, target, { color: MODULE_BY_ID.missile.color, speed: 230, size: 6, homing: 4.2 })) playSkillSound("missile");
          segment.timer = activeModuleCooldown("missile", segment.moduleLevel);
          break;
        case "mine":
          hazards.push({ kind: "mine", x: segment.x, y: segment.y, col: segment.col, row: segment.row, life: Infinity, arm: 0.55, radius: MODULE_MINE_BLAST_RADIUS_PIXELS * arenaVisualScale() * attackSizeMultiplier(), color: MODULE_BY_ID.mine.color, phase: random(0, TAU) });
          playSkillSound("mine");
          segment.timer = activeModuleCooldown("mine", segment.moduleLevel);
          break;
        case "blade":
          createPlayerProjectile(segment, 0, {
            kind: "blade",
            color: MODULE_BY_ID.blade.color,
            speed: 0,
            size: MODULE_EFFECTS.bladeBaseSizePixels()
          });
          playSkillSound("blade");
          segment.timer = activeModuleCooldown("blade", segment.moduleLevel);
          break;
        case "pulse":
          firePulse(segment);
          playSkillSound("pulse");
          segment.timer = activeModuleCooldown("pulse", segment.moduleLevel);
          break;
        case "venom":
          if (spawnShot(segment, target, { color: MODULE_BY_ID.venom.color, speed: 285, size: 5.5, corrosionStacks: 1 })) playSkillSound("venom");
          segment.timer = activeModuleCooldown("venom", segment.moduleLevel);
          break;
        case "rail":
          if (spawnShot(segment, target, { color: MODULE_BY_ID.rail.color, speed: 520, size: 4.8, pierce: -1 })) playSkillSound("rail");
          segment.timer = activeModuleCooldown("rail", segment.moduleLevel);
          break;
        case "ricochet":
          if (spawnShot(segment, target, { color: MODULE_BY_ID.ricochet.color, speed: 340, size: 5.2, bounces: -1 })) playSkillSound("ricochet");
          segment.timer = activeModuleCooldown("ricochet", segment.moduleLevel);
          break;
        case "cluster":
          if (spawnShot(segment, target, { color: MODULE_BY_ID.cluster.color, speed: 245, size: 7, homing: 3.6, blastRadiusCells: MODULE_EFFECTS.clusterBlastRadiusCells() })) playSkillSound("cluster");
          segment.timer = activeModuleCooldown("cluster", segment.moduleLevel);
          break;
        case "fan":
          if (target) {
            for (const offset of [-0.34, -0.17, 0, 0.17, 0.34]) {
              spawnShot(segment, target, { color: MODULE_BY_ID.fan.color, speed: 300, size: 4.6, angleOffset: offset });
            }
            playSkillSound("fan");
          }
          segment.timer = activeModuleCooldown("fan", segment.moduleLevel);
          break;
        case "gravity":
          if (target) {
            const gravityRadius = 95 * arenaVisualScale();
            hazards.push({ kind: "gravity", x: segment.x, y: segment.y, col: segment.col, row: segment.row, life: 6, arm: 0, radius: gravityRadius, color: MODULE_BY_ID.gravity.color, phase: random(0, TAU) });
            playSkillSound("gravity");
          }
          segment.timer = activeModuleCooldown("gravity", segment.moduleLevel);
          break;
        case "needle":
          if (spawnShot(segment, target, { color: MODULE_BY_ID.needle.color, speed: 560, size: 3.8, pierce: 1 })) playSkillSound("needle");
          segment.timer = activeModuleCooldown("needle", segment.moduleLevel);
          break;
        case "mortar":
          if (spawnShot(segment, target, { color: MODULE_BY_ID.mortar.color, speed: 205, size: 8, homing: 3.2, blastRadius: 92 })) playSkillSound("mortar");
          segment.timer = activeModuleCooldown("mortar", segment.moduleLevel);
          break;
        case "sweep":
          if (target && fireSweepBeam(segment, target)) playSkillSound("sweep");
          segment.timer = activeModuleCooldown("sweep", segment.moduleLevel);
          break;
        case "sniper":
          if (target) {
            damageEnemy(target.enemy, 2, target.node.x, target.node.y, MODULE_BY_ID.sniper.color);
            effects.push({ type: "beam", x: segment.x, y: segment.y, x2: target.node.x, y2: target.node.y, color: MODULE_BY_ID.sniper.color, width: 4 * arenaVisualScale() * attackSizeMultiplier(), life: 0.28, maxLife: 0.28 });
            playSkillSound("sniper");
          }
          segment.timer = activeModuleCooldown("sniper", segment.moduleLevel);
          break;
        case "flak":
          if (target && fireFlakBurst(target)) playSkillSound("flak");
          segment.timer = activeModuleCooldown("flak", segment.moduleLevel);
          break;
        case "fork":
          if (target) {
            spawnShot(segment, target, { color: MODULE_BY_ID.fork.color, speed: 300, size: 5, angleOffset: -0.24, homing: 2.5 });
            spawnShot(segment, target, { color: MODULE_BY_ID.fork.color, speed: 300, size: 5, angleOffset: 0.24, homing: 2.5 });
            playSkillSound("fork");
          }
          segment.timer = activeModuleCooldown("fork", segment.moduleLevel);
          break;
        case "anchor":
          if (spawnShot(segment, target, { color: MODULE_BY_ID.anchor.color, speed: 180, size: 8.5, homing: 2, slow: 4.2 })) playSkillSound("anchor");
          segment.timer = activeModuleCooldown("anchor", segment.moduleLevel);
          break;
        case "flare":
          if (spawnShot(segment, target, { color: MODULE_BY_ID.flare.color, speed: 270, size: 5.8, corrosionStacks: 4 })) playSkillSound("flare");
          segment.timer = activeModuleCooldown("flare", segment.moduleLevel);
          break;
        case "incendiary":
          if (spawnShot(segment, target, {
            color: MODULE_BY_ID.incendiary.color,
            speed: MODULE_INCENDIARY_PROJECTILE_SPEED,
            size: MODULE_INCENDIARY_PROJECTILE_SIZE,
            homing: MODULE_INCENDIARY_HOMING,
            burnOnHit: true
          })) playSkillSound("incendiary");
          segment.timer = activeModuleCooldown("incendiary", segment.moduleLevel);
          break;
        case "scatter":
          if (target) {
            for (const offset of [-0.42, -0.28, -0.14, 0, 0.14, 0.28, 0.42]) {
              spawnShot(segment, target, { color: MODULE_BY_ID.scatter.color, speed: 305, size: 4.2, angleOffset: offset });
            }
            playSkillSound("scatter");
          }
          segment.timer = activeModuleCooldown("scatter", segment.moduleLevel);
          break;
        case "lance":
          if (spawnShot(segment, target, { color: MODULE_BY_ID.lance.color, speed: 590, size: 7, pierce: 5 })) playSkillSound("lance");
          segment.timer = activeModuleCooldown("lance", segment.moduleLevel);
          break;
        case "execute":
          {
            const executionTarget = nearestEnemyJoint(segment, Infinity, (enemy) => enemy.segments.length === 0);
            if (!executionTarget) {
              segment.timer = 0;
              break;
            }
            damageEnemy(executionTarget.enemy, 1, executionTarget.node.x, executionTarget.node.y, MODULE_BY_ID.execute.color, { hitSegmentIndex: -1 });
            effects.push({ type: "beam", x: segment.x, y: segment.y, x2: executionTarget.node.x, y2: executionTarget.node.y, color: MODULE_BY_ID.execute.color, width: 4 * arenaVisualScale() * attackSizeMultiplier(), life: 0.2, maxLife: 0.2 });
            playSkillSound("execute");
            segment.timer = activeModuleCooldown("execute", segment.moduleLevel);
            break;
          }
        case "crossfire":
          if (target && fireCrossfire(segment, target)) playSkillSound("crossfire");
          segment.timer = activeModuleCooldown("crossfire", segment.moduleLevel);
          break;
        case "phasebolt":
          if (spawnShot(segment, target, { color: MODULE_BY_ID.phasebolt.color, speed: 320, size: 6, bounces: -1, homing: 1.6 })) playSkillSound("phasebolt");
          segment.timer = activeModuleCooldown("phasebolt", segment.moduleLevel);
          break;
        case "barrage": {
          const projectileCount = MODULE_EFFECTS.barrageProjectileCount();
          const startAngle = segment.orbit * 0.15;
          for (let index = 0; index < projectileCount; index += 1) {
            createPlayerProjectile(segment, startAngle + index * TAU / projectileCount, {
              color: MODULE_BY_ID.barrage.color,
              speed: 300,
              size: 4.8,
              bounces: -1
            });
          }
          playSkillSound("barrage");
          effects.push({ type: "ring", x: segment.x, y: segment.y, color: MODULE_BY_ID.barrage.color, life: 0.55, maxLife: 0.55, radius: 10, endRadius: arena.cellSize * 1.2 });
          segment.timer = activeModuleCooldown("barrage", segment.moduleLevel);
          break;
        }
        default:
          break;
      }
    }

    for (const enemy of enemies) {
      enemy.sawCooldown = Math.max(0, enemy.sawCooldown - dt);
      if (enemy.slow > 0) enemy.slow -= dt;
      if (enemy.corrosionStacks > 0) {
        const effectiveInterval = CORROSION_TICK_INTERVAL / Math.max(1, enemy.corrosionPotency || enemy.corrosionStacks);
        enemy.corrosionTimer -= dt;
        if (enemy.corrosionTimer <= 0) {
          enemy.corrosionTimer = effectiveInterval;
          const hitSegmentIndex = enemy.segments.length > 0 ? Math.floor(Math.random() * enemy.segments.length) : -1;
          const target = hitSegmentIndex >= 0 ? enemy.segments[hitSegmentIndex] : enemy;
          damageEnemy(enemy, CORROSION_DAMAGE_PER_TICK, target.x, target.y, enemy.corrosionColor || MODULE_BY_ID.venom.color, { hitSegmentIndex });
        } else {
          enemy.corrosionTimer = Math.min(enemy.corrosionTimer, effectiveInterval);
        }
      }
      if (enemy.burningApplications?.length) {
        for (const application of enemy.burningApplications) {
          application.timer -= dt;
          while (application.remaining > 0 && application.timer <= 0 && !enemy.dead) {
            if (enemy.segments.length > 0) {
              const hitSegmentIndex = Math.floor(Math.random() * enemy.segments.length);
              const target = enemy.segments[hitSegmentIndex];
              damageEnemy(enemy, BURN_DAMAGE_PER_TICK, target.x, target.y, application.color, { hitSegmentIndex });
            }
            application.remaining -= 1;
            application.timer += BURN_TICK_INTERVAL;
          }
        }
        retainInPlace(enemy.burningApplications, (application) => application.remaining > 0 && !enemy.dead);
        enemy.burnStacks = enemy.burningApplications.reduce((sum, application) => sum + application.remaining, 0);
      }
    }
  }

  function fireTesla(origin, first) {
    const hit = [];
    let current = first;
    let from = origin;
    for (let jump = 0; jump < 3 && current; jump += 1) {
      hit.push(current.enemy);
      damageEnemy(current.enemy, 1, current.node.x, current.node.y, MODULE_BY_ID.tesla.color);
      effects.push({ type: "lightning", x: from.x, y: from.y, x2: current.node.x, y2: current.node.y, color: MODULE_BY_ID.tesla.color, life: 0.24, maxLife: 0.24 });
      from = current.node;
      let next = null;
      const jumpRange = 155 * arenaVisualScale();
      let best = jumpRange * jumpRange;
      for (const enemy of enemies) {
        if (enemy.dead || hit.includes(enemy)) continue;
        const candidate = nearestJointOnEnemy(from, enemy);
        if (candidate.distanceSquared >= best) continue;
        best = candidate.distanceSquared;
        next = candidate;
      }
      current = next;
    }
  }

  function circularEnemyHitIndexes(originX, originY, radius, enemy) {
    const hits = [];
    if ((enemy.x - originX) ** 2 + (enemy.y - originY) ** 2 < (radius + enemy.radius) ** 2) hits.push(-1);
    const segmentRadius = radius + enemySegmentRadiusPixels();
    const segmentRadiusSquared = segmentRadius * segmentRadius;
    for (let index = 0; index < enemy.segments.length; index += 1) {
      const segment = enemy.segments[index];
      if ((segment.x - originX) ** 2 + (segment.y - originY) ** 2 < segmentRadiusSquared) hits.push(index);
    }
    return hits;
  }

  function lineEnemyHitIndexes(origin, directionX, directionY, range, halfWidth, enemy) {
    const hits = [];
    const nodes = [enemy, ...enemy.segments];
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      const relativeX = node.x - origin.x;
      const relativeY = node.y - origin.y;
      const projection = relativeX * directionX + relativeY * directionY;
      if (projection < 0 || projection > range) continue;
      const perpendicular = Math.abs(relativeX * directionY - relativeY * directionX);
      const nodeRadius = index === 0 ? enemy.radius : enemySegmentRadiusPixels();
      if (perpendicular <= halfWidth + nodeRadius) hits.push(index - 1);
    }
    return hits;
  }

  function damageEnemyParts(enemy, hitIndexes, x, y, color, options = {}) {
    const bodyIndexes = [...new Set(hitIndexes.filter((index) => index >= 0))].sort((left, right) => right - left);
    const hitsHead = hitIndexes.includes(-1);
    for (const index of bodyIndexes) {
      if (enemy.dead || index >= enemy.segments.length) continue;
      const node = enemy.segments[index];
      damageEnemy(enemy, 1, node.x, node.y, color, { ...options, hitSegmentIndex: index });
    }
    if (!enemy.dead && hitsHead) damageEnemy(enemy, 1, x, y, color, { ...options, hitSegmentIndex: -1 });
  }

  function firePulse(origin) {
    const radius = MODULE_EFFECTS.pulseRadiusCells() * arena.cellSize * attackSizeMultiplier();
    effects.push({ type: "ring", x: origin.x, y: origin.y, color: MODULE_BY_ID.pulse.color, life: 0.55, maxLife: 0.55, radius: 16, endRadius: radius });
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const hits = circularEnemyHitIndexes(origin.x, origin.y, radius, enemy);
      if (hits.length) damageEnemyParts(enemy, hits, origin.x, origin.y, MODULE_BY_ID.pulse.color);
    }
  }

  function lineHitEnemy(origin, directionX, directionY, range, halfWidth, enemy) {
    const nodes = [enemy, ...enemy.segments];
    let hit = null;
    let hitProjection = Number.POSITIVE_INFINITY;
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      const relativeX = node.x - origin.x;
      const relativeY = node.y - origin.y;
      const projection = relativeX * directionX + relativeY * directionY;
      if (projection < 0 || projection > range) continue;
      const perpendicular = Math.abs(relativeX * directionY - relativeY * directionX);
      const nodeRadius = index === 0 ? enemy.radius : enemySegmentRadiusPixels();
      if (perpendicular > halfWidth + nodeRadius || projection >= hitProjection) continue;
      hit = node;
      hitProjection = projection;
    }
    return hit;
  }

  function fireSweepBeam(origin, target) {
    const angle = Math.atan2(target.node.y - origin.y, target.node.x - origin.x);
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    const range = Math.max(arena.width, arena.height) * 1.15;
    const endX = origin.x + directionX * range;
    const endY = origin.y + directionY * range;
    let hits = 0;
    const halfWidth = 26 * arenaVisualScale() * attackSizeMultiplier();
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const hitIndexes = lineEnemyHitIndexes(origin, directionX, directionY, range, halfWidth, enemy);
      if (!hitIndexes.length) continue;
      damageEnemyParts(enemy, hitIndexes, enemy.x, enemy.y, MODULE_BY_ID.sweep.color);
      hits += hitIndexes.length;
    }
    effects.push({ type: "beam", x: origin.x, y: origin.y, x2: endX, y2: endY, color: MODULE_BY_ID.sweep.color, width: halfWidth * 2, life: 0.24, maxLife: 0.24 });
    return hits > 0;
  }

  function fireFlakBurst(target) {
    const radius = 84 * arenaVisualScale() * attackSizeMultiplier();
    let hits = 0;
    effects.push({ type: "ring", x: target.node.x, y: target.node.y, color: MODULE_BY_ID.flak.color, life: 0.5, maxLife: 0.5, radius: 8, endRadius: radius });
    burst(target.node.x, target.node.y, MODULE_BY_ID.flak.color, 18, 155);
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const hitIndexes = circularEnemyHitIndexes(target.node.x, target.node.y, radius, enemy);
      if (!hitIndexes.length) continue;
      damageEnemyParts(enemy, hitIndexes, target.node.x, target.node.y, MODULE_BY_ID.flak.color);
      hits += hitIndexes.length;
    }
    return hits > 0;
  }

  function fireCrossfire(origin, target) {
    const baseAngle = Math.atan2(target.node.y - origin.y, target.node.x - origin.x);
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

  function triggerBodyIntercept(enemy, collisionPoint) {
    const shotCount = MODULE_EFFECTS.thornsProjectileCount();
    const startAngle = random(0, TAU);
    const target = nearestEnemyJoint(collisionPoint);
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
    const range = ENEMY_BEHAVIOR_TUNING.bodyAvoidanceRange;
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
    const decoyMultiplier = 1 - MODULE_EFFECTS.decoyAvoidanceReduction(moduleCount("decoy"));
    return {
      angle: Math.atan2(awayY, awayX),
      strength: clamp(totalWeight * 1.85, 0.28, 0.96) * decoyMultiplier,
      priorityStrength: decoyMultiplier
    };
  }

  function enemySpatialBucketCode(bucketCol, bucketRow) {
    return bucketCol * 2048 + bucketRow;
  }

  function rebuildEnemySpatialBuckets() {
    for (const bucket of enemySpatialBuckets.values()) {
      bucket.count = 0;
      enemySpatialBucketPool.push(bucket);
    }
    enemySpatialBuckets.clear();
    const bucketSize = ENEMY_BEHAVIOR_TUNING.bodyAvoidanceRange;
    for (let ownerIndex = 0; ownerIndex < enemies.length; ownerIndex += 1) {
      const owner = enemies[ownerIndex];
      if (owner.dead) continue;
      for (let nodeIndex = -1; nodeIndex < owner.segments.length; nodeIndex += 1) {
        const node = nodeIndex < 0 ? owner : owner.segments[nodeIndex];
        const bucketCol = Math.floor(node.col / bucketSize);
        const bucketRow = Math.floor(node.row / bucketSize);
        const key = enemySpatialBucketCode(bucketCol, bucketRow);
        let bucket = enemySpatialBuckets.get(key);
        if (!bucket) {
          bucket = enemySpatialBucketPool.pop() || { entries: [], count: 0 };
          bucket.count = 0;
          enemySpatialBuckets.set(key, bucket);
        }
        let entry = bucket.entries[bucket.count];
        if (entry) {
          entry.owner = owner;
          entry.ownerIndex = ownerIndex;
          entry.node = node;
          entry.isHead = nodeIndex < 0;
        } else {
          entry = { owner, ownerIndex, node, isHead: nodeIndex < 0 };
          bucket.entries.push(entry);
        }
        bucket.count += 1;
      }
    }
  }

  function enemyBodyAvoidance(enemy) {
    const range = ENEMY_BEHAVIOR_TUNING.bodyAvoidanceRange;
    const rangeSquared = range * range;
    const forwardX = Math.cos(enemy.desiredAngle);
    const forwardY = Math.sin(enemy.desiredAngle);
    const probeCol = enemy.col + forwardX * 0.7;
    const probeRow = enemy.row + forwardY * 0.7;
    let awayX = 0;
    let awayY = 0;
    let totalWeight = 0;

    const minimumBucketCol = Math.floor((probeCol - range) / range);
    const maximumBucketCol = Math.floor((probeCol + range) / range);
    const minimumBucketRow = Math.floor((probeRow - range) / range);
    const maximumBucketRow = Math.floor((probeRow + range) / range);
    for (let bucketCol = minimumBucketCol; bucketCol <= maximumBucketCol; bucketCol += 1) {
      for (let bucketRow = minimumBucketRow; bucketRow <= maximumBucketRow; bucketRow += 1) {
        const bucket = enemySpatialBuckets.get(enemySpatialBucketCode(bucketCol, bucketRow));
        if (!bucket) continue;
        for (let entryIndex = 0; entryIndex < bucket.count; entryIndex += 1) {
          const entry = bucket.entries[entryIndex];
          if (entry.owner === enemy || entry.owner.dead) continue;
          const node = entry.node;
          const toBodyX = node.col - probeCol;
          const toBodyY = node.row - probeRow;
          const distanceSquaredValue = toBodyX * toBodyX + toBodyY * toBodyY;
          if (distanceSquaredValue <= 0.000001 || distanceSquaredValue >= rangeSquared) continue;
          const distance = Math.sqrt(distanceSquaredValue);
          const ahead = (toBodyX * forwardX + toBodyY * forwardY) / distance;
          if (ahead < -0.35) continue;
          const proximity = 1 - distance / range;
          const weight = proximity * proximity * (0.7 + Math.max(0, ahead) * 1.15);
          awayX -= toBodyX / distance * weight;
          awayY -= toBodyY / distance * weight;
          totalWeight += weight;
        }
      }
    }

    if (totalWeight < 0.02) return null;
    return {
      angle: Math.atan2(awayY, awayX),
      strength: clamp(totalWeight * 1.85, 0.28, 0.96)
    };
  }

  function resolveEnemyCollisions() {
    const collisionDamageAmount = ENEMY_COLLISION_DAMAGE * (1 + MODULE_EFFECTS.enemyWallDamageBonus(moduleCount("wallbreaker")));
    const collisionKnockback = 1 + MODULE_EFFECTS.enemyWallKnockbackBonus(moduleCount("wallbreaker"));
    const bucketSize = ENEMY_BEHAVIOR_TUNING.bodyAvoidanceRange;
    const headContactRange = ENEMY_HEAD_RADIUS_CELLS * 2;
    rebuildEnemySpatialBuckets();
    for (let firstIndex = 0; firstIndex < enemies.length; firstIndex += 1) {
      const first = enemies[firstIndex];
      if (first.dead || first.collisionCooldown > 0) continue;

      let second = null;
      let secondIndex = Infinity;
      const minimumBucketCol = Math.floor((first.col - headContactRange) / bucketSize);
      const maximumBucketCol = Math.floor((first.col + headContactRange) / bucketSize);
      const minimumBucketRow = Math.floor((first.row - headContactRange) / bucketSize);
      const maximumBucketRow = Math.floor((first.row + headContactRange) / bucketSize);
      for (let bucketCol = minimumBucketCol; bucketCol <= maximumBucketCol; bucketCol += 1) {
        for (let bucketRow = minimumBucketRow; bucketRow <= maximumBucketRow; bucketRow += 1) {
          const bucket = enemySpatialBuckets.get(enemySpatialBucketCode(bucketCol, bucketRow));
          if (!bucket) continue;
          for (let entryIndex = 0; entryIndex < bucket.count; entryIndex += 1) {
            const entry = bucket.entries[entryIndex];
            if (
              !entry.isHead
              || entry.ownerIndex <= firstIndex
              || entry.ownerIndex >= secondIndex
              || entry.owner.dead
              || entry.owner.collisionCooldown > 0
            ) continue;
            const normalX = first.col - entry.owner.col;
            const normalY = first.row - entry.owner.row;
            const hitDistance = (first.radius + entry.owner.radius) / arena.cellSize;
            if (normalX * normalX + normalY * normalY >= hitDistance * hitDistance) continue;
            second = entry.owner;
            secondIndex = entry.ownerIndex;
          }
        }
      }
      if (!second) continue;

      let normalX = first.col - second.col;
      let normalY = first.row - second.row;
      if (normalX * normalX + normalY * normalY < 0.000001) {
        normalX = Math.cos(first.angle) - Math.cos(second.angle);
        normalY = Math.sin(first.angle) - Math.sin(second.angle);
      }
      if (normalX * normalX + normalY * normalY < 0.000001) {
        normalX = -Math.cos(first.angle);
        normalY = -Math.sin(first.angle);
      }

      const collisionDamage = MODULE_PROGRESSION.rollLinearRewards(collisionDamageAmount, Math.random);
      damageEnemy(first, collisionDamage, first.x, first.y, second.color, { rewardSelf: false, hitSegmentIndex: -1 });
      damageEnemy(second, collisionDamage, second.x, second.y, first.color, { rewardSelf: false, hitSegmentIndex: -1 });
      if (!first.dead) bounceEntity(first, normalX, normalY, first.color, SNAKE_SEGMENT_SPACING, collisionKnockback);
      if (!second.dead) bounceEntity(second, -normalX, -normalY, second.color, SNAKE_SEGMENT_SPACING, collisionKnockback);
    }

    const bodyRangeSquared = ENEMY_BODY_CONTACT_RANGE ** 2;
    for (const enemy of enemies) {
      if (enemy.dead || enemy.collisionCooldown > 0) continue;
      let bodyHit = null;
      const minimumBucketCol = Math.floor((enemy.col - ENEMY_BODY_CONTACT_RANGE) / bucketSize);
      const maximumBucketCol = Math.floor((enemy.col + ENEMY_BODY_CONTACT_RANGE) / bucketSize);
      const minimumBucketRow = Math.floor((enemy.row - ENEMY_BODY_CONTACT_RANGE) / bucketSize);
      const maximumBucketRow = Math.floor((enemy.row + ENEMY_BODY_CONTACT_RANGE) / bucketSize);
      for (let bucketCol = minimumBucketCol; bucketCol <= maximumBucketCol && !bodyHit; bucketCol += 1) {
        for (let bucketRow = minimumBucketRow; bucketRow <= maximumBucketRow && !bodyHit; bucketRow += 1) {
          const bucket = enemySpatialBuckets.get(enemySpatialBucketCode(bucketCol, bucketRow));
          if (!bucket) continue;
          for (let entryIndex = 0; entryIndex < bucket.count; entryIndex += 1) {
            const entry = bucket.entries[entryIndex];
            if (
              entry.isHead
              || entry.owner === enemy
              || entry.owner.dead
              || !entry.owner.segments.includes(entry.node)
              || distanceSquared(enemy, entry.node) >= bodyRangeSquared
            ) continue;
            bodyHit = entry;
            break;
          }
        }
      }

      if (bodyHit) {
        const ownerSegmentIndex = bodyHit.owner.segments.indexOf(bodyHit.node);
        if (ownerSegmentIndex < 0) continue;
        const normalX = enemy.col - bodyHit.node.col;
        const normalY = enemy.row - bodyHit.node.row;
        const collisionDamage = MODULE_PROGRESSION.rollLinearRewards(collisionDamageAmount, Math.random);
        damageEnemy(bodyHit.owner, collisionDamage, bodyHit.node.x, bodyHit.node.y, enemy.color, {
          rewardSelf: false,
          hitSegmentIndex: ownerSegmentIndex
        });
        damageEnemy(enemy, collisionDamage, enemy.x, enemy.y, bodyHit.owner.color, { rewardSelf: false, hitSegmentIndex: -1 });
        if (!enemy.dead) bounceEntity(enemy, normalX, normalY, enemy.color, SNAKE_SEGMENT_SPACING, collisionKnockback);
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
    enemy.wobble += random(-1.2, 1.2);
    if (enemy.archetype === "charger") {
      enemy.target = null;
      enemy.behaviorState = "roam";
      return;
    }
    if (enemy.archetype === "cutter") {
      enemy.target = null;
      enemy.behaviorState = "intercept";
      return;
    }
    const candidates = nearestFoodsForEnemy(enemy, ENEMY_FOOD_SEARCH_LIMIT);
    switch (enemy.archetype) {
      case "scout":
      case "warden": {
        const target = candidates[0];
        const foodRange = enemy.archetype === "warden"
          ? ENEMY_BEHAVIOR_TUNING.wardenFoodRange
          : ENEMY_BEHAVIOR_TUNING.scoutFoodRange;
        enemy.target = target && distanceSquared(enemy, target) <= foodRange ** 2 ? target : null;
        enemy.behaviorState = enemy.target ? "forage" : "roam";
        break;
      }
      case "courier":
        enemy.target = densestEnemyFood(enemy, candidates, ENEMY_BEHAVIOR_TUNING.courierFoodClusterRadius);
        enemy.behaviorState = enemy.target ? "forage" : "roam";
        break;
      case "coiler": {
        const foodRangeSquared = ENEMY_BEHAVIOR_TUNING.coilerFoodRange ** 2;
        const nearbyFoods = candidates.filter((food) => distanceSquared(enemy, food) <= foodRangeSquared);
        enemy.target = nearbyFoods.length
          ? nearbyFoods[Math.floor(Math.pow(Math.random(), 1.8) * nearbyFoods.length)]
          : null;
        enemy.behaviorState = enemy.target ? "forage" : "roam";
        break;
      }
      default:
        enemy.target = candidates.length ? candidates[Math.floor(Math.pow(Math.random(), 1.8) * candidates.length)] : null;
        enemy.behaviorState = enemy.target ? "forage" : "roam";
        break;
    }
  }

  function steerEnemy(enemy, activeFoods) {
    if (enemy.archetype === "charger") {
      const ideal = Math.atan2(player.row - enemy.row, player.col - enemy.col);
      const sway = (
        Math.sin(gameTime * 1.7 + enemy.wobble) * 0.72
        + Math.sin(gameTime * 0.47 + enemy.id) * 0.28
      ) * ENEMY_BEHAVIOR_TUNING.chargerTrackingWobble;
      enemy.desiredAngle = ideal + sway;
      enemy.behaviorPhase = 0;
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

  function steerEnemyAwayFromWalls(enemy) {
    const lookaheadDistance = Math.max(ENEMY_WALL_AVOIDANCE_DISTANCE, enemy.speed * ENEMY_THINK_INTERVAL_MAX);
    const projectedCol = enemy.col + Math.cos(enemy.angle) * lookaheadDistance;
    const projectedRow = enemy.row + Math.sin(enemy.angle) * lookaheadDistance;
    const safeMinimum = arena.worldMin + ENEMY_WALL_AVOIDANCE_DISTANCE;
    const safeMaximum = arena.worldMax - ENEMY_WALL_AVOIDANCE_DISTANCE;
    let escapeCol = 0;
    let escapeRow = 0;
    if (projectedCol < safeMinimum) escapeCol += safeMinimum - projectedCol;
    if (projectedCol > safeMaximum) escapeCol -= projectedCol - safeMaximum;
    if (projectedRow < safeMinimum) escapeRow += safeMinimum - projectedRow;
    if (projectedRow > safeMaximum) escapeRow -= projectedRow - safeMaximum;
    if (Math.hypot(escapeCol, escapeRow) > 0.001) enemy.desiredAngle = Math.atan2(escapeRow, escapeCol);
  }

  function updateEnemies(dt) {
    const chronosMultiplier = 1 - MODULE_EFFECTS.chronosSlowReduction(moduleCount("chronos"));
    const waveSpeedMultiplier = enemyWaveDirector.speedMultiplier(waveCount);
    const repulseRange = repulseRangePixels();
    activeEnemyFoods.clear();
    for (const food of foods) activeEnemyFoods.add(food);
    rebuildEnemySpatialBuckets();
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      enemy.collisionCooldown = Math.max(0, enemy.collisionCooldown - dt);
      if (enemy.collisionCooldown <= 0) {
        enemy.think -= dt;
        if (enemy.think <= 0) {
          enemy.think = random(Math.min(ENEMY_THINK_INTERVAL_MIN, ENEMY_THINK_INTERVAL_MAX), Math.max(ENEMY_THINK_INTERVAL_MIN, ENEMY_THINK_INTERVAL_MAX));
          chooseEnemyIntent(enemy);
        }
        steerEnemy(enemy, activeEnemyFoods);

        const avoidance = ENEMY_PLAYER_BODY_AVOIDANCE.has(enemy.archetype) ? playerBodyAvoidance(enemy) : null;
        if (avoidance) {
          const priorityStrength = enemy.archetype === "courier" || enemy.archetype === "charger"
            ? avoidance.priorityStrength
            : avoidance.strength;
          enemy.desiredAngle += angleDelta(enemy.desiredAngle, avoidance.angle) * priorityStrength;
        }
        const enemyAvoidance = enemyBodyAvoidance(enemy);
        if (enemyAvoidance) {
          enemy.desiredAngle += angleDelta(enemy.desiredAngle, enemyAvoidance.angle) * enemyAvoidance.strength;
        }

        if (repulseRange > 0) {
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

        steerEnemyAwayFromWalls(enemy);
        enemy.angle = rotateToward(enemy.angle, enemy.desiredAngle, dt * enemy.turnRate * waveSpeedMultiplier);
      }
      const frostMultiplier = Math.max(FROST_MINIMUM_SPEED_RATIO, 1 - (enemy.frostPotency || enemy.frostStacks || 0) * FROST_SLOW_PER_STACK);
      const statusMultiplier = (enemy.slow > 0 ? 0.55 : 1) * frostMultiplier;
      const speed = enemy.speed * waveSpeedMultiplier * chronosMultiplier * statusMultiplier;
      enemyMovementStart.col = enemy.col;
      enemyMovementStart.row = enemy.row;
      const nextCol = enemy.col + (Math.cos(enemy.angle) * speed + enemy.knockbackX) * dt;
      const nextRow = enemy.row + (Math.sin(enemy.angle) * speed + enemy.knockbackY) * dt;
      enemyMovementEnd.col = nextCol;
      enemyMovementEnd.row = nextRow;
      let playerCollision = null;
      const protectedPlayer = player.invulnerable > 0;
      if ((protectedPlayer || player.collisionCooldown <= 0) && enemy.collisionCooldown <= 0) {
        const headProgress = sweptContactProgress(
          enemyMovementStart,
          enemyMovementEnd,
          player,
          (player.radius + enemy.radius) / arena.cellSize
        );
        if (headProgress !== null) playerCollision = protectedPlayer
          ? { kind: "protected", point: player, progress: headProgress }
          : { kind: "head", progress: headProgress };
      }
      for (let segmentIndex = 0; segmentIndex < player.segments.length; segmentIndex += 1) {
        if (protectedPlayer && enemy.collisionCooldown > 0) continue;
        const segment = player.segments[segmentIndex];
        const previousSegment = segmentIndex > 0 ? player.segments[segmentIndex - 1] : player;
        const progress = sweptCapsuleContactProgress(
          enemyMovementStart,
          enemyMovementEnd,
          previousSegment,
          segment,
          ENEMY_BODY_CONTACT_RANGE
        );
        if (progress === null || (playerCollision && playerCollision.progress <= progress)) continue;
        const collisionPosition = {
          col: enemyMovementStart.col + (nextCol - enemyMovementStart.col) * progress,
          row: enemyMovementStart.row + (nextRow - enemyMovementStart.row) * progress
        };
        const point = closestPointOnGridSegment(collisionPosition, previousSegment, segment);
        syncNodePosition(point);
        playerCollision = protectedPlayer
          ? { kind: "protected", point, progress }
          : { kind: "body", point, progress };
      }
      if (playerCollision) {
        enemy.col = enemyMovementStart.col + (nextCol - enemyMovementStart.col) * playerCollision.progress;
        enemy.row = enemyMovementStart.row + (nextRow - enemyMovementStart.row) * playerCollision.progress;
        syncNodePosition(enemy);
        updateEnemyHitBounds(enemy);
        if (playerCollision.kind === "protected") {
          bounceEntity(
            enemy,
            enemy.col - playerCollision.point.col,
            enemy.row - playerCollision.point.row,
            player.playerColor || "#f3c600",
            SNAKE_SEGMENT_SPACING
          );
        } else if (playerCollision.kind === "body") {
          const thorns = moduleCount("thorns");
          const thornsReady = thorns > 0 && player.thornsCooldown <= 0;
          killEnemy(enemy);
          if (thornsReady) {
            triggerBodyIntercept(enemy, playerCollision.point);
            player.thornsCooldown = activeModuleCooldown("thorns", thorns);
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
          applyPlayerCollisionAttack(enemy, enemy, true);
          const impulseMultiplier = enemy.archetype === "warden" ? ENEMY_BEHAVIOR_TUNING.wardenKnockbackMultiplier : 1;
          bounceEntity(player, normalX, normalY, "#dffcff", SNAKE_SEGMENT_SPACING, impulseMultiplier, true);
          if (!enemy.dead) bounceEntity(enemy, -normalX, -normalY, enemy.color, SNAKE_SEGMENT_SPACING, 1 + MODULE_EFFECTS.momentumKnockbackBonus(moduleCount("momentum")));
        }
        continue;
      }
      const wallNormal = wallBounceNormal(nextCol, nextRow);
      if (wallNormal) {
        enemy.col = clamp(nextCol, arena.worldMin, arena.worldMax);
        enemy.row = clamp(nextRow, arena.worldMin, arena.worldMax);
        syncNodePosition(enemy);
        const wallDamage = MODULE_PROGRESSION.rollLinearRewards(
          ENEMY_COLLISION_DAMAGE * (1 + MODULE_EFFECTS.enemyWallDamageBonus(moduleCount("wallbreaker"))),
          Math.random
        );
        damageEnemy(enemy, wallDamage, enemy.x, enemy.y, "#f3c600", { rewardSelf: false, hitSegmentIndex: -1 });
        if (!enemy.dead) bounceEntity(enemy, wallNormal.x, wallNormal.y, enemy.color, SNAKE_SEGMENT_SPACING, 1 + MODULE_EFFECTS.enemyWallKnockbackBonus(moduleCount("wallbreaker")));
        continue;
      }
      enemy.col = nextCol;
      enemy.row = nextRow;
      applyKnockbackDecay(enemy, dt);
      syncNodePosition(enemy);
      followEnemySegments(enemy, dt);
      updateEnemyHitBounds(enemy);

      if (enemy.collisionCooldown <= 0) {
        const ownBodyHit = findSelfCollision(enemy, ENEMY_SELF_COLLISION_RANGE);
        if (ownBodyHit) {
          bounceEntity(enemy, enemy.col - ownBodyHit.col, enemy.row - ownBodyHit.row, enemy.color, SNAKE_SEGMENT_SPACING);
          continue;
        }
      }

      const foodContact = findLocalEnemyFoodContact(enemy);
      if (foodContact) {
        const { food, collector, index } = foodContact;
        localFoodSpatialRuntime.untrackFood(food.id);
        locallyPulledFoods.delete(food);
        foods.splice(index, 1);
        activeEnemyFoods.delete(food);
        enemy.captured += 1;
        enemy.target = null;
        burst(collector.x, collector.y, enemy.color, 5, 55);
        effects.push({ type: "text", x: collector.x, y: collector.y - arena.cellSize * 0.4, text: `×${enemy.captured}`, color: enemy.color, life: 0.55, maxLife: 0.55 });
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
    const segmentRadius = enemySegmentRadiusPixels();
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
      if (enemy.dead) continue;
      const hitIndexes = circularEnemyHitIndexes(projectile.x, projectile.y, projectile.blastRadius, enemy);
      if (hitIndexes.length) damageEnemyParts(enemy, hitIndexes, projectile.x, projectile.y, projectile.color);
    }
    triggerScreenShake(5);
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

  function sweptPixelContactProgress(startX, startY, endX, endY, point, radius) {
    const pathX = endX - startX;
    const pathY = endY - startY;
    const lengthSquared = pathX * pathX + pathY * pathY;
    const progress = lengthSquared > 0.000001
      ? clamp(((point.x - startX) * pathX + (point.y - startY) * pathY) / lengthSquared, 0, 1)
      : 0;
    const closestX = startX + pathX * progress;
    const closestY = startY + pathY * progress;
    return (point.x - closestX) ** 2 + (point.y - closestY) ** 2 < radius * radius ? progress : null;
  }

  function sweptPathIntersectsEnemyBounds(startX, startY, endX, endY, radius, enemy) {
    const bounds = enemy.hitBounds;
    return !bounds
      || Math.max(startX, endX) + radius >= bounds.minX
      && Math.min(startX, endX) - radius <= bounds.maxX
      && Math.max(startY, endY) + radius >= bounds.minY
      && Math.min(startY, endY) - radius <= bounds.maxY;
  }

  function appendProjectileContact(contactCount, enemy, node, progress, head) {
    let contact = projectileContactBuffer[contactCount];
    if (contact) {
      contact.enemy = enemy;
      contact.node = node;
      contact.progress = progress;
      contact.head = head;
    } else {
      contact = { enemy, node, progress, head };
      projectileContactBuffer.push(contact);
    }
    return contactCount + 1;
  }

  function sortProjectileContacts(contactCount) {
    for (let index = 1; index < contactCount; index += 1) {
      const contact = projectileContactBuffer[index];
      let insertAt = index;
      while (insertAt > 0 && projectileContactBuffer[insertAt - 1].progress > contact.progress) {
        projectileContactBuffer[insertAt] = projectileContactBuffer[insertAt - 1];
        insertAt -= 1;
      }
      projectileContactBuffer[insertAt] = contact;
    }
  }

  function updateProjectiles(dt) {
    for (const projectile of projectiles) {
      projectile.life -= dt;
      let endedByImpact = false;
      const startX = projectile.x;
      const startY = projectile.y;
      if (projectile.kind === "blade") {
        const elapsed = Math.max(0, gameTime - projectile.orbitStartedAt);
        const targetRadius = bladeOrbitRadius();
        const maximumShift = MODULE_BLADE_ORBIT_CONVERGE_SPEED * arena.cellSize * elapsed;
        const radius = projectile.orbitStartRadius + clamp(targetRadius - projectile.orbitStartRadius, -maximumShift, maximumShift);
        const orbitAngle = projectile.orbitStartAngle + MODULE_BLADE_ORBIT_SPEED * elapsed;
        projectile.orbitAngle = orbitAngle;
        projectile.x = player.x + Math.cos(orbitAngle) * radius;
        projectile.y = player.y + Math.sin(orbitAngle) * radius;
        if (dt > 0) {
          projectile.vx = (projectile.x - startX) / dt;
          projectile.vy = (projectile.y - startY) / dt;
        }
      } else {
        if (projectile.homing && projectile.target && !projectile.target.dead) {
          const targetNode = resolveEnemyTargetNode(projectile.target, projectile.targetSegmentIndex);
          const current = Math.atan2(projectile.vy, projectile.vx);
          const target = Math.atan2(targetNode.y - projectile.y, targetNode.x - projectile.x);
          const angle = rotateToward(current, target, projectile.homing * dt);
          projectile.vx = Math.cos(angle) * projectile.speed;
          projectile.vy = Math.sin(angle) * projectile.speed;
        }
        projectile.x += projectile.vx * dt;
        projectile.y += projectile.vy * dt;

        const hitHorizontalWall = projectile.x < arena.left || projectile.x > arena.right;
        const hitVerticalWall = projectile.y < arena.top || projectile.y > arena.bottom;
        if (hitHorizontalWall || hitVerticalWall) {
          if (projectile.bounces !== 0) {
            projectile.x = clamp(projectile.x, arena.left, arena.right);
            projectile.y = clamp(projectile.y, arena.top, arena.bottom);
            if (hitHorizontalWall) projectile.vx *= -1;
            if (hitVerticalWall) projectile.vy *= -1;
            if (projectile.bounces > 0) projectile.bounces -= 1;
          } else {
            projectile.life = 0;
          }
        }
      }

      let contactCount = 0;
      const segmentRadius = enemySegmentRadiusPixels();
      for (const enemy of enemies) {
        if (enemy.dead) continue;
        const broadRadius = projectile.size + Math.max(enemy.radius, segmentRadius);
        if (!sweptPathIntersectsEnemyBounds(startX, startY, projectile.x, projectile.y, broadRadius, enemy)) continue;
        if (!projectile.hitNodes.has(enemy)) {
          const headProgress = sweptPixelContactProgress(
            startX,
            startY,
            projectile.x,
            projectile.y,
            enemy,
            projectile.size + enemy.radius
          );
          if (headProgress !== null) contactCount = appendProjectileContact(contactCount, enemy, enemy, headProgress, true);
        }
        for (const segment of enemy.segments) {
          if (projectile.hitNodes.has(segment)) continue;
          const progress = sweptPixelContactProgress(
            startX,
            startY,
            projectile.x,
            projectile.y,
            segment,
            projectile.size + segmentRadius
          );
          if (progress !== null) contactCount = appendProjectileContact(contactCount, enemy, segment, progress, false);
        }
      }
      if (contactCount > 1) sortProjectileContacts(contactCount);
      for (let contactIndex = 0; contactIndex < contactCount; contactIndex += 1) {
        const contact = projectileContactBuffer[contactIndex];
        const { enemy, node } = contact;
        if (enemy.dead || projectile.hitNodes.has(node)) continue;
        if (projectile.blastRadius) {
          projectile.x = startX + (projectile.x - startX) * contact.progress;
          projectile.y = startY + (projectile.y - startY) * contact.progress;
          explodeProjectile(projectile);
          projectile.life = 0;
          endedByImpact = true;
          break;
        }
        const hitSegmentIndex = contact.head ? -1 : enemy.segments.indexOf(node);
        if (!contact.head && hitSegmentIndex < 0) continue;
        projectile.hitNodes.add(node);
        damageEnemy(enemy, 1, node.x, node.y, projectile.color, { hitSegmentIndex });
        if (!enemy.dead && projectile.slow) enemy.slow = Math.max(enemy.slow, projectile.slow);
        if (!enemy.dead && projectile.frostStacks) applyLocalFrostStacks(enemy, projectile.frostStacks);
        if (!enemy.dead && projectile.corrosionStacks) {
          for (let stack = 0; stack < projectile.corrosionStacks; stack += 1) applyLocalCorrosionStack(enemy, projectile.color);
        }
        if (!enemy.dead && projectile.burnOnHit) {
          const baseLayers = Math.ceil((enemy.segments.length + 1) * BURN_HEALTH_FRACTION);
          applyLocalBurningLayers(enemy, baseLayers, projectile.color);
        }
        if (projectile.pierce > 0) projectile.pierce -= 1;
        else if (projectile.pierce === 0) {
          projectile.life = 0;
          endedByImpact = true;
          break;
        }
      }
      if (projectile.life <= 0 && !endedByImpact) expireProjectile(projectile);
    }
    retainInPlace(projectiles, (projectile) => projectile.life > 0 && (
      projectile.kind === "blade"
      || (projectile.x >= arena.left && projectile.x <= arena.right && projectile.y >= arena.top && projectile.y <= arena.bottom)
    ));
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
          followEnemySegments(enemy, 0);
        }
        continue;
      }

      if (hazard.kind === "corrosion") continue;

      hazard.arm -= dt;
      if (hazard.arm > 0) continue;
      const enemyTrigger = hasEnemyJointWithinDistance(hazard, hazard.radius);
      const playerTrigger = Math.hypot(player.x - hazard.x, player.y - hazard.y) < player.radius + mineVisualRadius(hazard);
      if (!enemyTrigger && !playerTrigger) continue;
      effects.push({ type: "ring", x: hazard.x, y: hazard.y, color: hazard.color, life: 0.5, maxLife: 0.5, radius: 10, endRadius: hazard.radius });
      burst(hazard.x, hazard.y, hazard.color, 18, 150);
      for (const enemy of enemies) {
        if (enemy.dead) continue;
        const hitIndexes = circularEnemyHitIndexes(hazard.x, hazard.y, hazard.radius, enemy);
        if (hitIndexes.length) damageEnemyParts(enemy, hitIndexes, hazard.x, hazard.y, hazard.color);
      }
      if (playerTrigger) bounceEntity(player, player.x - hazard.x, player.y - hazard.y, hazard.color, SNAKE_SEGMENT_SPACING);
      hazard.life = 0;
      sound("mine");
      triggerScreenShake(5);
    }
    updateLocalCorrosionFields(dt);
    retainInPlace(hazards, (hazard) => hazard.life > 0);
  }

  function enemyTouchesCorrosionField(enemy, hazard) {
    const headRange = hazard.radius + (enemy.radius || arena.cellSize * ENEMY_HEAD_RADIUS_CELLS);
    if ((enemy.x - hazard.x) ** 2 + (enemy.y - hazard.y) ** 2 <= headRange * headRange) return true;
    const segmentRange = hazard.radius + enemySegmentRadiusPixels();
    const segmentRangeSquared = segmentRange * segmentRange;
    for (const segment of enemy.segments) {
      if ((segment.x - hazard.x) ** 2 + (segment.y - hazard.y) ** 2 <= segmentRangeSquared) return true;
    }
    return false;
  }

  function applyLocalCorrosionStack(enemy, color, stacks = 1) {
    const safeStacks = Math.max(0, Math.floor(Number(stacks) || 0));
    if (!enemy || enemy.dead || safeStacks <= 0) return;
    const currentPotency = Number.isFinite(enemy.corrosionPotency) ? enemy.corrosionPotency : (enemy.corrosionStacks || 0);
    enemy.corrosionStacks += safeStacks;
    enemy.corrosionPotency = currentPotency + safeStacks * localStatusEffectMultiplier();
    const effectiveInterval = CORROSION_TICK_INTERVAL / Math.max(1, enemy.corrosionPotency);
    enemy.corrosionTimer = enemy.corrosionTimer <= 0 ? effectiveInterval : Math.min(enemy.corrosionTimer, effectiveInterval);
    enemy.corrosionColor = color;
  }

  function updateLocalCorrosionFields(dt) {
    const fields = hazards.filter((hazard) => hazard.kind === "corrosion" && hazard.life > 0);
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const timers = enemy.corrosionFieldTimers || (enemy.corrosionFieldTimers = new Map());
      const occupied = fields.some((field) => enemyTouchesCorrosionField(enemy, field));
      if (!occupied) {
        timers.delete(0);
        continue;
      }
      const timer = timers.get(0);
      if (timer === undefined) {
        applyLocalCorrosionStack(enemy, MODULE_BY_ID.corrosionfield.color);
        timers.set(0, CORROSION_TICK_INTERVAL);
      } else {
        const next = timer - dt;
        if (next <= 0) {
          applyLocalCorrosionStack(enemy, MODULE_BY_ID.corrosionfield.color);
          timers.set(0, CORROSION_TICK_INTERVAL);
        } else timers.set(0, next);
      }
    }
  }

  function nearestEnemySegmentIndex(enemy, x, y) {
    let nearestIndex = -1;
    let nearestDistance = (enemy.x - x) ** 2 + (enemy.y - y) ** 2;
    for (let index = 0; index < enemy.segments.length; index += 1) {
      const segment = enemy.segments[index];
      const distance = (segment.x - x) ** 2 + (segment.y - y) ** 2;
      if (distance >= nearestDistance) continue;
      nearestDistance = distance;
      nearestIndex = index;
    }
    return nearestIndex;
  }

  function enemyDamageSpan(segmentCount, hitSegmentIndex, amount) {
    const count = Math.min(segmentCount, amount);
    if (count <= 0) return { start: 0, count: 0 };
    if (hitSegmentIndex < 0) return { start: 0, count };
    const hit = clamp(Math.round(hitSegmentIndex), 0, segmentCount - 1);
    const before = Math.min(hit, Math.floor((count - 1) / 2));
    return { start: Math.min(hit - before, segmentCount - count), count };
  }

  function setEnemyHeadFromPromotion(enemy, promotedSegment, oldHead) {
    const oldX = Number.isFinite(oldHead?.x) ? oldHead.x : enemy.x;
    const oldY = Number.isFinite(oldHead?.y) ? oldHead.y : enemy.y;
    enemy.col = promotedSegment.col;
    enemy.row = promotedSegment.row;
    syncNodePosition(enemy);
    const tangentX = oldX - enemy.x;
    const tangentY = oldY - enemy.y;
    if (Math.hypot(tangentX, tangentY) > 0.001) enemy.angle = Math.atan2(tangentY, tangentX);
  }

  function playEnemyHeadReformPresentation(enemy, _oldHead, color, duration = ENEMY_HEAD_REFORM_DURATION) {
    if (!enemy || enemy.dead) return;
    const safeDuration = clamp(Number(duration) || ENEMY_HEAD_REFORM_DURATION, 0.05, 2);
    const radius = enemy.radius || arena.cellSize * ENEMY_HEAD_RADIUS_CELLS;
    enemy.headReform = { startedAt: performance.now(), duration: safeDuration };
    effects.push({ type: "ring", x: enemy.x, y: enemy.y, color, life: safeDuration, maxLife: safeDuration, radius: radius * 0.45, endRadius: radius * 1.65 });
  }

  function damageEnemy(enemy, amount, x, y, color, options = {}) {
    if (!enemy || enemy.dead) return;
    const impactX = Number.isFinite(x) ? x : enemy.x;
    const impactY = Number.isFinite(y) ? y : enemy.y;
    const impactColor = color || enemy.color || "#ffffff";
    const causedByPlayer = options.rewardSelf !== false;
    const safeAmount = Math.max(0, Math.floor(amount));
    if (safeAmount === 0) return;
    const beforeCount = enemy.segments.length;
    const hitSegmentIndex = Number.isInteger(options.hitSegmentIndex)
      ? clamp(options.hitSegmentIndex, -1, Math.max(-1, beforeCount - 1))
      : nearestEnemySegmentIndex(enemy, impactX, impactY);
    const hitsHead = hitSegmentIndex < 0;
    const oldHead = { x: enemy.x, y: enemy.y, col: enemy.col, row: enemy.row };
    const span = enemyDamageSpan(beforeCount, hitSegmentIndex, safeAmount);
    const removed = enemy.segments.splice(span.start, span.count);
    const destroysHead = safeAmount > beforeCount;
    const reconnectIndex = span.start < enemy.segments.length ? span.start : -1;
    const promotedHead = hitsHead && !destroysHead ? removed.at(-1) || null : null;
    if (promotedHead) {
      setEnemyHeadFromPromotion(enemy, promotedHead, oldHead);
      playEnemyHeadReformPresentation(enemy, oldHead, impactColor);
    } else if (!destroysHead) {
      startEnemyReconnect(enemy, reconnectIndex);
    }
    const destroyedNodes = promotedHead ? [oldHead, ...removed.slice(0, -1)] : removed;
    for (const segment of destroyedNodes) {
      burst(segment.x, segment.y, impactColor, 7, 95);
      if (causedByPlayer) {
        const salvageDrops = MODULE_PROGRESSION.rollLinearRewards(
          MODULE_EFFECTS.salvageExpectedDrops(moduleCount("salvage")),
          Math.random
        );
        for (let index = 0; index < salvageDrops; index += 1) {
          spawnFood(segment.x + random(-10, 10), segment.y + random(-10, 10), true);
        }
      }
    }
    updateEnemyHitBounds(enemy);
    burst(impactX, impactY, impactColor, 8, 115);
    effects.push({ type: "ring", x: impactX, y: impactY, color: impactColor, life: 0.34, maxLife: 0.34, radius: 3, endRadius: 16 });
    if (causedByPlayer) {
      sound("hit");
      triggerScreenShake(2.2);
    }
    if (destroysHead) killEnemy(enemy, options.rewardSelf !== false);
    if (causedByPlayer) {
      effects.push({
        type: "text",
        x: impactX,
        y: impactY + (destroysHead ? 18 : -12),
        text: `-${safeAmount}`,
        color: impactColor,
        life: ENEMY_DAMAGE_NUMBER_DURATION,
        maxLife: ENEMY_DAMAGE_NUMBER_DURATION,
        emphasis: true,
        damageNumber: true
      });
    }
  }

  function killEnemy(enemy, rewardSelf = true) {
    if (!enemy || enemy.dead) return;
    enemy.dead = true;
    const deathBurstLevel = moduleCount("deathburst");
    if (deathBurstLevel > 0) {
      const origin = player.segments.find((segment) => segment.module === "deathburst") || player;
      const target = nearestEnemyJoint(origin);
      const shotCount = MODULE_EFFECTS.deathBurstProjectileCount(deathBurstLevel);
      const startAngle = random(0, TAU);
      for (let index = 0; index < shotCount; index += 1) {
        createPlayerProjectile(origin, startAngle + index * TAU / shotCount, {
          target,
          color: MODULE_BY_ID.deathburst.color,
          speed: 315,
          size: 4.2
        });
      }
      if (shotCount > 0) sound("shoot");
    }
    const dropOccupied = occupiedCellKeys();
    if (rewardSelf) {
      kills += 1;
      score += 100 + enemy.captured * 25;
    }
    playEnemyDeathPresentation(enemy, enemy.segments, enemy.color, { playSound: true, rewardSelf });
    spawnFood(enemy.x, enemy.y, false, dropOccupied);

    if (rewardSelf) {
      const cache = moduleCount("cache");
      if (cache > 0) {
        player.cacheKills += 1;
        const cacheThreshold = MODULE_EFFECTS.cacheKillsPerTrigger();
        if (player.cacheKills >= cacheThreshold) {
          player.cacheKills -= cacheThreshold;
          for (let index = 0; index < cache; index += 1) spawnFood(enemy.x, enemy.y, true, dropOccupied);
          effects.push({ type: "ring", x: enemy.x, y: enemy.y, color: MODULE_BY_ID.cache.color, life: 0.65, maxLife: 0.65, radius: 8, endRadius: arena.cellSize });
        }
      }

      const bloom = moduleCount("bloom");
      if (bloom > 0 && player.bloomCooldown <= 0) {
        spawnFood(enemy.x, enemy.y, true, dropOccupied);
        player.bloomCooldown = activeModuleCooldown("bloom", bloom);
      }
    }

    let dropCount = enemy.captured;
    enemy.captured = 0;
    if (rewardSelf) {
      dropCount += MODULE_PROGRESSION.rollLinearRewards(
        MODULE_EFFECTS.fortuneExpectedDrops(moduleCount("fortune")),
        Math.random
      );
    }
    for (let index = 0; index < dropCount; index += 1) {
      const angle = index * 2.4 + random(-0.25, 0.25);
      const distance = 22 + Math.sqrt(index + 1) * 12;
      spawnFood(enemy.x + Math.cos(angle) * distance, enemy.y + Math.sin(angle) * distance, true, dropOccupied);
    }
    if (rewardSelf) updateHud();
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
    if (options.rewardSelf) triggerScreenShake(7);
  }

  function healPlayer(amount, color = MODULE_BY_ID.recovery.color, present = false) {
    if (!player || amount <= 0 || player.health >= player.maxHealth) return 0;
    const amplified = amount * (1 + MODULE_EFFECTS.healingReceivedBonus(moduleCount("recovery")));
    const applied = Math.min(amplified, player.maxHealth - player.health);
    player.health += applied;
    if (present && applied > 0) playPlayerHealPresentation(player, applied, true, color);
    return applied;
  }

  function consumeShieldCharge() {
    if (!player || (player.shieldCharges || 0) <= 0) return false;
    player.shieldCharges -= 1;
    sound("shield");
    effects.push({ type: "ring", x: player.x, y: player.y, color: MODULE_BY_ID.shield.color, life: 0.7, maxLife: 0.7, radius: 18, endRadius: 76 });
    burst(player.x, player.y, MODULE_BY_ID.shield.color, 18, 130);
    updateHud(true);
    return true;
  }

  function effectivePlayerDamage(amount) {
    return Math.max(0, amount) * (1 - MODULE_EFFECTS.damageReduction(moduleCount("plating")));
  }

  function damagePlayer(amount) {
    if (!player || state !== "running" || player.invulnerable > 0 || amount <= 0) return false;
    if (consumeShieldCharge()) return false;
    const damage = effectivePlayerDamage(amount);
    if (damage <= 0) return false;
    player.health = Math.max(0, player.health - damage);
    playPlayerHurtPresentation(player, damage, true);
    updateHud();
    if (player.health <= 0) gameOver();
    return true;
  }

  function drainPlayerHealth(amount) {
    if (!player || state !== "running" || amount <= 0) return false;
    player.health = Math.max(0, player.health - amount);
    if (player.health <= 0) gameOver();
    return true;
  }

  function updatePlayerHealthRegen(dt) {
    const rate = playerHealthRegenRate();
    if (rate >= 0) {
      healPlayer(rate * dt);
      return;
    }
    drainPlayerHealth(-rate * dt);
  }

  function consumeDefense() {
    const armorRateBonus = MODULE_EFFECTS.armorCooldownRateBonus(moduleCount("armor"));
    const phase = player.segments.find((segment) => segment.module === "phase" && segment.ready);
    const defense = phase;
    if (!defense) return false;

    defense.ready = false;
    defense.cooldown = activeModuleCooldown(defense.module, defense.moduleLevel, armorRateBonus);
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
      triggerCollisionEcho();
      damagePlayer(PLAYER_WALL_COLLISION_DAMAGE);
      if (state === "running") bounceEntity(player, wallNormal.x, wallNormal.y, "#b8f53f", SNAKE_SEGMENT_SPACING);
      return;
    }

    if (player.collisionCooldown <= 0) {
      const ownBodyHit = findSelfCollision(player, PLAYER_SELF_COLLISION_RANGE);
      if (ownBodyHit) {
        const knockedBack = hasActiveKnockback(player);
        triggerCollisionEcho();
        if (!knockedBack) damagePlayer(PLAYER_WALL_COLLISION_DAMAGE);
        if (state === "running") bounceEntity(player, player.col - ownBodyHit.col, player.row - ownBodyHit.row, "#f4ffdc", SNAKE_SEGMENT_SPACING);
        return;
      }
    }

    if (player.invulnerable <= 0 && player.collisionCooldown <= 0) {
      for (const enemy of enemies) {
        if (enemy.dead) continue;
        for (let segmentIndex = 0; segmentIndex < enemy.segments.length; segmentIndex += 1) {
          const segment = enemy.segments[segmentIndex];
          if (Math.hypot(player.col - segment.col, player.row - segment.row) < SNAKE_BODY_CONTACT_RANGE) {
            const defended = consumeDefense();
            applyPlayerCollisionAttack(enemy, segment, false);
            if (!defended) damagePlayer(PLAYER_ENEMY_BODY_COLLISION_DAMAGE);
            if (state === "running") bounceEntity(player, player.col - segment.col, player.row - segment.row, enemy.color, SNAKE_SEGMENT_SPACING, 1, true);
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

      applyPlayerCollisionAttack(enemy, enemy, true);

      const impulseMultiplier = enemy.archetype === "warden" ? ENEMY_BEHAVIOR_TUNING.wardenKnockbackMultiplier : 1;
      bounceEntity(player, normalX, normalY, "#dffcff", SNAKE_SEGMENT_SPACING, impulseMultiplier, true);
      if (!enemy.dead) bounceEntity(enemy, -normalX, -normalY, enemy.color, SNAKE_SEGMENT_SPACING, 1 + MODULE_EFFECTS.momentumKnockbackBonus(moduleCount("momentum")));
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
      let particle;
      if (particles.length < MAX_DECORATIVE_PARTICLES) {
        particle = particlePool.pop() || {};
        particles.push(particle);
      } else {
        particle = particles[nextParticleSlot];
        nextParticleSlot = (nextParticleSlot + 1) % MAX_DECORATIVE_PARTICLES;
      }
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * velocity;
      particle.vy = Math.sin(angle) * velocity;
      particle.life = life;
      particle.maxLife = life;
      particle.color = color;
      particle.size = random(1.4, 3.6) * scale;
    }
  }

  function clearParticles() {
    for (const particle of particles) {
      if (particlePool.length < MAX_DECORATIVE_PARTICLES) particlePool.push(particle);
    }
    particles.length = 0;
    nextParticleSlot = 0;
  }

  function updateEffects(dt) {
    const damping = Math.pow(0.04, dt);
    let liveParticleCount = 0;
    for (const particle of particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= damping;
      particle.vy *= damping;
      if (particle.life > 0) particles[liveParticleCount++] = particle;
      else if (particlePool.length < MAX_DECORATIVE_PARTICLES) particlePool.push(particle);
    }
    particles.length = liveParticleCount;
    if (particles.length < MAX_DECORATIVE_PARTICLES) nextParticleSlot %= Math.max(1, particles.length);

    for (const effect of effects) {
      if ((effect.delay || 0) > 0) {
        effect.delay -= dt;
        if (effect.delay > 0) continue;
      }
      if (effect.type === "experienceCompress" && !effect.started) activateExperienceCompression(effect);
      effect.life -= dt;
    }
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
    updatePlayerHealthRegen(worldDt);
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
    const connectionDistanceSquared = connectionDistance * connectionDistance;
    ambientCtx.lineWidth = 0.65;
    ambientCtx.strokeStyle = "rgb(8, 199, 220)";
    for (let first = 0; first < ambientNodes.length; first += 1) {
      for (let second = first + 1; second < ambientNodes.length; second += 1) {
        const dx = ambientNodes[first].renderX - ambientNodes[second].renderX;
        const dy = ambientNodes[first].renderY - ambientNodes[second].renderY;
        const distanceSquaredValue = dx * dx + dy * dy;
        if (distanceSquaredValue >= connectionDistanceSquared) continue;
        ambientCtx.globalAlpha = (1 - Math.sqrt(distanceSquaredValue) / connectionDistance) * 0.15;
        ambientCtx.beginPath();
        ambientCtx.moveTo(ambientNodes[first].renderX, ambientNodes[first].renderY);
        ambientCtx.lineTo(ambientNodes[second].renderX, ambientNodes[second].renderY);
        ambientCtx.stroke();
      }
    }

    ambientCtx.globalAlpha = 1;
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

  function cameraViewTouchesArenaBorder(padding = 0) {
    if (!renderWorldBounds.active) return true;
    return rectIntersectsRenderBounds(arena.left - padding, arena.top - padding, arena.left + padding, arena.bottom + padding)
      || rectIntersectsRenderBounds(arena.right - padding, arena.top - padding, arena.right + padding, arena.bottom + padding)
      || rectIntersectsRenderBounds(arena.left - padding, arena.top - padding, arena.right + padding, arena.top + padding)
      || rectIntersectsRenderBounds(arena.left - padding, arena.bottom - padding, arena.right + padding, arena.bottom + padding);
  }

  function drawVisibleArenaTexture() {
    if (!renderWorldBounds.active) {
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
      return;
    }
    const left = clamp(renderWorldBounds.left, arena.left, arena.right);
    const top = clamp(renderWorldBounds.top, arena.top, arena.bottom);
    const right = clamp(renderWorldBounds.right, arena.left, arena.right);
    const bottom = clamp(renderWorldBounds.bottom, arena.top, arena.bottom);
    if (right <= left || bottom <= top) return;
    const sourceX = (left - arena.left) / arena.width * arenaTextureCanvas.width;
    const sourceY = (top - arena.top) / arena.height * arenaTextureCanvas.height;
    const sourceWidth = (right - left) / arena.width * arenaTextureCanvas.width;
    const sourceHeight = (bottom - top) / arena.height * arenaTextureCanvas.height;
    ctx.drawImage(arenaTextureCanvas, sourceX, sourceY, sourceWidth, sourceHeight, left, top, right - left, bottom - top);
  }

  function drawBackground(time) {
    if (time - lastAmbientRender >= AMBIENT_RENDER_INTERVAL) renderAmbientLayer(time);
    ctx.drawImage(ambientCanvas, 0, 0, ambientCanvas.width, ambientCanvas.height, 0, 0, width, height);

    ctx.save();
    applyArenaPerspectiveTransform();
    if (cameraMode === "follow") {
      applyCameraViewportClip();
      applyCameraTransform();
    }
    if (cameraViewTouchesArenaBorder(ARENA_SHADOW_PADDING)) {
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
    }
    if (cameraMode !== "follow") {
      applyCameraViewportClip();
      applyCameraTransform();
    }
    drawVisibleArenaTexture();

    drawArenaFloorPattern();

    ctx.fillStyle = "rgba(243, 198, 0, 0.055)";
    const stripePhase = (time * arena.cellSize * 0.12) % (arena.cellSize * 3);
    const stripeMargin = arena.cellSize * 0.2;
    const minimumStripeDifference = renderWorldBounds.left - renderWorldBounds.bottom - stripeMargin;
    const maximumStripeDifference = renderWorldBounds.right - renderWorldBounds.top + stripeMargin;
    for (let index = -Math.ceil(arena.worldSize); index < Math.ceil(arena.worldSize) * 2; index += 3) {
      const offset = index * arena.cellSize + stripePhase;
      const stripeDifference = arena.left + offset - arena.top;
      if (renderWorldBounds.active
        && (stripeDifference < minimumStripeDifference || stripeDifference > maximumStripeDifference)) continue;
      ctx.save();
      ctx.translate(arena.left + offset, arena.top);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(0, -arena.cellSize * 0.08, arena.width * 1.45, arena.cellSize * 0.08);
      ctx.restore();
    }

    const scanY = arena.top + (time * 0.045 % 1) * arena.height;
    const scanRadius = arena.cellSize * 1.4;
    if (rectIntersectsRenderBounds(arena.left, scanY - scanRadius, arena.right, scanY + scanRadius)) {
      const scanGradient = ctx.createLinearGradient(0, scanY - scanRadius, 0, scanY + scanRadius);
      scanGradient.addColorStop(0, "rgba(8, 199, 220, 0)");
      scanGradient.addColorStop(0.5, "rgba(8, 199, 220, 0.045)");
      scanGradient.addColorStop(1, "rgba(8, 199, 220, 0)");
      ctx.fillStyle = scanGradient;
      const scanLeft = renderWorldBounds.active ? Math.max(arena.left, renderWorldBounds.left) : arena.left;
      const scanRight = renderWorldBounds.active ? Math.min(arena.right, renderWorldBounds.right) : arena.right;
      ctx.fillRect(scanLeft, scanY - scanRadius, Math.max(0, scanRight - scanLeft), scanRadius * 2);
    }

    ctx.restore();

    const mark = Math.max(16, arena.cellSize * 0.8);
    if (!cameraViewTouchesArenaBorder(mark)) return;
    ctx.save();
    applyArenaPerspectiveTransform();
    applyCameraViewportClip();
    applyCameraTransform();
    ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
    ctx.shadowBlur = 8;
    ctx.strokeStyle = "rgba(239, 242, 242, 0.6)";
    ctx.lineWidth = 1 / cameraZoom();
    ctx.strokeRect(arena.left + 0.5, arena.top + 0.5, arena.width - 1, arena.height - 1);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#f3c600";
    ctx.lineWidth = 3 / cameraZoom();
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
    if (!renderWorldBounds.active) {
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
      return;
    }
    const visibleLeft = renderWorldBounds.active ? Math.max(arena.left, renderWorldBounds.left) : arena.left;
    const visibleTop = renderWorldBounds.active ? Math.max(arena.top, renderWorldBounds.top) : arena.top;
    const visibleRight = renderWorldBounds.active ? Math.min(arena.right, renderWorldBounds.right) : arena.right;
    const visibleBottom = renderWorldBounds.active ? Math.min(arena.bottom, renderWorldBounds.bottom) : arena.bottom;
    if (visibleRight <= visibleLeft || visibleBottom <= visibleTop) return;
    const firstVerticalLine = renderWorldBounds.active
      ? Math.max(firstLine, Math.floor(arena.worldMin + (visibleLeft - arena.left) / arena.cellSize) - 1)
      : firstLine;
    const lastVerticalLine = renderWorldBounds.active
      ? Math.min(lastLine, Math.ceil(arena.worldMin + (visibleRight - arena.left) / arena.cellSize) + 1)
      : lastLine;
    const firstHorizontalLine = renderWorldBounds.active
      ? Math.max(firstLine, Math.floor(arena.worldMin + (visibleTop - arena.top) / arena.cellSize) - 1)
      : firstLine;
    const lastHorizontalLine = renderWorldBounds.active
      ? Math.min(lastLine, Math.ceil(arena.worldMin + (visibleBottom - arena.top) / arena.cellSize) + 1)
      : lastLine;

    for (let index = firstVerticalLine; index <= lastVerticalLine; index += 1) {
      const offset = arena.left + (index - arena.worldMin) * arena.cellSize;
      const major = ((index % 6) + 6) % 6 === 0;
      ctx.beginPath();
      ctx.moveTo(offset, visibleTop);
      ctx.lineTo(offset, visibleBottom);
      ctx.lineWidth = major ? 1.35 : 0.7;
      ctx.strokeStyle = major ? "rgba(231, 235, 235, 0.18)" : "rgba(198, 205, 207, 0.065)";
      ctx.stroke();
    }
    for (let index = firstHorizontalLine; index <= lastHorizontalLine; index += 1) {
      const offset = arena.top + (index - arena.worldMin) * arena.cellSize;
      const major = ((index % 6) + 6) % 6 === 0;
      ctx.beginPath();
      ctx.moveTo(visibleLeft, offset);
      ctx.lineTo(visibleRight, offset);
      ctx.lineWidth = major ? 1.35 : 0.7;
      ctx.strokeStyle = major ? "rgba(231, 235, 235, 0.18)" : "rgba(198, 205, 207, 0.065)";
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(235, 238, 238, 0.35)";
    ctx.font = `700 ${Math.max(7, arena.cellSize * 0.23)}px Bahnschrift, Arial Narrow, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    if (!renderWorldBounds.active || arena.top + arena.cellSize >= renderWorldBounds.top) {
      for (let index = firstVerticalLine; index < lastVerticalLine; index += 1) {
        if (((index % 4) + 4) % 4 !== 0) continue;
        const offset = (index - arena.worldMin) * arena.cellSize;
        const label = String(((index % 100) + 100) % 100 + 1).padStart(2, "0");
        ctx.fillText(label, arena.left + offset + 3, arena.top + 3);
      }
    }
    if (!renderWorldBounds.active || arena.left + arena.cellSize >= renderWorldBounds.left) {
      for (let index = firstHorizontalLine; index < lastHorizontalLine; index += 1) {
        if (((index % 4) + 4) % 4 !== 0) continue;
        const offset = (index - arena.worldMin) * arena.cellSize;
        const label = String(((index % 100) + 100) % 100 + 1).padStart(2, "0");
        ctx.save();
        ctx.translate(arena.left + 3, arena.top + offset + arena.cellSize - 3);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(label, 0, 0);
        ctx.restore();
      }
    }

    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    const edgeBandHeight = arena.cellSize * 0.18;
    if (rectIntersectsRenderBounds(arena.left, arena.top, arena.right, arena.top + edgeBandHeight)) {
      ctx.fillRect(visibleLeft, arena.top, visibleRight - visibleLeft, edgeBandHeight);
    }
    if (rectIntersectsRenderBounds(arena.left, arena.bottom - edgeBandHeight, arena.right, arena.bottom)) {
      ctx.fillRect(visibleLeft, arena.bottom - edgeBandHeight, visibleRight - visibleLeft, edgeBandHeight);
    }
  }

  function drawFood(time) {
    for (const food of foods) {
      if (food.networkHidden) continue;
      if (renderWorldBounds.active) {
        trackNearestOffscreenIndicator(
          food,
          foodIndicatorCandidates,
          foodIndicatorDistances,
          CAMERA_FOLLOW_FOOD_INDICATOR_LIMIT
        );
        if (!pointIntersectsRenderBounds(food.x, food.y, food.radius * 2 + 12)) continue;
      }
      const pulse = 1 + Math.sin(time * 5 + food.phase) * 0.08;
      const birthProgress = food.birthAge == null ? 1 : clamp(food.birthAge / FOOD_BIRTH_DURATION, 0, 1);
      const birthEase = 1 - (1 - birthProgress) ** 3;
      const birthScale = (0.14 + birthEase * 0.86) * (1 + Math.sin(birthProgress * Math.PI) * 0.24);
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
      ctx.globalAlpha *= 0.2 + birthProgress * 0.8;
      ctx.scale(pulse * birthScale, pulse * birthScale);
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
    for (const spawn of pendingEnemySpawns) {
      syncEnemyNodePositions(spawn);
      drawEnemy(spawn, time, true);
    }
    if (!network.enabled) return;
    const now = performance.now();
    for (const [id, spawn] of network.activatingSpawnViews) {
      if (spawn.activationExpiresAt <= now) {
        network.activatingSpawnViews.delete(id);
        continue;
      }
      syncEnemyNodePositions(spawn);
      drawEnemy(spawn, time);
    }
  }

  function syncEnemyNodePositions(enemy) {
    syncNodePosition(enemy);
    for (const segment of enemy.segments) syncNodePosition(segment);
  }

  function drawLink(from, to, color, widthValue, alpha = 1) {
    if (renderWorldBounds.active && !lineIntersectsRenderBounds(from, to, widthValue / 2)) return;
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
    ctx.globalAlpha *= alpha;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = widthValue;
    ctx.strokeStyle = color;
    ctx.beginPath();
    if (!renderWorldBounds.active) {
      ctx.moveTo(head.x, head.y);
      for (const segment of segments) ctx.lineTo(segment.x, segment.y);
      ctx.stroke();
    } else {
      let previous = head;
      let drewPath = false;
      for (const segment of segments) {
        if (lineIntersectsRenderBounds(previous, segment, widthValue / 2)) {
          ctx.moveTo(previous.x, previous.y);
          ctx.lineTo(segment.x, segment.y);
          drewPath = true;
        }
        previous = segment;
      }
      if (drewPath) ctx.stroke();
    }
    ctx.restore();
  }

  function roundedRectPath(x, y, widthValue, heightValue, radius) {
    roundedRectPathOn(ctx, x, y, widthValue, heightValue, radius);
  }

  function roundedRectPathOn(context, x, y, widthValue, heightValue, radius) {
    const safeRadius = Math.min(Math.max(0, radius), Math.abs(widthValue) / 2, Math.abs(heightValue) / 2);
    const right = x + widthValue;
    const bottom = y + heightValue;
    context.moveTo(x + safeRadius, y);
    context.lineTo(right - safeRadius, y);
    context.quadraticCurveTo(right, y, right, y + safeRadius);
    context.lineTo(right, bottom - safeRadius);
    context.quadraticCurveTo(right, bottom, right - safeRadius, bottom);
    context.lineTo(x + safeRadius, bottom);
    context.quadraticCurveTo(x, bottom, x, bottom - safeRadius);
    context.lineTo(x, y + safeRadius);
    context.quadraticCurveTo(x, y, x + safeRadius, y);
    context.closePath();
  }

  function paintEnemySegmentSprite(context, enemy, renderScale) {
    context.shadowColor = "rgba(0,0,0,0.8)";
    context.shadowBlur = 6 * renderScale;
    context.fillStyle = "#171b1e";
    context.strokeStyle = enemy.color;
    context.lineWidth = enemy.archetype === "warden" ? 2.5 : 1.8;
    context.beginPath();
    switch (enemy.archetype) {
      case "scout":
        context.moveTo(10, 0); context.lineTo(0, 6); context.lineTo(-9, 0); context.lineTo(0, -6); context.closePath();
        break;
      case "courier":
        roundedRectPathOn(context, -11, -7, 22, 14, 3);
        break;
      case "charger":
        context.moveTo(11, 0); context.lineTo(1, 9); context.lineTo(-9, 6); context.lineTo(-5, 0); context.lineTo(-9, -6); context.lineTo(1, -9); context.closePath();
        break;
      case "cutter":
        context.moveTo(10, 0); context.lineTo(0, 11); context.lineTo(-5, 4); context.lineTo(-11, 0); context.lineTo(-5, -4); context.lineTo(0, -11); context.closePath();
        break;
      case "coiler":
        context.arc(0, 0, 9, 0, TAU);
        break;
      case "warden":
        context.moveTo(8, -9); context.lineTo(11, -4); context.lineTo(11, 4); context.lineTo(8, 9); context.lineTo(-8, 9); context.lineTo(-11, 4); context.lineTo(-11, -4); context.lineTo(-8, -9); context.closePath();
        break;
      default:
        context.moveTo(10, 0); context.lineTo(4, 9); context.lineTo(-8, 7); context.lineTo(-11, 0); context.lineTo(-8, -7); context.lineTo(4, -9); context.closePath();
        break;
    }
    context.fill();
    context.stroke();
    context.shadowBlur = 0;
    context.fillStyle = enemy.color;
    context.globalAlpha = 0.76;
    if (enemy.archetype === "coiler") {
      context.lineWidth = 2;
      context.beginPath();
      context.arc(0, 0, 4.5, 0.2, TAU * 0.86);
      context.stroke();
    } else if (enemy.archetype === "courier") {
      context.fillRect(-5, -5, 9, 10);
      context.fillStyle = "#f4f6f5";
      context.fillRect(-2, -4, 2, 8);
    } else if (enemy.archetype === "cutter") {
      context.fillRect(-7, -1.5, 14, 3);
    } else if (enemy.archetype === "warden") {
      context.strokeStyle = "#ffffff";
      context.lineWidth = 1;
      context.strokeRect(-6, -5, 12, 10);
    } else {
      context.fillRect(-7, -2, 11, 4);
    }
  }

  function paintEnemyHeadSprite(context, enemy, renderScale) {
    context.shadowColor = enemy.color;
    context.shadowBlur = (enemy.archetype === "warden" ? 19 : 14) * renderScale;
    context.fillStyle = "#101416";
    context.strokeStyle = enemy.archetype === "warden" ? enemy.color : "#eff1f0";
    context.lineWidth = enemy.archetype === "warden" ? 3 : 1.7;
    context.beginPath();
    switch (enemy.archetype) {
      case "scout":
        context.moveTo(19, 0); context.lineTo(-8, 9); context.lineTo(-3, 0); context.lineTo(-8, -9); context.closePath();
        break;
      case "courier":
        context.moveTo(18, 0); context.lineTo(9, 9); context.lineTo(-11, 9); context.lineTo(-16, 4); context.lineTo(-16, -4); context.lineTo(-11, -9); context.lineTo(9, -9); context.closePath();
        break;
      case "charger":
        context.moveTo(21, 0); context.lineTo(8, 7); context.lineTo(3, 15); context.lineTo(-1, 9); context.lineTo(-14, 10); context.lineTo(-10, 0); context.lineTo(-14, -10); context.lineTo(-1, -9); context.lineTo(3, -15); context.lineTo(8, -7); context.closePath();
        break;
      case "cutter":
        context.moveTo(18, 0); context.lineTo(2, 15); context.lineTo(-3, 9); context.lineTo(-15, 5); context.lineTo(-11, 0); context.lineTo(-15, -5); context.lineTo(-3, -9); context.lineTo(2, -15); context.closePath();
        break;
      case "coiler":
        context.arc(0, 0, 14, 0, TAU);
        break;
      case "warden":
        context.moveTo(16, 0); context.lineTo(10, 13); context.lineTo(-8, 15); context.lineTo(-17, 8); context.lineTo(-17, -8); context.lineTo(-8, -15); context.lineTo(10, -13); context.closePath();
        break;
      default:
        context.moveTo(18, 0); context.lineTo(8, 12); context.lineTo(-7, 11); context.lineTo(-15, 5); context.lineTo(-12, 0); context.lineTo(-15, -5); context.lineTo(-7, -11); context.lineTo(8, -12); context.closePath();
        break;
    }
    context.fill();
    context.stroke();
    context.shadowBlur = 0;
    context.fillStyle = enemy.color;
    context.beginPath();
    if (enemy.archetype === "coiler") {
      context.lineWidth = 3;
      context.strokeStyle = enemy.color;
      context.arc(0, 0, 8, 0.25, TAU * 0.9);
      context.stroke();
    } else if (enemy.archetype === "warden") {
      context.strokeStyle = "#ffffff";
      context.lineWidth = 1.4;
      context.strokeRect(-10, -9, 18, 18);
      context.fillRect(8, -8, 5, 16);
    } else if (enemy.archetype === "cutter") {
      context.fillRect(-8, -2, 24, 4);
    } else if (enemy.archetype === "courier") {
      context.fillRect(-12, -6, 10, 12);
      context.fillStyle = "#ffffff";
      context.fillRect(-8, -5, 2, 10);
    } else {
      context.moveTo(enemy.archetype === "charger" ? 21 : 18, 0);
      context.lineTo(7, 6);
      context.lineTo(7, -6);
      context.closePath();
      context.fill();
    }
    context.fillStyle = "#f7f8f7";
    context.fillRect(2, -7, 5, 3);
    context.fillRect(2, 4, 5, 3);
    context.fillStyle = "#080a0b";
    context.fillRect(4, -7, 2, 3);
    context.fillRect(4, 4, 2, 3);
  }

  function enemySprite(kind, enemy) {
    const key = `${kind}:${enemy.archetype}:${enemy.color}`;
    let sprite = enemySpriteCache.get(key);
    if (sprite) return sprite;
    const size = kind === "head" ? 112 : 64;
    const renderScale = 2;
    const spriteCanvas = document.createElement("canvas");
    spriteCanvas.width = size * renderScale;
    spriteCanvas.height = size * renderScale;
    const spriteContext = spriteCanvas.getContext("2d");
    spriteContext.setTransform(renderScale, 0, 0, renderScale, size * renderScale / 2, size * renderScale / 2);
    if (kind === "head") paintEnemyHeadSprite(spriteContext, enemy, renderScale);
    else paintEnemySegmentSprite(spriteContext, enemy, renderScale);
    sprite = { canvas: spriteCanvas, size };
    enemySpriteCache.set(key, sprite);
    return sprite;
  }

  function corrosionParticleSprite(color, radius) {
    const key = `${color}:${radius}`;
    let sprite = corrosionParticleSpriteCache.get(key);
    if (sprite) return sprite;

    const renderScale = 2;
    const maximumParticleSize = 3.2 * ENEMY_STATUS_PARTICLE_SIZE_SCALE;
    const shadowBlur = 10 * ENEMY_STATUS_PARTICLE_GLOW_SCALE;
    const halfSize = Math.ceil(radius + maximumParticleSize + shadowBlur * 2 + 2);
    const size = halfSize * 2;
    const spriteCanvas = document.createElement("canvas");
    spriteCanvas.width = size * renderScale;
    spriteCanvas.height = size * renderScale;
    const spriteContext = spriteCanvas.getContext("2d");
    spriteContext.setTransform(renderScale, 0, 0, renderScale, halfSize * renderScale, halfSize * renderScale);
    spriteContext.globalCompositeOperation = "lighter";
    spriteContext.shadowColor = color;
    spriteContext.shadowBlur = shadowBlur * renderScale;
    spriteContext.fillStyle = "rgba(105,205,48,0.2)";
    spriteContext.beginPath();
    spriteContext.arc(0, 0, radius, 0, TAU);
    spriteContext.fill();
    for (let particleIndex = 0; particleIndex < ENEMY_STATUS_PARTICLE_DENSITY; particleIndex += 1) {
      const angle = particleIndex * TAU / ENEMY_STATUS_PARTICLE_DENSITY;
      const particleSize = (2.2 + particleIndex % 2) * ENEMY_STATUS_PARTICLE_SIZE_SCALE;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      spriteContext.fillStyle = "rgba(158,245,82,0.96)";
      spriteContext.beginPath();
      spriteContext.arc(x, y, particleSize, 0, TAU);
      spriteContext.fill();
      spriteContext.fillStyle = "rgba(214,255,133,0.7)";
      spriteContext.beginPath();
      spriteContext.arc(x - particleSize * 0.3, y - particleSize * 0.45, particleSize * 0.35, 0, TAU);
      spriteContext.fill();
    }
    sprite = { canvas: spriteCanvas, size };
    corrosionParticleSpriteCache.set(key, sprite);
    return sprite;
  }

  function warmEnemySpriteCache() {
    const variants = [];
    for (const archetype of ENEMY_ARCHETYPES) {
      for (const color of ENEMY_COLORS) {
        variants.push({ kind: "segment", archetype: archetype.id, color });
        variants.push({ kind: "head", archetype: archetype.id, color });
      }
    }
    let index = 0;
    const runBatch = (deadline = null) => {
      let generated = 0;
      while (index < variants.length && (generated < 2 || (deadline?.timeRemaining?.() || 0) > 3)) {
        const variant = variants[index++];
        enemySprite(variant.kind, variant);
        generated += 1;
      }
      if (index >= variants.length) return;
      if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(runBatch, { timeout: 500 });
      else window.setTimeout(runBatch, 0);
    };
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(runBatch, { timeout: 500 });
    else window.setTimeout(runBatch, 0);
  }

  function drawEnemySegment(segment, pieceScale, sprite) {
    ctx.save();
    ctx.translate(segment.x, segment.y);
    ctx.scale(pieceScale, pieceScale);
    ctx.rotate(segment.angle);
    ctx.drawImage(sprite.canvas, -sprite.size / 2, -sprite.size / 2, sprite.size, sprite.size);
    ctx.restore();
  }

  function drawEnemyHead(enemy, pieceScale, bodySprite = null) {
    const headSprite = enemySprite("head", enemy);
    const reform = enemy.headReform;
    const reformProgress = reform
      ? clamp((performance.now() - reform.startedAt) / (reform.duration * 1000), 0, 1)
      : 1;
    if (reform && reformProgress >= 1) delete enemy.headReform;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.scale(pieceScale, pieceScale);
    ctx.rotate(enemy.angle);
    if (reform && reformProgress < 1) {
      const eased = 1 - (1 - reformProgress) ** 3;
      const pulse = Math.sin(reformProgress * Math.PI);
      bodySprite ||= enemySprite("segment", enemy);
      ctx.save();
      ctx.globalAlpha = (1 - eased) * 0.92;
      ctx.scale(1 + pulse * 0.16, 1 + pulse * 0.16);
      ctx.drawImage(bodySprite.canvas, -bodySprite.size / 2, -bodySprite.size / 2, bodySprite.size, bodySprite.size);
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = eased;
      ctx.scale(0.48 + eased * 0.52, 0.48 + eased * 0.52);
      ctx.drawImage(headSprite.canvas, -headSprite.size / 2, -headSprite.size / 2, headSprite.size, headSprite.size);
      ctx.restore();

      ctx.globalAlpha = (1 - reformProgress) * 0.9;
      ctx.strokeStyle = "#ffffff";
      ctx.shadowColor = enemy.color;
      ctx.shadowBlur = 6;
      ctx.lineWidth = 1.4 * (1 - reformProgress) + 0.6;
      drawPolygonPath(0, 0, headSprite.size * (0.16 + pulse * 0.035), 6, reformProgress * Math.PI);
      ctx.stroke();
    } else {
      ctx.drawImage(headSprite.canvas, -headSprite.size / 2, -headSprite.size / 2, headSprite.size, headSprite.size);
    }
    ctx.restore();
  }

  function drawEnemyStatusParticles(enemy, pieceScale) {
    const frozen = enemy.frostStacks > 0;
    const corroded = enemy.corrosionStacks > 0;
    const burning = enemy.burnStacks > 0;
    if (!frozen && !corroded && !burning) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let index = 0; index <= enemy.segments.length; index += 1) {
      const node = index === 0 ? enemy : enemy.segments[index - 1];
      if (renderWorldBounds.active && !pointIntersectsRenderBounds(node.x, node.y, 30 * pieceScale)) continue;
      if (frozen) {
        const radius = (12 + (index % 3) * 2) * pieceScale;
        ctx.strokeStyle = "rgba(112,226,255,0.72)";
        ctx.shadowColor = MODULE_BY_ID.frost.color;
        ctx.shadowBlur = 8 * pieceScale * ENEMY_STATUS_PARTICLE_GLOW_SCALE;
        ctx.lineWidth = 1.4 * pieceScale * ENEMY_STATUS_PARTICLE_SIZE_SCALE;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius * 0.8, 0, TAU);
        ctx.stroke();
        for (let particleIndex = 0; particleIndex < ENEMY_STATUS_PARTICLE_DENSITY; particleIndex += 1) {
          const angle = gameTime * 2.1 + index * 2.399 + particleIndex * TAU / ENEMY_STATUS_PARTICLE_DENSITY;
          const size = 2.1 * pieceScale * ENEMY_STATUS_PARTICLE_SIZE_SCALE;
          ctx.save();
          ctx.translate(node.x + Math.cos(angle) * radius, node.y + Math.sin(angle) * radius);
          ctx.rotate(angle + Math.PI / 4);
          ctx.fillStyle = "rgba(150,238,255,0.96)";
          ctx.fillRect(-size, -size, size * 2, size * 2);
          ctx.restore();
        }
      }
      if (corroded) {
        const radius = 10 + (index % 4) * 1.5;
        const sprite = corrosionParticleSprite(enemy.corrosionColor || MODULE_BY_ID.venom.color, radius);
        ctx.save();
        ctx.translate(node.x, node.y);
        ctx.rotate(-gameTime * 1.7 + index * 1.618);
        ctx.scale(pieceScale, pieceScale);
        ctx.shadowBlur = 0;
        ctx.drawImage(sprite.canvas, -sprite.size / 2, -sprite.size / 2, sprite.size, sprite.size);
        ctx.restore();
      }
      if (burning) {
        const radius = (11 + index % 3) * pieceScale;
        const flicker = 0.72 + Math.sin(gameTime * 12 + index) * 0.12;
        ctx.fillStyle = `rgba(255,86,35,${flicker * 0.24})`;
        ctx.shadowColor = MODULE_BY_ID.incendiary.color;
        ctx.shadowBlur = 12 * pieceScale * ENEMY_STATUS_PARTICLE_GLOW_SCALE;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, TAU);
        ctx.fill();
        for (let particleIndex = 0; particleIndex < ENEMY_STATUS_PARTICLE_DENSITY; particleIndex += 1) {
          const phase = (gameTime * 2.1 + particleIndex / ENEMY_STATUS_PARTICLE_DENSITY + index * 0.17) % 1;
          const x = node.x + Math.sin(gameTime * 5 + index + particleIndex * 2.4) * radius * 0.62;
          const y = node.y + radius * 0.55 - phase * radius * 1.8;
          const size = (2.7 - phase) * pieceScale * ENEMY_STATUS_PARTICLE_SIZE_SCALE;
          ctx.fillStyle = phase > 0.55 ? "rgba(255,224,92,0.92)" : "rgba(255,91,40,0.98)";
          ctx.beginPath();
          ctx.moveTo(x, y - size * 1.5);
          ctx.lineTo(x + size, y + size);
          ctx.lineTo(x, y + size * 0.45);
          ctx.lineTo(x - size, y + size);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  function drawEnemy(enemy, time = gameTime, spawning = false) {
    const pieceScale = arenaPieceScale();
    if (renderWorldBounds.active && !snakeIntersectsRenderBounds(enemy, enemy.segments, 48 * pieceScale)) return;
    ctx.save();
    if (spawning) {
      const blink = 0.48 + Math.abs(Math.sin(time * 12)) * 0.52;
      ctx.globalAlpha *= 0.2 + blink * 0.48;
    }
    drawLinkedPath(enemy, enemy.segments, "rgba(4, 6, 7, 0.92)", (enemy.archetype === "warden" ? 14 : 11) * pieceScale);
    drawLinkedPath(enemy, enemy.segments, enemy.color, (enemy.archetype === "cutter" ? 3.4 : 2.2) * pieceScale, 0.72);
    const segmentSprite = enemy.segments.length > 0 ? enemySprite("segment", enemy) : null;
    for (let index = enemy.segments.length - 1; index >= 0; index -= 1) {
      const segment = enemy.segments[index];
      if (!renderWorldBounds.active || pointIntersectsRenderBounds(segment.x, segment.y, 22 * pieceScale)) drawEnemySegment(segment, pieceScale, segmentSprite);
    }
    const headVisible = !renderWorldBounds.active || pointIntersectsRenderBounds(enemy.x, enemy.y, 42 * pieceScale);
    if (headVisible) drawEnemyHead(enemy, pieceScale, segmentSprite);
    if (!spawning) drawEnemyStatusParticles(enemy, pieceScale);

    if (!spawning && enemy.captured > 0 && headVisible) {
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
    ctx.restore();
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
      roundedRectPath(-size * 0.72, -size * 0.38, size * 1.44, size * 0.76, size * 0.35);
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
    const label = `${target.ghost ? "幽灵 · " : ""}@${target.playerId || target.name || "PLAYER"}`;
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

  function drawGhostBeacon(target, pieceScale) {
    const phase = performance.now() / 1000 * TAU * MULTIPLAYER_GHOST_PULSE_RATE;
    const pulse = (Math.sin(phase) + 1) * 0.5;
    const radius = (target.radius || playerHeadRadiusPixels()) * (0.92 + MULTIPLAYER_GHOST_PULSE_STRENGTH * pulse);
    ctx.save();
    ctx.translate(target.x, target.y);
    ctx.rotate(phase * 0.35);
    ctx.globalAlpha = clamp(MULTIPLAYER_GHOST_OPACITY + MULTIPLAYER_GHOST_PULSE_STRENGTH * 2, 0.2, 0.95);
    ctx.strokeStyle = "#bcefff";
    ctx.shadowColor = "#74e8ff";
    ctx.shadowBlur = radius * 0.55;
    ctx.lineWidth = Math.max(1.2, pieceScale * 1.6);
    for (let index = 0; index < 4; index += 1) {
      const start = index * TAU / 4 - 0.23;
      ctx.beginPath();
      ctx.arc(0, 0, radius, start, start + 0.46);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPlayer(target = player) {
    if (!target) return;
    const previousPlayer = player;
    const previousGrowth = activeGrowth;
    player = target;
    activeGrowth = target.growth || (target === previousPlayer ? previousGrowth : null);
    const pieceScale = arenaPieceScale();
    const repulseRange = repulseRangePixels();
    const bodyVisible = !renderWorldBounds.active
      || snakeIntersectsRenderBounds(player, player.segments, 36 * pieceScale);
    const repulseVisible = repulseRange > 0
      && (!renderWorldBounds.active || pointIntersectsRenderBounds(player.x, player.y, repulseRange + 4));
    if (!bodyVisible && !repulseVisible) {
      player = previousPlayer;
      activeGrowth = previousGrowth;
      return;
    }
    ctx.save();
    const ghostVisual = Boolean(player.ghost);
    const protectedVisual = player.protectedState || player.invulnerable > 0;
    const damageVisual = Number.isFinite(player.damageFlashUntil) && performance.now() < player.damageFlashUntil;
    if (ghostVisual) {
      const ghostPhase = performance.now() / 1000 * TAU * MULTIPLAYER_GHOST_PULSE_RATE;
      ctx.globalAlpha = clamp(
        MULTIPLAYER_GHOST_OPACITY + Math.sin(ghostPhase) * MULTIPLAYER_GHOST_PULSE_STRENGTH,
        0.05,
        0.95
      );
      ctx.globalCompositeOperation = "screen";
      ctx.filter = `grayscale(0.78) brightness(1.7) drop-shadow(0 0 ${Math.max(5, (player.radius || playerHeadRadiusPixels()) * 0.7)}px rgba(116,232,255,0.9))`;
    } else if (protectedVisual) ctx.globalAlpha = 0.48 + Math.sin(gameTime * 28) * 0.28;
    else if (damageVisual) ctx.globalAlpha = 0.58 + Math.abs(Math.sin(performance.now() * 0.035)) * 0.42;
    if (repulseVisible) {
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
      const module = segment.module ? MODULE_BY_ID[segment.module] : null;
      const experience = segment.neutral ? MODULE_PROGRESSION.experienceTier(segment.experienceTier || 0) : null;
      const color = module?.color || experience?.color || (segment.tailGuard ? "#f4f7f7" : "rgba(116, 124, 127, 0.72)");
      drawLink(previous, segment, "rgba(5, 7, 8, 0.9)", (module ? 10 : 9) * pieceScale, 0.82);
      drawLink(previous, segment, color, 2.1 * pieceScale, 0.78);
      previous = segment;
    }

    for (let index = player.segments.length - 1; index >= 0; index -= 1) {
      const segment = player.segments[index];
      if (!renderWorldBounds.active || pointIntersectsRenderBounds(segment.x, segment.y, 28 * pieceScale)) {
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

        const module = segment.module ? MODULE_BY_ID[segment.module] : null;
        if (module) {
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

        const moduleLevel = Math.max(1, segment.moduleLevel || 1);
        if (moduleLevel > 1) {
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#f3c600";
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 0.8;
          ctx.fillRect(4, -13, 11, 9);
          ctx.strokeRect(4, -13, 11, 9);
          ctx.fillStyle = "#111518";
          ctx.font = "900 7px Bahnschrift, Arial Narrow, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(moduleLevel), 9.5, -8.5);
        }

        if (segment.module === "phase" && !segment.ready) {
          const total = activeModuleCooldown(
            segment.module,
            segment.moduleLevel,
            MODULE_EFFECTS.armorCooldownRateBonus(moduleCount("armor"))
          );
          const progress = 1 - clamp(segment.cooldown / total, 0, 1);
          ctx.shadowBlur = 0;
          ctx.strokeStyle = "rgba(255,255,255,0.65)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 14.5, -Math.PI / 2, -Math.PI / 2 + TAU * progress);
          ctx.stroke();
        }
        } else if (segment.neutral) {
        const experience = MODULE_PROGRESSION.experienceTier(segment.experienceTier || 0);
        const experienceBaseAlpha = ctx.globalAlpha;
        ctx.shadowColor = experience.color;
        ctx.shadowBlur = segment.experienceTier > 0 ? 13 : 5;
        ctx.fillStyle = experience.color;
        ctx.globalAlpha = experienceBaseAlpha * (segment.experienceTier > 0 ? 0.92 : 0.78);
        ctx.strokeStyle = experience.accent;
        ctx.lineWidth = segment.experienceTier >= 2 ? 2.2 : 1.2;
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
        ctx.globalAlpha = experienceBaseAlpha;
        ctx.shadowBlur = 0;
        ctx.fillStyle = segment.experienceTier >= 2 ? "#4e3f00" : "rgba(32, 37, 39, 0.76)";
        if ((segment.experienceTier || 0) === 0) {
          ctx.fillRect(-5, -1.5, 10, 3);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, segment.experienceTier >= 2 ? 4.2 : 3.6, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = experience.accent;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        } else {
        ctx.fillStyle = segment.tailGuard ? "#f4f7f7" : "#343b3e";
        ctx.strokeStyle = segment.tailGuard ? "#ffffff" : "#a9afb1";
        ctx.lineWidth = 1.2;
        ctx.fillRect(-8, -7, 16, 14);
        ctx.strokeRect(-8, -7, 16, 14);
        }
        ctx.restore();
      }

    }

    const headVisible = !renderWorldBounds.active || pointIntersectsRenderBounds(player.x, player.y, 44 * pieceScale);
    if (headVisible) {
      ctx.save();
      ctx.translate(player.x, player.y);
      const headGrowthPulse = growthPulseForNode(0);
      const headScale = 1 + headGrowthPulse * 0.44;
      ctx.scale(pieceScale * headScale, pieceScale * headScale);
      ctx.rotate(player.angle);
      ctx.shadowColor = damageVisual ? "#ff355e" : (headGrowthPulse > 0 ? activeGrowth.color : (player.playerColor || "rgba(243,198,0,0.7)"));
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
      if ((player.shieldCharges || 0) > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = 0.52;
        ctx.fillStyle = MODULE_BY_ID.shield.color;
        ctx.shadowColor = MODULE_BY_ID.shield.color;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.restore();
      }
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
    }
    ctx.restore();
    if (ghostVisual && headVisible) drawGhostBeacon(player, pieceScale);
    if (network.enabled && (!renderWorldBounds.active || pointIntersectsRenderBounds(player.x, player.y, 100 * pieceScale))) drawPlayerIdLabel(player, pieceScale);
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
      const mineRadius = hazard.kind === "mine" ? mineVisualRadius(hazard) : 0;
      const corrosionRadius = hazard.kind === "corrosion" ? hazard.radius : 0;
      const renderRadius = hazard.kind === "gravity" ? hazard.radius + 20 : hazard.kind === "corrosion" ? corrosionRadius * 2.2 : mineRadius * 2;
      if (renderWorldBounds.active && !pointIntersectsRenderBounds(hazard.x, hazard.y, renderRadius)) continue;
      const pulse = 1 + Math.sin(time * 8 + hazard.phase) * 0.12;
      ctx.save();
      ctx.translate(hazard.x, hazard.y);

      if (hazard.kind === "corrosion") {
        const pulse = 1 + Math.sin(time * 5.5 + hazard.phase) * 0.08;
        ctx.globalAlpha = 0.2 + Math.sin(time * 3.2 + hazard.phase) * 0.035;
        ctx.fillStyle = hazard.color;
        ctx.shadowColor = hazard.color;
        ctx.shadowBlur = corrosionRadius * 0.9;
        ctx.beginPath();
        ctx.arc(0, 0, corrosionRadius * 1.12 * pulse, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.72;
        ctx.strokeStyle = "#caff8b";
        ctx.lineWidth = Math.max(1.2, corrosionRadius * 0.12);
        ctx.beginPath();
        ctx.arc(0, 0, corrosionRadius * 0.92 * pulse, 0, TAU);
        ctx.stroke();
        for (let bubble = 0; bubble < 3; bubble += 1) {
          const angle = time * (0.7 + bubble * 0.18) + hazard.phase + bubble * 2.1;
          const distance = corrosionRadius * (0.35 + bubble * 0.18);
          const bubbleRadius = Math.max(1.4, corrosionRadius * (0.1 - bubble * 0.015));
          ctx.fillStyle = bubble === 0 ? "#e6ff9b" : "#9bea5d";
          ctx.beginPath();
          ctx.arc(Math.cos(angle) * distance, Math.sin(angle) * distance, bubbleRadius, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
        continue;
      }

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
      ctx.globalAlpha = hazard.arm > 0 ? 0.62 : 0.94;
      ctx.shadowColor = hazard.color;
      ctx.shadowBlur = mineRadius * 0.8;
      ctx.fillStyle = "#111518";
      ctx.strokeStyle = hazard.color;
      ctx.lineWidth = Math.max(2, mineRadius * 0.15);
      ctx.beginPath();
      ctx.arc(0, 0, mineRadius, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "#f3c600";
      const crossLength = mineRadius * 1.18;
      const crossWidth = Math.max(2, mineRadius * 0.18);
      ctx.fillRect(-crossLength / 2, -crossWidth / 2, crossLength, crossWidth);
      ctx.fillRect(-crossWidth / 2, -crossLength / 2, crossWidth, crossLength);
      ctx.restore();
    }
  }

  function drawProjectiles() {
    for (const projectile of projectiles) {
      if (renderWorldBounds.active && !pointIntersectsRenderBounds(projectile.x, projectile.y, 36 + projectile.size * 3)) continue;
      if (projectile.kind === "blade") {
        const bladeScale = projectile.size / 10;
        ctx.save();
        ctx.translate(projectile.x, projectile.y);
        ctx.scale(bladeScale, bladeScale);
        ctx.rotate((projectile.orbitAngle || 0) * 2);
        ctx.shadowColor = projectile.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = projectile.color;
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(3.6, 4.2);
        ctx.lineTo(-1.4, 1.5);
        ctx.lineTo(-10, 0);
        ctx.lineTo(-3.6, -4.2);
        ctx.lineTo(1.4, -1.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        continue;
      }
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

  function effectIntersectsRenderBounds(effect) {
    if (!renderWorldBounds.active) return true;
    if (effect.type === "beam" || effect.type === "lightning") {
      return lineIntersectsRenderBounds(effect, { x: effect.x2, y: effect.y2 }, (effect.width || 4) + 12);
    }
    if (effect.type === "ring") {
      return pointIntersectsRenderBounds(effect.x, effect.y, Math.max(effect.radius || 0, effect.endRadius || 0) + 8);
    }
    if (effect.type === "text") {
      return pointIntersectsRenderBounds(effect.x, effect.y, COMBAT_TEXT_FONT_SIZE * 4);
    }
    if (effect.type === "experienceCompress") {
      if (pointIntersectsRenderBounds(effect.x, effect.y, effect.toTier >= 2 ? 66 : 46)) return true;
      for (const source of effect.sources) {
        if (lineIntersectsRenderBounds(source, effect, 12)) return true;
      }
      return false;
    }
    return pointIntersectsRenderBounds(effect.x, effect.y, Math.max(effect.radius || 0, effect.endRadius || 0) + 32);
  }

  function drawEffects() {
    for (const particle of particles) {
      if (renderWorldBounds.active && !pointIntersectsRenderBounds(particle.x, particle.y, particle.size + 2)) continue;
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;

    for (const effect of effects) {
      if ((effect.delay || 0) > 0) continue;
      if (renderWorldBounds.active && !effectIntersectsRenderBounds(effect)) continue;
      const progress = 1 - effect.life / effect.maxLife;
      const alpha = clamp(effect.life / effect.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      if (effect.type === "experienceCompress") {
        const eased = 1 - Math.pow(1 - progress, 3);
        const sourceTier = MODULE_PROGRESSION.experienceTier(effect.fromTier);
        for (const source of effect.sources) {
          const x = source.x + (effect.x - source.x) * eased;
          const y = source.y + (effect.y - source.y) * eased;
          if (renderWorldBounds.active && !pointIntersectsRenderBounds(x, y, 16)) continue;
          ctx.fillStyle = progress < 0.58 ? sourceTier.color : effect.color;
          ctx.shadowColor = effect.color;
          ctx.shadowBlur = 8 + progress * 12;
          drawPolygonPath(x, y, Math.max(1.5, 5.5 * (1 - progress)), 6, progress * 0.8);
          ctx.fill();
        }
        ctx.globalAlpha = alpha * (0.72 + Math.sin(progress * Math.PI) * 0.28);
        ctx.strokeStyle = effect.accent;
        ctx.shadowColor = effect.color;
        ctx.shadowBlur = 15;
        ctx.lineWidth = 3 * (1 - progress) + 0.8;
        drawPolygonPath(effect.x, effect.y, 8 + progress * (effect.toTier >= 2 ? 58 : 38), 8, Math.PI / 8 + progress * 0.4);
        ctx.stroke();
      } else if (effect.type === "ring") {
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
        ctx.lineWidth = effect.damageNumber ? 10 : effect.emphasis ? 4 : 3;
        ctx.lineJoin = "round";
        ctx.font = `900 ${COMBAT_TEXT_FONT_SIZE}px Bahnschrift, Arial Narrow, sans-serif`;
        ctx.textAlign = "center";
        const textY = effect.y - progress * (effect.damageNumber ? 42 : effect.emphasis ? 32 : 24);
        ctx.strokeText(effect.text, effect.x, textY);
        ctx.fillText(effect.text, effect.x, textY);
      }
      ctx.restore();
    }
  }

  function drawOffscreenIndicators(time) {
    if (!renderWorldBounds.active) return;
    const inset = 13;
    const viewport = cameraViewportBounds();
    const left = viewport.left + inset;
    const right = viewport.right - inset;
    const top = viewport.top + inset;
    const bottom = viewport.bottom - inset;

    function marker(x, y, color, kind) {
      const screen = worldToScreen(x, y);
      if (screen.x >= left && screen.x <= right && screen.y >= top && screen.y <= bottom) return;
      const dx = screen.x - viewport.centerX;
      const dy = screen.y - viewport.centerY;
      const scale = Math.min(
        Math.abs(dx) > 0.001 ? (viewport.width / 2 - inset) / Math.abs(dx) : Infinity,
        Math.abs(dy) > 0.001 ? (viewport.height / 2 - inset) / Math.abs(dy) : Infinity
      );
      const markerX = viewport.centerX + dx * scale;
      const markerY = viewport.centerY + dy * scale;
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
    applyCameraViewportClip();
    for (const food of foodIndicatorCandidates) marker(food.x, food.y, food.color, "food");
    for (const enemy of enemyIndicatorCandidates) marker(enemy.x, enemy.y, enemy.color, "enemy");
    for (const spawn of pendingEnemySpawns) {
      const point = cellCenter(spawn.headCell.col, spawn.headCell.row);
      marker(point.x, point.y, "#ff3d5d", "warning");
    }
    ctx.restore();
  }

  function render(now) {
    const visualTime = now / 1000;
    updateRenderWorldBounds();
    resetOffscreenIndicatorCandidates();
    drawBackground(visualTime);
    ctx.save();
    applyArenaPerspectiveTransform();
    applyCameraViewportClip();
    if (shake > 0) ctx.translate(random(-shake, shake), random(-shake, shake));
    applyCameraTransform();
    drawFood(visualTime);
    drawEnemySpawnWarnings(visualTime);
    drawHazards(visualTime);
    for (const enemy of enemies) {
      if (renderWorldBounds.active && !enemy.dead) {
        trackNearestOffscreenIndicator(
          enemy,
          enemyIndicatorCandidates,
          enemyIndicatorDistances,
          CAMERA_FOLLOW_ENEMY_INDICATOR_LIMIT
        );
      }
      drawEnemy(enemy);
    }
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

  function resetFpsMeasurement(now) {
    fpsWindowStartedAt = now;
    fpsFrameCount = 0;
    fastestFrameIntervals.length = 0;
    lowFpsWindows = 0;
  }

  function resetFrameTiming(now = performance.now()) {
    lastFrame = now;
    lastCanvasRender = 0;
    nextCanvasRenderAt = now;
    pendingUiMotionDt = 0;
    resetFpsMeasurement(now);
  }

  function enterRunningState(now = performance.now()) {
    state = "running";
    resetFrameTiming(now);
  }

  function recoverFrameLoop(error, now) {
    const firstFailure = consecutiveFrameErrors === 0;
    consecutiveFrameErrors += 1;
    if (now - lastFrameErrorLogAt >= FRAME_ERROR_LOG_INTERVAL_MS) {
      lastFrameErrorLogAt = now;
      console.error(`PROJECT GSS0 帧循环异常（连续 ${consecutiveFrameErrors} 帧），已尝试自动恢复`, error);
    }
    if (!firstFailure) return;
    resetFrameTiming(now);
    try {
      resize();
    } catch (resizeError) {
      console.error("PROJECT GSS0 Canvas 状态重建失败", resizeError);
    }
    if (network.enabled) requestNetworkSnapshotResync(now);
  }

  function updateFpsMeter(now, frameInterval) {
    if (state !== "running" || document.hidden || frameInterval <= 0) {
      resetFpsMeasurement(now);
      return;
    }
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
    requestAnimationFrame(frame);
    try {
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
        const renderedFrameInterval = lastCanvasRender > 0 ? now - lastCanvasRender : 0;
        updateUIMotion(pendingUiMotionDt);
        pendingUiMotionDt = 0;
        render(now);
        lastCanvasRender = now;
        updateFpsMeter(now, renderedFrameInterval);
        do nextCanvasRenderAt += renderInterval;
        while (nextCanvasRenderAt <= now - renderInterval);
      }
      consecutiveFrameErrors = 0;
    } catch (error) {
      recoverFrameLoop(error, now);
    }
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

  canvas.addEventListener("wheel", (event) => {
    if (cameraMode !== "follow" || state === "menu" || event.deltaY === 0) return;
    event.preventDefault();
    const zoomFactor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    applyFollowCameraZoom(followCameraZoom * zoomFactor);
  }, { passive: false });

  function endPointer(event) {
    if (event.pointerType === "touch" && pointer.touchId === event.pointerId) {
      pointer.active = false;
      pointer.touchId = null;
      ui.touch.classList.remove("is-visible");
    }
  }

  function isTextEntryTarget(target) {
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
    if (target instanceof HTMLInputElement) {
      return !["button", "checkbox", "radio", "range", "reset", "submit"].includes(target.type);
    }
    return target instanceof HTMLElement && target.isContentEditable;
  }

  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  window.addEventListener("pointermove", updateUIMotionTarget, { passive: true });
  window.addEventListener("pointerout", (event) => {
    if (!event.relatedTarget) resetUIMotionTarget();
  }, { passive: true });

  window.addEventListener("keydown", (event) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
    if (event.code === "KeyA" && !event.altKey && !event.ctrlKey && !event.metaKey && !isTextEntryTarget(event.target)) {
      event.preventDefault();
      if (event.repeat) return;
      keys.delete("KeyA");
      ensureAudio();
      setAutomaticMode(!automaticModeEnabled);
      sound("ui");
      return;
    }
    if (event.code === "Escape" && closeSettingPopovers()) {
      event.preventDefault();
      return;
    }
    if (event.code === "Escape" && ui.codex.classList.contains("is-visible")) {
      event.preventDefault();
      closeCodex();
      return;
    }
    if (event.code === "Escape" && ui.enemyCodex.classList.contains("is-visible")) {
      event.preventDefault();
      closeEnemyCodex();
      return;
    }
    if (event.code === "Escape" && ui.changelog.classList.contains("is-visible")) {
      event.preventDefault();
      closeChangelog();
      return;
    }
    keys.add(event.code);
    if (player && state === "running" && !automaticModeEnabled) {
      const tapDirections = {
        ArrowLeft: Math.PI,
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
    if (event.code === "Enter" && !ui.codex.classList.contains("is-visible") && !ui.enemyCodex.classList.contains("is-visible") && !ui.changelog.classList.contains("is-visible") && (state === "menu" || state === "gameover")) {
      if (state === "menu") startPureLocalGame();
      else startGame();
    }
  });

  window.addEventListener("keyup", (event) => keys.delete(event.code));
  window.addEventListener("blur", () => {
    keys.clear();
    resetUIMotionTarget();
    if (backgroundPauseEnabled && state === "running") setPaused(true);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && backgroundPauseEnabled && state === "running") setPaused(true);
  });
  window.addEventListener("resize", resize);

  ui.multiplayerModeButton.addEventListener("click", openP2PLobby);
  ui.localModeButton.addEventListener("click", startPureLocalGame);
  ui.p2pLobbyClose.addEventListener("click", closeP2PLobby);
  ui.p2pRoomRefresh.addEventListener("click", () => {
    ensureAudio();
    void network.p2pClient?.refreshRooms();
    sound("ui");
  });
  ui.p2pCreateForm.addEventListener("submit", (event) => {
    event.preventDefault();
    ensureAudio();
    void createP2PRoom();
  });
  ui.p2pJoinForm.addEventListener("submit", (event) => {
    event.preventDefault();
    ensureAudio();
    const code = ui.p2pJoinCode.value.trim().toUpperCase();
    if (!code) {
      ui.p2pLobbyStatus.textContent = "请输入房间码";
      return;
    }
    void joinP2PRoom({ code });
  });
  ui.p2pRoomReady.addEventListener("click", () => {
    const member = network.room?.members.find((item) => item.peerId === network.p2pClient?.peerId);
    if (!member || network.p2pClient?.isHost) return;
    ensureAudio();
    void network.p2pClient?.setReady(!member.ready);
    sound("ui");
  });
  ui.p2pHostDifficulty.addEventListener("change", updateP2PRoomConfig);
  ui.p2pHostJoinProgress.addEventListener("change", updateP2PRoomConfig);
  ui.p2pRoomStart.addEventListener("click", () => {
    if (!network.p2pClient?.isHost) return;
    ensureAudio();
    ui.p2pLobbyStatus.textContent = "正在启动房间…";
    void network.p2pClient.startRoom().then((result) => {
      if (!result?.ok) ui.p2pLobbyStatus.textContent = result?.error || "房间暂时无法开始";
    });
    sound("ui");
  });
  ui.p2pRoomLeave.addEventListener("click", () => {
    ensureAudio();
    void leaveP2PRoom();
    sound("ui");
  });
  ui.p2pRoomCopy.addEventListener("click", () => {
    void copyP2PRoomCode();
  });
  ui.lobbyButton.addEventListener("click", () => void returnToLobby());
  ui.codexButton.addEventListener("click", openCodex);
  ui.codexCloseButton.addEventListener("click", closeCodex);
  for (const button of ui.codexCategoryButtons) {
    button.addEventListener("click", () => {
      if (button.dataset.category === moduleCodexCategory) return;
      moduleCodexCategory = button.dataset.category;
      renderModuleCodex();
      ui.codex.scrollTop = 0;
      sound("ui");
    });
  }
  ui.enemyCodexButton.addEventListener("click", openEnemyCodex);
  ui.enemyCodexCloseButton.addEventListener("click", closeEnemyCodex);
  ui.changelogButton.addEventListener("click", openChangelog);
  ui.changelogCloseButton.addEventListener("click", closeChangelog);
  ui.restartButton.addEventListener("click", startGame);
  ui.gameOverMenuButton.addEventListener("click", returnToMenu);
  ui.pauseRestart.addEventListener("click", startGame);
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

  ui.screenShakeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    ensureAudio();
    const control = ui.screenShakeButton.closest(".setting-control");
    const open = !control.classList.contains("is-open");
    closeSettingPopovers(control);
    setSettingPopover(ui.screenShakeButton, ui.screenShakePopover, open);
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

  ui.cameraButton.addEventListener("click", (event) => {
    event.stopPropagation();
    ensureAudio();
    const control = ui.cameraButton.closest(".setting-control");
    const open = !control.classList.contains("is-open");
    closeSettingPopovers(control);
    setSettingPopover(ui.cameraButton, ui.cameraPopover, open);
    sound("ui");
  });

  const automaticModeControl = ui.automaticModeButton.closest(".setting-control");
  automaticModeControl.addEventListener("mouseenter", () => {
    if (!uiMotionMedia.matches) return;
    closeSettingPopovers(automaticModeControl);
    setSettingPopover(ui.automaticModeButton, ui.automaticModePopover, true);
  });
  automaticModeControl.addEventListener("mouseleave", () => {
    if (uiMotionMedia.matches) setSettingPopover(ui.automaticModeButton, ui.automaticModePopover, false);
  });
  ui.automaticModeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    ensureAudio();
    const open = uiMotionMedia.matches || !automaticModeControl.classList.contains("is-open");
    closeSettingPopovers(automaticModeControl);
    setSettingPopover(ui.automaticModeButton, ui.automaticModePopover, open);
    sound("ui");
  });

  ui.fontPopover.addEventListener("click", (event) => event.stopPropagation());
  ui.soundPopover.addEventListener("click", (event) => event.stopPropagation());
  ui.motionPopover.addEventListener("click", (event) => event.stopPropagation());
  ui.cameraPopover.addEventListener("click", (event) => event.stopPropagation());
  ui.screenShakePopover.addEventListener("click", (event) => event.stopPropagation());
  ui.backgroundPausePopover.addEventListener("click", (event) => event.stopPropagation());
  ui.automaticModePopover.addEventListener("click", (event) => event.stopPropagation());
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
  ui.screenShakeToggle.addEventListener("change", () => {
    ensureAudio();
    applyScreenShake(ui.screenShakeToggle.checked);
    sound("ui");
  });
  ui.backgroundPauseToggle.addEventListener("change", () => {
    ensureAudio();
    applyBackgroundPause(ui.backgroundPauseToggle.checked);
    sound("ui");
  });
  ui.cameraModeFixed.addEventListener("change", () => {
    if (!ui.cameraModeFixed.checked) return;
    ensureAudio();
    applyCameraMode("fixed");
    sound("ui");
  });
  ui.cameraModeFollow.addEventListener("change", () => {
    if (!ui.cameraModeFollow.checked) return;
    ensureAudio();
    applyCameraMode("follow");
    sound("ui");
  });
  ui.automaticModeToggle.addEventListener("change", () => {
    ensureAudio();
    setAutomaticMode(ui.automaticModeToggle.checked);
    sound("ui");
  });
  ui.automaticModuleSelectionToggle.addEventListener("change", () => {
    ensureAudio();
    setAutomaticModuleSelection(ui.automaticModuleSelectionToggle.checked);
    sound("ui");
  });
  ui.automaticRestartToggle.addEventListener("change", () => {
    ensureAudio();
    setAutomaticRestart(ui.automaticRestartToggle.checked);
    sound("ui");
  });
  document.addEventListener("contextmenu", (event) => event.preventDefault());
  document.addEventListener("click", () => closeSettingPopovers());

  applyFontScale(fontScale, false);
  applySoundVolume(soundVolume, false);
  applyUIMotionStrength(uiMotionStrength, false);
  applyFollowCameraZoom(followCameraZoom, false);
  applyCameraMode(cameraMode, false);
  applyScreenShake(screenShakeEnabled, false);
  applyBackgroundPause(backgroundPauseEnabled, false);
  applyAutomaticModuleSelection(automaticModuleSelectionEnabled, false);
  applyAutomaticRestart(automaticRestartEnabled, false);
  setAutomaticMode(automaticModeEnabled, false, false);
  setNetworkButtonsDisabled(false);
  ui.best.textContent = Math.floor(bestScore).toLocaleString("zh-CN");
  resize();
  resetGame();
  state = "menu";
  warmEnemySpriteCache();
  void bootstrapNetwork();
  requestAnimationFrame(frame);
})();
