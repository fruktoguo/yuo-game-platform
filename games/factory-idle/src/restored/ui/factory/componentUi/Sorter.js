/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：ui/factory/componentUi/Sorter
 */
define("ui/factory/componentUi/Sorter", ["text!template/factory/component/sorter.html", "game/action/UpdateSorterSortingResource"], function(e, t) {
  var n = function(e2) {
    this.component = e2, this.strategy = this.component.getStrategy();
  };
  return n.prototype.display = function(n2) {
    this.container = n2;
    var i = this.component.getFactory().getGame().getMeta().resources, r = [];
    r.push({ id: null, name: "all other" });
    for (var o = 0; o < i.length; o++) r.push({ id: i[o].id, name: i[o].name });
    var s = [], a = this.strategy.getSortingIndex();
    for (var o in a) s.push({ id: o, name: o, resources: r, selected: a[o] });
    this.container.html(Handlebars.compile(e)({ locations: s }));
    var u = this;
    this.container.find("select").each(function() {
      var e2 = $(this).attr("data-id").split(":");
      $(this).val(u.strategy.getSortingResource(e2[0], e2[1]));
    }).on("change", function() {
      var e2 = $(this).attr("data-id").split(":"), n3 = $(this).val(), i2 = new t(u.component, e2[0], e2[1], n3);
      i2.canUpdate() && i2.update();
    });
  }, n.prototype.destroy = function() {
  }, n;
});
