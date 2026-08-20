export type Project = {
  id: string
  title: string
  type: string
  description: string
  url: string
  video: string
  poster: string
}

export const projects: Project[] = [
  {
    id: 'OWN',
    title: 'OWN_.',
    type: 'CRM · SaaS',
    description: 'Un CRM épuré pour accélérer les ventes.',
    url: 'https://www.own-minimalist.fr/',
    video: '/videos/own.mp4',
    poster: '/videos/own.webp',
  },
  {
    id: 'MRC',
    title: 'Mercato Copilot',
    type: 'AI · B2B',
    description: 'L’agrégation IA des marchés publics.',
    url: 'https://www.mercatocopilot.fr/',
    video: '/videos/mercato.mp4',
    poster: '/videos/mercato.webp',
  },
  {
    id: 'TVT',
    title: 'TV Track',
    type: 'Analytics',
    description: 'Le suivi du temps passé devant la TV.',
    url: 'https://www.tv-track.com/',
    video: '/videos/tv-track.mp4',
    poster: '/videos/tv-track.webp',
  },
  {
    id: 'TLN',
    title: 'Talento',
    type: 'AI · ATS',
    description: 'Comparer un CV à une offre avec l’assistance d’un ATS.',
    url: 'https://cv-compare.up.railway.app/',
    video: '/videos/talento.mp4',
    poster: '/videos/talento.webp',
  },
  {
    id: 'GDT',
    title: 'Godot First Game',
    type: 'Game Dev',
    description: 'Un premier jeu conçu avec Godot.',
    url: 'https://mickaelrebeau.github.io/GODOT/firstgame/index.html',
    video: '/videos/godot.mp4',
    poster: '/videos/godot.webp',
  },
  {
    id: 'FCS',
    title: 'Focus',
    type: 'PWA · Productivity',
    description: 'Objectifs, crédits et responsabilité au quotidien.',
    url: 'https://focus-app.up.railway.app/',
    video: '/videos/focus.mp4',
    poster: '/videos/focus.webp',
  },
  {
    id: 'PFO',
    title: 'Portfolio',
    type: 'Frontend',
    description: 'Le site one-page de Mickael Rébeau.',
    url: 'https://www.rebeaumickael.fr/',
    video: '/videos/portfolio.mp4',
    poster: '/videos/portfolio.webp',
  },
  {
    id: 'COC',
    title: 'Clash of Dev',
    type: 'Clash · Demo',
    description: 'Clash of Dev by Maislina and LLCoolChris.',
    url: 'https://mike-dreeman-clash-of-dev.vercel.app/',
    video: '/videos/clash-of-dev.mp4',
    poster: '/videos/clash-of-dev.webp',
  },
  {
    id: 'HD1',
    title: 'Helwena Design 1',
    type: 'Challenge · Day 1',
    description: 'Un design to code par jour. Jour 1.',
    url: 'https://mickaelrebeau.github.io/Helwena-Design/day-1/',
    video: '/videos/helwena1.mp4',
    poster: '/videos/helwena1.webp',
  },
  {
    id: 'HD4',
    title: 'Helwena Design 4',
    type: 'Challenge · Day 4',
    description: 'Un design to code par jour. Jour 4.',
    url: 'https://mickaelrebeau.github.io/Helwena-Design/day-4/',
    video: '/videos/helwena4.mp4',
    poster: '/videos/helwena4.webp',
  },
  {
    id: 'HD8',
    title: 'Helwena Design 8',
    type: 'Challenge · Day 8',
    description: 'Un design to code par jour. Jour 8.',
    url: 'https://mickaelrebeau.github.io/Helwena-Design/day-8/',
    video: '/videos/helwena8.mp4',
    poster: '/videos/helwena8.webp',
  }
]
