import { useNavigate } from 'react-router-dom'
import { Avatar, HCard, NavBar } from '../components/shared'

const mono = 'ui-monospace, SFMono-Regular, monospace'

const settingsSections = [
  {
    title: 'PROFILE',
    items: [
      { label: 'Username', value: 'explorer_name' },
      { label: 'Display Name', value: 'Explorer Name' },
      { label: 'Bio', value: 'Long-distance overland traveler...' },
      { label: 'Location', value: 'Portland, OR' },
    ],
  },
  {
    title: 'PREFERENCES',
    items: [
      { label: 'Distance Units', value: 'Metric (km)' },
      { label: 'Theme', value: 'Dark' },
      { label: 'Notifications', value: 'All enabled' },
    ],
  },
  {
    title: 'PRIVACY & SECURITY',
    items: [
      { label: 'Profile Visibility', value: 'Public' },
      { label: 'Email', value: 'e***r@mail.com' },
      { label: 'Password', value: 'Change password' },
    ],
  },
  {
    title: 'BILLING',
    items: [
      { label: 'Plan', value: 'Explorer Pro — $8/mo' },
      { label: 'Payment Method', value: '•••• 4242' },
      { label: 'Next Billing', value: 'Apr 3, 2026' },
    ],
  },
]

export function SettingsScreen({ dark }: { dark: boolean }) {
  const navigate = useNavigate()

  return (
    <div>
      <NavBar dark={dark} onBack={() => navigate(-1)} title="SETTINGS" />

      {/* Profile header */}
      <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <Avatar size={56} name="E" />
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: dark ? '#e5e5e5' : '#202020' }}>
            explorer_name
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#ac6d46', fontFamily: mono, marginTop: 3 }}>
            EXPLORER PRO
          </div>
          <div style={{ fontSize: 11, color: dark ? '#616161' : '#b5bcc4', marginTop: 2 }}>
            Member since Jan 2025
          </div>
        </div>
      </div>

      {settingsSections.map((section) => (
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
                  style={{
                    padding: '12px 14px',
                    borderTop: i > 0 ? `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: dark ? '#e5e5e5' : '#202020' }}>
                    {item.label}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: dark ? '#616161' : '#b5bcc4' }}>
                      {item.value}
                    </span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={dark ? '#3a3a3a' : '#e5e5e5'} strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </div>
              ))}
            </HCard>
          </div>
        </div>
      ))}

      {/* Danger zone */}
      <div style={{ padding: '0 16px', marginBottom: 6 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#994040', fontFamily: mono }}>
          DANGER ZONE
        </div>
        <div style={{ height: 2, background: '#994040', marginTop: 4 }} />
      </div>
      <div style={{ padding: '0 16px', marginBottom: 16 }}>
        <HCard dark={dark}>
          <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#994040' }}>Delete Account</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#994040" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </HCard>
      </div>

      <div style={{ height: 32 }} />
    </div>
  )
}
