import { projects } from '../data/projects'

export function StaticFallback() {
  return (
    <div className="static-fallback" aria-label="Aperçu statique">
      <div className="static-grid">
        {projects.map((project) => (
          <a
            key={project.id}
            className="static-card"
            href={project.url}
            target="_blank"
            rel="noreferrer"
          >
            <img src={project.poster} alt={project.title} loading="lazy" />
            <div className="static-card__meta">
              <span>
                {project.id} · {project.type}
              </span>
              <span>{new URL(project.url).hostname.replace(/^www\./, '')}</span>
            </div>
            <h2>{project.title}</h2>
            <p>{project.description}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
