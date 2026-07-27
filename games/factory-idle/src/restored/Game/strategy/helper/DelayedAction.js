/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：Game/strategy/helper/DelayedAction
 */
define("Game/strategy/helper/DelayedAction", [], function() {
  var e = function(e2) {
    this.interval = e2, this.reset(), this.calculateEfficiencyInterval = 50;
  };
  return e.prototype.reset = function() {
    this.timer = 0, this.efficiency = null, this.workingTime = 0, this.totalTime = 0;
  }, e.prototype.updateWithDescriptionData = function(e2) {
    e2.effectivenessStr = null !== this.efficiency ? Math.round(this.efficiency) + "%" : "-";
  }, e.prototype.canStart = function() {
    throw new Error("canStart method should be overwritten");
  }, e.prototype.start = function() {
    throw new Error("start method should be overwritten");
  }, e.prototype.finished = function() {
    throw new Error("finished method should be overwritten");
  }, e.prototype.getEfficiency = function() {
    return this.efficiency;
  }, e.prototype.calculate = function(e2) {
    this.timer > 0 && (this.timer >= this.interval && (this.finished(e2), this.timer = -1), this.timer++), 0 == this.timer && this.canStart() && (this.start(e2), this.timer = 1), this.totalTime >= this.calculateEfficiencyInterval && (this.efficiency = Math.round(100 * this.workingTime / this.totalTime), this.totalTime = 0, this.workingTime = 0), this.totalTime++, this.timer > 0 && this.workingTime++;
  }, e.prototype.toString = function() {
    var e2 = "生产状态<br />";
    return e2 += "效率：" + (null === this.efficiency ? "..." : this.efficiency + "%") + "<br />", 0 == this.timer ? e2 += "空闲<br />" : e2 += this.timer + "/" + this.interval + "<br />", e2;
  }, e.prototype.exportToWriter = function(e2) {
    e2.writeUint8(this.timer);
  }, e.prototype.importFromReader = function(e2, t) {
    this.timer = e2.readUint8();
  }, e;
});
