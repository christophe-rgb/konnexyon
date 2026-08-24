#!/usr/bin/env node
/**
 * Veille TrendTrack — client REST pour la Papeterie.
 *
 * Le connecteur MCP (.mcp.json) sert à interroger TrendTrack en
 * conversation. Ce script-ci sert à l'inverse : tourner seul, en tâche
 * planifiée, et déposer la veille sur disque pour qu'on la relise.
 *
 *   export TRENDTRACK_API_KEY=tt_...
 *   node scripts/trendtrack.mjs veille
 *   node scripts/trendtrack.mjs pubs "wax seal"
 *   node scripts/trendtrack.mjs boutiques stationery
 *
 * TrendTrack facture à la ligne renvoyée, pas à la requête : on garde
 * des limites basses par défaut et on journalise le coût de chaque appel.
 */

import { writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')
const DEPOT  = join(RACINE, 'marketing', 'veille')
const BASE   = 'https://api.trendtrack.io'

/** Les termes qui décrivent notre rayon, dans les deux langues du marché. */
const TERMES = [
  'wax seal', 'letter writing set', 'fountain pen', 'journal',
  'stationery gift set', 'papeterie', 'carnet', 'sceau de cire',
]

const cle = process.env.TRENDTRACK_API_KEY

function sortir(message, code = 1) {
  console.error(message)
  process.exit(code)
}

async function appel(chemin, { methode = 'GET', corps = null } = {}) {
  const r = await fetch(BASE + chemin, {
    method: methode,
    headers: {
      Authorization: `Bearer ${cle}`,
      ...(corps ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(corps ? { body: JSON.stringify(corps) } : {}),
  })

  const cout   = r.headers.get('x-usage-cost')
  const reste  = r.headers.get('x-credits-remaining')
  if (cout) console.error(`   ${chemin} — ${cout} crédit(s), reste ${reste ?? '?'}`)

  if (r.status === 401) sortir('Clé refusée. Vérifiez TRENDTRACK_API_KEY.')
  if (r.status === 429) sortir('Quota TrendTrack atteint — réessayez plus tard.')
  if (!r.ok) sortir(`${chemin} → HTTP ${r.status} ${await r.text().catch(() => '')}`)

  return r.json()
}

/** Enregistre un résultat, daté, en JSON. */
async function deposer(nom, donnees) {
  await mkdir(DEPOT, { recursive: true })
  const jour = new Date().toISOString().slice(0, 10)
  const chemin = join(DEPOT, `${jour}-${nom}.json`)
  await writeFile(chemin, JSON.stringify(donnees, null, 2))
  console.log(`→ ${chemin.replace(RACINE + '/', '')}`)
  return chemin
}

/* ── les commandes ────────────────────────────────────────── */

async function veille() {
  console.error('Veille sur le rayon papeterie…')
  const tout = {}
  for (const terme of TERMES) {
    // limite basse : la facturation est à la ligne renvoyée
    tout[terme] = await appel(`/v1/ads?search=${encodeURIComponent(terme)}&limit=25&offset=0`)
  }
  await deposer('veille-papeterie', tout)

  // digest lisible : ce qu'on regardera vraiment
  const lignes = ['# Veille papeterie — ' + new Date().toLocaleDateString('fr-FR'), '']
  for (const [terme, res] of Object.entries(tout)) {
    const items = res?.data ?? res?.items ?? []
    lignes.push(`## ${terme} — ${items.length} publicité(s)`, '')
    for (const a of items.slice(0, 8)) {
      lignes.push(`- **${a.pageName ?? a.advertiser ?? '?'}** — ${(a.body ?? a.text ?? '').slice(0, 140).replace(/\n/g, ' ')}`)
    }
    lignes.push('')
  }
  await mkdir(DEPOT, { recursive: true })
  const md = join(DEPOT, `${new Date().toISOString().slice(0, 10)}-veille.md`)
  await writeFile(md, lignes.join('\n'))
  console.log(`→ ${md.replace(RACINE + '/', '')}`)
}

async function pubs(terme) {
  if (!terme) sortir('Usage : node scripts/trendtrack.mjs pubs "<terme>"')
  await deposer(`pubs-${terme.replace(/\W+/g, '-')}`,
    await appel(`/v1/ads?search=${encodeURIComponent(terme)}&limit=50&offset=0`))
}

async function boutiques(terme) {
  if (!terme) sortir('Usage : node scripts/trendtrack.mjs boutiques "<terme>"')
  await deposer(`boutiques-${terme.replace(/\W+/g, '-')}`,
    await appel('/v1/shops/query', { methode: 'POST', corps: { search: terme, limit: 50 } }))
}

async function credits() {
  console.log(JSON.stringify(await appel('/v1/usage'), null, 2))
}

/* ── entrée ───────────────────────────────────────────────── */

const [, , commande, ...reste] = process.argv

if (!cle) sortir(
  'TRENDTRACK_API_KEY absente.\n' +
  'Créez la clé dans TrendTrack → Workspace → API, puis :\n' +
  '  export TRENDTRACK_API_KEY=tt_...\n\n' +
  'Pour interroger TrendTrack en conversation plutôt qu\'en script,\n' +
  'le connecteur MCP est déjà déclaré dans .mcp.json — il suffit de\n' +
  'l\'autoriser une fois en OAuth.',
)

const commandes = { veille, pubs, boutiques, credits }
const choisie = commandes[commande]
if (!choisie) sortir(`Commandes : ${Object.keys(commandes).join(', ')}`)
await choisie(...reste)
