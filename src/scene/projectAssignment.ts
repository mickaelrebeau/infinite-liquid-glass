import { projects } from '../data/projects'

/** Index stable d'un projet pour une cellule de la grille infinie (grille décalée). */
export function projectIndexForInfiniteCell(
  infiniteCol: number,
  infiniteRow: number,
  projectCount = projects.length,
) {
  const staggerCol = infiniteCol - (Math.abs(infiniteRow) % 2)
  const hash =
    staggerCol * 73856093 +
    infiniteRow * 19349663 +
    staggerCol * infiniteRow * 83492791
  return ((hash % projectCount) + projectCount) % projectCount
}
