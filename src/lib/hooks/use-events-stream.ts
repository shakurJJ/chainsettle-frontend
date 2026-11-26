'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { ChainEvent } from '@/types';
import { eventsApi } from '@/lib/api/services';

interface UseEventsStreamOptions {
  shipmentId?: string;
  eventNames?: string[];
  fromLedger?: number;
  toLedger?: number;
  initialEvents: ChainEvent[];
  page: number;
  onNewEvent?: (event: ChainEvent) => void;
}

export function useEventsStream({
  shipmentId,
  eventNames,
  fromLedger,
  toLedger,
  initialEvents,
  page,
  onNewEvent,
}: UseEventsStreamOptions) {
  const [events, setEvents] = useState<ChainEvent[]>(initialEvents);
  const [newEventsCount, setNewEventsCount] = useState<number>(0);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [isScrolledDown, setIsScrolledDown] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTabHiddenRef = useRef<boolean>(false);
  const isScrolledDownRef = useRef<boolean>(false);
  const eventsRef = useRef<ChainEvent[]>(initialEvents);

  useEffect(() => {
    setEvents(initialEvents);
    eventsRef.current = initialEvents;
  }, [initialEvents]);

  // Keep isScrolledDownRef synced
  useEffect(() => {
    isScrolledDownRef.current = isScrolledDown;
  }, [isScrolledDown]);

  // Track window scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 80;
      setIsScrolledDown(scrolled);
      if (!scrolled) {
        setNewEventsCount(0);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const highlightEvent = useCallback((id: string) => {
    setHighlightedIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setHighlightedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 4000);
  }, []);

  const handleIncomingEvent = useCallback(
    (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      const incoming = raw as Partial<ChainEvent>;
      if (!incoming.id) return;

      // Filter by active filters
      if (shipmentId && incoming.shipmentId && incoming.shipmentId !== shipmentId) {
        return;
      }
      if (eventNames && eventNames.length > 0 && incoming.eventName && !eventNames.includes(incoming.eventName)) {
        return;
      }
      if (fromLedger !== undefined && typeof incoming.ledger === 'number' && incoming.ledger < fromLedger) {
        return;
      }
      if (toLedger !== undefined && typeof incoming.ledger === 'number' && incoming.ledger > toLedger) {
        return;
      }

      const event: ChainEvent = {
        id: incoming.id,
        eventName: incoming.eventName || 'ContractEvent',
        shipmentId: incoming.shipmentId ?? undefined,
        ledger: incoming.ledger ?? 0,
        txHash: incoming.txHash || '',
        createdAt: incoming.createdAt || incoming.timestamp || new Date().toISOString(),
        timestamp: incoming.timestamp || incoming.createdAt || new Date().toISOString(),
        contractId: incoming.contractId,
        data: incoming.data || incoming.payload,
      };

      // Only prepend if on page 1
      if (page === 1) {
        setEvents((prev) => {
          // De-duplicate by ID
          if (prev.some((e) => e.id === event.id)) {
            return prev;
          }
          eventsRef.current = [event, ...prev];
          return [event, ...prev];
        });

        highlightEvent(event.id);

        if (isScrolledDownRef.current) {
          setNewEventsCount((c) => c + 1);
        }

        onNewEvent?.(event);
      }
    },
    [shipmentId, eventNames, fromLedger, toLedger, page, highlightEvent, onNewEvent],
  );

  // Poll fallback
  const pollLatest = useCallback(async () => {
    if (isTabHiddenRef.current || page !== 1) return;
    try {
      const res = await eventsApi.list({
        page: 1,
        limit: 10,
        shipmentId: shipmentId || undefined,
        eventName: eventNames && eventNames.length > 0 ? eventNames : undefined,
        fromLedger,
        toLedger,
      });
      const incomingList = res.data ?? [];
      const currentIds = new Set(eventsRef.current.map((e) => e.id));

      const trulyNew: ChainEvent[] = [];
      for (const item of incomingList) {
        if (!currentIds.has(item.id)) {
          trulyNew.push(item);
        }
      }

      if (trulyNew.length > 0) {
        trulyNew.forEach((ev) => handleIncomingEvent(ev));
      }
    } catch {
      // Ignore polling errors
    }
  }, [page, shipmentId, eventNames, fromLedger, toLedger, handleIncomingEvent]);

  // Connect to SSE stream
  const connectSSE = useCallback(() => {
    if (isTabHiddenRef.current || typeof window === 'undefined') return;

    // Close any previous stream or poll timer
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
    const streamUrl = `${baseUrl}/events/stream${shipmentId ? `?shipmentId=${shipmentId}` : ''}`;

    try {
      const es = new EventSource(streamUrl);
      eventSourceRef.current = es;

      es.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          handleIncomingEvent(parsed);
        } catch {
          // Ignore parse errors
        }
      };

      es.addEventListener('chain_event', (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data);
          handleIncomingEvent(parsed);
        } catch {
          // Ignore
        }
      });

      es.addEventListener('event', (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data);
          handleIncomingEvent(parsed);
        } catch {
          // Ignore
        }
      });

      es.onerror = () => {
        // SSE is unavailable or failed -> fallback to polling
        es.close();
        eventSourceRef.current = null;
        setIsPolling(true);
        if (!pollTimerRef.current && !isTabHiddenRef.current) {
          pollTimerRef.current = setInterval(pollLatest, 10_000);
        }
      };
    } catch {
      // If EventSource instantiation fails, fallback to polling
      setIsPolling(true);
      if (!pollTimerRef.current && !isTabHiddenRef.current) {
        pollTimerRef.current = setInterval(pollLatest, 10_000);
      }
    }
  }, [shipmentId, handleIncomingEvent, pollLatest]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // Handle Visibility Change (pause stream when tab is hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isTabHiddenRef.current = true;
        disconnect();
      } else {
        isTabHiddenRef.current = false;
        connectSSE();
        // Fetch any events that occurred while away
        pollLatest();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [connectSSE, disconnect, pollLatest]);

  // Lifecycle start / cleanup
  useEffect(() => {
    connectSSE();
    return () => disconnect();
  }, [connectSSE, disconnect]);

  const scrollToTop = () => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    setNewEventsCount(0);
  };

  return {
    events,
    newEventsCount,
    highlightedIds,
    isScrolledDown,
    isPolling,
    scrollToTop,
  };
}
