import script0 from '../runtime/browser-globals.js?url';
import script1 from '../restored/requireLib.js?url';
import script2 from '../restored/config/products.js?url';
import script3 from '../restored/config/main/helper/ProductionCostCalculator.js?url';
import script4 from '../restored/config/main/components.js?url';
import script5 from '../restored/config/main/resources.js?url';
import script6 from '../restored/config/main/factories.js?url';
import script7 from '../restored/config/main/research.js?url';
import script8 from '../restored/config/main/upgrades.js?url';
import script9 from '../restored/config/main/achievements.js?url';
import script10 from '../restored/config/main/main.js?url';
import script11 from '../restored/config/Ruleset.js?url';
import script12 from '../restored/config/missions/mission1.js?url';
import script13 from '../restored/config/missions/mission2.js?url';
import script14 from '../restored/config/Meta.js?url';
import script15 from '../modules/config/config.js?url';
import script16 from '../restored/config/event/GlobalUiEvent.js?url';
import script17 from '../restored/config/event/GameUiEvent.js?url';
import script18 from '../restored/config/event/GameEvent.js?url';
import script19 from '../restored/config/event/FactoryEvent.js?url';
import script20 from '../modules/config/event/ApiEvent.js?url';
import script21 from '../restored/game/InputOutputManager.js?url';
import script22 from '../restored/game/strategy/helper/Package.js?url';
import script23 from '../restored/Game/strategy/helper/ResourceOutput.js?url';
import script24 from '../restored/Game/strategy/helper/DelayedAction.js?url';
import script25 from '../restored/game/strategy/Buyer.js?url';
import script26 from '../restored/game/strategy/helper/TransportStackingQueue.js?url';
import script27 from '../restored/game/strategy/Transport.js?url';
import script28 from '../restored/Game/strategy/helper/ResourceIntake.js?url';
import script29 from '../restored/game/strategy/Converter.js?url';
import script30 from '../restored/game/strategy/Seller.js?url';
import script31 from '../restored/game/strategy/Garbage.js?url';
import script32 from '../restored/game/strategy/Sorter.js?url';
import script33 from '../restored/game/strategy/ResearchCenter.js?url';
import script34 from '../restored/game/strategy/Lab.js?url';
import script35 from '../restored/game/strategy/Factory.js?url';
import script36 from '../restored/game/Component.js?url';
import script37 from '../restored/game/Tile.js?url';
import script38 from '../restored/base/EventManager.js?url';
import script39 from '../restored/game/upgrades/strategy/AbstractUpgrade.js?url';
import script40 from '../restored/game/upgrades/strategy/BuyerUpgrade.js?url';
import script41 from '../restored/game/upgrades/strategy/ConverterUpgrade.js?url';
import script42 from '../restored/game/upgrades/strategy/ConverterProduceMoreUpgrade.js?url';
import script43 from '../restored/game/upgrades/strategy/GarbageUpgrade.js?url';
import script44 from '../restored/game/upgrades/strategy/PackageSize.js?url';
import script45 from '../restored/game/upgrades/strategy/ResearchCenterBonusUpgrade.js?url';
import script46 from '../restored/game/upgrades/strategy/ResearchCenterMaxStock.js?url';
import script47 from '../restored/game/upgrades/strategy/RunningCostUpgrade.js?url';
import script48 from '../restored/game/upgrades/strategy/SellerSellAmountUpgrade.js?url';
import script49 from '../restored/game/upgrades/strategy/SellerSellPriceUpgrade.js?url';
import script50 from '../restored/game/upgrades/Factory.js?url';
import script51 from '../restored/game/UpgradesManager.js?url';
import script52 from '../restored/game/AreasManager.js?url';
import script53 from '../restored/game/action/BuyComponentAction.js?url';
import script54 from '../restored/game/action/UpdateComponentInputOutputAction.js?url';
import script55 from '../restored/game/FactorySetup.js?url';
import script56 from '../restored/game/Factory.js?url';
import script57 from '../restored/game/ResearchManager.js?url';
import script58 from '../restored/game/AchievementsManager.js?url';
import script59 from '../restored/game/calculator/TransportCalculator.js?url';
import script60 from '../restored/game/calculator/FactoryCalculator.js?url';
import script61 from '../restored/game/calculator/Calculator.js?url';
import script62 from '../restored/game/statistics/StatisticsCollector.js?url';
import script63 from '../restored/game/statistics/Statistics.js?url';
import script64 from '../restored/base/Benchmarker.js?url';
import script65 from '../restored/game/Ticker.js?url';
import script66 from '../restored/game/Game.js?url';
import script67 from '../modules/play/UrlHandler.js?url';
import script68 from '../restored/play/SaveManager.js?url';
import script69 from '../restored/play/PurchasesManager.js?url';
import script70 from '../restored/play/UserHash.js?url';
import script71 from '../modules/play/api/api/LocalApi.js?url';
import script72 from '../modules/play/api/Local.js?url';
import script73 from '../modules/play/api/ApiFactory.js?url';
import script74 from '../restored/play/ConfirmedTimestamp.js?url';
import script75 from '../modules/play/Play.js?url';
import script76 from '../restored/base/ImageMap.js?url';
import script77 from '../restored/text.js?url';
import script78 from '../restored/ui/helper/AlertUi.js?url';
import script79 from '../restored/game/action/BuyFactoryAction.js?url';
import script80 from '../restored/ui/FactoriesUi.js?url';
import script81 from '../restored/ui/factory/MenuUi.js?url';
import script82 from '../restored/ui/factory/mapLayers/BackgroundLayer.js?url';
import script83 from '../restored/ui/factory/mapLayers/strategy/Default.js?url';
import script84 from '../restored/ui/factory/mapLayers/strategy/Track.js?url';
import script85 from '../restored/ui/factory/mapLayers/ComponentLayer.js?url';
import script86 from '../restored/ui/factory/mapLayers/PackageLayer.js?url';
import script87 from '../restored/game/action/SellComponentAction.js?url';
import script88 from '../restored/game/action/UpdateTileAction.js?url';
import script89 from '../restored/ui/helper/TipUi.js?url';
import script90 from '../restored/ui/factory/mapLayers/helper/MouseInfoHelper.js?url';
import script91 from '../restored/ui/factory/mapLayers/MouseLayer.js?url';
import script92 from '../restored/game/action/BuyAreaAction.js?url';
import script93 from '../restored/ui/helper/ConfirmUi.js?url';
import script94 from '../restored/ui/factory/mapLayers/AreasLayer.js?url';
import script95 from '../restored/ui/factory/ScreenShotUi.js?url';
import script96 from '../restored/ui/factory/MapUi.js?url';
import script97 from '../restored/ui/factory/ComponentsUi.js?url';
import script98 from '../restored/game/action/UpdateSorterSortingResource.js?url';
import script99 from '../restored/ui/factory/componentUi/Sorter.js?url';
import script100 from '../restored/game/misc/productionTree2/ProductionGraphUi.js?url';
import script101 from '../restored/game/misc/productionTree2/Node.js?url';
import script102 from '../restored/game/misc/productionTree2/ProductionTreeBuilder.js?url';
import script103 from '../restored/game/action/PassTimeAction.js?url';
import script104 from '../restored/ui/factory/InfoUi.js?url';
import script105 from '../restored/game/action/ClearPackagesAction.js?url';
import script106 from '../restored/game/action/ResetFactoryAction.js?url';
import script107 from '../restored/ui/factory/ControlsUi.js?url';
import script108 from '../restored/ui/factory/MapToolsUi.js?url';
import script109 from '../restored/ui/factory/OverviewUi.js?url';
import script110 from '../modules/ui/FactoryUi.js?url';
import script111 from '../restored/game/action/BuyResearch.js?url';
import script112 from '../restored/ui/ResearchUi.js?url';
import script113 from '../restored/game/action/BuyUpgrade.js?url';
import script114 from '../restored/game/action/SellUpgrade.js?url';
import script115 from '../restored/ui/UpgradesUi.js?url';
import script116 from '../restored/ui/AchievementsUi.js?url';
import script117 from '../restored/ui/AchievementPopupUi.js?url';
import script118 from '../restored/ui/HelpUi.js?url';
import script119 from '../restored/game/misc/productionTree/Node.js?url';
import script120 from '../restored/game/misc/productionTree/Link.js?url';
import script121 from '../restored/game/misc/productionTree/ProductionIndex.js?url';
import script122 from '../restored/ui/StatisticsUi.js?url';
import script123 from '../restored/ui/PurchasesUi.js?url';
import script124 from '../restored/ui/helper/LoadingUi.js?url';
import script125 from '../restored/ui/SettingsUi.js?url';
import script126 from '../restored/ui/TimeTravelUi.js?url';
import script127 from '../restored/ui/GameUi.js?url';
import script128 from '../restored/ui/MissionsUi.js?url';
import script129 from '../restored/ui/RunningInBackgroundInfoUi.js?url';
import script130 from '../restored/ui/IntroUi.js?url';
import script131 from '../modules/ui/MainUi.js?url';
import script132 from '../restored/Main.js?url';
import script133 from '../restored/lib/jquery.js?url';
import script134 from '../restored/base/Logger.js?url';
import script135 from '../restored/base/NumberFormat.js?url';
import script136 from '../restored/lib/handlebars.js?url';
import script137 from '../restored/lib/bin/Base64ArrayBuffer.js?url';
import script138 from '../restored/lib/bin/BinaryArrayReader.js?url';
import script139 from '../restored/lib/bin/BinaryArrayWriter.js?url';
import script140 from '../restored/lib/bin/BinaryBoolean.js?url';
import script141 from '../restored/lib/bin/BinaryTest.js?url';
import script142 from '../restored/lib/bin/Binary.js?url';
import script143 from '../modules/locale/zhCN.js?url';
import script144 from '../modules/app.js?url';

