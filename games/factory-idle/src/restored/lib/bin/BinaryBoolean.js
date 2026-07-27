/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：lib/bin/BinaryBoolean
 */
var BinaryBoolean = function(e) {
  this.buffer = e, this.length = 0;
};
BinaryBoolean.prototype.writeAll = function(e) {
  for (var t = 0; t < 8; t++) this.writeBoolean(arguments[t]);
  return this;
}, BinaryBoolean.prototype.writeBoolean = function(e) {
  return this.buffer <<= 1, this.buffer |= e ? 1 : 0, this.length++, this;
}, BinaryBoolean.prototype.fillZero = function() {
  for (var e = this.length, t = 0; t < 8 - e; t++) this.writeBoolean(0);
  return this;
}, BinaryBoolean.prototype.readBoolean = function() {
  var e = 1 & this.buffer;
  return this.buffer >>= 1, !!e;
}, BinaryBoolean.prototype.getValue = function() {
  return this.buffer;
}, BinaryBoolean.prototype.reverse = function() {
  for (var e = [], t = 0; t < 8; t++) e.push(this.readBoolean());
  for (var t = 0; t < 8; t++) this.writeBoolean(e[t]);
  return this;
}, BinaryBoolean.prototype.toString = function() {
  return this.buffer;
}, define("lib/bin/BinaryBoolean", function() {
});
