/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：lib/bin/BinaryArrayReader
 */
BinaryArrayReader.prototype._read = function(e, t) {
  var n = this.dataView[t](this.offset);
  return this.offset += e, n;
}, BinaryArrayReader.prototype.readBooleanMap = function() {
  return new BinaryBoolean(this.readUint8()).reverse();
}, BinaryArrayReader.prototype.readChar = function() {
  return String.fromCharCode(this.readInt8());
}, BinaryArrayReader.prototype.readInt8 = function() {
  return this._read(1, "getInt8");
}, BinaryArrayReader.prototype.readInt16 = function() {
  return this._read(2, "getInt16");
}, BinaryArrayReader.prototype.readInt32 = function() {
  return this._read(4, "getInt32");
}, BinaryArrayReader.prototype.readUint8 = function() {
  return this._read(1, "getUint8");
}, BinaryArrayReader.prototype.readUint16 = function() {
  return this._read(2, "getUint16");
}, BinaryArrayReader.prototype.readUint32 = function() {
  return this._read(4, "getUint32");
}, BinaryArrayReader.prototype.readFloat64 = function() {
  return this._read(8, "getFloat64");
}, BinaryArrayReader.prototype.readReader = function() {
  for (var e = this.readInt32(), t = new ArrayBuffer(e), n = new Int8Array(t, 0, e), i = 0; i < e; i++) n[i] = this.readInt8();
  return new BinaryArrayReader(t);
}, BinaryArrayReader.prototype.readBooleanArrayFunc = function(e, t) {
  for (var n = null, i = 0; i < e; i++) i % 8 == 0 && (n = this.readBooleanMap()), t(i, n.readBoolean());
}, BinaryArrayReader.prototype.getBuffer = function() {
  return this.buffer;
}, BinaryArrayReader.prototype.getLength = function() {
  return this.buffer.byteLength;
}, BinaryArrayReader.prototype.getOffset = function() {
  return this.offset;
}, define("lib/bin/BinaryArrayReader", function() {
});
