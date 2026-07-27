/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/RunningInBackgroundInfoUi
 */
define("ui/RunningInBackgroundInfoUi", ["text!template/runningInBackgroundInfoUi.html"], function(e) {
  var t = "RunningInBackgroundInfoUi", n = function(e2) {
    this.globalUiEm = e2, this.timer = null;
  };
  return n.prototype.init = function() {
    this.globalUiEm.addListener(t, GlobalUiEvent.FOCUS, function() {
      this.hide();
    }.bind(this)), this.globalUiEm.addListener(t, GlobalUiEvent.BLUR, function() {
      this.delayedDisplay();
    }.bind(this));
  }, n.prototype.destroy = function() {
    this.globalUiEm.removeListenerForType(t);
  }, n.prototype.delayedDisplay = function() {
    this.timer && clearTimeout(this.timer), this.timer = setTimeout(function() {
      this.display();
    }.bind(this), 15e3);
  }, n.prototype.display = function() {
    this.container = $("body"), this.container.append(Handlebars.compile(e)({})), this.backgroundElement = this.container.find(".runningInBackgroundInfoUiBg"), this.containerElement = this.container.find(".runningInBackgroundInfoUi"), this.containerElement.css("left", this.container.width() / 2 - this.containerElement.outerWidth() / 2).css("top", 150), this.backgroundElement.hide().fadeIn(500), this.containerElement.hide().fadeIn(500);
  }, n.prototype.hide = function() {
    this.timer && clearTimeout(this.timer), this.backgroundElement && (this.backgroundElement.remove(), this.backgroundElement = null), this.containerElement && (this.containerElement.remove(), this.containerElement = null);
  }, n;
});
