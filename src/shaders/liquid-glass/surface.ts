// @ts-nocheck
import { Fn, clamp, float, length, max, min, normalize, pow, vec2, vec3 } from 'three/tsl'

export function createSurfaceNodes(
  sdfNodes,
  bevelWidth,
  bevelPower,
  bevelMaxSlope,
  thickness,
) {
  const { roundedSdfAt } = sdfNodes

  const edgeFactorAt = Fn(([sdfValue]) =>
    clamp(
      float(1).add(sdfValue.div(max(bevelWidth, float(0.001)))),
      float(0),
      float(1),
    ),
  )

  const surfaceHeightAt = Fn(([planePos]) => {
    const sdfValue = roundedSdfAt(planePos)
    const edgeFactor = edgeFactorAt(sdfValue)
    const power = max(bevelPower, float(1))
    return pow(
      max(float(1).sub(pow(float(1).sub(edgeFactor), power)), float(0)),
      float(1).div(power),
    ).mul(thickness)
  })

  const surfaceNormalAt = Fn(([planePos]) => {
    const step = max(bevelWidth.mul(0.08), float(0.004))
    const gradient = vec2(
      surfaceHeightAt(planePos.add(vec2(step, 0))).sub(
        surfaceHeightAt(planePos.sub(vec2(step, 0))),
      ),
      surfaceHeightAt(planePos.add(vec2(0, step))).sub(
        surfaceHeightAt(planePos.sub(vec2(0, step))),
      ),
    ).div(step.mul(2))
    const gradientLength = length(gradient)
    const clamped = gradient.mul(
      min(gradientLength, bevelMaxSlope).div(max(gradientLength, float(0.0001))),
    )
    return normalize(vec3(clamped.negate(), float(1)))
  })

  return { edgeFactorAt, surfaceHeightAt, surfaceNormalAt, roundedSdfAt }
}
