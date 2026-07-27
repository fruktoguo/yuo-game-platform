/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/factory/ComponentsUi
 */
define("ui/factory/ComponentsUi", ["text!template/factory/components.html", "../../game/action/BuyComponentAction"], function(e, t) {
  var n = function(e2, t2) {
    this.globalUiEm = e2, this.factory = t2, this.game = t2.getGame(), this.lastSelectedComponentId = null, this.selectedComponentId = null;
  };
  return n.prototype.display = function(n2) {
    var i = this;
    this.container = n2;
    for (var r = [], o = 0; o < this.game.getMeta().componentsSelection.length; o++) {
      r[o] = { sub: [] };
      for (var s = 0; s < this.game.getMeta().componentsSelection[o].length; s++) {
        var a = this.game.getMeta().componentsSelection[o][s], u = this.game.getMeta().componentsById[a];
        r[o].sub[s] = {}, u && t.possibleToBuy(this.factory, u) ? r[o].sub[s] = { id: u.id, name: u.name, style: "background-position: -" + 26 * u.iconX + "px -" + 26 * u.iconY + "px" } : "noComponent" == a && (r[o].sub[s] = { name: "取消选择", style: "background-position: 0px 0px" });
      }
    }
    this.container.html(Handlebars.compile(e)({ components: r })), this.factory.getEventManager().addListener("componentsUi", FactoryEvent.COMPONENT_META_SELECTED, function(e2) {
      i.selectedComponentId != e2 && (i.lastSelectedComponentId = i.selectedComponentId), i.selectedComponentId = e2, i.container.find(".button").removeClass("buttonSelected"), i.container.find(".but" + (e2 || "")).addClass("buttonSelected");
    }), this.container.find(".button").click(function(e2) {
      var t2 = $(e2.target).attr("data-id");
      i.factory.getEventManager().invokeEvent(FactoryEvent.COMPONENT_META_SELECTED, t2 || null);
    }), this.container.find(".button").mouseenter(function(e2) {
      var t2 = $(e2.target).attr("data-id");
      i.factory.getEventManager().invokeEvent(FactoryEvent.HOVER_COMPONENT_META, t2 || null);
    }), this.container.find(".button").mouseleave(function(e2) {
      $(e2.target).attr("data-id");
      i.factory.getEventManager().invokeEvent(FactoryEvent.HOVER_COMPONENT_META, null);
    }), this.globalUiEm.addListener("componentsUi", GlobalUiEvent.KEY_PRESS, function(e2) {
      var t2 = void 0 !== e2.charCode ? e2.charCode : e2.keyCode;
      0 !== t2 && 32 !== t2 || (i.factory.getEventManager().invokeEvent(FactoryEvent.COMPONENT_META_SELECTED, i.selectedComponentId ? null : i.lastSelectedComponentId), e2.preventDefault());
    }), this.container.find("#makeScreenShotButton").click(function() {
      i.globalUiEm.invokeEvent(FactoryEvent.OPEN_SCREENSHOT_VIEW);
    }), this.factory.getEventManager().invokeEvent(FactoryEvent.COMPONENT_META_SELECTED, null);
  }, n.prototype.destroy = function() {
    this.factory.getEventManager().removeListenerForType("componentsUi"), this.game.getEventManager().removeListenerForType("componentsUi"), this.globalUiEm.removeListenerForType("componentsUi"), this.container.html(""), this.container = null;
  }, n;
});
