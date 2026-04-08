'use client';

import Image from 'next/image';

export function EnvoyMarketingPage() {
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
            Marketing reference material — Heimursaga Envoy Program
          </p>
          <button
            onClick={() => window.print()}
            className="px-5 py-2.5 bg-[#202020] dark:bg-[#ac6d46] text-white text-xs font-bold tracking-[0.14em] hover:bg-[#3a3a3a] dark:hover:bg-[#8a5735] transition-all active:scale-[0.98]"
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
              The Envoy Program
            </h1>
            <p className="text-base text-[#616161] dark:text-[#b5bcc4] leading-relaxed max-w-[700px]" style={{ fontFamily: 'Lora, serif' }}>
              A hand-picked cohort of explorers, sponsored by Heimursaga to use the platform as their
              primary medium for expedition documentation and fundraising during the platform&apos;s founding year.
            </p>
          </div>

          <div className="border-t-4 border-[#ac6d46] mb-6"></div>

          {/* Platform intro */}
          <div className="mb-6 avoid-break">
            <h3 className="text-sm font-bold text-[#202020] dark:text-white mb-1.5 tracking-[0.06em]">ABOUT HEIMURSAGA</h3>
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
              Heimursaga is a journaling and sponsorship platform built for explorers, travelers, and adventurers.
              Explorers create expeditions, log journal entries with photos and locations along the way, and share
              their journeys with a community of followers. The platform supports financial sponsorships so that
              supporters can fund the expeditions they believe in. All content on Heimursaga is human-created &mdash; AI-generated
              text, images, and media are strictly prohibited.
            </p>
          </div>

          {/* What is the Envoy Program */}
          <div className="mb-6 avoid-break">
            <h3 className="text-sm font-bold text-[#202020] dark:text-white mb-1.5 tracking-[0.06em]">WHAT IS THE ENVOY PROGRAM?</h3>
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
              The Envoy Program is Heimursaga&apos;s founding explorer initiative. We are selecting a small number of
              exceptional explorers to become the first active voices on the platform. Envoys receive a 12-month
              recurring sponsorship directly from Heimursaga and, in return, commit to using the platform as their
              primary tool for documenting expeditions and raising support. Envoys are not influencers or brand
              ambassadors &mdash; they are working explorers whose authentic, on-the-ground content will define
              what Heimursaga looks and feels like from day one.
            </p>
          </div>

          {/* Two-column: what you get / what we expect */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] p-5 avoid-break">
              <h3 className="text-sm font-bold text-[#ac6d46] mb-3 tracking-[0.06em]">WHAT YOU RECEIVE</h3>
              <ul className="space-y-2 text-xs text-[#202020] dark:text-[#e5e5e5]">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] shrink-0">&#9654;</span>
                  <span><strong>$50/month recurring sponsorship</strong> for 12 months, paid through the platform&apos;s own sponsorship system</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] shrink-0">&#9654;</span>
                  <span><strong>Starlink Mini kit</strong> provided at the start of the program &mdash; yours to keep, so you can document from anywhere</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] shrink-0">&#9654;</span>
                  <span><strong>Explorer Pro subscription</strong> included for the duration of the program &mdash; no cost to you</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] shrink-0">&#9654;</span>
                  <span><strong>Platform visibility</strong> &mdash; Envoy expeditions are featured prominently on the homepage, discover feed, and promotional materials</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] shrink-0">&#9654;</span>
                  <span><strong>Direct product access</strong> &mdash; a standing line to the founding team for feedback, feature requests, and early access to new capabilities</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] shrink-0">&#9654;</span>
                  <span><strong>Community sponsorships</strong> &mdash; as an Explorer Pro, you can receive additional sponsorships from followers and supporters beyond the platform stipend</span>
                </li>
              </ul>
            </div>
            <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] p-5 avoid-break">
              <h3 className="text-sm font-bold text-[#4676ac] mb-3 tracking-[0.06em]">WHAT WE EXPECT</h3>
              <ul className="space-y-2 text-xs text-[#202020] dark:text-[#e5e5e5]">
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] shrink-0">&#9654;</span>
                  <span><strong>Heimursaga as your primary platform</strong> &mdash; expedition documentation, journal entries, and fundraising happen here first</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] shrink-0">&#9654;</span>
                  <span><strong>At least one active expedition</strong> at all times during the 12-month program</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] shrink-0">&#9654;</span>
                  <span><strong>Minimum 2 journal entries per week</strong> while on expedition &mdash; written narrative with photos, video entries, or data logs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] shrink-0">&#9654;</span>
                  <span><strong>Help us build the platform</strong> &mdash; report bugs, suggest features, and share what&apos;s working and what isn&apos;t. Your real-world usage directly shapes the product.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] shrink-0">&#9654;</span>
                  <span><strong>Authentic, human-created content</strong> &mdash; no AI-generated text, images, or media, consistent with the platform&apos;s content policy</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* ─── PAGE 2: DETAILS ─── */}
        <div className="page-break avoid-break mb-10">
          <div className="bg-[#202020] px-6 py-4 mb-6">
            <h2 className="text-lg font-bold text-white tracking-[0.06em]">PROGRAM DETAILS</h2>
          </div>

          {/* Compensation */}
          <div className="mb-8 avoid-break">
            <h3 className="text-sm font-bold text-[#202020] dark:text-white mb-3 tracking-[0.06em]">SPONSORSHIP &amp; COMPENSATION</h3>
            <p className="text-xs text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-4">
              Envoys receive their stipend as a recurring monthly sponsorship through Heimursaga&apos;s own
              sponsorship system &mdash; the same infrastructure available to all Explorer Pro accounts. This means
              your Envoy sponsorship appears on your expedition alongside any community sponsorships you receive,
              and payouts flow through your connected Stripe account on the standard schedule.
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="border-2 border-[#ac6d46] p-4 text-center">
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-2 tracking-[0.1em]">MONTHLY SPONSORSHIP</div>
                <div className="text-xl font-bold text-[#ac6d46]">$50</div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">recurring, 12 months</div>
              </div>
              <div className="border-2 border-[#ac6d46] p-4 text-center">
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-2 tracking-[0.1em]">TOTAL PROGRAM VALUE</div>
                <div className="text-xl font-bold text-[#202020] dark:text-white">$900</div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">$600 stipend + $250 Starlink Mini + $50 Explorer Pro</div>
              </div>
              <div className="border-2 border-[#ac6d46] p-4 text-center">
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-2 tracking-[0.1em]">ADDITIONAL EARNINGS</div>
                <div className="text-xl font-bold text-[#598636]">Unlimited</div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">community sponsorships</div>
              </div>
            </div>
          </div>

          {/* Content requirements */}
          <div className="mb-8 avoid-break">
            <h3 className="text-sm font-bold text-[#202020] dark:text-white mb-3 tracking-[0.06em]">CONTENT REQUIREMENTS</h3>
            <p className="text-xs text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-4">
              The Envoy Program is a commitment to active, consistent use of Heimursaga. These are the minimum
              expectations &mdash; most Envoys will naturally exceed them.
            </p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <div className="border-l-3 pl-4" style={{ borderLeftWidth: 3, borderLeftColor: '#4676ac' }}>
                <div className="text-xs font-bold text-[#202020] dark:text-white mb-1">EXPEDITION CONTINUITY</div>
                <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
                  At least one expedition must be active at all times during the program. You can run
                  multiple concurrent expeditions, plan future ones, and complete them on your own timeline &mdash;
                  but there should never be a gap where no expedition is live.
                </p>
              </div>
              <div className="border-l-3 pl-4" style={{ borderLeftWidth: 3, borderLeftColor: '#4676ac' }}>
                <div className="text-xs font-bold text-[#202020] dark:text-white mb-1">JOURNAL FREQUENCY</div>
                <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
                  Minimum 2 journal entries per week while on active expedition. Entries can be written
                  narrative with photos, video entries, or data logs &mdash; whatever fits the moment.
                </p>
              </div>
              <div className="border-l-3 pl-4" style={{ borderLeftWidth: 3, borderLeftColor: '#4676ac' }}>
                <div className="text-xs font-bold text-[#202020] dark:text-white mb-1">PRIMARY PLATFORM</div>
                <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
                  Heimursaga should be your first-publish destination for expedition content. You are free to
                  cross-post to other platforms, personal blogs, or social media &mdash; but Heimursaga is
                  where the full, detailed documentation lives. We don&apos;t ask for exclusivity, just primacy.
                </p>
              </div>
              <div className="border-l-3 pl-4" style={{ borderLeftWidth: 3, borderLeftColor: '#4676ac' }}>
                <div className="text-xs font-bold text-[#202020] dark:text-white mb-1">FUNDRAISING</div>
                <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
                  Use Heimursaga&apos;s sponsorship system as your primary fundraising channel. Direct supporters
                  to your expedition page for sponsorships. You are welcome to maintain other funding sources,
                  but Heimursaga should be presented as the primary way for your audience to contribute.
                </p>
              </div>
              <div className="border-l-3 pl-4" style={{ borderLeftWidth: 3, borderLeftColor: '#4676ac' }}>
                <div className="text-xs font-bold text-[#202020] dark:text-white mb-1">PLATFORM IMPROVEMENT</div>
                <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
                  Envoys are the platform&apos;s first real users in the field. We expect you to report bugs,
                  suggest features, and tell us candidly what&apos;s working and what isn&apos;t. Your feedback
                  directly shapes the product &mdash; this is a partnership, not a broadcast arrangement.
                </p>
              </div>
              <div className="border-l-3 pl-4" style={{ borderLeftWidth: 3, borderLeftColor: '#4676ac' }}>
                <div className="text-xs font-bold text-[#202020] dark:text-white mb-1">CONTENT POLICY</div>
                <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
                  All content must be authentic and human-created. No AI-generated text, images, or media.
                  This is a platform-wide policy, and Envoys are expected to lead by example.
                </p>
              </div>
            </div>
          </div>

          {/* What this is not */}
          <div className="border-l-4 border-[#616161] pl-4 avoid-break">
            <h3 className="text-xs font-bold text-[#202020] dark:text-white mb-1 tracking-[0.06em]">WHAT THIS IS NOT</h3>
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
              The Envoy Program is not an influencer deal, a brand partnership, or a content creation contract.
              We are not asking you to promote Heimursaga on social media, produce marketing content, or hit
              engagement metrics. We are sponsoring your expedition because we believe in what you&apos;re doing,
              and we want Heimursaga to be the place where you document it. The relationship is straightforward:
              we fund your work, you use our platform to share it.
            </p>
          </div>
        </div>

        {/* ─── PAGE 3: PLATFORM, TIMELINE, SELECTION ─── */}
        <div className="page-break avoid-break mb-10">
          <div className="bg-[#202020] px-6 py-4 mb-6">
            <h2 className="text-lg font-bold text-white tracking-[0.06em]">THE PLATFORM</h2>
          </div>

          {/* What you can do */}
          <div className="mb-8 avoid-break">
            <h3 className="text-sm font-bold text-[#202020] dark:text-white mb-3 tracking-[0.06em]">WHAT YOU GET WITH EXPLORER PRO</h3>
            <p className="text-xs text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-4">
              Your included Explorer Pro subscription unlocks the full platform. Here is what you can do:
            </p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs text-[#202020] dark:text-[#e5e5e5]">
              <div className="flex items-start gap-2"><span className="text-[#ac6d46] shrink-0">&#9654;</span> <span>Create unlimited expeditions with full route planning and waypoint management</span></div>
              <div className="flex items-start gap-2"><span className="text-[#ac6d46] shrink-0">&#9654;</span> <span>Log journal entries with photos, locations, and narrative text</span></div>
              <div className="flex items-start gap-2"><span className="text-[#ac6d46] shrink-0">&#9654;</span> <span>Receive sponsorships from followers &mdash; one-time and recurring</span></div>
              <div className="flex items-start gap-2"><span className="text-[#ac6d46] shrink-0">&#9654;</span> <span>Set funding goals per expedition with live progress tracking</span></div>
              <div className="flex items-start gap-2"><span className="text-[#ac6d46] shrink-0">&#9654;</span> <span>Use the expedition builder with six route modes, elevation data, passage planning, and travel time estimation</span></div>
              <div className="flex items-start gap-2"><span className="text-[#ac6d46] shrink-0">&#9654;</span> <span>Track your position on the Explorer Atlas &mdash; a global map of active explorers</span></div>
              <div className="flex items-start gap-2"><span className="text-[#ac6d46] shrink-0">&#9654;</span> <span>Build a public profile and journal that showcases all your expeditions and entries</span></div>
              <div className="flex items-start gap-2"><span className="text-[#ac6d46] shrink-0">&#9654;</span> <span>Sailor-ready: vessel profiles, nautical chart overlay, marine weather, and nautical units (nm/kn)</span></div>
              <div className="flex items-start gap-2"><span className="text-[#ac6d46] shrink-0">&#9654;</span> <span>Connect with other explorers through follows, bookmarks, and the discover feed</span></div>
            </div>
          </div>

          {/* Expedition builder highlight */}
          <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] p-5 mb-8 avoid-break">
            <h3 className="text-sm font-bold text-[#202020] dark:text-white mb-2 tracking-[0.06em]">EXPEDITION BUILDER</h3>
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed mb-3">
              The expedition builder is a full-featured route planning tool with six route modes (walking, trail,
              cycling, driving, waterway, and straight line), per-leg mode switching, elevation-aware travel time
              calculation, satellite/vector map toggle, and along-route POI search. It includes a purpose-built
              waterway routing engine for paddle expeditions with obstacle detection (dams, locks, rapids).
            </p>
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed mb-3">
              For sailors: set your expedition type to Sail and the builder adds vessel profile fields (name, type,
              LOA, draft, crew size), configurable average speed for passage time estimates, and automatic
              straight-line routing for ocean waypoints. Toggle the OpenSeaMap nautical chart overlay on any map
              to see navigational aids, depth contours, and harbor markers. Live marine weather &mdash; wave height,
              swell, and ocean current data &mdash; is displayed on the expedition sidebar.
            </p>
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
              Routes are planned visually on the map and stored with full geometry, making your expedition page
              a complete, navigable record of where you went and what you experienced.
            </p>
          </div>

          {/* Sponsorship system */}
          <div className="mb-8 avoid-break">
            <h3 className="text-sm font-bold text-[#202020] dark:text-white mb-3 tracking-[0.06em]">SPONSORSHIP &amp; FUNDRAISING</h3>
            <p className="text-xs text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-4">
              Heimursaga&apos;s sponsorship system is designed for expedition fundraising. Supporters can sponsor
              your expedition with one-time or recurring contributions. You set a funding goal, and progress is
              displayed publicly on your expedition page. Payouts are handled through Stripe Connect.
            </p>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div className="border-t-2 border-[#ac6d46] pt-3">
                <div className="font-bold text-[#202020] dark:text-white mb-1">ONE-TIME SPONSORSHIPS</div>
                <p className="text-[#616161] dark:text-[#b5bcc4]">Supporters contribute a single amount to a specific expedition</p>
              </div>
              <div className="border-t-2 border-[#ac6d46] pt-3">
                <div className="font-bold text-[#202020] dark:text-white mb-1">RECURRING SPONSORSHIPS</div>
                <p className="text-[#616161] dark:text-[#b5bcc4]">Monthly contributions that continue for the life of the expedition</p>
              </div>
              <div className="border-t-2 border-[#ac6d46] pt-3">
                <div className="font-bold text-[#202020] dark:text-white mb-1">EXPLORER RECEIVES 90%</div>
                <p className="text-[#616161] dark:text-[#b5bcc4]">10% platform fee + standard Stripe processing fees. Full transparency.</p>
              </div>
            </div>
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
            <p className="text-xs text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-4">
              We are selecting for explorers whose work and ambition align with what Heimursaga is building.
              The ideal Envoy is someone who is already planning or actively undertaking expeditions and
              needs a better platform to document and fund them.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                'Active or upcoming expedition plans — you have somewhere to go and something to document',
                'A track record of expedition-style travel, outdoor exploration, or long-distance journaling',
                'Comfort with written storytelling and photography — your entries should stand on their own',
                'Willingness to use a new platform as a primary tool, including honest feedback on what works and what doesn\'t',
                'An existing audience or community, however small, that would benefit from following your journey',
                'Independence — you plan your own routes, manage your own logistics, and own your own narrative',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-xs text-[#202020] dark:text-[#e5e5e5]">
                  <span className="text-[#ac6d46] mt-0.5 shrink-0">&#9654;</span>
                  <span className="leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Program timeline */}
          <div className="mb-8 avoid-break">
            <h3 className="text-sm font-bold text-[#202020] dark:text-white mb-4 tracking-[0.06em]">PROGRAM TIMELINE</h3>
            <div className="grid grid-cols-4 gap-4">
              {[
                { step: '01', title: 'Selection', desc: 'We review candidates and extend invitations to explorers based on fit and expedition plans.' },
                { step: '02', title: 'Onboarding', desc: 'Create your account, connect Stripe, set up your first expedition, and meet the founding team.' },
                { step: '03', title: 'Active Program', desc: '12 months of sponsored exploration. Document your journeys, build your audience, and raise funds.' },
                { step: '04', title: 'Continuation', desc: 'After the program, your account, content, audience, and sponsorship relationships are yours to keep.' },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-10 h-10 rounded-full bg-[#ac6d46] text-white flex items-center justify-center mx-auto mb-2 text-sm font-bold font-mono">
                    {item.step}
                  </div>
                  <div className="text-xs font-bold text-[#202020] dark:text-white mb-1">{item.title}</div>
                  <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* After the program */}
          <div className="border-l-4 border-[#ac6d46] pl-4 mb-8 avoid-break">
            <h3 className="text-xs font-bold text-[#202020] dark:text-white mb-1 tracking-[0.06em]">AFTER THE 12 MONTHS</h3>
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
              When the program ends, everything you built is yours. Your profile, your expeditions, your journal
              entries, your followers, and any sponsorship relationships you established &mdash; all of it stays.
              Your Explorer Pro subscription continues at the standard rate, or you can downgrade to a free
              Explorer account and keep all your content. There is no lock-in, no content forfeiture, and no
              non-compete. We want you to stay because the platform works for you, not because of a contract.
            </p>
          </div>

          {/* CTA */}
          <div className="border-4 border-[#ac6d46] p-8 text-center avoid-break">
            <h3 className="text-xl font-bold text-[#202020] dark:text-white mb-3" style={{ fontFamily: 'Lora, serif' }}>
              Interested?
            </h3>
            <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-6 max-w-[500px] mx-auto leading-relaxed">
              The Envoy Program is invite-only, but we welcome expressions of interest. Tell us about your
              upcoming expedition plans and why Heimursaga would be the right home for your work.
            </p>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1">
              <div><strong className="text-[#202020] dark:text-white">Email:</strong> envoys@heimursaga.com</div>
              <div><strong className="text-[#202020] dark:text-white">Web:</strong> heimursaga.com/contact</div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-10 bg-[#202020] px-6 py-4 flex items-center justify-between">
            <Image src="/logo-lg-light.svg" alt="Heimursaga" width={180} height={58} className="h-6 w-auto" />
            <span className="text-xs text-[#b5bcc4]">Confidential &mdash; Heimursaga Envoy Program</span>
          </div>
        </div>
      </div>
    </>
  );
}
