/**
 * 从 Factory Idle 浏览器 bundle 恢复并重构。
 * AMD 模块：ui/factory/MapUi
 */
define("ui/factory/MapUi", [
  "ui/factory/mapLayers/BackgroundLayer",
  "ui/factory/mapLayers/ComponentLayer",
  "ui/factory/mapLayers/PackageLayer",
  "ui/factory/mapLayers/MouseLayer",
  "ui/factory/mapLayers/AreasLayer",
  "ui/factory/ScreenShotUi"
], function(
  BackgroundLayer,
  ComponentLayer,
  PackageLayer,
  MouseLayer,
  AreasLayer,
  ScreenShotUi
) {
  var LISTENER_ID = "FactoryMapUi";
  var MIN_ZOOM = 0.5;
  var MAX_ZOOM = 2;
  var ZOOM_STEP = 0.15;

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  var MapUi = function(globalUiEm, imageMap, factory) {
    this.globalUiEm = globalUiEm;
    this.imageMap = imageMap;
    this.factory = factory;
    this.game = factory.getGame();
    this.tileSize = 21;
    this.mapWidth = factory.getMeta().tilesX * this.tileSize;
    this.mapHeight = factory.getMeta().tilesY * this.tileSize;
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.selectedComponentMetaId = null;
    this.pointerState = null;
    this.resizeObserver = null;

    var layerOptions = { tileSize: this.tileSize };
    this.backgroundLayer = new BackgroundLayer(imageMap, factory, layerOptions);
    this.componentLayer = new ComponentLayer(imageMap, factory, layerOptions);
    this.packageLayer = new PackageLayer(imageMap, factory, layerOptions);
    this.mouseLayer = new MouseLayer(imageMap, factory, layerOptions);
    this.areasLayer = new AreasLayer(imageMap, factory, layerOptions);
  };

  MapUi.prototype.display = function(container) {
    this.container = container;
    this.overlay = $("<div />")
      .addClass("factoryMapViewport")
      .attr("tabindex", "0")
      .attr("role", "application")
      .attr("aria-label", "生产区地图，可拖动并缩放");
    this.element = $("<div />")
      .addClass("factoryMapStage")
      .css({ width: this.mapWidth + "px", height: this.mapHeight + "px" });
    this.controls = $(
      '<div class="mapViewportControls" aria-label="地图视角控制">' +
        '<button type="button" data-action="zoom-out" aria-label="缩小地图" title="缩小地图">−</button>' +
        '<button type="button" data-action="reset" aria-label="重置地图视角" title="重置地图视角">⌂</button>' +
        '<button type="button" data-action="zoom-in" aria-label="放大地图" title="放大地图">+</button>' +
        '<span class="mapZoomLevel" aria-live="polite">100%</span>' +
      "</div>"
    );

    this.overlay.append(this.element);
    this.container.empty().append(this.overlay).append(this.controls);

    this.backgroundLayer.display(this.element);
    this.componentLayer.display(this.element);
    this.packageLayer.display(this.element);
    this.mouseLayer.display(this.element);
    this.areasLayer.display(this.element);

    this.setupViewportInteractions();
    this.resetView();

    this.factory.getEventManager().addListener(
      LISTENER_ID,
      FactoryEvent.COMPONENT_META_SELECTED,
      function(componentMetaId) {
        this.selectedComponentMetaId = componentMetaId || null;
        this.overlay.toggleClass("is-building", Boolean(this.selectedComponentMetaId));
      }.bind(this)
    );
    this.globalUiEm.addListener(
      LISTENER_ID,
      FactoryEvent.OPEN_SCREENSHOT_VIEW,
      function() {
        new ScreenShotUi(
          this.factory,
          { tileSize: this.tileSize },
          this.backgroundLayer.getCanvas(),
          this.componentLayer.getCanvas(),
          this.packageLayer.getCanvas()
        ).open();
      }.bind(this)
    );
  };

  MapUi.prototype.setupViewportInteractions = function() {
    var viewport = this.overlay.get(0);

    this.onContextMenu = function(event) {
      event.preventDefault();
    };
    this.onWheel = function(event) {
      event.preventDefault();
      var factor = event.deltaY < 0 ? 1 + ZOOM_STEP : 1 - ZOOM_STEP;
      this.zoomAt(this.zoom * factor, event.clientX, event.clientY);
    }.bind(this);
    this.onPointerDown = function(event) {
      var isTouch = event.pointerType === "touch";
      var isMiddleMouse = event.pointerType === "mouse" && event.button === 1;
      var isLeftPan = event.button === 0 && !this.selectedComponentMetaId;
      if (!isTouch && !isMiddleMouse && !isLeftPan) return;

      this.pointerState = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: this.panX,
        originY: this.panY,
        dragging: false
      };
      viewport.setPointerCapture(event.pointerId);
      if (isMiddleMouse) event.preventDefault();
    }.bind(this);
    this.onPointerMove = function(event) {
      if (!this.pointerState || this.pointerState.id !== event.pointerId) return;
      var deltaX = event.clientX - this.pointerState.startX;
      var deltaY = event.clientY - this.pointerState.startY;
      if (!this.pointerState.dragging && Math.hypot(deltaX, deltaY) < 4) return;

      if (!this.pointerState.dragging) {
        this.pointerState.dragging = true;
        this.element.attr("data-map-dragging", "true");
        this.overlay.addClass("is-panning");
        this.factory.getEventManager().invokeEvent(FactoryEvent.FACTORY_SCROLL_START);
      }
      this.panX = this.pointerState.originX + deltaX;
      this.panY = this.pointerState.originY + deltaY;
      this.applyTransform();
      event.preventDefault();
    }.bind(this);
    this.onPointerEnd = function(event) {
      if (!this.pointerState || this.pointerState.id !== event.pointerId) return;
      var wasDragging = this.pointerState.dragging;
      this.pointerState = null;
      if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
      if (!wasDragging) return;

      this.overlay.removeClass("is-panning");
      this.factory.getEventManager().invokeEvent(FactoryEvent.FACTORY_SCROLL_END);
      window.setTimeout(function() {
        if (this.element) this.element.removeAttr("data-map-dragging");
      }.bind(this), 0);
      event.preventDefault();
    }.bind(this);
    this.onKeyDown = function(event) {
      if (event.key === "+" || event.key === "=") {
        this.zoomAt(this.zoom + ZOOM_STEP);
        event.preventDefault();
      } else if (event.key === "-" || event.key === "_") {
        this.zoomAt(this.zoom - ZOOM_STEP);
        event.preventDefault();
      } else if (event.key === "0") {
        this.resetView();
        event.preventDefault();
      }
    }.bind(this);

    viewport.addEventListener("contextmenu", this.onContextMenu);
    viewport.addEventListener("wheel", this.onWheel, { passive: false });
    viewport.addEventListener("pointerdown", this.onPointerDown);
    viewport.addEventListener("pointermove", this.onPointerMove);
    viewport.addEventListener("pointerup", this.onPointerEnd);
    viewport.addEventListener("pointercancel", this.onPointerEnd);
    viewport.addEventListener("keydown", this.onKeyDown);

    this.controls.on("click", "button", function(event) {
      var action = $(event.currentTarget).attr("data-action");
      if (action === "zoom-in") this.zoomAt(this.zoom + ZOOM_STEP);
      else if (action === "zoom-out") this.zoomAt(this.zoom - ZOOM_STEP);
      else if (action === "reset") this.resetView();
    }.bind(this));

    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(function() {
        this.applyTransform();
      }.bind(this));
      this.resizeObserver.observe(viewport);
    }
  };

  MapUi.prototype.zoomAt = function(nextZoom, clientX, clientY) {
    nextZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    if (Math.abs(nextZoom - this.zoom) < 0.001) return;

    var bounds = this.overlay.get(0).getBoundingClientRect();
    var anchorX = Number.isFinite(clientX) ? clientX - bounds.left : bounds.width / 2;
    var anchorY = Number.isFinite(clientY) ? clientY - bounds.top : bounds.height / 2;
    var worldX = (anchorX - this.panX) / this.zoom;
    var worldY = (anchorY - this.panY) / this.zoom;

    this.zoom = nextZoom;
    this.panX = anchorX - worldX * this.zoom;
    this.panY = anchorY - worldY * this.zoom;
    this.applyTransform();
  };

  MapUi.prototype.resetView = function() {
    var meta = this.factory.getMeta();
    this.zoom = 1;
    this.panX = -(meta.startX || 0) * this.tileSize;
    this.panY = -(meta.startY || 0) * this.tileSize;
    this.applyTransform();
  };

  MapUi.prototype.applyTransform = function() {
    if (!this.overlay || !this.element) return;
    var viewport = this.overlay.get(0);
    var scaledWidth = this.mapWidth * this.zoom;
    var scaledHeight = this.mapHeight * this.zoom;

    if (scaledWidth <= viewport.clientWidth) {
      this.panX = (viewport.clientWidth - scaledWidth) / 2;
    } else {
      this.panX = clamp(this.panX, viewport.clientWidth - scaledWidth, 0);
    }
    if (scaledHeight <= viewport.clientHeight) {
      this.panY = (viewport.clientHeight - scaledHeight) / 2;
    } else {
      this.panY = clamp(this.panY, viewport.clientHeight - scaledHeight, 0);
    }

    this.element.css(
      "transform",
      "translate3d(" + this.panX + "px," + this.panY + "px,0) scale(" + this.zoom + ")"
    );
    this.controls.find(".mapZoomLevel").text(Math.round(this.zoom * 100) + "%");
  };

  MapUi.prototype.destroy = function() {
    var viewport = this.overlay && this.overlay.get(0);
    if (viewport) {
      viewport.removeEventListener("contextmenu", this.onContextMenu);
      viewport.removeEventListener("wheel", this.onWheel);
      viewport.removeEventListener("pointerdown", this.onPointerDown);
      viewport.removeEventListener("pointermove", this.onPointerMove);
      viewport.removeEventListener("pointerup", this.onPointerEnd);
      viewport.removeEventListener("pointercancel", this.onPointerEnd);
      viewport.removeEventListener("keydown", this.onKeyDown);
    }
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.controls) this.controls.off();

    this.globalUiEm.removeListenerForType(LISTENER_ID);
    this.factory.getEventManager().removeListenerForType(LISTENER_ID);
    this.backgroundLayer.destroy();
    this.componentLayer.destroy();
    this.packageLayer.destroy();
    this.mouseLayer.destroy();
    this.areasLayer.destroy();
    this.container.empty();
    this.container = null;
    this.overlay = null;
    this.element = null;
    this.controls = null;
  };

  return MapUi;
});
