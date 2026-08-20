// @ts-nocheck
import { texture } from 'three/tsl'
import { createRoundedRectSdfNodes } from './sdf'
import { createSurfaceNodes } from './surface'
import { createLiquidNoiseNodes } from './noise'
import { createRefractionNodes } from './refraction'
import { createChromaticSampleNodes } from './chromatic'
import { createBlurredSampleNodes } from './blur'
import { createFresnelNodes } from './fresnel'
import { createRimNodes } from './rim'
import { createSpecularNodes } from './specular'
import type { LiquidGlassUniformBundle } from './uniforms'

export function buildLiquidGlassShaderGraph(uniforms: LiquidGlassUniformBundle) {
  const uBg = texture(uniforms.backgroundTexture.value)

  const sdfNodes = createRoundedRectSdfNodes(uniforms.planeSize, uniforms.cornerRadius)
  const surfaceNodes = createSurfaceNodes(
    sdfNodes,
    uniforms.bevelWidth,
    uniforms.bevelPower,
    uniforms.bevelMaxSlope,
    uniforms.thickness,
  )
  const noiseNodes = createLiquidNoiseNodes(
    uniforms.noiseScale,
    uniforms.secondaryNoiseScale,
    uniforms.noiseSpeed,
    uniforms.warpStrength,
    uniforms.liquidStrength,
  )
  const refractionNodes = createRefractionNodes(uniforms.refraction, uniforms.thickness)
  const chromaticNodes = createChromaticSampleNodes(uBg, uniforms.chromaticAberration)
  const blurNodes = createBlurredSampleNodes(uBg, uniforms.blur)
  const fresnelNodes = createFresnelNodes(
    uniforms.fresnelF0,
    uniforms.fresnelPower,
    uniforms.fresnelIntensity,
  )
  const rimNodes = createRimNodes(uniforms.rimWidth, uniforms.rimIntensity)
  const specularNodes = createSpecularNodes(
    uniforms.specularIntensity,
    uniforms.specularPower,
  )

  return {
    uBg,
    sdfNodes,
    surfaceNodes,
    noiseNodes,
    refractionNodes,
    chromaticNodes,
    blurNodes,
    fresnelNodes,
    rimNodes,
    specularNodes,
  }
}

export type LiquidGlassShaderGraph = ReturnType<typeof buildLiquidGlassShaderGraph>

export function attachBackgroundTexture(
  graph: LiquidGlassShaderGraph,
  backgroundTexture: Texture,
) {
  graph.uBg.value = backgroundTexture
}
