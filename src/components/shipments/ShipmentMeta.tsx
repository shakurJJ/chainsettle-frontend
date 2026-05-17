'use client';
import { Copy } from 'lucide-react';
import { shortAddress, copyToClipboard, formatDate } from '@/lib/utils';
import type { Shipment } from '@/types';

export function ShipmentMeta({ shipment }: { shipment: Shipment }) {
  const rows = [
    { label: 'Buyer', value: shipment.buyerAddress },
    { label: 'Supplier', value: shipment.supplierAddress },
    { label: 'Logistics', value: shipment.logisticsAddress },
    { label: 'Arbiter', value: shipment.arbiterAddress },
    { label: 'USDC contract', value: shipment.tokenAddress },
    { label: 'Created', value: null, display: formatDate(shipment.createdAt) },
    { label: 'Tx hash', value: shipment.txHash },
  ];

  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">Details</h2>
      <div className="space-y-2.5">
        {rows.map(({ label, value, display }) => (
          <div key={label} className="flex items-center justify-between text-xs">
            <span className="text-gray-400 w-32 flex-shrink-0">{label}</span>
            {value ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-mono text-gray-700 truncate">
                  {shortAddress(value, 6)}
                </span>
                <button
                  onClick={() => copyToClipboard(value)}
                  className="text-gray-300 hover:text-gray-600 transition-colors flex-shrink-0"
                  aria-label="Copy"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span className="text-gray-700">{display ?? '—'}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
