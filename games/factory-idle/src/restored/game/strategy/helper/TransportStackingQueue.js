/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/strategy/helper/TransportStackingQueue
 */
define("game/strategy/helper/TransportStackingQueue", ["game/strategy/helper/Package"], function(e) {
  var t = function(e2, t2) {
    this.queue = new Array(e2), this.tile = t2;
  };
  return t.prototype.reset = function() {
    for (var e2 = 0; e2 < this.queue.length; e2++) this.set(e2, void 0);
  }, t.prototype.forward = function() {
    for (var e2 = this.queue.length - 2; e2 >= 0; e2--) this.queue[e2 + 1] || (this.queue[e2 + 1] = this.queue[e2], this.queue[e2] = void 0);
  }, t.prototype.setFirst = function(e2) {
    this.queue[0] = e2;
  }, t.prototype.unsetFirst = function() {
    this.setFirst(void 0);
  }, t.prototype.setLast = function(e2) {
    this.queue[this.queue.length - 1] = e2;
  }, t.prototype.unsetLast = function() {
    this.setLast(void 0);
  }, t.prototype.getLast = function() {
    return this.queue[this.queue.length - 1];
  }, t.prototype.getFirst = function() {
    return this.queue[0];
  }, t.prototype.getQueue = function() {
    return this.queue;
  }, t.prototype.get = function(e2) {
    return this.queue[e2];
  }, t.prototype.set = function(e2, t2) {
    this.queue[e2] = t2 || void 0;
  }, t.prototype.getLength = function() {
    return this.queue.length;
  }, t.prototype.toString = function() {
    return this.queue.join(",");
  }, t.prototype.exportToWriter = function(t2) {
    for (var n = 0; n < this.queue.length; n++) e.staticExportData(this.queue[n], t2);
  }, t.prototype.importFromReader = function(t2, n) {
    for (var i = 0; i < this.queue.length; i++) this.set(i, e.createFromExport(this.tile.getFactory(), t2, n));
  }, t.test = function() {
    var e2 = function(e3, t2) {
      var i = n.getQueue().join(","), r = e3.join(",");
      if (i != r) throw new Error("StackQueue test " + t2 + " failed. Expected " + r + " but got " + i);
    }, n = new t(3);
    n.setFirst("A"), e2(["A", null, null], 1), n.forward(), e2([null, "A", null], 2), n.forward(), e2([null, null, "A"], 3), n.setFirst("B"), e2(["B", null, "A"], 4), n.forward(), e2([null, "B", "A"], 5), n.setLast(null), e2([null, "B", null], 6), n.forward(), e2([null, null, "B"], 7), n.setLast(null), e2([null, null, null], 8), n.forward(), e2([null, null, null], 9), n.forward(), e2([null, null, null], 10);
  }, t;
});
