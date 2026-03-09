import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HButton, HTextField, HCard, NavBar, ImagePlaceholder } from '../components/shared'

const mono = 'ui-monospace, SFMono-Regular, monospace'

const categories = ['OVERLAND', 'TRAIL', 'CYCLING', 'SAILING', 'PADDLING', 'FLIGHT']
const continents = ['AFRICA', 'ASIA', 'EUROPE', 'N. AMERICA', 'S. AMERICA', 'OCEANIA', 'ANTARCTICA']

export function ExpeditionBuilderScreen({ dark }: { dark: boolean }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [selectedCat, setSelectedCat] = useState(0)
  const [selectedContinent, setSelectedContinent] = useState(1)
  const [visibility, setVisibility] = useState(0)

  const steps = ['DETAILS', 'ROUTE', 'FUNDING', 'REVIEW']

  return (
    <div>
      <NavBar
        dark={dark}
        onBack={() => (step > 0 ? setStep(step - 1) : navigate(-1))}
        title="NEW EXPEDITION"
        right={
          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: mono, color: '#ac6d46' }}>
            {step + 1}/{steps.length}
          </span>
        }
      />

      {/* Step indicator */}
      <div style={{ display: 'flex', background: dark ? '#202020' : '#ffffff', borderBottom: `2px solid ${dark ? '#616161' : '#202020'}` }}>
        {steps.map((s, i) => (
          <div
            key={s}
            onClick={() => setStep(i)}
            style={{
              flex: 1,
              padding: '10px 4px',
              textAlign: 'center',
              cursor: 'pointer',
              borderBottom: i === step ? '3px solid #ac6d46' : '3px solid transparent',
              position: 'relative',
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.06em',
                fontFamily: mono,
                color: i === step ? '#ac6d46' : i < step ? (dark ? '#e5e5e5' : '#202020') : (dark ? '#3a3a3a' : '#b5bcc4'),
              }}
            >
              {s}
            </div>
            {i < step && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#598636" strokeWidth="3" style={{ position: 'absolute', top: 4, right: 6 }}>
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
          </div>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {step === 0 && (
          <>
            {/* Step 1: Basic Details */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#e5e5e5' : '#202020', marginBottom: 6 }}>
                EXPEDITION DETAILS
              </div>
              <div style={{ height: 2, background: dark ? '#616161' : '#202020', marginBottom: 16 }} />
            </div>

            <HTextField dark={dark} label="EXPEDITION NAME" placeholder="e.g. Trans-Siberian Journey" />

            {/* Cover Image */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#b5bcc4' : '#616161', display: 'block', marginBottom: 6 }}>
                COVER IMAGE
              </label>
              <div style={{ border: `2px dashed ${dark ? '#3a3a3a' : '#b5bcc4'}`, padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={dark ? '#3a3a3a' : '#b5bcc4'} strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="0" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                <span style={{ fontSize: 11, color: dark ? '#3a3a3a' : '#b5bcc4', fontWeight: 600 }}>
                  Tap to add cover photo
                </span>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#b5bcc4' : '#616161', display: 'block', marginBottom: 6 }}>
                DESCRIPTION
              </label>
              <textarea
                placeholder="Describe your expedition..."
                defaultValue="A 90-day overland journey across Russia via the Trans-Siberian Railway, documenting the diverse landscapes and cultures between Moscow and Vladivostok."
                style={{
                  width: '100%', height: 90, padding: '12px 14px',
                  background: dark ? '#2a2a2a' : '#ffffff',
                  border: `2px solid ${dark ? '#616161' : '#202020'}`,
                  color: dark ? '#e5e5e5' : '#202020', fontSize: 14, lineHeight: 1.5,
                  resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Category */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#b5bcc4' : '#616161', display: 'block', marginBottom: 6 }}>
                CATEGORY
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {categories.map((cat, i) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCat(i)}
                    style={{
                      padding: '8px 14px',
                      background: selectedCat === i ? '#ac6d46' : (dark ? '#2a2a2a' : '#ffffff'),
                      color: selectedCat === i ? '#fff' : (dark ? '#616161' : '#b5bcc4'),
                      border: `2px solid ${selectedCat === i ? '#ac6d46' : (dark ? '#616161' : '#202020')}`,
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, cursor: 'pointer',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Continent */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#b5bcc4' : '#616161', display: 'block', marginBottom: 6 }}>
                REGION
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {continents.map((c, i) => (
                  <button
                    key={c}
                    onClick={() => setSelectedContinent(i)}
                    style={{
                      padding: '8px 12px',
                      background: selectedContinent === i ? '#4676ac' : (dark ? '#2a2a2a' : '#ffffff'),
                      color: selectedContinent === i ? '#fff' : (dark ? '#616161' : '#b5bcc4'),
                      border: `2px solid ${selectedContinent === i ? '#4676ac' : (dark ? '#616161' : '#202020')}`,
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, cursor: 'pointer',
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Dates */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <HTextField dark={dark} label="START DATE" placeholder="YYYY-MM-DD" value="2026-01-15" />
              </div>
              <div style={{ flex: 1 }}>
                <HTextField dark={dark} label="END DATE" placeholder="YYYY-MM-DD" value="2026-04-14" />
              </div>
            </div>

            {/* Visibility */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#b5bcc4' : '#616161', display: 'block', marginBottom: 6 }}>
                VISIBILITY
              </label>
              <div style={{ border: `2px solid ${dark ? '#616161' : '#202020'}` }}>
                {['PUBLIC', 'UNLISTED', 'PRIVATE'].map((opt, i) => (
                  <div
                    key={opt}
                    onClick={() => setVisibility(i)}
                    style={{
                      padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                      borderTop: i > 0 ? `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` : 'none',
                      background: visibility === i ? (dark ? 'rgba(172,109,70,0.06)' : 'rgba(172,109,70,0.03)') : (dark ? '#202020' : '#ffffff'),
                    }}
                  >
                    <div
                      style={{
                        width: 14, height: 14,
                        border: `2px solid ${visibility === i ? '#ac6d46' : dark ? '#3a3a3a' : '#b5bcc4'}`,
                        background: visibility === i ? '#ac6d46' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {visibility === i && <div style={{ width: 4, height: 4, background: '#fff' }} />}
                    </div>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: mono, letterSpacing: '0.06em', color: visibility === i ? '#ac6d46' : dark ? '#616161' : '#b5bcc4' }}>
                        {opt}
                      </span>
                      <div style={{ fontSize: 10, color: dark ? '#3a3a3a' : '#b5bcc4', marginTop: 2 }}>
                        {opt === 'PUBLIC' && 'Visible to all explorers'}
                        {opt === 'UNLISTED' && 'Only accessible via direct link'}
                        {opt === 'PRIVATE' && 'Only you can see this'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <HButton variant="copper" style={{ marginBottom: 8 }}>
              NEXT: PLAN ROUTE &rarr;
            </HButton>
          </>
        )}

        {step === 1 && (
          <>
            {/* Step 2: Route Planning */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#e5e5e5' : '#202020', marginBottom: 6 }}>
                ROUTE PLANNING
              </div>
              <div style={{ height: 2, background: dark ? '#616161' : '#202020', marginBottom: 16 }} />
            </div>

            {/* Map area — interactive waypoint placement */}
            <div
              style={{
                height: 240,
                background: dark
                  ? 'linear-gradient(135deg, #0d1a26 0%, #162233 30%, #1a2a3a 60%, #0f1c2a 100%)'
                  : 'linear-gradient(135deg, #c8d8c0 0%, #b8ccb0 30%, #c4d4c0 60%, #d0dcc8 100%)',
                position: 'relative',
                overflow: 'hidden',
                border: `2px solid ${dark ? '#616161' : '#202020'}`,
                marginBottom: 12,
              }}
            >
              {/* Grid */}
              {[...Array(6)].map((_, i) => (
                <div key={`h${i}`} style={{ position: 'absolute', left: 0, right: 0, top: `${(i + 1) * 15}%`, height: 1, background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }} />
              ))}
              {[...Array(8)].map((_, i) => (
                <div key={`v${i}`} style={{ position: 'absolute', top: 0, bottom: 0, left: `${(i + 1) * 11}%`, width: 1, background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }} />
              ))}

              {/* Route with waypoints */}
              <svg width="320" height="200" viewBox="0 0 320 200" fill="none" style={{ position: 'absolute', top: 15, left: 18 }}>
                {/* Route line */}
                <path d="M20 160 C60 120, 80 80, 120 90 S180 50, 220 70 S280 30, 300 40" stroke="#ac6d46" strokeWidth="2.5" fill="none" strokeDasharray="6 4" />

                {/* Origin */}
                <rect x="14" y="154" width="12" height="12" fill="#4676ac" stroke="#fff" strokeWidth="2" />
                <text x="20" y="180" textAnchor="middle" fill={dark ? '#616161' : '#b5bcc4'} fontSize="8" fontWeight="700" fontFamily={mono}>MOSCOW</text>

                {/* Waypoint 1 */}
                <rect x="116" y="84" width="8" height="8" fill="#ac6d46" stroke="#fff" strokeWidth="1.5" />
                <text x="120" y="78" textAnchor="middle" fill={dark ? '#616161' : '#b5bcc4'} fontSize="7" fontWeight="600" fontFamily={mono}>KAZAN</text>

                {/* Waypoint 2 */}
                <rect x="216" y="64" width="8" height="8" fill="#ac6d46" stroke="#fff" strokeWidth="1.5" />
                <text x="220" y="58" textAnchor="middle" fill={dark ? '#616161' : '#b5bcc4'} fontSize="7" fontWeight="600" fontFamily={mono}>IRKUTSK</text>

                {/* Destination */}
                <rect x="294" y="34" width="12" height="12" fill="#598636" stroke="#fff" strokeWidth="2" />
                <text x="300" y="28" textAnchor="middle" fill={dark ? '#616161' : '#b5bcc4'} fontSize="8" fontWeight="700" fontFamily={mono}>VLAD.</text>
              </svg>

              {/* Map controls overlay */}
              <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button style={{ width: 28, height: 28, background: dark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)', border: `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}`, color: dark ? '#e5e5e5' : '#202020', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                <button style={{ width: 28, height: 28, background: dark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)', border: `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}`, color: dark ? '#e5e5e5' : '#202020', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&minus;</button>
              </div>

              {/* Add waypoint hint */}
              <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center' }}>
                <span style={{ background: dark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)', padding: '4px 10px', fontSize: 9, fontFamily: mono, fontWeight: 600, color: dark ? '#b5bcc4' : '#616161' }}>
                  TAP MAP TO ADD WAYPOINT
                </span>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 16, fontSize: 9, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, background: '#4676ac' }} />
                ORIGIN
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, background: '#ac6d46' }} />
                WAYPOINT
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, background: '#598636' }} />
                DESTINATION
              </div>
            </div>

            {/* Search for location */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#b5bcc4' : '#616161', display: 'block', marginBottom: 6 }}>
                SEARCH LOCATION
              </label>
              <div style={{ display: 'flex', gap: 0 }}>
                <div
                  style={{
                    flex: 1, padding: '10px 12px',
                    background: dark ? '#2a2a2a' : '#ffffff',
                    border: `2px solid ${dark ? '#616161' : '#202020'}`, borderRight: 'none',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={dark ? '#616161' : '#b5bcc4'} strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                  </svg>
                  <span style={{ fontSize: 13, color: dark ? '#616161' : '#b5bcc4' }}>Search city or POI...</span>
                </div>
                <button style={{ padding: '10px 14px', background: '#ac6d46', border: '2px solid #ac6d46', color: '#fff', fontSize: 10, fontWeight: 700, fontFamily: mono, cursor: 'pointer' }}>
                  ADD
                </button>
              </div>
            </div>

            {/* Waypoint list */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#b5bcc4' : '#616161', display: 'block', marginBottom: 6 }}>
                WAYPOINTS ({3})
              </label>
              <HCard dark={dark}>
                {[
                  { name: 'Moscow, Russia', type: 'ORIGIN', coords: '55.75N / 37.61E', color: '#4676ac' },
                  { name: 'Kazan, Russia', type: 'WAYPOINT', coords: '55.79N / 49.11E', color: '#ac6d46' },
                  { name: 'Irkutsk, Russia', type: 'WAYPOINT', coords: '52.30N / 104.30E', color: '#ac6d46' },
                ].map((wp, i) => (
                  <div
                    key={wp.name}
                    style={{
                      padding: '12px 14px',
                      borderTop: i > 0 ? `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` : 'none',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}
                  >
                    {/* Drag handle */}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={dark ? '#3a3a3a' : '#b5bcc4'} strokeWidth="2">
                      <circle cx="9" cy="5" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="9" cy="19" r="1" />
                      <circle cx="15" cy="5" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="19" r="1" />
                    </svg>
                    <div style={{ width: 8, height: 8, background: wp.color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: dark ? '#e5e5e5' : '#202020' }}>{wp.name}</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, fontFamily: mono, letterSpacing: '0.04em', color: wp.color }}>{wp.type}</span>
                        <span style={{ fontSize: 9, fontWeight: 600, fontFamily: mono, color: dark ? '#3a3a3a' : '#b5bcc4' }}>{wp.coords}</span>
                      </div>
                    </div>
                    {/* Delete */}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={dark ? '#3a3a3a' : '#b5bcc4'} strokeWidth="2" style={{ cursor: 'pointer' }}>
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </div>
                ))}
              </HCard>

              {/* Add destination */}
              <div
                style={{
                  border: `2px dashed ${dark ? '#3a3a3a' : '#b5bcc4'}`,
                  padding: '12px 14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  cursor: 'pointer',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={dark ? '#3a3a3a' : '#b5bcc4'} strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span style={{ fontSize: 11, fontWeight: 600, color: dark ? '#3a3a3a' : '#b5bcc4' }}>
                  Set destination
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <HButton variant="blue" outline style={{ flex: 1 }}>
                &larr; BACK
              </HButton>
              <HButton variant="copper" style={{ flex: 2 }}>
                NEXT: FUNDING &rarr;
              </HButton>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            {/* Step 3: Funding */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#e5e5e5' : '#202020', marginBottom: 6 }}>
                FUNDING GOAL
              </div>
              <div style={{ height: 2, background: dark ? '#616161' : '#202020', marginBottom: 16 }} />
            </div>

            <HCard dark={dark} style={{ padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ac6d46" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                </svg>
                <span style={{ fontSize: 12, color: dark ? '#b5bcc4' : '#616161', lineHeight: 1.4 }}>
                  Set a funding goal for this expedition. Sponsors will use your account-level sponsorship tiers.
                </span>
              </div>
            </HCard>

            {/* Enable funding toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}`, marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: dark ? '#e5e5e5' : '#202020' }}>
                Enable sponsorship
              </span>
              <div style={{ width: 44, height: 24, background: '#ac6d46', padding: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <div style={{ width: 20, height: 20, background: '#ffffff' }} />
              </div>
            </div>

            <HTextField dark={dark} label="FUNDING GOAL ($)" placeholder="0.00" value="3,500" />

            {/* Your sponsorship tiers — explorer-level, linked not editable here */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#b5bcc4' : '#616161' }}>
                  YOUR SPONSORSHIP TIERS
                </label>
                <span style={{ fontSize: 10, fontWeight: 700, fontFamily: mono, color: '#ac6d46', cursor: 'pointer' }}>
                  MANAGE &rarr;
                </span>
              </div>
              <div style={{ height: 2, background: dark ? '#616161' : '#202020', marginBottom: 10 }} />

              {/* One-time tiers */}
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#616161' : '#b5bcc4', marginBottom: 6 }}>
                ONE-TIME
              </div>
              <HCard dark={dark} style={{ marginBottom: 10 }}>
                {[
                  { name: 'Torchbearer', amount: '$5', enabled: true },
                  { name: 'Trail Guide', amount: '$25', enabled: true },
                  { name: 'Pathfinder', amount: '$75', enabled: true },
                  { name: 'Navigator', amount: '$250', enabled: false },
                  { name: 'Expedition Patron', amount: '$500', enabled: false },
                ].map((tier, i) => (
                  <div
                    key={tier.name}
                    style={{
                      padding: '10px 14px',
                      borderTop: i > 0 ? `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      opacity: tier.enabled ? 1 : 0.4,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 6, height: 6, background: tier.enabled ? '#598636' : (dark ? '#3a3a3a' : '#b5bcc4') }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: dark ? '#e5e5e5' : '#202020' }}>{tier.name}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, fontFamily: mono, color: '#ac6d46' }}>{tier.amount}</span>
                  </div>
                ))}
              </HCard>

              {/* Monthly tiers */}
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#616161' : '#b5bcc4', marginBottom: 6 }}>
                MONTHLY
              </div>
              <HCard dark={dark}>
                {[
                  { name: 'Fellow Traveler', amount: '$5/mo', enabled: true },
                  { name: 'Journey Partner', amount: '$15/mo', enabled: true },
                  { name: 'Expedition Ally', amount: '$50/mo', enabled: false },
                ].map((tier, i) => (
                  <div
                    key={tier.name}
                    style={{
                      padding: '10px 14px',
                      borderTop: i > 0 ? `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      opacity: tier.enabled ? 1 : 0.4,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 6, height: 6, background: tier.enabled ? '#598636' : (dark ? '#3a3a3a' : '#b5bcc4') }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: dark ? '#e5e5e5' : '#202020' }}>{tier.name}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, fontFamily: mono, color: '#4676ac' }}>{tier.amount}</span>
                  </div>
                ))}
              </HCard>
            </div>

            {/* Payout method */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#b5bcc4' : '#616161', display: 'block', marginBottom: 6 }}>
                PAYOUT METHOD
              </label>
              <HCard dark={dark} style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#598636" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: dark ? '#e5e5e5' : '#202020' }}>
                      Stripe Connect linked
                    </div>
                    <div style={{ fontSize: 10, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4', marginTop: 2 }}>
                      Payouts to ****4242
                    </div>
                  </div>
                </div>
              </HCard>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <HButton variant="blue" outline style={{ flex: 1 }}>
                &larr; BACK
              </HButton>
              <HButton variant="copper" style={{ flex: 2 }}>
                NEXT: REVIEW &rarr;
              </HButton>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            {/* Step 4: Review */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#e5e5e5' : '#202020', marginBottom: 6 }}>
                REVIEW EXPEDITION
              </div>
              <div style={{ height: 2, background: dark ? '#616161' : '#202020', marginBottom: 16 }} />
            </div>

            {/* Preview card */}
            <HCard dark={dark}>
              <ImagePlaceholder
                height={120}
                dark={dark}
                gradient={dark
                  ? 'linear-gradient(135deg, #1a2a3a 0%, #2a3a4a 40%, #3a2a2a 100%)'
                  : 'linear-gradient(135deg, #c4b8a8 0%, #b8aca0 40%, #ccc0b0 100%)'
                }
              />
              <div style={{ padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: dark ? '#e5e5e5' : '#202020', lineHeight: 1.2 }}>
                      Trans-Siberian Journey
                    </div>
                    <div style={{ fontSize: 10, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4', marginTop: 4 }}>
                      OVERLAND &middot; ASIA
                    </div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, fontFamily: mono, letterSpacing: '0.04em', color: '#4676ac', padding: '3px 8px', border: '1px solid #4676ac' }}>
                    PLANNED
                  </span>
                </div>

                <div style={{ marginTop: 12, fontSize: 13, color: dark ? '#b5bcc4' : '#616161', lineHeight: 1.5 }}>
                  A 90-day overland journey across Russia via the Trans-Siberian Railway...
                </div>

                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 10, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4' }}>
                    <span>Jan 15 &rarr; Apr 14, 2026</span>
                    <span>&middot;</span>
                    <span>90 days</span>
                    <span>&middot;</span>
                    <span>3 waypoints</span>
                  </div>
                </div>

                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` }}>
                  <div style={{ fontSize: 10, fontFamily: mono, fontWeight: 700, color: '#ac6d46', letterSpacing: '0.04em', marginBottom: 6 }}>
                    FUNDING GOAL
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: mono, color: dark ? '#e5e5e5' : '#202020' }}>
                    $3,500
                  </div>
                  <div style={{ fontSize: 10, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4', marginTop: 2 }}>
                    4 sponsorship tiers
                  </div>
                </div>
              </div>
            </HCard>

            {/* Route preview */}
            <div
              style={{
                height: 100,
                background: dark
                  ? 'linear-gradient(135deg, #0d1a26 0%, #1a2a3a 60%, #0f1c2a 100%)'
                  : 'linear-gradient(135deg, #c8d8c0 0%, #c4d4c0 60%, #d0dcc8 100%)',
                position: 'relative',
                overflow: 'hidden',
                border: `2px solid ${dark ? '#616161' : '#202020'}`,
                marginBottom: 16,
              }}
            >
              <svg width="320" height="70" viewBox="0 0 320 70" fill="none" style={{ position: 'absolute', top: 12, left: 18 }}>
                <path d="M10 50 C60 30, 100 40, 160 25 S240 20, 300 15" stroke="#ac6d46" strokeWidth="2" fill="none" />
                <rect x="6" y="46" width="8" height="8" fill="#4676ac" stroke="#fff" strokeWidth="1.5" />
                <rect x="156" y="21" width="6" height="6" fill="#ac6d46" stroke="#fff" strokeWidth="1" />
                <rect x="294" y="11" width="8" height="8" fill="#598636" stroke="#fff" strokeWidth="1.5" />
              </svg>
              <div style={{ position: 'absolute', bottom: 6, right: 8, fontSize: 8, fontFamily: mono, fontWeight: 600, color: dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }}>
                MOSCOW &rarr; VLADIVOSTOK
              </div>
            </div>

            {/* Checklist */}
            <HCard dark={dark} style={{ marginBottom: 24 }}>
              <div style={{ padding: '10px 14px', borderBottom: `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` }}>
                <span style={{ fontSize: 10, fontWeight: 700, fontFamily: mono, letterSpacing: '0.06em', color: dark ? '#e5e5e5' : '#202020' }}>
                  LAUNCH CHECKLIST
                </span>
              </div>
              {[
                { label: 'Expedition name', done: true },
                { label: 'Cover image', done: false },
                { label: 'Description', done: true },
                { label: 'Route with waypoints', done: true },
                { label: 'Funding goal', done: true },
                { label: 'Dates set', done: true },
              ].map((item, i) => (
                <div
                  key={item.label}
                  style={{
                    padding: '10px 14px',
                    borderTop: i > 0 ? `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` : 'none',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 16, height: 16,
                      border: `2px solid ${item.done ? '#598636' : (dark ? '#3a3a3a' : '#b5bcc4')}`,
                      background: item.done ? '#598636' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {item.done && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: item.done ? (dark ? '#e5e5e5' : '#202020') : (dark ? '#616161' : '#b5bcc4') }}>
                    {item.label}
                  </span>
                  {!item.done && (
                    <span style={{ fontSize: 10, fontWeight: 700, fontFamily: mono, color: '#ac6d46', marginLeft: 'auto', cursor: 'pointer' }}>
                      ADD
                    </span>
                  )}
                </div>
              ))}
            </HCard>

            <HButton variant="copper" style={{ marginBottom: 8 }}>
              LAUNCH EXPEDITION
            </HButton>
            <HButton variant="copper" outline>
              SAVE AS DRAFT
            </HButton>
          </>
        )}
      </div>

      <div style={{ height: 32 }} />
    </div>
  )
}
