import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Avatar,
  HCard,
  SectionDivider,
  StatusHeader,
  StatsBar,
  FundingBar,
  HButton,
  ImagePlaceholder,
  NavBar,
} from '../components/shared'

const mono = 'ui-monospace, SFMono-Regular, monospace'

export function ExplorerProfileScreen({ dark }: { dark: boolean }) {
  const navigate = useNavigate()

  return (
    <div>
      <NavBar dark={dark} onBack={() => navigate(-1)} />

      {/* Banner with overlay content — matches web layout */}
      <div
        style={{
          position: 'relative',
          background: dark
            ? 'linear-gradient(135deg, #2a1a1a 0%, #1a2a3a 50%, #1a1a2a 100%)'
            : 'linear-gradient(135deg, #d4c4b4 0%, #c4d4e4 50%, #d0d0c8 100%)',
          overflow: 'hidden',
        }}
      >
        {/* Status bar at top of banner */}
        <div
          style={{
            background: '#ac6d46',
            padding: '6px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, background: '#598636' }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: '#fff', fontFamily: mono }}>
              EXPLORER PRO
            </span>
          </div>
          <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.7)', fontFamily: mono }}>
            DAY 12 &middot; PATAGONIA
          </span>
        </div>

        {/* Banner content with dark gradient overlay */}
        <div
          style={{
            padding: '16px 14px',
            background: 'rgba(32,32,32,0.65)',
          }}
        >
          {/* Avatar + name — left-aligned like the web */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <Avatar size={72} name="M" pro />
            <div style={{ flex: 1, paddingTop: 4 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#ac6d46' }}>
                mountain_explorer
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', marginTop: 4, lineHeight: 1.2 }}>
                The Mountain Fox Journal
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: mono, fontWeight: 600 }}>
                <span>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ verticalAlign: 'middle', marginRight: 3 }}>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                  </svg>
                  Chamonix, FR
                </span>
                <span>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ verticalAlign: 'middle', marginRight: 3 }}>
                    <rect x="3" y="4" width="18" height="18" rx="0" /><path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                  Jan 2024
                </span>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, fontStyle: 'italic' }}>
            Documenting trails less traveled across six continents. Trail runner, photographer, storyteller.
          </div>
        </div>
      </div>

      {/* Stats bar — full width, edge-to-edge */}
      <div style={{ borderTop: `2px solid ${dark ? '#616161' : '#202020'}`, borderBottom: `2px solid ${dark ? '#616161' : '#202020'}` }}>
        <StatsBar
          dark={dark}
          stats={[
            { value: '4', label: 'EXPED.' },
            { value: '24', label: 'ENTRIES' },
            { value: '8', label: 'SPONSORS' },
            { value: '156', label: 'FOLLOW' },
            { value: '12', label: 'COUNTRIES' },
          ]}
        />
      </div>

      {/* Action bar — full width, edge-to-edge */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${dark ? '#616161' : '#202020'}`, background: dark ? '#202020' : '#ffffff' }}>
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
          onClick={() => navigate('/sponsor')}
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

      {/* Expedition map placeholder */}
      <div style={{ margin: '12px 16px 0' }}>
        <div
          style={{
            height: 120,
            background: dark
              ? 'linear-gradient(135deg, #0d1a26 0%, #1a2a3a 60%, #0f1c2a 100%)'
              : 'linear-gradient(135deg, #c8d8c0 0%, #c4d4c0 60%, #d0dcc8 100%)',
            position: 'relative',
            overflow: 'hidden',
            border: `2px solid ${dark ? '#616161' : '#202020'}`,
          }}
        >
          {/* Grid */}
          {[...Array(4)].map((_, i) => (
            <div key={`h${i}`} style={{ position: 'absolute', left: 0, right: 0, top: `${(i + 1) * 22}%`, height: 1, background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }} />
          ))}
          {/* Markers */}
          <svg width="320" height="80" viewBox="0 0 320 80" fill="none" style={{ position: 'absolute', top: 16, left: 18 }}>
            <path d="M20 60 C60 30, 100 50, 160 25 S240 40, 300 20" stroke="#ac6d46" strokeWidth="1.5" fill="none" opacity="0.5" />
            <rect x="16" y="56" width="6" height="6" fill="#4676ac" stroke="#fff" strokeWidth="1" />
            <rect x="157" y="22" width="5" height="5" fill="#ac6d46" stroke="#fff" strokeWidth="1" />
            <circle cx="300" cy="20" r="4" fill="#598636" stroke="#fff" strokeWidth="1" />
          </svg>
          <div style={{ position: 'absolute', bottom: 6, left: 10, fontSize: 9, fontFamily: mono, fontWeight: 700, color: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }}>
            EXPEDITION MAP
          </div>
        </div>
      </div>

      {/* Recent Expeditions */}
      <SectionDivider title="RECENT EXPEDITIONS" action="VIEW ALL" dark={dark} />
      <div style={{ padding: '0 16px' }}>
        <HCard dark={dark}>
          <StatusHeader status="active" label="EXPEDITION" right="DAY 12" dark={dark} />
          <div style={{ display: 'flex' }}>
            <div style={{ width: 90, flexShrink: 0 }}>
              <ImagePlaceholder height={80} dark={dark} />
            </div>
            <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div onClick={() => navigate('/expedition')} style={{ fontSize: 14, fontWeight: 700, color: dark ? '#e5e5e5' : '#202020', lineHeight: 1.2, cursor: 'pointer' }}>
                  Patagonia Trail Run
                </div>
                <div style={{ fontSize: 10, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4', marginTop: 4 }}>
                  TRAIL &middot; S. AMERICA
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 10, fontFamily: mono, fontWeight: 600 }}>
                <span style={{ color: '#4676ac' }}>4 entries</span>
                <span style={{ color: '#ac6d46' }}>$800 raised</span>
              </div>
            </div>
          </div>
          <div style={{ margin: '0', borderTop: `2px solid ${dark ? '#616161' : '#202020'}` }}>
            <FundingBar raised={800} goal={2000} dark={dark} />
          </div>
        </HCard>

        <HCard dark={dark}>
          <StatusHeader status="completed" label="EXPEDITION" right="30 DAYS" dark={dark} />
          <div style={{ display: 'flex' }}>
            <div style={{ width: 90, flexShrink: 0 }}>
              <ImagePlaceholder height={80} dark={dark} />
            </div>
            <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: dark ? '#e5e5e5' : '#202020', lineHeight: 1.2 }}>
                  Alpine Crossing 2025
                </div>
                <div style={{ fontSize: 10, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4', marginTop: 4 }}>
                  TRAIL &middot; EUROPE
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 10, fontFamily: mono, fontWeight: 600 }}>
                <span style={{ color: '#4676ac' }}>18 entries</span>
                <span style={{ color: '#ac6d46' }}>$1.2K raised</span>
              </div>
            </div>
          </div>
        </HCard>
      </div>

      {/* Recent Journal Entries */}
      <SectionDivider title="RECENT JOURNAL ENTRIES" action="VIEW ALL" dark={dark} />
      <div style={{ padding: '0 16px' }}>
        <HCard dark={dark}>
          <StatusHeader status="active" label="JOURNAL ENTRY" right="MAR 01" dark={dark} />
          <div style={{ padding: '12px 14px' }}>
            <div style={{ position: 'relative', paddingLeft: 20 }}>
              <span style={{ position: 'absolute', left: 0, top: -4, fontSize: 32, color: dark ? '#3a3a3a' : '#e5e5e5', fontFamily: 'Georgia, serif', lineHeight: 1 }}>
                &ldquo;
              </span>
              <div
                onClick={() => navigate('/entry')}
                style={{ fontSize: 14, color: dark ? '#e5e5e5' : '#202020', lineHeight: 1.7, fontStyle: 'italic', cursor: 'pointer' }}
              >
                The trail wound through ancient beech forests, each turn revealing another frozen waterfall...
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}`, fontSize: 10, fontFamily: mono, fontWeight: 600 }}>
              <span style={{ color: dark ? '#616161' : '#b5bcc4', display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ flexShrink: 0 }}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                Torres del Paine
                <span>&middot;</span>
                <span style={{ color: '#4676ac' }}>51.00S / 73.10W</span>
              </span>
              <span style={{ color: dark ? '#616161' : '#b5bcc4' }}>Patagonia Trail Run</span>
            </div>
          </div>
        </HCard>
      </div>

      {/* Biography */}
      <SectionDivider title="BIOGRAPHY" dark={dark} />
      <div style={{ padding: '0 16px' }}>
        <HCard dark={dark} style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: 13, color: dark ? '#b5bcc4' : '#616161', lineHeight: 1.6 }}>
            Ultra-trail runner and documentary photographer based in the French Alps. After completing a thru-hike of the Pacific Crest Trail in 2023, I founded The Mountain Fox Journal to document long-distance expeditions and inspire others to explore responsibly.
          </div>
        </HCard>
      </div>

      {/* Links */}
      <SectionDivider title="LINKS" dark={dark} />
      <div style={{ padding: '0 16px' }}>
        <HCard dark={dark}>
          {[
            { label: 'mountainfox.com', icon: 'globe' },
            { label: 'Photography Portfolio', icon: 'camera' },
            { label: 'mountain_fox', icon: 'instagram' },
          ].map((link, i) => (
            <div
              key={link.label}
              style={{
                padding: '10px 14px',
                borderTop: i > 0 ? `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 12, color: '#4676ac', fontWeight: 600 }}>{link.label}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={dark ? '#616161' : '#b5bcc4'} strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
              </svg>
            </div>
          ))}
        </HCard>
      </div>

      {/* Passport */}
      <SectionDivider title="PASSPORT" dark={dark} />
      <div style={{ padding: '0 16px' }}>
        <HCard dark={dark}>
          <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: mono, color: '#4676ac' }}>12</div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#616161' : '#b5bcc4', marginTop: 2 }}>COUNTRIES</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: mono, color: '#ac6d46' }}>4</div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#616161' : '#b5bcc4', marginTop: 2 }}>OF 7 CONTINENTS</div>
            </div>
          </div>
          <div style={{ padding: '10px 14px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#616161' : '#b5bcc4', marginBottom: 8 }}>
              RECENT COUNTRIES
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['Chile', 'Argentina', 'France', 'Switzerland', 'Russia', 'Mongolia'].map((c) => (
                <span
                  key={c}
                  style={{
                    padding: '4px 10px',
                    border: `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}`,
                    fontSize: 10, fontWeight: 600, fontFamily: mono,
                    color: dark ? '#b5bcc4' : '#616161',
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </HCard>
      </div>

      {/* Network */}
      <SectionDivider title="EXPLORER NETWORK" dark={dark} />
      <div style={{ padding: '0 16px' }}>
        <HCard dark={dark}>
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#616161' : '#b5bcc4' }}>
              RECENT FOLLOWERS
            </span>
          </div>
          {[
            { name: 'sarah_trails', pro: false, mutual: true },
            { name: 'ocean_nomad', pro: true, mutual: false },
            { name: 'hiker_dan', pro: false, mutual: true },
          ].map((f, i) => (
            <div
              key={f.name}
              style={{
                padding: '10px 14px',
                borderTop: i > 0 ? `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` : 'none',
                display: 'flex', alignItems: 'center', gap: 10,
              }}
            >
              <Avatar size={24} name={f.name.charAt(0).toUpperCase()} pro={f.pro} />
              <span style={{ fontSize: 12, color: '#ac6d46', fontWeight: 600, flex: 1 }}>{f.name}</span>
              {f.pro && (
                <span style={{ fontSize: 8, fontWeight: 700, fontFamily: mono, color: '#ac6d46', padding: '2px 6px', border: '1px solid #ac6d46' }}>PRO</span>
              )}
              {f.mutual && (
                <span style={{ fontSize: 8, fontWeight: 700, fontFamily: mono, color: '#4676ac', padding: '2px 6px', border: '1px solid #4676ac' }}>MUTUAL</span>
              )}
            </div>
          ))}
          <div style={{ padding: '10px 14px', borderTop: `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}`, display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, fontFamily: mono, color: '#ac6d46', cursor: 'pointer' }}>VIEW ALL FOLLOWERS</span>
            <span style={{ color: dark ? '#3a3a3a' : '#b5bcc4' }}>&middot;</span>
            <span style={{ fontSize: 10, fontWeight: 700, fontFamily: mono, color: '#4676ac', cursor: 'pointer' }}>VIEW FOLLOWING</span>
          </div>
        </HCard>
      </div>

      {/* System info */}
      <SectionDivider title="SYSTEM INFORMATION" dark={dark} />
      <div style={{ padding: '0 16px' }}>
        <HCard dark={dark}>
          {[
            { label: 'Account Type', value: 'Explorer Pro' },
            { label: 'Member Since', value: 'January 15, 2024' },
            { label: 'Profile ID', value: '#EXP-00847' },
          ].map((item, i) => (
            <div
              key={item.label}
              style={{
                padding: '10px 14px',
                borderTop: i > 0 ? `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` : 'none',
                display: 'flex', justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 11, color: dark ? '#616161' : '#b5bcc4', fontWeight: 600 }}>{item.label}</span>
              <span style={{ fontSize: 11, fontWeight: 600, fontFamily: mono, color: dark ? '#b5bcc4' : '#616161' }}>{item.value}</span>
            </div>
          ))}
        </HCard>
      </div>

      <div style={{ height: 32 }} />
    </div>
  )
}
