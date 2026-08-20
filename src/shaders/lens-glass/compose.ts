// @ts-nocheck
import {
  Fn,
  abs,
  clamp,
  cos,
  dot,
  equirectUV,
  float,
  fwidth,
  max,
  min,
  mix,
  normalize,
  pow,
  refract,
  saturate,
  sin,
  smoothstep,
  uv,
  vec3,
  vec4,
  positionLocal,
  cameraPosition,
  faceDirection,
  materialOpacity,
  modelWorldMatrix,
  modelWorldMatrixInverse,
} from 'three/tsl'
import { createOriginalGlassNodes } from './originalSurface'

export function createLensGlassColorNode(
  uniforms,
  dispersionSamples,
  uCardMap,
  uEnvMap,
) {
  const surface = createOriginalGlassNodes(
    uniforms.planeSize,
    uniforms.cornerRadius,
    uniforms.sphereRadius,
    uniforms.bevelWidth,
    uniforms.bevelPower,
    uniforms.bevelMaxSlope,
    uniforms.thickness,
  )

  const toWorldDirection = Fn(([localVector]) =>
    normalize(
      modelWorldMatrix
        .mul(
          vec4(
            localVector.xy.div(uniforms.planeSize),
            localVector.z,
            float(0),
          ),
        )
        .xyz,
    ),
  )

  return Fn(() => {
    const planePos = positionLocal.xy.mul(uniforms.planeSize)
    const sdfValue = surface.roundedSdfAt(planePos)
    const planeNormal = surface.glassNormalAt(planePos).mul(faceDirection)

    const localPosition = vec3(positionLocal.xy, surface.spherePositionZAt(planePos))
    const viewVector = modelWorldMatrixInverse
      .mul(vec4(cameraPosition, float(1)))
      .xyz.sub(localPosition)
    const viewDirection = normalize(
      vec3(viewVector.xy.mul(uniforms.planeSize), viewVector.z),
    )

    const baseUv = uv()
    let refractedColor = vec3(0)

    for (const sample of dispersionSamples) {
      const iorSample = float(1).div(
        max(
          uniforms.ior.add(uniforms.dispersion.mul(float(sample.offset))),
          float(1.0001),
        ),
      )
      const refracted = refract(viewDirection.negate(), planeNormal, iorSample)
      const depth = uniforms.thickness.div(max(abs(refracted.z), float(0.05)))
      const offset = refracted
        .xy.mul(depth)
        .mul(uniforms.refractStrength)
        .div(uniforms.planeSize)

      const sampleUv = clamp(baseUv.add(offset), float(0), float(1))
        .mul(uniforms.coverScale)
        .add(uniforms.coverOffset)
      const sampleColor = uCardMap.sample(sampleUv).rgb
      refractedColor = refractedColor.add(
        sampleColor.mul(vec3(sample.weight[0], sample.weight[1], sample.weight[2])),
      )
    }

    const worldNormal = toWorldDirection(planeNormal)
    const worldView = toWorldDirection(viewDirection)
    const reflected = normalize(
      worldView.negate().sub(worldNormal.mul(dot(worldView.negate(), worldNormal).mul(2))),
    )

    const envRotCos = cos(uniforms.envRotation)
    const envRotSin = sin(uniforms.envRotation)
    const rotatedReflect = vec3(
      reflected.x.mul(envRotCos).sub(reflected.z.mul(envRotSin)),
      reflected.y,
      reflected.x.mul(envRotSin).add(reflected.z.mul(envRotCos)),
    )

    const envTiltCos = cos(uniforms.envRotationX)
    const envTiltSin = sin(uniforms.envRotationX)
    const envDirection = vec3(
      rotatedReflect.x,
      rotatedReflect.y.mul(envTiltCos).sub(rotatedReflect.z.mul(envTiltSin)),
      rotatedReflect.y.mul(envTiltSin).add(rotatedReflect.z.mul(envTiltCos)),
    )

    const envColor = uEnvMap.sample(equirectUV(envDirection)).rgb
    const fresnel = uniforms.fresnelF0.add(
      float(1)
        .sub(uniforms.fresnelF0)
        .mul(pow(saturate(float(1).sub(dot(planeNormal, viewDirection))), float(5))),
    )

    const rimFactor = smoothstep(uniforms.rimWidth.negate(), float(0), sdfValue).mul(
      uniforms.rimIntensity,
    )
    const rimVertical = saturate(
      planePos.y.div(max(surface.halfSize.y, float(0.0001))).mul(0.5).add(0.5),
    )
    const rimColor = mix(uniforms.rimColor, uniforms.rimColorTop, rimVertical)

    return mix(
      refractedColor.mul(uniforms.tint),
      envColor,
      min(saturate(fresnel.mul(uniforms.envIntensity)), uniforms.envMaxMix),
    ).add(rimColor.mul(rimFactor))
  })
}

export function createLensGlassOpacityNode(uniforms, roundedSdfAt) {
  return Fn(() => {
    const planePos = positionLocal.xy.mul(uniforms.planeSize)
    const sdfValue = roundedSdfAt(planePos)
    const edge = max(fwidth(sdfValue).mul(0.5), float(0.0001))
    return float(1)
      .sub(smoothstep(edge.negate(), edge, sdfValue))
      .mul(materialOpacity)
  })
}
