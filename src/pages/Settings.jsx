import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { LogOut, Eye, EyeOff, MapPin, MapPinOff, Trash2, ChevronRight, Settings as SettingsIcon, Crown, XCircle, ShieldOff } from 'lucide-react'
import { isPremium } from '../lib/plan'

export default function Settings() {
  const { profile, fetchProfile, signOut } = useAuthStore()
  const navigate = useNavigate()
  const premium = isPremium(profile)
  const [saving,              setSaving]              = useState('')
  const [confirm,             setConfirm]             = useState(false)
  const [confirmText,         setConfirmText]         = useState('')
  const [deleting,            setDeleting]            = useState(false)
  const [cancelConfirm,       setCancelConfirm]       = useState(false)
  const [cancelling,          setCancelling]          = useState(false)
  const [cancelError,         setCancelError]         = useState('')
  const [cancelDone,          setCancelDone]          = useState(false)
  const [consentConfirm,      setConsentConfirm]      = useState(false)
  const [revokingConsent,     setRevokingConsent]     = useState(false)
  const [consentRevokeDone,   setConsentRevokeDone]   = useState(false)
  const [consentRevokeError,  setConsentRevokeError]  = useState('')

  const revokeConsent = async () => {
    setRevokingConsent(true)
    setConsentRevokeError('')
    try {
      const { error } = await supabase
        .from('profiles')
        // Efface TOUTES les données sensibles Art. 9 (orientation, désirs, dispos, limites)
        .update({
          consent_given_at: null,
          consent_version:  null,
          orientation:      null,
          orientation_lui:  null,
          orientation_elle: null,
          seeking:          null,
          availabilities:   null,
          limits:           null,
        })
        .eq('id', profile.id)
      if (error) throw new Error(error.message)
      await fetchProfile(profile.id)
      setConsentRevokeDone(true)
    } catch (e) {
      setConsentRevokeError(e.message)
    } finally {
      setRevokingConsent(false)
    }
  }

  const cancelSubscription = async () => {
    setCancelling(true)
    setCancelError('')
    try {
      const { data, error } = await supabase.functions.invoke('stripe-cancel', {})
      if (error || !data?.success) throw new Error(error?.message || data?.error || 'Erreur lors de la résiliation')
      await fetchProfile(profile.id)
      setCancelDone(true)
    } catch (e) {
      setCancelError(e.message)
    } finally {
      setCancelling(false)
    }
  }

  const update = async (patch, label) => {
    setSaving(label)
    await supabase.from('profiles').update(patch).eq('id', profile.id)
    await fetchProfile(profile.id)
    setSaving('')
  }

  const deleteAccount = async () => {
    setDeleting(true)
    await supabase.from('profiles').update({ status: 'deleted' }).eq('id', profile.id)
    await supabase.auth.signOut()
    navigate('/login')
  }

  const logout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="max-w-lg mx-auto pb-nav animate-fade-in" style={{ animationFillMode: 'both' }}>

      {/* header */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
        style={{
          background: 'rgba(253,250,246,0.95)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(201,168,76,0.15)',
        }}
      >
        <h1 style={{
          fontFamily: 'Cormorant, serif',
          fontSize: '1.8rem',
          fontWeight: 600,
          background: 'linear-gradient(135deg, #A07830, #C9A84C, #E8CC7A)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '0.03em',
        }}>
          Paramètres
        </h1>
        <div style={{
          width: 36, height: 36, borderRadius: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(circle, rgba(201,168,76,0.1), rgba(201,168,76,0.1))',
          border: '1px solid rgba(201,168,76,0.2)',
        }}>
          <SettingsIcon size={16} strokeWidth={1.5} style={{ color: 'rgba(201,168,76,1)' }} />
        </div>
      </header>

      <div style={{ padding: '20px' }}>

        {/* visibilité */}
        <Section title="Visibilité du profil">
          {[
            { value: 'public',       label: 'Visible par tous',    desc: 'Votre profil apparaît dans les recherches' },
            { value: 'matches_only', label: 'Connexions uniquement', desc: 'Seules vos connexions peuvent vous voir' },
            { value: 'discreet',     label: 'Mode discret',         desc: 'Invisible sur la carte et les listes' },
          ].map(o => {
            const isActive = profile.visibility === o.value
            return (
              <button className="erb-btn"
                key={o.value}
                onClick={() => update({ visibility: o.value }, 'visibility')}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderRadius: '14px',
                  marginBottom: '8px', cursor: 'pointer',
                  textAlign: 'left',
                  background: isActive ? 'rgba(201,168,76,0.28)' : 'rgba(245,240,232,0.8)',
                  border: isActive ? '1px solid rgba(201,168,76,0.5)' : '1px solid rgba(201,168,76,0.12)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => !isActive && (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.35)')}
                onMouseLeave={e => !isActive && (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.12)')}
              >
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: isActive ? '#C9A84C' : 'rgba(28,24,20,0.9)', marginBottom: '2px' }}>
                    {o.label}
                  </p>
                  <p style={{ fontSize: '11px', color: 'rgba(28,24,20,0.9)' }}>{o.desc}</p>
                </div>
                {isActive && saving !== 'visibility' && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg, #A07830, #E8CC7A)', flexShrink: 0 }} />
                )}
                {saving === 'visibility' && isActive && (
                  <div style={{ width: 14, height: 14, border: '2px solid rgba(201,168,76,0.3)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'rotateX 0.8s linear infinite', flexShrink: 0 }} />
                )}
              </button>
            )
          })}
        </Section>

        {/* géolocalisation */}
        <Section title="Géolocalisation">
          <Row
            icon={profile.hide_location ? MapPinOff : MapPin}
            label={profile.hide_location ? 'Position masquée' : 'Position visible'}
            desc={profile.hide_location ? "Vous n'apparaissez pas sur la carte" : 'Votre position approximative est visible'}
            onClick={() => update({ hide_location: !profile.hide_location }, 'location')}
            loading={saving === 'location'}
          />
        </Section>

        {/* statut */}
        <Section title="Statut">
          <Row
            icon={profile.status === 'active' ? Eye : EyeOff}
            label={profile.status === 'active' ? 'Profil actif' : 'Profil en pause'}
            desc={profile.status === 'active' ? 'Vous apparaissez dans les résultats' : 'Votre profil est momentanément masqué'}
            onClick={() => update({ status: profile.status === 'active' ? 'inactive' : 'active' }, 'status')}
            loading={saving === 'status'}
          />
        </Section>

        {/* abonnement */}
        <Section title="Abonnement">
          <button
            className="erb-btn"
            onClick={() => navigate('/abonnement')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px', borderRadius: '14px', cursor: 'pointer', textAlign: 'left',
              background: premium ? 'rgba(201,168,76,0.28)' : 'rgba(245,240,232,0.8)',
              border: premium ? '1px solid rgba(201,168,76,0.5)' : '1px solid rgba(201,168,76,0.15)',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Crown size={18} strokeWidth={1.5} style={{ color: premium ? '#C9A84C' : 'rgba(201,168,76,1)', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: premium ? '#C9A84C' : 'rgba(28,24,20,0.9)', marginBottom: 2 }}>
                  {premium ? 'Premium actif' : 'Passer Premium'}
                </p>
                <p style={{ fontSize: 11, color: 'rgba(28,24,20,0.9)' }}>
                  {premium
                    ? (profile?.plan_expires_at ? `Expire le ${new Date(profile.plan_expires_at).toLocaleDateString('fr-FR')}` : 'Abonnement actif')
                    : 'À partir de 9,90 €/mois'}
                </p>
              </div>
            </div>
            <ChevronRight size={16} strokeWidth={1.5} style={{ color: 'rgba(201,168,76,1)' }} />
          </button>

          {/* Bouton résiliation — obligatoire loi Chatel / art. L.215-1 Code conso */}
          {premium && (
            <button
              className="erb-btn"
              onClick={() => { setCancelConfirm(true); setCancelError(''); setCancelDone(false) }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', borderRadius: '14px',
                marginTop: '8px', cursor: 'pointer', textAlign: 'left',
                background: 'rgba(245,240,232,0.8)',
                border: '1px solid rgba(239,68,68,0.15)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)'
                e.currentTarget.style.background = 'rgba(239,68,68,0.05)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.15)'
                e.currentTarget.style.background = 'rgba(245,240,232,0.8)'
              }}
            >
              <XCircle size={17} strokeWidth={1.5} style={{ color: 'rgba(239,68,68,0.65)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'rgba(239,68,68,0.8)' }}>
                  Résilier mon abonnement
                </p>
                <p style={{ fontSize: 11, color: 'rgba(28,24,20,0.6)', marginTop: 2 }}>
                  Accès maintenu jusqu'à la fin de la période
                </p>
              </div>
              <ChevronRight size={15} strokeWidth={1.5} style={{ color: 'rgba(239,68,68,0.4)' }} />
            </button>
          )}
        </Section>

        {/* confidentialité RGPD */}
        <Section title="Confidentialité">
          <Row
            icon={ShieldOff}
            label="Révoquer mon consentement (Art. 9 RGPD)"
            desc={profile.consent_given_at
              ? `Consentement donné le ${new Date(profile.consent_given_at).toLocaleDateString('fr-FR')} — cliquez pour le retirer`
              : 'Consentement non enregistré'}
            onClick={() => { setConsentConfirm(true); setConsentRevokeError(''); setConsentRevokeDone(false) }}
            danger
          />
        </Section>

        {/* compte */}
        <Section title="Compte">
          <Row icon={LogOut} label="Se déconnecter" desc="" onClick={logout} danger />
          <Row icon={Trash2} label="Supprimer le compte" desc="Action irréversible" onClick={() => setConfirm(true)} danger />
        </Section>

      </div>

      {/* modal révocation consentement Art. 9 RGPD */}
      {consentConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', animationFillMode: 'both' }}
          onClick={() => { if (!revokingConsent) { setConsentConfirm(false); setConsentRevokeError('') } }}
        >
          <div
            className="animate-fade-in-up"
            onClick={e => e.stopPropagation()}
            style={{
              background: 'rgba(253,250,246,0.98)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '24px 24px 0 0',
              width: '100%', maxWidth: '480px',
              padding: '28px 24px 40px',
              animationFillMode: 'both',
            }}
          >
            {consentRevokeDone ? (
              <>
                <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '1.7rem', color: '#C9A84C', marginBottom: '12px' }}>
                  Consentement retiré
                </h2>
                <p style={{ fontSize: '13px', color: 'rgba(28,24,20,0.9)', lineHeight: 1.7, marginBottom: '24px' }}>
                  Votre consentement a été révoqué. Vos données de préférences (orientation, recherche) ont été effacées de notre base conformément à l'Art. 9 du RGPD.
                </p>
                <button
                  className="btn-gold"
                  onClick={() => setConsentConfirm(false)}
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '13px' }}
                >
                  Fermer
                </button>
              </>
            ) : (
              <>
                <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '1.7rem', color: 'rgba(239,68,68,0.85)', marginBottom: '12px' }}>
                  Révoquer le consentement
                </h2>
                <p style={{ fontSize: '13px', color: 'rgba(28,24,20,0.9)', lineHeight: 1.7, marginBottom: '20px' }}>
                  En retirant votre consentement Art. 9 RGPD, vos données sensibles (orientation, type de relation recherché) seront effacées immédiatement. Votre profil restera visible mais ces informations ne seront plus disponibles.
                </p>
                {consentRevokeError && (
                  <p style={{
                    fontSize: 12, color: 'rgba(248,113,113,0.9)',
                    background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)',
                    borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                  }}>
                    {consentRevokeError}
                  </p>
                )}
                <div className="flex gap-3">
                  <button className="erb-btn"
                    onClick={() => { setConsentConfirm(false); setConsentRevokeError('') }}
                    disabled={revokingConsent}
                    style={{
                      flex: 1, padding: '14px', borderRadius: '12px',
                      background: 'transparent', border: '1px solid rgba(201,168,76,0.1)',
                      color: 'rgba(28,24,20,0.9)', fontSize: '13px', cursor: 'pointer',
                      opacity: revokingConsent ? 0.5 : 1,
                    }}
                  >
                    Annuler
                  </button>
                  <button className="erb-btn"
                    onClick={revokeConsent}
                    disabled={revokingConsent}
                    style={{
                      flex: 1, padding: '14px', borderRadius: '12px',
                      background: revokingConsent ? 'rgba(200,200,200,0.15)' : 'rgba(239,68,68,0.12)',
                      border: revokingConsent ? '1px solid rgba(200,200,200,0.2)' : '1px solid rgba(239,68,68,0.3)',
                      color: revokingConsent ? 'rgba(28,24,20,0.3)' : 'rgba(239,68,68,0.9)',
                      fontSize: '13px', fontWeight: 600,
                      cursor: revokingConsent ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    }}
                    onMouseEnter={e => { if (!revokingConsent) e.currentTarget.style.background = 'rgba(239,68,68,0.2)' }}
                    onMouseLeave={e => { if (!revokingConsent) e.currentTarget.style.background = 'rgba(239,68,68,0.12)' }}
                  >
                    {revokingConsent && (
                      <div style={{ width: 14, height: 14, border: '2px solid rgba(239,68,68,0.3)', borderTopColor: 'rgba(239,68,68,0.9)', borderRadius: '50%', animation: 'rotateX 0.8s linear infinite', flexShrink: 0 }} />
                    )}
                    {revokingConsent ? 'Révocation…' : 'Révoquer le consentement'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* modal résiliation abonnement — loi Chatel */}
      {cancelConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', animationFillMode: 'both' }}
          onClick={() => { if (!cancelling) { setCancelConfirm(false); setCancelError('') } }}
        >
          <div
            className="animate-fade-in-up"
            onClick={e => e.stopPropagation()}
            style={{
              background: 'rgba(253,250,246,0.98)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '24px 24px 0 0',
              width: '100%', maxWidth: '480px',
              padding: '28px 24px 40px',
              animationFillMode: 'both',
            }}
          >
            {cancelDone ? (
              <>
                <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '1.7rem', color: '#C9A84C', marginBottom: '12px' }}>
                  Résiliation confirmée
                </h2>
                <p style={{ fontSize: '13px', color: 'rgba(28,24,20,0.9)', lineHeight: 1.7, marginBottom: '24px' }}>
                  Votre abonnement ne sera pas renouvelé. Vous conservez l'accès Premium jusqu'à la fin de la période en cours.
                </p>
                <button
                  className="btn-gold"
                  onClick={() => setCancelConfirm(false)}
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '13px' }}
                >
                  Fermer
                </button>
              </>
            ) : (
              <>
                <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '1.7rem', color: 'rgba(239,68,68,0.85)', marginBottom: '12px' }}>
                  Résilier l'abonnement
                </h2>
                <p style={{ fontSize: '13px', color: 'rgba(28,24,20,0.9)', lineHeight: 1.7, marginBottom: '20px' }}>
                  Votre abonnement Premium sera annulé. Vous conserverez l'accès jusqu'au{' '}
                  <strong style={{ color: '#C9A84C' }}>
                    {profile?.plan_expires_at
                      ? new Date(profile.plan_expires_at).toLocaleDateString('fr-FR')
                      : 'fin de période'}
                  </strong>
                  , sans renouvellement automatique.
                </p>
                {cancelError && (
                  <p style={{
                    fontSize: 12, color: 'rgba(248,113,113,0.9)',
                    background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)',
                    borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                  }}>
                    {cancelError}
                  </p>
                )}
                <div className="flex gap-3">
                  <button className="erb-btn"
                    onClick={() => { setCancelConfirm(false); setCancelError('') }}
                    disabled={cancelling}
                    style={{
                      flex: 1, padding: '14px', borderRadius: '12px',
                      background: 'transparent', border: '1px solid rgba(201,168,76,0.1)',
                      color: 'rgba(28,24,20,0.9)', fontSize: '13px', cursor: 'pointer',
                      opacity: cancelling ? 0.5 : 1,
                    }}
                  >
                    Annuler
                  </button>
                  <button className="erb-btn"
                    onClick={cancelSubscription}
                    disabled={cancelling}
                    style={{
                      flex: 1, padding: '14px', borderRadius: '12px',
                      background: cancelling ? 'rgba(200,200,200,0.15)' : 'rgba(239,68,68,0.12)',
                      border: cancelling ? '1px solid rgba(200,200,200,0.2)' : '1px solid rgba(239,68,68,0.3)',
                      color: cancelling ? 'rgba(28,24,20,0.3)' : 'rgba(239,68,68,0.9)',
                      fontSize: '13px', fontWeight: 600,
                      cursor: cancelling ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    }}
                    onMouseEnter={e => { if (!cancelling) e.currentTarget.style.background = 'rgba(239,68,68,0.2)' }}
                    onMouseLeave={e => { if (!cancelling) e.currentTarget.style.background = 'rgba(239,68,68,0.12)' }}
                  >
                    {cancelling && (
                      <div style={{ width: 14, height: 14, border: '2px solid rgba(239,68,68,0.3)', borderTopColor: 'rgba(239,68,68,0.9)', borderRadius: '50%', animation: 'rotateX 0.8s linear infinite', flexShrink: 0 }} />
                    )}
                    {cancelling ? 'Résiliation…' : 'Confirmer la résiliation'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* modal suppression */}
      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', animationFillMode: 'both' }}
          onClick={() => { setConfirm(false); setConfirmText('') }}
        >
          <div
            className="animate-fade-in-up"
            onClick={e => e.stopPropagation()}
            style={{
              background: 'rgba(253,250,246,0.98)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '24px 24px 0 0',
              width: '100%', maxWidth: '480px',
              padding: '28px 24px 40px',
              animationFillMode: 'both',
            }}
          >
            <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '1.7rem', color: 'rgba(239,68,68,0.85)', marginBottom: '12px' }}>
              Supprimer le compte
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(28,24,20,0.9)', lineHeight: 1.7, marginBottom: '20px' }}>
              Votre profil, vos connexions et vos messages seront définitivement supprimés. Cette action est irréversible.
            </p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', letterSpacing: '0.08em', color: 'rgba(28,24,20,0.6)', display: 'block', marginBottom: '8px' }}>
                Tapez <strong style={{ color: 'rgba(239,68,68,0.8)' }}>SUPPRIMER</strong> pour confirmer
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="SUPPRIMER"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'rgba(245,240,232,0.85)',
                  border: confirmText === 'SUPPRIMER'
                    ? '1px solid rgba(239,68,68,0.5)'
                    : '1px solid rgba(201,168,76,0.25)',
                  fontSize: '14px',
                  color: 'rgba(28,24,20,0.9)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
              />
            </div>
            <div className="flex gap-3">
              <button className="erb-btn"
                onClick={() => { setConfirm(false); setConfirmText('') }}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px',
                  background: 'transparent', border: '1px solid rgba(201,168,76,0.1)',
                  color: 'rgba(28,24,20,0.9)', fontSize: '13px', cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button className="erb-btn"
                onClick={deleteAccount}
                disabled={confirmText !== 'SUPPRIMER' || deleting}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px',
                  background: confirmText === 'SUPPRIMER' && !deleting ? 'rgba(239,68,68,0.12)' : 'rgba(200,200,200,0.15)',
                  border: confirmText === 'SUPPRIMER' && !deleting ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(200,200,200,0.2)',
                  color: confirmText === 'SUPPRIMER' && !deleting ? 'rgba(239,68,68,0.9)' : 'rgba(28,24,20,0.3)',
                  fontSize: '13px', fontWeight: 600,
                  cursor: confirmText === 'SUPPRIMER' && !deleting ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
                onMouseEnter={e => { if (confirmText === 'SUPPRIMER' && !deleting) e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
                onMouseLeave={e => { if (confirmText === 'SUPPRIMER' && !deleting) e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }}
              >
                {deleting && (
                  <div style={{ width: 14, height: 14, border: '2px solid rgba(239,68,68,0.3)', borderTopColor: 'rgba(239,68,68,0.9)', borderRadius: '50%', animation: 'rotateX 0.8s linear infinite', flexShrink: 0 }} />
                )}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <p style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,1)', marginBottom: '12px' }}>
        {title}
      </p>
      {children}
    </div>
  )
}

