/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/factory/mapLayers/helper/MouseInfoHelper
 */
define("ui/factory/mapLayers/helper/MouseInfoHelper", ["game/action/BuyComponentAction", "ui/helper/TipUi"], function(e, t) {
  var n = function(e2, t2, n2) {
    this.factory = e2, this.game = e2.getGame(), this.imageMap = t2, this.tileSize = n2, this.lastTip = null;
  };
  return n.prototype.display = function(e2) {
    this.container = e2;
  }, n.prototype.destroy = function() {
    this.container = null;
  }, n.prototype.updateMouseInformationModes = function(t2, n2) {
    if (!n2 || !t2) return this.turnOffBuildMode(), this.turnOffCantBuildMode(), void this.turnOffNotEnoughMoneyTip();
    var i = this.game.getMeta().componentsById[t2], r = this.factory.isPossibleToBuildOnTypeWithSize(n2.x, n2.y, i.width, i.height, i), o = this.factory.getAreasManager().canBuildAt(n2.x, n2.y, i.width, i.height), s = !this.factory.isOnMap(n2.x, n2.y, i.width, i.height), a = this.factory.getTile(n2.x, n2.y), u = new e(a, i);
    s ? this.turnOffBuildMode() : this.updateBuildMode(t2, n2), r && o || s ? u.canBuy() ? (this.turnOffCantBuildMode(), this.turnOffNotEnoughMoneyTip()) : (this.updateCantBuildMode(t2, n2), this.updateNotEnoughMoneyTip()) : this.updateCantBuildMode(t2, n2);
  }, n.prototype.updateComponentSelected = function(e2) {
    if (!e2) return void this.turnOffComponentSelected();
    var t2 = e2.getMeta();
    if (!this.componentSelectedElement) {
      this.componentSelectedElement = $(this.imageMap.getImage("blueSelection")), this.container.append(this.componentSelectedElement);
    }
    this.componentSelectedElement.css("position", "absolute").css("opacity", 0.5).css("pointer-events", "none").css("left", e2.getX() * this.tileSize).css("top", e2.getY() * this.tileSize).css("width", this.tileSize * t2.width).css("height", this.tileSize * t2.height);
  }, n.prototype.turnOffComponentSelected = function() {
    this.componentSelectedElement && (this.componentSelectedElement.remove(), this.componentSelectedElement = null);
  }, n.prototype.updateBuildMode = function(e2, t2) {
    var n2 = this.game.getMeta().componentsById[e2];
    if (!this.mouseSelectionElement) {
      this.mouseSelectionElement = $(this.imageMap.getImage("yellowSelection")), this.container.append(this.mouseSelectionElement);
    }
    this.mouseSelectionElement.css("position", "absolute").css("opacity", 0.5).css("pointer-events", "none").css("left", t2.x * this.tileSize).css("top", t2.y * this.tileSize).css("width", this.tileSize * n2.width).css("height", this.tileSize * n2.height);
  }, n.prototype.turnOffBuildMode = function() {
    this.mouseSelectionElement && (this.mouseSelectionElement.remove(), this.mouseSelectionElement = null);
  }, n.prototype.updateCantBuildMode = function(e2, t2) {
    var n2 = this.game.getMeta().componentsById[e2];
    this.cantPlaceElement || (this.cantPlaceElement = $(this.imageMap.getImage("cantPlace")), this.container.append(this.cantPlaceElement)), this.cantPlaceElement.css("position", "absolute").css("opacity", 0.5).css("pointer-events", "none").css("left", t2.x * this.tileSize).css("top", t2.y * this.tileSize).css("width", this.tileSize * n2.width).css("height", this.tileSize * n2.height);
  }, n.prototype.turnOffCantBuildMode = function() {
    this.cantPlaceElement && (this.cantPlaceElement.remove(), this.cantPlaceElement = null);
  }, n.prototype.updateNotEnoughMoneyTip = function() {
    this.lastTip || (this.lastTip = new t(this.container, '<span class="red">资金不足，暂时无法建造。</span>').init(), $("body").css("cursor", "no-drop"));
  }, n.prototype.turnOffNotEnoughMoneyTip = function() {
    this.lastTip && (this.lastTip.destroy(), this.lastTip = null, $("body").css("cursor", ""));
  }, n;
});
