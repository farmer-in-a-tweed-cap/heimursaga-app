import { ReactNode, CSSProperties } from 'react'

const mono = 'ui-monospace, SFMono-Regular, monospace'

/* ─── Status Header Bar ─── */
// Matches web app pattern: gray bar with colored dot + label + right metadata
export function StatusHeader({
  status,
  label,
  right,
  dark,
}: {
  status: 'active' | 'planned' | 'completed' | 'cancelled'
  label: string
  right?: string
  dark: boolean
}) {
  const dotColors = { active: '#598636', planned: '#4676ac', completed: '#616161', cancelled: '#994040' }
  return (
    <div
      style={{
        background: dark ? '#3a3a3a' : '#b5bcc4',
        padding: '8px 14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, background: dotColors[status] }} />
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: dark ? '#e5e5e5' : '#202020',
            fontFamily: mono,
          }}
        >
          {label}
        </span>
      </div>
      {right && (
        <span style={{ fontSize: 10, fontWeight: 600, color: dark ? '#b5bcc4' : '#616161', fontFamily: mono }}>
          {right}
        </span>
      )}
    </div>
  )
}

/* ─── Section Divider ─── */
export function SectionDivider({
  title,
  action,
  dark,
}: {
  title: string
  action?: string
  dark: boolean
}) {
  return (
    <div style={{ padding: '20px 16px 8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: dark ? '#e5e5e5' : '#202020',
            fontFamily: mono,
          }}
        >
          {title}
        </span>
        {action && (
          <span style={{ fontSize: 10, fontWeight: 600, color: '#ac6d46', fontFamily: mono }}>{action}</span>
        )}
      </div>
      <div style={{ height: 2, background: dark ? '#616161' : '#202020', marginTop: 6 }} />
    </div>
  )
}

