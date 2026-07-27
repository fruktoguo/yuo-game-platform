/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/calculator/FactoryCalculator
 */
define("game/calculator/FactoryCalculator", ["game/calculator/TransportCalculator"], function(e) {
  var t = function(t2) {
    this.factory = t2, this.transportCalculator = new e(this.factory), this.components = [], this.strategies = {}, this.cachesOk = false;
  };
  return t.prototype.calculate = function() {
    this.cachesOk || this.buildCaches();
    var e2 = { runningCosts: 0, resourceCosts: 0, resourceSales: 0, researchProduction: 0, profit: 0 };
    if (this.factory.getIsPaused()) e2.isPaused = true;
    else {
      for (var t2 = 0; t2 < this.components.length; t2++) this.components[t2].calculateInputTick(e2), this.components[t2].getStrategy().calculateInputTick && this.components[t2].getStrategy().calculateInputTick(e2);
      this.transportCalculator.calculate();
      for (var t2 = 0; t2 < this.components.length; t2++) this.components[t2].getStrategy().calculateOutputTick && this.components[t2].getStrategy().calculateOutputTick(e2);
      this.factory.getEventManager().invokeEvent(FactoryEvent.FACTORY_TICK, e2);
    }
    return e2.profit = e2.resourceSales - e2.resourceCosts - e2.runningCosts, e2;
  }, t.prototype.buildCaches = function() {
    this.cachesOk = true, this.transportCalculator.buildCaches(), this.components = [];
    for (var e2 = this.factory.getTiles(), t2 = 0; t2 < e2.length; t2++) e2[t2].isMainComponentContainer() && this.components.push(e2[t2].getComponent());
  }, t.prototype.setup = function() {
    this.factory.getEventManager().addListener("FactoryCalculator", FactoryEvent.FACTORY_COMPONENTS_CHANGED, function() {
      this.cachesOk = false;
    }.bind(this));
  }, t.prototype.destroy = function() {
    this.factory.getEventManager().removeListenerForType("FactoryCalculator");
  }, t;
});
