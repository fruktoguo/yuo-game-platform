/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/misc/productionTree2/Node
 */
define("game/misc/productionTree2/Node", [], function() {
  var e = function(e2, t, n) {
    this.id = Math.random(), this.componentMeta = e2, this.amount = t, this.level = n, this.parent = null, this.children = {};
  };
  return e.prototype.getId = function() {
    return this.id;
  }, e.prototype.setAmount = function(e2) {
    this.amount = e2;
  }, e.prototype.getAmount = function() {
    return this.amount;
  }, e.prototype.getComponentMeta = function() {
    return this.componentMeta;
  }, e.prototype.getLevel = function() {
    return this.level;
  }, e.prototype.getParent = function() {
    return this.parent;
  }, e.prototype.setParent = function(e2) {
    this.parent = e2;
  }, e.prototype.getChildren = function() {
    return this.children;
  }, e.prototype.hasChildren = function() {
    for (var e2 in this.children) return true;
    return false;
  }, e.prototype.addChild = function(e2, t) {
    this.children[e2] = t;
  }, e.prototype.getRoot = function() {
    return this.parent ? this.parent.getRoot() : this;
  }, e.prototype.multiplyAmount = function(e2) {
    this.amount *= e2;
    for (var t in this.children) this.children[t].multiplyAmount(e2);
  }, e.prototype.toGraph = function(e2, t) {
    var n = { id: this.id, label: this.componentMeta.name + "(" + this.amount + ")", shape: "box", level: this.level };
    if (e2.push(n), this.parent) {
      var i = { from: this.parent.getId(), to: this.id };
      t.push(i);
    }
    for (var r in this.children) this.children[r].toGraph(e2, t);
  }, e.prototype.findLeastCommonMultiplier = function(e2, t) {
    if (!e2 || !t) return 0;
    for (var n = Math.abs(e2), i = Math.abs(t); i; ) {
      var r = i;
      i = n % i, n = r;
    }
    return Math.abs(e2 * t / n);
  }, e;
});
