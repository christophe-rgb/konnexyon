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
