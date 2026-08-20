/** Contenu capturé dans le background RenderTarget (sans verre). */
export const LIQUID_GLASS_BACKGROUND_LAYER = 1

/** Surfaces LiquidGlass — rendues après le background pass. */
export const LIQUID_GLASS_LAYER = 2

export const LIQUID_GLASS_CAMERA_LAYERS =
  LIQUID_GLASS_BACKGROUND_LAYER | LIQUID_GLASS_LAYER