/* ─── HButton ─── */
export function HButton({
  children,
  variant = 'copper',
  outline,
  style,
  small,
}: {
  children: ReactNode
  variant?: 'copper' | 'blue' | 'destructive'
  outline?: boolean
  style?: CSSProperties
  dark?: boolean
  small?: boolean
}) {
  const colors = { copper: '#ac6d46', blue: '#4676ac', destructive: '#994040' }
  const bg = outline ? 'transparent' : colors[variant]
  const color = outline ? colors[variant] : '#ffffff'
  return (
    <button
      style={{
        width: '100%',
        padding: small ? '8px 16px' : '14px 24px',
        background: bg,
        color,
        border: `2px solid ${colors[variant]}`,
        fontSize: small ? 10 : 12,
        fontWeight: 700,
        letterSpacing: '0.06em',
        fontFamily: mono,
        cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

/* ─── HTextField ─── */
export function HTextField({
  label,
  placeholder,
  dark,
  type = 'text',
  value,
}: {
  label: string
  placeholder: string
  dark: boolean
  type?: string
  value?: string
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.06em',
          fontFamily: mono,
          color: dark ? '#b5bcc4' : '#616161',
          display: 'block',
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        defaultValue={value}
        style={{
          width: '100%',
          padding: '12px 14px',
          background: dark ? '#2a2a2a' : '#ffffff',
          border: `2px solid ${dark ? '#616161' : '#202020'}`,
          color: dark ? '#e5e5e5' : '#202020',
          fontSize: 15,
          outline: 'none',
          boxSizing: 'border-box',
          fontFamily: 'inherit',
        }}
      />
    </div>
  )
}

/* ─── HCard ─── */
export function HCard({
  children,
  dark,
  style,
}: {
  children: ReactNode
  dark: boolean
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        background: dark ? '#202020' : '#ffffff',
        border: `2px solid ${dark ? '#616161' : '#202020'}`,
        marginBottom: 12,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/* ─── Avatar ─── */
export function Avatar({
  size = 32,
  name,
  pro,
}: {
  size?: number
  name: string
  pro?: boolean
}) {
  const initial = name.charAt(0).toUpperCase()
  const borderColor = pro ? '#ac6d46' : '#616161'
  return (
    <div
      style={{
        width: size,
        height: size,
        background: '#ac6d46',
        border: size >= 48 ? `3px solid ${borderColor}` : undefined,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 700,
        fontFamily: mono,
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  )
}

/* ─── SegmentedControl ─── */
export function SegmentedControl({
  options,
  active,
  dark,
  borderless,
}: {
  options: string[]
  active: number
  dark: boolean
  borderless?: boolean
}) {
  return (
    <div style={{ display: 'flex', ...(borderless ? {} : { border: `2px solid ${dark ? '#616161' : '#202020'}` }) }}>
      {options.map((opt, i) => (
        <button
          key={opt}
          style={{
            flex: 1,
            padding: '10px 6px',
            background: i === active ? '#ac6d46' : dark ? '#202020' : '#ffffff',
            color: i === active ? '#ffffff' : dark ? '#b5bcc4' : '#616161',
            border: 'none',
            borderLeft: i > 0 ? `2px solid ${dark ? '#616161' : '#202020'}` : 'none',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.06em',
            fontFamily: mono,
            cursor: 'pointer',
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

/* ─── Funding Bar ─── */
export function FundingBar({ raised, goal, dark }: { raised: number; goal: number; dark: boolean }) {
  const pct = Math.min((raised / goal) * 100, 100)
  return (
    <div>
      <div style={{ height: 6, background: dark ? '#2a2a2a' : '#e5e5e5' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: '#ac6d46' }} />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10,
          marginTop: 6,
          fontFamily: mono,
          fontWeight: 600,
        }}
      >
        <span style={{ color: dark ? '#b5bcc4' : '#616161' }}>
          ${raised.toLocaleString()} / ${goal.toLocaleString()}
        </span>
        <span style={{ color: '#ac6d46', fontWeight: 700 }}>{Math.round(pct)}%</span>
      </div>
    </div>
  )
}

/* ─── Stats Bar ─── */
// Alternating blue/copper for visual distinction, monospace values
export function StatsBar({
  stats,
  dark,
}: {
  stats: { value: string; label: string }[]
  dark: boolean
}) {
  return (
    <div style={{ display: 'flex' }}>
      {stats.map((s, i) => (
        <div
          key={s.label}
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '10px 2px',
            borderRight: i < stats.length - 1 ? `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` : 'none',
            background: i % 2 === 0
              ? dark ? 'rgba(70,118,172,0.06)' : 'rgba(70,118,172,0.03)'
              : dark ? 'rgba(172,109,70,0.06)' : 'rgba(172,109,70,0.03)',
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: i % 2 === 0 ? '#4676ac' : '#ac6d46',
              fontFamily: mono,
              lineHeight: 1,
            }}
          >
            {s.value}
          </div>
          <div
            style={{
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: dark ? '#616161' : '#b5bcc4',
              marginTop: 4,
              fontFamily: mono,
            }}
          >
            {s.label}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Image Placeholder ─── */
export function ImagePlaceholder({
  height = 160,
  label,
  dark,
  gradient,
}: {
  height?: number
  label?: string
  dark?: boolean
  gradient?: string
}) {
  const defaultGrad = dark
    ? 'linear-gradient(135deg, #1a2332 0%, #2a3442 50%, #1a2a3a 100%)'
    : 'linear-gradient(135deg, #d4c8b8 0%, #c4b8a8 50%, #d0c4b4 100%)'
  return (
    <div
      style={{
        height,
        background: gradient || defaultGrad,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {label && (
        <span
          style={{
            color: dark ? '#3a4a5a' : '#b5a898',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.1em',
            fontFamily: mono,
          }}
        >
          {label}
        </span>
      )}
    </div>
  )
}

/* ─── NavBar ─── */
export function NavBar({
  dark,
  onBack,
  title,
  right,
}: {
  dark: boolean
  onBack?: () => void
  title?: string
  right?: ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 16px',
        background: dark ? '#202020' : '#ffffff',
        borderBottom: `2px solid ${dark ? '#616161' : '#202020'}`,
        minHeight: 20,
      }}
    >
      {onBack ? (
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: '#ac6d46',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      ) : (
        <div />
      )}
      {title && (
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: dark ? '#e5e5e5' : '#202020', fontFamily: mono }}>
          {title}
        </span>
      )}
      {right || <div style={{ width: 48 }} />}
    </div>
  )
}
