/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/helper/LoadingUi
 */
define("ui/helper/LoadingUi", ["text!template/helper/loading.html"], function(e) {
  var t = 0, n = function(e2) {
    this.title = e2 || "正在读取本地存档...", this.id = "loading" + t, t++, this.idBg = this.id + "Bg";
  };
  return n.prototype.setClickCallback = function(e2) {
    return this.clickCallback = e2, this;
  }, n.prototype.display = function() {
    var t2 = this;
    return this.container = $("body"), this.container.append(Handlebars.compile(e)({ id: this.id, idBg: this.idBg, title: this.title })), this.element = this.container.find("#" + this.id), this.bg = this.container.find("#" + this.idBg), this.element.css("top", Math.round(($(window).height() - this.element.height()) / 2)), this.element.css("left", Math.round(($(window).width() - this.element.width()) / 2)), this.element.hide().fadeIn(200), this.bg.hide().fadeIn(200), this.clickCallback && this.bg.click(function() {
      t2.clickCallback(), t2.hide();
    }), this;
  }, n.prototype.hide = function() {
    var e2 = this;
    this.element && this.element.fadeOut(200, function() {
      e2.element.remove();
    }), this.bg && this.bg.fadeOut(200, function() {
      e2.bg.remove();
    });
  }, n;
});
