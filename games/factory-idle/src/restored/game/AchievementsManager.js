/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/AchievementsManager
 */
define("game/AchievementsManager", [], function() {
  var e = function(e2) {
    this.game = e2, this.achievements = {}, this.testers = this.getTesterImplementations(), this.bonuses = this.getBonusImplementations();
  };
  return e.prototype._setAchieved = function(e2, t) {
    this.achievements[e2] = t;
  }, e.prototype.setAchieved = function(e2, t) {
    this._setAchieved(e2, t), t && this.game.getEventManager().invokeEvent(GameEvent.ACHIEVEMENT_RECEIVED, e2);
  }, e.prototype.getAchievement = function(e2) {
    return this.achievements[e2];
  }, e.prototype.getTester = function(e2) {
    return this.testers[e2.type].test(e2);
  }, e.prototype.isVisible = function(e2) {
    var t = this.game.getMeta().achievementsById[e2];
    return !(t.requiresAchievement && !this.getAchievement(t.requiresAchievement));
  }, e.prototype.test = function(e2) {
    for (var t, n = true, i = 0; i < e2.tests.length; i++) t = e2.tests[i], this.testers[t.type].test(t) || (n = false);
    return n;
  }, e.prototype.testAll = function() {
    for (var e2, t = this.game.getMeta().achievements, n = 0; n < t.length; n++) e2 = t[n], this.getAchievement(e2.id) || this.test(e2) && (this.setAchieved(e2.id, true), e2.bonus && this.bonuses[e2.bonus.type].invoke(e2.bonus));
  }, e.prototype.getTesterDescriptionText = function(e2) {
    var t = this.game.getMeta().achievementsById[e2];
    if (!t) return "";
    for (var n = [], i = 0; i < t.tests.length; i++) {
      var r = t.tests[i];
      n.push(this.testers[r.type].getRequirementsInfoText(r));
    }
    return n;
  }, e.prototype.getBonusDescriptionText = function(e2) {
    var t = this.game.getMeta().achievementsById[e2];
    if (!t) return "";
    if (t.bonus) return this.bonuses[t.bonus.type].getInfoText(t.bonus);
  }, e.prototype.getTesterImplementations = function() {
    var e2 = this;
    return { amountOfMoney: { getRequirementsInfoText: function(e3) {
      return 'Have more money than <span class="money">$' + nf(e3.amount) + "</span>";
    }, test: function(t) {
      return e2.game.getMoney() > t.amount;
    } }, avgMoneyIncome: { getRequirementsInfoText: function(e3) {
      return 'Have avg income greater than <span class="money">$' + nf(e3.amount) + "</span>";
    }, test: function(t) {
      return e2.game.getStatistics().getAvgProfit() > t.amount;
    } }, researched: { getRequirementsInfoText: function(t) {
      return "Research " + e2.game.getMeta().researchById[t.researchId].name.lcFirst();
    }, test: function(t) {
      return e2.game.getResearchManager().getResearch(t.researchId) > 0;
    } } };
  }, e.prototype.getBonusImplementations = function() {
    var e2 = this;
    return { money: { getInfoText: function(e3) {
      return '<span class="money">+$' + nf(e3.amount) + "</span>";
    }, invoke: function(t) {
      e2.game.addMoney(t.amount);
    } }, custom: { getInfoText: function(e3) {
      return e3.description;
    }, invoke: function(e3) {
    } } };
  }, e.prototype.exportToWriter = function() {
    var e2 = new BinaryArrayWriter();
    return e2.writeUint16(this.game.getMeta().achievementsByIdNum.length), e2.writeBooleansArrayFunc(this.game.getMeta().achievementsByIdNum, function(e3) {
      return e3 && this.getAchievement(e3.id);
    }.bind(this)), e2;
  }, e.prototype.importFromReader = function(e2, t) {
    if (0 != e2.getLength()) {
      var n = e2.readUint16();
      this.achievements = {}, e2.readBooleanArrayFunc(n, function(e3, t2) {
        if (t2) {
          var n2 = this.game.getMeta().achievementsByIdNum[e3];
          n2 && this._setAchieved(n2.id, true);
        }
      }.bind(this));
    }
  }, e;
});
