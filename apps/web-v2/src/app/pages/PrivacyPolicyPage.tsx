'use client';

import Link from 'next/link';
import { Shield } from 'lucide-react';

export function PrivacyPolicyPage() {
  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="p-6">
          <div className="flex items-center mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
            <h1 className="text-2xl font-bold dark:text-[#e5e5e5]">PRIVACY POLICY</h1>
          </div>
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4] font-mono">
            Last Updated: January 16, 2026 · Effective Date: January 16, 2026
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-8 space-y-8">
        {/* Introduction */}
        <section>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
            This Privacy Policy describes how The Peripety Company ("Heimursaga," "we," "us," or "our") collects, 
            uses, and shares your personal information when you use our journaling and sponsorship platform for 
            explorers at heimursaga.com (the "Services").
          </p>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mt-4">
            We are committed to protecting your privacy and being transparent about our data practices. This policy 
            explains what information we collect, how we use it, and your rights regarding your personal data.
          </p>
        </section>

        {/* 1. Information We Collect */}
        <section>
          <h2 className="text-lg font-bold mb-4 text-[#202020] dark:text-white border-b-2 border-[#4676ac] pb-2">
            1. Information We Collect
          </h2>
          
          <h3 className="font-bold mb-2 text-[#202020] dark:text-white">1.1 Information You Provide</h3>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
            We collect information you directly provide to us, including:
          </p>
          <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6 mb-4">
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span><strong>Account Information:</strong> Name, email address, password, display name, bio, location, website, and profile avatar</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span><strong>Journal Content:</strong> Expedition details, journal entries, photographs, videos, captions, tags, and metadata</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span><strong>Location Data:</strong> GPS coordinates and location information you provide for journal entries</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span><strong>Communications:</strong> Messages, comments, and other communications through the Services</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span><strong>Payment Information:</strong> Payment details processed through Stripe (we do not store credit card numbers)</span>
            </li>
          </ul>

          <h3 className="font-bold mb-2 text-[#202020] dark:text-white">1.2 Automatically Collected Information</h3>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
            When you access our Services, we automatically collect:
          </p>
          <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6 mb-4">
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span><strong>Usage Data:</strong> Pages viewed, features used, time spent, search queries, and interaction patterns</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers, and screen resolution</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span><strong>Analytics Data:</strong> Session duration, referral sources, and performance metrics</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span><strong>Cookies:</strong> We use cookies and similar technologies to enhance your experience and analyze usage patterns</span>
            </li>
          </ul>

          <h3 className="font-bold mb-2 text-[#202020] dark:text-white">1.3 Information from Third Parties</h3>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
            We receive information from third-party services integrated with Heimursaga, including Stripe for payment 
            processing and Mapbox for mapping services. These services operate according to their own privacy policies.
          </p>
        </section>

        {/* 2. How We Use Your Information */}
        <section>
          <h2 className="text-lg font-bold mb-4 text-[#202020] dark:text-white border-b-2 border-[#4676ac] pb-2">
            2. How We Use Your Information
          </h2>
          
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
            We use the information we collect to:
          </p>
          <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span>Provide, maintain, and improve the Services</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span>Process payments and subscriptions through Stripe</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span>Display your journal entries, expeditions, and profile information</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span>Enable communication between users (messages, comments, follows)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span>Send notifications about activity on your account</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span>Analyze usage patterns and improve platform features</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span>Prevent fraud, abuse, and security threats</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span>Comply with legal obligations and enforce our Terms of Service</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span>Communicate with you about your account, updates, and support requests</span>
            </li>
          </ul>
        </section>

        {/* 3. How We Share Your Information */}
        <section>
          <h2 className="text-lg font-bold mb-4 text-[#202020] dark:text-white border-b-2 border-[#4676ac] pb-2">
            3. How We Share Your Information
          </h2>
          
          <h3 className="font-bold mb-2 text-[#202020] dark:text-white">3.1 Public Information</h3>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-4">
            By default, certain information is publicly visible on Heimursaga, including your display name, profile bio, 
            public journal entries, expedition details, and follower/following counts. You can control the visibility 
            of your content through privacy settings.
          </p>

          <h3 className="font-bold mb-2 text-[#202020] dark:text-white">3.2 Service Providers</h3>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
            We share information with third-party service providers who perform services on our behalf:
          </p>
          <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6 mb-4">
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span><strong>Stripe:</strong> Payment processing for subscriptions and sponsorships</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span><strong>Mapbox:</strong> Mapping and geocoding services</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span><strong>Cloud Storage Providers:</strong> Encrypted storage for media uploads</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span><strong>Analytics Providers:</strong> Platform performance and usage analysis</span>
            </li>
          </ul>

          <h3 className="font-bold mb-2 text-[#202020] dark:text-white">3.3 Legal Requirements</h3>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-4">
            We may disclose your information if required by law, court order, or governmental request, or if we 
            believe disclosure is necessary to protect our rights, your safety, or the safety of others.
          </p>

          <h3 className="font-bold mb-2 text-[#202020] dark:text-white">3.4 Business Transfers</h3>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
            If Heimursaga is involved in a merger, acquisition, or sale of assets, your information may be transferred 
            as part of that transaction. We will notify you via email and/or a prominent notice on our Services of any 
            such change in ownership or control.
          </p>
        </section>

        {/* 4. Location Data and Privacy */}
        <section>
          <h2 className="text-lg font-bold mb-4 text-[#202020] dark:text-white border-b-2 border-[#4676ac] pb-2">
            4. Location Data and Privacy
          </h2>
          
          <h3 className="font-bold mb-2 text-[#202020] dark:text-white">4.1 Location Privacy Controls</h3>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-4">
            Heimursaga prioritizes explorer safety through location privacy features. By default, precise GPS coordinates 
            are displayed only at a regional level on public maps (e.g., "Central Asia Region" rather than exact coordinates). 
            You can adjust location privacy settings for individual entries and expeditions.
          </p>

          <h3 className="font-bold mb-2 text-[#202020] dark:text-white">4.2 Location Data Storage</h3>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
            Precise GPS coordinates are stored securely in our database but are only displayed publicly according to 
            your privacy settings. You may choose to display approximate regions, hide locations entirely, or share 
            precise coordinates with specific user groups.
          </p>
        </section>

        {/* 5. Data Security */}
        <section>
          <h2 className="text-lg font-bold mb-4 text-[#202020] dark:text-white border-b-2 border-[#4676ac] pb-2">
            5. Data Security
          </h2>
          
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-4">
            We implement industry-standard security measures to protect your information:
          </p>
          <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span><strong>Encryption:</strong> SSL/TLS encryption (A+ rating) for all data transmission</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span><strong>Encrypted Storage:</strong> Media files stored with encryption via CDN</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span><strong>Password Protection:</strong> Passwords are hashed and salted</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span><strong>Regular Backups:</strong> Hourly incremental backups to prevent data loss</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span><strong>Access Controls:</strong> Limited employee access to personal data</span>
            </li>
          </ul>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mt-4">
            While we strive to protect your information, no method of transmission or storage is 100% secure. 
            You are responsible for maintaining the confidentiality of your account credentials.
          </p>
        </section>

        {/* 6. Data Retention */}
        <section>
          <h2 className="text-lg font-bold mb-4 text-[#202020] dark:text-white border-b-2 border-[#4676ac] pb-2">
            6. Data Retention
          </h2>
          
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-4">
            We retain your information for as long as your account is active or as needed to provide the Services. 
            If you close your account, we will delete or anonymize your personal information within 90 days, except:
          </p>
          <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span>Public content may remain visible unless you request deletion</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span>Financial records retained for 7 years for tax and legal compliance</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span>Backup copies retained for 30 days and then permanently deleted</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span>Information required for legal obligations or dispute resolution</span>
            </li>
          </ul>
        </section>

        {/* 7. Your Privacy Rights */}
        <section>
          <h2 className="text-lg font-bold mb-4 text-[#202020] dark:text-white border-b-2 border-[#4676ac] pb-2">
            7. Your Privacy Rights
          </h2>
          
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
            You have the following rights regarding your personal data:
          </p>
          <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6 mb-4">
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span><strong>Access:</strong> Request a copy of your personal data</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span><strong>Correction:</strong> Update or correct inaccurate information</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span><strong>Deletion:</strong> Request deletion of your account and data</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span><strong>Export:</strong> Download your data in a portable format</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span><strong>Opt-Out:</strong> Unsubscribe from marketing communications</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span><strong>Privacy Settings:</strong> Control visibility and sharing preferences</span>
            </li>
          </ul>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
            You can exercise these rights through your account settings or by contacting us at privacy@heimursaga.com.
          </p>
        </section>

        {/* 8. GDPR Compliance */}
        <section>
          <h2 className="text-lg font-bold mb-4 text-[#202020] dark:text-white border-b-2 border-[#4676ac] pb-2">
            8. GDPR Compliance (European Users)
          </h2>
          
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-4">
            If you are located in the European Economic Area (EEA), you have additional rights under the General Data 
            Protection Regulation (GDPR):
          </p>
          <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6 mb-4">
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span>Right to object to processing of your personal data</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span>Right to restrict processing under certain circumstances</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span>Right to lodge a complaint with a supervisory authority</span>
            </li>
          </ul>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
            We process your data based on: (1) your consent, (2) performance of our contract with you, (3) compliance 
            with legal obligations, or (4) our legitimate business interests. You may withdraw consent at any time.
          </p>
        </section>

        {/* 9. Children's Privacy */}
        <section>
          <h2 className="text-lg font-bold mb-4 text-[#202020] dark:text-white border-b-2 border-[#4676ac] pb-2">
            9. Children's Privacy
          </h2>
          
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
            Heimursaga is not intended for users under 18 years of age. We do not knowingly collect personal information 
            from children under 18. If you believe a child has provided us with personal information, please contact us 
            immediately, and we will delete such information.
          </p>
        </section>

        {/* 10. International Data Transfers */}
        <section>
          <h2 className="text-lg font-bold mb-4 text-[#202020] dark:text-white border-b-2 border-[#4676ac] pb-2">
            10. International Data Transfers
          </h2>
          
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
            Heimursaga is based in the United States, and your information is processed and stored in the United States. 
            By using our Services, you consent to the transfer of your information to the United States and other 
            countries where we operate. We implement appropriate safeguards to protect your data in accordance with 
            applicable laws.
          </p>
        </section>

        {/* 11. Cookies and Tracking */}
        <section>
          <h2 className="text-lg font-bold mb-4 text-[#202020] dark:text-white border-b-2 border-[#4676ac] pb-2">
            11. Cookies and Tracking Technologies
          </h2>
          
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-4">
            We use cookies and similar technologies to:
          </p>
          <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6 mb-4">
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span>Keep you logged in between sessions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span>Remember your preferences (dark mode, language, etc.)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span>Analyze usage patterns and improve the Services</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4676ac] mt-1">•</span>
              <span>Prevent fraud and enhance security</span>
            </li>
          </ul>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
            You can control cookies through your browser settings, but disabling cookies may limit your ability to 
            use certain features of the Services.
          </p>
        </section>

        {/* 12. Changes to This Policy */}
        <section>
          <h2 className="text-lg font-bold mb-4 text-[#202020] dark:text-white border-b-2 border-[#4676ac] pb-2">
            12. Changes to This Privacy Policy
          </h2>
          
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of material changes via email 
            or through a notice on the Services. Your continued use of the Services after such notification constitutes 
            acceptance of the updated policy. We encourage you to review this policy periodically.
          </p>
        </section>

        {/* 13. Contact Us */}
        <section>
          <h2 className="text-lg font-bold mb-4 text-[#202020] dark:text-white border-b-2 border-[#4676ac] pb-2">
            13. Contact Us
          </h2>
          
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-4">
            If you have questions about this Privacy Policy or our data practices, please contact us:
          </p>
          <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#4676ac] p-4 text-sm font-mono">
            <div className="text-[#202020] dark:text-[#e5e5e5]">The Peripety Company</div>
            <div className="text-[#202020] dark:text-[#e5e5e5]">Heimursaga Platform</div>
            <div className="text-[#202020] dark:text-[#e5e5e5]">Data Protection Officer</div>
            <div className="text-[#202020] dark:text-[#e5e5e5] mt-2">Email: privacy@heimursaga.com</div>
            <div className="text-[#202020] dark:text-[#e5e5e5]">Legal: legal@heimursaga.com</div>
            <div className="text-[#202020] dark:text-[#e5e5e5]">Web: heimursaga.com</div>
          </div>
        </section>
      </div>

      {/* Footer Navigation */}
      <div className="mt-8 flex gap-4 justify-center">
        <Link
          href="/legal/terms"
          className="px-6 py-3 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all text-sm font-bold"
        >
          VIEW TERMS OF SERVICE
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