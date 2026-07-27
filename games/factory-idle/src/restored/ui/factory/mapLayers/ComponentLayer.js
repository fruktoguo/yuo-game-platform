/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/factory/mapLayers/ComponentLayer
 */
define("ui/factory/mapLayers/ComponentLayer", ["ui/factory/mapLayers/strategy/Default", "ui/factory/mapLayers/strategy/Track"], function(e, t) {
  var n = function(n2, i, r) {
    this.imageMap = n2, this.factory = i, this.game = i.getGame(), this.tileSize = r.tileSize, this.tilesX = i.getMeta().tilesX, this.tilesY = i.getMeta().tilesY, this.canvas = null, this.strategies = { default: new e(this.imageMap, { tileSize: this.tileSize }), track: new t(this.imageMap, { tileSize: this.tileSize }) }, this.tilesWithComponentCache = [];
  };
  return n.prototype.getCanvas = function() {
    return this.canvas;
  }, n.prototype.display = function(e2) {
    var t2 = this;
    this.container = e2, this.canvas = document.createElement("canvas"), this.canvas.style.position = "absolute", this.canvas.width = this.tilesX * this.tileSize, this.canvas.height = this.tilesY * this.tileSize, e2.append(this.canvas), this.factory.getEventManager().addListener("LayerComponent", FactoryEvent.FACTORY_COMPONENTS_CHANGED, function() {
      t2.buildCache(), t2.redraw();
    }), this.factory.getEventManager().addListener("LayerComponent", FactoryEvent.FACTORY_TICK, function(e3) {
      this.game.getTicker().getIsFocused();
    }.bind(this)), t2.buildCache(), t2.redraw();
  }, n.prototype.buildCache = function() {
    this.tilesWithComponentCache = [];
    for (var e2 = this.factory.getTiles(), t2 = 0; t2 < e2.length; t2++) {
      var n2 = e2[t2];
      n2.getComponent() && this.tilesWithComponentCache.push(n2);
    }
  }, n.prototype.redraw = function() {
    var e2 = this, t2 = this.canvas.getContext("2d");
    t2.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (var n2 = 0; n2 < this.tilesWithComponentCache.length; n2++) {
      var i = this.tilesWithComponentCache[n2], r = i.getComponent().getMeta().drawStrategy;
      r || (r = "default"), e2.strategies[r].drawComponentLayer(t2, i);
    }
  }, n.prototype.destroy = function() {
    this.factory.getEventManager().removeListenerForType("LayerComponent"), this.container.html(""), this.container = null, this.canvas = null;
  }, n;
});
