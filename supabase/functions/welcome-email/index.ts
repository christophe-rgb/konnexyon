import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { email, couple_name } = await req.json()
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not set')

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bienvenue sur Konnexyon</title>
</head>
<body style="margin:0;padding:0;background:#050505;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#0a0a0a;border-radius:20px;border:1px solid rgba(201,168,76,0.2);overflow:hidden;">

          <!-- header -->
          <tr>
            <td style="padding:36px 40px 28px;text-align:center;border-bottom:1px solid rgba(201,168,76,0.1);">
              <p style="margin:0 0 8px;font-size:32px;font-weight:300;color:#C9A84C;letter-spacing:0.1em;">∞</p>
              <p style="margin:0;font-size:18px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#C9A84C;">KONNEXYON</p>
            </td>
          </tr>

          <!-- body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 16px;font-size:28px;font-weight:600;color:#F2EDE6;line-height:1.25;">
                Bienvenue${couple_name && couple_name !== 'Nouveau couple' ? `,<br/>${couple_name}` : ''} !
              </h1>
              <p style="margin:0 0 20px;font-size:15px;color:rgba(255,255,255,0.5);line-height:1.75;">
                Votre compte Konnexyon a été créé avec succès.<br/>
                Vous faites désormais partie d'une communauté exclusive dédiée aux couples libertins.
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:rgba(255,255,255,0.5);line-height:1.75;">
                Complétez votre profil et commencez à explorer des connexions près de chez vous.
              </p>

              <!-- cta -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="https://konnexyon.com/onboarding"
                      style="display:inline-block;padding:16px 40px;border-radius:12px;
                             background:linear-gradient(135deg,#A07830,#C9A84C,#E8CC7A);
                             color:#050505;font-size:13px;font-weight:700;
                             letter-spacing:0.14em;text-decoration:none;text-transform:uppercase;">
                      Créer mon profil →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- rappels légaux -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid rgba(201,168,76,0.08);">
              <p style="margin:0 0 8px;font-size:11px;color:rgba(255,255,255,0.2);line-height:1.6;letter-spacing:0.04em;">
                🔒 Vos données sont protégées et ne seront jamais revendues à des tiers.<br/>
                ⚠️ Ce service est exclusivement réservé aux adultes consentants de 18 ans ou plus.
              </p>
            </td>
          </tr>

          <!-- footer -->
          <tr>
            <td style="padding:20px 40px 28px;text-align:center;">
              <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.15);letter-spacing:0.1em;">
                © 2025 Konnexyon · Contenu adultes · 18+<br/>
                <a href="https://konnexyon.com/confidentialite" style="color:rgba(201,168,76,0.3);text-decoration:none;">Confidentialité</a>
                &nbsp;·&nbsp;
                <a href="https://konnexyon.com/cgu" style="color:rgba(201,168,76,0.3);text-decoration:none;">CGU</a>
                &nbsp;·&nbsp;
                <a href="mailto:contact@konnexyon.com" style="color:rgba(201,168,76,0.3);text-decoration:none;">Contact</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Konnexyon <onboarding@resend.dev>',
        to: [email],
        subject: 'Bienvenue sur Konnexyon ∞',
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Resend error: ${err}`)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
