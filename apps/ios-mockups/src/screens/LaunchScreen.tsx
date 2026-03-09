const mono = 'ui-monospace, SFMono-Regular, monospace'

// LaunchScreen is always dark — the dark prop is accepted for interface consistency but not used
export function LaunchScreen({ dark: _dark }: { dark: boolean }) {
  return (
    <div
      style={{
        height: '100%',
        background: '#202020',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle map grid background */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.06 }}>
        {[...Array(12)].map((_, i) => (
          <div key={`h${i}`} style={{ position: 'absolute', left: 0, right: 0, top: `${(i + 1) * 7.5}%`, height: 1, background: '#fff' }} />
        ))}
        {[...Array(8)].map((_, i) => (
          <div key={`v${i}`} style={{ position: 'absolute', top: 0, bottom: 0, left: `${(i + 1) * 11}%`, width: 1, background: '#fff' }} />
        ))}
      </div>

      {/* Faint meridian arcs */}
      <svg width="390" height="790" viewBox="0 0 390 790" fill="none" style={{ position: 'absolute', inset: 0, opacity: 0.03 }}>
        <ellipse cx="195" cy="395" rx="280" ry="380" stroke="#fff" strokeWidth="1" />
        <ellipse cx="195" cy="395" rx="180" ry="380" stroke="#fff" strokeWidth="1" />
        <ellipse cx="195" cy="395" rx="80" ry="380" stroke="#fff" strokeWidth="1" />
        <line x1="0" y1="395" x2="390" y2="395" stroke="#fff" strokeWidth="1" />
        <line x1="195" y1="0" x2="195" y2="790" stroke="#fff" strokeWidth="1" />
      </svg>

      {/* Scattered expedition waypoints */}
      <svg width="390" height="790" viewBox="0 0 390 790" fill="none" style={{ position: 'absolute', inset: 0 }}>
        <path d="M40 220 C80 180, 120 200, 160 160 S230 190, 290 150" stroke="#ac6d46" strokeWidth="1" fill="none" opacity="0.08" />
        <path d="M100 560 C150 520, 200 550, 260 500 S320 530, 360 490" stroke="#4676ac" strokeWidth="1" fill="none" opacity="0.06" />
        <path d="M60 420 C100 390, 150 410, 200 370" stroke="#ac6d46" strokeWidth="1" fill="none" opacity="0.05" />
        <rect x="38" y="218" width="4" height="4" fill="#ac6d46" opacity="0.15" />
        <rect x="158" y="158" width="4" height="4" fill="#ac6d46" opacity="0.12" />
        <rect x="288" y="148" width="4" height="4" fill="#ac6d46" opacity="0.10" />
        <circle cx="320" cy="220" r="2" fill="#4676ac" opacity="0.10" />
        <circle cx="70" cy="530" r="2" fill="#4676ac" opacity="0.08" />
        <rect x="260" y="498" width="3" height="3" fill="#4676ac" opacity="0.10" />
      </svg>

      {/* Main content — centered */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Actual Heimursaga logo (small badge version — includes compass rose) */}
        <img
          src="/logo-sm-light.svg"
          alt="Heimursaga"
          style={{ height: 120, width: 'auto', marginBottom: 24 }}
        />

        {/* Tagline with rules */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            width: 260,
          }}
        >
          <div style={{ flex: 1, height: 1, background: '#3a3a3a' }} />
          <span
            style={{
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: '0.3em',
              color: '#616161',
              fontFamily: mono,
              whiteSpace: 'nowrap',
            }}
          >
            EXPLORE &middot; SHARE &middot; SPONSOR
          </span>
          <div style={{ flex: 1, height: 1, background: '#3a3a3a' }} />
        </div>

        {/* Origin coordinates */}
        <div
          style={{
            marginTop: 20,
            fontSize: 9,
            fontFamily: mono,
            fontWeight: 600,
            color: '#3a3a3a',
            letterSpacing: '0.08em',
          }}
        >
          63.88N / 22.41W
        </div>
      </div>

      {/* Bottom — loading indicator and version */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {/* Loading bar */}
        <div style={{ width: 120, height: 2, background: '#2a2a2a', overflow: 'hidden' }}>
          <div
            style={{
              width: '60%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent 0%, #ac6d46 50%, transparent 100%)',
            }}
          />
        </div>

        <div style={{ fontSize: 9, fontFamily: mono, fontWeight: 600, color: '#3a3a3a', letterSpacing: '0.1em' }}>
          v1.0.0
        </div>
      </div>
    </div>
  )
}
