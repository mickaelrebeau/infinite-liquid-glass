import { Vector3, Quaternion } from 'three'
import { gridSettings } from '../config/settings'
import { projectIndexForInfiniteCell } from './projectAssignment'

export type GridLayout = {
  cols: number
  rows: number
  perspective: number
  sphereRadius: number
  planeWidth: number
  planeHeight: number
  planeAspect: number
  cellWidth: number
  cellHeight: number
  periodX: number
  periodY: number
  cardScale: number
  maxZoomZ: number
}

export type GridCell = {
  col: number
  row: number
  slot: number
  infiniteCol: number
  infiniteRow: number
  projectIndex: number
  position: Vector3
  quaternion: Quaternion
  scale: number
}

const IDENTITY_QUATERNION = new Quaternion()

export function computeCardVisualScale(
  localX: number,
  localY: number,
  layout: GridLayout,
) {
  const halfX = Math.max(layout.periodX * 0.5 - layout.cellWidth * 0.35, 1)
  const halfY = Math.max(layout.periodY * 0.5 - layout.cellHeight * 0.35, 1)
  const edgeX = Math.min(1, Math.abs(localX) / halfX)
  const edgeY = Math.min(1, Math.abs(localY) / halfY)
  const edge = Math.max(
    Math.pow(edgeX, gridSettings.edgeScalePower),
    Math.pow(edgeY, gridSettings.edgeScalePower * 0.9),
  )

  return clamp(1 - gridSettings.edgeScaleFalloff * edge, 0.78, 1)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function arcCoverage(
  angle: number,
  halfCell: number,
  perspective: number,
  sphereRadius: number,
) {
  const denominator =
    perspective + sphereRadius * (1 - Math.cos(angle / sphereRadius))
  return (
    (perspective * sphereRadius * Math.sin(angle / sphereRadius)) /
      (perspective + sphereRadius * (1 - Math.cos(angle / sphereRadius))) -
    (halfCell * perspective) / denominator
  )
}

function solveMaxAngle(
  coverage: number,
  halfCell: number,
  perspective: number,
  sphereRadius: number,
) {
  let maxAngle =
    sphereRadius * Math.acos(sphereRadius / (perspective + sphereRadius))
  if (arcCoverage(maxAngle, halfCell, perspective, sphereRadius) < coverage) {
    return maxAngle
  }

  let low = 0
  let high = maxAngle
  for (let i = 0; i < 24; i += 1) {
    const mid = (low + high) * 0.5
    if (arcCoverage(mid, halfCell, perspective, sphereRadius) < coverage) {
      low = mid
    } else {
      high = mid
    }
  }
  return high
}

function evenClamp(value: number, min: number, max: number) {
  let result = Math.min(max, Math.max(min, Math.ceil(value)))
  if (result % 2 === 0) return result
  if (result + 1 <= max) return result + 1
  if (result - 1 >= min) return result - 1
  return result
}

export function wrapScroll(value: number, period: number) {
  const half = period * 0.5
  return (((value + half) % period) + period) % period - half
}

export function wrappedDelta(current: number, target: number, period: number) {
  if (period <= 0) return target - current
  let delta = target - current
  delta -= period * Math.round(delta / period)
  return delta
}

export type GridScrollSnapshot = {
  offsetX: number
  offsetY: number
  infiniteCol: number
  infiniteRow: number
  localX?: number
  localY?: number
  cellWidth?: number
  cellHeight?: number
}

export function restoreGridScroll(
  layout: GridLayout,
  snapshot: GridScrollSnapshot,
) {
  const scaleX =
    snapshot.cellWidth && snapshot.cellWidth > 0
      ? layout.cellWidth / snapshot.cellWidth
      : 1
  const scaleY =
    snapshot.cellHeight && snapshot.cellHeight > 0
      ? layout.cellHeight / snapshot.cellHeight
      : 1

  // Keep the saved pan. Re-placing a sticky identity with wrappedDelta
  // shifted the whole grid — sticky cols lag geometric cols until wrap.
  return {
    x: snapshot.offsetX * scaleX,
    y: snapshot.offsetY * scaleY,
  }
}

export function isViewportReady(size: { width: number; height: number }) {
  if (size.width < 64 || size.height < 64) return false
  if (size.width === 300 && size.height === 150) return false
  if (typeof window === 'undefined') return true

  const viewW = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth)
  const viewH = Math.min(
    window.innerHeight,
    document.documentElement.clientHeight || window.innerHeight,
  )
  if (viewW > 0 && size.width < viewW * 0.45) return false
  if (viewH > 0 && size.height < viewH * 0.45) return false
  return true
}

