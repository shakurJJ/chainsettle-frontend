'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Package, Search } from 'lucide-react';
import { shipmentsApi } from '@/lib/api/services';
import { useAuthStore } from '@/lib/hooks/use-auth-store';
import { ShipmentCard } from '@/components/shipments/ShipmentCard';
import { ShipmentCardSkeleton } from '@/components/shipments/ShipmentCardSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';
import type { Shipment, ShipmentStatus } from '@/types';

const PAGE_LIMIT = 10;

export default function ShipmentsPage() {
  const { address } = useAuthStore();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!address) return;
    setLoading(true);

    shipmentsApi
      .list({
        buyerAddress: address,
        status: statusFilter || undefined,
        page,
        limit: PAGE_LIMIT,
      })
      .then((res) => {
        setShipments(res.data);
        setTotalPages(res.meta.totalPages);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [address, statusFilter, page]);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

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
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <ShipmentCardSkeleton key={i} />
          ))}
        </div>
      ) : shipments.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No shipments yet"
          description="Create your first shipment to get started."
          action={
            <Link href="/dashboard/shipments/create" className="btn-primary inline-flex">
              <Plus className="w-4 h-4" />
              New shipment
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No results found"
          description="No shipments match your current search or filter."
          action={
            <Link href="/dashboard/shipments/create" className="btn-primary inline-flex">
              <Plus className="w-4 h-4" />
              New shipment
            </Link>
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {filtered.map((shipment) => (
              <ShipmentCard key={shipment.id} shipment={shipment} />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
          />
        </>
      )}
    </div>
  );
}
