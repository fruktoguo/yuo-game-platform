/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/FactoriesUi
 */
define("ui/FactoriesUi", ["text!template/factories.html", "ui/helper/AlertUi", "game/action/BuyFactoryAction"], function(e, t, n) {
  var i = function(e2, t2, n2) {
    this.globalUiEm = e2, this.gameUiEm = t2, this.game = n2, this.statistics = n2.getStatistics();
  };
  return i.prototype.display = function(i2) {
    var r = this;
    this.container = i2;
    var o = [], s = this.game.getMeta().factories;
    for (var a in s) {
      var u = s[a], c = this.game.getFactory(u.id);
      o.push({ id: u.id, name: u.name, price: nf(u.price), isBought: c.getIsBought(), isPaused: this.game.getFactory(u.id).getIsPaused() });
    }
    this.container.html(Handlebars.compile(e)({ factories: o, researchBought: !!this.game.getResearchManager().getResearch("researchCenter") })), this.container.find(".selectButton").click(function(e2) {
      var t2 = $(e2.target).attr("data-id");
      r.gameUiEm.invokeEvent(GameUiEvent.SHOW_FACTORY, t2);
    }.bind(this)), this.container.find(".buyButton").click(function(e2) {
      var i3 = $(e2.target).attr("data-id"), o2 = new n(r.game, i3);
      o2.canBuy() ? (o2.buy(), r.gameUiEm.invokeEvent(GameUiEvent.SHOW_FACTORY, i3)) : new t("资金不足", "当前资金不足以解锁这片生产区域。").display();
    }.bind(this)), r.game.getEventManager().addListener("factoriesUi", GameEvent.GAME_TICK, function() {
      this.update();
    }.bind(this)), this.update(), $("#missionsButton").click(function() {
      r.globalUiEm.invokeEvent(GlobalUiEvent.SHOW_MISSIONS);
    }), $("#missionsButton").hide();
  }, i.prototype.update = function() {
    var e2 = this;
    this.container.find("#money").html(nf(this.game.getMoney())), this.container.find("#researchPoints").html(nf(this.game.getResearchPoints()));
    var t2 = this.statistics.getAvgProfit();
    this.container.find("#income").html(t2 ? nf(t2) : " ? ");
    var i2 = this.statistics.getAvgResearchPointsProduction();
    this.container.find("#researchIncome").html(i2 ? nf(i2) : " ? "), this.container.find(".factoryButton").each(function() {
      var t3 = $(this).attr("data-id"), i3 = e2.statistics.getFactoryAvgProfit(t3);
      $(this).find(".money[data-key='income']").html(i3 ? nfPlus(i3) : " ? ");
      var r = e2.statistics.getFactoryAvgResearchPointsProduction(t3);
      $(this).find(".research[data-key='researchProduction']").html(r ? nfPlus(r) : " ? "), new n(e2.game, t3).canBuy() ? $(this).find(".buyButton").removeClass("cantBuy").html("解锁区域") : $(this).find(".buyButton").addClass("cantBuy").html("资金不足");
    }), this.container.find("#ticks").html(nf(this.game.getTicker().getActualTicksPerSec()));
  }, i.prototype.destroy = function() {
    this.globalUiEm.removeListenerForType("factoriesUi"), this.gameUiEm.removeListenerForType("factoriesUi"), this.game.getEventManager().removeListenerForType("factoriesUi"), this.container.html(""), this.container = null;
  }, i;
});
