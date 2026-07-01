import { useEffect, useState, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MapPin, Phone, ExternalLink, Store } from 'lucide-react'

const VenuesMap = lazy(() => import('../components/VenuesMap').catch(() => ({ default: () => (
  <div className="w-full h-full flex items-center justify-center" style={{ color: 'rgba(201,168,76,1)', fontSize: '13px' }}>Carte indisponible</div>
) })))

const TYPE_LABELS = {
  club: 'Club', sauna: 'Sauna', sexshop: 'Sex-shop', bar: 'Bar', autre: 'Autre',
}

const FILTERS = [
  { key: 'all',     label: 'Tous' },
  { key: 'club',    label: 'Clubs' },
  { key: 'sauna',   label: 'Saunas' },
  { key: 'sexshop', label: 'Sex-shops' },
  { key: 'bar',     label: 'Bars' },
]

export default function Lieux() {
  const [venues,  setVenues]  = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      const { data, error } = await supabase.rpc('get_venues')
      if (error) console.error('get_venues:', error.message)
      if (!isMounted) return
      setVenues(data || [])
      setLoading(false)
    }
    load()
    return () => { isMounted = false }
  }, [])

  const mapVenues = venues.filter(v => v.lng != null && v.lat != null)
  const filtered = venues.filter(v => filter === 'all' || v.type === filter)

  return (
    <div className="max-w-lg mx-auto px-4 pb-nav" style={{ paddingTop: 0 }}>

      {/* header — barre sombre pleine largeur, titre centré (cf. Matches) */}
      <header
        className="mb-2 animate-fade-in"
        style={{
          background: 'linear-gradient(180deg, #0A0A0A 0%, #050505 100%)',
          borderBottom: '1px solid rgba(212,175,55,0.28)',
          boxShadow: '0 6px 22px rgba(0,0,0,0.28)',
          width: '100vw', marginLeft: 'calc(50% - 50vw)',
          animationFillMode: 'both',
        }}
      >
        <div className="max-w-lg mx-auto flex flex-col items-center justify-center text-center px-5 py-4" style={{ position: 'relative' }}>
          <div aria-hidden style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: 260, height: 90, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0) 70%)',
          }} />
          <div style={{
            width: 34, height: 34, borderRadius: '11px', marginBottom: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(circle, rgba(201,168,76,0.12), rgba(201,168,76,0.04))',
            border: '1px solid rgba(201,168,76,0.28)',
            boxShadow: '0 0 14px rgba(201,168,76,0.18)',
            position: 'relative',
          }}>
            <MapPin size={15} strokeWidth={1.5} style={{ color: 'rgba(201,168,76,1)' }} />
          </div>
          <h1 style={{
            fontFamily: 'Cormorant, serif',
            fontSize: '1.9rem',
            fontWeight: 600,
            background: 'linear-gradient(135deg, #B8891F, #F4D875, #B8891F)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '0.03em',
            lineHeight: 1.1,
            position: 'relative',
          }}>
            Lieux
          </h1>
          <p style={{ fontSize: '11px', color: 'rgba(201,168,76,1)', letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: '4px', position: 'relative' }}>
            Nos lieux partenaires
          </p>
        </div>
      </header>

      {/* accès partenaire (discret) */}
      <Link to="/partenaire" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        marginTop: 12, padding: '10px 16px', borderRadius: 12, textDecoration: 'none',
        background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.3)',
        color: '#8A6A18', fontSize: 12.5, fontWeight: 600, letterSpacing: '0.03em',
      }}>
        <Store size={14} strokeWidth={1.7} />
        Vous gérez un lieu ? Rejoignez-nous
      </Link>

      {/* carte */}
      {mapVenues.length > 0 && (
        <div style={{ height: 320, borderRadius: 18, overflow: 'hidden', marginTop: 12, border: '1px solid rgba(201,168,76,0.18)', position: 'relative' }}>
          <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center" style={{ color: 'rgba(201,168,76,1)', fontSize: '13px' }}>
              Chargement de la carte…
            </div>
          }>
            <VenuesMap venues={mapVenues} />
          </Suspense>
        </div>
      )}

      {/* filtres (pills) */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16, marginBottom: 14 }}>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding: '7px 15px', borderRadius: 99, fontSize: 12, cursor: 'pointer',
            border: filter === f.key ? '1px solid rgba(201,168,76,0.6)' : '1px solid rgba(28,24,20,0.14)',
            background: filter === f.key ? 'rgba(201,168,76,0.14)' : 'rgba(255,255,255,0.5)',
            color: filter === f.key ? '#8A6A18' : 'rgba(28,24,20,0.55)',
            letterSpacing: '0.05em', transition: 'all 0.2s', fontWeight: filter === f.key ? 600 : 400,
          }}>{f.label}</button>
        ))}
      </div>

      {/* annuaire */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ width: 24, height: 24, border: '2px solid rgba(201,168,76,0.25)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'rotateX 0.8s linear infinite', margin: '0 auto' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px' }}>
          <MapPin size={38} strokeWidth={1} style={{ color: 'rgba(201,168,76,0.4)', margin: '0 auto 14px' }} />
          <p style={{ fontFamily: 'Cormorant, serif', fontSize: '1.5rem', color: 'rgba(28,24,20,0.6)' }}>
            {venues.length === 0 ? 'Bientôt des lieux partenaires…' : 'Aucun lieu dans cette catégorie'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map((v, i) => (
            <div
              key={v.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
            >
              <VenueCard venue={v} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function VenueCard({ venue }) {
  const phoneClean = String(venue.phone ?? '').replace(/[^0-9+]/g, '')
  return (
    <div style={{
      background: 'linear-gradient(180deg, #FDFAF6 0%, #F5F0E8 100%)',
      border: '1px solid rgba(201,168,76,0.16)',
      borderRadius: 18,
      overflow: 'hidden',
      boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
    }}>
      {venue.photo_url && (
        <img
          src={venue.photo_url}
          alt=""
          loading="lazy"
          style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }}
        />
      )}
      <div style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{
            fontSize: 10, padding: '3px 9px', borderRadius: 99,
            background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.28)',
            color: '#8A6A18', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
          }}>
            {TYPE_LABELS[venue.type] || venue.type}
          </span>
          {venue.featured && (
            <span style={{
              fontSize: 10, padding: '3px 9px', borderRadius: 99,
              background: 'linear-gradient(135deg, #B8891F, #F4D875, #B8891F)',
              color: '#050505', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700,
            }}>
              Partenaire
            </span>
          )}
        </div>

        <h2 style={{ fontFamily: 'Cormorant, serif', fontSize: '1.5rem', fontWeight: 600, color: '#1C1814', lineHeight: 1.15 }}>
          {venue.name}
        </h2>

        {venue.city && (
          <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(28,24,20,0.55)', marginTop: 3 }}>
            <MapPin size={12} strokeWidth={1.5} /> {venue.city}
          </p>
        )}

        {venue.description && (
          <p style={{ fontSize: 13, color: 'rgba(28,24,20,0.7)', lineHeight: 1.6, marginTop: 10 }}>
            {venue.description}
          </p>
        )}

        {(venue.website || venue.phone) && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
            {venue.website && (
              <a
                href={venue.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 11,
                  background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)',
                  color: '#8A6A18', fontSize: 12.5, fontWeight: 600, textDecoration: 'none',
                }}
              >
                <ExternalLink size={13} strokeWidth={1.6} /> Site
              </a>
            )}
            {venue.phone && (
              <a
                href={`tel:${phoneClean}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 11,
                  background: 'transparent', border: '1px solid rgba(28,24,20,0.16)',
                  color: 'rgba(28,24,20,0.75)', fontSize: 12.5, fontWeight: 500, textDecoration: 'none',
                }}
              >
                <Phone size={13} strokeWidth={1.6} /> {venue.phone}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
