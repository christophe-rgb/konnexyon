import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Échappe le texte injecté dans le HTML des marqueurs (anti-XSS)
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]))
}

// Encode une URL pour un attribut HTML : on bloque tout schéma non http(s)
function safeUrl(url) {
  const s = String(url ?? '').trim()
  if (!/^https?:\/\//i.test(s)) return ''
  return escapeHtml(s)
}

export default function MapView({ profiles, onSelect, myProfile }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const markersRef   = useRef([])
  const myMarkerRef  = useRef(null)
  const hasCenteredRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    mapRef.current = L.map(containerRef.current, { zoomControl: true }).setView([46.6, 2.3], 6)

    const tiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors © CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(mapRef.current)

    // renforce le contraste des tuiles : routes et frontières plus visibles
    tiles.on('load', () => {
      const pane = mapRef.current?.getPane('tilePane')
      if (pane) pane.style.filter = 'brightness(1.6) contrast(1.3)'
    })

    return () => { mapRef.current?.remove(); mapRef.current = null }
  }, [])

  // Marqueur "Vous êtes ici" pour le profil de l'utilisateur
  useEffect(() => {
    if (!mapRef.current) return
    myMarkerRef.current?.remove()
    myMarkerRef.current = null

    if (!myProfile?.lng || !myProfile?.lat) return

    const myIcon = L.divIcon({
      className: '',
      html: `<div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#A07830,#E8CC7A);border:3px solid #fff;cursor:default;display:flex;align-items:center;justify-content:center;color:#050505;font-size:13px;font-family:Cormorant,serif;font-weight:700;box-shadow:0 0 18px rgba(201,168,76,0.8);">Vous</div>`,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    })
    myMarkerRef.current = L.marker([myProfile.lat, myProfile.lng], { icon: myIcon, zIndexOffset: 1000 })
      .addTo(mapRef.current)

    // Centre la carte sur le profil utilisateur — une seule fois (sinon
    // re-centrage intempestif si la position est re-fournie après navigation)
    if (!hasCenteredRef.current) {
      mapRef.current.setView([myProfile.lat, myProfile.lng], 11)
      hasCenteredRef.current = true
    }
  }, [myProfile])

  // Marqueurs des autres profils + fit bounds
  useEffect(() => {
    if (!mapRef.current) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const valid = profiles.filter(p => p.lng != null && p.lat != null)

    valid.forEach(p => {
      const liked = !!p.liked   // couple déjà contacté → marqueur distinct (vert + ✓)
      const initial = escapeHtml(p.couple_name?.[0] || '?')
      const safeAvatar = safeUrl(p.avatar_url)
      const inner = safeAvatar
        ? `<img src="${safeAvatar}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
        : `<span style="font-family:Cormorant,serif;font-weight:700;font-size:13px;color:#0D0D0D;">${initial}</span>`
      const ring = liked ? '#4ade80' : '#fff'
      const badge = liked
        ? `<div style="position:absolute;bottom:-3px;right:-3px;width:16px;height:16px;border-radius:50%;background:#4ade80;border:2px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 6px rgba(74,222,128,0.7);"><svg width="8" height="7" viewBox="0 0 12 10" fill="none"><path d="M1 5L4.5 8.5L11 1" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`
        : ''
      const icon = L.divIcon({
        className: '',
        html: `<div style="position:relative;width:36px;height:36px;cursor:pointer;"><div style="width:36px;height:36px;border-radius:50%;background:#C9A84C;border:2px solid ${ring};display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 0 12px rgba(201,168,76,0.6);">${inner}</div>${badge}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })
      const marker = L.marker([p.lat, p.lng], { icon, zIndexOffset: liked ? 500 : 0 })
        .on('click', () => onSelect?.(p))
        .addTo(mapRef.current)
      markersRef.current.push(marker)
    })

    // Si profils ET position propre : ajuste le zoom pour tout voir
    if (valid.length > 0 && myProfile?.lat && myProfile?.lng) {
      const allPoints = [
        [myProfile.lat, myProfile.lng],
        ...valid.map(p => [p.lat, p.lng]),
      ]
      mapRef.current.fitBounds(L.latLngBounds(allPoints), { padding: [40, 40], maxZoom: 13 })
    } else if (valid.length > 0) {
      mapRef.current.fitBounds(
        L.latLngBounds(valid.map(p => [p.lat, p.lng])),
        { padding: [40, 40], maxZoom: 13 }
      )
    }
  }, [profiles, onSelect, myProfile])

  return <div ref={containerRef} className="w-full h-full" />
}
