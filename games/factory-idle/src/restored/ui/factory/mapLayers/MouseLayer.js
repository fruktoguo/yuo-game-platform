/**
 * 从 Factory Idle 浏览器 bundle 恢复并重构。
 * AMD 模块：ui/factory/mapLayers/MouseLayer
 */
define("ui/factory/mapLayers/MouseLayer", [
  "game/action/BuyComponentAction",
  "game/action/SellComponentAction",
  "game/action/UpdateComponentInputOutputAction",
  "game/action/UpdateTileAction",
  "ui/factory/mapLayers/helper/MouseInfoHelper"
], function(
  BuyComponentAction,
  SellComponentAction,
  UpdateComponentInputOutputAction,
  UpdateTileAction,
  MouseInfoHelper
) {
  var LISTENER_ID = "LayerMouse";

  var MouseLayer = function(imageMap, factory, options) {
    this.imageMap = imageMap;
    this.factory = factory;
    this.game = factory.getGame();
    this.tileSize = options.tileSize;
    this.tilesX = factory.getMeta().tilesX;
    this.tilesY = factory.getMeta().tilesY;
    this.selectedComponentMetaId = null;
    this.selectedMapToolId = null;
    this.mouseInfoHelper = new MouseInfoHelper(factory, imageMap, options.tileSize);
    this.latestLocation = null;
  };

  MouseLayer.prototype.display = function(container) {
    this.container = container;
    this.element = $("<div />")
      .addClass("factoryMapInputLayer")
      .css({
        position: "absolute",
        inset: 0,
        width: this.tilesX * this.tileSize,
        height: this.tilesY * this.tileSize
      });
    this.container.append(this.element);
    this.setupNativeMouseEvents();
    this.setupFactoryMouseEvents();
    this.mouseInfoHelper.display(container);
  };

  MouseLayer.prototype.setupFactoryMouseEvents = function() {
    var mouseDownLocation = null;
    var previousLocation = null;
    var lastSelectedComponent = null;

    this.factory.getEventManager().addListener(
      LISTENER_ID,
      FactoryEvent.FACTORY_MOUSE_MOVE,
      function(location) {
        if (mouseDownLocation && mouseDownLocation.altKeyDown) {
          this.updateTileMeta(mouseDownLocation);
          this.updateTileMeta(location);
        } else if (this.selectedComponentMetaId) {
          this.mouseInfoHelper.updateMouseInformationModes(this.selectedComponentMetaId, location);
          var componentMeta = this.game.getMeta().componentsById[this.selectedComponentMetaId];
          if (mouseDownLocation) {
            if (
              location.leftMouseDown &&
              !mouseDownLocation.shiftKeyDown &&
              componentMeta.buildByDragging === true
            ) {
              this.buyComponent(mouseDownLocation);
              this.buyComponent(location);
              if (previousLocation) this.connectComponents(previousLocation, location);
            } else if (
              location.leftMouseDown && mouseDownLocation.shiftKeyDown ||
              location.rightMouseDown
            ) {
              this.sellComponent(mouseDownLocation);
              this.sellComponent(location);
            }
          }
        } else if (
          mouseDownLocation &&
          (location.leftMouseDown && mouseDownLocation.shiftKeyDown || location.rightMouseDown)
        ) {
          this.sellComponent(mouseDownLocation);
          this.sellComponent(location);
        }
        previousLocation = location;
      }.bind(this)
    );

    this.factory.getEventManager().addListener(
      LISTENER_ID,
      FactoryEvent.FACTORY_MOUSE_OUT,
      function() {
        this.mouseInfoHelper.turnOffBuildMode();
        this.mouseInfoHelper.turnOffCantBuildMode();
        mouseDownLocation = null;
        previousLocation = null;
      }.bind(this)
    );

    this.factory.getEventManager().addListener(
      LISTENER_ID,
      FactoryEvent.FACTORY_MOUSE_DOWN,
      function(location) {
        mouseDownLocation = location;
      }
    );

    this.factory.getEventManager().addListener(
      LISTENER_ID,
      FactoryEvent.FACTORY_MOUSE_UP,
      function(location) {
        if (
          mouseDownLocation &&
          location &&
          mouseDownLocation.x === location.x &&
          mouseDownLocation.y === location.y
        ) {
          var component = this.factory.getTile(location.x, location.y).getComponent();
          if (mouseDownLocation.altKeyDown) {
            this.updateTileMeta(location);
          } else if (this.selectedComponentMetaId) {
            if (mouseDownLocation.leftMouseDown && !mouseDownLocation.shiftKeyDown) {
              this.buyComponent(mouseDownLocation);
            } else if (mouseDownLocation.leftMouseDown && mouseDownLocation.shiftKeyDown || mouseDownLocation.rightMouseDown) {
              this.sellComponent(mouseDownLocation);
            }
          } else if (mouseDownLocation.leftMouseDown && mouseDownLocation.shiftKeyDown || mouseDownLocation.rightMouseDown) {
            this.sellComponent(mouseDownLocation);
          } else if (component) {
            if (lastSelectedComponent === component) component = null;
            this.factory.getEventManager().invokeEvent(FactoryEvent.COMPONENT_SELECTED, component);
            lastSelectedComponent = component;
          }
        }
        mouseDownLocation = null;
      }.bind(this)
    );

    this.factory.getEventManager().addListener(
      LISTENER_ID,
      FactoryEvent.COMPONENT_META_SELECTED,
      function(componentMetaId) {
        this.factory.getEventManager().invokeEvent(FactoryEvent.COMPONENT_SELECTED, null);
        this.selectedComponentMetaId = componentMetaId;
        this.mouseInfoHelper.updateMouseInformationModes(componentMetaId, previousLocation);
        lastSelectedComponent = null;
      }.bind(this)
    );

    this.factory.getEventManager().addListener(
      LISTENER_ID,
      FactoryEvent.MAP_TOOL_SELECTED,
      function(mapToolId) {
        this.factory.getEventManager().invokeEvent(FactoryEvent.COMPONENT_SELECTED, null);
        this.selectedMapToolId = mapToolId;
        lastSelectedComponent = null;
      }.bind(this)
    );

    this.factory.getEventManager().addListener(
      LISTENER_ID,
      FactoryEvent.COMPONENT_SELECTED,
      function(component) {
        this.mouseInfoHelper.updateComponentSelected(component);
      }.bind(this)
    );
  };

  MouseLayer.prototype.setupNativeMouseEvents = function() {
    var element = this.element.get(0);

    this.onMouseOut = function() {
      this.factory.getEventManager().invokeEvent(FactoryEvent.FACTORY_MOUSE_OUT, this.latestLocation);
      this.latestLocation = null;
    }.bind(this);
    this.onMouseMove = function(event) {
      if (this.isMapDragging()) return;
      var location = this.locationFromEvent(event);
      if (
        !this.latestLocation ||
        this.latestLocation.x !== location.x ||
        this.latestLocation.y !== location.y ||
        this.latestLocation.leftMouseDown !== location.leftMouseDown ||
        this.latestLocation.rightMouseDown !== location.rightMouseDown
      ) {
        this.factory.getEventManager().invokeEvent(FactoryEvent.FACTORY_MOUSE_MOVE, location);
        this.latestLocation = location;
      }
    }.bind(this);
    this.onMouseDown = function(event) {
      if (this.isMapDragging()) return;
      this.latestLocation = this.locationFromEvent(event);
      this.latestLocation.leftMouseDown = event.button === 0;
      this.latestLocation.rightMouseDown = event.button === 2;
      this.factory.getEventManager().invokeEvent(FactoryEvent.FACTORY_MOUSE_DOWN, this.latestLocation);
    }.bind(this);
    this.onMouseUp = function(event) {
      if (this.isMapDragging()) {
        this.factory.getEventManager().invokeEvent(FactoryEvent.FACTORY_MOUSE_OUT, this.latestLocation);
        this.latestLocation = null;
        return;
      }
      this.latestLocation = this.locationFromEvent(event);
      this.factory.getEventManager().invokeEvent(FactoryEvent.FACTORY_MOUSE_UP, this.latestLocation);
    }.bind(this);

    element.addEventListener("mouseout", this.onMouseOut);
    element.addEventListener("mousemove", this.onMouseMove);
    element.addEventListener("mousedown", this.onMouseDown);
    element.addEventListener("mouseup", this.onMouseUp);
  };

  MouseLayer.prototype.locationFromEvent = function(event) {
    var componentSize = { width: 1, height: 1 };
    if (this.selectedComponentMetaId) {
      componentSize = this.game.getMeta().componentsById[this.selectedComponentMetaId];
    }

    var bounds = this.element.get(0).getBoundingClientRect();
    var naturalWidth = this.tilesX * this.tileSize;
    var scale = bounds.width > 0 ? bounds.width / naturalWidth : 1;
    var scaledTileSize = this.tileSize * scale;
    var offsetX = event.clientX - bounds.left - scaledTileSize * componentSize.width / 2;
    var offsetY = event.clientY - bounds.top - scaledTileSize * componentSize.height / 2;
    var location = {
      x: Math.round(offsetX / scaledTileSize),
      y: Math.round(offsetY / scaledTileSize),
      leftMouseDown: (event.buttons & 1) === 1,
      rightMouseDown: (event.buttons & 2) === 2,
      shiftKeyDown: event.shiftKey,
      altKeyDown: event.altKey
    };
    location.x = Math.min(this.tilesX - componentSize.width, Math.max(0, location.x));
    location.y = Math.min(this.tilesY - componentSize.height, Math.max(0, location.y));
    return location;
  };

  MouseLayer.prototype.isMapDragging = function() {
    return this.container && this.container.attr("data-map-dragging") === "true";
  };

  MouseLayer.prototype.updateTileMeta = function(location) {
    var action = new UpdateTileAction(
      this.factory.getTile(location.x, location.y),
      this.selectedMapToolId
    );
    if (action.canUpdate()) action.update();
  };

  MouseLayer.prototype.buyComponent = function(location) {
    var action = new BuyComponentAction(
      this.factory.getTile(location.x, location.y),
      this.game.getMeta().componentsById[this.selectedComponentMetaId]
    );
    if (action.canBuy()) action.buy();
  };

  MouseLayer.prototype.sellComponent = function(location) {
    var componentMeta = this.game.getMeta().componentsById[this.selectedComponentMetaId];
    var action = new SellComponentAction(
      this.factory.getTile(location.x, location.y),
      componentMeta ? componentMeta.width : 1,
      componentMeta ? componentMeta.height : 1
    );
    if (action.canSell()) action.sell();
  };

  MouseLayer.prototype.connectComponents = function(from, to) {
    var action = new UpdateComponentInputOutputAction(
      this.factory.getTile(from.x, from.y),
      this.factory.getTile(to.x, to.y)
    );
    if (action.canUpdate()) action.update();
  };

  MouseLayer.prototype.destroy = function() {
    var element = this.element && this.element.get(0);
    if (element) {
      element.removeEventListener("mouseout", this.onMouseOut);
      element.removeEventListener("mousemove", this.onMouseMove);
      element.removeEventListener("mousedown", this.onMouseDown);
      element.removeEventListener("mouseup", this.onMouseUp);
    }
    this.mouseInfoHelper.destroy();
    this.factory.getEventManager().removeListenerForType(LISTENER_ID);
    this.container.empty();
    this.container = null;
    this.element = null;
  };

  return MouseLayer;
});
