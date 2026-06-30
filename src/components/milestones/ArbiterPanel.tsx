'use client';

import { useState } from 'react';
import { AlertTriangle, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { resolveDispute } from '@/lib/stellar/contract';
import { useAuthStore } from '@/lib/hooks/use-auth-store';
import { stroopsToUsdc } from '@/lib/utils';
import type { Shipment, Milestone } from '@/types';

interface ArbiterPanelProps {
  milestone: Milestone;
  shipment: Shipment;
  onUpdate: () => void;
}

export function ArbiterPanel({ milestone, shipment, onUpdate }: ArbiterPanelProps) {
  const { address } = useAuthStore();
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);

  const totalUsdc = parseFloat(stroopsToUsdc(shipment.totalAmount));
  const milestoneUsdc = ((totalUsdc * milestone.paymentPercent) / 100).toFixed(2);

  const handle = async (approve: boolean) => {
    const action = approve ? 'approve' : 'reject';
    const message = approve
      ? `Approve this milestone and release $${milestoneUsdc} USDC to the supplier?`
      : `Reject this milestone and reset it back to Pending?`;

    if (!window.confirm(message)) return;

    setLoading(approve ? 'approve' : 'reject');
    try {
      await resolveDispute({
        callerAddress: address!,
        shipmentId: shipment.id,
        milestoneIndex: milestone.milestoneIndex,
        approve,
      });
      onUpdate();
    } catch (err: any) {
      alert(err?.message ?? `Failed to ${action} milestone`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-4 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span className="text-sm font-semibold text-amber-800">Arbiter Action Required</span>
      </div>

      <div className="space-y-1.5 mb-4 text-xs text-amber-900">
        <p>
          <span className="font-medium">Milestone:</span> {milestone.name}
        </p>
        <p>
          <span className="font-medium">Value:</span> {milestone.paymentPercent}% — ${milestoneUsdc} USDC
        </p>
        {milestone.proofHash && (
          <p className="flex items-center gap-1 flex-wrap">
            <span className="font-medium">Proof:</span>
            <a
              href={
                milestone.proofHash.startsWith('ipfs://')
                  ? `https://ipfs.io/ipfs/${milestone.proofHash.replace('ipfs://', '')}`
                  : milestone.proofHash
              }
              target="_blank"
              rel="noreferrer"
              className="font-mono text-amber-700 underline hover:text-amber-900 truncate max-w-xs"
            >
              {milestone.proofHash}
            </a>
          </p>
        )}
        <p>
          <span className="font-medium">Status:</span> Disputed — review the proof and take action below.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handle(true)}
          disabled={loading !== null}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading === 'approve' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ThumbsUp className="w-3.5 h-3.5" />
          )}
          Approve milestone
        </button>

        <button
          onClick={() => handle(false)}
          disabled={loading !== null}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading === 'reject' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ThumbsDown className="w-3.5 h-3.5" />
          )}
          Reject milestone
        </button>
      </div>
    </div>
  );
}
