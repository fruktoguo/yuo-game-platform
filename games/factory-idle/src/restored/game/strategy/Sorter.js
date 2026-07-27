/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/strategy/Sorter
 */
define("game/strategy/Sorter", ["Game/strategy/helper/ResourceIntake", "Game/strategy/helper/ResourceOutput", "Game/strategy/helper/DelayedAction", "game/strategy/helper/Package"], function(e, t, n, i) {
  var r = function(e2, t2) {
    this.component = e2, this.meta = t2, this.inputTileIndex = 0, this.inItem = null, this.inSortingItem = null, this.outItem = null, this.distributeTileIndexes = { default: 0 }, this.sortingIndex = {};
    for (var i2 in this.component.getMeta().allowedOutputs) this.sortingIndex[i2] = null;
    this.producer = new n(this.meta.interval), this.producer.canStart = this.canStartSorting.bind(this), this.producer.start = this.startSorting.bind(this), this.producer.finished = this.finishedSorting.bind(this);
  };
  return r.prototype.clearContents = function() {
    this.inputTileIndex = 0, this.inItem = null, this.inSortingItem = null, this.outItem = null, this.distributeTileIndexes = { default: 0 };
    for (var e2 in this.sortingIndex) this.sortingIndex[e2] && (this.distributeTileIndexes[this.sortingIndex[e2]] = 0);
    this.producer.reset();
  }, r.getMetaDescriptionData = function(e2, t2, n2) {
    return {};
  }, r.prototype.getDescriptionData = function() {
    var e2 = r.getMetaDescriptionData(this.component.getMeta(), this.component.getFactory(), this);
    return this.producer.updateWithDescriptionData(e2), e2;
  }, r.prototype.getSortingIndex = function() {
    return this.sortingIndex;
  }, r.prototype.setSortingResource = function(e2, t2, n2) {
    this.sortingIndex[e2 + ":" + t2] = n2, this.clearContents();
  }, r.prototype.getSortingResource = function(e2, t2) {
    return this.sortingIndex[e2 + ":" + t2];
  }, r.prototype.calculateInputTick = function() {
    if (null == this.inItem) {
      for (var e2 = this.component.getSurroundedInputTiles(), t2 = this.inputTileIndex, n2 = 0; n2 < e2.length; n2++) {
        var i2 = e2[(this.inputTileIndex + n2) % e2.length], r2 = i2.tile.getComponent().getStrategy().getOutputQueue(i2.direction), o = r2.getLast();
        o && !this.inItem && (r2.unsetLast(), t2 = (this.inputTileIndex + n2 + 1) % e2.length, this.inItem = o), r2.forward();
      }
      this.inputTileIndex = t2;
    }
  }, r.prototype.calculateOutputTick = function() {
    this.producer.calculate(), this.moveItemOut();
  }, r.prototype.moveItemOut = function() {
    if (this.outItem) {
      var e2 = this.outItem.getResourceId();
      void 0 === this.distributeTileIndexes[e2] && (e2 = "default");
      for (var t2 = this.component.getSurroundedOutputTiles(), n2 = 0; n2 < t2.length; n2++) {
        var i2 = t2[this.distributeTileIndexes[e2]];
        this.distributeTileIndexes[e2] = (this.distributeTileIndexes[e2] + 1) % t2.length;
        var r2 = i2.from.getX() - this.component.getX(), o = i2.from.getY() - this.component.getY(), s = this.sortingIndex[r2 + ":" + o];
        if (!(s && s != this.outItem.getResourceId() || !s && void 0 !== this.distributeTileIndexes[this.outItem.getResourceId()])) {
          var a = i2.tile.getComponent().getStrategy().getInputQueue(i2.oppositeDirection);
          if (null == a.getFirst()) {
            a.setFirst(this.outItem), this.outItem = null;
            break;
          }
        }
      }
    }
  }, r.prototype.canStartSorting = function() {
    return !this.outItem && this.inItem;
  }, r.prototype.startSorting = function() {
    this.inSortingItem = this.inItem, this.inItem = null;
  }, r.prototype.finishedSorting = function() {
    this.outItem = this.inSortingItem, this.inSortingItem = null, this.moveItemOut();
  }, r.prototype.toString = function() {
    var e2 = "";
    e2 += "Next: " + (this.inItem ? this.inItem.getResourceId() : "-") + "<br />", e2 += "Sorting: " + (this.inSortingItem ? this.inSortingItem.getResourceId() : "-") + "<br />", e2 += "Out: " + (this.outItem ? this.outItem.getResourceId() : "-") + "<br />", e2 += this.producer.toString() + "<br />", e2 += "Sort rules: <br />";
    for (var t2 in this.sortingIndex) e2 += t2 + ": " + this.sortingIndex[t2] + "<br />";
    e2 += "<br />", e2 += "Input index: " + this.inputTileIndex + "<br />", e2 += "Out indexes: <br />";
    for (var t2 in this.distributeTileIndexes) e2 += t2 + ": " + this.distributeTileIndexes[t2] + "<br />";
    return e2;
  }, r.prototype.exportToWriter = function(e2) {
    e2.writeUint8(this.inputTileIndex), i.staticExportData(this.inItem, e2), i.staticExportData(this.inSortingItem, e2), i.staticExportData(this.outItem, e2), e2.writeUint8(this.distributeTileIndexes.default);
    for (var t2 in this.sortingIndex) {
      var n2 = this.sortingIndex[t2], r2 = 0, o = 0;
      n2 && (r2 = this.component.getFactory().getGame().getMeta().resourcesById[n2].idNum, o = this.distributeTileIndexes[n2]), e2.writeUint8(r2), e2.writeUint8(o);
    }
    this.producer.exportToWriter(e2);
  }, r.prototype.importFromReader = function(e2, t2) {
    this.inputTileIndex = e2.readUint8(), this.inItem = i.createFromExport(this.component.getFactory(), e2, t2), this.inSortingItem = i.createFromExport(this.component.getFactory(), e2, t2), this.outItem = i.createFromExport(this.component.getFactory(), e2, t2), this.distributeTileIndexes = {}, this.distributeTileIndexes.default = e2.readUint8();
    for (var n2 in this.sortingIndex) {
      var r2 = e2.readUint8();
      this.sortingIndex[n2] = r2 ? this.component.getFactory().getGame().getMeta().resourcesByIdNum[r2].id : null, this.distributeTileIndexes[this.sortingIndex[n2]] = e2.readUint8();
    }
    this.producer.importFromReader(e2, t2);
  }, r;
});
