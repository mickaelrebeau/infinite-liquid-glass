export type DispersionSample = {
  offset: number
  weight: [number, number, number]
}

function gaussianWeight(position: number, center: number) {
  return Math.max(0, 1 - Math.abs(position - center) / 0.5)
}

export function buildDispersionSamples(count: number): DispersionSample[] {
  const sampleCount = Math.max(3, Math.round(count))
  const totals = [0, 0, 0]
  const samples: DispersionSample[] = []

  for (let index = 0; index < sampleCount; index += 1) {
    const normalized = index / (sampleCount - 1)
    const weight: [number, number, number] = [
      gaussianWeight(normalized, 0),
      gaussianWeight(normalized, 0.5),
      gaussianWeight(normalized, 1),
    ]
    totals[0] += weight[0]
    totals[1] += weight[1]
    totals[2] += weight[2]
    samples.push({ offset: normalized - 0.5, weight })
  }

  return samples.map(({ offset, weight }) => ({
    offset,
    weight: [
      weight[0] / totals[0],
      weight[1] / totals[1],
      weight[2] / totals[2],
    ],
  }))
}
