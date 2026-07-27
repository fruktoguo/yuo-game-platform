/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/TimeTravelUi
 */
define("ui/TimeTravelUi", ["text!template/timeTravel.html", "game/action/PassTimeAction"], function(e, t) {
  var n = function(e2, t2) {
    this.gameUiEm = e2, this.play = t2, this.game = t2.getGame(), this.isVisible = false;
  };
  return n.prototype.init = function() {
    return this.gameUiEm.addListener("help", GameUiEvent.SHOW_TIME_TRAVEL, function() {
      this.display();
    }.bind(this)), this;
  }, n.prototype.display = function() {
    if (!this.isVisible) {
      var n2 = new t(this.game, 3600 * this.play.getMeta().timeTravelTicketValue);
      $("body").append(Handlebars.compile(e)({ tickets: this.game.getTicker().getTimeTravelTickets(), hasTickets: this.game.getTicker().getTimeTravelTickets() > 0, ticks: nf(n2.getTicks()), profit: nf(n2.getProfit()), profitPerTick: nf(Math.round(n2.getProfit() / n2.getTicks())), researchPoints: nf(n2.getResearchPoints()), researchPointsPerTick: nf(Math.round(n2.getResearchPoints() / n2.getTicks())) }));
      var i = this;
      this.isVisible = true;
      var r = $("#timeTravel");
      r.css("left", ($("html").width() - r.outerWidth()) / 2), r.find(".getMore").click(function() {
        this.gameUiEm.invokeEvent(GameUiEvent.SHOW_PURCHASES), this.hide();
      }.bind(this)), r.find(".travel").click(function() {
        n2.canPassTime() ? (n2.passTime(), i.hide(), i.display()) : alert("当前没有可用的时间跃迁券。");
      }), r.find(".refresh").click(function() {
        i.hide(), i.display();
      }), r.find(".closeButton").click(function() {
        i.hide();
      }), $("#timeTravelBg").click(function() {
        i.hide();
      });
    }
  }, n.prototype.hide = function() {
    this.isVisible = false, $("#timeTravel").remove(), $("#timeTravelBg").remove();
  }, n.prototype.destroy = function() {
    this.hide(), this.game.getEventManager().removeListenerForType("help"), this.gameUiEm.removeListenerForType("help");
  }, n;
});
