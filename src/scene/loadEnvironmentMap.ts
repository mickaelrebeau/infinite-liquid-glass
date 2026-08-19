import {
  DataTexture,
  EquirectangularReflectionMapping,
  FloatType,
  RGBAFormat,
  type Texture,
} from 'three/webgpu'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'

export async function loadEnvironmentMap(): Promise<Texture> {
  try {
    const loader = new RGBELoader()
    const texture = await loader.loadAsync('/hdri/studio_small_03_1k.hdr')
    texture.mapping = EquirectangularReflectionMapping
    return texture
  } catch (error) {
    console.warn('HDRI indisponible, fallback neutre.', error)
    return createFallbackEnvMap()
  }
}

function createFallbackEnvMap(): Texture {
  const data = new Float32Array([0.16, 0.18, 0.22, 1])
  const texture = new DataTexture(data, 1, 1, RGBAFormat, FloatType)
  texture.mapping = EquirectangularReflectionMapping
  texture.needsUpdate = true
  return texture
}
