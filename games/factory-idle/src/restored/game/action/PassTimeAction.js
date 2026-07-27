/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/action/PassTimeAction
 */
define("game/action/PassTimeAction", [], function() {
  var e = function(e2, t) {
    this.game = e2, this.seconds = t, this.ticks = this.seconds * this.game.getTicker().getNormalTicksPerSec(), this.profit = this.game.getStatistics().getAvgProfit() * this.ticks, this.researchPoints = this.game.getStatistics().getAvgResearchPointsProduction() * this.ticks;
  };
  return e.prototype.getTicks = function() {
    return this.ticks;
  }, e.prototype.getProfit = function() {
    return this.profit;
  }, e.prototype.getResearchPoints = function() {
    return this.researchPoints;
  }, e.prototype.canPassTime = function() {
    return this.game.getTicker().getTimeTravelTickets() > 0;
  }, e.prototype.passTime = function() {
    this.game.addMoney(this.profit), this.game.addResearchPoints(this.researchPoints), this.game.getTicker().addNoOfTicks(this.ticks), this.game.getTicker().getTimeTravelTickets() > 0 && this.game.getTicker().addTimeTravelTickets(-1);
  }, e;
});
