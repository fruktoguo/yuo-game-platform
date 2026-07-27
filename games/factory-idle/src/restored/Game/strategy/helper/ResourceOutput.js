/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：Game/strategy/helper/ResourceOutput
 */
define("Game/strategy/helper/ResourceOutput", ["game/strategy/helper/Package"], function(e) {
  var t = function(e2, t2, n) {
    this.component = e2, this.handledResources = t2, this.outputResourcesOrder = n, this.reset();
  };
  return t.prototype.reset = function() {
    this.resources = {};
    for (var e2 = 0; e2 < this.outputResourcesOrder.length; e2++) this.resources[this.outputResourcesOrder[e2]] = 0;
    this.outResourceSelectionIndex = 0, this.distributeTileIndex = 0;
  }, t.prototype.updateWithDescriptionData = function(e2) {
    e2.stock || (e2.stock = []);
    var t2 = this.component.getFactory().getGame().getMeta().resourcesById;
    for (var n in this.resources) e2.stock.push({ resourceId: n, resourceName: t2[n].nameShort, amount: this.resources[n], max: this.getMax(n) });
  }, t.prototype.getMax = function(e2) {
    var t2 = this.component.getMeta();
    return this.handledResources[e2].max * this.component.getFactory().getUpgradesManager().getComponentBonuses(t2.applyUpgradesFrom ? t2.applyUpgradesFrom : t2.id).maxStorageBonus;
  }, t.getMetaOutputAmount = function(e2, t2) {
    return 1 + t2.getUpgradesManager().getBonuses().packageSizeBonus + t2.getUpgradesManager().getComponentBonuses(e2.id).packageSizeBonus;
  }, t.prototype.getOutputAmount = function() {
    return t.getMetaOutputAmount(this.component.getMeta(), this.component.getFactory());
  }, t.prototype.distribute = function() {
    for (var t2 = this.component.getSurroundedOutputTiles(), n = 0; n < t2.length; n++) {
      var i = this._getNextOutputResource();
      if (!i) break;
      var r = t2[this.distributeTileIndex];
      this.distributeTileIndex = (this.distributeTileIndex + 1) % t2.length;
      var o = r.tile.getComponent().getStrategy().getInputQueue(r.oppositeDirection);
      if (null == o.getFirst()) {
        var s = this.getOutputAmount();
        o.setFirst(new e(i, s, this.component.getFactory())), this.resources[i] -= s, this.outResourceSelectionIndex = (this.outResourceSelectionIndex + 1) % this.outputResourcesOrder.length;
      }
    }
  }, t.prototype._getNextOutputResource = function() {
    for (var e2 = 0; e2 < this.outputResourcesOrder.length; e2++) {
      var t2 = this.outputResourcesOrder[(this.outResourceSelectionIndex + e2) % this.outputResourcesOrder.length];
      if (this.resources[t2] >= this.getOutputAmount()) return t2;
    }
    return this.outResourceSelectionIndex = 0, null;
  }, t.prototype.addResource = function(e2, t2) {
    this.resources[e2] += t2;
  }, t.prototype.getResource = function(e2) {
    return this.resources[e2];
  }, t.prototype.toString = function() {
    var e2 = "OUT outIndex:" + this.distributeTileIndex + " resIndex:" + this.outResourceSelectionIndex + "<br />";
    for (var t2 in this.resources) e2 += t2 + ": " + this.resources[t2] + "<br />";
    return e2;
  }, t.prototype.exportToWriter = function(e2) {
    var t2 = 0;
    for (var n in this.resources) t2++;
    e2.writeUint8(t2);
    for (var n in this.resources) e2.writeUint32(this.resources[n]);
    e2.writeUint8(this.outResourceSelectionIndex), e2.writeUint8(this.distributeTileIndex);
  }, t.prototype.importFromReader = function(e2, t2) {
    var n = e2.readUint8(), i = 0;
    for (var r in this.resources) {
      if (i >= n) break;
      this.resources[r] = e2.readUint32(), i++;
    }
    this.outResourceSelectionIndex = e2.readUint8(), this.distributeTileIndex = e2.readUint8();
  }, t;
});
