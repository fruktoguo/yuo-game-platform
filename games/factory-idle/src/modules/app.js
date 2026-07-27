requirejs.config({
  baseUrl: ".",
  packages: [],
  paths: {
    template: "template"
  }
});

String.prototype.lcFirst = function() {
  return this.charAt(0).toLowerCase() + this.slice(1);
};

String.prototype.ucFirst = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

var MainInstance;
var vis;

GAME_LOADED = true;
window.onerror = oldErrorHandler;

require([
  "Main",
  "locale/zhCN",
  "lib/jquery",
  "base/Logger",
  "base/NumberFormat",
  "lib/handlebars",
  "text",
  "lib/bin/Binary"
], function(Main) {
  BinaryTest.test();
  if (isBrowserSupported()) {
    MainInstance = new Main();
    MainInstance.init(false, function() {});
    return;
  }

  var loadingMessage = document.getElementById("loadingMessage");
  if (loadingMessage) {
    loadingMessage.textContent = "当前浏览器缺少游戏所需的 Canvas 能力。";
  }
});

define("app", [], function() {
  return {};
});
