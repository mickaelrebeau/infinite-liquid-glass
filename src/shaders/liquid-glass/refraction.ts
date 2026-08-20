// @ts-nocheck
import { Fn, float, pow, vec2 } from 'three/tsl'

export function createRefractionNodes(refractionStrength, thickness) {
  const refractionOffsetAt = Fn(([planeNormal, edgeFactor]) => {
    const edgeBoost = pow(float(1).sub(edgeFactor), float(0.65))
    return planeNormal.xy
      .mul(thickness)
      .mul(refractionStrength)
      .mul(edgeBoost.add(float(0.35)))
  })

  const refractedUvAt = Fn(([baseUv, offset]) => baseUv.add(offset))

  return { refractionOffsetAt, refractedUvAt }
}
