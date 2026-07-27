/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/misc/productionTree/Link
 */
define("game/misc/productionTree/Link", [], function() {
  var e = function(e2, t, n) {
    if (!e2) throw new Error("producer must be set for resource " + n);
    if (!t) throw new Error("consumer must be set for resource " + n);
    this.producerNode = e2, this.consumerNode = t, this.resourceId = n, this.producerAmount = null, this.consumerAmount = null, this.calculateStuff(), this.canSupport = Math.round(this.producerAmount / this.consumerAmount * 100) / 100, this.producerNode._addConsumerLink(this), this.consumerNode._addProducerLink(this);
  };
  return e.prototype.calculateStuff = function() {
    var e2, t = this.producerNode.getComponent();
    "buyer" == t.strategy.type ? (e2 = t.strategy.purchaseResources[this.resourceId], this.producerAmount = e2.amount / t.strategy.interval) : "converter" == t.strategy.type && (e2 = t.strategy.production[this.resourceId], this.producerAmount = e2.amount / t.strategy.interval);
    var n = this.consumerNode.getComponent();
    "converter" == n.strategy.type ? (e2 = n.strategy.inputResources[this.resourceId], this.consumerAmount = e2.perOutputResource / n.strategy.interval) : "seller" == n.strategy.type && (e2 = n.strategy.resources[this.resourceId], this.consumerAmount = e2.amount / n.strategy.interval);
  }, e.prototype.getProducerNode = function() {
    return this.producerNode;
  }, e.prototype.getConsumerNode = function() {
    return this.consumerNode;
  }, e.prototype.getResourceId = function() {
    return this.resourceId;
  }, e.prototype.getCanSupport = function() {
    return this.canSupport;
  }, e.prototype.getProducerAmount = function() {
    return this.producerAmount;
  }, e.prototype.getConsumerAmount = function() {
    return this.consumerAmount;
  }, e.prototype.toGraph = function(e2, t, n, i) {
    t.push({ from: this.producerNode.getComponent().id, to: this.consumerNode.getComponent().id, arrows: "to", label: Math.round(100 * this.canSupport) / 100 });
  }, e;
});
