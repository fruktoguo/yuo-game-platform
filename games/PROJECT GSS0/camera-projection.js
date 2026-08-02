(() => {
  "use strict";

  const EPSILON = 1e-9;

  function writeIdentity(matrix) {
    matrix[0] = 1; matrix[1] = 0; matrix[2] = 0;
    matrix[3] = 0; matrix[4] = 1; matrix[5] = 0;
    matrix[6] = 0; matrix[7] = 0; matrix[8] = 1;
  }

  function invertMatrix(source, target) {
    const a = source[0];
    const b = source[1];
    const c = source[2];
    const d = source[3];
    const e = source[4];
    const f = source[5];
    const g = source[6];
    const h = source[7];
    const i = source[8];
    const determinant = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    if (Math.abs(determinant) < EPSILON) {
      writeIdentity(target);
      return false;
    }
    const inverseDeterminant = 1 / determinant;
    target[0] = (e * i - f * h) * inverseDeterminant;
    target[1] = (c * h - b * i) * inverseDeterminant;
    target[2] = (b * f - c * e) * inverseDeterminant;
    target[3] = (f * g - d * i) * inverseDeterminant;
    target[4] = (a * i - c * g) * inverseDeterminant;
    target[5] = (c * d - a * f) * inverseDeterminant;
    target[6] = (d * h - e * g) * inverseDeterminant;
    target[7] = (b * g - a * h) * inverseDeterminant;
    target[8] = (a * e - b * d) * inverseDeterminant;
    return true;
  }

  function writeRectangleToQuad(width, height, quad, target) {
    const x0 = quad[0]; const y0 = quad[1];
    const x1 = quad[2]; const y1 = quad[3];
    const x2 = quad[4]; const y2 = quad[5];
    const x3 = quad[6]; const y3 = quad[7];
    const dx1 = x1 - x2;
    const dx2 = x3 - x2;
    const dx3 = x0 - x1 + x2 - x3;
    const dy1 = y1 - y2;
    const dy2 = y3 - y2;
    const dy3 = y0 - y1 + y2 - y3;
    const denominator = dx1 * dy2 - dx2 * dy1;

    let projectiveX = 0;
    let projectiveY = 0;
    if (Math.abs(denominator) >= EPSILON) {
      projectiveX = (dx3 * dy2 - dx2 * dy3) / denominator;
      projectiveY = (dx1 * dy3 - dx3 * dy1) / denominator;
    }

    target[0] = (x1 - x0 + projectiveX * x1) / width;
    target[1] = (x3 - x0 + projectiveY * x3) / height;
    target[2] = x0;
    target[3] = (y1 - y0 + projectiveX * y1) / width;
    target[4] = (y3 - y0 + projectiveY * y3) / height;
    target[5] = y0;
    target[6] = projectiveX / width;
    target[7] = projectiveY / height;
    target[8] = 1;
  }

  function transformPoint(matrix, x, y, target) {
    const denominator = matrix[6] * x + matrix[7] * y + matrix[8];
    const safeDenominator = Math.abs(denominator) < EPSILON ? (denominator < 0 ? -EPSILON : EPSILON) : denominator;
    target.x = (matrix[0] * x + matrix[1] * y + matrix[2]) / safeDenominator;
    target.y = (matrix[3] * x + matrix[4] * y + matrix[5]) / safeDenominator;
    return target;
  }

  function create() {
    const forward = new Float64Array(9);
    const inverse = new Float64Array(9);
    const quad = new Float64Array(8);
    const projectedPoint = { x: 0, y: 0 };
    const unprojectedPoint = { x: 0, y: 0 };
    let visualScale = 1;
    let cssTransform = "none";
    writeIdentity(forward);
    writeIdentity(inverse);

    function reset() {
      writeIdentity(forward);
      writeIdentity(inverse);
      visualScale = 1;
      cssTransform = "none";
    }

    function update(width, height, axisX, axisY, strength, perspective, foreshortening, overscan) {
      const safeWidth = Math.max(1, Number(width) || 1);
      const safeHeight = Math.max(1, Number(height) || 1);
      const axisLength = Math.hypot(axisX, axisY);
      const safeStrength = Math.max(0, Number(strength) || 0);
      if (axisLength < EPSILON || safeStrength < EPSILON) {
        reset();
        return cssTransform;
      }

      const directionX = axisX / axisLength;
      const directionY = axisY / axisLength;
      const perspectiveAmount = Math.max(0, perspective) * safeStrength;
      const parallelScale = Math.max(0.35, 1 - Math.max(0, foreshortening) * safeStrength);
      visualScale = 1 + Math.max(0, overscan) * safeStrength;
      const halfWidth = safeWidth / 2;
      const halfHeight = safeHeight / 2;

      function projectCorner(index, normalizedX, normalizedY) {
        const parallel = normalizedX * directionX + normalizedY * directionY;
        const perpendicularX = normalizedX - directionX * parallel;
        const perpendicularY = normalizedY - directionY * parallel;
        const planeX = perpendicularX + directionX * parallel * parallelScale;
        const planeY = perpendicularY + directionY * parallel * parallelScale;
        const depth = Math.max(0.38, 1 + perspectiveAmount * parallel);
        quad[index] = halfWidth + halfWidth * visualScale * planeX / depth;
        quad[index + 1] = halfHeight + halfHeight * visualScale * planeY / depth;
      }

      projectCorner(0, -1, -1);
      projectCorner(2, 1, -1);
      projectCorner(4, 1, 1);
      projectCorner(6, -1, 1);
      writeRectangleToQuad(safeWidth, safeHeight, quad, forward);
      if (!invertMatrix(forward, inverse)) {
        reset();
        return cssTransform;
      }

      cssTransform = `matrix3d(${forward[0]},${forward[3]},0,${forward[6]},${forward[1]},${forward[4]},0,${forward[7]},0,0,1,0,${forward[2]},${forward[5]},0,${forward[8]})`;
      return cssTransform;
    }

    return Object.freeze({
      update,
      reset,
      project(x, y, target = projectedPoint) {
        return transformPoint(forward, x, y, target);
      },
      unproject(x, y, target = unprojectedPoint) {
        return transformPoint(inverse, x, y, target);
      },
      scale() {
        return visualScale;
      },
      transform() {
        return cssTransform;
      }
    });
  }

  globalThis.GSS0CameraProjection = Object.freeze({ create });
})();