export function computeGridLayout(
  viewportWidth: number,
  viewportHeight: number,
  gapRatio = gridSettings.gapRatio,
): GridLayout {
  const width = Math.max(viewportWidth, 1)
  const height = Math.max(viewportHeight, 1)
  const viewportScale = Math.max(width, height) / gridSettings.referenceWidth
  const perspective = gridSettings.perspective * viewportScale
  const sphereRadius = gridSettings.sphereRadius * viewportScale
  const planeWidthRatio =
    height > width
      ? gridSettings.planeWidthRatioPortrait
      : gridSettings.planeWidthRatio
  const planeWidth = width * planeWidthRatio
  const planeHeight = planeWidth / gridSettings.planeAspect
  const cellWidth = planeWidth * (1 + gapRatio)
  const cellHeight = planeHeight * (1 + gapRatio)
  const maxZoomZ = perspective * 0.1

  const coverageX =
    width * 0.5 * gridSettings.coverageMargin +
    Math.tan(0.05) * perspective +
    maxZoomZ
  const coverageY =
    height * 0.5 * gridSettings.coverageMargin +
    Math.tan(0.05) * perspective +
    maxZoomZ

  const angleX = solveMaxAngle(
    coverageX,
    planeWidth * 0.5,
    perspective,
    sphereRadius,
  )
  const angleY = solveMaxAngle(
    coverageY,
    planeHeight * 0.5,
    perspective,
    sphereRadius,
  )

  const cols = evenClamp(
    (2 * angleX) / cellWidth + 4,
    gridSettings.minCols,
    gridSettings.maxCols,
  )
  const rows = evenClamp(
    (2 * angleY) / cellHeight + 4,
    gridSettings.minRows,
    gridSettings.maxRows,
  )

  return {
    cols,
    rows,
    perspective,
    sphereRadius,
    planeWidth,
    planeHeight,
    planeAspect: planeWidth / Math.max(planeHeight, 1),
    cellWidth,
    cellHeight,
    periodX: cols * cellWidth,
    periodY: rows * cellHeight,
    cardScale:
      planeWidth /
      Math.max(gridSettings.referenceWidth * gridSettings.planeWidthRatio, 1),
    maxZoomZ,
  }
}

export function buildGridCells(
  layout: GridLayout,
  scrollX: number,
  scrollY: number,
  projectCount: number,
): GridCell[] {
  const cells: GridCell[] = []

  for (let slot = 0; slot < layout.cols * layout.rows; slot += 1) {
    const col = slot % layout.cols
    const row = Math.floor(slot / layout.cols)
    const rowOffset = (row % 2) * layout.cellWidth * 0.5
    const baseX =
      (col - (layout.cols - 1) / 2) * layout.cellWidth + scrollX + rowOffset
    const baseY =
      -((row - (layout.rows - 1) / 2) * layout.cellHeight + scrollY)

    const localX = wrapScroll(baseX, layout.periodX)
    const localY = wrapScroll(baseY, layout.periodY)

    const infiniteCol = Math.floor((baseX - rowOffset) / layout.cellWidth)
    const infiniteRow = Math.floor(baseY / layout.cellHeight)
    const projectIndex = projectIndexForInfiniteCell(
      infiniteCol,
      infiniteRow,
      projectCount,
    )

    const position = new Vector3(localX, localY, 0)

    cells.push({
      col,
      row,
      slot,
      infiniteCol,
      infiniteRow,
      projectIndex,
      position,
      quaternion: IDENTITY_QUATERNION,
      scale: 1,
    })
  }

  return cells
}

export function computeCoverTransform(
  imageWidth: number,
  imageHeight: number,
  planeAspect: number,
) {
  if (imageWidth <= 0 || imageHeight <= 0 || planeAspect <= 0) {
    return { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 }
  }

  const imageAspect = imageWidth / imageHeight
  if (imageAspect > planeAspect) {
    const scaleX = planeAspect / imageAspect
    return { scaleX, scaleY: 1, offsetX: (1 - scaleX) / 2, offsetY: 0 }
  }

  const scaleY = imageAspect / planeAspect
  return { scaleX: 1, scaleY, offsetX: 0, offsetY: (1 - scaleY) / 2 }
}
