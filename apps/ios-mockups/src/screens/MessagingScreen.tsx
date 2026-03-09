import { useState } from 'react'
import { Avatar, HCard, NavBar } from '../components/shared'

const mono = 'ui-monospace, SFMono-Regular, monospace'

const conversations = [
  { user: 'sarah_trails', message: 'Thanks for the tip about the hostel!', time: '2h ago', unread: 1 },
  { user: 'mountain_fox', message: 'See you at the checkpoint tomorrow', time: '1d ago', unread: 0 },
  { user: 'ocean_nomad', message: 'Great photos from your last entry!', time: '3d ago', unread: 0 },
]

const messages = [
  { from: 'them', text: 'Hey! Are you near Irkutsk right now?', time: '10:32 AM' },
  { from: 'me', text: 'Yes! Just arrived yesterday.', time: '10:45 AM' },
  { from: 'them', text: 'Amazing. I stayed at a great hostel there — Baikaler. Super cheap and right on the river.', time: '10:48 AM' },
  { from: 'me', text: 'Thanks for the tip about the hostel!', time: '11:02 AM' },
]

export function MessagingScreen({ dark }: { dark: boolean }) {
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null)

  if (selectedConvo) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <NavBar dark={dark} onBack={() => setSelectedConvo(null)} title={`${selectedConvo}`} />

        <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.from === 'me' ? 'flex-end' : 'flex-start' }}>
              <div
                style={{
                  maxWidth: '78%', padding: '10px 12px',
                  background: msg.from === 'me'
                    ? (dark ? '#2a2a2a' : '#ffffff')
                    : (dark ? '#1a2a3a' : '#e8eef4'),
                  border: msg.from === 'me'
                    ? `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}`
                    : `1px solid ${dark ? '#2a4060' : '#c8d8e8'}`,
                  fontSize: 14, lineHeight: 1.5, color: dark ? '#e5e5e5' : '#202020',
                }}
              >
                {msg.text}
                <div style={{ fontSize: 9, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4', marginTop: 4, textAlign: msg.from === 'me' ? 'right' : 'left' }}>
                  {msg.time}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '10px 16px', background: dark ? '#202020' : '#ffffff', borderTop: `2px solid ${dark ? '#616161' : '#202020'}`, display: 'flex', gap: 0 }}>
          <input
            placeholder="Write message..."
            style={{ flex: 1, padding: '10px 12px', background: dark ? '#2a2a2a' : '#f5f5f5', border: `2px solid ${dark ? '#616161' : '#202020'}`, borderRight: 'none', color: dark ? '#e5e5e5' : '#202020', fontSize: 14, outline: 'none' }}
          />
          <button style={{ padding: '10px 16px', background: '#ac6d46', border: '2px solid #ac6d46', color: '#fff', fontSize: 10, fontWeight: 700, fontFamily: mono, cursor: 'pointer' }}>
            SEND
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '3px solid #ac6d46', background: '#202020' }}>
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.15em', color: '#e5e5e5', fontFamily: mono }}>
          MESSAGES
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ac6d46" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </div>

      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: dark ? '#2a2a2a' : '#ffffff', border: `2px solid ${dark ? '#616161' : '#202020'}` }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={dark ? '#616161' : '#b5bcc4'} strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <span style={{ fontSize: 13, color: dark ? '#616161' : '#b5bcc4' }}>Search conversations...</span>
        </div>
      </div>

      <div style={{ padding: '12px 16px' }}>
        <HCard dark={dark}>
          {conversations.map((convo, i) => (
            <div
              key={convo.user}
              onClick={() => setSelectedConvo(convo.user)}
              style={{ padding: '14px', borderTop: i > 0 ? `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` : 'none', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
            >
              <Avatar size={36} name={convo.user.charAt(0).toUpperCase()} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 12, color: '#ac6d46', fontWeight: 600 }}>{convo.user}</span>
                  <span style={{ fontSize: 9, color: dark ? '#616161' : '#b5bcc4', fontFamily: mono, fontWeight: 600 }}>{convo.time}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
                  <span style={{ fontSize: 13, color: dark ? '#b5bcc4' : '#616161', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                    {convo.message}
                  </span>
                  {convo.unread > 0 && (
                    <span style={{ background: '#ac6d46', color: '#fff', fontSize: 9, fontWeight: 700, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: mono, flexShrink: 0 }}>
                      {convo.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </HCard>
      </div>

      <div style={{ height: 32 }} />
    </div>
  )
}
