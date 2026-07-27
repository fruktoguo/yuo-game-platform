/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：play/SaveManager
 */
define("play/SaveManager", ["../config/config", "./UrlHandler"], function(e, t) {
  var n = "SaveManager", i = function(i2, r, o) {
    this.api = i2, this.localStorageKey = o + "|" + r.toString(), this.cloudSaveName = "Main", this.cloudSaveIntervalMs = e.saveManager.cloudSaveIntervalMs, this.localSaveIntervalMs = e.saveManager.localSaveIntervalMs, this.cloudSaveInterval = null, this.localSaveInterval = null;
    var s = t.getUrlVars();
    this.useCloud = "0" !== s.cloud && 0 !== s.cloud && "false" !== s.cloud, this.useCloud || logger.info(n, "Cloud save disabled");
  };
  return i.prototype.getCloudSaveInterval = function() {
    return this.cloudSaveIntervalMs;
  }, i.prototype.getLocalSaveInterval = function() {
    return this.localSaveIntervalMs;
  }, i.prototype.setUpdateGameFromLoadedDataCallback = function(e2) {
    return this.updateGameFromLoadedDataCallback = e2, this;
  }, i.prototype.setGetSaveDataCallback = function(e2) {
    return this.saveDataCallback = e2, this;
  }, i.prototype.init = function(e2, t2) {
    var i2 = function() {
      this._startInterval(), logger.info(n, "Initialized"), t2();
    }.bind(this);
    return e2 ? (this.saveAutoCloud(function() {
    }), this.saveAutoLocal(function() {
    }), i2()) : this.loadAuto(function() {
      i2();
    }.bind(this)), this;
  }, i.prototype._startInterval = function() {
    this.cloudSaveInterval = setInterval(function() {
      this.saveAutoCloud(function() {
        logger.info(n, "Auto saved to cloud");
      });
    }.bind(this), this.cloudSaveIntervalMs), this.localSaveInterval = setInterval(function() {
      this.saveAutoLocal(function() {
        logger.info(n, "Auto saved to local");
      });
    }.bind(this), this.localSaveIntervalMs);
  }, i.prototype.destroy = function() {
    this.cloudSaveInterval && clearInterval(this.cloudSaveInterval), this.localSaveInterval && clearInterval(this.localSaveInterval);
  }, i.prototype.getSavesInfo = function(e2, t2) {
    this.api.getSavesInfo(e2, t2);
  }, i.prototype.saveManual = function(e2, t2) {
    this._saveCloud(e2, t2);
  }, i.prototype.saveAuto = function(e2) {
    this._saveLocal(this.cloudSaveName, function() {
      this._saveCloud(this.cloudSaveName, e2);
    }.bind(this));
  }, i.prototype.saveAutoCloud = function(e2) {
    this._saveCloud(this.cloudSaveName, e2);
  }, i.prototype.saveAutoLocal = function(e2) {
    this._saveLocal(this.cloudSaveName, e2);
  }, i.prototype._saveCloud = function(e2, t2) {
    this.useCloud ? this.api.save(e2, this.saveDataCallback(), t2) : (logger.info(n, "Cloud save skipped!"), t2());
  }, i.prototype._saveLocal = function(e2, t2) {
    window.localStorage[this.localStorageKey + "|" + e2] = JSON.stringify(this.saveDataCallback()), t2();
  }, i.prototype.loadManual = function(e2, t2) {
    this._loadCloud(e2, function(e3) {
      this.updateGameFromSaveData(e3), this.saveAutoCloud(function() {
      }), t2();
    }.bind(this));
  }, i.prototype.loadAuto = function(e2) {
    this._loadCloud(this.cloudSaveName, function(t2) {
      this._loadLocal(this.cloudSaveName, function(i2) {
        var r = null;
        i2 && t2 ? i2.meta.ver > t2.meta.ver ? (logger.info(n, "Preferred local save local ver:" + i2.meta.ver + " > cloud ver:" + t2.meta.ver), r = i2) : (logger.info(n, "Preferred cloud save local ver:" + i2.meta.ver + " < cloud ver:" + t2.meta.ver), r = t2) : i2 ? r = i2 : t2 && (r = t2), r && this.updateGameFromSaveData(r), e2();
      }.bind(this));
    }.bind(this));
  }, i.prototype.updateGameFromSaveData = function(e2) {
    this.updateGameFromLoadedDataCallback(e2);
  }, i.prototype._loadCloud = function(e2, t2) {
    this.api.load(e2, t2);
  }, i.prototype._loadLocal = function(e2, t2) {
    var n2 = null;
    try {
      return n2 = JSON.parse(window.localStorage[this.localStorageKey + "|" + e2]), void t2(n2);
    } catch (e3) {
    }
    t2(null);
  }, i;
});
