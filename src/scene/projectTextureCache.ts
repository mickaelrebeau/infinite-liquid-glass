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
  releaseVideo?: () => void
}

const cache = new Map<number, CachedProjectTextures>()
let loadPromise: Promise<void> | null = null
let planeAspectUsed = 1
let videoHost: HTMLDivElement | null = null

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
    }),
  ).then(() => {
    startProjectVideos(planeAspect)
  })

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
    entry.releaseVideo?.()
    entry.image.dispose()
    entry.text.dispose()
  }
  cache.clear()
  loadPromise = null

  if (videoHost) {
    for (const node of [...videoHost.querySelectorAll('video')]) {
      releaseVideoElement(node)
    }
    videoHost.remove()
    videoHost = null
  }
}

function startProjectVideos(planeAspect: number) {
  void (async () => {
    for (let index = 0; index < projects.length; index += 1) {
      if (!cache.has(index)) return
      attachProjectVideo(projects[index], index, planeAspect)
      await wait(90)
    }
  })()
}

function attachProjectVideo(
  project: Project,
  index: number,
  planeAspect: number,
) {
  const entry = cache.get(index)
  if (!entry || entry.video) return

  const video = document.createElement('video')
  video.muted = true
  video.defaultMuted = true
  video.loop = true
  video.autoplay = true
  video.playsInline = true
  video.preload = 'auto'
  video.crossOrigin = 'anonymous'
  video.disablePictureInPicture = true
  video.setAttribute('muted', '')
  video.setAttribute('playsinline', '')
  video.setAttribute('webkit-playsinline', '')
  video.setAttribute('autoplay', '')

  getVideoHost().appendChild(video)
  video.src = project.video

  let promoted = false

  const promote = () => {
    if (promoted) return
    if (video.videoWidth < 2 || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return
    }

    const current = cache.get(index)
    if (!current) return
    promoted = true

    const blit = needsCanvasVideoBlit()
      ? createBlittedVideoTexture(video)
      : null
    const texture = blit?.texture ?? createNativeVideoTexture(video)

    current.image = texture
    current.video = video
    current.cover = computeCoverTransform(
      video.videoWidth,
      video.videoHeight,
      planeAspect || planeAspectUsed,
    )
    current.releaseVideo = () => {
      blit?.stop()
      releaseVideoElement(video)
    }
    void video.play().catch(() => {})
  }

  video.addEventListener('loadedmetadata', promote)
  video.addEventListener('loadeddata', promote)
  video.addEventListener('canplay', promote)
  video.addEventListener('playing', promote)
  video.load()
}

function createNativeVideoTexture(video: HTMLVideoElement) {
  const texture = new VideoTexture(video)
  configureVideoTexture(texture)
  return texture
}

function createBlittedVideoTexture(video: HTMLVideoElement) {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d', {
    alpha: false,
    desynchronized: true,
  })

  if (!ctx) return null

  ctx.drawImage(video, 0, 0)
  const texture = new CanvasTexture(canvas)
  configureVideoTexture(texture)

  let stopped = false
  let frameHandle = 0

  const draw = () => {
    if (stopped || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    texture.needsUpdate = true
  }

  const pump = () => {
    if (stopped) return
    draw()
    if (typeof video.requestVideoFrameCallback === 'function') {
      frameHandle = video.requestVideoFrameCallback(pump)
    } else {
      frameHandle = window.requestAnimationFrame(pump)
    }
  }

  pump()

  return {
    texture,
    stop() {
      stopped = true
      if (typeof video.cancelVideoFrameCallback === 'function') {
        video.cancelVideoFrameCallback(frameHandle)
      } else {
        window.cancelAnimationFrame(frameHandle)
      }
    },
  }
}

function configureVideoTexture(texture: Texture) {
  texture.colorSpace = 'srgb'
  texture.generateMipmaps = false
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.needsUpdate = true
}

function releaseVideoElement(video: HTMLVideoElement) {
  video.pause()
  video.removeAttribute('src')
  video.load()
  video.remove()
}

function getVideoHost() {
  if (videoHost?.isConnected) return videoHost

  videoHost = document.createElement('div')
  videoHost.id = 'ilg-video-host'
  videoHost.setAttribute('aria-hidden', 'true')
  videoHost.style.cssText =
    'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;'
  document.body.appendChild(videoHost)
  return videoHost
}

function needsCanvasVideoBlit() {
  // Firefox WebGPU rejects HTMLVideoElement in copyExternalImageToTexture.
  return /Firefox\/|FxiOS\//i.test(navigator.userAgent)
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
