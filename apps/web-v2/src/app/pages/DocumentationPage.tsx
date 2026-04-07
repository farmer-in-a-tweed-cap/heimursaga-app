'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Compass, Users, DollarSign, Edit3, MapPin, Settings, Shield, MessageSquare, Award, Rocket } from 'lucide-react';

export function DocumentationPage() {
  return (
    <div className="max-w-[1600px] mx-auto px-6 py-12">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="p-6">
          <div className="flex items-center mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
            <h1 className="text-2xl font-bold dark:text-[#e5e5e5]">PLATFORM DOCUMENTATION</h1>
          </div>
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4]">
            Complete guide to using Heimursaga · Journaling & Sponsorship Platform for Explorers
          </p>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#202020] dark:border-[#616161] p-6 mb-8">
        <h2 className="text-sm font-bold mb-4 text-[#202020] dark:text-white border-b border-[#616161] pb-2">
          QUICK NAVIGATION
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <a href="#getting-started" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Getting Started
          </a>
          <a href="#account-types" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Account Types
          </a>
          <a href="#journals-expeditions" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Your Journal & Expeditions
          </a>
          <a href="#launching-blueprints" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Launching Expedition Blueprints
          </a>
          <a href="#creating-entries" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Creating Entries
          </a>
          <a href="#sponsorships" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Sponsorships
          </a>
          <a href="#discovery" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Discovery & Following
          </a>
          <a href="#achievements" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Achievements & Passport
          </a>
          <a href="#interactions" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Interactions
          </a>
          <a href="#content-policy" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Content Policy
          </a>
          <a href="#settings" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Settings & Privacy
          </a>
          <a href="#technical" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Technical Details
          </a>
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-8">
        {/* Getting Started */}
        <section id="getting-started" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <Compass className="w-5 h-5" />
            <h2 className="text-lg font-bold">GETTING STARTED</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">What is Heimursaga?</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Heimursaga is a journaling and sponsorship platform designed specifically for explorers, travelers, and adventurers.
                The platform enables you to document your journeys through detailed entries, organize expeditions, share your experiences
                with followers, and receive financial sponsorships to support your explorations. Heimursaga enforces a strict no-AI policy — all
                content must be human-created. AI-generated text, images, and media are prohibited.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Platform Hierarchy</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Content on Heimursaga follows a clear hierarchical structure:
              </p>
              <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#ac6d46] p-4 font-mono text-xs">
                <div className="text-[#202020] dark:text-[#e5e5e5]">Explorer (You) — Your Journal / Profile</div>
                <div className="ml-4 text-[#202020] dark:text-[#e5e5e5]">└─ Expedition (e.g., "Cycling the Silk Road")</div>
                <div className="ml-8 text-[#202020] dark:text-[#e5e5e5]">└─ Journal Entry (e.g., "Day 147: Samarkand")</div>
              </div>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Creating Your Account</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Register for a free Explorer account to start your journey. Your account is your journal — a single profile where all your expeditions and entries live. You'll be able to create expeditions, log entries,
                follow other explorers, and send sponsorships. Upgrade to Explorer Pro to receive sponsorships for your own expeditions.
              </p>
            </div>
          </div>
        </section>

        {/* Account Types */}
        <section id="account-types" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <Users className="w-5 h-5" />
            <h2 className="text-lg font-bold">ACCOUNT TYPES</h2>
          </div>
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Explorer */}
              <div className="border-2 border-[#b5bcc4] dark:border-[#3a3a3a] p-4">
                <h3 className="font-bold mb-3 text-[#202020] dark:text-white text-lg">Explorer (Free)</h3>
                <ul className="space-y-2 text-sm text-[#202020] dark:text-[#e5e5e5]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#ac6d46] mt-1">●</span>
                    <span>Create unlimited expeditions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#ac6d46] mt-1">●</span>
                    <span>Log unlimited entries with photos and locations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#ac6d46] mt-1">●</span>
                    <span>Follow other explorers and discover content</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#ac6d46] mt-1">●</span>
                    <span>Send sponsorships to support other explorers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#ac6d46] mt-1">●</span>
                    <span>Bookmark entries and interact with content</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#ac6d46] mt-1">●</span>
                    <span>Notifications and entry notes</span>
                  </li>
                </ul>
              </div>

              {/* Explorer Pro */}
              <div className="border-2 border-[#4676ac] dark:border-[#4676ac] p-4 bg-[#f8f9fa] dark:bg-[#2a2a2a]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-[#202020] dark:text-white text-lg">Explorer Pro ($7/month or $50/year)</h3>
                  <span className="px-2 py-1 bg-[#4676ac] text-white text-xs font-bold">PRO</span>
                </div>
                <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3 italic">
                  All Explorer features, plus:
                </p>
                <ul className="space-y-2 text-sm text-[#202020] dark:text-[#e5e5e5]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#4676ac] mt-1">●</span>
                    <span><strong>Receive sponsorships</strong> with custom tiers and Stripe Connect payouts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#4676ac] mt-1">●</span>
                    <span><strong>Expedition Notes:</strong> 500-character updates (public or sponsor-exclusive)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#4676ac] mt-1">●</span>
                    <span><strong>Private messaging</strong> with sponsors and explorers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#4676ac] mt-1">●</span>
                    <span>Up to <strong>10 photos per entry</strong> (vs 2 for free)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#4676ac] mt-1">●</span>
                    <span>Entry views and expedition insights</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#4676ac] mt-1">●</span>
                    <span>Additional entry types (Photo Essay, Data Log)</span>
                  </li>
                </ul>
                <Link
                  href="/settings/billing"
                  className="block w-full mt-4 py-3 bg-[#4676ac] text-white text-center hover:bg-[#3a5f8c] transition-all text-sm font-bold"
                >
                  UPGRADE TO PRO
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Journals & Expeditions */}
        <section id="journals-expeditions" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <BookOpen className="w-5 h-5" />
            <h2 className="text-lg font-bold">YOUR JOURNAL & EXPEDITIONS</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Your Journal</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Every explorer has one journal — it's your profile page. Your journal is where all your expeditions, entries, and stats live.
                Followers can visit your journal to browse your expeditions, read your entries, and see your passport collection.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Expeditions</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Expeditions are the journeys you document within your journal. Each expedition has:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>A title, description, and date range</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>An interactive map showing all entry locations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Waypoints and route planning</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Status lifecycle: Planned → Active → Completed/Cancelled</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Off-grid mode and current location tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Funding goals and sponsorship settings (Pro accounts only)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Chronological timeline of all entries</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Stats bar: days active, amount raised, sponsors, waypoints, entries, distance</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Creating Expeditions</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                There are two ways to create an expedition:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-4 mb-2">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>Expedition Builder:</strong> Full-featured form with route planning, waypoints, and map integration</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>Quick Entry:</strong> Streamlined form for logging completed or simple expeditions quickly</span>
                </li>
              </ul>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Both forms require a cover photo, title, category, region, start date, and description. You can manage
                visibility settings, configure sponsorship options, and set expedition notes visibility for each
                expedition individually.
              </p>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Expeditions created with both start and end dates in the past are automatically marked as completed.
                Completed expeditions cannot have sponsorships enabled. Private expeditions disable expedition notes entirely.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Expedition Activation</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Expeditions with a future start date are created in <strong>Planned</strong> status. A planned expedition
                transitions to <strong>Active</strong> through one of the following methods:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-4 mb-2">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>Automatic on start date:</strong> A daily process checks for planned expeditions whose start date has arrived and activates them automatically</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>Logging a journal entry:</strong> When you log an entry and update the expedition&apos;s current location, the expedition activates automatically</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>Manual activation:</strong> When submitting a journal entry for a planned expedition, you can choose to activate the expedition at that time</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>At publish time:</strong> If you publish an expedition after its start date has already passed, it is created as active rather than planned</span>
                </li>
              </ul>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                You can log journal entries for a planned expedition before it activates. The entry date range
                spans from the expedition&apos;s creation date through today.
              </p>
            </div>
          </div>
        </section>

        {/* Launching Expedition Blueprints */}
        <section id="launching-blueprints" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <Rocket className="w-5 h-5" />
            <h2 className="text-lg font-bold">LAUNCHING EXPEDITION BLUEPRINTS</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">How Explorers Use Blueprints</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Expedition Guides create blueprints&mdash;pre-planned routes with waypoints that any explorer can adopt.
                When you find a blueprint you want to experience, press
                <strong> Launch Expedition</strong>. This creates a new expedition in your own account based on
                the blueprint&apos;s route. You then set your own dates, plan your own timeline, and
                log journal entries along the way&mdash;just like any other expedition on Heimursaga.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">What Gets Copied</h3>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>The complete route geometry and all waypoints</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Mode of travel for each route leg</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Distance and elevation data</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">What You Control</h3>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Start and end dates</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Title, description, and cover image</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Journal entries, photos, and expedition notes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Sponsorship settings (if Explorer Pro)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Privacy and visibility settings</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Route Locking</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                The route on a launched expedition is locked&mdash;waypoints, route geometry, and travel modes
                cannot be changed. This preserves the integrity of the guide&apos;s curated route. You
                experience the expedition as the guide designed it, while still having full control over your
                own timeline, journal, and storytelling.
              </p>
            </div>

            <div className="p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#598636]">
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                Each launched expedition includes a visible attribution link back to the original blueprint and
                its guide, so the source of the route is always transparent.
              </p>
            </div>
          </div>
        </section>

        {/* Creating Entries */}
        <section id="creating-entries" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <Edit3 className="w-5 h-5" />
            <h2 className="text-lg font-bold">CREATING ENTRIES</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Logging an Entry</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Click the "LOG ENTRY" button in the main navigation to create a new journal entry. The entry creation workflow:
              </p>
              <ol className="space-y-2 text-sm text-[#202020] dark:text-[#e5e5e5] ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] font-bold">1.</span>
                  <span><strong>Select Expedition:</strong> Choose which expedition this entry belongs to</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] font-bold">2.</span>
                  <span><strong>Entry Details:</strong> Add title, date, and content (rich text supported)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] font-bold">3.</span>
                  <span><strong>Location:</strong> Set GPS coordinates via interactive map (optional but recommended)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] font-bold">4.</span>
                  <span><strong>Media:</strong> Upload photos with captions and camera metadata</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] font-bold">5.</span>
                  <span><strong>Tags & Category:</strong> Add relevant tags and select category (photo, video, data, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] font-bold">6.</span>
                  <span><strong>Publish:</strong> Choose visibility (public/off-grid/private) and publish</span>
                </li>
              </ol>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Entry Types</h3>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>Standard Journal Entry:</strong> Full text entries with photos and location</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>Photo Essay</strong> (Pro): Image-focused entries with up to 10 photos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>Data Log</strong> (Pro): Structured data entries (temperature, humidity, wind, elevation, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>Expedition Note</strong> (Pro): 500-character updates (visibility controlled per expedition — public or sponsor-exclusive)</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Entry Features</h3>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Photo limits: 2 (free) / 5 (Pro standard) / 10 (Pro photo essay)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Draft auto-save and cover photo selection</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Milestone entries and automatic entry numbering within expeditions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Media captions, alt text, and photo credit fields</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Automatic word count and read time calculation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Weather and timezone data (when location provided)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Media gallery with EXIF data preservation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Edit and update entries after publishing</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Sponsorships */}
        <section id="sponsorships" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <DollarSign className="w-5 h-5" />
            <h2 className="text-lg font-bold">SPONSORSHIPS</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">How Sponsorships Work</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Sponsorships are financial contributions that help fund explorer expeditions. All transactions are processed securely
                through Stripe. Explorer Pro accounts can enable sponsorships on their expeditions, while all accounts can send sponsorships.
                There are three ways to sponsor: <strong>one-time</strong> contributions, <strong>monthly recurring</strong> support,
                and <strong>quick sponsors</strong> ($3 micro-sponsorships on individual journal entries).
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Expedition Sponsorships</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                To sponsor an expedition:
              </p>
              <ol className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] font-bold">1.</span>
                  <span>Find an expedition with sponsorships enabled</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] font-bold">2.</span>
                  <span>Click &quot;SPONSOR EXPEDITION&quot; on the expedition or entry page</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] font-bold">3.</span>
                  <span>Choose a sponsorship tier or enter a custom amount (one-time or monthly, minimum $5)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] font-bold">4.</span>
                  <span>Optionally add a message (public or private) or sponsor anonymously</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] font-bold">5.</span>
                  <span>Complete payment via Stripe (credit/debit card)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] font-bold">6.</span>
                  <span>Receive confirmation and appear in the expedition sponsor leaderboard</span>
                </li>
              </ol>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Quick Sponsor</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Quick Sponsor is a $3 micro-sponsorship to show appreciation for a specific journal entry. Click
                &quot;QUICK SPONSOR $3&quot; at the bottom of any entry by an Explorer Pro with Stripe connected.
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac]">•</span>
                  <span>Fixed amount of $3.00 (explorer receives $2.70 after fees)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac]">•</span>
                  <span>If the entry belongs to a planned or active expedition, the $3 counts toward that expedition&apos;s funding</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac]">•</span>
                  <span>Quick sponsors appear on the expedition sponsor leaderboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac]">•</span>
                  <span>Your card is saved securely for future quick sponsors</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Sponsor Benefits</h3>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Leaderboard recognition on the expedition page (all sponsors)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Direct connection with the explorer via sponsorship messages</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Access to Expedition Notes — explorers control whether notes are public or sponsor-exclusive. For sponsor-exclusive notes, access is unlocked by meeting the explorer&apos;s cumulative sponsorship threshold</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Receiving Sponsorships (Pro Only)</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Explorer Pro accounts can enable sponsorships on individual expeditions and access:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac]">•</span>
                  <span>Custom sponsorship tiers with names and amounts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac]">•</span>
                  <span>Sponsorship Dashboard with detailed analytics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac]">•</span>
                  <span>Track total funding, sponsor count, and funding goals</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac]">•</span>
                  <span>View sponsor lists and transaction history</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac]">•</span>
                  <span>Payouts via Stripe Connect to your bank account (minimum $1)</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Fee Structure</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Sponsorships include a <strong>10% platform fee</strong> plus Stripe processing fees (2.9% + $0.30 per transaction).
                The remaining amount is available for payout to the explorer via Stripe Connect.
              </p>
            </div>
          </div>
        </section>

        {/* Discovery & Following */}
        <section id="discovery" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <MapPin className="w-5 h-5" />
            <h2 className="text-lg font-bold">DISCOVERY & FOLLOWING</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Home Page</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                The home page is the main landing page with two view modes — <strong>Global</strong> and <strong>Following</strong> (login required).
              </p>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                In Global mode, the page displays:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>Regional Field Report:</strong> Live weather conditions and terrain data based on your location or profile settings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>The Explorer Atlas:</strong> An interactive global map with two modes — Explorers (shows explorer locations with profile cards) and Entries (shows journal entry locations with clustering). Supports search, fullscreen, and click-through to profiles and entries</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>Featured Expeditions:</strong> The three most recent expeditions with status, sponsorship progress, and quick links</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>Featured Explorers:</strong> The three most recent explorers with status badges, follow/bookmark actions, and profile links</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>Recent Entries:</strong> The six most recent journal entries in a grid layout</span>
                </li>
              </ul>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mt-2">
                In Following mode, the page shows content exclusively from explorers you follow — their expeditions, entries, and a quick-access strip of followed explorer avatars with status indicators.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Discover</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                The Discover page is the main browsing hub with three tabs:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>Explorers:</strong> Browse all users with search. Filter by All, Active Now (currently on expedition), or Explorer Pro</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>Expeditions:</strong> Browse all public expeditions with search. Filter by All, Active, Planned, Completed, or Sponsored</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>Entries:</strong> Browse recent entries with search. Filter by All, Most Viewed, or entry type (Standard, Photo Essay, Data Log)</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Following System</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Follow explorers to stay updated on their journeys. Your home feed shows recent entries from explorers you follow. 
                View your complete followers/following lists from your profile. Following is public and visible to all users.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Search & Bookmarks</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Each browse page has a search bar for full-text search across relevant fields (usernames, titles, descriptions, locations).
                Bookmark entries, expeditions, and explorers to save them for later — access your bookmarks from the Bookmarks page in the main navigation.
              </p>
            </div>
          </div>
        </section>

        {/* Achievements & Passport */}
        <section id="achievements" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <Award className="w-5 h-5" />
            <h2 className="text-lg font-bold">ACHIEVEMENTS & PASSPORT</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Explorer Passport</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Your Explorer Passport is a visual record of your travels displayed on your journal profile. It includes:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>Country Flags:</strong> Automatically collected when you log entries with locations in different countries</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>Continent Emblems:</strong> Displayed for each continent where you've logged entries (e.g., NA, EU, AS)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>Achievement Badges:</strong> Special stamps earned through exploration milestones</span>
                </li>
              </ul>
              <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mt-3 italic">
                Passport items are displayed in the top-right corner of your journal banner and summarized in the sidebar stats.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Achievement Badges</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-3">
                Earn badges by reaching exploration milestones. Badges are displayed as stamps on your journal profile's passport collection.
              </p>

              {/* Achievement Table */}
              <div className="border-2 border-[#202020] dark:border-[#616161] overflow-hidden">
                <div className="bg-[#202020] dark:bg-[#3a3a3a] text-white px-4 py-2 text-xs font-bold grid grid-cols-[80px_1fr_1fr_1fr] gap-4">
                  <span>BADGE</span>
                  <span>NAME</span>
                  <span>DESCRIPTION</span>
                  <span>HOW TO EARN</span>
                </div>

                {/* Pioneer */}
                <div className="border-t border-[#b5bcc4] dark:border-[#3a3a3a] px-4 py-3 grid grid-cols-[80px_1fr_1fr_1fr] gap-4 text-sm bg-[#f5f5f5] dark:bg-[#2a2a2a] items-center">
                  <Image src="/assets/badges/Pioneer.svg" alt="Pioneer" className="w-12 h-12 object-contain" width={48} height={48} />
                  <span className="font-bold text-[#ac6d46]">Pioneer</span>
                  <span className="text-[#202020] dark:text-[#e5e5e5]">First 100 explorers</span>
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Join as one of the first 100 Heimursaga explorers (exclusive, no longer available)</span>
                </div>

                {/* Journey's End */}
                <div className="border-t border-[#b5bcc4] dark:border-[#3a3a3a] px-4 py-3 grid grid-cols-[80px_1fr_1fr_1fr] gap-4 text-sm items-center">
                  <Image src="/assets/badges/JourneysEnd.svg" alt="Journey's End" className="w-12 h-12 object-contain" width={48} height={48} />
                  <span className="font-bold text-[#ac6d46]">Journey's End</span>
                  <span className="text-[#202020] dark:text-[#e5e5e5]">Completed a major expedition</span>
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Complete an expedition lasting 30+ days with 15+ entries</span>
                </div>

                {/* Globetrotter */}
                <div className="border-t border-[#b5bcc4] dark:border-[#3a3a3a] px-4 py-3 grid grid-cols-[80px_1fr_1fr_1fr] gap-4 text-sm bg-[#f5f5f5] dark:bg-[#2a2a2a] items-center">
                  <Image src="/assets/badges/Globetrotter.svg" alt="Globetrotter" className="w-12 h-12 object-contain" width={48} height={48} />
                  <span className="font-bold text-[#ac6d46]">Globetrotter</span>
                  <span className="text-[#202020] dark:text-[#e5e5e5]">World traveler</span>
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Log entries from 5 or more different countries</span>
                </div>

                {/* Benefactor */}
                <div className="border-t border-[#b5bcc4] dark:border-[#3a3a3a] px-4 py-3 grid grid-cols-[80px_1fr_1fr_1fr] gap-4 text-sm items-center">
                  <Image src="/assets/badges/Benefactor.svg" alt="Benefactor" className="w-12 h-12 object-contain" width={48} height={48} />
                  <span className="font-bold text-[#ac6d46]">Benefactor</span>
                  <span className="text-[#202020] dark:text-[#e5e5e5]">Generous supporter</span>
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Give $1,000 or more in combined sponsorships to other explorers</span>
                </div>

                {/* Expeditionist */}
                <div className="border-t border-[#b5bcc4] dark:border-[#3a3a3a] px-4 py-3 grid grid-cols-[80px_1fr_1fr_1fr] gap-4 text-sm bg-[#f5f5f5] dark:bg-[#2a2a2a] items-center">
                  <Image src="/assets/badges/Expeditionist.svg" alt="Expeditionist" className="w-12 h-12 object-contain" width={48} height={48} />
                  <span className="font-bold text-[#ac6d46]">Expeditionist</span>
                  <span className="text-[#202020] dark:text-[#e5e5e5]">Multi-country expedition</span>
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Complete an expedition with entries logged in 3+ countries</span>
                </div>

                {/* Seven Summits */}
                <div className="border-t border-[#b5bcc4] dark:border-[#3a3a3a] px-4 py-3 grid grid-cols-[80px_1fr_1fr_1fr] gap-4 text-sm items-center">
                  <Image src="/assets/badges/SevenSummits.svg" alt="Seven Summits" className="w-12 h-12 object-contain" width={48} height={48} />
                  <span className="font-bold text-[#ac6d46]">Seven Summits</span>
                  <span className="text-[#202020] dark:text-[#e5e5e5]">All seven continents</span>
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Log at least one entry from each of the 7 continents</span>
                </div>

                {/* Polar Explorer */}
                <div className="border-t border-[#b5bcc4] dark:border-[#3a3a3a] px-4 py-3 grid grid-cols-[80px_1fr_1fr_1fr] gap-4 text-sm bg-[#f5f5f5] dark:bg-[#2a2a2a] items-center">
                  <Image src="/assets/badges/PolarExplorer.svg" alt="Polar Explorer" className="w-12 h-12 object-contain" width={48} height={48} />
                  <span className="font-bold text-[#ac6d46]">Polar Explorer</span>
                  <span className="text-[#202020] dark:text-[#e5e5e5]">Polar explorer</span>
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Log entries from Arctic (above 66.5°N) or Antarctic (below 66.5°S) regions</span>
                </div>

                {/* Seafarer */}
                <div className="border-t border-[#b5bcc4] dark:border-[#3a3a3a] px-4 py-3 grid grid-cols-[80px_1fr_1fr_1fr] gap-4 text-sm items-center">
                  <Image src="/assets/badges/Seafarer.svg" alt="Seafarer" className="w-12 h-12 object-contain" width={48} height={48} />
                  <span className="font-bold text-[#ac6d46]">Seafarer</span>
                  <span className="text-[#202020] dark:text-[#e5e5e5]">Ocean explorer</span>
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Log 3 or more entries at ocean coordinates (international waters)</span>
                </div>

                {/* Circumnavigator */}
                <div className="border-t border-[#b5bcc4] dark:border-[#3a3a3a] px-4 py-3 grid grid-cols-[80px_1fr_1fr_1fr] gap-4 text-sm bg-[#f5f5f5] dark:bg-[#2a2a2a] items-center">
                  <Image src="/assets/badges/Circumnavigator.svg" alt="Circumnavigator" className="w-12 h-12 object-contain" width={48} height={48} />
                  <span className="font-bold text-[#ac6d46]">Circumnavigator</span>
                  <span className="text-[#202020] dark:text-[#e5e5e5]">Round-the-world journey</span>
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Complete an expedition spanning all major longitude zones (Americas, Europe/Africa, Asia/Pacific, Pacific/Americas)</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">How Achievements Are Calculated</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Achievements are automatically calculated based on your activity:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>Location-based badges</strong> (Globetrotter, Polar, Seafarer, Circumnavigator) are derived from GPS coordinates in your entries</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>Expedition badges</strong> (Journey's End, Expeditionist) are triggered when expedition status changes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>Sponsorship badges</strong> (Benefactor) are calculated from your cumulative sponsorship history</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>Country flags</strong> are determined by reverse geocoding entry coordinates to ISO country codes</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Display Locations</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Your passport collection appears in two places on your journal profile: visually in the top-right corner of your
                cover photo banner (badges, continent emblems, and country flags), and as text statistics in the "PASSPORT" card
                in your profile sidebar (countries visited count, continents count, earned stamps with dates, and recent countries list).
              </p>
            </div>
          </div>
        </section>

        {/* Interactions */}
        <section id="interactions" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <MessageSquare className="w-5 h-5" />
            <h2 className="text-lg font-bold">INTERACTIONS</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Entry Actions</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Interact with entries using these actions:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>Bookmark:</strong> Save entries to your bookmarks collection for later</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>Share:</strong> Share entries via social media or direct links</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>Note:</strong> Log notes on entries to share thoughts and engage with explorers</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Entry Notes</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Log notes on entries (when enabled by the author) to share your thoughts and engage with other explorers.
                Notes are public and visible to all users. Entry authors can moderate notes and disable them on individual entries.
                Other explorers can respond to notes, creating single-thread discussions.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Messaging</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Private messaging is available to <strong>Explorer Pro</strong> accounts. Pro explorers can send direct messages
                to other explorers and sponsors. Messages are private and only visible to participants.
                Free accounts can interact via entry notes and sponsorship messages.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Notifications</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Receive notifications for: new followers, entry notes, bookmarks, sponsorships received, expedition status changes,
                sponsorship milestones, Expedition Note replies, Stripe payout status, passport achievements, and system updates.
                Configure notification preferences in Settings → Notifications.
              </p>
            </div>
          </div>
        </section>

        {/* Content Policy */}
        <section id="content-policy" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <Shield className="w-5 h-5" />
            <h2 className="text-lg font-bold">CONTENT POLICY</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">No AI Content</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Heimursaga strictly prohibits AI-generated content of any kind. All text, images, and media must be
                human-created. Entries are screened for AI-generated patterns, and violations result in content removal.
                Stock photos, AI-enhanced images, and promotional content disguised as journal entries are also prohibited.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Visibility Levels</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Expeditions and entries support the following visibility levels:
              </p>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex items-center gap-3 p-2 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                  <span className="text-[#ac6d46] font-bold w-32">PUBLIC</span>
                  <span className="text-[#202020] dark:text-[#e5e5e5]">Visible to everyone, including unauthenticated visitors</span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                  <span className="text-[#ac6d46] font-bold w-32">OFF-GRID</span>
                  <span className="text-[#202020] dark:text-[#e5e5e5]">Hidden from all feeds and search. Only accessible via direct link. Sponsorships still work.</span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                  <span className="text-[#ac6d46] font-bold w-32">SPONSOR-ONLY</span>
                  <span className="text-[#202020] dark:text-[#e5e5e5]">Visible only to qualifying sponsors who meet the expedition&apos;s cumulative sponsorship threshold (used for Expedition Notes, Pro only)</span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                  <span className="text-[#ac6d46] font-bold w-32">PRIVATE</span>
                  <span className="text-[#202020] dark:text-[#e5e5e5]">Visible only to you. All entries locked to private. Expedition notes and sponsorships are completely disabled. Cannot be changed after creation.</span>
                </div>
              </div>
              <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mt-2">
                Entry visibility is inherited from the parent expedition. You can also set visibility per-entry when needed.
                Private visibility is permanent and cannot be changed after expedition creation.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Sensitive Locations</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Entries become part of a permanent geographic record. Use off-grid visibility or omit precise coordinates
                when documenting endangered species habitats, archaeological sites vulnerable to looting, sacred or culturally
                restricted sites, and fragile ecosystems that would be harmed by increased traffic.
              </p>
            </div>
          </div>
        </section>

        {/* Settings & Privacy */}
        <section id="settings" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <Settings className="w-5 h-5" />
            <h2 className="text-lg font-bold">SETTINGS & PRIVACY</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Profile Settings</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Edit your profile from Settings → Edit Profile:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Display name, bio, location, and website</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Profile avatar (square avatars maintained across platform)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Social media links and contact information</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Privacy Controls</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Settings → Privacy offers granular privacy controls:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Profile visibility (public/followers-only/private)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Who can send you messages</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Show/hide follower counts and stats</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Location sharing preferences</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Data export and account deletion</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Preferences</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Customize your experience in Settings → Preferences:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>Theme:</strong> Light, dark, or system (auto-match your OS preference)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>Date/Time Format:</strong> Choose your preferred formats</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>Units:</strong> Metric or imperial for distances/temperatures</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span><strong>Satellite Map:</strong> Toggle satellite imagery on expedition maps</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Billing (Pro Accounts)</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Manage your Explorer Pro subscription, view payment history, update payment methods, and configure payout 
                settings in Settings → Billing. All payments processed securely through Stripe.
              </p>
            </div>
          </div>
        </section>

        {/* Technical Details */}
        <section id="technical" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <Shield className="w-5 h-5" />
            <h2 className="text-lg font-bold">TECHNICAL DETAILS</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Security & Data</h3>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>SSL/TLS encryption (A+ rating) for all connections</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Encrypted media storage via CDN</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Hourly incremental backups</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>GDPR compliant data handling</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Stripe-powered secure payment processing</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Platform Specifications</h3>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-4 font-mono">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Supported Image Formats: JPG, PNG, WEBP</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Location Precision: ±10 meters GPS accuracy</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>API Response Time: ~42ms average</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">•</span>
                  <span>Platform Uptime: 99.8% (30-day average)</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Browser Compatibility</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Heimursaga is optimized for modern browsers: Chrome, Firefox, Safari, and Edge (latest 2 versions). 
                Responsive design supports desktop, tablet, and mobile devices. JavaScript required.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Design Philosophy</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Heimursaga follows these core design principles: form follows function, dense information display, 
                exposing system state and inner workings, prioritizing verbosity over opacity. The interface is intentionally 
                detailed and information-rich, designed for serious explorers who value transparency and comprehensive data.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Footer CTA */}
      <div className="mt-8 bg-[#616161] dark:bg-[#3a3a3a] border-2 border-[#202020] dark:border-[#616161] p-6 text-center">
        <h3 className="text-lg font-bold text-white mb-2">Need Additional Help?</h3>
        <p className="text-sm text-[#b5bcc4] mb-4">
          Can't find what you're looking for? Contact our support team.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/contact"
            className="px-6 py-3 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all text-sm font-bold"
          >
            CONTACT SUPPORT
          </Link>
          <Link
            href="/settings"
            className="px-6 py-3 border-2 border-white text-white hover:bg-white hover:text-[#202020] transition-all text-sm font-bold"
          >
            GO TO SETTINGS
          </Link>
        </div>
      </div>
    </div>
  );
}