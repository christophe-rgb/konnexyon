import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13.11.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })

// Prix Stripe à créer dans le dashboard (IDs à renseigner ici après création)
const PRICE_IDS: Record<string, string> = {
  '1m': Deno.env.get('STRIPE_PRICE_1M') || '',
  '3m': Deno.env.get('STRIPE_PRICE_3M') || '',
  '6m': Deno.env.get('STRIPE_PRICE_6M') || '',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } })
  }

  try {
    const { plan, successUrl, cancelUrl } = await req.json()

    const priceId = PRICE_IDS[plan]
    if (!priceId) return new Response(JSON.stringify({ error: 'Plan invalide' }), { status: 400 })

    // Récupérer l'utilisateur depuis le token JWT
    const authHeader = req.headers.get('Authorization')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader! } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401 })

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${req.headers.get('origin')}/settings?premium=success`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/abonnement`,
      client_reference_id: user.id,
      customer_email: user.email,
      metadata: { user_id: user.id, plan },
      // Propager user_id sur la subscription pour le webhook subscription.deleted
      subscription_data: {
        metadata: { user_id: user.id, plan },
      },
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
})
