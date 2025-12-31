import { Metadata } from 'next';

import { AppLayout } from '@/layouts';
import { PageHeaderTitle } from '@/components';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Heimursaga Privacy Policy - Learn how we collect, use, and protect your information.',
};

export default function PrivacyPage() {
  return (
    <AppLayout secure={false}>
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <PageHeaderTitle>Privacy Policy</PageHeaderTitle>
        <div className="richtext">
          <p><strong>Last Updated:</strong> July 21, 2025</p>

          <h2>1. Introduction</h2>
          <p>Welcome to Heimursaga, a platform for travel journaling and fundraising. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and related services (collectively, the "Service").</p>
          <p>By using our Service, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree with our policies and practices, please do not use our Service.</p>

          <h2>2. Information We Collect</h2>
          <h3>2.1 Personal Information</h3>
          <p>We may collect the following types of personal information:</p>
          <ul>
            <li><strong>Email addresses</strong> for account creation and communication</li>
            <li><strong>Profile information</strong> you provide when creating travel journals or fundraising campaigns</li>
            <li><strong>Payment information</strong> processed through our third-party payment processor (Stripe)</li>
          </ul>

          <h3>2.2 Device and Usage Information</h3>
          <p>We automatically collect certain information about your device and how you use our Service:</p>
          <ul>
            <li>Device type, operating system, and version</li>
            <li>IP address and general location information</li>
            <li>App usage patterns and analytics data</li>
            <li>Log files and crash reports</li>
          </ul>

          <h3>2.3 User-Generated Content</h3>
          <ul>
            <li>Travel journal entries, photos, and related content</li>
            <li>Fundraising campaign information and updates</li>
            <li>Comments and interactions with other users' content</li>
          </ul>

          <h2>3. How We Use Your Information</h2>
          <p>We use the collected information for the following purposes:</p>
          <ul>
            <li><strong>Service Provision</strong>: To provide, maintain, and improve our travel journaling and fundraising platform</li>
            <li><strong>Communication</strong>: To send you updates, notifications, and respond to your inquiries</li>
            <li><strong>Analytics</strong>: To analyze usage patterns and improve our Service</li>
            <li><strong>Security</strong>: To protect against fraud, abuse, and security threats</li>
            <li><strong>Legal Compliance</strong>: To comply with applicable laws and regulations</li>
          </ul>

          <h2>4. Information Sharing and Disclosure</h2>
          <h3>4.1 Third-Party Service Providers</h3>
          <p>We may share your information with trusted third parties who assist us in operating our Service:</p>
          <ul>
            <li><strong>Stripe</strong>: For secure payment processing (subject to Stripe's privacy policy)</li>
            <li><strong>Cloud storage providers</strong>: For data storage and backup</li>
            <li><strong>Analytics services</strong>: To help us understand Service usage</li>
          </ul>

          <h3>4.2 Legal Requirements</h3>
          <p>We may disclose your information if required by law or in response to valid legal requests from public authorities.</p>

          <h3>4.3 Business Transfers</h3>
          <p>In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.</p>

          <h2>5. Data Storage and Security</h2>
          <h3>5.1 Data Storage</h3>
          <p>Your information is stored on secure cloud servers. We implement appropriate technical and organizational measures to protect your data against unauthorized access, alteration, disclosure, or destruction.</p>

          <h3>5.2 Data Retention</h3>
          <p>We retain your personal information for as long as necessary to provide our Service and fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required by law.</p>

          <h2>6. Your Rights and Choices</h2>
          <h3>6.1 Access and Portability</h3>
          <p>You have the right to access your personal information and receive a copy of your data in a portable format.</p>

          <h3>6.2 Correction and Updates</h3>
          <p>You can update or correct your personal information through your account settings or by contacting us.</p>

          <h3>6.3 Deletion</h3>
          <p>You may request deletion of your personal information by contacting us at admin@heimursaga.com. We will respond to your request within 30 days.</p>

          <h3>6.4 Marketing Communications</h3>
          <p>You can opt out of promotional emails by following the unsubscribe instructions in those emails.</p>

          <h2>7. Regional Privacy Rights</h2>
          <h3>7.1 European Union (GDPR)</h3>
          <p>If you are in the EU, you have additional rights under the General Data Protection Regulation:</p>
          <ul>
            <li>Right to withdraw consent</li>
            <li>Right to object to processing</li>
            <li>Right to lodge a complaint with supervisory authorities</li>
            <li>Right to data portability</li>
          </ul>

          <h3>7.2 California (CCPA)</h3>
          <p>If you are a California resident, you have rights under the California Consumer Privacy Act:</p>
          <ul>
            <li>Right to know what personal information is collected</li>
            <li>Right to delete personal information</li>
            <li>Right to opt-out of the sale of personal information</li>
            <li>Right to non-discrimination for exercising your rights</li>
          </ul>

          <h2>8. Children's Privacy</h2>
          <p>Our Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we discover that a child under 13 has provided us with personal information, we will delete it immediately.</p>

          <h2>9. International Data Transfers</h2>
          <p>Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place for such transfers in accordance with applicable data protection laws.</p>

          <h2>10. Cookies and Tracking Technologies</h2>
          <p>We may use cookies and similar tracking technologies to enhance your experience with our Service. You can manage your cookie preferences through your device settings.</p>

          <h2>11. Changes to This Privacy Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. Your continued use of the Service after such changes constitutes acceptance of the updated Privacy Policy.</p>

          <h2>12. Contact Information</h2>
          <p>If you have any questions about this Privacy Policy or our privacy practices, please contact us at:</p>
          <p><strong>Email:</strong> admin@heimursaga.com</p>

          <h2>13. Data Protection Officer</h2>
          <p>If you are in the EU and have questions about our data processing activities, you may contact our Data Protection Officer at:<br />
          <strong>Email:</strong> admin@heimursaga.com</p>

          <hr />

          <p><em>This Privacy Policy is effective as of July 21, 2025 and applies to all users of the Heimursaga Service.</em></p>
        </div>
      </div>
    </AppLayout>
  );
}
