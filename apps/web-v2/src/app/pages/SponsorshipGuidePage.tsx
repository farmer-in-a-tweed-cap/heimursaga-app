'use client';

import Link from 'next/link';
import { DollarSign, Heart, TrendingUp, Shield, Users, CheckCircle, AlertCircle, Target } from 'lucide-react';
import { MONTHLY_TIER_SLOTS, ONE_TIME_TIER_SLOTS, getPerksForSlot } from '@repo/types/sponsorship-tiers';

export function SponsorshipGuidePage() {
  return (
    <div className="max-w-[1200px] mx-auto px-6 py-12">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="p-6">
          <div className="flex items-center mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
            <h1 className="text-2xl font-bold dark:text-[#e5e5e5]">SPONSORSHIP GUIDE</h1>
          </div>
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4]">
            Complete guide to supporting explorers and receiving support for your expeditions
          </p>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#202020] dark:border-[#616161] p-6 mb-8">
        <h2 className="text-sm font-bold mb-4 text-[#202020] dark:text-white border-b border-[#616161] pb-2">
          QUICK NAVIGATION
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <a href="#what-are-sponsorships" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → What Are Sponsorships?
          </a>
          <a href="#sending-sponsorships" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Sending Sponsorships
          </a>
          <a href="#quick-sponsor" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Quick Sponsor
          </a>
          <a href="#receiving-sponsorships" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Receiving Sponsorships
          </a>
          <a href="#setting-up" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Setting Up for Success
          </a>
          <a href="#early-access" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Early Access
          </a>
          <a href="#sponsor-best-practices" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Sponsor Best Practices
          </a>
          <a href="#explorer-best-practices" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Explorer Best Practices
          </a>
          <a href="#financial-transparency" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Financial Transparency
          </a>
          <a href="#fees-and-processing" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Fees & Payment Processing
          </a>
          <a href="#legal-considerations" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Legal & Tax Considerations
          </a>
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-8">
        {/* 1. What Are Sponsorships */}
        <section id="what-are-sponsorships" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <Heart className="w-5 h-5" />
            <h2 className="text-lg font-bold">WHAT ARE EXPEDITION SPONSORSHIPS?</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">The Sponsorship Philosophy</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Expedition sponsorships on Heimursaga are a way for community members to financially support explorers 
                whose journeys inspire them. This is not traditional crowdfunding or charity—it's a community investing 
                in authentic exploration, documentation, and storytelling that benefits everyone who cares about this planet.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">How It Works</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                There are three ways to support explorers on Heimursaga:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6 mb-3">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span><strong>One-time sponsorships</strong> — a single contribution to a specific expedition ($5+)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span><strong>Monthly recurring</strong> — ongoing monthly support for the explorer ($5+/month)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] mt-1">•</span>
                  <span><strong>Quick Sponsor</strong> — a $3 micro-sponsorship to show appreciation for a specific journal entry</span>
                </li>
              </ul>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                When you sponsor an expedition:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Funds go directly to support that specific journey</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>You become part of that expedition&apos;s story and appear on the sponsor leaderboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>You may gain access to Expedition Notes — explorers control whether notes are public or sponsor-exclusive. For sponsor-exclusive notes, access is unlocked once you meet the explorer&apos;s cumulative sponsorship threshold</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Monthly subscribers can opt into email delivery of new journal entries</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>You can sponsor anonymously and control message visibility</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Who Can Participate?</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                <strong>Sending Sponsorships:</strong> All account types (Explorer and Explorer Pro) can send sponsorships 
                to support other explorers.
              </p>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                <strong>Receiving Sponsorships:</strong> Only Explorer Pro accounts ($7/month or $50/year) can enable sponsorships
                on their expeditions and receive financial support from the community.
              </p>
            </div>
          </div>
        </section>

        {/* 2. Sending Sponsorships */}
        <section id="sending-sponsorships" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <Users className="w-5 h-5" />
            <h2 className="text-lg font-bold">SENDING SPONSORSHIPS</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">How to Sponsor an Expedition</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Follow these steps to support an explorer:
              </p>
              <ol className="space-y-2 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] font-bold">1.</span>
                  <span>Find an expedition with sponsorships enabled (look for the sponsorship badge)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] font-bold">2.</span>
                  <span>Review the expedition details, funding goals, and how funds will be used</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] font-bold">3.</span>
                  <span>Click "SPONSOR THIS EXPEDITION" on the expedition page</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] font-bold">4.</span>
                  <span>Choose a monthly tier or enter a one-time amount (minimum $5)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] font-bold">5.</span>
                  <span>Optionally add a message (public or private) or choose to sponsor anonymously</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] font-bold">6.</span>
                  <span>Complete payment securely through Stripe</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] font-bold">7.</span>
                  <span>Receive confirmation and appear in the expedition's sponsor leaderboard</span>
                </li>
              </ol>
            </div>

            <div>
              <h3 id="quick-sponsor" className="font-bold mb-2 text-[#202020] dark:text-white">Quick Sponsor</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Quick Sponsor is a fast, lightweight way to show appreciation for a specific journal entry. Look for
                the &quot;QUICK SPONSOR $3&quot; button at the bottom of any entry by an Explorer Pro.
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] mt-1">•</span>
                  <span><strong>Fixed $3.00 amount</strong> — the explorer receives $2.70 after platform and Stripe fees</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] mt-1">•</span>
                  <span><strong>Counts toward expedition funding</strong> — if the entry belongs to a planned or active expedition, the $3 is added to that expedition&apos;s raised total</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] mt-1">•</span>
                  <span><strong>Cumulative</strong> — multiple quick sponsors on the same expedition add up toward the Expedition Notes access threshold</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] mt-1">•</span>
                  <span><strong>Card saved for convenience</strong> — your payment method is saved securely via Stripe for future quick sponsors</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] mt-1">•</span>
                  <span><strong>Leaderboard inclusion</strong> — quick sponsors appear on the expedition sponsor leaderboard alongside one-time and recurring sponsors</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Sponsorship Tiers</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-4">
                When an Explorer Pro has a sponsorship-enabled planned or active expedition, sponsors can support them through two tier-based sponsorship types, each with different scope and perks:
              </p>

              {/* Monthly Tiers */}
              <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#ac6d46] p-4 text-sm mb-4">
                <div className="font-bold text-[#202020] dark:text-[#e5e5e5] mb-1">Monthly Subscription</div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3">
                  Perks cover current and future expeditions. Cancel anytime.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {MONTHLY_TIER_SLOTS.map(tier => (
                    <div key={tier.slot} className="bg-white dark:bg-[#202020] border border-[#b5bcc4] dark:border-[#616161] p-3">
                      <div className="font-bold text-[#ac6d46] text-xs tracking-wider mb-1">{tier.label}</div>
                      <div className="font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">
                        ${tier.minPrice}{tier.maxPrice ? `–$${tier.maxPrice}` : '+'}<span className="text-xs font-normal text-[#616161] dark:text-[#b5bcc4]">/mo</span>
                      </div>
                      <div className="space-y-0.5">
                        {getPerksForSlot('MONTHLY', tier.slot).map((perk, i) => (
                          <div key={i} className="text-xs text-[#616161] dark:text-[#b5bcc4] flex items-start gap-1">
                            <span className="text-[#598636]">*</span> {perk}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-3">
                  Yearly billing available at a 10% discount.
                </div>
              </div>

              {/* One-Time Tiers */}
              <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#4676ac] p-4 text-sm">
                <div className="font-bold text-[#202020] dark:text-[#e5e5e5] mb-1">One-Time Sponsorship</div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3">
                  Perks cover the sponsored expedition only. Amount-based thresholds unlock escalating perks.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {ONE_TIME_TIER_SLOTS.map(tier => (
                    <div key={tier.slot} className="bg-white dark:bg-[#202020] border border-[#b5bcc4] dark:border-[#616161] p-3">
                      <div className="font-bold text-[#4676ac] text-xs tracking-wider mb-1">${tier.minPrice}+ ONE-TIME</div>
                      <div className="space-y-0.5">
                        {getPerksForSlot('ONE_TIME', tier.slot).map((perk, i) => (
                          <div key={i} className="text-xs text-[#616161] dark:text-[#b5bcc4] flex items-start gap-1">
                            <span className="text-[#598636]">*</span> {perk}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-3">
                  Custom amounts accepted (minimum $5, maximum $10,000).
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Payment Processing</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                All payments are processed through Stripe, a secure payment platform. Heimursaga never stores your
                credit card information. You can pay with major credit cards, debit cards, or other payment methods
                supported by Stripe in your region.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Refunds & Cancellations</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Refunds for one-time sponsorships can be issued by the explorer through their Sponsorship Dashboard.
                When a refund is issued, both the sponsorship amount and the 10% platform fee are returned.
              </p>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Monthly subscribers can cancel their subscription at any time from their sponsorship settings.
                The subscription remains active until the end of the current billing period—no partial-month refunds are issued.
                If an expedition is cancelled, active subscriptions are paused and sponsors are notified.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Receiving Sponsorships */}
        <section id="receiving-sponsorships" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <TrendingUp className="w-5 h-5" />
            <h2 className="text-lg font-bold">RECEIVING SPONSORSHIPS (Explorer Pro)</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Requirements</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                To receive sponsorships, you must:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] mt-1">•</span>
                  <span>Have an active Explorer Pro account ($7/month or $50/year)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] mt-1">•</span>
                  <span>Connect your account to Stripe for payment processing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] mt-1">•</span>
                  <span>Enable sponsorships on individual expeditions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] mt-1">•</span>
                  <span>Comply with all platform guidelines and legal requirements</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Enabling Sponsorships on Expeditions</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Sponsorships are enabled at the expedition level, not your entire account. This allows you to choose
                which journeys you want to seek support for. You can enable/disable sponsorships for individual
                expeditions through your expedition settings.
              </p>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                <strong>Note:</strong> Sponsorships can only be enabled on planned or active expeditions. Completed expeditions
                automatically lock the sponsorship option. Private expeditions cannot have sponsorships enabled.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Connecting to Stripe</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                To receive payments, you'll need to connect your Stripe account:
              </p>
              <ol className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6 mb-3">
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] font-bold">1.</span>
                  <span>Go to Settings → Billing → Stripe Connect</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] font-bold">2.</span>
                  <span>Click "Connect Stripe Account"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] font-bold">3.</span>
                  <span>Complete Stripe's verification process</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] font-bold">4.</span>
                  <span>Configure payout settings (bank account, schedule)</span>
                </li>
              </ol>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Stripe will verify your identity and banking information to ensure secure transfers. This typically 
                takes 1-2 business days.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Sponsorship Dashboard</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Explorer Pro accounts have access to a detailed Sponsorship Dashboard showing:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] mt-1">•</span>
                  <span>Total funding received per expedition</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] mt-1">•</span>
                  <span>Number of sponsors supporting each expedition</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] mt-1">•</span>
                  <span>Progress toward funding goals</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] mt-1">•</span>
                  <span>Transaction history and payout records</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#4676ac] mt-1">•</span>
                  <span>Analytics and engagement metrics</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 4. Setting Up for Success */}
        <section id="setting-up" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <Target className="w-5 h-5" />
            <h2 className="text-lg font-bold">SETTING UP FOR SUCCESS</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Setting Funding Goals</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Realistic, transparent funding goals build trust with sponsors:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span><strong>Be specific:</strong> Break down actual costs (equipment, permits, transportation, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span><strong>Be realistic:</strong> Set achievable goals based on your community size</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span><strong>Be transparent:</strong> Explain how funds will be used</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span><strong>Consider milestones:</strong> You can set stretch goals for enhanced experiences</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Creating Compelling Expedition Descriptions</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Your expedition description is your pitch to potential sponsors. Include: what you're planning to do, 
                why it matters, what you hope to document or learn, and how sponsorship support enables this journey. 
                Be authentic—sponsors support genuine exploration, not polished marketing.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Building Your Community First</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Sponsorships work best when you have an engaged audience. Before launching a sponsored expedition, 
                consider building your following through quality content. Sponsors are more likely to support explorers 
                whose work they already know and value.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Configuring Sponsorship Tiers</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Your tiers are automatically created when you upgrade to Explorer Pro. From the TIERS tab on your
                Sponsorship Dashboard, you can adjust the price for each tier within its allowed range and enable
                or disable individual tiers.
              </p>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                <strong>Monthly tiers</strong> (Fellow Traveler, Journey Partner, Expedition Patron) are subscriptions
                that cover all of your current and future expeditions. <strong>One-time tiers</strong> are fixed
                thresholds ($5+ / $25+ / $75+) that apply to the specific expedition being sponsored.
              </p>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Each tier level unlocks different perks. The highest tier in both monthly and one-time channels
                unlocks voice note updates and early access. DM access is exclusive to Expedition Patron monthly subscribers.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Expedition Notes Visibility</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Explorer Pro accounts can control who can read their Expedition Notes. When creating or editing an expedition,
                you can set notes visibility to:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6 mb-3">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span><strong>Public:</strong> Anyone can read your expedition notes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span><strong>Sponsor Exclusive:</strong> Only sponsors who meet the access threshold can read notes. Selecting this option automatically enables sponsorships on the expedition</span>
                </li>
              </ul>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Notes visibility defaults to Public. Enabling sponsorships automatically sets visibility to Sponsor Exclusive,
                but you can change it back to Public at any time. Notes are completely disabled for private expeditions.
              </p>

              <h3 className="font-bold mb-2 mt-4 text-[#202020] dark:text-white">Setting a Notes Access Threshold</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                When notes are set to Sponsor Exclusive, you can set a minimum cumulative sponsorship amount required to
                unlock access. This allows you to keep Notes exclusive for more committed sponsors while still welcoming
                all contributions on the leaderboard.
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Set the threshold in the expedition builder or quick entry form under &quot;Notes Access Threshold&quot;</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>The threshold is cumulative per expedition — multiple sponsorships (including quick sponsors) add up</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Leave it at $0 to grant Notes access to any sponsor regardless of amount</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Sponsors can see the threshold and their progress toward it on the sponsorship checkout page</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 id="early-access" className="font-bold mb-2 mt-4 text-[#202020] dark:text-white">Early Access</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Early access gives higher-tier sponsors a head start on new journal entries before they become publicly
                visible. When you publish an entry, it enters an embargo window during which only qualifying sponsors can
                read it.
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6 mb-3">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span><strong>Tier 2 sponsors</strong> get access 24 hours before public release</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span><strong>Tier 3 sponsors</strong> get access 48 hours before public release</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Applies to both monthly subscribers and one-time donors who reach the tier threshold</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>One-time thresholds are cumulative per expedition — multiple donations add up</span>
                </li>
              </ul>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Early access is enabled per expedition. Toggle it on in the expedition builder or expedition settings
                alongside your sponsorship configuration. Once enabled, any new entry you publish enters the embargo
                window — qualifying sponsors are notified immediately while non-qualifying viewers see a locked preview
                card with a countdown timer. The entry becomes publicly visible after the 48-hour embargo window.
              </p>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Non-qualifying followers are notified when the entry becomes available to them, so they never miss content
                — they simply see it later.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Sponsor Best Practices */}
        <section id="sponsor-best-practices" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <CheckCircle className="w-5 h-5" />
            <h2 className="text-lg font-bold">BEST PRACTICES FOR SPONSORS</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Choosing Expeditions to Support</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Support expeditions that genuinely inspire you:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Read the explorer's previous entries to understand their style and values</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Review their expedition goals and funding needs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Consider their track record of completing expeditions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Support explorers whose journeys align with causes you care about</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Sponsor Multiple Amounts</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                You don't have to make large contributions. Even small sponsorships add up and show meaningful support. 
                Consider sponsoring multiple explorers with smaller amounts rather than putting everything into one 
                expedition—it helps build a diverse, sustainable community.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Engage Beyond Financial Support</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Comment on entries, ask questions, and engage with the explorer's journey. Your sponsorship is not 
                just financial—it's becoming part of their expedition story. Thoughtful engagement is often as 
                valuable as monetary support.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Reasonable Expectations</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Remember that sponsorships support exploration, not guaranteed outcomes. Expeditions encounter 
                challenges, delays, and unexpected changes. Support explorers for their authentic journey, not 
                for executing a perfect plan.
              </p>
            </div>
          </div>
        </section>

        {/* 6. Explorer Best Practices */}
        <section id="explorer-best-practices" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <CheckCircle className="w-5 h-5" />
            <h2 className="text-lg font-bold">BEST PRACTICES FOR SPONSORED EXPLORERS</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Regular Updates</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Sponsors support you because they want to follow your journey. Post regular entries even when things
                don't go as planned. Use Expedition Notes (500-character updates) to keep your audience
                engaged between full journal entries — you can make notes public for all readers or sponsor-exclusive
                for your supporters. Authenticity builds trust — sponsors appreciate honest accounts
                of both successes and challenges.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Acknowledging Sponsors</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Show gratitude to your sponsor community:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Thank sponsors in milestone entries</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Mention how sponsorship support made specific aspects of the journey possible</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Consider a final expedition summary thanking your sponsor community</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Respond to sponsor comments and questions when possible</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Managing Expectations</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Perks are automatically managed by the platform. Monthly subscribers receive perks across all of your
                expeditions, while one-time sponsors receive perks for the specific expedition they supported. The core
                value sponsors receive is access to your authentic journey and contribution to meaningful exploration.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Maintaining Content Quality</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Sponsorship should enhance your ability to explore, not change your voice or content style. Continue 
                creating the authentic, thoughtful entries that attracted sponsors in the first place. Don't compromise 
                your perspective to please sponsors.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Handling Unexpected Changes</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                If your expedition plans change significantly, communicate with your sponsor community through a journal 
                entry. Explain what changed, why, and what you plan to do. Sponsors generally understand that exploration 
                involves adaptation, but they appreciate transparency.
              </p>
            </div>
          </div>
        </section>

        {/* 7. Financial Transparency */}
        <section id="financial-transparency" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <Shield className="w-5 h-5" />
            <h2 className="text-lg font-bold">FINANCIAL TRANSPARENCY</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Publicly Visible Information</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                To maintain transparency, the following information is publicly visible on expedition pages:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Total funding received for the expedition</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Number of sponsors supporting the expedition</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Funding goal (if set by the explorer)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Progress percentage toward goal</span>
                </li>
              </ul>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mt-3">
                Sponsorship amounts are always visible on the expedition sponsor leaderboard. Sponsors can independently
                choose to anonymize their name (displayed as "Anonymous Sponsor") and/or hide their message from public view.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">How Funds Are Used</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Explorers receiving sponsorships should be transparent about how funds support their expedition. 
                This doesn't require detailed accounting, but general explanations help build trust: "Sponsorship 
                support covered permits and local guide fees for this section of the trek."
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Platform Commitment to Transparency</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Heimursaga is committed to transparent financial practices. We clearly display platform fees, maintain 
                secure payment processing through Stripe, and provide detailed transaction records to both sponsors 
                and sponsored explorers.
              </p>
            </div>
          </div>
        </section>

        {/* 8. Fees and Payment Processing */}
        <section id="fees-and-processing" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <DollarSign className="w-5 h-5" />
            <h2 className="text-lg font-bold">FEES & PAYMENT PROCESSING</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Platform Fee Structure</h3>
              <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#4676ac] p-4 mb-3">
                <p className="text-sm text-[#202020] dark:text-[#e5e5e5] font-bold mb-2">
                  Heimursaga Platform Fee: 10%
                </p>
                <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                  This fee covers platform maintenance, hosting, security, and ongoing development.
                  90% of every sponsorship (before Stripe processing fees) goes to the explorer.
                </p>
              </div>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                <strong>Example:</strong> A $100 sponsorship sends $90 to the explorer (minus Stripe processing fees) and $10 to platform operations.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Stripe Processing Fees</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Stripe charges standard payment processing fees (typically 2.9% + $0.30 per transaction in the US,
                varies by region). These are separate from the 10% platform fee and are deducted by Stripe during
                payment processing.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Payouts</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Stripe automatically pays out your available balance to your connected bank account on a daily schedule.
                Funds from each sponsorship typically become available for payout within 2-7 business days after payment.
                Explorers can view their balance and payout history from their Sponsorship Dashboard.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">International Transactions</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Stripe handles international currency conversion automatically. Both sponsors and explorers can use 
                their local currencies—Stripe handles the conversion using current exchange rates. Note that currency 
                conversion fees may apply for international transactions.
              </p>
            </div>
          </div>
        </section>

        {/* 9. Legal and Tax Considerations */}
        <section id="legal-considerations" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <h2 className="text-lg font-bold">LEGAL & TAX CONSIDERATIONS</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Tax Obligations for Explorers</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                <strong>Important:</strong> Sponsorship income may be taxable in your jurisdiction. Explorers receiving 
                sponsorships are independent contractors and are responsible for:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6 mb-3">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Tracking sponsorship income</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Paying applicable taxes on received funds</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Filing appropriate tax forms in your country</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Maintaining records of expedition-related expenses</span>
                </li>
              </ul>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Consult with a tax professional in your jurisdiction for specific guidance. Heimursaga provides 
                transaction records but does not provide tax advice.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Tax Deductibility for Sponsors</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                <strong>Important:</strong> Expedition sponsorships on Heimursaga are generally NOT tax-deductible 
                charitable donations. They are personal contributions to support individual explorers, not donations 
                to registered charitable organizations. Do not claim sponsorships as charitable deductions without 
                consulting a tax professional.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Legal Relationship</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Sponsorships create a voluntary support relationship, not a contractual obligation for specific 
                deliverables. Sponsors support explorers' journeys at their own discretion. Explorers commit to 
                authentic documentation but do not guarantee specific outcomes or experiences.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Compliance</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Both sponsors and explorers must comply with all applicable laws in their jurisdictions regarding 
                financial transactions, income reporting, and international money transfers. Heimursaga complies with 
                all applicable financial regulations and works with Stripe to ensure secure, legal payment processing.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Footer CTA */}
      <div className="mt-8 bg-[#616161] dark:bg-[#3a3a3a] border-2 border-[#202020] dark:border-[#616161] p-6 text-center">
        <h3 className="text-lg font-bold text-white mb-2">Ready to Get Involved?</h3>
        <p className="text-sm text-[#b5bcc4] mb-4">
          Support explorers you believe in or upgrade to Explorer Pro to receive sponsorships for your expeditions.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/expeditions"
            className="px-6 py-3 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all text-sm font-bold"
          >
            FIND EXPEDITIONS TO SPONSOR
          </Link>
          <Link
            href="/settings/billing"
            className="px-6 py-3 border-2 border-white text-white hover:bg-white hover:text-[#202020] transition-all text-sm font-bold"
          >
            UPGRADE TO EXPLORER PRO
          </Link>
        </div>
      </div>
    </div>
  );
}