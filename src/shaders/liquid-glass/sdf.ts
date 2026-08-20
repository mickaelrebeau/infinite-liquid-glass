// @ts-nocheck
import { Fn, abs, float, length, max, min, vec2 } from 'three/tsl'

export function createRoundedRectSdfNodes(planeSizeNode, radiusNode) {
  const halfSize = planeSizeNode.mul(0.5)

  const roundedSdfAt = Fn(([planePos]) => {
    const radius = min(radiusNode, min(halfSize.x, halfSize.y))
    const inset = abs(planePos).sub(halfSize).add(radius)
    return length(max(inset, vec2(0)))
      .add(min(max(inset.x, inset.y), float(0)))
      .sub(radius)
  })

  const edgeDistanceAt = Fn(([planePos]) => roundedSdfAt(planePos).negate())

  return { halfSize, roundedSdfAt, edgeDistanceAt }
}
