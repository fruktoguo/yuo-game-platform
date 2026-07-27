/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/upgrades/strategy/RunningCostUpgrade
 */
define("game/upgrades/strategy/RunningCostUpgrade", ["./AbstractUpgrade"], function(e) {
  var t = function(e2, t2, n) {
    this.meta = e2, this.amount = t2, this.factory = n;
  };
  return t.prototype.updateMap = function(e2) {
    e2.byComponent[this.meta.componentId].runningCostPerTickBonus -= this.getTotalMultiplier();
  }, t.prototype.getNextMultiplier = e.getNextMultiplier, t.prototype.getTotalMultiplier = e.getTotalMultiplier, t.prototype.getMultiplierStrings = e.getMultiplierStrings, t.prototype.getTitle = function() {
    return "Reduce running costs";
  }, t.prototype.getDescription = function() {
    var e2 = this.factory.getGame().getMeta().componentsById[this.meta.componentId], t2 = this.getMultiplierStrings(true);
    return "<b>" + e2.name + '</b> running costs are reduced by <b class="green">' + t2.next + '</b><br /><br /><b>Current total decrease: </b><b class="green">' + t2.total + "</b> ";
  }, t;
});
