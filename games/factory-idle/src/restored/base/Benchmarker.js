/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：base/Benchmarker
 */
define("base/Benchmarker", [], function() {
  var e = function(e2) {
    this.name = e2, this.timeSpent = 0, this.count = 0, this.weightSum = 0, this.lastStartTime = null, this.firstStartTime = null, this.interval = null, this.intervalValue = 2e3;
  };
  return e.prototype.init = function() {
    this.firstStartTime = (/* @__PURE__ */ new Date()).getTime(), this.interval = setInterval(function() {
      var e2 = (/* @__PURE__ */ new Date()).getTime(), t = e2 - this.firstStartTime;
      logger.info("Bench:" + this.name, "AVG: " + this.timeSpent + "ms / " + t + "ms (Runs: " + this.weightSum + ", Avg run time: " + Math.round(this.timeSpent / this.weightSum * 10) / 10 + "ms) CPU time spent: " + Math.round(100 * this.timeSpent / t * 100) / 100 + "%"), this.timeSpent = 0, this.count = 0, this.weightSum = 0, this.firstStartTime = (/* @__PURE__ */ new Date()).getTime();
    }.bind(this), this.intervalValue);
  }, e.prototype.destroy = function() {
    this.interval && clearInterval(this.interval);
  }, e.prototype.start = function() {
    this.lastStartTime = (/* @__PURE__ */ new Date()).getTime();
  }, e.prototype.stop = function(e2) {
    this.timeSpent += (/* @__PURE__ */ new Date()).getTime() - this.lastStartTime, this.count++, this.weightSum += e2;
  }, e;
});
