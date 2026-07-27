/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/strategy/Buyer
 */
define("game/strategy/Buyer", ["Game/strategy/helper/ResourceOutput", "Game/strategy/helper/DelayedAction"], function(e, t) {
  var n = function(n2, i) {
    this.component = n2, this.game = this.component.getFactory().getGame(), this.meta = i, this.outResourcesManager = new e(n2, i.purchaseResources, i.outputResourcesOrder), this.producer = new t(this.meta.interval), this.producer.canStart = this.canBuy.bind(this), this.producer.start = this.preparePurchase.bind(this), this.producer.finished = this.finishPurchase.bind(this);
  };
  return n.getMetaBuyPrice = function(e2, t2, n2) {
    return e2.strategy.purchaseResources[t2].price * n2.getGame().getProfitMultiplier();
  }, n.prototype.getBuyPrice = function(e2) {
    return n.getMetaBuyPrice(this.component.getMeta(), e2, this.component.getFactory());
  }, n.getMetaBuyAmount = function(e2, t2, n2) {
    return e2.strategy.purchaseResources[t2].amount * n2.getUpgradesManager().getComponentBonuses(e2.id).buyAmountBonus;
  }, n.prototype.getBuyAmount = function(e2) {
    return n.getMetaBuyAmount(this.component.getMeta(), e2, this.component.getFactory());
  }, n.getMetaDescriptionData = function(t2, i, r) {
    var o = t2.strategy, s = [], a = 0, u = i.getGame().getMeta().resourcesById, c = 0;
    for (var l in o.purchaseResources) {
      var h = n.getMetaBuyAmount(t2, l, i);
      a += h * n.getMetaBuyPrice(t2, l, i), s.push("<span class='" + l + "'><b>" + n.getMetaBuyAmount(t2, l, i) + "</b> " + u[l].name.lcFirst() + "</span>"), c = Math.max(c, h);
    }
    return { interval: o.interval, purchasePrice: nf(a), buyStr: arrayToHumanStr(s), noOfOutputs: Math.ceil(c / o.interval / e.getMetaOutputAmount(t2, i)) };
  }, n.prototype.getDescriptionData = function() {
    var e2 = n.getMetaDescriptionData(this.component.getMeta(), this.component.getFactory(), this);
    return this.producer.updateWithDescriptionData(e2), this.outResourcesManager.updateWithDescriptionData(e2), e2;
  }, n.prototype.clearContents = function() {
    this.outResourcesManager.reset(), this.producer.reset();
  }, n.prototype.calculateOutputTick = function(e2) {
    this.producer.calculate(e2), this.outResourcesManager.distribute();
  }, n.prototype.calculatePurchasePrice = function() {
    var e2 = 0;
    for (var t2 in this.meta.purchaseResources) {
      this.meta.purchaseResources[t2];
      e2 += this.getBuyAmount(t2) * this.getBuyPrice(t2);
    }
    return e2;
  }, n.prototype.canBuy = function() {
    for (var e2 in this.meta.purchaseResources) if (this.outResourcesManager.getResource(e2) + this.getBuyAmount(e2) > this.outResourcesManager.getMax(e2)) return false;
    return true;
  }, n.prototype.preparePurchase = function(e2) {
    e2.resourceCosts += this.calculatePurchasePrice();
  }, n.prototype.finishPurchase = function(e2) {
    for (var t2 in this.meta.purchaseResources) this.outResourcesManager.addResource(t2, this.getBuyAmount(t2));
  }, n.prototype.toString = function() {
    var e2 = "";
    return e2 += this.outResourcesManager.toString() + "<br />", e2 += this.producer.toString() + "<br />";
  }, n.prototype.exportToWriter = function(e2) {
    this.outResourcesManager.exportToWriter(e2), this.producer.exportToWriter(e2);
  }, n.prototype.importFromReader = function(e2, t2) {
    this.outResourcesManager.importFromReader(e2, t2), this.producer.importFromReader(e2, t2);
  }, n;
});
