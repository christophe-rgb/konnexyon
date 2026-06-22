// Validation d'un fichier image avant upload (avatars, photos de chat)
// Retourne { ok: true } ou { ok: false, error: 'message' }

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024        // 5 Mo — avatars
export const MAX_CHAT_PHOTO_BYTES = 10 * 1024 * 1024  // 10 Mo — chat-photos

export function validateImageFile(file) {
  if (!file) return { ok: false, error: 'Aucun fichier sélectionné.' }
  if (!file.type || !file.type.startsWith('image/')) {
    return { ok: false, error: 'Format non supporté. Choisissez une image (JPG, PNG, WebP…).' }
  }
  if (file.type === 'image/svg+xml') {
    return { ok: false, error: 'Format SVG non autorisé pour des raisons de sécurité.' }
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: 'Image trop lourde (5 Mo maximum).' }
  }
  return { ok: true }
}

// Vérification des magic bytes (à appeler de manière asynchrone avant upload)
export async function validateImageMagicBytes(file) {
  const buffer = await file.slice(0, 4).arrayBuffer()
  const bytes = new Uint8Array(buffer)

  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return { ok: true }
  }
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return { ok: true }
  }
  // WebP: 52 49 46 46 (RIFF header)
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    return { ok: true }
  }

  return { ok: false, error: 'Le fichier ne correspond pas à un format image valide (JPG, PNG, WebP).' }
}
