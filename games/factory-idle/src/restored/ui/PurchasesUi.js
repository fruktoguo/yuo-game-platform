/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/PurchasesUi
 */
define("ui/PurchasesUi", ["text!template/purchases.html", "play/UrlHandler"], function(e, t) {
  var n = function(e2, t2) {
    this.gameUiEm = e2, this.play = t2, this.purchasesManager = this.play.getPurchasesManager();
  };
  return n.prototype.init = function() {
    return this.gameUiEm.addListener("purchases", GameUiEvent.SHOW_PURCHASES, function() {
      this.display();
    }.bind(this)), this;
  }, n.prototype.display = function() {
    var n2 = this, i = t.identifySite(), r = { mainSiteVersion: "localhost" == i || "direct" == i }, o = this.play.getMeta();
    for (var s in o.productsLayout) {
      var a = o.productsLayout[s];
      r[s] = [];
      for (var u in a) {
        var c = o.productsById[a[u]];
        this.purchasesManager.isVisible(c.id) && r[s].push({ isItem: true, id: c.id, name: c.name, description: c.description, priceStr: c.priceStr[this.purchasesManager.getPriceKey()], isBought: this.purchasesManager.getIsUnlocked(c.id) });
      }
    }
    $("body").append(Handlebars.compile(e)(r)), this.bg = $("#purchasesBg"), this.element = $("#purchases"), this.element.css("left", ($("html").width() - this.element.outerWidth()) / 2), this.element.find(".closeButton").click(function() {
      n2.hide();
    }), this.element.find(".item").click(function() {
      var e2 = $(this).attr("data-id");
      n2.purchasesManager.getIsUnlocked(e2) || n2.purchasesManager.startPurchase(e2, function() {
        n2.hide(), n2.display();
      });
    }), this.bg.click(function() {
      n2.hide();
    });
  }, n.prototype.hide = function() {
    this.element && this.element.remove(), this.bg && this.bg.remove();
  }, n.prototype.destroy = function() {
    this.hide(), this.gameUiEm.removeListenerForType("purchases");
  }, n;
});
