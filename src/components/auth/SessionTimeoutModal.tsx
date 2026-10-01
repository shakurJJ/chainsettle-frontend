'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Loader2, LogOut, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/hooks/use-auth-store';
import { useSessionTimeout } from '@/lib/hooks/use-session-timeout';
import { signInWithStellar } from '@/lib/auth/sign-in';
import { endSession, LOGIN_PATH } from '@/lib/auth/session';
import { shortAddress } from '@/lib/utils';

function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Warns the user shortly before their JWT expires and lets them renew it in
 * place by re-running Sign-In With Stellar. The user stays on the current
 * page throughout, so in-progress work (including create-shipment drafts)
 * is not lost. If the token expires without renewal, the session is ended
 * and the user is redirected to login with a callbackUrl.
 */
export function SessionTimeoutModal() {
  const t = useTranslations('session');
  const router = useRouter();
  const { address, setAuth, logout } = useAuthStore();
  const { status, msLeft } = useSessionTimeout();

  const [renewing, setRenewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stayButtonRef = useRef<HTMLButtonElement>(null);
  const logoutButtonRef = useRef<HTMLButtonElement>(null);

  const open = status === 'warning' || (status === 'expired' && renewing);

  // Expired without a renewal in flight — end the session. While the user is
  // mid-signature in Freighter we wait, since renewal does not need the old token.
  useEffect(() => {
    if (status === 'expired' && !renewing) endSession('expired');
  }, [status, renewing]);

  // Reset transient state whenever the dialog closes (e.g. after renewal)
  useEffect(() => {
    if (!open) setError(null);
  }, [open]);

  // Move focus into the dialog when it opens
  useEffect(() => {
    if (open) stayButtonRef.current?.focus();
  }, [open]);

  if (!open || !address) return null;

  const handleStaySignedIn = async () => {
    setError(null);
    setRenewing(true);
    try {
      const result = await signInWithStellar();
      if (result.address !== address) {
        setError(t('wrongAccount', { address: shortAddress(address) }));
        return;
      }
      setAuth(result.address, result.accessToken, result.user);
    } catch (err: any) {
      setError(err?.message ?? t('renewFailed'));
    } finally {
      setRenewing(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace(LOGIN_PATH);
  };

  // Keep keyboard focus inside the two dialog actions (DOM order: Log out, Stay)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const first = logoutButtonRef.current;
    const last = stayButtonRef.current;
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 p-4" role="presentation">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-fade-in"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-timeout-title"
        aria-describedby="session-timeout-description"
        onKeyDown={handleKeyDown}
      >
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <Clock className="h-5 w-5" aria-hidden="true" />
        </div>
        <h2 id="session-timeout-title" className="mb-2 text-lg font-semibold text-gray-900">
          {t('expiringTitle')}
        </h2>
        <p id="session-timeout-description" className="mb-5 text-sm leading-6 text-gray-500">
          {t.rich('expiringDescription', {
            countdown: formatCountdown(msLeft ?? 0),
            time: (chunks) => (
              <span className="font-mono font-semibold text-gray-900">{chunks}</span>
            ),
          })}
        </p>

        {error && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3.5" role="alert">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={logoutButtonRef}
            type="button"
            onClick={handleLogout}
            disabled={renewing}
            className="btn-secondary text-sm"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {t('logOut')}
          </button>
          <button
            ref={stayButtonRef}
            type="button"
            onClick={handleStaySignedIn}
            disabled={renewing}
            className="btn-primary text-sm"
          >
            {renewing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            )}
            {renewing ? t('renewing') : t('staySignedIn')}
          </button>
        </div>
      </div>
    </div>
  );
}
