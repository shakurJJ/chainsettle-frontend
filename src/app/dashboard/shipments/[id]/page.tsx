'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { shipmentsApi } from '@/lib/api/services';
import { useAuthStore } from '@/lib/hooks/use-auth-store';
import { MilestoneTimeline } from '@/components/milestones/MilestoneTimeline';
import { ShipmentMeta } from '@/components/shipments/ShipmentMeta';
import { ShipmentProgress } from '@/components/shipments/ShipmentProgress';
import { shipmentStatusBadge, timeAgo } from '@/lib/utils';
import type { Shipment } from '@/types';

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { address } = useAuthStore();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    try {
      const data = await shipmentsApi.get(id);
      setShipment(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await shipmentsApi.sync(id);
      await load();
    } finally {
      setSyncing(false);
    }
  };

  const onMilestoneUpdate = () => load();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Shipment not found.</p>
        <Link href="/dashboard/shipments" className="btn-secondary mt-4 inline-flex">
          Back to shipments
        </Link>
      </div>
    );
  }

  const isBuyer = address === shipment.buyerAddress;
  const isSupplier = address === shipment.supplierAddress;
  const isLogistics = address === shipment.logisticsAddress;
  const isArbiter = address === shipment.arbiterAddress;
  const userRole = isBuyer
    ? 'buyer'
    : isSupplier
    ? 'supplier'
    : isLogistics
    ? 'logistics'
    : isArbiter
    ? 'arbiter'
    : 'observer';

  return (
    <div>
      {/* Back nav */}
      <Link
        href="/dashboard/shipments"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        All shipments
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-xl font-semibold text-gray-900">{shipment.id}</h1>
            <span className={shipmentStatusBadge(shipment.status)}>{shipment.status}</span>
          </div>
          <p className="text-xs text-gray-400">
            Created {timeAgo(shipment.createdAt)} · Your role:{' '}
            <span className="font-medium text-gray-600 capitalize">{userRole}</span>
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="btn-secondary text-xs"
        >
          {syncing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Sync from chain
        </button>
      </div>

      {/* Progress bar */}
      <ShipmentProgress shipment={shipment} />

      {/* Milestones */}
      <div className="mt-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Milestones</h2>
        <MilestoneTimeline
          shipment={shipment}
          userRole={userRole}
          onUpdate={onMilestoneUpdate}
        />
      </div>

      {/* Meta */}
      <div className="mt-5">
        <ShipmentMeta shipment={shipment} />
      </div>
    </div>
  );
}
