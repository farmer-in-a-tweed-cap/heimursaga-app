import { useState } from 'react'
import { Avatar, HCard, SectionDivider, SegmentedControl, HButton, StatusHeader } from '../components/shared'

const mono = 'ui-monospace, SFMono-Regular, monospace'

export function DiscoverScreen({ dark }: { dark: boolean }) {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div>
      {/* Header — dark bg like web */}
      <div style={{ padding: '12px 16px', borderBottom: `3px solid #ac6d46`, background: '#202020' }}>
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.15em', color: '#e5e5e5', fontFamily: mono }}>
          DISCOVER
        </span>
      </div>

      {/* Search */}
      <div style={{ padding: '12px 16px 0' }}>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
            background: dark ? '#2a2a2a' : '#ffffff',
            border: `2px solid ${dark ? '#616161' : '#202020'}`,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={dark ? '#616161' : '#b5bcc4'} strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <span style={{ fontSize: 13, color: dark ? '#616161' : '#b5bcc4' }}>
            Search explorers, expeditions, entries...
          </span>
        </div>
      </div>

      {/* Filter */}
      <div style={{ padding: '12px 16px 0' }}>
        <SegmentedControl options={['ALL', 'EXPEDITIONS', 'EXPLORERS']} active={activeTab} dark={dark} />
      </div>

      {/* Trending */}
      <SectionDivider title="TRENDING EXPEDITIONS" dark={dark} />
      <div style={{ padding: '0 16px' }}>
        <HCard dark={dark}>
          {[
            { rank: 1, name: 'Pacific Crest Trail', user: 'hiker_jones', status: 'active' as const, sponsors: 42, followers: 156 },
            { rank: 2, name: 'Silk Road by Bicycle', user: 'cyclist_ko', status: 'active' as const, sponsors: 28, followers: 94 },
            { rank: 3, name: 'Nordic Fjords Sailing', user: 'sailor_erik', status: 'planned' as const, sponsors: 15, followers: 67 },
          ].map((item, i) => (
            <div key={item.rank} style={{ padding: '12px 14px', borderTop: i > 0 ? `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` : 'none', display: 'flex', gap: 12 }}>
              <div
                style={{
                  width: 28, height: 28,
                  background: i === 0 ? '#ac6d46' : dark ? '#2a2a2a' : '#f5f5f5',
                  border: `2px solid ${i === 0 ? '#ac6d46' : dark ? '#616161' : '#e5e5e5'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: i === 0 ? '#fff' : dark ? '#616161' : '#b5bcc4',
                  fontSize: 12, fontWeight: 700, fontFamily: mono, flexShrink: 0,
                }}
              >
                {item.rank}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: dark ? '#e5e5e5' : '#202020' }}>{item.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, fontSize: 11 }}>
                  <span style={{ color: '#ac6d46', fontWeight: 600 }}>{item.user}</span>
                  <span style={{ width: 6, height: 6, background: item.status === 'active' ? '#598636' : '#4676ac', display: 'inline-block' }} />
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: item.status === 'active' ? '#598636' : '#4676ac', fontFamily: mono }}>
                    {item.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: 10, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4', marginTop: 4 }}>
                  {item.sponsors} sponsors &middot; {item.followers} followers
                </div>
              </div>
            </div>
          ))}
        </HCard>
      </div>

      {/* Featured Explorers */}
      <SectionDivider title="FEATURED EXPLORERS" dark={dark} />
      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { name: 'mountain_explorer', expeditions: 4, followers: 156 },
            { name: 'ocean_nomad', expeditions: 2, followers: 89 },
          ].map((explorer) => (
            <HCard key={explorer.name} dark={dark} style={{ flex: 1 }}>
              <div style={{ padding: '14px 10px', textAlign: 'center' }}>
                <Avatar size={44} name={explorer.name.charAt(0).toUpperCase()} />
                <div style={{ fontSize: 11, color: '#ac6d46', fontWeight: 600, marginTop: 8 }}>
                  {explorer.name.slice(0, 12)}
                </div>
                <div style={{ fontSize: 9, color: dark ? '#616161' : '#b5bcc4', fontFamily: mono, marginTop: 3, fontWeight: 600 }}>
                  {explorer.expeditions} exped. &middot; {explorer.followers} followers
                </div>
                <div style={{ marginTop: 10 }}>
                  <HButton variant="blue" small>FOLLOW</HButton>
                </div>
              </div>
            </HCard>
          ))}
        </div>
      </div>

      {/* Recent Entries */}
      <SectionDivider title="RECENT JOURNAL ENTRIES" dark={dark} />
      <div style={{ padding: '0 16px' }}>
        <HCard dark={dark}>
          <StatusHeader status="active" label="JOURNAL ENTRY" right="FEB 28" dark={dark} />
          <div style={{ padding: '12px 14px' }}>
            <div style={{ position: 'relative', paddingLeft: 20 }}>
              <span style={{ position: 'absolute', left: 0, top: -4, fontSize: 32, color: dark ? '#3a3a3a' : '#e5e5e5', fontFamily: 'Georgia, serif', lineHeight: 1 }}>
                &ldquo;
              </span>
              <div style={{ fontSize: 14, color: dark ? '#e5e5e5' : '#202020', lineHeight: 1.7, fontStyle: 'italic' }}>
                The desert stretched on forever, sand dunes shifting colors as the sun
                moved across the cloudless sky...
              </div>
            </div>
            <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` }}>
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
    </div>
  )
}
