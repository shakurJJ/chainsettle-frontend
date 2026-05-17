'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Package, Search, Filter } from 'lucide-react';
import { shipmentsApi } from '@/lib/api/services';
import { useAuthStore } from '@/lib/hooks/use-auth-store';
import { ShipmentCard } from '@/components/shipments/ShipmentCard';
import type { Shipment, ShipmentStatus } from '@/types';

export default function ShipmentsPage() {
  const { address } = useAuthStore();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | ''>('');

  useEffect(() => {
    if (!address) return;
    setLoading(true);

    // Fetch shipments where user is buyer OR supplier
    shipmentsApi
      .list({ buyerAddress: address, status: statusFilter || undefined })
      .then((res) => setShipments(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [address, statusFilter]);

  const filtered = shipments.filter((s) =>
    s.id.toLowerCase().includes(search.toLowerCase()) ||
    s.supplierAddress.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Shipments</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {shipments.length} shipment{shipments.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <Link href="/dashboard/shipments/create" className="btn-primary">
          <Plus className="w-4 h-4" />
          New shipment
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search shipment ID or address…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ShipmentStatus | '')}
          className="input w-auto"
        >
          <option value="">All statuses</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* Shipments list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-32 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-64 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-48" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700">No shipments found</p>
          <p className="text-xs text-gray-400 mt-1">
            Create your first shipment to get started.
          </p>
          <Link href="/dashboard/shipments/create" className="btn-primary mt-4 inline-flex">
            <Plus className="w-4 h-4" />
            New shipment
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((shipment) => (
            <ShipmentCard key={shipment.id} shipment={shipment} />
          ))}
        </div>
      )}
    </div>
  );
}
