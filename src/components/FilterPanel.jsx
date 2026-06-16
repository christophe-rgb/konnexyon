import { X } from 'lucide-react'
import clsx from 'clsx'

const ORIENTATIONS = [
  { value: 'all',            label: 'Toutes' },
  { value: 'hetero_hetero',  label: 'Hétéro' },
  { value: 'hetero_bi',      label: 'Hétéro / Bi' },
  { value: 'bi_all',         label: 'Bi & tout' },
]

const SEEKING = [
  { value: 'rencontres_occasionnelles', label: 'Rencontres' },
  { value: 'echangisme',                label: 'Échangisme' },
  { value: 'amis_libertins',            label: 'Amis libertins' },
  { value: 'decouverte',                label: 'Découverte' },
]

const DISTANCES = [20, 50, 100, 0]

export default function FilterPanel({ filters, onChange, onClose }) {
  const set = (key, value) => onChange({ ...filters, [key]: value })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60">
      <div className="bg-surface border border-[rgba(201,168,76,0.2)] rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 pb-8">
        {/* header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl">Filtres</h2>
          <button onClick={onClose} className="text-muted hover:text-text cursor-pointer erb-btn">
            <X size={22} />
          </button>
        </div>

        {/* orientation */}
        <section className="mb-5">
          <p className="text-sm text-muted mb-2">Orientation</p>
          <div className="flex flex-wrap gap-2">
            {ORIENTATIONS.map(o => (
              <button className="erb-btn"
                key={o.value}
                onClick={() => set('orientation', o.value)}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-sm border transition-colors duration-150 cursor-pointer',
                  filters.orientation === o.value
                    ? 'bg-gold text-bg border-gold'
                    : 'border-[rgba(201,168,76,0.2)] text-muted hover:text-text'
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </section>

        {/* seeking */}
        <section className="mb-5">
          <p className="text-sm text-muted mb-2">Ce que vous cherchez</p>
          <div className="flex flex-wrap gap-2">
            {SEEKING.map(s => {
              const active = filters.seeking?.includes(s.value)
              return (
                <button className="erb-btn"
                  key={s.value}
                  onClick={() => {
                    const cur = filters.seeking || []
                    set('seeking', active ? cur.filter(x => x !== s.value) : [...cur, s.value])
                  }}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-sm border transition-colors duration-150 cursor-pointer',
                    active
                      ? 'bg-gold text-bg border-gold'
                      : 'border-[rgba(201,168,76,0.2)] text-muted hover:text-text'
                  )}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </section>

        {/* distance */}
        <section>
          <p className="text-sm text-muted mb-2">Distance max</p>
          <div className="flex gap-2">
            {DISTANCES.map(d => (
              <button className="erb-btn"
                key={d}
                onClick={() => set('distance', d)}
                className={clsx(
                  'flex-1 py-1.5 rounded-full text-sm border transition-colors duration-150 cursor-pointer',
                  filters.distance === d
                    ? 'bg-gold text-bg border-gold'
                    : 'border-[rgba(201,168,76,0.2)] text-muted hover:text-text'
                )}
              >
                {d === 0 ? 'Peu importe' : `${d} km`}
              </button>
            ))}
          </div>
        </section>

        <button
          onClick={onClose}
          className="mt-6 w-full py-3 rounded-xl bg-gold text-bg font-semibold hover:bg-[#d4ae58] transition-colors duration-150 cursor-pointer erb-btn"
        >
          Appliquer
        </button>
      </div>
    </div>
  )
}
