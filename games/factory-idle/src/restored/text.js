/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：text
 */
define("text", ["module"], function(e) {
  "use strict";
  var t, n, i, r, o, s = ["Msxml2.XMLHTTP", "Microsoft.XMLHTTP", "Msxml2.XMLHTTP.4.0"], a = /^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im, u = /<body[^>]*>\s*([\s\S]+)\s*<\/body>/im, c = "undefined" != typeof location && location.href, l = c && location.protocol && location.protocol.replace(/\:/, ""), h = c && location.hostname, p = c && (location.port || void 0), d = {}, g = e.config && e.config() || {};
  return t = { version: "2.0.10", strip: function(e2) {
    if (e2) {
      e2 = e2.replace(a, "");
      var t2 = e2.match(u);
      t2 && (e2 = t2[1]);
    } else e2 = "";
    return e2;
  }, jsEscape: function(e2) {
    return e2.replace(/(['\\])/g, "\\$1").replace(/[\f]/g, "\\f").replace(/[\b]/g, "\\b").replace(/[\n]/g, "\\n").replace(/[\t]/g, "\\t").replace(/[\r]/g, "\\r").replace(/[\u2028]/g, "\\u2028").replace(/[\u2029]/g, "\\u2029");
  }, createXhr: g.createXhr || function() {
    var e2, t2, n2;
    if ("undefined" != typeof XMLHttpRequest) return new XMLHttpRequest();
    if ("undefined" != typeof ActiveXObject) for (t2 = 0; t2 < 3; t2 += 1) {
      n2 = s[t2];
      try {
        e2 = new ActiveXObject(n2);
      } catch (e3) {
      }
      if (e2) {
        s = [n2];
        break;
      }
    }
    return e2;
  }, parseName: function(e2) {
    var t2, n2, i2, r2 = false, o2 = e2.indexOf("."), s2 = 0 === e2.indexOf("./") || 0 === e2.indexOf("../");
    return -1 !== o2 && (!s2 || o2 > 1) ? (t2 = e2.substring(0, o2), n2 = e2.substring(o2 + 1, e2.length)) : t2 = e2, i2 = n2 || t2, o2 = i2.indexOf("!"), -1 !== o2 && (r2 = "strip" === i2.substring(o2 + 1), i2 = i2.substring(0, o2), n2 ? n2 = i2 : t2 = i2), { moduleName: t2, ext: n2, strip: r2 };
  }, xdRegExp: /^((\w+)\:)?\/\/([^\/\\]+)/, useXhr: function(e2, n2, i2, r2) {
    var o2, s2, a2, u2 = t.xdRegExp.exec(e2);
    return !u2 || (o2 = u2[2], s2 = u2[3], s2 = s2.split(":"), a2 = s2[1], s2 = s2[0], !(o2 && o2 !== n2 || s2 && s2.toLowerCase() !== i2.toLowerCase() || (a2 || s2) && a2 !== r2));
  }, finishLoad: function(e2, n2, i2, r2) {
    i2 = n2 ? t.strip(i2) : i2, g.isBuild && (d[e2] = i2), r2(i2);
  }, load: function(e2, n2, i2, r2) {
    if (r2.isBuild && !r2.inlineText) return void i2();
    g.isBuild = r2.isBuild;
    var o2 = t.parseName(e2), s2 = o2.moduleName + (o2.ext ? "." + o2.ext : ""), a2 = n2.toUrl(s2), u2 = g.useXhr || t.useXhr;
    if (0 === a2.indexOf("empty:")) return void i2();
    !c || u2(a2, l, h, p) ? t.get(a2, function(n3) {
      t.finishLoad(e2, o2.strip, n3, i2);
    }, function(e3) {
      i2.error && i2.error(e3);
    }) : n2([s2], function(e3) {
      t.finishLoad(o2.moduleName + "." + o2.ext, o2.strip, e3, i2);
    });
  }, write: function(e2, n2, i2, r2) {
    if (d.hasOwnProperty(n2)) {
      var o2 = t.jsEscape(d[n2]);
      i2.asModule(e2 + "!" + n2, "define(function () { return '" + o2 + "';});\n");
    }
  }, writeFile: function(e2, n2, i2, r2, o2) {
    var s2 = t.parseName(n2), a2 = s2.ext ? "." + s2.ext : "", u2 = s2.moduleName + a2, c2 = i2.toUrl(s2.moduleName + a2) + ".js";
    t.load(u2, i2, function(n3) {
      var i3 = function(e3) {
        return r2(c2, e3);
      };
      i3.asModule = function(e3, t2) {
        return r2.asModule(e3, c2, t2);
      }, t.write(e2, u2, i3, o2);
    }, o2);
  } }, "node" === g.env || !g.env && "undefined" != typeof process && process.versions && process.versions.node && !process.versions["node-webkit"] ? (n = require.nodeRequire("fs"), t.get = function(e2, t2, i2) {
    try {
      var r2 = n.readFileSync(e2, "utf8");
      0 === r2.indexOf("\uFEFF") && (r2 = r2.substring(1)), t2(r2);
    } catch (e3) {
      i2(e3);
    }
  }) : "xhr" === g.env || !g.env && t.createXhr() ? t.get = function(e2, n2, i2, r2) {
    var o2, s2 = t.createXhr();
    if (s2.open("GET", e2, true), r2) for (o2 in r2) r2.hasOwnProperty(o2) && s2.setRequestHeader(o2.toLowerCase(), r2[o2]);
    g.onXhr && g.onXhr(s2, e2), s2.onreadystatechange = function(t2) {
      var r3, o3;
      4 === s2.readyState && (r3 = s2.status, r3 > 399 && r3 < 600 ? (o3 = new Error(e2 + " HTTP status: " + r3), o3.xhr = s2, i2(o3)) : n2(s2.responseText), g.onXhrComplete && g.onXhrComplete(s2, e2));
    }, s2.send(null);
  } : "rhino" === g.env || !g.env && "undefined" != typeof Packages && "undefined" != typeof java ? t.get = function(e2, t2) {
    var n2, i2, r2 = new java.io.File(e2), o2 = java.lang.System.getProperty("line.separator"), s2 = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(r2), "utf-8")), a2 = "";
    try {
      for (n2 = new java.lang.StringBuffer(), i2 = s2.readLine(), i2 && i2.length() && 65279 === i2.charAt(0) && (i2 = i2.substring(1)), null !== i2 && n2.append(i2); null !== (i2 = s2.readLine()); ) n2.append(o2), n2.append(i2);
      a2 = String(n2.toString());
    } finally {
      s2.close();
    }
    t2(a2);
  } : ("xpconnect" === g.env || !g.env && "undefined" != typeof Components && Components.classes && Components.interfaces) && (i = Components.classes, r = Components.interfaces, Components.utils.import("resource://gre/modules/FileUtils.jsm"), o = "@mozilla.org/windows-registry-key;1" in i, t.get = function(e2, t2) {
    var n2, s2, a2, u2 = {};
    o && (e2 = e2.replace(/\//g, "\\")), a2 = new FileUtils.File(e2);
    try {
      n2 = i["@mozilla.org/network/file-input-stream;1"].createInstance(r.nsIFileInputStream), n2.init(a2, 1, 0, false), s2 = i["@mozilla.org/intl/converter-input-stream;1"].createInstance(r.nsIConverterInputStream), s2.init(n2, "utf-8", n2.available(), r.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER), s2.readString(n2.available(), u2), s2.close(), n2.close(), t2(u2.value);
    } catch (e3) {
      throw new Error((a2 && a2.path || "") + ": " + e3);
    }
  }), t;
});
