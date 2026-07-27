/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/upgrades/strategy/ResearchCenterMaxStock
 */
define("game/upgrades/strategy/ResearchCenterMaxStock", ["./AbstractUpgrade"], function(e) {
  var t = function(e2, t2, n) {
    this.meta = e2, this.amount = t2, this.factory = n;
  };
  return t.prototype.updateMap = function(e2) {
    e2.byComponent[this.meta.componentId].maxStorageBonus += this.getTotalMultiplier();
  }, t.prototype.getNextMultiplier = e.getNextMultiplier, t.prototype.getTotalMultiplier = e.getTotalMultiplier, t.prototype.getMultiplierStrings = e.getMultiplierStrings, t.prototype.getTitle = function() {
    return "Max stock size";
  }, t.prototype.getDescription = function() {
    var e2 = this.factory.getGame().getMeta().componentsById[this.meta.componentId], t2 = this.getMultiplierStrings();
    return "<b>" + e2.name + '</b> max stock increased by <b class="green">' + t2.next + '</b><br /><br /> <b>Current total increase: </b><b class="green">' + t2.total + "</b> ";
  }, t;
});
