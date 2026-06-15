import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { LogOut, Eye, EyeOff, MapPin, MapPinOff, Trash2, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

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
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="font-serif text-3xl font-semibold mb-8">Paramètres</h1>

      {/* visibilité */}
      <Section title="Visibilité du profil">
        {[
          { value: 'public',       label: 'Visible par tous',       desc: 'Votre profil apparaît dans les recherches' },
          { value: 'matches_only', label: 'Matchs uniquement',      desc: 'Seuls vos matchs peuvent vous voir' },
          { value: 'discreet',     label: 'Mode discret',           desc: 'Invisible sur la carte et les listes' },
        ].map(o => (
          <button key={o.value}
            onClick={() => update({ visibility: o.value }, 'visibility')}
            className={clsx('w-full flex items-center justify-between px-4 py-3 rounded-xl border mb-2 transition-colors duration-150 cursor-pointer',
              profile.visibility === o.value
                ? 'border-gold bg-gold/5'
                : 'border-[rgba(201,168,76,0.15)] hover:border-[rgba(201,168,76,0.3)]')}>
            <div className="text-left">
              <p className={clsx('text-sm font-medium', profile.visibility === o.value ? 'text-gold' : 'text-text')}>{o.label}</p>
              <p className="text-xs text-muted mt-0.5">{o.desc}</p>
            </div>
            {profile.visibility === o.value && saving !== 'visibility' && (
              <div className="w-2 h-2 rounded-full bg-gold flex-shrink-0" />
            )}
          </button>
        ))}
      </Section>

      {/* position */}
      <Section title="Géolocalisation">
        <Row
          icon={profile.hide_location ? MapPinOff : MapPin}
          label={profile.hide_location ? 'Position masquée' : 'Position visible'}
          desc={profile.hide_location ? 'Vous n\'apparaissez pas sur la carte' : 'Votre position approximative est visible'}
          onClick={() => update({ hide_location: !profile.hide_location }, 'location')}
          loading={saving === 'location'}
        />
      </Section>

      {/* statut */}
      <Section title="Statut du couple">
        <Row
          icon={profile.status === 'active' ? Eye : EyeOff}
          label={profile.status === 'active' ? 'Profil actif' : 'Profil inactif'}
          desc={profile.status === 'active' ? 'Vous apparaissez dans les résultats' : 'Votre profil est en pause'}
          onClick={() => update({ status: profile.status === 'active' ? 'inactive' : 'active' }, 'status')}
          loading={saving === 'status'}
        />
      </Section>

      {/* compte */}
      <Section title="Compte">
        <Row icon={LogOut} label="Se déconnecter" desc="" onClick={logout} danger />
        <Row icon={Trash2} label="Supprimer le compte" desc="Action irréversible" onClick={() => setConfirm(true)} danger />
      </Section>

      {/* confirmation suppression */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
          <div className="bg-surface border border-red-900/40 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="font-serif text-2xl font-semibold text-red-400 mb-2">Supprimer le compte</h2>
            <p className="text-muted text-sm mb-6">Votre profil, vos matchs et vos messages seront définitivement supprimés. Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-[rgba(201,168,76,0.2)] text-muted text-sm cursor-pointer">
                Annuler
              </button>
              <button onClick={deleteAccount}
                className="flex-1 py-3 rounded-xl bg-red-900/30 border border-red-900/60 text-red-400 font-semibold text-sm hover:bg-red-900/50 cursor-pointer">
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
    <div className="mb-8">
      <p className="text-xs text-muted uppercase tracking-widest mb-3">{title}</p>
      {children}
    </div>
  )
}

function Row({ icon: Icon, label, desc, onClick, loading, danger }) {
  return (
    <button onClick={onClick}
      className={clsx('w-full flex items-center gap-4 px-4 py-3 rounded-xl border mb-2 transition-colors duration-150 cursor-pointer',
        danger
          ? 'border-red-900/30 hover:border-red-900/60 hover:bg-red-900/10'
          : 'border-[rgba(201,168,76,0.15)] hover:border-[rgba(201,168,76,0.3)]')}>
      <Icon size={18} strokeWidth={1.5} className={danger ? 'text-red-400' : 'text-muted'} />
      <div className="flex-1 text-left">
        <p className={clsx('text-sm font-medium', danger ? 'text-red-400' : 'text-text')}>{label}</p>
        {desc && <p className="text-xs text-muted mt-0.5">{desc}</p>}
      </div>
      {loading ? (
        <div className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      ) : (
        <ChevronRight size={16} strokeWidth={1.5} className="text-muted" />
      )}
    </button>
  )
}
