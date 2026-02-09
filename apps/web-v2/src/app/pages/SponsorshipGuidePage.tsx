'use client';

import Link from 'next/link';
import { DollarSign, Heart, TrendingUp, Shield, Users, CheckCircle, AlertCircle, Target } from 'lucide-react';

export function SponsorshipGuidePage() {
  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="p-6">
          <div className="flex items-center mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
            <h1 className="text-2xl font-bold dark:text-[#e5e5e5]">EXPEDITION SPONSORSHIP GUIDE</h1>
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
          <a href="#receiving-sponsorships" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Receiving Sponsorships
          </a>
          <a href="#setting-up" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Setting Up for Success
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
                Sponsorships are tied to specific expeditions, not general profiles. When you sponsor an expedition:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Funds go directly to support that specific journey</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>You become part of that expedition's story</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Your support helps make meaningful exploration possible</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>You contribute to the global repository of stories</span>
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
                <strong>Receiving Sponsorships:</strong> Only Explorer Pro accounts ($12/month) can enable sponsorships 
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
                  <span>Choose a sponsorship tier or enter a custom amount</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] font-bold">5.</span>
                  <span>Complete payment securely through Stripe</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] font-bold">6.</span>
                  <span>Receive confirmation and appear in the expedition's sponsor list</span>
                </li>
              </ol>
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
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Sponsorship Tiers</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Many explorers offer suggested sponsorship tiers with descriptions of impact:
              </p>
              <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#ac6d46] p-4 text-sm">
                <div className="space-y-2 text-[#202020] dark:text-[#e5e5e5]">
                  <div><strong>$25 - Trail Support:</strong> Covers basic supplies for several days</div>
                  <div><strong>$50 - Camp Sponsor:</strong> Funds campsite fees or local guides</div>
                  <div><strong>$100 - Equipment Boost:</strong> Helps with gear maintenance or upgrades</div>
                  <div><strong>$250 - Journey Sustainer:</strong> Significant support for expedition logistics</div>
                  <div><strong>Custom Amount:</strong> Any amount that feels meaningful to you</div>
                </div>
              </div>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mt-3">
                Note: Tier names and amounts are set by individual explorers and vary by expedition.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Refund Policy</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Expedition sponsorships are contributions to support exploration and are generally not refundable. 
                However, if an expedition is cancelled before it begins, or if there are exceptional circumstances, 
                contact us to discuss potential refund options.
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
                  <span>Have an active Explorer Pro account ($12/month)</span>
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
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Sponsorships are enabled at the expedition level, not your entire account. This allows you to choose 
                which journeys you want to seek support for. You can enable/disable sponsorships for individual 
                expeditions through your expedition settings.
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
                  <span>Go to Settings → Billing → Stripe Integration</span>
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
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Offering Sponsorship Tiers</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Create meaningful tier names and descriptions that help sponsors understand the impact of their 
                contribution. Rather than generic levels, tie tiers to actual expedition needs: "Week of Supplies," 
                "Mountain Permit," "Local Guide Day," etc.
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
                don't go as planned. Authenticity builds trust—sponsors appreciate honest accounts of both successes 
                and challenges.
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
                Be clear about what sponsorship does and doesn't guarantee. You're not obligated to provide perks or 
                rewards beyond your regular content. The value sponsors receive is access to your authentic journey 
                and contribution to meaningful exploration.
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
                Individual sponsor amounts are private unless the sponsor chooses to make them public.
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
                  This fee covers payment processing, platform maintenance, hosting, security, and ongoing development. 
                  90% of every sponsorship goes directly to the explorer.
                </p>
              </div>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                <strong>Example:</strong> A $100 sponsorship sends $90 to the explorer and $10 to platform operations.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Stripe Processing Fees</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Stripe charges standard payment processing fees (typically 2.9% + $0.30 per transaction in the US, 
                varies by region). These fees are included in the 10% platform fee—sponsors pay exactly what they 
                intend to contribute with no hidden charges.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Payout Schedule</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Funds are transferred to explorers' connected Stripe accounts according to Stripe's payout schedule 
                (typically 2-7 business days after a sponsorship is received). Explorers can configure their payout 
                schedule and bank account through their Stripe dashboard.
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