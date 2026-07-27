/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/factory/OverviewUi
 */
define("ui/factory/OverviewUi", ["text!template/factory/overview.html"], function(e) {
  var t = function(e2, t2) {
    this.factory = e2, this.game = e2.getGame(), this.statistics = t2;
  };
  return t.prototype.display = function(t2) {
    var n = this;
    this.container = t2, this.container.html(Handlebars.compile(e)({ researchBought: !!this.game.getResearchManager().getResearch("researchCenter") })), this.game.getEventManager().addListener("factoryOverviewUi", GameEvent.GAME_TICK, function() {
      n.update();
    }), this.update();
  }, t.prototype.update = function() {
    $("#money").html(nf(this.game.getMoney())), $("#research").html(nf(this.game.getResearchPoints()));
    var e2 = this.statistics.getFactoryAvgProfit(this.factory.getMeta().id), t2 = e2 * this.game.getTicker().getTicksPerSec();
    $("#income").html(nf(e2)), $("#incomePerSec").html(nf(t2));
    var n = this.statistics.getFactoryAvgResearchPointsProduction(this.factory.getMeta().id);
    $("#researchIncome").html(nf(n)), $("#ticks").html(nf(this.game.getTicker().getActualTicksPerSec()));
  }, t.prototype.destroy = function() {
    this.game.getEventManager().removeListenerForType("factoryOverviewUi"), this.container.html(""), this.container = null;
  }, t;
});
