import { useEffect, useState } from 'react'
import {
  defaultGlassSettings,
  defaultGridSettings,
  defaultTiltSettings,
  glassSettings,
  gridSettings,
  tiltSettings,
} from './settings'

const STORAGE_KEY = 'ilg-tweaks-v6'
const POINTER_BLOCK_MS = 120

let revision = 0
const listeners = new Set<() => void>()
let paneHostElement: HTMLElement | null = null
let paneRootElement: HTMLElement | null = null

export function setTweakPaneHost(element: HTMLElement | null) {
  paneHostElement = element
}

export function setTweakPaneElement(element: HTMLElement | null) {
  paneRootElement = element
}

export function isTweakPaneEventTarget(target: EventTarget | null | undefined) {
  if (!(target instanceof Element)) return false
  return target.closest('.tweak-pane-host') !== null
}

export function blockScenePointers(ms = POINTER_BLOCK_MS) {
  if (typeof performance === 'undefined') return
  ignoreSceneUntil = Math.max(ignoreSceneUntil, performance.now() + ms)
}

let ignoreSceneUntil = 0

export function shouldBlockScenePointer(event?: {
  clientX?: number
  clientY?: number
  target?: EventTarget | null
}) {
  if (isTweakPaneEventTarget(event?.target)) return true

  if (typeof performance !== 'undefined' && performance.now() < ignoreSceneUntil) {
    return true
  }

  if (
    event?.clientX !== undefined &&
    event?.clientY !== undefined &&
    isPointOverTweakPane(event.clientX, event.clientY)
  ) {
    return true
  }

  return false
}

export function isPointOverTweakPane(x: number, y: number) {
  const nodes: Element[] = []
  if (paneHostElement) nodes.push(paneHostElement)
  if (paneRootElement && paneRootElement !== paneHostElement) {
    nodes.push(paneRootElement)
  }

  document
    .querySelectorAll('.tweak-pane-host [class^="tp-"]')
    .forEach((node) => nodes.push(node))

  for (const node of nodes) {
    const rect = node.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) continue
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return true
    }
  }

  return false
}

export function bumpTweaks(blockPointer = true) {
  revision += 1
  persistTweaks()
  if (blockPointer) blockScenePointers()
  for (const listener of listeners) listener()
}

export function useTweakRevision() {
  const [value, setValue] = useState(revision)

  useEffect(() => {
    const onChange = () => setValue(revision)
    listeners.add(onChange)
    return () => {
      listeners.delete(onChange)
    }
  }, [])

  return value
}

export function resetTweaks() {
  Object.assign(glassSettings, defaultGlassSettings)
  Object.assign(gridSettings, defaultGridSettings)
  Object.assign(tiltSettings, {
    ...defaultTiltSettings,
    pointerSpring: { ...defaultTiltSettings.pointerSpring },
  })
  bumpTweaks(false)
}

export function shouldShowTweakPane() {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  if (params.has('tweak') || params.has('debug')) return true
  return import.meta.env.DEV
}

export function restoreTweaksFromStorage() {
  Object.assign(glassSettings, defaultGlassSettings)
  Object.assign(gridSettings, defaultGridSettings)
  Object.assign(tiltSettings, {
    ...defaultTiltSettings,
    pointerSpring: { ...defaultTiltSettings.pointerSpring },
  })

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as {
      glass?: Partial<typeof glassSettings>
      grid?: Partial<typeof gridSettings>
      tilt?: Partial<typeof tiltSettings>
    }
    if (parsed.glass) Object.assign(glassSettings, parsed.glass)
    if (parsed.grid) Object.assign(gridSettings, parsed.grid)
    if (parsed.tilt) {
      Object.assign(tiltSettings, parsed.tilt)
      if (parsed.tilt.pointerSpring) {
        Object.assign(tiltSettings.pointerSpring, parsed.tilt.pointerSpring)
      }
    }
  } catch {
    // Ignore malformed storage.
  }
}

function persistTweaks() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        glass: glassSettings,
        grid: gridSettings,
        tilt: tiltSettings,
      }),
    )
  } catch {
    // Ignore quota / private mode.
  }
}

if (typeof window !== 'undefined') {
  restoreTweaksFromStorage()
}
