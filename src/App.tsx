import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { useEffect, useState } from 'react'
import { LiquidGlassScene } from './scene/LiquidGlassScene'
import { DragSurface } from './components/DragSurface'
import { SiteFooter } from './components/SiteFooter'
import { StaticFallback } from './components/StaticFallback'
import { LoadingScreen } from './components/LoadingScreen'
import { DiveOverlay } from './components/DiveOverlay'
import { useInfiniteDrag } from './hooks/useInfiniteDrag'
import { usePointerTilt } from './hooks/usePointerTilt'
import {
  usePrefersReducedMotion,
  useWebGPUSupport,
} from './hooks/useWebGPUSupport'
import { unlockProjectVideos } from './scene/projectTextureCache'
import type { PointerClick } from './scene/GlassGrid'
import type { Project } from './data/projects'

function App() {
  const webgpuSupported = useWebGPUSupport()
  const reducedMotion = usePrefersReducedMotion()
  const drag = useInfiniteDrag(reducedMotion)
  const pointerTilt = usePointerTilt(reducedMotion)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const [clickRequest, setClickRequest] = useState<PointerClick | null>(null)
  const [diving, setDiving] = useState(false)
  const [overTitle, setOverTitle] = useState(false)

  useEffect(() => {
    let frame = 0
    const timer = window.setInterval(() => {
      frame += 1
      setProgress((value) => Math.min(100, value + 12))
      if (frame >= 9) {
        window.clearInterval(timer)
        setLoading(false)
      }
    }, 120)

    return () => window.clearInterval(timer)
  }, [])

  const handleTap = (
    x: number,
    y: number,
    originX: number,
    originY: number,
  ) => {
    if (diving) return
    unlockProjectVideos()
    setClickRequest({ id: Date.now(), x, y, originX, originY })
  }

  const handleProjectPick = (_project: Project) => {
    setDiving(true)
  }

  const handleDiveComplete = (project: Project) => {
    window.location.assign(project.url)
  }

  const showExperience = webgpuSupported === true

  return (
    <div className="app-shell">
      {showExperience ? (
        <>
          <LiquidGlassScene
            offsetX={drag.offsetX}
            offsetY={drag.offsetY}
            velocityMagnitude={drag.velocityMagnitude}
            pointerX={pointerTilt.pointerX}
            pointerY={pointerTilt.pointerY}
            clickRequest={clickRequest}
            diving={diving}
            reducedMotion={reducedMotion}
            onProjectPick={handleProjectPick}
            onDiveComplete={handleDiveComplete}
            onTitleHover={setOverTitle}
          />
          <DragSurface
            overTitle={overTitle}
            onPan={(event, info) => {
              unlockProjectVideos()
              drag.onPan(event, info)
            }}
            onPanEnd={drag.onPanEnd}
            onPointerMove={pointerTilt.onPointerMove}
            onPointerLeave={() => {
              pointerTilt.onPointerLeave()
              setOverTitle(false)
            }}
            onTap={handleTap}
            disabled={diving}
          />
          <DiveOverlay active={diving} />
        </>
      ) : webgpuSupported === false ? (
        <StaticFallback />
      ) : null}

      <SiteFooter />
      <LoadingScreen progress={progress} visible={loading} />
      <Analytics />
      <SpeedInsights />
    </div>
  )
}

export default App
