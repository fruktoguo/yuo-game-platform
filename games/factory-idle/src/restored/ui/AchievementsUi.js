/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/AchievementsUi
 */
define("ui/AchievementsUi", ["text!template/achievements.html"], function(e) {
  var t = function(e2, t2) {
    this.gameUiEm = e2, this.game = t2, this.manager = this.game.getAchievementsManager();
  };
  return t.prototype.display = function(t2) {
    var n = this;
    this.container = t2;
    for (var i = [], r = this.game.getMeta().achievements, o = 0; o < r.length; o++) {
      var s = r[o];
      this.manager.isVisible(s.id) && i.push({ id: s.id, name: s.name, requirements: this.manager.getTesterDescriptionText(s.id), bonus: this.manager.getBonusDescriptionText(s.id) });
    }
    this.container.html(Handlebars.compile(e)({ achievements: i })), this.container.find(".backButton").click(function(e2) {
      n.gameUiEm.invokeEvent(GameUiEvent.SHOW_FACTORY);
    }.bind(this)), this.game.getEventManager().addListener("achievementsUi", GameEvent.ACHIEVEMENT_RECEIVED, function() {
      this.update();
    }.bind(this)), this.update();
  }, t.prototype.update = function() {
    var e2 = this;
    this.container.find(".item").each(function() {
      var t2 = $(this).attr("data-id");
      $(this).find(".waiting");
      e2.manager.getAchievement(t2) ? $(this).addClass("achieved") : $(this).removeClass("achieved");
    });
  }, t.prototype.destroy = function() {
    this.game.getEventManager().removeListenerForType("achievementsUi"), this.gameUiEm.removeListenerForType("achievementsUi"), this.container.html(""), this.container = null;
  }, t;
});
