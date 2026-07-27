/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/helper/ConfirmUi
 */
define("ui/helper/ConfirmUi", ["text!template/helper/confirm.html"], function(e) {
  var t = 0, n = function(e2, n2) {
    this.title = e2, this.message = n2, this.okTitle = "确定", this.cancelTitle = "取消", this.id = "confirm" + t++, this.idBg = this.id + "Bg";
  };
  return n.prototype.setOkTitle = function(e2) {
    return this.okTitle = e2, this;
  }, n.prototype.setCancelTitle = function(e2) {
    return this.cancelTitle = e2, this;
  }, n.prototype.setOkCallback = function(e2) {
    return this.okCallback = e2, this;
  }, n.prototype.setCancelCallback = function(e2) {
    return this.cancelCallback = e2, this;
  }, n.prototype.display = function() {
    var t2 = this;
    return this.container = $("body"), this.container.append(Handlebars.compile(e)({ id: this.id, idBg: this.idBg, title: this.title, message: this.message, okTitle: this.okTitle, cancelTitle: this.cancelTitle })), this.element = this.container.find("#" + this.id), this.bg = this.container.find("#" + this.idBg), this.element.find(".okButton").click(function() {
      t2.hide(), t2.okCallback && t2.okCallback();
    }), this.element.find(".cancelButton").click(function() {
      t2.hide(), t2.cancelCallback && t2.cancelCallback();
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
