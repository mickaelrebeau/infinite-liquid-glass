import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react'
import { useFrame } from '@react-three/fiber'
import {
  CanvasTexture,
  PlaneGeometry,
  type Group,
  type Texture,
} from 'three/webgpu'
import { glassSettings } from '../config/settings'
import {
  createCardTextMaterial,
  type CardTextUniforms,
} from './cardTextMaterial'
import {
  createLiquidGlassMaterial,
  type GlassUniforms,
} from './liquidGlassMaterial'
import type { GridLayout } from './gridMath'
import {
  getCachedProjectTextures,
} from './projectTextureCache'

type GlassCardProps = {
  slotIndex: number
  layout: GridLayout
  envMap: Texture
  projectIndexRef: React.RefObject<number[]>
  infiniteColRef: React.RefObject<number[]>
  infiniteRowRef: React.RefObject<number[]>
  visualScaleRef: React.RefObject<number[]>
  texturesReady: boolean
}

// Offset monde assez grand pour rester au-dessus du verre malgré
// la précision du depth buffer (caméra ~1200, near/far larges).
const TEXT_LAYER_OFFSET = 2.5

export const GlassCard = forwardRef<Group, GlassCardProps>(function GlassCard(
  {
    slotIndex,
    layout,
    envMap,
    projectIndexRef,
    infiniteColRef,
    infiniteRowRef,
    visualScaleRef,
    texturesReady,
  },
  ref,
) {
  const groupRef = useRef<Group>(null)
  const glassUniformsRef = useRef<GlassUniforms | null>(null)
  const textUniformsRef = useRef<CardTextUniforms | null>(null)
  const activeProjectIndex = useRef<number | null>(null)
  const activeInfiniteCol = useRef<number | null>(null)
  const activeInfiniteRow = useRef<number | null>(null)
  const pendingProjectIndex = useRef<number | null>(null)
  const pendingInfiniteCol = useRef<number | null>(null)
  const pendingInfiniteRow = useRef<number | null>(null)
  const layoutRef = useRef(layout)

  layoutRef.current = layout

  useImperativeHandle(ref, () => groupRef.current as Group)

  const geometry = useMemo(() => new PlaneGeometry(1, 1), [])

  const placeholderTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 4
    canvas.height = 4
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = 'srgb'
    return texture
  }, [])

  const placeholderTextTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 4
    canvas.height = 4
    return new CanvasTexture(canvas)
  }, [])

  const { material: glassMaterial, uniforms: glassUniforms } = useMemo(
    () => createLiquidGlassMaterial(placeholderTexture, envMap),
    [envMap, placeholderTexture],
  )

  const { material: textMaterial, uniforms: textUniforms } = useMemo(
    () => createCardTextMaterial(placeholderTextTexture, placeholderTexture),
    [placeholderTextTexture, placeholderTexture],
  )

  glassUniformsRef.current = glassUniforms
  textUniformsRef.current = textUniforms

  const applyProjectIndex = (projectIndex: number) => {
    const cached = getCachedProjectTextures(projectIndex)
    if (!cached) return false

    glassUniforms.cardMap.value = cached.image
    textUniforms.textMap.value = cached.text
    textUniforms.backgroundMap.value = cached.image
    glassUniforms.coverScale.value.set(cached.cover.scaleX, cached.cover.scaleY)
    glassUniforms.coverOffset.value.set(
      cached.cover.offsetX,
      cached.cover.offsetY,
    )
    textUniforms.coverScale.value.set(cached.cover.scaleX, cached.cover.scaleY)
    textUniforms.coverOffset.value.set(
      cached.cover.offsetX,
      cached.cover.offsetY,
    )
    activeProjectIndex.current = projectIndex
    return true
  }

  const isOffscreenForSwap = () => {
    const currentLayout = layoutRef.current
    const position = groupRef.current?.position
    if (!position) return true

    const marginX = currentLayout.cellWidth * 0.35
    const marginY = currentLayout.cellHeight * 0.35
    const halfX = currentLayout.periodX * 0.5 - marginX
    const halfY = currentLayout.periodY * 0.5 - marginY

    return Math.abs(position.x) > halfX || Math.abs(position.y) > halfY
  }

  const commitPendingProject = () => {
    if (pendingProjectIndex.current === null) return

    if (applyProjectIndex(pendingProjectIndex.current)) {
      activeInfiniteCol.current = pendingInfiniteCol.current
      activeInfiniteRow.current = pendingInfiniteRow.current
      pendingProjectIndex.current = null
      pendingInfiniteCol.current = null
      pendingInfiniteRow.current = null
    }
  }

  useEffect(() => {
    if (!texturesReady) return
    const projectIndex = projectIndexRef.current?.[slotIndex] ?? slotIndex
    applyProjectIndex(projectIndex)
  }, [texturesReady, slotIndex])

  useFrame(() => {
    const glass = glassUniformsRef.current
    const text = textUniformsRef.current
    if (!glass || !text || !texturesReady) return

    const infiniteCol = infiniteColRef.current?.[slotIndex]
    const infiniteRow = infiniteRowRef.current?.[slotIndex]
    const projectIndex = projectIndexRef.current?.[slotIndex]

    if (
      infiniteCol === undefined ||
      infiniteRow === undefined ||
      projectIndex === undefined
    ) {
      return
    }

    const cellChanged =
      infiniteCol !== activeInfiniteCol.current ||
      infiniteRow !== activeInfiniteRow.current

    if (cellChanged) {
      pendingProjectIndex.current = projectIndex
      pendingInfiniteCol.current = infiniteCol
      pendingInfiniteRow.current = infiniteRow
    }

    if (pendingProjectIndex.current !== null && isOffscreenForSwap()) {
      commitPendingProject()
    }

    if (
      activeProjectIndex.current === null &&
      pendingProjectIndex.current === null
    ) {
      applyProjectIndex(projectIndex)
      activeInfiniteCol.current = infiniteCol
      activeInfiniteRow.current = infiniteRow
    }

    const visualScale = visualScaleRef.current?.[slotIndex] ?? 1
    const planeWidth = layout.planeWidth * visualScale
    const planeHeight = layout.planeHeight * visualScale

    glass.planeSize.value.set(planeWidth, planeHeight)
    glass.sphereRadius.value = layout.sphereRadius
    glass.cornerRadius.value = glassSettings.cornerRadius * planeWidth
    glass.bevelWidth.value = glassSettings.bevelWidth * planeWidth
    glass.thickness.value = glassSettings.thickness * layout.cardScale * visualScale
    glass.rimWidth.value = glassSettings.rimWidth * layout.cardScale * visualScale

    text.planeSize.value.set(planeWidth, planeHeight)
    text.cornerRadius.value = glassSettings.cornerRadius * planeWidth

    if (groupRef.current && activeProjectIndex.current !== null) {
      const cached = getCachedProjectTextures(activeProjectIndex.current)
      groupRef.current.userData.projectIndex = activeProjectIndex.current
      groupRef.current.userData.slotIndex = slotIndex
      groupRef.current.userData.titleHit = cached?.titleHit
      if (cached && glass.cardMap.value !== cached.image) {
        applyProjectIndex(activeProjectIndex.current)
      }
    }
  })

  return (
    <group ref={groupRef}>
      <mesh geometry={geometry} material={glassMaterial} renderOrder={0} />
      <mesh
        geometry={geometry}
        material={textMaterial}
        position={[0, 0, TEXT_LAYER_OFFSET]}
        renderOrder={2}
        frustumCulled={false}
      />
    </group>
  )
})
