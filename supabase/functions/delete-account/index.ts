/**
 * delete-account — suppression RGPD réelle du compte.
 *
 * Supprime le compte auth de l'appelant (et, par cascade ON DELETE,
 * son profil, likes, matchs, messages). Conforme au droit à l'effacement :
 * l'email redevient réutilisable.
 *
 * Sécurité : on ne supprime QUE le compte de l'appelant (auth.uid() dérivé du
 * JWT), jamais un id fourni en paramètre.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Non authentifié' }, 401)

    // Identifie l'appelant via son JWT
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ error: 'Non authentifié' }, 401)

    // Suppression définitive via service_role (cascade sur les données liées)
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) return json({ error: error.message }, 500)

    return json({ success: true })
  } catch (e) {
    return json({ error: e.message }, 500)
  }
})
