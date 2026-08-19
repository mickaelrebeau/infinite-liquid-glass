import { useCallback } from 'react'
import { useMotionValue, useSpring } from 'motion/react'
import { tiltSettings } from '../config/settings'

export type PointerTiltState = {
  pointerX: ReturnType<typeof useMotionValue<number>>
  pointerY: ReturnType<typeof useMotionValue<number>>
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void
  onPointerLeave: () => void
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function usePointerTilt(reducedMotion = false): PointerTiltState {
  const targetX = useMotionValue(0)
  const targetY = useMotionValue(0)
  const pointerX = useSpring(targetX, tiltSettings.pointerSpring)
  const pointerY = useSpring(targetY, tiltSettings.pointerSpring)
  const intensity = reducedMotion ? 0.3 : 1

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const nx = (event.clientX / window.innerWidth - 0.5) * 2
      const ny = (event.clientY / window.innerHeight - 0.5) * 2
      targetX.set(clamp(nx * intensity, -1, 1))
      targetY.set(clamp(ny * intensity, -1, 1))
    },
    [intensity, targetX, targetY],
  )

  const onPointerLeave = useCallback(() => {
    targetX.set(0)
    targetY.set(0)
  }, [targetX, targetY])

  return {
    pointerX,
    pointerY,
    onPointerMove,
    onPointerLeave,
  }
}
