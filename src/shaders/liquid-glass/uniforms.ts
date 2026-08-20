// @ts-nocheck
import type { Texture } from 'three/webgpu'

/** Uniforms TSL partagés entre compose.ts et LiquidGlassMaterial.ts */
export type LiquidGlassUniformBundle = Record<string, unknown> & {
  backgroundTexture: { value: Texture }
  smoothedMouse: { value: import('three/webgpu').Vector2 }
}
