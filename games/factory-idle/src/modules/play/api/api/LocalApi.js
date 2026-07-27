define("play/api/api/LocalApi", [], function() {
  var LocalApi = function(eventManager, userHash, storageKey) {
    this.eventManager = eventManager;
    this.userHash = userHash;
    this.storageKey = storageKey + "|" + userHash;
    this.purchases = [];
    this.savesMeta = {};
    this.saves = {};
  };

  LocalApi.prototype.getTimestamp = function(callback) {
    callback(Math.round(Date.now() / 1000));
  };

  LocalApi.prototype.saveState = function() {
    localStorage[this.storageKey] = JSON.stringify({
      purchases: this.purchases,
      savesMeta: this.savesMeta,
      saves: this.saves
    });
  };

  LocalApi.prototype.loadState = function() {
    this.purchases = [];
    this.saves = {};
    this.savesMeta = {};

    try {
      var savedState = JSON.parse(localStorage[this.storageKey]);
      if (savedState.purchases) this.purchases = savedState.purchases;
      if (savedState.savesMeta) this.savesMeta = savedState.savesMeta;
      if (savedState.saves) this.saves = savedState.saves;
    } catch (error) {
      logger.warning("Local", "Could not load local API data", error);
    }
  };

  LocalApi.prototype.init = function(callback) {
    this.loadState();
    logger.info("Local", "Local API initialized");
    window.setTimeout(callback, 0);
  };

  LocalApi.prototype.destroy = function() {};

  LocalApi.prototype.purchase = function(productId, callback) {
    this.purchases.push({
      externalId: String(Math.round(Math.random() * 1000000000000)),
      productId: productId
    });
    this.saveState();
    window.setTimeout(callback, 0);
  };

  LocalApi.prototype.loadPurchases = function(callback) {
    window.setTimeout(function() {
      callback(this.purchases.slice());
    }.bind(this), 0);
  };

  LocalApi.prototype.setConsumed = function(externalId, callback) {
    this.purchases = this.purchases.filter(function(purchase) {
      return purchase.externalId !== externalId;
    });
    this.saveState();
    window.setTimeout(function() {
      callback(true);
    }, 0);
  };

  LocalApi.prototype.submitStatistic = function(_name, _value, callback) {
    this.saveState();
    window.setTimeout(callback, 0);
  };

  LocalApi.prototype.getSavesInfo = function(_name, callback) {
    window.setTimeout(function() {
      callback(this.savesMeta);
    }.bind(this), 0);
  };

  LocalApi.prototype.load = function(saveName, callback) {
    window.setTimeout(function() {
      callback(this.savesMeta[saveName] ? {
        meta: this.savesMeta[saveName],
        data: this.saves[saveName]
      } : null);
    }.bind(this), 0);
  };

  LocalApi.prototype.save = function(saveName, saveData, callback) {
    this.savesMeta[saveName] = saveData.meta;
    this.saves[saveName] = saveData.data;
    this.saveState();
    window.setTimeout(function() {
      callback(true);
    }, 0);
  };

  return LocalApi;
});
