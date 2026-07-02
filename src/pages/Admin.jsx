import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { AlertTriangle, CheckCircle, XCircle, ExternalLink, ShieldOff, Shield, Filter, Trash2 } from 'lucide-react'
import { confirm } from '../components/ConfirmDialog'
import BotInbox from '../components/BotInbox'
import BotPhotos from '../components/BotPhotos'
import VenuesAdmin from '../components/VenuesAdmin'
import VenueLeads from '../components/VenueLeads'
import MusicAdmin from '../components/MusicAdmin'

export default function Admin() {
  const user     = useAuthStore(s => s.user)
  const navigate = useNavigate()

  const [isAdmin, setIsAdmin] = useState(false)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('pending') // pending | all | resolved
  const [tab,     setTab]     = useState('reports')  // reports | bots

  useEffect(() => { checkAdmin() }, [user])

  const checkAdmin = async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (u?.app_metadata?.role !== 'admin') { navigate('/discover'); return }
    setIsAdmin(true)
    loadReports()
  }

  const loadReports = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('reports')
      .select(`id, reason, status, created_at, admin_note,
        reporter:reporter_id(couple_name),
        reported:reported_id(id, couple_name, status, avatar_url)`)
      .order('created_at', { ascending: false })
    setReports(data || [])
    setLoading(false)
  }

  const action = async (reportId, reportedId, status, note) => {
    // Toutes les mutations admin passent par des RPC SECURITY DEFINER
    // qui vérifient le rôle 'admin' côté PostgreSQL — jamais via l'API directe.
    if (status === 'suspended') {
      const { error } = await supabase.rpc('admin_suspend_profile', {
        p_report_id:   reportId,
        p_reported_id: reportedId,
        p_admin_note:  note || null,
      })
      if (error) { console.error('admin_suspend_profile:', error.message); return }
    } else if (status === 'banned') {
      const { error } = await supabase.rpc('admin_ban_profile', {
        p_report_id:   reportId,
        p_reported_id: reportedId,
        p_admin_note:  note || null,
      })
      if (error) { console.error('admin_ban_profile:', error.message); return }
    } else {
      // 'dismissed' | 'warned'
      const { error } = await supabase.rpc('admin_resolve_report', {
        p_report_id:  reportId,
        p_status:     status,
        p_admin_note: note || null,
      })
      if (error) { console.error('admin_resolve_report:', error.message); return }
    }
    loadReports()
  }

  if (!isAdmin) return null

  // stats
  const pending   = reports.filter(r => r.status === 'pending').length
  const suspended = reports.filter(r => r.status === 'suspended').length
  const banned    = reports.filter(r => r.status === 'banned').length

  // regrouper par profil signalé
  const grouped = reports.reduce((acc, r) => {
    const id = r.reported?.id || 'unknown'
    if (!acc[id]) acc[id] = { profile: r.reported, reports: [] }
    acc[id].reports.push(r)
    return acc
  }, {})

  // filtrer
  const filteredGroups = Object.values(grouped).filter(g => {
    if (filter === 'pending') return g.reports.some(r => r.status === 'pending')
    if (filter === 'resolved') return g.reports.every(r => r.status !== 'pending')
    return true
  }).sort((a, b) => {
    // priorité : plus de signalements pending en premier
    const aPending = a.reports.filter(r => r.status === 'pending').length
    const bPending = b.reports.filter(r => r.status === 'pending').length
    return bPending - aPending
  })

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100dvh', width: '100vw', marginLeft: 'calc(50% - 50vw)' }}>
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px calc(env(safe-area-inset-bottom, 0px) + 110px)' }}>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <Shield size={18} strokeWidth={1.5} style={{ color: 'rgba(239,68,68,0.8)' }} />
        </div>
        <div>
          <h1 style={{ fontFamily: 'Cormorant, serif', fontSize: '1.8rem', fontWeight: 600, color: '#F0EDE8' }}>Modération</h1>
          <p style={{ fontSize: 11, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>Panneau d'administration</p>
        </div>
      </div>

      {/* onglets */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[{ k: 'reports', l: 'Signalements' }, { k: 'bots', l: 'Boîte des bots' }, { k: 'botphotos', l: 'Photos des bots' }, { k: 'venues', l: 'Lieux' }, { k: 'leads', l: 'Réponses' }, { k: 'music', l: 'Musique' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{
            padding: '7px 16px', borderRadius: 99, fontSize: 12, cursor: 'pointer',
            border: tab === t.k ? '1px solid rgba(201,168,76,0.6)' : '1px solid rgba(255,255,255,0.08)',
            background: tab === t.k ? 'rgba(201,168,76,0.1)' : 'transparent',
            color: tab === t.k ? '#C9A84C' : 'rgba(255,255,255,0.35)',
            letterSpacing: '0.06em', transition: 'all 0.2s',
          }}>{t.l}</button>
        ))}
      </div>

      {tab === 'music' ? <MusicAdmin /> : tab === 'leads' ? <VenueLeads /> : tab === 'venues' ? <VenuesAdmin /> : tab === 'botphotos' ? <BotPhotos /> : tab === 'bots' ? <BotInbox /> : (<>

      {/* stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'En attente', value: pending, color: '#FBBF24' },
          { label: 'Total', value: reports.length, color: 'rgba(201,168,76,0.7)' },
          { label: 'Suspendus', value: suspended, color: '#FB923C' },
          { label: 'Bannis', value: banned, color: '#EF4444' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
            <p style={{ fontSize: '1.6rem', fontWeight: 700, color: s.color, fontFamily: 'Cormorant, serif' }}>{s.value}</p>
            <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* filtres */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { key: 'pending', label: 'En attente' },
          { key: 'all', label: 'Tous' },
          { key: 'resolved', label: 'Résolus' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding: '7px 16px', borderRadius: 99, fontSize: 12, cursor: 'pointer',
            border: filter === f.key ? '1px solid rgba(201,168,76,0.6)' : '1px solid rgba(255,255,255,0.08)',
            background: filter === f.key ? 'rgba(201,168,76,0.1)' : 'transparent',
            color: filter === f.key ? '#C9A84C' : 'rgba(255,255,255,0.35)',
            letterSpacing: '0.06em', transition: 'all 0.2s',
          }}>
            {f.label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.25)', alignSelf: 'center' }}>
          {filteredGroups.length} profil{filteredGroups.length > 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ width: 24, height: 24, border: '2px solid rgba(201,168,76,0.2)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'rotateX 0.8s linear infinite', margin: '0 auto' }} />
        </div>
      ) : filteredGroups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <CheckCircle size={40} strokeWidth={1} style={{ color: 'rgba(201,168,76,0.3)', margin: '0 auto 12px' }} />
          <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.5rem', color: 'rgba(255,255,255,0.3)' }}>
            {filter === 'pending' ? 'Aucun signalement en attente' : 'Aucun résultat'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredGroups.map(g => (
            <ProfileReportGroup
              key={g.profile?.id || 'unknown'}
              group={g}
              onAction={action}
              onViewProfile={id => navigate(`/profile/${id}`)}
            />
          ))}
        </div>
      )}

      </>)}
    </div>
    </div>
  )
}

