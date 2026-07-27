/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：Main
 */
var GameUiEvent, GameEvent, FactoryEvent, GlobalUiEvent, ApiEvent;
define("Main", ["config/Meta", "config/config", "config/event/GlobalUiEvent", "config/event/GameUiEvent", "config/event/GameEvent", "config/event/FactoryEvent", "config/event/ApiEvent", "play/Play", "base/ImageMap", "ui/MainUi"], function(e, t, n, i, r, o, s, a, u, c) {
  GameEvent = r, FactoryEvent = o, GameUiEvent = i, GlobalUiEvent = n, ApiEvent = s;
  var l = function() {
  };
  return l.prototype.init = function(e2, t2) {
    this.imageMap = this._createImageMap(), this.imageMap.loadAll(function() {
      this.play = new a(this.userHash, this.api), this.play.init(e2, function() {
        this.play.isDevMode(), this.mainUi = new c(this.play, this.imageMap), this.mainUi.display($("#gameArea")), t2 && t2();
      }.bind(this));
    }.bind(this));
  }, l.prototype._createImageMap = function() {
    return new u(t.imageMap.path).addImages({ yellowSelection: "img/mouse/yellow.png", greenSelection: "img/mouse/green.png", redSelection: "img/mouse/red.png", blueSelection: "img/mouse/selected.png", cantPlace: "img/mouse/cantPlace.png", terrains: "img/terrains.png", components: "img/components.png", componentIcons: "img/componentIcons.png", transportLine: "img/transportLine.png", resources: "img/resources.png" });
  }, l.prototype.destroy = function() {
    this.mainUi.destroy(), this.play.destroy();
  }, l;
});
