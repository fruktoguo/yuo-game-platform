/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/action/SellUpgrade
 */
define("game/action/SellUpgrade", [], function() {
  var e = function(e2, t) {
    this.factory = e2, this.game = e2.getGame(), this.upgradeId = t;
  };
  return e.prototype.canSell = function() {
    return this.factory.getUpgradesManager().canSell(this.upgradeId);
  }, e.prototype.sell = function() {
    this.game.addMoney(this.factory.getUpgradesManager().getSellPrice(this.upgradeId)), this.factory.getUpgradesManager().addUpgrade(this.upgradeId, -1);
  }, e;
});
