import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  MathUtils,
  PerspectiveCamera,
  Raycaster,
  Vector2,
  Vector3,
  type Camera,
  type Group,
  type Texture,
} from 'three/webgpu'
import type { MotionValue } from 'motion/react'
import { tiltSettings, interactionSettings } from '../config/settings'
import { projects } from '../data/projects'
import {
  buildGridCells,
  computeCardVisualScale,
  computeGridLayout,
  type GridLayout,
} from './gridMath'
import { loadEnvironmentMap } from './loadEnvironmentMap'
import {
  getCachedProjectTextures,
  getProjectByIndex,
  preloadProjectTextures,
} from './projectTextureCache'
import { isTitleHit, type TitleHitRect } from './createCardTexture'
import { GlassCard } from './GlassCard'
import { StarryBackground } from './StarryBackground'
import type { Project } from '../data/projects'

export type PointerClick = {
  id: number
  x: number
  y: number
  originX: number
  originY: number
}

type GlassGridProps = {
  offsetX: MotionValue<number>
  offsetY: MotionValue<number>
  velocityMagnitude: MotionValue<number>
  pointerX: MotionValue<number>
  pointerY: MotionValue<number>
  clickRequest?: PointerClick | null
  diving?: boolean
  reducedMotion?: boolean
  onProjectPick?: (project: Project) => void
  onDiveComplete?: (project: Project) => void
  onTitleHover?: (hovered: boolean) => void
}

type DiveState = {
  project: Project
  slotIndex: number
  startCam: Vector3
  targetCam: Vector3
  startLook: Vector3
  targetLook: Vector3
  elapsed: number
}

const DIVE_DURATION = 1.15
const lookTarget = new Vector3()
const worldPos = new Vector3()
const ndc = new Vector2()
const raycaster = new Raycaster()

