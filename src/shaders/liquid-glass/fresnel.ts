// @ts-nocheck
import { Fn, dot, float, pow, saturate } from 'three/tsl'

export function createFresnelNodes(fresnelF0, fresnelPower, fresnelIntensity) {
  const fresnelAt = Fn(([planeNormal, viewDir]) => {
    const facing = saturate(dot(planeNormal, viewDir))
    const schlick = fresnelF0.add(
      float(1).sub(fresnelF0).mul(pow(float(1).sub(facing), fresnelPower)),
    )
    return schlick.mul(fresnelIntensity)
  })

  return { fresnelAt }
}
