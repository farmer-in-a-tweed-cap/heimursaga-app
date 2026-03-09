import { useState } from 'react'
import { HButton, HTextField, HCard } from '../components/shared'

const mono = 'ui-monospace, SFMono-Regular, monospace'

export function LoginScreen({ dark }: { dark: boolean }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')

  return (
    <div style={{ padding: 20 }}>
      {/* Logo Masthead */}
      <div style={{ textAlign: 'center', padding: '20px 0 0' }}>
        <img
          src="/logo-lg-light.svg"
          alt="Heimursaga"
          style={{
            height: 64,
            width: 'auto',
            filter: dark ? 'none' : 'invert(1)',
          }}
        />
      </div>

      {/* Tagline */}
      <div
        style={{
          textAlign: 'center',
          fontSize: 9,
          letterSpacing: '0.3em',
          color: dark ? '#616161' : '#b5bcc4',
          fontWeight: 700,
          margin: '20px 0',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          justifyContent: 'center',
        }}
      >
        <div style={{ flex: 1, height: 1, background: dark ? '#3a3a3a' : '#e5e5e5' }} />
        <span style={{ fontFamily: mono }}>
          EXPLORE &middot; SHARE &middot; SPONSOR
        </span>
        <div style={{ flex: 1, height: 1, background: dark ? '#3a3a3a' : '#e5e5e5' }} />
      </div>

      {/* Mode toggle — matches web "LOGIN TO EXISTING ACCOUNT" / "CREATE NEW ACCOUNT" */}
      <div style={{ display: 'flex', border: `2px solid ${dark ? '#616161' : '#202020'}`, marginBottom: 24 }}>
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              flex: 1,
              padding: '12px',
              background: mode === m ? '#ac6d46' : 'transparent',
              color: mode === m ? '#fff' : dark ? '#616161' : '#b5bcc4',
              border: 'none',
              borderLeft: m === 'register' ? `2px solid ${dark ? '#616161' : '#202020'}` : 'none',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.06em',
              fontFamily: mono,
              cursor: 'pointer',
            }}
          >
            {m === 'login' ? 'LOGIN' : 'REGISTER'}
          </button>
        ))}
      </div>

      {mode === 'login' ? (
        <>
          {/* Section header — matches web's form section style */}
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: dark ? '#e5e5e5' : '#202020',
              fontFamily: mono,
              marginBottom: 6,
            }}
          >
            ACCOUNT LOGIN
          </div>
          <div style={{ height: 2, background: dark ? '#616161' : '#202020', marginBottom: 16 }} />

          <HTextField dark={dark} label="EMAIL OR USERNAME" placeholder="Enter your email or username" />
          <HTextField dark={dark} label="PASSWORD" placeholder="Enter your password" type="password" />

          {/* Remember me */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div
              style={{
                width: 14,
                height: 14,
                border: `2px solid ${dark ? '#3a3a3a' : '#b5bcc4'}`,
                background: dark ? '#2a2a2a' : '#ffffff',
              }}
            />
            <span style={{ fontSize: 13, color: dark ? '#b5bcc4' : '#616161' }}>
              Remember me
            </span>
          </div>

          <HButton variant="copper">LOGIN TO ACCOUNT</HButton>

          {/* Forgot password */}
          <HCard dark={dark} style={{ marginTop: 16, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={dark ? '#616161' : '#b5bcc4'} strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              <div>
                <div style={{ fontSize: 12, color: dark ? '#b5bcc4' : '#616161' }}>
                  Forgot your password?
                </div>
                <div style={{ fontSize: 12, color: '#ac6d46', fontWeight: 700 }}>
                  Reset via email &rarr;
                </div>
              </div>
            </div>
          </HCard>

          <div style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: dark ? '#616161' : '#b5bcc4' }}>
            Don't have an account?{' '}
            <span style={{ color: '#4676ac', fontWeight: 700, cursor: 'pointer' }} onClick={() => setMode('register')}>
              Create one &rarr;
            </span>
          </div>
        </>
      ) : (
        <>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: dark ? '#e5e5e5' : '#202020',
              fontFamily: mono,
              marginBottom: 6,
            }}
          >
            CREATE NEW ACCOUNT
          </div>
          <div style={{ height: 2, background: dark ? '#616161' : '#202020', marginBottom: 16 }} />

          <HTextField dark={dark} label="EMAIL" placeholder="Your email address" />
          <HTextField dark={dark} label="USERNAME" placeholder="Choose a username" />
          <HTextField dark={dark} label="PASSWORD" placeholder="Create a password" type="password" />
          <HTextField dark={dark} label="CONFIRM PASSWORD" placeholder="Repeat your password" type="password" />

          <HButton variant="copper">CREATE ACCOUNT</HButton>

          <div style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: dark ? '#616161' : '#b5bcc4' }}>
            Already have an account?{' '}
            <span style={{ color: '#4676ac', fontWeight: 700, cursor: 'pointer' }} onClick={() => setMode('login')}>
              Sign in &rarr;
            </span>
          </div>
        </>
      )}
    </div>
  )
}
