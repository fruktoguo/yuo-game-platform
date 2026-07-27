/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/misc/productionTree2/ProductionTreeBuilder
 */
define("game/misc/productionTree2/ProductionTreeBuilder", ["./Node", "game/strategy/Factory"], function(e, t) {
  var n = function(e2) {
    this.factory = e2, this.meta = e2.getGame().getMeta();
  };
  return n.prototype.buildTree = function(t2, n2) {
    var i = new e(this.meta.componentsById[t2], 1, 0);
    return this._buildTree(i, n2), i;
  }, n.prototype._buildTree = function(t2, n2) {
    if (!(n2 <= 0)) for (var i in this.meta.productionTree[t2.getComponentMeta().id]) {
      var r = this.meta.productionTree[t2.getComponentMeta().id][i], o = new e(this.meta.componentsById[r], 1, t2.getLevel() + 1);
      this._balanceNode(t2, o, i), o.setParent(t2), t2.addChild(i, o), this._buildTree(o, n2 - 1);
    }
  }, n.prototype._balanceNode = function(e2, t2, n2) {
    var i = this.getConsumption(this.meta.componentsById[e2.getComponentMeta().id], n2), r = this.getProduction(this.meta.componentsById[t2.getComponentMeta().id], n2), o = this.findLeastCommonMultiple(i * e2.getAmount(), r), s = Math.round(o / i), a = Math.round(o / r);
    if (s > e2.getAmount()) {
      var u = s / e2.getAmount();
      e2.getRoot().multiplyAmount(u);
    }
    t2.setAmount(a);
  }, n.prototype.findLeastCommonMultiple = function(e2, t2) {
    if (!e2 || !t2) return 0;
    for (var n2 = Math.abs(e2), i = Math.abs(t2); i; ) {
      var r = i;
      i = n2 % i, n2 = r;
    }
    return Math.abs(e2 * t2 / n2);
  }, n.prototype.getProduction = function(e2, n2) {
    var i = 0, r = t.getStrategyClass(e2.strategy.type);
    return "buyer" == e2.strategy.type ? i = r.getMetaBuyAmount(e2, n2, this.factory) : "converter" == e2.strategy.type && (i = r.getMetaProduceAmount(e2, n2, this.factory)), i / e2.strategy.interval * 10;
  }, n.prototype.getConsumption = function(e2, n2) {
    var i = 0, r = t.getStrategyClass(e2.strategy.type);
    return "converter" == e2.strategy.type ? i = r.getMetaUseAmount(e2, n2, this.factory) : "seller" == e2.strategy.type && (i = r.getMetaSellAmount(e2, n2, this.factory)), i / e2.strategy.interval * 10;
  }, n;
});
