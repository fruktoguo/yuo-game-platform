/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/UpgradesUi
 */
define("ui/UpgradesUi", ["text!template/upgrades.html", "../game/action/BuyUpgrade", "game/action/SellUpgrade", "ui/helper/TipUi"], function(e, t, n, i) {
  var r = function(e2, t2) {
    this.gameUiEm = e2, this.factory = t2, this.game = t2.getGame();
  };
  return r.prototype.display = function(r2) {
    var o = this, s = this.factory.getUpgradesManager();
    this.container = r2;
    for (var a = [], u = 0; u < this.game.getMeta().upgradesLayout.length; u++) {
      var c = this.game.getMeta().upgradesLayout[u];
      if ("break" != c.type) {
        for (var l = [], h = 0; h < c.items.length; h++) if ("_" != c.items[h]) {
          var p = this.game.getMeta().upgradesById[c.items[h]];
          if (p || logger.error("Group item with id " + c.items[h] + " not found!"), s.isVisible(p.id)) {
            var d = s.getStrategy(p.id);
            p.refund && l.push({ id: p.id, action: "sell", isSell: true, canSell: s.canSell(p.id), sellPrice: nf(s.getSellPrice(p.id)), refund: 100 * p.refund + "%", title: d.getTitle(), description: d.getDescription(), iconStyle: "background-position: -" + 26 * p.iconX + "px -" + 26 * p.iconY + "px" }), l.push({ id: p.id, action: "buy", isBuy: true, isMaxed: !s.couldPurchase(p.id), buyPrice: nf(s.getPrice(p.id)), title: d.getTitle(), description: d.getDescription(), iconStyle: "background-position: -" + 26 * p.iconX + "px -" + 26 * p.iconY + "px" });
          }
        } else l.length > 0 && l.push({ isSeparator: true });
        l.reverse(), l.length > 0 && a.push({ name: c.name, upgrades: l, iconStyle: "background-position: -" + 26 * c.iconX + "px -" + 26 * c.iconY + "px" });
      } else a.push({ isBreak: true });
    }
    this.container.html(Handlebars.compile(e)({ groups: a })), this.container.find(".backButton").click(function(e2) {
      this.gameUiEm.invokeEvent(GameUiEvent.SHOW_FACTORY);
    }.bind(this)), $(".upgradeItem").each(function() {
      var e2 = $(this).attr("data-id"), r3 = $(this).attr("data-action");
      new i($(this), $(this).find(".upgradePopup")).init(), $(this).click(function() {
        var i2;
        "sell" == r3 ? (i2 = new n(o.factory, e2), i2.canSell() && (i2.sell(), o.refreshView())) : "buy" == r3 && (i2 = new t(o.factory, e2), i2.canBuy() && (i2.buy(), o.refreshView()));
      });
    }), this.game.getEventManager().addListener("upgradeUi", GameEvent.GAME_TICK, function() {
      this.update();
    }.bind(this)), this.update();
  }, r.prototype.refreshView = function() {
    var e2 = this.container;
    this.destroy(), this.display(e2);
  }, r.prototype.update = function() {
    var e2 = this;
    $("#money").html(nf(this.game.getMoney())), $(".upgradeItem").each(function() {
      var t2 = $(this).attr("data-id"), n2 = $(this).attr("data-action");
      $(this).find(".upgradeIcon").html(e2.factory.getUpgradesManager().getUpgrade(t2)), $(this).find(".upgradePopup .bought").html(e2.factory.getUpgradesManager().getUpgrade(t2)), "buy" == n2 ? e2.factory.getUpgradesManager().couldPurchase(t2) ? ($(this).removeClass("upgradeItemMaxed"), e2.factory.getUpgradesManager().canPurchase(t2) ? $(this).removeClass("upgradeItemCantBuy") : $(this).addClass("upgradeItemCantBuy")) : $(this).addClass("upgradeItemMaxed") : e2.factory.getUpgradesManager().canSell(t2) ? $(this).removeClass("upgradeItemCantSell") : $(this).addClass("upgradeItemCantSell");
    });
  }, r.prototype.destroy = function() {
    this.game.getEventManager().removeListenerForType("upgradeUi"), this.gameUiEm.removeListenerForType("upgradeUi"), this.container.html(""), this.container = null;
  }, r;
});
