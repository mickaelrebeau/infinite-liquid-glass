// @ts-nocheck
import { Fn, dot, float, max, normalize, pow, vec3 } from 'three/tsl'

export function createSpecularNodes(specularIntensity, specularPower) {
  const specularAt = Fn(([planeNormal, viewDir]) => {
    const lightDir = normalize(vec3(-0.35, 0.65, 0.85))
    const halfVector = normalize(lightDir.add(viewDir))
    const highlight = pow(max(dot(planeNormal, halfVector), float(0)), specularPower)
    const lightDir2 = normalize(vec3(0.55, 0.25, 0.78))
    const halfVector2 = normalize(lightDir2.add(viewDir))
    const highlight2 = pow(max(dot(planeNormal, halfVector2), float(0)), specularPower.mul(0.85))
    return highlight.add(highlight2.mul(0.35)).mul(specularIntensity)
  })

  return { specularAt }
}
