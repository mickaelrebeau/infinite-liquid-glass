import type { Project } from '../data/projects'

const CARD_WIDTH = 1024
const CARD_HEIGHT = 768

export async function createCardImageTexture(
  project: Project,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Unable to create 2D canvas context')
  }

  try {
    const image = await loadImage(project.poster)
    drawCover(ctx, image, CARD_WIDTH, CARD_HEIGHT)
  } catch {
    drawFallbackPoster(ctx, project, CARD_WIDTH, CARD_HEIGHT)
  }

  return canvas
}

export type TitleHitRect = {
  u0: number
  v0: number
  u1: number
  v1: number
}

export type CardTextAtlas = {
  canvas: HTMLCanvasElement
  titleHit: TitleHitRect
}

export async function createCardTextTexture(
  project: Project,
): Promise<CardTextAtlas> {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Unable to create 2D canvas context')
  }

  ctx.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT)
  ctx.fillStyle = '#ffffff'

  ctx.font = '500 22px "Geist Mono", "SF Mono", monospace'
  ctx.globalAlpha = 0.85
  ctx.fillText(`${project.id} · ${project.type.toUpperCase()}`, 72, 72)

  ctx.textAlign = 'right'
  ctx.font = '500 20px "Geist Mono", "SF Mono", monospace'
  ctx.globalAlpha = 0.7
  ctx.fillText(hostnameOf(project.url), CARD_WIDTH - 72, 72)
  ctx.textAlign = 'left'

  ctx.globalAlpha = 1
  ctx.font = '600 72px "Geist", "Inter", system-ui, sans-serif'
  const title = project.title
  const titleX = 72
  const titleBaseline = CARD_HEIGHT - 168
  ctx.fillText(title, titleX, titleBaseline)

  const titleWidth = ctx.measureText(title).width
  const titleTop = titleBaseline - 68
  const titleBottom = titleBaseline + 18
  ctx.fillRect(titleX, titleBaseline + 8, Math.max(titleWidth, 48), 3)

  ctx.font = '500 30px "Geist", "Inter", system-ui, sans-serif'
  ctx.globalAlpha = 0.88
  wrapText(ctx, project.description, 72, CARD_HEIGHT - 98, CARD_WIDTH - 144, 38)
  ctx.globalAlpha = 1

  const pad = 18
  const titleHit = canvasRectToUv(
    titleX - pad,
    titleTop - pad,
    titleX + titleWidth + pad,
    titleBottom + pad,
  )

  return { canvas, titleHit }
}

function canvasRectToUv(
  left: number,
  top: number,
  right: number,
  bottom: number,
): TitleHitRect {
  return {
    u0: left / CARD_WIDTH,
    u1: right / CARD_WIDTH,
    v0: 1 - bottom / CARD_HEIGHT,
    v1: 1 - top / CARD_HEIGHT,
  }
}

export function isTitleHit(
  uvX: number,
  uvY: number,
  rect: TitleHitRect,
) {
  return uvX >= rect.u0 && uvX <= rect.u1 && uvY >= rect.v0 && uvY <= rect.v1
}

function hostnameOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toUpperCase()
  } catch {
    return 'LIVE PROJECT'
  }
}

function drawFallbackPoster(
  ctx: CanvasRenderingContext2D,
  project: Project,
  width: number,
  height: number,
) {
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#10182c')
  gradient.addColorStop(1, '#05070f')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.font = '600 42px Inter, sans-serif'
  ctx.fillText(project.title, 72, height / 2)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const imageAspect = image.width / image.height
  const targetAspect = width / height

  let drawWidth = width
  let drawHeight = height
  let offsetX = 0
  let offsetY = 0

  if (imageAspect > targetAspect) {
    drawWidth = height * imageAspect
    offsetX = (width - drawWidth) / 2
  } else {
    drawHeight = width / imageAspect
    offsetY = (height - drawHeight) / 2
  }

  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight)
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(' ')
  let line = ''
  let cursorY = y

  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY)
      line = word
      cursorY += lineHeight
    } else {
      line = test
    }
  }

  if (line) ctx.fillText(line, x, cursorY)
}

export const cardTextureSize = {
  width: CARD_WIDTH,
  height: CARD_HEIGHT,
}
