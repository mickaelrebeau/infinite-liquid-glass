// @ts-nocheck
import {
  Color,
  FrontSide,
  MeshBasicNodeMaterial,
  Vector2,
  type Texture,
} from 'three/webgpu'
import { positionLocal, texture, uniform, vec3 } from 'three/tsl'
import { glassSettings } from '../config/settings'
import { buildDispersionSamples } from '../shaders/lens-glass/dispersion'
import {
  createLensGlassColorNode,
  createLensGlassOpacityNode,
} from '../shaders/lens-glass/compose'
import { createOriginalGlassNodes } from '../shaders/lens-glass/originalSurface'

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

/** Shader aligné sur le bundle original infinite-liquid-glass.shader.se (bH). */
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

  const surfaceNodes = createOriginalGlassNodes(
    uPlaneSize,
    uCornerRadius,
    uSphereRadius,
    uBevelWidth,
    uBevelPower,
    uBevelMaxSlope,
    uThickness,
  )

  const material = new MeshBasicNodeMaterial({
    transparent: true,
    alphaTest: 0.001,
    depthWrite: true,
    depthTest: true,
    side: FrontSide,
    toneMapped: false,
  })

  material.positionNode = vec3(
    positionLocal.x,
    positionLocal.y,
    surfaceNodes.spherePositionZAt(positionLocal.xy.mul(uPlaneSize)),
  )
  material.colorNode = createLensGlassColorNode(
    uniforms,
    dispersionSamples,
    uCardMap,
    uEnvMap,
  )()
  material.opacityNode = createLensGlassOpacityNode(
    uniforms,
    surfaceNodes.roundedSdfAt,
  )()

  return { material, uniforms }
}
