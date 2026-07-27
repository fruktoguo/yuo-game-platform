/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：config/Ruleset
 */
define("config/Ruleset", [], function() {
  var e = function() {
  };
  return e.prepareMeta = function(e2) {
    e2.componentsById = {}, e2.componentsByIdNum = [];
    for (var t in e2.components) {
      if (e2.componentsById[e2.components[t].id]) throw new Error("Component with id " + e2.components[t].id + " already exists!");
      if (e2.componentsByIdNum[e2.components[t].idNum]) throw new Error("Component with idNum " + e2.components[t].idNum + " already exists!");
      e2.componentsById[e2.components[t].id] = e2.components[t], e2.componentsByIdNum[e2.components[t].idNum] = e2.components[t];
    }
    e2.factoriesById = {}, e2.factoriesByIdNum = [];
    for (var t in e2.factories) {
      if (e2.factoriesById[e2.factories[t].id]) throw new Error("Factory with id " + e2.factories[t].id + " already exists!");
      if (e2.factoriesByIdNum[e2.factories[t].idNum]) throw new Error("Factory with idNum " + e2.factories[t].idNum + " already exists!");
      e2.factoriesById[e2.factories[t].id] = e2.factories[t], e2.factoriesByIdNum[e2.factories[t].idNum] = e2.factories[t];
      var n = e2.factories[t];
      n.areasById = {}, n.areasByIdNum = [];
      for (var t in n.areas) {
        if (n.areasById[n.areas[t].id]) throw new Error("Factory " + t + " area with id " + n.areas[t].id + " already exists!");
        if (n.areasByIdNum[n.areas[t].idNum]) throw new Error("Factory " + t + " area with idNum " + n.areas[t].idNum + " already exists!");
        n.areasById[n.areas[t].id] = n.areas[t], n.areasByIdNum[n.areas[t].idNum] = n.areas[t];
        for (var i in n.areas[t].locations) {
          var r = n.areas[t].locations[i];
          r.width = r.x2 - r.x + 1, r.height = r.y2 - r.y + 1;
        }
      }
    }
    e2.resourcesById = {}, e2.resourcesByIdNum = [];
    for (var t in e2.resources) {
      if (e2.resourcesById[e2.resources[t].id]) throw new Error("Resource with id " + e2.resources[t].id + " already exists!");
      if (e2.resourcesByIdNum[e2.resources[t].idNum]) throw new Error("Resource with idNum " + e2.resources[t].idNum + " already exists!");
      e2.resourcesById[e2.resources[t].id] = e2.resources[t], e2.resourcesByIdNum[e2.resources[t].idNum] = e2.resources[t];
    }
    e2.researchById = {}, e2.researchByIdNum = [];
    for (var t in e2.research) {
      if (e2.researchById[e2.research[t].id]) throw new Error("Research with id " + e2.research[t].id + " already exists!");
      if (e2.researchByIdNum[e2.research[t].idNum]) throw new Error("Research with idNum " + e2.research[t].idNum + " already exists!");
      e2.researchById[e2.research[t].id] = e2.research[t], e2.researchByIdNum[e2.research[t].idNum] = e2.research[t];
    }
    e2.upgradesById = {}, e2.upgradesByIdNum = [];
    for (var t in e2.upgrades) {
      if (e2.upgradesById[e2.upgrades[t].id]) throw new Error("Upgrade with id " + e2.upgrades[t].id + " already exists!");
      if (e2.upgradesByIdNum[e2.upgrades[t].idNum]) throw new Error("Upgrade with idNum " + e2.upgrades[t].idNum + " already exists!");
      e2.upgradesById[e2.upgrades[t].id] = e2.upgrades[t], e2.upgradesByIdNum[e2.upgrades[t].idNum] = e2.upgrades[t];
    }
    e2.achievementsById = {}, e2.achievementsByIdNum = [];
    for (var t in e2.achievements) {
      if (e2.achievementsById[e2.achievements[t].id]) throw new Error("Achievement with id " + e2.achievements[t].id + " already exists!");
      if (e2.achievementsByIdNum[e2.achievements[t].idNum]) throw new Error("Achievement with idNum " + e2.achievements[t].idNum + " already exists!");
      e2.achievementsById[e2.achievements[t].id] = e2.achievements[t], e2.achievementsByIdNum[e2.achievements[t].idNum] = e2.achievements[t];
    }
    return e2;
  }, e;
});
