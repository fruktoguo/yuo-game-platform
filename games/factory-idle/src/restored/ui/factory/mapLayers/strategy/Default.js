/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/factory/mapLayers/strategy/Default
 */
define("ui/factory/mapLayers/strategy/Default", [], function() {
  var e = function(e2, t) {
    this.imageMap = e2, this.tileSize = t.tileSize;
  };
  return e.prototype.drawComponentLayer = function(e2, t) {
    if (t.isMainComponentContainer()) {
      var n = t.getComponent().getMeta(), i = this.imageMap.getImage("components"), r = n.spriteX * (this.tileSize + 1), o = n.spriteY * (this.tileSize + 1), s = t.getX() * this.tileSize, a = t.getY() * this.tileSize, u = this.tileSize * n.width, c = this.tileSize * n.height;
      e2.drawImage(i, r, o, u, c, s, a, u, c);
    }
  }, e;
});
