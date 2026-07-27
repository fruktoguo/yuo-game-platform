/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/strategy/Factory
 */
define("game/strategy/Factory", ["game/strategy/Buyer", "game/strategy/Transport", "game/strategy/Converter", "game/strategy/Seller", "game/strategy/Garbage", "game/strategy/Sorter", "game/strategy/ResearchCenter", "game/strategy/Lab"], function(e, t, n, i, r, o, s, a) {
  var u = { buyer: e, transport: t, converter: n, seller: i, garbage: r, sorter: o, researchCenter: s, lab: a };
  return { getStrategyClass: function(e2) {
    var t2 = u[e2];
    if (!t2) throw new Error("Unknown component strategy " + e2);
    return t2;
  }, getForComponent: function(e2) {
    return new (this.getStrategyClass(e2.getMeta().strategy.type))(e2, e2.getMeta().strategy);
  }, getMetaDescriptionData: function(e2, t2) {
    return this.getStrategyClass(e2.strategy.type).getMetaDescriptionData(e2, t2);
  } };
});
