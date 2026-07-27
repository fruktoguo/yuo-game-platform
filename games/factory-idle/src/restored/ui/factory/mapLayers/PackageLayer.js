/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/factory/mapLayers/PackageLayer
 */
define("ui/factory/mapLayers/PackageLayer", [], function() {
  var e = function(e2, t, n) {
    this.imageMap = e2, this.factory = t, this.game = t.getGame(), this.tileSize = n.tileSize, this.packageSize = 15;
    var i = this.packageSize / 3;
    this.tilesX = t.getMeta().tilesX, this.tilesY = t.getMeta().tilesY, this.resourcesMeta = this.factory.getGame().getMeta().resourcesById, this.firstPackageLocation = { top: { top: -this.packageSize + i, bottom: -this.tileSize / 2 - i }, bottom: { top: this.tileSize / 2 - this.packageSize + i, bottom: 0 - i }, right: { right: 0 - i, left: this.tileSize / 2 - this.packageSize + i }, left: { right: -this.tileSize / 2 - i, left: -this.packageSize + i } }, this.movementDirectionCoefficient = { top: { top: -5, bottom: 5 }, bottom: { top: -5, bottom: 5 }, right: { right: 5, left: -5 }, left: { right: 5, left: -5 } }, this.canvas = null, this.queuesCache = [];
  };
  return e.prototype.getCanvas = function() {
    return this.canvas;
  }, e.prototype.display = function(e2) {
    var t = this;
    this.container = e2, this.canvas = document.createElement("canvas"), this.canvas.style.position = "absolute", this.canvas.width = this.tilesX * this.tileSize, this.canvas.height = this.tilesY * this.tileSize, e2.append(this.canvas), this.factory.getEventManager().addListener("LayerPackage", FactoryEvent.FACTORY_TICK, function() {
      this.game.getTicker().getIsFocused() && this.redraw();
    }.bind(this)), this.factory.getEventManager().addListener("LayerPackage", FactoryEvent.FACTORY_COMPONENTS_CHANGED, function() {
      this.buildCache(), this.redraw();
    }.bind(this)), t.buildCache(), t.redraw();
  }, e.prototype.buildCache = function() {
    this.queuesCache = [];
    for (var e2 = this.factory.getTiles(), t = 0; t < e2.length; t++) {
      var n = e2[t];
      n.getComponent();
      if (n.getComponent() && "transport" == n.getComponent().getMeta().strategy.type) {
        var i = n.getComponent().getStrategy().getInputQueues(), r = n.getComponent().getStrategy().getOutputQueues();
        this._addQueueToCache(n, i.top, "top", "bottom"), this._addQueueToCache(n, r.top, "top", "top"), this._addQueueToCache(n, r.left, "left", "left"), this._addQueueToCache(n, i.left, "left", "right"), this._addQueueToCache(n, i.right, "right", "left"), this._addQueueToCache(n, r.right, "right", "right"), this._addQueueToCache(n, r.bottom, "bottom", "bottom"), this._addQueueToCache(n, i.bottom, "bottom", "top");
      }
    }
  }, e.prototype._addQueueToCache = function(e2, t, n, i) {
    t && this.queuesCache.push({ tile: e2, queue: t, posDir: n, moveDir: i });
  }, e.prototype.redraw = function() {
    this.canvas.getContext("2d").clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (var e2, t = 0; t < this.queuesCache.length; t++) e2 = this.queuesCache[t], this.drawQueue(e2.tile, e2.queue, e2.posDir, e2.moveDir);
  }, e.prototype.drawQueue = function(e2, t, n, i) {
    for (var r, o, s, a, u, c = e2.getX() * this.tileSize + this.tileSize / 2, l = e2.getY() * this.tileSize + this.tileSize / 2, h = 0; h < t.getLength(); h++) {
      var p = h;
      "top" != i && "left" != i || (p = t.getLength() - h - 1), r = t.get(p), r && (a = this.resourcesMeta[r.getResourceId()].spriteX * (this.packageSize + 1), u = this.resourcesMeta[r.getResourceId()].spriteY * (this.packageSize + 1), "left" == n || "right" == n ? (o = c + this.firstPackageLocation[n][i] + this.movementDirectionCoefficient[n][i] * p + r.getOffset() / 2, s = l - this.packageSize / 2 + r.getOffset()) : (o = c - this.packageSize / 2 + r.getOffset(), s = l + this.firstPackageLocation[n][i] + this.movementDirectionCoefficient[n][i] * p + r.getOffset() / 2), this.canvas.getContext("2d").drawImage(this.imageMap.getImage("resources"), a, u, this.packageSize, this.packageSize, Math.round(o) + 2, Math.round(s) + 2, this.packageSize - 4, this.packageSize - 4));
    }
  }, e.prototype.destroy = function() {
    this.factory.getEventManager().removeListenerForType("LayerPackage"), this.container.html(""), this.container = null, this.canvas = null;
  }, e;
});
