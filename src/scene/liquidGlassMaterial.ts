// @ts-nocheck
import {
  Color,
  MeshBasicNodeMaterial,
  Vector2,
  type Texture,
} from 'three/webgpu'
import {
  Fn,
  abs,
  clamp,
  dot,
  float,
  fwidth,
  length,
  max,
  min,
  mix,
  normalize,
  pow,
  refract,
  smoothstep,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
  positionLocal,
  cameraPosition,
  faceDirection,
  materialOpacity,
  modelWorldMatrix,
  modelWorldMatrixInverse,
  equirectUV,
  cos,
  sin,
  saturate,
  sqrt,
} from 'three/tsl'
import { glassSettings } from '../config/settings'

type DispersionSample = {
  offset: number
  weight: [number, number, number]
}

function gaussianWeight(position: number, center: number) {
  return Math.max(0, 1 - Math.abs(position - center) / 0.5)
}

function buildDispersionSamples(count: number): DispersionSample[] {
  const sampleCount = Math.max(3, Math.round(count))
  const totals = [0, 0, 0]
  const samples: DispersionSample[] = []

  for (let index = 0; index < sampleCount; index += 1) {
    const normalized = index / (sampleCount - 1)
    const weight = [
      gaussianWeight(normalized, 0),
      gaussianWeight(normalized, 0.5),
      gaussianWeight(normalized, 1),
    ]
    totals[0] += weight[0]
    totals[1] += weight[1]
    totals[2] += weight[2]
    samples.push({ offset: normalized - 0.5, weight })
  }

  return samples.map(({ offset, weight }) => ({
    offset,
    weight: [
      weight[0] / totals[0],
      weight[1] / totals[1],
      weight[2] / totals[2],
    ],
  }))
}

export type GlassUniforms = {
  planeSize: { value: Vector2 }
  sphereRadius: { value: number }
  cornerRadius: { value: number }
  bevelWidth: { value: number }
  bevelPower: { value: number }
  bevelMaxSlope: { value: number }
  thickness: { value: number }
  ior: { value: number }
  refractStrength: { value: number }
  dispersion: { value: number }
  fresnelF0: { value: number }
  envIntensity: { value: number }
  envMaxMix: { value: number }
  envRotation: { value: number }
  envRotationX: { value: number }
  rimWidth: { value: number }
  rimIntensity: { value: number }
  rimColor: { value: Color }
  rimColorTop: { value: Color }
  tint: { value: Color }
  coverScale: { value: Vector2 }
  coverOffset: { value: Vector2 }
  cardMap: ReturnType<typeof texture>
  envMap: ReturnType<typeof texture>
}

