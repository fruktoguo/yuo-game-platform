/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/action/BuyUpgrade
 */
define("game/action/BuyUpgrade", [], function() {
  var e = function(e2, t) {
    this.factory = e2, this.game = e2.getGame(), this.upgradeId = t;
  };
  return e.prototype.canBuy = function() {
    return this.factory.getUpgradesManager().canPurchase(this.upgradeId);
  }, e.prototype.buy = function() {
    this.game.addMoney(-this.factory.getUpgradesManager().getPrice(this.upgradeId)), this.factory.getUpgradesManager().addUpgrade(this.upgradeId, 1), this.factory.getEventManager().invokeEvent(FactoryEvent.UPGRADE_BOUGHT, this.upgradeId);
  }, e;
});
