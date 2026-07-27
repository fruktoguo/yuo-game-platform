/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：config/main/achievements
 */
define("config/main/achievements", [], function() {
  for (var e = [{ id: "makingProfit", idNum: 1, name: "Making profit!", spriteX: 3, spriteY: 0, bonus: { type: "custom", description: "Unlocks research" }, tests: [{ type: "avgMoneyIncome", amount: 1.4 }] }, { id: "collectingCash", idNum: 2, name: "Collecting some cash", spriteX: 2, spriteY: 0, bonus: { type: "custom", description: "Unlocks extras" }, tests: [{ type: "amountOfMoney", amount: 25e3 }] }, { id: "gettingSmarter", idNum: 3, name: "Getting smarter", spriteX: 2, spriteY: 0, bonus: { type: "custom", description: "Unlocks upgrades" }, tests: [{ type: "researched", researchId: "researchCenter" }] }], t = 1; t <= 20; t++) e.push({ id: "money" + t, idNum: 4 + t, name: "Getting money", spriteX: 2, spriteY: 0, requiresAchievement: t > 1 ? "money" + (t - 1) : null, bonus: {
    type: "money",
    amount: 250 * Math.pow(10, t)
  }, tests: [{ type: "amountOfMoney", amount: 1e3 * Math.pow(10, t) }] });
  return e;
});
