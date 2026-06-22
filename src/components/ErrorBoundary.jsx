import { Component } from 'react'

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
