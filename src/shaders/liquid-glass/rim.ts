// @ts-nocheck
import { Fn, float, smoothstep } from 'three/tsl'

export function createRimNodes(rimWidth, rimIntensity) {
  const rimAt = Fn(([edgeDistance]) => {
    const outer = rimWidth
    const inner = rimWidth.mul(0.35)
    return smoothstep(outer, inner, edgeDistance).mul(rimIntensity)
  })

  return { rimAt }
}
