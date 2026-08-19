import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearFilter,
  VideoTexture,
  type Texture,
} from 'three/webgpu'
import { projects, type Project } from '../data/projects'
import { computeCoverTransform } from './gridMath'
import { createCardImageTexture, createCardTextTexture } from './createCardTexture'
import type { TitleHitRect } from './createCardTexture'

export type CachedProjectTextures = {
  image: Texture
  text: CanvasTexture
  cover: ReturnType<typeof computeCoverTransform>
  video: HTMLVideoElement | null
  titleHit: TitleHitRect
}

const cache = new Map<number, CachedProjectTextures>()
let loadPromise: Promise<void> | null = null
let planeAspectUsed = 1

export function preloadProjectTextures(planeAspect: number): Promise<void> {
  planeAspectUsed = planeAspect
  if (loadPromise) return loadPromise

  loadPromise = Promise.all(
    projects.map(async (project, index) => {
      const [imageCanvas, textAtlas] = await Promise.all([
        createCardImageTexture(project),
        createCardTextTexture(project),
      ])

      const poster = new CanvasTexture(imageCanvas)
      poster.colorSpace = 'srgb'
      poster.wrapS = ClampToEdgeWrapping
      poster.wrapT = ClampToEdgeWrapping
      poster.needsUpdate = true

      const text = new CanvasTexture(textAtlas.canvas)
      text.colorSpace = 'srgb'
      text.generateMipmaps = false
      text.minFilter = LinearFilter
      text.magFilter = LinearFilter
      text.wrapS = ClampToEdgeWrapping
      text.wrapT = ClampToEdgeWrapping
      text.needsUpdate = true

      const entry: CachedProjectTextures = {
        image: poster,
        text,
        cover: computeCoverTransform(
          imageCanvas.width,
          imageCanvas.height,
          planeAspect,
        ),
        video: null,
        titleHit: textAtlas.titleHit,
      }

      cache.set(index, entry)
      attachProjectVideo(project, index, planeAspect)
    }),
  ).then(() => undefined)

  return loadPromise
}

export function getCachedProjectTextures(
  projectIndex: number,
): CachedProjectTextures | null {
  const normalized =
    ((projectIndex % projects.length) + projects.length) % projects.length
  return cache.get(normalized) ?? null
}

export function getProjectByIndex(projectIndex: number): Project {
  const normalized =
    ((projectIndex % projects.length) + projects.length) % projects.length
  return projects[normalized]
}

export function unlockProjectVideos() {
  for (const entry of cache.values()) {
    void entry.video?.play().catch(() => {})
  }
}

export function disposeProjectTextureCache() {
  for (const entry of cache.values()) {
    entry.image.dispose()
    entry.text.dispose()
    entry.video?.pause()
    if (entry.video) {
      entry.video.src = ''
      entry.video.load()
    }
  }
  cache.clear()
  loadPromise = null
}

function attachProjectVideo(
  project: Project,
  index: number,
  planeAspect: number,
) {
  const video = document.createElement('video')
  video.src = project.video
  video.muted = true
  video.loop = true
  video.playsInline = true
  video.autoplay = true
  video.preload = 'auto'
  video.crossOrigin = 'anonymous'

  const promote = () => {
    const entry = cache.get(index)
    if (!entry || video.videoWidth < 2) return

    const texture = new VideoTexture(video)
    texture.colorSpace = 'srgb'
    texture.generateMipmaps = false
    texture.minFilter = LinearFilter
    texture.magFilter = LinearFilter
    texture.wrapS = ClampToEdgeWrapping
    texture.wrapT = ClampToEdgeWrapping
    texture.needsUpdate = true

    entry.image = texture
    entry.video = video
    entry.cover = computeCoverTransform(
      video.videoWidth,
      video.videoHeight,
      planeAspect || planeAspectUsed,
    )
    void video.play().catch(() => {})
  }

  video.addEventListener('loadeddata', promote, { once: true })
  video.load()
}
