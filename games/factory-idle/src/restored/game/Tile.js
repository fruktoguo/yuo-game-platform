/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/Tile
 */
define("game/Tile", ["game/InputOutputManager", "game/Component"], function(e, t) {
  var n = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0], top_right: [1, -1], top_left: [-1, -1], bottom_right: [1, 1], bottom_left: [-1, 1] }, i = { "-10": "top", "-1": "left", 1: "right", 10: "bottom" }, r = function(t2, n2, i2, r2, o) {
    this.id = n2 * o.getMeta().tilesX + t2, this.x = t2, this.y = n2, this.factory = o, this.setTerrain(r2), this.setBuildableType(i2), this.component = null, this.inputOutputManager = new e(this, function() {
      this.component && this.component.outputsInputsChanged();
    }.bind(this));
  };
  return r.BUILDABLE_NO = "X", r.BUILDABLE_YES = " ", r.BUILDABLE_PARTIAL = "-", r.prototype.getId = function() {
    return this.id;
  }, r.prototype.getIdStr = function() {
    return this.x + ":" + this.y;
  }, r.prototype.getX = function() {
    return this.x;
  }, r.prototype.getY = function() {
    return this.y;
  }, r.prototype.setBuildableType = function(e2) {
    e2 != r.BUILDABLE_YES && e2 != r.BUILDABLE_PARTIAL && (e2 = r.BUILDABLE_NO), this.buildableType = e2;
  }, r.prototype.getBuildableType = function() {
    return this.buildableType;
  }, r.prototype.isPossibleToBuildOnType = function(e2) {
    return this.buildableType == r.BUILDABLE_YES || e2.canBuildToPartial && this.buildableType == r.BUILDABLE_PARTIAL;
  }, r.prototype.setTerrain = function(e2) {
    e2 || (e2 = "grass"), this.terrain = e2;
  }, r.prototype.getTerrain = function() {
    return this.terrain;
  }, r.prototype.getInputOutputManager = function() {
    return this.inputOutputManager;
  }, r.prototype.getDirection = function(e2) {
    return i[String(10 * (e2.getY() - this.y) + (e2.getX() - this.x))];
  }, r.prototype.getTileInDirection = function(e2) {
    return this.factory.getTile(this.x + n[e2][0], this.y + n[e2][1]);
  }, r.prototype.isMainComponentContainer = function() {
    return !!this.component && (this.component.getX() == this.x && this.component.getY() == this.y);
  }, r.prototype.getFactory = function() {
    return this.factory;
  }, r.prototype.getComponent = function() {
    return this.component;
  }, r.prototype.setComponent = function(e2) {
    if (e2) for (var n2 = new t(this.factory, this.x, this.y, e2), i2 = 0; i2 < e2.width; i2++) for (var r2 = 0; r2 < e2.height; r2++) {
      var o = this.factory.getTile(this.x + i2, this.y + r2);
      o.component = n2;
    }
    else this.component = null;
    this.inputOutputManager.reset();
  }, r.prototype.exportToWriter1 = function(e2) {
    this.inputOutputManager.exportToWriter(e2);
  }, r.prototype.exportToWriter2 = function(e2) {
    this.component.exportToWriter(e2);
  }, r.prototype.importFromReader1 = function(e2, t2) {
    this.inputOutputManager.importFromReader(e2, t2);
  }, r.prototype.importFromReader2 = function(e2, t2) {
    this.component.importFromReader(e2, t2);
  }, r;
});
