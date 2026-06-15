import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { AlertTriangle, CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import clsx from 'clsx'

export default function Admin() {
  const user      = useAuthStore(s => s.user)
  const navigate  = useNavigate()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    checkAdmin()
  }, [user])

  const checkAdmin = async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    const role = u?.app_metadata?.role
    if (role !== 'admin') { navigate('/discover'); return }
    setIsAdmin(true)
    loadReports()
  }

  const loadReports = async () => {
    const { data } = await supabase
      .from('reports')
      .select(`
        id, reason, status, created_at, admin_note,
        reporter:reporter_id(couple_name),
        reported:reported_id(id, couple_name, status)
      `)
      .order('created_at', { ascending: false })

    setReports(data || [])
    setLoading(false)
  }

  const action = async (reportId, reportedId, status, adminNote) => {
    await supabase.from('reports').update({
      status,
      admin_note: adminNote || null,
      resolved_at: new Date().toISOString(),
    }).eq('id', reportId)

    if (status === 'suspended') {
      await supabase.from('profiles').update({ status: 'suspended' }).eq('id', reportedId)
    } else if (status === 'dismissed') {
      // rien à faire côté profil
    }

    loadReports()
  }

  if (!isAdmin) return null

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-8">
        <AlertTriangle size={22} className="text-gold" strokeWidth={1.5} />
        <h1 className="font-serif text-3xl font-semibold">Signalements</h1>
      </div>

      {loading ? (
        <p className="text-muted text-sm">Chargement…</p>
      ) : reports.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle size={40} className="mx-auto text-gold/30 mb-3" strokeWidth={1} />
          <p className="font-serif text-2xl text-muted">Aucun signalement en attente</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {reports.map(r => (
            <ReportCard key={r.id} report={r} onAction={action} />
          ))}
        </div>
      )}
    </div>
  )
}

function ReportCard({ report, onAction }) {
  const navigate = useNavigate()
  const [note, setNote] = useState('')

  const statusColor = {
    pending:   'text-yellow-400 border-yellow-900/40 bg-yellow-900/10',
    warned:    'text-orange-400 border-orange-900/40 bg-orange-900/10',
    suspended: 'text-red-400 border-red-900/40 bg-red-900/10',
    dismissed: 'text-muted border-[rgba(201,168,76,0.2)] bg-surface2',
  }

  return (
    <div className="bg-surface border border-[rgba(201,168,76,0.2)] rounded-2xl p-5">
      {/* header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm text-muted">
            <span className="text-text font-medium">{report.reporter?.couple_name || 'Inconnu'}</span>
            {' '}signale{' '}
            <button
              onClick={() => navigate(`/profile/${report.reported?.id}`)}
              className="text-gold hover:underline font-medium cursor-pointer inline-flex items-center gap-0.5"
            >
              {report.reported?.couple_name || 'Inconnu'}
              <ExternalLink size={12} strokeWidth={1.5} />
            </button>
          </p>
          <p className="text-[11px] text-muted/60 mt-0.5">
            {new Date(report.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <span className={clsx('text-xs px-2.5 py-1 rounded-full border flex-shrink-0', statusColor[report.status])}>
          {report.status}
        </span>
      </div>

      <p className="text-sm text-text/80 bg-surface2 rounded-xl px-4 py-3 leading-relaxed mb-4">
        {report.reason}
      </p>

      {report.admin_note && (
        <p className="text-xs text-muted italic mb-3">Note admin : {report.admin_note}</p>
      )}

      {report.status === 'pending' && (
        <>
          <input
            value={note} onChange={e => setNote(e.target.value)}
            placeholder="Note admin (optionnel)…"
            className="w-full bg-surface2 border border-[rgba(201,168,76,0.15)] rounded-xl px-4 py-2.5 text-sm text-text placeholder-muted focus:outline-none focus:border-gold mb-3 transition-colors duration-150"
          />
          <div className="flex gap-2">
            <button
              onClick={() => onAction(report.id, report.reported?.id, 'warned', note)}
              className="flex-1 py-2.5 rounded-xl border border-orange-900/40 text-orange-400 text-sm hover:bg-orange-900/20 transition-colors duration-150 cursor-pointer"
            >
              Avertir
            </button>
            <button
              onClick={() => onAction(report.id, report.reported?.id, 'suspended', note)}
              className="flex-1 py-2.5 rounded-xl border border-red-900/40 text-red-400 text-sm hover:bg-red-900/20 transition-colors duration-150 cursor-pointer"
            >
              Suspendre
            </button>
            <button
              onClick={() => onAction(report.id, report.reported?.id, 'dismissed', note)}
              className="flex-1 py-2.5 rounded-xl border border-[rgba(201,168,76,0.2)] text-muted text-sm hover:text-text transition-colors duration-150 cursor-pointer flex items-center justify-center gap-1"
            >
              <XCircle size={14} strokeWidth={1.5} />
              Rejeter
            </button>
          </div>
        </>
      )}
    </div>
  )
}
