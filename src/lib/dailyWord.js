// Fonctions pures du Mot du jour — testées dans src/__tests__/dailyWord.test.js

export const MAX_LINE_LENGTH        = 180
export const DAILY_CONNECTION_QUOTA = 3

// ─── Ligne du jour ────────────────────────────────────────────

// Une ligne, pas un paragraphe : les retours chariot et les espaces
// multiples sont écrasés avant comptage, pour que le compteur affiché
// corresponde exactement à ce qui part en base.
export function normalizeLine(raw) {
  return String(raw ?? '').replace(/\s+/g, ' ').trim()
}

export function validateLine(raw) {
  const line = normalizeLine(raw)
  if (!line) {
    return { ok: false, error: 'Écris ta ligne avant de l’envoyer.' }
  }
  if (line.length > MAX_LINE_LENGTH) {
    return { ok: false, error: `${MAX_LINE_LENGTH} caractères maximum.` }
  }
  return { ok: true, line }
}

// ─── Quota de connexions ──────────────────────────────────────

export function connectionsLeft(used, quota = DAILY_CONNECTION_QUOTA) {
  const n = Number(used)
  if (!Number.isFinite(n) || n < 0) return quota
  return Math.max(0, quota - Math.floor(n))
}

// ─── Série de jours consécutifs ───────────────────────────────

function dayKey(d) {
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

/**
 * Nombre de jours consécutifs écrits, en remontant depuis aujourd'hui.
 *
 * La série reste valide si le membre n'a pas encore écrit aujourd'hui —
 * la journée n'est pas finie, on repart alors d'hier. Elle ne casse qu'à
 * partir de deux jours sans écriture.
 *
 * @param {string[]} dates  publish_date au format YYYY-MM-DD (ordre libre, doublons tolérés)
 */
export function computeStreak(dates, today = new Date()) {
  const days = new Set(
    (dates || [])
      .filter(Boolean)
      .map(d => String(d).slice(0, 10))
  )
  if (days.size === 0) return 0

  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1)          // setDate plutôt qu'un delta en ms : robuste au changement d'heure
    if (!days.has(dayKey(cursor))) return 0
  }

  let streak = 0
  while (days.has(dayKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

// ─── Affichage ────────────────────────────────────────────────

const CARNET_DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric', month: 'long', year: 'numeric',
})

// 'YYYY-MM-DD' → '23 août 2026'. Découpage manuel plutôt que new Date(str) :
// une date ISO nue est interprétée en UTC et recule d'un jour à l'ouest.
export function formatCarnetDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''))
  if (!m) return ''
  return CARNET_DATE_FORMAT.format(new Date(+m[1], +m[2] - 1, +m[3]))
}
