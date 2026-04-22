'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, ApiError } from '@/app/context/AuthContext';
import { useRecaptcha } from '@/app/hooks/useRecaptcha';
import { useGoogleSignIn } from '@/app/hooks/useGoogleSignIn';
import { Loader2, Check } from 'lucide-react';
import { GoogleUsernamePicker } from './GoogleUsernamePicker';

interface PendingGoogleSignup {
  pendingToken: string;
  suggestedUsername: string;
  email: string;
  name?: string;
  picture?: string;
}

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>(
    typeof window !== 'undefined' && window.location.hash === '#register' ? 'register' : 'login',
  );
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pendingGoogle, setPendingGoogle] = useState<PendingGoogleSignup | null>(null);
  const { login, signup, googleAuth } = useAuth();
  const { executeRecaptcha, isConfigured: recaptchaConfigured } = useRecaptcha();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleGoogleCode = useCallback(
    async (code: string) => {
      setError(null);
      setLoading(true);
      try {
        const result = await googleAuth(code);
        if (result.status === 'logged_in') {
          router.push(getSafeRedirect());
        } else {
          setPendingGoogle({
            pendingToken: result.pendingToken,
            suggestedUsername: result.suggestedUsername,
            email: result.email,
            name: result.name,
            picture: result.picture,
          });
        }
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 429) {
            setError('Too many attempts. Please wait a minute and try again.');
          } else {
            setError(err.message || 'Google sign-in failed.');
          }
        } else {
          setError('Google sign-in failed. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    },
    // getSafeRedirect defined below — intentionally not in deps (pure function of searchParams)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [googleAuth, router],
  );

  const handleGoogleCancel = useCallback((_reason: string) => {
    // User closed the popup or denied — no error toast, just reset state.
    setLoading(false);
  }, []);

  const google = useGoogleSignIn({
    onCode: handleGoogleCode,
    onCancel: handleGoogleCancel,
  });

  const handleGoogleClick = useCallback(() => {
    // Set loading state up-front so the button visually disables while the
    // popup is open — otherwise a user could double-click and trigger two
    // concurrent code requests.
    setError(null);
    setLoading(true);
    google.signIn();
  }, [google]);

  const getSafeRedirect = () => {
    const redirect = searchParams.get('redirect') || searchParams.get('from');
    if (!redirect) return '/';
    // Only allow relative paths (same-origin)
    if (redirect.startsWith('/') && !redirect.startsWith('//')) return redirect;
    return '/';
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const usernameOrEmail = (formData.get('username') as string).trim();
    const password = formData.get('password') as string;
    const remember = formData.get('remember') === 'on';

    try {
      await login(usernameOrEmail, password, remember);
      router.push(getSafeRedirect());
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setError('Too many login attempts. Please wait a minute and try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const username = (formData.get('username') as string).trim();
    const email = (formData.get('email') as string).trim();
    const terms = formData.get('terms') === 'on';

    // Client-side validation
    if (!terms) {
      setError('You must agree to the Terms of Service and Privacy Policy');
      setLoading(false);
      return;
    }

    if (username.length < 3 || username.length > 30) {
      setError('Username must be between 3 and 30 characters');
      setLoading(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      setLoading(false);
      return;
    }

    try {
      let recaptchaToken: string | undefined;
      if (recaptchaConfigured) {
        recaptchaToken = (await executeRecaptcha('signup')) || undefined;
      }
      const inviteCode = (formData.get('inviteCode') as string)?.trim() || undefined;
      await signup(email, username, password, recaptchaToken, inviteCode);
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'CompleteRegistration');
      }
      router.push(getSafeRedirect());
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setError('Too many attempts. Please wait a few minutes and try again.');
        } else if (err.message.includes('EMAIL_ALREADY_IN_USE')) {
          setError('This email address is already registered');
        } else if (err.message.includes('USERNAME_ALREADY_IN_USE')) {
          setError('This username is already taken');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-12">
      {/* Hero */}
      <div className="text-center mb-10 md:mb-12">
        <h1 className="font-serif text-[1.75rem] sm:text-4xl md:text-5xl lg:text-6xl text-[#e5e5e5] mb-3 leading-tight whitespace-nowrap">
          Write your world-story.
        </h1>
        <p className="font-serif text-sm md:text-base text-[#b5bcc4] max-w-3xl mx-auto leading-relaxed whitespace-normal md:whitespace-nowrap">
          Journals for explorers, funded by people who care about your discoveries.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Auth Forms */}
        <div className="lg:col-span-2">
          {pendingGoogle ? (
            <GoogleUsernamePicker
              pendingToken={pendingGoogle.pendingToken}
              suggestedUsername={pendingGoogle.suggestedUsername}
              email={pendingGoogle.email}
              name={pendingGoogle.name}
              picture={pendingGoogle.picture}
              onDone={() => {
                if (typeof window.fbq === 'function') {
                  window.fbq('track', 'CompleteRegistration');
                }
                router.push(getSafeRedirect());
              }}
              onCancel={() => setPendingGoogle(null)}
            />
          ) : (
          <>
          {/* Error Message */}
          {error && (
            <div className="bg-white dark:bg-[#202020] border-2 border-[#ac6d46] mb-6 p-4">
              <div className="text-sm font-bold text-[#ac6d46] mb-1">AUTHENTICATION ERROR</div>
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">{error}</div>
            </div>
          )}

          {/* Mode Selector */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
            <div className="flex border-b-2 border-[#202020] dark:border-[#616161]">
              <button
                onClick={() => { setMode('login'); setError(null); }}
                className={`flex-1 py-4 text-sm font-bold transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none ${
                  mode === 'login'
                    ? 'bg-[#ac6d46] text-white focus-visible:ring-[#ac6d46]'
                    : 'bg-[#616161] dark:bg-[#3a3a3a] text-white hover:bg-[#4a4a4a] dark:hover:bg-[#505050] focus-visible:ring-[#616161]'
                }`}
              >
                LOGIN TO EXISTING ACCOUNT
              </button>
              <button
                onClick={() => { setMode('register'); setError(null); }}
                className={`flex-1 py-4 text-sm font-bold transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none ${
                  mode === 'register'
                    ? 'bg-[#ac6d46] text-white focus-visible:ring-[#ac6d46]'
                    : 'bg-[#616161] dark:bg-[#3a3a3a] text-white hover:bg-[#4a4a4a] dark:hover:bg-[#505050] focus-visible:ring-[#616161]'
                }`}
              >
                CREATE NEW ACCOUNT
              </button>
            </div>

            {/* Guest browse link */}
            <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-b-2 border-[#202020] dark:border-[#616161] py-3 px-6 text-center">
              <Link
                href="/"
                className="text-xs font-bold text-[#616161] dark:text-[#b5bcc4] hover:text-[#ac6d46] transition-colors tracking-[0.14em]"
              >
                OR EXPLORE WITHOUT SIGNING UP →
              </Link>
            </div>

            {/* Login Form */}
            {mode === 'login' && (
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
                  ACCOUNT LOGIN
                </h2>

                <GoogleAuthSection
                  onClick={handleGoogleClick}
                  available={google.available}
                  ready={google.ready}
                  loading={loading}
                  label="SIGN IN WITH GOOGLE"
                  buttonText="CONTINUE WITH GOOGLE"
                />
                {google.available && <OrDivider />}

                <div className="text-xs font-bold mb-3 text-[#202020] dark:text-[#e5e5e5] tracking-[0.14em]">
                  SIGN IN WITH EMAIL
                </div>
                <form className="space-y-4" method="POST" onSubmit={handleLogin}>
                  {/* Email/Username */}
                  <div>
                    <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                      EMAIL ADDRESS OR USERNAME
                      <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                    </label>
                    <input
                      type="text"
                      name="username"
                      className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm font-mono bg-white dark:bg-[#1a1a1a] dark:text-[#e5e5e5]"
                      placeholder="your.email@example.com or username"
                      required
                      disabled={loading}
                    />
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1 font-mono">
                      • Case-insensitive • Accepts email or username
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                      PASSWORD
                      <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm font-mono bg-white dark:bg-[#1a1a1a] dark:text-[#e5e5e5]"
                        placeholder="Enter your password"
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#616161] dark:text-[#b5bcc4] hover:text-[#ac6d46]"
                        disabled={loading}
                      >
                        {showPassword ? 'HIDE' : 'SHOW'}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="remember"
                      name="remember"
                      className="w-4 h-4"
                      disabled={loading}
                    />
                    <label htmlFor="remember" className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                      Remember me for 30 days
                    </label>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    className="w-full py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] disabled:bg-[#b5bcc4] disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? 'LOGGING IN...' : 'LOGIN TO ACCOUNT'}
                  </button>

                  {/* Forgot Password */}
                  <div className="text-center">
                    <Link href="/password-reset" className="text-xs text-[#4676ac] hover:text-[#ac6d46]">
                      Forgot password? Click here to reset
                    </Link>
                  </div>
                </form>

                {/* Login Info */}
                <div className="mt-6 p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-2 border-[#4676ac]">
                  <div className="text-xs font-bold mb-2 dark:text-[#e5e5e5]">LOGIN SECURITY DETAILS:</div>
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1 font-mono">
                    <div>• Connection: TLS encrypted</div>
                    <div>• Password: Securely hashed before storage</div>
                    <div>• Session: Encrypted cookie with automatic expiry</div>
                    <div>• Rate limit: Progressive throttling on failed attempts</div>
                  </div>
                </div>
              </div>
            )}

            {/* Register Form */}
            {mode === 'register' && (
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
                  CREATE NEW EXPLORER ACCOUNT
                </h2>

                <GoogleAuthSection
                  onClick={handleGoogleClick}
                  available={google.available}
                  ready={google.ready}
                  loading={loading}
                  label="SIGN UP WITH GOOGLE"
                  buttonText="CONTINUE WITH GOOGLE"
                />
                {google.available && <OrDivider />}

                <div className="text-xs font-bold mb-3 text-[#202020] dark:text-[#e5e5e5] tracking-[0.14em]">
                  SIGN UP WITH EMAIL
                </div>
                <form className="space-y-4" method="POST" onSubmit={handleRegister}>
                  {/* Username */}
                  <div>
                    <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                      USERNAME
                      <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                    </label>
                    <input
                      type="text"
                      name="username"
                      className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm font-mono bg-white dark:bg-[#1a1a1a] dark:text-[#e5e5e5]"
                      placeholder="your_username"
                      required
                      disabled={loading}
                      minLength={3}
                      maxLength={30}
                      pattern="^[a-zA-Z0-9_]+$"
                      title="Letters, numbers, and underscores only"
                    />
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1 font-mono space-y-1">
                      <div>• 3-30 characters</div>
                      <div>• Letters, numbers, underscore only</div>
                      <div>• Case-insensitive • Must be unique</div>
                      <div>• Your username is your ONLY public identifier</div>
                      <div>• We don't ask for or display your real name</div>
                      <div className="text-[#ac6d46] font-bold mt-2">⚠ USERNAME CANNOT BE CHANGED AFTER REGISTRATION</div>
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                      EMAIL ADDRESS
                      <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm font-mono bg-white dark:bg-[#1a1a1a] dark:text-[#e5e5e5]"
                      placeholder="your.email@example.com"
                      required
                      disabled={loading}
                    />
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1 font-mono">
                      • Verification email sent after registration
                      • Used for password recovery and notifications
                      • Never displayed publicly
                    </div>
                  </div>

                  {/* Invite Code */}
                  <div>
                    <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                      INVITE CODE
                      <span className="text-[#616161] dark:text-[#b5bcc4] ml-1">OPTIONAL</span>
                    </label>
                    <input
                      type="text"
                      name="inviteCode"
                      className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#598636] outline-none text-sm font-mono bg-white dark:bg-[#1a1a1a] dark:text-[#e5e5e5]"
                      placeholder="Enter invite code (if you have one)"
                      disabled={loading}
                      maxLength={40}
                    />
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1 font-mono">
                      • Have an invite code? Enter it to register as a Guide
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                      PASSWORD
                      <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm font-mono bg-white dark:bg-[#1a1a1a] dark:text-[#e5e5e5]"
                        placeholder="Create a strong password"
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#616161] dark:text-[#b5bcc4] hover:text-[#ac6d46]"
                        disabled={loading}
                      >
                        {showPassword ? 'HIDE' : 'SHOW'}
                      </button>
                    </div>
                    <div className="mt-2 p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border border-[#b5bcc4] dark:border-[#3a3a3a]">
                      <div className="text-xs font-bold mb-1">PASSWORD REQUIREMENTS:</div>
                      <div className="text-xs space-y-1 font-mono">
                        {[
                          { met: password.length >= 8, label: 'Minimum 8 characters' },
                          { met: /[A-Z]/.test(password), label: 'At least 1 uppercase letter (A-Z)' },
                          { met: /[a-z]/.test(password), label: 'At least 1 lowercase letter (a-z)' },
                          { met: /\d/.test(password), label: 'At least 1 number (0-9)' },
                        ].map(({ met, label }) => (
                          <div key={label} className={`flex items-center gap-1.5 ${password.length === 0 ? 'text-[#616161] dark:text-[#b5bcc4]' : met ? 'text-[#4676ac]' : 'text-[#994040]'}`}>
                            {password.length === 0 ? (
                              <span className="w-3 text-center">○</span>
                            ) : met ? (
                              <Check className="w-3 h-3 flex-shrink-0" />
                            ) : (
                              <span className="w-3 text-center">✕</span>
                            )}
                            <span>{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                      CONFIRM PASSWORD
                      <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm font-mono bg-white dark:bg-[#1a1a1a] dark:text-[#e5e5e5]"
                      placeholder="Re-enter your password"
                      required
                      disabled={loading}
                    />
                    {confirmPassword.length > 0 && (
                      <div className={`flex items-center gap-1.5 mt-1 text-xs font-mono ${password === confirmPassword ? 'text-[#4676ac]' : 'text-[#994040]'}`}>
                        {password === confirmPassword ? (
                          <><Check className="w-3 h-3 flex-shrink-0" /> Passwords match</>
                        ) : (
                          <><span className="w-3 text-center">✕</span> Passwords do not match</>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Privacy Settings */}
                  <div className="border-2 border-[#4676ac] p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                    <div className="text-xs font-bold mb-3">DATA WE COLLECT & DISPLAY:</div>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs font-bold text-[#202020] dark:text-[#e5e5e5] mb-1">PUBLIC INFORMATION:</div>
                        <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1 pl-3">
                          <div>• Username (your only public identifier)</div>
                          <div>• Journal entries and expedition logs (if you choose to publish)</div>
                          <div>• Photos and media you upload to public entries</div>
                          <div>• GPS coordinates for journal entries (location data you document)</div>
                          <div>• Sponsorship statistics (total amounts, expedition counts)</div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-xs font-bold text-[#202020] dark:text-[#e5e5e5] mb-1">PRIVATE INFORMATION (NEVER DISPLAYED):</div>
                        <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1 pl-3">
                          <div>• Email address (used only for notifications & recovery)</div>
                          <div>• Real name (we don't even ask for it)</div>
                          <div>• Payment information (processed by Stripe, never stored)</div>
                          <div>• IP addresses & browser data (security logs only)</div>
                        </div>
                      </div>
                      
                      <div className="mt-2 pt-2 border-t border-[#b5bcc4] dark:border-[#3a3a3a]">
                        <div className="text-xs text-[#4676ac]">
                          Privacy-by-default: We only collect what's necessary and display even less.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Terms Agreement */}
                  <div className="border-2 border-[#202020] dark:border-[#616161] p-4">
                    <div className="flex items-start gap-2 mb-3">
                      <input type="checkbox" id="terms" name="terms" className="mt-1" required disabled={loading} />
                      <label htmlFor="terms" className="text-xs text-[#202020] dark:text-[#e5e5e5]">
                        <strong className="text-[#ac6d46]">*REQUIRED:</strong> I have read and agree to the{' '}
                        <Link href="/legal/terms" target="_blank" className="text-[#4676ac] hover:text-[#ac6d46]">Terms of Service</Link>
                        {' '}and{' '}
                        <Link href="/legal/privacy" target="_blank" className="text-[#4676ac] hover:text-[#ac6d46]">Privacy Policy</Link>
                      </label>
                    </div>

                    <div className="flex items-start gap-2">
                      <input type="checkbox" id="newsletter" className="mt-1" disabled={loading} />
                      <label htmlFor="newsletter" className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                        Optional: Receive platform updates and featured expedition newsletters
                      </label>
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    className="w-full py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] disabled:bg-[#b5bcc4] disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
                  </button>

                  {/* Registration Info */}
                  <div className="mt-4 p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-2 border-[#ac6d46]">
                    <div className="text-xs font-bold mb-2">WHAT HAPPENS AFTER REGISTRATION:</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1">
                      <div>1. Verification email sent to your address</div>
                      <div>2. Verify your email to activate full access</div>
                      <div>3. Start creating expeditions and journal entries</div>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Platform Benefits */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
            <h3 className="text-sm font-bold mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              WHY JOIN HEIMURSAGA?
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border-l-2 border-[#ac6d46] pl-4">
                <div className="text-xs font-bold mb-2">FOR EXPLORERS:</div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1">
                  <div>• Create journal entries and expedition logs</div>
                  <div>• Plan and track expeditions with GPS mapping</div>
                  <div>• Upload photos with each entry</div>
                  <div>• Connect with the global explorer community</div>
                  <div>• Upgrade to Explorer Pro to receive sponsorships</div>
                </div>
              </div>

              <div className="border-l-2 border-[#4676ac] pl-4">
                <div className="text-xs font-bold mb-2">FOR SPONSORS:</div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1">
                  <div>• Support meaningful expeditions</div>
                  <div>• Receive exclusive expedition updates</div>
                  <div>• Direct connection with explorers</div>
                  <div>• Transparent financial tracking</div>
                  <div>• Sponsor multiple expeditions</div>
                </div>
              </div>
            </div>
          </div>
          </>
          )}
        </div>

        {/* Right Column - System Information */}
        <div className="space-y-6">
          {/* Security Features */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              SECURITY FEATURES
            </h3>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">✓</span>
                <span>TLS encryption for all connections</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">✓</span>
                <span>Secure password hashing (PBKDF2)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">✓</span>
                <span>CSRF protection on all mutations</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">✓</span>
                <span>Progressive rate limiting on all endpoints</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">✓</span>
                <span>Encrypted httpOnly session cookies</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">✓</span>
                <span>Account enumeration prevention</span>
              </div>
            </div>
          </div>

          {/* Privacy Policy Summary */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              PRIVACY POLICY SUMMARY
            </h3>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-2 leading-relaxed">
              <p>
                <strong className="text-[#202020] dark:text-[#e5e5e5]">Data Collection:</strong> We only collect necessary data for platform functionality.
              </p>
              <p>
                <strong className="text-[#202020] dark:text-[#e5e5e5]">Location Data:</strong> GPS coordinates you document in journal entries are publicly visible. These represent expedition locations you're documenting, not your personal location.
              </p>
              <p>
                <strong className="text-[#202020] dark:text-[#e5e5e5]">Financial Data:</strong> Payment processing via Stripe. We never store credit card numbers.
              </p>
              <p>
                <strong className="text-[#202020] dark:text-[#e5e5e5]">Your Rights:</strong> Request data export, deletion, or correction at any time.
              </p>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              NEED HELP?
            </h3>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-2">
              <div>
                <strong className="text-[#202020] dark:text-[#e5e5e5]">Email:</strong>{' '}
                <a href="mailto:admin@heimursaga.com" className="text-[#4676ac] hover:text-[#ac6d46]">
                  admin@heimursaga.com
                </a>
              </div>
              <div>
                <strong className="text-[#202020] dark:text-[#e5e5e5]">Response Time:</strong> &lt; 24 hours
              </div>
              <div>
                <Link href="/documentation" className="text-[#4676ac] hover:text-[#ac6d46]">
                  View Documentation →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface GoogleAuthSectionProps {
  onClick: () => void;
  available: boolean;
  ready: boolean;
  loading: boolean;
  label: string;
  buttonText: string;
}

function GoogleAuthSection({ onClick, available, ready, loading, label, buttonText }: GoogleAuthSectionProps) {
  if (!available) return null;
  return (
    <div>
      <div className="text-xs font-bold mb-2 text-[#202020] dark:text-[#e5e5e5] tracking-[0.14em]">
        {label}
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={!ready || loading}
        className="w-full py-3 px-4 border-2 border-[#202020] dark:border-[#e5e5e5] bg-white dark:bg-[#1a1a1a] text-[#202020] dark:text-[#e5e5e5] font-bold text-sm tracking-[0.14em] hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
      >
        <GoogleIcon className="w-5 h-5 flex-shrink-0" />
        {buttonText}
      </button>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  );
}

function OrDivider() {
  return (
    <div className="flex items-center gap-3 my-5" aria-hidden="true">
      <div className="flex-1 border-t border-[#b5bcc4] dark:border-[#3a3a3a]" />
      <span className="text-xs font-bold text-[#616161] dark:text-[#b5bcc4] tracking-[0.14em]">
        OR
      </span>
      <div className="flex-1 border-t border-[#b5bcc4] dark:border-[#3a3a3a]" />
    </div>
  );
}