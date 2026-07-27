/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/action/BuyResearch
 */
define("game/action/BuyResearch", [], function() {
  var e = function(e2, t) {
    this.game = e2, this.researchId = t;
  };
  return e.prototype.canBuy = function() {
    return this.game.getResearchManager().canPurchase(this.researchId);
  }, e.prototype.buy = function() {
    this.game.addMoney(-this.game.getResearchManager().getPrice(this.researchId)), this.game.addResearchPoints(-this.game.getResearchManager().getPriceResearchPoints(this.researchId)), this.game.getResearchManager().addResearch(this.researchId, 1), this.game.getEventManager().invokeEvent(GameEvent.RESEARCH_BOUGHT, this.researchId);
  }, e;
});
