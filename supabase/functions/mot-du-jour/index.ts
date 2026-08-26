import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Le mot du jour, par courriel.
 *
 * Appelée chaque matin. Elle prend le mot publié, la liste des membres
 * qui veulent le recevoir, et envoie — en ignorant ceux qui l'ont déjà
 * reçu pour ce mot-là. La trace des envois est écrite avant l'appel au
 * fournisseur, pas après : si la fonction meurt en cours de route, on
 * risque un courriel manquant, jamais un doublon. Recevoir deux fois le
 * même message est ce qui fait signaler un expéditeur.
 *
 * Protégée par un secret partagé : sans lui, n'importe qui pourrait
 * déclencher l'envoi à toute la liste.
 */

const ENTETES = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE = 'https://www.konnexyon.com'
const LOT  = 40   // Resend accepte plus, mais on garde la main en cas d'erreur

function courriel({ prenom, mot, jeton }: { prenom: string; mot: string; jeton: string }) {
  const desabo = `${SITE}/desabonnement?t=${encodeURIComponent(jeton)}`
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${mot}</title></head>
<body style="margin:0;padding:0;background:#0B0B0B;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B0B0B;padding:48px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td align="center" style="padding-bottom:34px;">
          <span style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(242,238,230,0.4);">
            Konnexyon
          </span>
        </td></tr>

        <tr><td align="center" style="padding-bottom:8px;">
          <span style="font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:rgba(201,168,76,0.7);">
            Le mot du jour
          </span>
        </td></tr>

        <tr><td align="center" style="padding-bottom:30px;">
          <span style="font-size:52px;line-height:1.05;color:#C9A84C;">${mot}</span>
        </td></tr>

        <tr><td align="center" style="padding-bottom:34px;">
          <p style="margin:0;font-size:17px;line-height:1.7;color:rgba(242,238,230,0.75);">
            ${prenom && prenom !== 'Anonyme' ? prenom + ', é' : 'É'}crivez la ligne qu’il fait remonter.<br />
            Vous lirez celles des autres ensuite.
          </p>
        </td></tr>

        <tr><td align="center" style="padding-bottom:40px;">
          <a href="${SITE}/mot-du-jour"
             style="display:inline-block;padding:15px 30px;background:#C9A84C;color:#0B0B0B;
                    text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:12px;
                    letter-spacing:0.16em;text-transform:uppercase;border-radius:3px;">
            Écrire ma ligne
          </a>
        </td></tr>

        <tr><td align="center" style="border-top:1px solid rgba(242,238,230,0.1);padding-top:22px;">
          <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:11px;line-height:1.7;color:rgba(242,238,230,0.3);">
            Vous recevez ce message parce que vous êtes inscrit sur Konnexyon.<br />
            <a href="${desabo}" style="color:rgba(242,238,230,0.45);">Ne plus recevoir le mot du jour</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: ENTETES })

  try {
    const CLE_RESEND = Deno.env.get('RESEND_API_KEY')
    const SECRET     = Deno.env.get('MOT_DU_JOUR_SECRET')
    const URL_SUPA   = Deno.env.get('SUPABASE_URL')
    const SERVICE    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!CLE_RESEND || !URL_SUPA || !SERVICE) throw new Error('Configuration incomplete')

    // Sans ce garde, n'importe qui pourrait declencher l'envoi a toute la liste.
    if (SECRET && req.headers.get('x-mot-du-jour-secret') !== SECRET) {
      return new Response(JSON.stringify({ error: 'non autorise' }), {
        status: 401, headers: { ...ENTETES, 'Content-Type': 'application/json' },
      })
    }

    const db = createClient(URL_SUPA, SERVICE)

    const { data: mots } = await db
      .from('daily_words')
      .select('id, word')
      .lte('publish_date', new Date().toISOString().slice(0, 10))
      .order('publish_date', { ascending: false })
      .limit(1)

    const mot = mots?.[0]
    if (!mot) {
      return new Response(JSON.stringify({ ok: true, envoyes: 0, raison: 'aucun mot publie' }), {
        headers: { ...ENTETES, 'Content-Type': 'application/json' },
      })
    }

    const { data: membres } = await db
      .from('profiles')
      .select('id, display_name, email_1, desabo_token')
      .eq('status', 'active')
      .eq('mot_du_jour_email', true)
      .eq('is_bot', false)
      .not('email_1', 'is', null)

    const { data: dejaEnvoyes } = await db
      .from('envois_mot_du_jour')
      .select('user_id')
      .eq('daily_word_id', mot.id)

    const vus = new Set((dejaEnvoyes || []).map((e) => e.user_id))
    const aEnvoyer = (membres || []).filter((m) => !vus.has(m.id) && m.email_1?.includes('@'))

    let envoyes = 0
    const echecs: string[] = []

    for (let i = 0; i < aEnvoyer.length; i += LOT) {
      const lot = aEnvoyer.slice(i, i + LOT)

      // La trace est ecrite d'abord : on prefere un courriel manquant a
      // un doublon, qui est ce qui fait classer un expediteur en spam.
      await db.from('envois_mot_du_jour').insert(
        lot.map((m) => ({ daily_word_id: mot.id, user_id: m.id })),
      )

      for (const m of lot) {
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${CLE_RESEND}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Konnexyon <onboarding@resend.dev>',
              to: [m.email_1],
              subject: `Aujourd’hui : ${mot.word}`,
              html: courriel({ prenom: m.display_name, mot: mot.word, jeton: m.desabo_token }),
            }),
          })
          if (res.ok) envoyes++
          else echecs.push(`${m.email_1} : ${await res.text()}`)
        } catch (e) {
          echecs.push(`${m.email_1} : ${String(e)}`)
        }
      }
    }

    return new Response(JSON.stringify({
      ok: true, mot: mot.word, destinataires: aEnvoyer.length, envoyes,
      echecs: echecs.slice(0, 5),
    }), { headers: { ...ENTETES, 'Content-Type': 'application/json' } })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...ENTETES, 'Content-Type': 'application/json' },
    })
  }
})
