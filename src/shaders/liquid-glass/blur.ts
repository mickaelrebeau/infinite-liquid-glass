// @ts-nocheck
import { Fn, vec2 } from 'three/tsl'

/** Blur gaussien léger (5 taps) sur la transmission — coût fixe par pixel. */
export function createBlurredSampleNodes(backgroundMap, blurAmount) {
  const sampleBlurredAt = Fn(([sampleUv, sharpColor]) => {
    const radius = blurAmount.mul(0.006)
    const c0 = sharpColor
    const c1 = backgroundMap.sample(sampleUv.add(vec2(radius, 0))).rgb
    const c2 = backgroundMap.sample(sampleUv.add(vec2(radius.negate(), 0))).rgb
    const c3 = backgroundMap.sample(sampleUv.add(vec2(0, radius))).rgb
    const c4 = backgroundMap.sample(sampleUv.add(vec2(0, radius.negate()))).rgb
    return c0
      .mul(0.34)
      .add(c1.mul(0.165))
      .add(c2.mul(0.165))
      .add(c3.mul(0.165))
      .add(c4.mul(0.165))
  })

  return { sampleBlurredAt }
}
