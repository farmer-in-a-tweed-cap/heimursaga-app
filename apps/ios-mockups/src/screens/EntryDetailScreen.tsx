import { useNavigate } from 'react-router-dom'
import { Avatar, HCard, ImagePlaceholder, StatusHeader, NavBar } from '../components/shared'

const mono = 'ui-monospace, SFMono-Regular, monospace'

export function EntryDetailScreen({ dark }: { dark: boolean }) {
  const navigate = useNavigate()

  return (
    <div>
      <NavBar
        dark={dark}
        onBack={() => navigate(-1)}
        right={<div style={{ width: 48 }} />}
      />

      {/* Hero image */}
      <div style={{ position: 'relative' }}>
        <ImagePlaceholder
          height={240}
          dark={dark}
          gradient={dark
            ? 'linear-gradient(135deg, #0d1a26 0%, #1a3040 40%, #2a2020 100%)'
            : 'linear-gradient(135deg, #b8c8d8 0%, #c8d0c0 40%, #d0c0b0 100%)'
          }
        />
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'rgba(32,32,32,0.65)',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            padding: '16px',
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#ac6d46', fontFamily: mono, marginBottom: 8 }}>
            JOURNAL ENTRY &middot; DAY 44
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#ffffff', lineHeight: 1.15, margin: 0 }}>
            The Shores of Lake Baikal
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <Avatar size={20} name="E" />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
              explorer_name &middot; Trans-Siberian Journey
            </span>
          </div>
        </div>
      </div>

      {/* Action bar — matches web InteractionButtons */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${dark ? '#616161' : '#202020'}`, background: dark ? '#202020' : '#ffffff' }}>
        {[
          { label: 'NOTES', count: '8' },
          { label: 'SHARE' },
          { label: 'BOOKMARK' },
        ].map((action, i) => (
          <button
            key={action.label}
            style={{
              flex: 1, padding: '10px 4px', background: 'none', border: 'none',
              borderRight: i < 2 ? `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` : 'none',
              color: dark ? '#616161' : '#b5bcc4',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, cursor: 'pointer',
            }}
          >
            {action.count ? `${action.count} ` : ''}{action.label}
          </button>
        ))}
      </div>

      {/* Entry metadata grid */}
      <div style={{ padding: '16px' }}>
        <div
          style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px',
            padding: '12px', background: dark ? 'rgba(70,118,172,0.06)' : 'rgba(70,118,172,0.03)',
            border: `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}`, marginBottom: 20,
          }}
        >
          {[
            { label: 'DATE', value: 'Mar 1, 2026 4:30 PM' },
            { label: 'LOCATION', value: 'Lake Baikal, Russia' },
            { label: 'COORDINATES', value: '53.55N / 108.16E' },
            { label: 'ELEVATION', value: '456m / 1,496ft' },
            { label: 'LENGTH', value: '1,240 words / 5 min' },
            { label: 'CONDITIONS', value: '-8°C / Clear skies' },
          ].map((item) => (
            <div key={item.label}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: dark ? '#616161' : '#b5bcc4', fontFamily: mono, marginBottom: 2 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: dark ? '#b5bcc4' : '#616161', fontFamily: mono }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Photo */}
        <div style={{ border: `2px solid ${dark ? '#616161' : '#202020'}`, marginBottom: 6 }}>
          <ImagePlaceholder height={200} dark={dark} gradient={dark ? 'linear-gradient(135deg, #1a2a3a 0%, #2a3a4a 100%)' : 'linear-gradient(135deg, #c4d4e4 0%, #d4c4b4 100%)'} />
        </div>
        <div style={{ fontSize: 11, fontStyle: 'italic', color: dark ? '#616161' : '#b5bcc4', textAlign: 'center', marginBottom: 20 }}>
          First light over the frozen lake &mdash; 1 of 4
        </div>

        {/* Body */}
        <div style={{ fontSize: 15, lineHeight: 1.85, color: dark ? '#e5e5e5' : '#202020' }}>
          <p style={{ margin: '0 0 16px' }}>
            The morning fog lifted to reveal snow-capped peaks stretching endlessly
            along the southern shore of Lake Baikal. At -8°C, the air was sharp and
            clean, carrying the scent of pine and frozen water.
          </p>
          <p style={{ margin: '0 0 16px' }}>
            We set out before dawn, following the frozen shore path that local
            fishermen had carved through weeks of daily travel. The ice beneath our
            feet was impossibly clear — you could see down twenty meters into the
            depths below.
          </p>
          <p style={{ margin: 0 }}>
            By midday, we reached a small fishing village where an elderly couple
            invited us for omul tea — a local specialty made from the lake's endemic
            fish...
          </p>
        </div>
      </div>

      {/* Comments */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: dark ? '#e5e5e5' : '#202020', fontFamily: mono, marginBottom: 6 }}>
          NOTES (8)
        </div>
        <div style={{ height: 2, background: dark ? '#616161' : '#202020', marginBottom: 12 }} />

        <HCard dark={dark}>
          <div style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar size={22} name="R" />
                <span style={{ fontSize: 12, color: '#ac6d46', fontWeight: 600 }}>reader_one</span>
              </div>
              <span style={{ fontSize: 10, color: dark ? '#616161' : '#b5bcc4', fontFamily: mono }}>2h ago</span>
            </div>
            <div style={{ fontSize: 13, color: dark ? '#e5e5e5' : '#202020', lineHeight: 1.5, marginTop: 8, marginLeft: 30 }}>
              Absolutely stunning photography. Lake Baikal has been on my list for years.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, marginTop: 8, fontSize: 10, fontFamily: mono, fontWeight: 600 }}>
              <span style={{ color: '#ac6d46', cursor: 'pointer' }}>Reply</span>
            </div>
          </div>
        </HCard>

        <HCard dark={dark}>
          <div style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar size={22} name="T" />
                <span style={{ fontSize: 12, color: '#ac6d46', fontWeight: 600 }}>traveler_dan</span>
              </div>
              <span style={{ fontSize: 10, color: dark ? '#616161' : '#b5bcc4', fontFamily: mono }}>5h ago</span>
            </div>
            <div style={{ fontSize: 13, color: dark ? '#e5e5e5' : '#202020', lineHeight: 1.5, marginTop: 8, marginLeft: 30 }}>
              What camera gear are you using for these shots?
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, marginTop: 8, fontSize: 10, fontFamily: mono, fontWeight: 600 }}>
              <span style={{ color: '#ac6d46', cursor: 'pointer' }}>Reply</span>
            </div>
          </div>
        </HCard>

        {/* Note input */}
        <div style={{ display: 'flex', gap: 0, border: `2px solid ${dark ? '#616161' : '#202020'}` }}>
          <input
            placeholder="Write a note..."
            style={{ flex: 1, padding: '10px 12px', background: 'transparent', border: 'none', color: dark ? '#e5e5e5' : '#202020', fontSize: 13, outline: 'none' }}
          />
          <button style={{ padding: '10px 14px', background: '#ac6d46', border: '2px solid #ac6d46', color: '#fff', fontSize: 10, fontWeight: 700, fontFamily: mono, cursor: 'pointer' }}>
            POST
          </button>
        </div>
      </div>

      {/* Related */}
      <div style={{ padding: '20px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: dark ? '#e5e5e5' : '#202020', fontFamily: mono, marginBottom: 6 }}>
          FROM THIS EXPEDITION
        </div>
        <div style={{ height: 2, background: dark ? '#616161' : '#202020', marginBottom: 12 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ day: 41, loc: 'Ulan-Ude', coords: '51.83N / 107.59E' }, { day: 38, loc: 'Mongolia Border', coords: '50.37N / 106.27E' }].map((e) => (
            <HCard key={e.day} dark={dark} style={{ flex: 1 }}>
              <ImagePlaceholder height={70} dark={dark} />
              <div style={{ padding: '8px 10px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#ac6d46', fontFamily: mono }}>Day {e.day}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: dark ? '#e5e5e5' : '#202020', marginTop: 2 }}>{e.loc}</div>
                <div style={{ fontSize: 9, fontWeight: 600, color: '#4676ac', fontFamily: mono, marginTop: 2 }}>{e.coords}</div>
              </div>
            </HCard>
          ))}
        </div>
      </div>

      <div style={{ height: 32 }} />
    </div>
  )
}
