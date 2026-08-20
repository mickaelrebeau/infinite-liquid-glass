export const GLASS_SHADER_REVISION = 11

export const defaultGlassSettings = {
  cornerRadius: 0.163,
  bevelWidth: 0.192,
  bevelPower: 3.9,
  bevelMaxSlope: 1.74,
  thickness: 155,
  ior: 2.3,
  roughness: 0,
  refractStrength: 0.7,
  dispersion: 0.32,
  dispersionSamples: 5,
  fresnelF0: 0.045,
  envIntensity: 1.93,
  envMaxMix: 0.27,
  envRotation: -2,
  envRotationX: 0,
  rimWidth: 10,
  rimIntensity: 0.11,
  rimColor: '#ffffff',
  rimColorTop: '#ffffff',
  tint: '#ffffff',
} as const

export const defaultGridSettings = {
  perspective: 1200,
  sphereRadius: 5000,
  planeAspect: 4 / 3,
  planeWidthRatio: 0.38,
  planeWidthRatioPortrait: 0.72,
  gapRatio: 0.045,
  referenceWidth: 1728,
  coverageMargin: 1.15,
  minCols: 4,
  maxCols: 16,
  minRows: 4,
  maxRows: 16,
  edgeScaleFalloff: 0,
  edgeScalePower: 1.65,
} as const

export const interactionSettings = {
  tapMaxDistance: 14,
  postDragCooldownMs: 360,
  clickMaxVelocity: 140,
  diveDuration: 1.15,
} as const

export const dragSettings = {
  dragRatio: 1.5,
  wheelRatio: 1.2,
  wheelLineScale: 16,
  fling: 0.1,
  spring: {
    stiffness: 100,
    damping: 16,
    mass: 0.5,
    restDelta: 0.00001,
  },
  magnitudeSpring: {
    stiffness: 140,
    damping: 24,
    mass: 0.6,
  },
} as const

export const defaultTiltSettings = {
  maxPitch: 0.06,
  maxYaw: 0.06,
  smoothing: 0.12,
  pointerSpring: {
    stiffness: 110,
    damping: 20,
    mass: 0.55,
  },
} as const

export const glassSettings = { ...defaultGlassSettings }
export const gridSettings = { ...defaultGridSettings }
export const tiltSettings = {
  ...defaultTiltSettings,
  pointerSpring: { ...defaultTiltSettings.pointerSpring },
}
