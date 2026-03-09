import { Avatar, HCard, SectionDivider } from '../components/shared'

const mono = 'ui-monospace, SFMono-Regular, monospace'

const notifications = [
  {
    group: 'TODAY',
    items: [
      { user: 'sarah_trails', action: 'sponsored your expedition', amount: '$25', detail: 'Trans-Siberian Journey', time: '2h ago', unread: true },
      { user: 'mountain_fox', action: 'left a note on your entry', detail: 'The Shores of Baikal', time: '4h ago', unread: true },
      { user: 'reader_one', action: 'started following you', time: '6h ago', unread: true },
    ],
  },
  {
    group: 'YESTERDAY',
    items: [
      { user: 'hiker_dan', action: 'bookmarked your entry', detail: 'Crossing Mongolia', time: '1d ago', unread: false },
      { user: 'travel_fund', action: 'sponsored your expedition', amount: '$50', detail: 'Trans-Siberian Journey', time: '1d ago', unread: false },
    ],
  },
  {
    group: 'EARLIER',
    items: [
      { user: 'arctic_wolf', action: 'started following you', time: '3d ago', unread: false },
      { user: 'nomad_life', action: 'bookmarked your entry', detail: 'First Steps in Siberia', time: '4d ago', unread: false },
    ],
  },
]

export function NotificationsScreen({ dark }: { dark: boolean }) {
  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px', borderBottom: `3px solid #ac6d46`, background: '#202020',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.15em', color: '#e5e5e5', fontFamily: mono }}>
          NOTIFICATIONS
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#ac6d46', fontFamily: mono, cursor: 'pointer' }}>
          MARK ALL READ
        </span>
      </div>

      {notifications.map((group) => (
        <div key={group.group}>
          <SectionDivider title={group.group} dark={dark} />
          <div style={{ padding: '0 16px' }}>
            <HCard dark={dark}>
              {group.items.map((notif, i) => (
                <div
                  key={i}
                  style={{
                    padding: '12px 14px',
                    borderTop: i > 0 ? `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` : 'none',
                    display: 'flex', gap: 10,
                    background: notif.unread ? (dark ? 'rgba(172,109,70,0.06)' : 'rgba(172,109,70,0.03)') : 'transparent',
                  }}
                >
                  <div style={{ width: 6, paddingTop: 8, flexShrink: 0 }}>
                    {notif.unread && <div style={{ width: 6, height: 6, background: '#ac6d46' }} />}
                  </div>
                  <Avatar size={32} name={notif.user.charAt(0).toUpperCase()} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: dark ? '#e5e5e5' : '#202020', lineHeight: 1.4 }}>
                      <span style={{ color: '#ac6d46', fontWeight: 600 }}>{notif.user}</span>{' '}
                      {notif.action}
                      {notif.amount && <span style={{ fontWeight: 700, color: '#598636', fontFamily: mono }}> {notif.amount}</span>}
                    </div>
                    {notif.detail && (
                      <div style={{ fontSize: 11, color: dark ? '#616161' : '#b5bcc4', fontStyle: 'italic', marginTop: 2 }}>
                        {notif.detail}
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: dark ? '#616161' : '#b5bcc4', fontFamily: mono, fontWeight: 600, marginTop: 4 }}>
                      {notif.time}
                    </div>
                  </div>
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
