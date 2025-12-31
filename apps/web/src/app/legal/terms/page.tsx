import { Metadata } from 'next';

import { AppLayout } from '@/layouts';
import { PageHeaderTitle } from '@/components';

export const metadata: Metadata = {
  title: 'Terms and Conditions',
  description: 'Explorer Code of Conduct for Heimursaga',
};

export default function TermsPage() {
  return (
    <AppLayout secure={false}>
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <PageHeaderTitle>Terms and Conditions</PageHeaderTitle>
        <div className="richtext">
          <p><strong>Last Updated:</strong> July 29, 2025</p>

          <h2>1. Introduction</h2>
          <p>Welcome to Heimursaga. These Terms and Conditions ("Terms") govern your use of our web application and related services (collectively, the "Service").</p>
          <p>By accessing or using our Service, you agree to be bound by these Terms. If you do not agree with any part of these Terms, you may not use our Service.</p>

          <h2>2. Our Mission and Community Standards</h2>
          <p>Heimursaga exists for three purposes: as a virtual platform for a community of people who care about this planet and the things that happen here, for those who want to support that community, and as a public repository of geo-specific stories, events, and reflections.</p>
          <p>The possible use cases for Heimursaga are many, but the misuse of this platform will not be tolerated. Use of the Heimursaga web application constitutes agreement to our Explorer Code of Conduct outlined below.</p>

          <h2>3. Content Guidelines</h2>
          <h3>3.1 Prohibited Content</h3>
          <p>Heimursaga journal entries or explorer profiles must not contain:</p>
          <ul>
            <li>AI-generated text or image content</li>
            <li>Obscene language or expletives</li>
            <li>Sexually explicit language or stories</li>
            <li>Graphic or excessively descriptive accounts of violence</li>
            <li>Overtly political or partisan language</li>
            <li>Marketing of any kind (aside from authorized sponsorship information)</li>
            <li>Plagiarism of any entries on the platform</li>
            <li>Spam or filler text</li>
            <li>Content that violates intellectual property rights</li>
            <li>Harassment, bullying, or discriminatory content</li>
          </ul>

          <h3>3.2 Content Quality Standards</h3>
          <p>We encourage high-quality, authentic storytelling that:</p>
          <ul>
            <li>Shares genuine travel experiences and insights</li>
            <li>Respects local cultures and communities</li>
            <li>Contributes meaningfully to our global repository of stories</li>
          </ul>

          <h2>4. Media Guidelines</h2>
          <h3>4.1 Prohibited Media</h3>
          <p>The following types of media are not permitted:</p>
          <ul>
            <li>AI-generated images or avatars</li>
            <li>Sexually graphic or suggestive avatars or photos</li>
            <li>Avatars or photos depicting any kind of violence or gore</li>
            <li>Avatars or photos with commercial text or branding</li>
            <li>Copyrighted images without proper authorization</li>
            <li>Images that violate privacy rights of individuals</li>
          </ul>

          <h3>4.2 Media Quality Standards</h3>
          <p>We encourage:</p>
          <ul>
            <li>Original photography that captures authentic travel experiences</li>
            <li>Clear, high-quality images that enhance storytelling</li>
            <li>Respectful representation of people, places, and cultures</li>
          </ul>

          <h2>5. User Responsibilities</h2>
          <h3>5.1 Account Security</h3>
          <p>You are responsible for:</p>
          <ul>
            <li>Maintaining the confidentiality of your account credentials</li>
            <li>All activities that occur under your account</li>
            <li>Notifying us immediately of any unauthorized use</li>
          </ul>

          <h3>5.2 Content Ownership</h3>
          <p>By posting content on Heimursaga, you:</p>
          <ul>
            <li>Retain ownership of your original content</li>
            <li>Grant us a license to display and distribute your content on the platform</li>
            <li>Represent that you have the right to share all posted content</li>
          </ul>

          <h2>6. Community Responsibility and Enforcement</h2>
          <h3>6.1 Content Review</h3>
          <p>Entries and accounts are continuously reviewed for adherence to the Explorer Code, and those found to be in violation will be subject to:</p>
          <ul>
            <li>Content removal</li>
            <li>Account warnings</li>
            <li>Temporary or permanent account suspension</li>
            <li>Legal action where applicable</li>
          </ul>

          <h3>6.2 Reporting Violations</h3>
          <p>Users are encouraged to report content that violates these Terms through our reporting system.</p>

          <h2>7. Sponsorship and Financial Transactions</h2>
          <h3>7.1 Sponsorship Program</h3>
          <p>Our sponsorship program allows community members to support explorers financially. All financial transactions are processed through secure third-party payment processors.</p>

          <h3>7.2 Financial Responsibility</h3>
          <p>Users participating in sponsorship activities are responsible for:</p>
          <ul>
            <li>Accurate financial reporting as required by law</li>
            <li>Compliance with applicable tax obligations</li>
            <li>Proper use of sponsored funds as represented to supporters</li>
          </ul>

          <h2>8. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, Heimursaga shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service.</p>

          <h2>9. Changes to Terms</h2>
          <p>We may update these Terms from time to time. We will notify users of any material changes by posting the new Terms on this page and updating the "Last Updated" date. Your continued use of the Service after such changes constitutes acceptance of the updated Terms.</p>

          <h2>10. Contact Information</h2>
          <p>If you have any questions about these Terms and Conditions, please contact us at:</p>
          <p><strong>Email:</strong> admin@heimursaga.com</p>

          <hr />

          <p><em>These Terms and Conditions are effective as of July 29, 2025 and apply to all users of the Heimursaga Service.</em></p>
        </div>
      </div>
    </AppLayout>
  );
}
