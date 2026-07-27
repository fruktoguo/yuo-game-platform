/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/helper/TipUi
 */
define("ui/helper/TipUi", ["text!template/helper/tip.html"], function(e) {
  var t = 0, n = function(e2, t2) {
    this.initElement = e2, "string" == typeof t2 ? this.content = t2 : this.element = t2, this.isVisible = false;
  };
  return n.prototype.init = function() {
    var n2 = this;
    if (!this.element) {
      this.id = "tip" + t++;
      var i = $("body");
      i.append(Handlebars.compile(e)({ id: this.id, content: this.content })), this.element = i.find("#" + this.id);
    }
    return this.element.css("position", "absolute").hide(), this.mouseMove = function(e2) {
      n2.updateLocation(e2), n2.display();
    }, this.mouseOut = function(e2) {
      n2.hide();
    }, this.initElement.bind("mousemove", this.mouseMove).bind("mouseout", this.mouseOut), this;
  }, n.prototype.destroy = function() {
    return this.hide(), this.initElement.unbind("mousemove", this.mouseMove).unbind("mouseout", this.mouseOut), this;
  }, n.prototype.display = function() {
    this.isVisible || (this.isVisible = true, this.element.fadeIn(200));
  }, n.prototype.updateLocation = function(e2) {
    var t2 = this.element.width(), n2 = this.element.height(), i = e2.pageX - t2 / 2, r = e2.pageY + 15, o = $(window).width(), s = $(window).height(), a = $(window).scrollLeft(), u = $(window).scrollTop();
    i - a < 10 && (i = a + 10), i + t2 - a > o - 20 && (i = o + a - t2 - 20), r + n2 - u > s - 20 && (r = e2.pageY - n2 - 20), this.element.css("left", i).css("top", r);
  }, n.prototype.hide = function() {
    this.isVisible && (this.element.finish().fadeOut(200), this.isVisible = false);
  }, n;
});
