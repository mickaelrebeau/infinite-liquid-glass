// @ts-nocheck
import { Fn, float, vec3 } from 'three/tsl'

export function createChromaticSampleNodes(backgroundMap, chromaticAberration) {
  const sampleTransmissionAt = Fn(([baseUv, offset]) => {
    const chroma = chromaticAberration
    const r = backgroundMap.sample(baseUv.add(offset.mul(float(1).add(chroma)))).r
    const g = backgroundMap.sample(baseUv.add(offset)).g
    const b = backgroundMap.sample(baseUv.add(offset.mul(float(1).sub(chroma)))).b
    return vec3(r, g, b)
  })

  return { sampleTransmissionAt }
}
