/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/strategy/Converter
 */
define("game/strategy/Converter", ["Game/strategy/helper/ResourceIntake", "Game/strategy/helper/ResourceOutput", "Game/strategy/helper/DelayedAction"], function(e, t, n) {
  var i = function(i2, r) {
    this.component = i2, this.meta = r, this.inResourcesManager = new e(i2, r.inputResources, r.production), this.outResourcesManager = new t(i2, r.production, r.outputResourcesOrder), this.producer = new n(this.meta.interval), this.producer.canStart = this.canStartProduction.bind(this), this.producer.start = this.startProduction.bind(this), this.producer.finished = this.finishedProduction.bind(this);
  };
  return i.prototype.clearContents = function() {
    this.inResourcesManager.reset(), this.outResourcesManager.reset(), this.producer.reset();
  }, i.getMetaUseAmount = function(e2, t2, n2) {
    return e2.strategy.inputResources[t2].perOutputResource * n2.getUpgradesManager().getComponentBonuses(e2.id).convertAmountBonus;
  }, i.prototype.getUseAmount = function(e2) {
    return i.getMetaUseAmount(this.component.getMeta(), e2, this.component.getFactory());
  }, i.getMetaProduceAmount = function(e2, t2, n2) {
    return e2.strategy.production[t2].amount * n2.getUpgradesManager().getComponentBonuses(e2.id).convertAmountBonus * n2.getUpgradesManager().getComponentBonuses(e2.id).convertProduceMoreBonus;
  }, i.prototype.getProduceAmount = function(e2) {
    return i.getMetaProduceAmount(this.component.getMeta(), e2, this.component.getFactory());
  }, i.getMetaDescriptionData = function(e2, n2, r) {
    var o = e2.strategy, s = n2.getGame().getMeta().resourcesById, a = [], u = [], c = [];
    for (var l in o.inputResources) a.push("<span class='" + l + "'><b>" + i.getMetaUseAmount(e2, l, n2) + "</b> " + s[l].name.lcFirst() + "</span>");
    var h = 0;
    for (var l in o.production) if (i.isProducing(n2.getGame(), o, l)) {
      var p = i.getMetaProduceAmount(e2, l, n2);
      u.push("<span class='" + l + "'><b>" + p + "</b> " + s[l].name.lcFirst() + "</span>"), h = Math.max(h, p);
    }
    return { interval: o.interval, inputStr: arrayToHumanStr(a), outputStr: arrayToHumanStr(u), storageStr: arrayToHumanStr(c), noOfOutputs: Math.ceil(h / o.interval / t.getMetaOutputAmount(e2, n2)) };
  }, i.isProducing = function(e2, t2, n2) {
    return !t2.productionRemoveResearch || !t2.productionRemoveResearch[n2] || !e2.getResearchManager().getResearch(t2.productionRemoveResearch[n2]);
  }, i.prototype.getDescriptionData = function() {
    var e2 = i.getMetaDescriptionData(this.component.getMeta(), this.component.getFactory(), this);
    return this.producer.updateWithDescriptionData(e2), this.inResourcesManager.updateWithDescriptionData(e2), this.outResourcesManager.updateWithDescriptionData(e2), e2;
  }, i.prototype.calculateInputTick = function() {
    this.inResourcesManager.takeIn();
  }, i.prototype.calculateOutputTick = function() {
    this.producer.calculate(), this.outResourcesManager.distribute();
  }, i.prototype.canStartProduction = function() {
    for (var e2 in this.meta.inputResources) if (this.inResourcesManager.getResource(e2) < this.getUseAmount(e2)) return false;
    for (var e2 in this.meta.production) if (this.outResourcesManager.getResource(e2) + this.getProduceAmount(e2) > this.outResourcesManager.getMax(e2)) return false;
    return true;
  }, i.prototype.startProduction = function() {
    for (var e2 in this.meta.inputResources) this.inResourcesManager.addResource(e2, -this.getUseAmount(e2));
  }, i.prototype.finishedProduction = function() {
    for (var e2 in this.meta.production) i.isProducing(this.component.getFactory().getGame(), this.meta, e2) && this.outResourcesManager.addResource(e2, this.getProduceAmount(e2));
  }, i.prototype.toString = function() {
    var e2 = this.inResourcesManager.toString() + "<br />";
    return e2 += this.outResourcesManager.toString() + "<br />", e2 += this.producer.toString() + "<br />";
  }, i.prototype.exportToWriter = function(e2) {
    this.outResourcesManager.exportToWriter(e2), this.inResourcesManager.exportToWriter(e2), this.producer.exportToWriter(e2);
  }, i.prototype.importFromReader = function(e2, t2) {
    this.outResourcesManager.importFromReader(e2, t2), this.inResourcesManager.importFromReader(e2, t2), this.producer.importFromReader(e2, t2);
  }, i;
});
