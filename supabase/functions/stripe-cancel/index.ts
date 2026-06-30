/**
 * stripe-cancel — Edge Function de résiliation d'abonnement
 *
 * Conformité obligatoire : loi Chatel + art. L.215-1 Code de la consommation.
 * La résiliation doit être possible sans contacter le service client.
 *
 * Stratégie : cancel_at_period_end = true (l'utilisateur garde l'accès jusqu'à
 * la fin de la période déjà payée, mais la subscription ne se renouvelle pas).
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13.11.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    // Authentification
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401, headers: CORS })
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401, headers: CORS })
    }

    // Récupérer le profil avec service role pour lire stripe_subscription_id
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('plan, stripe_subscription_id, stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profil introuvable' }), { status: 404, headers: CORS })
    }

    if (profile.plan !== 'premium') {
      return new Response(JSON.stringify({ error: 'Aucun abonnement actif' }), { status: 400, headers: CORS })
    }

    let subscriptionId = profile.stripe_subscription_id

    // Fallback : rechercher via customer_id si on n'a pas l'ID de subscription
    if (!subscriptionId && profile.stripe_customer_id) {
      const subs = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        status: 'active',
        limit: 1,
      })
      subscriptionId = subs.data[0]?.id ?? null
    }

    // Fallback ultime : rechercher via email
    if (!subscriptionId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 })
      const customerId = customers.data[0]?.id
      if (customerId) {
        const subs = await stripe.subscriptions.list({
          customer: customerId,
          status: 'active',
          limit: 1,
        })
        subscriptionId = subs.data[0]?.id ?? null
      }
    }

    if (!subscriptionId) {
      return new Response(JSON.stringify({ error: 'Subscription Stripe introuvable' }), { status: 404, headers: CORS })
    }

    // Annulation en fin de période (non-remboursement immédiat, conforme aux CGU)
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })

    // L'accès est conservé jusqu'à la fin de période ; le webhook
    // customer.subscription.deleted finalisera le passage en 'free' à l'expiration.
    // (Pas d'update ici : plan_expires_at n'était pas chargé → écriture inutile/erronée.)

    return new Response(
      JSON.stringify({ success: true, message: 'Abonnement résilié. Accès maintenu jusqu\'à la fin de la période.' }),
      { headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }
})
