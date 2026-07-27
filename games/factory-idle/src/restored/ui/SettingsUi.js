/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/SettingsUi
 */
define("ui/SettingsUi", ["text!template/settings.html", "ui/helper/LoadingUi", "ui/helper/ConfirmUi"], function(e, t, n) {
  var i = function(e2, t2, n2, i2, r) {
    this.gameUiEm = e2, this.play = t2, this.game = n2, this.userHash = i2, this.saveManager = r, this.isVisible = false;
  };
  return i.prototype.init = function() {
    return this.gameUiEm.addListener("settingsUi", GameUiEvent.SHOW_SETTINGS, function() {
      this.display();
    }.bind(this)), this;
  }, i.prototype.display = function() {
    if (!this.isVisible) {
      var e2 = false, n2 = new t().setClickCallback(function() {
        e2 = true;
      }.bind(this)).display();
      this.saveManager.getSavesInfo(["slot1", "slot2", "slot3"], function(t2) {
        e2 || (n2.hide(), this._display(t2));
      }.bind(this));
    }
  }, i.prototype._display = function(t2) {
    for (var i2 = [], r = 1; r <= 3; r++) {
      var o = t2["slot" + r];
      i2.push({ id: "slot" + r, name: "存档槽 " + r, hasSave: !!o, lastSave: o ? dateToStr(new Date(1e3 * o.timestamp), false) : "-", ticks: o ? o.ver : "-" });
    }
    $("body").append(Handlebars.compile(e)({ userHash: this.userHash.toString(), cloudSaveInterval: Math.ceil(this.saveManager.getCloudSaveInterval() / 6e4) + " 分钟", localSaveInterval: Math.ceil(this.saveManager.getLocalSaveInterval() / 1e3) + " 秒", saveSlots: i2, devMode: this.play.isDevMode() }));
    var s = this;
    this.isVisible = true;
    var a = $("#settings");
    a.css("left", ($("html").width() - a.outerWidth()) / 2), a.find(".closeButton").click(function() {
      s.hide();
    }), a.find("#userHash").click(function() {
      $(this).get(0).setSelectionRange(0, $(this).val().length);
    }), a.find("#updateUserHashButton").click(function() {
      var e2 = a.find("#updateUserHash").val();
      e2 && (s.userHash.updateUserHash(e2), document.location = document.location);
    }), a.find("#copyToClipboardButton").click(function() {
      $("#userHash").get(0).select();
      try {
        var e2 = document.execCommand("copy"), t3 = e2 ? "成功" : "失败";
        console.log("复制存档标识" + t3);
      } catch (e3) {
        console.log("复制存档标识失败");
      }
    }), a.find(".saveToSlot").click(function() {
      var e2 = $(this).attr("data-id");
      s.saveManager.saveManual(e2, function() {
        s.hide();
      });
    }), a.find(".loadSlot").click(function() {
      var e2 = $(this).attr("data-id");
      new n("读取手动存档", "读取后会覆盖当前尚未保存的进度。").setOkTitle("确认读取").setCancelTitle("取消").setOkCallback(function() {
        s.saveManager.loadManual(e2, function() {
          s.hide(), s.gameUiEm.invokeEvent(GameUiEvent.SHOW_FACTORIES);
        });
      }).display();
    }), a.find("#loadDataButton").click(function() {
      var e2 = a.find("#loadData").val();
      s.saveManager.updateGameFromSaveData({ data: e2 }), s.hide(), s.gameUiEm.invokeEvent(GameUiEvent.SHOW_FACTORIES);
    }), a.find("#resetGame").click(function() {
      new n("重置游戏进度", "当前自动存档会被清除，手动存档槽仍会保留。").setOkTitle("确认重置").setCancelTitle("取消").setOkCallback(function() {
        MainInstance.destroy(), MainInstance.init(true), s.destroy();
      }).display();
    }), $("#settingsBg").click(function() {
      s.hide();
    });
  }, i.prototype.hide = function() {
    this.isVisible = false, $("#settings").remove(), $("#settingsBg").remove();
  }, i.prototype.destroy = function() {
    this.hide(), this.game.getEventManager().removeListenerForType("settingsUi"), this.gameUiEm.removeListenerForType("settingsUi");
  }, i;
});
