/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/IntroUi
 */
define("ui/IntroUi", ["text!template/intro.html"], function(e) {
  var t = function() {
    this.isVisible = false;
  };
  return t.prototype.display = function() {
    if (!this.isVisible) {
      $("body").append(Handlebars.compile(e)({}));
      var t2 = this;
      this.isVisible = true;
      var n = $("#intro");
      n.css("left", ($("html").width() - n.width()) / 2), n.find(".closeButton").click(function() {
        t2.hide();
      });
      var i = {};
      n.find(".menu a").each(function() {
        var e2 = $(this).attr("data-id");
        i[e2] = n.find("#" + e2), $(this).click(function() {
          for (var t3 in i) i[t3].hide();
          i[e2].fadeIn();
        });
      }), $("#gettingStarted").show(), $("#introBg").click(function() {
        t2.hide();
      });
    }
  }, t.prototype.hide = function() {
    this.isVisible = false, $("#intro").remove(), $("#introBg").remove();
  }, t.prototype.destroy = function() {
    this.hide(), this.game.getEventManager().removeListenerForType("intro"), this.gameUiEm.removeListenerForType("intro");
  }, t;
});
