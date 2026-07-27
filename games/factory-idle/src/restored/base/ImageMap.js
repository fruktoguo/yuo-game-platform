/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：base/ImageMap
 */
define("base/ImageMap", [], function() {
  var e = function(e2) {
    this.path = e2, this.noOfImages = 0, this.noOfImagesLoaded = 0, this.imagesData = {}, this.images = {};
  };
  return e.prototype.addImages = function(e2) {
    for (var t in e2) this.imagesData[t] || (this.noOfImages++, this.imagesData[t] = this.path + e2[t]);
    return this;
  }, e.prototype.loadAll = function(e2) {
    logger.info("ImageMap", "Start loading " + this.noOfImages + " images");
    var t = this;
    for (var n in this.imagesData) {
      var i = new Image();
      i.onload = function() {
        ++t.noOfImagesLoaded == t.noOfImages && (logger.info("ImageMap", "Loaded " + t.noOfImagesLoaded + " images"), e2());
      }, i.src = this.imagesData[n] + "?x=" + Math.random(), this.images[n] = i;
    }
  }, e.prototype.getImage = function(e2) {
    return this.images[e2];
  }, e;
});
