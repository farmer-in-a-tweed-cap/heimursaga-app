import { useNavigate, useLocation } from 'react-router-dom'

const tabs = [
  { path: '/', icon: 'globe', label: 'Explore' },
  { path: '/discover', icon: 'search', label: 'Discover' },
  { path: '/create', icon: 'plus', label: 'Log Entry' },
  { path: '/notifications', icon: 'bell', label: 'Alerts' },
  { path: '/profile', icon: 'person', label: 'Journal' },
]

const icons: Record<string, (active: boolean) => JSX.Element> = {
  globe: (a) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.5 : 1.5}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2c2.5 2.8 4 6.2 4 10s-1.5 7.2-4 10c-2.5-2.8-4-6.2-4-10s1.5-7.2 4-10z" />
    </svg>
  ),
  search: (a) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={a ? 2.5 : 1.5}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  plus: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
    </svg>
  ),
  bell: (a) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={a ? 0 : 1.5}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  person: (a) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={a ? 0 : 1.5}>
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
  ),
}

export function TabBar({ dark }: { dark: boolean }) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 83,
        background: dark ? '#202020' : '#ffffff',
        borderTop: `2px solid ${dark ? '#616161' : '#202020'}`,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-around',
        paddingTop: 8,
        paddingBottom: 34,
        zIndex: 40,
      }}
    >
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path
        const color = isActive ? '#ac6d46' : dark ? '#b5bcc4' : '#616161'
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              color,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontSize: 10,
              fontWeight: isActive ? 700 : 600,
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            }}
          >
            {icons[tab.icon](isActive)}
            <span>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
