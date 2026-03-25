'use client';

import Link from 'next/link';
import { Anchor, Map, DollarSign, Video, Users, Navigation, BookOpen, Mic, Heart, Mail, Pen, TrendingUp } from 'lucide-react';
import { CompareTable, FeeTable } from '@/app/components/CompareTable';

export function CompareSubstackPage() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12">
      {/* Page Header */}
      <div className="bg-[#202020] text-white border-2 border-[#616161] mb-8">
        <div className="bg-[#ac6d46] p-6 sm:p-8 border-b-2 border-[#616161]">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">SUBSTACK vs HEIMURSAGA</h1>
          <p className="text-sm sm:text-base text-[#f5f5f5]">
            An honest comparison for expedition creators
          </p>
        </div>
        <div className="p-6 sm:p-8">
          <p className="text-sm leading-relaxed mb-3">
            Substack is a newsletter-first platform expanding into multimedia. Heimursaga is purpose-built
            for explorers who document journeys. Both let you write and get paid — the tools around that writing are very different.
          </p>
          <p className="text-sm leading-relaxed text-[#b5bcc4]">
            This comparison reflects publicly available Substack pricing as of March 2026 and current Heimursaga features.
          </p>
        </div>
      </div>

      <div className="space-y-8">

        {/* Fees Section */}
        <section className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <DollarSign className="w-5 h-5" />
            <h2 className="text-lg font-bold">FEES & PRICING</h2>
          </div>
          <div className="p-4 sm:p-6">
            <FeeTable
              headerA="Substack"
              headerB="Heimursaga"
              rows={[
                { label: 'Platform fee', a: '10% of paid revenue', b: '10% of sponsorships' },
                { label: 'Payment processing', a: '2.9% + $0.30', b: '~2.9% + $0.30 (Stripe)' },
                { label: 'Recurring billing fee', a: '+0.5–0.7% on subscriptions', b: 'None', aColor: 'text-[#994040]', bColor: 'text-[#598636]' },
                { label: 'Effective total fee', a: '~13–16% per transaction', b: '~13% per transaction' },
                { label: 'Creator subscription', a: 'Free to start', b: '$7/mo or $50/yr for Explorer Pro', aColor: 'text-[#598636]' },
              ]}
            />

            {/* Net breakdown */}
            <div className="mt-6 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#202020] dark:border-[#616161] p-4">
              <h3 className="text-xs font-bold text-[#616161] dark:text-[#b5bcc4] uppercase tracking-wider mb-3">
                NET ON A $5/MONTH SUBSCRIPTION
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-bold text-[#616161] dark:text-[#b5bcc4] mb-1">SUBSTACK</div>
                  <div className="text-xs sm:text-sm text-[#202020] dark:text-[#e5e5e5]">
                    $5 − $0.50 <span className="text-[#616161]">(platform)</span> − $0.45 <span className="text-[#616161]">(Stripe)</span> − $0.04 <span className="text-[#616161]">(billing)</span> = <strong className="text-[#598636]">~$4.01</strong>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#ac6d46] mb-1">HEIMURSAGA</div>
                  <div className="text-xs sm:text-sm text-[#202020] dark:text-[#e5e5e5]">
                    $5 − $0.50 <span className="text-[#616161]">(platform)</span> − $0.45 <span className="text-[#616161]">(Stripe)</span> = <strong className="text-[#598636]">~$4.05</strong>
                  </div>
                </div>
              </div>
              <p className="text-[10px] sm:text-xs text-[#616161] dark:text-[#b5bcc4] mt-3">
                At small amounts, fees are nearly identical. Substack's extra recurring billing fee (0.5–0.7%) adds up at scale.
                Heimursaga requires Explorer Pro ($7/mo or $50/yr) to receive sponsorships — Substack has no upfront cost.
              </p>
            </div>
          </div>
        </section>

        {/* Funding Model */}
        <section className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <TrendingUp className="w-5 h-5" />
            <h2 className="text-lg font-bold">FUNDING MODEL</h2>
          </div>
          <div className="p-4 sm:p-6">
            <CompareTable
              headerA="Substack"
              headerB="Heimursaga"
              rows={[
                { feature: 'Monthly subscriptions', a: true, b: true },
                { feature: 'Annual subscriptions', a: true, b: true, note: 'Heimursaga: 10% discount for annual sponsors' },
                { feature: 'One-time payments', a: 'partial', b: true, note: 'Substack: limited to pledges. Heimursaga: $5–$10,000 per expedition' },
                { feature: 'Micro-sponsorships ($3 one-tap)', a: false, b: true },
                { feature: 'Expedition-scoped funding', a: false, b: true, note: 'Sponsors fund specific journeys, not just a creator' },
                { feature: 'Public funding progress', a: false, b: true },
                { feature: 'Founding member / premium tiers', a: true, b: true, note: 'Substack: founding tier. Heimursaga: 3 custom tiers ($5–$150/mo)' },
              ]}
            />
          </div>
        </section>

        {/* Content & Storytelling */}
        <section className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <BookOpen className="w-5 h-5" />
            <h2 className="text-lg font-bold">CONTENT & STORYTELLING</h2>
          </div>
          <div className="p-4 sm:p-6">
            <CompareTable
              headerA="Substack"
              headerB="Heimursaga"
              rows={[
                { feature: 'Long-form writing', a: true, b: true, note: 'Substack: newsletter editor. Heimursaga: journal entries with rich text' },
                { feature: 'Photo galleries', a: 'partial', b: true, note: 'Substack: inline images. Heimursaga: up to 10 photos per entry (Pro)' },
                { feature: 'Native video hosting', a: true, b: false, note: 'Substack: recording studio, livestreaming, TV app' },
                { feature: 'YouTube video embeds', a: true, b: true, note: 'Dedicated video entry type on Heimursaga' },
                { feature: 'Podcasting / audio', a: true, b: true, note: 'Substack: RSS distribution to Apple/Spotify. Heimursaga: voice notes per expedition' },
                { feature: 'Email delivery to subscribers', a: true, b: 'partial', note: 'Substack: core feature. Heimursaga: opt-in for monthly sponsors' },
                { feature: 'Subscriber-only content', a: true, b: true },
                { feature: 'Automatic early access by tier', a: false, b: true, note: 'Tier 2: 24hrs early. Tier 3: 48hrs early' },
                { feature: 'Content tied to GPS location', a: false, b: true },
                { feature: 'Expedition narrative arc', a: false, b: true, note: 'Entries form a chronological journey with route — not a newsletter archive' },
                { feature: 'Notes (short-form social feed)', a: true, b: false },
                { feature: 'Email automations', a: true, b: false },
              ]}
            />
          </div>
        </section>

        {/* Mapping & Expedition Tools */}
        <section className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#ac6d46] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <Map className="w-5 h-5" />
            <h2 className="text-lg font-bold">MAPPING & EXPEDITION TOOLS</h2>
          </div>
          <div className="p-4 sm:p-6">
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-4">
              Substack is a publishing platform — it has no expedition-specific tooling. This is where the platforms fundamentally diverge.
            </p>
            <CompareTable
              headerA="Substack"
              headerB="Heimursaga"
              rows={[
                { feature: 'Interactive route map', a: false, b: true },
                { feature: 'Multi-mode routing', a: false, b: true, note: 'Waterway, trail, walking, cycling, driving' },
                { feature: 'Waterway routing', a: false, b: true, note: 'Canoe & motorboat profiles with upstream/downstream awareness' },
                { feature: 'Waypoint tracking', a: false, b: true, note: 'Named waypoints with dates and GPS coordinates' },
                { feature: 'Route distance & duration', a: false, b: true },
                { feature: 'Obstacle detection', a: false, b: true, note: 'Dams, weirs, locks, rapids flagged automatically' },
                { feature: 'Public expedition map', a: false, b: true, note: 'Followers see route, waypoints, and entries on a live map' },
                { feature: 'Weather & conditions', a: false, b: true },
                { feature: 'Geo-tagged journal entries', a: false, b: true, note: 'Every entry pinned to its GPS location on the map' },
              ]}
            />
          </div>
        </section>

        {/* Audience & Distribution */}
        <section className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <Mail className="w-5 h-5" />
            <h2 className="text-lg font-bold">AUDIENCE & DISTRIBUTION</h2>
          </div>
          <div className="p-4 sm:p-6">
            <CompareTable
              headerA="Substack"
              headerB="Heimursaga"
              rows={[
                { feature: 'Built-in audience network', a: true, b: false, note: 'Substack has millions of readers and cross-recommendation network' },
                { feature: 'Email newsletter delivery', a: true, b: 'partial', note: 'Substack: core distribution. Heimursaga: opt-in for monthly sponsors' },
                { feature: 'Recommendation engine', a: true, b: false, note: 'Substack creators can recommend each other to grow subscribers' },
                { feature: 'Custom domain support', a: true, b: false },
                { feature: 'Threaded comments on entries', a: true, b: true },
                { feature: 'Direct messaging', a: false, b: true },
                { feature: 'Follow / bookmark system', a: true, b: true },
                { feature: 'Public sponsor wall', a: false, b: true, note: 'Public recognition creates social proof and incentivizes sponsorship' },
                { feature: 'Expedition notes', a: false, b: true, note: '500-character daily updates — public or sponsor-exclusive' },
              ]}
            />
          </div>
        </section>

        {/* The Honest Take */}
        <section className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#4676ac] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <Anchor className="w-5 h-5" />
            <h2 className="text-lg font-bold">THE HONEST TAKE FOR EXPEDITION CREATORS</h2>
          </div>
          <div className="p-4 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Substack strengths */}
              <div className="border-2 border-[#b5bcc4] dark:border-[#616161] p-4 sm:p-5">
                <h3 className="text-sm font-bold text-[#616161] dark:text-[#b5bcc4] uppercase tracking-wider mb-3 sm:mb-4">
                  WHAT SUBSTACK DOES BETTER
                </h3>
                <ul className="space-y-3 text-sm text-[#202020] dark:text-[#e5e5e5]">
                  <li className="flex items-start gap-2">
                    <Mail className="w-4 h-4 text-[#616161] mt-0.5 flex-shrink-0" />
                    <span><strong>Email-first distribution</strong> — every post lands in your subscriber's inbox. The most reliable way to reach people without fighting algorithms.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-[#616161] mt-0.5 flex-shrink-0" />
                    <span><strong>Massive reader network</strong> — millions of readers, cross-recommendations between creators, and a built-in discovery engine.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Video className="w-4 h-4 text-[#616161] mt-0.5 flex-shrink-0" />
                    <span><strong>Native video & podcasting</strong> — recording studio, livestreaming, podcast RSS distribution to Apple and Spotify, and a TV app for longform viewing.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Pen className="w-4 h-4 text-[#616161] mt-0.5 flex-shrink-0" />
                    <span><strong>No upfront cost</strong> — free to publish and grow an audience. Substack only takes a cut when you earn.</span>
                  </li>
                </ul>
              </div>

              {/* Heimursaga strengths */}
              <div className="border-2 border-[#ac6d46] p-4 sm:p-5">
                <h3 className="text-sm font-bold text-[#ac6d46] uppercase tracking-wider mb-3 sm:mb-4">
                  WHAT HEIMURSAGA DOES BETTER
                </h3>
                <ul className="space-y-3 text-sm text-[#202020] dark:text-[#e5e5e5]">
                  <li className="flex items-start gap-2">
                    <Map className="w-4 h-4 text-[#ac6d46] mt-0.5 flex-shrink-0" />
                    <span><strong>Purpose-built for expeditions</strong> — route maps, waypoints, waterway routing, obstacle detection, weather. Substack has none of this.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Navigation className="w-4 h-4 text-[#ac6d46] mt-0.5 flex-shrink-0" />
                    <span><strong>Content tied to geography</strong> — every entry and waypoint lives on a map. Followers see the journey unfold spatially, not as a newsletter archive.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Heart className="w-4 h-4 text-[#ac6d46] mt-0.5 flex-shrink-0" />
                    <span><strong>Expedition-scoped sponsorship</strong> — one-time donations to specific journeys, micro-sponsorships on entries, and public funding progress. Substack only supports subscriptions.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <DollarSign className="w-4 h-4 text-[#ac6d46] mt-0.5 flex-shrink-0" />
                    <span><strong>Lower recurring fees</strong> — no extra billing fee on subscriptions. At scale, Substack's 0.5–0.7% recurring surcharge adds up.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom line */}
            <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#202020] dark:border-[#616161] p-4 sm:p-6">
              <h3 className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-3">THE BOTTOM LINE</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-3">
                Substack is built for writers who want to build a newsletter audience. It excels at email distribution,
                long-form writing, and growing a subscriber base through recommendations. If your primary output is written
                dispatches and you want the widest possible reach, Substack is a strong choice.
              </p>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Heimursaga is built for people who go places and document it. Your entries live on a map, your route is tracked,
                your sponsors fund specific expeditions, and every piece of content is tied to a location. If your audience wants
                to follow your journey — not just read about it — Heimursaga gives them a fundamentally different experience.
              </p>
            </div>

            {/* CTA */}
            <div className="text-center pt-2">
              <Link
                href="/auth"
                className="inline-block bg-[#ac6d46] text-white font-bold text-sm px-8 py-3 hover:bg-[#8a5838] transition-colors tracking-wider"
              >
                CREATE YOUR EXPLORER ACCOUNT
              </Link>
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-3">
                Free to join. <Link href="/upgrade" className="text-[#ac6d46] hover:text-[#4676ac]">Upgrade to Explorer Pro</Link> when you're ready to receive sponsorships.
              </p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
