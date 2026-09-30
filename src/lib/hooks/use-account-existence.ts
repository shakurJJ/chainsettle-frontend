"use client";

import { useEffect, useState } from 'react';
import { accountExists, isValidStellarAddress, normalizeAddress } from '@/lib/stellar/address';

export type AccountExistenceStatus = 'idle' | 'checking' | 'exists' | 'missing' | 'error';

const DEBOUNCE_MS = 600;

// Results are stable for the lifetime of the page, so share them across fields
const cache = new Map<string, boolean>();

/**
 * Debounced Horizon lookup that reports whether an address is funded on the
 * configured network. Only runs for syntactically valid addresses, and only
 * after the value has stopped changing for DEBOUNCE_MS.
 */
export function useAccountExistence(value: string): AccountExistenceStatus {
  const address = normalizeAddress(value);
  const valid = isValidStellarAddress(address);
  const [status, setStatus] = useState<AccountExistenceStatus>('idle');

  useEffect(() => {
    if (!valid) {
      setStatus('idle');
      return;
    }

    const cached = cache.get(address);
    if (cached !== undefined) {
      setStatus(cached ? 'exists' : 'missing');
      return;
    }

    let cancelled = false;
    setStatus('checking');
    const timeout = window.setTimeout(() => {
      accountExists(address)
        .then((exists) => {
          cache.set(address, exists);
          if (!cancelled) setStatus(exists ? 'exists' : 'missing');
        })
        .catch(() => {
          if (!cancelled) setStatus('error');
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [address, valid]);

  return status;
}
