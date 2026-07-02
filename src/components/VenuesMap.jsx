import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { buildVenueIcon, buildVenuePopup, venueZIndex } from '../lib/venuePin'

// Carte des lieux partenaires — même style (Leaflet + tuiles CARTO clair) que MapView.
// Chaque lieu est une épingle-médaillon dont la taille dépend de sa formule (tier),
// avec le logo du lieu et un halo « flash » si un événement est en cours.
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
      const marker = L.marker([v.lat, v.lng], {
        icon: buildVenueIcon(v),
        zIndexOffset: venueZIndex(v),
      })
        .bindPopup(buildVenuePopup(v))
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
