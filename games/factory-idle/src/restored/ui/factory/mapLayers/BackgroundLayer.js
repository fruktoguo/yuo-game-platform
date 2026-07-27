/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/factory/mapLayers/BackgroundLayer
 */
define("ui/factory/mapLayers/BackgroundLayer", [], function() {
  var e = function(e2, t, n) {
    this.imageMap = e2, this.factory = t, this.tileSize = n.tileSize, this.tilesX = t.getMeta().tilesX, this.tilesY = t.getMeta().tilesY;
  };
  return e.prototype.display = function(e2) {
    this.container = e2, this.canvas = document.createElement("canvas"), this.canvas.style.position = "absolute", this.canvas.width = this.tilesX * this.tileSize, this.canvas.height = this.tilesY * this.tileSize, e2.append(this.canvas), this.sprite = this.imageMap.getImage("terrains"), this.redraw(), this.factory.getEventManager().addListener("LayerBackground", FactoryEvent.TILE_TYPE_CHANGED, function() {
      this.redraw();
    }.bind(this)), this.shouldDrawBuildableAreas = false, this.factory.getEventManager().addListener("LayerBackground", FactoryEvent.MAP_TOOL_SELECTED, function(e3) {
      this.shouldDrawBuildableAreas = !!e3, this.redraw();
    }.bind(this));
  }, e.prototype.getCanvas = function() {
    return this.canvas;
  }, e.prototype.redraw = function() {
    var e2 = this.canvas.getContext("2d");
    e2.clearRect(0, 0, this.canvas.width, this.canvas.height);
    var t = { undefined: { y: 0, tiles: 6 }, grass: { y: 0, tiles: 6 }, floor: { y: 1, tiles: 6 }, wall: { y: 1, tiles: 6 }, road: { y: 0, tiles: 6 } };
    this.drawTerrain(e2, t);
    for (var n = this.factory.getTiles(), i = 0; i < n.length; i++) {
      var r = n[i];
      "wall" == r.getTerrain() && this.drawTerrainBorders(e2, r, 7, 1, { grass: true, road: true }), "floor" == r.getTerrain() && this.drawTerrainBorders(e2, r, 7, 1, { grass: true, road: true }), "road" == r.getTerrain() && this.drawRoad(e2, r, 2, { road: true }), "wall" == r.getTerrain() && this.drawTerrainBorders(e2, r, 10, 6, { floor: true, grass: true, road: true });
    }
    this.shouldDrawBuildableAreas && this.drawBuildableAreas();
  }, e.prototype.drawBuildableAreas = function() {
    for (var e2 = { " ": "greenSelection", "-": "yellowSelection", X: "redSelection" }, t = this.canvas.getContext("2d"), n = this.factory.getTiles(), i = 0; i < n.length; i++) {
      var r = n[i], o = this.imageMap.getImage(e2[r.getBuildableType()]), s = r.getX() * this.tileSize, a = r.getY() * this.tileSize;
      t.drawImage(o, s, a, this.tileSize, this.tileSize);
    }
  }, e.prototype.drawTerrain = function(e2, t) {
    for (var n = this.factory.getTiles(), i = 0; i < n.length; i++) {
      var r = n[i], o = r.getX() * this.tileSize, s = r.getY() * this.tileSize, a = t[r.getTerrain()], u = Math.floor(a.tiles * Math.random()) * (this.tileSize + 1), c = a.y * (this.tileSize + 1);
      e2.drawImage(this.sprite, u, c, this.tileSize, this.tileSize, o, s, this.tileSize, this.tileSize);
    }
  }, e.prototype.drawTerrainBorders = function(e2, t, n, i, r) {
    var o = !t.getTileInDirection("top") || r[t.getTileInDirection("top").getTerrain()], s = !t.getTileInDirection("right") || r[t.getTileInDirection("right").getTerrain()], a = !t.getTileInDirection("bottom") || r[t.getTileInDirection("bottom").getTerrain()], u = !t.getTileInDirection("left") || r[t.getTileInDirection("left").getTerrain()], c = !t.getTileInDirection("top_right") || r[t.getTileInDirection("top_right").getTerrain()], l = !t.getTileInDirection("top_left") || r[t.getTileInDirection("top_left").getTerrain()], h = !t.getTileInDirection("bottom_right") || r[t.getTileInDirection("bottom_right").getTerrain()], p = !t.getTileInDirection("bottom_left") || r[t.getTileInDirection("bottom_left").getTerrain()], d = this.tileSize, g = d + 1, m = t.getX() * this.tileSize, f = t.getY() * this.tileSize, X = n * g, y = (n + 1) * g, v = (n + 2) * g, i = Math.floor(i * Math.random()) * g;
    o && s && e2.drawImage(this.sprite, 3 * g + 10, v + 0, 11, 11, m + 10, f + 0, 11, 11), o && u && e2.drawImage(this.sprite, 3 * g + 0, v + 0, 11, 11, m + 0, f + 0, 11, 11), a && s && e2.drawImage(this.sprite, 3 * g + 10, v + 10, 11, 11, m + 10, f + 10, 11, 11), a && u && e2.drawImage(this.sprite, 3 * g + 0, v + 10, 11, 11, m + 0, f + 10, 11, 11), !c || o || s || e2.drawImage(this.sprite, 0 * g + 10, v + 0, 11, 11, m + 10, f + 0, 11, 11), !l || o || u || e2.drawImage(this.sprite, 0 * g + 0, v + 0, 11, 11, m + 0, f + 0, 11, 11), !h || a || s || e2.drawImage(this.sprite, 0 * g + 10, v + 10, 11, 11, m + 10, f + 10, 11, 11), !p || a || u || e2.drawImage(this.sprite, 0 * g + 0, v + 10, 11, 11, m + 0, f + 10, 11, 11);
    var b = u ? 10 : 0, S = s ? 10 : 0, G = o ? 10 : 0, T = a ? 10 : 0;
    o && e2.drawImage(this.sprite, i + 0 + b, X + 0 + 0, d - b - S, 11, m + 0 + b, f + 0, d - b - S, 11), a && e2.drawImage(this.sprite, i + 0 + b, X + 0 + 10, d - b - S, 11, m + 0 + b, f + 10, d - b - S, 11), s && e2.drawImage(this.sprite, i + 10, y + 0 + G, 11, d - G - T, m + 10, f + 0 + G, 11, d - G - T), u && e2.drawImage(this.sprite, i + 0, y + 0 + G, 11, d - G - T, m + 0, f + 0 + G, 11, d - G - T);
  }, e.prototype.drawRoad = function(e2, t, n, i) {
    var r = !t.getTileInDirection("top") || i[t.getTileInDirection("top").getTerrain()], o = !t.getTileInDirection("right") || i[t.getTileInDirection("right").getTerrain()], s = !t.getTileInDirection("bottom") || i[t.getTileInDirection("bottom").getTerrain()], a = !t.getTileInDirection("left") || i[t.getTileInDirection("left").getTerrain()], u = { "0000": [0, 0], 1e3: [1, 0], "0100": [2, 0], "0010": [3, 0], "0001": [4, 0], 1010: [0, 1], "0101": [0, 2], 1100: [0, 3], "0110": [1, 3], "0011": [2, 3], 1001: [3, 3], 1111: [4, 4], 1110: [0, 4], "0111": [1, 4], 1011: [2, 4], 1101: [3, 4] }, c = u[(r ? "1" : "0") + (o ? "1" : "0") + (s ? "1" : "0") + (a ? "1" : "0")];
    e2.drawImage(this.sprite, c[0] * (this.tileSize + 1), (n + c[1]) * (this.tileSize + 1), this.tileSize, this.tileSize, t.getX() * this.tileSize, t.getY() * this.tileSize, this.tileSize, this.tileSize);
  }, e.prototype.destroy = function() {
    this.factory.getEventManager().removeListenerForType("LayerBackground"), this.container.html(""), this.container = null;
  }, e;
});
