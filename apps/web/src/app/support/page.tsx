import { Metadata } from 'next';
import { AppLayout } from '@/layouts';
import { PageHeaderTitle } from '@/components';

export const metadata: Metadata = {
  title: 'Support',
  description: 'Get help and support for your Heimursaga account',
};

export default function SupportPage() {
  return (
    <AppLayout>
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <PageHeaderTitle>Support</PageHeaderTitle>
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
            <h2 className="text-2xl font-medium text-black mb-6">Contact Us</h2>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#4676AC' }}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-black mb-2">Email Support</h3>
                  <p className="text-gray-600 mb-3">
                    Send us an email for any questions, comments, or suggestions.
                  </p>
                  <a 
                    href="mailto:admin@heimursaga.com" 
                    className="inline-flex items-center text-black hover:opacity-70 transition-colors font-medium"
                    style={{ color: '#4676AC' }}
                  >
                    admin@heimursaga.com
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                    </svg>
                  </a>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-black mb-4">What can we help you with?</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Account and profile questions</li>
                  <li>• Technical support and bug reports</li>
                  <li>• Billing and payment issues</li>
                  <li>• Sponsorship and payout questions</li>
                  <li>• General feedback and suggestions</li>
                </ul>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-black mb-2">Response Time</h3>
                <p className="text-gray-600">
                  We typically respond within 24-48 hours during business days.
                </p>
              </div>
            </div>
          </div>

        <div className="text-center">
          <p className="text-gray-500 text-sm">
            Thanks for being part of the Heimursaga community!
          </p>
        </div>
      </div>
    </AppLayout>
  );
}