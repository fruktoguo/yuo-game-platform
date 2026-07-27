/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/upgrades/Factory
 */
define("game/upgrades/Factory", ["./strategy/BuyerUpgrade", "./strategy/ConverterUpgrade", "./strategy/ConverterProduceMoreUpgrade", "./strategy/GarbageUpgrade", "./strategy/PackageSize", "./strategy/ResearchCenterBonusUpgrade", "./strategy/ResearchCenterMaxStock", "./strategy/RunningCostUpgrade", "./strategy/SellerSellAmountUpgrade", "./strategy/SellerSellPriceUpgrade"], function(e, t, n, i, r, o, s, a, u, c) {
  var l = { buyer: e, converter: t, converterProduceMore: n, garbage: i, packageSize: r, researchCenterBonus: o, researchCenterMaxStock: s, runningCost: a, sellerSellAmount: u, sellerSellPrice: c };
  return { getStrategyClass: function(e2) {
    var t2 = l[e2];
    if (!t2) throw new Error("Unknown component strategy " + e2);
    return t2;
  }, getStrategy: function(e2, t2, n2) {
    return new (this.getStrategyClass(e2.type))(e2, t2, n2);
  } };
});
