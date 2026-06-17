import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13.11.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

const PLAN_MONTHS: Record<string, number> = { '1m': 1, '3m': 3, '6m': 6 }

serve(async (req) => {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (e) {
    return new Response(`Webhook Error: ${e.message}`, { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId  = session.metadata?.user_id
    const plan    = session.metadata?.plan || '1m'
    if (!userId) return new Response('ok')

    const months = PLAN_MONTHS[plan] || 1
    const expires = new Date()
    expires.setMonth(expires.getMonth() + months)

    await supabase.from('profiles').update({
      plan: 'premium',
      plan_expires_at: expires.toISOString(),
    }).eq('id', userId)
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub    = event.data.object as Stripe.Subscription
    // user_id peut être dans sub.metadata ou dans customer metadata
    // On cherche le profil via plan_expires_at et le customer_id Stripe
    const userId = sub.metadata?.user_id
    if (userId) {
      await supabase.from('profiles').update({
        plan: 'free',
        plan_expires_at: null,
      }).eq('id', userId)
    } else {
      // Fallback : chercher via l'email du customer Stripe
      const customerId = sub.customer as string
      const customer = await stripe.customers.retrieve(customerId)
      if (!customer.deleted && customer.email) {
        const { data: authUser } = await supabase.auth.admin.getUserByEmail(customer.email)
        if (authUser?.user?.id) {
          await supabase.from('profiles').update({
            plan: 'free',
            plan_expires_at: null,
          }).eq('id', authUser.user.id)
        }
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
