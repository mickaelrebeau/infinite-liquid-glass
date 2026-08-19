# Infinite Liquid Glass

Reproduction locale du concept [Infinite Liquid Glass](https://infinite-liquid-glass.shader.se/?v=2) avec **Three.js**, **TSL** et **WebGPU**.

Cette première version utilise des **images statiques** (pas de vidéos) et une grille infinie draggable avec inertie.

## Stack

- React + Vite + TypeScript
- Three.js WebGPU + TSL (`MeshBasicNodeMaterial` custom)
- Motion (drag + spring momentum)
- React Three Fiber

## Démarrage

```bash
npm install
npm run dev
```

## Structure

- `src/scene/liquidGlassMaterial.ts` — shader verre (réfraction IOR, dispersion, fresnel, HDRI équirectangulaire)
- `src/scene/loadEnvironmentMap.ts` — chargement HDRI compatible WebGPU
- `src/scene/gridMath.ts` — layout responsive + projection sphérique infinie
- `src/hooks/useInfiniteDrag.ts` — drag avec ratio, fling et ressorts
- `src/components/StaticFallback.tsx` — fallback si WebGPU indisponible

## Crédits images

Images placeholder via [Unsplash](https://unsplash.com) — voir `src/data/projects.ts`.

HDRI : Poly Haven — `studio_small_03_1k.hdr`.

## Notes

- Le drag suit le modèle décrit : `delta × 1.5` pendant le pan, impulsion `velocity × 0.1` au relâchement, puis ressorts Motion.
- `prefers-reduced-motion` désactive le fling et réduit le ratio de drag.
