/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/action/UpdateTileAction
 */
define("game/action/UpdateTileAction", ["game/Tile"], function(e) {
  var t = function(e2, t2) {
    this.tile = e2, this.factory = e2.getFactory(), this.toolId = t2;
  };
  return t.prototype.canUpdate = function() {
    return !!this.toolId;
  }, t.prototype.update = function() {
    var t2 = this.toolId.split("-");
    "terrain" == t2[0] ? (this.tile.setTerrain(t2[1]), this.tile.getFactory().getMeta().buildableTerrains[t2[1]] ? this.tile.setBuildableType(e.BUILDABLE_YES) : this.tile.setBuildableType(e.BUILDABLE_NO)) : "buildable" == t2[0] && "road" == t2[1] && this.tile.setBuildableType(e.BUILDABLE_PARTIAL), this.factory.getEventManager().invokeEvent(FactoryEvent.TILE_TYPE_CHANGED, this.tile);
  }, t;
});
