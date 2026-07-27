/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/action/SellComponentAction
 */
define("game/action/SellComponentAction", ["game/Component"], function(e) {
  var t = function(e2, t2, n) {
    this.tile = e2, this.factory = e2.getFactory(), this.width = t2 || 1, this.height = n || 1;
  };
  return t.prototype.canSell = function() {
    return true;
  }, t.prototype.sell = function() {
    for (var e2 = 0; e2 < this.width; e2++) for (var t2 = 0; t2 < this.height; t2++) {
      var n = this.factory.getTile(this.tile.getX() + e2, this.tile.getY() + t2);
      this._sellTile(n);
    }
  }, t.prototype._sellTile = function(e2) {
    if (e2.getComponent()) {
      var t2 = e2.getComponent().getMeta(), n = e2.getComponent().getX(), i = e2.getComponent().getY(), r = true;
      for (var o in this.factory.getMeta().startComponents) {
        var s = this.factory.getMeta().startComponents[o];
        s.x == n && s.y == i && s.id == t2.id && (r = false);
      }
      for (var a = 0; a < t2.width; a++) for (var u = 0; u < t2.height; u++) {
        var c = this.factory.getTile(n + a, i + u);
        c.setComponent(null);
      }
      this.factory.getEventManager().invokeEvent(FactoryEvent.FACTORY_COMPONENTS_CHANGED, e2), r && this.factory.getGame().addMoney(t2.price * t2.priceRefund);
    }
  }, t;
});
