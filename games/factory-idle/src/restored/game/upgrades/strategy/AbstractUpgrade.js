/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/upgrades/strategy/AbstractUpgrade
 */
define("game/upgrades/strategy/AbstractUpgrade", [], function() {
  return { getNextMultiplier: function() {
    return this.meta.levels[this.amount] ? this.meta.levels[this.amount].bonus : 0;
  }, getTotalMultiplier: function() {
    for (var e = 0, t = null, n = 0; n < this.amount; n++) (t = this.meta.levels[n]) && (e += t.bonus);
    return e;
  }, getMultiplierStrings: function(e) {
    var t = this.getNextMultiplier(), n = 1 + this.getTotalMultiplier(), i = 0;
    t > 0 && (i = (n + t) / n - 1);
    var r = Math.round(1e4 * i) / 100;
    return e ? { total: Math.round(1e4 * (n - 1)) / 100 + "%", next: "<b>" + r + "%</b>" } : { total: n + "x", next: "<b>" + r + "%</b>" };
  } };
});
