define("locale/zhCN", [
  "config/Meta",
  "game/AchievementsManager",
  "game/upgrades/strategy/BuyerUpgrade",
  "game/upgrades/strategy/ConverterUpgrade",
  "game/upgrades/strategy/ConverterProduceMoreUpgrade",
  "game/upgrades/strategy/GarbageUpgrade",
  "game/upgrades/strategy/PackageSize",
  "game/upgrades/strategy/ResearchCenterBonusUpgrade",
  "game/upgrades/strategy/ResearchCenterMaxStock",
  "game/upgrades/strategy/RunningCostUpgrade",
  "game/upgrades/strategy/SellerSellAmountUpgrade",
  "game/upgrades/strategy/SellerSellPriceUpgrade"
], function(
  meta,
  AchievementsManager,
  BuyerUpgrade,
  ConverterUpgrade,
  ConverterProduceMoreUpgrade,
  GarbageUpgrade,
  PackageSizeUpgrade,
  ResearchCenterBonusUpgrade,
  ResearchCenterMaxStockUpgrade,
  RunningCostUpgrade,
  SellerSellAmountUpgrade,
  SellerSellPriceUpgrade
) {
  var resources = {
    ironOre: ["铁矿石", "铁矿"], iron: ["铁锭", "铁锭"], coal: ["煤炭", "煤炭"],
    steel: ["钢材", "钢材"], oil: ["原油", "原油"], plastic: ["塑料", "塑料"],
    silicon: ["硅晶", "硅晶"], electronics: ["电子元件", "电子件"], aluminium: ["铝材", "铝材"],
    engine: ["引擎", "引擎"], explosives: ["炸药", "炸药"], bullets: ["弹药", "弹药"],
    guns: ["武器", "武器"], tankHull: ["装甲车体", "车体"], tankTurret: ["炮塔", "炮塔"],
    tank: ["坦克", "坦克"], rocketHull: ["火箭壳体", "箭体"], warhead: ["战斗部", "战斗部"],
    rocket: ["火箭", "火箭"], waste: ["工业废料", "废料"], gas: ["天然气", "天然气"],
    jetFuel: ["航空燃料", "航油"], diesel: ["柴油", "柴油"], drone: ["无人机", "无人机"],
    droneControlRoom: ["无人机控制单元", "控制单元"], report1: ["金属研究报告", "金属报告"],
    report2: ["油气研究报告", "油气报告"], report3: ["综合研究报告", "综合报告"],
    report4: ["质量研究报告", "质量报告"]
  };

  var components = {
    transportLine: "传送带", garbageCollector: "废料回收站", sorterVertical: "分拣器", sorterHorizontal: "分拣器",
    ironBuyer: "铁矿采购站", ironFoundry: "铁锭冶炼厂", ironSeller: "铁锭出口站",
    coalBuyer: "煤炭采购站", steelFoundry: "钢材冶炼厂", steelSeller: "钢材出口站",
    oilBuyer: "原油采购站", gasBuyer: "天然气采购站", plasticMaker: "塑料制造厂", plasticSeller: "塑料出口站",
    siliconBuyer: "硅晶采购站", electronicsMaker: "电子元件厂", electronicsSeller: "电子元件出口站",
    explosivesBuyer: "炸药采购站", bulletMaker: "弹药制造厂", gunMaker: "武器制造厂", gunSeller: "武器出口站",
    aluminiumBuyer: "铝材采购站", engineMaker: "引擎制造厂", engineSeller: "引擎出口站",
    tankHullMaker: "装甲车体厂", tankTurretMaker: "炮塔制造厂", tankAssembler: "坦克组装厂", tankSeller: "坦克出口站",
    dieselRefinery: "柴油精炼厂", jetFuelRefinery: "航空燃料精炼厂", rocketHullMaker: "火箭壳体厂",
    rocketWarheadMaker: "战斗部制造厂", rocketAssembler: "火箭组装厂", droneMaker: "无人机制造厂",
    droneControlRoom: "无人机控制中心", droneSeller: "无人机出口站", researchCenter: "研究中心",
    metalsLab: "金属实验室", gasAndOilLab: "油气实验室", researchCenter2: "二级研究中心",
    analystCenter: "数据分析中心", researchCenter3: "三级研究中心", qualityLab: "质量实验室",
    researchCenter4: "四级研究中心"
  };

  var factoryNames = {
    level1: "前哨工厂", level2: "千级工厂", level3: "百万级工厂", level4: "行星工厂", level5: "轨道工业群",
    mission: "挑战工厂"
  };

  var research = {
    researchCenter: ["研究中心", "解锁更多科技研究"], chronometer: ["高精度时钟", "每级使模拟速度提高 1 步/秒"],
    steelComponents: ["钢铁工业", "解锁钢材生产链"], metalsLab: ["金属实验室", "解锁金属方向研究"],
    plasticComponents: ["聚合材料", "解锁塑料生产链"], sorter: ["智能分拣", "按资源类型将传送带货物导向不同路线"],
    electronicsComponents: ["电子工业", "解锁电子元件生产链"], gasAndOilLab: ["油气实验室", "解锁油气方向研究"],
    gunComponents: ["精密制造", "解锁武器生产链"], cleanPlastic: ["洁净塑料工艺", "塑料生产不再产生工业废料"],
    engineComponents: ["动力工程", "解锁引擎生产链"], analystCenter: ["数据分析中心", "产出更高质量的研究成果"],
    tankComponents: ["重型装配", "解锁坦克生产链"], cleanElectronics: ["洁净电子工艺", "电子元件生产不再产生工业废料"],
    dieselRefinery: ["柴油精炼", "柴油可提高坦克的销售价值"], rocketComponents: ["火箭工程", "解锁火箭生产链"],
    qualityCenter: ["质量中心", "进一步提高研究成果质量"], cleanEngines: ["洁净引擎工艺", "引擎生产不再产生工业废料"],
    droneComponents: ["无人机工程", "解锁无人机生产链"]
  };

  var achievementNames = {
    makingProfit: "第一条盈利产线", collectingCash: "初具规模", gettingSmarter: "科研起步"
  };
  for (var achievementLevel = 1; achievementLevel <= 20; achievementLevel++) {
    achievementNames["money" + achievementLevel] = "财富里程碑 " + String(achievementLevel).padStart(2, "0");
  }

  var products = {
    bonusticks1: ["80,000 加速步数", "快速推进生产"], bonusticks2: ["240,000 加速步数", "额外增加 50%"],
    bonusticks3: ["800,000 加速步数", "额外增加 200%"], bonusticks4: ["2,400,000 加速步数", "额外增加 350%"],
    bonusticks5: ["12,000,000 加速步数", "额外增加 650%"], bonusticks6: ["40,000,000 加速步数", "额外增加 1145%"],
    timetravel1: ["1 张时间跃迁券（3 小时）", "立即结算 3 小时产出"], timetravel2: ["3 张时间跃迁券", "组合补给"],
    timetravel3: ["8 张时间跃迁券", "远征补给"], timetravel4: ["25 张时间跃迁券", "大型补给"],
    timetravel5: ["100 张时间跃迁券", "战略储备"], timetravel6: ["300 张时间跃迁券", "星区储备"],
    researchproduction: ["演化思维", "研究点产量提升至 3 倍"], researchproduction2: ["异星脑域", "研究点产量提升至 4 倍"],
    extraticks: ["时序增压器", "每秒额外增加 8 个模拟步"], extraprofit: ["贸易协定", "利润提升至 3 倍"],
    starter1: ["开拓者补给", "8 张时间跃迁券与 300,000 加速步数"], starter2: ["轻型补给", "3 张时间跃迁券与 60,000 加速步数"]
  };

  var upgradeGroupNames = {
    "Conveyor": "传送带", "Research center": "研究中心", "Garbage": "废料回收站", "Iron buyer": "铁矿采购站",
    "Coal buyer": "煤炭采购站", "Oil buyer": "原油采购站", "Gas buyer": "天然气采购站", "Silicon buyer": "硅晶采购站",
    "Explosives buyer": "炸药采购站", "Aluminium buyer": "铝材采购站", "Iron foundry": "铁锭冶炼厂",
    "Steel foundry": "钢材冶炼厂", "Plastic maker": "塑料制造厂", "Electronics maker": "电子元件厂",
    "Bullet maker": "弹药制造厂", "Gun maker": "武器制造厂", "Engine maker": "引擎制造厂",
    "Tank hull maker": "装甲车体厂", "Tank turret maker": "炮塔制造厂", "Tank assembler": "坦克组装厂",
    "Diesel refinery": "柴油精炼厂", "Jet fuel refinery": "航空燃料精炼厂", "Rocket hull maker": "火箭壳体厂",
    "Rocket warhead maker": "战斗部制造厂", "Rocket assembler": "火箭组装厂", "Iron seller": "铁锭出口站",
    "Steel seller": "钢材出口站", "Plastic seller": "塑料出口站", "Electronics seller": "电子元件出口站",
    "Gun seller": "武器出口站", "Engine seller": "引擎出口站", "Tank seller": "坦克出口站"
  };

  function localizeGameMeta(gameMeta) {
    (gameMeta.resources || []).forEach(function(resource) {
      var translation = resources[resource.id];
      if (translation) {
        resource.name = translation[0];
        resource.nameShort = translation[1];
      }
    });
    (gameMeta.components || []).forEach(function(component) {
      if (components[component.id]) component.name = components[component.id];
      if (component.id === "garbageCollector") component.description = "接收并安全处理任意工业物料。";
    });
    (gameMeta.factories || []).forEach(function(factory) {
      if (factoryNames[factory.id]) factory.name = factoryNames[factory.id];
    });
    (gameMeta.research || []).forEach(function(item) {
      var translation = research[item.id];
      if (translation) {
        item.name = translation[0];
        item.description = translation[1];
      }
    });
    (gameMeta.achievements || []).forEach(function(item) {
      if (achievementNames[item.id]) item.name = achievementNames[item.id];
      if (item.id === "makingProfit") item.bonus.description = "解锁科研系统";
      if (item.id === "collectingCash") item.bonus.description = "解锁时序增压功能";
      if (item.id === "gettingSmarter") item.bonus.description = "解锁设施升级系统";
    });
  }

  localizeGameMeta(meta.main);
  Object.keys(meta.missions).forEach(function(missionId) {
    localizeGameMeta(meta.missions[missionId]);
    if (missionId === "mission1") {
      meta.missions[missionId].name = "挑战 01：均衡供给";
      meta.missions[missionId].description = "将铁矿石均匀输送到全部铁锭冶炼厂";
    } else if (missionId === "mission2") {
      meta.missions[missionId].name = "挑战 02：极速盈利";
      meta.missions[missionId].description = "在限定布局中尽快建立高收益产线";
    }
  });

  Object.values(meta.products).forEach(function(product) {
    var translation = products[product.id];
    if (translation) {
      product.name = translation[0];
      product.description = translation[1];
    }
  });
  meta.main.upgradesLayout.forEach(function(group) {
    if (group.name && upgradeGroupNames[group.name]) group.name = upgradeGroupNames[group.name];
  });

  BuyerUpgrade.prototype.getTitle = function() { return "采购能力"; };
  BuyerUpgrade.prototype.getDescription = function() {
    var component = this.factory.getGame().getMeta().componentsById[this.meta.componentId];
    var multiplier = this.getMultiplierStrings();
    return "<b>" + component.name + '</b> 每次多采购 <b class="green">' + multiplier.next + "</b> 份资源。<br />" +
      (this.meta.noRunningCost ? "" : '运行成本同步提高 <b class="red">' + multiplier.next + "</b>。<br />") +
      '<br />单台设施吞吐量提高，当前累计采购加成：<b class="green">' + multiplier.total + "</b>";
  };

  ConverterUpgrade.prototype.getTitle = function() { return "加工吞吐量"; };
  ConverterUpgrade.prototype.getDescription = function() {
    var component = this.factory.getGame().getMeta().componentsById[this.meta.componentId];
    var multiplier = this.getMultiplierStrings();
    return "<b>" + component.name + '</b> 每次多消耗并产出 <b class="green">' + multiplier.next + "</b> 份资源。<br />" +
      (this.meta.noRunningCost ? "" : '运行成本同步提高 <b class="red">' + multiplier.next + "</b>。<br />") +
      '<br />当前累计吞吐加成：<b class="green">' + multiplier.total + "</b>";
  };

  ConverterProduceMoreUpgrade.prototype.getTitle = function() { return "额外产量"; };
  ConverterProduceMoreUpgrade.prototype.getDescription = function() {
    var component = this.factory.getGame().getMeta().componentsById[this.meta.componentId];
    var multiplier = this.getMultiplierStrings();
    return "<b>" + component.name + '</b> 使用相同原料额外产出 <b class="green">' + multiplier.next + "</b> 份资源。<br />" +
      (this.meta.noRunningCost ? "" : '运行成本同步提高 <b class="red">' + multiplier.next + "</b>。<br />") +
      '<br />当前累计产量加成：<b class="green">' + multiplier.total + "</b>";
  };

  GarbageUpgrade.prototype.getTitle = function() { return "废料处理能力"; };
  GarbageUpgrade.prototype.getDescription = function() {
    var component = this.factory.getGame().getMeta().componentsById[this.meta.componentId];
    var multiplier = this.getMultiplierStrings();
    return component.name + ' 每次多处理 <b class="green">' + multiplier.next + '</b> 份物料。<br /><br />当前累计处理加成：<b class="green">' + multiplier.total + "</b>";
  };

  PackageSizeUpgrade.prototype.getTitle = function() { return "货包容量"; };
  PackageSizeUpgrade.prototype.getDescription = function() {
    var component = this.meta.componentId ? this.factory.getGame().getMeta().componentsById[this.meta.componentId] : null;
    var multiplier = this.getMultiplierStrings();
    return "<b>" + (component ? component.name + " 输出" : "所有设施输出") + '</b>的单个货包可多容纳 <b class="green">' + multiplier.next +
      '</b> 份资源。<br /><br />更大的货包可显著提高传送带效率。<br /><br />当前累计容量加成：<b class="green">' + multiplier.total + "</b>";
  };

  ResearchCenterBonusUpgrade.prototype.getTitle = function() { return "研究报告增益"; };
  ResearchCenterBonusUpgrade.prototype.getDescription = function() {
    var component = this.factory.getGame().getMeta().componentsById[this.meta.componentId];
    var multiplier = this.getMultiplierStrings();
    return "<b>" + component.name + '</b> 的报告增益提高 <b class="green">' + multiplier.next + '</b>。<br /><br />当前累计增益：<b class="green">' + multiplier.total + "</b>";
  };

  ResearchCenterMaxStockUpgrade.prototype.getTitle = function() { return "最大库存"; };
  ResearchCenterMaxStockUpgrade.prototype.getDescription = function() {
    var component = this.factory.getGame().getMeta().componentsById[this.meta.componentId];
    var multiplier = this.getMultiplierStrings();
    return "<b>" + component.name + '</b> 的库存上限提高 <b class="green">' + multiplier.next + '</b>。<br /><br />当前累计提升：<b class="green">' + multiplier.total + "</b>";
  };

  RunningCostUpgrade.prototype.getTitle = function() { return "降低运行成本"; };
  RunningCostUpgrade.prototype.getDescription = function() {
    var component = this.factory.getGame().getMeta().componentsById[this.meta.componentId];
    var multiplier = this.getMultiplierStrings(true);
    return "<b>" + component.name + '</b> 的运行成本降低 <b class="green">' + multiplier.next + '</b>。<br /><br />当前累计降幅：<b class="green">' + multiplier.total + "</b>";
  };

  SellerSellAmountUpgrade.prototype.getTitle = function() { return "单次出售量"; };
  SellerSellAmountUpgrade.prototype.getDescription = function() {
    var component = this.factory.getGame().getMeta().componentsById[this.meta.componentId];
    var multiplier = this.getMultiplierStrings();
    return "<b>" + component.name + '</b> 每次多出售 <b class="green">' + multiplier.next + "</b> 份资源。<br />" +
      (this.meta.noRunningCost ? "" : '运行成本同步提高 <b class="red">' + multiplier.next + "</b>。<br />") +
      '<br />当前累计出售量加成：<b class="green">' + multiplier.total + "</b>";
  };

  SellerSellPriceUpgrade.prototype.getTitle = function() { return "资源售价"; };
  SellerSellPriceUpgrade.prototype.getDescription = function() {
    var component = this.factory.getGame().getMeta().componentsById[this.meta.componentId];
    var multiplier = this.getMultiplierStrings();
    return "<b>" + component.name + '</b> 的销售价格提高 <b class="green">' + multiplier.next + '</b>。<br /><br />当前累计售价加成：<b class="green">' + multiplier.total + "</b>";
  };

  AchievementsManager.prototype.getTesterImplementations = function() {
    var manager = this;
    return {
      amountOfMoney: {
        getRequirementsInfoText: function(test) {
          return '资金达到 <span class="money">$' + nf(test.amount) + "</span>";
        },
        test: function(test) { return manager.game.getMoney() > test.amount; }
      },
      avgMoneyIncome: {
        getRequirementsInfoText: function(test) {
          return '平均收入达到 <span class="money">$' + nf(test.amount) + "</span>";
        },
        test: function(test) { return manager.game.getStatistics().getAvgProfit() > test.amount; }
      },
      researched: {
        getRequirementsInfoText: function(test) {
          return "完成研究：" + manager.game.getMeta().researchById[test.researchId].name;
        },
        test: function(test) { return manager.game.getResearchManager().getResearch(test.researchId) > 0; }
      }
    };
  };

  return meta;
});
