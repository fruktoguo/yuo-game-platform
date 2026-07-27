/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/InputOutputManager
 */
define("game/InputOutputManager", [], function() {
  var e = { top: "bottom", bottom: "top", left: "right", right: "left" }, t = function(e2, t2) {
    this.tile = e2, this.changedCallback = t2, this.inputsList = [], this.inputsByDirection = { top: null, right: null, bottom: null, left: null }, this.outputsList = [], this.outputsByDirection = { top: null, right: null, bottom: null, left: null }, this.reset();
  };
  return t.prototype.reset = function() {
    this.clearInput("top"), this.clearInput("right"), this.clearInput("bottom"), this.clearInput("left"), this.clearOutput("top"), this.clearOutput("right"), this.clearOutput("bottom"), this.clearOutput("left");
  }, t.prototype.setInput = function(t2) {
    if (!this.inputsByDirection[t2]) {
      this.clearOutput(t2);
      var n = this.tile.getTileInDirection(t2);
      this.inputsByDirection[t2] = n, this._updateInputOutputLists(), n.getInputOutputManager().setOutput(e[t2]), this.changedCallback();
    }
  }, t.prototype.setOutput = function(t2) {
    if (!this.outputsByDirection[t2]) {
      this.clearInput(t2);
      var n = this.tile.getTileInDirection(t2);
      this.outputsByDirection[t2] = n, this._updateInputOutputLists(), n.getInputOutputManager().setInput(e[t2]), this.changedCallback();
    }
  }, t.prototype.clearInput = function(t2) {
    if (this.inputsByDirection[t2]) {
      var n = this.inputsByDirection[t2];
      this.inputsByDirection[t2] = null, n.getInputOutputManager().clearOutput(e[t2]), this._updateInputOutputLists(), this.changedCallback();
    }
  }, t.prototype.clearOutput = function(t2) {
    if (this.outputsByDirection[t2]) {
      var n = this.outputsByDirection[t2];
      this.outputsByDirection[t2] = null, n.getInputOutputManager().clearInput(e[t2]), this._updateInputOutputLists(), this.changedCallback();
    }
  }, t.prototype._updateInputOutputLists = function() {
    this.inputsList = [], this.inputsByDirection.top && this.inputsList.push(this.inputsByDirection.top), this.inputsByDirection.right && this.inputsList.push(this.inputsByDirection.right), this.inputsByDirection.bottom && this.inputsList.push(this.inputsByDirection.bottom), this.inputsByDirection.left && this.inputsList.push(this.inputsByDirection.left), this.outputsList = [], this.outputsByDirection.top && this.outputsList.push(this.outputsByDirection.top), this.outputsByDirection.right && this.outputsList.push(this.outputsByDirection.right), this.outputsByDirection.bottom && this.outputsList.push(this.outputsByDirection.bottom), this.outputsByDirection.left && this.outputsList.push(this.outputsByDirection.left);
  }, t.prototype.getInputsList = function() {
    return this.inputsList;
  }, t.prototype.getInputsByDirection = function() {
    return this.inputsByDirection;
  }, t.prototype.getOutputsList = function() {
    return this.outputsList;
  }, t.prototype.getOutputsByDirection = function() {
    return this.outputsByDirection;
  }, t.prototype.exportToWriter = function(e2) {
    var t2 = new BinaryBoolean().writeAll(this.inputsByDirection.top, this.inputsByDirection.right, this.inputsByDirection.bottom, this.inputsByDirection.left, this.outputsByDirection.top, this.outputsByDirection.right, this.outputsByDirection.bottom, this.outputsByDirection.left);
    e2.writeBooleanMap(t2);
  }, t.prototype.importFromReader = function(e2, t2) {
    var n = e2.readBooleanMap();
    n.readBoolean() && this.setInput("top"), n.readBoolean() && this.setInput("right"), n.readBoolean() && this.setInput("bottom"), n.readBoolean() && this.setInput("left"), n.readBoolean() && this.setOutput("top"), n.readBoolean() && this.setOutput("right"), n.readBoolean() && this.setOutput("bottom"), n.readBoolean() && this.setOutput("left");
  }, t;
});
