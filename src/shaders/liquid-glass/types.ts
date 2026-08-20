import type { ColorRepresentation } from 'three/webgpu'

export type LiquidGlassDebugMode =
  | 'final'
  | 'normal'
  | 'fresnel'
  | 'refraction'
  | 'noise'
  | 'rim'
  | 'sdf'

export type LiquidGlassParams = {
  width: number
  height: number
  radius: number
  ior: number
  thickness: number
  refraction: number
  chromaticAberration: number
  blur: number
  fresnelPower: number
  fresnelIntensity: number
  fresnelColor: ColorRepresentation
  rimIntensity: number
  rimWidth: number
  rimColor: ColorRepresentation
  specularIntensity: number
  specularPower: number
  liquidStrength: number
  noiseScale: number
  secondaryNoiseScale: number
  noiseSpeed: number
  warpStrength: number
  interactionStrength: number
  interactionRadius: number
  springStrength: number
  springDamping: number
  opacity: number
  tint: ColorRepresentation
  debugMode: LiquidGlassDebugMode
}

export const defaultLiquidGlassParams: LiquidGlassParams = {
  width: 400,
  height: 180,
  radius: 32,
  ior: 1.45,
  thickness: 0.12,
  refraction: 0.1,
  chromaticAberration: 0.012,
  blur: 0.2,
  fresnelPower: 5,
  fresnelIntensity: 0.35,
  fresnelColor: '#ffffff',
  rimIntensity: 0.2,
  rimWidth: 0.08,
  rimColor: '#ffffff',
  specularIntensity: 0.4,
  specularPower: 32,
  liquidStrength: 0.08,
  noiseScale: 1.5,
  secondaryNoiseScale: 2.5,
  noiseSpeed: 0.05,
  warpStrength: 0.25,
  interactionStrength: 0.15,
  interactionRadius: 0.55,
  springStrength: 140,
  springDamping: 18,
  opacity: 1,
  tint: '#ffffff',
  debugMode: 'final',
}
