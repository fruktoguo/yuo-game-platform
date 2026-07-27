/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/factory/MenuUi
 */
define("ui/factory/MenuUi", ["text!template/factory/menu.html"], function(e, t) {
  var n = function(e2, t2, n2) {
    this.globalUiEm = e2, this.gameUiEm = t2, this.factory = n2, this.game = n2.getGame();
  };
  return n.prototype.display = function(t2) {
    var n2 = this.game.getMeta().isMission;
    this.container = t2, this.container.html(Handlebars.compile(e)({ isMission: n2, hasResearch: this.game.getMeta().research.length > 0, hasUpgrades: this.game.getMeta().upgrades.length > 0, hasAchievements: this.game.getMeta().achievements.length > 0, hasStatistics: !this.game.getMeta().isMission })), this.container.find("#missionsButton").click(function() {
      this.globalUiEm.invokeEvent(GlobalUiEvent.SHOW_MISSIONS);
    }.bind(this)), this.container.find("#mainGameButton").click(function() {
      this.globalUiEm.invokeEvent(GlobalUiEvent.SHOW_MAIN_GAME);
    }.bind(this)), this.container.find("#factoriesButton").click(function() {
      this.gameUiEm.invokeEvent(GameUiEvent.SHOW_FACTORIES);
    }.bind(this)), this.container.find("#researchButton").click(function() {
      this.gameUiEm.invokeEvent(GameUiEvent.SHOW_RESEARCH, this.factory.getMeta().id);
    }.bind(this)), this.container.find("#upgradesButton").click(function() {
      this.gameUiEm.invokeEvent(GameUiEvent.SHOW_UPGRADES, this.factory.getMeta().id);
    }.bind(this)), this.container.find("#achievementsButton").click(function() {
      this.gameUiEm.invokeEvent(GameUiEvent.SHOW_ACHIEVEMENTS, this.factory.getMeta().id);
    }.bind(this)), this.container.find("#helpButton").click(function() {
      this.gameUiEm.invokeEvent(GameUiEvent.SHOW_HELP);
    }.bind(this)), this.container.find("#statisticsButton").click(function() {
      this.gameUiEm.invokeEvent(GameUiEvent.SHOW_STATISTICS);
    }.bind(this)), this.container.find("#extraButton").click(function() {
      this.gameUiEm.invokeEvent(GameUiEvent.SHOW_PURCHASES);
    }.bind(this)), this.container.find("#settingsButton").click(function() {
      this.gameUiEm.invokeEvent(GameUiEvent.SHOW_SETTINGS);
    }.bind(this)), this.container.find("#timeTravelButton").click(function() {
      this.gameUiEm.invokeEvent(GameUiEvent.SHOW_TIME_TRAVEL);
    }.bind(this)), this.game.getEventManager().addListener("factoryMenuUi", GameEvent.GAME_TICK, function() {
      this.updateButtons();
    }.bind(this)), this.updateButtons();
  }, n.prototype.updateButtons = function() {
    this.factory.getGame().getAchievementsManager().getAchievement("makingProfit") ? this.container.find("#researchButton").show() : this.container.find("#researchButton").hide(), this.factory.getGame().getAchievementsManager().getAchievement("gettingSmarter") ? this.container.find("#upgradesButton").show() : this.container.find("#upgradesButton").hide(), this.factory.getGame().getAchievementsManager().getAchievement("collectingCash2") ? this.container.find("#statisticsButton").show() : this.container.find("#statisticsButton").hide(), this.factory.getGame().getAchievementsManager().getAchievement("collectingCash") ? (this.container.find("#extraButton").show(), this.container.find("#timeTravelButton").show()) : (this.container.find("#extraButton").hide(), this.container.find("#timeTravelButton").hide());
  }, n.prototype.destroy = function() {
    this.game.getEventManager().removeListenerForType("factoryMenuUi"), this.gameUiEm.removeListenerForType("factoryMenuUi"), this.globalUiEm.removeListenerForType("factoryMenuUi"), this.container.html(""), this.container = null;
  }, n;
});
