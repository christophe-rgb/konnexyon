// Validation d'un fichier image avant upload (avatars, photos de chat)
// Retourne { ok: true } ou { ok: false, error: 'message' }

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 Mo

export function validateImageFile(file) {
  if (!file) return { ok: false, error: 'Aucun fichier sélectionné.' }
  if (!file.type || !file.type.startsWith('image/')) {
    return { ok: false, error: 'Format non supporté. Choisissez une image (JPG, PNG, WebP…).' }
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: 'Image trop lourde (5 Mo maximum).' }
  }
  return { ok: true }
}
