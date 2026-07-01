import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from './Toast'
import { Inbox, Mail, Phone, MapPin, Check, RotateCcw } from 'lucide-react'

const TYPE_LABELS = {
  club: 'Club', sauna: 'Sauna', sexshop: 'Sex-shop', bar: 'Bar', autre: 'Autre',
}
const FORMULE_LABELS = {
  gratuit: 'Gratuit (lancement)', essentiel: 'Essentiel', premium: 'Premium', infos: 'Infos',
}

const GOLD_GRADIENT = 'linear-gradient(135deg, #B8891F, #F4D875, #B8891F)'

// Onglet admin "Réponses" : réception en temps réel des réponses des lieux
// envoyées depuis la page publique /partenaire (RPC submit_venue_lead).
export default function VenueLeads() {
  const [leads,   setLeads]   = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data, error } = await supabase.rpc('admin_list_leads')
    if (error) console.error('admin_list_leads:', error.message)
    setLeads(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // Réception en temps réel : chaque nouvelle réponse actualise la liste.
    const ch = supabase
      .channel('venue-leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'venue_leads' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const mark = async (lead, handled) => {
    const { error } = await supabase.rpc('admin_mark_lead', { p_id: lead.id, p_handled: handled })
    if (error) { toast('Action impossible', 'error'); console.error('admin_mark_lead:', error.message); return }
    toast(handled ? 'Marqué comme traité' : 'Remis à traiter')
    load()
  }

  const pending = leads.filter(l => !l.handled).length

  return (
    <div>
      {/* compteur des réponses non traitées */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)' }}>
          <Inbox size={17} strokeWidth={1.6} style={{ color: '#C9A84C' }} />
        </div>
        <div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
            {leads.length} réponse{leads.length > 1 ? 's' : ''} au total
          </p>
        </div>
        <span style={{
          marginLeft: 'auto',
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 13px', borderRadius: 99,
          background: pending > 0 ? GOLD_GRADIENT : 'rgba(255,255,255,0.05)',
          color: pending > 0 ? '#050505' : 'rgba(255,255,255,0.4)',
          fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
          border: pending > 0 ? 'none' : '1px solid rgba(255,255,255,0.08)',
        }}>
          {pending} à traiter
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ width: 24, height: 24, border: '2px solid rgba(201,168,76,0.2)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'rotateX 0.8s linear infinite', margin: '0 auto' }} />
        </div>
      ) : leads.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Inbox size={38} strokeWidth={1} style={{ color: 'rgba(201,168,76,0.3)', margin: '0 auto 12px' }} />
          <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.5rem', color: 'rgba(255,255,255,0.3)' }}>
            Aucune réponse pour le moment
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {leads.map(l => <LeadCard key={l.id} lead={l} onMark={mark} />)}
        </div>
      )}
    </div>
  )
}

function LeadCard({ lead, onMark }) {
  const handled = !!lead.handled
  const phoneClean = String(lead.phone ?? '').replace(/[^0-9+]/g, '')
  const date = new Date(lead.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{
      background: handled ? 'rgba(255,255,255,0.02)' : 'rgba(201,168,76,0.06)',
      border: handled ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(201,168,76,0.35)',
      borderRadius: 16, padding: '16px 18px',
      opacity: handled ? 0.72 : 1,
    }}>
      {/* ligne titre + badges */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#F0EDE8' }}>{lead.venue_name}</p>
            {!handled && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#C9A84C', boxShadow: '0 0 8px rgba(201,168,76,0.6)' }} />}
          </div>
          <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
            <MapPin size={12} strokeWidth={1.5} />
            {lead.city || 'Ville non précisée'}
            {lead.type ? ` · ${TYPE_LABELS[lead.type] || lead.type}` : ''}
          </p>
        </div>
        {lead.formule && (
          <span style={{
            fontSize: 10.5, padding: '4px 10px', borderRadius: 99,
            background: GOLD_GRADIENT, color: '#050505',
            letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 700,
          }}>
            {FORMULE_LABELS[lead.formule] || lead.formule}
          </span>
        )}
      </div>

      {/* contact */}
      {(lead.contact_name || lead.email || lead.phone) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {lead.contact_name && (
            <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', padding: '6px 11px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {lead.contact_name}
            </span>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#C9A84C', textDecoration: 'none', padding: '6px 11px', borderRadius: 10, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)' }}>
              <Mail size={13} strokeWidth={1.6} /> {lead.email}
            </a>
          )}
          {lead.phone && (
            <a href={`tel:${phoneClean}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#C9A84C', textDecoration: 'none', padding: '6px 11px', borderRadius: 10, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)' }}>
              <Phone size={13} strokeWidth={1.6} /> {lead.phone}
            </a>
          )}
        </div>
      )}

      {/* message */}
      {lead.message && (
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, background: 'rgba(0,0,0,0.28)', borderRadius: 10, padding: '10px 13px', marginTop: 12 }}>
          {lead.message}
        </p>
      )}

      {/* pied : date + action */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{date}</span>
        <button
          onClick={() => onMark(lead, !handled)}
          style={{
            marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 13px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: handled ? 'transparent' : 'rgba(74,222,128,0.1)',
            border: handled ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(74,222,128,0.4)',
            color: handled ? 'rgba(255,255,255,0.45)' : '#4ade80',
          }}
        >
          {handled
            ? <><RotateCcw size={13} strokeWidth={1.7} /> À traiter</>
            : <><Check size={14} strokeWidth={2} /> Traité</>}
        </button>
      </div>
    </div>
  )
}
