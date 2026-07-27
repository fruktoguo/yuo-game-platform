var GAME_LOADED = false;
var oldErrorHandler = window.onerror;

(function configureInitialLoader() {
  var loader = document.getElementById("initialLoader");
  var loadingMessage = document.getElementById("loadingMessage");

  function centerLoader() {
    if (!loader) return;
    loader.style.left = Math.max(0, window.innerWidth / 2 - loader.offsetWidth / 2) + "px";
  }

  centerLoader();
  window.addEventListener("resize", centerLoader);

  window.onerror = function handleGameLoadError(message, source, line, column) {
    GAME_LOADED = true;
    if (loadingMessage) {
      loadingMessage.textContent =
        "游戏加载出错：" + message + "（" + source + ":" + line + ":" + column + "）";
    }
    return false;
  };

  window.setTimeout(function reportSlowLoad() {
    if (!GAME_LOADED && loadingMessage) {
      loadingMessage.textContent = "工厂系统仍在初始化，请稍候。";
    }
  }, 30000);
})();
