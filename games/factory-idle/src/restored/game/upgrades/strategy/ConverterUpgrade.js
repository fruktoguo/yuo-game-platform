/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/upgrades/strategy/ConverterUpgrade
 */
define("game/upgrades/strategy/ConverterUpgrade", ["./AbstractUpgrade"], function(e) {
  var t = function(e2, t2, n) {
    this.meta = e2, this.amount = t2, this.factory = n;
  };
  return t.prototype.updateMap = function(e2) {
    var t2 = this.getTotalMultiplier();
    e2.byComponent[this.meta.componentId].runningCostPerTickIncrease += t2, e2.byComponent[this.meta.componentId].convertAmountBonus += t2, e2.byComponent[this.meta.componentId].maxStorageBonus += t2;
  }, t.prototype.getNextMultiplier = e.getNextMultiplier, t.prototype.getTotalMultiplier = e.getTotalMultiplier, t.prototype.getMultiplierStrings = e.getMultiplierStrings, t.prototype.getTitle = function() {
    return "Amount of resources used and produced amount";
  }, t.prototype.getDescription = function() {
    var e2 = this.factory.getGame().getMeta().componentsById[this.meta.componentId], t2 = this.getMultiplierStrings();
    return "<b>" + e2.name + '</b> uses and produces <b class="green">' + t2.next + "</b> more resources.<br />" + (this.meta.noRunningCost ? "" : 'Increases running cost by <b class="red">' + t2.next + "</b><br />") + '<br />More production per component, but expenses are proportionally the same. More production per component => more resources to sell.<br /><br /><b>Current total increase: </b><b class="green">' + t2.total + "</b> ";
  }, t;
});
