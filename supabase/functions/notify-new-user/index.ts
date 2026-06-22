import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const TELEGRAM_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const ADMIN_EMAIL = 'konnexyon@gmail.com'

serve(async (req) => {
  try {
    const payload = await req.json()
    const record = payload.record

    const now = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })
    const coupleName = record.couple_name || 'Couple sans nom'
    const city = record.city || '—'
    const status = record.status || 'actif'
    const email = record.email_1 || record.email || '—'
    const plan = record.plan || 'free'

    // ── Telegram ─────────────────────────────────────────────────────────────
    if (TELEGRAM_TOKEN && CHAT_ID) {
      const msg = [
        `🎉 *Nouvel inscrit sur Konnexyon !*`,
        ``,
        `👫 *${coupleName}*`,
        `📧 ${email}`,
        `📍 ${city}`,
        `💎 Plan : ${plan}`,
        `✅ Statut : ${status}`,
        `🕐 ${now}`,
      ].join('\n')

      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text: msg, parse_mode: 'Markdown' }),
      })
    }

    // ── Email via Resend ──────────────────────────────────────────────────────
    if (RESEND_API_KEY) {
      const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Nouvel inscrit</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:30px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0;">
        <tr>
          <td style="background:#0D1117;padding:20px 24px;">
            <span style="color:#C9A84C;font-size:20px;font-weight:bold;letter-spacing:2px;">KONNEXYON</span>
            <span style="color:#888;font-size:12px;display:block;margin-top:2px;">Nouvel inscrit</span>
          </td>
        </tr>
        <tr>
          <td style="padding:24px;">
            <p style="margin:0 0 16px;font-size:16px;font-weight:bold;color:#0D1117;">🎉 Nouveau couple inscrit !</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#666;font-size:13px;width:40%;">Couple</td>
                <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#0D1117;font-size:13px;font-weight:bold;">${coupleName}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#666;font-size:13px;">Email</td>
                <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#0D1117;font-size:13px;">${email}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#666;font-size:13px;">Ville</td>
                <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#0D1117;font-size:13px;">${city}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#666;font-size:13px;">Plan</td>
                <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#C9A84C;font-size:13px;font-weight:bold;">${plan.toUpperCase()}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#666;font-size:13px;">Date</td>
                <td style="padding:8px 0;color:#0D1117;font-size:13px;">${now}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#f9f9f9;padding:12px 24px;text-align:center;border-top:1px solid #e0e0e0;">
            <span style="color:#aaa;font-size:11px;">Konnexyon © 2026 — konnexyon.com</span>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Konnexyon <noreply@konnexyon.com>',
          to: [ADMIN_EMAIL],
          subject: `🎉 Nouvel inscrit : ${coupleName}`,
          html,
        }),
      })
    }

    return new Response('ok', { status: 200 })
  } catch (e) {
    console.error(e)
    return new Response(String(e), { status: 500 })
  }
})
