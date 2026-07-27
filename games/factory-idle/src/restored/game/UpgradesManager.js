/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/UpgradesManager
 */
define("game/UpgradesManager", ["./upgrades/Factory"], function(e) {
  var t = function(e2) {
    this.factory = e2, this.game = e2.getGame(), this.upgrades = {}, this.isChanged = true;
  };
  return t.prototype.buildMap = function() {
    var e2 = { packageSizeBonus: 0, byComponent: {} };
    for (var t2 in this.factory.getGame().getMeta().componentsById) e2.byComponent[t2] = { runningCostPerTickIncrease: 1, runningCostPerTickBonus: 1, buyAmountBonus: 1, maxStorageBonus: 1, packageSizeBonus: 0, convertAmountBonus: 1, convertProduceMoreBonus: 1, removeAmountBonus: 1, researchPaperBonus: 1, sellAmountBonus: 1, sellPriceBonus: 1 };
    var n = this.game.getMeta().upgrades;
    for (var i in n) this.getStrategy(n[i].id).updateMap(e2);
    return e2;
  }, t.prototype.getBonuses = function() {
    return this.isChanged && (this.bonuses = this.buildMap(), this.isChanged = false), this.bonuses;
  }, t.prototype.getComponentBonuses = function(e2) {
    return this.getBonuses().byComponent[e2];
  }, t.prototype.setUpgrade = function(e2, t2) {
    this.upgrades[e2] = t2, this.isChanged = true;
  }, t.prototype.addUpgrade = function(e2, t2) {
    this.setUpgrade(e2, this.getUpgrade(e2) + t2);
  }, t.prototype.getUpgrade = function(e2) {
    return this.upgrades[e2] ? this.upgrades[e2] : 0;
  }, t.prototype.getStrategy = function(t2) {
    var n = this.game.getMeta().upgradesById[t2];
    return e.getStrategy(n, this.getUpgrade(t2), this.factory);
  }, t.prototype.getPrice = function(e2, t2) {
    void 0 === t2 && (t2 = this.getUpgrade(e2));
    var n = this.game.getMeta().upgradesById[e2];
    return n.levels[t2] ? n.levels[t2].price : 0;
  }, t.prototype.getSellPrice = function(e2) {
    var t2 = this.game.getMeta().upgradesById[e2];
    return this.getUpgrade(e2) <= 0 ? 0 : this.getPrice(e2, this.getUpgrade(e2) - 1) * t2.refund;
  }, t.prototype.canPurchase = function(e2) {
    return !!this.couldPurchase(e2) && (!(this.game.getMoney() < this.getPrice(e2)) && !!this.isVisible(e2));
  }, t.prototype.couldPurchase = function(e2) {
    var t2 = this.game.getMeta().upgradesById[e2];
    return !(this.getUpgrade(e2) >= t2.levels.length);
  }, t.prototype.isVisible = function(e2) {
    var t2 = this.game.getMeta().upgradesById[e2];
    return !t2.requiresResearch || this.game.getResearchManager().getResearch(t2.requiresResearch) > 0;
  }, t.prototype.canSell = function(e2) {
    if (!(this.getUpgrade(e2) > 0)) return false;
    var t2 = this.game.getMeta().upgradesById[e2];
    return void 0 !== t2.refund && null !== t2.refund && !!this.isVisible(e2);
  }, t.prototype.exportToWriter = function() {
    var e2 = 0;
    for (var t2 in this.upgrades) this.upgrades[t2] && e2++;
    var n = new BinaryArrayWriter();
    n.writeUint16(e2);
    for (var t2 in this.upgrades) this.upgrades[t2] > 0 && (n.writeUint16(this.game.getMeta().upgradesById[t2].idNum), n.writeUint16(this.upgrades[t2]));
    return n;
  }, t.prototype.importFromReader = function(e2, t2) {
    if (0 != e2.getLength()) {
      this.upgrades = {};
      for (var n = e2.readUint16(), i = 0; i < n; i++) {
        var r = e2.readUint16(), o = e2.readUint16(), s = this.game.getMeta().upgradesByIdNum[r];
        s && (this.upgrades[s.id] = o);
      }
      this.isChanged = true;
    }
  }, t;
});
