import { useNavigate } from 'react-router-dom'
import { Avatar, HCard, NavBar, ImagePlaceholder, StatusHeader, StatsBar } from '../components/shared'

const mono = 'ui-monospace, SFMono-Regular, monospace'

const bookmarkedExpeditions = [
  {
    title: 'Silk Road Revival',
    explorer: 'silk_wanderer',
    status: 'active' as const,
    category: 'OVERLAND',
    stats: { days: '120', raised: '$4.1K', sponsors: '28' },
  },
  {
    title: 'Nordic Coastal Trail',
    explorer: 'arctic_wolf',
    status: 'planned' as const,
    category: 'TRAIL',
    stats: { days: '45', raised: '$1.2K', sponsors: '8' },
  },
]

const bookmarkedEntries = [
  {
    title: 'Sunrise Over the Steppe',
    explorer: 'nomad_life',
    expedition: 'Mongolia Crossing',
    location: 'Khustain Nuruu, Mongolia',
    coords: '47.70N / 106.00E',
    date: 'Feb 24',
  },
  {
    title: 'The Last Village Before the Pass',
    explorer: 'mountain_fox',
    expedition: 'Patagonia Trail Run',
    location: 'El Chaltén, Argentina',
    coords: '49.33S / 72.89W',
    date: 'Feb 18',
  },
]

export function BookmarksScreen({ dark }: { dark: boolean }) {
  const navigate = useNavigate()

  return (
    <div>
      <NavBar dark={dark} onBack={() => navigate(-1)} title="BOOKMARKS" />

      {/* Expeditions */}
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: dark ? '#616161' : '#b5bcc4', fontFamily: mono }}>
          EXPEDITIONS &middot; 2
        </div>
        <div style={{ height: 2, background: dark ? '#616161' : '#202020', marginTop: 4 }} />
      </div>

      <div style={{ padding: '8px 16px 0' }}>
        {bookmarkedExpeditions.map((exp) => (
          <HCard key={exp.title} dark={dark}>
            <StatusHeader status={exp.status} label="EXPEDITION" right={exp.category} dark={dark} />
            <div style={{ display: 'flex' }}>
              <div style={{ width: 90, flexShrink: 0 }}>
                <ImagePlaceholder height={80} dark={dark} />
              </div>
              <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: dark ? '#e5e5e5' : '#202020', lineHeight: 1.2 }}>
                    {exp.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                    <Avatar size={16} name={exp.explorer.charAt(0).toUpperCase()} />
                    <span style={{ fontSize: 11, color: '#ac6d46', fontWeight: 600 }}>{exp.explorer}</span>
                  </div>
                </div>
                <div style={{ fontSize: 9, color: dark ? '#616161' : '#b5bcc4', fontFamily: mono, fontWeight: 600 }}>
                  {exp.stats.days} DAYS &middot; {exp.stats.raised} &middot; {exp.stats.sponsors} SPONSORS
                </div>
              </div>
            </div>
          </HCard>
        ))}
      </div>

      {/* Entries */}
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: dark ? '#616161' : '#b5bcc4', fontFamily: mono }}>
          ENTRIES &middot; 2
        </div>
        <div style={{ height: 2, background: dark ? '#616161' : '#202020', marginTop: 4 }} />
      </div>

      <div style={{ padding: '8px 16px 0' }}>
        {bookmarkedEntries.map((entry) => (
          <HCard key={entry.title} dark={dark}>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: dark ? '#e5e5e5' : '#202020', lineHeight: 1.2 }}>
                {entry.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <Avatar size={16} name={entry.explorer.charAt(0).toUpperCase()} />
                <span style={{ fontSize: 11, color: '#ac6d46', fontWeight: 600 }}>{entry.explorer}</span>
                <span style={{ fontSize: 11, color: dark ? '#616161' : '#b5bcc4' }}>&middot; {entry.expedition}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 10, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4' }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ flexShrink: 0 }}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                {entry.location}
                <span>&middot;</span>
                <span style={{ color: '#4676ac' }}>{entry.coords}</span>
              </div>
              <div style={{ fontSize: 9, color: dark ? '#616161' : '#b5bcc4', fontFamily: mono, fontWeight: 600, marginTop: 6 }}>
                {entry.date}
              </div>
            </div>
          </HCard>
        ))}
      </div>

      <div style={{ height: 32 }} />
    </div>
  )
}
