'use client';

import Link from 'next/link';

export function TermsOfServicePage() {
  return (
    <div className="max-w-[1200px] mx-auto px-6 py-12">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="p-6">
          <div className="flex items-center mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
            <h1 className="text-2xl font-bold dark:text-[#e5e5e5]">TERMS OF SERVICE</h1>
          </div>
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4] font-mono">
            Last Updated: January 16, 2026 · Effective Date: January 16, 2026
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-8 space-y-8">
        {/* 1. Introduction */}
        <section>
          <h2 className="text-lg font-bold mb-4 text-[#202020] dark:text-white border-b-2 border-[#ac6d46] pb-2">
            1. Introduction
          </h2>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
            Welcome to Heimursaga. These Terms and Conditions ("Terms") govern your use of our web application 
            and related services (collectively, the "Service").
          </p>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mt-4">
            By accessing or using our Service, you agree to be bound by these Terms. If you do not agree with 
            any part of these Terms, you may not use our Service.
          </p>
        </section>

        {/* 2. Our Mission and Community Standards */}
        <section>
          <h2 className="text-lg font-bold mb-4 text-[#202020] dark:text-white border-b-2 border-[#ac6d46] pb-2">
            2. Our Mission and Community Standards
          </h2>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-4">
            Heimursaga exists for three purposes: as a virtual platform for a community of people who care about 
            this planet and the things that happen here, for those who want to support that community, and as a 
            public repository of geo-specific stories, events, and reflections.
          </p>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
            The possible use cases for Heimursaga are many, but the misuse of this platform will not be tolerated. 
            Use of the Heimursaga web application constitutes agreement to our Explorer Code of Conduct outlined below.
          </p>
        </section>

        {/* 3. Account Types */}
        <section>
          <h2 className="text-lg font-bold mb-4 text-[#202020] dark:text-white border-b-2 border-[#ac6d46] pb-2">
            3. Account Types and Eligibility
          </h2>
          
          <h3 className="font-bold mb-2 text-[#202020] dark:text-white">3.1 Eligibility</h3>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-4">
            You must be at least 18 years old to create an account and use our Service. By creating an account, 
            you represent and warrant that you have the legal capacity to enter into these Terms.
          </p>

          <h3 className="font-bold mb-2 text-[#202020] dark:text-white">3.2 Account Types</h3>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
            Heimursaga offers two types of accounts:
          </p>
          <ul className="space-y-2 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6 mb-4">
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span><strong>Explorer (Free):</strong> Create journals, log entries, follow other explorers, and send sponsorships.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span><strong>Explorer Pro ($12/month):</strong> All Explorer features plus the ability to receive sponsorships for your expeditions.</span>
            </li>
          </ul>

          <h3 className="font-bold mb-2 text-[#202020] dark:text-white">3.3 Account Security</h3>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
            You are responsible for maintaining the confidentiality of your account credentials and for all activities 
            that occur under your account. You must immediately notify us of any unauthorized use of your account.
          </p>
        </section>

        {/* 4. Content Guidelines */}
        <section>
          <h2 className="text-lg font-bold mb-4 text-[#202020] dark:text-white border-b-2 border-[#ac6d46] pb-2">
            4. Content Guidelines
          </h2>
          
          <h3 className="font-bold mb-2 text-[#202020] dark:text-white">4.1 Prohibited Content</h3>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
            Heimursaga journal entries or explorer profiles must not contain:
          </p>
          <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6 mb-4">
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>AI-generated text or image content</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Obscene language or expletives</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Sexually explicit language or stories</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Graphic or excessively descriptive accounts of violence</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Overtly political or partisan language</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Marketing of any kind (aside from authorized sponsorship information)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Plagiarism of any entries on the platform</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Spam or filler text</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Content that violates intellectual property rights</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Harassment, bullying, or discriminatory content</span>
            </li>
          </ul>

          <h3 className="font-bold mb-2 text-[#202020] dark:text-white">4.2 Content Quality Standards</h3>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
            We encourage high-quality, authentic storytelling that:
          </p>
          <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Shares genuine travel experiences and insights</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Respects local cultures and communities</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Contributes meaningfully to our global repository of stories</span>
            </li>
          </ul>
        </section>

        {/* 5. Media Guidelines */}
        <section>
          <h2 className="text-lg font-bold mb-4 text-[#202020] dark:text-white border-b-2 border-[#ac6d46] pb-2">
            5. Media Guidelines
          </h2>
          
          <h3 className="font-bold mb-2 text-[#202020] dark:text-white">5.1 Prohibited Media</h3>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
            The following types of media are not permitted:
          </p>
          <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6 mb-4">
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>AI-generated images or avatars</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Sexually graphic or suggestive avatars or photos</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Avatars or photos depicting any kind of violence or gore</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Avatars or photos with commercial text or branding</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Copyrighted images without proper authorization</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Images that violate privacy rights of individuals</span>
            </li>
          </ul>

          <h3 className="font-bold mb-2 text-[#202020] dark:text-white">5.2 Media Quality Standards</h3>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
            We encourage:
          </p>
          <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6 mb-4">
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Original photography that captures authentic travel experiences</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Clear, high-quality images that enhance storytelling</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Respectful representation of people, places, and cultures</span>
            </li>
          </ul>

          <h3 className="font-bold mb-2 text-[#202020] dark:text-white">5.3 Media Specifications</h3>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
            Supported formats: JPG, PNG, WEBP.
          </p>
        </section>

        {/* 6. User Responsibilities */}
        <section>
          <h2 className="text-lg font-bold mb-4 text-[#202020] dark:text-white border-b-2 border-[#ac6d46] pb-2">
            6. User Responsibilities
          </h2>
          
          <h3 className="font-bold mb-2 text-[#202020] dark:text-white">6.1 Account Security</h3>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
            You are responsible for:
          </p>
          <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6 mb-4">
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Maintaining the confidentiality of your account credentials</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>All activities that occur under your account</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Notifying us immediately of any unauthorized use</span>
            </li>
          </ul>

          <h3 className="font-bold mb-2 text-[#202020] dark:text-white">6.2 Content Ownership</h3>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
            By posting content on Heimursaga, you:
          </p>
          <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Retain ownership of your original content</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Grant us a license to display and distribute your content on the platform</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Represent that you have the right to share all posted content</span>
            </li>
          </ul>
        </section>

        {/* 7. Community Responsibility and Enforcement */}
        <section>
          <h2 className="text-lg font-bold mb-4 text-[#202020] dark:text-white border-b-2 border-[#ac6d46] pb-2">
            7. Community Responsibility and Enforcement
          </h2>
          
          <h3 className="font-bold mb-2 text-[#202020] dark:text-white">7.1 Content Review</h3>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
            Entries and accounts are continuously reviewed for adherence to the Explorer Code, and those found 
            to be in violation will be subject to:
          </p>
          <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6 mb-4">
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Content removal</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Account warnings</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Temporary or permanent account suspension</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Legal action where applicable</span>
            </li>
          </ul>

          <h3 className="font-bold mb-2 text-[#202020] dark:text-white">7.2 Reporting Violations</h3>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
            Users are encouraged to report content that violates these Terms through our reporting system.
          </p>
        </section>

        {/* 8. Sponsorship and Financial Transactions */}
        <section>
          <h2 className="text-lg font-bold mb-4 text-[#202020] dark:text-white border-b-2 border-[#ac6d46] pb-2">
            8. Sponsorship and Financial Transactions
          </h2>
          
          <h3 className="font-bold mb-2 text-[#202020] dark:text-white">8.1 Sponsorship Program</h3>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-4">
            Our sponsorship program allows community members to support explorers financially. All financial 
            transactions are processed through Stripe, our secure third-party payment processor.
          </p>

          <h3 className="font-bold mb-2 text-[#202020] dark:text-white">8.2 Explorer Pro Subscriptions</h3>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-4">
            Explorer Pro subscriptions are billed monthly at $12 USD through Stripe. Subscriptions automatically 
            renew unless cancelled before the next billing date. Cancellations take effect at the end of the 
            current billing period. We do not provide refunds for partial months.
          </p>

          <h3 className="font-bold mb-2 text-[#202020] dark:text-white">8.3 Financial Responsibility</h3>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
            Users participating in sponsorship activities are responsible for:
          </p>
          <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6 mb-4">
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Accurate financial reporting as required by law</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Compliance with applicable tax obligations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#ac6d46] mt-1">•</span>
              <span>Proper use of sponsored funds as represented to supporters</span>
            </li>
          </ul>

          <h3 className="font-bold mb-2 text-[#202020] dark:text-white">8.4 Platform Fee</h3>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
            Heimursaga retains a 10% platform fee from all sponsorship transactions to cover payment processing 
            and platform maintenance costs. The remaining 90% is transferred to the expedition creator's connected 
            Stripe account.
          </p>
        </section>

        {/* 9. Privacy and Location Data */}
        <section>
          <h2 className="text-lg font-bold mb-4 text-[#202020] dark:text-white border-b-2 border-[#ac6d46] pb-2">
            9. Privacy and Location Data
          </h2>
          
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-4">
            Heimursaga provides privacy controls for location data sharing. By default, precise GPS coordinates 
            are displayed only to a regional level on public maps to protect explorer safety. You may adjust 
            privacy settings for individual entries and expeditions through your account settings.
          </p>
          
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
            Our collection, use, and sharing of your personal data is governed by our{' '}
            <Link href="/legal/privacy" className="text-[#ac6d46] hover:text-[#4676ac]">Privacy Policy</Link>. 
            By using our Service, you consent to our data practices as described in the Privacy Policy.
          </p>
        </section>

        {/* 10. Limitation of Liability */}
        <section>
          <h2 className="text-lg font-bold mb-4 text-[#202020] dark:text-white border-b-2 border-[#ac6d46] pb-2">
            10. Limitation of Liability
          </h2>
          
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
            To the maximum extent permitted by law, Heimursaga shall not be liable for any indirect, incidental, 
            special, consequential, or punitive damages resulting from your use of the Service.
          </p>
        </section>

        {/* 11. Changes to Terms */}
        <section>
          <h2 className="text-lg font-bold mb-4 text-[#202020] dark:text-white border-b-2 border-[#ac6d46] pb-2">
            11. Changes to Terms
          </h2>
          
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
            We may update these Terms from time to time. We will notify users of any material changes by posting 
            the new Terms on this page and updating the "Last Updated" date. Your continued use of the Service 
            after such changes constitutes acceptance of the updated Terms.
          </p>
        </section>

        {/* 12. Contact Information */}
        <section>
          <h2 className="text-lg font-bold mb-4 text-[#202020] dark:text-white border-b-2 border-[#ac6d46] pb-2">
            12. Contact Information
          </h2>
          
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-4">
            If you have any questions about these Terms and Conditions, please contact us at:
          </p>
          <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#ac6d46] p-4 text-sm font-mono">
            <div className="text-[#202020] dark:text-[#e5e5e5]">Email: admin@heimursaga.com</div>
          </div>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mt-4">
            These Terms and Conditions are effective as of January 16, 2026 and apply to all users of the Heimursaga Service.
          </p>
        </section>
      </div>

      {/* Footer Navigation */}
      <div className="mt-8 flex gap-4 justify-center">
        <Link
          href="/legal/privacy"
          className="px-6 py-3 bg-[#4676ac] text-white hover:bg-[#3a5f8c] transition-all text-sm font-bold"
        >
          VIEW PRIVACY POLICY
        </Link>
        <Link
          href="/documentation"
          className="px-6 py-3 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-white hover:bg-[#202020] hover:text-white dark:hover:bg-[#3a3a3a] transition-all text-sm font-bold"
        >
          PLATFORM DOCUMENTATION
        </Link>
      </div>
    </div>
  );
}