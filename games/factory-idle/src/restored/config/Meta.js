/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：config/Meta
 */
define("config/Meta", ["./products", "./main/main", "./Ruleset", "./missions/mission1", "./missions/mission2"], function(e, t, n, i, r) {
  var o = { main: n.prepareMeta(t), missions: { mission1: n.prepareMeta(i), mission2: n.prepareMeta(r) }, productsLayout: e.layout, products: e.items, timeTravelTicketValue: e.timeTravelTicketValue };
  o.productsById = {}, o.productsByIdNum = [];
  for (var s in o.products) {
    if (o.productsById[o.products[s].id]) throw new Error("Purchase with id " + o.products[s].id + " already exists!");
    if (o.productsByIdNum[o.products[s].idNum]) throw new Error("Purchase with idNum " + o.products[s].idNum + " already exists!");
    o.productsById[o.products[s].id] = o.products[s], o.productsByIdNum[o.products[s].idNum] = o.products[s];
  }
  return o;
});
