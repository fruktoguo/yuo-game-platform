/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：config/main/main
 */
define("config/main/main", ["./components", "./resources", "./factories", "./research", "./upgrades", "./achievements"], function(e, t, n, i, r, o) {
  return { id: 0, name: "Main idle", version: 1, startingMoney: 2e3, minNegativeMoney: -1e4, startingResearchPoints: 0, maxBonusTicks: 7200, minBonusTicks: 50, offlineSlower: 5, resources: t, components: e.components, componentsSelection: e.selection, productionTree: e.productionTree, factories: n, research: i, upgrades: r.upgrades, upgradesLayout: r.layout, achievements: o };
});