export function GlassGrid({
  offsetX,
  offsetY,
  velocityMagnitude,
  pointerX,
  pointerY,
  clickRequest = null,
  diving = false,
  reducedMotion = false,
  onProjectPick,
  onDiveComplete,
  onTitleHover,
}: GlassGridProps) {
  const { size, camera } = useThree()
  const surfaceRigRef = useRef<Group>(null)
  const groupRefs = useRef<(Group | null)[]>([])
  const projectIndexRef = useRef<number[]>([])
  const infiniteColRef = useRef<number[]>([])
  const infiniteRowRef = useRef<number[]>([])
  const visualScaleRef = useRef<number[]>([])
  const layoutCache = useRef<GridLayout | null>(null)
  const tiltRef = useRef({ x: 0, y: 0 })
  const diveRef = useRef<DiveState | null>(null)
  const completedRef = useRef(false)
  const titleHoverRef = useRef(false)
  const [envMap, setEnvMap] = useState<Texture | null>(null)
  const [texturesReady, setTexturesReady] = useState(false)

  const layout = useMemo(
    () => computeGridLayout(size.width, size.height),
    [size.width, size.height],
  )

  const slotCount = layout.cols * layout.rows
  const tiltFactor = reducedMotion ? 0.35 : 1

  useEffect(() => {
    let cancelled = false
    void loadEnvironmentMap()
      .then((texture) => {
        if (!cancelled) setEnvMap(texture)
      })
      .catch(() => {
        if (!cancelled) setEnvMap(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setTexturesReady(false)
    void preloadProjectTextures(layout.planeAspect).then(() => {
      if (!cancelled) setTexturesReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [layout.planeAspect])

  useEffect(() => {
    if (!clickRequest || diveRef.current) return
    if (velocityMagnitude.get() > interactionSettings.clickMaxVelocity) return

    const originHit = hitTitleAt(
      clickRequest.originX,
      clickRequest.originY,
      size,
      camera,
      groupRefs.current,
    )
    const endHit = hitTitleAt(
      clickRequest.x,
      clickRequest.y,
      size,
      camera,
      groupRefs.current,
    )

    if (
      !originHit ||
      !endHit ||
      originHit.projectIndex !== endHit.projectIndex ||
      originHit.slotIndex !== endHit.slotIndex
    ) {
      return
    }

    const { group, projectIndex, slotIndex } = endHit
    const project = getProjectByIndex(projectIndex)

    onProjectPick?.(project)

    if (reducedMotion) {
      onDiveComplete?.(project)
      return
    }

    group.getWorldPosition(worldPos)
    if (camera instanceof PerspectiveCamera) {
      camera.near = 24
      camera.updateProjectionMatrix()
    }
    const startCam = camera.position.clone()
    const toward = startCam.clone().sub(worldPos).normalize()
    const fillDistance = Math.max(layout.planeHeight * 0.78, 360)
    diveRef.current = {
      project,
      slotIndex,
      startCam,
      targetCam: worldPos.clone().add(toward.multiplyScalar(fillDistance)),
      startLook: new Vector3(0, 0, 0),
      targetLook: worldPos.clone(),
      elapsed: 0,
    }
    completedRef.current = false
  }, [clickRequest, camera, layout.planeHeight, onDiveComplete, onProjectPick, reducedMotion, size, velocityMagnitude])

  useFrame((_, delta) => {
    const dive = diveRef.current

    if (!dive) {
      const cells = buildGridCells(
        layout,
        offsetX.get(),
        offsetY.get(),
        projects.length,
      )

      const velocity = velocityMagnitude.get()
      const zoom =
        layout.maxZoomZ <= 0
          ? 0
          : 3 *
            layout.maxZoomZ *
            Math.tanh((0.04 * velocity) / (3 * layout.maxZoomZ))

      const pointerNormX = pointerX.get()
      const pointerNormY = pointerY.get()
      const targetPitch = -pointerNormY * tiltSettings.maxPitch * tiltFactor
      const targetYaw = pointerNormX * tiltSettings.maxYaw * tiltFactor

      tiltRef.current.x +=
        (targetPitch - tiltRef.current.x) * tiltSettings.smoothing
      tiltRef.current.y +=
        (targetYaw - tiltRef.current.y) * tiltSettings.smoothing

      if (surfaceRigRef.current) {
        surfaceRigRef.current.rotation.x = tiltRef.current.x
        surfaceRigRef.current.rotation.y = tiltRef.current.y
      }

      if (camera instanceof PerspectiveCamera) {
        if (
          layoutCache.current?.perspective !== layout.perspective ||
          layoutCache.current?.cols !== layout.cols ||
          layoutCache.current?.rows !== layout.rows
        ) {
          camera.fov = MathUtils.radToDeg(
            2 * Math.atan(size.height / 2 / layout.perspective),
          )
          camera.aspect = size.width / Math.max(size.height, 1)
          camera.near = layout.perspective * 0.25
          camera.far = layout.perspective * 8
          camera.updateProjectionMatrix()
          layoutCache.current = layout
        }

        camera.position.set(0, 0, layout.perspective + zoom)
        camera.rotation.set(0, 0, 0)
        camera.updateMatrixWorld()
      }

      cells.forEach((cell, index) => {
        projectIndexRef.current[index] = cell.projectIndex
        infiniteColRef.current[index] = cell.infiniteCol
        infiniteRowRef.current[index] = cell.infiniteRow

        const group = groupRefs.current[index]
        if (!group) return
        group.position.copy(cell.position)
        group.quaternion.identity()

        const visualScale = computeCardVisualScale(
          cell.position.x,
          cell.position.y,
          layout,
        )
        visualScaleRef.current[index] = visualScale
        group.scale.set(
          layout.planeWidth * visualScale,
          layout.planeHeight * visualScale,
          1,
        )
      })

      ndc.set(pointerNormX, -pointerNormY)
      raycaster.setFromCamera(ndc, camera)
      const hoverHits = raycaster.intersectObjects(
        groupRefs.current.flatMap((group) => (group ? group.children : [])),
        false,
      )
      const hoverHit = hoverHits[0]
      const hoverGroup = hoverHit?.object.parent as Group | null
      const hoverIndex = hoverGroup?.userData.projectIndex
      const hoverRect =
        typeof hoverIndex === 'number'
          ? getCachedProjectTextures(hoverIndex)?.titleHit
          : null
      const hovered = Boolean(
        hoverHit?.uv &&
          hoverRect &&
          isTitleHit(hoverHit.uv.x, hoverHit.uv.y, hoverRect),
      )
      if (hovered !== titleHoverRef.current) {
        titleHoverRef.current = hovered
        onTitleHover?.(hovered)
      }
      return
    }

    dive.elapsed += delta
    const t = Math.min(1, dive.elapsed / DIVE_DURATION)
    const ease = t * t * t

    if (surfaceRigRef.current) {
      surfaceRigRef.current.rotation.x = tiltRef.current.x * (1 - ease)
      surfaceRigRef.current.rotation.y = tiltRef.current.y * (1 - ease)
    }

    camera.position.lerpVectors(dive.startCam, dive.targetCam, ease)
    lookTarget.lerpVectors(dive.startLook, dive.targetLook, ease)
    camera.lookAt(lookTarget)
    camera.updateMatrixWorld()

    groupRefs.current.forEach((group, index) => {
      if (!group) return
      if (group.userData.diveOriginZ === undefined) {
        group.userData.diveOriginZ = group.position.z
      }
      if (index === dive.slotIndex) {
        const grow = 1 + ease * 0.22
        group.scale.set(
          layout.planeWidth * grow,
          layout.planeHeight * grow,
          1,
        )
        return
      }
      const shrink = Math.max(0.08, 1 - ease * 0.92)
      group.scale.set(
        layout.planeWidth * shrink,
        layout.planeHeight * shrink,
        1,
      )
      group.position.z = group.userData.diveOriginZ - ease * 160
    })

    if (t >= 1 && !completedRef.current) {
      completedRef.current = true
      onDiveComplete?.(dive.project)
    }
  })

  return (
    <>
      <StarryBackground reducedMotion={reducedMotion || diving} />
      {envMap ? (
        <group ref={surfaceRigRef} name="glass-surface">
          {Array.from({ length: slotCount }, (_, slotIndex) => (
            <GlassCard
              key={slotIndex}
              ref={(group) => {
                groupRefs.current[slotIndex] = group
              }}
              slotIndex={slotIndex}
              layout={layout}
              envMap={envMap}
              projectIndexRef={projectIndexRef}
              infiniteColRef={infiniteColRef}
              infiniteRowRef={infiniteRowRef}
              visualScaleRef={visualScaleRef}
              texturesReady={texturesReady}
            />
          ))}
        </group>
      ) : null}
    </>
  )
}

function hitTitleAt(
  clientX: number,
  clientY: number,
  size: { width: number; height: number },
  camera: Camera,
  groups: (Group | null)[],
) {
  ndc.set(
    (clientX / size.width) * 2 - 1,
    -(clientY / size.height) * 2 + 1,
  )
  raycaster.setFromCamera(ndc, camera)

  const meshes = groups.flatMap((group) => (group ? group.children : []))
  const hit = raycaster.intersectObjects(meshes, false)[0]
  const group = hit?.object.parent as Group | null
  const projectIndex = group?.userData.projectIndex
  const slotIndex = group?.userData.slotIndex

  if (
    !hit ||
    !group ||
    typeof projectIndex !== 'number' ||
    typeof slotIndex !== 'number'
  ) {
    return null
  }

  const titleHit =
    getCachedProjectTextures(projectIndex)?.titleHit ??
    (group.userData.titleHit as TitleHitRect | undefined)
  const uv = hit.uv
  if (!uv || !titleHit || !isTitleHit(uv.x, uv.y, titleHit)) {
    return null
  }

  return { group, projectIndex, slotIndex }
}
