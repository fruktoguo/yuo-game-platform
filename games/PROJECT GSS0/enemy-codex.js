(function attachEnemyCodex(root) {
  "use strict";

  const TAU = Math.PI * 2;
  const entries = Object.freeze([
    Object.freeze({
      id: "scout",
      code: "SCOUT",
      name: "浮游体",
      role: "高速游荡",
      color: "#ff5c62",
      description: "轻快灵活的基础敌人。通常随意游荡，偶尔会转向附近的球，用不断变化的路线干扰玩家。",
      traits: Object.freeze(["转向灵敏", "偶尔争抢附近球", "身体较短，容易击破"])
    }),
    Object.freeze({
      id: "forager",
      code: "FORAGER",
      name: "觅食者",
      role: "稳定觅食",
      color: "#ff8a4c",
      description: "持续在附近寻找球并追逐目标。它的行动容易被球群牵引，抢到的球会在被摧毁时全部返还场地。",
      traits: Object.freeze(["主动追逐球", "移动稳定", "适合用球群诱导路线"])
    }),
    Object.freeze({
      id: "courier",
      code: "COURIER",
      name: "搬运者",
      role: "抢球撤离",
      color: "#d95cff",
      description: "优先冲向最密集的球群。携带足够战利品后会放弃觅食，转而远离最近的玩家并保存收获。",
      traits: Object.freeze(["寻找球群", "满载后主动撤离", "速度较快"])
    }),
    Object.freeze({
      id: "charger",
      code: "CHARGER",
      name: "冲角者",
      role: "锁定冲锋",
      color: "#ff477e",
      description: "发现玩家后短暂蓄势，锁定当时的方向高速直冲。预告阶段可以避让，冲锋开始后它无法临时转向。",
      traits: Object.freeze(["冲锋前有明确预告", "直线爆发速度高", "巡航转向较慢"])
    }),
    Object.freeze({
      id: "cutter",
      code: "CUTTER",
      name: "截断者",
      role: "预测封路",
      color: "#f4c542",
      description: "读取最近玩家的移动方向，瞄准其前方并从侧面横切路线。它不执着于球，而是主动制造蛇身封锁。",
      traits: Object.freeze(["预测玩家前进方向", "侧向切入封路", "身体较长"])
    }),
    Object.freeze({
      id: "coiler",
      code: "COILER",
      name: "盘踞者",
      role: "区域盘旋",
      color: "#08c7dc",
      description: "寻找密集球群并围绕目标持续盘旋。它会逐渐把身体铺在资源周围，迫使玩家改变进入和撤离路线。",
      traits: Object.freeze(["围绕球群盘旋", "转向灵活", "擅长占据资源区"])
    }),
    Object.freeze({
      id: "warden",
      code: "WARDEN",
      name: "守卫者",
      role: "重装护卫",
      color: "#70d6ff",
      description: "优先护卫携带球最多的敌人；没有护卫目标时才自行觅食。厚重身体和强力头撞会把玩家推得更远。",
      traits: Object.freeze(["保护高价值敌人", "生命和身体长度较高", "蛇头击退更强"])
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
