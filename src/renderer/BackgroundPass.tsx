import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  DataTexture,
  LinearFilter,
  RenderTarget,
  RGBAFormat,
  type Texture,
} from 'three/webgpu'
import {
  LIQUID_GLASS_BACKGROUND_LAYER,
  LIQUID_GLASS_CAMERA_LAYERS,
} from './layers'

type BackgroundPassContextValue = {
  texture: Texture
}

const fallbackTexture = new DataTexture(new Uint8Array([8, 8, 16, 255]), 1, 1, RGBAFormat)
fallbackTexture.needsUpdate = true

const BackgroundPassContext = createContext<BackgroundPassContextValue>({
  texture: fallbackTexture,
})

export function useBackgroundPassTexture() {
  return useContext(BackgroundPassContext).texture
}

export function BackgroundPassProvider({ children }: { children: ReactNode }) {
  const { gl, scene, camera, size } = useThree()
  const renderTargetRef = useRef<RenderTarget | null>(null)
  const textureRef = useRef<Texture>(fallbackTexture)

  useEffect(() => {
    camera.layers.enable(LIQUID_GLASS_BACKGROUND_LAYER)
    camera.layers.enable(2)
  }, [camera])

  useMemo(() => {
    const target = new RenderTarget(4, 4, {
      depthBuffer: true,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
    })
    renderTargetRef.current = target
    textureRef.current = target.texture
  }, [])

  useFrame(() => {
    const target = renderTargetRef.current
    if (!target) return

    const pixelRatio = gl.getPixelRatio()
    const width = Math.max(1, Math.floor(size.width * pixelRatio))
    const height = Math.max(1, Math.floor(size.height * pixelRatio))

    if (target.width !== width || target.height !== height) {
      target.setSize(width, height)
    }

    const previousTarget = gl.getRenderTarget()
    const previousMask = camera.layers.mask

    camera.layers.set(LIQUID_GLASS_BACKGROUND_LAYER)
    gl.setRenderTarget(target as never)
    gl.clear()
    gl.render(scene, camera)

    camera.layers.mask = previousMask | LIQUID_GLASS_CAMERA_LAYERS
    gl.setRenderTarget(previousTarget)
  }, -100)

  return (
    <BackgroundPassContext.Provider value={{ texture: textureRef.current }}>
      {children}
    </BackgroundPassContext.Provider>
  )
}
