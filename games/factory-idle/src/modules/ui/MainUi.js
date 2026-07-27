define("ui/MainUi", [
  "config/Meta",
  "config/config",
  "base/EventManager",
  "game/Game",
  "ui/GameUi",
  "ui/MissionsUi",
  "ui/RunningInBackgroundInfoUi",
  "ui/helper/AlertUi",
  "ui/IntroUi"
], function(
  meta,
  config,
  EventManager,
  _Game,
  GameUi,
  MissionsUi,
  RunningInBackgroundInfoUi,
  AlertUi,
  IntroUi
) {
  var MainUi = function(play, imageMap) {
    this.globalUiEm = new EventManager(GlobalUiEvent, "MainUi");
    this.play = play;
    this.imageMap = imageMap;
  };

  MainUi.prototype.setupFocusChecker = function() {
    var isFocused = document.hasFocus();
    this.focusInterval = window.setInterval(function() {
      var nextFocus = document.hasFocus();
      if (isFocused === nextFocus) return;
      isFocused = nextFocus;
      this.globalUiEm.invokeEvent(
        isFocused ? GlobalUiEvent.FOCUS : GlobalUiEvent.BLUR
      );
    }.bind(this), 200);
  };

  MainUi.prototype.display = function(container) {
    this.container = container;
    this.runningInBackgroundInfoUi = new RunningInBackgroundInfoUi(this.globalUiEm);
    this.runningInBackgroundInfoUi.init();

    if (this.play.getGame().getTicker().getNoOfTicks() < 1000) {
      new IntroUi().display();
    }

    this.setupFocusChecker();

    window.addEventListener("keypress", function(event) {
      this.globalUiEm.invokeEvent(GlobalUiEvent.KEY_PRESS, event);
    }.bind(this), false);
    window.addEventListener("beforeunload", function() {
      this.play.getSaveManager().saveAuto(function() {});
    }.bind(this));

    this.globalUiEm.addListener("MainUi", GlobalUiEvent.SHOW_MAIN_GAME, function() {
      this.showUi("mainGame");
    }.bind(this));
    this.globalUiEm.addListener("MainUi", GlobalUiEvent.SHOW_MISSIONS, function() {
      this.showUi("missions");
    }.bind(this));
    this.globalUiEm.addListener("MainUi", GlobalUiEvent.SHOW_MISSION, function(missionId) {
      this.showUi("mission", missionId);
    }.bind(this));

    this.play.getGame().getEventManager().addListener(
      "MainUi",
      GameEvent.GAME_TICK,
      function() {
        var ticks = this.play.getGame().getTicker().getNoOfTicks();
        if (!config.main.warnToStoreUserHashAfterTicks[ticks]) return;

        var inputId = "userHashAlert" + Math.round(Math.random() * 10000000000);
        var message =
          "请备份这一本地存档标识：<br />" +
          '<input type="text" readonly id="' + inputId + '" value="' +
          this.play.getUserHash().toString() +
          '" style="border:1px solid red;background:black;color:red;font-weight:bold;padding:4px;margin:3px;width:280px;text-align:center" />';
        new AlertUi("存档标识", message).display();
        $("#" + inputId).click(function() {
          this.setSelectionRange(0, this.value.length);
        });
      }.bind(this)
    );

    this.showUi("mainGame");
  };

  MainUi.prototype.showUi = function(view, missionId) {
    this.destroyCurrentUi();
    if (view === "mainGame") {
      this.currentUi = new GameUi(
        this.globalUiEm,
        this.play.getGame(),
        this.play,
        this.imageMap
      );
    } else if (view === "missions") {
      this.currentUi = new MissionsUi(this.globalUiEm, meta.missions);
    } else if (view === "mission") {
      this.currentUi = new GameUi(
        this.globalUiEm,
        this.play.getMission(missionId),
        this.play,
        this.imageMap
      );
    }
    this.currentUi.display(this.container);
  };

  MainUi.prototype.destroyCurrentUi = function() {
    if (!this.currentUi) return;
    this.currentUi.destroy();
    this.currentUi = null;
  };

  MainUi.prototype.destroy = function() {
    window.clearInterval(this.focusInterval);
    this.runningInBackgroundInfoUi.destroy();
    this.globalUiEm.removeListenerForType("MainUi");
    this.play.getGame().getEventManager().removeListenerForType("MainUi");
    this.container = null;
  };

  return MainUi;
});
