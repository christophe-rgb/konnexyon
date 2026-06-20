#!/usr/bin/env node
/**
 * Test automatique Konnexyon — vérifie les pages et l'auth Supabase
 */

const BASE         = 'https://konnexyon.com'
const SUPABASE_URL = 'https://qpynduwnteqlxhiyzknv.supabase.co'
const ANON_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFweW5kdXdudGVxbHhoaXl6a252Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1Mzk3NzYsImV4cCI6MjA5NzExNTc3Nn0.spOAatnWZp87L_5ipPf_U9ny43Pr80aAOlUa5c4fQIc'

const results = []
const ts = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })
let accessToken = null

async function check(name, fn) {
  const t0 = Date.now()
  try {
    const ok = await fn()
    const ms = Date.now() - t0
    results.push({ name, ok, ms })
  } catch (e) {
    results.push({ name, ok: false, ms: Date.now() - t0, err: e.message })
  }
}

// 1. Page principale (HTML)
await check('konnexyon.com — HTTP 200', async () => {
  const r = await fetch(BASE)
  return r.ok
})

// 2. www.konnexyon.com
await check('www.konnexyon.com — HTTP 200', async () => {
  const r = await fetch('https://www.konnexyon.com')
  return r.ok
})

// 3. Supabase health
await check('Supabase — health', async () => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: { apikey: ANON_KEY }
  })
  return r.status < 500
})

// 4. Auth login — récupère le token pour le test suivant
await check('Auth — login christopheparra@gmail.com', async () => {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'christopheparra@gmail.com', password: 'azertyui' })
  })
  const d = await r.json()
  if (d.access_token) accessToken = d.access_token
  return !!d.access_token
})

// 5. RPC get_nearby_compatible_profiles — authentifié, retourne des données
await check('Supabase RPC — get_nearby_compatible_profiles (auth)', async () => {
  if (!accessToken) throw new Error('Pas de token (test auth en échec)')
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_nearby_compatible_profiles`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ radius_km: 100 })
  })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const data = await r.json()
  if (!Array.isArray(data)) throw new Error('Réponse inattendue')
  return true
})

// Rapport
const ok = results.filter(r => r.ok).length
const ko = results.filter(r => !r.ok)
const allGood = ko.length === 0

console.log(`\n🔍 Konnexyon — test automatique [${ts}]`)
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
for (const r of results) {
  const icon = r.ok ? '✅' : '❌'
  console.log(`${icon} ${r.name} (${r.ms}ms)${r.err ? ' — ' + r.err : ''}`)
}
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`${allGood ? '✅ Tout OK' : `❌ ${ko.length} test(s) en échec`} — ${ok}/${results.length} réussis\n`)

if (!allGood) process.exit(1)
