/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：lib/handlebars
 */
var Handlebars = {};
!(function(e, t) {
  e.VERSION = "1.0.0", e.COMPILER_REVISION = 4, e.REVISION_CHANGES = { 1: "<= 1.0.rc.2", 2: "== 1.0.0-rc.3", 3: "== 1.0.0-rc.4", 4: ">= 1.0.0" }, e.helpers = {}, e.partials = {};
  var n = Object.prototype.toString;
  e.registerHelper = function(t2, i2, r2) {
    if ("[object Object]" === n.call(t2)) {
      if (r2 || i2) throw new e.Exception("Arg not supported with multiple helpers");
      e.Utils.extend(this.helpers, t2);
    } else r2 && (i2.not = r2), this.helpers[t2] = i2;
  }, e.registerPartial = function(t2, i2) {
    "[object Object]" === n.call(t2) ? e.Utils.extend(this.partials, t2) : this.partials[t2] = i2;
  }, e.registerHelper("helperMissing", function(e2) {
    if (2 === arguments.length) return t;
    throw new Error("Missing helper: '" + e2 + "'");
  }), e.registerHelper("blockHelperMissing", function(t2, i2) {
    var r2 = i2.inverse || function() {
    }, o2 = i2.fn, s2 = n.call(t2);
    return "[object Function]" === s2 && (t2 = t2.call(this)), true === t2 ? o2(this) : false === t2 || null == t2 ? r2(this) : "[object Array]" === s2 ? t2.length > 0 ? e.helpers.each(t2, i2) : r2(this) : o2(t2);
  }), e.K = function() {
  }, e.createFrame = Object.create || function(t2) {
    e.K.prototype = t2;
    var n2 = new e.K();
    return e.K.prototype = null, n2;
  }, e.logger = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, level: 3, methodMap: { 0: "debug", 1: "info", 2: "warn", 3: "error" }, logRow: function(t2, n2) {
    if (e.logger.level <= t2) {
      var i2 = e.logger.methodMap[t2];
      "undefined" != typeof console && console[i2] && console[i2].call(console, n2);
    }
  } }, e.logRow = function(t2, n2) {
    e.logger.logRow(t2, n2);
  }, e.registerHelper("each", function(t2, i2) {
    var r2, o2 = i2.fn, s2 = i2.inverse, a2 = 0, u2 = "";
    if ("[object Function]" === n.call(t2) && (t2 = t2.call(this)), i2.data && (r2 = e.createFrame(i2.data)), t2 && "object" == typeof t2) if (t2 instanceof Array) for (var c2 = t2.length; a2 < c2; a2++) r2 && (r2.index = a2), u2 += o2(t2[a2], { data: r2 });
    else for (var l2 in t2) t2.hasOwnProperty(l2) && (r2 && (r2.key = l2), u2 += o2(t2[l2], { data: r2 }), a2++);
    return 0 === a2 && (u2 = s2(this)), u2;
  }), e.registerHelper("if", function(t2, i2) {
    return "[object Function]" === n.call(t2) && (t2 = t2.call(this)), !t2 || e.Utils.isEmpty(t2) ? i2.inverse(this) : i2.fn(this);
  }), e.registerHelper("unless", function(t2, n2) {
    return e.helpers.if.call(this, t2, { fn: n2.inverse, inverse: n2.fn });
  }), e.registerHelper("with", function(t2, i2) {
    if ("[object Function]" === n.call(t2) && (t2 = t2.call(this)), !e.Utils.isEmpty(t2)) return i2.fn(t2);
  }), e.registerHelper("log", function(t2, n2) {
    var i2 = n2.data && null != n2.data.level ? parseInt(n2.data.level, 10) : 1;
    e.logRow(i2, t2);
  });
  var i = (function() {
    function e2() {
      this.yy = {};
    }
    var t2 = { trace: function() {
    }, yy: {}, symbols_: { error: 2, root: 3, program: 4, EOF: 5, simpleInverse: 6, statements: 7, statement: 8, openInverse: 9, closeBlock: 10, openBlock: 11, mustache: 12, partial: 13, CONTENT: 14, COMMENT: 15, OPEN_BLOCK: 16, inMustache: 17, CLOSE: 18, OPEN_INVERSE: 19, OPEN_ENDBLOCK: 20, path: 21, OPEN: 22, OPEN_UNESCAPED: 23, CLOSE_UNESCAPED: 24, OPEN_PARTIAL: 25, partialName: 26, params: 27, hash: 28, dataName: 29, param: 30, STRING: 31, INTEGER: 32, BOOLEAN: 33, hashSegments: 34, hashSegment: 35, ID: 36, EQUALS: 37, DATA: 38, pathSegments: 39, SEP: 40, $accept: 0, $end: 1 }, terminals_: { 2: "error", 5: "EOF", 14: "CONTENT", 15: "COMMENT", 16: "OPEN_BLOCK", 18: "CLOSE", 19: "OPEN_INVERSE", 20: "OPEN_ENDBLOCK", 22: "OPEN", 23: "OPEN_UNESCAPED", 24: "CLOSE_UNESCAPED", 25: "OPEN_PARTIAL", 31: "STRING", 32: "INTEGER", 33: "BOOLEAN", 36: "ID", 37: "EQUALS", 38: "DATA", 40: "SEP" }, productions_: [0, [3, 2], [4, 2], [4, 3], [4, 2], [4, 1], [4, 1], [4, 0], [7, 1], [7, 2], [8, 3], [8, 3], [8, 1], [8, 1], [8, 1], [8, 1], [11, 3], [9, 3], [10, 3], [12, 3], [12, 3], [13, 3], [13, 4], [6, 2], [17, 3], [17, 2], [17, 2], [17, 1], [17, 1], [27, 2], [27, 1], [30, 1], [30, 1], [30, 1], [30, 1], [30, 1], [28, 1], [34, 2], [34, 1], [35, 3], [35, 3], [35, 3], [35, 3], [35, 3], [26, 1], [26, 1], [26, 1], [29, 2], [21, 1], [39, 3], [39, 1]], performAction: function(e3, t3, n3, i2, r2, o2, s2) {
      var a2 = o2.length - 1;
      switch (r2) {
        case 1:
          return o2[a2 - 1];
        case 2:
          this.$ = new i2.ProgramNode([], o2[a2]);
          break;
        case 3:
          this.$ = new i2.ProgramNode(o2[a2 - 2], o2[a2]);
          break;
        case 4:
          this.$ = new i2.ProgramNode(o2[a2 - 1], []);
          break;
        case 5:
          this.$ = new i2.ProgramNode(o2[a2]);
          break;
        case 6:
          this.$ = new i2.ProgramNode([], []);
          break;
        case 7:
          this.$ = new i2.ProgramNode([]);
          break;
        case 8:
          this.$ = [o2[a2]];
          break;
        case 9:
          o2[a2 - 1].push(o2[a2]), this.$ = o2[a2 - 1];
          break;
        case 10:
          this.$ = new i2.BlockNode(o2[a2 - 2], o2[a2 - 1].inverse, o2[a2 - 1], o2[a2]);
          break;
        case 11:
          this.$ = new i2.BlockNode(o2[a2 - 2], o2[a2 - 1], o2[a2 - 1].inverse, o2[a2]);
          break;
        case 12:
        case 13:
          this.$ = o2[a2];
          break;
        case 14:
          this.$ = new i2.ContentNode(o2[a2]);
          break;
        case 15:
          this.$ = new i2.CommentNode(o2[a2]);
          break;
        case 16:
        case 17:
          this.$ = new i2.MustacheNode(o2[a2 - 1][0], o2[a2 - 1][1]);
          break;
        case 18:
          this.$ = o2[a2 - 1];
          break;
        case 19:
          this.$ = new i2.MustacheNode(o2[a2 - 1][0], o2[a2 - 1][1], "&" === o2[a2 - 2][2]);
          break;
        case 20:
          this.$ = new i2.MustacheNode(o2[a2 - 1][0], o2[a2 - 1][1], true);
          break;
        case 21:
          this.$ = new i2.PartialNode(o2[a2 - 1]);
          break;
        case 22:
          this.$ = new i2.PartialNode(o2[a2 - 2], o2[a2 - 1]);
          break;
        case 23:
          break;
        case 24:
          this.$ = [[o2[a2 - 2]].concat(o2[a2 - 1]), o2[a2]];
          break;
        case 25:
          this.$ = [[o2[a2 - 1]].concat(o2[a2]), null];
          break;
        case 26:
          this.$ = [[o2[a2 - 1]], o2[a2]];
          break;
        case 27:
        case 28:
          this.$ = [[o2[a2]], null];
          break;
        case 29:
          o2[a2 - 1].push(o2[a2]), this.$ = o2[a2 - 1];
          break;
        case 30:
          this.$ = [o2[a2]];
          break;
        case 31:
          this.$ = o2[a2];
          break;
        case 32:
          this.$ = new i2.StringNode(o2[a2]);
          break;
        case 33:
          this.$ = new i2.IntegerNode(o2[a2]);
          break;
        case 34:
          this.$ = new i2.BooleanNode(o2[a2]);
          break;
        case 35:
          this.$ = o2[a2];
          break;
        case 36:
          this.$ = new i2.HashNode(o2[a2]);
          break;
        case 37:
          o2[a2 - 1].push(o2[a2]), this.$ = o2[a2 - 1];
          break;
        case 38:
          this.$ = [o2[a2]];
          break;
        case 39:
          this.$ = [o2[a2 - 2], o2[a2]];
          break;
        case 40:
          this.$ = [o2[a2 - 2], new i2.StringNode(o2[a2])];
          break;
        case 41:
          this.$ = [o2[a2 - 2], new i2.IntegerNode(o2[a2])];
          break;
        case 42:
          this.$ = [o2[a2 - 2], new i2.BooleanNode(o2[a2])];
          break;
        case 43:
          this.$ = [o2[a2 - 2], o2[a2]];
          break;
        case 44:
          this.$ = new i2.PartialNameNode(o2[a2]);
          break;
        case 45:
          this.$ = new i2.PartialNameNode(new i2.StringNode(o2[a2]));
          break;
        case 46:
          this.$ = new i2.PartialNameNode(new i2.IntegerNode(o2[a2]));
          break;
        case 47:
          this.$ = new i2.DataNode(o2[a2]);
          break;
        case 48:
          this.$ = new i2.IdNode(o2[a2]);
          break;
        case 49:
          o2[a2 - 2].push({ part: o2[a2], separator: o2[a2 - 1] }), this.$ = o2[a2 - 2];
          break;
        case 50:
          this.$ = [{ part: o2[a2] }];
      }
    }, table: [{ 3: 1, 4: 2, 5: [2, 7], 6: 3, 7: 4, 8: 6, 9: 7, 11: 8, 12: 9, 13: 10, 14: [1, 11], 15: [1, 12], 16: [1, 13], 19: [1, 5], 22: [1, 14], 23: [1, 15], 25: [1, 16] }, { 1: [3] }, { 5: [1, 17] }, { 5: [2, 6], 7: 18, 8: 6, 9: 7, 11: 8, 12: 9, 13: 10, 14: [1, 11], 15: [1, 12], 16: [1, 13], 19: [1, 19], 20: [2, 6], 22: [1, 14], 23: [1, 15], 25: [1, 16] }, { 5: [2, 5], 6: 20, 8: 21, 9: 7, 11: 8, 12: 9, 13: 10, 14: [1, 11], 15: [1, 12], 16: [1, 13], 19: [1, 5], 20: [2, 5], 22: [1, 14], 23: [1, 15], 25: [1, 16] }, { 17: 23, 18: [1, 22], 21: 24, 29: 25, 36: [1, 28], 38: [1, 27], 39: 26 }, { 5: [2, 8], 14: [2, 8], 15: [2, 8], 16: [2, 8], 19: [2, 8], 20: [2, 8], 22: [2, 8], 23: [2, 8], 25: [2, 8] }, { 4: 29, 6: 3, 7: 4, 8: 6, 9: 7, 11: 8, 12: 9, 13: 10, 14: [1, 11], 15: [1, 12], 16: [1, 13], 19: [1, 5], 20: [2, 7], 22: [1, 14], 23: [1, 15], 25: [1, 16] }, { 4: 30, 6: 3, 7: 4, 8: 6, 9: 7, 11: 8, 12: 9, 13: 10, 14: [1, 11], 15: [1, 12], 16: [1, 13], 19: [1, 5], 20: [2, 7], 22: [1, 14], 23: [1, 15], 25: [1, 16] }, { 5: [2, 12], 14: [2, 12], 15: [2, 12], 16: [2, 12], 19: [2, 12], 20: [2, 12], 22: [2, 12], 23: [2, 12], 25: [2, 12] }, { 5: [2, 13], 14: [2, 13], 15: [2, 13], 16: [2, 13], 19: [2, 13], 20: [2, 13], 22: [2, 13], 23: [2, 13], 25: [2, 13] }, { 5: [2, 14], 14: [2, 14], 15: [2, 14], 16: [2, 14], 19: [2, 14], 20: [2, 14], 22: [2, 14], 23: [2, 14], 25: [2, 14] }, { 5: [2, 15], 14: [2, 15], 15: [2, 15], 16: [2, 15], 19: [2, 15], 20: [2, 15], 22: [2, 15], 23: [2, 15], 25: [2, 15] }, { 17: 31, 21: 24, 29: 25, 36: [1, 28], 38: [1, 27], 39: 26 }, { 17: 32, 21: 24, 29: 25, 36: [1, 28], 38: [1, 27], 39: 26 }, { 17: 33, 21: 24, 29: 25, 36: [1, 28], 38: [1, 27], 39: 26 }, { 21: 35, 26: 34, 31: [1, 36], 32: [1, 37], 36: [1, 28], 39: 26 }, { 1: [2, 1] }, { 5: [2, 2], 8: 21, 9: 7, 11: 8, 12: 9, 13: 10, 14: [1, 11], 15: [1, 12], 16: [1, 13], 19: [1, 19], 20: [2, 2], 22: [1, 14], 23: [1, 15], 25: [1, 16] }, { 17: 23, 21: 24, 29: 25, 36: [1, 28], 38: [1, 27], 39: 26 }, { 5: [2, 4], 7: 38, 8: 6, 9: 7, 11: 8, 12: 9, 13: 10, 14: [1, 11], 15: [1, 12], 16: [1, 13], 19: [1, 19], 20: [2, 4], 22: [1, 14], 23: [1, 15], 25: [1, 16] }, { 5: [2, 9], 14: [2, 9], 15: [2, 9], 16: [2, 9], 19: [2, 9], 20: [2, 9], 22: [2, 9], 23: [2, 9], 25: [2, 9] }, { 5: [2, 23], 14: [2, 23], 15: [2, 23], 16: [2, 23], 19: [2, 23], 20: [2, 23], 22: [2, 23], 23: [2, 23], 25: [2, 23] }, { 18: [1, 39] }, { 18: [2, 27], 21: 44, 24: [2, 27], 27: 40, 28: 41, 29: 48, 30: 42, 31: [1, 45], 32: [1, 46], 33: [1, 47], 34: 43, 35: 49, 36: [1, 50], 38: [1, 27], 39: 26 }, { 18: [2, 28], 24: [2, 28] }, { 18: [2, 48], 24: [2, 48], 31: [2, 48], 32: [2, 48], 33: [2, 48], 36: [2, 48], 38: [2, 48], 40: [1, 51] }, { 21: 52, 36: [1, 28], 39: 26 }, { 18: [2, 50], 24: [2, 50], 31: [2, 50], 32: [2, 50], 33: [2, 50], 36: [2, 50], 38: [2, 50], 40: [2, 50] }, { 10: 53, 20: [1, 54] }, { 10: 55, 20: [1, 54] }, { 18: [1, 56] }, { 18: [1, 57] }, { 24: [1, 58] }, { 18: [1, 59], 21: 60, 36: [1, 28], 39: 26 }, { 18: [2, 44], 36: [2, 44] }, { 18: [2, 45], 36: [2, 45] }, { 18: [2, 46], 36: [2, 46] }, { 5: [2, 3], 8: 21, 9: 7, 11: 8, 12: 9, 13: 10, 14: [1, 11], 15: [1, 12], 16: [1, 13], 19: [1, 19], 20: [2, 3], 22: [1, 14], 23: [1, 15], 25: [1, 16] }, { 14: [2, 17], 15: [2, 17], 16: [2, 17], 19: [2, 17], 20: [2, 17], 22: [2, 17], 23: [2, 17], 25: [2, 17] }, { 18: [2, 25], 21: 44, 24: [2, 25], 28: 61, 29: 48, 30: 62, 31: [1, 45], 32: [1, 46], 33: [1, 47], 34: 43, 35: 49, 36: [1, 50], 38: [1, 27], 39: 26 }, { 18: [2, 26], 24: [2, 26] }, { 18: [2, 30], 24: [2, 30], 31: [2, 30], 32: [2, 30], 33: [2, 30], 36: [2, 30], 38: [2, 30] }, { 18: [2, 36], 24: [2, 36], 35: 63, 36: [1, 64] }, { 18: [2, 31], 24: [2, 31], 31: [2, 31], 32: [2, 31], 33: [2, 31], 36: [2, 31], 38: [2, 31] }, { 18: [2, 32], 24: [2, 32], 31: [2, 32], 32: [2, 32], 33: [2, 32], 36: [2, 32], 38: [2, 32] }, { 18: [2, 33], 24: [2, 33], 31: [2, 33], 32: [2, 33], 33: [2, 33], 36: [2, 33], 38: [2, 33] }, { 18: [2, 34], 24: [2, 34], 31: [2, 34], 32: [2, 34], 33: [2, 34], 36: [2, 34], 38: [2, 34] }, { 18: [2, 35], 24: [2, 35], 31: [2, 35], 32: [2, 35], 33: [2, 35], 36: [2, 35], 38: [2, 35] }, { 18: [2, 38], 24: [2, 38], 36: [2, 38] }, { 18: [2, 50], 24: [2, 50], 31: [2, 50], 32: [2, 50], 33: [2, 50], 36: [2, 50], 37: [1, 65], 38: [2, 50], 40: [2, 50] }, { 36: [1, 66] }, { 18: [2, 47], 24: [2, 47], 31: [2, 47], 32: [2, 47], 33: [2, 47], 36: [2, 47], 38: [2, 47] }, { 5: [2, 10], 14: [2, 10], 15: [2, 10], 16: [2, 10], 19: [2, 10], 20: [2, 10], 22: [2, 10], 23: [2, 10], 25: [2, 10] }, { 21: 67, 36: [1, 28], 39: 26 }, { 5: [2, 11], 14: [2, 11], 15: [2, 11], 16: [2, 11], 19: [2, 11], 20: [2, 11], 22: [2, 11], 23: [2, 11], 25: [2, 11] }, { 14: [2, 16], 15: [2, 16], 16: [2, 16], 19: [2, 16], 20: [2, 16], 22: [2, 16], 23: [2, 16], 25: [2, 16] }, { 5: [2, 19], 14: [2, 19], 15: [2, 19], 16: [2, 19], 19: [2, 19], 20: [2, 19], 22: [2, 19], 23: [2, 19], 25: [2, 19] }, { 5: [2, 20], 14: [2, 20], 15: [2, 20], 16: [2, 20], 19: [2, 20], 20: [2, 20], 22: [2, 20], 23: [2, 20], 25: [2, 20] }, { 5: [2, 21], 14: [2, 21], 15: [2, 21], 16: [2, 21], 19: [2, 21], 20: [2, 21], 22: [2, 21], 23: [2, 21], 25: [2, 21] }, { 18: [1, 68] }, { 18: [2, 24], 24: [2, 24] }, { 18: [2, 29], 24: [2, 29], 31: [2, 29], 32: [2, 29], 33: [2, 29], 36: [2, 29], 38: [2, 29] }, { 18: [2, 37], 24: [2, 37], 36: [2, 37] }, { 37: [1, 65] }, { 21: 69, 29: 73, 31: [1, 70], 32: [1, 71], 33: [1, 72], 36: [1, 28], 38: [1, 27], 39: 26 }, { 18: [2, 49], 24: [2, 49], 31: [2, 49], 32: [2, 49], 33: [2, 49], 36: [2, 49], 38: [2, 49], 40: [2, 49] }, { 18: [1, 74] }, { 5: [2, 22], 14: [2, 22], 15: [2, 22], 16: [2, 22], 19: [2, 22], 20: [2, 22], 22: [2, 22], 23: [2, 22], 25: [2, 22] }, { 18: [2, 39], 24: [2, 39], 36: [2, 39] }, { 18: [2, 40], 24: [2, 40], 36: [2, 40] }, { 18: [2, 41], 24: [2, 41], 36: [2, 41] }, { 18: [2, 42], 24: [2, 42], 36: [2, 42] }, { 18: [2, 43], 24: [2, 43], 36: [2, 43] }, { 5: [2, 18], 14: [2, 18], 15: [2, 18], 16: [2, 18], 19: [2, 18], 20: [2, 18], 22: [2, 18], 23: [2, 18], 25: [2, 18] }], defaultActions: { 17: [2, 1] }, parseError: function(e3, t3) {
      throw new Error(e3);
    }, parse: function(e3) {
      var t3 = this, n3 = [0], i2 = [null], r2 = [], o2 = this.table, s2 = "", a2 = 0, u2 = 0, c2 = 0;
      this.lexer.setInput(e3), this.lexer.yy = this.yy, this.yy.lexer = this.lexer, this.yy.parser = this, void 0 === this.lexer.yylloc && (this.lexer.yylloc = {});
      var l2 = this.lexer.yylloc;
      r2.push(l2);
      var h2 = this.lexer.options && this.lexer.options.ranges;
      "function" == typeof this.yy.parseError && (this.parseError = this.yy.parseError);
      for (var p2, d2, g2, m2, f, X, y, v, b, S = {}; ; ) {
        if (g2 = n3[n3.length - 1], this.defaultActions[g2] ? m2 = this.defaultActions[g2] : (null !== p2 && void 0 !== p2 || (p2 = (function() {
          var e4;
          return e4 = t3.lexer.lex() || 1, "number" != typeof e4 && (e4 = t3.symbols_[e4] || e4), e4;
        })()), m2 = o2[g2] && o2[g2][p2]), void 0 === m2 || !m2.length || !m2[0]) {
          var G = "";
          if (!c2) {
            b = [];
            for (X in o2[g2]) this.terminals_[X] && X > 2 && b.push("'" + this.terminals_[X] + "'");
            G = this.lexer.showPosition ? "Parse error on line " + (a2 + 1) + ":\n" + this.lexer.showPosition() + "\nExpecting " + b.join(", ") + ", got '" + (this.terminals_[p2] || p2) + "'" : "Parse error on line " + (a2 + 1) + ": Unexpected " + (1 == p2 ? "end of input" : "'" + (this.terminals_[p2] || p2) + "'"), this.parseError(G, { text: this.lexer.match, token: this.terminals_[p2] || p2, line: this.lexer.yylineno, loc: l2, expected: b });
          }
        }
        if (m2[0] instanceof Array && m2.length > 1) throw new Error("Parse Error: multiple actions possible at state: " + g2 + ", token: " + p2);
        switch (m2[0]) {
          case 1:
            n3.push(p2), i2.push(this.lexer.yytext), r2.push(this.lexer.yylloc), n3.push(m2[1]), p2 = null, d2 ? (p2 = d2, d2 = null) : (u2 = this.lexer.yyleng, s2 = this.lexer.yytext, a2 = this.lexer.yylineno, l2 = this.lexer.yylloc, c2 > 0 && c2--);
            break;
          case 2:
            if (y = this.productions_[m2[1]][1], S.$ = i2[i2.length - y], S._$ = { first_line: r2[r2.length - (y || 1)].first_line, last_line: r2[r2.length - 1].last_line, first_column: r2[r2.length - (y || 1)].first_column, last_column: r2[r2.length - 1].last_column }, h2 && (S._$.range = [r2[r2.length - (y || 1)].range[0], r2[r2.length - 1].range[1]]), void 0 !== (f = this.performAction.call(S, s2, u2, a2, this.yy, m2[1], i2, r2))) return f;
            y && (n3 = n3.slice(0, -1 * y * 2), i2 = i2.slice(0, -1 * y), r2 = r2.slice(0, -1 * y)), n3.push(this.productions_[m2[1]][0]), i2.push(S.$), r2.push(S._$), v = o2[n3[n3.length - 2]][n3[n3.length - 1]], n3.push(v);
            break;
          case 3:
            return true;
        }
      }
      return true;
    } }, n2 = (function() {
      var e3 = { EOF: 1, parseError: function(e4, t3) {
        if (!this.yy.parser) throw new Error(e4);
        this.yy.parser.parseError(e4, t3);
      }, setInput: function(e4) {
        return this._input = e4, this._more = this._less = this.done = false, this.yylineno = this.yyleng = 0, this.yytext = this.matched = this.match = "", this.conditionStack = ["INITIAL"], this.yylloc = { first_line: 1, first_column: 0, last_line: 1, last_column: 0 }, this.options.ranges && (this.yylloc.range = [0, 0]), this.offset = 0, this;
      }, input: function() {
        var e4 = this._input[0];
        return this.yytext += e4, this.yyleng++, this.offset++, this.match += e4, this.matched += e4, e4.match(/(?:\r\n?|\n).*/g) ? (this.yylineno++, this.yylloc.last_line++) : this.yylloc.last_column++, this.options.ranges && this.yylloc.range[1]++, this._input = this._input.slice(1), e4;
      }, unput: function(e4) {
        var t3 = e4.length, n3 = e4.split(/(?:\r\n?|\n)/g);
        this._input = e4 + this._input, this.yytext = this.yytext.substr(0, this.yytext.length - t3 - 1), this.offset -= t3;
        var i2 = this.match.split(/(?:\r\n?|\n)/g);
        this.match = this.match.substr(0, this.match.length - 1), this.matched = this.matched.substr(0, this.matched.length - 1), n3.length - 1 && (this.yylineno -= n3.length - 1);
        var r2 = this.yylloc.range;
        return this.yylloc = { first_line: this.yylloc.first_line, last_line: this.yylineno + 1, first_column: this.yylloc.first_column, last_column: n3 ? (n3.length === i2.length ? this.yylloc.first_column : 0) + i2[i2.length - n3.length].length - n3[0].length : this.yylloc.first_column - t3 }, this.options.ranges && (this.yylloc.range = [r2[0], r2[0] + this.yyleng - t3]), this;
      }, more: function() {
        return this._more = true, this;
      }, less: function(e4) {
        this.unput(this.match.slice(e4));
      }, pastInput: function() {
        var e4 = this.matched.substr(0, this.matched.length - this.match.length);
        return (e4.length > 20 ? "..." : "") + e4.substr(-20).replace(/\n/g, "");
      }, upcomingInput: function() {
        var e4 = this.match;
        return e4.length < 20 && (e4 += this._input.substr(0, 20 - e4.length)), (e4.substr(0, 20) + (e4.length > 20 ? "..." : "")).replace(/\n/g, "");
      }, showPosition: function() {
        var e4 = this.pastInput(), t3 = new Array(e4.length + 1).join("-");
        return e4 + this.upcomingInput() + "\n" + t3 + "^";
      }, next: function() {
        if (this.done) return this.EOF;
        this._input || (this.done = true);
        var e4, t3, n3, i2, r2;
        this._more || (this.yytext = "", this.match = "");
        for (var o2 = this._currentRules(), s2 = 0; s2 < o2.length && (!(n3 = this._input.match(this.rules[o2[s2]])) || t3 && !(n3[0].length > t3[0].length) || (t3 = n3, i2 = s2, this.options.flex)); s2++) ;
        return t3 ? (r2 = t3[0].match(/(?:\r\n?|\n).*/g), r2 && (this.yylineno += r2.length), this.yylloc = { first_line: this.yylloc.last_line, last_line: this.yylineno + 1, first_column: this.yylloc.last_column, last_column: r2 ? r2[r2.length - 1].length - r2[r2.length - 1].match(/\r?\n?/)[0].length : this.yylloc.last_column + t3[0].length }, this.yytext += t3[0], this.match += t3[0], this.matches = t3, this.yyleng = this.yytext.length, this.options.ranges && (this.yylloc.range = [this.offset, this.offset += this.yyleng]), this._more = false, this._input = this._input.slice(t3[0].length), this.matched += t3[0], e4 = this.performAction.call(this, this.yy, this, o2[i2], this.conditionStack[this.conditionStack.length - 1]), this.done && this._input && (this.done = false), e4 || void 0) : "" === this._input ? this.EOF : this.parseError("Lexical error on line " + (this.yylineno + 1) + ". Unrecognized text.\n" + this.showPosition(), { text: "", token: null, line: this.yylineno });
      }, lex: function() {
        var e4 = this.next();
        return void 0 !== e4 ? e4 : this.lex();
      }, begin: function(e4) {
        this.conditionStack.push(e4);
      }, popState: function() {
        return this.conditionStack.pop();
      }, _currentRules: function() {
        return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
      }, topState: function() {
        return this.conditionStack[this.conditionStack.length - 2];
      }, pushState: function(e4) {
        this.begin(e4);
      } };
      return e3.options = {}, e3.performAction = function(e4, t3, n3, i2) {
        switch (n3) {
          case 0:
            return t3.yytext = "\\", 14;
          case 1:
            if ("\\" !== t3.yytext.slice(-1) && this.begin("mu"), "\\" === t3.yytext.slice(-1) && (t3.yytext = t3.yytext.substr(0, t3.yyleng - 1), this.begin("emu")), t3.yytext) return 14;
            break;
          case 2:
            return 14;
          case 3:
            return "\\" !== t3.yytext.slice(-1) && this.popState(), "\\" === t3.yytext.slice(-1) && (t3.yytext = t3.yytext.substr(0, t3.yyleng - 1)), 14;
          case 4:
            return t3.yytext = t3.yytext.substr(0, t3.yyleng - 4), this.popState(), 15;
          case 5:
            return 25;
          case 6:
            return 16;
          case 7:
            return 20;
          case 8:
          case 9:
            return 19;
          case 10:
            return 23;
          case 11:
            return 22;
          case 12:
            this.popState(), this.begin("com");
            break;
          case 13:
            return t3.yytext = t3.yytext.substr(3, t3.yyleng - 5), this.popState(), 15;
          case 14:
            return 22;
          case 15:
            return 37;
          case 16:
          case 17:
            return 36;
          case 18:
            return 40;
          case 19:
            break;
          case 20:
            return this.popState(), 24;
          case 21:
            return this.popState(), 18;
          case 22:
            return t3.yytext = t3.yytext.substr(1, t3.yyleng - 2).replace(/\\"/g, '"'), 31;
          case 23:
            return t3.yytext = t3.yytext.substr(1, t3.yyleng - 2).replace(/\\'/g, "'"), 31;
          case 24:
            return 38;
          case 25:
          case 26:
            return 33;
          case 27:
            return 32;
          case 28:
            return 36;
          case 29:
            return t3.yytext = t3.yytext.substr(1, t3.yyleng - 2), 36;
          case 30:
            return "INVALID";
          case 31:
            return 5;
        }
      }, e3.rules = [/^(?:\\\\(?=(\{\{)))/, /^(?:[^\x00]*?(?=(\{\{)))/, /^(?:[^\x00]+)/, /^(?:[^\x00]{2,}?(?=(\{\{|$)))/, /^(?:[\s\S]*?--\}\})/, /^(?:\{\{>)/, /^(?:\{\{#)/, /^(?:\{\{\/)/, /^(?:\{\{\^)/, /^(?:\{\{\s*else\b)/, /^(?:\{\{\{)/, /^(?:\{\{&)/, /^(?:\{\{!--)/, /^(?:\{\{![\s\S]*?\}\})/, /^(?:\{\{)/, /^(?:=)/, /^(?:\.(?=[}\/ ]))/, /^(?:\.\.)/, /^(?:[\/.])/, /^(?:\s+)/, /^(?:\}\}\})/, /^(?:\}\})/, /^(?:"(\\["]|[^"])*")/, /^(?:'(\\[']|[^'])*')/, /^(?:@)/, /^(?:true(?=[}\s]))/, /^(?:false(?=[}\s]))/, /^(?:-?[0-9]+(?=[}\s]))/, /^(?:[^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=[=}\s\/.]))/, /^(?:\[[^\]]*\])/, /^(?:.)/, /^(?:$)/], e3.conditions = { mu: { rules: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31], inclusive: false }, emu: { rules: [3], inclusive: false }, com: { rules: [4], inclusive: false }, INITIAL: { rules: [0, 1, 2, 31], inclusive: true } }, e3;
    })();
    return t2.lexer = n2, e2.prototype = t2, t2.Parser = e2, new e2();
  })();
  e.Parser = i, e.parse = function(t2) {
    return t2.constructor === e.AST.ProgramNode ? t2 : (e.Parser.yy = e.AST, e.Parser.parse(t2));
  }, e.AST = {}, e.AST.ProgramNode = function(t2, n2) {
    this.type = "program", this.statements = t2, n2 && (this.inverse = new e.AST.ProgramNode(n2));
  }, e.AST.MustacheNode = function(e2, t2, n2) {
    this.type = "mustache", this.escaped = !n2, this.hash = t2;
    var i2 = this.id = e2[0], r2 = this.params = e2.slice(1), o2 = this.eligibleHelper = i2.isSimple;
    this.isHelper = o2 && (r2.length || t2);
  }, e.AST.PartialNode = function(e2, t2) {
    this.type = "partial", this.partialName = e2, this.context = t2;
  }, e.AST.BlockNode = function(t2, n2, i2, r2) {
    !(function(t3, n3) {
      if (t3.original !== n3.original) throw new e.Exception(t3.original + " doesn't match " + n3.original);
    })(t2.id, r2), this.type = "block", this.mustache = t2, this.program = n2, this.inverse = i2, this.inverse && !this.program && (this.isInverse = true);
  }, e.AST.ContentNode = function(e2) {
    this.type = "content", this.string = e2;
  }, e.AST.HashNode = function(e2) {
    this.type = "hash", this.pairs = e2;
  }, e.AST.IdNode = function(t2) {
    this.type = "ID";
    for (var n2 = "", i2 = [], r2 = 0, o2 = 0, s2 = t2.length; o2 < s2; o2++) {
      var a2 = t2[o2].part;
      if (n2 += (t2[o2].separator || "") + a2, ".." === a2 || "." === a2 || "this" === a2) {
        if (i2.length > 0) throw new e.Exception("Invalid path: " + n2);
        ".." === a2 ? r2++ : this.isScoped = true;
      } else i2.push(a2);
    }
    this.original = n2, this.parts = i2, this.string = i2.join("."), this.depth = r2, this.isSimple = 1 === t2.length && !this.isScoped && 0 === r2, this.stringModeValue = this.string;
  }, e.AST.PartialNameNode = function(e2) {
    this.type = "PARTIAL_NAME", this.name = e2.original;
  }, e.AST.DataNode = function(e2) {
    this.type = "DATA", this.id = e2;
  }, e.AST.StringNode = function(e2) {
    this.type = "STRING", this.original = this.string = this.stringModeValue = e2;
  }, e.AST.IntegerNode = function(e2) {
    this.type = "INTEGER", this.original = this.integer = e2, this.stringModeValue = Number(e2);
  }, e.AST.BooleanNode = function(e2) {
    this.type = "BOOLEAN", this.bool = e2, this.stringModeValue = "true" === e2;
  }, e.AST.CommentNode = function(e2) {
    this.type = "comment", this.comment = e2;
  };
  var r = ["description", "fileName", "lineNumber", "message", "name", "number", "stack"];
  e.Exception = function(e2) {
    for (var t2 = Error.prototype.constructor.apply(this, arguments), n2 = 0; n2 < r.length; n2++) this[r[n2]] = t2[r[n2]];
  }, e.Exception.prototype = new Error(), e.SafeString = function(e2) {
    this.string = e2;
  }, e.SafeString.prototype.toString = function() {
    return this.string.toString();
  };
  var o = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;", "`": "&#x60;" }, s = /[&<>"'`]/g, a = /[&<>"'`]/, u = function(e2) {
    return o[e2] || "&amp;";
  };
  e.Utils = { extend: function(e2, t2) {
    for (var n2 in t2) t2.hasOwnProperty(n2) && (e2[n2] = t2[n2]);
  }, escapeExpression: function(t2) {
    return t2 instanceof e.SafeString ? t2.toString() : null == t2 || false === t2 ? "" : (t2 = t2.toString(), a.test(t2) ? t2.replace(s, u) : t2);
  }, isEmpty: function(e2) {
    return !e2 && 0 !== e2 || "[object Array]" === n.call(e2) && 0 === e2.length;
  } };
  var c = e.Compiler = function() {
  }, l = e.JavaScriptCompiler = function() {
  };
  c.prototype = { compiler: c, disassemble: function() {
    for (var e2, t2, n2, i2 = this.opcodes, r2 = [], o2 = 0, s2 = i2.length; o2 < s2; o2++) if (e2 = i2[o2], "DECLARE" === e2.opcode) r2.push("DECLARE " + e2.name + "=" + e2.value);
    else {
      t2 = [];
      for (var a2 = 0; a2 < e2.args.length; a2++) n2 = e2.args[a2], "string" == typeof n2 && (n2 = '"' + n2.replace("\n", "\\n") + '"'), t2.push(n2);
      r2.push(e2.opcode + " " + t2.join(" "));
    }
    return r2.join("\n");
  }, equals: function(e2) {
    var t2 = this.opcodes.length;
    if (e2.opcodes.length !== t2) return false;
    for (var n2 = 0; n2 < t2; n2++) {
      var i2 = this.opcodes[n2], r2 = e2.opcodes[n2];
      if (i2.opcode !== r2.opcode || i2.args.length !== r2.args.length) return false;
      for (var o2 = 0; o2 < i2.args.length; o2++) if (i2.args[o2] !== r2.args[o2]) return false;
    }
    if (t2 = this.children.length, e2.children.length !== t2) return false;
    for (n2 = 0; n2 < t2; n2++) if (!this.children[n2].equals(e2.children[n2])) return false;
    return true;
  }, guid: 0, compile: function(e2, t2) {
    this.children = [], this.depths = { list: [] }, this.options = t2;
    var n2 = this.options.knownHelpers;
    if (this.options.knownHelpers = { helperMissing: true, blockHelperMissing: true, each: true, if: true, unless: true, with: true, logRow: true }, n2) for (var i2 in n2) this.options.knownHelpers[i2] = n2[i2];
    return this.program(e2);
  }, accept: function(e2) {
    return this[e2.type](e2);
  }, program: function(e2) {
    var t2, n2 = e2.statements;
    this.opcodes = [];
    for (var i2 = 0, r2 = n2.length; i2 < r2; i2++) t2 = n2[i2], this[t2.type](t2);
    return this.isSimple = 1 === r2, this.depths.list = this.depths.list.sort(function(e3, t3) {
      return e3 - t3;
    }), this;
  }, compileProgram: function(e2) {
    var t2, n2 = new this.compiler().compile(e2, this.options), i2 = this.guid++;
    this.usePartial = this.usePartial || n2.usePartial, this.children[i2] = n2;
    for (var r2 = 0, o2 = n2.depths.list.length; r2 < o2; r2++) (t2 = n2.depths.list[r2]) < 2 || this.addDepth(t2 - 1);
    return i2;
  }, block: function(e2) {
    var t2 = e2.mustache, n2 = e2.program, i2 = e2.inverse;
    n2 && (n2 = this.compileProgram(n2)), i2 && (i2 = this.compileProgram(i2));
    var r2 = this.classifyMustache(t2);
    "helper" === r2 ? this.helperMustache(t2, n2, i2) : "simple" === r2 ? (this.simpleMustache(t2), this.opcode("pushProgram", n2), this.opcode("pushProgram", i2), this.opcode("emptyHash"), this.opcode("blockValue")) : (this.ambiguousMustache(t2, n2, i2), this.opcode("pushProgram", n2), this.opcode("pushProgram", i2), this.opcode("emptyHash"), this.opcode("ambiguousBlockValue")), this.opcode("append");
  }, hash: function(e2) {
    var t2, n2, i2 = e2.pairs;
    this.opcode("pushHash");
    for (var r2 = 0, o2 = i2.length; r2 < o2; r2++) t2 = i2[r2], n2 = t2[1], this.options.stringParams ? (n2.depth && this.addDepth(n2.depth), this.opcode("getContext", n2.depth || 0), this.opcode("pushStringParam", n2.stringModeValue, n2.type)) : this.accept(n2), this.opcode("assignToHash", t2[0]);
    this.opcode("popHash");
  }, partial: function(e2) {
    var t2 = e2.partialName;
    this.usePartial = true, e2.context ? this.ID(e2.context) : this.opcode("push", "depth0"), this.opcode("invokePartial", t2.name), this.opcode("append");
  }, content: function(e2) {
    this.opcode("appendContent", e2.string);
  }, mustache: function(e2) {
    var t2 = this.options, n2 = this.classifyMustache(e2);
    "simple" === n2 ? this.simpleMustache(e2) : "helper" === n2 ? this.helperMustache(e2) : this.ambiguousMustache(e2), e2.escaped && !t2.noEscape ? this.opcode("appendEscaped") : this.opcode("append");
  }, ambiguousMustache: function(e2, t2, n2) {
    var i2 = e2.id, r2 = i2.parts[0], o2 = null != t2 || null != n2;
    this.opcode("getContext", i2.depth), this.opcode("pushProgram", t2), this.opcode("pushProgram", n2), this.opcode("invokeAmbiguous", r2, o2);
  }, simpleMustache: function(e2) {
    var t2 = e2.id;
    "DATA" === t2.type ? this.DATA(t2) : t2.parts.length ? this.ID(t2) : (this.addDepth(t2.depth), this.opcode("getContext", t2.depth), this.opcode("pushContext")), this.opcode("resolvePossibleLambda");
  }, helperMustache: function(e2, t2, n2) {
    var i2 = this.setupFullMustacheParams(e2, t2, n2), r2 = e2.id.parts[0];
    if (this.options.knownHelpers[r2]) this.opcode("invokeKnownHelper", i2.length, r2);
    else {
      if (this.options.knownHelpersOnly) throw new Error("You specified knownHelpersOnly, but used the unknown helper " + r2);
      this.opcode("invokeHelper", i2.length, r2);
    }
  }, ID: function(e2) {
    this.addDepth(e2.depth), this.opcode("getContext", e2.depth), e2.parts[0] ? this.opcode("lookupOnContext", e2.parts[0]) : this.opcode("pushContext");
    for (var t2 = 1, n2 = e2.parts.length; t2 < n2; t2++) this.opcode("lookup", e2.parts[t2]);
  }, DATA: function(t2) {
    if (this.options.data = true, t2.id.isScoped || t2.id.depth) throw new e.Exception("Scoped data references are not supported: " + t2.original);
    this.opcode("lookupData");
    for (var n2 = t2.id.parts, i2 = 0, r2 = n2.length; i2 < r2; i2++) this.opcode("lookup", n2[i2]);
  }, STRING: function(e2) {
    this.opcode("pushString", e2.string);
  }, INTEGER: function(e2) {
    this.opcode("pushLiteral", e2.integer);
  }, BOOLEAN: function(e2) {
    this.opcode("pushLiteral", e2.bool);
  }, comment: function() {
  }, opcode: function(e2) {
    this.opcodes.push({ opcode: e2, args: [].slice.call(arguments, 1) });
  }, declare: function(e2, t2) {
    this.opcodes.push({ opcode: "DECLARE", name: e2, value: t2 });
  }, addDepth: function(e2) {
    if (isNaN(e2)) throw new Error("EWOT");
    0 !== e2 && (this.depths[e2] || (this.depths[e2] = true, this.depths.list.push(e2)));
  }, classifyMustache: function(e2) {
    var t2 = e2.isHelper, n2 = e2.eligibleHelper, i2 = this.options;
    if (n2 && !t2) {
      var r2 = e2.id.parts[0];
      i2.knownHelpers[r2] ? t2 = true : i2.knownHelpersOnly && (n2 = false);
    }
    return t2 ? "helper" : n2 ? "ambiguous" : "simple";
  }, pushParams: function(e2) {
    for (var t2, n2 = e2.length; n2--; ) t2 = e2[n2], this.options.stringParams ? (t2.depth && this.addDepth(t2.depth), this.opcode("getContext", t2.depth || 0), this.opcode("pushStringParam", t2.stringModeValue, t2.type)) : this[t2.type](t2);
  }, setupMustacheParams: function(e2) {
    var t2 = e2.params;
    return this.pushParams(t2), e2.hash ? this.hash(e2.hash) : this.opcode("emptyHash"), t2;
  }, setupFullMustacheParams: function(e2, t2, n2) {
    var i2 = e2.params;
    return this.pushParams(i2), this.opcode("pushProgram", t2), this.opcode("pushProgram", n2), e2.hash ? this.hash(e2.hash) : this.opcode("emptyHash"), i2;
  } };
  var h = function(e2) {
    this.value = e2;
  };
  l.prototype = { nameLookup: function(e2, t2) {
    return /^[0-9]+$/.test(t2) ? e2 + "[" + t2 + "]" : l.isValidJavaScriptVariableName(t2) ? e2 + "." + t2 : e2 + "['" + t2 + "']";
  }, appendToBuffer: function(e2) {
    return this.environment.isSimple ? "return " + e2 + ";" : { appendToBuffer: true, content: e2, toString: function() {
      return "buffer += " + e2 + ";";
    } };
  }, initializeBuffer: function() {
    return this.quotedString("");
  }, namespace: "Handlebars", compile: function(t2, n2, i2, r2) {
    this.environment = t2, this.options = n2 || {}, e.logRow(e.logger.DEBUG, this.environment.disassemble() + "\n\n"), this.name = this.environment.name, this.isChild = !!i2, this.context = i2 || { programs: [], environments: [], aliases: {} }, this.preamble(), this.stackSlot = 0, this.stackVars = [], this.registers = { list: [] }, this.compileStack = [], this.inlineStack = [], this.compileChildren(t2, n2);
    var o2, s2 = t2.opcodes;
    for (this.i = 0, m = s2.length; this.i < m; this.i++) o2 = s2[this.i], "DECLARE" === o2.opcode ? this[o2.name] = o2.value : this[o2.opcode].apply(this, o2.args);
    return this.createFunctionContext(r2);
  }, nextOpcode: function() {
    return this.environment.opcodes[this.i + 1];
  }, eat: function() {
    this.i = this.i + 1;
  }, preamble: function() {
    var e2 = [];
    if (this.isChild) e2.push("");
    else {
      var t2 = this.namespace, n2 = "helpers = this.merge(helpers, " + t2 + ".helpers);";
      this.environment.usePartial && (n2 = n2 + " partials = this.merge(partials, " + t2 + ".partials);"), this.options.data && (n2 += " data = data || {};"), e2.push(n2);
    }
    this.environment.isSimple ? e2.push("") : e2.push(", buffer = " + this.initializeBuffer()), this.lastContext = 0, this.source = e2;
  }, createFunctionContext: function(t2) {
    var n2 = this.stackVars.concat(this.registers.list);
    if (n2.length > 0 && (this.source[1] = this.source[1] + ", " + n2.join(", ")), !this.isChild) for (var i2 in this.context.aliases) this.context.aliases.hasOwnProperty(i2) && (this.source[1] = this.source[1] + ", " + i2 + "=" + this.context.aliases[i2]);
    this.source[1] && (this.source[1] = "var " + this.source[1].substring(2) + ";"), this.isChild || (this.source[1] += "\n" + this.context.programs.join("\n") + "\n"), this.environment.isSimple || this.source.push("return buffer;");
    for (var r2 = this.isChild ? ["depth0", "data"] : ["Handlebars", "depth0", "helpers", "partials", "data"], o2 = 0, s2 = this.environment.depths.list.length; o2 < s2; o2++) r2.push("depth" + this.environment.depths.list[o2]);
    var a2 = this.mergeSource();
    if (!this.isChild) {
      var u2 = e.COMPILER_REVISION;
      a2 = "this.compilerInfo = [" + u2 + ",'" + e.REVISION_CHANGES[u2] + "'];\n" + a2;
    }
    if (t2) return r2.push(a2), Function.apply(this, r2);
    var c2 = "function " + (this.name || "") + "(" + r2.join(",") + ") {\n  " + a2 + "}";
    return e.logRow(e.logger.DEBUG, c2 + "\n\n"), c2;
  }, mergeSource: function() {
    for (var e2, n2 = "", i2 = 0, r2 = this.source.length; i2 < r2; i2++) {
      var o2 = this.source[i2];
      o2.appendToBuffer ? e2 = e2 ? e2 + "\n    + " + o2.content : o2.content : (e2 && (n2 += "buffer += " + e2 + ";\n  ", e2 = t), n2 += o2 + "\n  ");
    }
    return n2;
  }, blockValue: function() {
    this.context.aliases.blockHelperMissing = "helpers.blockHelperMissing";
    var e2 = ["depth0"];
    this.setupParams(0, e2), this.replaceStack(function(t2) {
      return e2.splice(1, 0, t2), "blockHelperMissing.call(" + e2.join(", ") + ")";
    });
  }, ambiguousBlockValue: function() {
    this.context.aliases.blockHelperMissing = "helpers.blockHelperMissing";
    var e2 = ["depth0"];
    this.setupParams(0, e2);
    var t2 = this.topStack();
    e2.splice(1, 0, t2), e2[e2.length - 1] = "options", this.source.push("if (!" + this.lastHelper + ") { " + t2 + " = blockHelperMissing.call(" + e2.join(", ") + "); }");
  }, appendContent: function(e2) {
    this.source.push(this.appendToBuffer(this.quotedString(e2)));
  }, append: function() {
    this.flushInline();
    var e2 = this.popStack();
    this.source.push("if(" + e2 + " || " + e2 + " === 0) { " + this.appendToBuffer(e2) + " }"), this.environment.isSimple && this.source.push("else { " + this.appendToBuffer("''") + " }");
  }, appendEscaped: function() {
    this.context.aliases.escapeExpression = "this.escapeExpression", this.source.push(this.appendToBuffer("escapeExpression(" + this.popStack() + ")"));
  }, getContext: function(e2) {
    this.lastContext !== e2 && (this.lastContext = e2);
  }, lookupOnContext: function(e2) {
    this.push(this.nameLookup("depth" + this.lastContext, e2, "context"));
  }, pushContext: function() {
    this.pushStackLiteral("depth" + this.lastContext);
  }, resolvePossibleLambda: function() {
    this.context.aliases.functionType = '"function"', this.replaceStack(function(e2) {
      return "typeof " + e2 + " === functionType ? " + e2 + ".apply(depth0) : " + e2;
    });
  }, lookup: function(e2) {
    this.replaceStack(function(t2) {
      return t2 + " == null || " + t2 + " === false ? " + t2 + " : " + this.nameLookup(t2, e2, "context");
    });
  }, lookupData: function(e2) {
    this.push("data");
  }, pushStringParam: function(e2, t2) {
    this.pushStackLiteral("depth" + this.lastContext), this.pushString(t2), "string" == typeof e2 ? this.pushString(e2) : this.pushStackLiteral(e2);
  }, emptyHash: function() {
    this.pushStackLiteral("{}"), this.options.stringParams && (this.register("hashTypes", "{}"), this.register("hashContexts", "{}"));
  }, pushHash: function() {
    this.hash = { values: [], types: [], contexts: [] };
  }, popHash: function() {
    var e2 = this.hash;
    this.hash = t, this.options.stringParams && (this.register("hashContexts", "{" + e2.contexts.join(",") + "}"), this.register("hashTypes", "{" + e2.types.join(",") + "}")), this.push("{\n    " + e2.values.join(",\n    ") + "\n  }");
  }, pushString: function(e2) {
    this.pushStackLiteral(this.quotedString(e2));
  }, push: function(e2) {
    return this.inlineStack.push(e2), e2;
  }, pushLiteral: function(e2) {
    this.pushStackLiteral(e2);
  }, pushProgram: function(e2) {
    null != e2 ? this.pushStackLiteral(this.programExpression(e2)) : this.pushStackLiteral(null);
  }, invokeHelper: function(e2, t2) {
    this.context.aliases.helperMissing = "helpers.helperMissing";
    var n2 = this.lastHelper = this.setupHelper(e2, t2, true), i2 = this.nameLookup("depth" + this.lastContext, t2, "context");
    this.push(n2.name + " || " + i2), this.replaceStack(function(e3) {
      return e3 + " ? " + e3 + ".call(" + n2.callParams + ") : helperMissing.call(" + n2.helperMissingParams + ")";
    });
  }, invokeKnownHelper: function(e2, t2) {
    var n2 = this.setupHelper(e2, t2);
    this.push(n2.name + ".call(" + n2.callParams + ")");
  }, invokeAmbiguous: function(e2, t2) {
    this.context.aliases.functionType = '"function"', this.pushStackLiteral("{}");
    var n2 = this.setupHelper(0, e2, t2), i2 = this.lastHelper = this.nameLookup("helpers", e2, "helper"), r2 = this.nameLookup("depth" + this.lastContext, e2, "context"), o2 = this.nextStack();
    this.source.push("if (" + o2 + " = " + i2 + ") { " + o2 + " = " + o2 + ".call(" + n2.callParams + "); }"), this.source.push("else { " + o2 + " = " + r2 + "; " + o2 + " = typeof " + o2 + " === functionType ? " + o2 + ".apply(depth0) : " + o2 + "; }");
  }, invokePartial: function(e2) {
    var t2 = [this.nameLookup("partials", e2, "partial"), "'" + e2 + "'", this.popStack(), "helpers", "partials"];
    this.options.data && t2.push("data"), this.context.aliases.self = "this", this.push("self.invokePartial(" + t2.join(", ") + ")");
  }, assignToHash: function(e2) {
    var t2, n2, i2 = this.popStack();
    this.options.stringParams && (n2 = this.popStack(), t2 = this.popStack());
    var r2 = this.hash;
    t2 && r2.contexts.push("'" + e2 + "': " + t2), n2 && r2.types.push("'" + e2 + "': " + n2), r2.values.push("'" + e2 + "': (" + i2 + ")");
  }, compiler: l, compileChildren: function(e2, t2) {
    for (var n2, i2, r2 = e2.children, o2 = 0, s2 = r2.length; o2 < s2; o2++) {
      n2 = r2[o2], i2 = new this.compiler();
      var a2 = this.matchExistingProgram(n2);
      null == a2 ? (this.context.programs.push(""), a2 = this.context.programs.length, n2.index = a2, n2.name = "program" + a2, this.context.programs[a2] = i2.compile(n2, t2, this.context), this.context.environments[a2] = n2) : (n2.index = a2, n2.name = "program" + a2);
    }
  }, matchExistingProgram: function(e2) {
    for (var t2 = 0, n2 = this.context.environments.length; t2 < n2; t2++) {
      var i2 = this.context.environments[t2];
      if (i2 && i2.equals(e2)) return t2;
    }
  }, programExpression: function(e2) {
    if (this.context.aliases.self = "this", null == e2) return "self.noop";
    for (var t2, n2 = this.environment.children[e2], i2 = n2.depths.list, r2 = [n2.index, n2.name, "data"], o2 = 0, s2 = i2.length; o2 < s2; o2++) t2 = i2[o2], 1 === t2 ? r2.push("depth0") : r2.push("depth" + (t2 - 1));
    return (0 === i2.length ? "self.program(" : "self.programWithDepth(") + r2.join(", ") + ")";
  }, register: function(e2, t2) {
    this.useRegister(e2), this.source.push(e2 + " = " + t2 + ";");
  }, useRegister: function(e2) {
    this.registers[e2] || (this.registers[e2] = true, this.registers.list.push(e2));
  }, pushStackLiteral: function(e2) {
    return this.push(new h(e2));
  }, pushStack: function(e2) {
    this.flushInline();
    var t2 = this.incrStack();
    return e2 && this.source.push(t2 + " = " + e2 + ";"), this.compileStack.push(t2), t2;
  }, replaceStack: function(e2) {
    var t2, n2 = "", i2 = this.isInline();
    if (i2) {
      var r2 = this.popStack(true);
      if (r2 instanceof h) t2 = r2.value;
      else {
        var o2 = this.stackSlot ? this.topStackName() : this.incrStack();
        n2 = "(" + this.push(o2) + " = " + r2 + "),", t2 = this.topStack();
      }
    } else t2 = this.topStack();
    var s2 = e2.call(this, t2);
    return i2 ? ((this.inlineStack.length || this.compileStack.length) && this.popStack(), this.push("(" + n2 + s2 + ")")) : (/^stack/.test(t2) || (t2 = this.nextStack()), this.source.push(t2 + " = (" + n2 + s2 + ");")), t2;
  }, nextStack: function() {
    return this.pushStack();
  }, incrStack: function() {
    return this.stackSlot++, this.stackSlot > this.stackVars.length && this.stackVars.push("stack" + this.stackSlot), this.topStackName();
  }, topStackName: function() {
    return "stack" + this.stackSlot;
  }, flushInline: function() {
    var e2 = this.inlineStack;
    if (e2.length) {
      this.inlineStack = [];
      for (var t2 = 0, n2 = e2.length; t2 < n2; t2++) {
        var i2 = e2[t2];
        i2 instanceof h ? this.compileStack.push(i2) : this.pushStack(i2);
      }
    }
  }, isInline: function() {
    return this.inlineStack.length;
  }, popStack: function(e2) {
    var t2 = this.isInline(), n2 = (t2 ? this.inlineStack : this.compileStack).pop();
    return !e2 && n2 instanceof h ? n2.value : (t2 || this.stackSlot--, n2);
  }, topStack: function(e2) {
    var t2 = this.isInline() ? this.inlineStack : this.compileStack, n2 = t2[t2.length - 1];
    return !e2 && n2 instanceof h ? n2.value : n2;
  }, quotedString: function(e2) {
    return '"' + e2.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029") + '"';
  }, setupHelper: function(e2, t2, n2) {
    var i2 = [];
    return this.setupParams(e2, i2, n2), { params: i2, name: this.nameLookup("helpers", t2, "helper"), callParams: ["depth0"].concat(i2).join(", "), helperMissingParams: n2 && ["depth0", this.quotedString(t2)].concat(i2).join(", ") };
  }, setupParams: function(e2, t2, n2) {
    var i2, r2, o2, s2 = [], a2 = [], u2 = [];
    s2.push("hash:" + this.popStack()), r2 = this.popStack(), ((o2 = this.popStack()) || r2) && (o2 || (this.context.aliases.self = "this", o2 = "self.noop"), r2 || (this.context.aliases.self = "this", r2 = "self.noop"), s2.push("inverse:" + r2), s2.push("fn:" + o2));
    for (var c2 = 0; c2 < e2; c2++) i2 = this.popStack(), t2.push(i2), this.options.stringParams && (u2.push(this.popStack()), a2.push(this.popStack()));
    return this.options.stringParams && (s2.push("contexts:[" + a2.join(",") + "]"), s2.push("types:[" + u2.join(",") + "]"), s2.push("hashContexts:hashContexts"), s2.push("hashTypes:hashTypes")), this.options.data && s2.push("data:data"), s2 = "{" + s2.join(",") + "}", n2 ? (this.register("options", s2), t2.push("options")) : t2.push(s2), t2.join(", ");
  } };
  for (var p = "break else new var case finally return void catch for switch while continue function this with default if throw delete in try do instanceof typeof abstract enum int short boolean export interface static byte extends long super char final native synchronized class float package throws const goto private transient debugger implements protected volatile double import public let yield".split(" "), d = l.RESERVED_WORDS = {}, g = 0, m = p.length; g < m; g++) d[p[g]] = true;
  l.isValidJavaScriptVariableName = function(e2) {
    return !(l.RESERVED_WORDS[e2] || !/^[a-zA-Z_$][0-9a-zA-Z_$]+$/.test(e2));
  }, e.precompile = function(t2, n2) {
    if (null == t2 || "string" != typeof t2 && t2.constructor !== e.AST.ProgramNode) throw new e.Exception("You must pass a string or Handlebars AST to Handlebars.precompile. You passed " + t2);
    "data" in (n2 = n2 || {}) || (n2.data = true);
    var i2 = e.parse(t2), r2 = new c().compile(i2, n2);
    return new l().compile(r2, n2);
  }, e.compile = function(n2, i2) {
    function r2() {
      var r3 = e.parse(n2), o3 = new c().compile(r3, i2), s2 = new l().compile(o3, i2, t, true);
      return e.template(s2);
    }
    if (null == n2 || "string" != typeof n2 && n2.constructor !== e.AST.ProgramNode) throw new e.Exception("You must pass a string or Handlebars AST to Handlebars.compile. You passed " + n2);
    "data" in (i2 = i2 || {}) || (i2.data = true);
    var o2;
    return function(e2, t2) {
      return o2 || (o2 = r2()), o2.call(this, e2, t2);
    };
  }, e.VM = { template: function(t2) {
    var n2 = { escapeExpression: e.Utils.escapeExpression, invokePartial: e.VM.invokePartial, programs: [], program: function(t3, n3, i2) {
      var r2 = this.programs[t3];
      return i2 ? r2 = e.VM.program(t3, n3, i2) : r2 || (r2 = this.programs[t3] = e.VM.program(t3, n3)), r2;
    }, merge: function(t3, n3) {
      var i2 = t3 || n3;
      return t3 && n3 && (i2 = {}, e.Utils.extend(i2, n3), e.Utils.extend(i2, t3)), i2;
    }, programWithDepth: e.VM.programWithDepth, noop: e.VM.noop, compilerInfo: null };
    return function(i2, r2) {
      r2 = r2 || {};
      var o2 = t2.call(n2, e, i2, r2.helpers, r2.partials, r2.data), s2 = n2.compilerInfo || [], a2 = s2[0] || 1, u2 = e.COMPILER_REVISION;
      if (a2 !== u2) {
        if (a2 < u2) {
          throw "Template was precompiled with an older version of Handlebars than the current runtime. Please update your precompiler to a newer version (" + e.REVISION_CHANGES[u2] + ") or downgrade your runtime to an older version (" + e.REVISION_CHANGES[a2] + ").";
        }
        throw "Template was precompiled with a newer version of Handlebars than the current runtime. Please update your runtime to a newer version (" + s2[1] + ").";
      }
      return o2;
    };
  }, programWithDepth: function(e2, t2, n2) {
    var i2 = Array.prototype.slice.call(arguments, 3), r2 = function(e3, r3) {
      return r3 = r3 || {}, t2.apply(this, [e3, r3.data || n2].concat(i2));
    };
    return r2.program = e2, r2.depth = i2.length, r2;
  }, program: function(e2, t2, n2) {
    var i2 = function(e3, i3) {
      return i3 = i3 || {}, t2(e3, i3.data || n2);
    };
    return i2.program = e2, i2.depth = 0, i2;
  }, noop: function() {
    return "";
  }, invokePartial: function(n2, i2, r2, o2, s2, a2) {
    var u2 = { helpers: o2, partials: s2, data: a2 };
    if (n2 === t) throw new e.Exception("The partial " + i2 + " could not be found");
    if (n2 instanceof Function) return n2(r2, u2);
    if (e.compile) return s2[i2] = e.compile(n2, { data: a2 !== t }), s2[i2](r2, u2);
    throw new e.Exception("The partial " + i2 + " could not be compiled when running in runtime-only mode");
  } }, e.template = e.VM.template;
})(Handlebars), define("lib/handlebars", function() {
});
