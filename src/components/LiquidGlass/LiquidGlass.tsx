import { useEffect, useMemo, useRef } from 'react'
import type { ThreeElements } from '@react-three/fiber'
import {
  createLiquidGlassMaterialBundle,
  type LiquidGlassMaterialBundle,
} from './LiquidGlassMaterial'
import { useLiquidGlassInteraction } from './LiquidGlassInteraction'
import {
  applyLiquidGlassLayer,
  useLiquidGlassGeometry,
} from './LiquidGlassSurface'
import { useBackgroundPassTexture } from '../../renderer/BackgroundPass'
import type { LiquidGlassParams } from '../../shaders/liquid-glass/types'
import { defaultLiquidGlassParams } from '../../shaders/liquid-glass/types'

export type LiquidGlassProps = Partial<LiquidGlassParams> &
  Omit<ThreeElements['mesh'], 'material' | 'geometry'>

export function LiquidGlass({
  width = defaultLiquidGlassParams.width,
  height = defaultLiquidGlassParams.height,
  radius = defaultLiquidGlassParams.radius,
  ior = defaultLiquidGlassParams.ior,
  thickness = defaultLiquidGlassParams.thickness,
  refraction = defaultLiquidGlassParams.refraction,
  chromaticAberration = defaultLiquidGlassParams.chromaticAberration,
  blur = defaultLiquidGlassParams.blur,
  fresnelPower = defaultLiquidGlassParams.fresnelPower,
  fresnelIntensity = defaultLiquidGlassParams.fresnelIntensity,
  fresnelColor = defaultLiquidGlassParams.fresnelColor,
  rimIntensity = defaultLiquidGlassParams.rimIntensity,
  rimWidth = defaultLiquidGlassParams.rimWidth,
  rimColor = defaultLiquidGlassParams.rimColor,
  specularIntensity = defaultLiquidGlassParams.specularIntensity,
  specularPower = defaultLiquidGlassParams.specularPower,
  liquidStrength = defaultLiquidGlassParams.liquidStrength,
  noiseScale = defaultLiquidGlassParams.noiseScale,
  secondaryNoiseScale = defaultLiquidGlassParams.secondaryNoiseScale,
  noiseSpeed = defaultLiquidGlassParams.noiseSpeed,
  warpStrength = defaultLiquidGlassParams.warpStrength,
  interactionStrength = defaultLiquidGlassParams.interactionStrength,
  interactionRadius = defaultLiquidGlassParams.interactionRadius,
  springStrength = defaultLiquidGlassParams.springStrength,
  springDamping = defaultLiquidGlassParams.springDamping,
  opacity = defaultLiquidGlassParams.opacity,
  tint = defaultLiquidGlassParams.tint,
  debugMode = defaultLiquidGlassParams.debugMode,
  ...meshProps
}: LiquidGlassProps) {
  const backgroundTexture = useBackgroundPassTexture()
  const bundleRef = useRef<LiquidGlassMaterialBundle | null>(null)

  const params = useMemo(
    () => ({
      width,
      height,
      radius,
      ior,
      thickness,
      refraction,
      chromaticAberration,
      blur,
      fresnelPower,
      fresnelIntensity,
      fresnelColor,
      rimIntensity,
      rimWidth,
      rimColor,
      specularIntensity,
      specularPower,
      liquidStrength,
      noiseScale,
      secondaryNoiseScale,
      noiseSpeed,
      warpStrength,
      interactionStrength,
      interactionRadius,
      springStrength,
      springDamping,
      opacity,
      tint,
      debugMode,
    }),
    [
      width,
      height,
      radius,
      ior,
      thickness,
      refraction,
      chromaticAberration,
      blur,
      fresnelPower,
      fresnelIntensity,
      fresnelColor,
      rimIntensity,
      rimWidth,
      rimColor,
      specularIntensity,
      specularPower,
      liquidStrength,
      noiseScale,
      secondaryNoiseScale,
      noiseSpeed,
      warpStrength,
      interactionStrength,
      interactionRadius,
      springStrength,
      springDamping,
      opacity,
      tint,
      debugMode,
    ],
  )

  const bundle = useMemo(() => {
    const created = createLiquidGlassMaterialBundle(backgroundTexture, params)
    bundleRef.current = created
    return created
  }, [backgroundTexture])

  useEffect(() => {
    bundleRef.current?.updateParams(params)
  }, [params])

  useEffect(() => {
    bundleRef.current?.setBackgroundTexture(backgroundTexture)
  }, [backgroundTexture])

  const geometry = useLiquidGlassGeometry(width, height)

  const interaction = useLiquidGlassInteraction(bundle.uniforms, {
    springStrength,
    springDamping,
    interactionRadius,
  })

  return (
    <mesh
      {...meshProps}
      geometry={geometry}
      material={bundle.material}
      onPointerMove={interaction.onPointerMove}
      onPointerOver={interaction.onPointerOver}
      onPointerOut={interaction.onPointerOut}
      onPointerLeave={interaction.onPointerLeave}
      ref={(node) => {
        if (node) applyLiquidGlassLayer(node)
      }}
    />
  )
}
