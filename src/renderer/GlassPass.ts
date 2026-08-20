import type { LiquidGlassMaterialBundle } from '../components/LiquidGlass/LiquidGlassMaterial'

/**
 * Point d’extension pour un futur enchaînement glass → glass.
 * Aujourd’hui le composite se fait dans le shader via screenUV + background RT.
 */
export type GlassPassHandle = {
  materialBundle: LiquidGlassMaterialBundle
}

export function bindGlassPass(handle: GlassPassHandle) {
  return handle
}
