import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { LogOut, Eye, EyeOff, MapPin, MapPinOff, Trash2, ChevronRight, Settings as SettingsIcon } from 'lucide-react'

export default function Settings() {
  const { profile, fetchProfile, signOut } = useAuthStore()
  const navigate = useNavigate()
  const [saving,  setSaving]  = useState('')
  const [confirm, setConfirm] = useState(false)

  const update = async (patch, label) => {
    setSaving(label)
    await supabase.from('profiles').update(patch).eq('id', profile.id)
    await fetchProfile(profile.id)
    setSaving('')
  }

  const deleteAccount = async () => {
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
          background: 'rgba(5,5,5,0.95)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(201,168,76,0.1)',
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
          background: 'radial-gradient(circle, rgba(201,168,76,0.1), rgba(201,168,76,0.03))',
          border: '1px solid rgba(201,168,76,0.2)',
        }}>
          <SettingsIcon size={16} strokeWidth={1.5} style={{ color: 'rgba(201,168,76,0.7)' }} />
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
              <button
                key={o.value}
                onClick={() => update({ visibility: o.value }, 'visibility')}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderRadius: '14px',
                  marginBottom: '8px', cursor: 'pointer',
                  textAlign: 'left',
                  background: isActive ? 'rgba(201,168,76,0.05)' : 'rgba(12,12,12,0.8)',
                  border: isActive ? '1px solid rgba(201,168,76,0.3)' : '1px solid rgba(201,168,76,0.1)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => !isActive && (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.22)')}
                onMouseLeave={e => !isActive && (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.1)')}
              >
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: isActive ? '#C9A84C' : 'rgba(255,255,255,0.7)', marginBottom: '2px' }}>
                    {o.label}
                  </p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{o.desc}</p>
                </div>
                {isActive && saving !== 'visibility' && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg, #A07830, #E8CC7A)', flexShrink: 0 }} />
                )}
                {saving === 'visibility' && isActive && (
                  <div style={{ width: 14, height: 14, border: '2px solid rgba(201,168,76,0.2)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'rotateX 0.8s linear infinite', flexShrink: 0 }} />
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

        {/* compte */}
        <Section title="Compte">
          <Row icon={LogOut} label="Se déconnecter" desc="" onClick={logout} danger />
          <Row icon={Trash2} label="Supprimer le compte" desc="Action irréversible" onClick={() => setConfirm(true)} danger />
        </Section>

      </div>

      {/* modal suppression */}
      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', animationFillMode: 'both' }}
          onClick={() => setConfirm(false)}
        >
          <div
            className="animate-fade-in-up"
            onClick={e => e.stopPropagation()}
            style={{
              background: 'rgba(10,10,10,0.98)',
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
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.7, marginBottom: '24px' }}>
              Votre profil, vos connexions et vos messages seront définitivement supprimés. Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(false)}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px',
                  background: 'transparent', border: '1px solid rgba(201,168,76,0.15)',
                  color: 'rgba(255,255,255,0.4)', fontSize: '13px', cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                onClick={deleteAccount}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px',
                  background: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: 'rgba(239,68,68,0.9)',
                  fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }}
              >
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
      <p style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.4)', marginBottom: '12px' }}>
        {title}
      </p>
      {children}
    </div>
  )
}

function Row({ icon: Icon, label, desc, onClick, loading, danger = false }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '14px',
        padding: '14px 16px', borderRadius: '14px',
        marginBottom: '8px', cursor: 'pointer',
        textAlign: 'left',
        background: 'rgba(12,12,12,0.8)',
        border: danger ? '1px solid rgba(239,68,68,0.12)' : '1px solid rgba(201,168,76,0.1)',
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = danger ? 'rgba(239,68,68,0.3)' : 'rgba(201,168,76,0.25)'
        e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.05)' : 'rgba(20,20,20,0.9)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = danger ? 'rgba(239,68,68,0.12)' : 'rgba(201,168,76,0.1)'
        e.currentTarget.style.background = 'rgba(12,12,12,0.8)'
      }}
    >
      <Icon
        size={17}
        strokeWidth={1.5}
        style={{ color: danger ? 'rgba(239,68,68,0.65)' : 'rgba(201,168,76,0.5)', flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: 500, color: danger ? 'rgba(239,68,68,0.8)' : 'rgba(255,255,255,0.7)' }}>
          {label}
        </p>
        {desc && (
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.28)', marginTop: '2px' }}>{desc}</p>
        )}
      </div>
      {loading ? (
        <div style={{ width: 14, height: 14, border: '2px solid rgba(201,168,76,0.2)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'rotateX 0.8s linear infinite', flexShrink: 0 }} />
      ) : (
        <ChevronRight size={15} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
      )}
    </button>
  )
}