function Row({ icon: Icon, label, desc, onClick, loading, danger = false }) {
  return (
    <button className="erb-btn"
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '14px',
        padding: '14px 16px', borderRadius: '14px',
        marginBottom: '8px', cursor: 'pointer',
        textAlign: 'left',
        background: 'rgba(245,240,232,0.8)',
        border: danger ? '1px solid rgba(239,68,68,0.12)' : '1px solid rgba(201,168,76,0.15)',
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = danger ? 'rgba(239,68,68,0.3)' : 'rgba(201,168,76,0.35)'
        e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.05)' : 'rgba(237,231,219,0.9)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = danger ? 'rgba(239,68,68,0.12)' : 'rgba(201,168,76,0.15)'
        e.currentTarget.style.background = 'rgba(245,240,232,0.8)'
      }}
    >
      <Icon
        size={17}
        strokeWidth={1.5}
        style={{ color: danger ? 'rgba(239,68,68,0.65)' : 'rgba(201,168,76,1)', flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: 500, color: danger ? 'rgba(239,68,68,0.8)' : 'rgba(28,24,20,0.9)' }}>
          {label}
        </p>
        {desc && (
          <p style={{ fontSize: '11px', color: 'rgba(28,24,20,0.9)', marginTop: '2px' }}>{desc}</p>
        )}
      </div>
      {loading ? (
        <div style={{ width: 14, height: 14, border: '2px solid rgba(201,168,76,0.3)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'rotateX 0.8s linear infinite', flexShrink: 0 }} />
      ) : (
        <ChevronRight size={15} strokeWidth={1.5} style={{ color: 'rgba(28,24,20,0.9)', flexShrink: 0 }} />
      )}
    </button>
  )
}
