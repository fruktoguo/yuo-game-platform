/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/strategy/ResearchCenter
 */
define("game/strategy/ResearchCenter", ["Game/strategy/helper/ResourceIntake", "Game/strategy/helper/DelayedAction"], function(e, t) {
  var n = function(n2, i) {
    this.component = n2, this.meta = i, this.game = this.component.getFactory().getGame(), this.productionBonus = 0, this.inResourcesManager = new e(n2, i.resources), this.producer = new t(this.meta.interval), this.producer.canStart = this.canProduce.bind(this), this.producer.start = this.startProduction.bind(this), this.producer.finished = this.finishProduction.bind(this);
  };
  return n.prototype.clearContents = function() {
    this.inResourcesManager.reset(), this.producer.reset();
  }, n.getMetaBonus = function(e2, t2, n2) {
    return e2.strategy.resources[t2].bonus * n2.getUpgradesManager().getComponentBonuses(e2.applyUpgradesFrom ? e2.applyUpgradesFrom : e2.id).researchPaperBonus;
  }, n.prototype.getBonus = function(e2) {
    return n.getMetaBonus(this.component.getMeta(), e2, this.component.getFactory());
  }, n.getResearchProduction = function(e2, t2) {
    return e2.strategy.researchProduction * t2.getGame().getResearchProductionMultiplier();
  }, n.prototype.getResearchProduction = function() {
    return n.getResearchProduction(this.component.getMeta(), this.component.getFactory());
  }, n.getMetaDescriptionData = function(e2, t2, i) {
    var r = e2.strategy, o = t2.getGame().getMeta().resourcesById, s = [];
    for (var a in r.resources) s.push("<span class='" + a + "'>" + o[a].name.lcFirst() + ": <b>" + nf(n.getMetaBonus(e2, a, t2)) + "</b></span> ");
    return { interval: r.interval, bonusStr: arrayToHumanStr(s), productionStr: "<span class='research'><b>" + nf(n.getResearchProduction(e2, t2)) + "</b> 研究点</span>" };
  }, n.prototype.getDescriptionData = function() {
    var e2 = n.getMetaDescriptionData(this.component.getMeta(), this.component.getFactory(), this);
    return this.producer.updateWithDescriptionData(e2), this.inResourcesManager.updateWithDescriptionData(e2), e2;
  }, n.prototype.calculateInputTick = function(e2) {
    this.inResourcesManager.takeIn(), this.producer.calculate(e2);
  }, n.prototype.canProduce = function() {
    return true;
  }, n.prototype.startProduction = function() {
    var e2 = 1;
    for (var t2 in this.meta.resources) e2 += this.inResourcesManager.getResource(t2) * this.getBonus(t2), this.inResourcesManager.addResource(t2, -this.inResourcesManager.getResource(t2));
    this.productionBonus = e2;
  }, n.prototype.finishProduction = function(e2) {
    e2.researchProduction += this.getResearchProduction() * this.productionBonus;
  }, n.prototype.toString = function() {
    var e2 = "";
    return e2 += this.producer.toString(), e2 += "<br />";
  }, n.prototype.exportToWriter = function(e2) {
    e2.writeUint32(this.productionBonus), this.producer.exportToWriter(e2);
  }, n.prototype.importFromReader = function(e2, t2) {
    this.noOfItems = e2.readUint32(), this.producer.importFromReader(e2, t2);
  }, n;
});
