import { ReactNode } from 'react'

export function IPhoneFrame({ children, dark, hideTabBar }: { children: ReactNode; dark: boolean; hideTabBar?: boolean }) {
  return (
    <div
      className="relative mx-auto"
      style={{
        width: 390,
        height: 844,
        background: dark ? '#1a1a1a' : '#f5f5f5',
        border: '8px solid #1a1a1a',
        overflow: 'hidden',
      }}
    >
      {/* Dynamic Island */}
      <div className="dynamic-island" />

      {/* Status Bar */}
      <div
        className="status-bar"
        style={{ color: dark ? '#e5e5e5' : '#202020', background: dark ? '#1a1a1a' : '#f5f5f5' }}
      >
        <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontWeight: 600 }}>9:41</span>
        <div className="flex items-center gap-1">
          <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor">
            <rect x="0" y="3" width="3" height="9" rx="0" opacity="0.3" />
            <rect x="4.5" y="2" width="3" height="10" rx="0" opacity="0.5" />
            <rect x="9" y="1" width="3" height="11" rx="0" opacity="0.7" />
            <rect x="13.5" y="0" width="3" height="12" rx="0" />
          </svg>
          <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
            <path d="M8 2.4C5.6 2.4 3.4 3.4 1.8 5L0 3.2C2.1 1.2 4.9 0 8 0s5.9 1.2 8 3.2L14.2 5C12.6 3.4 10.4 2.4 8 2.4z" opacity="0.3" />
            <path d="M8 5.6c-1.6 0-3 .6-4.1 1.7L2 5.4c1.5-1.5 3.7-2.4 6-2.4s4.5.9 6 2.4l-1.9 1.9C11 6.2 9.6 5.6 8 5.6z" opacity="0.6" />
            <path d="M8 8.8c-.8 0-1.6.3-2.1.9L8 12l2.1-2.3C9.6 9.1 8.8 8.8 8 8.8z" />
          </svg>
          <svg width="27" height="13" viewBox="0 0 27 13" fill="currentColor">
            <rect x="0" y="1" width="22" height="11" rx="0" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.35" />
            <rect x="1.5" y="2.5" width="16" height="8" rx="0" />
            <rect x="23" y="4" width="3" height="5" rx="0" opacity="0.4" />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div
        className="iphone-scroll"
        style={{
          height: hideTabBar ? 844 - 54 : 844 - 54 - 83,
          overflowY: 'auto',
          overflowX: 'hidden',
          background: dark ? '#1a1a1a' : '#f5f5f5',
        }}
      >
        {children}
      </div>
    </div>
  )
}
