/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/calculator/TransportCalculator
 */
define("game/calculator/TransportCalculator", [], function() {
  var e = function(e2) {
    this.factory = e2, this.endTiles = [], this.doneIndex = [], this.queue = [], this.queueChecked = 0;
  };
  return e.prototype.calculate = function() {
    this.doneIndex.length = 0, this.queue.length = 0, this.queueChecked = 0;
    for (var e2 in this.endTiles) this.queue.push(this.endTiles[e2]), this.log(this.endTiles[e2].getIdStr() + " added to queue as end tile");
    for (; this.queue.length > this.queueChecked; ) this.step(this.queue[this.queueChecked]), this.queueChecked++;
  }, e.prototype.log = function(e2) {
  }, e.prototype.step = function(e2) {
    if (!this.doneIndex[e2.getId()]) {
      var t = e2.getInputOutputManager().getOutputsList();
      if (t.length > 1) {
        for (var n = 0, i = 0; i < t.length; i++) this.doneIndex[t[i].getId()] && n++;
        if (t.length != n) return void this.log(e2.getIdStr() + " skipped, not all outputs calculated!");
      }
      this.doneIndex[e2.getId()] = true, this.log("Calculate " + e2.getIdStr()), e2.getComponent().getStrategy().calculateTransport && e2.getComponent().getStrategy().calculateTransport();
      for (var r = e2.getInputOutputManager().getInputsList(), i = 0; i < r.length; i++) this.queue.push(r[i]), this.log(r[i].getIdStr() + " added to queue");
    }
  }, e.prototype.buildCaches = function() {
    this.endTiles = [];
    var e2 = this.factory.getTiles();
    for (var t in e2) e2[t].getComponent() && (0 != e2[t].getInputOutputManager().getOutputsList().length && "transport" == e2[t].getComponent().getMeta().strategy.type || this.endTiles.push(e2[t]));
  }, e;
});
