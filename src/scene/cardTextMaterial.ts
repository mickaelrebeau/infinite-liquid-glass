// @ts-nocheck
import { MeshBasicNodeMaterial, Vector2, type Texture } from 'three/webgpu'
import {
  Fn,
  abs,
  float,
  fwidth,
  length,
  max,
  min,
  smoothstep,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
  positionLocal,
  materialOpacity,
} from 'three/tsl'
import { glassSettings } from '../config/settings'

export type CardTextUniforms = {
  planeSize: { value: Vector2 }
  cornerRadius: { value: number }
  textMap: ReturnType<typeof texture>
  backgroundMap: ReturnType<typeof texture>
  coverScale: { value: Vector2 }
  coverOffset: { value: Vector2 }
}

export function createCardTextMaterial(
  textTexture: Texture,
  backgroundTexture: Texture,
) {
  const uPlaneSize = uniform(new Vector2(1, 1))
  const uCornerRadius = uniform(glassSettings.cornerRadius)
  const uTextMap = texture(textTexture)
  const uBackgroundMap = texture(backgroundTexture)
  const uCoverScale = uniform(new Vector2(1, 1))
  const uCoverOffset = uniform(new Vector2(0, 0))
  const halfSize = uPlaneSize.mul(0.5)

  const roundedSdf = Fn(() => {
    const planePos = positionLocal.xy.mul(uPlaneSize)
    const radius = min(uCornerRadius, min(halfSize.x, halfSize.y))
    const inset = abs(planePos).sub(halfSize).add(radius)
    return length(max(inset, vec2(0)))
      .add(min(max(inset.x, inset.y), float(0)))
      .sub(radius)
  })

  const colorNode = Fn(() => {
    const mappedUv = uv().mul(uCoverScale).add(uCoverOffset)
    const background = uBackgroundMap.sample(mappedUv).rgb
    return vec3(1).sub(background)
  })

  const opacityNode = Fn(() => {
    const sampled = uTextMap.sample(uv())
    const sdfValue = roundedSdf()
    const edge = max(fwidth(sdfValue).mul(0.5), float(0.0001))
    const mask = float(1).sub(smoothstep(edge.negate(), edge, sdfValue))
    return sampled.a.mul(mask).mul(materialOpacity)
  })

  const material = new MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -8,
    polygonOffsetUnits: -8,
  })

  material.colorNode = colorNode()
  material.opacityNode = opacityNode()

  return {
    material,
    uniforms: {
      planeSize: uPlaneSize,
      cornerRadius: uCornerRadius,
      textMap: uTextMap,
      backgroundMap: uBackgroundMap,
      coverScale: uCoverScale,
      coverOffset: uCoverOffset,
    } satisfies CardTextUniforms,
  }
}
