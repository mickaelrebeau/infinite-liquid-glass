import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import {
  useMotionValue,
  useSpring,
  type MotionValue,
  type PanInfo,
} from 'motion/react'
import { dragSettings } from '../config/settings'

export type DragState = {
  offsetX: MotionValue<number>
  offsetY: MotionValue<number>
  velocityX: MotionValue<number>
  velocityY: MotionValue<number>
  velocityMagnitude: MotionValue<number>
  onPan: (_event: PointerEvent, info: PanInfo) => void
  onPanEnd: (_event: PointerEvent, info: PanInfo) => void
  jumpTo: (x: number, y: number) => void
}

export function useInfiniteDrag(
  reducedMotion = false,
  initialOffset?: { x: number; y: number },
): DragState {
  const targetX = useMotionValue(initialOffset?.x ?? 0)
  const targetY = useMotionValue(initialOffset?.y ?? 0)
  const velocityX = useMotionValue(0)
  const velocityY = useMotionValue(0)
  const velocityMagTarget = useMotionValue(0)

  const offsetX = useSpring(targetX, dragSettings.spring)
  const offsetY = useSpring(targetY, dragSettings.spring)
  const velocityMagnitude = useSpring(
    velocityMagTarget,
    dragSettings.magnitudeSpring,
  )

  const updateVelocity = (vx: number, vy: number) => {
    velocityX.set(vx)
    velocityY.set(vy)
    velocityMagTarget.set(Math.hypot(vx, vy))
  }

  const onPan = (_event: PointerEvent, info: PanInfo) => {
    const ratio = reducedMotion ? 1 : dragSettings.dragRatio
    targetX.set(targetX.get() + ratio * info.delta.x)
    targetY.set(targetY.get() + ratio * info.delta.y)
    updateVelocity(info.velocity.x, info.velocity.y)
  }

  const onPanEnd = (_event: PointerEvent, info: PanInfo) => {
    if (!reducedMotion) {
      targetX.set(targetX.get() + info.velocity.x * dragSettings.fling)
      targetY.set(targetY.get() + info.velocity.y * dragSettings.fling)
    }
    updateVelocity(info.velocity.x, info.velocity.y)
  }

  const jumpTo = useCallback((x: number, y: number) => {
    snapMotion(offsetX, x)
    snapMotion(offsetY, y)
    snapMotion(targetX, x)
    snapMotion(targetY, y)
    snapMotion(velocityX, 0)
    snapMotion(velocityY, 0)
    snapMotion(velocityMagTarget, 0)
    snapMotion(velocityMagnitude, 0)
  }, [
    offsetX,
    offsetY,
    targetX,
    targetY,
    velocityMagTarget,
    velocityMagnitude,
    velocityX,
    velocityY,
  ])

  const didSnapInitial = useRef(false)

  useLayoutEffect(() => {
    if (!initialOffset || didSnapInitial.current) return
    didSnapInitial.current = true
    jumpTo(initialOffset.x, initialOffset.y)
  }, [initialOffset, jumpTo])

  useEffect(() => {
    const syncMagnitude = () => {
      velocityMagTarget.set(
        Math.hypot(offsetX.getVelocity(), offsetY.getVelocity()),
      )
    }

    const unsubX = offsetX.on('change', syncMagnitude)
    const unsubY = offsetY.on('change', syncMagnitude)

    return () => {
      unsubX()
      unsubY()
    }
  }, [offsetX, offsetY, velocityMagTarget])

  return {
    offsetX,
    offsetY,
    velocityX,
    velocityY,
    velocityMagnitude,
    onPan,
    onPanEnd,
    jumpTo,
  }
}

function snapMotion(value: MotionValue<number>, next: number) {
  const jumpy = value as MotionValue<number> & {
    jump?: (value: number) => void
  }
  if (typeof jumpy.jump === 'function') {
    jumpy.jump(next)
    return
  }
  value.set(next)
}
