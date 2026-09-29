'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { getEscrowBalance } from '@/lib/stellar/contract';
import { shipmentsApi } from '@/lib/api/services';
import type { Shipment } from '@/types';

interface EscrowBalanceCardProps {
  shipment: Shipment;
  /** Bump this value to force a re-read of the on-chain balance. */
  refreshKey?: number;
  /** Called after a successful sync so the parent can refetch the shipment. */
  onSynced?: () => void;
}

function formatUsdc(value: number): string {
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  })} USDC`;
}

export function EscrowBalanceCard({
  shipment,
  refreshKey = 0,
  onSynced,
}: EscrowBalanceCardProps) {
  const [onChainBalance, setOnChainBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);

  const expectedBalance = shipment.totalAmount - shipment.releasedAmount;

  const fetchBalance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const balance = await getEscrowBalance(shipment.id);
      setOnChainBalance(balance);
      setLastChecked(new Date());
    } catch (err) {
      console.error(err);
      setError('Unable to read the on-chain escrow balance.');
    } finally {
      setLoading(false);
    }
  }, [shipment.id]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance, refreshKey]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await shipmentsApi.sync(shipment.id);
      await fetchBalance();
      onSynced?.();
    } catch (err) {
      console.error(err);
      setError('Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const hasMismatch =
    onChainBalance !== null &&
    Math.abs(onChainBalance - expectedBalance) > 0.0000001;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900">
          Escrow balance
        </h2>
        {lastChecked && !loading && (
          <span className="text-xs text-gray-400">
            Last checked {lastChecked.toLocaleTimeString()}
          </span>
        )}
      </div>

      {loading ? (
        <div
          className="space-y-2"
          role="status"
          aria-live="polite"
          aria-label="Loading escrow balance"
        >
          <div className="h-5 w-40 rounded bg-gray-100 animate-pulse" />
          <div className="h-4 w-32 rounded bg-gray-100 animate-pulse" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={fetchBalance}
            className="btn-secondary text-xs"
            aria-label="Retry reading on-chain escrow balance"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">On-chain balance</span>
            <span className="text-sm font-medium text-gray-900">
              {onChainBalance !== null ? formatUsdc(onChainBalance) : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Expected balance</span>
            <span className="text-sm font-medium text-gray-900">
              {formatUsdc(expectedBalance)}
            </span>
          </div>

          {hasMismatch && (
            <div className="mt-3 flex items-start justify-between gap-3 rounded-md bg-amber-50 p-3 ring-1 ring-inset ring-amber-200">
              <div className="flex items-start gap-2">
                <AlertTriangle
                  className="w-4 h-4 text-amber-500 mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <p className="text-xs text-amber-700">
                  On-chain balance differs from the backend record. The event
                  poller may be behind.
                </p>
              </div>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="btn-secondary text-xs shrink-0"
                aria-label={syncing ? 'Syncing now' : 'Sync now'}
              >
                {syncing ? (
                  <Loader2
                    className="w-3.5 h-3.5 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                Sync now
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
