import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default function MapView({ profiles, onSelect }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const markersRef   = useRef([])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    mapRef.current = L.map(containerRef.current, { zoomControl: true }).setView([46.6, 2.3], 6)

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors © CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(mapRef.current)

    navigator.geolocation?.getCurrentPosition(
      pos => mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 11),
      () => {}
    )

    return () => { mapRef.current?.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    if (!mapRef.current) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    profiles.forEach(p => {
      if (p.lng == null || p.lat == null) return

      const initial = p.couple_name?.[0] || '?'
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:32px;height:32px;border-radius:50%;background:#C9A84C;border:2px solid #0D0D0D;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#0D0D0D;font-size:13px;font-family:Cormorant,serif;font-weight:700;box-shadow:0 0 12px rgba(201,168,76,0.4);">${initial}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })
      const marker = L.marker([p.lat, p.lng], { icon })
        .on('click', () => onSelect?.(p))
        .addTo(mapRef.current)

      markersRef.current.push(marker)
    })
  }, [profiles, onSelect])

  return <div ref={containerRef} className="w-full h-full" />
}
