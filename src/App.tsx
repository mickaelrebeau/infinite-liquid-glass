import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { useCallback, useEffect, useState } from 'react'
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
import {
  unlockProjectVideos,
  disposeProjectTextureCache,
} from './scene/projectTextureCache'
import {
  clearDiveSession,
  readDiveSession,
  saveDiveSession,
  type DivePickMeta,
} from './scene/diveSession'
import type { PointerClick } from './scene/GlassGrid'
import { projects, type Project } from './data/projects'

const initialDive = readDiveSession()

function App() {
  const webgpuSupported = useWebGPUSupport()
  const reducedMotion = usePrefersReducedMotion()
  const drag = useInfiniteDrag(
    reducedMotion,
    initialDive
      ? { x: initialDive.offsetX, y: initialDive.offsetY }
      : undefined,
  )
  const pointerTilt = usePointerTilt(reducedMotion)
  const [reverseSession, setReverseSession] = useState(initialDive)
  const [loading, setLoading] = useState(!initialDive)
  const [clickRequest, setClickRequest] = useState<PointerClick | null>(null)
  const [diving, setDiving] = useState(Boolean(initialDive))
  const [overTitle, setOverTitle] = useState(false)
  const [sceneEpoch, setSceneEpoch] = useState(0)

  const transitioning = diving || Boolean(reverseSession)

  useEffect(() => {
    if (!loading) {
      unlockProjectVideos()
      return
    }
    const timer = window.setTimeout(() => setLoading(false), 1080)
    return () => window.clearTimeout(timer)
  }, [loading])

  const handleTap = (
    x: number,
    y: number,
    originX: number,
    originY: number,
  ) => {
    if (transitioning) return
    unlockProjectVideos()
    setClickRequest({ id: Date.now(), x, y, originX, originY })
  }

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      unlockProjectVideos()
      drag.onWheel(event)
    },
    [drag.onWheel],
  )

  const handleProjectPick = (project: Project, meta: DivePickMeta) => {
    saveDiveSession({
      projectId: project.id,
      projectIndex: projects.findIndex((item) => item.id === project.id),
      ...meta,
    })
    setDiving(true)
  }

  const handleDiveComplete = (project: Project) => {
    const failSafe = window.setTimeout(() => {
      setDiving(false)
    }, 2500)

    const clearFailSafe = () => window.clearTimeout(failSafe)
    window.addEventListener('pagehide', clearFailSafe, { once: true })
    window.location.assign(project.url)
  }

  const handleReverseStart = () => {
    setLoading(false)
    setDiving(false)
    unlockProjectVideos()
  }

  const handleReverseComplete = () => {
    clearDiveSession()
    setReverseSession(null)
    setDiving(false)
  }

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      const saved = readDiveSession()
      if (saved) {
        drag.jumpTo(saved.offsetX, saved.offsetY)
        setReverseSession(saved)
        setDiving(true)
        setLoading(false)
      } else {
        setDiving(false)
        setClickRequest(null)
      }

      if (event.persisted) {
        disposeProjectTextureCache()
        setSceneEpoch((value) => value + 1)
      }
    }

    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [drag.jumpTo])

  const showExperience = webgpuSupported === true

  return (
    <div className="app-shell">
      {showExperience ? (
        <>
          <LiquidGlassScene
            key={sceneEpoch}
            offsetX={drag.offsetX}
            offsetY={drag.offsetY}
            velocityMagnitude={drag.velocityMagnitude}
            pointerX={pointerTilt.pointerX}
            pointerY={pointerTilt.pointerY}
            clickRequest={clickRequest}
            reverseSession={reverseSession}
            diving={transitioning}
            reducedMotion={reducedMotion}
            onProjectPick={handleProjectPick}
            onRestoreOffset={drag.jumpTo}
            onDiveComplete={handleDiveComplete}
            onReverseStart={handleReverseStart}
            onReverseComplete={handleReverseComplete}
            onTitleHover={setOverTitle}
          />
          <DragSurface
            overTitle={overTitle}
            onPan={(event, info) => {
              unlockProjectVideos()
              drag.onPan(event, info)
            }}
            onPanEnd={drag.onPanEnd}
            onWheel={handleWheel}
            onPointerMove={pointerTilt.onPointerMove}
            onPointerLeave={() => {
              pointerTilt.onPointerLeave()
              setOverTitle(false)
            }}
            onTap={handleTap}
            disabled={transitioning}
          />
          <DiveOverlay
            active={diving}
            appearImmediately={Boolean(reverseSession)}
          />
        </>
      ) : webgpuSupported === false ? (
        <StaticFallback />
      ) : null}

      <SiteFooter />
      <LoadingScreen visible={loading} />
      <Analytics />
      <SpeedInsights />
    </div>
  )
}

export default App
