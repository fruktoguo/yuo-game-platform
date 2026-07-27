/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/strategy/helper/Package
 */
define("game/strategy/helper/Package", [], function() {
  var e = [], t = function(e2, t2, n) {
    if (this.resourceId = e2, !n) throw new Error("Missing argument factory");
    this.meta = n.getGame().getMeta().resourcesById[e2], this.offset = Math.round(4 * Math.random()) - 2, this.amount = t2;
  };
  return t.getNew = function(n, i, r) {
    return e.length > 0 ? e.pop() : new t(n, i, r);
  }, t.free = function(t2) {
    e.push(t2);
  }, t.prototype.getResourceId = function() {
    return this.resourceId;
  }, t.prototype.getResourceIdNum = function() {
    return this.meta.idNum;
  }, t.prototype.toString = function() {
    return this.resourceId;
  }, t.prototype.getOffset = function() {
    return this.offset;
  }, t.prototype.getAmount = function() {
    return this.amount;
  }, t.staticExportData = function(e2, t2) {
    e2 ? (t2.writeUint8(e2.getResourceIdNum()), t2.writeUint8(e2.getAmount())) : t2.writeUint8(0);
  }, t.createFromExport = function(e2, n, i) {
    var r = n.readUint8();
    if (0 == r) return null;
    var o = i >= 6 ? n.readUint8() : 1, s = e2.getGame().getMeta().resourcesByIdNum[r];
    return s ? t.getNew(s.id, o, e2) : null;
  }, t;
});
