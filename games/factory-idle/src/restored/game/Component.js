/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/Component
 */
define("game/Component", ["game/strategy/Factory"], function(e) {
  var t = function(t2, n, i, r) {
    this.meta = r, this.factory = t2, this.x = n, this.y = i, this.strategy = e.getForComponent(this), this.surroundedInputTiles = [], this.surroundedOutputTiles = [];
  };
  return t.getMetaDescriptionData = function(n, i, r) {
    var o = e.getMetaDescriptionData(n, i, r);
    return t._addCommonMetaDescriptionData(o, n, i, r), o;
  }, t.prototype.getDescriptionData = function() {
    var e2 = this.strategy.getDescriptionData();
    return t._addCommonMetaDescriptionData(e2, this.meta, this.factory, this.strategy), e2;
  }, t._addCommonMetaDescriptionData = function(e2, n, i, r) {
    e2.name = n.name, e2["is" + n.strategy.type.ucFirst()] = true, e2.description = n.description, e2.priceStr = "$" + nf(n.price), n.runningCostPerTick && (e2.runningCostStr = "$" + nf(t.getMetaRunningCostPerTick(n, i)) + "/tick");
  }, t.getMetaRunningCostPerTick = function(e2, t2) {
    return e2.runningCostPerTick * t2.getUpgradesManager().getComponentBonuses(e2.applyUpgradesFrom ? e2.applyUpgradesFrom : e2.id).runningCostPerTickIncrease * t2.getUpgradesManager().getComponentBonuses(e2.applyUpgradesFrom ? e2.applyUpgradesFrom : e2.id).runningCostPerTickBonus * t2.getGame().getProfitMultiplier();
  }, t.prototype.getRunningCostPerTick = function() {
    return t.getMetaRunningCostPerTick(this.meta, this.factory);
  }, t.prototype._checkForSurroundedInputsOutputs = function(e2, t2, n) {
    var i = this.factory.getTile(e2, t2), r = i.getInputOutputManager().getOutputsByDirection()[n];
    r && this.surroundedOutputTiles.push({ tile: r, from: i, direction: i.getDirection(r), oppositeDirection: r.getDirection(i) });
    var o = i.getInputOutputManager().getInputsByDirection()[n];
    o && this.surroundedInputTiles.push({ tile: o, from: i, direction: o.getDirection(i), oppositeDirection: i.getDirection(o) });
  }, t.prototype._updateSurroundedTilesCache = function() {
    this.surroundedInputTiles = [], this.surroundedOutputTiles = [];
    for (var e2 = this.x; e2 < this.x + this.meta.width; e2++) this._checkForSurroundedInputsOutputs(e2, this.y, "top");
    for (var t2 = this.y; t2 < this.y + this.meta.height; t2++) this._checkForSurroundedInputsOutputs(this.x + this.meta.width - 1, t2, "right");
    for (e2 = this.x + this.meta.width - 1; e2 >= this.x; e2--) this._checkForSurroundedInputsOutputs(e2, this.y + this.meta.height - 1, "bottom");
    for (t2 = this.y + this.meta.height - 1; t2 >= this.y; t2--) this._checkForSurroundedInputsOutputs(this.x, t2, "left");
  }, t.prototype.outputsInputsChanged = function() {
    this._updateSurroundedTilesCache(), this.getStrategy().clearContents(), this.getStrategy().updateInputsOutputs && this.getStrategy().updateInputsOutputs();
  }, t.prototype.getSurroundedInputTiles = function() {
    return this.surroundedInputTiles;
  }, t.prototype.getSurroundedOutputTiles = function() {
    return this.surroundedOutputTiles;
  }, t.prototype.calculateInputTick = function(e2) {
    this.meta.runningCostPerTick > 0 && (e2.runningCosts += this.getRunningCostPerTick());
  }, t.prototype.getFactory = function() {
    return this.factory;
  }, t.prototype.getMeta = function() {
    return this.meta;
  }, t.prototype.getStrategy = function() {
    return this.strategy;
  }, t.prototype.getX = function() {
    return this.x;
  }, t.prototype.getY = function() {
    return this.y;
  }, t.prototype.getMainTile = function() {
    return this.factory.getTile(this.x, this.y);
  }, t.prototype.exportToWriter = function(e2) {
    this.strategy.exportToWriter(e2);
  }, t.prototype.importFromReader = function(e2, t2) {
    this.strategy.importFromReader(e2, t2);
  }, t;
});
