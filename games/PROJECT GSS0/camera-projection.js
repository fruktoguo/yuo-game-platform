(() => {
  "use strict";

  const EPSILON = 1e-9;
  const MAXIMUM_STRENGTH = 1.5;
  const MAXIMUM_ROLL_RADIANS = 2 * Math.PI / 180;

  function writeIdentity(matrix) {
    matrix[0] = 1;
    matrix[1] = 0;
    matrix[2] = 0;
    matrix[3] = 1;
    matrix[4] = 0;
    matrix[5] = 0;
  }

  function invertAffine(source, target) {
    const a = source[0];
    const b = source[1];
    const c = source[2];
    const d = source[3];
    const determinant = a * d - b * c;
    if (Math.abs(determinant) < EPSILON) {
      writeIdentity(target);
      return false;
    }
    const inverseDeterminant = 1 / determinant;
    target[0] = d * inverseDeterminant;
    target[1] = -b * inverseDeterminant;
    target[2] = -c * inverseDeterminant;
    target[3] = a * inverseDeterminant;
    target[4] = -(target[0] * source[4] + target[2] * source[5]);
    target[5] = -(target[1] * source[4] + target[3] * source[5]);
    return true;
  }

  function transformPoint(matrix, x, y, target) {
    target.x = matrix[0] * x + matrix[2] * y + matrix[4];
    target.y = matrix[1] * x + matrix[3] * y + matrix[5];
    return target;
  }

  function create() {
    const forward = new Float64Array(6);
    const inverse = new Float64Array(6);
    const billboard = new Float64Array(4);
    const projectedPoint = { x: 0, y: 0 };
    const unprojectedPoint = { x: 0, y: 0 };
    let transform = "none";
    writeIdentity(forward);
    writeIdentity(inverse);
    billboard[0] = 1;
    billboard[3] = 1;

    function reset() {
      writeIdentity(forward);
      writeIdentity(inverse);
      billboard[0] = 1;
      billboard[1] = 0;
      billboard[2] = 0;
      billboard[3] = 1;
      transform = "none";
    }

    function update(
      width,
      height,
      axisX,
      axisY,
      strength,
      pitchForeshortening,
      yawShear,
      rollDegrees,
      verticalAimInfluence
    ) {
      const safeStrength = Math.min(MAXIMUM_STRENGTH, Math.max(0, Number(strength) || 0));
      if (safeStrength < EPSILON) {
        reset();
        return transform;
      }

      const safeWidth = Math.max(1, Number(width) || 1);
      const safeHeight = Math.max(1, Number(height) || 1);
      const axisLength = Math.hypot(axisX, axisY);
      const directionX = axisLength >= EPSILON ? axisX / axisLength : 0;
      const directionY = axisLength >= EPSILON ? axisY / axisLength : 0;
      const pitchInfluence = Math.max(
        0.55,
        1 + directionY * Math.max(0, Number(verticalAimInfluence) || 0)
      );
      const pitchAmount = Math.min(
        0.24,
        Math.max(0, Number(pitchForeshortening) || 0) * safeStrength * pitchInfluence
      );
      const depthScale = Math.max(0.76, 1 - pitchAmount);
      const shear = Math.max(
        -0.08,
        Math.min(0.08, directionX * Math.max(0, Number(yawShear) || 0) * safeStrength)
      );
      const roll = Math.max(
        -MAXIMUM_ROLL_RADIANS,
        Math.min(
          MAXIMUM_ROLL_RADIANS,
          directionX * Math.max(0, Number(rollDegrees) || 0) * Math.PI / 180 * safeStrength
        )
      );
      const cosine = Math.cos(roll);
      const sine = Math.sin(roll);

      // A stable shallow-pitch stage: aim can only add bounded yaw/roll. Unlike
      // the V137 homography, parallel edges remain parallel and cannot collapse
      // into an unplayable trapezoid.
      forward[0] = cosine;
      forward[1] = sine;
      forward[2] = cosine * shear - sine * depthScale;
      forward[3] = sine * shear + cosine * depthScale;
      const centerX = safeWidth / 2;
      const centerY = safeHeight / 2;
      forward[4] = centerX - forward[0] * centerX - forward[2] * centerY;
      forward[5] = centerY - forward[1] * centerX - forward[3] * centerY;

      if (!invertAffine(forward, inverse)) {
        reset();
        return transform;
      }
      billboard[0] = inverse[0];
      billboard[1] = inverse[1];
      billboard[2] = inverse[2];
      billboard[3] = inverse[3];
      transform = `matrix(${forward[0]},${forward[1]},${forward[2]},${forward[3]},${forward[4]},${forward[5]})`;
      return transform;
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
      projectAngle(angle) {
        const x = Math.cos(angle);
        const y = Math.sin(angle);
        return Math.atan2(forward[1] * x + forward[3] * y, forward[0] * x + forward[2] * y);
      },
      matrix() {
        return forward;
      },
      billboardMatrix() {
        return billboard;
      },
      scale() {
        return 1;
      },
      transform() {
        return transform;
      }
    });
  }

  globalThis.GSS0CameraProjection = Object.freeze({ create });
})();
