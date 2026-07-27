/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：config/main/helper/ProductionCostCalculator
 */
define("config/main/helper/ProductionCostCalculator", [], function() {
  var e = { getSumOfProduction: function(e2) {
    var t2 = 0;
    for (var n in e2) "waste" == n || e2[n].bonus || (t2 += e2[n].amount);
    return t2;
  } }, t = function(t2, n) {
    this.componentsById = t2, this.sourceBuildings = n, this.strategies = { buyer: { selfCost: function(t3, n2) {
      return t3.strategy.interval * t3.runningCostPerTick / e.getSumOfProduction(t3.strategy.purchaseResources) + t3.strategy.purchaseResources[n2].price;
    }, inputCost: function(e2, t3) {
      return 1;
    } }, converter: { selfCost: function(t3) {
      return t3.strategy.interval * t3.runningCostPerTick / e.getSumOfProduction(t3.strategy.production);
    }, inputCost: function(t3, n2) {
      var i = e.getSumOfProduction(t3.strategy.production);
      if (!t3.strategy.inputResources[n2]) throw new Error(t3.id + " can't handle resources: " + n2);
      return t3.strategy.inputResources[n2].perOutputResource / i;
    } }, seller: { selfCost: function(t3) {
      return t3.strategy.interval * t3.runningCostPerTick / e.getSumOfProduction(t3.strategy.resources);
    }, inputCost: function(e2, t3) {
      return 1;
    } } };
  };
  return t.prototype.calculateCostFor = function(e2, t2, n) {
    var i = this.componentsById[e2], r = this.sourceBuildings[e2];
    r || (r = []);
    var o = this.strategies[i.strategy.type], s = 0, a = o.selfCost(i, t2);
    if ("seller" == i.strategy.type) s += this.calculateCostFor(r[t2], t2, n), i.strategy.resources[t2].bonus && (a = 0);
    else for (var u in r) s += this.calculateCostFor(r[u], u, n) * o.inputCost(i, u);
    var c = a + s;
    return n[e2 + "-" + t2] = { self: a, input: s, total: c }, c;
  }, t;
});
