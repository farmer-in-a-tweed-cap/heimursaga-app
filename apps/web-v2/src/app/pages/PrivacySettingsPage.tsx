'use client';

import { useState, useEffect, useCallback } from 'react';
import { Lock, Shield, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { SettingsLayout } from '@/app/components/SettingsLayout';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { authApi, explorerApi } from '@/app/services/api';

interface SessionInfo {
  id: number;
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  createdAt?: string;
  expiresAt?: string;
  isCurrent: boolean;
}

function parseUserAgent(ua?: string): string {
  if (!ua) return 'Unknown device';
  const browser =
    ua.match(/Chrome/i) ? 'Chrome' :
    ua.match(/Firefox/i) ? 'Firefox' :
    ua.match(/Safari/i) && !ua.match(/Chrome/i) ? 'Safari' :
    ua.match(/Edge/i) ? 'Edge' :
    'Browser';
  const os =
    ua.match(/Mac OS/i) ? 'macOS' :
    ua.match(/Windows/i) ? 'Windows' :
    ua.match(/Linux/i) ? 'Linux' :
    ua.match(/iPhone|iPad/i) ? 'iOS' :
    ua.match(/Android/i) ? 'Android' :
    'Unknown OS';
  return `${browser} on ${os}`;
}

export function PrivacySettingsPage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [resetStatus, setResetStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [revokeStatus, setRevokeStatus] = useState<'idle' | 'revoking' | 'done'>('idle');

  const loadSessions = useCallback(async () => {
    try {
      setSessionsLoading(true);
      const data = await explorerApi.getSessions();
      setSessions(data);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadSessions();
    }
  }, [isAuthenticated, loadSessions]);

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setResetStatus('sending');
    try {
      await authApi.requestPasswordReset({ email: user.email });
      setResetStatus('sent');
      toast.success('Password reset link sent');
    } catch {
      setResetStatus('error');
      toast.error('Failed to send reset link');
      setTimeout(() => setResetStatus('idle'), 3000);
    }
  };

  const handleRevokeSession = async (id: number) => {
    try {
      await explorerApi.revokeSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success('Session revoked');
    } catch {
      toast.error('Failed to revoke session');
    }
  };

  const handleRevokeAll = async () => {
    setRevokeStatus('revoking');
    try {
      await explorerApi.revokeAllSessions();
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      setRevokeStatus('done');
      toast.success('All other sessions revoked');
      setTimeout(() => setRevokeStatus('idle'), 3000);
    } catch {
      setRevokeStatus('idle');
      toast.error('Failed to revoke sessions');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="p-6 border-b-2 border-[#202020] dark:border-[#616161] bg-[#616161] text-white">
            <div className="flex items-center gap-3">
              <Lock size={24} strokeWidth={2} />
              <h2 className="text-lg font-bold">AUTHENTICATION REQUIRED</h2>
            </div>
          </div>
          <div className="p-8 text-center">
            <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-6">
              You must be logged in to manage privacy settings. Please log in to continue.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/auth?from=' + pathname)}
                className="px-6 py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm"
              >
                LOG IN / REGISTER
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] font-bold hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-sm"
              >
                GO TO HOMEPAGE
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const otherSessionCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <SettingsLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Password */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#616161] text-white px-4 py-3 font-bold text-sm flex items-center gap-2">
              <Shield className="w-4 h-4" />
              PASSWORD
            </div>
            <div className="p-4 lg:p-6">
              <div className="flex items-center gap-3">
                <input
                  type="password"
                  value="••••••••••••"
                  disabled
                  className="flex-1 px-3 py-2 border-2 border-[#b5bcc4] dark:border-[#616161] text-sm bg-[#f5f5f5] dark:bg-[#2a2a2a] dark:text-[#b5bcc4]"
                />
                <button
                  onClick={handlePasswordReset}
                  disabled={resetStatus === 'sending' || resetStatus === 'sent'}
                  className={`px-4 py-2 text-xs font-bold whitespace-nowrap transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] ${
                    resetStatus === 'sent'
                      ? 'bg-[#4676ac] text-white'
                      : 'bg-[#202020] dark:bg-[#4676ac] text-white hover:bg-[#0a0a0a] dark:hover:bg-[#365a87]'
                  }`}
                >
                  {resetStatus === 'sending'
                    ? 'SENDING...'
                    : resetStatus === 'sent'
                      ? 'RESET LINK SENT'
                      : resetStatus === 'error'
                        ? 'ERROR — RETRY'
                        : 'CHANGE PASSWORD'}
                </button>
              </div>
              {resetStatus === 'sent' && (
                <div className="mt-3 text-xs text-[#4676ac] font-bold">
                  Password reset link sent to {user?.email}
                </div>
              )}
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-3 font-mono">
                A password reset link will be emailed to {user?.email}
              </div>
            </div>
          </div>

          {/* Active Sessions */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#616161] text-white px-4 py-3 font-bold text-sm flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              ACTIVE SESSIONS
            </div>
            <div className="p-4 lg:p-6">
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-4">
                These devices are currently logged into your account. Remove any sessions you don't recognize.
              </div>

              {sessionsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3 border-2 border-[#b5bcc4] dark:border-[#616161]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-48 bg-[#b5bcc4] dark:bg-[#3a3a3a] animate-pulse" />
                          <div className="h-3 w-32 bg-[#b5bcc4] dark:bg-[#3a3a3a] animate-pulse" />
                          <div className="h-3 w-40 bg-[#b5bcc4] dark:bg-[#3a3a3a] animate-pulse" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] text-center py-4">
                  No active sessions found.
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div key={session.id} className="flex items-start justify-between gap-4 p-3 border-2 border-[#b5bcc4] dark:border-[#616161]">
                      <div className="flex-1">
                        <div className="font-bold text-sm mb-1 dark:text-[#e5e5e5]">
                          {session.device || parseUserAgent(session.userAgent)}
                          {session.isCurrent && (
                            <span className="ml-2 px-2 py-0.5 bg-[#4676ac] text-white text-xs font-bold">
                              CURRENT
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1">
                          {session.ipAddress && <div>IP: {session.ipAddress}</div>}
                          {session.createdAt && (
                            <div>
                              Started: {new Date(session.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      {!session.isCurrent && (
                        <button
                          onClick={() => handleRevokeSession(session.id)}
                          className="px-3 py-1.5 text-xs font-bold border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#994040]/10 dark:hover:bg-[#994040]/20 hover:border-[#994040] hover:text-[#994040] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#994040] whitespace-nowrap"
                        >
                          REVOKE
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {otherSessionCount > 0 && (
                <button
                  onClick={handleRevokeAll}
                  disabled={revokeStatus === 'revoking'}
                  className="w-full mt-4 px-4 py-2 text-xs font-bold border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161]"
                >
                  {revokeStatus === 'revoking'
                    ? 'REVOKING...'
                    : revokeStatus === 'done'
                      ? 'ALL OTHER SESSIONS REVOKED'
                      : 'SIGN OUT ALL OTHER DEVICES'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Session Overview */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#4676ac] text-white px-4 py-3 font-bold text-sm">
              SESSION OVERVIEW
            </div>
            <div className="p-4 space-y-3 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Active Sessions:</span>
                <span className="font-bold dark:text-[#e5e5e5]">
                  {sessionsLoading ? '...' : sessions.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Other Devices:</span>
                <span className="font-bold dark:text-[#e5e5e5]">
                  {sessionsLoading ? '...' : otherSessionCount}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-[#b5bcc4] dark:border-[#616161] pt-3">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Email Verified:</span>
                <span className={`font-bold ${user?.isEmailVerified ? 'text-[#4676ac]' : 'text-[#ac6d46]'}`}>
                  {user?.isEmailVerified ? 'YES' : 'NO'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Account:</span>
                <span className="font-bold dark:text-[#e5e5e5]">
                  {user?.isPremium ? 'EXPLORER PRO' : 'FREE'}
                </span>
              </div>
            </div>
          </div>

          {/* Account Info */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#b5bcc4] dark:border-[#616161]">
            <div className="p-4">
              <div className="text-xs font-bold mb-3 dark:text-[#e5e5e5]">ACCOUNT DETAILS</div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Username:</span>
                  <span className="font-bold dark:text-[#e5e5e5]">{user?.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Email:</span>
                  <span className="font-bold dark:text-[#e5e5e5] truncate ml-2">{user?.email}</span>
                </div>
                {user?.createdAt && (
                  <div className="flex justify-between border-t border-[#b5bcc4] dark:border-[#616161] pt-2">
                    <span className="text-[#616161] dark:text-[#b5bcc4]">Joined:</span>
                    <span className="font-bold dark:text-[#e5e5e5]">
                      {new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#b5bcc4] dark:border-[#616161]">
            <div className="p-4">
              <div className="text-xs font-bold mb-2 dark:text-[#e5e5e5]">SECURITY TIPS</div>
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-2 leading-relaxed">
                <div>Use a unique, strong password (12+ characters)</div>
                <div>Review active sessions regularly for unfamiliar devices</div>
                <div>Revoke sessions you don't recognize immediately</div>
                <div>Never share your password or reset links</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}
