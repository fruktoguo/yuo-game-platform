/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/action/UpdateComponentInputOutputAction
 */
define("game/action/UpdateComponentInputOutputAction", [], function() {
  var e = function(e2, t) {
    this.fromTile = e2, this.toTile = t, this.factory = this.fromTile.getFactory();
  };
  return e.prototype.canUpdate = function() {
    if (!this.fromTile.getComponent() || !this.toTile.getComponent() || this.fromTile.getComponent() == this.toTile.getComponent() || !this.fromTile.getDirection(this.toTile)) return false;
    var e2 = this.fromTile.getComponent().getMeta(), t = this.toTile.getComponent().getMeta();
    return ("transport" == e2.strategy.type || "transport" == t.strategy.type) && (!!this._isLinkAllowed(this.fromTile, this.toTile, e2.allowedOutputs) && (!!this._isLinkAllowed(this.toTile, this.fromTile, t.allowedInputs) && !this._detectLoop(this.fromTile, this.toTile)));
  }, e.prototype._isLinkAllowed = function(e2, t, n) {
    var i = e2.getDirection(t), r = e2.getX() - e2.getComponent().getX(), o = e2.getY() - e2.getComponent().getY();
    return !n || n[r + ":" + o] || n[r + ":" + o + ":" + i];
  }, e.prototype._detectLoop = function(e2, t) {
    var n = function(t2, i) {
      if ("transport" != t2.getComponent().getMeta().strategy.type) return false;
      if (t2.getId() == e2.getId() && i > 0) return true;
      for (var r = t2.getInputOutputManager().getOutputsList(), o = 0; o < r.length; o++) if (n(r[o], i + 1)) return true;
    };
    return n(t, 0);
  }, e.prototype.update = function() {
    this.fromTile.getInputOutputManager().setOutput(this.fromTile.getDirection(this.toTile)), this.factory.getEventManager().invokeEvent(FactoryEvent.FACTORY_COMPONENTS_CHANGED, this.tile);
  }, e;
});
