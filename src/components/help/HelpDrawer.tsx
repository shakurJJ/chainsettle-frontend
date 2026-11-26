'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { BookOpen, ExternalLink, HelpCircle, Keyboard, X } from 'lucide-react';
import { useHelpStore } from '@/lib/hooks/use-help-store';

type RouteContextKey =
  | 'createShipment'
  | 'shipmentDetail'
  | 'shipments'
  | 'events'
  | 'counterparties'
  | 'settings'
  | 'overview';

const DOCS_URL = 'https://github.com/shakurJJ/chainsettle-frontend#readme';

function resolveRouteContext(pathname: string | null): RouteContextKey {
  if (!pathname) return 'overview';
  if (pathname.startsWith('/dashboard/shipments/create')) return 'createShipment';
  if (/^\/dashboard\/shipments\/[^/]+/.test(pathname)) return 'shipmentDetail';
  if (pathname.startsWith('/dashboard/shipments')) return 'shipments';
  if (pathname.startsWith('/dashboard/events')) return 'events';
  if (pathname.startsWith('/dashboard/counterparties')) return 'counterparties';
  if (pathname.startsWith('/dashboard/settings')) return 'settings';
  return 'overview';
}

export function HelpDrawer() {
  const { open, closeHelp } = useHelpStore();
  const pathname = usePathname();
  const t = useTranslations('help');
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const contextKey = resolveRouteContext(pathname);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      window.requestAnimationFrame(() => {
        closeButtonRef.current?.focus();
      });
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeHelp();
        return;
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !drawerRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !drawerRef.current.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, closeHelp]);

  if (!open) return null;

  const contextFaqs = [0, 1].map((idx) => ({
    q: t(`routes.${contextKey}.items.${idx}.q`),
    a: t(`routes.${contextKey}.items.${idx}.a`),
  }));

  const coreFaqs = (['escrow', 'fees', 'disputes'] as const).map((topic) => ({
    key: topic,
    q: t(`core.${topic}.q`),
    a: t(`core.${topic}.a`),
  }));

  const shortcuts = [
    { key: 'Cmd+K', label: t('shortcuts.palette') },
    { key: '/', label: t('shortcuts.search') },
    { key: 'n', label: t('shortcuts.newShipment') },
    { key: '?', label: t('shortcuts.toggleHelp') },
    { key: 'Esc', label: t('shortcuts.close') },
  ];

  return (
    <div className="no-print fixed inset-0 z-50 flex justify-end" role="presentation">
      <div
        className="fixed inset-0 bg-black/40"
        onClick={closeHelp}
        aria-hidden="true"
      />
      <aside
        id="help-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-drawer-title"
        className="relative z-10 flex h-full w-full max-w-md flex-col bg-white border-s border-gray-200 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-brand-600" aria-hidden="true" />
            <h2 id="help-drawer-title" className="text-base font-semibold text-gray-900">
              {t('title')}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeHelp}
            aria-label={t('closeButton')}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Context-aware section */}
          <section aria-labelledby="help-context-heading">
            <div className="mb-2 flex items-center justify-between">
              <h3 id="help-context-heading" className="text-xs font-semibold uppercase tracking-wider text-brand-700">
                {t('contextHeading')}
              </h3>
              <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-800 border border-brand-200">
                {t(`routes.${contextKey}.label`)}
              </span>
            </div>
            <div className="space-y-2">
              {contextFaqs.map((item, i) => (
                <details
                  key={i}
                  open={i === 0}
                  className="rounded-xl border border-gray-200 bg-gray-50/70 px-3.5 py-2.5"
                >
                  <summary className="cursor-pointer text-sm font-medium text-gray-900">
                    {item.q}
                  </summary>
                  <p className="mt-2 text-xs leading-relaxed text-gray-600">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* Core topics: Escrow, Fees, Disputes */}
          <section aria-labelledby="help-core-heading">
            <h3 id="help-core-heading" className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-600">
              {t('coreHeading')}
            </h3>
            <div className="space-y-2">
              {coreFaqs.map((item) => (
                <details
                  key={item.key}
                  className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5"
                >
                  <summary className="cursor-pointer text-sm font-medium text-gray-900">
                    {item.q}
                  </summary>
                  <p className="mt-2 text-xs leading-relaxed text-gray-600">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* Keyboard shortcuts */}
          <section aria-labelledby="help-shortcuts-heading">
            <h3
              id="help-shortcuts-heading"
              className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600"
            >
              <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
              {t('shortcutsHeading')}
            </h3>
            <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
              {shortcuts.map((s) => (
                <div key={s.key} className="flex items-center justify-between px-3.5 py-2 text-xs">
                  <span className="text-gray-700">{s.label}</span>
                  <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-gray-800">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Footer with full docs link */}
        <div className="border-t border-gray-100 px-5 py-3.5">
          <a
            href={DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary w-full justify-between text-xs"
          >
            <span className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-brand-600" aria-hidden="true" />
              <span>{t('fullDocsLink')}</span>
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
          </a>
        </div>
      </aside>
    </div>
  );
}
