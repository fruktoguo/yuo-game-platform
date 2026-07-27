/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：base/NumberFormat
 */
var names = { 6: " 百万", 9: " 十亿", 12: " 万亿", 15: " ×10^15", 18: " ×10^18", 21: " ×10^21", 24: " ×10^24", 27: " ×10^27", 30: " ×10^30", 33: " ×10^33", 36: " ×10^36", 39: " ×10^39", 42: " ×10^42", 45: " ×10^45", 48: " ×10^48", 51: " ×10^51", 54: " ×10^54", 57: " ×10^57", 60: " ×10^60", 63: " ×10^63" }, nf = function(e) {
  return numberFormat.format(e);
}, nfPlus = function(e) {
  var t = "";
  return e > 0 && (t = "+"), t + numberFormat.format(e);
}, numberFormat = { format: function(e) {
  if (void 0 == e) return "?";
  if (Math.abs(e) < 10) return Math.round(100 * e) / 100;
  if (Math.abs(e) < 1e3) return Math.round(10 * e) / 10;
  if (Math.abs(e) < 1e6) return Number(e).toFixed(0).replace(/\d(?=(\d{3})+$)/g, "$& ");
  e = e.toString().split("e+", 2);
  var t = e[0], n = t < 0 ? 2 : 1, i = 3 * Math.floor((Number(t).toFixed(0).length - n) / 3), r = i + (e[1] ? Number(e[1]) : 0), o = r % 3;
  return t *= Math.pow(10, o - i), r -= o, Math.round(100 * t) / 100 + (names[r] ? names[r] : "e" + r);
}, test: function() {
  var e = { 1: "1", 10: "10", 10.5: "10.5", 100: "100", 100.5: "100.5", 1e3: "1 000", 1000.5: "1 001", 1234.5: "1 235", 12134523451212333e4: "121.35 ×10^18", 12134523451212334e5: "1.21 ×10^21", 12134523451212334e6: "12.13 ×10^21", 12134523451212333e7: "121.35 ×10^21", 12134523451212334e8: "1.21 ×10^24", "121345234512123331233123412134523451212333123312341213452345121112.1": "121.35 ×10^63", 14860535876960295e9: "14.86 ×10^24", 9026470548765505e9: "9.03 ×10^24", 4689829190868461e8: "468.98 ×10^21", 3836127347506669e8: "383.61 ×10^21", 19180636737457225e6: "19.18 ×10^21" };
  for (var t in e) {
    var n = nf(t);
    n == e[t] ? console.logRow(t + " " + e[t] + " == " + n) : console.error(t + " " + e[t] + " == " + n);
    var i = nf("-" + t);
    i == "-" + e[t] ? console.logRow(t + " -" + e[t] + " == " + i) : console.error(t + " -" + e[t] + " == " + i);
  }
} };
define("base/NumberFormat", function() {
});