export function createLiquidGlassMaterial(
  cardTexture: Texture,
  envTexture: Texture,
  dispersionSampleCount = glassSettings.dispersionSamples,
): { material: MeshBasicNodeMaterial; uniforms: GlassUniforms } {
  const dispersionSamples = buildDispersionSamples(dispersionSampleCount)

  const uPlaneSize = uniform(new Vector2(1, 1))
  const uSphereRadius = uniform(1000)
  const uCornerRadius = uniform(glassSettings.cornerRadius)
  const uBevelWidth = uniform(glassSettings.bevelWidth)
  const uBevelPower = uniform(glassSettings.bevelPower)
  const uBevelMaxSlope = uniform(glassSettings.bevelMaxSlope)
  const uThickness = uniform(glassSettings.thickness)
  const uIor = uniform(glassSettings.ior)
  const uRefractStrength = uniform(glassSettings.refractStrength)
  const uDispersion = uniform(glassSettings.dispersion)
  const uFresnelF0 = uniform(glassSettings.fresnelF0)
  const uEnvIntensity = uniform(glassSettings.envIntensity)
  const uEnvMaxMix = uniform(glassSettings.envMaxMix)
  const uEnvRotation = uniform(glassSettings.envRotation)
  const uEnvRotationX = uniform(glassSettings.envRotationX)
  const uRimWidth = uniform(glassSettings.rimWidth)
  const uRimIntensity = uniform(glassSettings.rimIntensity)
  const uRimColor = uniform(new Color(glassSettings.rimColor))
  const uRimColorTop = uniform(new Color(glassSettings.rimColorTop))
  const uTint = uniform(new Color(glassSettings.tint))
  const uGlassEdgeStart = uniform(glassSettings.glassEdgeStart)
  const uGlassEdgeEnd = uniform(glassSettings.glassEdgeEnd)
  const uCoverScale = uniform(new Vector2(1, 1))
  const uCoverOffset = uniform(new Vector2(0, 0))
  const uCardMap = texture(cardTexture)
  const uEnvMap = texture(envTexture)

  const uniforms: GlassUniforms = {
    planeSize: uPlaneSize,
    sphereRadius: uSphereRadius,
    cornerRadius: uCornerRadius,
    bevelWidth: uBevelWidth,
    bevelPower: uBevelPower,
    bevelMaxSlope: uBevelMaxSlope,
    thickness: uThickness,
    ior: uIor,
    refractStrength: uRefractStrength,
    dispersion: uDispersion,
    fresnelF0: uFresnelF0,
    envIntensity: uEnvIntensity,
    envMaxMix: uEnvMaxMix,
    envRotation: uEnvRotation,
    envRotationX: uEnvRotationX,
    rimWidth: uRimWidth,
    rimIntensity: uRimIntensity,
    rimColor: uRimColor,
    rimColorTop: uRimColorTop,
    tint: uTint,
    coverScale: uCoverScale,
    coverOffset: uCoverOffset,
    cardMap: uCardMap,
    envMap: uEnvMap,
  }

  const halfSize = uPlaneSize.mul(0.5)

  const sphereLift = Fn(([planePos]) => {
    const radiusSq = uSphereRadius.mul(uSphereRadius)
    const lift = sqrt(max(radiusSq.sub(dot(planePos, planePos)), float(1)))
    return lift.sub(uSphereRadius)
  })

  const roundedSdfAt = Fn(([planePos]) => {
    const radius = min(uCornerRadius, min(halfSize.x, halfSize.y))
    const inset = abs(planePos).sub(halfSize).add(radius)
    return length(max(inset, vec2(0)))
      .add(min(max(inset.x, inset.y), float(0)))
      .sub(radius)
  })

  // 0 au centre, 1 près du bord — rampe douce pour éviter une démarcation nette
  const edgeFactorAt = Fn(([sdfValue]) =>
    smoothstep(
      float(0),
      float(1),
      clamp(
        float(1).add(sdfValue.div(max(uBevelWidth, float(0.001)))),
        float(0),
        float(1),
      ),
    ),
  )

  const glassInfluenceAt = Fn(([sdfValue]) =>
    smoothstep(uGlassEdgeStart, uGlassEdgeEnd, edgeFactorAt(sdfValue)),
  )

  const bevelAt = Fn(([sdfValue]) => {
    const edgeFactor = edgeFactorAt(sdfValue)
    const power = max(uBevelPower, float(1))
    return pow(
      max(
        float(1).sub(pow(float(1).sub(edgeFactor), power)),
        float(0),
      ),
      float(1).div(power),
    ).mul(uThickness)
  })

  const heightAt = Fn(([planePos]) => bevelAt(roundedSdfAt(planePos)))

  const toWorldDirection = Fn(([localVector]) =>
    normalize(
      modelWorldMatrix.mul(vec4(localVector.xy, localVector.z, float(0))).xyz,
    ),
  )

  const colorNode = Fn(() => {
    const planePos = positionLocal.xy.mul(uPlaneSize)
    const sdfValue = roundedSdfAt(planePos)
    const glassInfluence = glassInfluenceAt(sdfValue)
    const step = max(uBevelWidth.mul(0.06), float(0.35))
    const gradient = vec2(
      heightAt(planePos.add(vec2(step, 0))).sub(heightAt(planePos.sub(vec2(step, 0)))),
      heightAt(planePos.add(vec2(0, step))).sub(heightAt(planePos.sub(vec2(0, step)))),
    ).div(step.mul(2))
    const gradientLength = length(gradient)
    const clampedGradient = gradient.mul(
      min(gradientLength, uBevelMaxSlope).div(max(gradientLength, float(0.0001))),
    )
    const sphereDir = planePos
      .div(sphereLift(planePos).add(uSphereRadius))
      .mul(glassInfluence)
    const planeNormal = normalize(
      vec3(sphereDir.sub(clampedGradient.mul(glassInfluence)), float(1)),
    ).mul(faceDirection)

    const localPosition = vec3(positionLocal.xy, float(0))
    const viewVector = modelWorldMatrixInverse
      .mul(vec4(cameraPosition, float(1)))
      .xyz.sub(localPosition)
    const viewDirection = normalize(vec3(viewVector.xy.mul(uPlaneSize), viewVector.z))

    const baseUv = uv()
    let refractedColor = vec3(0)

    for (const sample of dispersionSamples) {
      const iorSample = float(1).div(
        max(uIor.add(uDispersion.mul(float(sample.offset))), float(1.0001)),
      )
      const refracted = refract(viewDirection.negate(), planeNormal, iorSample)
      const depth = uThickness.div(max(abs(refracted.z), float(0.05)))
      const refractedUv = baseUv
        .add(
          refracted
            .xy.mul(depth)
            .mul(uRefractStrength)
            .mul(glassInfluence)
            .div(uPlaneSize),
        )
        .mul(uCoverScale)
        .add(uCoverOffset)
      const clampedUv = clamp(refractedUv, float(0), float(1))
      const sampleColor = uCardMap.sample(clampedUv).rgb
      refractedColor = refractedColor.add(
        sampleColor.mul(vec3(sample.weight[0], sample.weight[1], sample.weight[2])),
      )
    }

    const worldNormal = toWorldDirection(planeNormal)
    const worldView = toWorldDirection(viewDirection)
    const reflected = normalize(
      worldView.negate().sub(worldNormal.mul(dot(worldView.negate(), worldNormal).mul(2))),
    )

    const envRotCos = cos(uEnvRotation)
    const envRotSin = sin(uEnvRotation)
    const rotatedReflect = vec3(
      reflected.x.mul(envRotCos).sub(reflected.z.mul(envRotSin)),
      reflected.y,
      reflected.x.mul(envRotSin).add(reflected.z.mul(envRotCos)),
    )

    const envTiltCos = cos(uEnvRotationX)
    const envTiltSin = sin(uEnvRotationX)
    const envDirection = vec3(
      rotatedReflect.x,
      rotatedReflect.y.mul(envTiltCos).sub(rotatedReflect.z.mul(envTiltSin)),
      rotatedReflect.y.mul(envTiltSin).add(rotatedReflect.z.mul(envTiltCos)),
    )

    const envColor = uEnvMap.sample(equirectUV(envDirection)).rgb
    const fresnel = uFresnelF0.add(
      float(1)
        .sub(uFresnelF0)
        .mul(pow(saturate(float(1).sub(dot(planeNormal, viewDirection))), float(5))),
    )
    const rimFactor = smoothstep(uRimWidth.negate(), float(0), sdfValue)
      .mul(uRimIntensity)
      .mul(glassInfluence)
    const rimVertical = saturate(
      planePos.y.div(max(uPlaneSize.y, float(0.0001))).mul(0.5).add(0.5),
    )
    const rimColor = mix(uRimColor, uRimColorTop, rimVertical)

    return mix(
      refractedColor.mul(uTint),
      envColor,
      min(saturate(fresnel.mul(uEnvIntensity)), uEnvMaxMix).mul(glassInfluence),
    ).add(rimColor.mul(rimFactor))
  })

  const opacityNode = Fn(() => {
    const sdfValue = roundedSdfAt(positionLocal.xy.mul(uPlaneSize))
    const edge = max(fwidth(sdfValue).mul(0.5), float(0.0001))
    return float(1).sub(smoothstep(edge.negate(), edge, sdfValue)).mul(materialOpacity)
  })

  const material = new MeshBasicNodeMaterial({
    transparent: true,
    alphaTest: 0.001,
    depthWrite: true,
    depthTest: true,
    toneMapped: false,
  })

  material.positionNode = vec3(positionLocal.x, positionLocal.y, float(0))
  material.colorNode = colorNode()
  material.opacityNode = opacityNode()

  return { material, uniforms }
}
