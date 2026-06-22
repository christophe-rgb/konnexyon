const SEEKING_OPTIONS = [
  { value: 'decouverte',                label: 'Découverte · curieux' },
  { value: 'rencontres_occasionnelles', label: 'Rencontres occasionnelles' },
  { value: 'echangisme',                label: 'Échangisme · soirées' },
  { value: 'expert',                    label: 'Expert' },
]

const AVAIL_OPTIONS = [
  { value: 'semaine',      label: 'En semaine' },
  { value: 'weekend',      label: 'Le week-end' },
  { value: 'rdv',          label: 'Sur rendez-vous' },
  { value: 'spontanement', label: 'Spontanément' },
]

const LIMITS_OPTIONS = [
  { value: 'pas_photo',             label: 'Pas de photo sans accord' },
  { value: 'discretion',            label: 'Discrétion absolue' },
  { value: 'pas_contact_hors_site', label: 'Pas de contact hors site' },
  { value: 'preservatif',           label: 'Préservatif obligatoire' },
  { value: 'pas_penetration',       label: 'Pas de pénétration' },
]

const inputStyle = {
  width: '100%',
  background: 'rgba(245,240,232,0.85)',
  border: '1px solid rgba(201,168,76,0.25)',
  borderRadius: '14px',
  padding: '13px 16px',
  color: '#1C1814',
  fontSize: '15px',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  backdropFilter: 'blur(10px)',
}

export default function EditProfileForm({ form, setForm, onSave, onCancel, saving }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,1)', marginBottom: '8px' }}>
          Pseudo du couple
        </label>
        <input
          value={form.couple_name}
          onChange={e => set('couple_name', e.target.value)}
          maxLength={50}
          style={inputStyle}
          onFocus={e => { e.target.style.borderColor = 'rgba(201,168,76,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.12)'; }}
          onBlur={e =>  { e.target.style.borderColor = 'rgba(201,168,76,0.25)'; e.target.style.boxShadow = 'none'; }}
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,1)', marginBottom: '8px' }}>
          Bio <span style={{ opacity: 0.5, fontSize: '9px' }}>(max 300 caractères)</span>
        </label>
        <textarea
          value={form.bio}
          onChange={e => set('bio', e.target.value)}
          maxLength={300}
          rows={4}
          style={{ ...inputStyle, resize: 'none' }}
          onFocus={e => { e.target.style.borderColor = 'rgba(201,168,76,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.12)'; }}
          onBlur={e =>  { e.target.style.borderColor = 'rgba(201,168,76,0.25)'; e.target.style.boxShadow = 'none'; }}
        />
      </div>

      {/* Orientation */}
      <div style={{ display: 'flex', gap: 12 }}>
        {[
          { label: 'LUI', key: 'orientation_lui' },
          { label: 'ELLE', key: 'orientation_elle' },
        ].map(({ label, key }) => (
          <div key={key} style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,1)', marginBottom: '8px' }}>
              {label}
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'hetero', label: 'Hétéro' },
                { value: 'bi', label: 'Bi' },
              ].map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => set(key, o.value)}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: '10px', cursor: 'pointer',
                    fontSize: '12px', letterSpacing: '0.06em', transition: 'all 0.2s',
                    border: '1px solid rgba(201,168,76,0.25)',
                    background: form[key] === o.value ? 'rgba(201,168,76,0.28)' : 'transparent',
                    color: form[key] === o.value ? '#C9A84C' : 'rgba(28,24,20,0.8)',
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Désirs */}
      <div>
        <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,1)', marginBottom: '10px' }}>
          Vos désirs
        </label>
        <div className="flex flex-col gap-2">
          {SEEKING_OPTIONS.map(o => {
            const active = form.seeking?.includes(o.value)
            return (
              <button key={o.value} type="button"
                onClick={() => set('seeking', active ? form.seeking.filter(x => x !== o.value) : [...(form.seeking || []), o.value])}
                style={{
                  textAlign: 'left', padding: '12px 14px', borderRadius: '12px', cursor: 'pointer',
                  border: `1px solid ${active ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.15)'}`,
                  background: active ? 'rgba(201,168,76,0.28)' : 'transparent',
                  color: active ? '#C9A84C' : 'rgba(28,24,20,0.8)',
                  fontSize: '13px', transition: 'all 0.2s',
                }}
              >{o.label}</button>
            )
          })}
        </div>
      </div>

      {/* Disponibilités */}
      <div>
        <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,1)', marginBottom: '10px' }}>
          Disponibilités
        </label>
        <div className="flex flex-wrap gap-2">
          {AVAIL_OPTIONS.map(o => {
            const active = form.availabilities?.includes(o.value)
            return (
              <button key={o.value} type="button"
                onClick={() => set('availabilities', active ? form.availabilities.filter(x => x !== o.value) : [...(form.availabilities || []), o.value])}
                style={{
                  padding: '9px 14px', borderRadius: '99px', cursor: 'pointer',
                  border: `1px solid ${active ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.15)'}`,
                  background: active ? 'rgba(201,168,76,0.28)' : 'transparent',
                  color: active ? '#C9A84C' : 'rgba(28,24,20,0.8)',
                  fontSize: '12px', transition: 'all 0.2s',
                }}
              >{o.label}</button>
            )
          })}
        </div>
      </div>

      {/* Limites */}
      <div>
        <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,1)', marginBottom: '10px' }}>
          Non négociable
        </label>
        <div className="flex flex-col gap-2">
          {LIMITS_OPTIONS.map(o => {
            const active = form.limits?.includes(o.value)
            return (
              <button key={o.value} type="button"
                onClick={() => set('limits', active ? form.limits.filter(x => x !== o.value) : [...(form.limits || []), o.value])}
                style={{
                  textAlign: 'left', padding: '12px 14px', borderRadius: '12px', cursor: 'pointer',
                  border: `1px solid ${active ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.15)'}`,
                  background: active ? 'rgba(201,168,76,0.28)' : 'transparent',
                  color: active ? 'rgba(201,168,76,1)' : 'rgba(28,24,20,0.8)',
                  fontSize: '13px', transition: 'all 0.2s',
                }}
              >{o.label}</button>
            )
          })}
        </div>
      </div>

      <div className="flex gap-3 mt-1">
        <button className="erb-btn"
          onClick={onCancel}
          style={{
            flex: 1, padding: '14px', borderRadius: '12px',
            background: 'transparent', border: '1px solid rgba(201,168,76,0.1)',
            color: 'rgba(28,24,20,0.9)', fontSize: '13px', cursor: 'pointer',
          }}
        >
          Annuler
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="btn-gold"
          style={{
            flex: 1, padding: '14px', borderRadius: '12px',
            border: 'none', fontSize: '13px', letterSpacing: '0.08em',
            cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.75 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          {saving ? (
            <>
              <span style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.25)', borderTopColor: '#050505', borderRadius: '50%', display: 'inline-block', animation: 'rotateX 0.7s linear infinite' }} />
              Enregistrement…
            </>
          ) : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}
