/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/MissionsUi
 */
define("ui/MissionsUi", ["text!template/missions.html"], function(e) {
  var t = function(e2, t2) {
    this.globalUiEm = e2, this.missions = t2;
  };
  return t.prototype.display = function(t2) {
    var n = this;
    this.container = t2;
    var i = [];
    for (var r in this.missions) {
      var o = this.missions[r];
      i.push({ id: o.id, name: o.name, isBought: true });
    }
    this.container.html(Handlebars.compile(e)({ missions: i })), this.container.find(".missionButton").click(function(e2) {
      var t3 = $(this).attr("data-id");
      n.globalUiEm.invokeEvent(GlobalUiEvent.SHOW_MISSION, t3);
    });
  }, t.prototype.destroy = function() {
    this.globalUiEm.removeListenerForType("missionsUi"), this.container && this.container.html(""), this.container = null;
  }, t;
});
