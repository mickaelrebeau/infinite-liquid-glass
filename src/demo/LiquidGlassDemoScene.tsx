import { Suspense, useMemo } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import {
  CanvasTexture,
  SRGBColorSpace,
  TextureLoader,
} from 'three/webgpu'
import { LiquidGlass } from '../components/LiquidGlass'
import { BackgroundPassProvider } from '../renderer/BackgroundPass'
import { LIQUID_GLASS_BACKGROUND_LAYER } from '../renderer/layers'
import { createWebGPURenderer } from '../scene/createWebGPURenderer'

function DemoBackgroundContent() {
  const labelTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#101018'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      gradient.addColorStop(0, '#ff4d8d')
      gradient.addColorStop(0.35, '#ffb347')
      gradient.addColorStop(0.7, '#4d9fff')
      gradient.addColorStop(1, '#7b61ff')
      ctx.fillStyle = gradient
      ctx.globalAlpha = 0.55
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.globalAlpha = 1
      ctx.fillStyle = '#ffffff'
      ctx.font = '700 96px system-ui, sans-serif'
      ctx.fillText('Liquid Glass Demo', 72, 190)
      ctx.font = '500 42px system-ui, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.82)'
      ctx.fillText('Refraction WebGPU · TSL · R3F', 76, 270)
    }
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    texture.needsUpdate = true
    return texture
  }, [])

  const photo = useLoader(
    TextureLoader,
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80',
  )

  return (
    <group>
      <mesh position={[0, 0, -40]} layers={LIQUID_GLASS_BACKGROUND_LAYER}>
        <planeGeometry args={[1400, 900]} />
        <meshBasicMaterial map={labelTexture} toneMapped={false} />
      </mesh>

      <mesh
        position={[-420, 120, 20]}
        rotation={[0, 0, 0.2]}
        layers={LIQUID_GLASS_BACKGROUND_LAYER}
      >
        <circleGeometry args={[110, 48]} />
        <meshBasicMaterial color="#ff6b6b" toneMapped={false} />
      </mesh>
      <mesh
        position={[380, -160, 10]}
        rotation={[0, 0, -0.15]}
        layers={LIQUID_GLASS_BACKGROUND_LAYER}
      >
        <boxGeometry args={[220, 220, 1]} />
        <meshBasicMaterial color="#ffd166" toneMapped={false} />
      </mesh>
      <mesh position={[460, 210, 0]} layers={LIQUID_GLASS_BACKGROUND_LAYER}>
        <planeGeometry args={[280, 180]} />
        <meshBasicMaterial map={photo} toneMapped={false} />
      </mesh>

      <mesh position={[-520, -280, 30]} layers={LIQUID_GLASS_BACKGROUND_LAYER}>
        <planeGeometry args={[320, 80]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} transparent opacity={0.95} />
      </mesh>
    </group>
  )
}

function DemoGlassPanels() {
  return (
    <group>
      <LiquidGlass position={[0, 40, 120]} width={520} height={220} radius={48} />
      <LiquidGlass
        position={[-340, -220, 140]}
        width={240}
        height={96}
        radius={28}
        refraction={0.12}
        blur={0.28}
      />
      <LiquidGlass
        position={[360, -240, 130]}
        width={300}
        height={120}
        radius={36}
        fresnelIntensity={0.42}
        liquidStrength={0.1}
      />
    </group>
  )
}

export function LiquidGlassDemoScene() {
  return (
    <Canvas
      className="experience-canvas"
      dpr={[1, 2]}
      camera={{ fov: 45, near: 10, far: 4000, position: [0, 0, 900] }}
      gl={createWebGPURenderer}
      onCreated={({ gl, size }) => {
        gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        gl.setSize(size.width, size.height, false)
      }}
    >
      <color attach="background" args={['#07070c']} />
      <Suspense fallback={null}>
        <BackgroundPassProvider>
          <DemoBackgroundContent />
          <DemoGlassPanels />
        </BackgroundPassProvider>
      </Suspense>
    </Canvas>
  )
}
