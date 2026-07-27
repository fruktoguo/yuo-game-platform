/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/action/BuyFactoryAction
 */
define("game/action/BuyFactoryAction", [], function() {
  var e = function(e2, t) {
    this.game = e2, this.factoryMeta = this.game.getMeta().factoriesById[t];
  };
  return e.prototype.canBuy = function() {
    return this.game.getMoney() >= this.factoryMeta.price;
  }, e.prototype.buy = function() {
    this.game.addMoney(-this.factoryMeta.price);
    var e2 = this.game.getFactory(this.factoryMeta.id);
    e2.reset(), e2.setIsBought(true);
  }, e;
});
