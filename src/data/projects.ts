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
    title: 'Own Minimalist',
    type: 'CRM · SaaS',
    description: 'Un CRM épuré pour accélérer les ventes.',
    url: 'https://www.own-minimalist.fr/',
    video: '/videos/own.mp4',
    poster: '/videos/own.jpg',
  },
  {
    id: 'MRC',
    title: 'Mercato Copilot',
    type: 'AI · B2B',
    description: 'L’agrégation IA des marchés publics.',
    url: 'https://www.mercatocopilot.fr/',
    video: '/videos/mercato.mp4',
    poster: '/videos/mercato.jpg',
  },
  {
    id: 'TVT',
    title: 'TV Track',
    type: 'Analytics',
    description: 'Le suivi du temps passé devant la TV.',
    url: 'https://www.tv-track.com/',
    video: '/videos/tv-track.mp4',
    poster: '/videos/tv-track.jpg',
  },
  {
    id: 'TLN',
    title: 'Talento',
    type: 'AI · ATS',
    description: 'Comparer un CV à une offre avec l’assistance d’un ATS.',
    url: 'https://cv-compare.up.railway.app/',
    video: '/videos/talento.mp4',
    poster: '/videos/talento.jpg',
  },
  {
    id: 'GDT',
    title: 'Godot First Game',
    type: 'Game Dev',
    description: 'Un premier jeu conçu avec Godot.',
    url: 'https://mickaelrebeau.github.io/GODOT/firstgame/index.html',
    video: '/videos/godot.mp4',
    poster: '/videos/godot.jpg',
  },
  {
    id: 'FCS',
    title: 'Focus',
    type: 'PWA · Productivity',
    description: 'Objectifs, crédits et responsabilité au quotidien.',
    url: 'https://github.com/mickaelrebeau/Focus',
    video: '/videos/focus.mp4',
    poster: '/videos/focus.jpg',
  },
  {
    id: 'PFO',
    title: 'Portfolio',
    type: 'Frontend',
    description: 'Le site one-page de Mickael Rébeau.',
    url: 'https://www.rebeaumickael.fr/',
    video: '/videos/portfolio.mp4',
    poster: '/videos/portfolio.jpg',
  },
]
