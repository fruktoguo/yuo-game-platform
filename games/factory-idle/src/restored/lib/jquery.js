/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：lib/jquery
 */
!(function(e, t) {
  "object" == typeof module && "object" == typeof module.exports ? module.exports = e.document ? t(e, true) : function(e2) {
    if (!e2.document) throw new Error("jQuery requires a window with a document");
    return t(e2);
  } : t(e);
})("undefined" != typeof window ? window : this, function(e, t) {
  function n(e2) {
    var t2 = "length" in e2 && e2.length, n2 = re.type(e2);
    return "function" !== n2 && !re.isWindow(e2) && (!(1 !== e2.nodeType || !t2) || ("array" === n2 || 0 === t2 || "number" == typeof t2 && t2 > 0 && t2 - 1 in e2));
  }
  function i(e2, t2, n2) {
    if (re.isFunction(t2)) return re.grep(e2, function(e3, i2) {
      return !!t2.call(e3, i2, e3) !== n2;
    });
    if (t2.nodeType) return re.grep(e2, function(e3) {
      return e3 === t2 !== n2;
    });
    if ("string" == typeof t2) {
      if (pe.test(t2)) return re.filter(t2, e2, n2);
      t2 = re.filter(t2, e2);
    }
    return re.grep(e2, function(e3) {
      return re.inArray(e3, t2) >= 0 !== n2;
    });
  }
  function r(e2, t2) {
    do {
      e2 = e2[t2];
    } while (e2 && 1 !== e2.nodeType);
    return e2;
  }
  function o(e2) {
    var t2 = ve[e2] = {};
    return re.each(e2.match(ye) || [], function(e3, n2) {
      t2[n2] = true;
    }), t2;
  }
  function s() {
    ge.addEventListener ? (ge.removeEventListener("DOMContentLoaded", a, false), e.removeEventListener("load", a, false)) : (ge.detachEvent("onreadystatechange", a), e.detachEvent("onload", a));
  }
  function a() {
    (ge.addEventListener || "load" === event.type || "complete" === ge.readyState) && (s(), re.ready());
  }
  function u(e2, t2, n2) {
    if (void 0 === n2 && 1 === e2.nodeType) {
      var i2 = "data-" + t2.replace(ke, "-$1").toLowerCase();
      if ("string" == typeof (n2 = e2.getAttribute(i2))) {
        try {
          n2 = "true" === n2 || "false" !== n2 && ("null" === n2 ? null : +n2 + "" === n2 ? +n2 : Te.test(n2) ? re.parseJSON(n2) : n2);
        } catch (e3) {
        }
        re.data(e2, t2, n2);
      } else n2 = void 0;
    }
    return n2;
  }
  function c(e2) {
    var t2;
    for (t2 in e2) if (("data" !== t2 || !re.isEmptyObject(e2[t2])) && "toJSON" !== t2) return false;
    return true;
  }
  function l(e2, t2, n2, i2) {
    if (re.acceptData(e2)) {
      var r2, o2, s2 = re.expando, a2 = e2.nodeType, u2 = a2 ? re.cache : e2, c2 = a2 ? e2[s2] : e2[s2] && s2;
      if (c2 && u2[c2] && (i2 || u2[c2].data) || void 0 !== n2 || "string" != typeof t2) return c2 || (c2 = a2 ? e2[s2] = $.pop() || re.guid++ : s2), u2[c2] || (u2[c2] = a2 ? {} : { toJSON: re.noop }), ("object" == typeof t2 || "function" == typeof t2) && (i2 ? u2[c2] = re.extend(u2[c2], t2) : u2[c2].data = re.extend(u2[c2].data, t2)), o2 = u2[c2], i2 || (o2.data || (o2.data = {}), o2 = o2.data), void 0 !== n2 && (o2[re.camelCase(t2)] = n2), "string" == typeof t2 ? null == (r2 = o2[t2]) && (r2 = o2[re.camelCase(t2)]) : r2 = o2, r2;
    }
  }
  function h(e2, t2, n2) {
    if (re.acceptData(e2)) {
      var i2, r2, o2 = e2.nodeType, s2 = o2 ? re.cache : e2, a2 = o2 ? e2[re.expando] : re.expando;
      if (s2[a2]) {
        if (t2 && (i2 = n2 ? s2[a2] : s2[a2].data)) {
          re.isArray(t2) ? t2 = t2.concat(re.map(t2, re.camelCase)) : t2 in i2 ? t2 = [t2] : (t2 = re.camelCase(t2), t2 = t2 in i2 ? [t2] : t2.split(" ")), r2 = t2.length;
          for (; r2--; ) delete i2[t2[r2]];
          if (n2 ? !c(i2) : !re.isEmptyObject(i2)) return;
        }
        (n2 || (delete s2[a2].data, c(s2[a2]))) && (o2 ? re.cleanData([e2], true) : ne.deleteExpando || s2 != s2.window ? delete s2[a2] : s2[a2] = null);
      }
    }
  }
  function p() {
    return true;
  }
  function d() {
    return false;
  }
  function g() {
    try {
      return ge.activeElement;
    } catch (e2) {
    }
  }
  function m(e2) {
    var t2 = _e.split("|"), n2 = e2.createDocumentFragment();
    if (n2.createElement) for (; t2.length; ) n2.createElement(t2.pop());
    return n2;
  }
  function f(e2, t2) {
    var n2, i2, r2 = 0, o2 = typeof e2.getElementsByTagName !== Ge ? e2.getElementsByTagName(t2 || "*") : typeof e2.querySelectorAll !== Ge ? e2.querySelectorAll(t2 || "*") : void 0;
    if (!o2) for (o2 = [], n2 = e2.childNodes || e2; null != (i2 = n2[r2]); r2++) !t2 || re.nodeName(i2, t2) ? o2.push(i2) : re.merge(o2, f(i2, t2));
    return void 0 === t2 || t2 && re.nodeName(e2, t2) ? re.merge([e2], o2) : o2;
  }
  function X(e2) {
    Ie.test(e2.type) && (e2.defaultChecked = e2.checked);
  }
  function y(e2, t2) {
    return re.nodeName(e2, "table") && re.nodeName(11 !== t2.nodeType ? t2 : t2.firstChild, "tr") ? e2.getElementsByTagName("tbody")[0] || e2.appendChild(e2.ownerDocument.createElement("tbody")) : e2;
  }
  function v(e2) {
    return e2.type = (null !== re.find.attr(e2, "type")) + "/" + e2.type, e2;
  }
  function b(e2) {
    var t2 = We.exec(e2.type);
    return t2 ? e2.type = t2[1] : e2.removeAttribute("type"), e2;
  }
  function S(e2, t2) {
    for (var n2, i2 = 0; null != (n2 = e2[i2]); i2++) re._data(n2, "globalEval", !t2 || re._data(t2[i2], "globalEval"));
  }
  function G(e2, t2) {
    if (1 === t2.nodeType && re.hasData(e2)) {
      var n2, i2, r2, o2 = re._data(e2), s2 = re._data(t2, o2), a2 = o2.events;
      if (a2) {
        delete s2.handle, s2.events = {};
        for (n2 in a2) for (i2 = 0, r2 = a2[n2].length; r2 > i2; i2++) re.event.add(t2, n2, a2[n2][i2]);
      }
      s2.data && (s2.data = re.extend({}, s2.data));
    }
  }
  function T(e2, t2) {
    var n2, i2, r2;
    if (1 === t2.nodeType) {
      if (n2 = t2.nodeName.toLowerCase(), !ne.noCloneEvent && t2[re.expando]) {
        r2 = re._data(t2);
        for (i2 in r2.events) re.removeEvent(t2, i2, r2.handle);
        t2.removeAttribute(re.expando);
      }
      "script" === n2 && t2.text !== e2.text ? (v(t2).text = e2.text, b(t2)) : "object" === n2 ? (t2.parentNode && (t2.outerHTML = e2.outerHTML), ne.html5Clone && e2.innerHTML && !re.trim(t2.innerHTML) && (t2.innerHTML = e2.innerHTML)) : "input" === n2 && Ie.test(e2.type) ? (t2.defaultChecked = t2.checked = e2.checked, t2.value !== e2.value && (t2.value = e2.value)) : "option" === n2 ? t2.defaultSelected = t2.selected = e2.defaultSelected : ("input" === n2 || "textarea" === n2) && (t2.defaultValue = e2.defaultValue);
    }
  }
  function k(t2, n2) {
    var i2, r2 = re(n2.createElement(t2)).appendTo(n2.body), o2 = e.getDefaultComputedStyle && (i2 = e.getDefaultComputedStyle(r2[0])) ? i2.display : re.css(r2[0], "display");
    return r2.detach(), o2;
  }
  function C(e2) {
    var t2 = ge, n2 = Ze[e2];
    return n2 || (n2 = k(e2, t2), "none" !== n2 && n2 || (Qe = (Qe || re("<iframe frameborder='0' width='0' height='0'/>")).appendTo(t2.documentElement), t2 = (Qe[0].contentWindow || Qe[0].contentDocument).document, t2.write(), t2.close(), n2 = k(e2, t2), Qe.detach()), Ze[e2] = n2), n2;
  }
  function M(e2, t2) {
    return { get: function() {
      var n2 = e2();
      if (null != n2) return n2 ? void delete this.get : (this.get = t2).apply(this, arguments);
    } };
  }
  function w(e2, t2) {
    if (t2 in e2) return t2;
    for (var n2 = t2.charAt(0).toUpperCase() + t2.slice(1), i2 = t2, r2 = ht.length; r2--; ) if ((t2 = ht[r2] + n2) in e2) return t2;
    return i2;
  }
  function E(e2, t2) {
    for (var n2, i2, r2, o2 = [], s2 = 0, a2 = e2.length; a2 > s2; s2++) i2 = e2[s2], i2.style && (o2[s2] = re._data(i2, "olddisplay"), n2 = i2.style.display, t2 ? (o2[s2] || "none" !== n2 || (i2.style.display = ""), "" === i2.style.display && we(i2) && (o2[s2] = re._data(i2, "olddisplay", C(i2.nodeName)))) : (r2 = we(i2), (n2 && "none" !== n2 || !r2) && re._data(i2, "olddisplay", r2 ? n2 : re.css(i2, "display"))));
    for (s2 = 0; a2 > s2; s2++) i2 = e2[s2], i2.style && (t2 && "none" !== i2.style.display && "" !== i2.style.display || (i2.style.display = t2 ? o2[s2] || "" : "none"));
    return e2;
  }
  function I(e2, t2, n2) {
    var i2 = at.exec(t2);
    return i2 ? Math.max(0, i2[1] - (n2 || 0)) + (i2[2] || "px") : t2;
  }
  function x(e2, t2, n2, i2, r2) {
    for (var o2 = n2 === (i2 ? "border" : "content") ? 4 : "width" === t2 ? 1 : 0, s2 = 0; 4 > o2; o2 += 2) "margin" === n2 && (s2 += re.css(e2, n2 + Me[o2], true, r2)), i2 ? ("content" === n2 && (s2 -= re.css(e2, "padding" + Me[o2], true, r2)), "margin" !== n2 && (s2 -= re.css(e2, "border" + Me[o2] + "Width", true, r2))) : (s2 += re.css(e2, "padding" + Me[o2], true, r2), "padding" !== n2 && (s2 += re.css(e2, "border" + Me[o2] + "Width", true, r2)));
    return s2;
  }
  function P(e2, t2, n2) {
    var i2 = true, r2 = "width" === t2 ? e2.offsetWidth : e2.offsetHeight, o2 = Je(e2), s2 = ne.boxSizing && "border-box" === re.css(e2, "boxSizing", false, o2);
    if (0 >= r2 || null == r2) {
      if (r2 = et(e2, t2, o2), (0 > r2 || null == r2) && (r2 = e2.style[t2]), nt.test(r2)) return r2;
      i2 = s2 && (ne.boxSizingReliable() || r2 === e2.style[t2]), r2 = parseFloat(r2) || 0;
    }
    return r2 + x(e2, t2, n2 || (s2 ? "border" : "content"), i2, o2) + "px";
  }
  function A(e2, t2, n2, i2, r2) {
    return new A.prototype.init(e2, t2, n2, i2, r2);
  }
  function R() {
    return setTimeout(function() {
      pt = void 0;
    }), pt = re.now();
  }
  function F(e2, t2) {
    var n2, i2 = { height: e2 }, r2 = 0;
    for (t2 = t2 ? 1 : 0; 4 > r2; r2 += 2 - t2) n2 = Me[r2], i2["margin" + n2] = i2["padding" + n2] = e2;
    return t2 && (i2.opacity = i2.width = e2), i2;
  }
  function _(e2, t2, n2) {
    for (var i2, r2 = (yt[t2] || []).concat(yt["*"]), o2 = 0, s2 = r2.length; s2 > o2; o2++) if (i2 = r2[o2].call(n2, t2, e2)) return i2;
  }
  function B(e2, t2, n2) {
    var i2, r2, o2, s2, a2, u2, c2, l2 = this, h2 = {}, p2 = e2.style, d2 = e2.nodeType && we(e2), g2 = re._data(e2, "fxshow");
    n2.queue || (a2 = re._queueHooks(e2, "fx"), null == a2.unqueued && (a2.unqueued = 0, u2 = a2.empty.fire, a2.empty.fire = function() {
      a2.unqueued || u2();
    }), a2.unqueued++, l2.always(function() {
      l2.always(function() {
        a2.unqueued--, re.queue(e2, "fx").length || a2.empty.fire();
      });
    })), 1 === e2.nodeType && ("height" in t2 || "width" in t2) && (n2.overflow = [p2.overflow, p2.overflowX, p2.overflowY], c2 = re.css(e2, "display"), "inline" === ("none" === c2 ? re._data(e2, "olddisplay") || C(e2.nodeName) : c2) && "none" === re.css(e2, "float") && (ne.inlineBlockNeedsLayout && "inline" !== C(e2.nodeName) ? p2.zoom = 1 : p2.display = "inline-block")), n2.overflow && (p2.overflow = "hidden", ne.shrinkWrapBlocks() || l2.always(function() {
      p2.overflow = n2.overflow[0], p2.overflowX = n2.overflow[1], p2.overflowY = n2.overflow[2];
    }));
    for (i2 in t2) if (r2 = t2[i2], gt.exec(r2)) {
      if (delete t2[i2], o2 = o2 || "toggle" === r2, r2 === (d2 ? "hide" : "show")) {
        if ("show" !== r2 || !g2 || void 0 === g2[i2]) continue;
        d2 = true;
      }
      h2[i2] = g2 && g2[i2] || re.style(e2, i2);
    } else c2 = void 0;
    if (re.isEmptyObject(h2)) "inline" === ("none" === c2 ? C(e2.nodeName) : c2) && (p2.display = c2);
    else {
      g2 ? "hidden" in g2 && (d2 = g2.hidden) : g2 = re._data(e2, "fxshow", {}), o2 && (g2.hidden = !d2), d2 ? re(e2).show() : l2.done(function() {
        re(e2).hide();
      }), l2.done(function() {
        var t3;
        re._removeData(e2, "fxshow");
        for (t3 in h2) re.style(e2, t3, h2[t3]);
      });
      for (i2 in h2) s2 = _(d2 ? g2[i2] : 0, i2, l2), i2 in g2 || (g2[i2] = s2.start, d2 && (s2.end = s2.start, s2.start = "width" === i2 || "height" === i2 ? 1 : 0));
    }
  }
  function N(e2, t2) {
    var n2, i2, r2, o2, s2;
    for (n2 in e2) if (i2 = re.camelCase(n2), r2 = t2[i2], o2 = e2[n2], re.isArray(o2) && (r2 = o2[1], o2 = e2[n2] = o2[0]), n2 !== i2 && (e2[i2] = o2, delete e2[n2]), (s2 = re.cssHooks[i2]) && "expand" in s2) {
      o2 = s2.expand(o2), delete e2[i2];
      for (n2 in o2) n2 in e2 || (e2[n2] = o2[n2], t2[n2] = r2);
    } else t2[i2] = r2;
  }
  function U(e2, t2, n2) {
    var i2, r2, o2 = 0, s2 = Xt.length, a2 = re.Deferred().always(function() {
      delete u2.elem;
    }), u2 = function() {
      if (r2) return false;
      for (var t3 = pt || R(), n3 = Math.max(0, c2.startTime + c2.duration - t3), i3 = n3 / c2.duration || 0, o3 = 1 - i3, s3 = 0, u3 = c2.tweens.length; u3 > s3; s3++) c2.tweens[s3].run(o3);
      return a2.notifyWith(e2, [c2, o3, n3]), 1 > o3 && u3 ? n3 : (a2.resolveWith(e2, [c2]), false);
    }, c2 = a2.promise({ elem: e2, props: re.extend({}, t2), opts: re.extend(true, { specialEasing: {} }, n2), originalProperties: t2, originalOptions: n2, startTime: pt || R(), duration: n2.duration, tweens: [], createTween: function(t3, n3) {
      var i3 = re.Tween(e2, c2.opts, t3, n3, c2.opts.specialEasing[t3] || c2.opts.easing);
      return c2.tweens.push(i3), i3;
    }, stop: function(t3) {
      var n3 = 0, i3 = t3 ? c2.tweens.length : 0;
      if (r2) return this;
      for (r2 = true; i3 > n3; n3++) c2.tweens[n3].run(1);
      return t3 ? a2.resolveWith(e2, [c2, t3]) : a2.rejectWith(e2, [c2, t3]), this;
    } }), l2 = c2.props;
    for (N(l2, c2.opts.specialEasing); s2 > o2; o2++) if (i2 = Xt[o2].call(c2, e2, l2, c2.opts)) return i2;
    return re.map(l2, _, c2), re.isFunction(c2.opts.start) && c2.opts.start.call(e2, c2), re.fx.timer(re.extend(u2, { elem: e2, anim: c2, queue: c2.opts.queue })), c2.progress(c2.opts.progress).done(c2.opts.done, c2.opts.complete).fail(c2.opts.fail).always(c2.opts.always);
  }
  function O(e2) {
    return function(t2, n2) {
      "string" != typeof t2 && (n2 = t2, t2 = "*");
      var i2, r2 = 0, o2 = t2.toLowerCase().match(ye) || [];
      if (re.isFunction(n2)) for (; i2 = o2[r2++]; ) "+" === i2.charAt(0) ? (i2 = i2.slice(1) || "*", (e2[i2] = e2[i2] || []).unshift(n2)) : (e2[i2] = e2[i2] || []).push(n2);
    };
  }
  function D(e2, t2, n2, i2) {
    function r2(a2) {
      var u2;
      return o2[a2] = true, re.each(e2[a2] || [], function(e3, a3) {
        var c2 = a3(t2, n2, i2);
        return "string" != typeof c2 || s2 || o2[c2] ? s2 ? !(u2 = c2) : void 0 : (t2.dataTypes.unshift(c2), r2(c2), false);
      }), u2;
    }
    var o2 = {}, s2 = e2 === qt;
    return r2(t2.dataTypes[0]) || !o2["*"] && r2("*");
  }
  function L(e2, t2) {
    var n2, i2, r2 = re.ajaxSettings.flatOptions || {};
    for (i2 in t2) void 0 !== t2[i2] && ((r2[i2] ? e2 : n2 || (n2 = {}))[i2] = t2[i2]);
    return n2 && re.extend(true, e2, n2), e2;
  }
  function q(e2, t2, n2) {
    for (var i2, r2, o2, s2, a2 = e2.contents, u2 = e2.dataTypes; "*" === u2[0]; ) u2.shift(), void 0 === r2 && (r2 = e2.mimeType || t2.getResponseHeader("Content-Type"));
    if (r2) {
      for (s2 in a2) if (a2[s2] && a2[s2].test(r2)) {
        u2.unshift(s2);
        break;
      }
    }
    if (u2[0] in n2) o2 = u2[0];
    else {
      for (s2 in n2) {
        if (!u2[0] || e2.converters[s2 + " " + u2[0]]) {
          o2 = s2;
          break;
        }
        i2 || (i2 = s2);
      }
      o2 = o2 || i2;
    }
    return o2 ? (o2 !== u2[0] && u2.unshift(o2), n2[o2]) : void 0;
  }
  function H(e2, t2, n2, i2) {
    var r2, o2, s2, a2, u2, c2 = {}, l2 = e2.dataTypes.slice();
    if (l2[1]) for (s2 in e2.converters) c2[s2.toLowerCase()] = e2.converters[s2];
    for (o2 = l2.shift(); o2; ) if (e2.responseFields[o2] && (n2[e2.responseFields[o2]] = t2), !u2 && i2 && e2.dataFilter && (t2 = e2.dataFilter(t2, e2.dataType)), u2 = o2, o2 = l2.shift()) {
      if ("*" === o2) o2 = u2;
      else if ("*" !== u2 && u2 !== o2) {
        if (!(s2 = c2[u2 + " " + o2] || c2["* " + o2])) {
          for (r2 in c2) if (a2 = r2.split(" "), a2[1] === o2 && (s2 = c2[u2 + " " + a2[0]] || c2["* " + a2[0]])) {
            true === s2 ? s2 = c2[r2] : true !== c2[r2] && (o2 = a2[0], l2.unshift(a2[1]));
            break;
          }
        }
        if (true !== s2) if (s2 && e2.throws) t2 = s2(t2);
        else try {
          t2 = s2(t2);
        } catch (e3) {
          return { state: "parsererror", error: s2 ? e3 : "No conversion from " + u2 + " to " + o2 };
        }
      }
    }
    return { state: "success", data: t2 };
  }
  function Y(e2, t2, n2, i2) {
    var r2;
    if (re.isArray(t2)) re.each(t2, function(t3, r3) {
      n2 || zt.test(e2) ? i2(e2, r3) : Y(e2 + "[" + ("object" == typeof r3 ? t3 : "") + "]", r3, n2, i2);
    });
    else if (n2 || "object" !== re.type(t2)) i2(e2, t2);
    else for (r2 in t2) Y(e2 + "[" + r2 + "]", t2[r2], n2, i2);
  }
  function z() {
    try {
      return new e.XMLHttpRequest();
    } catch (e2) {
    }
  }
  function W() {
    try {
      return new e.ActiveXObject("Microsoft.XMLHTTP");
    } catch (e2) {
    }
  }
  function j(e2) {
    return re.isWindow(e2) ? e2 : 9 === e2.nodeType && (e2.defaultView || e2.parentWindow);
  }
  var $ = [], V = $.slice, K = $.concat, Q = $.push, Z = $.indexOf, J = {}, ee = J.toString, te = J.hasOwnProperty, ne = {}, ie = "1.11.3", re = function(e2, t2) {
    return new re.fn.init(e2, t2);
  }, oe = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, se = /^-ms-/, ae = /-([\da-z])/gi, ue = function(e2, t2) {
    return t2.toUpperCase();
  };
  re.fn = re.prototype = { jquery: ie, constructor: re, selector: "", length: 0, toArray: function() {
    return V.call(this);
  }, get: function(e2) {
    return null != e2 ? 0 > e2 ? this[e2 + this.length] : this[e2] : V.call(this);
  }, pushStack: function(e2) {
    var t2 = re.merge(this.constructor(), e2);
    return t2.prevObject = this, t2.context = this.context, t2;
  }, each: function(e2, t2) {
    return re.each(this, e2, t2);
  }, map: function(e2) {
    return this.pushStack(re.map(this, function(t2, n2) {
      return e2.call(t2, n2, t2);
    }));
  }, slice: function() {
    return this.pushStack(V.apply(this, arguments));
  }, first: function() {
    return this.eq(0);
  }, last: function() {
    return this.eq(-1);
  }, eq: function(e2) {
    var t2 = this.length, n2 = +e2 + (0 > e2 ? t2 : 0);
    return this.pushStack(n2 >= 0 && t2 > n2 ? [this[n2]] : []);
  }, end: function() {
    return this.prevObject || this.constructor(null);
  }, push: Q, sort: $.sort, splice: $.splice }, re.extend = re.fn.extend = function() {
    var e2, t2, n2, i2, r2, o2, s2 = arguments[0] || {}, a2 = 1, u2 = arguments.length, c2 = false;
    for ("boolean" == typeof s2 && (c2 = s2, s2 = arguments[a2] || {}, a2++), "object" == typeof s2 || re.isFunction(s2) || (s2 = {}), a2 === u2 && (s2 = this, a2--); u2 > a2; a2++) if (null != (r2 = arguments[a2])) for (i2 in r2) e2 = s2[i2], n2 = r2[i2], s2 !== n2 && (c2 && n2 && (re.isPlainObject(n2) || (t2 = re.isArray(n2))) ? (t2 ? (t2 = false, o2 = e2 && re.isArray(e2) ? e2 : []) : o2 = e2 && re.isPlainObject(e2) ? e2 : {}, s2[i2] = re.extend(c2, o2, n2)) : void 0 !== n2 && (s2[i2] = n2));
    return s2;
  }, re.extend({ expando: "jQuery" + (ie + Math.random()).replace(/\D/g, ""), isReady: true, error: function(e2) {
    throw new Error(e2);
  }, noop: function() {
  }, isFunction: function(e2) {
    return "function" === re.type(e2);
  }, isArray: Array.isArray || function(e2) {
    return "array" === re.type(e2);
  }, isWindow: function(e2) {
    return null != e2 && e2 == e2.window;
  }, isNumeric: function(e2) {
    return !re.isArray(e2) && e2 - parseFloat(e2) + 1 >= 0;
  }, isEmptyObject: function(e2) {
    var t2;
    for (t2 in e2) return false;
    return true;
  }, isPlainObject: function(e2) {
    var t2;
    if (!e2 || "object" !== re.type(e2) || e2.nodeType || re.isWindow(e2)) return false;
    try {
      if (e2.constructor && !te.call(e2, "constructor") && !te.call(e2.constructor.prototype, "isPrototypeOf")) return false;
    } catch (e3) {
      return false;
    }
    if (ne.ownLast) for (t2 in e2) return te.call(e2, t2);
    for (t2 in e2) ;
    return void 0 === t2 || te.call(e2, t2);
  }, type: function(e2) {
    return null == e2 ? e2 + "" : "object" == typeof e2 || "function" == typeof e2 ? J[ee.call(e2)] || "object" : typeof e2;
  }, globalEval: function(t2) {
    t2 && re.trim(t2) && (e.execScript || function(t3) {
      e.eval.call(e, t3);
    })(t2);
  }, camelCase: function(e2) {
    return e2.replace(se, "ms-").replace(ae, ue);
  }, nodeName: function(e2, t2) {
    return e2.nodeName && e2.nodeName.toLowerCase() === t2.toLowerCase();
  }, each: function(e2, t2, i2) {
    var r2 = 0, o2 = e2.length, s2 = n(e2);
    if (i2) {
      if (s2) for (; o2 > r2 && false !== t2.apply(e2[r2], i2); r2++) ;
      else for (r2 in e2) if (false === t2.apply(e2[r2], i2)) break;
    } else if (s2) for (; o2 > r2 && false !== t2.call(e2[r2], r2, e2[r2]); r2++) ;
    else for (r2 in e2) if (false === t2.call(e2[r2], r2, e2[r2])) break;
    return e2;
  }, trim: function(e2) {
    return null == e2 ? "" : (e2 + "").replace(oe, "");
  }, makeArray: function(e2, t2) {
    var i2 = t2 || [];
    return null != e2 && (n(Object(e2)) ? re.merge(i2, "string" == typeof e2 ? [e2] : e2) : Q.call(i2, e2)), i2;
  }, inArray: function(e2, t2, n2) {
    var i2;
    if (t2) {
      if (Z) return Z.call(t2, e2, n2);
      for (i2 = t2.length, n2 = n2 ? 0 > n2 ? Math.max(0, i2 + n2) : n2 : 0; i2 > n2; n2++) if (n2 in t2 && t2[n2] === e2) return n2;
    }
    return -1;
  }, merge: function(e2, t2) {
    for (var n2 = +t2.length, i2 = 0, r2 = e2.length; n2 > i2; ) e2[r2++] = t2[i2++];
    if (n2 !== n2) for (; void 0 !== t2[i2]; ) e2[r2++] = t2[i2++];
    return e2.length = r2, e2;
  }, grep: function(e2, t2, n2) {
    for (var i2 = [], r2 = 0, o2 = e2.length, s2 = !n2; o2 > r2; r2++) !t2(e2[r2], r2) !== s2 && i2.push(e2[r2]);
    return i2;
  }, map: function(e2, t2, i2) {
    var r2, o2 = 0, s2 = e2.length, a2 = n(e2), u2 = [];
    if (a2) for (; s2 > o2; o2++) null != (r2 = t2(e2[o2], o2, i2)) && u2.push(r2);
    else for (o2 in e2) null != (r2 = t2(e2[o2], o2, i2)) && u2.push(r2);
    return K.apply([], u2);
  }, guid: 1, proxy: function(e2, t2) {
    var n2, i2, r2;
    return "string" == typeof t2 && (r2 = e2[t2], t2 = e2, e2 = r2), re.isFunction(e2) ? (n2 = V.call(arguments, 2), i2 = function() {
      return e2.apply(t2 || this, n2.concat(V.call(arguments)));
    }, i2.guid = e2.guid = e2.guid || re.guid++, i2) : void 0;
  }, now: function() {
    return +/* @__PURE__ */ new Date();
  }, support: ne }), re.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(e2, t2) {
    J["[object " + t2 + "]"] = t2.toLowerCase();
  });
  var ce = (function(e2) {
    function t2(e3, t3, n3, i3) {
      var r3, o3, s3, a3, c3, h3, p3, d3, g3, m3;
      if ((t3 ? t3.ownerDocument || t3 : U2) !== x2 && I2(t3), t3 = t3 || x2, n3 = n3 || [], a3 = t3.nodeType, "string" != typeof e3 || !e3 || 1 !== a3 && 9 !== a3 && 11 !== a3) return n3;
      if (!i3 && A2) {
        if (11 !== a3 && (r3 = fe2.exec(e3))) if (s3 = r3[1]) {
          if (9 === a3) {
            if (!(o3 = t3.getElementById(s3)) || !o3.parentNode) return n3;
            if (o3.id === s3) return n3.push(o3), n3;
          } else if (t3.ownerDocument && (o3 = t3.ownerDocument.getElementById(s3)) && B2(t3, o3) && o3.id === s3) return n3.push(o3), n3;
        } else {
          if (r3[2]) return K2.apply(n3, t3.getElementsByTagName(e3)), n3;
          if ((s3 = r3[3]) && v2.getElementsByClassName) return K2.apply(n3, t3.getElementsByClassName(s3)), n3;
        }
        if (v2.qsa && (!R2 || !R2.test(e3))) {
          if (d3 = p3 = N2, g3 = t3, m3 = 1 !== a3 && e3, 1 === a3 && "object" !== t3.nodeName.toLowerCase()) {
            for (h3 = T2(e3), (p3 = t3.getAttribute("id")) ? d3 = p3.replace(ye2, "\\$&") : t3.setAttribute("id", d3), d3 = "[id='" + d3 + "'] ", c3 = h3.length; c3--; ) h3[c3] = d3 + l2(h3[c3]);
            g3 = Xe2.test(e3) && u2(t3.parentNode) || t3, m3 = h3.join(",");
          }
          if (m3) try {
            return K2.apply(n3, g3.querySelectorAll(m3)), n3;
          } catch (e4) {
          } finally {
            p3 || t3.removeAttribute("id");
          }
        }
      }
      return C2(e3.replace(se2, "$1"), t3, n3, i3);
    }
    function n2() {
      function e3(n3, i3) {
        return t3.push(n3 + " ") > b2.cacheLength && delete e3[t3.shift()], e3[n3 + " "] = i3;
      }
      var t3 = [];
      return e3;
    }
    function i2(e3) {
      return e3[N2] = true, e3;
    }
    function r2(e3) {
      var t3 = x2.createElement("div");
      try {
        return !!e3(t3);
      } catch (e4) {
        return false;
      } finally {
        t3.parentNode && t3.parentNode.removeChild(t3), t3 = null;
      }
    }
    function o2(e3, t3) {
      for (var n3 = e3.split("|"), i3 = e3.length; i3--; ) b2.attrHandle[n3[i3]] = t3;
    }
    function s2(e3, t3) {
      var n3 = t3 && e3, i3 = n3 && 1 === e3.nodeType && 1 === t3.nodeType && (~t3.sourceIndex || z2) - (~e3.sourceIndex || z2);
      if (i3) return i3;
      if (n3) {
        for (; n3 = n3.nextSibling; ) if (n3 === t3) return -1;
      }
      return e3 ? 1 : -1;
    }
    function a2(e3) {
      return i2(function(t3) {
        return t3 = +t3, i2(function(n3, i3) {
          for (var r3, o3 = e3([], n3.length, t3), s3 = o3.length; s3--; ) n3[r3 = o3[s3]] && (n3[r3] = !(i3[r3] = n3[r3]));
        });
      });
    }
    function u2(e3) {
      return e3 && void 0 !== e3.getElementsByTagName && e3;
    }
    function c2() {
    }
    function l2(e3) {
      for (var t3 = 0, n3 = e3.length, i3 = ""; n3 > t3; t3++) i3 += e3[t3].value;
      return i3;
    }
    function h2(e3, t3, n3) {
      var i3 = t3.dir, r3 = n3 && "parentNode" === i3, o3 = D2++;
      return t3.first ? function(t4, n4, o4) {
        for (; t4 = t4[i3]; ) if (1 === t4.nodeType || r3) return e3(t4, n4, o4);
      } : function(t4, n4, s3) {
        var a3, u3, c3 = [O2, o3];
        if (s3) {
          for (; t4 = t4[i3]; ) if ((1 === t4.nodeType || r3) && e3(t4, n4, s3)) return true;
        } else for (; t4 = t4[i3]; ) if (1 === t4.nodeType || r3) {
          if (u3 = t4[N2] || (t4[N2] = {}), (a3 = u3[i3]) && a3[0] === O2 && a3[1] === o3) return c3[2] = a3[2];
          if (u3[i3] = c3, c3[2] = e3(t4, n4, s3)) return true;
        }
      };
    }
    function p2(e3) {
      return e3.length > 1 ? function(t3, n3, i3) {
        for (var r3 = e3.length; r3--; ) if (!e3[r3](t3, n3, i3)) return false;
        return true;
      } : e3[0];
    }
    function d2(e3, n3, i3) {
      for (var r3 = 0, o3 = n3.length; o3 > r3; r3++) t2(e3, n3[r3], i3);
      return i3;
    }
    function g2(e3, t3, n3, i3, r3) {
      for (var o3, s3 = [], a3 = 0, u3 = e3.length, c3 = null != t3; u3 > a3; a3++) (o3 = e3[a3]) && (!n3 || n3(o3, i3, r3)) && (s3.push(o3), c3 && t3.push(a3));
      return s3;
    }
    function m2(e3, t3, n3, r3, o3, s3) {
      return r3 && !r3[N2] && (r3 = m2(r3)), o3 && !o3[N2] && (o3 = m2(o3, s3)), i2(function(i3, s4, a3, u3) {
        var c3, l3, h3, p3 = [], m3 = [], f3 = s4.length, X3 = i3 || d2(t3 || "*", a3.nodeType ? [a3] : a3, []), y3 = !e3 || !i3 && t3 ? X3 : g2(X3, p3, e3, a3, u3), v3 = n3 ? o3 || (i3 ? e3 : f3 || r3) ? [] : s4 : y3;
        if (n3 && n3(y3, v3, a3, u3), r3) for (c3 = g2(v3, m3), r3(c3, [], a3, u3), l3 = c3.length; l3--; ) (h3 = c3[l3]) && (v3[m3[l3]] = !(y3[m3[l3]] = h3));
        if (i3) {
          if (o3 || e3) {
            if (o3) {
              for (c3 = [], l3 = v3.length; l3--; ) (h3 = v3[l3]) && c3.push(y3[l3] = h3);
              o3(null, v3 = [], c3, u3);
            }
            for (l3 = v3.length; l3--; ) (h3 = v3[l3]) && (c3 = o3 ? Z2(i3, h3) : p3[l3]) > -1 && (i3[c3] = !(s4[c3] = h3));
          }
        } else v3 = g2(v3 === s4 ? v3.splice(f3, v3.length) : v3), o3 ? o3(null, s4, v3, u3) : K2.apply(s4, v3);
      });
    }
    function f2(e3) {
      for (var t3, n3, i3, r3 = e3.length, o3 = b2.relative[e3[0].type], s3 = o3 || b2.relative[" "], a3 = o3 ? 1 : 0, u3 = h2(function(e4) {
        return e4 === t3;
      }, s3, true), c3 = h2(function(e4) {
        return Z2(t3, e4) > -1;
      }, s3, true), d3 = [function(e4, n4, i4) {
        var r4 = !o3 && (i4 || n4 !== M2) || ((t3 = n4).nodeType ? u3(e4, n4, i4) : c3(e4, n4, i4));
        return t3 = null, r4;
      }]; r3 > a3; a3++) if (n3 = b2.relative[e3[a3].type]) d3 = [h2(p2(d3), n3)];
      else {
        if (n3 = b2.filter[e3[a3].type].apply(null, e3[a3].matches), n3[N2]) {
          for (i3 = ++a3; r3 > i3 && !b2.relative[e3[i3].type]; i3++) ;
          return m2(a3 > 1 && p2(d3), a3 > 1 && l2(e3.slice(0, a3 - 1).concat({ value: " " === e3[a3 - 2].type ? "*" : "" })).replace(se2, "$1"), n3, i3 > a3 && f2(e3.slice(a3, i3)), r3 > i3 && f2(e3 = e3.slice(i3)), r3 > i3 && l2(e3));
        }
        d3.push(n3);
      }
      return p2(d3);
    }
    function X2(e3, n3) {
      var r3 = n3.length > 0, o3 = e3.length > 0, s3 = function(i3, s4, a3, u3, c3) {
        var l3, h3, p3, d3 = 0, m3 = "0", f3 = i3 && [], X3 = [], y3 = M2, v3 = i3 || o3 && b2.find.TAG("*", c3), S3 = O2 += null == y3 ? 1 : Math.random() || 0.1, G3 = v3.length;
        for (c3 && (M2 = s4 !== x2 && s4); m3 !== G3 && null != (l3 = v3[m3]); m3++) {
          if (o3 && l3) {
            for (h3 = 0; p3 = e3[h3++]; ) if (p3(l3, s4, a3)) {
              u3.push(l3);
              break;
            }
            c3 && (O2 = S3);
          }
          r3 && ((l3 = !p3 && l3) && d3--, i3 && f3.push(l3));
        }
        if (d3 += m3, r3 && m3 !== d3) {
          for (h3 = 0; p3 = n3[h3++]; ) p3(f3, X3, s4, a3);
          if (i3) {
            if (d3 > 0) for (; m3--; ) f3[m3] || X3[m3] || (X3[m3] = $2.call(u3));
            X3 = g2(X3);
          }
          K2.apply(u3, X3), c3 && !i3 && X3.length > 0 && d3 + n3.length > 1 && t2.uniqueSort(u3);
        }
        return c3 && (O2 = S3, M2 = y3), f3;
      };
      return r3 ? i2(s3) : s3;
    }
    var y2, v2, b2, S2, G2, T2, k2, C2, M2, w2, E2, I2, x2, P2, A2, R2, F2, _2, B2, N2 = "sizzle" + 1 * /* @__PURE__ */ new Date(), U2 = e2.document, O2 = 0, D2 = 0, L2 = n2(), q2 = n2(), H2 = n2(), Y2 = function(e3, t3) {
      return e3 === t3 && (E2 = true), 0;
    }, z2 = 1 << 31, W2 = {}.hasOwnProperty, j2 = [], $2 = j2.pop, V2 = j2.push, K2 = j2.push, Q2 = j2.slice, Z2 = function(e3, t3) {
      for (var n3 = 0, i3 = e3.length; i3 > n3; n3++) if (e3[n3] === t3) return n3;
      return -1;
    }, J2 = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped", ee2 = "[\\x20\\t\\r\\n\\f]", te2 = "(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+", ne2 = te2.replace("w", "w#"), ie2 = "\\[" + ee2 + "*(" + te2 + ")(?:" + ee2 + "*([*^$|!~]?=)" + ee2 + `*(?:'((?:\\\\.|[^\\\\'])*)'|"((?:\\\\.|[^\\\\"])*)"|(` + ne2 + "))|)" + ee2 + "*\\]", re2 = ":(" + te2 + `)(?:\\((('((?:\\\\.|[^\\\\'])*)'|"((?:\\\\.|[^\\\\"])*)")|((?:\\\\.|[^\\\\()[\\]]|` + ie2 + ")*)|.*)\\)|)", oe2 = new RegExp(ee2 + "+", "g"), se2 = new RegExp("^" + ee2 + "+|((?:^|[^\\\\])(?:\\\\.)*)" + ee2 + "+$", "g"), ae2 = new RegExp("^" + ee2 + "*," + ee2 + "*"), ue2 = new RegExp("^" + ee2 + "*([>+~]|" + ee2 + ")" + ee2 + "*"), ce2 = new RegExp("=" + ee2 + `*([^\\]'"]*?)` + ee2 + "*\\]", "g"), le2 = new RegExp(re2), he2 = new RegExp("^" + ne2 + "$"), pe2 = { ID: new RegExp("^#(" + te2 + ")"), CLASS: new RegExp("^\\.(" + te2 + ")"), TAG: new RegExp("^(" + te2.replace("w", "w*") + ")"), ATTR: new RegExp("^" + ie2), PSEUDO: new RegExp("^" + re2), CHILD: new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + ee2 + "*(even|odd|(([+-]|)(\\d*)n|)" + ee2 + "*(?:([+-]|)" + ee2 + "*(\\d+)|))" + ee2 + "*\\)|)", "i"), bool: new RegExp("^(?:" + J2 + ")$", "i"), needsContext: new RegExp("^" + ee2 + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" + ee2 + "*((?:-\\d)?\\d*)" + ee2 + "*\\)|)(?=[^-]|$)", "i") }, de2 = /^(?:input|select|textarea|button)$/i, ge2 = /^h\d$/i, me2 = /^[^{]+\{\s*\[native \w/, fe2 = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/, Xe2 = /[+~]/, ye2 = /'|\\/g, ve2 = new RegExp("\\\\([\\da-f]{1,6}" + ee2 + "?|(" + ee2 + ")|.)", "ig"), be2 = function(e3, t3, n3) {
      var i3 = "0x" + t3 - 65536;
      return i3 !== i3 || n3 ? t3 : 0 > i3 ? String.fromCharCode(i3 + 65536) : String.fromCharCode(i3 >> 10 | 55296, 1023 & i3 | 56320);
    }, Se2 = function() {
      I2();
    };
    try {
      K2.apply(j2 = Q2.call(U2.childNodes), U2.childNodes), j2[U2.childNodes.length].nodeType;
    } catch (e3) {
      K2 = { apply: j2.length ? function(e4, t3) {
        V2.apply(e4, Q2.call(t3));
      } : function(e4, t3) {
        for (var n3 = e4.length, i3 = 0; e4[n3++] = t3[i3++]; ) ;
        e4.length = n3 - 1;
      } };
    }
    v2 = t2.support = {}, G2 = t2.isXML = function(e3) {
      var t3 = e3 && (e3.ownerDocument || e3).documentElement;
      return !!t3 && "HTML" !== t3.nodeName;
    }, I2 = t2.setDocument = function(e3) {
      var t3, n3, i3 = e3 ? e3.ownerDocument || e3 : U2;
      return i3 !== x2 && 9 === i3.nodeType && i3.documentElement ? (x2 = i3, P2 = i3.documentElement, n3 = i3.defaultView, n3 && n3 !== n3.top && (n3.addEventListener ? n3.addEventListener("unload", Se2, false) : n3.attachEvent && n3.attachEvent("onunload", Se2)), A2 = !G2(i3), v2.attributes = r2(function(e4) {
        return e4.className = "i", !e4.getAttribute("className");
      }), v2.getElementsByTagName = r2(function(e4) {
        return e4.appendChild(i3.createComment("")), !e4.getElementsByTagName("*").length;
      }), v2.getElementsByClassName = me2.test(i3.getElementsByClassName), v2.getById = r2(function(e4) {
        return P2.appendChild(e4).id = N2, !i3.getElementsByName || !i3.getElementsByName(N2).length;
      }), v2.getById ? (b2.find.ID = function(e4, t4) {
        if (void 0 !== t4.getElementById && A2) {
          var n4 = t4.getElementById(e4);
          return n4 && n4.parentNode ? [n4] : [];
        }
      }, b2.filter.ID = function(e4) {
        var t4 = e4.replace(ve2, be2);
        return function(e5) {
          return e5.getAttribute("id") === t4;
        };
      }) : (delete b2.find.ID, b2.filter.ID = function(e4) {
        var t4 = e4.replace(ve2, be2);
        return function(e5) {
          var n4 = void 0 !== e5.getAttributeNode && e5.getAttributeNode("id");
          return n4 && n4.value === t4;
        };
      }), b2.find.TAG = v2.getElementsByTagName ? function(e4, t4) {
        return void 0 !== t4.getElementsByTagName ? t4.getElementsByTagName(e4) : v2.qsa ? t4.querySelectorAll(e4) : void 0;
      } : function(e4, t4) {
        var n4, i4 = [], r3 = 0, o3 = t4.getElementsByTagName(e4);
        if ("*" === e4) {
          for (; n4 = o3[r3++]; ) 1 === n4.nodeType && i4.push(n4);
          return i4;
        }
        return o3;
      }, b2.find.CLASS = v2.getElementsByClassName && function(e4, t4) {
        return A2 ? t4.getElementsByClassName(e4) : void 0;
      }, F2 = [], R2 = [], (v2.qsa = me2.test(i3.querySelectorAll)) && (r2(function(e4) {
        P2.appendChild(e4).innerHTML = "<a id='" + N2 + "'></a><select id='" + N2 + "-\f]' msallowcapture=''><option selected=''></option></select>", e4.querySelectorAll("[msallowcapture^='']").length && R2.push("[*^$]=" + ee2 + `*(?:''|"")`), e4.querySelectorAll("[selected]").length || R2.push("\\[" + ee2 + "*(?:value|" + J2 + ")"), e4.querySelectorAll("[id~=" + N2 + "-]").length || R2.push("~="), e4.querySelectorAll(":checked").length || R2.push(":checked"), e4.querySelectorAll("a#" + N2 + "+*").length || R2.push(".#.+[+~]");
      }), r2(function(e4) {
        var t4 = i3.createElement("input");
        t4.setAttribute("type", "hidden"), e4.appendChild(t4).setAttribute("name", "D"), e4.querySelectorAll("[name=d]").length && R2.push("name" + ee2 + "*[*^$|!~]?="), e4.querySelectorAll(":enabled").length || R2.push(":enabled", ":disabled"), e4.querySelectorAll("*,:x"), R2.push(",.*:");
      })), (v2.matchesSelector = me2.test(_2 = P2.matches || P2.webkitMatchesSelector || P2.mozMatchesSelector || P2.oMatchesSelector || P2.msMatchesSelector)) && r2(function(e4) {
        v2.disconnectedMatch = _2.call(e4, "div"), _2.call(e4, "[s!='']:x"), F2.push("!=", re2);
      }), R2 = R2.length && new RegExp(R2.join("|")), F2 = F2.length && new RegExp(F2.join("|")), t3 = me2.test(P2.compareDocumentPosition), B2 = t3 || me2.test(P2.contains) ? function(e4, t4) {
        var n4 = 9 === e4.nodeType ? e4.documentElement : e4, i4 = t4 && t4.parentNode;
        return e4 === i4 || !(!i4 || 1 !== i4.nodeType || !(n4.contains ? n4.contains(i4) : e4.compareDocumentPosition && 16 & e4.compareDocumentPosition(i4)));
      } : function(e4, t4) {
        if (t4) {
          for (; t4 = t4.parentNode; ) if (t4 === e4) return true;
        }
        return false;
      }, Y2 = t3 ? function(e4, t4) {
        if (e4 === t4) return E2 = true, 0;
        var n4 = !e4.compareDocumentPosition - !t4.compareDocumentPosition;
        return n4 || (n4 = (e4.ownerDocument || e4) === (t4.ownerDocument || t4) ? e4.compareDocumentPosition(t4) : 1, 1 & n4 || !v2.sortDetached && t4.compareDocumentPosition(e4) === n4 ? e4 === i3 || e4.ownerDocument === U2 && B2(U2, e4) ? -1 : t4 === i3 || t4.ownerDocument === U2 && B2(U2, t4) ? 1 : w2 ? Z2(w2, e4) - Z2(w2, t4) : 0 : 4 & n4 ? -1 : 1);
      } : function(e4, t4) {
        if (e4 === t4) return E2 = true, 0;
        var n4, r3 = 0, o3 = e4.parentNode, a3 = t4.parentNode, u3 = [e4], c3 = [t4];
        if (!o3 || !a3) return e4 === i3 ? -1 : t4 === i3 ? 1 : o3 ? -1 : a3 ? 1 : w2 ? Z2(w2, e4) - Z2(w2, t4) : 0;
        if (o3 === a3) return s2(e4, t4);
        for (n4 = e4; n4 = n4.parentNode; ) u3.unshift(n4);
        for (n4 = t4; n4 = n4.parentNode; ) c3.unshift(n4);
        for (; u3[r3] === c3[r3]; ) r3++;
        return r3 ? s2(u3[r3], c3[r3]) : u3[r3] === U2 ? -1 : c3[r3] === U2 ? 1 : 0;
      }, i3) : x2;
    }, t2.matches = function(e3, n3) {
      return t2(e3, null, null, n3);
    }, t2.matchesSelector = function(e3, n3) {
      if ((e3.ownerDocument || e3) !== x2 && I2(e3), n3 = n3.replace(ce2, "='$1']"), !(!v2.matchesSelector || !A2 || F2 && F2.test(n3) || R2 && R2.test(n3))) try {
        var i3 = _2.call(e3, n3);
        if (i3 || v2.disconnectedMatch || e3.document && 11 !== e3.document.nodeType) return i3;
      } catch (e4) {
      }
      return t2(n3, x2, null, [e3]).length > 0;
    }, t2.contains = function(e3, t3) {
      return (e3.ownerDocument || e3) !== x2 && I2(e3), B2(e3, t3);
    }, t2.attr = function(e3, t3) {
      (e3.ownerDocument || e3) !== x2 && I2(e3);
      var n3 = b2.attrHandle[t3.toLowerCase()], i3 = n3 && W2.call(b2.attrHandle, t3.toLowerCase()) ? n3(e3, t3, !A2) : void 0;
      return void 0 !== i3 ? i3 : v2.attributes || !A2 ? e3.getAttribute(t3) : (i3 = e3.getAttributeNode(t3)) && i3.specified ? i3.value : null;
    }, t2.error = function(e3) {
      throw new Error("Syntax error, unrecognized expression: " + e3);
    }, t2.uniqueSort = function(e3) {
      var t3, n3 = [], i3 = 0, r3 = 0;
      if (E2 = !v2.detectDuplicates, w2 = !v2.sortStable && e3.slice(0), e3.sort(Y2), E2) {
        for (; t3 = e3[r3++]; ) t3 === e3[r3] && (i3 = n3.push(r3));
        for (; i3--; ) e3.splice(n3[i3], 1);
      }
      return w2 = null, e3;
    }, S2 = t2.getText = function(e3) {
      var t3, n3 = "", i3 = 0, r3 = e3.nodeType;
      if (r3) {
        if (1 === r3 || 9 === r3 || 11 === r3) {
          if ("string" == typeof e3.textContent) return e3.textContent;
          for (e3 = e3.firstChild; e3; e3 = e3.nextSibling) n3 += S2(e3);
        } else if (3 === r3 || 4 === r3) return e3.nodeValue;
      } else for (; t3 = e3[i3++]; ) n3 += S2(t3);
      return n3;
    }, b2 = t2.selectors = { cacheLength: 50, createPseudo: i2, match: pe2, attrHandle: {}, find: {}, relative: { ">": { dir: "parentNode", first: true }, " ": { dir: "parentNode" }, "+": { dir: "previousSibling", first: true }, "~": { dir: "previousSibling" } }, preFilter: { ATTR: function(e3) {
      return e3[1] = e3[1].replace(ve2, be2), e3[3] = (e3[3] || e3[4] || e3[5] || "").replace(ve2, be2), "~=" === e3[2] && (e3[3] = " " + e3[3] + " "), e3.slice(0, 4);
    }, CHILD: function(e3) {
      return e3[1] = e3[1].toLowerCase(), "nth" === e3[1].slice(0, 3) ? (e3[3] || t2.error(e3[0]), e3[4] = +(e3[4] ? e3[5] + (e3[6] || 1) : 2 * ("even" === e3[3] || "odd" === e3[3])), e3[5] = +(e3[7] + e3[8] || "odd" === e3[3])) : e3[3] && t2.error(e3[0]), e3;
    }, PSEUDO: function(e3) {
      var t3, n3 = !e3[6] && e3[2];
      return pe2.CHILD.test(e3[0]) ? null : (e3[3] ? e3[2] = e3[4] || e3[5] || "" : n3 && le2.test(n3) && (t3 = T2(n3, true)) && (t3 = n3.indexOf(")", n3.length - t3) - n3.length) && (e3[0] = e3[0].slice(0, t3), e3[2] = n3.slice(0, t3)), e3.slice(0, 3));
    } }, filter: { TAG: function(e3) {
      var t3 = e3.replace(ve2, be2).toLowerCase();
      return "*" === e3 ? function() {
        return true;
      } : function(e4) {
        return e4.nodeName && e4.nodeName.toLowerCase() === t3;
      };
    }, CLASS: function(e3) {
      var t3 = L2[e3 + " "];
      return t3 || (t3 = new RegExp("(^|" + ee2 + ")" + e3 + "(" + ee2 + "|$)")) && L2(e3, function(e4) {
        return t3.test("string" == typeof e4.className && e4.className || void 0 !== e4.getAttribute && e4.getAttribute("class") || "");
      });
    }, ATTR: function(e3, n3, i3) {
      return function(r3) {
        var o3 = t2.attr(r3, e3);
        return null == o3 ? "!=" === n3 : !n3 || (o3 += "", "=" === n3 ? o3 === i3 : "!=" === n3 ? o3 !== i3 : "^=" === n3 ? i3 && 0 === o3.indexOf(i3) : "*=" === n3 ? i3 && o3.indexOf(i3) > -1 : "$=" === n3 ? i3 && o3.slice(-i3.length) === i3 : "~=" === n3 ? (" " + o3.replace(oe2, " ") + " ").indexOf(i3) > -1 : "|=" === n3 && (o3 === i3 || o3.slice(0, i3.length + 1) === i3 + "-"));
      };
    }, CHILD: function(e3, t3, n3, i3, r3) {
      var o3 = "nth" !== e3.slice(0, 3), s3 = "last" !== e3.slice(-4), a3 = "of-type" === t3;
      return 1 === i3 && 0 === r3 ? function(e4) {
        return !!e4.parentNode;
      } : function(t4, n4, u3) {
        var c3, l3, h3, p3, d3, g3, m3 = o3 !== s3 ? "nextSibling" : "previousSibling", f3 = t4.parentNode, X3 = a3 && t4.nodeName.toLowerCase(), y3 = !u3 && !a3;
        if (f3) {
          if (o3) {
            for (; m3; ) {
              for (h3 = t4; h3 = h3[m3]; ) if (a3 ? h3.nodeName.toLowerCase() === X3 : 1 === h3.nodeType) return false;
              g3 = m3 = "only" === e3 && !g3 && "nextSibling";
            }
            return true;
          }
          if (g3 = [s3 ? f3.firstChild : f3.lastChild], s3 && y3) {
            for (l3 = f3[N2] || (f3[N2] = {}), c3 = l3[e3] || [], d3 = c3[0] === O2 && c3[1], p3 = c3[0] === O2 && c3[2], h3 = d3 && f3.childNodes[d3]; h3 = ++d3 && h3 && h3[m3] || (p3 = d3 = 0) || g3.pop(); ) if (1 === h3.nodeType && ++p3 && h3 === t4) {
              l3[e3] = [O2, d3, p3];
              break;
            }
          } else if (y3 && (c3 = (t4[N2] || (t4[N2] = {}))[e3]) && c3[0] === O2) p3 = c3[1];
          else for (; (h3 = ++d3 && h3 && h3[m3] || (p3 = d3 = 0) || g3.pop()) && ((a3 ? h3.nodeName.toLowerCase() !== X3 : 1 !== h3.nodeType) || !++p3 || (y3 && ((h3[N2] || (h3[N2] = {}))[e3] = [O2, p3]), h3 !== t4)); ) ;
          return (p3 -= r3) === i3 || p3 % i3 == 0 && p3 / i3 >= 0;
        }
      };
    }, PSEUDO: function(e3, n3) {
      var r3, o3 = b2.pseudos[e3] || b2.setFilters[e3.toLowerCase()] || t2.error("unsupported pseudo: " + e3);
      return o3[N2] ? o3(n3) : o3.length > 1 ? (r3 = [e3, e3, "", n3], b2.setFilters.hasOwnProperty(e3.toLowerCase()) ? i2(function(e4, t3) {
        for (var i3, r4 = o3(e4, n3), s3 = r4.length; s3--; ) i3 = Z2(e4, r4[s3]), e4[i3] = !(t3[i3] = r4[s3]);
      }) : function(e4) {
        return o3(e4, 0, r3);
      }) : o3;
    } }, pseudos: { not: i2(function(e3) {
      var t3 = [], n3 = [], r3 = k2(e3.replace(se2, "$1"));
      return r3[N2] ? i2(function(e4, t4, n4, i3) {
        for (var o3, s3 = r3(e4, null, i3, []), a3 = e4.length; a3--; ) (o3 = s3[a3]) && (e4[a3] = !(t4[a3] = o3));
      }) : function(e4, i3, o3) {
        return t3[0] = e4, r3(t3, null, o3, n3), t3[0] = null, !n3.pop();
      };
    }), has: i2(function(e3) {
      return function(n3) {
        return t2(e3, n3).length > 0;
      };
    }), contains: i2(function(e3) {
      return e3 = e3.replace(ve2, be2), function(t3) {
        return (t3.textContent || t3.innerText || S2(t3)).indexOf(e3) > -1;
      };
    }), lang: i2(function(e3) {
      return he2.test(e3 || "") || t2.error("unsupported lang: " + e3), e3 = e3.replace(ve2, be2).toLowerCase(), function(t3) {
        var n3;
        do {
          if (n3 = A2 ? t3.lang : t3.getAttribute("xml:lang") || t3.getAttribute("lang")) return (n3 = n3.toLowerCase()) === e3 || 0 === n3.indexOf(e3 + "-");
        } while ((t3 = t3.parentNode) && 1 === t3.nodeType);
        return false;
      };
    }), target: function(t3) {
      var n3 = e2.location && e2.location.hash;
      return n3 && n3.slice(1) === t3.id;
    }, root: function(e3) {
      return e3 === P2;
    }, focus: function(e3) {
      return e3 === x2.activeElement && (!x2.hasFocus || x2.hasFocus()) && !!(e3.type || e3.href || ~e3.tabIndex);
    }, enabled: function(e3) {
      return false === e3.disabled;
    }, disabled: function(e3) {
      return true === e3.disabled;
    }, checked: function(e3) {
      var t3 = e3.nodeName.toLowerCase();
      return "input" === t3 && !!e3.checked || "option" === t3 && !!e3.selected;
    }, selected: function(e3) {
      return e3.parentNode && e3.parentNode.selectedIndex, true === e3.selected;
    }, empty: function(e3) {
      for (e3 = e3.firstChild; e3; e3 = e3.nextSibling) if (e3.nodeType < 6) return false;
      return true;
    }, parent: function(e3) {
      return !b2.pseudos.empty(e3);
    }, header: function(e3) {
      return ge2.test(e3.nodeName);
    }, input: function(e3) {
      return de2.test(e3.nodeName);
    }, button: function(e3) {
      var t3 = e3.nodeName.toLowerCase();
      return "input" === t3 && "button" === e3.type || "button" === t3;
    }, text: function(e3) {
      var t3;
      return "input" === e3.nodeName.toLowerCase() && "text" === e3.type && (null == (t3 = e3.getAttribute("type")) || "text" === t3.toLowerCase());
    }, first: a2(function() {
      return [0];
    }), last: a2(function(e3, t3) {
      return [t3 - 1];
    }), eq: a2(function(e3, t3, n3) {
      return [0 > n3 ? n3 + t3 : n3];
    }), even: a2(function(e3, t3) {
      for (var n3 = 0; t3 > n3; n3 += 2) e3.push(n3);
      return e3;
    }), odd: a2(function(e3, t3) {
      for (var n3 = 1; t3 > n3; n3 += 2) e3.push(n3);
      return e3;
    }), lt: a2(function(e3, t3, n3) {
      for (var i3 = 0 > n3 ? n3 + t3 : n3; --i3 >= 0; ) e3.push(i3);
      return e3;
    }), gt: a2(function(e3, t3, n3) {
      for (var i3 = 0 > n3 ? n3 + t3 : n3; ++i3 < t3; ) e3.push(i3);
      return e3;
    }) } }, b2.pseudos.nth = b2.pseudos.eq;
    for (y2 in { radio: true, checkbox: true, file: true, password: true, image: true }) b2.pseudos[y2] = /* @__PURE__ */ (function(e3) {
      return function(t3) {
        return "input" === t3.nodeName.toLowerCase() && t3.type === e3;
      };
    })(y2);
    for (y2 in { submit: true, reset: true }) b2.pseudos[y2] = /* @__PURE__ */ (function(e3) {
      return function(t3) {
        var n3 = t3.nodeName.toLowerCase();
        return ("input" === n3 || "button" === n3) && t3.type === e3;
      };
    })(y2);
    return c2.prototype = b2.filters = b2.pseudos, b2.setFilters = new c2(), T2 = t2.tokenize = function(e3, n3) {
      var i3, r3, o3, s3, a3, u3, c3, l3 = q2[e3 + " "];
      if (l3) return n3 ? 0 : l3.slice(0);
      for (a3 = e3, u3 = [], c3 = b2.preFilter; a3; ) {
        (!i3 || (r3 = ae2.exec(a3))) && (r3 && (a3 = a3.slice(r3[0].length) || a3), u3.push(o3 = [])), i3 = false, (r3 = ue2.exec(a3)) && (i3 = r3.shift(), o3.push({ value: i3, type: r3[0].replace(se2, " ") }), a3 = a3.slice(i3.length));
        for (s3 in b2.filter) !(r3 = pe2[s3].exec(a3)) || c3[s3] && !(r3 = c3[s3](r3)) || (i3 = r3.shift(), o3.push({ value: i3, type: s3, matches: r3 }), a3 = a3.slice(i3.length));
        if (!i3) break;
      }
      return n3 ? a3.length : a3 ? t2.error(e3) : q2(e3, u3).slice(0);
    }, k2 = t2.compile = function(e3, t3) {
      var n3, i3 = [], r3 = [], o3 = H2[e3 + " "];
      if (!o3) {
        for (t3 || (t3 = T2(e3)), n3 = t3.length; n3--; ) o3 = f2(t3[n3]), o3[N2] ? i3.push(o3) : r3.push(o3);
        o3 = H2(e3, X2(r3, i3)), o3.selector = e3;
      }
      return o3;
    }, C2 = t2.select = function(e3, t3, n3, i3) {
      var r3, o3, s3, a3, c3, h3 = "function" == typeof e3 && e3, p3 = !i3 && T2(e3 = h3.selector || e3);
      if (n3 = n3 || [], 1 === p3.length) {
        if (o3 = p3[0] = p3[0].slice(0), o3.length > 2 && "ID" === (s3 = o3[0]).type && v2.getById && 9 === t3.nodeType && A2 && b2.relative[o3[1].type]) {
          if (!(t3 = (b2.find.ID(s3.matches[0].replace(ve2, be2), t3) || [])[0])) return n3;
          h3 && (t3 = t3.parentNode), e3 = e3.slice(o3.shift().value.length);
        }
        for (r3 = pe2.needsContext.test(e3) ? 0 : o3.length; r3-- && (s3 = o3[r3], !b2.relative[a3 = s3.type]); ) if ((c3 = b2.find[a3]) && (i3 = c3(s3.matches[0].replace(ve2, be2), Xe2.test(o3[0].type) && u2(t3.parentNode) || t3))) {
          if (o3.splice(r3, 1), !(e3 = i3.length && l2(o3))) return K2.apply(n3, i3), n3;
          break;
        }
      }
      return (h3 || k2(e3, p3))(i3, t3, !A2, n3, Xe2.test(e3) && u2(t3.parentNode) || t3), n3;
    }, v2.sortStable = N2.split("").sort(Y2).join("") === N2, v2.detectDuplicates = !!E2, I2(), v2.sortDetached = r2(function(e3) {
      return 1 & e3.compareDocumentPosition(x2.createElement("div"));
    }), r2(function(e3) {
      return e3.innerHTML = "<a href='#'></a>", "#" === e3.firstChild.getAttribute("href");
    }) || o2("type|href|height|width", function(e3, t3, n3) {
      return n3 ? void 0 : e3.getAttribute(t3, "type" === t3.toLowerCase() ? 1 : 2);
    }), v2.attributes && r2(function(e3) {
      return e3.innerHTML = "<input/>", e3.firstChild.setAttribute("value", ""), "" === e3.firstChild.getAttribute("value");
    }) || o2("value", function(e3, t3, n3) {
      return n3 || "input" !== e3.nodeName.toLowerCase() ? void 0 : e3.defaultValue;
    }), r2(function(e3) {
      return null == e3.getAttribute("disabled");
    }) || o2(J2, function(e3, t3, n3) {
      var i3;
      return n3 ? void 0 : true === e3[t3] ? t3.toLowerCase() : (i3 = e3.getAttributeNode(t3)) && i3.specified ? i3.value : null;
    }), t2;
  })(e);
  re.find = ce, re.expr = ce.selectors, re.expr[":"] = re.expr.pseudos, re.unique = ce.uniqueSort, re.text = ce.getText, re.isXMLDoc = ce.isXML, re.contains = ce.contains;
  var le = re.expr.match.needsContext, he = /^<(\w+)\s*\/?>(?:<\/\1>|)$/, pe = /^.[^:#\[\.,]*$/;
  re.filter = function(e2, t2, n2) {
    var i2 = t2[0];
    return n2 && (e2 = ":not(" + e2 + ")"), 1 === t2.length && 1 === i2.nodeType ? re.find.matchesSelector(i2, e2) ? [i2] : [] : re.find.matches(e2, re.grep(t2, function(e3) {
      return 1 === e3.nodeType;
    }));
  }, re.fn.extend({ find: function(e2) {
    var t2, n2 = [], i2 = this, r2 = i2.length;
    if ("string" != typeof e2) return this.pushStack(re(e2).filter(function() {
      for (t2 = 0; r2 > t2; t2++) if (re.contains(i2[t2], this)) return true;
    }));
    for (t2 = 0; r2 > t2; t2++) re.find(e2, i2[t2], n2);
    return n2 = this.pushStack(r2 > 1 ? re.unique(n2) : n2), n2.selector = this.selector ? this.selector + " " + e2 : e2, n2;
  }, filter: function(e2) {
    return this.pushStack(i(this, e2 || [], false));
  }, not: function(e2) {
    return this.pushStack(i(this, e2 || [], true));
  }, is: function(e2) {
    return !!i(this, "string" == typeof e2 && le.test(e2) ? re(e2) : e2 || [], false).length;
  } });
  var de, ge = e.document, me = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/;
  (re.fn.init = function(e2, t2) {
    var n2, i2;
    if (!e2) return this;
    if ("string" == typeof e2) {
      if (!(n2 = "<" === e2.charAt(0) && ">" === e2.charAt(e2.length - 1) && e2.length >= 3 ? [null, e2, null] : me.exec(e2)) || !n2[1] && t2) return !t2 || t2.jquery ? (t2 || de).find(e2) : this.constructor(t2).find(e2);
      if (n2[1]) {
        if (t2 = t2 instanceof re ? t2[0] : t2, re.merge(this, re.parseHTML(n2[1], t2 && t2.nodeType ? t2.ownerDocument || t2 : ge, true)), he.test(n2[1]) && re.isPlainObject(t2)) for (n2 in t2) re.isFunction(this[n2]) ? this[n2](t2[n2]) : this.attr(n2, t2[n2]);
        return this;
      }
      if ((i2 = ge.getElementById(n2[2])) && i2.parentNode) {
        if (i2.id !== n2[2]) return de.find(e2);
        this.length = 1, this[0] = i2;
      }
      return this.context = ge, this.selector = e2, this;
    }
    return e2.nodeType ? (this.context = this[0] = e2, this.length = 1, this) : re.isFunction(e2) ? void 0 !== de.ready ? de.ready(e2) : e2(re) : (void 0 !== e2.selector && (this.selector = e2.selector, this.context = e2.context), re.makeArray(e2, this));
  }).prototype = re.fn, de = re(ge);
  var fe = /^(?:parents|prev(?:Until|All))/, Xe = { children: true, contents: true, next: true, prev: true };
  re.extend({ dir: function(e2, t2, n2) {
    for (var i2 = [], r2 = e2[t2]; r2 && 9 !== r2.nodeType && (void 0 === n2 || 1 !== r2.nodeType || !re(r2).is(n2)); ) 1 === r2.nodeType && i2.push(r2), r2 = r2[t2];
    return i2;
  }, sibling: function(e2, t2) {
    for (var n2 = []; e2; e2 = e2.nextSibling) 1 === e2.nodeType && e2 !== t2 && n2.push(e2);
    return n2;
  } }), re.fn.extend({ has: function(e2) {
    var t2, n2 = re(e2, this), i2 = n2.length;
    return this.filter(function() {
      for (t2 = 0; i2 > t2; t2++) if (re.contains(this, n2[t2])) return true;
    });
  }, closest: function(e2, t2) {
    for (var n2, i2 = 0, r2 = this.length, o2 = [], s2 = le.test(e2) || "string" != typeof e2 ? re(e2, t2 || this.context) : 0; r2 > i2; i2++) for (n2 = this[i2]; n2 && n2 !== t2; n2 = n2.parentNode) if (n2.nodeType < 11 && (s2 ? s2.index(n2) > -1 : 1 === n2.nodeType && re.find.matchesSelector(n2, e2))) {
      o2.push(n2);
      break;
    }
    return this.pushStack(o2.length > 1 ? re.unique(o2) : o2);
  }, index: function(e2) {
    return e2 ? "string" == typeof e2 ? re.inArray(this[0], re(e2)) : re.inArray(e2.jquery ? e2[0] : e2, this) : this[0] && this[0].parentNode ? this.first().prevAll().length : -1;
  }, add: function(e2, t2) {
    return this.pushStack(re.unique(re.merge(this.get(), re(e2, t2))));
  }, addBack: function(e2) {
    return this.add(null == e2 ? this.prevObject : this.prevObject.filter(e2));
  } }), re.each({ parent: function(e2) {
    var t2 = e2.parentNode;
    return t2 && 11 !== t2.nodeType ? t2 : null;
  }, parents: function(e2) {
    return re.dir(e2, "parentNode");
  }, parentsUntil: function(e2, t2, n2) {
    return re.dir(e2, "parentNode", n2);
  }, next: function(e2) {
    return r(e2, "nextSibling");
  }, prev: function(e2) {
    return r(e2, "previousSibling");
  }, nextAll: function(e2) {
    return re.dir(e2, "nextSibling");
  }, prevAll: function(e2) {
    return re.dir(e2, "previousSibling");
  }, nextUntil: function(e2, t2, n2) {
    return re.dir(e2, "nextSibling", n2);
  }, prevUntil: function(e2, t2, n2) {
    return re.dir(e2, "previousSibling", n2);
  }, siblings: function(e2) {
    return re.sibling((e2.parentNode || {}).firstChild, e2);
  }, children: function(e2) {
    return re.sibling(e2.firstChild);
  }, contents: function(e2) {
    return re.nodeName(e2, "iframe") ? e2.contentDocument || e2.contentWindow.document : re.merge([], e2.childNodes);
  } }, function(e2, t2) {
    re.fn[e2] = function(n2, i2) {
      var r2 = re.map(this, t2, n2);
      return "Until" !== e2.slice(-5) && (i2 = n2), i2 && "string" == typeof i2 && (r2 = re.filter(i2, r2)), this.length > 1 && (Xe[e2] || (r2 = re.unique(r2)), fe.test(e2) && (r2 = r2.reverse())), this.pushStack(r2);
    };
  });
  var ye = /\S+/g, ve = {};
  re.Callbacks = function(e2) {
    e2 = "string" == typeof e2 ? ve[e2] || o(e2) : re.extend({}, e2);
    var t2, n2, i2, r2, s2, a2, u2 = [], c2 = !e2.once && [], l2 = function(o2) {
      for (n2 = e2.memory && o2, i2 = true, s2 = a2 || 0, a2 = 0, r2 = u2.length, t2 = true; u2 && r2 > s2; s2++) if (false === u2[s2].apply(o2[0], o2[1]) && e2.stopOnFalse) {
        n2 = false;
        break;
      }
      t2 = false, u2 && (c2 ? c2.length && l2(c2.shift()) : n2 ? u2 = [] : h2.disable());
    }, h2 = { add: function() {
      if (u2) {
        var i3 = u2.length;
        !(function t3(n3) {
          re.each(n3, function(n4, i4) {
            var r3 = re.type(i4);
            "function" === r3 ? e2.unique && h2.has(i4) || u2.push(i4) : i4 && i4.length && "string" !== r3 && t3(i4);
          });
        })(arguments), t2 ? r2 = u2.length : n2 && (a2 = i3, l2(n2));
      }
      return this;
    }, remove: function() {
      return u2 && re.each(arguments, function(e3, n3) {
        for (var i3; (i3 = re.inArray(n3, u2, i3)) > -1; ) u2.splice(i3, 1), t2 && (r2 >= i3 && r2--, s2 >= i3 && s2--);
      }), this;
    }, has: function(e3) {
      return e3 ? re.inArray(e3, u2) > -1 : !(!u2 || !u2.length);
    }, empty: function() {
      return u2 = [], r2 = 0, this;
    }, disable: function() {
      return u2 = c2 = n2 = void 0, this;
    }, disabled: function() {
      return !u2;
    }, lock: function() {
      return c2 = void 0, n2 || h2.disable(), this;
    }, locked: function() {
      return !c2;
    }, fireWith: function(e3, n3) {
      return !u2 || i2 && !c2 || (n3 = n3 || [], n3 = [e3, n3.slice ? n3.slice() : n3], t2 ? c2.push(n3) : l2(n3)), this;
    }, fire: function() {
      return h2.fireWith(this, arguments), this;
    }, fired: function() {
      return !!i2;
    } };
    return h2;
  }, re.extend({ Deferred: function(e2) {
    var t2 = [["resolve", "done", re.Callbacks("once memory"), "resolved"], ["reject", "fail", re.Callbacks("once memory"), "rejected"], ["notify", "progress", re.Callbacks("memory")]], n2 = "pending", i2 = { state: function() {
      return n2;
    }, always: function() {
      return r2.done(arguments).fail(arguments), this;
    }, then: function() {
      var e3 = arguments;
      return re.Deferred(function(n3) {
        re.each(t2, function(t3, o2) {
          var s2 = re.isFunction(e3[t3]) && e3[t3];
          r2[o2[1]](function() {
            var e4 = s2 && s2.apply(this, arguments);
            e4 && re.isFunction(e4.promise) ? e4.promise().done(n3.resolve).fail(n3.reject).progress(n3.notify) : n3[o2[0] + "With"](this === i2 ? n3.promise() : this, s2 ? [e4] : arguments);
          });
        }), e3 = null;
      }).promise();
    }, promise: function(e3) {
      return null != e3 ? re.extend(e3, i2) : i2;
    } }, r2 = {};
    return i2.pipe = i2.then, re.each(t2, function(e3, o2) {
      var s2 = o2[2], a2 = o2[3];
      i2[o2[1]] = s2.add, a2 && s2.add(function() {
        n2 = a2;
      }, t2[1 ^ e3][2].disable, t2[2][2].lock), r2[o2[0]] = function() {
        return r2[o2[0] + "With"](this === r2 ? i2 : this, arguments), this;
      }, r2[o2[0] + "With"] = s2.fireWith;
    }), i2.promise(r2), e2 && e2.call(r2, r2), r2;
  }, when: function(e2) {
    var t2, n2, i2, r2 = 0, o2 = V.call(arguments), s2 = o2.length, a2 = 1 !== s2 || e2 && re.isFunction(e2.promise) ? s2 : 0, u2 = 1 === a2 ? e2 : re.Deferred(), c2 = function(e3, n3, i3) {
      return function(r3) {
        n3[e3] = this, i3[e3] = arguments.length > 1 ? V.call(arguments) : r3, i3 === t2 ? u2.notifyWith(n3, i3) : --a2 || u2.resolveWith(n3, i3);
      };
    };
    if (s2 > 1) for (t2 = new Array(s2), n2 = new Array(s2), i2 = new Array(s2); s2 > r2; r2++) o2[r2] && re.isFunction(o2[r2].promise) ? o2[r2].promise().done(c2(r2, i2, o2)).fail(u2.reject).progress(c2(r2, n2, t2)) : --a2;
    return a2 || u2.resolveWith(i2, o2), u2.promise();
  } });
  var be;
  re.fn.ready = function(e2) {
    return re.ready.promise().done(e2), this;
  }, re.extend({ isReady: false, readyWait: 1, holdReady: function(e2) {
    e2 ? re.readyWait++ : re.ready(true);
  }, ready: function(e2) {
    if (true === e2 ? !--re.readyWait : !re.isReady) {
      if (!ge.body) return setTimeout(re.ready);
      re.isReady = true, true !== e2 && --re.readyWait > 0 || (be.resolveWith(ge, [re]), re.fn.triggerHandler && (re(ge).triggerHandler("ready"), re(ge).off("ready")));
    }
  } }), re.ready.promise = function(t2) {
    if (!be) if (be = re.Deferred(), "complete" === ge.readyState) setTimeout(re.ready);
    else if (ge.addEventListener) ge.addEventListener("DOMContentLoaded", a, false), e.addEventListener("load", a, false);
    else {
      ge.attachEvent("onreadystatechange", a), e.attachEvent("onload", a);
      var n2 = false;
      try {
        n2 = null == e.frameElement && ge.documentElement;
      } catch (e2) {
      }
      n2 && n2.doScroll && (function e2() {
        if (!re.isReady) {
          try {
            n2.doScroll("left");
          } catch (t3) {
            return setTimeout(e2, 50);
          }
          s(), re.ready();
        }
      })();
    }
    return be.promise(t2);
  };
  var Se, Ge = "undefined";
  for (Se in re(ne)) break;
  ne.ownLast = "0" !== Se, ne.inlineBlockNeedsLayout = false, re(function() {
    var e2, t2, n2, i2;
    (n2 = ge.getElementsByTagName("body")[0]) && n2.style && (t2 = ge.createElement("div"), i2 = ge.createElement("div"), i2.style.cssText = "position:absolute;border:0;width:0;height:0;top:0;left:-9999px", n2.appendChild(i2).appendChild(t2), typeof t2.style.zoom !== Ge && (t2.style.cssText = "display:inline;margin:0;border:0;padding:1px;width:1px;zoom:1", ne.inlineBlockNeedsLayout = e2 = 3 === t2.offsetWidth, e2 && (n2.style.zoom = 1)), n2.removeChild(i2));
  }), (function() {
    var e2 = ge.createElement("div");
    if (null == ne.deleteExpando) {
      ne.deleteExpando = true;
      try {
        delete e2.test;
      } catch (e3) {
        ne.deleteExpando = false;
      }
    }
    e2 = null;
  })(), re.acceptData = function(e2) {
    var t2 = re.noData[(e2.nodeName + " ").toLowerCase()], n2 = +e2.nodeType || 1;
    return (1 === n2 || 9 === n2) && (!t2 || true !== t2 && e2.getAttribute("classid") === t2);
  };
  var Te = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/, ke = /([A-Z])/g;
  re.extend({ cache: {}, noData: { "applet ": true, "embed ": true, "object ": "clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" }, hasData: function(e2) {
    return !!(e2 = e2.nodeType ? re.cache[e2[re.expando]] : e2[re.expando]) && !c(e2);
  }, data: function(e2, t2, n2) {
    return l(e2, t2, n2);
  }, removeData: function(e2, t2) {
    return h(e2, t2);
  }, _data: function(e2, t2, n2) {
    return l(e2, t2, n2, true);
  }, _removeData: function(e2, t2) {
    return h(e2, t2, true);
  } }), re.fn.extend({ data: function(e2, t2) {
    var n2, i2, r2, o2 = this[0], s2 = o2 && o2.attributes;
    if (void 0 === e2) {
      if (this.length && (r2 = re.data(o2), 1 === o2.nodeType && !re._data(o2, "parsedAttrs"))) {
        for (n2 = s2.length; n2--; ) s2[n2] && (i2 = s2[n2].name, 0 === i2.indexOf("data-") && (i2 = re.camelCase(i2.slice(5)), u(o2, i2, r2[i2])));
        re._data(o2, "parsedAttrs", true);
      }
      return r2;
    }
    return "object" == typeof e2 ? this.each(function() {
      re.data(this, e2);
    }) : arguments.length > 1 ? this.each(function() {
      re.data(this, e2, t2);
    }) : o2 ? u(o2, e2, re.data(o2, e2)) : void 0;
  }, removeData: function(e2) {
    return this.each(function() {
      re.removeData(this, e2);
    });
  } }), re.extend({ queue: function(e2, t2, n2) {
    var i2;
    return e2 ? (t2 = (t2 || "fx") + "queue", i2 = re._data(e2, t2), n2 && (!i2 || re.isArray(n2) ? i2 = re._data(e2, t2, re.makeArray(n2)) : i2.push(n2)), i2 || []) : void 0;
  }, dequeue: function(e2, t2) {
    t2 = t2 || "fx";
    var n2 = re.queue(e2, t2), i2 = n2.length, r2 = n2.shift(), o2 = re._queueHooks(e2, t2), s2 = function() {
      re.dequeue(e2, t2);
    };
    "inprogress" === r2 && (r2 = n2.shift(), i2--), r2 && ("fx" === t2 && n2.unshift("inprogress"), delete o2.stop, r2.call(e2, s2, o2)), !i2 && o2 && o2.empty.fire();
  }, _queueHooks: function(e2, t2) {
    var n2 = t2 + "queueHooks";
    return re._data(e2, n2) || re._data(e2, n2, { empty: re.Callbacks("once memory").add(function() {
      re._removeData(e2, t2 + "queue"), re._removeData(e2, n2);
    }) });
  } }), re.fn.extend({ queue: function(e2, t2) {
    var n2 = 2;
    return "string" != typeof e2 && (t2 = e2, e2 = "fx", n2--), arguments.length < n2 ? re.queue(this[0], e2) : void 0 === t2 ? this : this.each(function() {
      var n3 = re.queue(this, e2, t2);
      re._queueHooks(this, e2), "fx" === e2 && "inprogress" !== n3[0] && re.dequeue(this, e2);
    });
  }, dequeue: function(e2) {
    return this.each(function() {
      re.dequeue(this, e2);
    });
  }, clearQueue: function(e2) {
    return this.queue(e2 || "fx", []);
  }, promise: function(e2, t2) {
    var n2, i2 = 1, r2 = re.Deferred(), o2 = this, s2 = this.length, a2 = function() {
      --i2 || r2.resolveWith(o2, [o2]);
    };
    for ("string" != typeof e2 && (t2 = e2, e2 = void 0), e2 = e2 || "fx"; s2--; ) (n2 = re._data(o2[s2], e2 + "queueHooks")) && n2.empty && (i2++, n2.empty.add(a2));
    return a2(), r2.promise(t2);
  } });
  var Ce = /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source, Me = ["Top", "Right", "Bottom", "Left"], we = function(e2, t2) {
    return e2 = t2 || e2, "none" === re.css(e2, "display") || !re.contains(e2.ownerDocument, e2);
  }, Ee = re.access = function(e2, t2, n2, i2, r2, o2, s2) {
    var a2 = 0, u2 = e2.length, c2 = null == n2;
    if ("object" === re.type(n2)) {
      r2 = true;
      for (a2 in n2) re.access(e2, t2, a2, n2[a2], true, o2, s2);
    } else if (void 0 !== i2 && (r2 = true, re.isFunction(i2) || (s2 = true), c2 && (s2 ? (t2.call(e2, i2), t2 = null) : (c2 = t2, t2 = function(e3, t3, n3) {
      return c2.call(re(e3), n3);
    })), t2)) for (; u2 > a2; a2++) t2(e2[a2], n2, s2 ? i2 : i2.call(e2[a2], a2, t2(e2[a2], n2)));
    return r2 ? e2 : c2 ? t2.call(e2) : u2 ? t2(e2[0], n2) : o2;
  }, Ie = /^(?:checkbox|radio)$/i;
  !(function() {
    var e2 = ge.createElement("input"), t2 = ge.createElement("div"), n2 = ge.createDocumentFragment();
    if (t2.innerHTML = "  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>", ne.leadingWhitespace = 3 === t2.firstChild.nodeType, ne.tbody = !t2.getElementsByTagName("tbody").length, ne.htmlSerialize = !!t2.getElementsByTagName("link").length, ne.html5Clone = "<:nav></:nav>" !== ge.createElement("nav").cloneNode(true).outerHTML, e2.type = "checkbox", e2.checked = true, n2.appendChild(e2), ne.appendChecked = e2.checked, t2.innerHTML = "<textarea>x</textarea>", ne.noCloneChecked = !!t2.cloneNode(true).lastChild.defaultValue, n2.appendChild(t2), t2.innerHTML = "<input type='radio' checked='checked' name='t'/>", ne.checkClone = t2.cloneNode(true).cloneNode(true).lastChild.checked, ne.noCloneEvent = true, t2.attachEvent && (t2.attachEvent("onclick", function() {
      ne.noCloneEvent = false;
    }), t2.cloneNode(true).click()), null == ne.deleteExpando) {
      ne.deleteExpando = true;
      try {
        delete t2.test;
      } catch (e3) {
        ne.deleteExpando = false;
      }
    }
  })(), (function() {
    var t2, n2, i2 = ge.createElement("div");
    for (t2 in { submit: true, change: true, focusin: true }) n2 = "on" + t2, (ne[t2 + "Bubbles"] = n2 in e) || (i2.setAttribute(n2, "t"), ne[t2 + "Bubbles"] = false === i2.attributes[n2].expando);
    i2 = null;
  })();
  var xe = /^(?:input|select|textarea)$/i, Pe = /^key/, Ae = /^(?:mouse|pointer|contextmenu)|click/, Re = /^(?:focusinfocus|focusoutblur)$/, Fe = /^([^.]*)(?:\.(.+)|)$/;
  re.event = { global: {}, add: function(e2, t2, n2, i2, r2) {
    var o2, s2, a2, u2, c2, l2, h2, p2, d2, g2, m2, f2 = re._data(e2);
    if (f2) {
      for (n2.handler && (u2 = n2, n2 = u2.handler, r2 = u2.selector), n2.guid || (n2.guid = re.guid++), (s2 = f2.events) || (s2 = f2.events = {}), (l2 = f2.handle) || (l2 = f2.handle = function(e3) {
        return typeof re === Ge || e3 && re.event.triggered === e3.type ? void 0 : re.event.dispatch.apply(l2.elem, arguments);
      }, l2.elem = e2), t2 = (t2 || "").match(ye) || [""], a2 = t2.length; a2--; ) o2 = Fe.exec(t2[a2]) || [], d2 = m2 = o2[1], g2 = (o2[2] || "").split(".").sort(), d2 && (c2 = re.event.special[d2] || {}, d2 = (r2 ? c2.delegateType : c2.bindType) || d2, c2 = re.event.special[d2] || {}, h2 = re.extend({ type: d2, origType: m2, data: i2, handler: n2, guid: n2.guid, selector: r2, needsContext: r2 && re.expr.match.needsContext.test(r2), namespace: g2.join(".") }, u2), (p2 = s2[d2]) || (p2 = s2[d2] = [], p2.delegateCount = 0, c2.setup && false !== c2.setup.call(e2, i2, g2, l2) || (e2.addEventListener ? e2.addEventListener(d2, l2, false) : e2.attachEvent && e2.attachEvent("on" + d2, l2))), c2.add && (c2.add.call(e2, h2), h2.handler.guid || (h2.handler.guid = n2.guid)), r2 ? p2.splice(p2.delegateCount++, 0, h2) : p2.push(h2), re.event.global[d2] = true);
      e2 = null;
    }
  }, remove: function(e2, t2, n2, i2, r2) {
    var o2, s2, a2, u2, c2, l2, h2, p2, d2, g2, m2, f2 = re.hasData(e2) && re._data(e2);
    if (f2 && (l2 = f2.events)) {
      for (t2 = (t2 || "").match(ye) || [""], c2 = t2.length; c2--; ) if (a2 = Fe.exec(t2[c2]) || [], d2 = m2 = a2[1], g2 = (a2[2] || "").split(".").sort(), d2) {
        for (h2 = re.event.special[d2] || {}, d2 = (i2 ? h2.delegateType : h2.bindType) || d2, p2 = l2[d2] || [], a2 = a2[2] && new RegExp("(^|\\.)" + g2.join("\\.(?:.*\\.|)") + "(\\.|$)"), u2 = o2 = p2.length; o2--; ) s2 = p2[o2], !r2 && m2 !== s2.origType || n2 && n2.guid !== s2.guid || a2 && !a2.test(s2.namespace) || i2 && i2 !== s2.selector && ("**" !== i2 || !s2.selector) || (p2.splice(o2, 1), s2.selector && p2.delegateCount--, h2.remove && h2.remove.call(e2, s2));
        u2 && !p2.length && (h2.teardown && false !== h2.teardown.call(e2, g2, f2.handle) || re.removeEvent(e2, d2, f2.handle), delete l2[d2]);
      } else for (d2 in l2) re.event.remove(e2, d2 + t2[c2], n2, i2, true);
      re.isEmptyObject(l2) && (delete f2.handle, re._removeData(e2, "events"));
    }
  }, trigger: function(t2, n2, i2, r2) {
    var o2, s2, a2, u2, c2, l2, h2, p2 = [i2 || ge], d2 = te.call(t2, "type") ? t2.type : t2, g2 = te.call(t2, "namespace") ? t2.namespace.split(".") : [];
    if (a2 = l2 = i2 = i2 || ge, 3 !== i2.nodeType && 8 !== i2.nodeType && !Re.test(d2 + re.event.triggered) && (d2.indexOf(".") >= 0 && (g2 = d2.split("."), d2 = g2.shift(), g2.sort()), s2 = d2.indexOf(":") < 0 && "on" + d2, t2 = t2[re.expando] ? t2 : new re.Event(d2, "object" == typeof t2 && t2), t2.isTrigger = r2 ? 2 : 3, t2.namespace = g2.join("."), t2.namespace_re = t2.namespace ? new RegExp("(^|\\.)" + g2.join("\\.(?:.*\\.|)") + "(\\.|$)") : null, t2.result = void 0, t2.target || (t2.target = i2), n2 = null == n2 ? [t2] : re.makeArray(n2, [t2]), c2 = re.event.special[d2] || {}, r2 || !c2.trigger || false !== c2.trigger.apply(i2, n2))) {
      if (!r2 && !c2.noBubble && !re.isWindow(i2)) {
        for (u2 = c2.delegateType || d2, Re.test(u2 + d2) || (a2 = a2.parentNode); a2; a2 = a2.parentNode) p2.push(a2), l2 = a2;
        l2 === (i2.ownerDocument || ge) && p2.push(l2.defaultView || l2.parentWindow || e);
      }
      for (h2 = 0; (a2 = p2[h2++]) && !t2.isPropagationStopped(); ) t2.type = h2 > 1 ? u2 : c2.bindType || d2, o2 = (re._data(a2, "events") || {})[t2.type] && re._data(a2, "handle"), o2 && o2.apply(a2, n2), (o2 = s2 && a2[s2]) && o2.apply && re.acceptData(a2) && (t2.result = o2.apply(a2, n2), false === t2.result && t2.preventDefault());
      if (t2.type = d2, !r2 && !t2.isDefaultPrevented() && (!c2._default || false === c2._default.apply(p2.pop(), n2)) && re.acceptData(i2) && s2 && i2[d2] && !re.isWindow(i2)) {
        l2 = i2[s2], l2 && (i2[s2] = null), re.event.triggered = d2;
        try {
          i2[d2]();
        } catch (e2) {
        }
        re.event.triggered = void 0, l2 && (i2[s2] = l2);
      }
      return t2.result;
    }
  }, dispatch: function(e2) {
    e2 = re.event.fix(e2);
    var t2, n2, i2, r2, o2, s2 = [], a2 = V.call(arguments), u2 = (re._data(this, "events") || {})[e2.type] || [], c2 = re.event.special[e2.type] || {};
    if (a2[0] = e2, e2.delegateTarget = this, !c2.preDispatch || false !== c2.preDispatch.call(this, e2)) {
      for (s2 = re.event.handlers.call(this, e2, u2), t2 = 0; (r2 = s2[t2++]) && !e2.isPropagationStopped(); ) for (e2.currentTarget = r2.elem, o2 = 0; (i2 = r2.handlers[o2++]) && !e2.isImmediatePropagationStopped(); ) (!e2.namespace_re || e2.namespace_re.test(i2.namespace)) && (e2.handleObj = i2, e2.data = i2.data, void 0 !== (n2 = ((re.event.special[i2.origType] || {}).handle || i2.handler).apply(r2.elem, a2)) && false === (e2.result = n2) && (e2.preventDefault(), e2.stopPropagation()));
      return c2.postDispatch && c2.postDispatch.call(this, e2), e2.result;
    }
  }, handlers: function(e2, t2) {
    var n2, i2, r2, o2, s2 = [], a2 = t2.delegateCount, u2 = e2.target;
    if (a2 && u2.nodeType && (!e2.button || "click" !== e2.type)) {
      for (; u2 != this; u2 = u2.parentNode || this) if (1 === u2.nodeType && (true !== u2.disabled || "click" !== e2.type)) {
        for (r2 = [], o2 = 0; a2 > o2; o2++) i2 = t2[o2], n2 = i2.selector + " ", void 0 === r2[n2] && (r2[n2] = i2.needsContext ? re(n2, this).index(u2) >= 0 : re.find(n2, this, null, [u2]).length), r2[n2] && r2.push(i2);
        r2.length && s2.push({ elem: u2, handlers: r2 });
      }
    }
    return a2 < t2.length && s2.push({ elem: this, handlers: t2.slice(a2) }), s2;
  }, fix: function(e2) {
    if (e2[re.expando]) return e2;
    var t2, n2, i2, r2 = e2.type, o2 = e2, s2 = this.fixHooks[r2];
    for (s2 || (this.fixHooks[r2] = s2 = Ae.test(r2) ? this.mouseHooks : Pe.test(r2) ? this.keyHooks : {}), i2 = s2.props ? this.props.concat(s2.props) : this.props, e2 = new re.Event(o2), t2 = i2.length; t2--; ) n2 = i2[t2], e2[n2] = o2[n2];
    return e2.target || (e2.target = o2.srcElement || ge), 3 === e2.target.nodeType && (e2.target = e2.target.parentNode), e2.metaKey = !!e2.metaKey, s2.filter ? s2.filter(e2, o2) : e2;
  }, props: "altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "), fixHooks: {}, keyHooks: { props: "char charCode key keyCode".split(" "), filter: function(e2, t2) {
    return null == e2.which && (e2.which = null != t2.charCode ? t2.charCode : t2.keyCode), e2;
  } }, mouseHooks: { props: "button buttons clientX clientY fromElement offsetX offsetY pageX pageY screenX screenY toElement".split(" "), filter: function(e2, t2) {
    var n2, i2, r2, o2 = t2.button, s2 = t2.fromElement;
    return null == e2.pageX && null != t2.clientX && (i2 = e2.target.ownerDocument || ge, r2 = i2.documentElement, n2 = i2.body, e2.pageX = t2.clientX + (r2 && r2.scrollLeft || n2 && n2.scrollLeft || 0) - (r2 && r2.clientLeft || n2 && n2.clientLeft || 0), e2.pageY = t2.clientY + (r2 && r2.scrollTop || n2 && n2.scrollTop || 0) - (r2 && r2.clientTop || n2 && n2.clientTop || 0)), !e2.relatedTarget && s2 && (e2.relatedTarget = s2 === e2.target ? t2.toElement : s2), e2.which || void 0 === o2 || (e2.which = 1 & o2 ? 1 : 2 & o2 ? 3 : 4 & o2 ? 2 : 0), e2;
  } }, special: { load: { noBubble: true }, focus: { trigger: function() {
    if (this !== g() && this.focus) try {
      return this.focus(), false;
    } catch (e2) {
    }
  }, delegateType: "focusin" }, blur: { trigger: function() {
    return this === g() && this.blur ? (this.blur(), false) : void 0;
  }, delegateType: "focusout" }, click: { trigger: function() {
    return re.nodeName(this, "input") && "checkbox" === this.type && this.click ? (this.click(), false) : void 0;
  }, _default: function(e2) {
    return re.nodeName(e2.target, "a");
  } }, beforeunload: { postDispatch: function(e2) {
    void 0 !== e2.result && e2.originalEvent && (e2.originalEvent.returnValue = e2.result);
  } } }, simulate: function(e2, t2, n2, i2) {
    var r2 = re.extend(new re.Event(), n2, { type: e2, isSimulated: true, originalEvent: {} });
    i2 ? re.event.trigger(r2, null, t2) : re.event.dispatch.call(t2, r2), r2.isDefaultPrevented() && n2.preventDefault();
  } }, re.removeEvent = ge.removeEventListener ? function(e2, t2, n2) {
    e2.removeEventListener && e2.removeEventListener(t2, n2, false);
  } : function(e2, t2, n2) {
    var i2 = "on" + t2;
    e2.detachEvent && (typeof e2[i2] === Ge && (e2[i2] = null), e2.detachEvent(i2, n2));
  }, re.Event = function(e2, t2) {
    return this instanceof re.Event ? (e2 && e2.type ? (this.originalEvent = e2, this.type = e2.type, this.isDefaultPrevented = e2.defaultPrevented || void 0 === e2.defaultPrevented && false === e2.returnValue ? p : d) : this.type = e2, t2 && re.extend(this, t2), this.timeStamp = e2 && e2.timeStamp || re.now(), void (this[re.expando] = true)) : new re.Event(e2, t2);
  }, re.Event.prototype = { isDefaultPrevented: d, isPropagationStopped: d, isImmediatePropagationStopped: d, preventDefault: function() {
    var e2 = this.originalEvent;
    this.isDefaultPrevented = p, e2 && (e2.preventDefault ? e2.preventDefault() : e2.returnValue = false);
  }, stopPropagation: function() {
    var e2 = this.originalEvent;
    this.isPropagationStopped = p, e2 && (e2.stopPropagation && e2.stopPropagation(), e2.cancelBubble = true);
  }, stopImmediatePropagation: function() {
    var e2 = this.originalEvent;
    this.isImmediatePropagationStopped = p, e2 && e2.stopImmediatePropagation && e2.stopImmediatePropagation(), this.stopPropagation();
  } }, re.each({ mouseenter: "mouseover", mouseleave: "mouseout", pointerenter: "pointerover", pointerleave: "pointerout" }, function(e2, t2) {
    re.event.special[e2] = { delegateType: t2, bindType: t2, handle: function(e3) {
      var n2, i2 = this, r2 = e3.relatedTarget, o2 = e3.handleObj;
      return (!r2 || r2 !== i2 && !re.contains(i2, r2)) && (e3.type = o2.origType, n2 = o2.handler.apply(this, arguments), e3.type = t2), n2;
    } };
  }), ne.submitBubbles || (re.event.special.submit = { setup: function() {
    return !re.nodeName(this, "form") && void re.event.add(this, "click._submit keypress._submit", function(e2) {
      var t2 = e2.target, n2 = re.nodeName(t2, "input") || re.nodeName(t2, "button") ? t2.form : void 0;
      n2 && !re._data(n2, "submitBubbles") && (re.event.add(n2, "submit._submit", function(e3) {
        e3._submit_bubble = true;
      }), re._data(n2, "submitBubbles", true));
    });
  }, postDispatch: function(e2) {
    e2._submit_bubble && (delete e2._submit_bubble, this.parentNode && !e2.isTrigger && re.event.simulate("submit", this.parentNode, e2, true));
  }, teardown: function() {
    return !re.nodeName(this, "form") && void re.event.remove(this, "._submit");
  } }), ne.changeBubbles || (re.event.special.change = { setup: function() {
    return xe.test(this.nodeName) ? (("checkbox" === this.type || "radio" === this.type) && (re.event.add(this, "propertychange._change", function(e2) {
      "checked" === e2.originalEvent.propertyName && (this._just_changed = true);
    }), re.event.add(this, "click._change", function(e2) {
      this._just_changed && !e2.isTrigger && (this._just_changed = false), re.event.simulate("change", this, e2, true);
    })), false) : void re.event.add(this, "beforeactivate._change", function(e2) {
      var t2 = e2.target;
      xe.test(t2.nodeName) && !re._data(t2, "changeBubbles") && (re.event.add(t2, "change._change", function(e3) {
        !this.parentNode || e3.isSimulated || e3.isTrigger || re.event.simulate("change", this.parentNode, e3, true);
      }), re._data(t2, "changeBubbles", true));
    });
  }, handle: function(e2) {
    var t2 = e2.target;
    return this !== t2 || e2.isSimulated || e2.isTrigger || "radio" !== t2.type && "checkbox" !== t2.type ? e2.handleObj.handler.apply(this, arguments) : void 0;
  }, teardown: function() {
    return re.event.remove(this, "._change"), !xe.test(this.nodeName);
  } }), ne.focusinBubbles || re.each({ focus: "focusin", blur: "focusout" }, function(e2, t2) {
    var n2 = function(e3) {
      re.event.simulate(t2, e3.target, re.event.fix(e3), true);
    };
    re.event.special[t2] = { setup: function() {
      var i2 = this.ownerDocument || this, r2 = re._data(i2, t2);
      r2 || i2.addEventListener(e2, n2, true), re._data(i2, t2, (r2 || 0) + 1);
    }, teardown: function() {
      var i2 = this.ownerDocument || this, r2 = re._data(i2, t2) - 1;
      r2 ? re._data(i2, t2, r2) : (i2.removeEventListener(e2, n2, true), re._removeData(i2, t2));
    } };
  }), re.fn.extend({ on: function(e2, t2, n2, i2, r2) {
    var o2, s2;
    if ("object" == typeof e2) {
      "string" != typeof t2 && (n2 = n2 || t2, t2 = void 0);
      for (o2 in e2) this.on(o2, t2, n2, e2[o2], r2);
      return this;
    }
    if (null == n2 && null == i2 ? (i2 = t2, n2 = t2 = void 0) : null == i2 && ("string" == typeof t2 ? (i2 = n2, n2 = void 0) : (i2 = n2, n2 = t2, t2 = void 0)), false === i2) i2 = d;
    else if (!i2) return this;
    return 1 === r2 && (s2 = i2, i2 = function(e3) {
      return re().off(e3), s2.apply(this, arguments);
    }, i2.guid = s2.guid || (s2.guid = re.guid++)), this.each(function() {
      re.event.add(this, e2, i2, n2, t2);
    });
  }, one: function(e2, t2, n2, i2) {
    return this.on(e2, t2, n2, i2, 1);
  }, off: function(e2, t2, n2) {
    var i2, r2;
    if (e2 && e2.preventDefault && e2.handleObj) return i2 = e2.handleObj, re(e2.delegateTarget).off(i2.namespace ? i2.origType + "." + i2.namespace : i2.origType, i2.selector, i2.handler), this;
    if ("object" == typeof e2) {
      for (r2 in e2) this.off(r2, t2, e2[r2]);
      return this;
    }
    return (false === t2 || "function" == typeof t2) && (n2 = t2, t2 = void 0), false === n2 && (n2 = d), this.each(function() {
      re.event.remove(this, e2, n2, t2);
    });
  }, trigger: function(e2, t2) {
    return this.each(function() {
      re.event.trigger(e2, t2, this);
    });
  }, triggerHandler: function(e2, t2) {
    var n2 = this[0];
    return n2 ? re.event.trigger(e2, t2, n2, true) : void 0;
  } });
  var _e = "abbr|article|aside|audio|bdi|canvas|data|datalist|details|figcaption|figure|footer|header|hgroup|mark|meter|nav|output|progress|section|summary|time|video", Be = / jQuery\d+="(?:null|\d+)"/g, Ne = new RegExp("<(?:" + _e + ")[\\s/>]", "i"), Ue = /^\s+/, Oe = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi, De = /<([\w:]+)/, Le = /<tbody/i, qe = /<|&#?\w+;/, He = /<(?:script|style|link)/i, Ye = /checked\s*(?:[^=]|=\s*.checked.)/i, ze = /^$|\/(?:java|ecma)script/i, We = /^true\/(.*)/, je = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g, $e = { option: [1, "<select multiple='multiple'>", "</select>"], legend: [1, "<fieldset>", "</fieldset>"], area: [1, "<map>", "</map>"], param: [1, "<object>", "</object>"], thead: [1, "<table>", "</table>"], tr: [2, "<table><tbody>", "</tbody></table>"], col: [2, "<table><tbody></tbody><colgroup>", "</colgroup></table>"], td: [3, "<table><tbody><tr>", "</tr></tbody></table>"], _default: ne.htmlSerialize ? [0, "", ""] : [1, "X<div>", "</div>"] }, Ve = m(ge), Ke = Ve.appendChild(ge.createElement("div"));
  $e.optgroup = $e.option, $e.tbody = $e.tfoot = $e.colgroup = $e.caption = $e.thead, $e.th = $e.td, re.extend({ clone: function(e2, t2, n2) {
    var i2, r2, o2, s2, a2, u2 = re.contains(e2.ownerDocument, e2);
    if (ne.html5Clone || re.isXMLDoc(e2) || !Ne.test("<" + e2.nodeName + ">") ? o2 = e2.cloneNode(true) : (Ke.innerHTML = e2.outerHTML, Ke.removeChild(o2 = Ke.firstChild)), !(ne.noCloneEvent && ne.noCloneChecked || 1 !== e2.nodeType && 11 !== e2.nodeType || re.isXMLDoc(e2))) for (i2 = f(o2), a2 = f(e2), s2 = 0; null != (r2 = a2[s2]); ++s2) i2[s2] && T(r2, i2[s2]);
    if (t2) if (n2) for (a2 = a2 || f(e2), i2 = i2 || f(o2), s2 = 0; null != (r2 = a2[s2]); s2++) G(r2, i2[s2]);
    else G(e2, o2);
    return i2 = f(o2, "script"), i2.length > 0 && S(i2, !u2 && f(e2, "script")), i2 = a2 = r2 = null, o2;
  }, buildFragment: function(e2, t2, n2, i2) {
    for (var r2, o2, s2, a2, u2, c2, l2, h2 = e2.length, p2 = m(t2), d2 = [], g2 = 0; h2 > g2; g2++) if ((o2 = e2[g2]) || 0 === o2) if ("object" === re.type(o2)) re.merge(d2, o2.nodeType ? [o2] : o2);
    else if (qe.test(o2)) {
      for (a2 = a2 || p2.appendChild(t2.createElement("div")), u2 = (De.exec(o2) || ["", ""])[1].toLowerCase(), l2 = $e[u2] || $e._default, a2.innerHTML = l2[1] + o2.replace(Oe, "<$1></$2>") + l2[2], r2 = l2[0]; r2--; ) a2 = a2.lastChild;
      if (!ne.leadingWhitespace && Ue.test(o2) && d2.push(t2.createTextNode(Ue.exec(o2)[0])), !ne.tbody) for (o2 = "table" !== u2 || Le.test(o2) ? "<table>" !== l2[1] || Le.test(o2) ? 0 : a2 : a2.firstChild, r2 = o2 && o2.childNodes.length; r2--; ) re.nodeName(c2 = o2.childNodes[r2], "tbody") && !c2.childNodes.length && o2.removeChild(c2);
      for (re.merge(d2, a2.childNodes), a2.textContent = ""; a2.firstChild; ) a2.removeChild(a2.firstChild);
      a2 = p2.lastChild;
    } else d2.push(t2.createTextNode(o2));
    for (a2 && p2.removeChild(a2), ne.appendChecked || re.grep(f(d2, "input"), X), g2 = 0; o2 = d2[g2++]; ) if ((!i2 || -1 === re.inArray(o2, i2)) && (s2 = re.contains(o2.ownerDocument, o2), a2 = f(p2.appendChild(o2), "script"), s2 && S(a2), n2)) for (r2 = 0; o2 = a2[r2++]; ) ze.test(o2.type || "") && n2.push(o2);
    return a2 = null, p2;
  }, cleanData: function(e2, t2) {
    for (var n2, i2, r2, o2, s2 = 0, a2 = re.expando, u2 = re.cache, c2 = ne.deleteExpando, l2 = re.event.special; null != (n2 = e2[s2]); s2++) if ((t2 || re.acceptData(n2)) && (r2 = n2[a2], o2 = r2 && u2[r2])) {
      if (o2.events) for (i2 in o2.events) l2[i2] ? re.event.remove(n2, i2) : re.removeEvent(n2, i2, o2.handle);
      u2[r2] && (delete u2[r2], c2 ? delete n2[a2] : typeof n2.removeAttribute !== Ge ? n2.removeAttribute(a2) : n2[a2] = null, $.push(r2));
    }
  } }), re.fn.extend({ text: function(e2) {
    return Ee(this, function(e3) {
      return void 0 === e3 ? re.text(this) : this.empty().append((this[0] && this[0].ownerDocument || ge).createTextNode(e3));
    }, null, e2, arguments.length);
  }, append: function() {
    return this.domManip(arguments, function(e2) {
      if (1 === this.nodeType || 11 === this.nodeType || 9 === this.nodeType) {
        y(this, e2).appendChild(e2);
      }
    });
  }, prepend: function() {
    return this.domManip(arguments, function(e2) {
      if (1 === this.nodeType || 11 === this.nodeType || 9 === this.nodeType) {
        var t2 = y(this, e2);
        t2.insertBefore(e2, t2.firstChild);
      }
    });
  }, before: function() {
    return this.domManip(arguments, function(e2) {
      this.parentNode && this.parentNode.insertBefore(e2, this);
    });
  }, after: function() {
    return this.domManip(arguments, function(e2) {
      this.parentNode && this.parentNode.insertBefore(e2, this.nextSibling);
    });
  }, remove: function(e2, t2) {
    for (var n2, i2 = e2 ? re.filter(e2, this) : this, r2 = 0; null != (n2 = i2[r2]); r2++) t2 || 1 !== n2.nodeType || re.cleanData(f(n2)), n2.parentNode && (t2 && re.contains(n2.ownerDocument, n2) && S(f(n2, "script")), n2.parentNode.removeChild(n2));
    return this;
  }, empty: function() {
    for (var e2, t2 = 0; null != (e2 = this[t2]); t2++) {
      for (1 === e2.nodeType && re.cleanData(f(e2, false)); e2.firstChild; ) e2.removeChild(e2.firstChild);
      e2.options && re.nodeName(e2, "select") && (e2.options.length = 0);
    }
    return this;
  }, clone: function(e2, t2) {
    return e2 = null != e2 && e2, t2 = null == t2 ? e2 : t2, this.map(function() {
      return re.clone(this, e2, t2);
    });
  }, html: function(e2) {
    return Ee(this, function(e3) {
      var t2 = this[0] || {}, n2 = 0, i2 = this.length;
      if (void 0 === e3) return 1 === t2.nodeType ? t2.innerHTML.replace(Be, "") : void 0;
      if (!("string" != typeof e3 || He.test(e3) || !ne.htmlSerialize && Ne.test(e3) || !ne.leadingWhitespace && Ue.test(e3) || $e[(De.exec(e3) || ["", ""])[1].toLowerCase()])) {
        e3 = e3.replace(Oe, "<$1></$2>");
        try {
          for (; i2 > n2; n2++) t2 = this[n2] || {}, 1 === t2.nodeType && (re.cleanData(f(t2, false)), t2.innerHTML = e3);
          t2 = 0;
        } catch (e4) {
        }
      }
      t2 && this.empty().append(e3);
    }, null, e2, arguments.length);
  }, replaceWith: function() {
    var e2 = arguments[0];
    return this.domManip(arguments, function(t2) {
      e2 = this.parentNode, re.cleanData(f(this)), e2 && e2.replaceChild(t2, this);
    }), e2 && (e2.length || e2.nodeType) ? this : this.remove();
  }, detach: function(e2) {
    return this.remove(e2, true);
  }, domManip: function(e2, t2) {
    e2 = K.apply([], e2);
    var n2, i2, r2, o2, s2, a2, u2 = 0, c2 = this.length, l2 = this, h2 = c2 - 1, p2 = e2[0], d2 = re.isFunction(p2);
    if (d2 || c2 > 1 && "string" == typeof p2 && !ne.checkClone && Ye.test(p2)) return this.each(function(n3) {
      var i3 = l2.eq(n3);
      d2 && (e2[0] = p2.call(this, n3, i3.html())), i3.domManip(e2, t2);
    });
    if (c2 && (a2 = re.buildFragment(e2, this[0].ownerDocument, false, this), n2 = a2.firstChild, 1 === a2.childNodes.length && (a2 = n2), n2)) {
      for (o2 = re.map(f(a2, "script"), v), r2 = o2.length; c2 > u2; u2++) i2 = a2, u2 !== h2 && (i2 = re.clone(i2, true, true), r2 && re.merge(o2, f(i2, "script"))), t2.call(this[u2], i2, u2);
      if (r2) for (s2 = o2[o2.length - 1].ownerDocument, re.map(o2, b), u2 = 0; r2 > u2; u2++) i2 = o2[u2], ze.test(i2.type || "") && !re._data(i2, "globalEval") && re.contains(s2, i2) && (i2.src ? re._evalUrl && re._evalUrl(i2.src) : re.globalEval((i2.text || i2.textContent || i2.innerHTML || "").replace(je, "")));
      a2 = n2 = null;
    }
    return this;
  } }), re.each({ appendTo: "append", prependTo: "prepend", insertBefore: "before", insertAfter: "after", replaceAll: "replaceWith" }, function(e2, t2) {
    re.fn[e2] = function(e3) {
      for (var n2, i2 = 0, r2 = [], o2 = re(e3), s2 = o2.length - 1; s2 >= i2; i2++) n2 = i2 === s2 ? this : this.clone(true), re(o2[i2])[t2](n2), Q.apply(r2, n2.get());
      return this.pushStack(r2);
    };
  });
  var Qe, Ze = {};
  !(function() {
    var e2;
    ne.shrinkWrapBlocks = function() {
      if (null != e2) return e2;
      e2 = false;
      var t2, n2, i2;
      return n2 = ge.getElementsByTagName("body")[0], n2 && n2.style ? (t2 = ge.createElement("div"), i2 = ge.createElement("div"), i2.style.cssText = "position:absolute;border:0;width:0;height:0;top:0;left:-9999px", n2.appendChild(i2).appendChild(t2), typeof t2.style.zoom !== Ge && (t2.style.cssText = "-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box;display:block;margin:0;border:0;padding:1px;width:1px;zoom:1", t2.appendChild(ge.createElement("div")).style.width = "5px", e2 = 3 !== t2.offsetWidth), n2.removeChild(i2), e2) : void 0;
    };
  })();
  var Je, et, tt = /^margin/, nt = new RegExp("^(" + Ce + ")(?!px)[a-z%]+$", "i"), it = /^(top|right|bottom|left)$/;
  e.getComputedStyle ? (Je = function(t2) {
    return t2.ownerDocument.defaultView.opener ? t2.ownerDocument.defaultView.getComputedStyle(t2, null) : e.getComputedStyle(t2, null);
  }, et = function(e2, t2, n2) {
    var i2, r2, o2, s2, a2 = e2.style;
    return n2 = n2 || Je(e2), s2 = n2 ? n2.getPropertyValue(t2) || n2[t2] : void 0, n2 && ("" !== s2 || re.contains(e2.ownerDocument, e2) || (s2 = re.style(e2, t2)), nt.test(s2) && tt.test(t2) && (i2 = a2.width, r2 = a2.minWidth, o2 = a2.maxWidth, a2.minWidth = a2.maxWidth = a2.width = s2, s2 = n2.width, a2.width = i2, a2.minWidth = r2, a2.maxWidth = o2)), void 0 === s2 ? s2 : s2 + "";
  }) : ge.documentElement.currentStyle && (Je = function(e2) {
    return e2.currentStyle;
  }, et = function(e2, t2, n2) {
    var i2, r2, o2, s2, a2 = e2.style;
    return n2 = n2 || Je(e2), s2 = n2 ? n2[t2] : void 0, null == s2 && a2 && a2[t2] && (s2 = a2[t2]), nt.test(s2) && !it.test(t2) && (i2 = a2.left, r2 = e2.runtimeStyle, o2 = r2 && r2.left, o2 && (r2.left = e2.currentStyle.left), a2.left = "fontSize" === t2 ? "1em" : s2, s2 = a2.pixelLeft + "px", a2.left = i2, o2 && (r2.left = o2)), void 0 === s2 ? s2 : s2 + "" || "auto";
  }), !(function() {
    function t2() {
      var t3, n3, i3, r3;
      (n3 = ge.getElementsByTagName("body")[0]) && n3.style && (t3 = ge.createElement("div"), i3 = ge.createElement("div"), i3.style.cssText = "position:absolute;border:0;width:0;height:0;top:0;left:-9999px", n3.appendChild(i3).appendChild(t3), t3.style.cssText = "-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;display:block;margin-top:1%;top:1%;border:1px;padding:1px;width:4px;position:absolute", o2 = s2 = false, u2 = true, e.getComputedStyle && (o2 = "1%" !== (e.getComputedStyle(t3, null) || {}).top, s2 = "4px" === (e.getComputedStyle(t3, null) || { width: "4px" }).width, r3 = t3.appendChild(ge.createElement("div")), r3.style.cssText = t3.style.cssText = "-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box;display:block;margin:0;border:0;padding:0", r3.style.marginRight = r3.style.width = "0", t3.style.width = "1px", u2 = !parseFloat((e.getComputedStyle(r3, null) || {}).marginRight), t3.removeChild(r3)), t3.innerHTML = "<table><tr><td></td><td>t</td></tr></table>", r3 = t3.getElementsByTagName("td"), r3[0].style.cssText = "margin:0;border:0;padding:0;display:none", a2 = 0 === r3[0].offsetHeight, a2 && (r3[0].style.display = "", r3[1].style.display = "none", a2 = 0 === r3[0].offsetHeight), n3.removeChild(i3));
    }
    var n2, i2, r2, o2, s2, a2, u2;
    n2 = ge.createElement("div"), n2.innerHTML = "  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>", r2 = n2.getElementsByTagName("a")[0], (i2 = r2 && r2.style) && (i2.cssText = "float:left;opacity:.5", ne.opacity = "0.5" === i2.opacity, ne.cssFloat = !!i2.cssFloat, n2.style.backgroundClip = "content-box", n2.cloneNode(true).style.backgroundClip = "", ne.clearCloneStyle = "content-box" === n2.style.backgroundClip, ne.boxSizing = "" === i2.boxSizing || "" === i2.MozBoxSizing || "" === i2.WebkitBoxSizing, re.extend(ne, { reliableHiddenOffsets: function() {
      return null == a2 && t2(), a2;
    }, boxSizingReliable: function() {
      return null == s2 && t2(), s2;
    }, pixelPosition: function() {
      return null == o2 && t2(), o2;
    }, reliableMarginRight: function() {
      return null == u2 && t2(), u2;
    } }));
  })(), re.swap = function(e2, t2, n2, i2) {
    var r2, o2, s2 = {};
    for (o2 in t2) s2[o2] = e2.style[o2], e2.style[o2] = t2[o2];
    r2 = n2.apply(e2, i2 || []);
    for (o2 in t2) e2.style[o2] = s2[o2];
    return r2;
  };
  var rt = /alpha\([^)]*\)/i, ot = /opacity\s*=\s*([^)]*)/, st = /^(none|table(?!-c[ea]).+)/, at = new RegExp("^(" + Ce + ")(.*)$", "i"), ut = new RegExp("^([+-])=(" + Ce + ")", "i"), ct = { position: "absolute", visibility: "hidden", display: "block" }, lt = { letterSpacing: "0", fontWeight: "400" }, ht = ["Webkit", "O", "Moz", "ms"];
  re.extend({ cssHooks: { opacity: { get: function(e2, t2) {
    if (t2) {
      var n2 = et(e2, "opacity");
      return "" === n2 ? "1" : n2;
    }
  } } }, cssNumber: { columnCount: true, fillOpacity: true, flexGrow: true, flexShrink: true, fontWeight: true, lineHeight: true, opacity: true, order: true, orphans: true, widows: true, zIndex: true, zoom: true }, cssProps: { float: ne.cssFloat ? "cssFloat" : "styleFloat" }, style: function(e2, t2, n2, i2) {
    if (e2 && 3 !== e2.nodeType && 8 !== e2.nodeType && e2.style) {
      var r2, o2, s2, a2 = re.camelCase(t2), u2 = e2.style;
      if (t2 = re.cssProps[a2] || (re.cssProps[a2] = w(u2, a2)), s2 = re.cssHooks[t2] || re.cssHooks[a2], void 0 === n2) return s2 && "get" in s2 && void 0 !== (r2 = s2.get(e2, false, i2)) ? r2 : u2[t2];
      if (o2 = typeof n2, "string" === o2 && (r2 = ut.exec(n2)) && (n2 = (r2[1] + 1) * r2[2] + parseFloat(re.css(e2, t2)), o2 = "number"), null != n2 && n2 === n2 && ("number" !== o2 || re.cssNumber[a2] || (n2 += "px"), ne.clearCloneStyle || "" !== n2 || 0 !== t2.indexOf("background") || (u2[t2] = "inherit"), !(s2 && "set" in s2 && void 0 === (n2 = s2.set(e2, n2, i2))))) try {
        u2[t2] = n2;
      } catch (e3) {
      }
    }
  }, css: function(e2, t2, n2, i2) {
    var r2, o2, s2, a2 = re.camelCase(t2);
    return t2 = re.cssProps[a2] || (re.cssProps[a2] = w(e2.style, a2)), s2 = re.cssHooks[t2] || re.cssHooks[a2], s2 && "get" in s2 && (o2 = s2.get(e2, true, n2)), void 0 === o2 && (o2 = et(e2, t2, i2)), "normal" === o2 && t2 in lt && (o2 = lt[t2]), "" === n2 || n2 ? (r2 = parseFloat(o2), true === n2 || re.isNumeric(r2) ? r2 || 0 : o2) : o2;
  } }), re.each(["height", "width"], function(e2, t2) {
    re.cssHooks[t2] = { get: function(e3, n2, i2) {
      return n2 ? st.test(re.css(e3, "display")) && 0 === e3.offsetWidth ? re.swap(e3, ct, function() {
        return P(e3, t2, i2);
      }) : P(e3, t2, i2) : void 0;
    }, set: function(e3, n2, i2) {
      var r2 = i2 && Je(e3);
      return I(e3, n2, i2 ? x(e3, t2, i2, ne.boxSizing && "border-box" === re.css(e3, "boxSizing", false, r2), r2) : 0);
    } };
  }), ne.opacity || (re.cssHooks.opacity = { get: function(e2, t2) {
    return ot.test((t2 && e2.currentStyle ? e2.currentStyle.filter : e2.style.filter) || "") ? 0.01 * parseFloat(RegExp.$1) + "" : t2 ? "1" : "";
  }, set: function(e2, t2) {
    var n2 = e2.style, i2 = e2.currentStyle, r2 = re.isNumeric(t2) ? "alpha(opacity=" + 100 * t2 + ")" : "", o2 = i2 && i2.filter || n2.filter || "";
    n2.zoom = 1, (t2 >= 1 || "" === t2) && "" === re.trim(o2.replace(rt, "")) && n2.removeAttribute && (n2.removeAttribute("filter"), "" === t2 || i2 && !i2.filter) || (n2.filter = rt.test(o2) ? o2.replace(rt, r2) : o2 + " " + r2);
  } }), re.cssHooks.marginRight = M(ne.reliableMarginRight, function(e2, t2) {
    return t2 ? re.swap(e2, { display: "inline-block" }, et, [e2, "marginRight"]) : void 0;
  }), re.each({ margin: "", padding: "", border: "Width" }, function(e2, t2) {
    re.cssHooks[e2 + t2] = { expand: function(n2) {
      for (var i2 = 0, r2 = {}, o2 = "string" == typeof n2 ? n2.split(" ") : [n2]; 4 > i2; i2++) r2[e2 + Me[i2] + t2] = o2[i2] || o2[i2 - 2] || o2[0];
      return r2;
    } }, tt.test(e2) || (re.cssHooks[e2 + t2].set = I);
  }), re.fn.extend({ css: function(e2, t2) {
    return Ee(this, function(e3, t3, n2) {
      var i2, r2, o2 = {}, s2 = 0;
      if (re.isArray(t3)) {
        for (i2 = Je(e3), r2 = t3.length; r2 > s2; s2++) o2[t3[s2]] = re.css(e3, t3[s2], false, i2);
        return o2;
      }
      return void 0 !== n2 ? re.style(e3, t3, n2) : re.css(e3, t3);
    }, e2, t2, arguments.length > 1);
  }, show: function() {
    return E(this, true);
  }, hide: function() {
    return E(this);
  }, toggle: function(e2) {
    return "boolean" == typeof e2 ? e2 ? this.show() : this.hide() : this.each(function() {
      we(this) ? re(this).show() : re(this).hide();
    });
  } }), re.Tween = A, A.prototype = { constructor: A, init: function(e2, t2, n2, i2, r2, o2) {
    this.elem = e2, this.prop = n2, this.easing = r2 || "swing", this.options = t2, this.start = this.now = this.cur(), this.end = i2, this.unit = o2 || (re.cssNumber[n2] ? "" : "px");
  }, cur: function() {
    var e2 = A.propHooks[this.prop];
    return e2 && e2.get ? e2.get(this) : A.propHooks._default.get(this);
  }, run: function(e2) {
    var t2, n2 = A.propHooks[this.prop];
    return this.options.duration ? this.pos = t2 = re.easing[this.easing](e2, this.options.duration * e2, 0, 1, this.options.duration) : this.pos = t2 = e2, this.now = (this.end - this.start) * t2 + this.start, this.options.step && this.options.step.call(this.elem, this.now, this), n2 && n2.set ? n2.set(this) : A.propHooks._default.set(this), this;
  } }, A.prototype.init.prototype = A.prototype, A.propHooks = { _default: { get: function(e2) {
    var t2;
    return null == e2.elem[e2.prop] || e2.elem.style && null != e2.elem.style[e2.prop] ? (t2 = re.css(e2.elem, e2.prop, ""), t2 && "auto" !== t2 ? t2 : 0) : e2.elem[e2.prop];
  }, set: function(e2) {
    re.fx.step[e2.prop] ? re.fx.step[e2.prop](e2) : e2.elem.style && (null != e2.elem.style[re.cssProps[e2.prop]] || re.cssHooks[e2.prop]) ? re.style(e2.elem, e2.prop, e2.now + e2.unit) : e2.elem[e2.prop] = e2.now;
  } } }, A.propHooks.scrollTop = A.propHooks.scrollLeft = { set: function(e2) {
    e2.elem.nodeType && e2.elem.parentNode && (e2.elem[e2.prop] = e2.now);
  } }, re.easing = { linear: function(e2) {
    return e2;
  }, swing: function(e2) {
    return 0.5 - Math.cos(e2 * Math.PI) / 2;
  } }, re.fx = A.prototype.init, re.fx.step = {};
  var pt, dt, gt = /^(?:toggle|show|hide)$/, mt = new RegExp("^(?:([+-])=|)(" + Ce + ")([a-z%]*)$", "i"), ft = /queueHooks$/, Xt = [B], yt = { "*": [function(e2, t2) {
    var n2 = this.createTween(e2, t2), i2 = n2.cur(), r2 = mt.exec(t2), o2 = r2 && r2[3] || (re.cssNumber[e2] ? "" : "px"), s2 = (re.cssNumber[e2] || "px" !== o2 && +i2) && mt.exec(re.css(n2.elem, e2)), a2 = 1, u2 = 20;
    if (s2 && s2[3] !== o2) {
      o2 = o2 || s2[3], r2 = r2 || [], s2 = +i2 || 1;
      do {
        a2 = a2 || ".5", s2 /= a2, re.style(n2.elem, e2, s2 + o2);
      } while (a2 !== (a2 = n2.cur() / i2) && 1 !== a2 && --u2);
    }
    return r2 && (s2 = n2.start = +s2 || +i2 || 0, n2.unit = o2, n2.end = r2[1] ? s2 + (r2[1] + 1) * r2[2] : +r2[2]), n2;
  }] };
  re.Animation = re.extend(U, { tweener: function(e2, t2) {
    re.isFunction(e2) ? (t2 = e2, e2 = ["*"]) : e2 = e2.split(" ");
    for (var n2, i2 = 0, r2 = e2.length; r2 > i2; i2++) n2 = e2[i2], yt[n2] = yt[n2] || [], yt[n2].unshift(t2);
  }, prefilter: function(e2, t2) {
    t2 ? Xt.unshift(e2) : Xt.push(e2);
  } }), re.speed = function(e2, t2, n2) {
    var i2 = e2 && "object" == typeof e2 ? re.extend({}, e2) : { complete: n2 || !n2 && t2 || re.isFunction(e2) && e2, duration: e2, easing: n2 && t2 || t2 && !re.isFunction(t2) && t2 };
    return i2.duration = re.fx.off ? 0 : "number" == typeof i2.duration ? i2.duration : i2.duration in re.fx.speeds ? re.fx.speeds[i2.duration] : re.fx.speeds._default, (null == i2.queue || true === i2.queue) && (i2.queue = "fx"), i2.old = i2.complete, i2.complete = function() {
      re.isFunction(i2.old) && i2.old.call(this), i2.queue && re.dequeue(this, i2.queue);
    }, i2;
  }, re.fn.extend({ fadeTo: function(e2, t2, n2, i2) {
    return this.filter(we).css("opacity", 0).show().end().animate({ opacity: t2 }, e2, n2, i2);
  }, animate: function(e2, t2, n2, i2) {
    var r2 = re.isEmptyObject(e2), o2 = re.speed(t2, n2, i2), s2 = function() {
      var t3 = U(this, re.extend({}, e2), o2);
      (r2 || re._data(this, "finish")) && t3.stop(true);
    };
    return s2.finish = s2, r2 || false === o2.queue ? this.each(s2) : this.queue(o2.queue, s2);
  }, stop: function(e2, t2, n2) {
    var i2 = function(e3) {
      var t3 = e3.stop;
      delete e3.stop, t3(n2);
    };
    return "string" != typeof e2 && (n2 = t2, t2 = e2, e2 = void 0), t2 && false !== e2 && this.queue(e2 || "fx", []), this.each(function() {
      var t3 = true, r2 = null != e2 && e2 + "queueHooks", o2 = re.timers, s2 = re._data(this);
      if (r2) s2[r2] && s2[r2].stop && i2(s2[r2]);
      else for (r2 in s2) s2[r2] && s2[r2].stop && ft.test(r2) && i2(s2[r2]);
      for (r2 = o2.length; r2--; ) o2[r2].elem !== this || null != e2 && o2[r2].queue !== e2 || (o2[r2].anim.stop(n2), t3 = false, o2.splice(r2, 1));
      (t3 || !n2) && re.dequeue(this, e2);
    });
  }, finish: function(e2) {
    return false !== e2 && (e2 = e2 || "fx"), this.each(function() {
      var t2, n2 = re._data(this), i2 = n2[e2 + "queue"], r2 = n2[e2 + "queueHooks"], o2 = re.timers, s2 = i2 ? i2.length : 0;
      for (n2.finish = true, re.queue(this, e2, []), r2 && r2.stop && r2.stop.call(this, true), t2 = o2.length; t2--; ) o2[t2].elem === this && o2[t2].queue === e2 && (o2[t2].anim.stop(true), o2.splice(t2, 1));
      for (t2 = 0; s2 > t2; t2++) i2[t2] && i2[t2].finish && i2[t2].finish.call(this);
      delete n2.finish;
    });
  } }), re.each(["toggle", "show", "hide"], function(e2, t2) {
    var n2 = re.fn[t2];
    re.fn[t2] = function(e3, i2, r2) {
      return null == e3 || "boolean" == typeof e3 ? n2.apply(this, arguments) : this.animate(F(t2, true), e3, i2, r2);
    };
  }), re.each({ slideDown: F("show"), slideUp: F("hide"), slideToggle: F("toggle"), fadeIn: { opacity: "show" }, fadeOut: { opacity: "hide" }, fadeToggle: { opacity: "toggle" } }, function(e2, t2) {
    re.fn[e2] = function(e3, n2, i2) {
      return this.animate(t2, e3, n2, i2);
    };
  }), re.timers = [], re.fx.tick = function() {
    var e2, t2 = re.timers, n2 = 0;
    for (pt = re.now(); n2 < t2.length; n2++) (e2 = t2[n2])() || t2[n2] !== e2 || t2.splice(n2--, 1);
    t2.length || re.fx.stop(), pt = void 0;
  }, re.fx.timer = function(e2) {
    re.timers.push(e2), e2() ? re.fx.start() : re.timers.pop();
  }, re.fx.interval = 13, re.fx.start = function() {
    dt || (dt = setInterval(re.fx.tick, re.fx.interval));
  }, re.fx.stop = function() {
    clearInterval(dt), dt = null;
  }, re.fx.speeds = { slow: 600, fast: 200, _default: 400 }, re.fn.delay = function(e2, t2) {
    return e2 = re.fx ? re.fx.speeds[e2] || e2 : e2, t2 = t2 || "fx", this.queue(t2, function(t3, n2) {
      var i2 = setTimeout(t3, e2);
      n2.stop = function() {
        clearTimeout(i2);
      };
    });
  }, (function() {
    var e2, t2, n2, i2, r2;
    t2 = ge.createElement("div"), t2.setAttribute("className", "t"), t2.innerHTML = "  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>", i2 = t2.getElementsByTagName("a")[0], n2 = ge.createElement("select"), r2 = n2.appendChild(ge.createElement("option")), e2 = t2.getElementsByTagName("input")[0], i2.style.cssText = "top:1px", ne.getSetAttribute = "t" !== t2.className, ne.style = /top/.test(i2.getAttribute("style")), ne.hrefNormalized = "/a" === i2.getAttribute("href"), ne.checkOn = !!e2.value, ne.optSelected = r2.selected, ne.enctype = !!ge.createElement("form").enctype, n2.disabled = true, ne.optDisabled = !r2.disabled, e2 = ge.createElement("input"), e2.setAttribute("value", ""), ne.input = "" === e2.getAttribute("value"), e2.value = "t", e2.setAttribute("type", "radio"), ne.radioValue = "t" === e2.value;
  })();
  var vt = /\r/g;
  re.fn.extend({ val: function(e2) {
    var t2, n2, i2, r2 = this[0];
    return arguments.length ? (i2 = re.isFunction(e2), this.each(function(n3) {
      var r3;
      1 === this.nodeType && (r3 = i2 ? e2.call(this, n3, re(this).val()) : e2, null == r3 ? r3 = "" : "number" == typeof r3 ? r3 += "" : re.isArray(r3) && (r3 = re.map(r3, function(e3) {
        return null == e3 ? "" : e3 + "";
      })), (t2 = re.valHooks[this.type] || re.valHooks[this.nodeName.toLowerCase()]) && "set" in t2 && void 0 !== t2.set(this, r3, "value") || (this.value = r3));
    })) : r2 ? (t2 = re.valHooks[r2.type] || re.valHooks[r2.nodeName.toLowerCase()], t2 && "get" in t2 && void 0 !== (n2 = t2.get(r2, "value")) ? n2 : (n2 = r2.value, "string" == typeof n2 ? n2.replace(vt, "") : null == n2 ? "" : n2)) : void 0;
  } }), re.extend({ valHooks: { option: { get: function(e2) {
    var t2 = re.find.attr(e2, "value");
    return null != t2 ? t2 : re.trim(re.text(e2));
  } }, select: { get: function(e2) {
    for (var t2, n2, i2 = e2.options, r2 = e2.selectedIndex, o2 = "select-one" === e2.type || 0 > r2, s2 = o2 ? null : [], a2 = o2 ? r2 + 1 : i2.length, u2 = 0 > r2 ? a2 : o2 ? r2 : 0; a2 > u2; u2++) if (n2 = i2[u2], !(!n2.selected && u2 !== r2 || (ne.optDisabled ? n2.disabled : null !== n2.getAttribute("disabled")) || n2.parentNode.disabled && re.nodeName(n2.parentNode, "optgroup"))) {
      if (t2 = re(n2).val(), o2) return t2;
      s2.push(t2);
    }
    return s2;
  }, set: function(e2, t2) {
    for (var n2, i2, r2 = e2.options, o2 = re.makeArray(t2), s2 = r2.length; s2--; ) if (i2 = r2[s2], re.inArray(re.valHooks.option.get(i2), o2) >= 0) try {
      i2.selected = n2 = true;
    } catch (e3) {
      i2.scrollHeight;
    }
    else i2.selected = false;
    return n2 || (e2.selectedIndex = -1), r2;
  } } } }), re.each(["radio", "checkbox"], function() {
    re.valHooks[this] = { set: function(e2, t2) {
      return re.isArray(t2) ? e2.checked = re.inArray(re(e2).val(), t2) >= 0 : void 0;
    } }, ne.checkOn || (re.valHooks[this].get = function(e2) {
      return null === e2.getAttribute("value") ? "on" : e2.value;
    });
  });
  var bt, St, Gt = re.expr.attrHandle, Tt = /^(?:checked|selected)$/i, kt = ne.getSetAttribute, Ct = ne.input;
  re.fn.extend({ attr: function(e2, t2) {
    return Ee(this, re.attr, e2, t2, arguments.length > 1);
  }, removeAttr: function(e2) {
    return this.each(function() {
      re.removeAttr(this, e2);
    });
  } }), re.extend({ attr: function(e2, t2, n2) {
    var i2, r2, o2 = e2.nodeType;
    if (e2 && 3 !== o2 && 8 !== o2 && 2 !== o2) return typeof e2.getAttribute === Ge ? re.prop(e2, t2, n2) : (1 === o2 && re.isXMLDoc(e2) || (t2 = t2.toLowerCase(), i2 = re.attrHooks[t2] || (re.expr.match.bool.test(t2) ? St : bt)), void 0 === n2 ? i2 && "get" in i2 && null !== (r2 = i2.get(e2, t2)) ? r2 : (r2 = re.find.attr(e2, t2), null == r2 ? void 0 : r2) : null !== n2 ? i2 && "set" in i2 && void 0 !== (r2 = i2.set(e2, n2, t2)) ? r2 : (e2.setAttribute(t2, n2 + ""), n2) : void re.removeAttr(e2, t2));
  }, removeAttr: function(e2, t2) {
    var n2, i2, r2 = 0, o2 = t2 && t2.match(ye);
    if (o2 && 1 === e2.nodeType) for (; n2 = o2[r2++]; ) i2 = re.propFix[n2] || n2, re.expr.match.bool.test(n2) ? Ct && kt || !Tt.test(n2) ? e2[i2] = false : e2[re.camelCase("default-" + n2)] = e2[i2] = false : re.attr(e2, n2, ""), e2.removeAttribute(kt ? n2 : i2);
  }, attrHooks: { type: { set: function(e2, t2) {
    if (!ne.radioValue && "radio" === t2 && re.nodeName(e2, "input")) {
      var n2 = e2.value;
      return e2.setAttribute("type", t2), n2 && (e2.value = n2), t2;
    }
  } } } }), St = { set: function(e2, t2, n2) {
    return false === t2 ? re.removeAttr(e2, n2) : Ct && kt || !Tt.test(n2) ? e2.setAttribute(!kt && re.propFix[n2] || n2, n2) : e2[re.camelCase("default-" + n2)] = e2[n2] = true, n2;
  } }, re.each(re.expr.match.bool.source.match(/\w+/g), function(e2, t2) {
    var n2 = Gt[t2] || re.find.attr;
    Gt[t2] = Ct && kt || !Tt.test(t2) ? function(e3, t3, i2) {
      var r2, o2;
      return i2 || (o2 = Gt[t3], Gt[t3] = r2, r2 = null != n2(e3, t3, i2) ? t3.toLowerCase() : null, Gt[t3] = o2), r2;
    } : function(e3, t3, n3) {
      return n3 ? void 0 : e3[re.camelCase("default-" + t3)] ? t3.toLowerCase() : null;
    };
  }), Ct && kt || (re.attrHooks.value = { set: function(e2, t2, n2) {
    return re.nodeName(e2, "input") ? void (e2.defaultValue = t2) : bt && bt.set(e2, t2, n2);
  } }), kt || (bt = { set: function(e2, t2, n2) {
    var i2 = e2.getAttributeNode(n2);
    return i2 || e2.setAttributeNode(i2 = e2.ownerDocument.createAttribute(n2)), i2.value = t2 += "", "value" === n2 || t2 === e2.getAttribute(n2) ? t2 : void 0;
  } }, Gt.id = Gt.name = Gt.coords = function(e2, t2, n2) {
    var i2;
    return n2 ? void 0 : (i2 = e2.getAttributeNode(t2)) && "" !== i2.value ? i2.value : null;
  }, re.valHooks.button = { get: function(e2, t2) {
    var n2 = e2.getAttributeNode(t2);
    return n2 && n2.specified ? n2.value : void 0;
  }, set: bt.set }, re.attrHooks.contenteditable = { set: function(e2, t2, n2) {
    bt.set(e2, "" !== t2 && t2, n2);
  } }, re.each(["width", "height"], function(e2, t2) {
    re.attrHooks[t2] = { set: function(e3, n2) {
      return "" === n2 ? (e3.setAttribute(t2, "auto"), n2) : void 0;
    } };
  })), ne.style || (re.attrHooks.style = { get: function(e2) {
    return e2.style.cssText || void 0;
  }, set: function(e2, t2) {
    return e2.style.cssText = t2 + "";
  } });
  var Mt = /^(?:input|select|textarea|button|object)$/i, wt = /^(?:a|area)$/i;
  re.fn.extend({ prop: function(e2, t2) {
    return Ee(this, re.prop, e2, t2, arguments.length > 1);
  }, removeProp: function(e2) {
    return e2 = re.propFix[e2] || e2, this.each(function() {
      try {
        this[e2] = void 0, delete this[e2];
      } catch (e3) {
      }
    });
  } }), re.extend({ propFix: { for: "htmlFor", class: "className" }, prop: function(e2, t2, n2) {
    var i2, r2, o2, s2 = e2.nodeType;
    if (e2 && 3 !== s2 && 8 !== s2 && 2 !== s2) return o2 = 1 !== s2 || !re.isXMLDoc(e2), o2 && (t2 = re.propFix[t2] || t2, r2 = re.propHooks[t2]), void 0 !== n2 ? r2 && "set" in r2 && void 0 !== (i2 = r2.set(e2, n2, t2)) ? i2 : e2[t2] = n2 : r2 && "get" in r2 && null !== (i2 = r2.get(e2, t2)) ? i2 : e2[t2];
  }, propHooks: { tabIndex: { get: function(e2) {
    var t2 = re.find.attr(e2, "tabindex");
    return t2 ? parseInt(t2, 10) : Mt.test(e2.nodeName) || wt.test(e2.nodeName) && e2.href ? 0 : -1;
  } } } }), ne.hrefNormalized || re.each(["href", "src"], function(e2, t2) {
    re.propHooks[t2] = { get: function(e3) {
      return e3.getAttribute(t2, 4);
    } };
  }), ne.optSelected || (re.propHooks.selected = { get: function(e2) {
    var t2 = e2.parentNode;
    return t2 && (t2.selectedIndex, t2.parentNode && t2.parentNode.selectedIndex), null;
  } }), re.each(["tabIndex", "readOnly", "maxLength", "cellSpacing", "cellPadding", "rowSpan", "colSpan", "useMap", "frameBorder", "contentEditable"], function() {
    re.propFix[this.toLowerCase()] = this;
  }), ne.enctype || (re.propFix.enctype = "encoding");
  var Et = /[\t\r\n\f]/g;
  re.fn.extend({ addClass: function(e2) {
    var t2, n2, i2, r2, o2, s2, a2 = 0, u2 = this.length, c2 = "string" == typeof e2 && e2;
    if (re.isFunction(e2)) return this.each(function(t3) {
      re(this).addClass(e2.call(this, t3, this.className));
    });
    if (c2) {
      for (t2 = (e2 || "").match(ye) || []; u2 > a2; a2++) if (n2 = this[a2], i2 = 1 === n2.nodeType && (n2.className ? (" " + n2.className + " ").replace(Et, " ") : " ")) {
        for (o2 = 0; r2 = t2[o2++]; ) i2.indexOf(" " + r2 + " ") < 0 && (i2 += r2 + " ");
        s2 = re.trim(i2), n2.className !== s2 && (n2.className = s2);
      }
    }
    return this;
  }, removeClass: function(e2) {
    var t2, n2, i2, r2, o2, s2, a2 = 0, u2 = this.length, c2 = 0 === arguments.length || "string" == typeof e2 && e2;
    if (re.isFunction(e2)) return this.each(function(t3) {
      re(this).removeClass(e2.call(this, t3, this.className));
    });
    if (c2) {
      for (t2 = (e2 || "").match(ye) || []; u2 > a2; a2++) if (n2 = this[a2], i2 = 1 === n2.nodeType && (n2.className ? (" " + n2.className + " ").replace(Et, " ") : "")) {
        for (o2 = 0; r2 = t2[o2++]; ) for (; i2.indexOf(" " + r2 + " ") >= 0; ) i2 = i2.replace(" " + r2 + " ", " ");
        s2 = e2 ? re.trim(i2) : "", n2.className !== s2 && (n2.className = s2);
      }
    }
    return this;
  }, toggleClass: function(e2, t2) {
    var n2 = typeof e2;
    return "boolean" == typeof t2 && "string" === n2 ? t2 ? this.addClass(e2) : this.removeClass(e2) : this.each(re.isFunction(e2) ? function(n3) {
      re(this).toggleClass(e2.call(this, n3, this.className, t2), t2);
    } : function() {
      if ("string" === n2) for (var t3, i2 = 0, r2 = re(this), o2 = e2.match(ye) || []; t3 = o2[i2++]; ) r2.hasClass(t3) ? r2.removeClass(t3) : r2.addClass(t3);
      else (n2 === Ge || "boolean" === n2) && (this.className && re._data(this, "__className__", this.className), this.className = this.className || false === e2 ? "" : re._data(this, "__className__") || "");
    });
  }, hasClass: function(e2) {
    for (var t2 = " " + e2 + " ", n2 = 0, i2 = this.length; i2 > n2; n2++) if (1 === this[n2].nodeType && (" " + this[n2].className + " ").replace(Et, " ").indexOf(t2) >= 0) return true;
    return false;
  } }), re.each("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" "), function(e2, t2) {
    re.fn[t2] = function(e3, n2) {
      return arguments.length > 0 ? this.on(t2, null, e3, n2) : this.trigger(t2);
    };
  }), re.fn.extend({ hover: function(e2, t2) {
    return this.mouseenter(e2).mouseleave(t2 || e2);
  }, bind: function(e2, t2, n2) {
    return this.on(e2, null, t2, n2);
  }, unbind: function(e2, t2) {
    return this.off(e2, null, t2);
  }, delegate: function(e2, t2, n2, i2) {
    return this.on(t2, e2, n2, i2);
  }, undelegate: function(e2, t2, n2) {
    return 1 === arguments.length ? this.off(e2, "**") : this.off(t2, e2 || "**", n2);
  } });
  var It = re.now(), xt = /\?/, Pt = /(,)|(\[|{)|(}|])|"(?:[^"\\\r\n]|\\["\\\/bfnrt]|\\u[\da-fA-F]{4})*"\s*:?|true|false|null|-?(?!0\d)\d+(?:\.\d+|)(?:[eE][+-]?\d+|)/g;
  re.parseJSON = function(t2) {
    if (e.JSON && e.JSON.parse) return e.JSON.parse(t2 + "");
    var n2, i2 = null, r2 = re.trim(t2 + "");
    return r2 && !re.trim(r2.replace(Pt, function(e2, t3, r3, o2) {
      return n2 && t3 && (i2 = 0), 0 === i2 ? e2 : (n2 = r3 || t3, i2 += !o2 - !r3, "");
    })) ? Function("return " + r2)() : re.error("Invalid JSON: " + t2);
  }, re.parseXML = function(t2) {
    var n2, i2;
    if (!t2 || "string" != typeof t2) return null;
    try {
      e.DOMParser ? (i2 = new DOMParser(), n2 = i2.parseFromString(t2, "text/xml")) : (n2 = new ActiveXObject("Microsoft.XMLDOM"), n2.async = "false", n2.loadXML(t2));
    } catch (e2) {
      n2 = void 0;
    }
    return n2 && n2.documentElement && !n2.getElementsByTagName("parsererror").length || re.error("Invalid XML: " + t2), n2;
  };
  var At, Rt, Ft = /#.*$/, _t = /([?&])_=[^&]*/, Bt = /^(.*?):[ \t]*([^\r\n]*)\r?$/gm, Nt = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/, Ut = /^(?:GET|HEAD)$/, Ot = /^\/\//, Dt = /^([\w.+-]+:)(?:\/\/(?:[^\/?#]*@|)([^\/?#:]*)(?::(\d+)|)|)/, Lt = {}, qt = {}, Ht = "*/".concat("*");
  try {
    Rt = location.href;
  } catch (e2) {
    Rt = ge.createElement("a"), Rt.href = "", Rt = Rt.href;
  }
  At = Dt.exec(Rt.toLowerCase()) || [], re.extend({ active: 0, lastModified: {}, etag: {}, ajaxSettings: { url: Rt, type: "GET", isLocal: Nt.test(At[1]), global: true, processData: true, async: true, contentType: "application/x-www-form-urlencoded; charset=UTF-8", accepts: { "*": Ht, text: "text/plain", html: "text/html", xml: "application/xml, text/xml", json: "application/json, text/javascript" }, contents: { xml: /xml/, html: /html/, json: /json/ }, responseFields: { xml: "responseXML", text: "responseText", json: "responseJSON" }, converters: { "* text": String, "text html": true, "text json": re.parseJSON, "text xml": re.parseXML }, flatOptions: { url: true, context: true } }, ajaxSetup: function(e2, t2) {
    return t2 ? L(L(e2, re.ajaxSettings), t2) : L(re.ajaxSettings, e2);
  }, ajaxPrefilter: O(Lt), ajaxTransport: O(qt), ajax: function(e2, t2) {
    function n2(e3, t3, n3, i3) {
      var r3, l3, X3, y3, b3, G2 = t3;
      2 !== v2 && (v2 = 2, a2 && clearTimeout(a2), c2 = void 0, s2 = i3 || "", S2.readyState = e3 > 0 ? 4 : 0, r3 = e3 >= 200 && 300 > e3 || 304 === e3, n3 && (y3 = q(h2, S2, n3)), y3 = H(h2, y3, S2, r3), r3 ? (h2.ifModified && (b3 = S2.getResponseHeader("Last-Modified"), b3 && (re.lastModified[o2] = b3), (b3 = S2.getResponseHeader("etag")) && (re.etag[o2] = b3)), 204 === e3 || "HEAD" === h2.type ? G2 = "nocontent" : 304 === e3 ? G2 = "notmodified" : (G2 = y3.state, l3 = y3.data, X3 = y3.error, r3 = !X3)) : (X3 = G2, (e3 || !G2) && (G2 = "error", 0 > e3 && (e3 = 0))), S2.status = e3, S2.statusText = (t3 || G2) + "", r3 ? g2.resolveWith(p2, [l3, G2, S2]) : g2.rejectWith(p2, [S2, G2, X3]), S2.statusCode(f2), f2 = void 0, u2 && d2.trigger(r3 ? "ajaxSuccess" : "ajaxError", [S2, h2, r3 ? l3 : X3]), m2.fireWith(p2, [S2, G2]), u2 && (d2.trigger("ajaxComplete", [S2, h2]), --re.active || re.event.trigger("ajaxStop")));
    }
    "object" == typeof e2 && (t2 = e2, e2 = void 0), t2 = t2 || {};
    var i2, r2, o2, s2, a2, u2, c2, l2, h2 = re.ajaxSetup({}, t2), p2 = h2.context || h2, d2 = h2.context && (p2.nodeType || p2.jquery) ? re(p2) : re.event, g2 = re.Deferred(), m2 = re.Callbacks("once memory"), f2 = h2.statusCode || {}, X2 = {}, y2 = {}, v2 = 0, b2 = "canceled", S2 = { readyState: 0, getResponseHeader: function(e3) {
      var t3;
      if (2 === v2) {
        if (!l2) for (l2 = {}; t3 = Bt.exec(s2); ) l2[t3[1].toLowerCase()] = t3[2];
        t3 = l2[e3.toLowerCase()];
      }
      return null == t3 ? null : t3;
    }, getAllResponseHeaders: function() {
      return 2 === v2 ? s2 : null;
    }, setRequestHeader: function(e3, t3) {
      var n3 = e3.toLowerCase();
      return v2 || (e3 = y2[n3] = y2[n3] || e3, X2[e3] = t3), this;
    }, overrideMimeType: function(e3) {
      return v2 || (h2.mimeType = e3), this;
    }, statusCode: function(e3) {
      var t3;
      if (e3) if (2 > v2) for (t3 in e3) f2[t3] = [f2[t3], e3[t3]];
      else S2.always(e3[S2.status]);
      return this;
    }, abort: function(e3) {
      var t3 = e3 || b2;
      return c2 && c2.abort(t3), n2(0, t3), this;
    } };
    if (g2.promise(S2).complete = m2.add, S2.success = S2.done, S2.error = S2.fail, h2.url = ((e2 || h2.url || Rt) + "").replace(Ft, "").replace(Ot, At[1] + "//"), h2.type = t2.method || t2.type || h2.method || h2.type, h2.dataTypes = re.trim(h2.dataType || "*").toLowerCase().match(ye) || [""], null == h2.crossDomain && (i2 = Dt.exec(h2.url.toLowerCase()), h2.crossDomain = !(!i2 || i2[1] === At[1] && i2[2] === At[2] && (i2[3] || ("http:" === i2[1] ? "80" : "443")) === (At[3] || ("http:" === At[1] ? "80" : "443")))), h2.data && h2.processData && "string" != typeof h2.data && (h2.data = re.param(h2.data, h2.traditional)), D(Lt, h2, t2, S2), 2 === v2) return S2;
    u2 = re.event && h2.global, u2 && 0 == re.active++ && re.event.trigger("ajaxStart"), h2.type = h2.type.toUpperCase(), h2.hasContent = !Ut.test(h2.type), o2 = h2.url, h2.hasContent || (h2.data && (o2 = h2.url += (xt.test(o2) ? "&" : "?") + h2.data, delete h2.data), false === h2.cache && (h2.url = _t.test(o2) ? o2.replace(_t, "$1_=" + It++) : o2 + (xt.test(o2) ? "&" : "?") + "_=" + It++)), h2.ifModified && (re.lastModified[o2] && S2.setRequestHeader("If-Modified-Since", re.lastModified[o2]), re.etag[o2] && S2.setRequestHeader("If-None-Match", re.etag[o2])), (h2.data && h2.hasContent && false !== h2.contentType || t2.contentType) && S2.setRequestHeader("Content-Type", h2.contentType), S2.setRequestHeader("Accept", h2.dataTypes[0] && h2.accepts[h2.dataTypes[0]] ? h2.accepts[h2.dataTypes[0]] + ("*" !== h2.dataTypes[0] ? ", " + Ht + "; q=0.01" : "") : h2.accepts["*"]);
    for (r2 in h2.headers) S2.setRequestHeader(r2, h2.headers[r2]);
    if (h2.beforeSend && (false === h2.beforeSend.call(p2, S2, h2) || 2 === v2)) return S2.abort();
    b2 = "abort";
    for (r2 in { success: 1, error: 1, complete: 1 }) S2[r2](h2[r2]);
    if (c2 = D(qt, h2, t2, S2)) {
      S2.readyState = 1, u2 && d2.trigger("ajaxSend", [S2, h2]), h2.async && h2.timeout > 0 && (a2 = setTimeout(function() {
        S2.abort("timeout");
      }, h2.timeout));
      try {
        v2 = 1, c2.send(X2, n2);
      } catch (e3) {
        if (!(2 > v2)) throw e3;
        n2(-1, e3);
      }
    } else n2(-1, "No Transport");
    return S2;
  }, getJSON: function(e2, t2, n2) {
    return re.get(e2, t2, n2, "json");
  }, getScript: function(e2, t2) {
    return re.get(e2, void 0, t2, "script");
  } }), re.each(["get", "post"], function(e2, t2) {
    re[t2] = function(e3, n2, i2, r2) {
      return re.isFunction(n2) && (r2 = r2 || i2, i2 = n2, n2 = void 0), re.ajax({ url: e3, type: t2, dataType: r2, data: n2, success: i2 });
    };
  }), re._evalUrl = function(e2) {
    return re.ajax({ url: e2, type: "GET", dataType: "script", async: false, global: false, throws: true });
  }, re.fn.extend({ wrapAll: function(e2) {
    if (re.isFunction(e2)) return this.each(function(t3) {
      re(this).wrapAll(e2.call(this, t3));
    });
    if (this[0]) {
      var t2 = re(e2, this[0].ownerDocument).eq(0).clone(true);
      this[0].parentNode && t2.insertBefore(this[0]), t2.map(function() {
        for (var e3 = this; e3.firstChild && 1 === e3.firstChild.nodeType; ) e3 = e3.firstChild;
        return e3;
      }).append(this);
    }
    return this;
  }, wrapInner: function(e2) {
    return this.each(re.isFunction(e2) ? function(t2) {
      re(this).wrapInner(e2.call(this, t2));
    } : function() {
      var t2 = re(this), n2 = t2.contents();
      n2.length ? n2.wrapAll(e2) : t2.append(e2);
    });
  }, wrap: function(e2) {
    var t2 = re.isFunction(e2);
    return this.each(function(n2) {
      re(this).wrapAll(t2 ? e2.call(this, n2) : e2);
    });
  }, unwrap: function() {
    return this.parent().each(function() {
      re.nodeName(this, "body") || re(this).replaceWith(this.childNodes);
    }).end();
  } }), re.expr.filters.hidden = function(e2) {
    return e2.offsetWidth <= 0 && e2.offsetHeight <= 0 || !ne.reliableHiddenOffsets() && "none" === (e2.style && e2.style.display || re.css(e2, "display"));
  }, re.expr.filters.visible = function(e2) {
    return !re.expr.filters.hidden(e2);
  };
  var Yt = /%20/g, zt = /\[\]$/, Wt = /\r?\n/g, jt = /^(?:submit|button|image|reset|file)$/i, $t = /^(?:input|select|textarea|keygen)/i;
  re.param = function(e2, t2) {
    var n2, i2 = [], r2 = function(e3, t3) {
      t3 = re.isFunction(t3) ? t3() : null == t3 ? "" : t3, i2[i2.length] = encodeURIComponent(e3) + "=" + encodeURIComponent(t3);
    };
    if (void 0 === t2 && (t2 = re.ajaxSettings && re.ajaxSettings.traditional), re.isArray(e2) || e2.jquery && !re.isPlainObject(e2)) re.each(e2, function() {
      r2(this.name, this.value);
    });
    else for (n2 in e2) Y(n2, e2[n2], t2, r2);
    return i2.join("&").replace(Yt, "+");
  }, re.fn.extend({ serialize: function() {
    return re.param(this.serializeArray());
  }, serializeArray: function() {
    return this.map(function() {
      var e2 = re.prop(this, "elements");
      return e2 ? re.makeArray(e2) : this;
    }).filter(function() {
      var e2 = this.type;
      return this.name && !re(this).is(":disabled") && $t.test(this.nodeName) && !jt.test(e2) && (this.checked || !Ie.test(e2));
    }).map(function(e2, t2) {
      var n2 = re(this).val();
      return null == n2 ? null : re.isArray(n2) ? re.map(n2, function(e3) {
        return { name: t2.name, value: e3.replace(Wt, "\r\n") };
      }) : { name: t2.name, value: n2.replace(Wt, "\r\n") };
    }).get();
  } }), re.ajaxSettings.xhr = void 0 !== e.ActiveXObject ? function() {
    return !this.isLocal && /^(get|post|head|put|delete|options)$/i.test(this.type) && z() || W();
  } : z;
  var Vt = 0, Kt = {}, Qt = re.ajaxSettings.xhr();
  e.attachEvent && e.attachEvent("onunload", function() {
    for (var e2 in Kt) Kt[e2](void 0, true);
  }), ne.cors = !!Qt && "withCredentials" in Qt, (Qt = ne.ajax = !!Qt) && re.ajaxTransport(function(e2) {
    if (!e2.crossDomain || ne.cors) {
      var t2;
      return { send: function(n2, i2) {
        var r2, o2 = e2.xhr(), s2 = ++Vt;
        if (o2.open(e2.type, e2.url, e2.async, e2.username, e2.password), e2.xhrFields) for (r2 in e2.xhrFields) o2[r2] = e2.xhrFields[r2];
        e2.mimeType && o2.overrideMimeType && o2.overrideMimeType(e2.mimeType), e2.crossDomain || n2["X-Requested-With"] || (n2["X-Requested-With"] = "XMLHttpRequest");
        for (r2 in n2) void 0 !== n2[r2] && o2.setRequestHeader(r2, n2[r2] + "");
        o2.send(e2.hasContent && e2.data || null), t2 = function(n3, r3) {
          var a2, u2, c2;
          if (t2 && (r3 || 4 === o2.readyState)) if (delete Kt[s2], t2 = void 0, o2.onreadystatechange = re.noop, r3) 4 !== o2.readyState && o2.abort();
          else {
            c2 = {}, a2 = o2.status, "string" == typeof o2.responseText && (c2.text = o2.responseText);
            try {
              u2 = o2.statusText;
            } catch (e3) {
              u2 = "";
            }
            a2 || !e2.isLocal || e2.crossDomain ? 1223 === a2 && (a2 = 204) : a2 = c2.text ? 200 : 404;
          }
          c2 && i2(a2, u2, c2, o2.getAllResponseHeaders());
        }, e2.async ? 4 === o2.readyState ? setTimeout(t2) : o2.onreadystatechange = Kt[s2] = t2 : t2();
      }, abort: function() {
        t2 && t2(void 0, true);
      } };
    }
  }), re.ajaxSetup({ accepts: { script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript" }, contents: { script: /(?:java|ecma)script/ }, converters: { "text script": function(e2) {
    return re.globalEval(e2), e2;
  } } }), re.ajaxPrefilter("script", function(e2) {
    void 0 === e2.cache && (e2.cache = false), e2.crossDomain && (e2.type = "GET", e2.global = false);
  }), re.ajaxTransport("script", function(e2) {
    if (e2.crossDomain) {
      var t2, n2 = ge.head || re("head")[0] || ge.documentElement;
      return { send: function(i2, r2) {
        t2 = ge.createElement("script"), t2.async = true, e2.scriptCharset && (t2.charset = e2.scriptCharset), t2.src = e2.url, t2.onload = t2.onreadystatechange = function(e3, n3) {
          (n3 || !t2.readyState || /loaded|complete/.test(t2.readyState)) && (t2.onload = t2.onreadystatechange = null, t2.parentNode && t2.parentNode.removeChild(t2), t2 = null, n3 || r2(200, "success"));
        }, n2.insertBefore(t2, n2.firstChild);
      }, abort: function() {
        t2 && t2.onload(void 0, true);
      } };
    }
  });
  var Zt = [], Jt = /(=)\?(?=&|$)|\?\?/;
  re.ajaxSetup({ jsonp: "callback", jsonpCallback: function() {
    var e2 = Zt.pop() || re.expando + "_" + It++;
    return this[e2] = true, e2;
  } }), re.ajaxPrefilter("json jsonp", function(t2, n2, i2) {
    var r2, o2, s2, a2 = false !== t2.jsonp && (Jt.test(t2.url) ? "url" : "string" == typeof t2.data && !(t2.contentType || "").indexOf("application/x-www-form-urlencoded") && Jt.test(t2.data) && "data");
    return a2 || "jsonp" === t2.dataTypes[0] ? (r2 = t2.jsonpCallback = re.isFunction(t2.jsonpCallback) ? t2.jsonpCallback() : t2.jsonpCallback, a2 ? t2[a2] = t2[a2].replace(Jt, "$1" + r2) : false !== t2.jsonp && (t2.url += (xt.test(t2.url) ? "&" : "?") + t2.jsonp + "=" + r2), t2.converters["script json"] = function() {
      return s2 || re.error(r2 + " was not called"), s2[0];
    }, t2.dataTypes[0] = "json", o2 = e[r2], e[r2] = function() {
      s2 = arguments;
    }, i2.always(function() {
      e[r2] = o2, t2[r2] && (t2.jsonpCallback = n2.jsonpCallback, Zt.push(r2)), s2 && re.isFunction(o2) && o2(s2[0]), s2 = o2 = void 0;
    }), "script") : void 0;
  }), re.parseHTML = function(e2, t2, n2) {
    if (!e2 || "string" != typeof e2) return null;
    "boolean" == typeof t2 && (n2 = t2, t2 = false), t2 = t2 || ge;
    var i2 = he.exec(e2), r2 = !n2 && [];
    return i2 ? [t2.createElement(i2[1])] : (i2 = re.buildFragment([e2], t2, r2), r2 && r2.length && re(r2).remove(), re.merge([], i2.childNodes));
  };
  var en = re.fn.load;
  re.fn.load = function(e2, t2, n2) {
    if ("string" != typeof e2 && en) return en.apply(this, arguments);
    var i2, r2, o2, s2 = this, a2 = e2.indexOf(" ");
    return a2 >= 0 && (i2 = re.trim(e2.slice(a2, e2.length)), e2 = e2.slice(0, a2)), re.isFunction(t2) ? (n2 = t2, t2 = void 0) : t2 && "object" == typeof t2 && (o2 = "POST"), s2.length > 0 && re.ajax({ url: e2, type: o2, dataType: "html", data: t2 }).done(function(e3) {
      r2 = arguments, s2.html(i2 ? re("<div>").append(re.parseHTML(e3)).find(i2) : e3);
    }).complete(n2 && function(e3, t3) {
      s2.each(n2, r2 || [e3.responseText, t3, e3]);
    }), this;
  }, re.each(["ajaxStart", "ajaxStop", "ajaxComplete", "ajaxError", "ajaxSuccess", "ajaxSend"], function(e2, t2) {
    re.fn[t2] = function(e3) {
      return this.on(t2, e3);
    };
  }), re.expr.filters.animated = function(e2) {
    return re.grep(re.timers, function(t2) {
      return e2 === t2.elem;
    }).length;
  };
  var tn = e.document.documentElement;
  re.offset = { setOffset: function(e2, t2, n2) {
    var i2, r2, o2, s2, a2, u2, c2, l2 = re.css(e2, "position"), h2 = re(e2), p2 = {};
    "static" === l2 && (e2.style.position = "relative"), a2 = h2.offset(), o2 = re.css(e2, "top"), u2 = re.css(e2, "left"), c2 = ("absolute" === l2 || "fixed" === l2) && re.inArray("auto", [o2, u2]) > -1, c2 ? (i2 = h2.position(), s2 = i2.top, r2 = i2.left) : (s2 = parseFloat(o2) || 0, r2 = parseFloat(u2) || 0), re.isFunction(t2) && (t2 = t2.call(e2, n2, a2)), null != t2.top && (p2.top = t2.top - a2.top + s2), null != t2.left && (p2.left = t2.left - a2.left + r2), "using" in t2 ? t2.using.call(e2, p2) : h2.css(p2);
  } }, re.fn.extend({ offset: function(e2) {
    if (arguments.length) return void 0 === e2 ? this : this.each(function(t3) {
      re.offset.setOffset(this, e2, t3);
    });
    var t2, n2, i2 = { top: 0, left: 0 }, r2 = this[0], o2 = r2 && r2.ownerDocument;
    return o2 ? (t2 = o2.documentElement, re.contains(t2, r2) ? (typeof r2.getBoundingClientRect !== Ge && (i2 = r2.getBoundingClientRect()), n2 = j(o2), { top: i2.top + (n2.pageYOffset || t2.scrollTop) - (t2.clientTop || 0), left: i2.left + (n2.pageXOffset || t2.scrollLeft) - (t2.clientLeft || 0) }) : i2) : void 0;
  }, position: function() {
    if (this[0]) {
      var e2, t2, n2 = { top: 0, left: 0 }, i2 = this[0];
      return "fixed" === re.css(i2, "position") ? t2 = i2.getBoundingClientRect() : (e2 = this.offsetParent(), t2 = this.offset(), re.nodeName(e2[0], "html") || (n2 = e2.offset()), n2.top += re.css(e2[0], "borderTopWidth", true), n2.left += re.css(e2[0], "borderLeftWidth", true)), { top: t2.top - n2.top - re.css(i2, "marginTop", true), left: t2.left - n2.left - re.css(i2, "marginLeft", true) };
    }
  }, offsetParent: function() {
    return this.map(function() {
      for (var e2 = this.offsetParent || tn; e2 && !re.nodeName(e2, "html") && "static" === re.css(e2, "position"); ) e2 = e2.offsetParent;
      return e2 || tn;
    });
  } }), re.each({ scrollLeft: "pageXOffset", scrollTop: "pageYOffset" }, function(e2, t2) {
    var n2 = /Y/.test(t2);
    re.fn[e2] = function(i2) {
      return Ee(this, function(e3, i3, r2) {
        var o2 = j(e3);
        return void 0 === r2 ? o2 ? t2 in o2 ? o2[t2] : o2.document.documentElement[i3] : e3[i3] : void (o2 ? o2.scrollTo(n2 ? re(o2).scrollLeft() : r2, n2 ? r2 : re(o2).scrollTop()) : e3[i3] = r2);
      }, e2, i2, arguments.length, null);
    };
  }), re.each(["top", "left"], function(e2, t2) {
    re.cssHooks[t2] = M(ne.pixelPosition, function(e3, n2) {
      return n2 ? (n2 = et(e3, t2), nt.test(n2) ? re(e3).position()[t2] + "px" : n2) : void 0;
    });
  }), re.each({ Height: "height", Width: "width" }, function(e2, t2) {
    re.each({ padding: "inner" + e2, content: t2, "": "outer" + e2 }, function(n2, i2) {
      re.fn[i2] = function(i3, r2) {
        var o2 = arguments.length && (n2 || "boolean" != typeof i3), s2 = n2 || (true === i3 || true === r2 ? "margin" : "border");
        return Ee(this, function(t3, n3, i4) {
          var r3;
          return re.isWindow(t3) ? t3.document.documentElement["client" + e2] : 9 === t3.nodeType ? (r3 = t3.documentElement, Math.max(t3.body["scroll" + e2], r3["scroll" + e2], t3.body["offset" + e2], r3["offset" + e2], r3["client" + e2])) : void 0 === i4 ? re.css(t3, n3, s2) : re.style(t3, n3, i4, s2);
        }, t2, o2 ? i3 : void 0, o2, null);
      };
    });
  }), re.fn.size = function() {
    return this.length;
  }, re.fn.andSelf = re.fn.addBack, "function" == typeof define && define.amd && define("jquery", [], function() {
    return re;
  });
  var nn = e.jQuery, rn = e.$;
  return re.noConflict = function(t2) {
    return e.$ === re && (e.$ = rn), t2 && e.jQuery === re && (e.jQuery = nn), re;
  }, typeof t === Ge && (e.jQuery = e.$ = re), re;
}), define("lib/jquery", function() {
});
