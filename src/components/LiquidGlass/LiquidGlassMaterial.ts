// @ts-nocheck
import {
  Color,
  MeshBasicNodeMaterial,
  Vector2,
  type Texture,
} from 'three/webgpu'
import {
  float,
  uniform,
  vec3,
  positionLocal,
} from 'three/tsl'
import { defaultLiquidGlassParams, type LiquidGlassDebugMode, type LiquidGlassParams } from '../../shaders/liquid-glass/types'
import { buildLiquidGlassShaderGraph } from '../../shaders/liquid-glass/compose'
import {
  createLiquidGlassColorNode,
  createLiquidGlassOpacityNode,
  debugModeValues,
} from '../../shaders/liquid-glass/composeColor'

import type { LiquidGlassUniformBundle } from '../../shaders/liquid-glass/uniforms'

export type { LiquidGlassUniformBundle }

export type LiquidGlassMaterialBundle = {
  material: MeshBasicNodeMaterial
  uniforms: LiquidGlassUniformBundle
  updateParams: (partial: Partial<LiquidGlassParams>) => void
  setBackgroundTexture: (texture: Texture) => void
  setDebugMode: (mode: LiquidGlassDebugMode) => void
}

function resolveParams(partial?: Partial<LiquidGlassParams>): LiquidGlassParams {
  return { ...defaultLiquidGlassParams, ...partial }
}

function debugModeToFloat(mode: LiquidGlassDebugMode) {
  return debugModeValues[mode]
}

export function createLiquidGlassMaterialBundle(
  backgroundTexture: Texture,
  partial?: Partial<LiquidGlassParams>,
): LiquidGlassMaterialBundle {
  const params = resolveParams(partial)

  const uniforms: LiquidGlassUniformBundle = {
    planeSize: uniform(new Vector2(params.width, params.height)),
    cornerRadius: uniform(params.radius),
    bevelWidth: uniform(0.14),
    bevelPower: uniform(3.2),
    bevelMaxSlope: uniform(1.6),
    thickness: uniform(params.thickness),
    refraction: uniform(params.refraction),
    chromaticAberration: uniform(params.chromaticAberration),
    blur: uniform(params.blur),
    fresnelF0: uniform(0.04),
    fresnelPower: uniform(params.fresnelPower),
    fresnelIntensity: uniform(params.fresnelIntensity),
    fresnelColor: uniform(new Color(params.fresnelColor)),
    rimWidth: uniform(params.rimWidth),
    rimIntensity: uniform(params.rimIntensity),
    rimColor: uniform(new Color(params.rimColor)),
    specularIntensity: uniform(params.specularIntensity),
    specularPower: uniform(params.specularPower),
    liquidStrength: uniform(params.liquidStrength),
    noiseScale: uniform(params.noiseScale),
    secondaryNoiseScale: uniform(params.secondaryNoiseScale),
    noiseSpeed: uniform(params.noiseSpeed),
    warpStrength: uniform(params.warpStrength),
    interactionStrength: uniform(params.interactionStrength),
    interactionRadius: uniform(params.interactionRadius),
    smoothedMouse: uniform(new Vector2(0, 0)),
    opacity: uniform(params.opacity),
    tint: uniform(new Color(params.tint)),
    debugMode: uniform(debugModeToFloat(params.debugMode)),
    backgroundTexture: { value: backgroundTexture },
  }

  const graph = buildLiquidGlassShaderGraph(uniforms)
  const colorNode = createLiquidGlassColorNode(graph, uniforms)
  const opacityNode = createLiquidGlassOpacityNode(graph, uniforms)

  const material = new MeshBasicNodeMaterial({
    transparent: true,
    alphaTest: 0.001,
    depthWrite: true,
    depthTest: true,
    toneMapped: false,
  })

  material.colorNode = colorNode()
  material.opacityNode = opacityNode()
  material.positionNode = vec3(positionLocal.x, positionLocal.y, float(0))

  const updateParams = (next: Partial<LiquidGlassParams>) => {
    const merged = resolveParams({ ...params, ...next })
    Object.assign(params, merged)

    uniforms.planeSize.value.set(merged.width, merged.height)
    uniforms.cornerRadius.value = merged.radius
    uniforms.thickness.value = merged.thickness
    uniforms.refraction.value = merged.refraction
    uniforms.chromaticAberration.value = merged.chromaticAberration
    uniforms.blur.value = merged.blur
    uniforms.fresnelPower.value = merged.fresnelPower
    uniforms.fresnelIntensity.value = merged.fresnelIntensity
    uniforms.fresnelColor.value.set(merged.fresnelColor)
    uniforms.rimWidth.value = merged.rimWidth
    uniforms.rimIntensity.value = merged.rimIntensity
    uniforms.rimColor.value.set(merged.rimColor)
    uniforms.specularIntensity.value = merged.specularIntensity
    uniforms.specularPower.value = merged.specularPower
    uniforms.liquidStrength.value = merged.liquidStrength
    uniforms.noiseScale.value = merged.noiseScale
    uniforms.secondaryNoiseScale.value = merged.secondaryNoiseScale
    uniforms.noiseSpeed.value = merged.noiseSpeed
    uniforms.warpStrength.value = merged.warpStrength
    uniforms.interactionStrength.value = merged.interactionStrength
    uniforms.interactionRadius.value = merged.interactionRadius
    uniforms.opacity.value = merged.opacity
    uniforms.tint.value.set(merged.tint)
    uniforms.debugMode.value = debugModeToFloat(merged.debugMode)
  }

  const setBackgroundTexture = (texture: Texture) => {
    uniforms.backgroundTexture.value = texture
    graph.uBg.value = texture
  }

  const setDebugMode = (mode: LiquidGlassDebugMode) => {
    params.debugMode = mode
    uniforms.debugMode.value = debugModeToFloat(mode)
  }

  return { material, uniforms, updateParams, setBackgroundTexture, setDebugMode }
}
