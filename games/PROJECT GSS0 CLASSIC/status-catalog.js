(() => {
  "use strict";

  const defaultBalance = globalThis.GSS0_DESIGNER_CONFIG?.balance || {};

  function setting(balance, key, fallback) {
    const value = Number(balance?.[key]);
    return Number.isFinite(value) ? value : fallback;
  }

  function formatNumber(value, digits = 2) {
    return String(Number(Number(value).toFixed(digits)));
  }

  function formatPercent(value) {
    return `${formatNumber(value * 100, 1)}%`;
  }

  const statusBlueprints = [
    { id: "frost", name: "冰冻", color: "#58d8ff" },
    { id: "burn", name: "燃烧", color: "#ff572f" },
    { id: "corrosion", name: "腐蚀", color: "#8be04e" }
  ];

  function describeStatus(statusId, balance = defaultBalance) {
    switch (statusId) {
      case "frost":
        return `冰冻：每层降低敌人${formatPercent(setting(balance, "frostSlowPerStack", 0.2))}移动速度，最低降低至${formatPercent(setting(balance, "frostMinimumSpeedRatio", 0.1))}移动速度。减速幅度为加算。`;
      case "burn":
        return `燃烧：每${formatNumber(setting(balance, "burnTickInterval", 0.3))}秒，随机摧毁一节身体，并失去一层燃烧层数。`;
      case "corrosion":
        return `腐蚀：每${formatNumber(setting(balance, "corrosionTickInterval", 3))}秒随机摧毁1节身体。可无限叠加层数，以加快生效频率。`;
      default:
        return "";
    }
  }

  const statuses = Object.freeze(statusBlueprints.map((status) => Object.freeze({
    ...status,
    desc: describeStatus(status.id, defaultBalance)
  })));

  globalThis.GSS0DescribeStatus = describeStatus;
  globalThis.GSS0StatusCatalog = statuses;
})();
