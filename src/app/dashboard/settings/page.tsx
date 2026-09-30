'use client';

import { useEffect, useState } from 'react';
import { Bell, Copy, LogOut, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore, type NotificationPreferences } from '@/lib/hooks/use-auth-store';
import { useWalletBalance } from '@/lib/hooks/use-wallet-balance';
import { TemplateManager } from '@/components/templates/TemplateManager';

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const router = useRouter();
  const {
    address,
    user,
    displayName,
    notificationPreferences,
    logout,
    setDisplayName,
    setNotificationPreferences,
  } = useAuthStore();
  const [name, setName] = useState(displayName ?? '');
  const [permission, setPermission] = useState<PermissionState>('default');
  const { balances, loading, error } = useWalletBalance(address);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission as PermissionState);
  }, []);

  const handleDisconnect = () => {
    logout();
    router.push('/auth/login');
  };

  const updatePreference = (key: keyof NotificationPreferences) => {
    setNotificationPreferences({
      ...notificationPreferences,
      [key]: !notificationPreferences[key],
    });
  };

  const desktopNotificationsEnabled =
    permission === 'granted' && notificationPreferences.desktopNotifications;

  const toggleDesktopNotifications = async () => {
    if (permission === 'unsupported' || permission === 'denied') return;

    if (desktopNotificationsEnabled) {
      setNotificationPreferences({
        ...notificationPreferences,
        desktopNotifications: false,
      });
      return;
    }

    let nextPermission = permission;
    if (permission !== 'granted') {
      nextPermission = (await Notification.requestPermission()) as PermissionState;
      setPermission(nextPermission);
    }

    if (nextPermission === 'granted') {
      setNotificationPreferences({
        ...notificationPreferences,
        desktopNotifications: true,
      });
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
        <p className="mt-0.5 text-sm text-gray-500">{t('subtitle')}</p>
      </div>

      <section className="card p-5">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{t('walletProfile')}</h2>
            <p className="text-xs text-gray-500">{user?.role ?? t('connectedAccount')}</p>
          </div>
        </div>

        <div className="space-y-4 pt-5">
          <div>
            <label htmlFor="display-name" className="label">{t('displayName')}</label>
            <div className="flex items-center gap-2">
              <input
                id="display-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('displayNamePlaceholder')}
                className="input"
              />
              <button type="button" onClick={() => setDisplayName(name)} className="btn-primary whitespace-nowrap">
                {t('saveName')}
              </button>
            </div>
          </div>

          <div>
            <p className="label">{t('notificationPreferences')}</p>
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-100">
              {([
                ['shipmentUpdates', 'shipmentUpdates', 'shipmentUpdatesDescription'],
                ['milestoneUpdates', 'milestoneUpdates', 'milestoneUpdatesDescription'],
                ['systemAlerts', 'systemAlerts', 'systemAlertsDescription'],
              ] as const).map(([key, titleKey, descriptionKey]) => (
                <label key={key} className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
                  <span>
                    <span className="block text-sm font-medium text-gray-800">{t(titleKey)}</span>
                    <span className="block text-xs text-gray-500">{t(descriptionKey)}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={notificationPreferences[key]}
                    onChange={() => updatePreference(key)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                </label>
              ))}

              <label
                className={`flex items-center justify-between gap-4 px-4 py-3 ${
                  permission === 'denied' || permission === 'unsupported'
                    ? 'cursor-not-allowed opacity-60'
                    : 'cursor-pointer'
                }`}
              >
                <span className="flex items-start gap-3">
                  <Bell className="mt-0.5 h-4 w-4 text-gray-400" />
                  <span>
                    <span className="block text-sm font-medium text-gray-800">
                      {t('desktopNotifications')}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {permission === 'denied'
                        ? t('desktopNotificationsDenied')
                        : permission === 'unsupported'
                          ? t('desktopNotificationsUnsupported')
                          : t('desktopNotificationsDescription')}
                    </span>
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={desktopNotificationsEnabled}
                  disabled={permission === 'denied' || permission === 'unsupported'}
                  onChange={toggleDesktopNotifications}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 disabled:cursor-not-allowed"
                />
              </label>
            </div>
          </div>

          <div>
            <p className="label">{t('stellarAddress')}</p>
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate rounded-xl bg-gray-50 px-3.5 py-2.5 font-mono text-xs text-gray-600">
                {address ?? t('notConnected')}
              </p>
              {address && (
                <button
                  type="button"
                  title={t('copyAddress')}
                  aria-label={t('copyAddress')}
                  onClick={() => navigator.clipboard.writeText(address)}
                  className="btn-secondary px-3"
                >
                  <Copy className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div>
            <p className="label">{t('walletBalance')}</p>
            <div className="grid grid-cols-2 gap-3">
              {['USDC', 'XLM'].map((asset) => (
                <div key={asset} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-xs text-gray-500">{asset}</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {loading ? '...' : error ? '--' : Number(asset === 'USDC' ? balances?.usdc : balances?.xlm ?? 0).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
            {error && <p className="mt-2 text-xs text-red-600">{t('balanceUnavailable')}</p>}
          </div>

          <button type="button" onClick={handleDisconnect} className="btn-secondary text-red-600 hover:bg-red-50">
            <LogOut className="h-4 w-4" />
            {t('disconnectWallet')}
          </button>
        </div>
      </section>

      <TemplateManager owner={address} />
    </div>
  );
}