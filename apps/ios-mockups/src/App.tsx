import { useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { IPhoneFrame } from './components/IPhoneFrame'
import { TabBar } from './components/TabBar'
import { LoginScreen } from './screens/LoginScreen'
import { HomeScreen } from './screens/HomeScreen'
import { ExpeditionDetailScreen } from './screens/ExpeditionDetailScreen'
import { ExplorerProfileScreen } from './screens/ExplorerProfileScreen'
import { EntryDetailScreen } from './screens/EntryDetailScreen'
import { DiscoverScreen } from './screens/DiscoverScreen'
import { NotificationsScreen } from './screens/NotificationsScreen'
import { EntryEditorScreen } from './screens/EntryEditorScreen'
import { MessagingScreen } from './screens/MessagingScreen'
import { SponsorshipScreen } from './screens/SponsorshipScreen'
import { ExpeditionBuilderScreen } from './screens/ExpeditionBuilderScreen'
import { SponsorshipManagementScreen } from './screens/SponsorshipManagementScreen'
import { LaunchScreen } from './screens/LaunchScreen'
import { MenuScreen } from './screens/MenuScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { BookmarksScreen } from './screens/BookmarksScreen'

const screens = [
  { path: '/launch', label: 'Launch' },
  { path: '/', label: 'Home Feed' },
  { path: '/login', label: 'Login' },
  { path: '/discover', label: 'Discover' },
  { path: '/expedition', label: 'Expedition Detail' },
  { path: '/profile', label: 'Explorer Profile' },
  { path: '/entry', label: 'Entry Detail' },
  { path: '/notifications', label: 'Notifications' },
  { path: '/create', label: 'Entry Editor' },
  { path: '/build', label: 'Expedition Builder' },
  { path: '/sponsorships', label: 'Sponsorship Mgmt' },
  { path: '/messages', label: 'Messaging' },
  { path: '/sponsor', label: 'Sponsor Flow' },
  { path: '/menu', label: 'Menu' },
  { path: '/settings', label: 'Settings' },
  { path: '/bookmarks', label: 'Bookmarks' },
]

export default function App() {
  const [dark, setDark] = useState(true)
  const location = useLocation()

  const isLaunch = location.pathname === '/launch'

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#12121a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px',
        gap: 20,
      }}
    >
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: '#e5e5e5',
            margin: 0,
          }}
        >
          HEIMURSAGA iOS
        </h1>

        {/* Dark mode toggle */}
        <button
          onClick={() => setDark(!dark)}
          style={{
            padding: '6px 16px',
            background: dark ? '#ac6d46' : '#2a2a2a',
            color: '#fff',
            border: '2px solid #616161',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.05em',
            cursor: 'pointer',
          }}
        >
          {dark ? 'LIGHT MODE' : 'DARK MODE'}
        </button>
      </div>

      {/* Screen Navigation */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 500 }}>
        {screens.map((s) => (
          <a
            key={s.path}
            href={s.path}
            style={{
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: location.pathname === s.path ? 700 : 400,
              color: location.pathname === s.path ? '#ac6d46' : '#616161',
              textDecoration: 'none',
              border: `1px solid ${location.pathname === s.path ? '#ac6d46' : '#333'}`,
              background: location.pathname === s.path ? 'rgba(172,109,70,0.15)' : 'transparent',
            }}
          >
            {s.label}
          </a>
        ))}
      </div>

      {/* iPhone */}
      <IPhoneFrame dark={dark} hideTabBar={isLaunch}>
        <Routes>
          <Route path="/" element={<HomeScreen dark={dark} />} />
          <Route path="/login" element={<LoginScreen dark={dark} />} />
          <Route path="/discover" element={<DiscoverScreen dark={dark} />} />
          <Route path="/expedition" element={<ExpeditionDetailScreen dark={dark} />} />
          <Route path="/profile" element={<ExplorerProfileScreen dark={dark} />} />
          <Route path="/entry" element={<EntryDetailScreen dark={dark} />} />
          <Route path="/notifications" element={<NotificationsScreen dark={dark} />} />
          <Route path="/create" element={<EntryEditorScreen dark={dark} />} />
          <Route path="/messages" element={<MessagingScreen dark={dark} />} />
          <Route path="/sponsor" element={<SponsorshipScreen dark={dark} />} />
          <Route path="/build" element={<ExpeditionBuilderScreen dark={dark} />} />
          <Route path="/sponsorships" element={<SponsorshipManagementScreen dark={dark} />} />
          <Route path="/launch" element={<LaunchScreen dark={dark} />} />
          <Route path="/menu" element={<MenuScreen dark={dark} />} />
          <Route path="/settings" element={<SettingsScreen dark={dark} />} />
          <Route path="/settings/*" element={<SettingsScreen dark={dark} />} />
          <Route path="/bookmarks" element={<BookmarksScreen dark={dark} />} />
        </Routes>
        {!isLaunch && <TabBar dark={dark} />}
      </IPhoneFrame>
    </div>
  )
}
