import { WebGPURenderer } from 'three/webgpu'

const MAX_DPR = 1.5
const pendingByCanvas = new WeakMap<HTMLCanvasElement, Promise<WebGPURenderer>>()

/**
 * R3F v9 re-enters `configure()` while an async `gl` factory is still
 * pending (parent setState, env map ready, StrictMode). A second
 * WebGPURenderer on the same canvas keeps the default 300×150 depth
 * buffer and Firefox then dies with a GPUValidationError.
 */
export function createWebGPURenderer(props: { canvas: unknown }) {
  const canvas = props.canvas
  if (!(canvas instanceof HTMLCanvasElement)) {
    return Promise.reject(new Error('WebGPU renderer expects an HTML canvas'))
  }

  const pending = pendingByCanvas.get(canvas)
  if (pending) return pending

  const created = instantiateRenderer(canvas)
  pendingByCanvas.set(canvas, created)
  return created
}

async function instantiateRenderer(canvas: HTMLCanvasElement) {
  try {
    const firefox = isFirefox()
    const { width, height, dpr } = fitCanvasBuffer(canvas)

    const renderer = new WebGPURenderer({
      canvas,
      antialias: !firefox,
      alpha: false,
      powerPreference: 'high-performance',
    })

    await renderer.init()
    renderer.setPixelRatio(dpr)
    renderer.setSize(width, height, false)
    renderer.setClearColor(0x000008, 1)

    // Firefox can still size color vs depth on the next layout tick.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        const next = fitCanvasBuffer(canvas)
        renderer.setPixelRatio(next.dpr)
        renderer.setSize(next.width, next.height, false)
        resolve()
      })
    })

    return renderer
  } catch (error) {
    pendingByCanvas.delete(canvas)
    throw error
  }
}

function fitCanvasBuffer(canvas: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
  const cssWidth =
    canvas.clientWidth ||
    canvas.parentElement?.clientWidth ||
    window.innerWidth
  const cssHeight =
    canvas.clientHeight ||
    canvas.parentElement?.clientHeight ||
    window.innerHeight

  const width = Math.max(1, cssWidth < 32 ? window.innerWidth : cssWidth)
  const height = Math.max(1, cssHeight < 32 ? window.innerHeight : cssHeight)

  canvas.width = Math.max(1, Math.round(width * dpr))
  canvas.height = Math.max(1, Math.round(height * dpr))

  return { width, height, dpr }
}

function isFirefox() {
  return /Firefox\/|FxiOS\//i.test(navigator.userAgent)
}
