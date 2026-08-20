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
  restoreGridScroll,
  type GridCell,
  type GridLayout,
} from './gridMath'
import { projectIndexForInfiniteCell } from './projectAssignment'
import { loadEnvironmentMap } from './loadEnvironmentMap'
import {
  getCachedProjectTextures,
  getProjectByIndex,
  preloadProjectTextures,
} from './projectTextureCache'
import { isTitleHit, type TitleHitRect } from './createCardTexture'
import { GlassCard } from './GlassCard'
import { StarryBackground } from './StarryBackground'
import type { DivePickMeta, DiveSession } from './diveSession'
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

type DiveState = {
  project: Project
  slotIndex: number
  startCam: Vector3
  targetCam: Vector3
  startLook: Vector3
  targetLook: Vector3
  elapsed: number
  direction: 1 | -1
}

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
  reverseSession = null,
  diving = false,
  reducedMotion = false,
  onProjectPick,
  onRestoreOffset,
  onDiveComplete,
  onReverseStart,
  onReverseComplete,
  onTitleHover,
}: GlassGridProps) {
  const { size, camera } = useThree()
  const surfaceRigRef = useRef<Group>(null)
  const groupRefs = useRef<(Group | null)[]>([])
  const projectIndexRef = useRef<number[]>([])
  const infiniteColRef = useRef<number[]>([])
  const infiniteRowRef = useRef<number[]>([])
  const visualScaleRef = useRef<number[]>([])
  const stickyColRef = useRef<number[]>([])
  const stickyRowRef = useRef<number[]>([])
  const lastLocalXRef = useRef<number[]>([])
  const lastLocalYRef = useRef<number[]>([])
  const poolKeyRef = useRef('')
  const layoutCache = useRef<GridLayout | null>(null)
  const tiltRef = useRef({ x: 0, y: 0 })
  const diveRef = useRef<DiveState | null>(null)
  const completedRef = useRef(false)
  const reverseArmedRef = useRef(false)
  const restoreScrollRef = useRef<{ x: number; y: number } | null>(
    reverseSession
      ? { x: reverseSession.offsetX, y: reverseSession.offsetY }
      : null,
  )
  const restoreAppliedRef = useRef(false)
  const restoreLayoutKeyRef = useRef('')
  const lastViewportKeyRef = useRef('')
  const stableLayoutFramesRef = useRef(0)
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
    if (!reverseSession) {
      restoreScrollRef.current = null
      restoreAppliedRef.current = false
      reverseArmedRef.current = false
      return
    }

    restoreScrollRef.current = {
      x: reverseSession.offsetX,
      y: reverseSession.offsetY,
    }
    restoreAppliedRef.current = false
    restoreLayoutKeyRef.current = ''
    lastViewportKeyRef.current = ''
    stableLayoutFramesRef.current = 0
  }, [reverseSession])

  useEffect(() => {
    reverseArmedRef.current = Boolean(
      reverseSession &&
        envMap &&
        texturesReady &&
        !diveRef.current &&
        !reducedMotion,
    )
  }, [envMap, reducedMotion, reverseSession, texturesReady])

  useEffect(() => {
    if (!reverseSession || !reducedMotion || !envMap || !texturesReady) return
    if (completedRef.current) return
    if (size.width < 64 || size.height < 64) return

    const restored = restoreGridScroll(layout, reverseSession)
    restoreScrollRef.current = restored
    restoreAppliedRef.current = true
    onRestoreOffset?.(restored.x, restored.y)
    completedRef.current = true
    onReverseStart?.()
    onReverseComplete?.()
  }, [
    envMap,
    layout,
    onRestoreOffset,
    onReverseComplete,
    onReverseStart,
    reducedMotion,
    reverseSession,
    size.height,
    size.width,
    texturesReady,
  ])

  useEffect(() => {
    if (!clickRequest || diveRef.current || reverseSession) return
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
    const infiniteCol =
      typeof group.userData.infiniteCol === 'number'
        ? group.userData.infiniteCol
        : (infiniteColRef.current[slotIndex] ?? 0)
    const infiniteRow =
      typeof group.userData.infiniteRow === 'number'
        ? group.userData.infiniteRow
        : (infiniteRowRef.current[slotIndex] ?? 0)

    onProjectPick?.(project, {
      infiniteCol,
      infiniteRow,
      offsetX: offsetX.get(),
      offsetY: offsetY.get(),
      localX: group.position.x,
      localY: group.position.y,
      cellWidth: layout.cellWidth,
      cellHeight: layout.cellHeight,
    })

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
      direction: 1,
    }
    completedRef.current = false
  }, [clickRequest, camera, layout, offsetX, offsetY, onDiveComplete, onProjectPick, reducedMotion, reverseSession, size, velocityMagnitude])

  const applyRestoredScroll = () => {
    if (!reverseSession) return
    if (size.width < 64 || size.height < 64) return

    const layoutKey = `${layout.cols}x${layout.rows}:${layout.cellWidth.toFixed(3)}x${layout.cellHeight.toFixed(3)}`
    if (restoreAppliedRef.current && restoreLayoutKeyRef.current === layoutKey) {
      return
    }

    const restored = restoreGridScroll(layout, reverseSession)
    restoreScrollRef.current = restored
    restoreAppliedRef.current = true
    restoreLayoutKeyRef.current = layoutKey
    poolKeyRef.current = ''
    stickyColRef.current = []
    stickyRowRef.current = []
    lastLocalXRef.current = []
    lastLocalYRef.current = []
    onRestoreOffset?.(restored.x, restored.y)
  }

  const layoutCards = () => {
    applyRestoredScroll()
    const scroll = restoreScrollRef.current
    const cells = buildGridCells(
      layout,
      scroll?.x ?? offsetX.get(),
      scroll?.y ?? offsetY.get(),
      projects.length,
    )

    const poolKey = `${layout.cols}x${layout.rows}:${layout.cellWidth.toFixed(2)}x${layout.cellHeight.toFixed(2)}`
    if (poolKeyRef.current !== poolKey) {
      poolKeyRef.current = poolKey
      stickyColRef.current = []
      stickyRowRef.current = []
      lastLocalXRef.current = []
      lastLocalYRef.current = []
    }

    recycleStickyIdentities(
      cells,
      layout,
      stickyColRef.current,
      stickyRowRef.current,
      lastLocalXRef.current,
      lastLocalYRef.current,
    )

    cells.forEach((cell, index) => {
      const infiniteCol = stickyColRef.current[index]
      const infiniteRow = stickyRowRef.current[index]
      const projectIndex = projectIndexForInfiniteCell(
        infiniteCol,
        infiniteRow,
        projects.length,
      )
      projectIndexRef.current[index] = projectIndex
      infiniteColRef.current[index] = infiniteCol
      infiniteRowRef.current[index] = infiniteRow

      const group = groupRefs.current[index]
      if (!group) return
      group.position.copy(cell.position)
      group.quaternion.identity()
      delete group.userData.diveOriginZ
      group.userData.infiniteCol = infiniteCol
      group.userData.infiniteRow = infiniteRow
      group.userData.projectIndex = projectIndex

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
  }

  const beginReverseDive = (session: DiveSession) => {
    if (size.width < 64 || size.height < 64) return false

    applyRestoredScroll()
    layoutCards()

    const projectIndex =
      session.projectIndex >= 0
        ? session.projectIndex
        : projects.findIndex((project) => project.id === session.projectId)
    if (projectIndex < 0) return false

    let slotIndex = groupRefs.current.findIndex(
      (_, index) =>
        infiniteColRef.current[index] === session.infiniteCol &&
        infiniteRowRef.current[index] === session.infiniteRow &&
        projectIndexRef.current[index] === projectIndex,
    )

    if (slotIndex < 0) {
      const scaleX =
        session.cellWidth && session.cellWidth > 0
          ? layout.cellWidth / session.cellWidth
          : 1
      const scaleY =
        session.cellHeight && session.cellHeight > 0
          ? layout.cellHeight / session.cellHeight
          : 1
      const targetX = (session.localX ?? 0) * scaleX
      const targetY = (session.localY ?? 0) * scaleY
      let best = Infinity
      groupRefs.current.forEach((group, index) => {
        if (!group || projectIndexRef.current[index] !== projectIndex) return
        const dx = group.position.x - targetX
        const dy = group.position.y - targetY
        const dist = dx * dx + dy * dy
        if (dist < best) {
          best = dist
          slotIndex = index
        }
      })
    }

    const group = slotIndex >= 0 ? groupRefs.current[slotIndex] : null
    if (!group) return false

    const applyProject = group.userData.applyProjectIndex as
      | ((index: number) => boolean)
      | undefined
    applyProject?.(projectIndex)
    group.userData.forceProjectIndex = projectIndex
    group.userData.projectIndex = projectIndex

    group.updateWorldMatrix(true, false)
    group.getWorldPosition(worldPos)

    const startCam = new Vector3(0, 0, layout.perspective)
    const toward = startCam.clone().sub(worldPos).normalize()
    const fillDistance = Math.max(layout.planeHeight * 0.78, 360)

    if (camera instanceof PerspectiveCamera) {
      camera.fov = MathUtils.radToDeg(
        2 * Math.atan(size.height / 2 / layout.perspective),
      )
      camera.aspect = size.width / Math.max(size.height, 1)
      camera.near = 24
      camera.far = layout.perspective * 8
      camera.updateProjectionMatrix()
    }

    diveRef.current = {
      project: getProjectByIndex(projectIndex),
      slotIndex,
      startCam,
      targetCam: worldPos.clone().add(toward.multiplyScalar(fillDistance)),
      startLook: new Vector3(0, 0, 0),
      targetLook: worldPos.clone(),
      elapsed: 0,
      direction: -1,
    }
    completedRef.current = false
    tiltRef.current.x = 0
    tiltRef.current.y = 0
    return true
  }

  const applyDivePose = (ease: number) => {
    const dive = diveRef.current
    if (!dive) return

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
  }

  useFrame((_, delta) => {
    const dive = diveRef.current

    if (!dive) {
      const viewportKey = `${size.width}x${size.height}:${layout.cols}x${layout.rows}`
      if (viewportKey !== lastViewportKeyRef.current) {
        lastViewportKeyRef.current = viewportKey
        stableLayoutFramesRef.current = 0
      } else {
        stableLayoutFramesRef.current += 1
      }

      layoutCards()

      if (
        reverseArmedRef.current &&
        reverseSession &&
        !reducedMotion &&
        size.width >= 64 &&
        size.height >= 64 &&
        stableLayoutFramesRef.current >= 2 &&
        beginReverseDive(reverseSession)
      ) {
        reverseArmedRef.current = false
        onReverseStart?.()
        applyDivePose(1)
        return
      }

      if (reverseSession) return

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
    const hold = dive.direction === -1 ? 0.38 : 0
    const playElapsed = Math.max(0, dive.elapsed - hold)
    const t = Math.min(1, playElapsed / interactionSettings.diveDuration)
    const forwardT = dive.direction === 1 ? t : 1 - t
    const ease = forwardT * forwardT * forwardT
    applyDivePose(ease)

    if (t >= 1 && !completedRef.current) {
      completedRef.current = true
      if (dive.direction === 1) {
        onDiveComplete?.(dive.project)
        return
      }

      diveRef.current = null
      layoutCache.current = null
      groupRefs.current.forEach((group) => {
        if (group) delete group.userData.diveOriginZ
      })
      if (camera instanceof PerspectiveCamera) {
        camera.near = layout.perspective * 0.25
        camera.far = layout.perspective * 8
        camera.updateProjectionMatrix()
      }
      if (restoreScrollRef.current) {
        onRestoreOffset?.(
          restoreScrollRef.current.x,
          restoreScrollRef.current.y,
        )
      }
      onReverseComplete?.()
    }
  })

  return (
    <>
      <StarryBackground reducedMotion={reducedMotion || diving || Boolean(reverseSession)} />
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

function recycleStickyIdentities(
  cells: GridCell[],
  layout: GridLayout,
  stickyCol: number[],
  stickyRow: number[],
  lastX: number[],
  lastY: number[],
) {
  const wrapX = layout.periodX * 0.5
  const wrapY = layout.periodY * 0.5

  cells.forEach((cell, index) => {
    if (stickyCol[index] === undefined || lastX[index] === undefined) {
      stickyCol[index] = cell.infiniteCol
      stickyRow[index] = cell.infiniteRow
      lastX[index] = cell.position.x
      lastY[index] = cell.position.y
    }
  })

  const yDirByRow: Array<'up' | 'down' | undefined> = []
  const xWrapped = new Array<boolean>(cells.length).fill(false)

  cells.forEach((cell, index) => {
    const dx = cell.position.x - lastX[index]
    const dy = cell.position.y - lastY[index]
    if (Math.abs(dy) > wrapY) {
      yDirByRow[cell.row] = dy > 0 ? 'up' : 'down'
    }
    if (Math.abs(dx) > wrapX) {
      xWrapped[index] = true
    }
  })

  const wrappedRows = yDirByRow
    .map((dir, row) => (dir ? row : -1))
    .filter((row) => row >= 0)
  if (wrappedRows.length > 0) {
    const unchanged: number[] = []
    cells.forEach((_, index) => {
      if (wrappedRows.includes(Math.floor(index / layout.cols))) return
      unchanged.push(stickyRow[index])
    })

    if (unchanged.length === 0) {
      cells.forEach((cell, index) => {
        stickyRow[index] = cell.infiniteRow
      })
    } else {
      let upCursor = Math.max(...unchanged)
      let downCursor = Math.min(...unchanged)
      wrappedRows.forEach((slotRow) => {
        const next =
          yDirByRow[slotRow] === 'up' ? (upCursor += 1) : (downCursor -= 1)
        for (let col = 0; col < layout.cols; col += 1) {
          stickyRow[slotRow * layout.cols + col] = next
        }
      })
    }
  }

  for (let slotRow = 0; slotRow < layout.rows; slotRow += 1) {
    const rowStart = slotRow * layout.cols
    const wrappedInRow: number[] = []
    for (let col = 0; col < layout.cols; col += 1) {
      const index = rowStart + col
      if (xWrapped[index]) wrappedInRow.push(index)
    }

    if (wrappedInRow.length === 0) continue

    if (wrappedInRow.length > 1) {
      for (let col = 0; col < layout.cols; col += 1) {
        const index = rowStart + col
        stickyCol[index] = cells[index].infiniteCol
      }
      continue
    }

    const index = wrappedInRow[0]
    const others: number[] = []
    for (let col = 0; col < layout.cols; col += 1) {
      const other = rowStart + col
      if (other === index) continue
      others.push(stickyCol[other])
    }
    if (others.length === 0) {
      stickyCol[index] = cells[index].infiniteCol
      continue
    }
    const dx = cells[index].position.x - lastX[index]
    stickyCol[index] =
      dx < 0 ? Math.min(...others) - 1 : Math.max(...others) + 1
  }

  cells.forEach((cell, index) => {
    lastX[index] = cell.position.x
    lastY[index] = cell.position.y
  })
}
