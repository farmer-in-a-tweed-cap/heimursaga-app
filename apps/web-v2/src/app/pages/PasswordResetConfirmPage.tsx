'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Shield, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { authApi, ApiError } from '@/app/services/api';

export function PasswordResetConfirmPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
  });

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setValidating(false);
      setError('Invalid or missing reset token. Please request a new password reset link.');
      return;
    }

    const validateToken = async () => {
      try {
        await authApi.validateToken(token);
        setTokenValid(true);
      } catch (err) {
        setTokenValid(false);
        if (err instanceof ApiError) {
          setError(err.message || 'Reset token has expired or is invalid. Please request a new password reset link.');
        } else {
          setError('Reset token has expired or is invalid. Please request a new password reset link.');
        }
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const checkPasswordStrength = (password: string) => {
    setPasswordStrength({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please ensure both password fields are identical.');
      setLoading(false);
      return;
    }

    if (!Object.values(passwordStrength).every(v => v)) {
      setError('Password does not meet all security requirements. Please review the requirements below.');
      setLoading(false);
      return;
    }

    if (!token) {
      setError('Invalid reset token.');
      setLoading(false);
      return;
    }

    try {
      await authApi.resetPassword({ token, password });
      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/auth');
      }, 3000);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to reset password. Please try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Loading state while validating token
  if (validating) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-8">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#ac6d46]" />
              <div className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5]">VALIDATING RESET TOKEN...</div>
            </div>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] text-center mt-3 font-mono">
              Checking token validity • Verifying expiration • Confirming single-use status
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-[#202020] border-2 border-[#ac6d46]">
              <div className="bg-[#ac6d46] text-white p-4 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6" />
                <div>
                  <div className="font-bold text-lg">PASSWORD RESET SUCCESSFUL</div>
                  <div className="text-xs">Your password has been updated</div>
                </div>
              </div>

              <div className="p-6">
                <div className="text-sm text-[#202020] dark:text-[#e5e5e5] mb-6">
                  Your password has been successfully reset. You can now log in with your new credentials.
                </div>

                <div className="border-2 border-[#4676ac] bg-[#f5f5f5] dark:bg-[#2a2a2a] p-4 mb-6">
                  <div className="text-xs font-bold text-[#202020] dark:text-[#e5e5e5] mb-3">WHAT HAPPENED:</div>
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-2 font-mono">
                    <div>✓ Password securely hashed and updated</div>
                    <div>✓ Reset token permanently invalidated</div>
                  </div>
                </div>

                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-6 text-center">
                  Redirecting to login page in 3 seconds...
                </div>

                <Link
                  href="/auth"
                  className="block w-full py-3 bg-[#ac6d46] text-white text-center font-bold hover:bg-[#8a5738] transition-all"
                >
                  LOGIN WITH NEW PASSWORD
                </Link>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
              <h3 className="text-xs font-bold text-[#202020] dark:text-[#e5e5e5] mb-3 border-b border-[#202020] dark:border-[#616161] pb-2">
                SECURITY ACTIONS TAKEN
              </h3>
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">✓</span>
                  <span>Password securely hashed and stored</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#ac6d46]">✓</span>
                  <span>Reset token invalidated</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
              <h3 className="text-xs font-bold text-[#202020] dark:text-[#e5e5e5] mb-3 border-b border-[#202020] dark:border-[#616161] pb-2">
                NEXT STEPS
              </h3>
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-2">
                <div>
                  <strong className="text-[#202020] dark:text-[#e5e5e5]">1. Login:</strong>
                  <div className="mt-1">Use your email/username and new password to access your account.</div>
                </div>
                <div>
                  <strong className="text-[#202020] dark:text-[#e5e5e5]">2. Secure Your Account:</strong>
                  <div className="mt-1">Use a unique, strong password and keep your login credentials safe.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!tokenValid) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-[#202020] border-2 border-[#ac6d46]">
            <div className="bg-[#ac6d46] text-white p-4 flex items-center gap-3">
              <AlertCircle className="w-6 h-6" />
              <div>
                <div className="font-bold text-lg">INVALID OR EXPIRED TOKEN</div>
                <div className="text-xs">This password reset link is not valid</div>
              </div>
            </div>

            <div className="p-6">
              <div className="text-sm text-[#202020] dark:text-[#e5e5e5] mb-4">
                {error}
              </div>

              <div className="border-l-2 border-[#616161] pl-4 mb-6">
                <div className="text-xs font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">COMMON REASONS:</div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1">
                  <div>• Token has expired (links are valid for a limited time)</div>
                  <div>• Token has already been used (single-use only)</div>
                  <div>• Link was copied incorrectly (missing characters)</div>
                </div>
              </div>

              <Link
                href="/password-reset"
                className="block w-full py-3 bg-[#ac6d46] text-white text-center font-bold hover:bg-[#8a5738] transition-all"
              >
                REQUEST NEW PASSWORD RESET LINK
              </Link>

              <div className="text-center mt-4">
                <Link href="/auth" className="text-xs text-[#4676ac] hover:text-[#ac6d46]">
                  ← Return to login page
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="max-w-[1600px] mx-auto px-6 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
            <div className="bg-[#202020] text-white p-4 flex items-center gap-3">
              <Shield className="w-6 h-6" />
              <div>
                <div className="font-bold text-lg">SET NEW PASSWORD</div>
                <div className="text-xs">Create a secure password for your account</div>
              </div>
            </div>

            <div className="p-6">
              {/* Account Info */}
              <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-2 border-[#4676ac] p-3 mb-6">
                <div className="text-xs">
                  <strong className="text-[#202020] dark:text-[#e5e5e5]">Resetting password for:</strong>
                  <span className="ml-2 font-mono text-[#4676ac]">{email}</span>
                </div>
              </div>

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
                {/* New Password */}
                <div>
                  <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                    NEW PASSWORD
                    <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] dark:bg-[#1a1a1a] dark:text-[#e5e5e5] focus:border-[#ac6d46] outline-none text-sm font-mono pr-12"
                      placeholder="Enter new password"
                      required
                      disabled={loading}
                      onChange={(e) => checkPasswordStrength(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#616161] hover:text-[#ac6d46]"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Requirements */}
                <div className="border-2 border-[#4676ac] bg-[#f5f5f5] dark:bg-[#2a2a2a] p-4">
                  <div className="text-xs font-bold text-[#202020] dark:text-[#e5e5e5] mb-3">PASSWORD REQUIREMENTS:</div>
                  <div className="text-xs space-y-1 font-mono">
                    <div className={passwordStrength.length ? 'text-[#ac6d46]' : 'text-[#616161] dark:text-[#b5bcc4]'}>
                      {passwordStrength.length ? '✓' : '○'} Minimum 8 characters
                    </div>
                    <div className={passwordStrength.uppercase ? 'text-[#ac6d46]' : 'text-[#616161] dark:text-[#b5bcc4]'}>
                      {passwordStrength.uppercase ? '✓' : '○'} At least 1 uppercase letter (A-Z)
                    </div>
                    <div className={passwordStrength.lowercase ? 'text-[#ac6d46]' : 'text-[#616161] dark:text-[#b5bcc4]'}>
                      {passwordStrength.lowercase ? '✓' : '○'} At least 1 lowercase letter (a-z)
                    </div>
                    <div className={passwordStrength.number ? 'text-[#ac6d46]' : 'text-[#616161] dark:text-[#b5bcc4]'}>
                      {passwordStrength.number ? '✓' : '○'} At least 1 number (0-9)
                    </div>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                    CONFIRM NEW PASSWORD
                    <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] dark:bg-[#1a1a1a] dark:text-[#e5e5e5] focus:border-[#ac6d46] outline-none text-sm font-mono"
                    placeholder="Re-enter new password"
                    required
                    disabled={loading}
                  />
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1 font-mono">
                    • Must match password exactly
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] disabled:bg-[#b5bcc4] disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
                  disabled={loading || !Object.values(passwordStrength).every(v => v)}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'RESETTING PASSWORD...' : 'RESET PASSWORD'}
                </button>

                {/* Cancel */}
                <div className="text-center pt-2">
                  <Link
                    href="/auth"
                    className="text-xs text-[#4676ac] hover:text-[#ac6d46]"
                  >
                    ← Cancel and return to login
                  </Link>
                </div>
              </form>
            </div>
          </div>

          {/* Security Information */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
            <h3 className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
              WHAT HAPPENS WHEN YOU RESET YOUR PASSWORD
            </h3>
            <div className="space-y-3 text-xs text-[#616161] dark:text-[#b5bcc4]">
              <div className="border-l-2 border-[#ac6d46] pl-4">
                <div className="font-bold text-[#202020] dark:text-[#e5e5e5] mb-1">PASSWORD HASHING</div>
                <p>
                  Your new password will be hashed using industry-standard algorithms before storage.
                  We never store passwords in plain text. The hash is computationally expensive to crack,
                  providing strong protection even if our database is compromised.
                </p>
              </div>
              <div className="border-l-2 border-[#4676ac] pl-4">
                <div className="font-bold text-[#202020] dark:text-[#e5e5e5] mb-1">TOKEN INVALIDATION</div>
                <p>
                  The reset token used for this request will be permanently invalidated and cannot be used
                  again. This ensures single-use security and prevents replay attacks.
                </p>
              </div>
              <div className="border-l-2 border-[#ac6d46] pl-4">
                <div className="font-bold text-[#202020] dark:text-[#e5e5e5] mb-1">ACCOUNT SECURITY</div>
                <p>
                  After resetting your password, we recommend logging in promptly and reviewing your account
                  for any unauthorized changes. Use a strong, unique password that you don't use elsewhere.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Token Information */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold text-[#202020] dark:text-[#e5e5e5] mb-3 border-b border-[#202020] dark:border-[#616161] pb-2">
              RESET TOKEN STATUS
            </h3>
            <div className="text-xs font-mono space-y-2">
              <div>
                <strong className="text-[#202020] dark:text-[#e5e5e5]">Status:</strong>
                <span className="ml-2 text-[#ac6d46]">● VALID</span>
              </div>
              <div>
                <strong className="text-[#202020] dark:text-[#e5e5e5]">Type:</strong>
                <span className="ml-2 text-[#616161] dark:text-[#b5bcc4]">Single-use token</span>
              </div>
              <div>
                <strong className="text-[#202020] dark:text-[#e5e5e5]">Security:</strong>
                <span className="ml-2 text-[#616161] dark:text-[#b5bcc4]">Cryptographically secure</span>
              </div>
              <div>
                <strong className="text-[#202020] dark:text-[#e5e5e5]">Validity:</strong>
                <span className="ml-2 text-[#616161] dark:text-[#b5bcc4]">Limited time window</span>
              </div>
            </div>
          </div>

          {/* Password Best Practices */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold text-[#202020] dark:text-[#e5e5e5] mb-3 border-b border-[#202020] dark:border-[#616161] pb-2">
              PASSWORD BEST PRACTICES
            </h3>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">✓</span>
                <span>Use a unique password not used on other sites</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">✓</span>
                <span>Consider using a password manager</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">✓</span>
                <span>Make it at least 12 characters (8 minimum)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">✓</span>
                <span>Avoid personal information (names, dates)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">✓</span>
                <span>Don't use common words or patterns</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">✓</span>
                <span>Log in promptly after resetting password</span>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold text-[#202020] dark:text-[#e5e5e5] mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              SECURITY NOTICE
            </h3>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-2">
              <p>
                <strong className="text-[#202020] dark:text-[#e5e5e5]">Didn't Request This?</strong>
              </p>
              <p>
                If you didn't request a password reset, someone may be attempting to access your account.
                Your current password remains active until you complete this form.
              </p>
              <p className="pt-2">
                Contact support immediately at{' '}
                <a href="mailto:security@heimursaga.com" className="text-[#4676ac] hover:text-[#ac6d46]">
                  security@heimursaga.com
                </a>
              </p>
            </div>
          </div>

          {/* Post-Reset Steps */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold text-[#202020] dark:text-[#e5e5e5] mb-3 border-b border-[#202020] dark:border-[#616161] pb-2">
              AFTER RESETTING
            </h3>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-3">
              <div>
                <strong className="text-[#202020] dark:text-[#e5e5e5]">Immediate Effects:</strong>
                <div className="mt-1 space-y-1 pl-3">
                  <div>• Password updated securely</div>
                  <div>• Reset token invalidated</div>
                </div>
              </div>
              <div>
                <strong className="text-[#202020] dark:text-[#e5e5e5]">Recommended Actions:</strong>
                <div className="mt-1 space-y-1 pl-3">
                  <div>• Log in with your new password</div>
                  <div>• Review recent account activity</div>
                  <div>• Update password on mobile devices</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}