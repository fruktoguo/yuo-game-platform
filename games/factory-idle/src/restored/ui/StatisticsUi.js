/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/StatisticsUi
 */
define("ui/StatisticsUi", ["text!template/statistics.html", "config/Meta", "game/misc/productionTree/ProductionIndex", "../game/misc/productionTree2/ProductionGraphUi", "game/misc/productionTree2/ProductionTreeBuilder"], function(e, t, n, i, r) {
  var o = function(e2, t2, n2) {
    this.gameUiEm = e2, this.factory = t2, this.imageMap = n2, this.game = t2.getGame(), this.manager = this.game.getAchievementsManager();
  };
  return o.prototype.display = function(t2) {
    this.container = t2, this.container.html(Handlebars.compile(e)({})), this.container.find(".backButton").click(function(e2) {
      this.gameUiEm.invokeEvent(GameUiEvent.SHOW_FACTORY);
    }.bind(this)), this.game.getEventManager().addListener("statisticsUi", GameEvent.GAME_TICK, function() {
      this.update();
    }.bind(this)), new i(new r(this.factory).buildTree("tankSeller", 100), this.imageMap).display(this.container.find(".graph")), this.update();
  }, o.prototype.update = function() {
  }, o.prototype.destroy = function() {
    this.game.getEventManager().removeListenerForType("statisticsUi"), this.gameUiEm.removeListenerForType("statisticsUi"), this.container.html(""), this.container = null;
  }, o;
});
