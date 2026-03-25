import Link from 'next/link';
import { Anchor, Map, DollarSign, Video, Users, Navigation, BookOpen, Mic, Heart, Coffee, TrendingUp, Gift, ShoppingBag } from 'lucide-react';
import { CompareTable, FeeTable } from '@/app/components/CompareTable';

export function CompareKofiPage() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-xs mb-4">
        <Link href="/compare" className="text-[#ac6d46] hover:text-[#4676ac]">Compare</Link>
        <span className="mx-2 text-[#b5bcc4] dark:text-[#616161]">/</span>
        <span className="text-[#202020] dark:text-[#e5e5e5] font-semibold">Ko-fi vs Heimursaga</span>
      </nav>

      {/* Page Header */}
      <div className="bg-[#202020] text-white border-2 border-[#616161] mb-8">
        <div className="bg-[#ac6d46] p-6 sm:p-8 border-b-2 border-[#616161]">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">KO-FI vs HEIMURSAGA</h1>
          <p className="text-sm sm:text-base text-[#f5f5f5]">
            An honest comparison for expedition creators
          </p>
        </div>
        <div className="p-6 sm:p-8">
          <p className="text-sm leading-relaxed mb-3">
            Ko-fi is a lightweight tipping and membership platform built for simplicity. Heimursaga is purpose-built
            for explorers who document journeys. Ko-fi wins on fees — Heimursaga wins on expedition tools.
          </p>
          <p className="text-sm leading-relaxed text-[#b5bcc4]">
            This comparison reflects publicly available Ko-fi pricing as of March 2026 and current Heimursaga features.
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
              headerA="Ko-fi"
              headerB="Heimursaga"
              rows={[
                { label: 'Platform fee on tips', a: '0%', b: '10% of sponsorships', aColor: 'text-[#598636]' },
                { label: 'Platform fee on memberships', a: '5% (0% with Gold)', b: '10% of sponsorships' },
                { label: 'Payment processing', a: '~3% + $0.30 (Stripe/PayPal)', b: '~2.9% + $0.30 (Stripe)' },
                { label: 'Creator subscription', a: 'Free (Gold: $12/mo for 0% fees)', b: '$7/mo or $50/yr for Explorer Pro' },
              ]}
            />

            {/* Net breakdown */}
            <div className="mt-6 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#202020] dark:border-[#616161] p-4">
              <h3 className="text-xs font-bold text-[#616161] dark:text-[#b5bcc4] uppercase tracking-wider mb-3">
                NET ON A $100 CONTRIBUTION
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-bold text-[#616161] dark:text-[#b5bcc4] mb-1">KO-FI (TIP, FREE PLAN)</div>
                  <div className="text-xs sm:text-sm text-[#202020] dark:text-[#e5e5e5]">
                    $100 − $0 <span className="text-[#616161]">(platform)</span> − ~$3.30 <span className="text-[#616161]">(processing)</span> = <strong className="text-[#598636]">~$96.70</strong>
                  </div>
                  <div className="text-[10px] text-[#616161] dark:text-[#b5bcc4] mt-1">
                    Membership: $100 − $5 − ~$3.30 = ~$91.70
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
                Ko-fi has a clear fee advantage — especially on tips where there's 0% platform fee.
                Heimursaga's 10% goes toward expedition-specific tools (maps, routing, weather, obstacle detection) that Ko-fi doesn't offer.
                Both platforms require a creator subscription for full features.
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
              headerA="Ko-fi"
              headerB="Heimursaga"
              rows={[
                { feature: 'One-time tips / donations', a: true, b: true, note: 'Ko-fi: "buy a coffee" tips. Heimursaga: $5–$10,000 per expedition' },
                { feature: 'Monthly memberships', a: true, b: true, note: 'Ko-fi: custom tiers. Heimursaga: 3 structured tiers ($5–$150/mo)' },
                { feature: 'Annual billing for supporters', a: false, b: true, note: 'Heimursaga: 10% discount for annual sponsors' },
                { feature: 'Micro-sponsorships ($3 one-tap)', a: true, b: true, note: 'Ko-fi: "buy a coffee" ($3 default). Heimursaga: quick sponsor on entries' },
                { feature: 'Expedition-scoped funding', a: false, b: true, note: 'Sponsors fund specific journeys, not just a creator' },
                { feature: 'Public funding progress', a: 'partial', b: true, note: 'Ko-fi: donation goal bar. Heimursaga: expedition-level funding with raised/goal/remaining' },
                { feature: 'Digital product sales / shop', a: true, b: false },
                { feature: 'Commissions (custom work)', a: true, b: false },
              ]}
            />
          </div>
        </section>

        {/* Sponsor / Donor Perks */}
        <section className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <Gift className="w-5 h-5" />
            <h2 className="text-lg font-bold">SUPPORTER / SPONSOR PERKS</h2>
          </div>
          <div className="p-4 sm:p-6">
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-4">
              What supporters get in return for their money — and how much control creators have over the perk structure.
            </p>
            <CompareTable
              headerA="Ko-fi"
              headerB="Heimursaga"
              rows={[
                { feature: 'Creator-defined tier perks', a: true, b: true, note: 'Ko-fi: fully custom. Heimursaga: structured perks that unlock by tier' },
                { feature: 'Supporter-only posts', a: true, b: false, note: 'Heimursaga uses early access and exclusive content types instead' },
                { feature: 'Early access to content', a: false, b: true, note: 'Heimursaga: automatic — Tier 2: 24hrs, Tier 3: 48hrs' },
                { feature: 'Sponsor wall / public recognition', a: true, b: true, note: 'Ko-fi: supporter leaderboard. Heimursaga: sponsor wall with tier highlighting' },
                { feature: 'Expedition notes access', a: false, b: true, note: 'All sponsor tiers get access to 500-character daily expedition updates' },
                { feature: 'Voice note updates', a: false, b: true, note: 'Tier 3 sponsors get exclusive audio updates from the explorer' },
                { feature: 'Direct messaging with creator', a: false, b: true, note: 'Ko-fi: messages on donations only. Heimursaga: full DM with Explorer Pro' },
                { feature: 'Discord role integration', a: true, b: false },
              ]}
            />

            {/* Heimursaga tier breakdown */}
            <div className="mt-6 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#202020] dark:border-[#616161] p-4">
              <h3 className="text-xs font-bold text-[#616161] dark:text-[#b5bcc4] uppercase tracking-wider mb-4">
                HEIMURSAGA TIER STRUCTURE
              </h3>

              {/* Monthly tiers */}
              <div className="mb-4">
                <h4 className="text-xs font-bold text-[#ac6d46] uppercase tracking-wider mb-2">MONTHLY SUBSCRIPTIONS</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { name: 'Fellow Traveler', price: '$5–$15/mo', perks: ['Expedition notes access', 'Name on sponsor wall'] },
                    { name: 'Journey Partner', price: '$15–$50/mo', perks: ['Everything below, plus:', '24hr early entry access'] },
                    { name: 'Expedition Patron', price: '$50–$150/mo', perks: ['Everything below, plus:', '48hr early entry access', 'Voice note updates'] },
                  ].map((tier) => (
                    <div key={tier.name} className="border border-[#b5bcc4]/40 dark:border-[#616161]/40 p-3">
                      <div className="font-semibold text-sm text-[#202020] dark:text-[#e5e5e5]">{tier.name}</div>
                      <div className="text-[10px] text-[#ac6d46] font-bold mb-2">{tier.price}</div>
                      <ul className="space-y-1">
                        {tier.perks.map((perk) => (
                          <li key={perk} className="text-[10px] text-[#616161] dark:text-[#b5bcc4]">{perk}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* One-time tiers */}
              <div>
                <h4 className="text-xs font-bold text-[#ac6d46] uppercase tracking-wider mb-2">ONE-TIME SPONSORSHIPS</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { name: 'Tier 1', price: '$5–$25', perks: ['Sponsor wall listing', 'Funding goal contribution', 'Expedition notes access'] },
                    { name: 'Tier 2', price: '$25–$75', perks: ['Everything below, plus:', '24hr early entry access'] },
                    { name: 'Tier 3', price: '$75+', perks: ['Everything below, plus:', '48hr early entry access', 'Voice note updates', 'Highlighted on sponsor wall'] },
                  ].map((tier) => (
                    <div key={tier.name} className="border border-[#b5bcc4]/40 dark:border-[#616161]/40 p-3">
                      <div className="font-semibold text-sm text-[#202020] dark:text-[#e5e5e5]">{tier.name}</div>
                      <div className="text-[10px] text-[#ac6d46] font-bold mb-2">{tier.price}</div>
                      <ul className="space-y-1">
                        {tier.perks.map((perk) => (
                          <li key={perk} className="text-[10px] text-[#616161] dark:text-[#b5bcc4]">{perk}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[10px] sm:text-xs text-[#616161] dark:text-[#b5bcc4] mt-4">
                Explorers set their own prices within each tier's range. One-time sponsorships are expedition-scoped. Monthly subscriptions cover all of an explorer's expeditions.
              </p>
            </div>
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
              headerA="Ko-fi"
              headerB="Heimursaga"
              rows={[
                { feature: 'Text posts', a: true, b: true, note: 'Ko-fi: blog-style posts. Heimursaga: journal entries' },
                { feature: 'Photo galleries', a: true, b: true, note: 'Heimursaga: up to 10 photos per entry (Pro)' },
                { feature: 'Native video hosting', a: false, b: false, note: 'Neither platform hosts video natively' },
                { feature: 'YouTube video embeds', a: true, b: true, note: 'Dedicated video entry type on Heimursaga' },
                { feature: 'Audio uploads', a: true, b: true, note: 'Ko-fi: audio in posts. Heimursaga: voice notes per expedition' },
                { feature: 'Supporter-only content', a: true, b: 'partial', note: 'Ko-fi: full post gating. Heimursaga: expedition notes and voice notes are sponsor-exclusive; entries use early access' },
                { feature: 'Automatic early access by tier', a: false, b: true, note: 'Tier 2: 24hrs early. Tier 3: 48hrs early' },
                { feature: 'Scheduled posts', a: true, b: false, note: 'Ko-fi Gold feature' },
                { feature: 'Content tied to GPS location', a: false, b: true },
                { feature: 'Expedition narrative arc', a: false, b: true, note: 'Entries form a chronological journey with route — not a feed of posts' },
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
              Ko-fi is a tipping and membership platform — it has no expedition-specific tooling. This is where the platforms fundamentally diverge.
            </p>
            <CompareTable
              headerA="Ko-fi"
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
              headerA="Ko-fi"
              headerB="Heimursaga"
              rows={[
                { feature: 'Explore / discovery page', a: 'partial', b: true, note: 'Ko-fi: basic browse by category. Heimursaga: explorer search and browse' },
                { feature: 'Comments on posts', a: true, b: true, note: 'Heimursaga: threaded replies on entries' },
                { feature: 'Direct messaging', a: false, b: true, note: 'Ko-fi has donation messages only. Heimursaga: full DM with Explorer Pro' },
                { feature: 'Follow / bookmark system', a: true, b: true },
                { feature: 'Public sponsor wall', a: true, b: true, note: 'Ko-fi: supporter leaderboard. Heimursaga: sponsor wall with tier highlighting' },
                { feature: 'Expedition notes', a: false, b: true, note: '500-character daily updates — public or sponsor-exclusive' },
                { feature: 'Discord integration', a: true, b: false, note: 'Ko-fi: auto-assign Discord roles to supporters' },
                { feature: 'Email notifications to supporters', a: true, b: true, note: 'Ko-fi: basic notifications. Heimursaga: entry delivery enabled by default for monthly sponsors' },
              ]}
            />
          </div>
        </section>

        {/* E-commerce */}
        <section className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <ShoppingBag className="w-5 h-5" />
            <h2 className="text-lg font-bold">E-COMMERCE & EXTRAS</h2>
          </div>
          <div className="p-4 sm:p-6">
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-4">
              Ko-fi doubles as a lightweight storefront. Heimursaga is focused on expedition documentation and sponsorship.
            </p>
            <CompareTable
              headerA="Ko-fi"
              headerB="Heimursaga"
              rows={[
                { feature: 'Digital product sales', a: true, b: false, note: 'PDFs, presets, templates, music files' },
                { feature: 'Physical product sales', a: true, b: false },
                { feature: 'Custom commissions', a: true, b: false, note: 'Commission slots with queue management' },
                { feature: 'Pay-what-you-want pricing', a: true, b: false },
                { feature: 'PayPal support', a: true, b: false, note: 'Ko-fi: PayPal with instant payouts. Heimursaga: Stripe only' },
                { feature: 'Instant payouts (PayPal)', a: true, b: false, note: 'Ko-fi: money arrives immediately via PayPal' },
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
              {/* Ko-fi strengths */}
              <div className="border-2 border-[#b5bcc4] dark:border-[#616161] p-4 sm:p-5">
                <h3 className="text-sm font-bold text-[#616161] dark:text-[#b5bcc4] uppercase tracking-wider mb-3 sm:mb-4">
                  WHAT KO-FI DOES BETTER
                </h3>
                <ul className="space-y-3 text-sm text-[#202020] dark:text-[#e5e5e5]">
                  <li className="flex items-start gap-2">
                    <DollarSign className="w-4 h-4 text-[#616161] mt-0.5 flex-shrink-0" />
                    <span><strong>Lower fees</strong> — 0% platform fee on tips is hard to beat. Even memberships are only 5% vs Heimursaga's 10%.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Coffee className="w-4 h-4 text-[#616161] mt-0.5 flex-shrink-0" />
                    <span><strong>Dead simple to start</strong> — no subscription required. Set up a page, share a link, start receiving tips in minutes.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ShoppingBag className="w-4 h-4 text-[#616161] mt-0.5 flex-shrink-0" />
                    <span><strong>Built-in shop and commissions</strong> — sell digital products, physical merch, and take custom commission requests from a single page.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Heart className="w-4 h-4 text-[#616161] mt-0.5 flex-shrink-0" />
                    <span><strong>PayPal instant payouts</strong> — money arrives in your PayPal balance immediately. No waiting for Stripe's payout schedule.</span>
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
                    <span><strong>Purpose-built for expeditions</strong> — route maps, waypoints, waterway routing, obstacle detection, weather. Ko-fi has none of this.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Navigation className="w-4 h-4 text-[#ac6d46] mt-0.5 flex-shrink-0" />
                    <span><strong>Content tied to geography</strong> — every entry and waypoint lives on a map. Followers see the journey unfold spatially, not as a feed of posts.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-[#ac6d46] mt-0.5 flex-shrink-0" />
                    <span><strong>Expedition-scoped sponsorship</strong> — sponsors fund specific journeys with public progress tracking. Ko-fi tips are creator-level, not journey-level.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Mic className="w-4 h-4 text-[#ac6d46] mt-0.5 flex-shrink-0" />
                    <span><strong>Structured perks and annual billing</strong> — automatic early access by tier, voice notes, expedition notes, and 10% discount for annual sponsors. Ko-fi has no annual billing.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom line */}
            <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#202020] dark:border-[#616161] p-4 sm:p-6">
              <h3 className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-3">THE BOTTOM LINE</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-3">
                Ko-fi is excellent at what it does: simple tipping, lightweight memberships, and a built-in shop — all with
                minimal fees. If you just need a "support me" link for your YouTube description, Ko-fi is a great choice.
              </p>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Heimursaga is built for creators whose content is inseparable from where it happens.
                Your entries live on a map, your route is tracked, your sponsors fund specific expeditions,
                and supporters follow the journey — not just the creator. If your audience wants to see
                where you are, where you've been, and what's ahead, Ko-fi can't do that.
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

      {/* Cross-links */}
      <div className="mt-8 text-center">
        <p className="text-xs font-bold text-[#616161] dark:text-[#b5bcc4] uppercase tracking-wider mb-3">MORE COMPARISONS</p>
        <div className="flex justify-center gap-4 sm:gap-6 flex-wrap">
          <Link href="/compare/patreon" className="text-sm text-[#ac6d46] hover:text-[#4676ac]">Patreon vs Heimursaga</Link>
          <Link href="/compare/substack" className="text-sm text-[#ac6d46] hover:text-[#4676ac]">Substack vs Heimursaga</Link>
        </div>
      </div>
    </div>
  );
}
