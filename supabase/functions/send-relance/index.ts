import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''

serve(async (req) => {
  const { to, name } = await req.json()

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:30px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0;">
<tr><td style="background:#0D1117;padding:20px 24px;">
  <span style="color:#C9A84C;font-size:22px;font-weight:bold;letter-spacing:3px;">KONNEXYON</span>
</td></tr>
<tr><td style="padding:28px 24px;">
  <p style="margin:0 0 16px;font-size:16px;color:#0D1117;">Bonjour,</p>
  <p style="margin:0 0 16px;font-size:14px;color:#444;line-height:1.6;">
    Vous avez créé votre compte sur <strong>Konnexyon</strong> il y a peu, mais votre profil n'a pas encore été finalisé.
  </p>
  <p style="margin:0 0 24px;font-size:14px;color:#444;line-height:1.6;">
    Il ne vous reste que quelques minutes pour compléter votre inscription et accéder à la plateforme.
  </p>
  <div style="text-align:center;margin:24px 0;">
    <a href="https://konnexyon.com" style="background:#C9A84C;color:#0D1117;text-decoration:none;padding:14px 32px;border-radius:6px;font-weight:bold;font-size:14px;letter-spacing:1px;display:inline-block;">
      FINALISER MON PROFIL
    </a>
  </div>
  <p style="margin:24px 0 0;font-size:13px;color:#888;line-height:1.6;">
    Une question ? Écrivez-nous à <a href="mailto:konnexyon@gmail.com" style="color:#C9A84C;">konnexyon@gmail.com</a>
  </p>
</td></tr>
<tr><td style="background:#f9f9f9;padding:12px 24px;text-align:center;border-top:1px solid #e0e0e0;">
  <span style="color:#aaa;font-size:11px;">Konnexyon © 2026 — konnexyon.com</span>
</td></tr>
</table></td></tr></table></body></html>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Konnexyon <noreply@konnexyon.com>',
      reply_to: ['konnexyon@gmail.com'],
      to: [to],
      subject: 'Finalisez votre inscription sur Konnexyon',
      html,
    }),
  })

  const result = await res.json()
  return new Response(JSON.stringify(result), { status: res.ok ? 200 : 500, headers: { 'Content-Type': 'application/json' } })
})
