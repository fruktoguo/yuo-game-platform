/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/ResearchManager
 */
define("game/ResearchManager", [], function() {
  var e = function(e2) {
    this.game = e2, this.research = {};
  };
  return e.prototype.setResearch = function(e2, t) {
    this.research[e2] || (this.research[e2] = 0), this.research[e2] = t;
  }, e.prototype.addResearch = function(e2, t) {
    this.setResearch(e2, this.getResearch(e2) + t);
  }, e.prototype.getResearch = function(e2) {
    return this.research[e2] ? this.research[e2] : 0;
  }, e.prototype.getPrice = function(e2) {
    var t = this.game.getMeta().researchById[e2], n = 0;
    t.price && (n = t.price);
    for (var i = 0, r = this.getResearch(t.id); i < r; i++) n *= t.priceIncrease;
    return n;
  }, e.prototype.getPriceResearchPoints = function(e2) {
    var t = this.game.getMeta().researchById[e2], n = 0;
    t.priceResearchPoints && (n = t.priceResearchPoints);
    for (var i = 0, r = this.getResearch(t.id); i < r; i++) n *= t.priceIncrease;
    return n;
  }, e.prototype.canPurchase = function(e2) {
    return !!this.couldPurchase(e2) && (!(this.game.getMoney() < this.getPrice(e2)) && (!(this.game.getResearchPoints() < this.getPriceResearchPoints(e2)) && !!this.isVisible(e2)));
  }, e.prototype.couldPurchase = function(e2) {
    var t = this.game.getMeta().researchById[e2];
    return !(this.getResearch(e2) >= t.max);
  }, e.prototype.isVisible = function(e2) {
    var t = this.game.getMeta().researchById[e2];
    return !t.requiresResearch || this.getResearch(t.requiresResearch) > 0;
  }, e.prototype.exportToWriter = function() {
    var e2 = new BinaryArrayWriter(), t = new BinaryArrayWriter();
    return t.writeUint16(this.game.getMeta().researchByIdNum.length), t.writeBooleansArrayFunc(this.game.getMeta().researchByIdNum, function(t2) {
      return !!(t2 && this.research[t2.id] > 0) && (this.research[t2.id] > 1 && (e2.writeUint16(t2.idNum), e2.writeUint16(this.research[t2.id])), true);
    }.bind(this)), t.writeWriter(e2), t;
  }, e.prototype.importFromReader = function(e2, t) {
    if (0 != e2.getLength()) {
      this.research = {};
      var n = e2.readUint16();
      e2.readBooleanArrayFunc(n, function(e3, t2) {
        if (t2) {
          var n2 = this.game.getMeta().researchByIdNum[e3];
          n2 && this.setResearch(n2.id, 1);
        }
      }.bind(this));
      for (var i = e2.readReader(); i.getOffset() < i.getLength(); ) {
        var r = i.readUint16(), o = i.readUint16(), s = this.game.getMeta().researchByIdNum[r];
        s && this.setResearch(s.id, o);
      }
    }
  }, e;
});
