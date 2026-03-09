import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Avatar,
  HCard,
  SectionDivider,
  StatusHeader,
  StatsBar,
  FundingBar,
  ImagePlaceholder,
} from '../components/shared'

const mono = 'ui-monospace, SFMono-Regular, monospace'

export function HomeScreen({ dark }: { dark: boolean }) {
  const navigate = useNavigate()
  const [mapExpanded, setMapExpanded] = useState(false)
  const [atlasTab, setAtlasTab] = useState(0)
  const [feedTab, setFeedTab] = useState(0)

  return (
    <div style={mapExpanded ? { display: 'flex', flexDirection: 'column' as const, height: '100%' } : undefined}>
      {/* Header bar — dark bg like web */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 16px',
          background: '#202020',
          borderBottom: '3px solid #ac6d46',
        }}
      >
        <img
          src="/logo-lg-light.svg"
          alt="Heimursaga"
          style={{ height: 40, width: 'auto' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar size={26} name="E" />
          <svg onClick={() => navigate('/menu')} style={{ cursor: 'pointer' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e5e5e5" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </div>
      </div>

      {/* Regional Field Report — single-row summary */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 14px',
          gap: 10,
          background: dark ? '#202020' : '#ffffff',
          borderBottom: `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}`,
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', color: dark ? '#616161' : '#b5bcc4', fontFamily: mono, flexShrink: 0 }}>
          FIELD REPORT
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: dark ? '#e5e5e5' : '#202020', fontFamily: mono, fontWeight: 600 }}>
          <span>-8°C</span>
          <span style={{ color: dark ? '#3a3a3a' : '#e5e5e5' }}>/</span>
          <span>Clear</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: dark ? '#616161' : '#b5bcc4', fontFamily: mono }}>
          <span>12km/h NW</span>
        </div>
        <div style={{ fontSize: 10, color: '#4676ac', fontFamily: mono, fontWeight: 600, marginLeft: 'auto', flexShrink: 0 }}>
          Irkutsk
        </div>
      </div>

      {/* Global / Following toggle */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${dark ? '#616161' : '#202020'}`, flexShrink: 0 }}>
        {[
          { label: 'GLOBAL', count: '342' },
          { label: 'FOLLOWING', count: '12' },
        ].map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setFeedTab(i)}
            style={{
              flex: 1,
              padding: '10px 12px',
              background: feedTab === i ? '#ac6d46' : (dark ? '#202020' : '#ffffff'),
              color: feedTab === i ? '#fff' : (dark ? '#616161' : '#b5bcc4'),
              border: 'none',
              borderLeft: i > 0 ? `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` : 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono }}>
              {tab.label}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, fontFamily: mono }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* THE EXPLORER ATLAS */}
      <div style={{
        padding: mapExpanded ? 0 : '12px 16px 0',
        ...(mapExpanded ? { flex: 1, display: 'flex', flexDirection: 'column' as const } : {}),
      }}>
        <div style={{
          border: mapExpanded ? 'none' : `2px solid ${dark ? '#616161' : '#202020'}`,
          ...(mapExpanded ? { flex: 1, display: 'flex', flexDirection: 'column' as const } : {}),
        }}>
          {/* Map */}
          <div
            style={{
              height: mapExpanded ? undefined : 200,
              ...(mapExpanded ? { flex: 1 } : {}),
              background: dark
                ? 'linear-gradient(135deg, #0d1a26 0%, #162233 30%, #1a2a3a 60%, #0f1c2a 100%)'
                : 'linear-gradient(135deg, #c8d8c0 0%, #b8ccb0 30%, #c4d4c0 60%, #d0dcc8 100%)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Subtle grid lines */}
            {[...Array(mapExpanded ? 16 : 5)].map((_, i) => (
              <div key={`h${i}`} style={{ position: 'absolute', left: 0, right: 0, top: `${(i + 1) * (mapExpanded ? 5.5 : 18)}%`, height: 1, background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }} />
            ))}
            {[...Array(mapExpanded ? 10 : 7)].map((_, i) => (
              <div key={`v${i}`} style={{ position: 'absolute', top: 0, bottom: 0, left: `${(i + 1) * (mapExpanded ? 9 : 13)}%`, width: 1, background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }} />
            ))}

            {/* Expedition markers/dots scattered on map */}
            <svg
              width="100%"
              height={mapExpanded ? '100%' : 170}
              viewBox={`0 0 360 ${mapExpanded ? 560 : 170}`}
              fill="none"
              style={{ position: 'absolute', top: mapExpanded ? 0 : 10, left: 0 }}
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Route lines */}
              <path d={mapExpanded
                ? 'M30 420 C80 250, 130 340, 180 190 S250 350, 310 160'
                : 'M30 120 C80 40, 130 90, 180 50 S250 100, 310 45'
              } stroke="#ac6d46" strokeWidth="2" fill="none" opacity="0.6" />
              <path d={mapExpanded
                ? 'M50 500 C90 370, 140 440, 200 280 S280 390, 340 240'
                : 'M50 140 C90 100, 140 130, 200 80 S280 110, 340 70'
              } stroke="#4676ac" strokeWidth="1.5" fill="none" opacity="0.4" />
              {/* Waypoints */}
              <circle cx="30" cy={mapExpanded ? 420 : 120} r="4" fill="#4676ac" stroke="#fff" strokeWidth="1" />
              <circle cx="180" cy={mapExpanded ? 190 : 50} r="4" fill="#ac6d46" stroke="#fff" strokeWidth="1" />
              <circle cx="310" cy={mapExpanded ? 160 : 45} r="5" fill="#598636" stroke="#fff" strokeWidth="1.5" />
              <circle cx="310" cy={mapExpanded ? 160 : 45} r="9" fill="none" stroke="#598636" strokeWidth="1" opacity="0.3" />
              <circle cx="200" cy={mapExpanded ? 280 : 80} r="3" fill="#4676ac" stroke="#fff" strokeWidth="1" opacity="0.6" />
              <circle cx="100" cy={mapExpanded ? 350 : 100} r="3" fill="#ac6d46" stroke="#fff" strokeWidth="1" opacity="0.5" />
              <circle cx="250" cy={mapExpanded ? 440 : 130} r="3" fill="#616161" stroke="#fff" strokeWidth="1" opacity="0.4" />
              {/* Extra markers visible in expanded */}
              {mapExpanded && (
                <>
                  <circle cx="60" cy="260" r="3" fill="#ac6d46" stroke="#fff" strokeWidth="1" opacity="0.4" />
                  <circle cx="280" cy="520" r="3" fill="#4676ac" stroke="#fff" strokeWidth="1" opacity="0.5" />
                  <circle cx="140" cy="560" r="3" fill="#598636" stroke="#fff" strokeWidth="1" opacity="0.3" />
                  <circle cx="320" cy="400" r="3" fill="#ac6d46" stroke="#fff" strokeWidth="1" opacity="0.35" />
                  <circle cx="80" cy="130" r="4" fill="#4676ac" stroke="#fff" strokeWidth="1" opacity="0.4" />
                  <circle cx="240" cy="90" r="3" fill="#598636" stroke="#fff" strokeWidth="1" opacity="0.5" />
                  <path d="M60 260 C100 300, 140 500, 140 560" stroke="#598636" strokeWidth="1" fill="none" opacity="0.3" />
                  <path d="M80 130 C120 160, 160 175, 180 190" stroke="#4676ac" strokeWidth="1" fill="none" opacity="0.25" />
                </>
              )}
            </svg>

            {/* Map overlay header */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                padding: '8px 14px',
                background: 'rgba(32,32,32,0.65)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#ffffff', fontFamily: mono }}>
                THE EXPLORER ATLAS
              </span>
              <button
                onClick={() => setMapExpanded(!mapExpanded)}
                style={{
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                  padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2">
                  {mapExpanded
                    ? <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
                    : <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
                  }
                </svg>
                <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)', fontFamily: mono }}>
                  {mapExpanded ? 'CLOSE' : 'EXPAND'}
                </span>
              </button>
            </div>

            {/* Fullscreen stats overlay */}
            {mapExpanded && (
              <div style={{ position: 'absolute', top: 36, left: 14, display: 'flex', gap: 12 }}>
                {[
                  { value: '342', label: 'ACTIVE' },
                  { value: '1.2K', label: 'EXPLORERS' },
                  { value: '8.4K', label: 'ENTRIES' },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', fontFamily: mono, lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.4)', fontFamily: mono, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom bar — toggle + count */}
          <div
            style={{
              flexShrink: 0,
              background: dark ? '#0d1a26' : '#b8ccb0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '5px 14px',
            }}
          >
            <div style={{ display: 'flex', gap: 0 }}>
              {['EXPLORERS', 'ENTRIES'].map((label, i) => (
                <button
                  key={label}
                  onClick={() => setAtlasTab(i)}
                  style={{
                    padding: '3px 10px',
                    background: atlasTab === i ? 'rgba(172,109,70,0.8)' : 'transparent',
                    border: `1px solid ${atlasTab === i ? 'rgba(172,109,70,0.6)' : 'rgba(255,255,255,0.15)'}`,
                    borderLeft: i > 0 ? 'none' : undefined,
                    color: atlasTab === i ? '#fff' : 'rgba(255,255,255,0.4)',
                    fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.4)', fontFamily: mono }}>
              {atlasTab === 0 ? '1.2K explorers' : '8.4K entries'}
            </span>
          </div>

          {/* Stats bar inside card */}
          {!mapExpanded && (
            <div style={{ borderTop: `2px solid ${dark ? '#616161' : '#202020'}` }}>
              <StatsBar
                dark={dark}
                stats={[
                  { value: '342', label: 'ACTIVE' },
                  { value: '1.2K', label: 'EXPLORERS' },
                  { value: '8.4K', label: 'ENTRIES' },
                  { value: '47', label: 'COUNTRIES' },
                ]}
              />
            </div>
          )}
        </div>
      </div>

      {/* Everything below map hidden when expanded */}
      {!mapExpanded && (
        <>

          {/* Featured Expeditions */}
          <SectionDivider title="FEATURED EXPEDITIONS" action="VIEW ALL" dark={dark} />

          <div style={{ padding: '0 16px' }}>
            {/* Hero expedition card — matches web ExpeditionCard pattern */}
            <HCard dark={dark}>
              <StatusHeader status="active" label="EXPEDITION" right="OVERLAND" dark={dark} />
              <div onClick={() => navigate('/expedition')} style={{ cursor: 'pointer' }}>
                <ImagePlaceholder
                  height={160}
                  dark={dark}
                  gradient={dark
                    ? 'linear-gradient(135deg, #1a2a3a 0%, #2a3a4a 40%, #3a2a2a 100%)'
                    : 'linear-gradient(135deg, #c4b8a8 0%, #b8aca0 40%, #ccc0b0 100%)'
                  }
                />
              </div>
              <div style={{ padding: '14px' }}>
                <div
                  onClick={() => navigate('/expedition')}
                  style={{ fontSize: 17, fontWeight: 700, color: dark ? '#e5e5e5' : '#202020', cursor: 'pointer', lineHeight: 1.2 }}
                >
                  Trans-Siberian Journey
                </div>
                <div
                  onClick={() => navigate('/profile')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, cursor: 'pointer' }}
                >
                  <Avatar size={20} name="E" />
                  <span style={{ fontSize: 12, color: '#ac6d46', fontWeight: 600 }}>explorer_name</span>
                </div>

                <div style={{ margin: '12px -14px 0', borderTop: `2px solid ${dark ? '#616161' : '#202020'}` }}>
                  <StatsBar
                    dark={dark}
                    stats={[
                      { value: '45', label: 'DAYS' },
                      { value: '$2.4K', label: 'RAISED' },
                      { value: '12', label: 'SPONSORS' },
                      { value: '8', label: 'WAYPTS' },
                    ]}
                  />
                </div>

                <div style={{ margin: '0 -14px', padding: '10px 14px', borderTop: `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` }}>
                  <FundingBar raised={2400} goal={3500} dark={dark} />
                </div>

                {/* Action buttons — matches web's VIEW JOURNAL / SUPPORT / BOOKMARK pattern */}
                <div style={{ display: 'flex', gap: 0, margin: '0 -14px -14px', borderTop: `2px solid ${dark ? '#616161' : '#202020'}` }}>
                  <button
                    onClick={() => navigate('/expedition')}
                    style={{
                      flex: 1, padding: '10px', background: 'none', border: 'none',
                      borderRight: `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}`,
                      color: dark ? '#e5e5e5' : '#202020', fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.06em', fontFamily: mono, cursor: 'pointer',
                    }}
                  >
                    VIEW JOURNAL
                  </button>
                  <button
                    onClick={() => navigate('/sponsor')}
                    style={{
                      flex: 1, padding: '10px', background: 'none', border: 'none',
                      borderRight: `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}`,
                      color: '#ac6d46', fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.06em', fontFamily: mono, cursor: 'pointer',
                    }}
                  >
                    SUPPORT
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
              </div>
            </HCard>

            {/* Compact card — landscape variant */}
            <HCard dark={dark}>
              <StatusHeader status="planned" label="EXPEDITION" right="TRAIL" dark={dark} />
              <div style={{ display: 'flex' }}>
                <div style={{ width: 100, flexShrink: 0 }}>
                  <ImagePlaceholder height={90} dark={dark} />
                </div>
                <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: dark ? '#e5e5e5' : '#202020', lineHeight: 1.2 }}>
                      Patagonia Trail Run
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                      <Avatar size={16} name="M" />
                      <span style={{ fontSize: 11, color: '#ac6d46', fontWeight: 600 }}>mountain_fox</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 9, color: dark ? '#616161' : '#b5bcc4', fontFamily: mono, fontWeight: 600 }}>
                    4 WAYPOINTS &middot; 12 ENTRIES
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
                {/* Decorative quote — matches web's large quotation mark */}
                <div style={{ position: 'relative', paddingLeft: 20 }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: -4,
                      fontSize: 32,
                      color: dark ? '#3a3a3a' : '#e5e5e5',
                      fontFamily: 'Georgia, serif',
                      lineHeight: 1,
                    }}
                  >
                    &ldquo;
                  </span>
                  <div
                    onClick={() => navigate('/entry')}
                    style={{
                      fontSize: 14,
                      color: dark ? '#e5e5e5' : '#202020',
                      lineHeight: 1.7,
                      fontStyle: 'italic',
                      cursor: 'pointer',
                    }}
                  >
                    The morning fog lifted to reveal snow-capped peaks stretching endlessly
                    along the southern shore...
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar size={18} name="E" />
                    <span style={{ fontSize: 11, color: '#ac6d46', fontWeight: 600 }}>explorer_name</span>
                    <span style={{ fontSize: 11, color: dark ? '#616161' : '#b5bcc4' }}>&middot; Trans-Siberian Journey</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 10, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4' }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ flexShrink: 0 }}>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                    </svg>
                    Lake Baikal, Russia
                    <span>&middot;</span>
                    <span style={{ color: '#4676ac' }}>53.55N / 108.16E</span>
                  </div>
                </div>
              </div>
            </HCard>

            <HCard dark={dark}>
              <StatusHeader status="active" label="JOURNAL ENTRY" right="FEB 28" dark={dark} />
              <div style={{ padding: '12px 14px' }}>
                <div style={{ position: 'relative', paddingLeft: 20 }}>
                  <span
                    style={{
                      position: 'absolute', left: 0, top: -4, fontSize: 32,
                      color: dark ? '#3a3a3a' : '#e5e5e5', fontFamily: 'Georgia, serif', lineHeight: 1,
                    }}
                  >
                    &ldquo;
                  </span>
                  <div style={{ fontSize: 14, color: dark ? '#e5e5e5' : '#202020', lineHeight: 1.7, fontStyle: 'italic' }}>
                    The desert stretched before us, impossibly vast under a sky that
                    turned amber at the edges...
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 10, borderTop: `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar size={18} name="N" />
                    <span style={{ fontSize: 11, color: '#ac6d46', fontWeight: 600 }}>nomad</span>
                    <span style={{ fontSize: 11, color: dark ? '#616161' : '#b5bcc4' }}>&middot; Sahara Crossing</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 10, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4' }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ flexShrink: 0 }}>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                    </svg>
                    Erg Chebbi, Morocco
                    <span>&middot;</span>
                    <span style={{ color: '#4676ac' }}>31.15N / 3.97W</span>
                  </div>
                </div>
              </div>
            </HCard>
          </div>

          <div style={{ height: 32 }} />
        </>
      )}
    </div>
  )
}
