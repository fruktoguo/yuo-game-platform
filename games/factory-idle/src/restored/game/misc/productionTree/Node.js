/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/misc/productionTree/Node
 */
define("game/misc/productionTree/Node", [], function() {
  var e = function(e2) {
    this.component = e2, this.producers = [], this.consumpers = [];
  };
  return e.prototype.getComponent = function() {
    return this.component;
  }, e.prototype._addConsumerLink = function(e2) {
    this.consumpers.push(e2);
  }, e.prototype._addProducerLink = function(e2) {
    this.producers.push(e2);
  }, e.prototype.toGraph = function(e2, t, n, i) {
    if (n[this.component.id]) {
      if (i > n[this.component.id].level) {
        n[this.component.id].level = i;
        for (var r in this.producers) this.producers[r].getProducerNode().toGraph(e2, t, n, i + 1);
      }
    } else {
      var o = { id: this.component.id, label: this.component.name, shape: "box", level: i };
      n[this.component.id] = o, e2.push(o);
      for (var r in this.producers) this.producers[r].toGraph(e2, t, n, i + 1), this.producers[r].getProducerNode().toGraph(e2, t, n, i + 1);
    }
  }, e;
});
