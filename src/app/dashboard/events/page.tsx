'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowUp, Activity, ChevronDown, Filter, X } from 'lucide-react';
import { eventsApi } from '@/lib/api/services';
import type { ChainEvent, PaginatedResponse } from '@/types';
import { StellarLink } from '@/components/StellarLink';
import { FormattedDate } from '@/components/FormattedDate';
import { Pagination } from '@/components/Pagination';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/utils';
import { useEventsStream } from '@/lib/hooks/use-events-stream';

const PAGE_SIZE = 20;

const KNOWN_EVENT_NAMES = [
  'ShipmentCreated',
  'MilestoneProofSubmitted',
  'ProofSubmitted',
  'MilestoneConfirmed',
  'DisputeRaised',
  'DisputeResolved',
  'ShipmentCancelled',
];

function parseLedgerValue(raw: string): { valid: boolean; value?: number } {
  const trimmed = raw.trim();
  if (!trimmed) return { valid: true };
  if (!/^\d+$/.test(trimmed)) return { valid: false };
  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed < 0) return { valid: false };
  return { valid: true, value: parsed };
}

function EventsPageContent() {
  const t = useTranslations('events');
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get('page') ?? '1') || 1;
  const shipmentId = searchParams.get('shipmentId') ?? '';
  const eventNamesParam = searchParams.get('eventName') ?? '';
  const fromLedgerParam = searchParams.get('fromLedger') ?? '';
  const toLedgerParam = searchParams.get('toLedger') ?? '';

  const selectedEventNames = useMemo(
    () =>
      eventNamesParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    [eventNamesParam],
  );

  const [shipmentInput, setShipmentInput] = useState(shipmentId);
  const [fromLedgerInput, setFromLedgerInput] = useState(fromLedgerParam);
  const [toLedgerInput, setToLedgerInput] = useState(toLedgerParam);
  const [eventMenuOpen, setEventMenuOpen] = useState(false);
  const eventMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShipmentInput(shipmentId);
  }, [shipmentId]);

  useEffect(() => {
    setFromLedgerInput(fromLedgerParam);
  }, [fromLedgerParam]);

  useEffect(() => {
    setToLedgerInput(toLedgerParam);
  }, [toLedgerParam]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (eventMenuRef.current && !eventMenuRef.current.contains(e.target as Node)) {
        setEventMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const ledgerValidation = useMemo(() => {
    const fromCheck = parseLedgerValue(fromLedgerInput);
    const toCheck = parseLedgerValue(toLedgerInput);
    if (!fromCheck.valid || !toCheck.valid) {
      return { valid: false, error: t('invalidLedgerFormat') };
    }
    if (
      fromCheck.value !== undefined &&
      toCheck.value !== undefined &&
      fromCheck.value > toCheck.value
    ) {
      return { valid: false, error: t('invalidLedgerRange') };
    }
    return { valid: true, fromLedger: fromCheck.value, toLedger: toCheck.value, error: null };
  }, [fromLedgerInput, toLedgerInput, t]);

  const urlLedgerValidation = useMemo(() => {
    const fromCheck = parseLedgerValue(fromLedgerParam);
    const toCheck = parseLedgerValue(toLedgerParam);
    if (!fromCheck.valid || !toCheck.valid) {
      return { valid: false, error: t('invalidLedgerFormat') };
    }
    if (
      fromCheck.value !== undefined &&
      toCheck.value !== undefined &&
      fromCheck.value > toCheck.value
    ) {
      return { valid: false, error: t('invalidLedgerRange') };
    }
    return { valid: true, fromLedger: fromCheck.value, toLedger: toCheck.value, error: null };
  }, [fromLedgerParam, toLedgerParam, t]);

  const [data, setData] = useState<PaginatedResponse<ChainEvent> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!urlLedgerValidation.valid) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    eventsApi
      .list({
        page,
        limit: PAGE_SIZE,
        shipmentId: shipmentId || undefined,
        eventName: selectedEventNames.length > 0 ? selectedEventNames : undefined,
        fromLedger: urlLedgerValidation.fromLedger,
        toLedger: urlLedgerValidation.toLedger,
      })
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
  }, [page, shipmentId, selectedEventNames, urlLedgerValidation, t]);

  const {
    events,
    newEventsCount,
    highlightedIds,
    isPolling,
    scrollToTop,
  } = useEventsStream({
    shipmentId: shipmentId || undefined,
    eventNames: selectedEventNames.length > 0 ? selectedEventNames : undefined,
    fromLedger: urlLedgerValidation.fromLedger,
    toLedger: urlLedgerValidation.toLedger,
    initialEvents: data?.data ?? [],
    page,
  });

  const availableEventNames = useMemo(() => {
    const set = new Set<string>(KNOWN_EVENT_NAMES);
    for (const ev of events) {
      if (ev.eventName) set.add(ev.eventName);
    }
    for (const name of selectedEventNames) {
      set.add(name);
    }
    return Array.from(set);
  }, [events, selectedEventNames]);

  const updateParams = useCallback(
    (next: {
      page?: number;
      shipmentId?: string;
      eventNames?: string[];
      fromLedger?: string;
      toLedger?: string;
    }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.shipmentId !== undefined) {
        if (next.shipmentId) params.set('shipmentId', next.shipmentId);
        else params.delete('shipmentId');
        params.delete('page');
      }
      if (next.eventNames !== undefined) {
        if (next.eventNames.length > 0) params.set('eventName', next.eventNames.join(','));
        else params.delete('eventName');
        params.delete('page');
      }
      if (next.fromLedger !== undefined) {
        if (next.fromLedger) params.set('fromLedger', next.fromLedger);
        else params.delete('fromLedger');
        params.delete('page');
      }
      if (next.toLedger !== undefined) {
        if (next.toLedger) params.set('toLedger', next.toLedger);
        else params.delete('toLedger');
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

  const toggleEventName = (name: string) => {
    const exists = selectedEventNames.includes(name);
    const next = exists
      ? selectedEventNames.filter((item) => item !== name)
      : [...selectedEventNames, name];
    updateParams({ eventNames: next });
  };

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledgerValidation.valid) return;
    updateParams({
      shipmentId: shipmentInput.trim(),
      fromLedger: fromLedgerInput.trim(),
      toLedger: toLedgerInput.trim(),
    });
  };

  const clearAllFilters = () => {
    setShipmentInput('');
    setFromLedgerInput('');
    setToLedgerInput('');
    setEventMenuOpen(false);
    router.push('/dashboard/events');
  };

  const hasActiveFilters =
    Boolean(shipmentId) ||
    selectedEventNames.length > 0 ||
    Boolean(fromLedgerParam) ||
    Boolean(toLedgerParam) ||
    Boolean(shipmentInput.trim()) ||
    Boolean(fromLedgerInput.trim()) ||
    Boolean(toLedgerInput.trim());

  const totalPages = data?.totalPages ?? data?.meta?.totalPages ?? 1;

  return (
    <div className="space-y-6 relative">
      {/* Floating 'N new events' pill */}
      {newEventsCount > 0 && (
        <div className="sticky top-4 z-30 flex justify-center pointer-events-none animate-bounce motion-reduce:animate-none">
          <button
            type="button"
            onClick={scrollToTop}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-lg transition-transform hover:scale-105 hover:bg-brand-700 active:scale-95 motion-reduce:transition-none"
            aria-label={`${newEventsCount} new events available, click to scroll to top`}
          >
            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {newEventsCount} new {newEventsCount === 1 ? 'event' : 'events'}
            </span>
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <div
            className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 border border-emerald-200"
            title={isPolling ? 'Real-time via interval polling' : 'Real-time via SSE stream'}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span>{isPolling ? 'Polling' : 'Live'}</span>
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <form
        onSubmit={applyFilters}
        className="card p-4 space-y-3"
        aria-label={t('filtersLabel')}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Event name multi-select */}
          <div className="relative" ref={eventMenuRef}>
            <label htmlFor="event-name-trigger" className="block text-xs font-medium text-gray-700 mb-1">
              {t('filterEventName')}
            </label>
            <button
              id="event-name-trigger"
              type="button"
              onClick={() => setEventMenuOpen((v) => !v)}
              aria-expanded={eventMenuOpen}
              aria-haspopup="listbox"
              className="input flex items-center justify-between gap-2 text-start text-sm py-2"
            >
              <span className="truncate">
                {selectedEventNames.length > 0
                  ? t('selectedEventsCount', { count: selectedEventNames.length })
                  : t('allEvents')}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" aria-hidden="true" />
            </button>
            {eventMenuOpen && (
              <div
                role="listbox"
                aria-multiselectable="true"
                aria-label={t('filterEventName')}
                className="absolute start-0 z-30 mt-1 w-full min-w-[220px] rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg max-h-60 overflow-y-auto"
              >
                {availableEventNames.map((name) => {
                  const checked = selectedEventNames.includes(name);
                  return (
                    <label
                      key={name}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEventName(name)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="font-mono">{name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Shipment ID filter */}
          <div>
            <label htmlFor="shipmentId" className="block text-xs font-medium text-gray-700 mb-1">
              {t('filterShipment')}
            </label>
            <input
              id="shipmentId"
              type="text"
              value={shipmentInput}
              onChange={(e) => setShipmentInput(e.target.value)}
              placeholder={t('filterPlaceholder')}
              className="input py-2 text-sm"
            />
          </div>

          {/* Ledger range */}
          <div>
            <label htmlFor="fromLedger" className="block text-xs font-medium text-gray-700 mb-1">
              {t('fromLedger')}
            </label>
            <input
              id="fromLedger"
              type="text"
              inputMode="numeric"
              value={fromLedgerInput}
              onChange={(e) => setFromLedgerInput(e.target.value)}
              placeholder={t('ledgerPlaceholder')}
              aria-invalid={!ledgerValidation.valid}
              aria-describedby={!ledgerValidation.valid ? 'ledger-range-error' : undefined}
              className={cn(
                'input py-2 text-sm font-mono',
                !ledgerValidation.valid && 'border-red-500 focus-visible:border-red-500',
              )}
            />
          </div>

          <div>
            <label htmlFor="toLedger" className="block text-xs font-medium text-gray-700 mb-1">
              {t('toLedger')}
            </label>
            <input
              id="toLedger"
              type="text"
              inputMode="numeric"
              value={toLedgerInput}
              onChange={(e) => setToLedgerInput(e.target.value)}
              placeholder={t('ledgerPlaceholder')}
              aria-invalid={!ledgerValidation.valid}
              aria-describedby={!ledgerValidation.valid ? 'ledger-range-error' : undefined}
              className={cn(
                'input py-2 text-sm font-mono',
                !ledgerValidation.valid && 'border-red-500 focus-visible:border-red-500',
              )}
            />
          </div>
        </div>

        {!ledgerValidation.valid && ledgerValidation.error && (
          <p id="ledger-range-error" className="text-xs text-red-700 font-medium" role="alert">
            {ledgerValidation.error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {selectedEventNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => toggleEventName(name)}
                className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2 py-1 text-xs font-mono font-medium text-brand-700 border border-brand-200 hover:bg-brand-100"
              >
                <span>{name}</span>
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ms-auto">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                {t('clearFilter')}
              </button>
            )}
            <button
              type="submit"
              disabled={!ledgerValidation.valid}
              className="btn-primary py-1.5 px-3 text-xs"
            >
              <Filter className="h-3.5 w-3.5" aria-hidden="true" />
              {t('applyFilters')}
            </button>
          </div>
        </div>
      </form>

      {error ? (
        <p className="text-sm text-red-700" role="alert">{error}</p>
      ) : loading ? (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <tbody className="divide-y divide-gray-200">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-full animate-pulse motion-reduce:animate-none rounded bg-gray-200" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={Activity}
          title={hasActiveFilters ? t('empty.noResultsTitle') : t('empty.title')}
          description={hasActiveFilters ? t('empty.noResultsDescription') : t('empty.description')}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-start text-xs font-medium uppercase text-gray-600">
                    {t('columns.event')}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium uppercase text-gray-600">
                    {t('columns.shipment')}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium uppercase text-gray-600">
                    {t('columns.ledger')}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium uppercase text-gray-600">
                    {t('columns.txHash')}
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium uppercase text-gray-600">
                    {t('columns.time')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {events.map((event) => {
                  const isHighlighted = highlightedIds.has(event.id);
                  return (
                    <tr
                      key={event.id}
                      className={cn(
                        'transition-colors duration-1000 motion-reduce:transition-none',
                        isHighlighted ? 'bg-brand-50/80 ring-1 ring-inset ring-brand-200' : 'hover:bg-gray-50/60'
                      )}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-1.5">
                          {isHighlighted && (
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-600 animate-pulse motion-reduce:animate-none" />
                          )}
                          <span>{event.eventName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {event.shipmentId ? (
                          <a
                            href={`/dashboard/shipments/${event.shipmentId}`}
                            className="text-blue-700 hover:underline font-mono text-xs"
                          >
                            {event.shipmentId}
                          </a>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                        {event.ledger}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <StellarLink type="tx" value={event.txHash} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <FormattedDate date={event.createdAt ?? event.timestamp ?? null} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPrev={() => updateParams({ page: page - 1 })}
            onNext={() => updateParams({ page: page + 1 })}
          />
        </>
      )}
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading events...</div>}>
      <EventsPageContent />
    </Suspense>
  );
}
