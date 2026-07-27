define("play/api/Local", ["./api/LocalApi", "base/EventManager"], function(LocalApi, EventManager) {
  var Local = function(userHash, storageKey) {
    this.eventManager = new EventManager({}, "ApiLocal");
    this.localApi = new LocalApi(this.eventManager, userHash, storageKey);
  };

  Local.prototype.getEventManager = function() {
    return this.eventManager;
  };

  Local.prototype.getKey = function() {
    return "local";
  };

  Local.prototype.init = function(callback) {
    this.localApi.init(callback);
  };

  Local.prototype.destroy = function() {
    this.localApi.destroy();
  };

  Local.prototype.getTimestamp = function(callback) {
    this.localApi.getTimestamp(callback);
  };

  Local.prototype.purchase = function(productId, callback) {
    this.localApi.purchase(productId, callback);
  };

  Local.prototype.loadPurchases = function(callback) {
    this.localApi.loadPurchases(callback);
  };

  Local.prototype.setConsumed = function(externalId, callback) {
    this.localApi.setConsumed(externalId, callback);
  };

  Local.prototype.submitStatistic = function(name, value, callback) {
    this.localApi.submitStatistic(name, value, callback);
  };

  Local.prototype.getSavesInfo = function(name, callback) {
    this.localApi.getSavesInfo(name, callback);
  };

  Local.prototype.load = function(name, callback) {
    this.localApi.load(name, callback);
  };

  Local.prototype.save = function(name, data, callback) {
    this.localApi.save(name, data, callback);
  };

  return Local;
});
