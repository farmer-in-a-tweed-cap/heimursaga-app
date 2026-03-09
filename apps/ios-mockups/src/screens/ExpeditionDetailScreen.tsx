import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Avatar,
  HCard,
  SectionDivider,
  StatusHeader,
  StatsBar,
  SegmentedControl,
  NavBar,
} from '../components/shared'

const mono = 'ui-monospace, SFMono-Regular, monospace'

export function ExpeditionDetailScreen({ dark }: { dark: boolean }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div>
      <NavBar dark={dark} onBack={() => navigate(-1)} />

      {/* Status overlay */}
      <StatusHeader status="active" label="ACTIVE EXPEDITION" right="OVERLAND / ASIA" dark={dark} />

      {/* Map area */}
      <div
        style={{
          height: 260,
          background: dark
            ? 'linear-gradient(135deg, #0d1a26 0%, #1a2a3a 30%, #162233 60%, #0f1c2a 100%)'
            : 'linear-gradient(135deg, #c8d8c0 0%, #b0c4a0 30%, #c0d0b8 60%, #d0dcc8 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Grid overlay */}
        {[...Array(5)].map((_, i) => (
          <div key={`h${i}`} style={{ position: 'absolute', left: 0, right: 0, top: `${(i + 1) * 18}%`, height: 1, background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }} />
        ))}

        {/* Route */}
        <svg width="340" height="140" viewBox="0 0 340 140" fill="none" style={{ position: 'absolute', top: 30, left: 20 }}>
          <path d="M10 100 C50 30, 90 70, 140 40 S200 80, 260 30 S300 50, 320 35" stroke="#ac6d46" strokeWidth="2.5" fill="none" />
          <rect x="6" y="96" width="8" height="8" fill="#4676ac" stroke="#fff" strokeWidth="1.5" />
          <rect x="136" y="36" width="6" height="6" fill="#ac6d46" stroke="#fff" strokeWidth="1" />
          <rect x="257" y="26" width="6" height="6" fill="#ac6d46" stroke="#fff" strokeWidth="1" />
          <circle cx="320" cy="35" r="5" fill="#598636" stroke="#fff" strokeWidth="1.5" />
          <circle cx="320" cy="35" r="10" fill="none" stroke="#598636" strokeWidth="1" opacity="0.4" />
        </svg>

        {/* Full dark overlay with all map content */}
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'rgba(32,32,32,0.65)',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}
        >
          {/* Top — title + dates */}
          <div style={{ padding: '10px 14px' }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', lineHeight: 1.15, margin: 0 }}>
              Trans-Siberian Journey
            </h1>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 8, marginTop: 6,
                fontSize: 11, fontFamily: mono, fontWeight: 600, color: 'rgba(255,255,255,0.6)',
              }}
            >
              <span>Jan 15, 2026</span>
              <span style={{ color: '#ac6d46' }}>&rarr;</span>
              <span>Apr 14, 2026</span>
              <span style={{ color: '#ac6d46', marginLeft: 'auto', fontWeight: 700 }}>Day 45/90</span>
            </div>
          </div>

          {/* Fullscreen toggle — centered */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              style={{
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
              </svg>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)', fontFamily: mono }}>
                VIEW MAP
              </span>
            </button>
          </div>

          {/* Bottom — explorer + location */}
          <div>
            <div onClick={() => navigate('/profile')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px 8px', cursor: 'pointer' }}>
              <Avatar size={28} name="E" />
              <div>
                <span style={{ fontSize: 11, color: '#ac6d46', fontWeight: 700 }}>explorer_name</span>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 1, fontStyle: 'italic' }}>
                  Crossing the vast Russian steppe by rail
                </div>
              </div>
            </div>
            <div
              style={{
                padding: '6px 14px 8px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderTop: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4676ac" strokeWidth="3">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)', fontFamily: mono }}>
                  CURRENTLY
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#ffffff' }}>
                  Irkutsk, Russia
                </span>
              </div>
              <span style={{ fontSize: 10, fontFamily: mono, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>
                52.29N / 104.29E
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats — full width, edge-to-edge */}
      <div style={{ borderTop: `2px solid ${dark ? '#616161' : '#202020'}`, borderBottom: `2px solid ${dark ? '#616161' : '#202020'}` }}>
        <StatsBar
          dark={dark}
          stats={[
            { value: '45', label: 'DAYS' },
            { value: '$2.4K', label: 'RAISED' },
            { value: '12', label: 'SPONSORS' },
            { value: '24', label: 'ENTRIES' },
            { value: '1.2K', label: 'KM' },
          ]}
        />
      </div>

      {/* Action bar — full width, edge-to-edge */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${dark ? '#616161' : '#202020'}`, background: dark ? '#202020' : '#ffffff' }}>
        <button
          style={{
            flex: 1, padding: '10px', background: 'none', border: 'none',
            borderRight: `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}`,
            color: '#ac6d46', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, cursor: 'pointer',
          }}
        >
          SPONSOR
        </button>
        <button
          style={{
            flex: 1, padding: '10px', background: 'none', border: 'none',
            borderRight: `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}`,
            color: '#4676ac', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, cursor: 'pointer',
          }}
        >
          FOLLOW
        </button>
        <button
          style={{
            padding: '10px 14px', background: 'none', border: 'none',
            borderRight: `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}`,
            color: dark ? '#616161' : '#b5bcc4', cursor: 'pointer',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
          </svg>
        </button>
        <button
          style={{
            padding: '10px 14px', background: 'none', border: 'none',
            color: dark ? '#616161' : '#b5bcc4', cursor: 'pointer',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>

      {/* Content tabs — full width */}
      <div style={{ borderBottom: `2px solid ${dark ? '#616161' : '#202020'}` }}>
        <SegmentedControl options={['ENTRIES', 'NOTES', 'SPONSORS', 'WAYPOINTS']} active={activeTab} dark={dark} borderless />
      </div>

      {/* Entries */}
      <div style={{ padding: '12px 16px' }}>
        <HCard dark={dark}>
          <StatusHeader status="active" label="JOURNAL ENTRY" right="DAY 44" dark={dark} />
          <div style={{ padding: '12px 14px' }}>
            <div style={{ position: 'relative', paddingLeft: 20 }}>
              <span style={{ position: 'absolute', left: 0, top: -4, fontSize: 32, color: dark ? '#3a3a3a' : '#e5e5e5', fontFamily: 'Georgia, serif', lineHeight: 1 }}>
                &ldquo;
              </span>
              <div
                onClick={() => navigate('/entry')}
                style={{ fontSize: 14, color: dark ? '#e5e5e5' : '#202020', lineHeight: 1.7, fontStyle: 'italic', cursor: 'pointer' }}
              >
                Lake Baikal stretched before us, impossibly clear and cold...
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}`, fontSize: 10, fontFamily: mono, fontWeight: 600 }}>
              <span style={{ color: dark ? '#616161' : '#b5bcc4', display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ flexShrink: 0 }}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                Lake Baikal, Russia
                <span style={{ color: dark ? '#3a3a3a' : '#b5bcc4' }}>&middot;</span>
                <span style={{ color: '#4676ac' }}>53.55N / 108.16E</span>
              </span>
              <span style={{ color: dark ? '#616161' : '#b5bcc4' }}>8 notes</span>
            </div>
          </div>
        </HCard>

        <HCard dark={dark}>
          <StatusHeader status="active" label="JOURNAL ENTRY" right="DAY 41" dark={dark} />
          <div style={{ padding: '12px 14px' }}>
            <div style={{ position: 'relative', paddingLeft: 20 }}>
              <span style={{ position: 'absolute', left: 0, top: -4, fontSize: 32, color: dark ? '#3a3a3a' : '#e5e5e5', fontFamily: 'Georgia, serif', lineHeight: 1 }}>
                &ldquo;
              </span>
              <div style={{ fontSize: 14, color: dark ? '#e5e5e5' : '#202020', lineHeight: 1.7, fontStyle: 'italic' }}>
                The Trans-Siberian pulled into Ulan-Ude as dawn painted the sky...
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}`, fontSize: 10, fontFamily: mono, fontWeight: 600 }}>
              <span style={{ color: dark ? '#616161' : '#b5bcc4', display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ flexShrink: 0 }}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                Ulan-Ude, Russia
                <span style={{ color: dark ? '#3a3a3a' : '#b5bcc4' }}>&middot;</span>
                <span style={{ color: '#4676ac' }}>51.83N / 107.59E</span>
              </span>
              <span style={{ color: dark ? '#616161' : '#b5bcc4' }}>3 notes</span>
            </div>
          </div>
        </HCard>

      </div>

      <div style={{ height: 32 }} />
    </div>
  )
}
