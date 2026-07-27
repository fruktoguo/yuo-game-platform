/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：Game/strategy/helper/ResourceIntake
 */
define("Game/strategy/helper/ResourceIntake", [], function() {
  var e = function(e2, t) {
    this.component = e2, this.inputResources = t, this.reset();
  };
  return e.prototype.reset = function() {
    this.resources = {}, this.inputTileIndex = [];
    for (var e2 in this.inputResources) this.resources[e2] = 0, this.inputTileIndex.push({ resource: e2, offset: 0 });
  }, e.prototype.updateWithDescriptionData = function(e2) {
    e2.stock || (e2.stock = []);
    var t = this.component.getFactory().getGame().getMeta().resourcesById;
    for (var n in this.inputResources) {
      var i = this.inputResources[n], r = true;
      i.requiresResearch && (r = this.component.getFactory().getGame().getResearchManager().getResearch(i.requiresResearch) > 0), r && e2.stock.push({ resourceId: n, resourceName: t[n].nameShort, amount: this.resources[n], max: this.getMax(n) });
    }
  }, e.prototype.getMax = function(e2) {
    var t = this.component.getMeta();
    return this.inputResources[e2].max * this.component.getFactory().getUpgradesManager().getComponentBonuses(t.applyUpgradesFrom ? t.applyUpgradesFrom : t.id).maxStorageBonus;
  }, e.prototype.takeIn = function() {
    for (var e2 = this.component.getSurroundedInputTiles(), t = 0; t < this.inputTileIndex.length; t++) {
      for (var n = this.inputTileIndex[t].resource, i = this.inputTileIndex[t].offset, r = i, o = 0; o < e2.length && !(this.resources[n] >= this.getMax(n)); o++) {
        var s = e2[(i + o) % e2.length], a = s.tile.getComponent().getStrategy().getOutputQueue(s.direction), u = a.getLast();
        u && u.getResourceId() == n && (a.unsetLast(), r = (i + o + 1) % e2.length, this.resources[u.getResourceId()] += u.getAmount());
      }
      this.inputTileIndex[t].offset = r;
    }
    for (var c = 0; c < e2.length; c++) e2[c].tile.getComponent().getStrategy().getOutputQueue(e2[c].direction).forward();
  }, e.prototype.addResource = function(e2, t) {
    this.resources[e2] += t;
  }, e.prototype.getResource = function(e2) {
    return this.resources[e2];
  }, e.prototype.toString = function() {
    var e2 = "IN<br />";
    for (var t in this.inputTileIndex) e2 += this.inputTileIndex[t].resource + ": " + this.resources[this.inputTileIndex[t].resource] + " (offset:" + this.inputTileIndex[t].offset + " )<br />";
    return e2;
  }, e.prototype.exportToWriter = function(e2) {
    e2.writeUint8(this.inputTileIndex.length);
    for (var t = 0; t < this.inputTileIndex.length; t++) e2.writeUint32(this.resources[this.inputTileIndex[t].resource]), e2.writeUint8(this.inputTileIndex[t].offset);
  }, e.prototype.importFromReader = function(e2, t) {
    for (var n = Math.min(this.inputTileIndex.length, e2.readUint8()), i = 0; i < n; i++) this.resources[this.inputTileIndex[i].resource] = e2.readUint32(), this.inputTileIndex[i].offset = e2.readUint8();
  }, e;
});
