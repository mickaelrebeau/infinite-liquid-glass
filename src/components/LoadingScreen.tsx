import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

type LoadingScreenProps = {
  visible: boolean
}

export function LoadingScreen({ visible }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!visible) return

    setProgress(0)
    let frame = 0
    const timer = window.setInterval(() => {
      frame += 1
      setProgress((value) => Math.min(100, value + 12))
      if (frame >= 9) window.clearInterval(timer)
    }, 120)

    return () => window.clearInterval(timer)
  }, [visible])

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
