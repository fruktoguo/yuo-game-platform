/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/Factory
 */
define("game/Factory", ["game/Tile", "base/EventManager", "game/UpgradesManager", "game/AreasManager", "game/FactorySetup"], function(e, t, n, i, r) {
  var o = function(r2, o2) {
    this.game = o2, this.isPaused = false, this.isBought = false, this.meta = r2, this.em = new t(FactoryEvent, "Factory"), this.upgardesManager = new n(this), this.tiles = [];
    for (var s = 0; s < this.meta.tilesY; s++) for (var a = 0; a < this.meta.tilesX; a++) {
      var u = this.meta.terrains[r2.terrainMap[s * this.meta.tilesX + a]], c = r2.buildMap[s * this.meta.tilesX + a];
      this.tiles[s * this.meta.tilesX + a] = new e(a, s, c, u, this);
    }
    this.areasManager = new i(this);
  };
  return o.prototype.reset = function() {
    for (var e2 = 0; e2 < this.tiles.length; e2++) this.tiles[e2].setComponent(null);
    new r(this).init();
  }, o.prototype.getEventManager = function() {
    return this.em;
  }, o.prototype.getUpgradesManager = function() {
    return this.upgardesManager;
  }, o.prototype.getAreasManager = function() {
    return this.areasManager;
  }, o.prototype.getMeta = function() {
    return this.meta;
  }, o.prototype.setIsBought = function(e2) {
    this.isBought = e2;
  }, o.prototype.getIsBought = function() {
    return this.isBought;
  }, o.prototype.getGame = function() {
    return this.game;
  }, o.prototype.getTiles = function() {
    return this.tiles;
  }, o.prototype.getComponents = function() {
    return this.components;
  }, o.prototype.getTile = function(e2, t2) {
    return e2 < 0 || e2 >= this.meta.tilesX || t2 < 0 || t2 >= this.meta.tilesY ? null : this.tiles[t2 * this.meta.tilesX + e2];
  }, o.prototype.getIsPaused = function() {
    return this.isPaused;
  }, o.prototype.setIsPaused = function(e2) {
    this.isPaused = e2;
  }, o.prototype.isOnMap = function(e2, t2, n2, i2) {
    return e2 >= 0 && t2 >= 0 && e2 + n2 <= this.meta.tilesX && t2 + i2 <= this.meta.tilesY;
  }, o.prototype.isPossibleToBuildOnTypeWithSize = function(e2, t2, n2, i2, r2) {
    if (n2 || (n2 = 1), i2 || (i2 = 1), !this.isOnMap(e2, t2, n2, i2)) return false;
    for (var o2 = 0; o2 < n2; o2++) for (var s = 0; s < i2; s++) {
      var a = this.getTile(e2 + o2, t2 + s);
      if (!a || !a.isPossibleToBuildOnType(r2) || a.getComponent()) return false;
    }
    return true;
  }, o.prototype.exportToWriter = function() {
    var e2 = new BinaryArrayWriter();
    e2.writeWriter(this.upgardesManager.exportToWriter()), e2.writeWriter(this.areasManager.exportToWriter()), e2.writeUint8(this.isPaused ? 1 : 0), e2.writeUint8(this.isBought ? 1 : 0), e2.writeUint8(this.meta.tilesX), e2.writeUint8(this.meta.tilesY);
    var t2 = [];
    e2.writeBooleansArrayFunc(this.tiles, function(e3) {
      return !!e3.isMainComponentContainer() && (t2.push(e3), true);
    });
    for (var n2 = 0; n2 < t2.length; n2++) e2.writeUint8(t2[n2].getComponent().getMeta().idNum);
    for (var n2 = 0; n2 < t2.length; n2++) t2[n2].exportToWriter1(e2);
    for (var n2 = 0; n2 < t2.length; n2++) t2[n2].exportToWriter2(e2);
    return e2;
  }, o.prototype.importFromReader = function(e2, t2) {
    this.upgardesManager.importFromReader(e2.readReader(), t2), this.areasManager.importFromReader(e2.readReader(), t2), this.isPaused = !!e2.readUint8(), this.isBought = !!e2.readUint8();
    for (var n2 = e2.readUint8(), i2 = e2.readUint8(), r2 = 0; r2 < this.tiles.length; r2++) this.tiles[r2].setComponent(null);
    var o2 = [];
    e2.readBooleanArrayFunc(n2 * i2, function(e3, t3) {
      t3 && o2.push(this.tiles[Math.floor(e3 / n2) * this.meta.tilesX + e3 % n2]);
    }.bind(this));
    for (var r2 = 0; r2 < o2.length; r2++) o2[r2].setComponent(this.getGame().getMeta().componentsByIdNum[e2.readUint8()]);
    for (var r2 = 0; r2 < o2.length; r2++) o2[r2].importFromReader1(e2, t2);
    for (var r2 = 0; r2 < o2.length; r2++) o2[r2].importFromReader2(e2, t2);
    this.em.invokeEvent(FactoryEvent.FACTORY_COMPONENTS_CHANGED);
  }, o;
});
