/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/AchievementPopupUi
 */
define("ui/AchievementPopupUi", ["text!template/achievementPopup.html"], function(e) {
  var t = 0, n = 1, i = function(e2, t2) {
    this.game = e2, this.achievementId = t2, this.id = "achievementPopup" + n++, this.interval = null;
  };
  return i.prototype.display = function() {
    var n2 = this;
    this.container = $("body");
    var i2 = this.game.getMeta().achievementsById[this.achievementId];
    this.container.append(Handlebars.compile(e)({ idStr: this.id, name: i2.name, requirement: this.game.getAchievementsManager().getTesterDescriptionText(i2.id), bonus: this.game.getAchievementsManager().getBonusDescriptionText(i2.id) })), this.element = this.container.find("#" + this.id).hide(), this.element.click(function() {
      n2.hide();
    }), this.interval = setTimeout(function() {
      this.hide();
    }.bind(this), 8e3), this.element.css("left", this.container.width() / 2 - this.element.outerWidth() / 2), this.element.css("top", 150 + t * (this.element.outerHeight() + 10)), this.element.slideDown(400), t++;
  }, i.prototype.hide = function() {
    var e2 = this;
    this.element && this.element.slideUp(400, function() {
      e2.element.remove();
    }), clearTimeout(this.interval), t--;
  }, i;
});
