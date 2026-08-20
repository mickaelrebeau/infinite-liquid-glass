import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import type { PanInfo } from 'motion/react'
import { interactionSettings } from '../config/settings'

type DragSurfaceProps = {
  onPan: (event: PointerEvent, info: PanInfo) => void
  onPanEnd: (event: PointerEvent, info: PanInfo) => void
  onWheel?: (event: WheelEvent) => void
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void
  onPointerLeave: () => void
  onTap?: (x: number, y: number, originX: number, originY: number) => void
  disabled?: boolean
  overTitle?: boolean
}

type Gesture = {
  pointerId: number | null
  startX: number
  startY: number
  moved: number
  panned: boolean
}

const idleGesture = (): Gesture => ({
  pointerId: null,
  startX: 0,
  startY: 0,
  moved: 0,
  panned: false,
})

export function DragSurface({
  onPan,
  onPanEnd,
  onWheel,
  onPointerMove,
  onPointerLeave,
  onTap,
  disabled = false,
  overTitle = false,
}: DragSurfaceProps) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const gestureRef = useRef<Gesture>(idleGesture())
  const cooldownUntilRef = useRef(0)

  useEffect(() => {
    const node = surfaceRef.current
    if (!node || disabled || !onWheel) return

    const handleWheel = (event: WheelEvent) => {
      onWheel(event)
    }

    node.addEventListener('wheel', handleWheel, { passive: false })
    return () => node.removeEventListener('wheel', handleWheel)
  }, [disabled, onWheel])

  const markPan = () => {
    gestureRef.current.panned = true
  }

  const beginCooldown = () => {
    cooldownUntilRef.current =
      performance.now() + interactionSettings.postDragCooldownMs
  }

  return (
    <motion.div
      ref={surfaceRef}
      className={`drag-surface${disabled ? ' is-diving' : ''}${overTitle ? ' is-over-title' : ''}`}
      onPan={
        disabled
          ? undefined
          : (event, info) => {
              markPan()
              onPan(event, info)
            }
      }
      onPanEnd={
        disabled
          ? undefined
          : (event, info) => {
              markPan()
              beginCooldown()
              onPanEnd(event, info)
            }
      }
      onPointerDown={
        disabled
          ? undefined
          : (event) => {
              event.currentTarget.setPointerCapture(event.pointerId)
              gestureRef.current = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                moved: 0,
                panned: false,
              }
            }
      }
      onPointerMove={
        disabled
          ? undefined
          : (event) => {
              onPointerMove(event)
              const gesture = gestureRef.current
              if (gesture.pointerId !== event.pointerId) return
              gesture.moved = Math.max(
                gesture.moved,
                Math.hypot(
                  event.clientX - gesture.startX,
                  event.clientY - gesture.startY,
                ),
              )
            }
      }
      onPointerUp={
        disabled
          ? undefined
          : (event) => {
              const gesture = gestureRef.current
              if (gesture.pointerId !== event.pointerId) return
              gestureRef.current = idleGesture()

              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId)
              }

              if (performance.now() < cooldownUntilRef.current) return
              if (gesture.panned) return
              if (gesture.moved > interactionSettings.tapMaxDistance) return

              onTap?.(
                event.clientX,
                event.clientY,
                gesture.startX,
                gesture.startY,
              )
            }
      }
      onPointerCancel={() => {
        gestureRef.current = idleGesture()
      }}
      onPointerLeave={disabled ? undefined : onPointerLeave}
      aria-label="Explorer les projets"
    />
  )
}
