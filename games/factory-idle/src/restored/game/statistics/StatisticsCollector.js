/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/statistics/StatisticsCollector
 */
define("game/statistics/StatisticsCollector", [], function() {
  var e = function(e2) {
    this.config = e2, this.reset();
  };
  return e.prototype.getData = function() {
    return this.data;
  }, e.prototype._buildDataStructure = function(e2) {
    for (var t = { variables: {}, sampleCounter: 0 }, n = 0; n < this.config.fields.length; n++) t.variables[this.config.fields[n]] = { sum: 0, values: [], sample: null };
    return e2.child && (t.addToChildCounter = 0, t.child = this._buildDataStructure(e2.child)), t;
  }, e.prototype.reset = function() {
    this.data = this._buildDataStructure(this.config);
  }, e.prototype.handleInput = function(e2) {
    this._handleCollector(this.config, this.data, e2);
  }, e.prototype._handleCollector = function(e2, t, n) {
    t.sampleCounter++;
    for (var i = {}, r = 0; r < e2.fields.length; r++) {
      var o = e2.fields[r], s = t.variables[o];
      s.sum += n[o], s.values.length >= e2.max_values_length && (s.sum -= s.values.shift()), s.values.push(n[o]);
      var a = s.sum / s.values.length;
      t.sampleCounter >= e2.sample_interval && (s.sample = a), i[o] = a;
    }
    t.sampleCounter >= e2.sample_interval && (t.sampleCounter = 0), e2.child && e2.add_to_child_interval && ++t.addToChildCounter >= e2.add_to_child_interval && (t.addToChildCounter = 0, this._handleCollector(e2.child, t.child, i));
  }, e;
});
