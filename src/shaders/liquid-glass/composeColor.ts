// @ts-nocheck
import {
  Fn,
  equal,
  exp,
  float,
  fwidth,
  length,
  materialOpacity,
  max,
  mix,
  normalize,
  positionLocal,
  screenUV,
  select,
  smoothstep,
  vec2,
  vec3,
} from 'three/tsl'
import type { LiquidGlassShaderGraph } from './compose'
import type { LiquidGlassUniformBundle } from './uniforms'

export function createLiquidGlassColorNode(
  graph: LiquidGlassShaderGraph,
  uniforms: LiquidGlassUniformBundle,
) {
  const {
    surfaceNodes,
    noiseNodes,
    refractionNodes,
    chromaticNodes,
    blurNodes,
    fresnelNodes,
    rimNodes,
    specularNodes,
    sdfNodes,
  } = graph

  const { edgeFactorAt, surfaceNormalAt, roundedSdfAt } = surfaceNodes
  const { edgeDistanceAt } = sdfNodes
  const { liquidNoiseAt, perturbNormal } = noiseNodes
  const { refractionOffsetAt } = refractionNodes
  const { sampleTransmissionAt } = chromaticNodes
  const { sampleBlurredAt } = blurNodes
  const { fresnelAt } = fresnelNodes
  const { rimAt } = rimNodes
  const { specularAt } = specularNodes

  return Fn(() => {
    const planePos = positionLocal.xy.mul(uniforms.planeSize)
    const sdfValue = roundedSdfAt(planePos)
    const edgeDist = edgeDistanceAt(planePos)
    const edgeFactor = edgeFactorAt(sdfValue)

    let planeNormal = surfaceNormalAt(planePos)
    planeNormal = perturbNormal(planeNormal, planePos)

    const uvSpace = planePos.div(max(uniforms.planeSize, vec2(0.0001))).mul(2)
    const mouseDelta = uvSpace.sub(uniforms.smoothedMouse)
    const mouseDist = length(mouseDelta)
    const interaction = exp(mouseDist.mul(uniforms.interactionRadius.negate())).mul(
      uniforms.interactionStrength,
    )
    planeNormal = normalize(
      planeNormal.add(
        vec3(uniforms.smoothedMouse.sub(uvSpace).xy, float(0)).mul(interaction),
      ),
    )

    const viewDir = normalize(vec3(float(0), float(0), float(1)))
    const offset = refractionOffsetAt(planeNormal, edgeFactor)
    const sampleUv = screenUV.add(offset)

    const sharp = sampleTransmissionAt(sampleUv, offset)
    const transmission = mix(sharp, sampleBlurredAt(sampleUv, sharp), uniforms.blur)

    const fresnel = fresnelAt(planeNormal, viewDir)
    const rim = rimAt(edgeDist)
    const spec = specularAt(planeNormal, viewDir)
    const noiseVis = liquidNoiseAt(planePos).mul(4)

    const glassBody = transmission.mul(uniforms.tint)
    const highlight = uniforms.fresnelColor.mul(fresnel).add(uniforms.rimColor.mul(rim)).add(spec)
    const finalColor = glassBody.add(highlight)

    const mode = uniforms.debugMode
    const normalVis = planeNormal.mul(0.5).add(0.5)
    const refractVis = vec3(sampleUv, float(0))
    const sdfVis = sdfValue.xxx.mul(8)

    return select(
      equal(mode, float(6)),
      sdfVis,
      select(
        equal(mode, float(5)),
        rim.xxx,
        select(
          equal(mode, float(4)),
          noiseVis.xxx,
          select(
            equal(mode, float(3)),
            refractVis,
            select(
              equal(mode, float(2)),
              fresnel.xxx,
              select(equal(mode, float(1)), normalVis, finalColor),
            ),
          ),
        ),
      ),
    )
  })
}

export function createLiquidGlassOpacityNode(
  graph: LiquidGlassShaderGraph,
  uniforms: LiquidGlassUniformBundle,
) {
  const { roundedSdfAt } = graph.surfaceNodes

  return Fn(() => {
    const planePos = positionLocal.xy.mul(uniforms.planeSize)
    const sdfValue = roundedSdfAt(planePos)
    const edge = max(fwidth(sdfValue).mul(0.5), float(0.0001))
    return float(1)
      .sub(smoothstep(edge.negate(), edge, sdfValue))
      .mul(materialOpacity)
      .mul(uniforms.opacity)
  })
}

export const debugModeValues = {
  final: 0,
  normal: 1,
  fresnel: 2,
  refraction: 3,
  noise: 4,
  rim: 5,
  sdf: 6,
} as const
