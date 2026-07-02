import L from 'leaflet'

// ============================================================
// Épingles de lieux dynamiques — taille selon la formule (tier),
// logo du lieu en médaillon, halo « flash » événement.
// Helper partagé entre la carte de découverte (MapView) et la
// page Lieux (VenuesMap). Reproduit le style des médaillons
// illustrés dans public/offres/tier-*.png.
// ============================================================

// Échappe le texte injecté dans le HTML des marqueurs/popups (anti-XSS)
export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]))
}

// Encode une URL pour un attribut HTML : bloque tout schéma non http(s)
export function safeUrl(url) {
  const s = String(url ?? '').trim()
  if (!/^https?:\/\//i.test(s)) return ''
  return escapeHtml(s)
}

const TYPE_LABELS = {
  club: 'Club', sauna: 'Sauna', sexshop: 'Sex-shop', bar: 'Bar', autre: 'Lieu',
}

// Palette or de la charte
const GOLD       = '#D4AF37'
const GOLD_LIGHT = '#F4D875'
const GOLD_DARK  = '#B8891F'
const INK        = '#050505'

// Un événement est « flash » tant que event_until est dans le futur.
export function isVenueFlash(venue) {
  if (!venue?.event_until) return false
  const t = new Date(venue.event_until).getTime()
  return Number.isFinite(t) && t > Date.now()
}

// Médaillon central selon la formule : rond doré avec logo ou initiale.
function medallion(venue, size, ringWidth) {
  const initial = escapeHtml(venue.name?.[0]?.toUpperCase() || '∞')
  const logo = safeUrl(venue.photo_url)
  const inner = logo
    ? `<img src="${logo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
    : `<span style="font-family:Cormorant,serif;font-weight:700;color:${INK};font-size:${Math.round(size * 0.42)}px;line-height:1;">${initial}</span>`
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;box-sizing:border-box;
    background:linear-gradient(135deg,${GOLD_DARK},${GOLD_LIGHT},${GOLD_DARK});
    border:${ringWidth}px solid #fff;overflow:hidden;display:flex;align-items:center;justify-content:center;
    box-shadow:0 0 14px rgba(212,175,55,0.55),0 3px 8px rgba(0,0,0,0.35);">${inner}</div>`
}

// Halo « flash » : anneaux dorés pulsants + éclair, superposés à l'épingle.
function flashLayer(diameter) {
  const ring = (delay) => `<span style="position:absolute;top:50%;left:50%;width:${diameter}px;height:${diameter}px;
    margin:-${diameter / 2}px 0 0 -${diameter / 2}px;border-radius:50%;
    border:2px solid ${GOLD_LIGHT};box-sizing:border-box;pointer-events:none;
    animation:venueFlash 1.8s ease-out ${delay}s infinite;"></span>`
  const bolt = `<span style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;
    background:linear-gradient(135deg,${GOLD_DARK},${GOLD_LIGHT});border:1.5px solid #fff;
    display:flex;align-items:center;justify-content:center;font-size:10px;line-height:1;
    box-shadow:0 0 8px rgba(212,175,55,0.9);z-index:3;">⚡</span>`
  return ring(0) + ring(0.6) + ring(1.2) + bolt
}

// Construit un L.divIcon pour un lieu selon sa formule + flash éventuel.
export function buildVenueIcon(venue) {
  const flash = isVenueFlash(venue)
  const tier  = venue.tier || 'gratuit'
  let icon

  if (tier === 'premium') {
    // Grand médaillon (~80px) : anneau or épais + halo, logo rond, badge + nom.
    const size = 80
    const name = escapeHtml(venue.name || '')
    const halo = `<span style="position:absolute;top:50%;left:50%;width:${size + 26}px;height:${size + 26}px;
      margin:-${(size + 26) / 2}px 0 0 -${(size + 26) / 2}px;border-radius:50%;pointer-events:none;
      background:radial-gradient(circle,rgba(212,175,55,0.35) 0%,rgba(212,175,55,0) 70%);"></span>`
    const badge = `<span style="position:absolute;bottom:14px;left:50%;transform:translateX(-50%);
      padding:2px 9px;border-radius:99px;white-space:nowrap;font-family:Inter,system-ui,sans-serif;
      font-size:8.5px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${INK};
      background:linear-gradient(135deg,${GOLD_DARK},${GOLD_LIGHT},${GOLD_DARK});
      box-shadow:0 2px 6px rgba(0,0,0,0.35);z-index:4;">Partenaire</span>`
    const label = name
      ? `<span style="position:absolute;top:${size + 4}px;left:50%;transform:translateX(-50%);
          padding:2px 10px;border-radius:99px;white-space:nowrap;font-family:Cormorant,serif;
          font-weight:600;font-size:13px;color:#1C1814;background:rgba(255,255,255,0.92);
          border:1px solid rgba(212,175,55,0.4);box-shadow:0 2px 6px rgba(0,0,0,0.18);">${name}</span>`
      : ''
    const totalH = size + 26
    icon = L.divIcon({
      className: '',
      html: `<div style="position:relative;width:${size}px;height:${size}px;cursor:pointer;">
        ${halo}
        ${flash ? flashLayer(size + 16) : ''}
        <div style="position:absolute;inset:0;border-radius:50%;box-sizing:border-box;
          border:4px solid ${GOLD};box-shadow:0 0 22px rgba(212,175,55,0.7);">
          ${medallion(venue, size, 3)}
        </div>
        ${badge}
        ${label}
      </div>`,
      iconSize: [size, totalH],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2 - 4],
    })
  } else if (tier === 'essentiel') {
    // Épingle agrandie (~46px), médaillon doré.
    const size = 46
    icon = L.divIcon({
      className: '',
      html: `<div style="position:relative;width:${size}px;height:${size}px;cursor:pointer;">
        ${flash ? flashLayer(size + 12) : ''}
        ${medallion(venue, size, 2.5)}
      </div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2 - 2],
    })
  } else {
    // Gratuit : petite épingle-pin dorée (~30px) avec étoile ★ (ou logo).
    const size = 30
    const logo = safeUrl(venue.photo_url)
    const inner = logo
      ? `<img src="${logo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
      : `<span style="color:${INK};font-size:13px;line-height:1;">★</span>`
    icon = L.divIcon({
      className: '',
      html: `<div style="position:relative;width:${size}px;height:${size}px;cursor:pointer;">
        ${flash ? flashLayer(size + 10) : ''}
        <div style="width:${size}px;height:${size}px;border-radius:50%;box-sizing:border-box;
          background:linear-gradient(135deg,${GOLD_DARK},${GOLD_LIGHT});border:2px solid #fff;
          overflow:hidden;display:flex;align-items:center;justify-content:center;
          box-shadow:0 0 10px rgba(212,175,55,0.5),0 2px 5px rgba(0,0,0,0.3);">${inner}</div>
      </div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2 - 2],
    })
  }
  return icon
}

// zIndexOffset : premium au-dessus, puis essentiel, puis gratuit.
export function venueZIndex(venue) {
  const tier = venue.tier || 'gratuit'
  const base = tier === 'premium' ? 400 : tier === 'essentiel' ? 300 : 200
  return base + (isVenueFlash(venue) ? 50 : 0)
}

// Popup Leaflet au clic : nom, type, ville, lien site, tél.
export function buildVenuePopup(venue) {
  const name  = escapeHtml(venue.name)
  const type  = escapeHtml(TYPE_LABELS[venue.type] || venue.type || '')
  const city  = escapeHtml(venue.city || '')
  const site  = safeUrl(venue.website)
  const phone = escapeHtml(venue.phone || '')
  const phoneClean = String(venue.phone ?? '').replace(/[^0-9+]/g, '')
  const flash = isVenueFlash(venue)
  const tags = [type, venue.featured ? 'Partenaire' : '', flash ? '⚡ Événement' : '']
    .filter(Boolean).join(' · ')
  return `
    <div style="font-family:system-ui,sans-serif;min-width:150px;">
      <div style="font-family:Cormorant,serif;font-size:17px;font-weight:600;color:#1C1814;margin-bottom:2px;">${name}</div>
      <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${GOLD_DARK};margin-bottom:${city ? '2px' : '6px'};">${tags}</div>
      ${city ? `<div style="font-size:12px;color:rgba(28,24,20,0.7);margin-bottom:6px;">${city}</div>` : ''}
      ${site ? `<a href="${site}" target="_blank" rel="noopener noreferrer" style="display:inline-block;font-size:12px;color:${GOLD_DARK};text-decoration:none;margin-right:10px;">Site ↗</a>` : ''}
      ${phone ? `<a href="tel:${escapeHtml(phoneClean)}" style="font-size:12px;color:${GOLD_DARK};text-decoration:none;">${phone}</a>` : ''}
    </div>`
}
