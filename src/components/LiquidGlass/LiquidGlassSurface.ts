import { useMemo } from 'react'
import { PlaneGeometry } from 'three/webgpu'
import { LIQUID_GLASS_LAYER } from '../../renderer/layers'

export function useLiquidGlassGeometry(width: number, height: number) {
  return useMemo(() => new PlaneGeometry(width, height, 32, 24), [width, height])
}

export function applyLiquidGlassLayer(object: { layers: { enable: (layer: number) => void } }) {
  object.layers.enable(LIQUID_GLASS_LAYER)
}
