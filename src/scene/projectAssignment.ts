import { projects } from '../data/projects'

/**
 * Ordre visuel le long d'une rangée. Les trois Helwena sont espacés
 * pour ne plus occuper trois cartes consécutives.
 */
const DISPLAY_ORDER = [
  'OWN',
  'MRC',
  'TVT',
  'HD1',
  'TLN',
  'GDT',
  'HD4',
  'FCS',
  'PFO',
  'HD8',
  'COC',
] as const

const displayIndex = DISPLAY_ORDER.map((id) =>
  projects.findIndex((project) => project.id === id),
)

function wrapIndex(value: number, projectCount: number) {
  return ((value % projectCount) + projectCount) % projectCount
}

/**
 * Pas vertical sur la grille en quinconce.
 * Un pas de 3 ramène le même projet 3 cases plus loin — pile la
 * largeur visible. 4 pousse les doublons hors de l'écran.
 */
function brickRowStep(projectCount: number) {
  if (projectCount <= 1) return 0

  for (let step = 4; step < projectCount; step += 1) {
    const vertical = wrapIndex(step, projectCount)
    const diagA = wrapIndex(step - 1, projectCount)
    const diagB = wrapIndex(step + 1, projectCount)
    if (vertical !== 0 && diagA !== 0 && diagB !== 0) return step
  }

  return projectCount >= 3 ? 3 : 1
}

/** Index stable d'un projet pour une cellule de la grille infinie (grille décalée). */
export function projectIndexForInfiniteCell(
  infiniteCol: number,
  infiniteRow: number,
  projectCount = projects.length,
) {
  if (projectCount <= 1) return 0

  const step = brickRowStep(projectCount)
  const lattice = wrapIndex(infiniteCol + step * infiniteRow, projectCount)
  if (
    displayIndex.length === projectCount &&
    displayIndex.every((index) => index >= 0)
  ) {
    return displayIndex[lattice]
  }

  return lattice
}
