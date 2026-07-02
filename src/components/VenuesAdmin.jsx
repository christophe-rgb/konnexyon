import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { confirm } from './ConfirmDialog'
import { toast } from './Toast'
import { Plus, Pencil, Trash2, MapPin, ArrowLeft, Send, Check, X, Eye, EyeOff, Camera, Zap } from 'lucide-react'

const TIERS = [
  { value: 'gratuit',   label: 'Gratuit' },
  { value: 'essentiel', label: 'Essentiel' },
  { value: 'premium',   label: 'Premium' },
]

const TYPES = [
  { value: 'club',    label: 'Club' },
  { value: 'sauna',   label: 'Sauna' },
  { value: 'sexshop', label: 'Sex-shop' },
  { value: 'bar',     label: 'Bar' },
  { value: 'autre',   label: 'Autre' },
]
const TYPE_LABELS = Object.fromEntries(TYPES.map(t => [t.value, t.label]))

const EMPTY = {
  id: null, name: '', type: 'club', city: '', address: '', description: '',
  website: '', phone: '', photo_url: '', featured: false, lat: '', lng: '',
}

// Onglet admin "Lieux" : liste + formulaire création/édition des lieux partenaires.
export default function VenuesAdmin() {
  const user = useAuthStore(s => s.user)
  const [venues,  setVenues]  = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // objet form ou null (= liste)
  const [busyId,  setBusyId]  = useState(null)  // upload logo en cours
  const fileRefs = useRef({})

  // Dossier complet (tous les lieux, y compris masqués/prospects).
  const load = async () => {
    const { data, error } = await supabase.rpc('admin_list_venues')
    if (error) console.error('admin_list_venues:', error.message)
    setVenues(data || [])
    setLoading(false)
  }
  useEffect(() => {
    load()
    // Dossier en temps réel : toute modif des lieux rafraîchit la liste.
    const ch = supabase
      .channel('venues-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'venues' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const remove = async (v) => {
    const ok = await confirm({
      title: 'Supprimer le lieu',
      message: `Supprimer « ${v.name} » ? Cette action est irréversible.`,
      confirmLabel: 'Supprimer', danger: true,
    })
    if (!ok) return
    const { error } = await supabase.rpc('admin_delete_venue', { p_id: v.id })
    if (error) { toast('Suppression impossible', 'error'); console.error(error.message); return }
    toast('Lieu supprimé')
    load()
  }

  // Pipeline de prospection.
  const setProspect = async (v, status) => {
    if (status === 'refuse') {
      const ok = await confirm({
        title: 'Refusé — supprimer',
        message: `« ${v.name} » a refusé ? Le lieu sera retiré du dossier.`,
        confirmLabel: 'Supprimer', danger: true,
      })
      if (!ok) return
    }
    const { error } = await supabase.rpc('admin_set_venue_prospect', { p_id: v.id, p_status: status })
    if (error) { toast('Action impossible', 'error'); console.error(error.message); return }
    toast(status === 'contacte' ? 'Marqué comme contacté ✉️'
        : status === 'accepte'  ? 'Accepté — mis en avant ✅'
        : status === 'refuse'   ? 'Refusé — supprimé'
        : 'Statut mis à jour')
    load()
  }

  const toggleVisibility = async (v) => {
    const { error } = await supabase.rpc('admin_set_venue_visibility', { p_id: v.id, p_visible: v.status !== 'active' })
    if (error) { toast('Action impossible', 'error'); console.error(error.message); return }
    load()
  }

  // ── Logo du lieu : upload dans le bucket avatars (dossier admin), puis RPC.
  const pickLogo = (id) => fileRefs.current[id]?.click()
  const uploadLogo = async (v, file) => {
    if (!file || !user) return
    if (!file.type.startsWith('image/')) { toast('Choisissez une image.', 'error'); return }
    if (file.size > 8 * 1024 * 1024) { toast('Image trop lourde (max 8 Mo).', 'error'); return }
    setBusyId(v.id)
    try {
      const ext  = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${user.id}/venue-${v.id}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatars').upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) { toast(`Erreur upload : ${upErr.message}`, 'error'); return }
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${publicUrl}?t=${Date.now()}`
      const { error: rpcErr } = await supabase.rpc('admin_set_venue_photo', { p_id: v.id, p_url: url })
      if (rpcErr) { toast(`Erreur : ${rpcErr.message}`, 'error'); return }
      setVenues(prev => prev.map(x => x.id === v.id ? { ...x, photo_url: url } : x))
      toast(`Logo de ${v.name} mis à jour ✓`)
    } catch (e) {
      toast('Erreur inattendue lors de l\'upload', 'error')
    } finally {
      setBusyId(null)
    }
  }

  // ── Formule (tier) → pilote la taille de l'épingle sur la carte.
  const setTier = async (v, tier) => {
    if (v.tier === tier) return
    const { error } = await supabase.rpc('admin_set_venue_tier', { p_id: v.id, p_tier: tier })
    if (error) { toast('Action impossible', 'error'); console.error(error.message); return }
    toast(`Formule : ${tier}`)
    load()
  }

  // ── Coup de projecteur « événement » (flash) : N jours ou arrêt.
  const setEvent = async (v, days) => {
    const { error } = await supabase.rpc('admin_set_venue_event', { p_id: v.id, p_days: days })
    if (error) { toast('Action impossible', 'error'); console.error(error.message); return }
    toast(days > 0 ? `Flash événement activé (${days} j) ⚡` : 'Flash arrêté')
    load()
  }

  const onSaved = () => { setEditing(null); load() }

  if (editing !== null) {
    return <VenueForm venue={editing} onSaved={onSaved} onCancel={() => setEditing(null)} />
  }

  const counts = {
    a_contacter: venues.filter(v => v.prospect_status === 'a_contacter').length,
    contacte:    venues.filter(v => v.prospect_status === 'contacte').length,
    accepte:     venues.filter(v => v.prospect_status === 'accepte').length,
  }
  const fmtDate = ts => ts ? new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : null

  const editFrom = v => setEditing({
    id: v.id, name: v.name || '', type: v.type || 'club', city: v.city || '',
    address: v.address || '', description: v.description || '', website: v.website || '',
    phone: v.phone || '', photo_url: v.photo_url || '', featured: !!v.featured,
    lat: v.lat ?? '', lng: v.lng ?? '',
  })

  return (
    <div>
      {/* compteurs du dossier (temps réel) */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[
          { k: 'a_contacter', l: 'À contacter', c: '#FBBF24' },
          { k: 'contacte',    l: 'Contactés',   c: '#60A5FA' },
          { k: 'accepte',     l: 'Acceptés',    c: '#4ade80' },
        ].map(s => (
          <div key={s.k} style={{ flex: 1, textAlign: 'center', padding: '10px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.5rem', fontWeight: 700, color: s.c }}>{counts[s.k]}</p>
            <p style={{ fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>{s.l}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
          {venues.length} lieu{venues.length > 1 ? 'x' : ''} au dossier
        </span>
        <button
          onClick={() => setEditing({ ...EMPTY })}
          style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 15px', borderRadius: 11, cursor: 'pointer',
            background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.4)',
            color: '#C9A84C', fontSize: 12.5, fontWeight: 600,
          }}
        >
          <Plus size={14} strokeWidth={2} /> Ajouter un lieu
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ width: 24, height: 24, border: '2px solid rgba(201,168,76,0.2)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'rotateX 0.8s linear infinite', margin: '0 auto' }} />
        </div>
      ) : venues.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <MapPin size={38} strokeWidth={1} style={{ color: 'rgba(201,168,76,0.3)', margin: '0 auto 12px' }} />
          <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.5rem', color: 'rgba(255,255,255,0.3)' }}>
            Aucun lieu au dossier
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {venues.map(v => {
            const ps = PROSPECT[v.prospect_status] || PROSPECT.a_contacter
            return (
            <div key={v.id} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 14, padding: '12px 16px',
            }}>
              {/* ligne titre + badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#F0EDE8' }}>{v.name}</p>
                <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, background: ps.bg, border: `1px solid ${ps.bd}`, color: ps.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{ps.label}</span>
                {v.featured && <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Partenaire</span>}
                {v.status === 'active' && <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80', letterSpacing: '0.06em', textTransform: 'uppercase' }}>En ligne</span>}
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                  {TYPE_LABELS[v.type] || v.type}{v.city ? ` · ${v.city}` : ''}{v.contacted_at ? ` · contacté le ${fmtDate(v.contacted_at)}` : ''}
                </span>
              </div>

              {/* actions pipeline */}
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {v.prospect_status === 'a_contacter' && (
                  <button onClick={() => setProspect(v, 'contacte')} style={pillBtn('#60A5FA')}>
                    <Send size={12} strokeWidth={1.8} /> Mail envoyé
                  </button>
                )}
                {v.prospect_status === 'contacte' && (<>
                  <button onClick={() => setProspect(v, 'accepte')} style={pillBtn('#4ade80')}>
                    <Check size={13} strokeWidth={2} /> Accepté
                  </button>
                  <button onClick={() => setProspect(v, 'refuse')} style={pillBtn('#EF4444')}>
                    <X size={13} strokeWidth={2} /> Refusé
                  </button>
                </>)}
                {v.prospect_status === 'accepte' && (
                  <button onClick={() => toggleVisibility(v)} style={pillBtn('#C9A84C')}>
                    {v.status === 'active' ? <><EyeOff size={12} strokeWidth={1.8} /> Masquer du site</> : <><Eye size={12} strokeWidth={1.8} /> Publier</>}
                  </button>
                )}
                <button onClick={() => editFrom(v)} style={pillBtn('rgba(201,168,76,0.75)')}>
                  <Pencil size={12} strokeWidth={1.6} /> Modifier
                </button>
                <button onClick={() => remove(v)} style={pillBtn('#EF4444')}>
                  <Trash2 size={12} strokeWidth={1.6} /> Supprimer
                </button>
              </div>

              {/* logo · formule · événement (pilotent l'épingle sur la carte) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
                {/* logo rond cliquable */}
                <button
                  onClick={() => pickLogo(v.id)}
                  disabled={busyId === v.id}
                  aria-label={`Changer le logo de ${v.name}`}
                  style={{
                    position: 'relative', width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                    cursor: busyId === v.id ? 'default' : 'pointer', padding: 0,
                    background: '#2a2620', border: '1px solid rgba(201,168,76,0.3)',
                  }}
                >
                  {v.photo_url
                    ? <img src={v.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(201,168,76,0.7)', fontFamily: 'Cormorant, serif', fontSize: 20 }}>{v.name?.[0] || '∞'}</div>}
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)', opacity: busyId === v.id ? 1 : 0.001 }}>
                    {busyId === v.id
                      ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'rotateX 0.7s linear infinite' }} />
                      : <Camera size={15} color="#fff" />}
                  </div>
                </button>
                <input
                  ref={el => (fileRefs.current[v.id] = el)}
                  type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; uploadLogo(v, f) }}
                />

                {/* segments formule */}
                <div style={{ display: 'flex' }}>
                  {TIERS.map((t, i) => {
                    const active = (v.tier || 'gratuit') === t.value
                    return (
                      <button
                        key={t.value}
                        onClick={() => setTier(v, t.value)}
                        style={{
                          padding: '6px 11px', fontSize: 11.5, cursor: 'pointer', letterSpacing: '0.03em',
                          borderTopLeftRadius: i === 0 ? 9 : 0, borderBottomLeftRadius: i === 0 ? 9 : 0,
                          borderTopRightRadius: i === TIERS.length - 1 ? 9 : 0, borderBottomRightRadius: i === TIERS.length - 1 ? 9 : 0,
                          border: '1px solid ' + (active ? 'rgba(201,168,76,0.6)' : 'rgba(255,255,255,0.12)'),
                          borderLeftWidth: i === 0 ? 1 : 0,
                          background: active ? 'linear-gradient(135deg, #B8891F, #F4D875, #B8891F)' : 'transparent',
                          color: active ? '#050505' : 'rgba(255,255,255,0.55)',
                          fontWeight: active ? 700 : 500,
                        }}
                      >{t.label}</button>
                    )
                  })}
                </div>

                {/* événement flash */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                  {(() => {
                    const flash = v.event_until && new Date(v.event_until) > new Date()
                    return flash ? (
                      <>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#F4D875' }}>
                          <Zap size={12} strokeWidth={2} /> actif jusqu'au {fmtDate(v.event_until)}
                        </span>
                        <button onClick={() => setEvent(v, 0)} style={pillBtn('rgba(255,255,255,0.5)')}>Stop</button>
                      </>
                    ) : (
                      <button onClick={() => setEvent(v, 7)} style={pillBtn('#F4D875')}>
                        <Zap size={12} strokeWidth={1.8} /> Flash 7 j
                      </button>
                    )
                  })()}
                </div>
              </div>
            </div>
          )})}
        </div>
      )}
    </div>
  )
}

const PROSPECT = {
  a_contacter: { label: 'À contacter', color: '#FBBF24', bg: 'rgba(251,191,36,0.12)', bd: 'rgba(251,191,36,0.35)' },
  contacte:    { label: 'Contacté',    color: '#60A5FA', bg: 'rgba(96,165,250,0.12)', bd: 'rgba(96,165,250,0.35)' },
  accepte:     { label: 'Accepté',     color: '#4ade80', bg: 'rgba(74,222,128,0.12)', bd: 'rgba(74,222,128,0.35)' },
  refuse:      { label: 'Refusé',      color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  bd: 'rgba(239,68,68,0.35)' },
}

const pillBtn = (color) => ({
  display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 10,
  background: 'transparent', border: `1px solid ${color}`, color,
  fontSize: 12, cursor: 'pointer', opacity: 0.92,
})

const inputStyle = {
  width: '100%', boxSizing: 'border-box', background: 'rgba(0,0,0,0.4)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
  padding: '10px 12px', color: '#F0EDE8', fontSize: 13, outline: 'none',
}
const labelStyle = { fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6, display: 'block' }

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function VenueForm({ venue, onSaved, onCancel }) {
  const [form, setForm] = useState(venue)
  const [saving,  setSaving]  = useState(false)
  const [locating, setLocating] = useState(false)

  const set = (k, val) => setForm(f => ({ ...f, [k]: val }))

  const geocode = async () => {
    const q = [form.address, form.city, 'France'].filter(Boolean).join(', ')
    if (!q.trim() || q.trim() === 'France') { toast('Renseignez une adresse ou une ville', 'error'); return }
    setLocating(true)
    try {
      const res = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(q))
      const data = await res.json()
      if (!data || !data.length) { toast('Adresse introuvable', 'error'); return }
      set('lat', data[0].lat)
      set('lng', data[0].lon)
      toast('Position trouvée')
    } catch (e) {
      console.error('geocode:', e)
      toast('Géocodage impossible', 'error')
    } finally {
      setLocating(false)
    }
  }

  const save = async () => {
    if (!form.name.trim()) { toast('Le nom est requis', 'error'); return }
    setSaving(true)
    const toNum = v => (v === '' || v == null) ? null : (Number.isNaN(Number(v)) ? null : Number(v))
    const { error } = await supabase.rpc('admin_save_venue', {
      p_id: form.id,
      p_name: form.name.trim(),
      p_type: form.type,
      p_city: form.city.trim() || null,
      p_address: form.address.trim() || null,
      p_description: form.description.trim() || null,
      p_website: form.website.trim() || null,
      p_phone: form.phone.trim() || null,
      p_photo_url: form.photo_url.trim() || null,
      p_featured: !!form.featured,
      p_lat: toNum(form.lat),
      p_lng: toNum(form.lng),
    })
    setSaving(false)
    if (error) { toast('Enregistrement impossible', 'error'); console.error(error.message); return }
    toast(form.id ? 'Lieu mis à jour' : 'Lieu ajouté')
    onSaved()
  }

  return (
    <div>
      <button onClick={onCancel} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: 'rgba(201,168,76,0.7)', fontSize: 12.5, cursor: 'pointer', marginBottom: 18, padding: 0 }}>
        <ArrowLeft size={14} strokeWidth={1.6} /> Retour à la liste
      </button>

      <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '1.5rem', fontWeight: 600, color: '#F0EDE8', marginBottom: 18 }}>
        {form.id ? 'Modifier le lieu' : 'Nouveau lieu'}
      </h2>

      <Field label="Nom *">
        <input value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle} placeholder="Le Club des Sens" />
      </Field>

      <Field label="Type">
        <select value={form.type} onChange={e => set('type', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          {TYPES.map(t => <option key={t.value} value={t.value} style={{ background: '#0A0A0A' }}>{t.label}</option>)}
        </select>
      </Field>

      <Field label="Ville">
        <input value={form.city} onChange={e => set('city', e.target.value)} style={inputStyle} placeholder="Paris" />
      </Field>

      <Field label="Adresse">
        <input value={form.address} onChange={e => set('address', e.target.value)} style={inputStyle} placeholder="12 rue de la Nuit" />
      </Field>

      <Field label="Description">
        <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Ambiance, horaires, etc." />
      </Field>

      <Field label="Site web">
        <input value={form.website} onChange={e => set('website', e.target.value)} style={inputStyle} placeholder="https://…" />
      </Field>

      <Field label="Téléphone">
        <input value={form.phone} onChange={e => set('phone', e.target.value)} style={inputStyle} placeholder="+33 …" />
      </Field>

      <Field label="URL de la photo">
        <input value={form.photo_url} onChange={e => set('photo_url', e.target.value)} style={inputStyle} placeholder="https://…" />
      </Field>

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, cursor: 'pointer' }}>
        <input type="checkbox" checked={!!form.featured} onChange={e => set('featured', e.target.checked)} style={{ width: 16, height: 16, accentColor: '#C9A84C', cursor: 'pointer' }} />
        <span style={{ fontSize: 13, color: '#F0EDE8' }}>Partenaire (mis en avant)</span>
      </label>

      <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Latitude</label>
          <input value={form.lat} onChange={e => set('lat', e.target.value)} style={inputStyle} placeholder="48.85" inputMode="decimal" />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Longitude</label>
          <input value={form.lng} onChange={e => set('lng', e.target.value)} style={inputStyle} placeholder="2.35" inputMode="decimal" />
        </div>
      </div>

      <button
        onClick={geocode}
        disabled={locating}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 22,
          padding: '8px 14px', borderRadius: 10, cursor: locating ? 'default' : 'pointer',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.7)', fontSize: 12, opacity: locating ? 0.6 : 1,
        }}
      >
        <MapPin size={13} strokeWidth={1.6} /> {locating ? 'Localisation…' : '📍 Localiser depuis l\'adresse'}
      </button>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: '12px', borderRadius: 12, cursor: 'pointer', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
          Annuler
        </button>
        <button onClick={save} disabled={saving} style={{ flex: 1, padding: '12px', borderRadius: 12, cursor: saving ? 'default' : 'pointer', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.5)', color: '#C9A84C', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}
