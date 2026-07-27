/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：base/Logger
 */
var getDateTime = function() {
  var e = /* @__PURE__ */ new Date(), t = e.getHours(), n = e.getMinutes(), i = e.getSeconds();
  return t = (t < 10 ? "0" : "") + t, n = (n < 10 ? "0" : "") + n, i = (i < 10 ? "0" : "") + i, t + ":" + n + ":" + i;
}, output = function(e, t, n, i) {
  var r = [getDateTime(), t, e, n];
  i && r.push(JSON.stringify(i)), console.log(r.join(" | "));
}, log = function(e, t, n, i) {
  output(e, t, n, i);
}, logger = { init: function(e) {
  config = e;
}, debug: function(e, t, n) {
  log(e, "debug", t, n);
}, info: function(e, t, n) {
  log(e, "info", t, n);
}, warning: function(e, t, n) {
  log(e, "warning", t, n);
}, error: function(e, t, n) {
  log(e, "error", t, n);
} };
define("base/Logger", function() {
});
