import { motion } from 'motion/react'

type DiveOverlayProps = {
  active: boolean
  appearImmediately?: boolean
}

export function DiveOverlay({
  active,
  appearImmediately = false,
}: DiveOverlayProps) {
  return (
    <motion.div
      className="dive-overlay"
      aria-hidden
      initial={{ opacity: appearImmediately ? 1 : 0 }}
      animate={{ opacity: active ? 1 : 0 }}
      transition={
        active
          ? appearImmediately
            ? { duration: 0 }
            : { delay: 0.72, duration: 0.38, ease: 'easeIn' }
          : { delay: 0, duration: 0.38, ease: 'easeOut' }
      }
    />
  )
}
