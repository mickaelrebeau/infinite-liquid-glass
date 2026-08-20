import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector2 } from 'three/webgpu'
import type { ThreeEvent } from '@react-three/fiber'
import type { LiquidGlassUniformBundle } from '../../shaders/liquid-glass/uniforms'
import type { LiquidGlassParams } from '../../shaders/liquid-glass/types'

type SpringState = {
  x: number
  y: number
  vx: number
  vy: number
}

type InteractionConfig = Pick<
  LiquidGlassParams,
  'springStrength' | 'springDamping' | 'interactionRadius'
>

export function useLiquidGlassInteraction(
  uniforms: LiquidGlassUniformBundle,
  config: InteractionConfig,
) {
  const targetRef = useRef(new Vector2(0, 0))
  const springRef = useRef<SpringState>({ x: 0, y: 0, vx: 0, vy: 0 })
  const activeRef = useRef(false)
  const configRef = useRef(config)

  configRef.current = config

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30)
    const { springStrength, springDamping } = configRef.current
    const state = springRef.current
    const target = targetRef.current

    const ax = (target.x - state.x) * springStrength - state.vx * springDamping
    const ay = (target.y - state.y) * springStrength - state.vy * springDamping

    state.vx += ax * dt
    state.vy += ay * dt
    state.x += state.vx * dt
    state.y += state.vy * dt

    if (!activeRef.current) {
      state.x *= 0.92
      state.y *= 0.92
      state.vx *= 0.85
      state.vy *= 0.85
    }

    uniforms.smoothedMouse.value.set(state.x, state.y)
  })

  useEffect(() => {
    return () => {
      uniforms.smoothedMouse.value.set(0, 0)
    }
  }, [uniforms.smoothedMouse])

  const setTargetFromEvent = (event: ThreeEvent<PointerEvent>) => {
    const local = event.uv
    if (!local) return
    targetRef.current.set(local.x * 2 - 1, local.y * 2 - 1)
    activeRef.current = true
  }

  const clearTarget = () => {
    activeRef.current = false
    targetRef.current.set(0, 0)
  }

  return {
    onPointerMove: setTargetFromEvent,
    onPointerOver: setTargetFromEvent,
    onPointerOut: clearTarget,
    onPointerLeave: clearTarget,
  }
}
