/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/AreasManager
 */
define("game/AreasManager", [], function() {
  var e = function(e2) {
    this.factory = e2, this.game = e2.getGame(), this.boughtAreas = {};
  };
  return e.prototype.setAreaBought = function(e2, t) {
    this.boughtAreas[e2] = t;
  }, e.prototype.getIsAreaBought = function(e2) {
    return !!this.boughtAreas[e2];
  }, e.prototype.getPrice = function(e2) {
    return this.factory.getMeta().areasById[e2];
  }, e.prototype.canPurchase = function(e2) {
    return !(this.game.getMoney() < this.getPrice(e2));
  }, e.prototype.canBuildAt = function(e2, t, n, i) {
    for (var r = 0; r < this.factory.getMeta().areas.length; r++) for (var o = this.factory.getMeta().areas[r], s = 0; s < o.locations.length; s++) {
      var a = o.locations[s], u = !(a.x >= e2 + n || a.x + a.width <= e2 || a.y >= t + i || a.y + a.height <= t);
      if (u && !this.boughtAreas[o.id]) return false;
    }
    return true;
  }, e.prototype.exportToWriter = function() {
    var e2 = 0;
    for (var t in this.boughtAreas) e2++;
    var n = new BinaryArrayWriter();
    n.writeUint8(e2);
    for (var t in this.boughtAreas) n.writeUint8(this.factory.getMeta().areasById[t].idNum);
    return n;
  }, e.prototype.importFromReader = function(e2, t) {
    if (0 != e2.getLength()) {
      this.boughtAreas = {};
      for (var n = e2.readUint8(), i = 0; i < n; i++) {
        var r = e2.readUint8();
        this.setAreaBought(this.factory.getMeta().areasByIdNum[r].id, true);
      }
    }
  }, e;
});
