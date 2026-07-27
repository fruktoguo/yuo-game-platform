/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/Ticker
 */
define("game/Ticker", ["../base/Benchmarker"], function(e) {
  var t = function(t2, n) {
    this.game = t2, this.confirmedTimestamp = n, this.ticks = 0, this.bonusTicks = 0, this.timeTravelTickets = 1, this.focused = true, this.isPlaying = false, this.isFastActive = false, this.interval = null, this.noOfTicks = 0, this.purchaseBonusTicks = 0, this.lastSaveTimestamp = null, this.benchmarker = new e(this.game.getMeta().id), this.backgroundModeTimeout = null, this.actualTicksPerSec = { ticks: 0, second: 0, actual: 0 };
  };
  return t.prototype.init = function() {
    return this.start(), this.game.getEventManager().addListener("Ticker", GameEvent.FOCUS, function() {
      this.disableBackgroundMode();
    }.bind(this)), this.game.getEventManager().addListener("Ticker", GameEvent.BLUR, function() {
      this.startBackgroundModeTimer();
    }.bind(this)), this.game.getEventManager().addListener("Ticker", GameEvent.RESEARCH_BOUGHT, function() {
      this.updateInterval();
    }.bind(this)), logger.info("Ticker", "Ticker initialized for game " + this.game.getMeta().id), this.benchmarker.init(), this;
  }, t.prototype.startBackgroundModeTimer = function() {
    this.backgroundModeTimeout && (clearTimeout(this.backgroundModeTimeout), this.backgroundModeTimeout = null), this.backgroundModeTimeout = setTimeout(function() {
      var e2 = 0 != this.focused;
      this.focused = false, e2 && this.updateInterval(), this.game.getEventManager().invokeEvent(GameEvent.BACKGROUND_MODE_ACTIVATED);
    }.bind(this), 15e3);
  }, t.prototype.disableBackgroundMode = function() {
    this.backgroundModeTimeout && (clearTimeout(this.backgroundModeTimeout), this.backgroundModeTimeout = null);
    var e2 = 1 != this.focused;
    this.focused = true, e2 && this.updateInterval(), this.game.getEventManager().invokeEvent(GameEvent.BACKGROUND_MODE_DISABLED);
  }, t.prototype.destroy = function() {
    this.stop(), this.game.getEventManager().removeListenerForType("Ticker"), this.benchmarker.destroy();
  }, t.prototype.getBonusTicks = function() {
    return this.bonusTicks;
  }, t.prototype.addBonusTicks = function(e2) {
    this.bonusTicks = Math.round(this.bonusTicks + e2), this.game.getEventManager().invokeEvent(GameEvent.BONUS_TICKS_UPDATED);
  }, t.prototype.setBonusTicks = function(e2) {
    this.bonusTicks = e2, this.game.getEventManager().invokeEvent(GameEvent.BONUS_TICKS_UPDATED);
  }, t.prototype.setPurchaseBonusTicks = function(e2) {
    this.purchaseBonusTicks = e2, this.updateInterval();
  }, t.prototype.getTimeTravelTickets = function() {
    return this.timeTravelTickets;
  }, t.prototype.addTimeTravelTickets = function(e2) {
    this.timeTravelTickets = Math.round(this.timeTravelTickets + e2), this.game.getEventManager().invokeEvent(GameEvent.TIME_TRAVEL_TICKETS_UPDATED);
  }, t.prototype.setTimeTravelTickets = function(e2) {
    this.timeTravelTickets = e2, this.game.getEventManager().invokeEvent(GameEvent.TIME_TRAVEL_TICKETS_UPDATED);
  }, t.prototype.getLastSaveTimestamp = function() {
    return this.lastSaveTimestamp;
  }, t.prototype.getIsPlaying = function() {
    return this.isPlaying;
  }, t.prototype.getIsFastActive = function() {
    return this.isFastActive;
  }, t.prototype.getIsFocused = function() {
    return this.focused;
  }, t.prototype.getNoOfTicks = function() {
    return this.noOfTicks;
  }, t.prototype.addNoOfTicks = function(e2) {
    this.noOfTicks += e2;
  }, t.prototype.getNormalTicksPerSec = function() {
    return 4 + this.game.getResearchManager().getResearch("chronometer") + this.purchaseBonusTicks;
  }, t.prototype.getTicksPerSec = function() {
    var e2 = this.getNormalTicksPerSec();
    return this.isFastActive && (e2 = 200), e2;
  }, t.prototype.getActualTicksPerSec = function() {
    return this.actualTicksPerSec.actual;
  }, t.prototype.getTickData = function() {
    var e2 = 1, t2 = this.getTicksPerSec();
    return this.focused || (e2 = t2, t2 = 1), { runs: e2, ticksPerSec: t2 };
  }, t.prototype.updateInterval = function() {
    if (this.interval && (clearInterval(this.interval), this.interval = null), this.isPlaying) {
      var e2 = this.getTickData();
      this.interval = setInterval(function() {
        this.benchmarker.start();
        for (var t2 = 0; t2 < e2.runs; t2++) this.tick();
        this.benchmarker.stop(e2.runs);
      }.bind(this), Math.round(1e3 / e2.ticksPerSec)), this.game.getEventManager().invokeEvent(GameEvent.TICKS_STARTED);
    }
  }, t.prototype.start = function() {
    this.isPlaying = true, this.updateInterval();
  }, t.prototype.stop = function() {
    this.isPlaying = false, this.isFastActive = false, this.interval && (clearInterval(this.interval), this.interval = null), this.game.getEventManager().invokeEvent(GameEvent.TICKS_STOPPED);
  }, t.prototype.startFast = function() {
    this.bonusTicks > 0 && (this.isPlaying = true, this.isFastActive = true, this.updateInterval());
  }, t.prototype.stopFast = function() {
    this.isFastActive = false, this.updateInterval();
  }, t.prototype.calculateOfflineGains = function() {
    var e2 = this.game.getMeta();
    if (!this.lastSaveTimestamp || !e2.maxBonusTicks) return 0;
    var t2 = (this.confirmedTimestamp.getConfirmedNow() - this.lastSaveTimestamp) * this.getNormalTicksPerSec(), n = Math.round(t2 / e2.offlineSlower), i = e2.maxBonusTicks * this.getNormalTicksPerSec();
    return n > i && (n = i), n < e2.minBonusTicks && (n = 0), n;
  }, t.prototype.addOfflineGains = function() {
    var e2 = this.calculateOfflineGains();
    logger.info("Ticker", "Bonus ticks gained: " + e2), this.addBonusTicks(e2);
  }, t.prototype.tick = function() {
    var e2 = this.game.getCalculator().calculate();
    this.game.getEventManager().invokeEvent(GameEvent.GAME_TICK, e2), this.noOfTicks++, this.noOfTicks % 5 == 0 && this.game.getAchievementsManager().testAll(), this.isFastActive && (this.addBonusTicks(-1), this.bonusTicks <= 0 && (this.isFastActive = false, this.updateInterval()));
    var t2 = Math.round(Date.now() / 1e3);
    this.actualTicksPerSec.ticks++, t2 != this.actualTicksPerSec.second && (this.actualTicksPerSec.actual = this.actualTicksPerSec.ticks, this.actualTicksPerSec.ticks = 0, this.actualTicksPerSec.second = t2);
  }, t.prototype.exportToWriter = function() {
    var e2 = new BinaryArrayWriter();
    return e2.writeUint32(this.bonusTicks), e2.writeUint16(this.timeTravelTickets), e2.writeUint32(this.noOfTicks), e2.writeUint32(this.confirmedTimestamp.getConfirmedNow()), e2;
  }, t.prototype.importFromReader = function(e2, t2) {
    this.setBonusTicks(e2.readUint32()), t2 >= 5 && (this.timeTravelTickets = e2.readUint16()), this.noOfTicks = e2.readUint32(), this.lastSaveTimestamp = e2.readUint32();
  }, t;
});