function ProfileReportGroup({ group, onAction, onViewProfile }) {
  const { profile, reports } = group
  const pendingReports = reports.filter(r => r.status === 'pending')
  const isCritical = pendingReports.length >= 3
  const isBanned   = profile?.status === 'banned'
  const isSuspended = profile?.status === 'suspended'

  return (
    <div style={{
      background: 'rgba(245,240,232,0.8)',
      border: `1px solid ${isCritical ? 'rgba(239,68,68,0.4)' : isBanned ? 'rgba(239,68,68,0.2)' : 'rgba(201,168,76,0.12)'}`,
      borderRadius: 20,
      overflow: 'hidden',
    }}>
      {/* profil header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* avatar */}
        <div style={{
          width: 44, height: 44, borderRadius: 12, overflow: 'hidden', flexShrink: 0,
          background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontFamily: 'Cormorant, serif', fontSize: '1.2rem', color: 'rgba(201,168,76,0.5)' }}>{profile?.couple_name?.[0] ?? '?'}</span>
          }
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ fontSize: 15, fontWeight: 500, color: '#1C1814' }}>{profile?.couple_name || 'Profil inconnu'}</p>
            {isCritical && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', letterSpacing: '0.1em' }}>⚠ CRITIQUE</span>}
            {isBanned && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(239,68,68,0.7)', letterSpacing: '0.1em' }}>BANNI</span>}
            {isSuspended && !isBanned && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.25)', color: 'rgba(251,146,60,0.8)', letterSpacing: '0.1em' }}>SUSPENDU</span>}
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
            {reports.length} signalement{reports.length > 1 ? 's' : ''} · {pendingReports.length} en attente
          </p>
        </div>

        <button onClick={() => onViewProfile(profile?.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 10, background: 'transparent', border: '1px solid rgba(201,168,76,0.2)', color: 'rgba(201,168,76,0.6)', fontSize: 12, cursor: 'pointer' }}>
          <ExternalLink size={12} strokeWidth={1.5} /> Voir
        </button>
      </div>

      {/* signalements */}
      <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {reports.map(r => (
          <ReportRow key={r.id} report={r} profileId={profile?.id} onAction={onAction} />
        ))}
      </div>
    </div>
  )
}

