'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { authApi, ApiError } from '@/app/services/api';
import { useAuth } from '@/app/context/AuthContext';

interface Props {
  pendingToken: string;
  suggestedUsername: string;
  email: string;
  name?: string;
  picture?: string;
  onDone: () => void;
  onCancel: () => void;
}

type AvailabilityState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'available' }
  | { kind: 'unavailable'; reason: 'invalid' | 'reserved' | 'taken' };

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

export function GoogleUsernamePicker({
  pendingToken,
  suggestedUsername,
  email,
  name,
  picture,
  onDone,
  onCancel,
}: Props) {
  const { googleCompleteSignup } = useAuth();
  const [username, setUsername] = useState(suggestedUsername);
  const [inviteCode, setInviteCode] = useState('');
  const [terms, setTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avail, setAvail] = useState<AvailabilityState>({ kind: 'idle' });

  const normalized = useMemo(() => username.trim().toLowerCase(), [username]);

  const clientSideInvalid = useMemo(() => {
    if (!normalized) return 'Required';
    if (normalized.length < 3) return 'Too short (min 3)';
    if (normalized.length > 30) return 'Too long (max 30)';
    if (!USERNAME_REGEX.test(normalized))
      return 'Letters, numbers, underscore only';
    return null;
  }, [normalized]);

  useEffect(() => {
    if (clientSideInvalid) {
      setAvail({ kind: 'idle' });
      return;
    }
    setAvail({ kind: 'checking' });
    const handle = setTimeout(async () => {
      try {
        const res = await authApi.usernameAvailable(normalized);
        if (res.available) {
          setAvail({ kind: 'available' });
        } else {
          setAvail({
            kind: 'unavailable',
            reason: res.reason || 'taken',
          });
        }
      } catch {
        setAvail({ kind: 'idle' });
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [normalized, clientSideInvalid]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);
      if (!terms) {
        setError('You must agree to the Terms of Service and Privacy Policy');
        return;
      }
      if (clientSideInvalid) {
        setError(clientSideInvalid);
        return;
      }
      if (avail.kind === 'unavailable') {
        setError(
          avail.reason === 'reserved'
            ? 'This username is reserved'
            : avail.reason === 'invalid'
              ? 'Username is invalid'
              : 'This username is already taken',
        );
        return;
      }
      setSubmitting(true);
      try {
        await googleCompleteSignup({
          pendingToken,
          username: normalized,
          inviteCode: inviteCode.trim() || undefined,
        });
        onDone();
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 401) {
            setError('Signup session expired, please try again.');
          } else if (err.message.includes('USERNAME_ALREADY_IN_USE')) {
            setError('This username is already taken');
          } else {
            setError(err.message);
          }
        } else {
          setError('An unexpected error occurred. Please try again.');
        }
      } finally {
        setSubmitting(false);
      }
    },
    [
      terms,
      clientSideInvalid,
      avail,
      googleCompleteSignup,
      pendingToken,
      normalized,
      inviteCode,
      onDone,
    ],
  );

  const availabilityHint = (() => {
    if (clientSideInvalid) {
      return (
        <span className="text-[#994040]">✕ {clientSideInvalid}</span>
      );
    }
    if (avail.kind === 'checking')
      return <span className="text-[#616161] dark:text-[#b5bcc4]">Checking…</span>;
    if (avail.kind === 'available')
      return (
        <span className="text-[#598636] flex items-center gap-1">
          <Check className="w-3 h-3" /> Available
        </span>
      );
    if (avail.kind === 'unavailable')
      return (
        <span className="text-[#994040]">
          ✕{' '}
          {avail.reason === 'reserved'
            ? 'Reserved'
            : avail.reason === 'invalid'
              ? 'Invalid'
              : 'Already taken'}
        </span>
      );
    return null;
  })();

  const submitDisabled =
    submitting ||
    !!clientSideInvalid ||
    avail.kind === 'checking' ||
    avail.kind === 'unavailable' ||
    !terms;

  return (
    <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
      <h2 className="text-xl font-bold mb-2 border-b-2 border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
        CHOOSE YOUR USERNAME
      </h2>
      <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-4 mt-2 font-mono">
        Signing up with Google as <strong className="text-[#202020] dark:text-[#e5e5e5]">{email}</strong>
        {name ? ` (${name})` : ''}. Pick the handle you'll be known by — it
        appears on your profile and can't be changed later.
      </p>

      {picture && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-2 border-[#4676ac]">
          <img
            src={picture}
            alt=""
            referrerPolicy="no-referrer"
            onError={(e) => {
              // Hide the image on load failure rather than showing a broken icon.
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
            className="w-10 h-10 rounded-full"
          />
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
            Google profile • you can change your photo in settings later
          </div>
        </div>
      )}

      {error && (
        <div className="bg-white dark:bg-[#202020] border-2 border-[#994040] mb-4 p-3">
          <div className="text-xs font-bold text-[#994040]">{error}</div>
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
            USERNAME
            <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm font-mono bg-white dark:bg-[#1a1a1a] dark:text-[#e5e5e5]"
            placeholder="your_username"
            required
            disabled={submitting}
            minLength={3}
            maxLength={30}
            pattern="^[a-zA-Z0-9_]+$"
            autoFocus
          />
          <div className="text-xs mt-2 font-mono min-h-[1rem]">{availabilityHint}</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1 font-mono space-y-0.5">
            <div>• 3-30 characters • letters, numbers, underscore</div>
            <div className="text-[#ac6d46] font-bold">⚠ USERNAME CANNOT BE CHANGED LATER</div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
            INVITE CODE
            <span className="text-[#616161] dark:text-[#b5bcc4] ml-1">OPTIONAL</span>
          </label>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#598636] outline-none text-sm font-mono bg-white dark:bg-[#1a1a1a] dark:text-[#e5e5e5]"
            placeholder="Enter invite code (if you have one)"
            disabled={submitting}
            maxLength={40}
          />
        </div>

        <div className="border-2 border-[#202020] dark:border-[#616161] p-4">
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="google-terms"
              className="mt-1"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              disabled={submitting}
            />
            <label htmlFor="google-terms" className="text-xs text-[#202020] dark:text-[#e5e5e5]">
              <strong className="text-[#ac6d46]">*REQUIRED:</strong> I have read and agree to the{' '}
              <a href="/legal/terms" target="_blank" rel="noreferrer" className="text-[#4676ac] hover:text-[#ac6d46]">Terms of Service</a>
              {' '}and{' '}
              <a href="/legal/privacy" target="_blank" rel="noreferrer" className="text-[#4676ac] hover:text-[#ac6d46]">Privacy Policy</a>
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 py-3 bg-[#616161] dark:bg-[#3a3a3a] text-white font-bold hover:bg-[#4a4a4a] dark:hover:bg-[#505050] transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100"
          >
            CANCEL
          </button>
          <button
            type="submit"
            className="flex-1 py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] disabled:bg-[#b5bcc4] disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
            disabled={submitDisabled}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'CREATING ACCOUNT…' : 'CREATE ACCOUNT'}
          </button>
        </div>
      </form>
    </div>
  );
}
