/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/strategy/Lab
 */
define("game/strategy/Lab", ["Game/strategy/helper/ResourceIntake", "Game/strategy/helper/ResourceOutput", "Game/strategy/helper/DelayedAction"], function(e, t, n) {
  var i = function(i2, r) {
    this.component = i2, this.meta = r, this.inResourcesManager = new e(i2, r.inputResources), this.outResourcesManager = new t(i2, r.production, r.outputResourcesOrder), this.productionBonus = 0, this.producer = new n(this.meta.interval), this.producer.canStart = this.canStartProduction.bind(this), this.producer.start = this.startProduction.bind(this), this.producer.finished = this.finishedProduction.bind(this);
  };
  return i.prototype.clearContents = function() {
    this.inResourcesManager.reset(), this.outResourcesManager.reset(), this.producer.reset();
  }, i.getMetaDescriptionData = function(e2, t2, n2) {
    var r = e2.strategy, o = t2.getGame().getMeta().resourcesById, s = [], a = [], u = [], c = [], l = 0;
    for (var h in r.inputResources) s.push("<span class='" + h + "'><b>" + r.inputResources[h].perOutputResource + "</b> " + o[h].nameShort.lcFirst() + "</span>"), u.push("<span class='" + h + "'>" + o[h].nameShort.lcFirst() + ": <b>" + r.inputResources[h].max + "</b></span>"), c.push("<span class='" + h + "'>" + o[h].nameShort.lcFirst() + ": <b>" + r.inputResources[h].bonus + "</b></span>"), l += r.inputResources[h].bonus;
    for (var h in r.production) i.isProducing(t2.getGame(), r, h) && (a.push("<span class='" + h + "'><b>" + r.production[h].amount + "</b> " + o[h].nameShort.lcFirst() + "</span>"), u.push("<span class='" + h + "'>" + o[h].nameShort.lcFirst() + ": <b>" + r.production[h].max + "</b></span>"));
    return { interval: r.interval, inputStr: arrayToHumanStr(s), outputStr: arrayToHumanStr(a), storageStr: arrayToHumanStr(u), bonusStr: arrayToHumanStr(c), maxBonus: l };
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
    for (var e2 in this.meta.production) if (this.outResourcesManager.getResource(e2) + this.meta.production[e2].amount > this.outResourcesManager.getMax(e2)) return false;
    return true;
  }, i.prototype.startProduction = function() {
    var e2 = 1;
    for (var t2 in this.meta.inputResources) this.inResourcesManager.getResource(t2) >= this.meta.inputResources[t2].perOutputResource && (this.inResourcesManager.addResource(t2, -this.meta.inputResources[t2].perOutputResource), e2 += this.meta.inputResources[t2].bonus);
    this.productionBonus = e2;
  }, i.prototype.finishedProduction = function() {
    for (var e2 in this.meta.production) i.isProducing(this.component.getFactory().getGame(), this.meta, e2) && this.outResourcesManager.addResource(e2, this.meta.production[e2].amount * this.productionBonus);
  }, i.prototype.toString = function() {
    var e2 = this.inResourcesManager.toString() + "<br />";
    return e2 += this.outResourcesManager.toString() + "<br />", e2 += this.producer.toString() + "<br />";
  }, i.prototype.exportToWriter = function(e2) {
    e2.writeUint32(this.productionBonus), this.outResourcesManager.exportToWriter(e2), this.inResourcesManager.exportToWriter(e2), this.producer.exportToWriter(e2);
  }, i.prototype.importFromReader = function(e2, t2) {
    this.noOfItems = e2.readUint32(), this.outResourcesManager.importFromReader(e2, t2), this.inResourcesManager.importFromReader(e2, t2), this.producer.importFromReader(e2, t2);
  }, i;
});
