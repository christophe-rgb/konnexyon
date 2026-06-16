import { Link } from 'react-router-dom'

export default function CGU() {
  return (
    <div className="min-h-dvh" style={{ background: '#050505' }}>
      <header style={{
        padding: '16px 24px', borderBottom: '1px solid rgba(201,168,76,0.1)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Link to="/" style={{ color: 'rgba(201,168,76,0.5)', textDecoration: 'none', fontSize: 20 }}>←</Link>
        <span style={{ fontFamily: 'Cormorant, serif', fontSize: '1.2rem', color: 'rgba(201,168,76,0.7)', letterSpacing: '0.1em' }}>
          Conditions Générales d'Utilisation
        </span>
      </header>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px 80px' }}>
        <Article title="1. Objet">
          Konnexyon est une plateforme de rencontres réservée exclusivement aux couples adultes consentants. L'accès au site est strictement interdit aux mineurs de moins de 18 ans.
        </Article>
        <Article title="2. Conditions d'accès">
          Pour utiliser Konnexyon, vous devez : avoir 18 ans ou plus, être en couple et utiliser le service en tant que couple, fournir des informations exactes lors de l'inscription, ne pas usurper l'identité d'un tiers.
        </Article>
        <Article title="3. Contenu des profils">
          Les membres s'engagent à ne publier que du contenu légal. Tout contenu impliquant des mineurs, non consenti, ou illégal entraîne la suppression immédiate du compte et peut faire l'objet d'un signalement aux autorités compétentes.
        </Article>
        <Article title="4. Abonnement Premium">
          L'abonnement Premium est proposé à titre onéreux. Le paiement est sécurisé et traité par notre prestataire de paiement. L'abonnement est renouvelé automatiquement à son terme, sauf résiliation de votre part avant la date d'échéance.
        </Article>
        <Article title="5. Responsabilité">
          Konnexyon met en relation des adultes consentants mais ne peut être tenu responsable des rencontres physiques organisées entre membres. Chaque membre est responsable de ses actes.
        </Article>
        <Article title="6. Données personnelles">
          Vos données sont traitées conformément à notre Politique de Confidentialité et au RGPD. Vous disposez d'un droit d'accès, de rectification et de suppression de vos données.
        </Article>
        <Article title="7. Résiliation">
          Vous pouvez supprimer votre compte à tout moment depuis les paramètres de l'application. Konnexyon se réserve le droit de suspendre ou supprimer tout compte ne respectant pas les présentes CGU.
        </Article>
        <Article title="8. Droit applicable">
          Pour les résidents de l'Union Européenne, les présentes CGU sont soumises au droit européen et notamment au règlement RGPD. Pour les résidents hors UE (Suisse, Canada, etc.), la législation locale en matière de protection des données s'applique conjointement. Tout litige non résolu à l'amiable sera soumis aux juridictions compétentes du pays de résidence de l'utilisateur.
        </Article>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 40 }}>Dernière mise à jour : juin 2026</p>
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
