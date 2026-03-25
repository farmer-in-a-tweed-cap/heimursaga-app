'use client';

import Link from 'next/link';
import { Anchor, Map, DollarSign, Video, Users, Navigation, BookOpen, Mic, Shield, TrendingUp, Heart } from 'lucide-react';
import { CompareTable, FeeTable } from '@/app/components/CompareTable';

export function ComparePage() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12">
      {/* Page Header */}
      <div className="bg-[#202020] text-white border-2 border-[#616161] mb-8">
        <div className="bg-[#ac6d46] p-6 sm:p-8 border-b-2 border-[#616161]">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">PATREON vs HEIMURSAGA</h1>
          <p className="text-sm sm:text-base text-[#f5f5f5]">
            An honest comparison for expedition creators
          </p>
        </div>
        <div className="p-6 sm:p-8">
          <p className="text-sm leading-relaxed mb-3">
            Patreon is a general-purpose platform built for all creators. Heimursaga is purpose-built for explorers.
            Same fees, different tools. Here's what that means for you.
          </p>
          <p className="text-sm leading-relaxed text-[#b5bcc4]">
            This comparison reflects publicly available Patreon pricing as of March 2026 and current Heimursaga features.
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
              headerA="Patreon"
              headerB="Heimursaga"
              rows={[
                { label: 'Platform fee', a: '10% of earnings', b: '10% of sponsorships' },
                { label: 'Payment processing', a: '2.9% + $0.30', b: '~2.9% + $0.30 (Stripe)' },
                { label: 'Currency conversion', a: '2.5% fee', b: 'Handled by Stripe' },
                { label: 'Creator subscription', a: 'Free to start', b: '$7/mo or $50/yr for Explorer Pro', aColor: 'text-[#598636]' },
              ]}
            />

            {/* Net breakdown */}
            <div className="mt-6 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#202020] dark:border-[#616161] p-4">
              <h3 className="text-xs font-bold text-[#616161] dark:text-[#b5bcc4] uppercase tracking-wider mb-3">
                NET ON A $100 SPONSORSHIP
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-bold text-[#616161] dark:text-[#b5bcc4] mb-1">PATREON</div>
                  <div className="text-xs sm:text-sm text-[#202020] dark:text-[#e5e5e5]">
                    $100 − $10 <span className="text-[#616161]">(platform)</span> − ~$3.20 <span className="text-[#616161]">(processing)</span> = <strong className="text-[#598636]">~$86.80</strong>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#ac6d46] mb-1">HEIMURSAGA</div>
                  <div className="text-xs sm:text-sm text-[#202020] dark:text-[#e5e5e5]">
                    $100 − $10 <span className="text-[#616161]">(platform)</span> − ~$3.20 <span className="text-[#616161]">(Stripe)</span> = <strong className="text-[#598636]">~$86.80</strong>
                  </div>
                </div>
              </div>
              <p className="text-[10px] sm:text-xs text-[#616161] dark:text-[#b5bcc4] mt-3">
                Fees are effectively identical. The difference: Heimursaga requires Explorer Pro ($7/mo or $50/yr) to receive sponsorships. Patreon has no upfront cost.
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
              headerA="Patreon"
              headerB="Heimursaga"
              rows={[
                { feature: 'Monthly subscriptions', a: true, b: true },
                { feature: 'One-time payments', a: true, b: true },
                { feature: 'Micro-sponsorships ($3 one-tap)', a: false, b: true },
                { feature: 'Expedition-scoped funding', a: false, b: true, note: 'Sponsors fund specific journeys, not just a creator' },
                { feature: 'Yearly billing for sponsors', a: false, b: true },
                { feature: 'Public funding progress', a: 'partial', b: true },
                { feature: 'Digital product sales / shop', a: true, b: false },
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
              headerA="Patreon"
              headerB="Heimursaga"
              rows={[
                { feature: 'Text posts / journal entries', a: true, b: true },
                { feature: 'Photo galleries', a: true, b: true, note: 'Up to 10 photos per entry (Pro)' },
                { feature: 'Native video hosting', a: true, b: false, note: 'Patreon: 100hrs/mo, 1080p, ad-free' },
                { feature: 'YouTube video embeds', a: true, b: true, note: 'Dedicated video entry type on Heimursaga' },
                { feature: 'Audio / voice notes', a: true, b: true, note: 'Patreon: RSS feeds. Heimursaga: in-app recording per expedition' },
                { feature: 'Sponsor-only content', a: true, b: true },
                { feature: 'Automatic early access by tier', a: false, b: true, note: 'Tier 2: 24hrs early. Tier 3: 48hrs early' },
                { feature: 'Content tied to GPS location', a: false, b: true },
                { feature: 'Expedition narrative arc', a: false, b: true, note: 'Entries form a chronological journey with route — not a flat feed' },
                { feature: 'Community polls', a: true, b: false },
                { feature: 'Community chat rooms', a: true, b: false },
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
              This is where the platforms fundamentally diverge. Patreon has no expedition-specific tooling.
            </p>
            <CompareTable
              headerA="Patreon"
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

        {/* Community & Discovery */}
        <section className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <Users className="w-5 h-5" />
            <h2 className="text-lg font-bold">COMMUNITY & DISCOVERY</h2>
          </div>
          <div className="p-4 sm:p-6">
            <CompareTable
              headerA="Patreon"
              headerB="Heimursaga"
              rows={[
                { feature: 'Established audience', a: true, b: false, note: 'Patreon has millions of active patrons' },
                { feature: 'Explorer search & browse', a: 'partial', b: true },
                { feature: 'Threaded comments on entries', a: true, b: true },
                { feature: 'Direct messaging', a: true, b: true },
                { feature: 'Follow / bookmark system', a: true, b: true },
                { feature: 'Public sponsor wall', a: false, b: true, note: 'Public recognition creates social proof' },
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
              {/* Patreon strengths */}
              <div className="border-2 border-[#b5bcc4] dark:border-[#616161] p-4 sm:p-5">
                <h3 className="text-sm font-bold text-[#616161] dark:text-[#b5bcc4] uppercase tracking-wider mb-3 sm:mb-4">
                  WHAT PATREON DOES BETTER
                </h3>
                <ul className="space-y-3 text-sm text-[#202020] dark:text-[#e5e5e5]">
                  <li className="flex items-start gap-2">
                    <Video className="w-4 h-4 text-[#616161] mt-0.5 flex-shrink-0" />
                    <span><strong>Native video hosting</strong> — 100hrs/mo of ad-free 1080p video with closed captions, speed controls, and watch-together premieres.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-[#616161] mt-0.5 flex-shrink-0" />
                    <span><strong>Massive audience</strong> — millions of active patrons already looking for creators to support.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <DollarSign className="w-4 h-4 text-[#616161] mt-0.5 flex-shrink-0" />
                    <span><strong>No upfront cost</strong> — creators pay nothing until they earn. No subscription required.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-[#616161] mt-0.5 flex-shrink-0" />
                    <span><strong>General flexibility</strong> — works for any creator type, from podcasters to game developers.</span>
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
                    <span><strong>Purpose-built for expeditions</strong> — route maps, waypoints, waterway routing, obstacle detection, weather. None of this exists on Patreon.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Navigation className="w-4 h-4 text-[#ac6d46] mt-0.5 flex-shrink-0" />
                    <span><strong>Content tied to geography</strong> — every entry and waypoint lives on a map. Followers see the journey unfold spatially, not as a flat feed.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Heart className="w-4 h-4 text-[#ac6d46] mt-0.5 flex-shrink-0" />
                    <span><strong>Expedition-scoped sponsorship</strong> — sponsors fund specific journeys. Tighter connection between money and mission.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Mic className="w-4 h-4 text-[#ac6d46] mt-0.5 flex-shrink-0" />
                    <span><strong>Voice notes, video entries, early access</strong> — record audio updates in-app, embed YouTube videos, and higher-tier sponsors see entries before anyone else — automatically.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom line */}
            <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#202020] dark:border-[#616161] p-4 sm:p-6">
              <h3 className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-3">THE BOTTOM LINE</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-3">
                A sailing creator on Patreon posts a video and a text update — supporters see it in a feed.
                The same creator on Heimursaga posts a journal entry pinned to their anchorage in the Azores,
                with their full route from Gibraltar visible on the map, obstacles marked, distance tracked,
                and sponsors can see exactly what their money helped make happen.
              </p>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Patreon is a general-purpose tool. Heimursaga is a purpose-built platform for people who go places
                and write about it. Same fees, different experience.
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
