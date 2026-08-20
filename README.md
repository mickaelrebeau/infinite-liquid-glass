# Infinite Liquid Glass

Reproduction locale du portfolio [Infinite Liquid Glass](https://infinite-liquid-glass.shader.se/?v=2) avec **Three.js**, **TSL** et **WebGPU**.

Grille infinie de cartes en verre liquide, textures vidéo des vrais projets, plongée au clic vers le site, drag avec inertie et tilt souris.

## Stack

- React 19 + Vite + TypeScript
- Three.js WebGPU + TSL (`MeshBasicNodeMaterial` custom)
- React Three Fiber 9
- Motion (drag, spring, dive)
- Tweakpane (réglages dev / debug prod)

## Démarrage

```bash
npm install
npm run dev
```

Build production :

```bash
npm run build
npm run preview
```

Lint :

```bash
npm run lint
```

## URLs utiles

| URL | Effet |
|-----|--------|
| `/` | Expérience portfolio principale |
| `/?tweak` ou `/?debug` | Affiche le panneau Tweakpane **en production** |
| `/?demo=liquid-glass` | Scène demo du composant `<LiquidGlass />` (shader expérimental séparé) |

En **développement** (`npm run dev`), le Tweakpane est visible sans paramètre.

Les réglages Tweakpane sont persistés dans `localStorage` (`ilg-tweaks-v6`).

## Tweakpane

Panneau **Uniforms** (coin supérieur droit) pour ajuster en direct :

- **Glass** — IOR, épaisseur, réfraction, dispersion, bevel, fresnel, HDRI, rim…
- **Grid** — taille des cartes, gap, rayon sphérique, couverture…
- **Tilt** — amplitude et lissage du tilt souris

Boutons **Reset** (defaults du site original) et **Log settings** (dump console).

## Vidéos des cartes

Les cartes utilisent des scrolls vidéo (`public/videos/*.mp4`) générés depuis les sites listés dans `src/data/projects.ts`.

Capturer / régénérer :

```bash
npm run videos
npm run videos:optimize
```

(Nécessite Playwright — voir `scripts/capture-site-videos.mjs`.)

## Fonctionnalités

- **Shader verre** aligné sur le bundle original (bevel SDF, lentille sphérique, réfraction chromatique, fresnel, HDRI équirectangulaire)
- **Texte inversé** par rapport au fond visible sous la carte (`1 − background`)
- **Grille infinie** avec projection sphérique et layout portrait / paysage
- **Clic carte** → animation de plongée puis redirection vers le projet
- **Retour navigateur** → restauration de la position dans la grille
- **Fallback** statique si WebGPU indisponible (`StaticFallback.tsx`)
- **`prefers-reduced-motion`** — fling réduit, tilt atténué

## Structure

```
src/
├── scene/
│   ├── liquidGlassMaterial.ts   # Matériau cartes → shaders/lens-glass/
│   ├── cardTextMaterial.ts      # Titres avec couleur inverse
│   ├── GlassGrid.tsx / GlassCard.tsx
│   ├── gridMath.ts              # Layout responsive + grille infinie
│   ├── projectTextureCache.ts   # Vidéos + posters + cover UV
│   └── loadEnvironmentMap.ts    # HDRI WebGPU
├── shaders/
│   ├── lens-glass/              # Shader portfolio (original site)
│   └── liquid-glass/            # Shader demo composant réutilisable
├── components/
│   ├── LiquidGlass/             # Composant R3F multi-pass (demo)
│   └── TweakPane.tsx
├── config/
│   ├── settings.ts              # Defaults alignés bundle original (bH)
│   └── tweakStore.ts
├── demo/LiquidGlassDemoScene.tsx
└── data/projects.ts             # Projets + chemins vidéo
```

## Crédits

- Concept de référence : [infinite-liquid-glass.shader.se](https://infinite-liquid-glass.shader.se/?v=2)
- HDRI : Poly Haven — `public/hdri/studio_small_03_1k.hdr`
- Projets : sites réels listés dans `src/data/projects.ts`

## Notes techniques

- WebGPU requis pour l’expérience 3D (Chrome / Edge récents, Safari Technology Preview selon config).
- Le drag suit le modèle original : `delta × dragRatio` pendant le pan, impulsion `velocity × fling` au relâchement, ressorts Motion.
- `GLASS_SHADER_REVISION` dans `settings.ts` force la recréation des matériaux quand le shader change.
