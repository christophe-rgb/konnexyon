import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { DEMO_PROFILES } from '../lib/demo'
import { MapPin, Camera, Flag, Ban, Heart, Settings } from 'lucide-react'
import { toast } from '../components/Toast'
import clsx from 'clsx'

const LIMITS_LABELS = {
  pas_photo:             'Pas de photo sans accord',
  discretion:            'Discrétion totale',
  pas_contact_hors_site: 'Pas de contact hors site avant rencontre',
  preservatif:           'Préservatif obligatoire',
}

const SEEKING_LABELS = {
  rencontres_occasionnelles: 'Rencontres',
  echangisme:                'Échangisme',
  amis_libertins:            'Amis libertins',
  decouverte:                'Découverte',
}

export default function Profile() {
  const { id }       = useParams()
  const myProfile    = useAuthStore(s => s.profile)
  const fetchProfile = useAuthStore(s => s.fetchProfile)
  const navigate     = useNavigate()

  const demoMode = useAuthStore(s => s.demoMode)
  const isOwn   = !id || id === myProfile?.id
  const uid     = isOwn ? myProfile?.id : id

  const [profile,  setProfile]  = useState(isOwn ? myProfile : null)
  const [editing,  setEditing]  = useState(false)
  const [form,     setForm]     = useState({})
  const [saving,   setSaving]   = useState(false)
  const [liked,    setLiked]    = useState(false)
  const [matched,  setMatched]  = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [showReport, setShowReport] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!uid) return
    if (isOwn) {
      setProfile(myProfile)
      setForm({
        couple_name: myProfile?.couple_name || '',
        bio:         myProfile?.bio || '',
        orientation: myProfile?.orientation || 'hetero_hetero',
        looking_for: myProfile?.looking_for || ['couple'],
        seeking:     myProfile?.seeking || [],
        limits:      myProfile?.limits || [],
        availabilities: myProfile?.availabilities || [],
      })
    } else if (demoMode) {
      const demo = DEMO_PROFILES.find(p => p.id === uid)
      if (demo) setProfile(demo)
    } else {
      loadOtherProfile()
      checkLike()
      checkMatch()
    }
  }, [uid, myProfile])

  const loadOtherProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
    setProfile(data)
  }

  const checkLike = async () => {
    const { data } = await supabase.from('likes')
      .select('id').eq('from_id', myProfile.id).eq('to_id', uid).single()
    setLiked(!!data)
  }

  const checkMatch = async () => {
    const a = myProfile.id < uid ? myProfile.id : uid
    const b = myProfile.id < uid ? uid : myProfile.id
    const { data } = await supabase.from('matches')
      .select('id').eq('couple_a', a).eq('couple_b', b).single()
    setMatched(!!data)
  }

  const like = async () => {
    if (liked) {
      await supabase.from('likes').delete().eq('from_id', myProfile.id).eq('to_id', uid)
      setLiked(false)
    } else {
      await supabase.from('likes').insert({ from_id: myProfile.id, to_id: uid })
      setLiked(true)
      checkMatch()
    }
  }

  const block = async () => {
    if (!confirm('Bloquer ce couple ? Le match et les contacts seront supprimés.')) return
    await supabase.from('blocks').insert({ blocker_id: myProfile.id, blocked_id: uid })
    toast('Couple bloqué')
    navigate('/discover')
  }

  const report = async () => {
    if (!reportReason.trim()) return
    await supabase.from('reports').insert({
      reporter_id: myProfile.id,
      reported_id: uid,
      reason: reportReason,
    })
    setShowReport(false)
    setReportReason('')
    toast('Signalement envoyé')
  }

  const uploadAvatar = async (file) => {
    const ext  = file.name.split('.').pop()
    const path = `${myProfile.id}/avatar.${ext}`
    await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', myProfile.id)
    await fetchProfile(myProfile.id)
  }

  const save = async () => {
    setSaving(true)
    await supabase.from('profiles').update(form).eq('id', myProfile.id)
    await fetchProfile(myProfile.id)
    setSaving(false)
    setEditing(false)
  }

  if (!profile) return <div className="p-6 text-muted text-sm">Chargement…</div>

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-12">
      {/* avatar */}
      <div className="relative w-28 h-28 mx-auto mb-5">
        <div className="w-full h-full rounded-full bg-surface2 overflow-hidden border-2 border-[rgba(201,168,76,0.3)]">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.couple_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-serif text-5xl text-gold/30">
              {profile.couple_name?.[0]}
            </div>
          )}
        </div>
        {isOwn && (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 bg-gold rounded-full flex items-center justify-center text-bg hover:bg-[#d4ae58] transition-colors duration-150 cursor-pointer"
            >
              <Camera size={14} strokeWidth={2} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => e.target.files[0] && uploadAvatar(e.target.files[0])} />
          </>
        )}
      </div>

      {/* nom & bio */}
      {!editing ? (
        <>
          <h1 className="font-serif text-3xl font-semibold text-center">{profile.couple_name}</h1>
          {profile.distance_km && (
            <div className="flex items-center justify-center gap-1 text-muted text-sm mt-1">
              <MapPin size={13} strokeWidth={1.5} />
              <span>à ~{profile.distance_km} km</span>
            </div>
          )}
          {profile.bio && (
            <p className="text-muted text-sm text-center mt-3 leading-relaxed">{profile.bio}</p>
          )}

          {isOwn && (
            <div className="flex gap-2 mt-4 justify-center">
              <button onClick={() => setEditing(true)}
                className="px-5 py-2 rounded-xl border border-[rgba(201,168,76,0.3)] text-gold text-sm hover:bg-gold/10 transition-colors duration-150 cursor-pointer">
                Modifier le profil
              </button>
              <button onClick={() => navigate('/settings')}
                className="w-9 h-9 rounded-xl border border-[rgba(201,168,76,0.2)] text-muted hover:text-gold hover:border-[rgba(201,168,76,0.4)] flex items-center justify-center transition-colors duration-150 cursor-pointer"
                aria-label="Paramètres"
              >
                <Settings size={16} strokeWidth={1.5} />
              </button>
            </div>
          )}
        </>
      ) : (
        <EditForm form={form} setForm={setForm} onSave={save} onCancel={() => setEditing(false)} saving={saving} />
      )}

      {/* sections */}
      {!editing && (
        <div className="mt-6 flex flex-col gap-5">
          {/* cherche */}
          {profile.seeking?.length > 0 && (
            <Section title="Ce qu'ils cherchent">
              <TagList items={profile.seeking} map={SEEKING_LABELS} />
            </Section>
          )}

          {/* limites */}
          {profile.limits?.length > 0 && (
            <Section title="Non négociable">
              <TagList items={profile.limits} map={LIMITS_LABELS} gold />
            </Section>
          )}

          {/* actions si profil externe */}
          {!isOwn && (
            <div className="flex flex-col gap-3 mt-2">
              {!matched && (
                <button onClick={like}
                  className={clsx('w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer',
                    liked ? 'bg-surface2 border border-[rgba(201,168,76,0.2)] text-muted' : 'bg-gold text-bg hover:bg-[#d4ae58]')}>
                  <Heart size={18} strokeWidth={liked ? 1.5 : 2} fill={liked ? 'none' : 'currentColor'} />
                  {liked ? 'Liké — retirer le like' : 'Liker ce couple'}
                </button>
              )}
              {matched && (
                <div className="text-center py-2 text-gold font-serif text-lg">✦ Match mutuel</div>
              )}

              <div className="flex gap-2">
                <button onClick={() => setShowReport(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[rgba(201,168,76,0.15)] text-muted hover:text-text text-sm transition-colors duration-150 cursor-pointer">
                  <Flag size={15} strokeWidth={1.5} /> Signaler
                </button>
                <button onClick={block}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-900/40 text-red-400/70 hover:text-red-400 text-sm transition-colors duration-150 cursor-pointer">
                  <Ban size={15} strokeWidth={1.5} /> Bloquer
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* modal signalement */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60">
          <div className="bg-surface border border-[rgba(201,168,76,0.2)] rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 pb-8">
            <h2 className="font-serif text-2xl mb-4">Signaler ce profil</h2>
            <textarea
              value={reportReason} onChange={e => setReportReason(e.target.value)}
              placeholder="Décrivez le problème…" rows={4}
              className="w-full bg-surface2 border border-[rgba(201,168,76,0.2)] rounded-xl px-4 py-3 text-text placeholder-muted text-sm focus:outline-none focus:border-gold resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowReport(false)}
                className="flex-1 py-3 rounded-xl border border-[rgba(201,168,76,0.2)] text-muted text-sm cursor-pointer">
                Annuler
              </button>
              <button onClick={report}
                className="flex-1 py-3 rounded-xl bg-gold text-bg font-semibold text-sm hover:bg-[#d4ae58] cursor-pointer">
                Envoyer
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
    <div>
      <p className="text-xs text-muted uppercase tracking-widest mb-2">{title}</p>
      {children}
    </div>
  )
}

function TagList({ items, map, gold }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(v => (
        <span key={v} className={clsx('text-sm px-3 py-1 rounded-full border',
          gold ? 'border-[rgba(201,168,76,0.4)] text-gold bg-gold/5' : 'border-[rgba(201,168,76,0.2)] text-muted bg-surface2')}>
          {map[v] || v}
        </span>
      ))}
    </div>
  )
}

function EditForm({ form, setForm, onSave, onCancel, saving }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="flex flex-col gap-4 mt-2">
      <div>
        <label className="block text-sm text-muted mb-1.5">Pseudo du couple</label>
        <input value={form.couple_name} onChange={e => set('couple_name', e.target.value)}
          maxLength={50}
          className="w-full bg-surface2 border border-[rgba(201,168,76,0.2)] rounded-xl px-4 py-3 text-text focus:outline-none focus:border-gold transition-colors duration-150" />
      </div>
      <div>
        <label className="block text-sm text-muted mb-1.5">Bio <span className="text-xs">(max 300)</span></label>
        <textarea value={form.bio} onChange={e => set('bio', e.target.value)}
          maxLength={300} rows={3}
          className="w-full bg-surface2 border border-[rgba(201,168,76,0.2)] rounded-xl px-4 py-3 text-text focus:outline-none focus:border-gold resize-none transition-colors duration-150" />
      </div>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-[rgba(201,168,76,0.2)] text-muted text-sm cursor-pointer">
          Annuler
        </button>
        <button onClick={onSave} disabled={saving}
          className="flex-1 py-3 rounded-xl bg-gold text-bg font-semibold text-sm hover:bg-[#d4ae58] disabled:opacity-50 cursor-pointer">
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}
