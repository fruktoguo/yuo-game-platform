/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/upgrades/strategy/PackageSize
 */
define("game/upgrades/strategy/PackageSize", ["./AbstractUpgrade"], function(e) {
  var t = function(e2, t2, n) {
    this.meta = e2, this.amount = t2, this.factory = n;
  };
  return t.prototype.updateMap = function(e2) {
    var t2 = this.getTotalMultiplier();
    this.meta.componentId ? e2.byComponent[this.meta.componentId].packageSizeBonus += t2 : e2.packageSizeBonus += t2;
  }, t.prototype.getNextMultiplier = e.getNextMultiplier, t.prototype.getTotalMultiplier = e.getTotalMultiplier, t.prototype.getMultiplierStrings = e.getMultiplierStrings, t.prototype.getTitle = function() {
    return "Package size";
  }, t.prototype.getDescription = function() {
    var e2 = null;
    this.meta.componentId && (e2 = this.factory.getGame().getMeta().componentsById[this.meta.componentId]);
    var t2 = this.getMultiplierStrings();
    return "<b>" + (e2 ? e2.name + " outputs" : "All components output") + '</b> <span class="green">' + t2.next + '</span> more resources into single package.<br /><br />Makes conveyors much more effective, as they transport more resources.<br /><br /><b>Current total bonus: </b><b class="green">' + t2.total + "</b> ";
  }, t;
});
