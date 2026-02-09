'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Mail, Clock, Shield, AlertCircle } from 'lucide-react';
import { authApi, ApiError } from '@/app/services/api';

export function PasswordResetRequestPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string).trim();

    try {
      await authApi.requestPasswordReset({ email });
      // Always show success (security best practice - don't reveal if email exists)
      setEmailSent(email);
      setSubmitted(true);
    } catch (err) {
      // For security, we still show success message even on some errors
      // Only show error for rate limiting or server errors
      if (err instanceof ApiError && err.status === 429) {
        setError('Too many reset requests. Please wait a few minutes and try again.');
      } else if (err instanceof ApiError && err.status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        // For "user not found" type errors, still show success (security best practice)
        setEmailSent(email);
        setSubmitted(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Success Message */}
            <div className="bg-white dark:bg-[#202020] border-2 border-[#ac6d46] mb-6">
              <div className="bg-[#ac6d46] text-white p-4 flex items-center gap-3">
                <Mail className="w-6 h-6" />
                <div>
                  <div className="font-bold text-lg">PASSWORD RESET EMAIL SENT</div>
                  <div className="text-xs">Check your inbox and follow the instructions</div>
                </div>
              </div>

              <div className="p-6">
                <div className="text-sm text-[#202020] dark:text-[#e5e5e5] mb-4">
                  If an account exists with the email address <strong className="font-mono text-[#4676ac]">{emailSent}</strong>,
                  you will receive a password reset email within the next few minutes.
                </div>

                <div className="border-2 border-[#4676ac] bg-[#f5f5f5] dark:bg-[#2a2a2a] p-4 mb-4">
                  <div className="text-xs font-bold mb-3">WHAT TO DO NEXT:</div>
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">1.</span>
                      <span>Check your email inbox for a message from <strong>noreply@heimursaga.com</strong></span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">2.</span>
                      <span>Click the secure reset link in the email (valid for 3 hours)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">3.</span>
                      <span>Enter your new password on the reset page</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">4.</span>
                      <span>Log in with your new credentials</span>
                    </div>
                  </div>
                </div>

                <div className="border-l-2 border-[#616161] dark:border-[#3a3a3a] pl-4 mb-6">
                  <div className="text-xs font-bold mb-2">DIDN'T RECEIVE THE EMAIL?</div>
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1">
                    <div>• Check your spam/junk folder</div>
                    <div>• Verify you entered the correct email address</div>
                    <div>• Wait 5-10 minutes (server may be processing queue)</div>
                    <div>• Try requesting another reset link</div>
                    <div>• Contact support if problem persists</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setEmailSent('');
                    }}
                    className="px-6 py-3 bg-[#616161] text-white text-sm font-bold hover:bg-[#4a4a4a] transition-all"
                  >
                    SEND ANOTHER RESET EMAIL
                  </button>
                  <Link
                    href="/auth"
                    className="px-6 py-3 bg-[#4676ac] text-white text-sm font-bold hover:bg-[#365a87] transition-all"
                  >
                    RETURN TO LOGIN
                  </Link>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-[#ac6d46]" />
                <h3 className="text-sm font-bold dark:text-[#e5e5e5]">SECURITY NOTICE</h3>
              </div>
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-2">
                <p>
                  For security reasons, we don't reveal whether an email address is registered in our system. 
                  This prevents malicious actors from using the reset form to discover valid accounts.
                </p>
                <p>
                  If you didn't request a password reset, you can safely ignore this email. Your account remains secure 
                  and no changes will be made unless the reset link is clicked.
                </p>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Process Timeline */}
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
              <h3 className="text-xs font-bold dark:text-[#e5e5e5] mb-3 border-b border-[#202020] dark:border-[#616161] pb-2">
                RESET PROCESS TIMELINE
              </h3>
              <div className="text-xs space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#ac6d46] text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    1
                  </div>
                  <div>
                    <div className="font-bold text-[#202020] dark:text-[#e5e5e5]">Email Sent</div>
                    <div className="text-[#616161] dark:text-[#b5bcc4]">Within 1-2 minutes</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#ac6d46] text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    2
                  </div>
                  <div>
                    <div className="font-bold text-[#202020] dark:text-[#e5e5e5]">Click Link</div>
                    <div className="text-[#616161] dark:text-[#b5bcc4]">Valid for 3 hours</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#b5bcc4] text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    3
                  </div>
                  <div>
                    <div className="font-bold text-[#616161]">Set New Password</div>
                    <div className="text-[#616161]">Meet requirements</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#b5bcc4] text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    4
                  </div>
                  <div>
                    <div className="font-bold text-[#616161]">Login Complete</div>
                    <div className="text-[#616161]">Access restored</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Details */}
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
              <h3 className="text-xs font-bold dark:text-[#e5e5e5] mb-3 border-b border-[#202020] dark:border-[#616161] pb-2">
                TECHNICAL DETAILS
              </h3>
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono space-y-2">
                <div>
                  <strong className="text-[#202020] dark:text-[#e5e5e5]">Token Generation:</strong> Cryptographically secure random token
                </div>
                <div>
                  <strong className="text-[#202020] dark:text-[#e5e5e5]">Token Storage:</strong> Securely stored in database
                </div>
                <div>
                  <strong className="text-[#202020] dark:text-[#e5e5e5]">Token Lifetime:</strong> Limited time window (expires automatically)
                </div>
                <div>
                  <strong className="text-[#202020] dark:text-[#e5e5e5]">Single Use:</strong> Token invalidated after successful reset
                </div>
                <div>
                  <strong className="text-[#202020] dark:text-[#e5e5e5]">Email Transport:</strong> TLS encrypted SMTP
                </div>
                <div>
                  <strong className="text-[#202020] dark:text-[#e5e5e5]">Rate Limit:</strong> Progressive throttling prevents abuse
                </div>
              </div>
            </div>

            {/* Alternative Options */}
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
              <h3 className="text-xs font-bold dark:text-[#e5e5e5] mb-3 border-b border-[#202020] dark:border-[#616161] pb-2">
                ALTERNATIVE OPTIONS
              </h3>
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-3">
                <div>
                  <strong className="text-[#202020] dark:text-[#e5e5e5]">Can't Access Email?</strong>
                  <div className="mt-1">Contact support at <a href="mailto:support@heimursaga.com" className="text-[#4676ac] hover:text-[#ac6d46]">support@heimursaga.com</a> with:</div>
                  <div className="mt-1 pl-3 space-y-1">
                    <div>• Your username</div>
                    <div>• Account creation date (if known)</div>
                    <div>• Any other details to verify your identity</div>
                  </div>
                </div>
                <div className="pt-2 border-t border-[#b5bcc4] dark:border-[#3a3a3a]">
                  <strong className="text-[#202020] dark:text-[#e5e5e5]">Response Time:</strong>
                  <div className="mt-1">Manual recovery requests typically resolved within 24-48 hours</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-12">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Header */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
            <div className="bg-[#202020] text-white p-4 flex items-center gap-3">
              <Shield className="w-6 h-6" />
              <div>
                <div className="font-bold text-lg">PASSWORD RESET REQUEST</div>
                <div className="text-xs">Secure account recovery process</div>
              </div>
            </div>

            <div className="p-6">
              <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-6">
                Enter the email address associated with your Heimursaga account. We'll send you a secure link
                to reset your password. The link will be valid for 3 hours.
              </p>

              {/* Error Message */}
              {error && (
                <div className="bg-white dark:bg-[#202020] border-2 border-[#ac6d46] mb-6 p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-[#ac6d46]" />
                    <div className="text-sm font-bold text-[#ac6d46]">ERROR</div>
                  </div>
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-2">{error}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Input */}
                <div>
                  <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                    EMAIL ADDRESS
                    <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    className="w-full px-4 py-3 border-2 border-[#b5bcc4] focus:border-[#ac6d46] outline-none text-sm font-mono dark:border-[#3a3a3a] dark:bg-[#1a1a1a] dark:text-[#e5e5e5]"
                    placeholder="your.email@example.com"
                    required
                    disabled={loading}
                  />
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1 font-mono">
                    • Must be the email registered to your account
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] disabled:bg-[#b5bcc4] disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'SENDING EMAIL...' : 'SEND PASSWORD RESET EMAIL'}
                </button>

                {/* Back to Login */}
                <div className="text-center pt-2">
                  <Link
                    href="/auth"
                    className="text-xs text-[#4676ac] hover:text-[#ac6d46]"
                  >
                    ← Return to login page
                  </Link>
                </div>
              </form>
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
            <h3 className="text-sm font-bold dark:text-[#e5e5e5] mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
              HOW PASSWORD RESET WORKS
            </h3>
            <div className="space-y-4 text-xs text-[#616161] dark:text-[#b5bcc4]">
              <div className="border-l-2 border-[#ac6d46] pl-4">
                <div className="font-bold text-[#202020] dark:text-[#e5e5e5] mb-1">STEP 1: REQUEST RESET</div>
                <p>
                  Enter your email address and submit the form. Our system generates a unique, cryptographically 
                  secure token that expires after a limited time window.
                </p>
              </div>
              <div className="border-l-2 border-[#4676ac] pl-4">
                <div className="font-bold text-[#202020] dark:text-[#e5e5e5] mb-1">STEP 2: RECEIVE EMAIL</div>
                <p>
                  Within 1-2 minutes, you'll receive an email containing a secure link. This link includes your
                  unique reset token as a URL parameter. The email is sent via TLS-encrypted SMTP to ensure
                  secure transmission.
                </p>
              </div>
              <div className="border-l-2 border-[#ac6d46] pl-4">
                <div className="font-bold text-[#202020] dark:text-[#e5e5e5] mb-1">STEP 3: CLICK LINK</div>
                <p>
                  Clicking the link takes you to our password reset page. The system validates the token,
                  checking that it hasn't expired and hasn't been used.
                </p>
              </div>
              <div className="border-l-2 border-[#4676ac] pl-4">
                <div className="font-bold text-[#202020] dark:text-[#e5e5e5] mb-1">STEP 4: SET NEW PASSWORD</div>
                <p>
                  Enter your new password (must meet all security requirements). The system securely hashes
                  your password, invalidates the reset token, and updates your account.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Security Features */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold dark:text-[#e5e5e5] mb-3 border-b border-[#202020] dark:border-[#616161] pb-2">
              SECURITY FEATURES
            </h3>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">✓</span>
                <span>Cryptographically secure random tokens</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">✓</span>
                <span>Secure token storage</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">✓</span>
                <span>Time-limited token expiration</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">✓</span>
                <span>Single-use tokens (invalidated after use)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">✓</span>
                <span>Progressive rate limiting prevents abuse</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">✓</span>
                <span>TLS-encrypted email transport</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">✓</span>
                <span>CSRF protection on all requests</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">✓</span>
                <span>Account enumeration prevention</span>
              </div>
            </div>
          </div>

          {/* Important Information */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold dark:text-[#e5e5e5] mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              IMPORTANT INFORMATION
            </h3>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-3">
              <div>
                <strong className="text-[#202020] dark:text-[#e5e5e5]">Token Expiration:</strong>
                <div className="mt-1">Reset links expire after 3 hours. Expired tokens cannot be used and you'll need to request a new one.</div>
              </div>
              <div>
                <strong className="text-[#202020] dark:text-[#e5e5e5]">Single Use Only:</strong>
                <div className="mt-1">Each reset link can only be used once. After successfully resetting your password, the token is permanently invalidated.</div>
              </div>
              <div>
                <strong className="text-[#202020] dark:text-[#e5e5e5]">After Reset:</strong>
                <div className="mt-1">You'll need to log in again with your new credentials after resetting your password.</div>
              </div>
            </div>
          </div>

          {/* Troubleshooting */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold dark:text-[#e5e5e5] mb-3 border-b border-[#202020] dark:border-[#616161] pb-2">
              TROUBLESHOOTING
            </h3>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-3">
              <div>
                <strong className="text-[#202020] dark:text-[#e5e5e5]">Not Receiving Email?</strong>
                <div className="mt-1 space-y-1 pl-3">
                  <div>1. Check spam/junk folder</div>
                  <div>2. Wait 5-10 minutes</div>
                  <div>3. Verify email address spelling</div>
                  <div>4. Check email server isn't blocking us</div>
                  <div>5. Contact support if still not received</div>
                </div>
              </div>
              <div>
                <strong className="text-[#202020] dark:text-[#e5e5e5]">Link Expired?</strong>
                <div className="mt-1">Request a new reset link. Each request generates a fresh token with a new 3-hour window.</div>
              </div>
              <div>
                <strong className="text-[#202020] dark:text-[#e5e5e5]">Don't Know Email?</strong>
                <div className="mt-1">Contact support with your username and account verification details for manual recovery.</div>
              </div>
            </div>
          </div>

          {/* Contact Support */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold dark:text-[#e5e5e5] mb-3 border-b border-[#202020] dark:border-[#616161] pb-2">
              NEED HELP?
            </h3>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
              <div className="mb-2">
                <strong className="text-[#202020] dark:text-[#e5e5e5]">Email:</strong>{' '}
                <a href="mailto:support@heimursaga.com" className="text-[#4676ac] hover:text-[#ac6d46]">
                  support@heimursaga.com
                </a>
              </div>
              <div>
                <strong className="text-[#202020] dark:text-[#e5e5e5]">Response Time:</strong> &lt; 24 hours
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}