/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/factory/ScreenShotUi
 */
define("ui/factory/ScreenShotUi", [], function() {
  var e = function(e2, t, n, i, r) {
    this.tileSize = t.tileSize, this.tilesX = e2.getMeta().tilesX, this.tilesY = e2.getMeta().tilesY, this.backgroundCanvas = n, this.componentsCanvas = i, this.packagesCanvas = r;
  };
  return e.prototype.open = function() {
    this.canvas = document.createElement("canvas"), this.canvas.width = this.tilesX * this.tileSize, this.canvas.height = this.tilesY * this.tileSize;
    var e2 = this.canvas.getContext("2d"), t = window.open("about:blank", "异星工厂完整地图");
    e2.drawImage(this.backgroundCanvas, 0, 0), e2.drawImage(this.componentsCanvas, 0, 0), e2.drawImage(this.packagesCanvas, 0, 0), t && t.document.write("<html lang='zh-CN'><head><title>异星工厂完整地图</title></head><body style='text-align:center;background:#071012;color:#e9f3ef;font-family:sans-serif'><div style='margin:16px'>可右键保存完整地图，或使用浏览器截图。</div><img src='" + this.canvas.toDataURL("image/png") + "' alt='异星工厂完整地图'/></body></html>");
  }, e;
});
