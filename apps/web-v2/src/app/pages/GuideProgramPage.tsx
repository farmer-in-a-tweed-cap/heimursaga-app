'use client';

import Link from 'next/link';
import { Compass, Map, Route, Star, DollarSign, Shield, Users, CheckCircle, Layers, Rocket } from 'lucide-react';

export function GuideProgramPage() {
  return (
    <div className="max-w-[1200px] mx-auto px-6 py-12">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="p-6">
          <div className="flex items-center mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
            <h1 className="text-2xl font-bold dark:text-[#e5e5e5]">EXPEDITION GUIDE PROGRAM</h1>
          </div>
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4]">
            Professional guides create curated, field-tested expedition blueprints that explorers can launch and experience on their own terms
          </p>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#202020] dark:border-[#616161] p-6 mb-8">
        <h2 className="text-sm font-bold mb-4 text-[#202020] dark:text-white border-b border-[#616161] pb-2">
          QUICK NAVIGATION
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <a href="#what-is-the-guide-program" className="text-xs text-[#598636] hover:text-[#4676ac] font-mono">
            &rarr; What Is the Guide Program?
          </a>
          <a href="#what-are-blueprints" className="text-xs text-[#598636] hover:text-[#4676ac] font-mono">
            &rarr; What Are Expedition Blueprints?
          </a>
          <a href="#creating-blueprints" className="text-xs text-[#598636] hover:text-[#4676ac] font-mono">
            &rarr; Creating a Blueprint
          </a>
          <a href="#launching-blueprints" className="text-xs text-[#598636] hover:text-[#4676ac] font-mono">
            &rarr; Launching a Blueprint
          </a>
          <a href="#ratings-and-reviews" className="text-xs text-[#598636] hover:text-[#4676ac] font-mono">
            &rarr; Ratings &amp; Reviews
          </a>
          <a href="#tipping-and-earnings" className="text-xs text-[#598636] hover:text-[#4676ac] font-mono">
            &rarr; Tipping &amp; Earnings
          </a>
          <a href="#guide-vs-explorer" className="text-xs text-[#598636] hover:text-[#4676ac] font-mono">
            &rarr; Guide vs Explorer Accounts
          </a>
          <a href="#becoming-a-guide" className="text-xs text-[#598636] hover:text-[#4676ac] font-mono">
            &rarr; Becoming a Guide
          </a>
          <a href="#fees-and-transparency" className="text-xs text-[#598636] hover:text-[#4676ac] font-mono">
            &rarr; Fees &amp; Transparency
          </a>
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-8">
        {/* 1. What Is the Guide Program? */}
        <section id="what-is-the-guide-program" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#598636] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <Compass className="w-5 h-5" />
            <h2 className="text-lg font-bold">WHAT IS THE EXPEDITION GUIDE PROGRAM?</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Professional Expertise Meets Exploration</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                The Expedition Guide Program brings professional outdoor guides, expedition leaders, and experienced
                route planners onto Heimursaga. Guides are vetted professionals who design highly curated,
                field-tested expedition blueprints&mdash;complete routes with waypoints, terrain data, and expert
                knowledge built in. These blueprints represent proven expeditions that guides have personally
                scouted, planned, or led.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Two Sides of the Program</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-3">
                The Guide Program serves both guides and explorers:
              </p>
              <ul className="space-y-2 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-[#598636] mt-1">&bull;</span>
                  <span><strong>For guides</strong>&mdash;a platform to share professional route knowledge, build a
                  portfolio of expedition blueprints, and earn tips from explorers who use their work</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">&bull;</span>
                  <span><strong>For explorers</strong>&mdash;access to professionally designed expeditions that remove
                  the guesswork from route planning, with the confidence that comes from a proven, curated route</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 2. What Are Expedition Blueprints? */}
        <section id="what-are-blueprints" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <Map className="w-5 h-5" />
            <h2 className="text-lg font-bold">WHAT ARE EXPEDITION BLUEPRINTS?</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                An expedition blueprint is a pre-planned, complete expedition route created by a professional guide.
                Unlike regular expeditions&mdash;which are planned, lived, and documented in real time by the
                explorer&mdash;blueprints are designed upfront as reusable templates that any explorer can launch.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">What a Blueprint Includes</h3>
              <ul className="space-y-2 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-[#598636] mt-1">&bull;</span>
                  <span><strong>A complete route</strong> with mapped waypoints, distances, and elevation data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#598636] mt-1">&bull;</span>
                  <span><strong>Mode of travel</strong>&mdash;hike, paddle, bike, sail, drive, or mixed</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#598636] mt-1">&bull;</span>
                  <span><strong>Title and description</strong> with context about the terrain, difficulty, and what to expect</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#598636] mt-1">&bull;</span>
                  <span><strong>Travel time</strong> based on the guide&apos;s professional assessment</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">What Makes Blueprints Different</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Blueprints are not rough sketches or theoretical plans. They represent routes that a professional
                guide has curated based on real-world knowledge&mdash;terrain conditions, optimal waypoint placement,
                seasonal considerations, and practical logistics. When you launch a blueprint, you&apos;re following
                a proven path, not an untested idea.
              </p>
            </div>

            <div className="p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#598636]">
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                Blueprints appear with a green &ldquo;EXPEDITION BLUEPRINT&rdquo; banner and are browsable separately
                from regular expeditions. They do not appear in the main expedition feed.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Creating a Blueprint */}
        <section id="creating-blueprints" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#598636] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <Route className="w-5 h-5" />
            <h2 className="text-lg font-bold">CREATING A BLUEPRINT</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-3">
                Guide accounts use the same expedition builder available to Explorer Pro accounts. The key
                difference is that guides create blueprints instead of live expeditions&mdash;there are no start
                dates, end dates, or sponsorship fields. The focus is entirely on the route.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Blueprint Creation Process</h3>
              <div className="space-y-3 ml-6">
                <div className="flex items-start gap-3 text-sm text-[#202020] dark:text-[#e5e5e5]">
                  <span className="text-[#598636] font-bold font-mono min-w-[20px]">1.</span>
                  <span><strong>Build the route</strong>&mdash;place waypoints on the map, define the path between
                  them, and select the mode of travel for each leg</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-[#202020] dark:text-[#e5e5e5]">
                  <span className="text-[#598636] font-bold font-mono min-w-[20px]">2.</span>
                  <span><strong>Add details</strong>&mdash;write a title and description that conveys the character
                  of the route, what makes it worthwhile, and what explorers should know</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-[#202020] dark:text-[#e5e5e5]">
                  <span className="text-[#598636] font-bold font-mono min-w-[20px]">3.</span>
                  <span><strong>Select mode</strong>&mdash;choose the expedition mode (hike, paddle, bike, sail,
                  drive, or mixed) so explorers can filter and find the right type of adventure</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-[#202020] dark:text-[#e5e5e5]">
                  <span className="text-[#598636] font-bold font-mono min-w-[20px]">4.</span>
                  <span><strong>Publish</strong>&mdash;once the blueprint has a title, description, and at least
                  two waypoints, it can be published and becomes visible to all explorers</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#598636]">
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                Blueprints start as drafts and are only visible to the guide until published. Guides can continue
                editing published blueprints to refine descriptions or update waypoints.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Launching a Blueprint */}
        <section id="launching-blueprints" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#ac6d46] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <Rocket className="w-5 h-5" />
            <h2 className="text-lg font-bold">LAUNCHING A BLUEPRINT</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">How Explorers Use Blueprints</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                When an explorer finds a blueprint they want to experience, they press
                <strong> Launch Expedition</strong>. This creates a new expedition in their own account based on
                the blueprint&apos;s route. The explorer then sets their own dates, plans their own timeline, and
                logs journal entries along the way&mdash;just like any other expedition on Heimursaga.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">What Gets Copied</h3>
              <ul className="space-y-2 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">&bull;</span>
                  <span>The complete route geometry and all waypoints</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">&bull;</span>
                  <span>Mode of travel for each route leg</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">&bull;</span>
                  <span>Distance and elevation data</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">What the Explorer Controls</h3>
              <ul className="space-y-2 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] mt-1">&bull;</span>
                  <span>Start and end dates</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] mt-1">&bull;</span>
                  <span>Title, description, and cover image</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] mt-1">&bull;</span>
                  <span>Journal entries, photos, and expedition notes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] mt-1">&bull;</span>
                  <span>Sponsorship settings (if Explorer Pro)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] mt-1">&bull;</span>
                  <span>Privacy and visibility settings</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Route Locking</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                The route on a launched expedition is locked&mdash;waypoints, route geometry, and travel modes
                cannot be changed. This preserves the integrity of the guide&apos;s curated route. The explorer
                experiences the expedition as the guide designed it, while still having full control over their
                own timeline, journal, and storytelling.
              </p>
            </div>

            <div className="p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#ac6d46]">
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                Each launched expedition includes a visible attribution link back to the original blueprint and
                its guide, so the source of the route is always transparent.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Ratings & Reviews */}
        <section id="ratings-and-reviews" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <Star className="w-5 h-5" />
            <h2 className="text-lg font-bold">RATINGS &amp; REVIEWS</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                After completing an expedition based on a blueprint, explorers are prompted to rate and review the
                blueprint. This feedback is essential&mdash;it helps other explorers evaluate blueprints and helps
                guides understand how their routes perform in practice.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">How Reviews Work</h3>
              <ul className="space-y-2 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">&bull;</span>
                  <span><strong>Star rating</strong>&mdash;1 to 5 stars reflecting the overall quality of the blueprint</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">&bull;</span>
                  <span><strong>Written review</strong>&mdash;optional text (up to 2,000 characters) describing the experience</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">&bull;</span>
                  <span><strong>One review per explorer</strong>&mdash;each explorer can leave one review per
                  blueprint, which can be updated if they want to revise their assessment</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">&bull;</span>
                  <span><strong>Requires completion</strong>&mdash;reviews can only be submitted after the explorer
                  completes the launched expedition, ensuring all feedback is based on actual experience</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Where Reviews Appear</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Average ratings and review counts are displayed on blueprint cards and the blueprint detail page.
                Individual reviews with star ratings, text, and reviewer attribution are visible in the reviews
                section of the blueprint detail page.
              </p>
            </div>
          </div>
        </section>

        {/* 6. Tipping & Earnings */}
        <section id="tipping-and-earnings" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#598636] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <DollarSign className="w-5 h-5" />
            <h2 className="text-lg font-bold">TIPPING &amp; EARNINGS</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Guides can earn tips from explorers who appreciate their blueprints. Tipping is entirely
                optional&mdash;there is no paywall on blueprints, and explorers can launch any published blueprint
                for free. Tips are a way for explorers to show gratitude for high-quality route design.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">How Tipping Works</h3>
              <ul className="space-y-2 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-[#598636] mt-1">&bull;</span>
                  <span>Explorers can tip a guide when completing an expedition based on their blueprint</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#598636] mt-1">&bull;</span>
                  <span>Tip amounts range from <strong>$5 to $100</strong> per tip</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#598636] mt-1">&bull;</span>
                  <span>Payment is processed securely via Stripe&mdash;guides must connect a Stripe account to receive tips</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#598636] mt-1">&bull;</span>
                  <span>Tips can be sent using a saved payment method or a new card at the time of tipping</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Guide Payouts</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Tips are paid out to guides through Stripe Connect. Guides receive <strong>90%</strong> of each
                tip after the 10% platform fee. Stripe&apos;s standard payment processing fees also apply and are
                deducted before payout. Payout timing follows Stripe&apos;s standard schedule for the guide&apos;s
                connected account.
              </p>
            </div>

            <div className="p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#598636]">
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                Tipping is only available when the guide has completed Stripe Connect onboarding. If a guide has
                not connected their Stripe account, the tip option will not appear.
              </p>
            </div>
          </div>
        </section>

        {/* 7. Guide vs Explorer Accounts */}
        <section id="guide-vs-explorer" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <Layers className="w-5 h-5" />
            <h2 className="text-lg font-bold">GUIDE VS EXPLORER ACCOUNTS</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-4">
                Guide accounts are a distinct account type on Heimursaga, designed specifically for professional
                route design. They differ from explorer accounts in several important ways:
              </p>
            </div>

            {/* Comparison table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#202020] dark:border-[#616161]">
                    <th className="text-left py-2 pr-4 text-xs font-bold text-[#616161] dark:text-[#b5bcc4]">FEATURE</th>
                    <th className="text-center py-2 px-4 text-xs font-bold text-[#598636]">GUIDE</th>
                    <th className="text-center py-2 px-4 text-xs font-bold text-[#ac6d46]">EXPLORER PRO</th>
                    <th className="text-center py-2 pl-4 text-xs font-bold text-[#4676ac]">EXPLORER</th>
                  </tr>
                </thead>
                <tbody className="text-[#202020] dark:text-[#e5e5e5]">
                  <tr className="border-b border-[#b5bcc4] dark:border-[#3a3a3a]">
                    <td className="py-2 pr-4 text-xs">Create expedition blueprints</td>
                    <td className="py-2 px-4 text-center text-[#598636] font-bold">Yes</td>
                    <td className="py-2 px-4 text-center text-[#616161]">&mdash;</td>
                    <td className="py-2 pl-4 text-center text-[#616161]">&mdash;</td>
                  </tr>
                  <tr className="border-b border-[#b5bcc4] dark:border-[#3a3a3a]">
                    <td className="py-2 pr-4 text-xs">Create live expeditions</td>
                    <td className="py-2 px-4 text-center text-[#616161]">&mdash;</td>
                    <td className="py-2 px-4 text-center text-[#ac6d46] font-bold">Yes</td>
                    <td className="py-2 pl-4 text-center text-[#4676ac] font-bold">Yes</td>
                  </tr>
                  <tr className="border-b border-[#b5bcc4] dark:border-[#3a3a3a]">
                    <td className="py-2 pr-4 text-xs">Log journal entries</td>
                    <td className="py-2 px-4 text-center text-[#616161]">&mdash;</td>
                    <td className="py-2 px-4 text-center text-[#ac6d46] font-bold">Yes</td>
                    <td className="py-2 pl-4 text-center text-[#4676ac] font-bold">Yes</td>
                  </tr>
                  <tr className="border-b border-[#b5bcc4] dark:border-[#3a3a3a]">
                    <td className="py-2 pr-4 text-xs">Launch blueprints</td>
                    <td className="py-2 px-4 text-center text-[#616161]">&mdash;</td>
                    <td className="py-2 px-4 text-center text-[#ac6d46] font-bold">Yes</td>
                    <td className="py-2 pl-4 text-center text-[#4676ac] font-bold">Yes</td>
                  </tr>
                  <tr className="border-b border-[#b5bcc4] dark:border-[#3a3a3a]">
                    <td className="py-2 pr-4 text-xs">Receive tips</td>
                    <td className="py-2 px-4 text-center text-[#598636] font-bold">Yes</td>
                    <td className="py-2 px-4 text-center text-[#616161]">&mdash;</td>
                    <td className="py-2 pl-4 text-center text-[#616161]">&mdash;</td>
                  </tr>
                  <tr className="border-b border-[#b5bcc4] dark:border-[#3a3a3a]">
                    <td className="py-2 pr-4 text-xs">Receive sponsorships</td>
                    <td className="py-2 px-4 text-center text-[#616161]">&mdash;</td>
                    <td className="py-2 px-4 text-center text-[#ac6d46] font-bold">Yes</td>
                    <td className="py-2 pl-4 text-center text-[#616161]">&mdash;</td>
                  </tr>
                  <tr className="border-b border-[#b5bcc4] dark:border-[#3a3a3a]">
                    <td className="py-2 pr-4 text-xs">Expedition builder</td>
                    <td className="py-2 px-4 text-center text-[#598636] font-bold">Yes</td>
                    <td className="py-2 px-4 text-center text-[#ac6d46] font-bold">Yes</td>
                    <td className="py-2 pl-4 text-center text-[#616161]">&mdash;</td>
                  </tr>
                  <tr className="border-b border-[#b5bcc4] dark:border-[#3a3a3a]">
                    <td className="py-2 pr-4 text-xs">Account cost</td>
                    <td className="py-2 px-4 text-center text-[#598636] font-bold">Free</td>
                    <td className="py-2 px-4 text-center text-xs text-[#ac6d46]">Subscription</td>
                    <td className="py-2 pl-4 text-center text-[#4676ac] font-bold">Free</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-xs">Profile type</td>
                    <td className="py-2 px-4 text-center text-xs text-[#598636]">Portfolio</td>
                    <td className="py-2 px-4 text-center text-xs text-[#ac6d46]">Journal</td>
                    <td className="py-2 pl-4 text-center text-xs text-[#4676ac]">Journal</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#598636]">
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                Guide accounts are visually distinguished by green accent styling throughout the platform.
                Guide profiles display a portfolio of published blueprints rather than a journal of expeditions
                and entries.
              </p>
            </div>
          </div>
        </section>

        {/* 8. Becoming a Guide */}
        <section id="becoming-a-guide" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#598636] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <Shield className="w-5 h-5" />
            <h2 className="text-lg font-bold">BECOMING A GUIDE</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Invite-Only Program</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                The Expedition Guide Program is currently invite-only. Guides are vetted professionals&mdash;outdoor
                leaders, expedition planners, certified guides, and experienced route designers&mdash;whose
                expertise ensures that every published blueprint meets a high standard of quality and reliability.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">What We Look For</h3>
              <ul className="space-y-2 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-[#598636] mt-1">&bull;</span>
                  <span>Professional experience in outdoor guiding, expedition leadership, or route planning</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#598636] mt-1">&bull;</span>
                  <span>Demonstrated knowledge of specific regions, terrains, or modes of travel</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#598636] mt-1">&bull;</span>
                  <span>A commitment to creating curated, field-tested routes&mdash;not theoretical plans</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#598636] mt-1">&bull;</span>
                  <span>Ability to provide clear, practical descriptions that prepare explorers for the terrain</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">How to Apply</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-3">
                A formal application process is planned for the future. In the meantime, if you are a professional
                guide interested in joining the program and would like to request an invite code, reach out through
                our contact page.
              </p>
              <Link
                href="/contact"
                className="inline-block px-6 py-3 bg-[#598636] text-white text-sm font-bold hover:bg-[#476b2b] transition-all active:scale-[0.98]"
              >
                CONTACT US ABOUT THE GUIDE PROGRAM
              </Link>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Getting Started as a Guide</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Once you have an invite code:
              </p>
              <div className="space-y-3 ml-6">
                <div className="flex items-start gap-3 text-sm text-[#202020] dark:text-[#e5e5e5]">
                  <span className="text-[#598636] font-bold font-mono min-w-[20px]">1.</span>
                  <span>Register for a Heimursaga account and enter your invite code during signup</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-[#202020] dark:text-[#e5e5e5]">
                  <span className="text-[#598636] font-bold font-mono min-w-[20px]">2.</span>
                  <span>Connect your Stripe account to enable tip payouts</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-[#202020] dark:text-[#e5e5e5]">
                  <span className="text-[#598636] font-bold font-mono min-w-[20px]">3.</span>
                  <span>Create your first blueprint using the expedition builder</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-[#202020] dark:text-[#e5e5e5]">
                  <span className="text-[#598636] font-bold font-mono min-w-[20px]">4.</span>
                  <span>Publish when ready&mdash;your blueprint will be visible to all explorers</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 9. Fees & Transparency */}
        <section id="fees-and-transparency" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <CheckCircle className="w-5 h-5" />
            <h2 className="text-lg font-bold">FEES &amp; TRANSPARENCY</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-3">
                Heimursaga is committed to full transparency on all fees. Here is the complete breakdown
                for guide-related transactions:
              </p>
            </div>

            <div className="p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#598636]">
              <h3 className="font-bold mb-3 text-[#202020] dark:text-white text-sm">Tip Fee Structure</h3>
              <div className="space-y-2 text-sm text-[#202020] dark:text-[#e5e5e5]">
                <div className="flex justify-between items-baseline">
                  <span className="text-[#616161] dark:text-[#b5bcc4] text-xs font-mono">Platform fee:</span>
                  <span className="font-bold">10%</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[#616161] dark:text-[#b5bcc4] text-xs font-mono">Stripe processing:</span>
                  <span className="font-bold">2.9% + $0.30</span>
                </div>
                <div className="flex justify-between items-baseline border-t border-[#b5bcc4] dark:border-[#3a3a3a] pt-2 mt-2">
                  <span className="text-[#616161] dark:text-[#b5bcc4] text-xs font-mono">Guide receives:</span>
                  <span className="font-bold text-[#598636]">~87% of tip amount</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Example</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                On a $20 tip: $2.00 platform fee + ~$0.88 Stripe processing = guide receives approximately $17.12.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">What&apos;s Free</h3>
              <ul className="space-y-2 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-[#598636] mt-1">&bull;</span>
                  <span>Guide accounts are free&mdash;no subscription or listing fees</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#598636] mt-1">&bull;</span>
                  <span>Publishing blueprints is free</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#598636] mt-1">&bull;</span>
                  <span>Launching blueprints is free for explorers</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#598636] mt-1">&bull;</span>
                  <span>Fees only apply when a tip transaction occurs</span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
