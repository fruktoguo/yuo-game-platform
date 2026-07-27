/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：game/strategy/Transport
 */
define("game/strategy/Transport", ["game/strategy/helper/TransportStackingQueue"], function(e) {
  var t = { top: "bottom", bottom: "top", left: "right", right: "left" }, n = function(e2, t2) {
    this.component = e2, this.meta = t2, this.tile = this.component.getMainTile(), this.reset();
  };
  return n.prototype.clearContents = function() {
    this.updateInputsOutputs();
  }, n.prototype.reset = function() {
    this.inputQueueOffset = 0, this.inputQueuesList = [], this.inputQueues = {}, this.outputQueueOffset = 0, this.outputQueuesList = [], this.outputQueues = {}, this.isBridge = false;
  }, n.getMetaDescriptionData = function(e2, t2, n2) {
    e2.strategy;
    return {};
  }, n.prototype.getDescriptionData = function() {
    return n.getMetaDescriptionData(this.component.getMeta(), this.component.getFactory(), this);
  }, n.prototype.updateInputsOutputs = function() {
    this.reset();
    var t2 = this.component.getMainTile(), n2 = t2.getInputOutputManager().getInputsByDirection();
    for (var i in n2) if (n2[i]) {
      var r = new e(this.meta.queueSize, this.tile);
      this.inputQueuesList.push(r), this.inputQueues[i] = r;
    }
    var o = t2.getInputOutputManager().getOutputsByDirection();
    for (var s in o) if (o[s]) {
      var r = new e(this.meta.queueSize, this.tile);
      this.outputQueuesList.push(r), this.outputQueues[s] = r;
    }
    var a = this.outputQueues.top && this.inputQueues.bottom || this.outputQueues.bottom && this.inputQueues.top, u = this.outputQueues.left && this.inputQueues.right || this.outputQueues.right && this.inputQueues.left;
    this.isBridge = a && u;
  }, n.prototype.getOutputQueues = function(e2) {
    return this.outputQueues;
  }, n.prototype.getOutputQueue = function(e2) {
    return this.outputQueues[e2];
  }, n.prototype.getInputQueues = function(e2) {
    return this.inputQueues;
  }, n.prototype.getInputQueue = function(e2) {
    return this.inputQueues[e2];
  }, n.prototype.calculateTransport = function() {
    this.isBridge ? (this.moveInternalInputsToOutputsBridge("top", "bottom"), this.moveInternalInputsToOutputsBridge("left", "right")) : this.moveInternalInputsToOutputs(), this.pullFromOutsideToInputs("top", this.inputQueues.top), this.pullFromOutsideToInputs("right", this.inputQueues.right), this.pullFromOutsideToInputs("bottom", this.inputQueues.bottom), this.pullFromOutsideToInputs("left", this.inputQueues.left);
  }, n.prototype.moveInternalInputsToOutputsBridge = function(e2, t2) {
    if (this.inputQueues[t2]) {
      var n2 = e2;
      e2 = t2, t2 = n2;
    }
    var i = this.inputQueues[e2], r = this.outputQueues[t2], o = i.getLast();
    o && !r.getFirst() && (r.setFirst(o), i.unsetLast()), i.forward();
  }, n.prototype.moveInternalInputsToOutputs = function() {
    for (var e2 = 0, t2 = 0; t2 < this.inputQueuesList.length; t2++) {
      var n2 = this.inputQueuesList[(this.inputQueueOffset + t2) % this.inputQueuesList.length], i = n2.getLast();
      if (i) for (var r = 0; r < this.outputQueuesList.length; r++) {
        var o = (this.outputQueueOffset + r) % this.outputQueuesList.length;
        if (!this.outputQueuesList[o].getFirst()) {
          this.outputQueueOffset = (this.outputQueueOffset + 1) % this.outputQueuesList.length, this.outputQueuesList[o].setFirst(i), n2.unsetLast(), e2++;
          break;
        }
      }
      n2.forward();
    }
    this.inputQueueOffset = (this.inputQueueOffset + e2) % this.inputQueuesList.length;
  }, n.prototype.pullFromOutsideToInputs = function(e2, n2) {
    if (n2) {
      var i = this.tile.getTileInDirection(e2), r = i.getComponent();
      if ("transport" == r.getMeta().strategy.type) {
        var o = r.getStrategy().getOutputQueue(t[e2]);
        !n2.getFirst() && o.getLast() && (n2.setFirst(o.getLast()), o.unsetLast()), o.forward();
      }
    }
  }, n.prototype.toString = function() {
    var e2 = "IN offset:" + this.inputQueueOffset + "<br />";
    for (var t2 in this.inputQueues) {
      for (var n2 = "", i = this.inputQueues[t2].getQueue(), r = 0; r < i.length; r++) n2 += (i[r] ? i[r].getResourceId() : "") + ",";
      e2 += t2 + ": " + n2 + "<br />";
    }
    e2 += "<br />", e2 += "OUT offset:" + this.outputQueueOffset + "<br />";
    for (var t2 in this.outputQueues) {
      for (var i = this.outputQueues[t2].getQueue(), n2 = "", r = 0; r < i.length; r++) n2 += (i[r] ? i[r].getResourceId() : "") + ",";
      e2 += t2 + ": " + n2 + "<br />";
    }
    return e2;
  }, n.prototype.exportToWriter = function(e2) {
    var t2 = function(t3) {
      t3 && t3.exportToWriter(e2);
    };
    e2.writeUint8(this.inputQueueOffset), e2.writeUint8(this.outputQueueOffset), t2(this.inputQueues.top), t2(this.inputQueues.right), t2(this.inputQueues.bottom), t2(this.inputQueues.left), t2(this.outputQueues.top), t2(this.outputQueues.right), t2(this.outputQueues.bottom), t2(this.outputQueues.left);
  }, n.prototype.importFromReader = function(e2, t2) {
    var n2 = function(n3) {
      n3 && n3.importFromReader(e2, t2);
    };
    this.inputQueueOffset = e2.readUint8(), this.outputQueueOffset = e2.readUint8(), n2(this.inputQueues.top), n2(this.inputQueues.right), n2(this.inputQueues.bottom), n2(this.inputQueues.left), n2(this.outputQueues.top), n2(this.outputQueues.right), n2(this.outputQueues.bottom), n2(this.outputQueues.left);
  }, n;
});
