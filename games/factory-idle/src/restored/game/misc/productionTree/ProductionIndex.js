/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/misc/productionTree/ProductionIndex
 */
define("game/misc/productionTree/ProductionIndex", ["./Node", "./Link"], function(e, t) {
  var n = function(e2) {
    this.meta = e2, this.nodes = {}, this.producers = {}, this.consumers = {}, this.endNodes = [], this.validStrategies = { buyer: true, seller: true, converter: true };
  };
  return n.prototype.getEndNodes = function() {
    return this.endNodes;
  }, n.prototype.getNode = function(e2) {
    return this.nodes[e2];
  }, n.prototype.build = function() {
    for (var n2 in this.meta.components) {
      var i = this.meta.components[n2];
      if (this.validStrategies[i.strategy.type]) {
        var r = new e(i);
        this.nodes[i.id] = r, this.indexComponent(i), "seller" == i.strategy.type && this.endNodes.push(r);
      }
    }
    for (var o in this.producers) for (var s = 0; s < this.producers[o].length; s++) {
      var a = this.producers[o][s];
      if (this.consumers[o]) for (var u = 0; u < this.consumers[o].length; u++) {
        var c = this.consumers[o][u];
        new t(this.nodes[a.componentId], this.nodes[c.componentId], o);
      }
    }
    return this;
  }, n.prototype.indexComponent = function(e2) {
    var t2 = e2.strategy;
    "buyer" == t2.type ? this.addToProducerIndex(e2.id, t2.purchaseResources) : "converter" == t2.type ? (this.addToProducerIndex(e2.id, t2.production), this.addToConsumersIndex(e2.id, t2.inputResources)) : "seller" == t2.type && this.addToConsumersIndex(e2.id, t2.resources);
  }, n.prototype.addToProducerIndex = function(e2, t2) {
    for (var n2 in t2) this.producers[n2] || (this.producers[n2] = []), this.producers[n2].push({ componentId: e2, resourceId: n2 });
  }, n.prototype.addToConsumersIndex = function(e2, t2) {
    for (var n2 in t2) this.consumers[n2] || (this.consumers[n2] = []), this.consumers[n2].push({ componentId: e2, resourceId: n2 });
  }, n;
});
