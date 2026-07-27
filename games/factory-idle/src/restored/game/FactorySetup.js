/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/FactorySetup
 */
define("game/FactorySetup", ["game/action/BuyComponentAction", "game/action/UpdateComponentInputOutputAction"], function(e, t) {
  var n = function(e2) {
    this.factory = e2, this.factoryMeta = e2.getMeta(), this.meta = e2.getGame().getMeta();
  };
  return n.prototype.init = function() {
    return this._initComponents(), this._initTransportLines(), this;
  }, n.prototype._initComponents = function() {
    if (this.factoryMeta.startComponents) {
      for (var t2 in this.factoryMeta.startComponents) {
        var n2 = this.factoryMeta.startComponents[t2], i = this.factory.getTile(n2.x, n2.y);
        new e(i, this.meta.componentsById[n2.id]).buyFree();
      }
      return this;
    }
  }, n.prototype._initTransportLines = function() {
    if (this.factoryMeta.transportLineConnections) {
      for (var e2 in this.factoryMeta.transportLineConnections) {
        var n2 = this.factoryMeta.transportLineConnections[e2], i = this.factory.getTile(n2.fromX, n2.fromY), r = this.factory.getTile(n2.toX, n2.toY), o = new t(i, r);
        o.canUpdate() && o.update();
      }
      return this;
    }
  }, n;
});