export const scriptUrls = [
  script0,
  script1,
  script2,
  script3,
  script4,
  script5,
  script6,
  script7,
  script8,
  script9,
  script10,
  script11,
  script12,
  script13,
  script14,
  script15,
  script16,
  script17,
  script18,
  script19,
  script20,
  script21,
  script22,
  script23,
  script24,
  script25,
  script26,
  script27,
  script28,
  script29,
  script30,
  script31,
  script32,
  script33,
  script34,
  script35,
  script36,
  script37,
  script38,
  script39,
  script40,
  script41,
  script42,
  script43,
  script44,
  script45,
  script46,
  script47,
  script48,
  script49,
  script50,
  script51,
  script52,
  script53,
  script54,
  script55,
  script56,
  script57,
  script58,
  script59,
  script60,
  script61,
  script62,
  script63,
  script64,
  script65,
  script66,
  script67,
  script68,
  script69,
  script70,
  script71,
  script72,
  script73,
  script74,
  script75,
  script76,
  script77,
  script78,
  script79,
  script80,
  script81,
  script82,
  script83,
  script84,
  script85,
  script86,
  script87,
  script88,
  script89,
  script90,
  script91,
  script92,
  script93,
  script94,
  script95,
  script96,
  script97,
  script98,
  script99,
  script100,
  script101,
  script102,
  script103,
  script104,
  script105,
  script106,
  script107,
  script108,
  script109,
  script110,
  script111,
  script112,
  script113,
  script114,
  script115,
  script116,
  script117,
  script118,
  script119,
  script120,
  script121,
  script122,
  script123,
  script124,
  script125,
  script126,
  script127,
  script128,
  script129,
  script130,
  script131,
  script132,
  script133,
  script134,
  script135,
  script136,
  script137,
  script138,
  script139,
  script140,
  script141,
  script142,
  script143,
  script144,
];
