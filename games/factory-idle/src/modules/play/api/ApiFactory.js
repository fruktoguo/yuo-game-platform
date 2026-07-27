define("play/api/ApiFactory", ["../../config/config", "play/api/Local"], function(config, Local) {
  return function createApi(_site, userHash) {
    logger.info("ApiFactory", "Local API loaded");
    return new Local(userHash, config.api.local.storageKey);
  };
});
