import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { confirm } from './ConfirmDialog'
import { toast } from './Toast'
import { Plus, Pencil, Trash2, MapPin, ArrowLeft } from 'lucide-react'

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
  const [venues,  setVenues]  = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // objet form ou null (= liste)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_venues')
    if (error) console.error('get_venues:', error.message)
    setVenues(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

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

  const onSaved = () => { setEditing(null); load() }

  if (editing !== null) {
    return <VenueForm venue={editing} onSaved={onSaved} onCancel={() => setEditing(null)} />
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
          {venues.length} lieu{venues.length > 1 ? 'x' : ''}
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
            Aucun lieu pour l'instant
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {venues.map(v => (
            <div key={v.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 14, padding: '12px 16px',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#F0EDE8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</p>
                  {v.featured && <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Partenaire</span>}
                </div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                  {TYPE_LABELS[v.type] || v.type}{v.city ? ` · ${v.city}` : ''}
                </p>
              </div>
              <button
                onClick={() => setEditing({
                  id: v.id, name: v.name || '', type: v.type || 'club', city: v.city || '',
                  address: v.address || '', description: v.description || '', website: v.website || '',
                  phone: v.phone || '', photo_url: v.photo_url || '', featured: !!v.featured,
                  lat: v.lat ?? '', lng: v.lng ?? '',
                })}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 10, background: 'transparent', border: '1px solid rgba(201,168,76,0.25)', color: 'rgba(201,168,76,0.7)', fontSize: 12, cursor: 'pointer' }}
              >
                <Pencil size={12} strokeWidth={1.6} /> Modifier
              </button>
              <button
                onClick={() => remove(v)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: 12, cursor: 'pointer' }}
              >
                <Trash2 size={12} strokeWidth={1.6} /> Supprimer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

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
