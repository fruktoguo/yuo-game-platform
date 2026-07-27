/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：base/EventManager
 */
define("base/EventManager", [], function() {
  var e = function(e2, t) {
    this.handledEvents = e2, this.eventTag = t, this.events = {};
  };
  return e.prototype.addListener = function(e2, t, n) {
    this.handledEvents[t] || logger.warning(this.eventTag, "This event manager is not configured to handle event: " + t + ". " + e2 + " tried to listen for it."), this.events[t] || (this.events[t] = {}), this.events[t][e2] = n;
  }, e.prototype.removeListener = function(e2, t) {
    this.events[t] && this.events[t][e2] && delete this.events[t][e2];
  }, e.prototype.removeListenerForType = function(e2) {
    for (var t in this.events) for (var n in this.events[t]) n == e2 && delete this.events[t][n];
  }, e.prototype.invokeEvent = function(e2, t, n, i, r, o) {
    if (this.events[e2]) for (var s in this.events[e2]) this.events[e2][s] && this.events[e2][s](t, n, i, r, o);
  }, e;
});
