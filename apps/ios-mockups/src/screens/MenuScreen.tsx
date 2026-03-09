import { useNavigate } from 'react-router-dom'
import { Avatar, HCard, NavBar } from '../components/shared'

const mono = 'ui-monospace, SFMono-Regular, monospace'

interface MenuItem {
  label: string
  detail?: string
  path?: string
  icon: JSX.Element
  badge?: number
  accent?: string
}

const bookmarkIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
)

const messageIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

const sponsorIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
)

const buildIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
)

const settingsIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

const profileIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const aboutIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
)

const logoutIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

const insightsIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
)

export function MenuScreen({ dark }: { dark: boolean }) {
  const navigate = useNavigate()

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'NAVIGATION',
      items: [
        { label: 'Bookmarks', detail: '14 saved', path: '/bookmarks', icon: bookmarkIcon },
        { label: 'Messages', detail: '1 unread', path: '/messages', icon: messageIcon, badge: 1 },
        { label: 'Sponsorships', detail: 'Manage & track', path: '/sponsorships', icon: sponsorIcon, accent: '#598636' },
        { label: 'Expedition Builder', detail: 'Plan a new expedition', path: '/build', icon: buildIcon, accent: '#4676ac' },
      ],
    },
    {
      title: 'ACCOUNT',
      items: [
        { label: 'Edit Profile', detail: 'Username, bio, avatar', path: '/settings/profile', icon: profileIcon },
        { label: 'Settings', detail: 'Notifications, privacy, billing', path: '/settings', icon: settingsIcon },
        { label: 'Insights', detail: 'Your exploration stats', path: '/settings/insights', icon: insightsIcon },
      ],
    },
    {
      title: 'MORE',
      items: [
        { label: 'About Heimursaga', path: '/about', icon: aboutIcon },
        { label: 'Log Out', icon: logoutIcon, accent: '#994040' },
      ],
    },
  ]

  return (
    <div>
      <NavBar dark={dark} onBack={() => navigate(-1)} title="MENU" />

      {/* User card */}
      <div style={{ padding: '16px' }}>
        <HCard dark={dark}>
          <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar size={48} name="E" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: dark ? '#e5e5e5' : '#202020' }}>
                explorer_name
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#ac6d46', fontFamily: mono, marginTop: 3 }}>
                EXPLORER PRO
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={dark ? '#616161' : '#b5bcc4'} strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </HCard>
      </div>

      {/* Menu sections */}
      {sections.map((section) => (
        <div key={section.title}>
          <div style={{ padding: '0 16px', marginBottom: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: dark ? '#616161' : '#b5bcc4', fontFamily: mono }}>
              {section.title}
            </div>
            <div style={{ height: 2, background: dark ? '#616161' : '#202020', marginTop: 4 }} />
          </div>
          <div style={{ padding: '0 16px', marginBottom: 16 }}>
            <HCard dark={dark}>
              {section.items.map((item, i) => (
                <div
                  key={item.label}
                  onClick={() => item.path && navigate(item.path)}
                  style={{
                    padding: '12px 14px',
                    borderTop: i > 0 ? `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    cursor: item.path ? 'pointer' : 'default',
                  }}
                >
                  <div style={{ color: item.accent || (dark ? '#616161' : '#b5bcc4'), flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: item.accent || (dark ? '#e5e5e5' : '#202020') }}>
                      {item.label}
                    </div>
                    {item.detail && (
                      <div style={{ fontSize: 11, color: dark ? '#616161' : '#b5bcc4', marginTop: 1 }}>
                        {item.detail}
                      </div>
                    )}
                  </div>
                  {item.badge && item.badge > 0 && (
                    <span style={{
                      background: '#ac6d46', color: '#fff', fontSize: 9, fontWeight: 700,
                      width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: mono, flexShrink: 0,
                    }}>
                      {item.badge}
                    </span>
                  )}
                  {item.path && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={dark ? '#3a3a3a' : '#e5e5e5'} strokeWidth="2" style={{ flexShrink: 0 }}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  )}
                </div>
              ))}
            </HCard>
          </div>
        </div>
      ))}

      <div style={{ height: 32 }} />
    </div>
  )
}
