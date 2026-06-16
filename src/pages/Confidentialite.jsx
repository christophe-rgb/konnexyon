import { Link } from 'react-router-dom'

export default function Confidentialite() {
  return (
    <div className="min-h-dvh" style={{ background: '#050505' }}>
      <header style={{
        padding: '16px 24px', borderBottom: '1px solid rgba(201,168,76,0.1)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Link to="/" style={{ color: 'rgba(201,168,76,0.5)', textDecoration: 'none', fontSize: 20 }}>←</Link>
        <span style={{ fontFamily: 'Cormorant, serif', fontSize: '1.2rem', color: 'rgba(201,168,76,0.7)', letterSpacing: '0.1em' }}>
          Politique de Confidentialité
        </span>
      </header>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px 80px' }}>
        <Article title="1. Données collectées">
          Nous collectons : adresse(s) email, pseudo du couple, description et photo de profil, localisation approximative (si autorisée), préférences et critères de recherche, données d'abonnement (sans données bancaires — traitées par notre prestataire de paiement).
        </Article>
        <Article title="2. Utilisation des données">
          Vos données sont utilisées exclusivement pour : faire fonctionner le service de mise en relation, améliorer l'expérience utilisateur, gérer votre abonnement. Vos données ne sont jamais vendues à des tiers.
        </Article>
        <Article title="3. Localisation">
          La géolocalisation est utilisée uniquement pour calculer les distances entre membres. Votre position exacte n'est jamais affichée — seule une approximation en kilomètres est visible par les autres membres. Vous pouvez désactiver la géolocalisation à tout moment.
        </Article>
        <Article title="4. Sécurité">
          Vos données sont stockées sur des serveurs sécurisés (Supabase, infrastructure chiffrée). Les mots de passe sont hashés et ne sont jamais stockés en clair.
        </Article>
        <Article title="5. Vos droits (RGPD)">
          Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement, de portabilité et d'opposition. Pour exercer ces droits : contact@konnexyon.com
        </Article>
        <Article title="6. Cookies">
          Konnexyon utilise uniquement des cookies techniques nécessaires au fonctionnement du service. Aucun cookie publicitaire ou de tracking tiers n'est utilisé.
        </Article>
        <Article title="7. Conservation">
          Vos données sont conservées tant que votre compte est actif. En cas de suppression de compte, toutes vos données sont effacées sous 30 jours.
        </Article>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 40 }}>Dernière mise à jour : juin 2025</p>
      </div>
    </div>
  )
}

function Article({ title, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '1.2rem', color: '#C9A84C', marginBottom: 10, fontWeight: 500 }}>{title}</h2>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.8 }}>{children}</p>
    </div>
  )
}
