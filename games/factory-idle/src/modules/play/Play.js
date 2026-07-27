define("play/Play", [
  "config/config",
  "../config/Meta",
  "../game/Game",
  "./SaveManager",
  "./PurchasesManager",
  "./UserHash",
  "./UrlHandler",
  "./api/ApiFactory",
  "./ConfirmedTimestamp"
], function(
  config,
  meta,
  Game,
  SaveManager,
  PurchasesManager,
  UserHash,
  UrlHandler,
  createApi,
  ConfirmedTimestamp
) {
  var Play = function() {
    this.userHash = null;
    this.api = null;
    this.saveManager = null;
    this.purchasesManager = null;
    this.confirmedTimestamp = null;
    this.game = null;
    this.missions = {};
  };

  Play.prototype.getMeta = function() {
    return meta;
  };

  Play.prototype.getGame = function() {
    return this.game;
  };

  Play.prototype.getMission = function(missionId) {
    return this.missions[missionId];
  };

  Play.prototype.getSaveManager = function() {
    return this.saveManager;
  };

  Play.prototype.getPurchasesManager = function() {
    return this.purchasesManager;
  };

  Play.prototype.getApi = function() {
    return this.api;
  };

  Play.prototype.getUserHash = function() {
    return this.userHash;
  };

  Play.prototype.isDevMode = function() {
    return new URLSearchParams(window.location.search).get("dev") === "1";
  };

  Play.prototype.init = function(isNewGame, callback) {
    this.userHash = new UserHash(config.userHash.key);
    this.userHash.init();
    this.api = createApi(UrlHandler.identifySite(), this.userHash.getUserHash());

    this.api.init(function() {
      this.confirmedTimestamp = new ConfirmedTimestamp(this.api.getTimestamp.bind(this.api));
      this.confirmedTimestamp.init(function() {
        this.game = new Game(meta.main, this.confirmedTimestamp);
        this.missions = {};

        for (var missionId in meta.missions) {
          this.missions[missionId] = new Game(meta.missions[missionId]);
        }

        this.saveManager = this.createSaveManager();
        this.saveManager.init(isNewGame, function() {
          this.purchasesManager = new PurchasesManager(this);
          this.purchasesManager.init(function() {
            this.game.init();
            logger.info("Play", "Initialized");
            callback();
          }.bind(this));
        }.bind(this));
      }.bind(this));
    }.bind(this));
  };

  Play.prototype.createSaveManager = function() {
    return new SaveManager(this.api, this.userHash, "FactoryIdleSave")
      .setGetSaveDataCallback(function() {
        return {
          meta: {
            ver: this.game.getTicker().getNoOfTicks(),
            timestamp: Math.round(Date.now() / 1000),
            date: dateToStr(new Date(), true)
          },
          data: Base64ArrayBuffer.encode(this.exportToWriter().getBuffer())
        };
      }.bind(this))
      .setUpdateGameFromLoadedDataCallback(function(saveData) {
        logger.info("Play", "Game loaded from save");
        try {
          this.importFromReader(
            new BinaryArrayReader(Base64ArrayBuffer.decode(saveData.data))
          );
          this.game.getTicker().addOfflineGains();
        } catch (error) {
          logger.error("Play", "Could not update game from save data", error.message);
        }
      }.bind(this));
  };

  Play.prototype.destroy = function() {
    this.game.destroy();
    this.api.destroy();
    this.saveManager.destroy();
    this.purchasesManager.destroy();
    for (var missionId in this.missions) {
      this.missions[missionId].destroy();
    }
  };

  Play.prototype.exportToWriter = function() {
    return this.game.exportToWriter();
  };

  Play.prototype.importFromReader = function(reader) {
    this.game.importFromReader(reader);
  };

  return Play;
});
