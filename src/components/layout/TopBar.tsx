"use client";

import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Wifi,
  Copy,
  ExternalLink,
  LogOut,
  Check,
  Menu,
  Wallet,
  AlertCircle,
  Sun,
  Moon,
  Contrast,
  HelpCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/hooks/use-auth-store';
import { useWalletBalance } from '@/lib/hooks/use-wallet-balance';
import { useThemeStore, type ThemeMode } from '@/lib/hooks/use-theme-store';
import { useHelpStore } from '@/lib/hooks/use-help-store';
import { shortAddress } from '@/lib/utils';
import { env } from '@/lib/env';
import { useTranslations } from 'next-intl';

interface TopBarProps {
  onMenuClick: () => void;
}

const THEME_OPTIONS: Array<{ value: ThemeMode; labelKey: 'light' | 'dark' | 'highContrast'; Icon: typeof Sun }> = [
  { value: 'light', labelKey: 'light', Icon: Sun },
  { value: 'dark', labelKey: 'dark', Icon: Moon },
  { value: 'high-contrast', labelKey: 'highContrast', Icon: Contrast },
];

export function TopBar({ onMenuClick }: TopBarProps) {
  const network = env.stellarNetwork;
  const { address, logout, displayName } = useAuthStore();
  const { balances, loading: balancesLoading, error: balancesError } = useWalletBalance(address);
  const { theme, setTheme } = useThemeStore();
  const { open: helpOpen, toggleHelp } = useHelpStore();
  const t = useTranslations('navigation');
  const tTheme = useTranslations('theme');
  const tHelp = useTranslations('help');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
      if (
        themeMenuRef.current &&
        !themeMenuRef.current.contains(e.target as Node)
      ) {
        setThemeMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        setThemeMenuOpen(false);
      }
    }
    if (open || themeMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, themeMenuOpen]);

  const handleCopy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDisconnect = () => {
    logout();
    router.push("/auth/login");
  };

  const explorerUrl =
    network === "mainnet"
      ? `https://stellar.expert/explorer/public/account/${address}`
      : `https://stellar.expert/explorer/testnet/account/${address}`;

  const activeThemeOption = THEME_OPTIONS.find((opt) => opt.value === theme) ?? THEME_OPTIONS[0];
  const ActiveThemeIcon = activeThemeOption.Icon;

  return (
    <header className="no-print h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0">
      {/* Hamburger — only visible on mobile */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        aria-label={t('toggleSidebar')}
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="hidden md:block" />
      <div className="flex items-center gap-2 sm:gap-3">
        {address && (
          <div
            className="hidden items-center gap-2 rounded-xl bg-gray-50 px-3 py-1.5 text-xs sm:flex"
            title={balancesError ?? 'Live wallet balance'}
          >
            <Wallet className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
            {balancesLoading ? (
              <span className="text-gray-500">Loading balance...</span>
            ) : balancesError ? (
              <span className="inline-flex items-center gap-1 text-red-700">
                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" /> Balance unavailable
              </span>
            ) : (
              <span className="font-medium text-gray-700">
                {Number(balances?.usdc ?? 0).toFixed(2)} USDC
                <span className="mx-1 text-gray-400">|</span>
                {Number(balances?.xlm ?? 0).toFixed(2)} XLM
              </span>
            )}
          </div>
        )}
        {/* Network badge (WCAG AA contrast) */}
        <span
          role="status"
          aria-label={`Connected to Stellar ${network === "mainnet" ? "Mainnet" : "Testnet"}`}
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${
            network === "mainnet"
              ? "bg-green-50 text-green-800 border-green-200"
              : "bg-amber-50 text-amber-900 border-amber-200"
          }`}
        >
          <Wifi className="w-3 h-3" aria-hidden="true" />
          {network === 'mainnet' ? t('mainnet') : t('testnet')}
        </span>

        {/* Theme toggle (Light / Dark / High contrast) */}
        <div className="relative" ref={themeMenuRef}>
          <button
            type="button"
            onClick={() => setThemeMenuOpen((v) => !v)}
            aria-expanded={themeMenuOpen}
            aria-haspopup="menu"
            aria-label={tTheme('toggleLabel', { mode: tTheme(activeThemeOption.labelKey) })}
            title={tTheme('toggleLabel', { mode: tTheme(activeThemeOption.labelKey) })}
            className="inline-flex items-center gap-1.5 p-2 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <ActiveThemeIcon className="w-4 h-4" aria-hidden="true" />
            <span className="hidden lg:inline text-xs font-medium">
              {tTheme(activeThemeOption.labelKey)}
            </span>
          </button>
          {themeMenuOpen && (
            <div
              role="menu"
              aria-label={tTheme('menuLabel')}
              className="absolute end-0 mt-1.5 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50"
            >
              {THEME_OPTIONS.map(({ value, labelKey, Icon }) => {
                const selected = theme === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    onClick={() => {
                      setTheme(value);
                      setThemeMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset"
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{tTheme(labelKey)}</span>
                    </span>
                    {selected && <Check className="w-3.5 h-3.5 text-brand-600" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Context-aware Help Drawer button */}
        <button
          type="button"
          onClick={toggleHelp}
          aria-expanded={helpOpen}
          aria-controls="help-drawer"
          aria-label={tHelp('openButton')}
          title={`${tHelp('openButton')} (?)`}
          className="p-2 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          <HelpCircle className="w-4 h-4" aria-hidden="true" />
        </button>

        {/* Notifications */}
        <Link
          href="/notifications"
          className="relative p-2 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          aria-label={t('notificationsLabel')}
        >
          <Bell className="w-4.5 h-4.5" aria-hidden="true" />
          <span className="absolute top-1.5 end-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
        </Link>

        {/* Wallet address dropdown */}
        {address && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-haspopup="true"
              aria-controls="wallet-dropdown"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-medium px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              {displayName || shortAddress(address)}
            </button>

            {open && (
              <div id="wallet-dropdown" className="absolute end-0 mt-1.5 w-52 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
                <button
                  onClick={handleCopy}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-gray-500" />
                  )}
                  {copied ? t('copied') : t('copyAddress')}
                </button>

                <a
                  href="/dashboard/settings"
                  onClick={() => setOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Wallet className="w-3.5 h-3.5 text-gray-500" />
                  Profile & settings
                </a>

                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset"
                  aria-label="View on Stellar Expert (opens in new tab)"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                  {t('viewOnStellarExpert')}
                </a>

                <div className="border-t border-gray-50 my-1" />

                <button
                  onClick={handleDisconnect}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-red-700 hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {t('disconnectWallet')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
