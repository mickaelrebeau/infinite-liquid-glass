import { useEffect } from 'react'
import { Pane } from 'tweakpane'
import {
  glassSettings,
  gridSettings,
  tiltSettings,
} from '../config/settings'
import {
  bumpTweaks,
  resetTweaks,
  restoreTweaksFromStorage,
  setTweakPaneElement,
  setTweakPaneHost,
  shouldShowTweakPane,
} from '../config/tweakStore'

type Refreshable = { refresh: () => void }

type BindingLike = Refreshable & {
  on: (event: 'change', handler: () => void) => unknown
}

type FolderLike = {
  addBinding: (
    target: Record<string, unknown>,
    key: string,
    options?: Record<string, unknown>,
  ) => BindingLike
}

type PaneLike = {
  element: HTMLElement
  addFolder: (params: { title: string; expanded?: boolean }) => FolderLike
  addButton: (params: { title: string }) => {
    on: (event: 'click', handler: () => void) => void
  }
  refresh: () => void
  dispose: () => void
}

function trackBinding(binding: BindingLike, sink: Refreshable[]) {
  sink.push(binding)
  binding.on('change', () => bumpTweaks())
}

export function TweakPane() {
  useEffect(() => {
    if (!shouldShowTweakPane()) return

    restoreTweaksFromStorage()

    const host = document.createElement('div')
    host.className = 'tweak-pane-host'
    document.body.appendChild(host)
    setTweakPaneHost(host)

    const pane = new Pane({
      title: 'Uniforms',
      expanded: true,
      container: host,
    }) as unknown as PaneLike

    setTweakPaneElement(pane.element)

    const bindings: Refreshable[] = []

    const glass = pane.addFolder({ title: 'Glass' })
    trackBinding(
      glass.addBinding(glassSettings, 'ior', { min: 1, max: 3.2, step: 0.01 }),
      bindings,
    )
    trackBinding(
      glass.addBinding(glassSettings, 'thickness', { min: 8, max: 280, step: 1 }),
      bindings,
    )
    trackBinding(
      glass.addBinding(glassSettings, 'refractStrength', {
        min: 0,
        max: 1.4,
        step: 0.01,
      }),
      bindings,
    )
    trackBinding(
      glass.addBinding(glassSettings, 'dispersion', { min: 0, max: 0.8, step: 0.01 }),
      bindings,
    )
    trackBinding(
      glass.addBinding(glassSettings, 'fresnelF0', { min: 0, max: 0.2, step: 0.001 }),
      bindings,
    )
    trackBinding(
      glass.addBinding(glassSettings, 'cornerRadius', {
        min: 0.02,
        max: 0.4,
        step: 0.001,
      }),
      bindings,
    )
    trackBinding(
      glass.addBinding(glassSettings, 'bevelWidth', { min: 0.02, max: 0.4, step: 0.001 }),
      bindings,
    )
    trackBinding(
      glass.addBinding(glassSettings, 'bevelPower', { min: 0.4, max: 6, step: 0.05 }),
      bindings,
    )
    trackBinding(
      glass.addBinding(glassSettings, 'bevelMaxSlope', { min: 0.2, max: 4, step: 0.01 }),
      bindings,
    )
    trackBinding(
      glass.addBinding(glassSettings, 'envIntensity', { min: 0, max: 3, step: 0.01 }),
      bindings,
    )
    trackBinding(
      glass.addBinding(glassSettings, 'envMaxMix', { min: 0, max: 1, step: 0.01 }),
      bindings,
    )
    trackBinding(
      glass.addBinding(glassSettings, 'envRotation', {
        min: -Math.PI,
        max: Math.PI,
        step: 0.01,
      }),
      bindings,
    )
    trackBinding(
      glass.addBinding(glassSettings, 'envRotationX', {
        min: -Math.PI,
        max: Math.PI,
        step: 0.01,
      }),
      bindings,
    )
    trackBinding(
      glass.addBinding(glassSettings, 'rimWidth', { min: 0, max: 24, step: 0.1 }),
      bindings,
    )
    trackBinding(
      glass.addBinding(glassSettings, 'rimIntensity', { min: 0, max: 0.6, step: 0.005 }),
      bindings,
    )
    trackBinding(glass.addBinding(glassSettings, 'rimColor', { view: 'color' }), bindings)
    trackBinding(glass.addBinding(glassSettings, 'rimColorTop', { view: 'color' }), bindings)
    trackBinding(glass.addBinding(glassSettings, 'tint', { view: 'color' }), bindings)

    const grid = pane.addFolder({ title: 'Grid', expanded: false })
    trackBinding(
      grid.addBinding(gridSettings, 'planeWidthRatio', {
        min: 0.18,
        max: 0.55,
        step: 0.001,
      }),
      bindings,
    )
    trackBinding(
      grid.addBinding(gridSettings, 'planeWidthRatioPortrait', {
        min: 0.4,
        max: 0.9,
        step: 0.001,
      }),
      bindings,
    )
    trackBinding(
      grid.addBinding(gridSettings, 'gapRatio', { min: 0, max: 0.2, step: 0.001 }),
      bindings,
    )
    trackBinding(
      grid.addBinding(gridSettings, 'sphereRadius', { min: 800, max: 12000, step: 50 }),
      bindings,
    )
    trackBinding(
      grid.addBinding(gridSettings, 'coverageMargin', { min: 0.8, max: 1.6, step: 0.01 }),
      bindings,
    )
    trackBinding(
      grid.addBinding(gridSettings, 'edgeScaleFalloff', { min: 0, max: 0.5, step: 0.01 }),
      bindings,
    )

    const tilt = pane.addFolder({ title: 'Tilt', expanded: false })
    trackBinding(
      tilt.addBinding(tiltSettings, 'maxPitch', { min: 0, max: 0.25, step: 0.005 }),
      bindings,
    )
    trackBinding(
      tilt.addBinding(tiltSettings, 'maxYaw', { min: 0, max: 0.25, step: 0.005 }),
      bindings,
    )
    trackBinding(
      tilt.addBinding(tiltSettings, 'smoothing', { min: 0.02, max: 0.4, step: 0.01 }),
      bindings,
    )

    pane.addButton({ title: 'Reset' }).on('click', () => {
      resetTweaks()
      for (const binding of bindings) binding.refresh()
      pane.refresh()
    })

    pane.addButton({ title: 'Log settings' }).on('click', () => {
      console.info('[ILG tweaks]', {
        glassSettings: { ...glassSettings },
        gridSettings: { ...gridSettings },
        tiltSettings: {
          maxPitch: tiltSettings.maxPitch,
          maxYaw: tiltSettings.maxYaw,
          smoothing: tiltSettings.smoothing,
        },
      })
    })

    bumpTweaks(false)

    return () => {
      setTweakPaneHost(null)
      setTweakPaneElement(null)
      pane.dispose()
      host.remove()
    }
  }, [])

  return null
}
