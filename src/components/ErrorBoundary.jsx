import { Component } from 'react'

// Les navigateurs ne s'accordent pas sur le libelle de cette panne.
const CHARGEMENT_MANQUE =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)

    // Un morceau de code charge a la demande peut manquer apres un
    // deploiement : l'onglet ouvert tient un index.html qui reference des
    // fichiers dont le nom a change. Le cache et le service worker gardent
    // l'ancienne version — on les vide et on recharge, une seule fois par
    // session pour ne pas boucler si la panne vient d'ailleurs.
    if (!CHARGEMENT_MANQUE.test(error?.message || '')) return
    try {
      if (sessionStorage.getItem('reprise-morceau')) return
      sessionStorage.setItem('reprise-morceau', '1')
    } catch { /* mode prive : on tente la reprise quand meme */ }

    const vider = window.caches
      ? caches.keys().then(cles => Promise.all(cles.map(c => caches.delete(c)))).catch(() => {})
      : Promise.resolve()

    vider
      .then(() => navigator.serviceWorker?.getRegistrations?.() ?? [])
      .then(regs => Promise.all(regs.map(r => r.unregister())))
      .catch(() => {})
      .then(() => window.location.reload())
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100dvh',
            padding: '2rem',
            textAlign: 'center',
            gap: '1rem',
            background: '#050505',
          }}
        >
          <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.6rem', color: '#C9A84C' }}>
            Une erreur inattendue s'est produite
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(253,250,246,0.55)', lineHeight: 1.6 }}>
            {this.state.error?.message ?? 'Erreur inconnue'}
          </p>
          <a
            href="/"
            style={{
              marginTop: '0.5rem',
              padding: '10px 24px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #A07830, #C9A84C)',
              color: '#050505',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textDecoration: 'none',
            }}
          >
            Retour à l'accueil
          </a>
        </div>
      )
    }

    return this.props.children
  }
}
