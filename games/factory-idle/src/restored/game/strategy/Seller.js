/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/strategy/Seller
 */
define("game/strategy/Seller", ["Game/strategy/helper/ResourceIntake", "Game/strategy/helper/DelayedAction"], function(e, t) {
  var n = function(n2, i) {
    this.component = n2, this.meta = i, this.game = this.component.getFactory().getGame(), this.inResourcesManager = new e(n2, i.resources), this.producer = new t(this.meta.interval), this.producer.canStart = this.canStartSaleProcess.bind(this), this.producer.start = this.startSale.bind(this), this.producer.finished = this.finishSale.bind(this);
  };
  return n.prototype.clearContents = function() {
    this.inResourcesManager.reset(), this.producer.reset();
  }, n.getMetaSellAmount = function(e2, t2, n2) {
    return e2.strategy.resources[t2].amount * n2.getUpgradesManager().getComponentBonuses(e2.id).sellAmountBonus;
  }, n.prototype.getSellAmount = function(e2) {
    return n.getMetaSellAmount(this.component.getMeta(), e2, this.component.getFactory());
  }, n.getMetaSellPrice = function(e2, t2, n2) {
    return e2.strategy.resources[t2].sellPrice * (1 + e2.strategy.resources[t2].sellMargin) * n2.getUpgradesManager().getComponentBonuses(e2.id).sellPriceBonus * n2.getGame().getProfitMultiplier();
  }, n.prototype.getSellPrice = function(e2) {
    return n.getMetaSellPrice(this.component.getMeta(), e2, this.component.getFactory());
  }, n.getMetaDescriptionData = function(e2, t2, i) {
    var r = e2.strategy, o = [], s = [], a = 0, u = t2.getGame().getMeta().resourcesById;
    for (var c in r.resources) {
      var l = n.getMetaSellAmount(e2, c, t2) * n.getMetaSellPrice(e2, c, t2), h = n.getMetaSellAmount(e2, c, t2), p = true;
      r.resources[c].requiresResearch && (p = t2.getGame().getResearchManager().getResearch(r.resources[c].requiresResearch) > 0), r.resources[c].bonus ? p && s.push("<span class='" + c + "'><b>" + h + "</b> " + u[c].name.lcFirst() + "</span> 增加 <b class='money'>$" + nf(l) + "</b>") : (a += l, o.push("<span class='" + c + "'><b>" + h + "</b> " + u[c].name.lcFirst() + "</span>"));
    }
    return { isSeller: true, interval: r.interval, sellPrice: nf(a), sellStr: arrayToHumanStr(o), bonusStr: s.join(", ") };
  }, n.prototype.getDescriptionData = function() {
    var e2 = n.getMetaDescriptionData(this.component.getMeta(), this.component.getFactory(), this);
    return this.producer.updateWithDescriptionData(e2), this.inResourcesManager.updateWithDescriptionData(e2), e2;
  }, n.prototype.calculateInputTick = function(e2) {
    this.inResourcesManager.takeIn(), this.producer.calculate(e2);
  }, n.prototype.canStartSaleProcess = function() {
    for (var e2 in this.meta.resources) if (!this.meta.resources[e2].bonus && this.inResourcesManager.getResource(e2) < this.getSellAmount(e2)) return false;
    return true;
  }, n.prototype.startSale = function(e2) {
  }, n.prototype.finishSale = function(e2) {
    for (var t2 in this.meta.resources) {
      var n2 = this.getSellAmount(t2);
      this.inResourcesManager.getResource(t2) >= n2 && (this.inResourcesManager.addResource(t2, -n2), e2.resourceSales += n2 * this.getSellPrice(t2));
    }
  }, n.prototype.toString = function() {
    var e2 = this.inResourcesManager.toString() + "<br />";
    return e2 += this.producer.toString() + "<br />";
  }, n.prototype.exportToWriter = function(e2) {
    this.inResourcesManager.exportToWriter(e2), this.producer.exportToWriter(e2);
  }, n.prototype.importFromReader = function(e2, t2) {
    this.inResourcesManager.importFromReader(e2, t2), this.producer.importFromReader(e2, t2);
  }, n;
});
