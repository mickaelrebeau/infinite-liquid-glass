import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { WebGPURenderer } from 'three/webgpu'
import type { MotionValue } from 'motion/react'
import { GlassGrid, type PointerClick } from './GlassGrid'
import type { DragState } from '../hooks/useInfiniteDrag'
import type { Project } from '../data/projects'
import type { DivePickMeta, DiveSession } from './diveSession'

type LiquidGlassSceneProps = Pick<
  DragState,
  'offsetX' | 'offsetY' | 'velocityMagnitude'
> & {
  pointerX: MotionValue<number>
  pointerY: MotionValue<number>
  clickRequest?: PointerClick | null
  reverseSession?: DiveSession | null
  diving?: boolean
  reducedMotion?: boolean
  onProjectPick?: (project: Project, meta: DivePickMeta) => void
  onRestoreOffset?: (x: number, y: number) => void
  onDiveComplete?: (project: Project) => void
  onReverseStart?: () => void
  onReverseComplete?: () => void
  onTitleHover?: (hovered: boolean) => void
}

export function LiquidGlassScene({
  offsetX,
  offsetY,
  velocityMagnitude,
  pointerX,
  pointerY,
  clickRequest = null,
  reverseSession = null,
  diving = false,
  reducedMotion = false,
  onProjectPick,
  onRestoreOffset,
  onDiveComplete,
  onReverseStart,
  onReverseComplete,
  onTitleHover,
}: LiquidGlassSceneProps) {
  return (
    <Canvas
      className="experience-canvas"
      dpr={[1, 1.5]}
      camera={{
        fov: 45,
        near: 200,
        far: 9600,
        position: [0, 0, 1200],
      }}
      gl={async (props) => {
        const renderer = new WebGPURenderer({
          canvas: props.canvas as HTMLCanvasElement,
          antialias: true,
          alpha: false,
        })
        await renderer.init()
        renderer.setClearColor(0x000008, 1)
        return renderer
      }}
    >
      <Suspense fallback={null}>
        <GlassGrid
          offsetX={offsetX}
          offsetY={offsetY}
          velocityMagnitude={velocityMagnitude}
          pointerX={pointerX}
          pointerY={pointerY}
          clickRequest={clickRequest}
          reverseSession={reverseSession}
          diving={diving}
          reducedMotion={reducedMotion}
          onProjectPick={onProjectPick}
          onRestoreOffset={onRestoreOffset}
          onDiveComplete={onDiveComplete}
          onReverseStart={onReverseStart}
          onReverseComplete={onReverseComplete}
          onTitleHover={onTitleHover}
        />
      </Suspense>
    </Canvas>
  )
}
