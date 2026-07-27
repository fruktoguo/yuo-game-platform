/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/helper/AlertUi
 */
define("ui/helper/AlertUi", ["text!template/helper/alert.html"], function(e) {
  var t = 0, n = function(e2, n2) {
    this.title = e2, this.message = n2, this.buttonTitle = "确定", this.id = "alert" + t++, this.idBg = this.id + "Bg";
  };
  return n.prototype.setButtonTitle = function(e2) {
    return this.buttonTitle = e2, this;
  }, n.prototype.setCallback = function(e2) {
    return this.callback = e2, this;
  }, n.prototype.display = function() {
    var t2 = this;
    return this.container = $("body"), this.container.append(Handlebars.compile(e)({ id: this.id, idBg: this.idBg, title: this.title, message: this.message, buttonTitle: this.buttonTitle })), this.element = this.container.find("#" + this.id), this.bg = this.container.find("#" + this.idBg), this.element.find(".button").click(function() {
      t2.hide(), t2.callback && t2.callback();
    }), this.element.css("top", Math.round(($(window).height() - this.element.height()) / 2)), this.element.css("left", Math.round(($(window).width() - this.element.width()) / 2)), this.bg.hide().fadeIn(200), this.element.hide().fadeIn(200), this;
  }, n.prototype.hide = function() {
    var e2 = this;
    this.element && this.element.fadeOut(200, function() {
      e2.element.remove();
    }), this.bg && this.bg.fadeOut(200, function() {
      e2.bg.remove();
    });
  }, n;
});
