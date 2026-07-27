/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/action/ClearPackagesAction
 */
define("game/action/ClearPackagesAction", [], function() {
  var e = function(e2) {
    this.factory = e2;
  };
  return e.prototype.canClear = function() {
    return true;
  }, e.prototype.clear = function() {
    for (var e2 = this.factory.getTiles(), t = 0; t < e2.length; t++) {
      var n = e2[t];
      n.getComponent() && n.getComponent().getStrategy().clearContents();
    }
    this.factory.getEventManager().invokeEvent(FactoryEvent.FACTORY_COMPONENTS_CHANGED, n);
  }, e;
});
