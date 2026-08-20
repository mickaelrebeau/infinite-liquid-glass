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
    if (groupRef.current) {
      groupRef.current.userData.projectIndex = projectIndex
      groupRef.current.userData.slotIndex = slotIndex
      groupRef.current.userData.titleHit = cached.titleHit
      groupRef.current.userData.applyProjectIndex = applyProjectIndex
    }
    return true
  }

  useEffect(() => {
    if (!texturesReady) return
    const projectIndex = projectIndexRef.current?.[slotIndex]
    if (projectIndex === undefined) return
    applyProjectIndex(projectIndex)
    activeInfiniteCol.current = infiniteColRef.current?.[slotIndex] ?? null
    activeInfiniteRow.current = infiniteRowRef.current?.[slotIndex] ?? null
  }, [texturesReady, slotIndex])

  useFrame(() => {
    const glass = glassUniformsRef.current
    const text = textUniformsRef.current
    if (!glass || !text || !texturesReady) return

    const infiniteCol = infiniteColRef.current?.[slotIndex]
    const infiniteRow = infiniteRowRef.current?.[slotIndex]
    const projectIndex = projectIndexRef.current?.[slotIndex]
    const group = groupRef.current

    if (
      infiniteCol === undefined ||
      infiniteRow === undefined ||
      projectIndex === undefined
    ) {
      return
    }

    if (typeof group?.userData.forceProjectIndex === 'number') {
      applyProjectIndex(group.userData.forceProjectIndex)
      activeInfiniteCol.current = infiniteCol
      activeInfiniteRow.current = infiniteRow
      delete group.userData.forceProjectIndex
    } else if (
      infiniteCol !== activeInfiniteCol.current ||
      infiniteRow !== activeInfiniteRow.current ||
      projectIndex !== activeProjectIndex.current
    ) {
      if (applyProjectIndex(projectIndex)) {
        activeInfiniteCol.current = infiniteCol
        activeInfiniteRow.current = infiniteRow
      }
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

    if (group && activeProjectIndex.current !== null) {
      const cached = getCachedProjectTextures(activeProjectIndex.current)
      group.userData.projectIndex = activeProjectIndex.current
      group.userData.slotIndex = slotIndex
      group.userData.titleHit = cached?.titleHit
      group.userData.applyProjectIndex = applyProjectIndex
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
