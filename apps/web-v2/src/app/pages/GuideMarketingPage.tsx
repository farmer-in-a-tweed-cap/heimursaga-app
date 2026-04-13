'use client';

import Image from 'next/image';

export function GuideMarketingPage() {
  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          /* Hide site chrome */
          header, footer, nav, .no-print { display: none !important; }
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
        {/* Export button — hidden in print */}
        <div className="no-print mb-8 flex items-center justify-between">
          <p className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
            Marketing reference material — Expedition Guide Program
          </p>
          <button
            onClick={() => window.print()}
            className="px-5 py-2.5 bg-[#202020] dark:bg-[#598636] text-white text-xs font-bold tracking-[0.14em] hover:bg-[#3a3a3a] dark:hover:bg-[#476b2b] transition-all active:scale-[0.98]"
          >
            EXPORT TO PDF
          </button>
        </div>

        {/* ─── PAGE 1: COVER + VALUE PROPOSITION ─── */}
        <div className="avoid-break">
          {/* Header */}
          <div className="bg-[#202020] px-8 py-6 -mx-6 print-cover-header flex justify-center">
            <Image src="/logo-lg-light.svg" alt="Heimursaga" width={300} height={96} className="h-20 w-auto" style={{ marginLeft: '-15px' }} />
          </div>
          <div className="pt-6 mb-4">
            <h1 className="text-3xl font-bold text-[#202020] dark:text-white mb-2" style={{ fontFamily: 'Lora, serif' }}>
              Expedition Guide Program
            </h1>
            <p className="text-base text-[#616161] dark:text-[#b5bcc4] leading-relaxed max-w-[700px]" style={{ fontFamily: 'Lora, serif' }}>
              Turn your professional route knowledge into curated expedition blueprints that explorers
              around the world can discover, launch, and experience on their own terms.
            </p>
          </div>

          <div className="border-t-4 border-[#598636] mb-6"></div>

          {/* Platform intro */}
          <div className="mb-6 avoid-break">
            <h3 className="text-sm font-bold text-[#202020] dark:text-white mb-1.5 tracking-[0.06em]">ABOUT HEIMURSAGA</h3>
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
              Heimursaga is a journaling and sponsorship platform built for explorers, travelers, and adventurers.
              Explorers create expeditions, log journal entries with photos and locations along the way, and share
              their journeys with a community of followers. The platform supports financial sponsorships so that
              supporters can fund the expeditions they believe in. All content on Heimursaga is human-created — AI-generated
              text, images, and media are strictly prohibited. The Expedition Guide Program extends this platform to
              professional guides, giving them a dedicated space to publish curated routes that the explorer community
              can discover and experience firsthand.
            </p>
          </div>

          {/* Three-column value props */}
          <div className="grid grid-cols-3 gap-5 mb-6">
            <div className="border-t-2 border-[#598636] pt-3">
              <h3 className="text-sm font-bold text-[#202020] dark:text-white mb-1.5 tracking-[0.06em]">SHARE YOUR EXPERTISE</h3>
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
                Publish field-tested routes as reusable blueprints. Your professional knowledge reaches explorers
                who want proven paths, not guesswork.
              </p>
            </div>
            <div className="border-t-2 border-[#ac6d46] pt-3">
              <h3 className="text-sm font-bold text-[#202020] dark:text-white mb-1.5 tracking-[0.06em]">BUILD YOUR PORTFOLIO</h3>
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
                Your guide profile showcases every published blueprint with ratings, adoption counts,
                and reviews from the explorers who used them.
              </p>
            </div>
            <div className="border-t-2 border-[#4676ac] pt-3">
              <h3 className="text-sm font-bold text-[#202020] dark:text-white mb-1.5 tracking-[0.06em]">EARN FROM YOUR WORK</h3>
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
                Explorers can tip you directly through the platform. No subscription fees, no listing
                costs — you earn when explorers value your routes.
              </p>
            </div>
          </div>

          {/* What is a blueprint */}
          <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] p-5 mb-10 avoid-break">
            <h2 className="text-sm font-bold text-[#202020] dark:text-white mb-2 tracking-[0.06em]">WHAT IS AN EXPEDITION BLUEPRINT?</h2>
            <p className="text-xs text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-3">
              An expedition blueprint is a pre-planned, complete expedition route created by a professional guide.
              Unlike regular expeditions — which are planned, lived, and documented in real time by the
              explorer — blueprints are designed upfront as reusable templates that any explorer can launch.
            </p>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <h3 className="text-xs font-bold text-[#598636] mb-1.5 tracking-[0.1em]">WHAT A BLUEPRINT INCLUDES</h3>
                <ul className="space-y-1 text-xs text-[#202020] dark:text-[#e5e5e5]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#598636] mt-0.5">&#9654;</span>
                    <span>A complete route with mapped waypoints, distances, and elevation data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#598636] mt-0.5">&#9654;</span>
                    <span>Activity type — hike, paddle, bike, sail, drive, or mixed</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#598636] mt-0.5">&#9654;</span>
                    <span>Title and description with terrain context, difficulty, and expectations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#598636] mt-0.5">&#9654;</span>
                    <span>Travel time based on professional assessment</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#ac6d46] mb-1.5 tracking-[0.1em]">WHAT MAKES THEM DIFFERENT</h3>
                <p className="text-xs text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                  Blueprints are not rough sketches or theoretical plans. They represent routes that a professional
                  guide has curated based on real-world knowledge — terrain conditions, optimal waypoint placement,
                  seasonal considerations, and practical logistics.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── PAGE 2: HOW IT WORKS ─── */}
        <div className="page-break avoid-break mb-10">
          <div className="bg-[#202020] px-6 py-4 mb-6">
            <h2 className="text-lg font-bold text-white tracking-[0.06em]">HOW IT WORKS</h2>
          </div>

          {/* Creation process */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-[#598636] mb-4 tracking-[0.1em]">CREATING A BLUEPRINT</h3>
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-4 leading-relaxed">
              Guide accounts use the same expedition builder available to Explorer Pro accounts. The key
              difference is that guides create blueprints instead of live expeditions — there are no start
              dates, end dates, or sponsorship fields. The focus is entirely on the route.
            </p>
            <div className="grid grid-cols-4 gap-4">
              {[
                { step: '01', title: 'Build the Route', desc: 'Place waypoints on the map, define the path, and select the route mode for each leg.' },
                { step: '02', title: 'Add Details', desc: 'Write a title and description conveying the character of the route and what explorers should know.' },
                { step: '03', title: 'Set Activity Type', desc: 'Classify the expedition (hike, paddle, bike, sail, drive, or mixed) so explorers can filter and find the right adventure.' },
                { step: '04', title: 'Publish', desc: 'Once the blueprint has a title, description, and at least two waypoints, it can be published.' },
              ].map((item) => (
                <div key={item.step} className="border-l-2 border-[#598636] pl-3">
                  <div className="text-2xl font-bold text-[#598636] mb-1 font-mono">{item.step}</div>
                  <div className="text-xs font-bold text-[#202020] dark:text-white mb-1">{item.title}</div>
                  <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* What happens when an explorer launches */}
          <div className="mb-8 avoid-break">
            <h3 className="text-sm font-bold text-[#ac6d46] mb-4 tracking-[0.1em]">WHEN AN EXPLORER LAUNCHES YOUR BLUEPRINT</h3>
            <p className="text-xs text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-4">
              When an explorer finds a blueprint they want to experience, they press &ldquo;Launch Expedition.&rdquo;
              This creates a new expedition in their own account based on your route. The explorer sets their own dates,
              plans their own timeline, and logs journal entries along the way.
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] p-4">
                <h4 className="text-xs font-bold text-[#598636] mb-2 tracking-[0.1em]">COPIED FROM YOUR BLUEPRINT</h4>
                <ul className="space-y-1 text-xs text-[#202020] dark:text-[#e5e5e5]">
                  <li className="flex items-start gap-2"><span className="text-[#598636]">&#10003;</span> Complete route geometry and all waypoints</li>
                  <li className="flex items-start gap-2"><span className="text-[#598636]">&#10003;</span> Routing method for each leg (trail, waterway, cycling, etc.)</li>
                  <li className="flex items-start gap-2"><span className="text-[#598636]">&#10003;</span> Distance and elevation data</li>
                </ul>
              </div>
              <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] p-4">
                <h4 className="text-xs font-bold text-[#4676ac] mb-2 tracking-[0.1em]">CONTROLLED BY THE EXPLORER</h4>
                <ul className="space-y-1 text-xs text-[#202020] dark:text-[#e5e5e5]">
                  <li className="flex items-start gap-2"><span className="text-[#4676ac]">&#10003;</span> Start and end dates</li>
                  <li className="flex items-start gap-2"><span className="text-[#4676ac]">&#10003;</span> Title, description, and cover image</li>
                  <li className="flex items-start gap-2"><span className="text-[#4676ac]">&#10003;</span> Journal entries, photos, and notes</li>
                  <li className="flex items-start gap-2"><span className="text-[#4676ac]">&#10003;</span> Sponsorship and privacy settings</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Route locking */}
          <div className="border-l-4 border-[#598636] pl-4 mb-8 avoid-break">
            <h3 className="text-xs font-bold text-[#202020] dark:text-white mb-1 tracking-[0.06em]">ROUTE INTEGRITY</h3>
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
              The route on a launched expedition is locked — waypoints, route geometry, and route modes
              cannot be changed. This preserves the integrity of your curated route. The explorer
              experiences the expedition as you designed it, while having full control over their
              own timeline, journal, and storytelling. Every launched expedition includes a visible
              attribution link back to your original blueprint.
            </p>
          </div>
        </div>

        {/* ─── PAGE 3: EXPEDITION BUILDER ─── */}
        <div className="page-break avoid-break mb-10">
          <div className="bg-[#202020] px-6 py-4 mb-2">
            <h2 className="text-lg font-bold text-white tracking-[0.06em]">THE EXPEDITION BUILDER</h2>
          </div>
          <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-6 leading-relaxed">
            The builder is a full-featured route planning tool purpose-built for expedition design.
            If you&apos;ve used professional route planning software, you&apos;ll be immediately productive — the
            interface is built around waypoint placement, per-leg routing, and multi-modal travel.
          </p>

          {/* Routing modes */}
          <div className="mb-8 avoid-break">
            <h3 className="text-sm font-bold text-[#202020] dark:text-white mb-3 tracking-[0.06em]">SIX ROUTE MODES</h3>
            <p className="text-xs text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-4">
              Each leg between waypoints can use a different route mode. The builder computes accurate
              geometry, distance, and travel time for each leg independently, then aggregates across the full route.
            </p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { mode: 'Walking', color: '#4676ac', desc: 'Pedestrian routing on roads, paths, and walkways. Mapbox Directions API.' },
                { mode: 'Trail', color: '#598636', desc: 'Backcountry and hiking trails via Valhalla engine. Optimized for track and trail networks with hiking difficulty awareness.' },
                { mode: 'Cycling', color: '#9b59b6', desc: 'Bike-specific routing with road and cycle path preference. Mapbox Directions API.' },
                { mode: 'Driving', color: '#d35400', desc: 'Motor vehicle routing on the road network. Mapbox Directions API.' },
                { mode: 'Waterway', color: '#f59e0b', desc: 'Paddle and motorboat routing on rivers, canals, and navigable waterways. Custom A* pathfinding on OpenStreetMap water network.' },
                { mode: 'Straight Line', color: '#999999', desc: 'Direct point-to-point. Great-circle distance. Used for off-network segments or as a manual override.' },
              ].map((item) => (
                <div key={item.mode} className="border-l-3 pl-3" style={{ borderLeftWidth: 3, borderLeftColor: item.color }}>
                  <div className="text-xs font-bold text-[#202020] dark:text-white mb-1">{item.mode}</div>
                  <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Technical capabilities grid */}
          <div className="mb-8 avoid-break">
            <h3 className="text-sm font-bold text-[#202020] dark:text-white mb-3 tracking-[0.06em]">ROUTE PLANNING CAPABILITIES</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <h4 className="text-xs font-bold text-[#598636] mb-1.5 tracking-[0.1em]">WAYPOINT MANAGEMENT</h4>
                <ul className="space-y-1 text-xs text-[#202020] dark:text-[#e5e5e5]">
                  <li className="flex items-start gap-2"><span className="text-[#598636]">&#9654;</span> Click-to-place directly on the map</li>
                  <li className="flex items-start gap-2"><span className="text-[#598636]">&#9654;</span> Geocoder search for named locations</li>
                  <li className="flex items-start gap-2"><span className="text-[#598636]">&#9654;</span> Automatic route snapping (200m tolerance)</li>
                  <li className="flex items-start gap-2"><span className="text-[#598636]">&#9654;</span> Snap distance warnings when placement is far from the network</li>
                  <li className="flex items-start gap-2"><span className="text-[#598636]">&#9654;</span> Per-waypoint name, description, and sequence metadata</li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#ac6d46] mb-1.5 tracking-[0.1em]">ELEVATION &amp; TRAVEL TIME</h4>
                <ul className="space-y-1 text-xs text-[#202020] dark:text-[#e5e5e5]">
                  <li className="flex items-start gap-2"><span className="text-[#ac6d46]">&#9654;</span> Automatic elevation lookup for all waypoints</li>
                  <li className="flex items-start gap-2"><span className="text-[#ac6d46]">&#9654;</span> Elevation range displayed (min/max in meters or feet)</li>
                  <li className="flex items-start gap-2"><span className="text-[#ac6d46]">&#9654;</span> Naismith-style travel time with ascent penalties per route mode</li>
                  <li className="flex items-start gap-2"><span className="text-[#ac6d46]">&#9654;</span> Auto-calculated on every waypoint change</li>
                  <li className="flex items-start gap-2"><span className="text-[#ac6d46]">&#9654;</span> Manual override available for professional assessment</li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#4676ac] mb-1.5 tracking-[0.1em]">MAP &amp; VISUALIZATION</h4>
                <ul className="space-y-1 text-xs text-[#202020] dark:text-[#e5e5e5]">
                  <li className="flex items-start gap-2"><span className="text-[#4676ac]">&#9654;</span> Mapbox GL — vector tiles with custom Heimursaga styling</li>
                  <li className="flex items-start gap-2"><span className="text-[#4676ac]">&#9654;</span> Satellite + street label layer toggle</li>
                  <li className="flex items-start gap-2"><span className="text-[#4676ac]">&#9654;</span> Color-coded route legs by route mode</li>
                  <li className="flex items-start gap-2"><span className="text-[#4676ac]">&#9654;</span> Directional flow indicators on waterway routes</li>
                  <li className="flex items-start gap-2"><span className="text-[#4676ac]">&#9654;</span> Auto-fit bounds to show full route extent</li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#202020] dark:text-white mb-1.5 tracking-[0.1em]">ADVANCED FEATURES</h4>
                <ul className="space-y-1 text-xs text-[#202020] dark:text-[#e5e5e5]">
                  <li className="flex items-start gap-2"><span className="text-[#202020] dark:text-[#b5bcc4]">&#9654;</span> Round-trip routing with automatic return leg</li>
                  <li className="flex items-start gap-2"><span className="text-[#202020] dark:text-[#b5bcc4]">&#9654;</span> Mixed-mode routing (different route mode per leg)</li>
                  <li className="flex items-start gap-2"><span className="text-[#202020] dark:text-[#b5bcc4]">&#9654;</span> POI search along planned route (lodging, fuel, water, etc.)</li>
                  <li className="flex items-start gap-2"><span className="text-[#202020] dark:text-[#b5bcc4]">&#9654;</span> Waterway obstacle detection (dams, locks, rapids, weirs)</li>
                  <li className="flex items-start gap-2"><span className="text-[#202020] dark:text-[#b5bcc4]">&#9654;</span> Upstream/downstream flow classification for paddle routes</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Waterway callout */}
          <div className="border-l-4 border-[#ac6d46] pl-4 mb-8 avoid-break">
            <h3 className="text-xs font-bold text-[#202020] dark:text-white mb-1 tracking-[0.06em]">WATERWAY ROUTING</h3>
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
              Heimursaga includes a purpose-built waterway routing engine that navigates rivers, canals, and
              navigable waterways using OpenStreetMap hydrological data. Routes are computed with A* pathfinding
              on the actual water network — not road approximations. The engine distinguishes canoe and motorboat
              profiles, calculates upstream penalties for paddle routes, and flags obstacles (dams, weirs, locks,
              waterfalls, rapids) along the computed path.
            </p>
          </div>

          {/* Competitive comparison — hidden for now
          <div className="avoid-break">
            ...
          </div>
          */}
        </div>

        {/* ─── PAGE 4: RATINGS & EARNINGS ─── */}
        <div className="page-break avoid-break mb-10">
          <div className="bg-[#202020] px-6 py-4 mb-6">
            <h2 className="text-lg font-bold text-white tracking-[0.06em]">RATINGS &amp; EARNINGS</h2>
          </div>

          {/* Ratings */}
          <div className="mb-8 avoid-break">
            <h3 className="text-sm font-bold text-[#202020] dark:text-white mb-3 tracking-[0.06em]">RATINGS &amp; REVIEWS</h3>
            <p className="text-xs text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-3">
              After completing an expedition based on a blueprint, explorers are prompted to rate and review it.
              This feedback helps other explorers evaluate blueprints and helps guides understand how their
              routes perform in practice.
            </p>
            <div className="grid grid-cols-4 gap-4 text-xs">
              <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] p-3 text-center">
                <div className="text-lg font-bold text-[#ac6d46] mb-1">&#9733; 1&ndash;5</div>
                <div className="text-[#616161] dark:text-[#b5bcc4]">Star rating</div>
              </div>
              <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] p-3 text-center">
                <div className="text-lg font-bold text-[#ac6d46] mb-1">2,000</div>
                <div className="text-[#616161] dark:text-[#b5bcc4]">Char review limit</div>
              </div>
              <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] p-3 text-center">
                <div className="text-lg font-bold text-[#ac6d46] mb-1">1 per</div>
                <div className="text-[#616161] dark:text-[#b5bcc4]">Explorer / blueprint</div>
              </div>
              <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] p-3 text-center">
                <div className="text-lg font-bold text-[#ac6d46] mb-1">Verified</div>
                <div className="text-[#616161] dark:text-[#b5bcc4]">Completion required</div>
              </div>
            </div>
          </div>

          {/* Earnings */}
          <div className="mb-8 avoid-break">
            <h3 className="text-sm font-bold text-[#202020] dark:text-white mb-3 tracking-[0.06em]">TIPPING &amp; EARNINGS</h3>
            <p className="text-xs text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-4">
              Guides earn tips from explorers who appreciate their blueprints. Tipping is entirely
              optional — there is no paywall on blueprints, and explorers can launch any published blueprint
              for free. Tips are a way for explorers to show gratitude for high-quality route design.
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="border-2 border-[#598636] p-4 text-center">
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-2 tracking-[0.1em]">TIP RANGE</div>
                <div className="text-xl font-bold text-[#202020] dark:text-white">$5 &ndash; $100</div>
              </div>
              <div className="border-2 border-[#598636] p-4 text-center">
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-2 tracking-[0.1em]">GUIDE RECEIVES</div>
                <div className="text-xl font-bold text-[#598636]">~87%</div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">after platform + processing fees</div>
              </div>
              <div className="border-2 border-[#598636] p-4 text-center">
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-2 tracking-[0.1em]">PLATFORM FEE</div>
                <div className="text-xl font-bold text-[#202020] dark:text-white">10%</div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">+ Stripe processing (2.9% + $0.30)</div>
              </div>
            </div>
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-3 italic">
              Example: On a $20 tip — $2.00 platform fee + ~$0.88 Stripe processing = guide receives approximately $17.12.
            </p>
          </div>

          {/* What's free callout */}
          <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] p-5 avoid-break">
            <h3 className="text-xs font-bold text-[#598636] mb-3 tracking-[0.1em]">ZERO COST TO GET STARTED</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs text-[#202020] dark:text-[#e5e5e5]">
              <div className="flex items-center gap-2"><span className="text-[#598636]">&#10003;</span> Guide accounts are free — no subscription or listing fees</div>
              <div className="flex items-center gap-2"><span className="text-[#598636]">&#10003;</span> Publishing blueprints is free</div>
              <div className="flex items-center gap-2"><span className="text-[#598636]">&#10003;</span> Launching blueprints is free for explorers</div>
              <div className="flex items-center gap-2"><span className="text-[#598636]">&#10003;</span> Fees only apply when a tip transaction occurs</div>
            </div>
          </div>
        </div>

        {/* ─── PAGE 4: GETTING STARTED + CTA ─── */}
        <div className="page-break avoid-break">
          <div className="bg-[#202020] px-6 py-4 mb-6">
            <h2 className="text-lg font-bold text-white tracking-[0.06em]">GETTING STARTED</h2>
          </div>

          {/* What we look for */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-[#202020] dark:text-white mb-3 tracking-[0.06em]">WHO WE&apos;RE LOOKING FOR</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                'Professional experience in outdoor guiding, expedition leadership, or route planning',
                'Demonstrated knowledge of specific regions, terrains, or modes of travel',
                'A commitment to creating curated, field-tested routes — not theoretical plans',
                'Ability to provide clear, practical descriptions that prepare explorers for the terrain',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-xs text-[#202020] dark:text-[#e5e5e5]">
                  <span className="text-[#598636] mt-0.5 shrink-0">&#9654;</span>
                  <span className="leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div className="mb-10 avoid-break">
            <h3 className="text-sm font-bold text-[#202020] dark:text-white mb-4 tracking-[0.06em]">ONBOARDING PROCESS</h3>
            <div className="grid grid-cols-4 gap-4">
              {[
                { step: '01', text: 'Register for a Heimursaga account with your invite code' },
                { step: '02', text: 'Connect your Stripe account to enable tip payouts' },
                { step: '03', text: 'Create your first blueprint using the expedition builder' },
                { step: '04', text: 'Publish — your blueprint is now visible to all explorers' },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-10 h-10 rounded-full bg-[#598636] text-white flex items-center justify-center mx-auto mb-2 text-sm font-bold font-mono">
                    {item.step}
                  </div>
                  <p className="text-xs text-[#202020] dark:text-[#e5e5e5] leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA block */}
          <div className="border-4 border-[#598636] p-8 text-center avoid-break">
            <h3 className="text-xl font-bold text-[#202020] dark:text-white mb-3" style={{ fontFamily: 'Lora, serif' }}>
              Ready to share your expertise?
            </h3>
            <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-6 max-w-[500px] mx-auto leading-relaxed">
              The Expedition Guide Program is currently invite-only. We&apos;re looking for experienced professionals
              who design routes worth following.
            </p>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1">
              <div><strong className="text-[#202020] dark:text-white">Email:</strong> guides@heimursaga.com</div>
              <div><strong className="text-[#202020] dark:text-white">Web:</strong> heimursaga.com/contact</div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-10 bg-[#202020] px-6 py-4 flex items-center justify-between">
            <Image src="/logo-lg-light.svg" alt="Heimursaga" width={180} height={58} className="h-6 w-auto" />
            <span className="text-xs text-[#b5bcc4]">Confidential — Expedition Guide Program</span>
          </div>
        </div>
      </div>
    </>
  );
}
