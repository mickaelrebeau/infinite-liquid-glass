export const glassSettings = {
  cornerRadius: 0.163,
  bevelWidth: 0.12,
  bevelPower: 2.5,
  bevelMaxSlope: 1.45,
  thickness: 120,
  ior: 2.3,
  roughness: 0,
  refractStrength: 0.52,
  dispersion: 0.24,
  dispersionSamples: 5,
  fresnelF0: 0.045,
  envIntensity: 1.45,
  envMaxMix: 0.16,
  envRotation: -2,
  envRotationX: 0,
  rimWidth: 6,
  rimIntensity: 0.07,
  rimColor: '#ffffff',
  rimColorTop: '#ffffff',
  tint: '#ffffff',
  glassEdgeStart: 0.78,
  glassEdgeEnd: 1,
} as const

export const gridSettings = {
  perspective: 1200,
  sphereRadius: 5000,
  planeAspect: 4 / 3,
  planeWidthRatio: 0.351,
  gapRatio: 0.048,
  referenceWidth: 1728,
  coverageMargin: 1.12,
  minCols: 4,
  maxCols: 16,
  minRows: 4,
  maxRows: 16,
  edgeScaleFalloff: 0.18,
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

export const tiltSettings = {
  maxPitch: 0.11,
  maxYaw: 0.11,
  smoothing: 0.12,
  pointerSpring: {
    stiffness: 110,
    damping: 20,
    mass: 0.55,
  },
} as const
