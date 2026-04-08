'use client';

import Image from 'next/image';

export function EnvoySailorsPage() {
  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          header, footer, nav, .no-print, aside { display: none !important; }
          body * { visibility: hidden; }
          .print-page, .print-page * { visibility: visible; }
          .print-page { position: absolute; left: 0; top: 0; width: 100%; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-page { padding: 0 !important; max-width: 100% !important; }
          .print-cover-header { margin-left: -0.7in !important; margin-right: -0.7in !important; padding-left: 0.7in !important; padding-right: 0.7in !important; }
          .page-break { page-break-before: always; }
          .avoid-break { page-break-inside: avoid; }
          @page { margin: 0.5in 0.7in; size: letter; }
          @page:first { margin-top: 0; }
        }
      `}</style>

      <div className="print-page max-w-[900px] mx-auto px-6 py-12 bg-white dark:bg-[#202020]">
        {/* Export button */}
        <div className="no-print mb-8 flex items-center justify-between">
          <p className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
            Marketing reference material — Heimursaga Envoy Program for Sailors
          </p>
          <button
            onClick={() => window.print()}
            className="px-5 py-2.5 bg-[#202020] dark:bg-[#4676ac] text-white text-xs font-bold tracking-[0.14em] hover:bg-[#3a3a3a] dark:hover:bg-[#365d8a] transition-all active:scale-[0.98]"
          >
            EXPORT TO PDF
          </button>
        </div>

        {/* ─── PAGE 1: COVER ─── */}
        <div className="avoid-break">
          {/* Logo bar */}
          <div className="bg-[#202020] px-8 py-6 -mx-6 print-cover-header flex justify-center">
            <Image src="/logo-lg-light.svg" alt="Heimursaga" width={300} height={96} className="h-20 w-auto" style={{ marginLeft: '-15px' }} />
          </div>

          {/* Title */}
          <div className="pt-6 mb-4">
            <h1 className="text-3xl font-bold text-[#202020] dark:text-white mb-2" style={{ fontFamily: 'Lora, serif' }}>
              The Envoy Program: For Sailors
            </h1>
            <p className="text-base text-[#616161] dark:text-[#b5bcc4] leading-relaxed max-w-[700px]" style={{ fontFamily: 'Lora, serif' }}>
              A founding cohort of sailors, sponsored by Heimursaga to document their voyages
              and raise support through the platform during its first year.
            </p>
          </div>

          <div className="border-t-4 border-[#4676ac] mb-6"></div>

          {/* Platform intro */}
          <div className="mb-6 avoid-break">
            <h3 className="text-sm font-bold text-[#202020] dark:text-white mb-1.5 tracking-[0.06em]">ABOUT HEIMURSAGA</h3>
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
              Heimursaga is a journaling and sponsorship platform for explorers, travelers, and adventurers. Explorers
              create expeditions, log entries with photos, video, and locations, and raise funds from
              sponsors. The platform supports hikers, cyclists, drivers, paddlers, and sailors &mdash; with native
              nautical capabilities including nautical units, vessel profiles, marine weather, chart overlays, and
              passage planning. It complements existing channels like YouTube rather than replacing them &mdash; your
              expedition page becomes the hub where written logs, video, route data, and fundraising live together.
            </p>
          </div>

          {/* What is the Envoy Program */}
          <div className="mb-6 avoid-break">
            <h3 className="text-sm font-bold text-[#202020] dark:text-white mb-1.5 tracking-[0.06em]">WHAT IS THE ENVOY PROGRAM?</h3>
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
              The Envoy Program is Heimursaga&apos;s founding explorer initiative. We are selecting a small number of
              sailors to become early voices on the platform. Envoys receive a 12-month recurring sponsorship
              from Heimursaga and commit to using the platform as their primary tool for documenting voyages
              and raising support. Envoys are not influencers &mdash; they are working sailors whose on-the-water
              content will shape the platform from day one.
            </p>
          </div>

          {/* Two-column: what you get / what we expect */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] p-5 avoid-break">
              <h3 className="text-sm font-bold text-[#4676ac] mb-3 tracking-[0.06em]">WHAT YOU RECEIVE</h3>
              <ul className="space-y-2 text-xs text-[#202020] dark:text-[#e5e5e5]">
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] shrink-0">&#9654;</span>
                  <span><strong>$50/month recurring sponsorship</strong> for 12 months, paid through the platform&apos;s sponsorship system</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] shrink-0">&#9654;</span>
                  <span><strong>Starlink Mini kit</strong> &mdash; yours to keep, for logging entries from offshore</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] shrink-0">&#9654;</span>
                  <span><strong>Explorer Pro subscription</strong> included for the duration &mdash; full access to all features including nautical</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] shrink-0">&#9654;</span>
                  <span><strong>Platform visibility</strong> &mdash; featured on homepage, discover feed, and promotional materials</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] shrink-0">&#9654;</span>
                  <span><strong>Direct product access</strong> &mdash; your feedback shapes the platform</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] shrink-0">&#9654;</span>
                  <span><strong>Community sponsorships</strong> &mdash; receive additional sponsorships from followers beyond the stipend</span>
                </li>
              </ul>
            </div>
            <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] p-5 avoid-break">
              <h3 className="text-sm font-bold text-[#ac6d46] mb-3 tracking-[0.06em]">WHAT WE EXPECT</h3>
              <ul className="space-y-2 text-xs text-[#202020] dark:text-[#e5e5e5]">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] shrink-0">&#9654;</span>
                  <span><strong>Heimursaga as your primary platform</strong> &mdash; voyage documentation and fundraising happen here first</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] shrink-0">&#9654;</span>
                  <span><strong>At least one active expedition</strong> at all times during the 12-month program</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] shrink-0">&#9654;</span>
                  <span><strong>Minimum 2 entries per week</strong> while underway &mdash; journals, data logs, photos, or video</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] shrink-0">&#9654;</span>
                  <span><strong>Help build the platform</strong> &mdash; report bugs, request features, tell us what works at sea</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* ─── PAGE 2: NAUTICAL FEATURES + FUNDRAISING ─── */}
        <div className="page-break avoid-break mb-10">
          <div className="bg-[#202020] px-6 py-4 mb-6">
            <h2 className="text-lg font-bold text-white tracking-[0.06em]">NAUTICAL CAPABILITIES</h2>
          </div>

          <p className="text-xs text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-6">
            Heimursaga&apos;s nautical features are native, not bolted on. When you set an expedition type to Sail, the
            entire platform adapts &mdash; units, routing, weather, data logging, and display.
          </p>

          {/* Feature grid — compact, no emoji icons */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8">
            <div className="border-l-3 pl-4 avoid-break" style={{ borderLeftWidth: 3, borderLeftColor: '#4676ac' }}>
              <div className="text-xs font-bold text-[#202020] dark:text-white mb-1">NAUTICAL UNITS</div>
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
                Distances in nautical miles, speeds and wind in knots. One preference toggle applies platform-wide.
              </p>
            </div>

            <div className="border-l-3 pl-4 avoid-break" style={{ borderLeftWidth: 3, borderLeftColor: '#4676ac' }}>
              <div className="text-xs font-bold text-[#202020] dark:text-white mb-1">NAUTICAL CHART OVERLAY</div>
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
                OpenSeaMap overlay on any map &mdash; nav aids, depth contours, harbors, anchorages, and traffic separation schemes.
              </p>
            </div>

            <div className="border-l-3 pl-4 avoid-break" style={{ borderLeftWidth: 3, borderLeftColor: '#4676ac' }}>
              <div className="text-xs font-bold text-[#202020] dark:text-white mb-1">VESSEL PROFILE</div>
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
                Name, type (monohull/catamaran/trimaran), LOA, draft, and crew size displayed on the expedition page.
              </p>
            </div>

            <div className="border-l-3 pl-4 avoid-break" style={{ borderLeftWidth: 3, borderLeftColor: '#4676ac' }}>
              <div className="text-xs font-bold text-[#202020] dark:text-white mb-1">MARINE WEATHER</div>
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
                Live wave height, swell, period, and ocean current data on the expedition sidebar.
              </p>
            </div>

            <div className="border-l-3 pl-4 avoid-break" style={{ borderLeftWidth: 3, borderLeftColor: '#4676ac' }}>
              <div className="text-xs font-bold text-[#202020] dark:text-white mb-1">PASSAGE PLANNING</div>
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
                Sail expeditions auto-select passage routing. Set your average speed to see per-leg and total passage time estimates.
              </p>
            </div>

            <div className="border-l-3 pl-4 avoid-break" style={{ borderLeftWidth: 3, borderLeftColor: '#4676ac' }}>
              <div className="text-xs font-bold text-[#202020] dark:text-white mb-1">MARINE DATA LOGGING</div>
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
                Data log entries include wave height, sea state, water temp, tidal state, heading, current, and sail configuration.
              </p>
            </div>

            <div className="border-l-3 pl-4 avoid-break" style={{ borderLeftWidth: 3, borderLeftColor: '#4676ac' }}>
              <div className="text-xs font-bold text-[#202020] dark:text-white mb-1">VIDEO ENTRIES</div>
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
                Embed YouTube or Vimeo episodes directly in your expedition timeline alongside written logs, photos, and data.
              </p>
            </div>
          </div>

          {/* Fundraising + Sponsor Perks */}
          <div className="mb-6 avoid-break">
            <h3 className="text-sm font-bold text-[#202020] dark:text-white mb-2 tracking-[0.06em]">SPONSORSHIP &amp; PERKS</h3>
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed mb-3">
              Supporters back your expedition with one-time or recurring contributions. You set a funding
              goal, progress is displayed on your expedition page, and payouts flow through Stripe Connect.
              You keep 90% (10% platform fee + Stripe processing).
            </p>
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed mb-4">
              The key difference from Patreon: sponsorships are tied to a specific voyage, not to you as a
              creator. Sponsors follow your route on the map, read your logs, and see conditions. The
              documentation and the fundraising live in the same place.
            </p>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div className="border-t-2 border-[#ac6d46] pt-3">
                <div className="font-bold text-[#202020] dark:text-white mb-1">EARLY ENTRY ACCESS</div>
                <p className="text-[#616161] dark:text-[#b5bcc4]">
                  Higher-tier sponsors see new entries 24&ndash;48 hours before the public &mdash; a tangible
                  perk that gives your existing audience a reason to sponsor.
                </p>
              </div>
              <div className="border-t-2 border-[#ac6d46] pt-3">
                <div className="font-bold text-[#202020] dark:text-white mb-1">EXPEDITION NOTES</div>
                <p className="text-[#616161] dark:text-[#b5bcc4]">
                  Share sponsor-exclusive updates &mdash; behind-the-scenes plans or progress that only
                  qualifying sponsors can read.
                </p>
              </div>
              <div className="border-t-2 border-[#ac6d46] pt-3">
                <div className="font-bold text-[#202020] dark:text-white mb-1">LEADERBOARD RECOGNITION</div>
                <p className="text-[#616161] dark:text-[#b5bcc4]">
                  All sponsors appear on your expedition&apos;s public leaderboard, ranked by contribution.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* ─── PAGE 3: PROGRAM DETAILS ─── */}
        <div className="page-break avoid-break mb-10">
          <div className="bg-[#202020] px-6 py-4 mb-6">
            <h2 className="text-lg font-bold text-white tracking-[0.06em]">PROGRAM DETAILS</h2>
          </div>

          {/* Compensation */}
          <div className="mb-8 avoid-break">
            <h3 className="text-sm font-bold text-[#202020] dark:text-white mb-3 tracking-[0.06em]">COMPENSATION</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="border-2 border-[#4676ac] p-4 text-center">
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-2 tracking-[0.1em]">MONTHLY SPONSORSHIP</div>
                <div className="text-xl font-bold text-[#4676ac]">$50</div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">recurring, 12 months</div>
              </div>
              <div className="border-2 border-[#4676ac] p-4 text-center">
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-2 tracking-[0.1em]">TOTAL PROGRAM VALUE</div>
                <div className="text-xl font-bold text-[#202020] dark:text-white">$900</div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">$600 stipend + $250 Starlink Mini + $50 Explorer Pro</div>
              </div>
              <div className="border-2 border-[#4676ac] p-4 text-center">
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-2 tracking-[0.1em]">COMMUNITY EARNINGS</div>
                <div className="text-xl font-bold text-[#598636]">Unlimited</div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">from your sailing audience</div>
              </div>
            </div>
          </div>

          {/* Content requirements */}
          <div className="mb-8 avoid-break">
            <h3 className="text-sm font-bold text-[#202020] dark:text-white mb-3 tracking-[0.06em]">CONTENT EXPECTATIONS</h3>
            <p className="text-xs text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-4">
              Sailing has its own rhythms &mdash; offshore passages, weather windows, limited connectivity. These
              minimums are designed with that in mind.
            </p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <div className="border-l-3 pl-4" style={{ borderLeftWidth: 3, borderLeftColor: '#ac6d46' }}>
                <div className="text-xs font-bold text-[#202020] dark:text-white mb-1">EXPEDITION CONTINUITY</div>
                <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
                  At least one expedition active at all times. A multi-month cruise counts as one expedition.
                  Refit periods can be documented as separate expeditions.
                </p>
              </div>
              <div className="border-l-3 pl-4" style={{ borderLeftWidth: 3, borderLeftColor: '#ac6d46' }}>
                <div className="text-xs font-bold text-[#202020] dark:text-white mb-1">LOG FREQUENCY</div>
                <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
                  Minimum 2 entries per week while underway or in port. Batch entries when connectivity
                  allows during offshore passages. Data logs count.
                </p>
              </div>
              <div className="border-l-3 pl-4" style={{ borderLeftWidth: 3, borderLeftColor: '#ac6d46' }}>
                <div className="text-xs font-bold text-[#202020] dark:text-white mb-1">PRIMARY PLATFORM</div>
                <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
                  Heimursaga is where your full voyage documentation lives. Cross-post freely, but detailed
                  entries and structured data should publish here first. Primacy, not exclusivity.
                </p>
              </div>
              <div className="border-l-3 pl-4" style={{ borderLeftWidth: 3, borderLeftColor: '#ac6d46' }}>
                <div className="text-xs font-bold text-[#202020] dark:text-white mb-1">FUNDRAISING</div>
                <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
                  Direct supporters to your Heimursaga expedition page for sponsorships. Other funding
                  channels are fine, but Heimursaga should be presented as the primary way to contribute.
                </p>
              </div>
            </div>
          </div>

          {/* What this is not */}
          <div className="border-l-4 border-[#616161] pl-4 avoid-break">
            <h3 className="text-xs font-bold text-[#202020] dark:text-white mb-1 tracking-[0.06em]">WHAT THIS IS NOT</h3>
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
              Not an influencer deal or brand partnership. We are not asking you to produce marketing content
              or hit engagement metrics. We fund your sailing, you use our platform to document it.
            </p>
          </div>
        </div>

        {/* ─── PAGE 4: SELECTION + CTA ─── */}
        <div className="page-break avoid-break">
          <div className="bg-[#202020] px-6 py-4 mb-6">
            <h2 className="text-lg font-bold text-white tracking-[0.06em]">SELECTION &amp; TIMELINE</h2>
          </div>

          {/* Who we're looking for */}
          <div className="mb-8 avoid-break">
            <h3 className="text-sm font-bold text-[#202020] dark:text-white mb-3 tracking-[0.06em]">WHO WE&apos;RE LOOKING FOR</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                'An active or upcoming voyage — you have a boat, a destination, and a plan',
                'Experience with passage-making, coastal cruising, or extended live-aboard sailing',
                'Comfort with storytelling — written narrative, photography, video, or all three',
                'Willingness to use a new platform and give honest feedback',
                'An existing audience, however small, that would follow your voyage',
                'Self-reliance — you plan your own passages, manage your own boat, and own your narrative',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-xs text-[#202020] dark:text-[#e5e5e5]">
                  <span className="text-[#4676ac] mt-0.5 shrink-0">&#9654;</span>
                  <span className="leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Program timeline */}
          <div className="mb-8 avoid-break">
            <h3 className="text-sm font-bold text-[#202020] dark:text-white mb-4 tracking-[0.06em]">TIMELINE</h3>
            <div className="grid grid-cols-4 gap-4">
              {[
                { step: '01', title: 'Selection', desc: 'We review candidates based on voyage plans, experience, and fit.' },
                { step: '02', title: 'Onboarding', desc: 'Set up your account, vessel profile, first expedition, and Stripe connection.' },
                { step: '03', title: 'Active Program', desc: '12 months of sponsored sailing. Document voyages, build audience, raise funds.' },
                { step: '04', title: 'Continuation', desc: 'Account, content, audience, and sponsorships are yours to keep.' },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-10 h-10 rounded-full bg-[#4676ac] text-white flex items-center justify-center mx-auto mb-2 text-sm font-bold font-mono">
                    {item.step}
                  </div>
                  <div className="text-xs font-bold text-[#202020] dark:text-white mb-1">{item.title}</div>
                  <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* After the program */}
          <div className="border-l-4 border-[#4676ac] pl-4 mb-8 avoid-break">
            <h3 className="text-xs font-bold text-[#202020] dark:text-white mb-1 tracking-[0.06em]">AFTER THE 12 MONTHS</h3>
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
              Everything you built is yours &mdash; profile, expeditions, entries, followers, sponsorship relationships.
              Explorer Pro continues at the standard rate, or you can downgrade to a free account and keep all content.
              No lock-in, no content forfeiture, no non-compete.
            </p>
          </div>

          {/* CTA */}
          <div className="border-4 border-[#4676ac] p-8 text-center avoid-break">
            <h3 className="text-xl font-bold text-[#202020] dark:text-white mb-3" style={{ fontFamily: 'Lora, serif' }}>
              Interested?
            </h3>
            <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-6 max-w-[500px] mx-auto leading-relaxed">
              The Envoy Program is invite-only, but we welcome expressions of interest.
              Tell us about your boat, your voyage plans, and why Heimursaga fits.
            </p>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1">
              <div><strong className="text-[#202020] dark:text-white">Email:</strong> envoys@heimursaga.com</div>
              <div><strong className="text-[#202020] dark:text-white">Web:</strong> heimursaga.com/contact</div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-10 bg-[#202020] px-6 py-4 flex items-center justify-between">
            <Image src="/logo-lg-light.svg" alt="Heimursaga" width={180} height={58} className="h-6 w-auto" />
            <span className="text-xs text-[#b5bcc4]">Confidential &mdash; Heimursaga Envoy Program for Sailors</span>
          </div>
        </div>
      </div>
    </>
  );
}
