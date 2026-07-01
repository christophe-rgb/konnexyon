import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Échappe le texte injecté dans le HTML des popups (anti-XSS)
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

const TYPE_LABELS = {
  club: 'Club', sauna: 'Sauna', sexshop: 'Sex-shop', bar: 'Bar', autre: 'Lieu',
}

// Carte des lieux partenaires — même style (Leaflet + tuiles CARTO clair) que MapView,
// avec une épingle dorée par lieu et un popup au clic.
export default function VenuesMap({ venues = [] }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const markersRef   = useRef([])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    mapRef.current = L.map(containerRef.current, { zoomControl: true }).setView([46.6, 2.3], 6)

    const tiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors © CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(mapRef.current)

    tiles.on('load', () => {
      const pane = mapRef.current?.getPane('tilePane')
      if (pane) pane.style.filter = 'contrast(1.05) saturate(1.05)'
    })

    return () => { mapRef.current?.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    if (!mapRef.current) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const valid = venues.filter(v => v.lng != null && v.lat != null)

    valid.forEach(v => {
      // Épingle dorée distincte (goutte + point central)
      const icon = L.divIcon({
        className: '',
        html: `<div style="position:relative;width:34px;height:44px;cursor:pointer;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.35));">
          <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 43C17 43 32 26.5 32 15.5C32 7.2 25.3 0.5 17 0.5C8.7 0.5 2 7.2 2 15.5C2 26.5 17 43 17 43Z" fill="#C9A84C" stroke="#fff" stroke-width="2"/>
            <circle cx="17" cy="15.5" r="6" fill="#0D0D0D"/>
          </svg>
        </div>`,
        iconSize: [34, 44],
        iconAnchor: [17, 43],
        popupAnchor: [0, -40],
      })

      const name    = escapeHtml(v.name)
      const type    = escapeHtml(TYPE_LABELS[v.type] || v.type || '')
      const city    = escapeHtml(v.city || '')
      const site    = safeUrl(v.website)
      const phone   = escapeHtml(v.phone || '')
      const phoneClean = String(v.phone ?? '').replace(/[^0-9+]/g, '')

      const popupHtml = `
        <div style="font-family:system-ui,sans-serif;min-width:150px;">
          <div style="font-family:Cormorant,serif;font-size:17px;font-weight:600;color:#1C1814;margin-bottom:2px;">${name}</div>
          <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#B8891F;margin-bottom:${city ? '2px' : '6px'};">${type}${v.featured ? ' · Partenaire' : ''}</div>
          ${city ? `<div style="font-size:12px;color:rgba(28,24,20,0.7);margin-bottom:6px;">${city}</div>` : ''}
          ${site ? `<a href="${site}" target="_blank" rel="noopener noreferrer" style="display:inline-block;font-size:12px;color:#B8891F;text-decoration:none;margin-right:10px;">Site ↗</a>` : ''}
          ${phone ? `<a href="tel:${escapeHtml(phoneClean)}" style="font-size:12px;color:#B8891F;text-decoration:none;">${phone}</a>` : ''}
        </div>`

      const marker = L.marker([v.lat, v.lng], { icon })
        .bindPopup(popupHtml)
        .addTo(mapRef.current)
      markersRef.current.push(marker)
    })

    if (valid.length > 0) {
      mapRef.current.fitBounds(
        L.latLngBounds(valid.map(v => [v.lat, v.lng])),
        { padding: [50, 50], maxZoom: 13 }
      )
    }
  }, [venues])

  return <div ref={containerRef} className="w-full h-full" />
}
