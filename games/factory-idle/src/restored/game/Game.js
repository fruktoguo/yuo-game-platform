/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/Game
 */
define("game/Game", ["game/Factory", "base/EventManager", "game/ResearchManager", "game/AchievementsManager", "game/calculator/Calculator", "game/statistics/Statistics", "game/Ticker"], function(e, t, n, i, r, o, s) {
  var a = function(a2, u) {
    this.meta = a2, this.confirmedTimestamp = u, this.money = a2.startingMoney, this.researchPoints = a2.startingResearchPoints, this.em = new t(GameEvent, "Game"), this.factories = {};
    for (var c in a2.factories) {
      var l = a2.factories[c];
      this.factories[l.id] = new e(l, this);
    }
    this.researchManager = new n(this), this.achievementsManager = new i(this), this.calculator = new r(this), this.statistics = new o(this), this.ticker = new s(this, this.confirmedTimestamp), this.profitMultiplier = 1, this.researchProductionMultiplier = 1, this.isPremium = false;
  };
  return a.prototype.init = function() {
    return this.calculator.init(), this.statistics.init(), this.ticker.init(), this;
  }, a.prototype.destroy = function() {
    this.calculator.destroy(), this.statistics.destroy(), this.ticker.destroy();
  }, a.prototype.getMeta = function() {
    return this.meta;
  }, a.prototype.getEventManager = function() {
    return this.em;
  }, a.prototype.getResearchManager = function() {
    return this.researchManager;
  }, a.prototype.getAchievementsManager = function() {
    return this.achievementsManager;
  }, a.prototype.getCalculator = function() {
    return this.calculator;
  }, a.prototype.getStatistics = function() {
    return this.statistics;
  }, a.prototype.getTicker = function() {
    return this.ticker;
  }, a.prototype.getFactory = function(e2) {
    return this.factories[e2];
  }, a.prototype.setProfitMultiplier = function(e2) {
    this.profitMultiplier = e2;
  }, a.prototype.getProfitMultiplier = function() {
    return this.profitMultiplier;
  }, a.prototype.setResearchProductionMultiplier = function(e2) {
    this.researchProductionMultiplier = e2;
  }, a.prototype.getResearchProductionMultiplier = function() {
    return this.researchProductionMultiplier;
  }, a.prototype.setIsPremium = function(e2) {
    this.isPremium = e2;
  }, a.prototype.getIsPremium = function() {
    return this.isPremium;
  }, a.prototype.getMoney = function() {
    return this.money;
  }, a.prototype.setMoney = function(e2) {
    isNaN(Number(e2)) && (e2 = 0), e2 < this.meta.minNegativeMoney && (e2 = this.meta.minNegativeMoney), this.money = e2, this.em.invokeEvent(GameEvent.MONEY_UPDATED, this.money);
  }, a.prototype.addMoney = function(e2) {
    isNaN(Number(e2)) && (e2 = 0), this.setMoney(this.money + e2);
  }, a.prototype.getResearchPoints = function() {
    return this.researchPoints;
  }, a.prototype.setResearchPoints = function(e2) {
    isNaN(Number(e2)) && (e2 = 0), this.researchPoints = isNaN(e2) ? 0 : e2, this.em.invokeEvent(GameEvent.RESEARCH_POINTS_UPDATED, this.researchPoints);
  }, a.prototype.addResearchPoints = function(e2) {
    isNaN(Number(e2)) && (e2 = 0), this.setResearchPoints(this.researchPoints + e2);
  }, a.prototype.exportToWriter = function() {
    var e2 = new BinaryArrayWriter();
    e2.writeUint16(7), e2.writeFloat64(this.money), e2.writeFloat64(this.researchPoints), e2.writeInt8(this.isPremium ? 1 : 0), e2.writeWriter(this.researchManager.exportToWriter()), e2.writeWriter(this.achievementsManager.exportToWriter()), e2.writeWriter(this.statistics.exportToWriter()), e2.writeWriter(this.ticker.exportToWriter()), e2.writeUint8(this.meta.factories.length);
    for (var t2 in this.factories) e2.writeUint8(this.factories[t2].getMeta().idNum), e2.writeWriter(this.factories[t2].exportToWriter());
    return e2;
  }, a.prototype.importFromReader = function(e2) {
    var t2 = e2.readUint16();
    this.setMoney(e2.readFloat64()), this.setResearchPoints(e2.readFloat64()), t2 >= 7 ? this.setIsPremium(!!e2.readInt8()) : this.setIsPremium(false);
    var n2 = e2.readReader();
    this.researchManager.importFromReader(n2, t2), this.achievementsManager.importFromReader(e2.readReader(), t2), this.statistics.importFromReader(e2.readReader(), t2), this.ticker.importFromReader(e2.readReader(), t2);
    for (var i2 = e2.readUint8(), r2 = 0; r2 < i2; r2++) {
      var o2 = this.meta.factoriesByIdNum[e2.readUint8()], s2 = e2.readReader();
      o2 && this.factories[o2.id].importFromReader(s2, t2);
    }
    this.statistics.reset();
  }, a;
});
