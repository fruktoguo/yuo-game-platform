/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：lib/bin/Base64ArrayBuffer
 */
var Base64ArrayBuffer = function() {
};
Base64ArrayBuffer.setup = function() {
  this.chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", this.lookup = new Uint8Array(256);
  for (var e = 0; e < this.chars.length; e++) this.lookup[this.chars.charCodeAt(e)] = e;
}, Base64ArrayBuffer.setup(), Base64ArrayBuffer.encode = function(e) {
  var t, n = new Uint8Array(e), i = n.length, r = "";
  for (t = 0; t < i; t += 3) r += this.chars[n[t] >> 2], r += this.chars[(3 & n[t]) << 4 | n[t + 1] >> 4], r += this.chars[(15 & n[t + 1]) << 2 | n[t + 2] >> 6], r += this.chars[63 & n[t + 2]];
  return i % 3 == 2 ? r = r.substring(0, r.length - 1) + "=" : i % 3 == 1 && (r = r.substring(0, r.length - 2) + "=="), r;
}, Base64ArrayBuffer.decode = function(e) {
  var t, n, i, r, o, s = 0.75 * e.length, a = e.length, u = 0;
  "=" === e[e.length - 1] && (s--, "=" === e[e.length - 2] && s--);
  var c = new ArrayBuffer(s), l = new Uint8Array(c);
  for (t = 0; t < a; t += 4) n = this.lookup[e.charCodeAt(t)], i = this.lookup[e.charCodeAt(t + 1)], r = this.lookup[e.charCodeAt(t + 2)], o = this.lookup[e.charCodeAt(t + 3)], l[u++] = n << 2 | i >> 4, l[u++] = (15 & i) << 4 | r >> 2, l[u++] = (3 & r) << 6 | 63 & o;
  return c;
}, define("lib/bin/Base64ArrayBuffer", function() {
});
