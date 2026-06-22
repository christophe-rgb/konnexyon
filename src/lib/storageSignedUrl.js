/**
 * Helper : régénération de signed URLs Supabase Storage expirées.
 *
 * Supabase Storage signed URLs ont la forme :
 *   https://<project>.supabase.co/storage/v1/object/sign/<bucket>/<path>?token=...
 *
 * On extrait <bucket> et <path> depuis l'URL courante, puis on recrée une
 * nouvelle signed URL avec le même bucket et le même TTL.
 */
import { supabase } from './supabase'

// TTL de refresh (7 jours, aligné sur useConversation)
const REFRESH_TTL_SECONDS = 7 * 24 * 3600

/**
 * Extrait { bucket, path } depuis une Supabase Storage signed URL.
 * Retourne null si l'URL n'est pas reconnue.
 *
 * Exemples de formats supportés :
 *  - /storage/v1/object/sign/<bucket>/<path>
 *  - /storage/v1/object/authenticated/<bucket>/<path>
 */
function parseStorageUrl(url) {
  try {
    const u = new URL(url)
    // Regex couvre les deux variantes de chemin Supabase
    const m = u.pathname.match(
      /\/storage\/v1\/object\/(?:sign|authenticated|public)\/([^/]+)\/(.+)/
    )
    if (!m) return null
    return { bucket: m[1], path: m[2] }
  } catch {
    return null
  }
}

/**
 * Génère une nouvelle signed URL pour un fichier Supabase Storage.
 *
 * @param {string} currentUrl - L'URL actuelle (potentiellement expirée)
 * @returns {Promise<string|null>} - Nouvelle URL ou null en cas d'échec
 */
export async function refreshSignedUrl(currentUrl) {
  const parsed = parseStorageUrl(currentUrl)
  if (!parsed) return null

  const { bucket, path } = parsed
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, REFRESH_TTL_SECONDS)

  if (error || !data?.signedUrl) return null
  return data.signedUrl
}
