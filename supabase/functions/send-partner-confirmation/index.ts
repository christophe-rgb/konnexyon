import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { profile_id, email_2, app_url } = await req.json()

    if (!profile_id || !email_2 || !app_url) {
      return new Response(JSON.stringify({ error: 'Paramètres manquants' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // client admin (service_role)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // créer ou renouveler le token de confirmation
    await supabase.from('partner_confirmations')
      .delete().eq('profile_id', profile_id).is('confirmed_at', null)

    const { data: conf, error: confErr } = await supabase
      .from('partner_confirmations')
      .insert({ profile_id })
      .select('token')
      .single()

    if (confErr) throw confErr

    const confirmUrl = `${app_url}/confirm-partner?token=${conf.token}`

    // envoi email via Resend
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) throw new Error('RESEND_API_KEY manquant')

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    'App <noreply@votredomaine.com>',
        to:      [email_2],
        subject: 'Confirmez votre participation au couple',
        html: `
          <div style="background:#0D0D0D;color:#F0EDE8;font-family:Inter,sans-serif;padding:40px;max-width:480px;margin:auto;border-radius:16px;">
            <h1 style="font-family:Georgia,serif;font-size:28px;color:#C9A84C;margin:0 0 16px">
              Votre partenaire vous invite
            </h1>
            <p style="color:#888480;line-height:1.6;margin:0 0 24px">
              Votre partenaire a créé un profil couple. Cliquez sur le bouton ci-dessous pour confirmer votre participation.
            </p>
            <a href="${confirmUrl}"
               style="display:inline-block;background:#C9A84C;color:#0D0D0D;padding:14px 28px;border-radius:12px;font-weight:600;text-decoration:none;">
              Confirmer ma participation
            </a>
            <p style="color:#888480;font-size:12px;margin-top:32px">
              Ce lien expire dans 7 jours. Si vous n'attendiez pas cet email, ignorez-le.
            </p>
          </div>
        `,
      }),
    })

    if (!emailRes.ok) {
      const body = await emailRes.text()
      throw new Error(`Resend error: ${body}`)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
