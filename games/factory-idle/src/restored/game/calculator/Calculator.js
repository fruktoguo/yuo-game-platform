/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/calculator/Calculator
 */
define("game/calculator/Calculator", ["game/calculator/FactoryCalculator"], function(e) {
  var t = function(t2) {
    this.game = t2, this.factoryCalculators = {};
    for (var n in this.game.getMeta().factoriesById) this.factoryCalculators[n] = new e(this.game.getFactory(n));
  };
  return t.prototype.init = function() {
    for (var e2 in this.factoryCalculators) this.factoryCalculators[e2].setup();
    return this;
  }, t.prototype.destroy = function() {
    for (var e2 in this.factoryCalculators) this.factoryCalculators[e2].destroy();
  }, t.prototype.calculate = function() {
    var e2 = ((/* @__PURE__ */ new Date()).getTime(), { profit: 0, researchProduction: 0, factory_results: {} });
    for (var t2 in this.factoryCalculators) {
      var n = this.factoryCalculators[t2].calculate();
      e2.profit += n.profit, e2.researchProduction += n.researchProduction, e2.factory_results[t2] = n;
    }
    return this.game.addMoney(e2.profit), this.game.addResearchPoints(e2.researchProduction), e2;
  }, t;
});
