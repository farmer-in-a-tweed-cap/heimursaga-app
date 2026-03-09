import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, HCard, HButton, NavBar, StatsBar, FundingBar } from '../components/shared'

const mono = 'ui-monospace, SFMono-Regular, monospace'

export function SponsorshipManagementScreen({ dark }: { dark: boolean }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(0)
  const tabs = ['OVERVIEW', 'SPONSORS', 'TIERS', 'PAYOUTS', 'OUTGOING']

  return (
    <div>
      <NavBar dark={dark} onBack={() => navigate(-1)} title="SPONSORSHIPS" />

      {/* Tabs */}
      <div style={{ display: 'flex', background: dark ? '#202020' : '#ffffff', borderBottom: `2px solid ${dark ? '#616161' : '#202020'}`, overflow: 'auto' }}>
        {tabs.map((t, i) => (
          <button
            key={t}
            onClick={() => setActiveTab(i)}
            style={{
              flex: 'none',
              padding: '10px 12px',
              background: 'none',
              border: 'none',
              borderBottom: i === activeTab ? '3px solid #ac6d46' : '3px solid transparent',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.06em',
              fontFamily: mono,
              color: i === activeTab ? '#ac6d46' : (dark ? '#616161' : '#b5bcc4'),
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {activeTab === 0 && (
          <>
            {/* OVERVIEW */}
            <div style={{ borderTop: `2px solid ${dark ? '#616161' : '#202020'}`, borderBottom: `2px solid ${dark ? '#616161' : '#202020'}`, marginBottom: 16 }}>
              <StatsBar
                dark={dark}
                stats={[
                  { value: '$4.8K', label: 'REVENUE' },
                  { value: '18', label: 'SPONSORS' },
                  { value: '$340', label: 'MRR' },
                  { value: '6', label: 'ACTIVE' },
                ]}
              />
            </div>

            {/* Balance card */}
            <HCard dark={dark} style={{ marginBottom: 16 }}>
              <div style={{ padding: '14px', borderBottom: `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#b5bcc4' : '#616161', marginBottom: 8 }}>
                  AVAILABLE BALANCE
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 28, fontWeight: 700, fontFamily: mono, color: '#598636' }}>
                    $1,240
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, fontFamily: mono, color: dark ? '#616161' : '#b5bcc4' }}>
                    .00
                  </span>
                </div>
                <div style={{ fontSize: 10, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4', marginTop: 4 }}>
                  $380.00 pending
                </div>
              </div>
              <div style={{ padding: '10px 14px' }}>
                <HButton variant="copper" small>REQUEST PAYOUT</HButton>
              </div>
            </HCard>

            {/* Stripe Connect status */}
            <HCard dark={dark} style={{ padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#598636" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: dark ? '#e5e5e5' : '#202020' }}>
                    Stripe Connect active
                  </div>
                  <div style={{ fontSize: 10, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4', marginTop: 2 }}>
                    Payouts to ****4242 &middot; France
                  </div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, fontFamily: mono, color: '#ac6d46', cursor: 'pointer' }}>
                  MANAGE
                </span>
              </div>
            </HCard>

            {/* Recent sponsors */}
            <div style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#b5bcc4' : '#616161' }}>
                  RECENT SPONSORS
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, fontFamily: mono, color: '#ac6d46', cursor: 'pointer' }} onClick={() => setActiveTab(1)}>
                  VIEW ALL
                </span>
              </div>
              <div style={{ height: 2, background: dark ? '#616161' : '#202020', marginBottom: 10 }} />
            </div>
            <HCard dark={dark}>
              {[
                { user: 'sarah_trails', amount: '$25', type: 'One-time', tier: 'Trail Guide', time: '2h ago', message: 'Safe travels!' },
                { user: 'hiker_dan', amount: '$15/mo', type: 'Monthly', tier: 'Journey Partner', time: '1d ago', message: null },
                { user: 'travel_fund', amount: '$75', type: 'One-time', tier: 'Pathfinder', time: '3d ago', message: 'Love following your journey' },
              ].map((s, i) => (
                <div
                  key={s.user}
                  style={{
                    padding: '12px 14px',
                    borderTop: i > 0 ? `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar size={28} name={s.user.charAt(0).toUpperCase()} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: 12, color: '#ac6d46', fontWeight: 600 }}>{s.user}</span>
                        <span style={{ fontSize: 9, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4' }}>{s.time}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, fontFamily: mono, color: '#598636' }}>{s.amount}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, fontFamily: mono, color: dark ? '#616161' : '#b5bcc4' }}>{s.tier}</span>
                      </div>
                    </div>
                  </div>
                  {s.message && (
                    <div style={{ marginTop: 8, padding: '8px 10px', background: dark ? '#2a2a2a' : '#f5f5f5', fontSize: 12, color: dark ? '#b5bcc4' : '#616161', fontStyle: 'italic' }}>
                      &ldquo;{s.message}&rdquo;
                    </div>
                  )}
                </div>
              ))}
            </HCard>

            {/* Revenue by expedition */}
            <div style={{ marginTop: 4, marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#b5bcc4' : '#616161' }}>
                BY EXPEDITION
              </span>
              <div style={{ height: 2, background: dark ? '#616161' : '#202020', marginTop: 6, marginBottom: 10 }} />
            </div>
            <HCard dark={dark}>
              {[
                { name: 'Trans-Siberian Journey', raised: 2400, goal: 3500, sponsors: 12 },
                { name: 'Patagonia Trail Run', raised: 800, goal: 2000, sponsors: 6 },
              ].map((exp, i) => (
                <div
                  key={exp.name}
                  style={{
                    padding: '12px 14px',
                    borderTop: i > 0 ? `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` : 'none',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: dark ? '#e5e5e5' : '#202020', marginBottom: 8 }}>
                    {exp.name}
                  </div>
                  <FundingBar raised={exp.raised} goal={exp.goal} dark={dark} />
                  <div style={{ fontSize: 10, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4', marginTop: 6 }}>
                    {exp.sponsors} sponsors
                  </div>
                </div>
              ))}
            </HCard>
          </>
        )}

        {activeTab === 1 && (
          <>
            {/* SPONSORS LIST */}
            <div style={{ marginBottom: 12 }}>
              {/* Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: dark ? '#2a2a2a' : '#ffffff', border: `2px solid ${dark ? '#616161' : '#202020'}`, marginBottom: 12 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={dark ? '#616161' : '#b5bcc4'} strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
                <span style={{ fontSize: 13, color: dark ? '#616161' : '#b5bcc4' }}>Search sponsors...</span>
              </div>

              {/* Filter */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {['ALL', 'ONE-TIME', 'MONTHLY', 'ACTIVE', 'CANCELED'].map((f, i) => (
                  <button
                    key={f}
                    style={{
                      padding: '6px 10px',
                      background: i === 0 ? '#ac6d46' : (dark ? '#2a2a2a' : '#ffffff'),
                      color: i === 0 ? '#fff' : (dark ? '#616161' : '#b5bcc4'),
                      border: `2px solid ${i === 0 ? '#ac6d46' : (dark ? '#616161' : '#202020')}`,
                      fontSize: 9, fontWeight: 700, fontFamily: mono, cursor: 'pointer',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <HCard dark={dark}>
              {[
                { user: 'sarah_trails', amount: '$25', type: 'One-time', tier: 'Trail Guide', status: 'confirmed', expedition: 'Trans-Siberian', date: 'Mar 1, 2026', message: 'Safe travels!', public: true },
                { user: 'hiker_dan', amount: '$15/mo', type: 'Monthly', tier: 'Journey Partner', status: 'active', expedition: 'Trans-Siberian', date: 'Feb 28, 2026', message: null, public: true },
                { user: 'travel_fund', amount: '$75', type: 'One-time', tier: 'Pathfinder', status: 'confirmed', expedition: 'Trans-Siberian', date: 'Feb 25, 2026', message: 'Love following your journey', public: true },
                { user: 'Anonymous', amount: '$5', type: 'One-time', tier: 'Torchbearer', status: 'confirmed', expedition: 'Patagonia', date: 'Feb 20, 2026', message: null, public: false },
                { user: 'ocean_nomad', amount: '$50/mo', type: 'Monthly', tier: 'Expedition Ally', status: 'canceled', expedition: 'Trans-Siberian', date: 'Feb 15, 2026', message: null, public: true },
              ].map((s, i) => (
                <div
                  key={`${s.user}-${i}`}
                  style={{
                    padding: '12px 14px',
                    borderTop: i > 0 ? `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar size={28} name={s.user.charAt(0).toUpperCase()} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: s.public ? '#ac6d46' : (dark ? '#616161' : '#b5bcc4'), fontWeight: 600 }}>
                          {s.public ? `${s.user}` : 'Anonymous'}
                        </span>
                        <span
                          style={{
                            fontSize: 8, fontWeight: 700, fontFamily: mono, letterSpacing: '0.04em',
                            padding: '2px 6px',
                            color: s.status === 'active' ? '#598636' : s.status === 'canceled' ? '#994040' : (dark ? '#e5e5e5' : '#202020'),
                            border: `1px solid ${s.status === 'active' ? '#598636' : s.status === 'canceled' ? '#994040' : (dark ? '#616161' : '#b5bcc4')}`,
                          }}
                        >
                          {s.status.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, fontFamily: mono, color: s.status === 'canceled' ? (dark ? '#616161' : '#b5bcc4') : '#598636' }}>{s.amount}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, fontFamily: mono, color: dark ? '#616161' : '#b5bcc4' }}>{s.tier}</span>
                      </div>
                      <div style={{ fontSize: 10, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4', marginTop: 3 }}>
                        {s.expedition} &middot; {s.date}
                      </div>
                    </div>
                  </div>
                  {s.message && (
                    <div style={{ marginTop: 8, padding: '8px 10px', background: dark ? '#2a2a2a' : '#f5f5f5', fontSize: 12, color: dark ? '#b5bcc4' : '#616161', fontStyle: 'italic' }}>
                      &ldquo;{s.message}&rdquo;
                    </div>
                  )}
                </div>
              ))}
            </HCard>
          </>
        )}

        {activeTab === 2 && (
          <>
            {/* TIER MANAGEMENT */}
            <HCard dark={dark} style={{ padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ac6d46" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                </svg>
                <span style={{ fontSize: 11, color: dark ? '#b5bcc4' : '#616161', lineHeight: 1.4 }}>
                  Sponsorship tiers are shared across all your expeditions. Sponsors choose a tier when supporting any of your expeditions.
                </span>
              </div>
            </HCard>

            {/* One-time tiers */}
            <div style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#b5bcc4' : '#616161' }}>
                  ONE-TIME TIERS (3/5 ACTIVE)
                </span>
              </div>
              <div style={{ height: 2, background: dark ? '#616161' : '#202020', marginBottom: 10 }} />
            </div>
            <HCard dark={dark}>
              {[
                { name: 'Torchbearer', price: '$5', range: '$5–$15', desc: 'Name in expedition credits', members: 4, enabled: true },
                { name: 'Trail Guide', price: '$25', range: '$15–$50', desc: 'Supporter + exclusive updates', members: 6, enabled: true },
                { name: 'Pathfinder', price: '$75', range: '$50–$150', desc: 'Backer + expedition postcard', members: 2, enabled: true },
                { name: 'Navigator', price: '$250', range: '$150–$500', desc: 'Champion + video call from the road', members: 0, enabled: false },
                { name: 'Expedition Patron', price: '$500', range: '$500+', desc: 'All rewards + expedition naming rights', members: 0, enabled: false },
              ].map((tier, i) => (
                <div
                  key={tier.name}
                  style={{
                    padding: '12px 14px',
                    borderTop: i > 0 ? `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` : 'none',
                    opacity: tier.enabled ? 1 : 0.5,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 6, height: 6, background: tier.enabled ? '#598636' : (dark ? '#3a3a3a' : '#b5bcc4') }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: dark ? '#e5e5e5' : '#202020' }}>{tier.name}</span>
                      </div>
                      <div style={{ fontSize: 11, color: dark ? '#616161' : '#b5bcc4', marginTop: 4, marginLeft: 14 }}>
                        {tier.desc}
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 6, marginLeft: 14 }}>
                        <span style={{ fontSize: 9, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4' }}>
                          Range: {tier.range}
                        </span>
                        <span style={{ fontSize: 9, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4' }}>
                          {tier.members} members
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, fontFamily: mono, color: '#ac6d46' }}>{tier.price}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, fontFamily: mono, color: '#4676ac', cursor: 'pointer' }}>EDIT</span>
                    </div>
                  </div>
                </div>
              ))}
            </HCard>

            {/* Monthly tiers */}
            <div style={{ marginTop: 4, marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#b5bcc4' : '#616161' }}>
                  MONTHLY TIERS (2/3 ACTIVE)
                </span>
              </div>
              <div style={{ height: 2, background: dark ? '#616161' : '#202020', marginBottom: 10 }} />
            </div>
            <HCard dark={dark}>
              {[
                { name: 'Fellow Traveler', price: '$5/mo', range: '$5–$15', desc: 'Monthly supporter badge', members: 3, enabled: true },
                { name: 'Journey Partner', price: '$15/mo', range: '$15–$50', desc: 'Monthly updates + early access', members: 2, enabled: true },
                { name: 'Expedition Ally', price: '$50/mo', range: '$50+', desc: 'All monthly rewards + priority messaging', members: 0, enabled: false },
              ].map((tier, i) => (
                <div
                  key={tier.name}
                  style={{
                    padding: '12px 14px',
                    borderTop: i > 0 ? `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` : 'none',
                    opacity: tier.enabled ? 1 : 0.5,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 6, height: 6, background: tier.enabled ? '#598636' : (dark ? '#3a3a3a' : '#b5bcc4') }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: dark ? '#e5e5e5' : '#202020' }}>{tier.name}</span>
                      </div>
                      <div style={{ fontSize: 11, color: dark ? '#616161' : '#b5bcc4', marginTop: 4, marginLeft: 14 }}>
                        {tier.desc}
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 6, marginLeft: 14 }}>
                        <span style={{ fontSize: 9, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4' }}>
                          Range: {tier.range}
                        </span>
                        <span style={{ fontSize: 9, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4' }}>
                          {tier.members} members
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, fontFamily: mono, color: '#4676ac' }}>{tier.price}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, fontFamily: mono, color: '#4676ac', cursor: 'pointer' }}>EDIT</span>
                    </div>
                  </div>
                </div>
              ))}
            </HCard>

            {/* Fee info */}
            <HCard dark={dark} style={{ padding: '12px 14px', marginTop: 4 }}>
              <div style={{ fontSize: 10, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4', lineHeight: 1.6 }}>
                Platform fee: 5% &middot; Stripe fee: ~2.9% + $0.30
              </div>
            </HCard>
          </>
        )}

        {activeTab === 3 && (
          <>
            {/* PAYOUTS */}
            <div style={{ borderTop: `2px solid ${dark ? '#616161' : '#202020'}`, borderBottom: `2px solid ${dark ? '#616161' : '#202020'}`, marginBottom: 16 }}>
              <StatsBar
                dark={dark}
                stats={[
                  { value: '$1,240', label: 'AVAILABLE' },
                  { value: '$380', label: 'PENDING' },
                  { value: '$3,180', label: 'PAID OUT' },
                ]}
              />
            </div>

            <HButton variant="copper" style={{ marginBottom: 16 }}>REQUEST PAYOUT</HButton>

            {/* Payout settings */}
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#b5bcc4' : '#616161' }}>
                PAYOUT SETTINGS
              </span>
              <div style={{ height: 2, background: dark ? '#616161' : '#202020', marginTop: 6, marginBottom: 10 }} />
            </div>

            <HCard dark={dark} style={{ marginBottom: 16 }}>
              <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: dark ? '#e5e5e5' : '#202020' }}>Automatic payouts</div>
                  <div style={{ fontSize: 10, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4', marginTop: 2 }}>Weekly on Mondays</div>
                </div>
                <div style={{ width: 44, height: 24, background: '#ac6d46', padding: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <div style={{ width: 20, height: 20, background: '#ffffff' }} />
                </div>
              </div>
              <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: dark ? '#e5e5e5' : '#202020' }}>Payout method</div>
                  <div style={{ fontSize: 10, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4', marginTop: 2 }}>Stripe Connect &middot; ****4242</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, fontFamily: mono, color: '#ac6d46', cursor: 'pointer' }}>CHANGE</span>
              </div>
            </HCard>

            {/* Payout history */}
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#b5bcc4' : '#616161' }}>
                PAYOUT HISTORY
              </span>
              <div style={{ height: 2, background: dark ? '#616161' : '#202020', marginTop: 6, marginBottom: 10 }} />
            </div>
            <HCard dark={dark}>
              {[
                { amount: '$840.00', date: 'Feb 24, 2026', status: 'paid', method: 'Stripe Connect' },
                { amount: '$620.00', date: 'Feb 17, 2026', status: 'paid', method: 'Stripe Connect' },
                { amount: '$480.00', date: 'Feb 10, 2026', status: 'paid', method: 'Stripe Connect' },
                { amount: '$340.00', date: 'Feb 3, 2026', status: 'paid', method: 'Stripe Connect' },
                { amount: '$900.00', date: 'Jan 27, 2026', status: 'paid', method: 'Stripe Connect' },
              ].map((p, i) => (
                <div
                  key={i}
                  style={{
                    padding: '12px 14px',
                    borderTop: i > 0 ? `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` : 'none',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: mono, color: dark ? '#e5e5e5' : '#202020' }}>{p.amount}</div>
                    <div style={{ fontSize: 10, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4', marginTop: 2 }}>{p.date}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 8, fontWeight: 700, fontFamily: mono, letterSpacing: '0.04em', color: '#598636', padding: '2px 6px', border: '1px solid #598636' }}>
                      {p.status.toUpperCase()}
                    </span>
                    <div style={{ fontSize: 9, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4', marginTop: 4 }}>{p.method}</div>
                  </div>
                </div>
              ))}
            </HCard>
          </>
        )}

        {activeTab === 4 && (
          <>
            {/* OUTGOING — sponsorships you've given */}
            <div style={{ borderTop: `2px solid ${dark ? '#616161' : '#202020'}`, borderBottom: `2px solid ${dark ? '#616161' : '#202020'}`, marginBottom: 16 }}>
              <StatsBar
                dark={dark}
                stats={[
                  { value: '$180', label: 'TOTAL' },
                  { value: '2', label: 'ACTIVE' },
                  { value: '4', label: 'EXPLORERS' },
                  { value: '7', label: 'PAYMENTS' },
                ]}
              />
            </div>

            {/* Active subscriptions */}
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#b5bcc4' : '#616161' }}>
                ACTIVE SUBSCRIPTIONS
              </span>
              <div style={{ height: 2, background: dark ? '#616161' : '#202020', marginTop: 6, marginBottom: 10 }} />
            </div>
            <HCard dark={dark} style={{ marginBottom: 16 }}>
              {[
                { explorer: 'mountain_fox', expedition: 'Patagonia Trail Run', amount: '$15/mo', since: 'Jan 15, 2026', next: 'Mar 15, 2026' },
                { explorer: 'ocean_nomad', expedition: 'Pacific Crossing', amount: '$5/mo', since: 'Feb 1, 2026', next: 'Mar 1, 2026' },
              ].map((sub, i) => (
                <div
                  key={sub.explorer}
                  style={{
                    padding: '12px 14px',
                    borderTop: i > 0 ? `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar size={28} name={sub.explorer.charAt(0).toUpperCase()} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: 12, color: '#ac6d46', fontWeight: 600 }}>{sub.explorer}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, fontFamily: mono, color: '#4676ac' }}>{sub.amount}</span>
                      </div>
                      <div style={{ fontSize: 11, color: dark ? '#b5bcc4' : '#616161', marginTop: 2 }}>{sub.expedition}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                        <span style={{ fontSize: 9, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4' }}>Since {sub.since}</span>
                        <span style={{ fontSize: 9, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4' }}>Next: {sub.next}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <button style={{ flex: 1, padding: '6px', background: 'none', border: `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}`, color: dark ? '#616161' : '#b5bcc4', fontSize: 9, fontWeight: 700, fontFamily: mono, cursor: 'pointer' }}>
                      MANAGE
                    </button>
                    <button style={{ flex: 1, padding: '6px', background: 'none', border: '1px solid #994040', color: '#994040', fontSize: 9, fontWeight: 700, fontFamily: mono, cursor: 'pointer' }}>
                      CANCEL
                    </button>
                  </div>
                </div>
              ))}
            </HCard>

            {/* Payment history */}
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: mono, color: dark ? '#b5bcc4' : '#616161' }}>
                PAYMENT HISTORY
              </span>
              <div style={{ height: 2, background: dark ? '#616161' : '#202020', marginTop: 6, marginBottom: 10 }} />
            </div>
            <HCard dark={dark}>
              {[
                { explorer: 'mountain_fox', amount: '$15.00', type: 'Monthly', date: 'Feb 15, 2026', fee: '$0.74' },
                { explorer: 'ocean_nomad', amount: '$5.00', type: 'Monthly', date: 'Feb 1, 2026', fee: '$0.45' },
                { explorer: 'sarah_trails', amount: '$50.00', type: 'One-time', date: 'Jan 28, 2026', fee: '$1.75' },
                { explorer: 'mountain_fox', amount: '$15.00', type: 'Monthly', date: 'Jan 15, 2026', fee: '$0.74' },
                { explorer: 'hiker_dan', amount: '$25.00', type: 'One-time', date: 'Jan 10, 2026', fee: '$1.03' },
              ].map((p, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px 14px',
                    borderTop: i > 0 ? `1px solid ${dark ? '#3a3a3a' : '#e5e5e5'}` : 'none',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, color: '#ac6d46', fontWeight: 600 }}>{p.explorer}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, fontFamily: mono, color: dark ? '#616161' : '#b5bcc4' }}>{p.type.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize: 10, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4', marginTop: 2 }}>{p.date}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: mono, color: dark ? '#e5e5e5' : '#202020' }}>{p.amount}</div>
                    <div style={{ fontSize: 9, fontFamily: mono, fontWeight: 600, color: dark ? '#616161' : '#b5bcc4', marginTop: 2 }}>Fee: {p.fee}</div>
                  </div>
                </div>
              ))}
            </HCard>
          </>
        )}
      </div>

      <div style={{ height: 32 }} />
    </div>
  )
}
