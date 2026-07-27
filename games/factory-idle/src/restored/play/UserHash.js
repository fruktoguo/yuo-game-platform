/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：play/UserHash
 */
define("play/UserHash", [], function() {
  var e = function(e2) {
    this.storageKey = e2, this.hashLength = 40, this.userHash = null;
  };
  return e.prototype.init = function() {
    return this.userHash = localStorage[this.storageKey], this.userHash || (this.userHash = this._generateUserHash(this.hashLength)), this.updateUserHash(this.userHash), logger.info("UserHash", "User hash loaded " + this.userHash), this;
  }, e.prototype.updateUserHash = function(e2) {
    localStorage[this.storageKey] = e2;
  }, e.prototype.getUserHash = function() {
    return this.userHash;
  }, e.prototype.toString = function() {
    return this.userHash;
  }, e.prototype._generateUserHash = function(e2) {
    for (var t = "", n = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", i = 0; i < e2; i++) t += n.charAt(Math.floor(Math.random() * n.length));
    return t;
  }, e;
});
