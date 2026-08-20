// @ts-nocheck
import { Fn, float, mx_noise_float, time, vec2, vec3 } from 'three/tsl'

export function createLiquidNoiseNodes(
  noiseScale,
  secondaryNoiseScale,
  noiseSpeed,
  warpStrength,
  liquidStrength,
) {
  const liquidNoiseAt = Fn(([planePos]) => {
    const t = time.mul(noiseSpeed)
    const n1 = mx_noise_float(planePos.mul(noiseScale).add(vec2(t, t.mul(0.73))))
    const warped = planePos.add(vec2(n1, n1.mul(0.85)).mul(warpStrength))
    const n2 = mx_noise_float(
      warped.mul(secondaryNoiseScale).sub(vec2(t.mul(0.6), t.mul(0.4))),
    )
    return n1.mul(0.5).add(n2.mul(0.5)).mul(liquidStrength)
  })

  const perturbNormal = Fn(([planeNormal, planePos]) => {
    const liquid = liquidNoiseAt(planePos)
    return planeNormal.add(vec3(liquid, liquid.mul(0.35), float(0)))
  })

  return { liquidNoiseAt, perturbNormal }
}
