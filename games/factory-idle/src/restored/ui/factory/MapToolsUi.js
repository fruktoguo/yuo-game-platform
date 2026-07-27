/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/factory/MapToolsUi
 */
define("ui/factory/MapToolsUi", ["text!template/factory/mapTools.html"], function(e) {
  var t = "factoryMapToolsUi", n = function(e2) {
    this.factory = e2, this.game = e2.getGame(), this.selectedToolId = null;
  };
  return n.prototype.display = function(n2) {
    var i = this;
    this.container = n2;
    var r = [];
    r.push({ id: "buildable-road", name: "部分可建造区域", showBreak: false });
    for (var o in this.factory.getMeta().terrains) {
      var s = this.factory.getMeta().terrains[o], a = { grass: "异星植被", wall: "岩壁", road: "道路", floor: "工业地坪" };
      r.push({ id: "terrain-" + s, name: a[s] || s, showBreak: false }), s;
    }
    this.container.html(Handlebars.compile(e)({ tools: r })), i.updateMapData(), this.factory.getEventManager().addListener(t, FactoryEvent.FACTORY_MOUSE_MOVE, function(e2) {
      i.container.find(".location").html(e2.x + ":" + e2.y);
    }), this.factory.getEventManager().addListener(t, FactoryEvent.TILE_TYPE_CHANGED, function(e2) {
      i.updateMapData();
    }), this.factory.getEventManager().addListener(t, FactoryEvent.MAP_TOOL_SELECTED, function(e2) {
      i.selectedToolId = e2, i.container.find(".button").removeClass("buttonSelected"), i.container.find(".but" + (e2 || "")).addClass("buttonSelected");
    }), this.factory.getEventManager().addListener(t, FactoryEvent.COMPONENT_META_SELECTED, function(e2) {
      i.factory.getEventManager().invokeEvent(FactoryEvent.MAP_TOOL_SELECTED, null);
    }), this.container.find(".button").click(function(e2) {
      var t2 = $(e2.target).attr("data-id");
      i.factory.getEventManager().invokeEvent(FactoryEvent.COMPONENT_META_SELECTED, null), i.factory.getEventManager().invokeEvent(FactoryEvent.MAP_TOOL_SELECTED, t2 || null);
    });
  }, n.prototype.updateMapData = function() {
    var e2 = this.factory.getTiles(), t2 = this.factory.getMeta(), n2 = {};
    for (var i in t2.terrains) n2[t2.terrains[i]] = i;
    for (var r = "terrainMap: '", i = 0; i < e2.length; i++) r += n2[e2[i].getTerrain()], t2.tilesX;
    r += "',\r\n", r += "buildMap: '";
    for (var i = 0; i < e2.length; i++) r += e2[i].getBuildableType(), t2.tilesX;
    r += "',\r\n", this.container.find("#mapData").html(r);
  }, n.prototype.destroy = function() {
    this.factory.getEventManager().removeListenerForType(t), this.container && this.container.html(""), this.container = null;
  }, n;
});
