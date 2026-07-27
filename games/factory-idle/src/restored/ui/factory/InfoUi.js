/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/factory/InfoUi
 */
define("ui/factory/InfoUi", ["text!template/factory/info.html", "text!template/factory/infoDetails.html", "game/Component", "ui/factory/componentUi/Sorter", "game/misc/productionTree2/ProductionGraphUi", "game/misc/productionTree2/ProductionTreeBuilder", "game/action/PassTimeAction"], function(e, t, n, i, r, o, s) {
  var a = "componentInfoUi", u = function(e2, t2, n2, r2) {
    this.factory = e2, this.game = e2.getGame(), this.statistics = t2, this.play = n2, this.imageMap = r2, this.selectedPosition = null, this.hoveredComponentMetaId = null, this.selectedComponentMetaId = null, this.selectedComponent = null, this.componentStrategies = { sorter: i }, this.displayedStrategy = null, this.displayedStrategyComponent = null;
  };
  return u.prototype.display = function(t2) {
    var n2 = this;
    this.container = t2, this.container.html(Handlebars.compile(e)({})), this.infoContainer = this.container.find(".componentInfo"), this.controlsContainer = this.container.find(".componentControls"), this.factory.getEventManager().addListener(a, FactoryEvent.FACTORY_MOUSE_MOVE, function(e2) {
      n2.selectedPosition = e2, n2.checkWhatShouldBeDisplayed(false);
    }), this.factory.getEventManager().addListener(a, FactoryEvent.FACTORY_MOUSE_OUT, function(e2) {
      n2.selectedPosition = null, n2.checkWhatShouldBeDisplayed(false);
    }), this.factory.getEventManager().addListener(a, FactoryEvent.FACTORY_TICK, function() {
      n2.checkWhatShouldBeDisplayed(true);
    }), this.factory.getEventManager().addListener(a, FactoryEvent.REFRESH_COMPONENT_INFO, function(e2) {
      n2.checkWhatShouldBeDisplayed(false);
    }), this.factory.getEventManager().addListener(a, FactoryEvent.HOVER_COMPONENT_META, function(e2) {
      n2.hoveredComponentMetaId = e2, n2.checkWhatShouldBeDisplayed(false);
    }), this.factory.getEventManager().addListener(a, FactoryEvent.COMPONENT_META_SELECTED, function(e2) {
      n2.selectedComponentMetaId = e2, n2.selectedComponent = null, n2.checkWhatShouldBeDisplayed(false);
    }), this.factory.getEventManager().addListener(a, FactoryEvent.COMPONENT_SELECTED, function(e2) {
      n2.selectedComponent = e2, n2.checkWhatShouldBeDisplayed(false);
    }.bind(this));
  }, u.prototype.checkWhatShouldBeDisplayed = function(e2) {
    this.hoveredComponentMetaId ? e2 || (this.showComponentMetaInfo(this.hoveredComponentMetaId), this.hideComponentStrategy()) : this.selectedComponent ? (this.showComponentInfo(this.selectedComponent), this.showComponentStrategy(this.selectedComponent)) : this.selectedComponentMetaId ? e2 || (this.showComponentMetaInfo(this.selectedComponentMetaId), this.hideComponentStrategy()) : this.selectedPosition ? (this.showLocationInfo(this.selectedPosition.x, this.selectedPosition.y), this.hideComponentStrategy()) : this.showDefaultInfo();
  }, u.prototype.showComponentInfo = function(e2) {
    this.showLocationInfo(e2.getX(), e2.getY());
  }, u.prototype.showLocationInfo = function(e2, n2) {
    var i2 = this.factory.getTile(e2, n2), r2 = { isLocation: true };
    r2.tile = { x: i2.getX(), y: i2.getY(), terrain: i2.getTerrain(), buildableType: i2.getBuildableType() }, i2.getComponent() ? r2.component = i2.getComponent().getDescriptionData() : r2.component = {}, this.infoContainer.html(Handlebars.compile(t)(r2));
  }, u.prototype.showComponentStrategy = function(e2) {
    if (this.displayedStrategyComponent != e2) {
      var t2 = this.componentStrategies[e2.getMeta().strategy.type];
      t2 ? (this.displayedStrategyComponent = e2, this.displayedStrategy = new t2(e2), this.displayedStrategy.display(this.controlsContainer), this.controlsContainer.show()) : this.hideComponentStrategy();
    }
  }, u.prototype.hideComponentStrategy = function() {
    this.displayedStrategy && (this.displayedStrategy.destroy(), this.displayedStrategy = null, this.displayedStrategyComponent = null), this.controlsContainer.html("").hide();
  }, u.prototype.showComponentMetaInfo = function(e2) {
    var i2 = this.game.getMeta().componentsById[e2], s2 = { isMeta: true, component: n.getMetaDescriptionData(i2, this.factory) };
    this.infoContainer.html(Handlebars.compile(t)(s2));
    var a2 = new o(this.factory).buildTree(e2, 1);
    if (a2.hasChildren()) {
      var u2 = new r(a2, this.imageMap), c = this.infoContainer.find(".componentGraph");
      u2.display(c);
      var l = this.infoContainer.find(".componentInfoArea"), h = l.width();
      l.width(h - c.width());
    }
  }, u.prototype.hideInfo = function() {
    this.hideComponentStrategy(), this.infoContainer.html("");
  }, u.prototype.showDefaultInfo = function() {
    if (this.play.isDevMode()) return void this.showIncomesData();
    this.hideInfo(), this.infoContainer.html('<div class="telemetryEmpty"><strong>等待选择设施</strong><p>从左侧设施库选择待建造设施，或在地图上悬停、点击已有设施，即可查看成本、库存与运行效率。</p><span>提示：按空格键可快速取消或恢复上次选择。</span></div>');
  }, u.prototype.showIncomesData = function() {
    this.hideInfo();
    var e2 = this.statistics.getFactoryAvgResearchPointsProduction(this.factory.getMeta().id), t2 = e2 * this.game.getTicker().getTicksPerSec();
    isNaN(t2) && (t2 = 0);
    var n2 = this.statistics.getFactoryAvgProfit(this.factory.getMeta().id), i2 = n2 * this.game.getTicker().getTicksPerSec();
    isNaN(i2) && (i2 = 0);
    var r2 = '<table cellspacing="0" cellpadding="0" border="0">';
    r2 += "<tr>", r2 += '<td align="center" width="100"></td>', r2 += '<td align="center" width="100"><b>15 分钟</b></td>', r2 += '<td align="center" width="100"><b>1 小时</b></td>', r2 += '<td align="center" width="100"><b>24 小时</b></td>', r2 += '<td align="center" width="100"><b>1 周</b></td>', r2 += "<tr>", r2 += "<tr>", r2 += '<td align="center" ><b class="research">研究点</b></td>', r2 += '<td align="center" class="research">' + nf(15 * t2 * 60) + "</td>", r2 += '<td align="center" class="research">' + nf(60 * t2 * 60) + "</td>", r2 += '<td align="center" class="research">' + nf(60 * t2 * 60 * 24) + "</td>", r2 += '<td align="center" class="research">' + nf(60 * t2 * 60 * 24 * 7) + "</td>", r2 += "<tr>", r2 += "<tr>", r2 += '<td align="center" ><b class="money">资金</b></td>', r2 += '<td align="center" class="money">$' + nf(15 * i2 * 60) + "</td>", r2 += '<td align="center" class="money">$' + nf(60 * i2 * 60) + "</td>", r2 += '<td align="center" class="money">$' + nf(60 * i2 * 60 * 24) + "</td>", r2 += '<td align="center" class="money">$' + nf(60 * i2 * 60 * 24 * 7) + "</td>", r2 += "<tr>", r2 += "<tr>", r2 += '<td align="center" width="100"></td>', r2 += '<td align="center" width="100"><a href="javascript:void(0)" class="passTime" style="color:white" data-amount="15">推进</a></td>', r2 += '<td align="center" width="100"><a href="javascript:void(0)" class="passTime" style="color:white" data-amount="60">推进</a></td>', r2 += '<td align="center" width="100"><a href="javascript:void(0)" class="passTime" style="color:white" data-amount="1440">推进</a></td>', r2 += '<td align="center" width="100"><a href="javascript:void(0)" class="passTime" style="color:white" data-amount="10080">推进</a></td>', r2 += "<tr>", r2 += "</table>", this.infoContainer.html(r2);
    var o2 = this;
    this.infoContainer.find(".passTime").click(function(e3) {
      var t3 = $(e3.target).attr("data-amount");
      new s(o2.game, 60 * t3).passTime();
    });
  }, u.prototype.destroy = function() {
    this.factory.getEventManager().removeListenerForType(a), this.container.html(""), this.container = null;
  }, u;
});
