/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/action/BuyComponentAction
 */
define("game/action/BuyComponentAction", [], function() {
  var e = function(e2, t) {
    this.tile = e2, this.factory = e2.getFactory(), this.componentMeta = t;
  };
  return e.possibleToBuy = function(e2, t) {
    return !t.requiresResearch || e2.getGame().getResearchManager().getResearch(t.requiresResearch) > 0;
  }, e.prototype.canBuy = function() {
    return !!this.factory.isPossibleToBuildOnTypeWithSize(this.tile.getX(), this.tile.getY(), this.componentMeta.width, this.componentMeta.height, this.componentMeta) && (!(this.componentMeta.price > this.factory.getGame().getMoney()) && (!!e.possibleToBuy(this.factory, this.componentMeta) && !!this.factory.getAreasManager().canBuildAt(this.tile.getX(), this.tile.getY(), this.componentMeta.width, this.componentMeta.height)));
  }, e.prototype.buy = function() {
    this.factory.getGame().addMoney(-this.componentMeta.price), this.buyFree();
  }, e.prototype.buyFree = function() {
    this.tile.setComponent(this.componentMeta), this.factory.getEventManager().invokeEvent(FactoryEvent.FACTORY_COMPONENTS_CHANGED, this.tile);
  }, e;
});
