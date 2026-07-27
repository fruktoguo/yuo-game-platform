/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/upgrades/strategy/GarbageUpgrade
 */
define("game/upgrades/strategy/GarbageUpgrade", ["./AbstractUpgrade"], function(e) {
  var t = function(e2, t2, n) {
    this.meta = e2, this.amount = t2, this.factory = n;
  };
  return t.prototype.updateMap = function(e2) {
    var t2 = this.getTotalMultiplier();
    e2.byComponent[this.meta.componentId].removeAmountBonus += t2, e2.byComponent[this.meta.componentId].maxStorageBonus += t2;
  }, t.prototype.getNextMultiplier = e.getNextMultiplier, t.prototype.getTotalMultiplier = e.getTotalMultiplier, t.prototype.getMultiplierStrings = e.getMultiplierStrings, t.prototype.getTitle = function() {
    return "Amount of resources removed";
  }, t.prototype.getDescription = function() {
    var e2 = this.factory.getGame().getMeta().componentsById[this.meta.componentId], t2 = this.getMultiplierStrings();
    return e2.name + " removes " + t2.next + ' more items<br /><br /><b>Current total bonus: </b><b class="green">' + t2.total + "</b> ";
  }, t;
});
