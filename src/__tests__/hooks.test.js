/**
 * Tests unitaires — fonctions pures extraites des hooks critiques.
 * Aucun mock Supabase, aucun rendu React requis.
 *
 * Lancer : npx vitest run src/__tests__/hooks.test.js
 */

import { describe, it, expect } from 'vitest'
import { validateImageFile, MAX_IMAGE_BYTES } from '../lib/upload.js'

// ─── validateImageFile (useProfileActions / lib/upload) ───────────────────────

describe('validateImageFile', () => {
  // File.size est un getter en lecture seule — on utilise un objet plain
  const makeFile = (name, type, size) => ({ name, type, size })

  it('retourne ok: false si aucun fichier', () => {
    const result = validateImageFile(null)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/aucun fichier/i)
  })

  it('retourne ok: false pour un fichier non-image', () => {
    const file = makeFile('doc.pdf', 'application/pdf', 1000)
    const result = validateImageFile(file)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/format non support/i)
  })

  it('retourne ok: false pour un SVG (risque XSS)', () => {
    const file = makeFile('icon.svg', 'image/svg+xml', 1000)
    const result = validateImageFile(file)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/svg/i)
  })

  it('retourne ok: false si taille > 5 Mo', () => {
    const file = makeFile('big.jpg', 'image/jpeg', MAX_IMAGE_BYTES + 1)
    const result = validateImageFile(file)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/5 mo/i)
  })

  it('retourne ok: true pour un JPEG valide sous la limite', () => {
    const file = makeFile('photo.jpg', 'image/jpeg', 1024 * 100)
    const result = validateImageFile(file)
    expect(result.ok).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('retourne ok: true pour un PNG valide', () => {
    const file = makeFile('img.png', 'image/png', 1024 * 200)
    expect(validateImageFile(file).ok).toBe(true)
  })

  it('retourne ok: true pour un WebP valide', () => {
    const file = makeFile('img.webp', 'image/webp', 1024 * 300)
    expect(validateImageFile(file).ok).toBe(true)
  })

  it('accepte exactement 5 Mo (limite incluse)', () => {
    const file = makeFile('exact.jpg', 'image/jpeg', MAX_IMAGE_BYTES)
    expect(validateImageFile(file).ok).toBe(true)
  })
})

// ─── Logique de déduplication des messages (extraite de useConversation) ──────
//
// Dans useConversation.js, la déduplication s'opère à deux endroits :
//   1. Realtime INSERT  → ms.some(x => x.id === payload.new.id) ? ms : [...ms, payload.new]
//   2. loadMore         → older.filter(m => !ms.some(x => x.id === m.id))
//
// On teste ici la logique pure sans état React.

describe('déduplication des messages (logique useConversation)', () => {
  // Simule le comportement du handler Realtime INSERT
  function applyRealtimeInsert(messages, newMsg) {
    return messages.some(x => x.id === newMsg.id) ? messages : [...messages, newMsg]
  }

  // Simule le merge de loadMore (messages plus anciens)
  function mergeOlderMessages(existing, older) {
    const deduped = older.filter(m => !existing.some(x => x.id === m.id))
    return [...deduped, ...existing]
  }

  const msg = (id, content = 'hello') => ({ id, content, created_at: new Date().toISOString() })

  it('ajoute un nouveau message en temps réel', () => {
    const current = [msg('a'), msg('b')]
    const result = applyRealtimeInsert(current, msg('c'))
    expect(result).toHaveLength(3)
    expect(result[2].id).toBe('c')
  })

  it('ignore un doublon en temps réel (même id)', () => {
    const current = [msg('a'), msg('b')]
    const result = applyRealtimeInsert(current, msg('b'))
    expect(result).toHaveLength(2)
  })

  it('insère les anciens messages en tête sans doublon', () => {
    const existing = [msg('c'), msg('d')]
    const older = [msg('a'), msg('b'), msg('c')] // 'c' déjà présent
    const result = mergeOlderMessages(existing, older)
    expect(result).toHaveLength(4) // a, b, c, d — pas de doublon
    expect(result[0].id).toBe('a')
    expect(result[1].id).toBe('b')
    expect(result[2].id).toBe('c')
    expect(result[3].id).toBe('d')
  })

  it('ne modifie pas le tableau si tous les anciens sont déjà présents', () => {
    const existing = [msg('a'), msg('b')]
    const older = [msg('a'), msg('b')]
    const result = mergeOlderMessages(existing, older)
    expect(result).toHaveLength(2)
  })

  it('gère correctement une liste vide de messages existants', () => {
    const result = mergeOlderMessages([], [msg('a'), msg('b')])
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('a')
  })
})

// ─── Validation UUID de matchId (extraite de useConversation) ─────────────────
//
// Regex utilisée : /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

