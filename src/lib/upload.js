// Validation d'un fichier image avant upload (avatars, photos de chat)
// Retourne { ok: true } ou { ok: false, error: 'message' }

export const MAX_IMAGE_BYTES = 12 * 1024 * 1024       // 12 Mo — avatars (photos tél. lourdes)
export const MAX_CHAT_PHOTO_BYTES = 12 * 1024 * 1024  // 12 Mo — chat-photos

export function validateImageFile(file) {
  if (!file) return { ok: false, error: 'Aucun fichier sélectionné.' }
  if (file.type === 'image/svg+xml') {
    return { ok: false, error: 'Format SVG non autorisé pour des raisons de sécurité.' }
  }
  // On accepte tout ce qui ressemble à une image (y compris HEIC iPhone) : la
  // conversion JPEG (toJpegUpload) normalise ensuite. Certains navigateurs
  // n'annoncent pas de type MIME pour un HEIC → on ne bloque pas sur file.type.
  if (file.type && !file.type.startsWith('image/')) {
    return { ok: false, error: 'Format non supporté. Choisissez une image.' }
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: 'Image trop lourde (12 Mo maximum).' }
  }
  return { ok: true }
}

// Normalise une image en JPEG via <canvas> (redimensionnée à `maxDim` px max).
// Corrige les photos iPhone HEIC (illisibles sur Chrome/Firefox) et réduit le
// poids. Retourne un File JPEG, ou null si le navigateur ne sait pas décoder
// le fichier (l'appelant retombe alors sur le fichier d'origine).
export async function toJpegUpload(file, maxDim = 1600, quality = 0.85) {
  try {
    if (typeof document === 'undefined') return null
    const url = URL.createObjectURL(file)
    const img = await new Promise((resolve, reject) => {
      const im = new Image()
      im.onload = () => resolve(im)
      im.onerror = () => reject(new Error('decode'))
      im.src = url
    })
    let w = img.naturalWidth || img.width
    let h = img.naturalHeight || img.height
    if (!w || !h) { URL.revokeObjectURL(url); return null }
    const scale = Math.min(1, maxDim / Math.max(w, h))
    w = Math.round(w * scale); h = Math.round(h * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    canvas.getContext('2d').drawImage(img, 0, 0, w, h)
    URL.revokeObjectURL(url)
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality))
    if (!blob) return null
    return new File([blob], 'photo.jpg', { type: 'image/jpeg' })
  } catch {
    return null
  }
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
