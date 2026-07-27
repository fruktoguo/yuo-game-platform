/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/GameUi
 */
define("ui/GameUi", ["base/EventManager", "ui/FactoriesUi", "ui/FactoryUi", "ui/ResearchUi", "ui/UpgradesUi", "ui/AchievementsUi", "ui/AchievementPopupUi", "ui/HelpUi", "ui/StatisticsUi", "ui/PurchasesUi", "ui/SettingsUi", "ui/TimeTravelUi"], function(e, t, n, i, r, o, s, a, u, c, l, h) {
  var p = function(t2, n2, i2, r2) {
    this.globalUiEm = t2, this.gameUiEm = new e(GameUiEvent, "GameUi"), this.play = i2, this.game = n2, this.imageMap = r2, this.focusInterval = null;
  };
  return p.prototype.display = function(e2) {
    this.game.getMeta().isMission && this.game.init(), this.container = e2, this.setupEvents(), this.helpUi = new a(this.gameUiEm, this.game).init(), this.purchasesUi = new c(this.gameUiEm, this.play).init(), this.settingsUi = new l(this.gameUiEm, this.play, this.game, this.play.getUserHash(), this.play.getSaveManager()).init(), this.timeTravelUi = new h(this.gameUiEm, this.play).init(), this._showUi("factories"), this.game.getMeta().isMission && this.gameUiEm.invokeEvent(GameUiEvent.SHOW_FACTORY, "mission");
  }, p.prototype.setupEvents = function() {
    var e2 = null;
    this.gameUiEm.addListener("GameUi", GameUiEvent.SHOW_FACTORY, function(t2) {
      t2 ? e2 = t2 : t2 = e2, this._showUi("factory", t2);
    }.bind(this)), this.gameUiEm.addListener("GameUi", GameUiEvent.SHOW_FACTORIES, function() {
      this._showUi("factories");
    }.bind(this)), this.gameUiEm.addListener("GameUi", GameUiEvent.SHOW_RESEARCH, function() {
      this._showUi("research");
    }.bind(this)), this.gameUiEm.addListener("GameUi", GameUiEvent.SHOW_UPGRADES, function(t2) {
      t2 ? e2 = t2 : t2 = e2, this._showUi("upgrades", t2);
    }.bind(this)), this.gameUiEm.addListener("GameUi", GameUiEvent.SHOW_ACHIEVEMENTS, function() {
      this._showUi("achievements");
    }.bind(this)), this.gameUiEm.addListener("GameUi", GameUiEvent.SHOW_STATISTICS, function() {
      this._showUi("statistics", e2);
    }.bind(this)), this.game.getEventManager().addListener("GameUi", GameEvent.ACHIEVEMENT_RECEIVED, function(e3) {
      new s(this.game, e3).display();
    }.bind(this)), this.globalUiEm.addListener("GameUi", GlobalUiEvent.FOCUS, function() {
      this.game.getEventManager().invokeEvent(GameEvent.FOCUS);
    }.bind(this)), this.globalUiEm.addListener("GameUi", GlobalUiEvent.BLUR, function() {
      this.game.getEventManager().invokeEvent(GameEvent.BLUR);
    }.bind(this));
  }, p.prototype._showUi = function(e2, s2) {
    this._destroyCurrentUi(), "factory" == e2 ? this.currentUi = new n(this.globalUiEm, this.gameUiEm, this.game.getFactory(s2), this.play, this.imageMap) : "factories" == e2 ? this.currentUi = new t(this.globalUiEm, this.gameUiEm, this.game) : "research" == e2 ? this.currentUi = new i(this.gameUiEm, this.game) : "upgrades" == e2 ? this.currentUi = new r(this.gameUiEm, this.game.getFactory(s2)) : "achievements" == e2 ? this.currentUi = new o(this.gameUiEm, this.game) : "statistics" == e2 && (this.currentUi = new u(this.gameUiEm, this.game.getFactory(s2), this.imageMap)), this.currentUi.display(this.container);
  }, p.prototype._destroyCurrentUi = function() {
    this.currentUi && (this.currentUi.destroy(), this.currentUi = null);
  }, p.prototype.destroy = function() {
    this._destroyCurrentUi(), this.helpUi.destroy(), this.purchasesUi.destroy(), this.settingsUi.destroy(), this.timeTravelUi.destroy(), this.game.getMeta().isMission && this.game.destroy(), this.globalUiEm.removeListenerForType("GameUi"), this.gameUiEm.removeListenerForType("GameUi"), this.game.getEventManager().removeListenerForType("GameUi"), this.container = null, this.focusInterval && clearInterval(this.focusInterval);
  }, p;
});