function ReportRow({ report, profileId, onAction }) {
  const [note, setNote] = useState('')
  const [open, setOpen] = useState(report.status === 'pending')

  const statusStyle = {
    pending:   { color: '#FBBF24', label: 'En attente' },
    warned:    { color: '#FB923C', label: 'Averti' },
    suspended: { color: '#FB923C', label: 'Suspendu' },
    banned:    { color: '#EF4444', label: 'Banni' },
    dismissed: { color: 'rgba(255,255,255,0.3)', label: 'Rejeté' },
  }[report.status] || { color: '#888', label: report.status }

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.04)' }}>
      <div
        role="button"
        tabIndex={0}
        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o) } }}
      >
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusStyle.color, flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', flex: 1 }}>
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>{report.reporter?.couple_name || '?'}</span>
          {' · '}
          {new Date(report.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
        </p>
        <span style={{ fontSize: 10, color: statusStyle.color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{statusStyle.label}</span>
      </div>

      {open && (
        <div style={{ marginTop: 10 }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>
            {report.reason}
          </p>

          {report.admin_note && (
            <p style={{ fontSize: 11, color: 'rgba(201,168,76,0.5)', fontStyle: 'italic', marginBottom: 8 }}>
              Note : {report.admin_note}
            </p>
          )}

          {report.status === 'pending' && (
            <>
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Note admin (optionnel)…"
                style={{
                  width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, padding: '9px 12px', color: '#1C1814', fontSize: 12,
                  outline: 'none', marginBottom: 10, boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => onAction(report.id, profileId, 'dismissed', note)}
                  style={{ flex: 1, minWidth: 70, padding: '8px', borderRadius: 10, cursor: 'pointer', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <XCircle size={13} strokeWidth={1.5} /> Rejeter
                </button>
                <button onClick={() => onAction(report.id, profileId, 'warned', note)}
                  style={{ flex: 1, minWidth: 70, padding: '8px', borderRadius: 10, cursor: 'pointer', background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.25)', color: 'rgba(251,146,60,0.8)', fontSize: 12 }}>
                  Avertir
                </button>
                <button onClick={() => onAction(report.id, profileId, 'suspended', note)}
                  style={{ flex: 1, minWidth: 70, padding: '8px', borderRadius: 10, cursor: 'pointer', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', color: 'rgba(239,68,68,0.8)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <ShieldOff size={13} strokeWidth={1.5} /> Suspendre
                </button>
                <button onClick={async () => { if (await confirm({ title: 'Bannir le profil', message: 'Bannir définitivement ce profil ? Cette action est irréversible.', confirmLabel: 'Bannir', danger: true })) onAction(report.id, profileId, 'banned', note) }}
                  style={{ flex: 1, minWidth: 70, padding: '8px', borderRadius: 10, cursor: 'pointer', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', color: '#EF4444', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <Trash2 size={13} strokeWidth={1.5} /> Bannir
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
