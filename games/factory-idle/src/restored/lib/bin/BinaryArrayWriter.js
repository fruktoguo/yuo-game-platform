/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：lib/bin/BinaryArrayWriter
 */
BinaryArrayWriter.prototype._write = function(e, t, n) {
  return this.data.push({ length: t, value: e, method: n }), this.totalLength += t, this;
}, BinaryArrayWriter.prototype.writeBooleanMap = function(e) {
  return this.writeUint8(e.getValue());
}, BinaryArrayWriter.prototype.writeChar = function(e) {
  return this.writeUint8(e.charCodeAt(0));
}, BinaryArrayWriter.prototype.writeInt8 = function(e) {
  return this._write(e, 1, "setInt8");
}, BinaryArrayWriter.prototype.writeInt16 = function(e) {
  return this._write(e, 2, "setInt16");
}, BinaryArrayWriter.prototype.writeInt32 = function(e) {
  return this._write(e, 4, "setInt32");
}, BinaryArrayWriter.prototype.writeUint8 = function(e) {
  return this._write(e, 1, "setUint8");
}, BinaryArrayWriter.prototype.writeUint16 = function(e) {
  return this._write(e, 2, "setUint16");
}, BinaryArrayWriter.prototype.writeUint32 = function(e) {
  return this._write(e, 4, "setUint32");
}, BinaryArrayWriter.prototype.writeFloat64 = function(e) {
  return this._write(e, 8, "setFloat64");
}, BinaryArrayWriter.prototype.writeWriter = function(e) {
  if (e) {
    this.writeInt32(e.getTotalLength());
    for (var t = e.getData(), n = 0; n < t.length; n++) this._write(t[n].value, t[n].length, t[n].method);
  } else this.writeInt32(0);
  return this;
}, BinaryArrayWriter.prototype.writeBooleansArrayFunc = function(e, t) {
  for (var n = null, i = 0; i < e.length; i++) null == n && (n = new BinaryBoolean()), n.writeBoolean(t(e[i]) ? 1 : 0), (i + 1) % 8 == 0 && (this.writeBooleanMap(n), n = null);
  return n && (n.fillZero(), this.writeBooleanMap(n)), this;
}, BinaryArrayWriter.prototype.getData = function() {
  return this.data;
}, BinaryArrayWriter.prototype.getTotalLength = function() {
  return this.totalLength;
}, BinaryArrayWriter.prototype.getBuffer = function() {
  for (var e = new ArrayBuffer(this.totalLength), t = new DataView(e, 0), n = 0, i = 0; i < this.data.length; i++) {
    var r = this.data[i];
    t[r.method](n, r.value), n += r.length;
  }
  return e;
}, define("lib/bin/BinaryArrayWriter", function() {
});
