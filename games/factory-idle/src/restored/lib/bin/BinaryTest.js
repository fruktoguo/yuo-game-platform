/**
 * 从 Factory Idle 浏览器 bundle 恢复。
 * AMD 模块：lib/bin/BinaryTest
 */
var BinaryTest = function() {
};
BinaryTest.test = function() {
  var e = new ArrayBuffer(2), t = new DataView(e, 0);
  t.setUint8(0, 97), t.setInt8(1, 255);
  for (var n = [{ value: "a", writeMethod: "writeChar", readMethod: "readChar" }, { value: 255, expectedValue: -1, writeMethod: "writeInt8", readMethod: "readInt8" }, { value: -1, expectedValue: -1, writeMethod: "writeUint8", readMethod: "readInt8" }, { value: 255, writeMethod: "writeInt16", readMethod: "readInt16" }, { value: 255, writeMethod: "writeInt32", readMethod: "readInt32" }, { value: 255, writeMethod: "writeUint8", readMethod: "readUint8" }, { value: -1, expectedValue: 255, writeMethod: "writeUint8", readMethod: "readUint8" }, { value: 255, writeMethod: "writeUint16", readMethod: "readUint16" }, { value: 255, writeMethod: "writeUint32", readMethod: "readUint32" }, { value: 1 / 3, writeMethod: "writeFloat64", readMethod: "readFloat64" }, { value: 112345e245, writeMethod: "writeFloat64", readMethod: "readFloat64" }, { value: new BinaryBoolean().writeAll(0, 1, 0, 1, 0, 1, 0, 1), expectedValue: 170, writeMethod: "writeBooleanMap", readMethod: "readBooleanMap" }, { value: new BinaryBoolean().writeAll(1, 0, 1, 0, 1, 0, 1, 0), expectedValue: 85, writeMethod: "writeBooleanMap", readMethod: "readBooleanMap" }], i = new BinaryArrayWriter(), r = 0; r < n.length; r++) i[n[r].writeMethod](n[r].value);
  var o = new BinaryArrayWriter();
  o.writeInt16(2055), o.writeUint8(77), i.writeWriter(o);
  for (var s = 0, a = new BinaryArrayReader(i.getBuffer()), r = 0; r < n.length; r++) {
    var u = a[n[r].readMethod](), c = void 0 === n[r].expectedValue ? n[r].value : n[r].expectedValue;
    u.toString() == c.toString() ? s++ : console.warn("Test " + r + " error: " + u + "!=" + c + " ");
  }
  var l = a.readReader(), h = l.readInt16(), p = l.readUint8();
  2055 == h && 77 == p || console.warn("Test writeWriter/readReader error: " + h + "," + p + " ");
  var d = new BinaryBoolean().writeAll(1, 0, 1, 0, 0, 0, 0, 0).reverse(), h = d.readBoolean(), p = d.readBoolean(), g = d.readBoolean();
  1 == h && 0 == p && 1 == g || console.warn("Test booleanMap error: " + u + "!=true ");
  var i = new BinaryArrayWriter(), m = new BinaryBoolean().writeBoolean(true).writeBoolean(false).writeBoolean(true).fillZero();
  i.writeBooleanMap(m);
  var a = new BinaryArrayReader(i.getBuffer()), f = a.readBooleanMap();
  1 == f.readBoolean() && 0 == f.readBoolean() && 1 == f.readBoolean() || console.warn("Test booleanMap 2 error: "), console.log("BinaryTest passes: " + s);
}, define("lib/bin/BinaryTest", function() {
});
