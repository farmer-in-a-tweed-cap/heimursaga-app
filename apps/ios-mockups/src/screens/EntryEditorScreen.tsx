import { HButton, HTextField, ImagePlaceholder, NavBar } from '../components/shared'

const mono = 'ui-monospace, SFMono-Regular, monospace'

export function EntryEditorScreen({ dark }: { dark: boolean }) {
  return (
    <div>
      <NavBar
        dark={dark}
        onBack={() => {}}
        title="LOG ENTRY"
        right={
          <button style={{ background: 'none', border: 'none', color: '#ac6d46', fontSize: 11, fontWeight: 700, fontFamily: mono, cursor: 'pointer', padding: 0 }}>
            SAVE
          </button>
        }
      />

      <div style={{ padding: 16 }}>
        {/* Expedition Selector */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#b5bcc4' : '#616161', display: 'block', marginBottom: 6 }}>
            EXPEDITION
          </label>
          <div
            style={{
              padding: '12px 14px', background: dark ? '#2a2a2a' : '#ffffff',
              border: `2px solid ${dark ? '#616161' : '#202020'}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: dark ? '#e5e5e5' : '#202020' }}>
              Trans-Siberian Journey
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={dark ? '#616161' : '#b5bcc4'} strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>

        <HTextField dark={dark} label="TITLE" placeholder="Give your entry a title" value="The Shores of Lake Baikal" />

        {/* Photos */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#b5bcc4' : '#616161', display: 'block', marginBottom: 6 }}>
            PHOTOS
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3].map((n) => (
              <div key={n} style={{ width: 68, height: 68, border: `2px solid ${dark ? '#616161' : '#202020'}` }}>
                <ImagePlaceholder height={64} dark={dark} />
              </div>
            ))}
            <div
              style={{
                width: 68, height: 68, border: `2px dashed ${dark ? '#3a3a3a' : '#b5bcc4'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={dark ? '#3a3a3a' : '#b5bcc4'} strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
          </div>
        </div>

        {/* Content editor */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#b5bcc4' : '#616161', display: 'block', marginBottom: 6 }}>
            CONTENT
          </label>
          <div style={{ display: 'flex', border: `2px solid ${dark ? '#616161' : '#202020'}`, borderBottom: 'none', background: dark ? '#2a2a2a' : '#f5f5f5' }}>
            {['B', 'I', 'U', 'H1', 'H2', '\u201C', '\u2014', '\u2022', '#'].map((btn) => (
              <button
                key={btn}
                style={{
                  padding: '8px 8px', background: 'none', border: 'none',
                  borderRight: `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}`,
                  color: dark ? '#616161' : '#b5bcc4', fontSize: 11,
                  fontWeight: btn === 'B' ? 700 : 500,
                  fontStyle: btn === 'I' ? 'italic' : 'normal',
                  textDecoration: btn === 'U' ? 'underline' : 'none',
                  cursor: 'pointer', fontFamily: mono,
                }}
              >
                {btn}
              </button>
            ))}
          </div>
          <textarea
            defaultValue="The morning fog lifted to reveal snow-capped peaks stretching endlessly along the southern shore..."
            style={{
              width: '100%', height: 140, padding: '12px 14px',
              background: dark ? '#2a2a2a' : '#ffffff',
              border: `2px solid ${dark ? '#616161' : '#202020'}`,
              color: dark ? '#e5e5e5' : '#202020', fontSize: 14, lineHeight: 1.7,
              resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'Georgia, serif',
            }}
          />
        </div>

        {/* Location */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#b5bcc4' : '#616161', display: 'block', marginBottom: 6 }}>
            LOCATION
          </label>
          <div
            style={{
              padding: '12px 14px', background: dark ? '#2a2a2a' : '#ffffff',
              border: `2px solid ${dark ? '#616161' : '#202020'}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: dark ? '#e5e5e5' : '#202020', fontWeight: 600 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ac6d46" strokeWidth="2.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                Lake Baikal, Russia
              </div>
              <div style={{ fontSize: 10, color: dark ? '#616161' : '#b5bcc4', fontFamily: mono, fontWeight: 600, marginTop: 2 }}>
                53.55N / 108.16E
              </div>
            </div>
            <span style={{ fontSize: 10, color: '#ac6d46', fontWeight: 700, fontFamily: mono }}>
              CHANGE
            </span>
          </div>
        </div>

        {/* Visibility */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#b5bcc4' : '#616161', display: 'block', marginBottom: 6 }}>
            VISIBILITY
          </label>
          <div style={{ border: `2px solid ${dark ? '#616161' : '#202020'}` }}>
            {[
              { label: 'PUBLIC', icon: null },
              { label: 'OFF-GRID', icon: null },
              { label: 'PRIVATE', icon: null },
            ].map((opt, i) => (
              <div
                key={opt.label}
                style={{
                  padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
                  borderTop: i > 0 ? `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` : 'none',
                  background: i === 0 ? (dark ? 'rgba(172,109,70,0.06)' : 'rgba(172,109,70,0.03)') : (dark ? '#202020' : '#ffffff'),
                }}
              >
                <div
                  style={{
                    width: 14, height: 14,
                    border: `2px solid ${i === 0 ? '#ac6d46' : dark ? '#3a3a3a' : '#b5bcc4'}`,
                    background: i === 0 ? '#ac6d46' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {i === 0 && <div style={{ width: 4, height: 4, background: '#fff' }} />}
                </div>
                <span
                  style={{
                    fontSize: 11, fontWeight: 700, fontFamily: mono, letterSpacing: '0.06em',
                    color: i === 0 ? '#ac6d46' : dark ? '#616161' : '#b5bcc4',
                  }}
                >
                  {opt.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <HButton variant="copper">PUBLISH ENTRY</HButton>
        <div style={{ marginTop: 8 }}>
          <HButton variant="copper" outline>SAVE AS DRAFT</HButton>
        </div>
      </div>

      <div style={{ height: 32 }} />
    </div>
  )
}
