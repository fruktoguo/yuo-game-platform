/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/action/BuyAreaAction
 */
define("game/action/BuyAreaAction", [], function() {
  var e = function(e2, t) {
    this.factory = e2, this.areaId = t, this.areaMeta = e2.getMeta().areasById[t];
  };
  return e.prototype.canBuy = function() {
    return !(this.areaMeta.price > this.factory.getGame().getMoney());
  }, e.prototype.buy = function() {
    this.factory.getGame().addMoney(-this.areaMeta.price), this.factory.getAreasManager().setAreaBought(this.areaId, true);
  }, e;
});
