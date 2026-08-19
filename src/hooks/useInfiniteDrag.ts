import { useEffect } from 'react'
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
}

export function useInfiniteDrag(reducedMotion = false): DragState {
  const targetX = useMotionValue(0)
  const targetY = useMotionValue(0)
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
  }
}
