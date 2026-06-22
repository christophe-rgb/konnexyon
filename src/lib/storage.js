// Accès localStorage tolérant aux navigateurs qui le bloquent
// (Safari navigation privée, quotas, paramètres stricts).

export function safeGet(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSet(key, value) {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function safeRemove(key) {
  try {
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}
