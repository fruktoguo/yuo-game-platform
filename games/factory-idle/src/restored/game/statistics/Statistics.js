/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/statistics/Statistics
 */
define("game/statistics/Statistics", ["game/statistics/StatisticsCollector"], function(e) {
  var t = function(t2) {
    this.game = t2, this.gameCollector = new e({ max_values_length: 80, sample_interval: 10, fields: ["profit", "researchProduction"] }), this.factoryCollectors = {}, this.game.getMeta().factories.map(function(t3) {
      this.factoryCollectors[t3.id] = new e({ max_values_length: 80, sample_interval: 10, fields: ["profit", "researchProduction"] });
    }.bind(this));
  };
  return t.prototype.init = function() {
    return this.game.getEventManager().addListener("Statistics", GameEvent.GAME_TICK, function(e2) {
      var t2 = { profit: e2.profit, researchProduction: e2.researchProduction };
      this.gameCollector.handleInput(t2);
      for (var n = this.game.getMeta().factories, i = 0; i < n.length; i++) {
        var r = e2.factory_results[n[i].id];
        1 != r.isPaused && (t2 = { profit: r.profit, researchProduction: r.researchProduction }, this.factoryCollectors[n[i].id].handleInput(t2));
      }
    }.bind(this)), this;
  }, t.prototype.destroy = function() {
    this.game.getEventManager().removeListenerForType("Statistics");
  }, t.prototype.reset = function() {
    this.gameCollector.reset();
    for (var e2 in this.factoryCollectors) this.factoryCollectors[e2].reset();
  }, t.prototype.getAvgProfit = function() {
    return this.gameCollector.getData().variables.profit.sample;
  }, t.prototype.getAvgResearchPointsProduction = function() {
    return this.gameCollector.getData().variables.researchProduction.sample;
  }, t.prototype.getFactoryAvgProfit = function(e2) {
    return this.factoryCollectors[e2].getData().variables.profit.sample;
  }, t.prototype.getFactoryAvgResearchPointsProduction = function(e2) {
    return this.factoryCollectors[e2].getData().variables.researchProduction.sample;
  }, t.prototype.exportToWriter = function() {
    return new BinaryArrayWriter();
  }, t.prototype.importFromReader = function(e2, t2) {
  }, t;
});
