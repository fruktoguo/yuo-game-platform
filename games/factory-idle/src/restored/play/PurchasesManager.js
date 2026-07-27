/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：play/PurchasesManager
 */
define("play/PurchasesManager", [], function() {
  var e = "PurchasesManager", t = function(t2) {
    this.play = t2, this.game = this.play.getGame(), this.unlocks = {}, this.strategies = { bonusTicks: { apply: function(t3) {
      this.game.getTicker().addBonusTicks(t3.amount), this.game.setIsPremium(true), logger.info(e, "Added " + t3.amount + " bonus ticks");
    }.bind(this) }, timeTravelTickets: { apply: function(t3) {
      this.game.getTicker().addTimeTravelTickets(t3.amount), this.game.setIsPremium(true), logger.info(e, "Added " + t3.amount + " bonus ticks");
    }.bind(this) }, researchProductionBonus: { apply: function(t3) {
      this.game.setResearchProductionMultiplier(this.game.getResearchProductionMultiplier() * t3.bonus), this.game.setIsPremium(true), logger.info(e, "Set research production bonus");
    }.bind(this) }, extraTicks: { apply: function(t3) {
      this.game.getTicker().setPurchaseBonusTicks(t3.bonus), this.game.setIsPremium(true), logger.info(e, "Set extra ticks");
    }.bind(this) }, extraProfit: { apply: function(t3) {
      this.game.setProfitMultiplier(t3.bonus), this.game.setIsPremium(true), logger.info(e, "Set extra money");
    }.bind(this) } };
  };
  return t.prototype.isVisible = function(e2) {
    var t2 = this.play.getMeta().productsById[e2];
    return !(t2.requiresProduct && !this.getIsUnlocked(t2.requiresProduct)) && !t2.special;
  }, t.prototype.getPriceKey = function() {
    return this.play.getApi().getKey();
  }, t.prototype.init = function(e2) {
    this.loadPurchases(e2);
  }, t.prototype.loadPurchases = function(t2) {
    this.play.getApi().loadPurchases(function(n) {
      logger.info(e, "Purchases loaded", n), this.handlePurchases(n), t2();
    }.bind(this));
  }, t.prototype.startPurchase = function(e2, t2) {
    this.play.getApi().purchase(e2, function() {
      this.loadPurchases(function() {
        t2();
      });
    }.bind(this));
  }, t.prototype.destroy = function() {
  }, t.prototype.handlePurchases = function(e2) {
    this.game.setResearchProductionMultiplier(1), this.game.getTicker().setPurchaseBonusTicks(0), this.game.setProfitMultiplier(1);
    for (var t2 = 0; t2 < e2.length; t2++) this.handlePurchase(e2[t2]);
  }, t.prototype.handlePurchase = function(t2) {
    var n = this.play.getMeta().productsById[t2.productId];
    if (!n) return void logger.warning(e, "Unknown product with id " + t2.productId, t2);
    this.strategies[n.strategy.type] ? (this.strategies[n.strategy.type].apply(n.strategy), logger.info(e, "Applied consumable strategy " + n.strategy.type + " for purchase " + t2.productId), n.consumable ? this.play.getSaveManager().saveAuto(function(n2) {
      this.play.getApi().setConsumed(t2.externalId, function() {
        logger.info(e, "Purchase " + t2.externalId + " set to consumed");
      });
    }.bind(this)) : (this.unlocks[t2.productId] = true, logger.info(e, "Purchase unlocked " + t2.productId + " with external id " + t2.externalId))) : logger.error(e, "Invalid consumable strategy " + n.strategy.type + " for purchase " + t2.productId + ". Could not handle purchase.");
  }, t.prototype.getIsUnlocked = function(e2) {
    return !!this.unlocks[e2];
  }, t;
});
