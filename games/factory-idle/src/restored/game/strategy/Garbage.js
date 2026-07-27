/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/strategy/Garbage
 */
define("game/strategy/Garbage", ["Game/strategy/helper/DelayedAction"], function(e) {
  var t = function(t2, n) {
    this.component = t2, this.meta = n, this.game = this.component.getFactory().getGame(), this.noOfItems = 0, this.inputTileIndex = 0, this.removeAmount = 0, this.producer = new e(this.meta.interval), this.producer.canStart = this.canRemove.bind(this), this.producer.start = this.startRemoval.bind(this), this.producer.finished = this.finishRemoval.bind(this);
  };
  return t.prototype.clearContents = function() {
    this.noOfItems = 0, this.inputTileIndex = 0, this.removeAmount = 0, this.producer.reset();
  }, t.getMetaMax = function(e2, t2) {
    return e2.strategy.max * t2.getUpgradesManager().getComponentBonuses(e2.id).maxStorageBonus;
  }, t.prototype.getMax = function() {
    return t.getMetaMax(this.component.getMeta(), this.component.getFactory());
  }, t.getMetaRemoveAmount = function(e2, t2) {
    return e2.strategy.removeAmount * t2.getUpgradesManager().getComponentBonuses(e2.id).removeAmountBonus;
  }, t.prototype.getRemoveAmount = function() {
    return t.getMetaRemoveAmount(this.component.getMeta(), this.component.getFactory());
  }, t.getMetaDescriptionData = function(e2, n, i) {
    return { interval: e2.strategy.interval, removeAmount: t.getMetaRemoveAmount(e2, n), max: i ? i.getMax() : t.getMetaMax(e2, n) };
  }, t.prototype.getDescriptionData = function() {
    var e2 = t.getMetaDescriptionData(this.component.getMeta(), this.component.getFactory(), this);
    return this.producer.updateWithDescriptionData(e2), e2.noOfItems = this.noOfItems, e2;
  }, t.prototype.calculateInputTick = function() {
    this.takeIn(), this.producer.calculate();
  }, t.prototype.takeIn = function() {
    for (var e2 = this.component.getSurroundedInputTiles(), t2 = this.inputTileIndex, n = 0; n < e2.length; n++) {
      var i = e2[(this.inputTileIndex + n) % e2.length], r = i.tile.getComponent().getStrategy().getOutputQueue(i.direction);
      r.getLast() && this.noOfItems < this.getMax() && (r.unsetLast(), t2 = (this.inputTileIndex + n + 1) % e2.length, this.noOfItems++), r.forward();
    }
    this.inputTileIndex = t2;
  }, t.prototype.canRemove = function() {
    return this.noOfItems >= this.getRemoveAmount();
  }, t.prototype.startRemoval = function() {
    this.removeAmount = Math.min(this.noOfItems, this.getRemoveAmount());
  }, t.prototype.finishRemoval = function() {
    this.noOfItems -= this.removeAmount, this.removeAmount = 0;
  }, t.prototype.toString = function() {
    var e2 = "No of items: " + this.noOfItems + "<br />";
    return e2 += this.producer.toString(), this.removeAmount > 0 && (e2 += "Removing " + this.removeAmount + " items"), e2 += "<br />";
  }, t.prototype.exportToWriter = function(e2) {
    e2.writeUint32(this.noOfItems), e2.writeUint8(this.inputTileIndex), e2.writeUint32(this.removeAmount), this.producer.exportToWriter(e2);
  }, t.prototype.importFromReader = function(e2, t2) {
    this.noOfItems = e2.readUint32(), this.inputTileIndex = e2.readUint8(), this.removeAmount = e2.readUint32(), this.producer.importFromReader(e2, t2);
  }, t;
});
