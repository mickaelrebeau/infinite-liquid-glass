import { AnimatePresence, motion } from 'motion/react'

type LoadingScreenProps = {
  progress: number
  visible: boolean
}

export function LoadingScreen({ progress, visible }: LoadingScreenProps) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="loading-screen"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, pointerEvents: 'none' }}
          transition={{ duration: 1.15, ease: [0.16, 1, 0.3, 1] }}
          role="progressbar"
          aria-label="Chargement"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div className="loading-screen__glow" />
          <div className="loading-screen__content">
            <motion.div
              animate={{ opacity: [0.62, 1, 0.62] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="loading-screen__logo">Mike_dreeman</div>
            </motion.div>
            <div className="loading-screen__progress">{progress}%</div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
