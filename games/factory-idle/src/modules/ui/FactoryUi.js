define("ui/FactoryUi", [
  "text!template/factory.html",
  "ui/factory/MenuUi",
  "ui/factory/MapUi",
  "ui/factory/ComponentsUi",
  "ui/factory/InfoUi",
  "ui/factory/ControlsUi",
  "ui/factory/MapToolsUi",
  "ui/factory/OverviewUi"
], function(
  template,
  MenuUi,
  MapUi,
  ComponentsUi,
  InfoUi,
  ControlsUi,
  MapToolsUi,
  OverviewUi
) {
  var FactoryUi = function(globalUiEm, gameUiEm, factory, play, imageMap) {
    this.globalUiEm = globalUiEm;
    this.gameUiEm = gameUiEm;
    this.factory = factory;
    this.play = play;
    this.imageMap = imageMap;
    this.game = factory.getGame();
    this.statistics = this.game.getStatistics();
    this.menuUi = new MenuUi(globalUiEm, gameUiEm, factory);
    this.mapUi = new MapUi(globalUiEm, imageMap, factory);
    this.componentsUi = new ComponentsUi(globalUiEm, factory);
    this.mapToolsUi = new MapToolsUi(factory);
    this.infoUi = new InfoUi(factory, this.statistics, play, imageMap);
    this.controlsUi = new ControlsUi(factory);
    this.overviewUi = new OverviewUi(factory, this.statistics);
  };

  FactoryUi.prototype.display = function(container) {
    this.container = container;
    this.container.html(Handlebars.compile(template)());

    $(".main").addClass("fullScreen");

    this.menuUi.display(this.container.find(".menuContainer"));
    this.mapUi.display(this.container.find(".mapContainer"));
    this.componentsUi.display(this.container.find(".componentsContainer"));
    this.infoUi.display(this.container.find(".infoContainer"));
    this.controlsUi.display(this.container.find(".controlsContainer"));
    this.overviewUi.display(this.container.find(".overviewContainer"));

    if (this.play.isDevMode()) {
      this.mapToolsUi.display(this.container.find(".mapToolsContainer"));
    }
  };

  FactoryUi.prototype.destroy = function() {
    this.mapUi.destroy();
    this.componentsUi.destroy();
    this.infoUi.destroy();
    this.controlsUi.destroy();
    this.overviewUi.destroy();
    this.mapToolsUi.destroy();
    this.game.getEventManager().removeListenerForType("FactoryUi");
    this.container.html("");
    this.container = null;
    $(".main").removeClass("fullScreen");
  };

  return FactoryUi;
});
