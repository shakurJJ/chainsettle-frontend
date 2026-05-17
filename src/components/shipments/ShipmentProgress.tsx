// components/shipments/ShipmentProgress.tsx
import { stroopsToUsdc, shipmentProgress } from '@/lib/utils';
import type { Shipment } from '@/types';

export function ShipmentProgress({ shipment }: { shipment: Shipment }) {
  const progress = shipmentProgress(shipment.milestones);
  const totalUsdc = stroopsToUsdc(shipment.totalAmount);
  const releasedUsdc = stroopsToUsdc(shipment.releasedAmount);
  const remainingUsdc = (parseFloat(totalUsdc) - parseFloat(releasedUsdc)).toFixed(2);

  return (
    <div className="card p-5">
      <div className="grid grid-cols-3 gap-4 mb-4">
        <Stat label="Total locked" value={`$${totalUsdc}`} unit="USDC" />
        <Stat label="Released" value={`$${releasedUsdc}`} unit="USDC" color="text-green-600" />
        <Stat label="Remaining in escrow" value={`$${remainingUsdc}`} unit="USDC" color="text-blue-600" />
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2 mb-1.5">
        <div
          className="bg-brand-600 h-2 rounded-full transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-gray-400">{progress}% complete</p>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  color = 'text-gray-900',
}: {
  label: string;
  value: string;
  unit: string;
  color?: string;
}) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className={`text-lg font-semibold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400">{unit}</p>
    </div>
  );
}
