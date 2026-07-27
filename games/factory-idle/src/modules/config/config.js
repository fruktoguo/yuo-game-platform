define("config/config", [], function() {
  return {
    userHash: {
      key: "FactoryIdleUserHash"
    },
    imageMap: {
      path: ""
    },
    api: {
      local: {
        storageKey: "FactoryIdleLocal"
      }
    },
    saveManager: {
      cloudSaveIntervalMs: 900000,
      localSaveIntervalMs: 5000
    },
    main: {
      warnToStoreUserHashAfterTicks: {
        10000: true,
        100000: true,
        1000000: true
      }
    }
  };
});
