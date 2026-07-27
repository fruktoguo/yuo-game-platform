/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/misc/productionTree2/ProductionGraphUi
 */
define("game/misc/productionTree2/ProductionGraphUi", [], function() {
  var e = function(e2, t) {
    this.rootNode = e2, this.imageMap = t, this.positions = {}, this.maxLevel = 0;
  };
  return e.prototype.display = function(e2) {
    var t = { node: this.rootNode, width: 0 };
    this.positions[this.rootNode.getId()] = t, this.calculateWidths(this.rootNode, this.positions), t.y = 0, t.x = t.width / 2 - 12.5, t.sx = 0, this.calculatePositions(this.rootNode, this.positions);
    var n = document.createElement("canvas");
    n.style.position = "absolute", n.width = t.width + 12.5, n.height = 33 * (this.maxLevel + 1), this.canvas = n, this.drawElements(this.rootNode, this.positions), e2.html(n), e2.width(n.width);
  }, e.prototype.calculateWidths = function(e2) {
    var t = e2.getChildren();
    for (var n in t) {
      var i = t[n];
      this.positions[i.getId()] = { node: i, width: 0 }, this.calculateWidths(i, this.positions), this.positions[e2.getId()].width += this.positions[i.getId()].width;
    }
    this.positions[e2.getId()].width || (this.positions[e2.getId()].width += 40);
  }, e.prototype.calculatePositions = function(e2) {
    this.maxLevel = Math.max(this.maxLevel, e2.getLevel());
    var t = this.positions[e2.getId()], n = e2.getChildren(), i = t.sx;
    for (var r in n) {
      var o = n[r], s = this.positions[o.getId()];
      s.y = 33 * o.getLevel(), s.x = i + s.width / 2 - 12.5, s.sx = i, i += s.width, this.calculatePositions(o, this.positions);
    }
  }, e.prototype.drawComponentIcon = function(e2, t, n) {
    var i = this.canvas.getContext("2d"), r = e2.getComponentMeta();
    i.drawImage(this.imageMap.getImage("componentIcons"), 26 * r.iconX, 26 * r.iconY, 25, 25, t, n, 25, 25);
  }, e.prototype.drawElements = function(e2) {
    var t = e2.getChildren(), n = this.positions[e2.getId()];
    for (var i in t) {
      var r = t[i], o = this.positions[r.getId()];
      this.drawLine(n.x + 12.5, n.y + 12.5, o.x + 12.5, o.y), this.drawElements(r, this.positions);
    }
    this.drawComponentIcon(e2, n.x, n.y), this.writeToNode(n.x + 25 + 2, n.y + 12.5 + 4, e2.amount);
  }, e.prototype.drawLine = function(e2, t, n, i) {
    var r = this.canvas.getContext("2d");
    r.beginPath(), r.strokeStyle = "rgb(201,201,201)", r.lineWidth = 1, r.moveTo(e2, t), r.lineTo(n, i), r.stroke();
  }, e.prototype.writeToNode = function(e2, t, n) {
    var i = this.canvas.getContext("2d");
    i.font = "11px Arial", i.textAlign = "left", i.fillStyle = "#FFFFFF", i.fillText(n, e2, t);
  }, e;
});
