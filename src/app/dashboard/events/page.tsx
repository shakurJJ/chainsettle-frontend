'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { eventsApi } from '@/lib/api/services';
import type { ChainEvent, PaginatedResponse } from '@/lib/api/types';
import { StellarLink } from '@/components/ui/StellarLink';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { timeAgo } from '@/lib/utils/time';

const PAGE_SIZE = 20;

export default function EventsPage() {
  const t = useTranslations('events');
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get('page') ?? '1') || 1;
  const shipmentId = searchParams.get('shipmentId') ?? '';

  const [data, setData] = useState<PaginatedResponse<ChainEvent> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    eventsApi
      .list({ page, limit: PAGE_SIZE, shipmentId: shipmentId || undefined })
      .then((res) => {
        if (active) setData(res);
      })
      .catch(() => {
        if (active) setError(t('loadError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, shipmentId, t]);

  const updateParams = useCallback(
    (next: { page?: number; shipmentId?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.shipmentId !== undefined) {
        if (next.shipmentId) params.set('shipmentId', next.shipmentId);
        else params.delete('shipmentId');
        params.delete('page');
      }
      if (next.page !== undefined) {
        if (next.page > 1) params.set('page', String(next.page));
        else params.delete('page');
      }
      const query = params.toString();
      router.push(query ? `/dashboard/events?${query}` : '/dashboard/events');
    },
    [router, searchParams],
  );

  const events = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <div className="flex items-center gap-2">
          <label htmlFor="shipmentId" className="text-sm text-gray-600">
            {t('filterShipment')}
          </label>
          <input
            id="shipmentId"
            type="text"
            defaultValue={shipmentId}
            placeholder={t('filterShipmentPlaceholder')}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateParams({ shipmentId: (e.target as HTMLInputElement).value.trim() });
              }
            }}
          />
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : loading ? (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <tbody className="divide-y divide-gray-200">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : events.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    {t('columns.event')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    {t('columns.shipment')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    {t('columns.ledger')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    {t('columns.txHash')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    {t('columns.time')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {event.eventName}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <a
                        href={`/dashboard/shipments/${event.shipmentId}`}
                        className="text-blue-600 hover:underline"
                      >
                        {event.shipmentId}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{event.ledger}</td>
                    <td className="px-4 py-3 text-sm">
                      <StellarLink type="tx" value={event.txHash} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {timeAgo(event.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(next) => updateParams({ page: next })}
          />
        </>
      )}
    </div>
  );
}
