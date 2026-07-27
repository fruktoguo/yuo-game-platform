/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/action/ResetFactoryAction
 */
define("game/action/ResetFactoryAction", ["./SellComponentAction"], function(e) {
  var t = function(e2) {
    this.factory = e2;
  };
  return t.prototype.canReset = function() {
    return true;
  }, t.prototype.reset = function() {
    for (var t2 = this.factory.getTiles(), n = 0; n < t2.length; n++) {
      var i = new e(t2[n], 1, 1);
      i.canSell() && i.sell();
    }
    this.factory.reset();
  }, t;
});
