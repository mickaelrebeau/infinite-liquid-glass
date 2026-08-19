import { motion } from 'motion/react'

type DiveOverlayProps = {
  active: boolean
}

export function DiveOverlay({ active }: DiveOverlayProps) {
  return (
    <motion.div
      className="dive-overlay"
      aria-hidden
      initial={false}
      animate={{ opacity: active ? 1 : 0 }}
      transition={{ delay: active ? 0.72 : 0, duration: 0.38, ease: 'easeIn' }}
    />
  )
}
