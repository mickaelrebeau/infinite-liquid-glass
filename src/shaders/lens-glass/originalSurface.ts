// @ts-nocheck
/**
 * Surface verre du site original (bundle 03lo820gl57km.js) :
 * l(p) = sqrt(max(r²−|p|², 1)), u(p) = l(p)−r, h(p) = bevel(c(p)), n = normalize(m−∇h, 1) avec m = p/l(p).
 */
import {
  Fn,
  abs,
  clamp,
  dot,
  float,
  length,
  max,
  min,
  normalize,
  pow,
  sqrt,
  vec2,
  vec3,
} from 'three/tsl'

export function createOriginalGlassNodes(
  uPlaneSize,
  uCornerRadius,
  uSphereRadius,
  uBevelWidth,
  uBevelPower,
  uBevelMaxSlope,
  uThickness,
) {
  const halfSize = uPlaneSize.mul(0.5)

  const sphereLiftRawAt = Fn(([planePos]) => {
    const radiusSq = uSphereRadius.mul(uSphereRadius)
    return sqrt(max(radiusSq.sub(dot(planePos, planePos)), float(1)))
  })

  const spherePositionZAt = Fn(([planePos]) =>
    sphereLiftRawAt(planePos).sub(uSphereRadius),
  )

  const roundedSdfAt = Fn(([planePos]) => {
    const radius = min(uCornerRadius, min(halfSize.x, halfSize.y))
    const inset = abs(planePos).sub(halfSize).add(radius)
    return length(max(inset, vec2(0)))
      .add(min(max(inset.x, inset.y), float(0)))
      .sub(radius)
  })

  const bevelHeightFromSdf = Fn(([sdfValue]) => {
    const edgeFactor = clamp(
      float(1).add(sdfValue.div(max(uBevelWidth, float(0.001)))),
      float(0),
      float(1),
    )
    const power = max(uBevelPower, float(1))
    return pow(
      max(float(1).sub(pow(edgeFactor, power)), float(0)),
      float(1).div(power),
    ).mul(uThickness)
  })

  const surfaceHeightAt = Fn(([planePos]) =>
    bevelHeightFromSdf(roundedSdfAt(planePos)),
  )

  const glassNormalAt = Fn(([planePos]) => {
    const step = max(uBevelWidth.mul(0.06), float(0.35))
    const gradient = vec2(
      surfaceHeightAt(planePos.add(vec2(step, 0))).sub(
        surfaceHeightAt(planePos.sub(vec2(step, 0))),
      ),
      surfaceHeightAt(planePos.add(vec2(0, step))).sub(
        surfaceHeightAt(planePos.sub(vec2(0, step))),
      ),
    ).div(step.mul(2))

    const gradientLength = length(gradient)
    const clampedGradient = gradient.mul(
      min(gradientLength, uBevelMaxSlope).div(max(gradientLength, float(0.0001))),
    )

    const sphereDir = planePos.div(sphereLiftRawAt(planePos))
    return normalize(vec3(sphereDir.sub(clampedGradient), float(1)))
  })

  return {
    halfSize,
    sphereLiftRawAt,
    spherePositionZAt,
    roundedSdfAt,
    surfaceHeightAt,
    glassNormalAt,
  }
}
