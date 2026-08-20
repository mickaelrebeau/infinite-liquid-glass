export function SiteFooter() {
  return (
    <footer className="site-footer">
      <a
        href="https://www.rebeaumickael.fr/"
        target="_blank"
        rel="noreferrer"
        className="site-footer__brand"
      >
        <span className="site-footer__brand-label">An experiment by</span>
        <strong className="site-footer__brand-name">Mike_Dreeman</strong>
      </a>
      <a
        href="https://infinite-liquid-glass.shader.se/?v=2"
        target="_blank"
        rel="noreferrer"
        className="site-footer__cta"
      >
        See Original <span aria-hidden>↗</span>
      </a>
    </footer>
  )
}
