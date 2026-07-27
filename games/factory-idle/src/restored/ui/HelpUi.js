/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/HelpUi
 */
define("ui/HelpUi", ["text!template/help.html"], function(e) {
  var t = function(e2, t2) {
    this.gameUiEm = e2, this.game = t2, this.isVisible = false;
  };
  return t.prototype.init = function() {
    return this.gameUiEm.addListener("help", GameUiEvent.SHOW_HELP, function() {
      this.display();
    }.bind(this)), this;
  }, t.prototype.display = function() {
    if (!this.isVisible) {
      $("body").append(Handlebars.compile(e)({}));
      var t2 = this;
      this.isVisible = true;
      var n = $("#help");
      n.css("left", ($("html").width() - n.outerWidth()) / 2), n.find(".closeButton").click(function() {
        t2.hide();
      });
      var i = {};
      n.find(".menu a").each(function() {
        var e2 = $(this).attr("data-id");
        i[e2] = n.find("#" + e2), $(this).click(function() {
          for (var t3 in i) i[t3].hide();
          i[e2].fadeIn();
        });
      }), $("#gettingStarted").show(), $("#helpBg").click(function() {
        t2.hide();
      });
    }
  }, t.prototype.hide = function() {
    this.isVisible = false, $("#help").remove(), $("#helpBg").remove();
  }, t.prototype.destroy = function() {
    this.hide(), this.game.getEventManager().removeListenerForType("help"), this.gameUiEm.removeListenerForType("help");
  }, t;
});
