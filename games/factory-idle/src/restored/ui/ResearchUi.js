/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/ResearchUi
 */
define("ui/ResearchUi", ["text!template/research.html", "game/action/BuyResearch"], function(e, t) {
  var n = function(e2, t2) {
    this.gameUiEm = e2, this.game = t2;
  };
  return n.prototype.display = function(n2) {
    var i = this, r = this.game.getResearchManager();
    this.container = n2;
    var o = 0, s = 0;
    for (var a in this.game.getMeta().research) {
      var u = this.game.getMeta().research[a];
      o += u.max, s += r.getResearch(u.id);
    }
    for (var c = [], a = 0; a < this.game.getMeta().research.length; a++) {
      var l = this.game.getMeta().research[a];
      if (r.isVisible(l.id)) {
        var h = !l.max || i.game.getResearchManager().getResearch(l.id) < l.max;
        c.push({ id: l.id, name: l.name, description: l.description, price: h ? nf(r.getPrice(l.id)) : null, priceResearchPoints: h ? nf(r.getPriceResearchPoints(l.id)) : null, max: l.max, showBoughtAndMax: l.max > 1, iconStyle: "background-position: -" + 26 * l.iconX + "px -" + 26 * l.iconY + "px" });
      }
    }
    this.container.html(Handlebars.compile(e)({ research: c, max: o, have: s })), this.container.find(".backButton").click(function(e2) {
      this.gameUiEm.invokeEvent(GameUiEvent.SHOW_FACTORY);
    }.bind(this)), $(".researchItem").each(function() {
      var e2 = $(this).attr("data-id");
      $(this).find(".buyButton").click(function() {
        var n3 = new t(i.game, e2);
        n3.canBuy() && (n3.buy(), i.refreshView());
      });
    }), this.game.getEventManager().addListener("researchUi", GameEvent.GAME_TICK, function() {
      this.update();
    }.bind(this)), this.update();
  }, n.prototype.refreshView = function() {
    var e2 = this.container;
    this.destroy(), this.display(e2);
  }, n.prototype.update = function() {
    var e2 = this;
    $("#researchPoints").html(nf(this.game.getResearchPoints())), $("#money").html(nf(this.game.getMoney())), $(".researchItem").each(function() {
      var t2 = $(this).attr("data-id"), n2 = $(this).find(".bought"), i = $(this).find(".buyButton");
      n2.html(e2.game.getResearchManager().getResearch(t2)), e2.game.getResearchManager().couldPurchase(t2) ? i.show() : i.hide(), e2.game.getResearchManager().canPurchase(t2) ? i.removeClass("cantBuy") : i.addClass("cantBuy");
    });
  }, n.prototype.destroy = function() {
    this.game.getEventManager().removeListenerForType("researchUi"), this.gameUiEm.removeListenerForType("researchUi"), this.container.html(""), this.container = null;
  }, n;
});
