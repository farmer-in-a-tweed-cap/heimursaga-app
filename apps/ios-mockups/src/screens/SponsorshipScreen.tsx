import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, HCard, FundingBar, HButton, NavBar } from '../components/shared'

const mono = 'ui-monospace, SFMono-Regular, monospace'
const amounts = [10, 25, 50, 100]

export function SponsorshipScreen({ dark }: { dark: boolean }) {
  const navigate = useNavigate()
  const [type, setType] = useState<'one-time' | 'monthly'>('one-time')
  const [selected, setSelected] = useState(25)

  return (
    <div>
      <NavBar dark={dark} onBack={() => navigate(-1)} title="SPONSOR" />

      <div style={{ padding: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: dark ? '#e5e5e5' : '#202020', margin: 0 }}>
            Support This Expedition
          </h2>
          <div style={{ height: 2, background: dark ? '#616161' : '#202020', marginTop: 8 }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Avatar size={36} name="E" />
          <div>
            <div style={{ fontSize: 12, color: '#ac6d46', fontWeight: 600 }}>explorer_name</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: dark ? '#e5e5e5' : '#202020' }}>Trans-Siberian Journey</div>
          </div>
        </div>

        <HCard dark={dark} style={{ padding: '12px 14px', marginBottom: 16 }}>
          <FundingBar raised={2400} goal={3500} dark={dark} />
          <div style={{ fontSize: 10, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4', marginTop: 6 }}>
            12 sponsors
          </div>
        </HCard>

        {/* Type */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#b5bcc4' : '#616161', display: 'block', marginBottom: 8 }}>
            SPONSORSHIP TYPE
          </label>
          <div style={{ height: 2, background: dark ? '#616161' : '#202020', marginBottom: 10 }} />
          <div style={{ display: 'flex', border: `2px solid ${dark ? '#616161' : '#202020'}` }}>
            {(['one-time', 'monthly'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                style={{
                  flex: 1, padding: '12px',
                  background: type === t ? '#ac6d46' : 'transparent',
                  color: type === t ? '#fff' : dark ? '#616161' : '#b5bcc4',
                  border: 'none',
                  borderLeft: t === 'monthly' ? `2px solid ${dark ? '#616161' : '#202020'}` : 'none',
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, cursor: 'pointer',
                }}
              >
                {t === 'one-time' ? 'ONE-TIME' : 'MONTHLY'}
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#b5bcc4' : '#616161', display: 'block', marginBottom: 8 }}>
            SELECT AMOUNT
          </label>
          <div style={{ height: 2, background: dark ? '#616161' : '#202020', marginBottom: 10 }} />
          <div style={{ display: 'flex', border: `2px solid ${dark ? '#616161' : '#202020'}` }}>
            {amounts.map((amt, i) => (
              <button
                key={amt}
                onClick={() => setSelected(amt)}
                style={{
                  flex: 1, padding: '14px 4px',
                  background: selected === amt ? '#ac6d46' : dark ? '#202020' : '#ffffff',
                  color: selected === amt ? '#fff' : dark ? '#616161' : '#b5bcc4',
                  border: 'none',
                  borderLeft: i > 0 ? `2px solid ${dark ? '#616161' : '#202020'}` : 'none',
                  fontSize: 15, fontWeight: 700, fontFamily: mono, cursor: 'pointer',
                }}
              >
                ${amt}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 8, padding: '12px 14px', background: dark ? '#2a2a2a' : '#ffffff', border: `2px solid ${dark ? '#616161' : '#202020'}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: dark ? '#616161' : '#b5bcc4', fontFamily: mono }}>$</span>
            <span style={{ fontSize: 14, color: dark ? '#3a3a3a' : '#b5bcc4' }}>Custom amount</span>
          </div>
        </div>

        {/* Message */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#b5bcc4' : '#616161', display: 'block', marginBottom: 6 }}>
            MESSAGE (OPTIONAL)
          </label>
          <textarea
            defaultValue="Good luck on the journey!"
            style={{
              width: '100%', height: 72, padding: '12px 14px',
              background: dark ? '#2a2a2a' : '#ffffff',
              border: `2px solid ${dark ? '#616161' : '#202020'}`,
              color: dark ? '#e5e5e5' : '#202020', fontSize: 14, lineHeight: 1.5,
              resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          {['Show my name publicly', 'Show my message publicly'].map((opt) => (
            <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 14, height: 14, border: `2px solid ${dark ? '#3a3a3a' : '#b5bcc4'}`, background: dark ? '#2a2a2a' : '#ffffff' }} />
              <span style={{ fontSize: 12, color: dark ? '#b5bcc4' : '#616161' }}>{opt}</span>
            </div>
          ))}
        </div>

        <HButton variant="copper">SPONSOR ${selected}.00</HButton>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 10, fontFamily: mono, fontWeight: 600, color: dark ? '#3a3a3a' : '#b5bcc4' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="0" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Secure payment via Stripe &middot; Apple Pay available
          </div>
        </div>
      </div>

      <div style={{ height: 32 }} />
    </div>
  )
}
