// Retourne true si le profil a un abonnement Premium actif
export function isPremium(profile) {
  if (!profile) return false
  if (profile.plan === 'premium') {
    if (!profile.plan_expires_at) return true
    return new Date(profile.plan_expires_at) > new Date()
  }
  return false
}
