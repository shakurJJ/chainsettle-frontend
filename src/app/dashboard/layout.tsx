'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { KeyboardShortcuts } from '@/components/layout/KeyboardShortcuts';
import { TourGuide } from '@/components/tour/TourGuide';
import { HelpDrawer } from '@/components/help/HelpDrawer';

// CommandPalette is keyboard-triggered (Cmd+K) — no need to block first paint
const CommandPalette = dynamic(
  () => import('@/components/CommandPalette').then((m) => m.CommandPalette),
  { ssr: false },
);

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sidebarOpen) {
      sidebarRef.current?.querySelector('button')?.focus();
    }
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <KeyboardShortcuts />
      <HelpDrawer />
      <TourGuide />
      <CommandPalette />

      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen((v) => !v)} />
        <main id="main" className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto animate-fade-in">
            <Breadcrumbs />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
