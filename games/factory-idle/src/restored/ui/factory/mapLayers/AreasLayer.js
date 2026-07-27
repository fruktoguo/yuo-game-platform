/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/factory/mapLayers/AreasLayer
 */
define("ui/factory/mapLayers/AreasLayer", ["../../../game/action/BuyAreaAction", "ui/helper/ConfirmUi", "ui/helper/AlertUi"], function(e, t, n) {
  var i = function(e2, t2, n2) {
    this.imageMap = e2, this.factory = t2, this.game = t2.getGame(), this.tileSize = n2.tileSize, this.tilesX = t2.getMeta().tilesX, this.tilesY = t2.getMeta().tilesY;
  };
  return i.prototype.display = function(e2) {
    var t2 = this;
    this.container = e2, this.container.append('<div id="areasLayer" style="position:absolute"></div>'), this.factory.getEventManager().addListener("AreasLayer", FactoryEvent.FACTORY_COMPONENTS_CHANGED, function() {
      t2.redraw();
    }), this.area = this.container.find("#areasLayer"), t2.redraw();
  }, i.prototype.redraw = function() {
    this.area.html("");
    var i2 = this;
    this.factory.getMeta().areas.map(function(e2) {
      if (!i2.factory.getAreasManager().getIsAreaBought(e2.id)) for (var t2 in e2.locations) {
        var n2 = e2.locations[t2], r2 = $('<div class="mapBuyArea" data-id="' + e2.id + '"></div>').css("left", i2.tileSize * n2.x).css("top", i2.tileSize * n2.y).css("width", i2.tileSize * n2.width).css("height", i2.tileSize * n2.height), o2 = "";
        0 == t2 && (o2 = $('<div class="mapBuyAreaTitle money">' + e2.name + "<br />解锁成本<br /><b>$" + nf(e2.price) + "</b></div>").css("left", i2.tileSize * n2.x).css("top", i2.tileSize * n2.y).css("width", i2.tileSize * n2.width).css("marginTop", i2.tileSize * n2.height / 2 - 23)), i2.area.append(r2).append(o2);
      }
    });
    var r = null, o = false;
    this.factory.getEventManager().addListener("AreasLayer", FactoryEvent.FACTORY_SCROLL_START, function() {
      o = true;
    }.bind(this)), this.factory.getEventManager().addListener("AreasLayer", FactoryEvent.FACTORY_SCROLL_END, function() {
      setTimeout(function() {
        o = false;
      }, 100);
    }.bind(this)), i2.area.find(".mapBuyArea").mouseover(function(e2) {
      var t2 = $(this).attr("data-id");
      r != t2 && (i2.area.find(".mapBuyArea").removeClass("mapBuyAreaOver"), i2.area.find(".mapBuyArea[data-id='" + t2 + "']").addClass("mapBuyAreaOver")), r = t2;
    }), i2.area.find(".mapBuyArea").mouseout(function(e2) {
      $(this).attr("data-id");
      i2.area.find(".mapBuyArea").removeClass("mapBuyAreaOver"), r = null;
    }), i2.area.find(".mapBuyArea").click(function(r2) {
      if (!o) {
        var s = $(this).attr("data-id"), a = i2.factory.getMeta().areasById[s];
        new e(i2.factory, s).canBuy() ? new t("解锁生产区", '<center>确认花费<br /><b class="money" style="font-size:1.1em">$' + nf(a.price) + "</b><br />解锁这片生产区域？</center>").setOkTitle("确认解锁").setCancelTitle("取消").setOkCallback(function() {
          var t2 = new e(i2.factory, s);
          t2.canBuy() && (t2.buy(), i2.redraw());
        }).display() : new n("资金不足", "<center>当前资金不足以解锁这片生产区域。</center>").display();
      }
    });
  }, i.prototype.destroy = function() {
    this.factory.getEventManager().removeListenerForType("AreasLayer"), this.container.html(""), this.container = null, this.canvas = null;
  }, i;
});
