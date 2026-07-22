(function attachEnemyCodex(root) {
  "use strict";

  const TAU = Math.PI * 2;
  const entries = Object.freeze([
    Object.freeze({
      id: "scout",
      code: "SCOUT",
      name: "浮游体",
      role: "游荡抢球",
      color: "#ff5c62",
      description: "在场地中随机游荡。只有球进入抢球范围后才会转向追逐，不会主动避开玩家身体。",
      traits: Object.freeze(["随机游荡", "范围内优先抢球", "不会主动避障"])
    }),
    Object.freeze({
      id: "forager",
      code: "FORAGER",
      name: "觅食者",
      role: "稳定觅食",
      color: "#ff8a4c",
      description: "持续寻找并追逐球，抢到的球会在被摧毁时全部返还场地。不会主动避开玩家身体，容易被蛇身截杀。",
      traits: Object.freeze(["主动追逐球", "移动稳定", "不会主动避障"])
    }),
    Object.freeze({
      id: "courier",
      code: "COURIER",
      name: "搬运者",
      role: "持续搬运",
      color: "#d95cff",
      description: "始终寻找最密集的球群并持续抢球。接近玩家身体时优先避障，绕开后继续搬运。",
      traits: Object.freeze(["持续寻找球群", "避障优先于抢球", "永不主动撤离"])
    }),
    Object.freeze({
      id: "charger",
      code: "CHARGER",
      name: "冲角者",
      role: "追头压迫",
      color: "#ff477e",
      description: "持续朝最近玩家的蛇头移动，以渐进转向和左右摆动追踪目标；接近玩家机体时优先避开。",
      traits: Object.freeze(["持续追踪蛇头", "保留摆动与渐进转向", "会主动避障"])
    }),
    Object.freeze({
      id: "cutter",
      code: "CUTTER",
      name: "截断者",
      role: "预测封路",
      color: "#f4c542",
      description: "读取最近玩家的移动方向，瞄准其前方并从侧面横切路线。它不执着于球，而是主动制造蛇身封锁。",
      traits: Object.freeze(["预测玩家前进方向", "侧向切入封路", "会主动避障"])
    }),
    Object.freeze({
      id: "coiler",
      code: "HUNTER",
      name: "巡猎者",
      role: "高速觅食",
      color: "#08c7dc",
      description: "持续寻找并追逐抢球范围内的球，凭借强化的速度与转向能力快速觅食；接近玩家身体时会主动避障。",
      traits: Object.freeze(["持续追逐附近球", "速度与转向强化", "会主动避障"])
    }),
    Object.freeze({
      id: "warden",
      code: "WARDEN",
      name: "守卫者",
      role: "重装游荡",
      color: "#70d6ff",
      description: "在场地中随机游荡，只有球进入抢球范围后才顺手追逐；会主动避开玩家身体，厚重头部仍能造成更强击退。",
      traits: Object.freeze(["随机游荡", "范围内顺手抢球", "会主动避障"])
    })
  ]);
  const byId = Object.freeze(Object.fromEntries(entries.map((entry) => [entry.id, entry])));

  function roundedRectPath(context, x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width / 2, height / 2);
    context.moveTo(x + safeRadius, y);
    context.lineTo(x + width - safeRadius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
    context.lineTo(x + width, y + height - safeRadius);
    context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
    context.lineTo(x + safeRadius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
    context.lineTo(x, y + safeRadius);
    context.quadraticCurveTo(x, y, x + safeRadius, y);
  }

  function traceSegment(context, id) {
    switch (id) {
      case "scout":
        context.moveTo(10, 0); context.lineTo(0, 6); context.lineTo(-9, 0); context.lineTo(0, -6); context.closePath();
        break;
      case "courier":
        roundedRectPath(context, -11, -7, 22, 14, 3); context.closePath();
        break;
      case "charger":
        context.moveTo(11, 0); context.lineTo(1, 9); context.lineTo(-9, 6); context.lineTo(-5, 0); context.lineTo(-9, -6); context.lineTo(1, -9); context.closePath();
        break;
      case "cutter":
        context.moveTo(10, 0); context.lineTo(0, 11); context.lineTo(-5, 4); context.lineTo(-11, 0); context.lineTo(-5, -4); context.lineTo(0, -11); context.closePath();
        break;
      case "coiler":
        context.arc(0, 0, 9, 0, TAU);
        break;
      case "warden":
        context.moveTo(8, -9); context.lineTo(11, -4); context.lineTo(11, 4); context.lineTo(8, 9); context.lineTo(-8, 9); context.lineTo(-11, 4); context.lineTo(-11, -4); context.lineTo(-8, -9); context.closePath();
        break;
      default:
        context.moveTo(10, 0); context.lineTo(4, 9); context.lineTo(-8, 7); context.lineTo(-11, 0); context.lineTo(-8, -7); context.lineTo(4, -9); context.closePath();
    }
  }

  function traceHead(context, id) {
    switch (id) {
      case "scout":
        context.moveTo(19, 0); context.lineTo(-8, 9); context.lineTo(-3, 0); context.lineTo(-8, -9); context.closePath();
        break;
      case "courier":
        context.moveTo(18, 0); context.lineTo(9, 9); context.lineTo(-11, 9); context.lineTo(-16, 4); context.lineTo(-16, -4); context.lineTo(-11, -9); context.lineTo(9, -9); context.closePath();
        break;
      case "charger":
        context.moveTo(21, 0); context.lineTo(8, 7); context.lineTo(3, 15); context.lineTo(-1, 9); context.lineTo(-14, 10); context.lineTo(-10, 0); context.lineTo(-14, -10); context.lineTo(-1, -9); context.lineTo(3, -15); context.lineTo(8, -7); context.closePath();
        break;
      case "cutter":
        context.moveTo(18, 0); context.lineTo(2, 15); context.lineTo(-3, 9); context.lineTo(-15, 5); context.lineTo(-11, 0); context.lineTo(-15, -5); context.lineTo(-3, -9); context.lineTo(2, -15); context.closePath();
        break;
      case "coiler":
        context.arc(0, 0, 14, 0, TAU);
        break;
      case "warden":
        context.moveTo(16, 0); context.lineTo(10, 13); context.lineTo(-8, 15); context.lineTo(-17, 8); context.lineTo(-17, -8); context.lineTo(-8, -15); context.lineTo(10, -13); context.closePath();
        break;
      default:
        context.moveTo(18, 0); context.lineTo(8, 12); context.lineTo(-7, 11); context.lineTo(-15, 5); context.lineTo(-12, 0); context.lineTo(-15, -5); context.lineTo(-7, -11); context.lineTo(8, -12); context.closePath();
    }
  }

  function drawSegment(context, entry, piece) {
    context.save();
    context.translate(piece.x, piece.y);
    context.rotate(piece.angle);
    context.fillStyle = "#171b1e";
    context.strokeStyle = entry.color;
    context.lineWidth = entry.id === "warden" ? 2.5 : 1.8;
    context.beginPath();
    traceSegment(context, entry.id);
    context.fill();
    context.stroke();
    context.fillStyle = entry.color;
    context.globalAlpha = 0.78;
    if (entry.id === "coiler") {
      context.lineWidth = 2;
      context.beginPath();
      context.arc(0, 0, 4.5, 0.2, TAU * 0.86);
      context.stroke();
    } else if (entry.id === "courier") {
      context.fillRect(-5, -5, 9, 10);
      context.fillStyle = "#f4f6f5";
      context.fillRect(-2, -4, 2, 8);
    } else if (entry.id === "cutter") {
      context.fillRect(-7, -1.5, 14, 3);
    } else if (entry.id === "warden") {
      context.strokeStyle = "#ffffff";
      context.lineWidth = 1;
      context.strokeRect(-6, -5, 12, 10);
    } else {
      context.fillRect(-7, -2, 11, 4);
    }
    context.restore();
  }

  function drawHead(context, entry, piece) {
    context.save();
    context.translate(piece.x, piece.y);
    context.rotate(piece.angle);
    context.shadowColor = entry.color;
    context.shadowBlur = entry.id === "warden" ? 19 : 14;
    context.fillStyle = "#101416";
    context.strokeStyle = entry.id === "warden" ? entry.color : "#eff1f0";
    context.lineWidth = entry.id === "warden" ? 3 : 1.7;
    context.beginPath();
    traceHead(context, entry.id);
    context.fill();
    context.stroke();
    context.shadowBlur = 0;
    context.fillStyle = entry.color;
    context.beginPath();
    if (entry.id === "coiler") {
      context.lineWidth = 3;
      context.strokeStyle = entry.color;
      context.arc(0, 0, 8, 0.25, TAU * 0.9);
      context.stroke();
    } else if (entry.id === "warden") {
      context.strokeStyle = "#ffffff";
      context.lineWidth = 1.4;
      context.strokeRect(-10, -9, 18, 18);
      context.fillRect(8, -8, 5, 16);
    } else if (entry.id === "cutter") {
      context.fillRect(-8, -2, 24, 4);
    } else if (entry.id === "courier") {
      context.fillRect(-12, -6, 10, 12);
      context.fillStyle = "#ffffff";
      context.fillRect(-8, -5, 2, 10);
    } else {
      context.moveTo(entry.id === "charger" ? 21 : 18, 0);
      context.lineTo(7, 6);
      context.lineTo(7, -6);
      context.closePath();
      context.fill();
    }
    context.fillStyle = "#f7f8f7";
    context.fillRect(2, -7, 5, 3);
    context.fillRect(2, 4, 5, 3);
    context.fillStyle = "#080a0b";
    context.fillRect(4, -7, 2, 3);
    context.fillRect(4, 4, 2, 3);
    context.restore();
  }

  function drawPreview(canvas, enemyId) {
    const entry = byId[enemyId];
    const context = canvas?.getContext?.("2d");
    if (!entry || !context) return false;
    const width = canvas.width || 520;
    const height = canvas.height || 250;
    const logicalWidth = 520;
    const logicalHeight = 250;
    const scale = Math.min(width / logicalWidth, height / logicalHeight);
    const offsetX = (width - logicalWidth * scale) / 2;
    const offsetY = (height - logicalHeight * scale) / 2;
    const pieces = [
      { x: 392, y: 96, angle: -0.12 },
      { x: 343, y: 103, angle: -0.16 },
      { x: 295, y: 119, angle: -0.28 },
      { x: 251, y: 145, angle: -0.45 },
      { x: 214, y: 178, angle: -0.66 },
      { x: 178, y: 196, angle: -0.42 }
    ];

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#0b0f11";
    context.fillRect(0, 0, width, height);
    context.save();
    context.translate(offsetX, offsetY);
    context.scale(scale, scale);
    context.strokeStyle = "rgba(255,255,255,0.06)";
    context.lineWidth = 1;
    for (let x = 16; x < logicalWidth; x += 32) {
      context.beginPath(); context.moveTo(x, 0); context.lineTo(x, logicalHeight); context.stroke();
    }
    for (let y = 16; y < logicalHeight; y += 32) {
      context.beginPath(); context.moveTo(0, y); context.lineTo(logicalWidth, y); context.stroke();
    }
    context.fillStyle = "rgba(255,255,255,0.035)";
    context.fillRect(0, 0, logicalWidth, 4);
    context.fillStyle = entry.color;
    context.fillRect(0, 0, 112, 4);

    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(pieces[0].x, pieces[0].y);
    for (const piece of pieces.slice(1)) context.lineTo(piece.x, piece.y);
    context.strokeStyle = "rgba(3,5,6,0.96)";
    context.lineWidth = entry.id === "warden" ? 15 : 12;
    context.stroke();
    context.strokeStyle = entry.color;
    context.globalAlpha = 0.72;
    context.lineWidth = entry.id === "cutter" ? 3.8 : 2.4;
    context.stroke();
    context.globalAlpha = 1;
    for (let index = pieces.length - 1; index >= 1; index -= 1) drawSegment(context, entry, pieces[index]);
    drawHead(context, entry, pieces[0]);

    context.fillStyle = entry.color;
    context.font = "900 11px Bahnschrift, Arial, sans-serif";
    context.textAlign = "left";
    context.textBaseline = "bottom";
    context.fillText(entry.code, 20, logicalHeight - 17);
    context.fillStyle = "rgba(244,246,245,0.55)";
    context.font = "700 9px Bahnschrift, Arial, sans-serif";
    context.fillText("HEAD + FULL BODY PROFILE", 20, logicalHeight - 5);
    context.restore();
    return true;
  }

  root.GSS0EnemyCodex = Object.freeze({ entries, byId, drawPreview });
})(globalThis);
