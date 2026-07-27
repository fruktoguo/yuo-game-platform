/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：requireLib
 */
/**
 * @license RequireJS text 2.0.10 Copyright (c) 2010-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/requirejs/text for details
 */
/*! jQuery v1.11.3 | (c) 2005, 2015 jQuery Foundation, Inc. | jquery.org/license */
function BinaryArrayReader(e) {
  this.buffer = e, this.dataView = new DataView(e), this.offset = 0;
}
function BinaryArrayWriter() {
  this.totalLength = 0, this.data = [];
}
function arrayToHumanStr(e) {
  for (var t2 = "", n = 0; n < e.length; n++) n > 0 && (t2 += n == e.length - 1 ? " 和 " : "、"), t2 += e[n];
  return t2;
}
function dateToStr(e, t2) {
  if (!e) return "";
  var n = e.getFullYear(), i = e.getMonth() + 1, r = e.getDate(), o = e.getHours(), s2 = e.getMinutes(), a = e.getSeconds();
  return t2 && (n = e.getUTCFullYear(), i = e.getUTCMonth() + 1, r = e.getUTCDate(), o = e.getUTCHours(), s2 = e.getUTCMinutes(), a = e.getUTCSeconds()), i = (i < 10 ? "0" : "") + i, r = (r < 10 ? "0" : "") + r, o = (o < 10 ? "0" : "") + o, s2 = (s2 < 10 ? "0" : "") + s2, a = (a < 10 ? "0" : "") + a, n + "." + i + "." + r + " " + o + ":" + s2 + ":" + a;
}
function scrollLock(e) {
  var t2 = $(document).height(), n = window.scrollY, i = "DOMMouseScroll" == e.type ? -40 * e.originalEvent.detail : e.originalEvent.wheelDelta, r = function() {
    return e.stopPropagation(), e.preventDefault(), e.returnValue = false, false;
  };
  return 0 > i && 600 > t2 - n + i ? ($(document).scrollTop(t2), r()) : i > 0 && i > n ? ($(document).scrollTop(0), r()) : void 0;
}
function applySettings() {
  $(document).on("DOMMouseScroll mousewheel", scrollLock);
}
function isBrowserSupported() {
  var e = document.createElement("canvas");
  return !(!e.getContext || !e.getContext("2d"));
}
var requirejs, require, define;
!(function(Z) {
  function H(e) {
    return "[object Function]" === L.call(e);
  }
  function I(e) {
    return "[object Array]" === L.call(e);
  }
  function y(e, t2) {
    if (e) {
      var n;
      for (n = 0; n < e.length && (!e[n] || !t2(e[n], n, e)); n += 1) ;
    }
  }
  function M(e, t2) {
    if (e) {
      var n;
      for (n = e.length - 1; -1 < n && (!e[n] || !t2(e[n], n, e)); n -= 1) ;
    }
  }
  function s(e, t2) {
    return ga.call(e, t2);
  }
  function l(e, t2) {
    return s(e, t2) && e[t2];
  }
  function F(e, t2) {
    for (var n in e) if (s(e, n) && t2(e[n], n)) break;
  }
  function Q(e, t2, n, i) {
    return t2 && F(t2, function(t3, r) {
      !n && s(e, r) || (i && "string" != typeof t3 ? (e[r] || (e[r] = {}), Q(e[r], t3, n, i)) : e[r] = t3);
    }), e;
  }
  function u(e, t2) {
    return function() {
      return t2.apply(e, arguments);
    };
  }
  function aa(e) {
    throw e;
  }
  function ba(e) {
    if (!e) return e;
    var t2 = Z;
    return y(e.split("."), function(e2) {
      t2 = t2[e2];
    }), t2;
  }
  function A(e, t2, n, i) {
    return t2 = Error(t2 + "\nhttp://requirejs.org/docs/errors.html#" + e), t2.requireType = e, t2.requireModules = i, n && (t2.originalError = n), t2;
  }
  function ha(e) {
    function t2(e2, t3, n2) {
      var i2, r2, o2, s2, a2, u2, c2, h2 = t3 && t3.split("/");
      i2 = h2;
      var p2 = C2.map, d2 = p2 && p2["*"];
      if (e2 && "." === e2.charAt(0)) if (t3) {
        for (i2 = l(C2.pkgs, t3) ? h2 = [t3] : h2.slice(0, h2.length - 1), t3 = e2 = i2.concat(e2.split("/")), i2 = 0; t3[i2]; i2 += 1) if ("." === (r2 = t3[i2])) t3.splice(i2, 1), i2 -= 1;
        else if (".." === r2) {
          if (1 === i2 && (".." === t3[2] || ".." === t3[0])) break;
          0 < i2 && (t3.splice(i2 - 1, 2), i2 -= 2);
        }
        i2 = l(C2.pkgs, t3 = e2[0]), e2 = e2.join("/"), i2 && e2 === t3 + "/" + i2.main && (e2 = t3);
      } else 0 === e2.indexOf("./") && (e2 = e2.substring(2));
      if (n2 && p2 && (h2 || d2)) {
        for (t3 = e2.split("/"), i2 = t3.length; 0 < i2; i2 -= 1) {
          if (o2 = t3.slice(0, i2).join("/"), h2) {
            for (r2 = h2.length; 0 < r2; r2 -= 1) if ((n2 = l(p2, h2.slice(0, r2).join("/"))) && (n2 = l(n2, o2))) {
              s2 = n2, a2 = i2;
              break;
            }
          }
          if (s2) break;
          !u2 && d2 && l(d2, o2) && (u2 = l(d2, o2), c2 = i2);
        }
        !s2 && u2 && (s2 = u2, a2 = c2), s2 && (t3.splice(0, a2, s2), e2 = t3.join("/"));
      }
      return e2;
    }
    function n(e2) {
      z && y(document.getElementsByTagName("script"), function(t3) {
        if (t3.getAttribute("data-requiremodule") === e2 && t3.getAttribute("data-requirecontext") === G.contextName) return t3.parentNode.removeChild(t3), true;
      });
    }
    function i(e2) {
      var t3 = l(C2.paths, e2);
      if (t3 && I(t3) && 1 < t3.length) return n(e2), t3.shift(), G.require.undef(e2), G.require([e2]), true;
    }
    function r(e2) {
      var t3, n2 = e2 ? e2.indexOf("!") : -1;
      return -1 < n2 && (t3 = e2.substring(0, n2), e2 = e2.substring(n2 + 1, e2.length)), [t3, e2];
    }
    function o(e2, n2, i2, o2) {
      var s2, a2, u2 = null, c2 = n2 ? n2.name : null, h2 = e2, p2 = true, d2 = "";
      return e2 || (p2 = false, e2 = "_@r" + (N += 1)), e2 = r(e2), u2 = e2[0], e2 = e2[1], u2 && (u2 = t2(u2, c2, o2), a2 = l(_, u2)), e2 && (u2 ? d2 = a2 && a2.normalize ? a2.normalize(e2, function(e3) {
        return t2(e3, c2, o2);
      }) : t2(e2, c2, o2) : (d2 = t2(e2, c2, o2), e2 = r(d2), u2 = e2[0], d2 = e2[1], i2 = true, s2 = G.nameToUrl(d2))), i2 = !u2 || a2 || i2 ? "" : "_unnormalized" + (U += 1), { prefix: u2, name: d2, parentMap: n2, unnormalized: !!i2, url: s2, originalName: h2, isDefine: p2, id: (u2 ? u2 + "!" + d2 : d2) + i2 };
    }
    function a(e2) {
      var t3 = e2.id, n2 = l(M2, t3);
      return n2 || (n2 = M2[t3] = new G.Module(e2)), n2;
    }
    function c(e2, t3, n2) {
      var i2 = e2.id, r2 = l(M2, i2);
      !s(_, i2) || r2 && !r2.defineEmitComplete ? (r2 = a(e2), r2.error && "error" === t3 ? n2(r2.error) : r2.on(t3, n2)) : "defined" === t3 && n2(_[i2]);
    }
    function h(e2, t3) {
      var n2 = e2.requireModules, i2 = false;
      t3 ? t3(e2) : (y(n2, function(t4) {
        (t4 = l(M2, t4)) && (t4.error = e2, t4.events.error && (i2 = true, t4.emit("error", e2)));
      }), i2 || j.onError(e2));
    }
    function p() {
      R.length && (ia.apply(x2, [x2.length - 1, 0].concat(R)), R = []);
    }
    function d(e2) {
      delete M2[e2], delete w2[e2];
    }
    function g(e2, t3, n2) {
      var i2 = e2.map.id;
      e2.error ? e2.emit("error", e2.error) : (t3[i2] = true, y(e2.depMaps, function(i3, r2) {
        var o2 = i3.id, s2 = l(M2, o2);
        s2 && !e2.depMatched[r2] && !n2[o2] && (l(t3, o2) ? (e2.defineDep(r2, _[o2]), e2.check()) : g(s2, t3, n2));
      }), n2[i2] = true);
    }
    function m() {
      var e2, t3, r2, o2, s2 = (r2 = 1e3 * C2.waitSeconds) && G.startTime + r2 < (/* @__PURE__ */ new Date()).getTime(), a2 = [], u2 = [], c2 = false, l2 = true;
      if (!b2) {
        if (b2 = true, F(w2, function(r3) {
          if (e2 = r3.map, t3 = e2.id, r3.enabled && (e2.isDefine || u2.push(r3), !r3.error)) {
            if (!r3.inited && s2) i(t3) ? c2 = o2 = true : (a2.push(t3), n(t3));
            else if (!r3.inited && r3.fetched && e2.isDefine && (c2 = true, !e2.prefix)) return l2 = false;
          }
        }), s2 && a2.length) return r2 = A("timeout", "Load timeout for modules: " + a2, null, a2), r2.contextName = G.contextName, h(r2);
        l2 && y(u2, function(e3) {
          g(e3, {}, {});
        }), s2 && !o2 || !c2 || !z && !da || k || (k = setTimeout(function() {
          k = 0, m();
        }, 50)), b2 = false;
      }
    }
    function f(e2) {
      s(_, e2[0]) || a(o(e2[0], null, true)).init(e2[1], e2[2]);
    }
    function X(e2) {
      var e2 = e2.currentTarget || e2.srcElement, t3 = G.onScriptLoad;
      return e2.detachEvent && !W ? e2.detachEvent("onreadystatechange", t3) : e2.removeEventListener("load", t3, false), t3 = G.onScriptError, (!e2.detachEvent || W) && e2.removeEventListener("error", t3, false), { node: e2, id: e2 && e2.getAttribute("data-requiremodule") };
    }
    function v() {
      var e2;
      for (p(); x2.length; ) {
        if (e2 = x2.shift(), null === e2[0]) return h(A("mismatch", "Mismatched anonymous define() module: " + e2[e2.length - 1]));
        f(e2);
      }
    }
    var b2, S, G, T, k, C2 = { waitSeconds: 7, baseUrl: "./", paths: {}, pkgs: {}, shim: {}, config: {} }, M2 = {}, w2 = {}, E2 = {}, x2 = [], _ = {}, B = {}, N = 1, U = 1;
    return T = { require: function(e2) {
      return e2.require ? e2.require : e2.require = G.makeRequire(e2.map);
    }, exports: function(e2) {
      if (e2.usingExports = true, e2.map.isDefine) return e2.exports ? e2.exports : e2.exports = _[e2.map.id] = {};
    }, module: function(e2) {
      return e2.module ? e2.module : e2.module = { id: e2.map.id, uri: e2.map.url, config: function() {
        var t3 = l(C2.pkgs, e2.map.id);
        return (t3 ? l(C2.config, e2.map.id + "/" + t3.main) : l(C2.config, e2.map.id)) || {};
      }, exports: _[e2.map.id] };
    } }, S = function(e2) {
      this.events = l(E2, e2.id) || {}, this.map = e2, this.shim = l(C2.shim, e2.id), this.depExports = [], this.depMaps = [], this.depMatched = [], this.pluginMaps = {}, this.depCount = 0;
    }, S.prototype = { init: function(e2, t3, n2, i2) {
      i2 = i2 || {}, this.inited || (this.factory = t3, n2 ? this.on("error", n2) : this.events.error && (n2 = u(this, function(e3) {
        this.emit("error", e3);
      })), this.depMaps = e2 && e2.slice(0), this.errback = n2, this.inited = true, this.ignore = i2.ignore, i2.enabled || this.enabled ? this.enable() : this.check());
    }, defineDep: function(e2, t3) {
      this.depMatched[e2] || (this.depMatched[e2] = true, this.depCount -= 1, this.depExports[e2] = t3);
    }, fetch: function() {
      if (!this.fetched) {
        this.fetched = true, G.startTime = (/* @__PURE__ */ new Date()).getTime();
        var e2 = this.map;
        if (!this.shim) return e2.prefix ? this.callPlugin() : this.load();
        G.makeRequire(this.map, { enableBuildCallback: true })(this.shim.deps || [], u(this, function() {
          return e2.prefix ? this.callPlugin() : this.load();
        }));
      }
    }, load: function() {
      var e2 = this.map.url;
      B[e2] || (B[e2] = true, G.load(this.map.id, e2));
    }, check: function() {
      if (this.enabled && !this.enabling) {
        var e2, t3, n2 = this.map.id;
        t3 = this.depExports;
        var i2 = this.exports, r2 = this.factory;
        if (this.inited) {
          if (this.error) this.emit("error", this.error);
          else if (!this.defining) {
            if (this.defining = true, 1 > this.depCount && !this.defined) {
              if (H(r2)) {
                if (this.events.error && this.map.isDefine || j.onError !== aa) try {
                  i2 = G.execCb(n2, r2, t3, i2);
                } catch (t4) {
                  e2 = t4;
                }
                else i2 = G.execCb(n2, r2, t3, i2);
                if (this.map.isDefine && ((t3 = this.module) && void 0 !== t3.exports && t3.exports !== this.exports ? i2 = t3.exports : void 0 === i2 && this.usingExports && (i2 = this.exports)), e2) return e2.requireMap = this.map, e2.requireModules = this.map.isDefine ? [this.map.id] : null, e2.requireType = this.map.isDefine ? "define" : "require", h(this.error = e2);
              } else i2 = r2;
              this.exports = i2, this.map.isDefine && !this.ignore && (_[n2] = i2, j.onResourceLoad) && j.onResourceLoad(G, this.map, this.depMaps), d(n2), this.defined = true;
            }
            this.defining = false, this.defined && !this.defineEmitted && (this.defineEmitted = true, this.emit("defined", this.exports), this.defineEmitComplete = true);
          }
        } else this.fetch();
      }
    }, callPlugin: function() {
      var e2 = this.map, n2 = e2.id, i2 = o(e2.prefix);
      this.depMaps.push(i2), c(i2, "defined", u(this, function(i3) {
        var r2, p2;
        p2 = this.map.name;
        var g2 = this.map.parentMap ? this.map.parentMap.name : null, m2 = G.makeRequire(e2.parentMap, { enableBuildCallback: true });
        this.map.unnormalized ? (i3.normalize && (p2 = i3.normalize(p2, function(e3) {
          return t2(e3, g2, true);
        }) || ""), i3 = o(e2.prefix + "!" + p2, this.map.parentMap), c(i3, "defined", u(this, function(e3) {
          this.init([], function() {
            return e3;
          }, null, { enabled: true, ignore: true });
        })), (p2 = l(M2, i3.id)) && (this.depMaps.push(i3), this.events.error && p2.on("error", u(this, function(e3) {
          this.emit("error", e3);
        })), p2.enable())) : (r2 = u(this, function(e3) {
          this.init([], function() {
            return e3;
          }, null, { enabled: true });
        }), r2.error = u(this, function(e3) {
          this.inited = true, this.error = e3, e3.requireModules = [n2], F(M2, function(e4) {
            0 === e4.map.id.indexOf(n2 + "_unnormalized") && d(e4.map.id);
          }), h(e3);
        }), r2.fromText = u(this, function(t3, i4) {
          var u2 = e2.name, c2 = o(u2), l2 = O;
          i4 && (t3 = i4), l2 && (O = false), a(c2), s(C2.config, n2) && (C2.config[u2] = C2.config[n2]);
          try {
            j.exec(t3);
          } catch (e3) {
            return h(A("fromtexteval", "fromText eval for " + n2 + " failed: " + e3, e3, [n2]));
          }
          l2 && (O = true), this.depMaps.push(c2), G.completeLoad(u2), m2([u2], r2);
        }), i3.load(e2.name, m2, r2, C2));
      })), G.enable(i2, this), this.pluginMaps[i2.id] = i2;
    }, enable: function() {
      w2[this.map.id] = this, this.enabling = this.enabled = true, y(this.depMaps, u(this, function(e2, t3) {
        var n2, i2;
        if ("string" == typeof e2) {
          if (e2 = o(e2, this.map.isDefine ? this.map : this.map.parentMap, false, !this.skipMap), this.depMaps[t3] = e2, n2 = l(T, e2.id)) return void (this.depExports[t3] = n2(this));
          this.depCount += 1, c(e2, "defined", u(this, function(e3) {
            this.defineDep(t3, e3), this.check();
          })), this.errback && c(e2, "error", u(this, this.errback));
        }
        n2 = e2.id, i2 = M2[n2], !s(T, n2) && i2 && !i2.enabled && G.enable(e2, this);
      })), F(this.pluginMaps, u(this, function(e2) {
        var t3 = l(M2, e2.id);
        t3 && !t3.enabled && G.enable(e2, this);
      })), this.enabling = false, this.check();
    }, on: function(e2, t3) {
      var n2 = this.events[e2];
      n2 || (n2 = this.events[e2] = []), n2.push(t3);
    }, emit: function(e2, t3) {
      y(this.events[e2], function(e3) {
        e3(t3);
      }), "error" === e2 && delete this.events[e2];
    } }, G = { config: C2, contextName: e, registry: M2, defined: _, urlFetched: B, defQueue: x2, Module: S, makeModuleMap: o, nextTick: j.nextTick, onError: h, configure: function(e2) {
      e2.baseUrl && "/" !== e2.baseUrl.charAt(e2.baseUrl.length - 1) && (e2.baseUrl += "/");
      var t3 = C2.pkgs, n2 = C2.shim, i2 = { paths: true, config: true, map: true };
      F(e2, function(e3, t4) {
        i2[t4] ? "map" === t4 ? (C2.map || (C2.map = {}), Q(C2[t4], e3, true, true)) : Q(C2[t4], e3, true) : C2[t4] = e3;
      }), e2.shim && (F(e2.shim, function(e3, t4) {
        I(e3) && (e3 = { deps: e3 }), !e3.exports && !e3.init || e3.exportsFn || (e3.exportsFn = G.makeShimExports(e3)), n2[t4] = e3;
      }), C2.shim = n2), e2.packages && (y(e2.packages, function(e3) {
        e3 = "string" == typeof e3 ? { name: e3 } : e3, t3[e3.name] = { name: e3.name, location: e3.location || e3.name, main: (e3.main || "main").replace(ja, "").replace(ea, "") };
      }), C2.pkgs = t3), F(M2, function(e3, t4) {
        !e3.inited && !e3.map.unnormalized && (e3.map = o(t4));
      }), (e2.deps || e2.callback) && G.require(e2.deps || [], e2.callback);
    }, makeShimExports: function(e2) {
      return function() {
        var t3;
        return e2.init && (t3 = e2.init.apply(Z, arguments)), t3 || e2.exports && ba(e2.exports);
      };
    }, makeRequire: function(n2, i2) {
      function r2(t3, u2, c2) {
        var l2, p2;
        return i2.enableBuildCallback && u2 && H(u2) && (u2.__requireJsBuild = true), "string" == typeof t3 ? H(u2) ? h(A("requireargs", "Invalid require call"), c2) : n2 && s(T, t3) ? T[t3](M2[n2.id]) : j.get ? j.get(G, t3, n2, r2) : (l2 = o(t3, n2, false, true), l2 = l2.id, s(_, l2) ? _[l2] : h(A("notloaded", 'Module name "' + l2 + '" has not been loaded yet for context: ' + e + (n2 ? "" : ". Use require([])")))) : (v(), G.nextTick(function() {
          v(), p2 = a(o(null, n2)), p2.skipMap = i2.skipMap, p2.init(t3, u2, c2, { enabled: true }), m();
        }), r2);
      }
      return i2 = i2 || {}, Q(r2, { isBrowser: z, toUrl: function(e2) {
        var i3, r3 = e2.lastIndexOf("."), o2 = e2.split("/")[0];
        return -1 !== r3 && ("." !== o2 && ".." !== o2 || 1 < r3) && (i3 = e2.substring(r3, e2.length), e2 = e2.substring(0, r3)), G.nameToUrl(t2(e2, n2 && n2.id, true), i3, true);
      }, defined: function(e2) {
        return s(_, o(e2, n2, false, true).id);
      }, specified: function(e2) {
        return e2 = o(e2, n2, false, true).id, s(_, e2) || s(M2, e2);
      } }), n2 || (r2.undef = function(e2) {
        p();
        var t3 = o(e2, n2, true), i3 = l(M2, e2);
        delete _[e2], delete B[t3.url], delete E2[e2], i3 && (i3.events.defined && (E2[e2] = i3.events), d(e2));
      }), r2;
    }, enable: function(e2) {
      l(M2, e2.id) && a(e2).enable();
    }, completeLoad: function(e2) {
      var t3, n2, r2 = l(C2.shim, e2) || {}, o2 = r2.exports;
      for (p(); x2.length; ) {
        if (n2 = x2.shift(), null === n2[0]) {
          if (n2[0] = e2, t3) break;
          t3 = true;
        } else n2[0] === e2 && (t3 = true);
        f(n2);
      }
      if (n2 = l(M2, e2), !t3 && !s(_, e2) && n2 && !n2.inited) {
        if (C2.enforceDefine && (!o2 || !ba(o2))) return i(e2) ? void 0 : h(A("nodefine", "No define call for " + e2, null, [e2]));
        f([e2, r2.deps || [], r2.exportsFn]);
      }
      m();
    }, nameToUrl: function(e2, t3, n2) {
      var i2, r2, o2, s2, a2, u2;
      if (j.jsExtRegExp.test(e2)) s2 = e2 + (t3 || "");
      else {
        for (i2 = C2.paths, r2 = C2.pkgs, s2 = e2.split("/"), a2 = s2.length; 0 < a2; a2 -= 1) {
          if (u2 = s2.slice(0, a2).join("/"), o2 = l(r2, u2), u2 = l(i2, u2)) {
            I(u2) && (u2 = u2[0]), s2.splice(0, a2, u2);
            break;
          }
          if (o2) {
            e2 = e2 === o2.name ? o2.location + "/" + o2.main : o2.location, s2.splice(0, a2, e2);
            break;
          }
        }
        s2 = s2.join("/"), s2 += t3 || (/\?/.test(s2) || n2 ? "" : ".js"), s2 = ("/" === s2.charAt(0) || s2.match(/^[\w\+\.\-]+:/) ? "" : C2.baseUrl) + s2;
      }
      return C2.urlArgs ? s2 + (-1 === s2.indexOf("?") ? "?" : "&") + C2.urlArgs : s2;
    }, load: function(e2, t3) {
      j.load(G, e2, t3);
    }, execCb: function(e2, t3, n2, i2) {
      return t3.apply(i2, n2);
    }, onScriptLoad: function(e2) {
      ("load" === e2.type || ka.test((e2.currentTarget || e2.srcElement).readyState)) && (P = null, e2 = X(e2), G.completeLoad(e2.id));
    }, onScriptError: function(e2) {
      var t3 = X(e2);
      if (!i(t3.id)) return h(A("scripterror", "Script error for: " + t3.id, e2, [t3.id]));
    } }, G.require = G.makeRequire(), G;
  }
  var j, w, x, C, J, D, P, K, q, fa, la = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/gm, ma = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g, ea = /\.js$/, ja = /^\.\//;
  w = Object.prototype;
  var L = w.toString, ga = w.hasOwnProperty, ia = Array.prototype.splice, z = !("undefined" == typeof window || !navigator || !window.document), da = !z && "undefined" != typeof importScripts, ka = z && "PLAYSTATION 3" === navigator.platform ? /^complete$/ : /^(complete|loaded)$/, W = "undefined" != typeof opera && "[object Opera]" === opera.toString(), E = {}, t = {}, R = [], O = false;
  if (void 0 === define) {
    if (void 0 !== requirejs) {
      if (H(requirejs)) return;
      t = requirejs, requirejs = void 0;
    }
    void 0 !== require && !H(require) && (t = require, require = void 0), j = requirejs = function(e, t2, n, i) {
      var r, o = "_";
      return !I(e) && "string" != typeof e && (r = e, I(t2) ? (e = t2, t2 = n, n = i) : e = []), r && r.context && (o = r.context), (i = l(E, o)) || (i = E[o] = j.s.newContext(o)), r && i.configure(r), i.require(e, t2, n);
    }, j.config = function(e) {
      return j(e);
    }, j.nextTick = "undefined" != typeof setTimeout ? function(e) {
      setTimeout(e, 4);
    } : function(e) {
      e();
    }, require || (require = j), j.version = "2.1.8", j.jsExtRegExp = /^\/|:|\?|\.js$/, j.isBrowser = z, w = j.s = { contexts: E, newContext: ha }, j({}), y(["toUrl", "undef", "defined", "specified"], function(e) {
      j[e] = function() {
        var t2 = E._;
        return t2.require[e].apply(t2, arguments);
      };
    }), z && (x = w.head = document.getElementsByTagName("head")[0], C = document.getElementsByTagName("base")[0]) && (x = w.head = C.parentNode), j.onError = aa, j.createNode = function(e) {
      var t2 = e.xhtml ? document.createElementNS("http://www.w3.org/1999/xhtml", "html:script") : document.createElement("script");
      return t2.type = e.scriptType || "text/javascript", t2.charset = "utf-8", t2.async = true, t2;
    }, j.load = function(e, t2, n) {
      var i = e && e.config || {};
      if (z) return i = j.createNode(i, t2, n), i.setAttribute("data-requirecontext", e.contextName), i.setAttribute("data-requiremodule", t2), !i.attachEvent || i.attachEvent.toString && 0 > i.attachEvent.toString().indexOf("[native code") || W ? (i.addEventListener("load", e.onScriptLoad, false), i.addEventListener("error", e.onScriptError, false)) : (O = true, i.attachEvent("onreadystatechange", e.onScriptLoad)), i.src = n, K = i, C ? x.insertBefore(i, C) : x.appendChild(i), K = null, i;
      if (da) try {
        importScripts(n), e.completeLoad(t2);
      } catch (i2) {
        e.onError(A("importscripts", "importScripts failed for " + t2 + " at " + n, i2, [t2]));
      }
    }, z && M(document.getElementsByTagName("script"), function(e) {
      if (x || (x = e.parentNode), J = e.getAttribute("data-main")) return q = J, t.baseUrl || (D = q.split("/"), q = D.pop(), fa = D.length ? D.join("/") + "/" : "./", t.baseUrl = fa), q = q.replace(ea, ""), j.jsExtRegExp.test(q) && (q = J), t.deps = t.deps ? t.deps.concat(q) : [q], true;
    }), define = function(e, t2, n) {
      var i, r;
      "string" != typeof e && (n = t2, t2 = e, e = null), I(t2) || (n = t2, t2 = null), !t2 && H(n) && (t2 = [], n.length && (n.toString().replace(la, "").replace(ma, function(e2, n2) {
        t2.push(n2);
      }), t2 = (1 === n.length ? ["require"] : ["require", "exports", "module"]).concat(t2))), O && ((i = K) || (P && "interactive" === P.readyState || M(document.getElementsByTagName("script"), function(e2) {
        if ("interactive" === e2.readyState) return P = e2;
      }), i = P), i && (e || (e = i.getAttribute("data-requiremodule")), r = E[i.getAttribute("data-requirecontext")])), (r ? r.defQueue : R).push([e, t2, n]);
    }, define.amd = { jQuery: true }, j.exec = function(b) {
      return eval(b);
    }, j(t);
  }
})(this), define("requireLib", function() {
});
