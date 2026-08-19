import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  PointsNodeMaterial,
  type Group,
} from 'three/webgpu'

const STAR_COUNT = 22000

const SPECTRAL: [number, number, number][] = [
  [0.72, 0.8, 1],
  [0.78, 0.85, 1],
  [0.88, 0.91, 1],
  [0.97, 0.97, 1],
  [1, 0.96, 0.9],
  [1, 0.86, 0.68],
  [1, 0.7, 0.42],
]

type StarryBackgroundProps = {
  reducedMotion?: boolean
}

export function StarryBackground({ reducedMotion = false }: StarryBackgroundProps) {
  const groupRef = useRef<Group>(null)
  const { points, dispose } = useMemo(() => createStarField(), [])

  useEffect(() => () => dispose(), [dispose])

  useFrame((_, delta) => {
    if (!reducedMotion && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.0022
    }
  })

  return (
    <group
      ref={groupRef}
      rotation={[0.28, 0.6, 0.1]}
      frustumCulled={false}
      renderOrder={-1000}
    >
      <primitive object={points} />
    </group>
  )
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function createStarField() {
  const positions = new Float32Array(STAR_COUNT * 3)
  const colors = new Float32Array(STAR_COUNT * 3)
  const rand = mulberry32(2026)

  for (let i = 0; i < STAR_COUNT; i += 1) {
    let dirX = 0
    let dirY = 0
    let dirZ = 0
    let inBand = false

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const theta = rand() * Math.PI * 2
      const phi = Math.acos(2 * rand() - 1)
      dirX = Math.sin(phi) * Math.cos(theta)
      dirY = Math.cos(phi)
      dirZ = Math.sin(phi) * Math.sin(theta)
      const galactic = Math.abs(dirX * 0.18 + dirY * 0.92 + dirZ * 0.35)
      inBand = galactic < 0.16
      if (inBand || rand() < 0.4) break
    }

    const radius = 4200 + rand() * 2800
    const offset = i * 3
    positions[offset] = dirX * radius
    positions[offset + 1] = dirY * radius
    positions[offset + 2] = dirZ * radius

    const spectral = SPECTRAL[Math.min(SPECTRAL.length - 1, Math.floor(rand() ** 1.4 * SPECTRAL.length))]
    const brightness = (inBand ? 0.22 : 0.12) + rand() ** 2.8 * 0.78
    colors[offset] = spectral[0] * brightness
    colors[offset + 1] = spectral[1] * brightness
    colors[offset + 2] = spectral[2] * brightness
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))

  const material = new PointsNodeMaterial({
    vertexColors: true,
    size: 1,
    sizeAttenuation: false,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
    blending: AdditiveBlending,
  })

  const points = new Points(geometry, material)
  points.frustumCulled = false
  points.renderOrder = -1000
  points.name = 'star-field'

  const dispose = () => {
    geometry.dispose()
    material.dispose()
  }

  return { points, dispose }
}