describe('validation UUID de matchId', () => {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  const validUUIDs = [
    '550e8400-e29b-41d4-a716-446655440000',
    'A1B2C3D4-E5F6-7890-ABCD-EF1234567890', // majuscules (flag i)
    '00000000-0000-0000-0000-000000000000',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
  ]

  const invalidUUIDs = [
    '',
    'not-a-uuid',
    '550e8400-e29b-41d4-a716',          // tronqué
    '550e8400e29b41d4a716446655440000',  // sans tirets
    '550e8400-e29b-41d4-a716-44665544000g', // caractère invalide 'g'
    '../admin',                          // tentative de path traversal
    'undefined',
    null,
  ]

  validUUIDs.forEach(uuid => {
    it(`accepte l'UUID valide : ${uuid}`, () => {
      expect(UUID_RE.test(uuid)).toBe(true)
    })
  })

  invalidUUIDs.forEach(uuid => {
    it(`rejette la valeur invalide : ${JSON.stringify(uuid)}`, () => {
      expect(UUID_RE.test(uuid ?? '')).toBe(false)
    })
  })
})

// ─── Logique de tri/filtrage des profils Discover ────────────────────────────
//
// Dans Discover.jsx, la fonction load() applique ces filtres côté client
// (après la RPC Supabase ou sur DEMO_PROFILES) :
//   1. orientation !== 'all'  → p.orientation === filter
//   2. seeking.length > 0     → filter.seeking.some(s => p.seeking?.includes(s))
//   3. distance > 0           → p.distance_km <= filter.distance (mode démo uniquement)

describe('filtrage des profils Discover', () => {
  const profile = (id, orientation, seeking, distance_km) => ({
    id,
    orientation,
    seeking,
    distance_km,
  })

  const profiles = [
    profile('1', 'hetero_hetero', ['amis', 'echangiste'], 10),
    profile('2', 'bi_all',        ['echangiste'],          30),
    profile('3', 'hetero_bi',     ['amis'],                5),
    profile('4', 'hetero_hetero', ['amis'],                60),
    profile('5', 'bi_all',        ['amis', 'echangiste'], 100),
  ]

  // Simule la logique de load() de Discover.jsx
  function applyFilters(profs, filters) {
    let results = [...profs]
    if (filters.orientation !== 'all')
      results = results.filter(p => p.orientation === filters.orientation)
    if (filters.seeking?.length > 0)
      results = results.filter(p => filters.seeking.some(s => p.seeking?.includes(s)))
    if (filters.distance > 0)
      results = results.filter(p => p.distance_km <= filters.distance)
    return results
  }

  it('sans filtre (all, aucun seeking, distance 0) retourne tous les profils', () => {
    const result = applyFilters(profiles, { orientation: 'all', seeking: [], distance: 0 })
    expect(result).toHaveLength(5)
  })

  it('filtre par orientation hetero_hetero', () => {
    const result = applyFilters(profiles, { orientation: 'hetero_hetero', seeking: [], distance: 0 })
    expect(result.map(p => p.id)).toEqual(['1', '4'])
  })

  it('filtre par orientation bi_all', () => {
    const result = applyFilters(profiles, { orientation: 'bi_all', seeking: [], distance: 0 })
    expect(result.map(p => p.id)).toEqual(['2', '5'])
  })

  it('filtre par seeking echangiste (OU logique)', () => {
    const result = applyFilters(profiles, { orientation: 'all', seeking: ['echangiste'], distance: 0 })
    expect(result.map(p => p.id)).toEqual(['1', '2', '5'])
  })

  it('filtre par seeking avec plusieurs valeurs (OR)', () => {
    const result = applyFilters(profiles, { orientation: 'all', seeking: ['amis', 'echangiste'], distance: 0 })
    // tous ont au moins 'amis' ou 'echangiste'
    expect(result).toHaveLength(5)
  })

  it('filtre par distance max 30 km', () => {
    const result = applyFilters(profiles, { orientation: 'all', seeking: [], distance: 30 })
    expect(result.map(p => p.id)).toEqual(['1', '2', '3'])
  })

  it('filtre combiné : orientation + seeking', () => {
    const result = applyFilters(profiles, { orientation: 'hetero_hetero', seeking: ['echangiste'], distance: 0 })
    expect(result.map(p => p.id)).toEqual(['1'])
  })

  it('filtre combiné : orientation + distance', () => {
    const result = applyFilters(profiles, { orientation: 'hetero_hetero', seeking: [], distance: 20 })
    expect(result.map(p => p.id)).toEqual(['1'])
  })

  it('retourne tableau vide si aucun profil ne correspond', () => {
    const result = applyFilters(profiles, { orientation: 'hetero_hetero', seeking: [], distance: 1 })
    expect(result).toHaveLength(0)
  })

  it('profil sans seeking défini ne plante pas', () => {
    const withNull = [profile('6', 'hetero_hetero', undefined, 5)]
    const result = applyFilters(withNull, { orientation: 'all', seeking: ['amis'], distance: 0 })
    expect(result).toHaveLength(0)
  })

  it('profil avec seeking null ne plante pas', () => {
    const withNull = [profile('7', 'hetero_hetero', null, 5)]
    expect(() =>
      applyFilters(withNull, { orientation: 'all', seeking: ['amis'], distance: 0 })
    ).not.toThrow()
  })
})
