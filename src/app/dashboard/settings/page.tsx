'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, Clock, Contrast, Copy, LogOut, Moon, Sun, UserRound, Globe, PlayCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  useAuthStore,
  type DateDisplayMode,
  type NotificationPreferences,
} from '@/lib/hooks/use-auth-store';
import { useThemeStore, type ThemeMode } from '@/lib/hooks/use-theme-store';
import { useWalletBalance } from '@/lib/hooks/use-wallet-balance';
import { useCurrency } from '@/lib/hooks/use-currency';
import { ApproximateFiat } from '@/components/ui/ApproximateFiat';
import { FormattedDate } from '@/components/FormattedDate';
import { resetTour } from '@/components/tour/TourGuide';
import { locales, localeLabels, LOCALE_COOKIE, type Locale } from '@/i18n/config';
import { getBrowserTimeZone, getSupportedTimeZones } from '@/lib/utils/date-preferences';
import type { SupportedCurrency } from '@/types';
import { TemplateManager } from '@/components/templates/TemplateManager';
import { AddressBookManager } from '@/components/AddressBookManager';

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tTheme = useTranslations('theme');
  const locale = useLocale();
  const router = useRouter();
  const { theme, setTheme } = useThemeStore();
  const {
    address,
    user,
    displayName,
    displayCurrency,
    notificationPreferences,
    datePreferences,
    logout,
    setDisplayName,
    setDisplayCurrency,
    setNotificationPreferences,
    setDatePreferences,
  } = useAuthStore();
  const [name, setName] = useState(displayName ?? '');
  const [tourResetSuccess, setTourResetSuccess] = useState(false);
  const [permission, setPermission] = useState<PermissionState>('default');
  const { balances, loading, error } = useWalletBalance(address);
  const { currencies } = useCurrency();
  const timezones = useMemo(() => getSupportedTimeZones(), []);
  const browserTimeZone = useMemo(() => getBrowserTimeZone(), []);
  const previewIso = useMemo(() => new Date().toISOString(), []);

  const handleLocaleChange = (nextLocale: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  };

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

  const handleReplayTour = () => {
    if (address) {
      resetTour(address, user?.role);
      setTourResetSuccess(true);
      setTimeout(() => setTourResetSuccess(false), 3000);
      // Trigger tour start event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('chainsettle:replay-tour'));
      }
    }
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

    let nextPermission: PermissionState = permission;
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

        <div className="space-y-5 pt-5">
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

          {/* Display Currency Preference */}
          <div>
            <label htmlFor="display-currency" className="label flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-gray-500" />
              <span>Display currency preference</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Select your local currency to display approximate fiat equivalents next to on-chain amounts. Rates are cached for 5 minutes.
            </p>
            <select
              id="display-currency"
              value={displayCurrency}
              onChange={(e) => setDisplayCurrency(e.target.value as SupportedCurrency)}
              className="input max-w-xs bg-white cursor-pointer"
            >
              {currencies.map((curr) => (
                <option key={curr.code} value={curr.code}>
                  {curr.label}
                </option>
              ))}
            </select>
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
            <p className="label flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
              {t('dateTimePreferences')}
            </p>
            <div className="space-y-3 rounded-xl border border-gray-100 p-4">
              <div>
                <label htmlFor="timezone-select" className="block text-xs font-medium text-gray-700 mb-1">
                  {t('timezoneLabel')}
                </label>
                <select
                  id="timezone-select"
                  value={datePreferences.timezone}
                  onChange={(event) =>
                    setDatePreferences({
                      ...datePreferences,
                      timezone: event.target.value,
                    })
                  }
                  className="input text-sm"
                >
                  <option value="auto">
                    {t('timezoneAuto', { timezone: browserTimeZone })}
                  </option>
                  {timezones.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="block text-xs font-medium text-gray-700 mb-1.5">
                  {t('dateFormatLabel')}
                </span>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('dateFormatLabel')}>
                  {([
                    ['relative', t('dateFormatRelative')],
                    ['absolute', t('dateFormatAbsolute')],
                  ] as [DateDisplayMode, string][]).map(([mode, label]) => {
                    const selected = datePreferences.displayMode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() =>
                          setDatePreferences({
                            ...datePreferences,
                            displayMode: mode,
                          })
                        }
                        className={`rounded-xl border px-3 py-2 text-start text-xs font-medium transition-colors ${
                          selected
                            ? 'border-brand-600 bg-brand-50 text-brand-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
                <span className="text-gray-500">{t('datePreviewLabel')}</span>
                <FormattedDate date={previewIso} className="font-medium text-gray-800 underline decoration-dotted" />
              </div>
            </div>
          </div>

          <div>
            <p className="label">{tTheme('title')}</p>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={tTheme('title')}>
              {([
                { value: 'light', label: tTheme('light'), Icon: Sun },
                { value: 'dark', label: tTheme('dark'), Icon: Moon },
                { value: 'high-contrast', label: tTheme('highContrast'), Icon: Contrast },
              ] as Array<{ value: ThemeMode; label: string; Icon: typeof Sun }>).map(({ value, label, Icon }) => {
                const selected = theme === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setTheme(value)}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                      selected
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="locale-select" className="label flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
              {t('languageLabel')}
            </label>
            <select
              id="locale-select"
              value={locale}
              onChange={(event) => handleLocaleChange(event.target.value as Locale)}
              className="input text-sm"
            >
              {locales.map((loc) => (
                <option key={loc} value={loc}>
                  {localeLabels[loc]}
                </option>
              ))}
            </select>
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
                  {asset === 'USDC' && !loading && !error && balances?.usdc && (
                    <div className="mt-0.5">
                      <ApproximateFiat amount={balances.usdc} className="text-xs text-brand-600 font-medium" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {error && <p className="mt-2 text-xs text-red-600">{t('balanceUnavailable')}</p>}
          </div>

          {/* Role Tour Replay */}
          <div className="border-t border-gray-100 pt-4">
            <p className="label">Product walkthrough</p>
            <p className="text-xs text-gray-500 mb-3">
              Replay the step-by-step introduction tour customized for your current role.
            </p>
            <button
              type="button"
              onClick={handleReplayTour}
              className="btn-secondary text-xs flex items-center gap-2"
            >
              <PlayCircle className="w-4 h-4 text-brand-600" />
              <span>Replay tour</span>
            </button>
            {tourResetSuccess && (
              <p className="mt-1.5 text-xs text-green-600 font-medium">Tour reset! You can now view the tour.</p>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <button type="button" onClick={handleDisconnect} className="btn-secondary text-red-600 hover:bg-red-50">
              <LogOut className="h-4 w-4" />
              {t('disconnectWallet')}
            </button>
          </div>
        </div>
      </section>

      <TemplateManager owner={address} />
      <AddressBookManager owner={address} />
    </div>
  );
}
