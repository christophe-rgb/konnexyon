import { Link } from 'react-router-dom'

export default function Contact() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6" style={{ background: '#050505' }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', margin: '0 auto 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(circle, rgba(201,168,76,0.1), transparent)',
          border: '1px solid rgba(201,168,76,0.2)',
          fontSize: 26,
        }}>∞</div>
        <h1 style={{ fontFamily: 'Cormorant, serif', fontSize: '2rem', color: '#F2EDE6', marginBottom: 12 }}>Contact</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', lineHeight: 1.8, marginBottom: 36 }}>
          Pour toute question, signalement ou demande concernant vos données personnelles, contactez-nous par email.
        </p>
        <a href="mailto:contact@konnexyon.com" className="btn-gold" style={{
          display: 'inline-block', padding: '15px 36px', borderRadius: 14,
          fontSize: 13, letterSpacing: '0.12em', textDecoration: 'none', marginBottom: 32,
        }}>
          contact@konnexyon.com
        </a>
        <br />
        <Link to="/" style={{ fontSize: 12, color: 'rgba(201,168,76,0.4)', textDecoration: 'none' }}>← Retour</Link>
      </div>
    </div>
  )
}
