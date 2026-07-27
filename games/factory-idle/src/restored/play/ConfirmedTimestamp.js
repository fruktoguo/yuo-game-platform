/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：play/ConfirmedTimestamp
 */
define("play/ConfirmedTimestamp", [], function() {
  var e = function(e2) {
    this.serverTs = 0, this.localTs = 0, this.timeDif = 0, this.loaderFunction = e2;
  };
  return e.prototype.init = function(e2) {
    this.loaderFunction(function(t) {
      t && !isNaN(Number(t)) ? this.serverTs = Number(t) : this.serverTs = Math.round(Date.now() / 1e3), this.localTs = Math.round(Date.now() / 1e3), this.timeDif = this.serverTs - this.localTs, logger.info("Ts", "Loaded " + t + " Used: " + this.serverTs + " Dif: " + this.timeDif), e2();
    }.bind(this));
  }, e.prototype.getConfirmedNow = function() {
    return Math.round(Date.now() / 1e3) + this.timeDif;
  }, e;
});
