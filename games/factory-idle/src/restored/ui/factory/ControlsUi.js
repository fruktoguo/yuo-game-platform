/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/factory/ControlsUi
 */
define("ui/factory/ControlsUi", ["text!template/factory/controls.html", "game/action/ClearPackagesAction", "game/action/ResetFactoryAction", "ui/helper/ConfirmUi"], function(e, t, n, i) {
  var r = "factoryControlsUi", o = function(e2) {
    this.factory = e2, this.game = e2.getGame();
  };
  return o.prototype.updateControlButtons = function() {
    this.game.getTicker().getBonusTicks() ? (this.bonusTicks.show(), this.game.getTicker().getIsFastActive() ? (this.playFastButton.hide(), this.playNormalButton.show()) : (this.playFastButton.show(), this.playNormalButton.hide())) : (this.bonusTicks.hide(), this.playFastButton.hide(), this.playNormalButton.hide()), this.factory.getIsPaused() ? (this.playButton.show(), this.pauseButton.hide()) : (this.playButton.hide(), this.pauseButton.show());
  }, o.prototype.updateBonusTicksValue = function() {
    this.bonusTicks.find("span").html(nf(this.game.getTicker().getBonusTicks())), this.updateControlButtons();
  }, o.prototype.display = function(o2) {
    var s = this;
    this.container = o2, this.container.html(Handlebars.compile(e)()), this.game.getEventManager().addListener(r, GameEvent.TICKS_STARTED, function() {
      s.updateControlButtons();
    }), this.game.getEventManager().addListener(r, GameEvent.TICKS_STOPPED, function() {
      s.updateControlButtons();
    }), this.pauseButton = this.container.find("#stopButton"), this.playButton = this.container.find("#playButton"), this.playFastButton = this.container.find("#playFastButton"), this.playNormalButton = this.container.find("#playNormalButton"), this.bonusTicks = this.container.find("#bonusTicks"), this.clearPackagesButton = this.container.find("#clearPackages"), this.resetFactoryButton = this.container.find("#resetFactory"), this.updateControlButtons(), this.updateBonusTicksValue(), this.pauseButton.click(function() {
      s.game.getTicker().stopFast(), s.factory.setIsPaused(true), s.updateControlButtons();
    }), this.playButton.click(function() {
      s.game.getTicker().stopFast(), s.factory.setIsPaused(false), s.updateControlButtons();
    }), this.playFastButton.click(function() {
      s.game.getTicker().startFast(), s.factory.setIsPaused(false), s.updateControlButtons();
    }), this.playNormalButton.click(function() {
      s.game.getTicker().stopFast(), s.factory.setIsPaused(false), s.updateControlButtons();
    }), this.clearPackagesButton.click(function() {
      var e2 = new t(this.factory);
      e2.canClear() && e2.clear();
    }.bind(this)), this.resetFactoryButton.click(function() {
      new i("重置当前布局", "将移除地图上的全部设施与传送带，已投入的建造费用会按规则结算。").setOkTitle("确认重置").setCancelTitle("取消").setOkCallback(function() {
        var e2 = new n(this.factory);
        e2.canReset() && e2.reset();
      }.bind(this)).display();
    }.bind(this)), this.game.getEventManager().addListener(r, GameEvent.BONUS_TICKS_UPDATED, function() {
      this.updateBonusTicksValue();
    }.bind(this));
  }, o.prototype.destroy = function() {
    this.game.getEventManager().removeListenerForType(r), this.container.html(""), this.container = null;
  }, o;
});
