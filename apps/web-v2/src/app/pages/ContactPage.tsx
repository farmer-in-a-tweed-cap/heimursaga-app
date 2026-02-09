'use client';

import Link from 'next/link';
import { AlertTriangle, HelpCircle, MessageSquare, Shield, Bug, FileText } from 'lucide-react';
import { useState } from 'react';

export function ContactPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: '',
    subject: '',
    message: '',
    url: '',
  });

  const categories = [
    { id: 'violation', label: 'Report Content Violation', icon: AlertTriangle, email: 'violations@heimursaga.com' },
    { id: 'technical', label: 'Technical Support', icon: Bug, email: 'support@heimursaga.com' },
    { id: 'account', label: 'Account Issues', icon: Shield, email: 'support@heimursaga.com' },
    { id: 'billing', label: 'Billing & Payments', icon: FileText, email: 'billing@heimursaga.com' },
    { id: 'general', label: 'General Inquiry', icon: HelpCircle, email: 'admin@heimursaga.com' },
    { id: 'feedback', label: 'Feature Request / Feedback', icon: MessageSquare, email: 'feedback@heimursaga.com' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Form submission would be handled here
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-12">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="p-6">
          <div className="flex items-center mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
            <h1 className="text-2xl font-bold dark:text-[#e5e5e5]">CONTACT & SUPPORT</h1>
          </div>
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4]">
            Get support, report violations, or contact the Heimursaga team
          </p>
        </div>
      </div>

      {/* Response Time Info */}
      <div className="bg-[#4676ac] text-white border-2 border-[#202020] dark:border-[#616161] p-4 mb-8">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold mb-1">Response Times</h3>
            <div className="text-sm space-y-1">
              <div className="font-mono">Content Violations: Within 2 hours</div>
              <div className="font-mono">Technical Support: Within 4 hours</div>
              <div className="font-mono">General Inquiries: Within 24 hours</div>
              <div className="font-mono text-white/80">Support available 24/7</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Categories */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161]">
              <h2 className="text-sm font-bold">CONTACT CATEGORIES</h2>
            </div>
            <div className="divide-y divide-[#b5bcc4] dark:divide-[#3a3a3a]">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setFormData({ ...formData, category: category.id });
                    }}
                    className={`w-full p-4 text-left transition-all ${
                      selectedCategory === category.id
                        ? 'bg-[#4676ac] text-white'
                        : 'hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] text-[#202020] dark:text-[#e5e5e5] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        selectedCategory === category.id ? 'text-white' : 'text-[#ac6d46]'
                      }`} />
                      <div className="flex-1">
                        <div className="font-bold text-sm mb-1">{category.label}</div>
                        <div className={`text-xs font-mono ${
                          selectedCategory === category.id ? 'text-white/80' : 'text-[#616161] dark:text-[#b5bcc4]'
                        }`}>
                          {category.email}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Direct Email */}
          <div className="mt-6 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-sm font-bold mb-3 text-[#202020] dark:text-white">PREFER EMAIL?</h3>
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3">
              You can email us directly at the addresses above, or use our general contact:
            </p>
            <a 
              href="mailto:admin@heimursaga.com"
              className="block text-xs font-mono text-[#ac6d46] hover:text-[#4676ac] break-all"
            >
              admin@heimursaga.com
            </a>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161]">
              <h2 className="text-sm font-bold">CONTACT FORM</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium mb-2 text-[#202020] dark:text-white">
                  ISSUE CATEGORY <span className="text-[#ac6d46]">*</span>
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => {
                    setFormData({ ...formData, category: e.target.value });
                    setSelectedCategory(e.target.value);
                  }}
                  className="w-full px-3 py-2 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] bg-white dark:bg-[#202020] text-[#202020] dark:text-[#e5e5e5] focus:border-[#ac6d46] outline-none text-sm"
                >
                  <option value="">Select a category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-2 text-[#202020] dark:text-white">
                  YOUR NAME <span className="text-[#ac6d46]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] bg-white dark:bg-[#202020] text-[#202020] dark:text-[#e5e5e5] focus:border-[#ac6d46] outline-none text-sm"
                  placeholder="Enter your name"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-2 text-[#202020] dark:text-white">
                  EMAIL ADDRESS <span className="text-[#ac6d46]">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] bg-white dark:bg-[#202020] text-[#202020] dark:text-[#e5e5e5] focus:border-[#ac6d46] outline-none text-sm"
                  placeholder="your.email@example.com"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium mb-2 text-[#202020] dark:text-white">
                  SUBJECT <span className="text-[#ac6d46]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] bg-white dark:bg-[#202020] text-[#202020] dark:text-[#e5e5e5] focus:border-[#ac6d46] outline-none text-sm"
                  placeholder="Brief description of your issue"
                />
              </div>

              {/* URL (for violations) */}
              {selectedCategory === 'violation' && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-[#202020] dark:text-white">
                    URL OF VIOLATING CONTENT
                  </label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] bg-white dark:bg-[#202020] text-[#202020] dark:text-[#e5e5e5] focus:border-[#ac6d46] outline-none text-sm"
                    placeholder="https://heimursaga.com/entry/..."
                  />
                  <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                    Provide the direct URL to the entry, profile, or content that violates our guidelines
                  </p>
                </div>
              )}

              {/* Message */}
              <div>
                <label className="block text-sm font-medium mb-2 text-[#202020] dark:text-white">
                  MESSAGE <span className="text-[#ac6d46]">*</span>
                </label>
                <textarea
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={8}
                  className="w-full px-3 py-2 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] bg-white dark:bg-[#202020] text-[#202020] dark:text-[#e5e5e5] focus:border-[#ac6d46] outline-none text-sm resize-y"
                  placeholder="Provide as much detail as possible..."
                />
                <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                  Include relevant details, screenshots descriptions, error messages, or specific examples
                </p>
              </div>

              {/* Category-specific guidance */}
              {selectedCategory && (
                <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#4676ac] p-4">
                  <h4 className="text-sm font-bold mb-2 text-[#202020] dark:text-white">
                    {selectedCategory === 'violation' && 'REPORTING VIOLATIONS'}
                    {selectedCategory === 'technical' && 'TECHNICAL SUPPORT TIPS'}
                    {selectedCategory === 'account' && 'ACCOUNT ISSUE DETAILS'}
                    {selectedCategory === 'billing' && 'BILLING INQUIRY INFO'}
                    {selectedCategory === 'general' && 'GENERAL INQUIRY'}
                    {selectedCategory === 'feedback' && 'FEATURE REQUESTS'}
                  </h4>
                  <div className="text-xs text-[#202020] dark:text-[#e5e5e5] space-y-1">
                    {selectedCategory === 'violation' && (
                      <>
                        <p>Please include:</p>
                        <ul className="list-disc ml-4 space-y-0.5">
                          <li>Direct URL to the violating content</li>
                          <li>Which guideline is being violated</li>
                          <li>Specific examples from the content</li>
                          <li>When you discovered the violation</li>
                        </ul>
                      </>
                    )}
                    {selectedCategory === 'technical' && (
                      <>
                        <p>Help us help you faster:</p>
                        <ul className="list-disc ml-4 space-y-0.5">
                          <li>Browser and version (e.g., Chrome 120)</li>
                          <li>Device type (desktop, mobile, tablet)</li>
                          <li>Steps to reproduce the issue</li>
                          <li>Error messages (exact text)</li>
                          <li>Screenshots if applicable</li>
                        </ul>
                      </>
                    )}
                    {selectedCategory === 'account' && (
                      <>
                        <p>Include in your message:</p>
                        <ul className="list-disc ml-4 space-y-0.5">
                          <li>Your username or email address</li>
                          <li>Account type (Explorer or Explorer Pro)</li>
                          <li>Detailed description of the issue</li>
                          <li>When the issue started</li>
                        </ul>
                      </>
                    )}
                    {selectedCategory === 'billing' && (
                      <>
                        <p>For billing inquiries, provide:</p>
                        <ul className="list-disc ml-4 space-y-0.5">
                          <li>Transaction date (if applicable)</li>
                          <li>Amount in question</li>
                          <li>Last 4 digits of card used</li>
                          <li>Subscription type (Explorer Pro, etc.)</li>
                        </ul>
                      </>
                    )}
                    {selectedCategory === 'general' && (
                      <p>General inquiries are typically answered within 24 hours. For urgent issues, please select a more specific category.</p>
                    )}
                    {selectedCategory === 'feedback' && (
                      <>
                        <p>We value your input! Please include:</p>
                        <ul className="list-disc ml-4 space-y-0.5">
                          <li>Specific feature or improvement idea</li>
                          <li>How it would benefit explorers</li>
                          <li>Use cases or examples</li>
                          <li>Priority level (nice-to-have vs. critical)</li>
                        </ul>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-3 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm font-bold"
                >
                  SEND MESSAGE
                </button>
                <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-2 text-center">
                  You will receive a confirmation email once your message is received
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Additional Resources */}
      <div className="mt-8 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
        <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161]">
          <h2 className="text-sm font-bold">BEFORE CONTACTING US</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] mb-4">
            You may find answers to common questions in our documentation:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/documentation"
              className="p-4 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] hover:border-[#ac6d46] transition-all active:scale-[0.98]"
            >
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white text-sm">Platform Documentation</h3>
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                Complete guide to using Heimursaga features and functionality
              </p>
            </Link>
            <Link
              href="/explorer-guidelines"
              className="p-4 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] hover:border-[#ac6d46] transition-all active:scale-[0.98]"
            >
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white text-sm">Explorer Guidelines</h3>
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                Best practices for content creation and community engagement
              </p>
            </Link>
            <Link
              href="/sponsorship-guide"
              className="p-4 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] hover:border-[#ac6d46] transition-all active:scale-[0.98]"
            >
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white text-sm">Sponsorship Guide</h3>
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                How to send and receive expedition sponsorships
              </p>
            </Link>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="mt-8 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#202020] dark:border-[#616161] p-6">
        <h3 className="text-sm font-bold mb-3 text-[#202020] dark:text-white">CURRENT SYSTEM STATUS</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div>
            <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">Platform Status</div>
            <div className="text-[#ac6d46] font-bold">● OPERATIONAL</div>
          </div>
          <div>
            <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">Payment Processing</div>
            <div className="text-[#ac6d46] font-bold">● ACTIVE</div>
          </div>
          <div>
            <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">Uptime (30-day)</div>
            <div className="text-[#202020] dark:text-white font-bold">99.8%</div>
          </div>
        </div>
      </div>
    </div>
  );
}