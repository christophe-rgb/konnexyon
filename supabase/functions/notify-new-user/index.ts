import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const TELEGRAM_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')!

serve(async (req) => {
  try {
    const payload = await req.json()
    const record = payload.record

    const msg = [
      `🎉 *Nouvel inscrit sur Konnexyon !*`,
      ``,
      `👫 *${record.couple_name || 'Couple sans nom'}*`,
      `📍 Statut : ${record.status || 'actif'}`,
      `🕐 ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`,
    ].join('\n')

    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: msg,
        parse_mode: 'Markdown',
      }),
    })

    return new Response('ok', { status: 200 })
  } catch (e) {
    return new Response(String(e), { status: 500 })
  }
})
