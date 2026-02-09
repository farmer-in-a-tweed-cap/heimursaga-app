'use client';

import { Globe, BookOpen, DollarSign, User, MessageSquare, Shield, Database, Server, CheckCircle, XCircle, Target, Award, Compass, Navigation, Layers, CreditCard, BarChart3, Activity, Pause, Play, Info, Calendar, Settings, Bell, Lock, Eye } from 'lucide-react';
import Link from 'next/link';

export function AboutPage() {
  return (
    <div className="max-w-[1600px] mx-auto px-6 py-12">
      {/* System Header */}
      <div className="bg-[#202020] text-white border-2 border-[#616161] mb-6">
        <div className="bg-[#ac6d46] p-6 border-b-2 border-[#616161]">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">ABOUT HEIMURSAGA</h1>
              <p className="text-sm text-[#f5f5f5]">
                A Journaling & Sponsorship Platform for Explorers
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-sm leading-relaxed mb-3">
            Heimursaga (HAY-mur-sah-gah) — from Old Norse, roughly: "world-story." Humans have always explored. Before satellites and social feeds, before pitch decks and content calendars, there were journals. Scratched by lantern light on ships crossing oceans nobody had named. Pressed into leather-bound pages on the backs of camels tracing the Silk Road. Scrawled in moleskins on overnight trains rattling through countries that don't exist anymore. Those journal entries, those world-stories, some documenting monumental discoveries, some a mundane log of meals eaten for the day, some recounting wonders or horrors that were previously only legend, and some simple pleas for financial sponsorship, those stories shaped the world and inspired the human race for millenia.
          </p>
          <p className="text-sm leading-relaxed text-[#b5bcc4]">
            That impulse — to go, to see, to write it down — hasn't changed. But the means of sharing those stories has. The digitial age enabled the platforms and potential to inspire nearly every person on the planet almost simultaneously, but now the social media giants and algorithmic feeds bury authentic travel documentation under AI-generated slop and fleeting trends. Crowdfunding sites treat expeditions like marketing campaigns. No social media or fundraising platform has ever been built, from the ground up, for explorers only. Until now. Heimursaga is a journaling and fundraising platform — the first designed specifically for the world's explorers and the people who support them.
          </p>
        </div>
      </div>

      {/* Vision Section */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="bg-[#4676ac] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161]">
          <h2 className="text-xl font-bold">WHY THIS EXISTS</h2>
        </div>

        <div className="p-6">
          <div className="space-y-4 text-sm leading-relaxed">
            <p className="dark:text-[#e5e5e5]">
              Explorers and travelers have always had to split themselves across platforms that weren't built for them. Social media for the audience. Crowdfunding sites for the money. Blogs for the long-form writing nobody sees. None of them understand what an expedition actually is — the planning, the movement, the documentation, the rest between journeys. None of them let you do all of it in one place.
            </p>

            <p className="text-[#616161] dark:text-[#b5bcc4]">
              Heimursaga does. Write geo-tagged journal entries. Organize them by expedition. Earn sustainable income through one-time donations toward specific trips or monthly subscriptions across your entire career. This isn't a generic crowdfunding platform with a travel category bolted on. It's built by explorers, for explorers — every feature, every constraint, every design decision shaped by how exploration actually works.
            </p>

            <p className="text-[#616161] dark:text-[#b5bcc4]">
              And in an era where social feeds are increasingly swamped with AI-generated content and algorithmic noise, Heimursaga is meant to be the antidote. We strictly screen out bots and all forms of AI-generated content which ensures that Heimursaga remains a dedicated space where real people document real journeys, and supporters connect directly with the explorers whose work they value. No intermediary algorithms. No filtering out the noise. This is about the explorers, the ones <i>out there</i> seeing and experiencing the world.
            </p>

            <p className="dark:text-[#e5e5e5]">
              Explore. Discover. Share. Sponsor. Inspire. That's it. That's the whole idea.
            </p>
          </div>
        </div>
      </div>

      {/* Data Hierarchy & System Architecture */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="bg-[#616161] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161]">
          <h2 className="text-xl font-bold">DATA HIERARCHY & SYSTEM ARCHITECTURE</h2>
        </div>

        <div className="p-6">
          <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#202020] dark:border-[#616161] p-6 mb-6 font-mono">
            <div className="text-sm">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-5 h-5 text-[#4676ac]" />
                <span className="font-bold text-[#4676ac]">PRIMARY HIERARCHY</span>
              </div>
              <div className="ml-4 space-y-1 text-xs">
                <div className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">└──</span>
                  <div className="flex-1">
                    <span className="font-bold">EXPLORER</span> <span className="text-[#616161]">(User Account)</span>
                    <div className="ml-4 mt-1 space-y-1">
                      <div className="flex items-start gap-2">
                        <span className="text-[#ac6d46]">└──</span>
                        <div className="flex-1">
                          <span className="font-bold">JOURNAL</span> <span className="text-[#616161]">(1:1 with Explorer)</span>
                          <div className="ml-4 mt-1 space-y-1">
                            <div className="flex items-start gap-2">
                              <span className="text-[#ac6d46]">└──</span>
                              <div className="flex-1">
                                <span className="font-bold">EXPEDITION</span> <span className="text-[#616161]">(Many per Journal)</span>
                                <div className="ml-4 mt-1 space-y-1 text-[#616161]">
                                  <div>• Status: DRAFT | PLANNED | ACTIVE | COMPLETE</div>
                                  <div>• Constraints: Max 1 ACTIVE + 1 PLANNED simultaneously</div>
                                  <div>• Contains: Title, Description, Start/End Dates, Goals, Waypoints</div>
                                  <div className="flex items-start gap-2 mt-2">
                                    <span className="text-[#ac6d46]">└──</span>
                                    <div className="flex-1">
                                      <span className="font-bold text-black dark:text-white">JOURNAL ENTRY</span> <span className="text-[#616161]">(Many per Expedition)</span>
                                      <div className="ml-4 mt-1 space-y-1">
                                        <div>• Geo-tagged with coordinates</div>
                                        <div>• Visibility: PUBLIC | SPONSORS_ONLY | PRIVATE</div>
                                        <div>• Media: Up to 10 images per entry</div>
                                        <div>• Timestamps: Created, Published, Modified (all tracked)</div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2 mt-2">
                                    <span className="text-[#ac6d46]">└──</span>
                                    <div className="flex-1">
                                      <span className="font-bold text-black dark:text-white">EXPEDITION NOTE</span> <span className="text-[#616161]">(Daily updates, 280 char max)</span>
                                      <div className="ml-4 mt-1 space-y-1">
                                        <div>• Sponsor-only access</div>
                                        <div>• Single-threaded replies (1 reply per sponsor per note)</div>
                                        <div>• Available during PLANNING, ACTIVE, and post-COMPLETE phases</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-[#4676ac] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-5 h-5 text-[#4676ac]" />
                <h4 className="font-bold dark:text-[#e5e5e5]">EXPLORER STATUS (DERIVED)</h4>
              </div>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex items-center gap-2 p-2 bg-[#ac6d46]/10 border border-[#ac6d46]">
                  <Play className="w-4 h-4 text-[#ac6d46]" />
                  <div>
                    <div className="font-bold">EXPLORING</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Has 1 ACTIVE expedition</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-[#4676ac]/10 border border-[#4676ac]">
                  <Calendar className="w-4 h-4 text-[#4676ac]" />
                  <div>
                    <div className="font-bold">PLANNING</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Has 1 PLANNED expedition, no ACTIVE</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-[#616161]/10 border border-[#616161]">
                  <Pause className="w-4 h-4 text-[#616161]" />
                  <div>
                    <div className="font-bold">RESTING</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">No ACTIVE or PLANNED expeditions</div>
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-[#616161] dark:text-[#b5bcc4]">
                <Info className="w-3 h-3 inline mr-1" />
                Status auto-updates based on expedition state changes
              </div>
            </div>

            <div className="border border-[#ac6d46] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-[#ac6d46]" />
                <h4 className="font-bold dark:text-[#e5e5e5]">EXPEDITION STATUS (EXPLICIT)</h4>
              </div>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded mt-0.5"></div>
                  <div className="flex-1">
                    <div className="font-bold">DRAFT</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Early planning, not visible to sponsors, no constraints</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 bg-[#4676ac] rounded mt-0.5"></div>
                  <div className="flex-1">
                    <div className="font-bold">PLANNED</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Scheduled with dates, accepts one-time sponsorships, enables pre-launch fundraising</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 bg-[#ac6d46] rounded mt-0.5"></div>
                  <div className="flex-1">
                    <div className="font-bold">ACTIVE</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Currently underway, subscription billing active, Expedition Notes unlocked</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 bg-[#616161] rounded mt-0.5"></div>
                  <div className="flex-1">
                    <div className="font-bold">COMPLETE</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Finished, archived, read-only (except notes for 30 days)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sponsorship System Technical Breakdown */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="bg-[#ac6d46] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161]">
          <h2 className="text-xl font-bold">SPONSORSHIP SYSTEM: TECHNICAL BREAKDOWN</h2>
        </div>

        <div className="p-6">
          <div className="mb-6 p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#ac6d46]">
            <h3 className="font-bold mb-2 dark:text-[#e5e5e5]">HYBRID FUNDING MODEL</h3>
            <p className="text-sm text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
              Heimursaga implements a dual-channel sponsorship system: <span className="text-[#ac6d46] font-bold">One-Time Donations</span> (expedition-specific goal funding) and <span className="text-[#4676ac] font-bold">Monthly Subscriptions</span> (explorer-level ongoing support). Both channels operate independently with separate tracking, billing cycles, and refund policies.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="border-2 border-[#ac6d46] p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5 text-[#ac6d46]" />
                <h4 className="font-bold dark:text-[#e5e5e5]">ONE-TIME DONATIONS</h4>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4] mb-1">SCOPE</div>
                  <div className="dark:text-[#e5e5e5]">Expedition-specific, tied to individual goals</div>
                </div>
                <div>
                  <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4] mb-1">TIMING</div>
                  <div className="dark:text-[#e5e5e5]">Available during PLANNED and ACTIVE states only</div>
                </div>
                <div>
                  <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4] mb-1">MINIMUM</div>
                  <div className="dark:text-[#e5e5e5]">$5.00 USD per transaction</div>
                </div>
                <div>
                  <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4] mb-1">BENEFITS</div>
                  <div className="dark:text-[#e5e5e5]">Access to sponsor-only entries for expedition duration + 30 days post-complete</div>
                </div>
                <div>
                  <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4] mb-1">REFUND POLICY</div>
                  <div className="dark:text-[#e5e5e5]">Default: No refunds. Explorer discretion: May issue full/partial refunds with private note tracking</div>
                </div>
              </div>
            </div>

            <div className="border-2 border-[#4676ac] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-[#4676ac]" />
                <h4 className="font-bold dark:text-[#e5e5e5]">MONTHLY SUBSCRIPTIONS</h4>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4] mb-1">SCOPE</div>
                  <div className="dark:text-[#e5e5e5]">Explorer-level, supports entire career across all expeditions</div>
                </div>
                <div>
                  <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4] mb-1">BILLING BEHAVIOR</div>
                  <div className="dark:text-[#e5e5e5]">Charges during PLANNING + EXPLORING, PAUSES during RESTING</div>
                </div>
                <div>
                  <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4] mb-1">TIERS</div>
                  <div className="dark:text-[#e5e5e5]">Explorer Pro sets custom amounts (min $5/mo)</div>
                </div>
                <div>
                  <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4] mb-1">BENEFITS</div>
                  <div className="dark:text-[#e5e5e5]">Perpetual access to all sponsor-only content, Expedition Notes with reply privileges, early expedition announcements</div>
                </div>
                <div>
                  <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4] mb-1">AUTO-CANCEL</div>
                  <div className="dark:text-[#e5e5e5]">After 90 consecutive days in RESTING status (prevents zombie subscriptions)</div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-2 border-[#4676ac] p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
            <h4 className="font-bold mb-3 dark:text-[#e5e5e5]">SUBSCRIPTION BILLING LOGIC (DETAILED)</h4>
            <div className="space-y-3 text-xs font-mono">
              <div className="grid grid-cols-[120px_1fr] gap-4 p-2 border-b border-[#616161]">
                <div className="text-[#616161] dark:text-[#b5bcc4]">STATUS CHANGE</div>
                <div className="text-[#616161] dark:text-[#b5bcc4]">BILLING OUTCOME</div>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-4 p-2 bg-white dark:bg-[#202020]">
                <div className="dark:text-[#e5e5e5]">RESTING → PLANNING</div>
                <div className="dark:text-[#e5e5e5]">Resume billing on next cycle date (pro-rated if mid-month)</div>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-4 p-2">
                <div className="dark:text-[#e5e5e5]">PLANNING → ACTIVE</div>
                <div className="dark:text-[#e5e5e5]">Continue billing (no change)</div>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-4 p-2 bg-white dark:bg-[#202020]">
                <div className="dark:text-[#e5e5e5]">ACTIVE → COMPLETE</div>
                <div className="dark:text-[#e5e5e5]">If no new PLANNED expedition exists, pause on next cycle</div>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-4 p-2">
                <div className="dark:text-[#e5e5e5]">EXPLORING → RESTING</div>
                <div className="dark:text-[#e5e5e5]">Pause immediately. No charge for full rest months.</div>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-4 p-2 bg-white dark:bg-[#202020]">
                <div className="dark:text-[#e5e5e5]">90 Days RESTING</div>
                <div className="dark:text-[#e5e5e5]">Auto-cancel subscription, send notification to sponsor</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Matrix */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="bg-[#616161] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161]">
          <h2 className="text-xl font-bold">ACCOUNT TYPES: FEATURE MATRIX</h2>
        </div>

        <div className="p-6 overflow-x-auto">
          <table className="w-full text-sm border-2 border-[#202020] dark:border-[#616161]">
            <thead>
              <tr className="bg-[#b5bcc4] dark:bg-[#3a3a3a]">
                <th className="text-left p-3 border border-[#202020] dark:border-[#616161] font-bold">FEATURE</th>
                <th className="text-center p-3 border border-[#202020] dark:border-[#616161] font-bold">EXPLORER (FREE)</th>
                <th className="text-center p-3 border border-[#202020] dark:border-[#616161] font-bold">EXPLORER PRO ($7/mo)</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              <tr>
                <td className="p-3 border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5]">Create & publish journal entries</td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><CheckCircle className="w-4 h-4 text-green-500 mx-auto" /></td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><CheckCircle className="w-4 h-4 text-green-500 mx-auto" /></td>
              </tr>
              <tr className="bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                <td className="p-3 border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5]">Geo-tagged waypoints on map</td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><CheckCircle className="w-4 h-4 text-green-500 mx-auto" /></td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><CheckCircle className="w-4 h-4 text-green-500 mx-auto" /></td>
              </tr>
              <tr>
                <td className="p-3 border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5]">Follow other explorers</td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><CheckCircle className="w-4 h-4 text-green-500 mx-auto" /></td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><CheckCircle className="w-4 h-4 text-green-500 mx-auto" /></td>
              </tr>
              <tr className="bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                <td className="p-3 border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5]">Sponsor other explorers (send money)</td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><CheckCircle className="w-4 h-4 text-green-500 mx-auto" /></td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><CheckCircle className="w-4 h-4 text-green-500 mx-auto" /></td>
              </tr>
              <tr>
                <td className="p-3 border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5]">Bookmark & leave notes on entries</td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><CheckCircle className="w-4 h-4 text-green-500 mx-auto" /></td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><CheckCircle className="w-4 h-4 text-green-500 mx-auto" /></td>
              </tr>
              <tr className="bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                <td className="p-3 border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5]">Access sponsor-only content from explorers you sponsor</td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><CheckCircle className="w-4 h-4 text-green-500 mx-auto" /></td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><CheckCircle className="w-4 h-4 text-green-500 mx-auto" /></td>
              </tr>
              <tr>
                <td className="p-3 border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5]">Reply to Expedition Notes (if monthly sponsor)</td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><CheckCircle className="w-4 h-4 text-green-500 mx-auto" /></td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><CheckCircle className="w-4 h-4 text-green-500 mx-auto" /></td>
              </tr>
              <tr className="bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                <td className="p-3 border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5]">Private messaging (DMs)</td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><XCircle className="w-4 h-4 text-red-500 mx-auto" /></td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><CheckCircle className="w-4 h-4 text-green-500 mx-auto" /></td>
              </tr>
              <tr className="bg-[#ac6d46]/10 border-t-2 border-[#ac6d46]">
                <td className="p-3 border border-[#202020] dark:border-[#616161] font-bold dark:text-[#e5e5e5]">RECEIVE sponsorships (one-time + monthly)</td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><XCircle className="w-4 h-4 text-red-500 mx-auto" /></td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><CheckCircle className="w-4 h-4 text-green-500 mx-auto" /></td>
              </tr>
              <tr className="bg-[#ac6d46]/10">
                <td className="p-3 border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5]">Create expeditions (DRAFT/PLANNED/ACTIVE/COMPLETE)</td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><XCircle className="w-4 h-4 text-red-500 mx-auto" /></td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><CheckCircle className="w-4 h-4 text-green-500 mx-auto" /></td>
              </tr>
              <tr className="bg-[#ac6d46]/10">
                <td className="p-3 border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5]">Post sponsor-only journal entries</td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><XCircle className="w-4 h-4 text-red-500 mx-auto" /></td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><CheckCircle className="w-4 h-4 text-green-500 mx-auto" /></td>
              </tr>
              <tr className="bg-[#ac6d46]/10">
                <td className="p-3 border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5]">Create Expedition Notes (280 char daily updates)</td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><XCircle className="w-4 h-4 text-red-500 mx-auto" /></td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><CheckCircle className="w-4 h-4 text-green-500 mx-auto" /></td>
              </tr>
              <tr className="bg-[#ac6d46]/10">
                <td className="p-3 border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5]">Set custom monthly subscription tiers</td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><XCircle className="w-4 h-4 text-red-500 mx-auto" /></td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><CheckCircle className="w-4 h-4 text-green-500 mx-auto" /></td>
              </tr>
              <tr className="bg-[#ac6d46]/10">
                <td className="p-3 border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5]">View entry analytics (views, bookmarks, notes)</td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><XCircle className="w-4 h-4 text-red-500 mx-auto" /></td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><CheckCircle className="w-4 h-4 text-green-500 mx-auto" /></td>
              </tr>
              <tr className="bg-[#ac6d46]/10">
                <td className="p-3 border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5]">Sponsorship admin dashboard (refunds, tracking)</td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><XCircle className="w-4 h-4 text-red-500 mx-auto" /></td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><CheckCircle className="w-4 h-4 text-green-500 mx-auto" /></td>
              </tr>
              <tr className="bg-[#ac6d46]/10">
                <td className="p-3 border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5]">Stripe payout integration</td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><XCircle className="w-4 h-4 text-red-500 mx-auto" /></td>
                <td className="text-center p-3 border border-[#202020] dark:border-[#616161]"><CheckCircle className="w-4 h-4 text-green-500 mx-auto" /></td>
              </tr>
            </tbody>
          </table>

          <div className="mt-4 flex items-center justify-between p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#4676ac]">
            <div>
              <div className="font-bold mb-1 dark:text-[#e5e5e5]">PRICING TRANSPARENCY</div>
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Explorer Pro: $7/month · Stripe processing: 2.9% + $0.30 per transaction · Platform fee: 5% of sponsorships · No hidden charges</div>
            </div>
            <Link
              href="/settings/billing"
              className="px-6 py-2 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all text-sm"
            >
              UPGRADE TO PRO
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation & Interface Structure */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="bg-[#4676ac] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161]">
          <h2 className="text-xl font-bold">NAVIGATION & INTERFACE STRUCTURE</h2>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-[#616161] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Navigation className="w-5 h-5 text-[#4676ac]" />
                <h4 className="font-bold dark:text-[#e5e5e5]">PRIMARY NAVIGATION</h4>
              </div>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex items-center gap-2 p-2 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                  <Globe className="w-4 h-4 text-[#4676ac]" />
                  <div className="flex-1">
                    <div className="font-bold">EXPLORE</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Map-based discovery, explorer profiles, expedition browsing</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                  <Compass className="w-4 h-4 text-[#4676ac]" />
                  <div className="flex-1">
                    <div className="font-bold">DISCOVER</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Curated feeds, followed explorers, expedition updates</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                  <BookOpen className="w-4 h-4 text-[#4676ac]" />
                  <div className="flex-1">
                    <div className="font-bold">JOURNAL</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Your expeditions, entries, waypoints, analytics (Pro)</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                  <DollarSign className="w-4 h-4 text-[#4676ac]" />
                  <div className="flex-1">
                    <div className="font-bold">SPONSORSHIP</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Manage sent/received sponsorships, admin tools (Pro)</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                  <MessageSquare className="w-4 h-4 text-[#4676ac]" />
                  <div className="flex-1">
                    <div className="font-bold">MESSAGES</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Direct messages (Pro only), Expedition Note replies</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                  <Award className="w-4 h-4 text-[#4676ac]" />
                  <div className="flex-1">
                    <div className="font-bold">BOOKMARKS</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Saved entries, expeditions, explorers</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-[#616161] p-4">
              <div className="flex items-center gap-2 mb-3 font-normal">
                <Settings className="w-5 h-5 text-[#616161]" />
                <h4 className="font-bold dark:text-[#e5e5e5]">SETTINGS SUBSYSTEM</h4>
              </div>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex items-center gap-2 p-2 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                  <User className="w-4 h-4 text-[#616161]" />
                  <div className="flex-1">
                    <div className="font-bold">ACCOUNT</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Profile editing, bio, avatar, display name</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                  <Bell className="w-4 h-4 text-[#616161]" />
                  <div className="flex-1">
                    <div className="font-bold">NOTIFICATIONS</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Email preferences, push settings, sponsorship alerts</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                  <Lock className="w-4 h-4 text-[#616161]" />
                  <div className="flex-1">
                    <div className="font-bold">PRIVACY</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Visibility controls, blocking, data export</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                  <CreditCard className="w-4 h-4 text-[#616161]" />
                  <div className="flex-1">
                    <div className="font-bold">BILLING</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Pro subscription, Stripe setup, payout info</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                  <Eye className="w-4 h-4 text-[#616161]" />
                  <div className="flex-1">
                    <div className="font-bold">PREFERENCES</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Theme (light/dark), language, units, timezone</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                  <BarChart3 className="w-4 h-4 text-[#616161]" />
                  <div className="flex-1">
                    <div className="font-bold">INSIGHTS</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Analytics dashboard, entry performance, sponsor metrics (Pro)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Specifications */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="bg-[#616161] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161]">
          <h2 className="text-xl font-bold">TECHNICAL SPECIFICATIONS & INTEGRATIONS</h2>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="border border-[#616161] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-green-500" />
                <h4 className="font-bold dark:text-[#e5e5e5]">SECURITY</h4>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-[#616161] dark:text-[#b5bcc4]">SSL/TLS:</span>
                  <span className="dark:text-[#e5e5e5]">A+ Rating</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Encryption:</span>
                  <span className="dark:text-[#e5e5e5]">TLS in Transit</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Auth:</span>
                  <span className="dark:text-[#e5e5e5]">JWT Sessions</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#616161] dark:text-[#b5bcc4]">GDPR:</span>
                  <span className="text-green-500">Compliant</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#616161] dark:text-[#b5bcc4]">PCI DSS:</span>
                  <span className="text-green-500">Via Stripe</span>
                </div>
              </div>
            </div>

            <div className="border border-[#616161] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-5 h-5 text-[#4676ac]" />
                <h4 className="font-bold dark:text-[#e5e5e5]">INFRASTRUCTURE</h4>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Database:</span>
                  <span className="dark:text-[#e5e5e5]">PostgreSQL 15</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Storage:</span>
                  <span className="dark:text-[#e5e5e5]">AWS S3 CDN</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Backup:</span>
                  <span className="dark:text-[#e5e5e5]">Hourly Inc.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Hosting:</span>
                  <span className="dark:text-[#e5e5e5]">Heroku</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Avg Load:</span>
                  <span className="dark:text-[#e5e5e5]">1.2s</span>
                </div>
              </div>
            </div>

            <div className="border border-[#616161] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Server className="w-5 h-5 text-[#ac6d46]" />
                <h4 className="font-bold dark:text-[#e5e5e5]">INTEGRATIONS</h4>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Payments:</span>
                  <span className="dark:text-[#e5e5e5]">Stripe Connect</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Maps:</span>
                  <span className="dark:text-[#e5e5e5]">Mapbox GL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Email:</span>
                  <span className="dark:text-[#e5e5e5]">SMTP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Analytics:</span>
                  <span className="dark:text-[#e5e5e5]">Custom</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#616161] dark:text-[#b5bcc4]">CDN:</span>
                  <span className="dark:text-[#e5e5e5]">AWS S3</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t-2 border-[#616161] pt-6">
            <h4 className="font-bold mb-3 dark:text-[#e5e5e5]">CONTENT LIMITS & CONSTRAINTS</h4>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
              <div className="border border-[#616161] p-3">
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">Images per Entry</div>
                <div className="text-lg font-bold dark:text-[#e5e5e5]">10 max</div>
              </div>
              <div className="border border-[#616161] p-3">
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">Expedition Note Length</div>
                <div className="text-lg font-bold dark:text-[#e5e5e5]">280 char</div>
              </div>
              <div className="border border-[#616161] p-3">
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">Concurrent Active Expeditions</div>
                <div className="text-lg font-bold dark:text-[#e5e5e5]">1 only</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Who Uses Heimursaga */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="bg-[#ac6d46] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161]">
          <h2 className="text-xl font-bold">WHO USES HEIMURSAGA: EXPLORER ARCHETYPES</h2>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              'Adventure & Outdoor Enthusiasts',
              'Solo Travel Enthusiasts',
              'Travel Content Creators & Photographers',
              'Digital Nomads & Remote Workers',
              'Cultural Immersion Travelers',
              'Food & Culinary Explorers',
              'Van Life & RV Communities',
              'Study Abroad & Gap Year Students',
              'Travel Professionals & Guides',
              'Researchers & Academics',
              'Expedition Leaders',
              'Pilots & Sailors'
            ].map((archetype) => (
              <div key={archetype} className="border border-[#616161] p-3 hover:border-[#ac6d46] transition-all">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#4676ac] rounded-full"></div>
                  <div className="text-sm font-bold dark:text-[#e5e5e5]">{archetype}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-[#4676ac] text-white border-2 border-[#202020] dark:border-[#616161] p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">START YOUR JOURNEY</h2>
          <p className="text-lg leading-relaxed mb-6 max-w-2xl mx-auto">
            Every place has a story. Every journey deserves documentation. Every explorer deserves sustainable support. Build your exploration career on a platform designed for the long haul—not just the next viral post.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link
              href="/auth"
              className="px-8 py-4 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all text-lg"
            >
              CREATE FREE ACCOUNT
            </Link>
            <Link
              href="/documentation"
              className="px-8 py-4 border-2 border-white text-white font-bold hover:bg-white hover:text-[#4676ac] transition-all text-lg"
            >
              EXPLORE DOCUMENTATION
            </Link>
          </div>
          <div className="border-t-2 border-white/30 pt-6 mt-6">
            <p className="text-sm text-[#b5bcc4] italic">
              "We shall not cease from exploration, and the end of all our exploring will be to arrive where we started and know the place for the first time." — T.S. Eliot
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}