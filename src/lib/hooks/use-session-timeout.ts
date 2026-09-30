/**
 * lib/hooks/use-session-timeout.ts
 *
 * Tracks the current JWT's remaining lifetime and reports when the session
 * enters the warning window (default: last 2 minutes) or has expired.
 *
 * Timers are scheduled for the exact transition points rather than polling,
 * and are re-evaluated when the tab becomes visible again because browsers
 * throttle timers in background tabs.
 */

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/hooks/use-auth-store';

export const SESSION_WARNING_WINDOW_MS = 2 * 60 * 1000;

// setTimeout overflows (fires immediately) for delays above 2^31 - 1 ms
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

export type SessionStatus = 'active' | 'warning' | 'expired';

function statusFor(expiresAt: number | null, now: number, warningWindowMs: number): SessionStatus {
  if (expiresAt === null) return 'active';
  const remaining = expiresAt - now;
  if (remaining <= 0) return 'expired';
  if (remaining <= warningWindowMs) return 'warning';
  return 'active';
}

export function useSessionTimeout(warningWindowMs: number = SESSION_WARNING_WINDOW_MS) {
  const expiresAt = useAuthStore((s) => s.expiresAt);
  const [now, setNow] = useState(() => Date.now());

  const status = statusFor(expiresAt, now, warningWindowMs);

  // Schedule a re-render at the next status transition
  useEffect(() => {
    if (expiresAt === null) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      const current = Date.now();
      setNow(current);
      const remaining = expiresAt - current;
      if (remaining <= 0) return;
      const nextTransition = remaining > warningWindowMs ? remaining - warningWindowMs : remaining;
      timer = setTimeout(schedule, Math.min(nextTransition, MAX_TIMEOUT_MS));
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      clearTimeout(timer);
      schedule();
    };

    schedule();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [expiresAt, warningWindowMs]);

  // Tick every second while the warning is visible to drive the countdown
  useEffect(() => {
    if (status !== 'warning') return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [status]);

  const msLeft = expiresAt === null ? null : Math.max(0, expiresAt - now);

  return { status, msLeft, expiresAt };
}
