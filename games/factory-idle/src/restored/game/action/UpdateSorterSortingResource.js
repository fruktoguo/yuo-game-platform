/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/action/UpdateSorterSortingResource
 */
define("game/action/UpdateSorterSortingResource", [], function() {
  var e = function(e2, t, n, i) {
    this.component = e2, this.factory = e2.getFactory(), this.offsetX = t, this.offsetY = n, this.resource = i;
  };
  return e.prototype.canUpdate = function() {
    return "sorter" == this.component.getMeta().strategy.type;
  }, e.prototype.update = function() {
    this.component.getStrategy().setSortingResource(this.offsetX, this.offsetY, this.resource), this.factory.getEventManager().invokeEvent(FactoryEvent.FACTORY_COMPONENTS_CHANGED, this.tile), this.factory.getEventManager().invokeEvent(FactoryEvent.REFRESH_COMPONENT_INFO);
  }, e;
});
