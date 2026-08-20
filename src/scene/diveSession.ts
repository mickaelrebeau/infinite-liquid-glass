import { projects } from '../data/projects'

const STORAGE_KEY = 'ilg-dive-session'

export type DivePickMeta = {
  offsetX: number
  offsetY: number
  infiniteCol: number
  infiniteRow: number
  localX: number
  localY: number
  cellWidth: number
  cellHeight: number
  poolCols: number
  poolRows: number
  stickyCols: number[]
  stickyRows: number[]
}

export type DiveSession = {
  projectId: string
  projectIndex: number
  offsetX: number
  offsetY: number
  infiniteCol: number
  infiniteRow: number
  localX?: number
  localY?: number
  cellWidth?: number
  cellHeight?: number
  poolCols?: number
  poolRows?: number
  stickyCols?: number[]
  stickyRows?: number[]
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function toFiniteNumberArray(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length === 0) return null
  if (!value.every(isFiniteNumber)) return null
  return value.slice()
}

export function saveDiveSession(session: DiveSession) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Ignore quota / private mode.
  }
}

export function readDiveSession(): DiveSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<DiveSession>
    if (
      typeof parsed?.projectId !== 'string' ||
      !isFiniteNumber(parsed.offsetX) ||
      !isFiniteNumber(parsed.offsetY) ||
      !isFiniteNumber(parsed.infiniteCol) ||
      !isFiniteNumber(parsed.infiniteRow)
    ) {
      return null
    }
    const projectIndex = projects.findIndex(
      (project) => project.id === parsed.projectId,
    )
    if (projectIndex < 0) return null

    const stickyCols = toFiniteNumberArray(parsed.stickyCols)
    const stickyRows = toFiniteNumberArray(parsed.stickyRows)

    return {
      projectId: parsed.projectId,
      projectIndex,
      offsetX: parsed.offsetX,
      offsetY: parsed.offsetY,
      infiniteCol: parsed.infiniteCol,
      infiniteRow: parsed.infiniteRow,
      ...(isFiniteNumber(parsed.localX) ? { localX: parsed.localX } : {}),
      ...(isFiniteNumber(parsed.localY) ? { localY: parsed.localY } : {}),
      ...(isFiniteNumber(parsed.cellWidth) ? { cellWidth: parsed.cellWidth } : {}),
      ...(isFiniteNumber(parsed.cellHeight)
        ? { cellHeight: parsed.cellHeight }
        : {}),
      ...(isFiniteNumber(parsed.poolCols) ? { poolCols: parsed.poolCols } : {}),
      ...(isFiniteNumber(parsed.poolRows) ? { poolRows: parsed.poolRows } : {}),
      ...(stickyCols ? { stickyCols } : {}),
      ...(stickyRows ? { stickyRows } : {}),
    }
  } catch {
    return null
  }
}

export function clearDiveSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore.
  }
}
