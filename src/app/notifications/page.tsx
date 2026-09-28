'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bell, CheckCheck, Loader2, X } from 'lucide-react';
import { notificationsApi } from '@/lib/api/services';
import { EmptyState } from '@/components/EmptyState';
import { timeAgo, cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/hooks/use-auth-store';
import type { Notification } from '@/types';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns';

type FilterType = 'all' | 'unread' | 'proofs' | 'payments' | 'disputes';

interface NotificationGroup {
  label: string;
  notifications: Notification[];
}

function getDateGroup(date: string): string {
  const d = new Date(date);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  if (isThisWeek(d)) return 'This week';
  return 'Older';
}

function getNotificationType(notification: Notification): FilterType {
  const type = notification.type.toLowerCase();
  if (type.includes('proof') || type.includes('milestone')) return 'proofs';
  if (type.includes('payment') || type.includes('release')) return 'payments';
  if (type.includes('dispute')) return 'disputes';
  return 'all';
}

export default function NotificationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preferences = useAuthStore((state) => state.notificationPreferences);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>(() => {
    const param = searchParams.get('filter');
    return (param as FilterType) || 'all';
  });

  const load = () => {
    setLoading(true);
    notificationsApi
      .list()
      .then((res) => setNotifications(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead();
    load();
  };

  const handleMarkRead = async (id: string) => {
    await notificationsApi.markRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!n.read) {
      await handleMarkRead(n.id);
    }

    // If notification has shipmentId in data, navigate to that shipment
    if (n.data && typeof n.data === 'object' && 'shipmentId' in n.data) {
      const shipmentId = n.data.shipmentId as string;
      router.push(`/dashboard/shipments/${shipmentId}`);
    }
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    const params = new URLSearchParams(searchParams.toString());
    if (filter === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', filter);
    }
    router.push(`?${params.toString()}`);
  };

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let result = notifications;

    // Apply preference filters
    result = result.filter((notification) => {
      const type = notification.type.toLowerCase();
      if (type.includes('milestone') || type.includes('proof') || type.includes('dispute')) {
        return preferences.milestoneUpdates;
      }
      if (type.includes('system') || type.includes('account')) {
        return preferences.systemAlerts;
      }
      return preferences.shipmentUpdates;
    });

    // Apply active filter
    if (activeFilter === 'unread') {
      result = result.filter((n) => !n.read);
    } else if (activeFilter !== 'all') {
      result = result.filter((n) => getNotificationType(n) === activeFilter);
    }

    return result;
  }, [notifications, activeFilter, preferences]);

  // Group by date
  const groupedNotifications = useMemo(() => {
    const groups = new Map<string, Notification[]>();
    const dateOrder = ['Today', 'Yesterday', 'This week', 'Older'];

    filteredNotifications.forEach((n) => {
      const group = getDateGroup(n.createdAt);
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group)!.push(n);
    });

    return dateOrder
      .filter((label) => groups.has(label))
      .map((label) => ({
        label,
        notifications: groups.get(label)!,
      }));
  }, [filteredNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filterCounts = useMemo(
    () => ({
      unread: notifications.filter((n) => !n.read).length,
      proofs: notifications.filter((n) => getNotificationType(n) === 'proofs').length,
      payments: notifications.filter((n) => getNotificationType(n) === 'payments').length,
      disputes: notifications.filter((n) => getNotificationType(n) === 'disputes').length,
    }),
    [notifications],
  );

  const filters: { label: string; value: FilterType; count: number }[] = [
    { label: 'All', value: 'all', count: notifications.length },
    { label: 'Unread', value: 'unread', count: filterCounts.unread },
    { label: 'Proofs', value: 'proofs', count: filterCounts.proofs },
    { label: 'Payments', value: 'payments', count: filterCounts.payments },
    { label: 'Disputes', value: 'disputes', count: filterCounts.disputes },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} aria-label="Mark all notifications as read" className="btn-secondary text-xs">
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Filter notifications">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => handleFilterChange(f.value)}
            aria-pressed={activeFilter === f.value}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
              activeFilter === f.value
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
            )}
          >
            {f.label}
            <span className="ml-1.5 inline-block">{f.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16" role="status" aria-live="polite" aria-label="Loading notifications">
          <Loader2 className="w-5 h-5 text-gray-300 animate-spin" aria-hidden="true" />
        </div>
      ) : groupedNotifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description={activeFilter === 'all' ? "You're all caught up. We'll notify you when something needs your attention." : `No ${activeFilter} notifications yet.`}
        />
      ) : (
        <div className="space-y-6" role="list" aria-label="Grouped notifications">
          {groupedNotifications.map((group) => (
            <div key={group.label}>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {group.label}
              </h2>
              <div className="card divide-y divide-gray-50">
                {group.notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={cn(
                      'w-full text-left p-4 flex items-start gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset',
                      n.data && typeof n.data === 'object' && 'shipmentId' in n.data ? 'hover:bg-blue-50 cursor-pointer' : '',
                      n.read ? 'opacity-60' : 'hover:bg-gray-50',
                    )}
                    aria-label={`${n.title}: ${n.message}. ${n.read ? 'Read' : 'Unread'}. ${n.data && typeof n.data === 'object' && 'shipmentId' in n.data ? 'Click to view shipment.' : 'Click to mark as read.'}`}
                    role="listitem"
                  >
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full flex-shrink-0 mt-2',
                        n.read ? 'bg-gray-200' : 'bg-brand-600',
                      )}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-0.5">{n.title}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
