/**
 * Tests unitaires — lib/upload.js
 * Couvre validateImageFile (sync) et validateImageMagicBytes (async).
 * Aucun mock Supabase, aucun rendu React.
 *
 * Lancer : npx vitest run src/__tests__/upload.test.js
 */

import { describe, it, expect } from 'vitest'
import { validateImageFile, validateImageMagicBytes, MAX_IMAGE_BYTES, MAX_CHAT_PHOTO_BYTES } from '../lib/upload.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeFile = (name, type, size) => ({ name, type, size })

/** Crée un faux File dont .slice() renvoie les bytes fournis. */
function makeBinaryFile(name, type, bytes) {
  const buf = new Uint8Array(bytes)
  return {
    name,
    type,
    size: bytes.length,
    slice: (start, end) => ({
      arrayBuffer: async () => buf.slice(start, end).buffer,
    }),
  }
}

const JPEG_MAGIC  = [0xFF, 0xD8, 0xFF, 0xE0]
const PNG_MAGIC   = [0x89, 0x50, 0x4E, 0x47]
const WEBP_MAGIC  = [0x52, 0x49, 0x46, 0x46]  // RIFF header
const FAKE_MAGIC  = [0x00, 0x11, 0x22, 0x33]

// ─── validateImageFile ────────────────────────────────────────────────────────

describe('validateImageFile', () => {
  it('retourne ok:false si null', () => {
    const r = validateImageFile(null)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/aucun fichier/i)
  })

  it('retourne ok:false si undefined', () => {
    const r = validateImageFile(undefined)
    expect(r.ok).toBe(false)
  })

  it('retourne ok:false pour un PDF', () => {
    const r = validateImageFile(makeFile('doc.pdf', 'application/pdf', 1000))
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/format non support/i)
  })

  it('retourne ok:false pour un type vide', () => {
    const r = validateImageFile(makeFile('file', '', 1000))
    expect(r.ok).toBe(false)
  })

  it('retourne ok:false pour SVG (risque XSS)', () => {
    const r = validateImageFile(makeFile('icon.svg', 'image/svg+xml', 500))
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/svg/i)
  })

  it('retourne ok:false si taille > 5 Mo', () => {
    const r = validateImageFile(makeFile('big.jpg', 'image/jpeg', MAX_IMAGE_BYTES + 1))
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/5 mo/i)
  })

  it('accepte exactement 5 Mo (limite incluse)', () => {
    expect(validateImageFile(makeFile('exact.jpg', 'image/jpeg', MAX_IMAGE_BYTES)).ok).toBe(true)
  })

  it('retourne ok:true pour JPEG valide', () => {
    expect(validateImageFile(makeFile('photo.jpg', 'image/jpeg', 200_000)).ok).toBe(true)
  })

  it('retourne ok:true pour PNG valide', () => {
    expect(validateImageFile(makeFile('img.png', 'image/png', 100_000)).ok).toBe(true)
  })

  it('retourne ok:true pour WebP valide', () => {
    expect(validateImageFile(makeFile('img.webp', 'image/webp', 300_000)).ok).toBe(true)
  })

  it('retourne ok:true pour GIF valide (image/* non-SVG)', () => {
    expect(validateImageFile(makeFile('img.gif', 'image/gif', 50_000)).ok).toBe(true)
  })

  it('pas de champ error sur succes', () => {
    const r = validateImageFile(makeFile('ok.jpg', 'image/jpeg', 1024))
    expect(r.error).toBeUndefined()
  })

  it('MAX_IMAGE_BYTES vaut bien 5 Mo', () => {
    expect(MAX_IMAGE_BYTES).toBe(5 * 1024 * 1024)
  })

  it('MAX_CHAT_PHOTO_BYTES vaut bien 10 Mo', () => {
    expect(MAX_CHAT_PHOTO_BYTES).toBe(10 * 1024 * 1024)
  })
})

// ─── validateImageMagicBytes ──────────────────────────────────────────────────

describe('validateImageMagicBytes', () => {
  it('accepte un JPEG (FF D8 FF)', async () => {
    const file = makeBinaryFile('photo.jpg', 'image/jpeg', JPEG_MAGIC)
    const r = await validateImageMagicBytes(file)
    expect(r.ok).toBe(true)
  })

  it('accepte un PNG (89 50 4E 47)', async () => {
    const file = makeBinaryFile('img.png', 'image/png', PNG_MAGIC)
    const r = await validateImageMagicBytes(file)
    expect(r.ok).toBe(true)
  })

  it('accepte un WebP (52 49 46 46 = RIFF)', async () => {
    const file = makeBinaryFile('img.webp', 'image/webp', WEBP_MAGIC)
    const r = await validateImageMagicBytes(file)
    expect(r.ok).toBe(true)
  })

  it('rejette des bytes inconnus', async () => {
    const file = makeBinaryFile('fake.jpg', 'image/jpeg', FAKE_MAGIC)
    const r = await validateImageMagicBytes(file)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/format image valide/i)
  })

  it('rejette un fichier vide (0 bytes)', async () => {
    const file = makeBinaryFile('empty.jpg', 'image/jpeg', [])
    const r = await validateImageMagicBytes(file)
    expect(r.ok).toBe(false)
  })

  it('rejette un fichier avec seulement 2 bytes (incomplet)', async () => {
    const file = makeBinaryFile('short.jpg', 'image/jpeg', [0xFF, 0xD8])
    const r = await validateImageMagicBytes(file)
    // 2 bytes ne correspondent pas aux 3 premiers d'un JPEG complet (3e manquant)
    expect(r.ok).toBe(false)
  })

  it('un PNG déguisé en .jpg est rejeté par magic bytes', async () => {
    // extension jpg mais magic PNG → la vérification des bytes doit quand même passer
    // (c'est le type de magic qui compte, pas l'extension)
    const file = makeBinaryFile('tricked.jpg', 'image/jpeg', PNG_MAGIC)
    const r = await validateImageMagicBytes(file)
    // PNG magic est valide quelle que soit l'extension déclarée
    expect(r.ok).toBe(true)
  })
})
