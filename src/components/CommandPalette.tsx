'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, LogOut, FileText, Bell, Zap, Settings } from 'lucide-react';
import { shipmentsApi } from '@/lib/api/services';
import { useAuthStore } from '@/lib/hooks/use-auth-store';
import { cn, shortAddress } from '@/lib/utils';
import type { Shipment } from '@/types';

type CommandType = 'page' | 'action' | 'shipment';

interface Command {
  id: string;
  type: CommandType;
  label: string;
  description?: string;
  icon: any;
  action: () => void;
}

function fuzzyMatch(query: string, text: string): boolean {
  const searchStr = query.toLowerCase();
  const targetStr = text.toLowerCase();
  let searchIdx = 0;
  
  for (let i = 0; i < targetStr.length && searchIdx < searchStr.length; i++) {
    if (targetStr[i] === searchStr[searchIdx]) {
      searchIdx++;
    }
  }
  
  return searchIdx === searchStr.length;
}

export function CommandPalette() {
  const router = useRouter();
  const { address, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loadingShipments, setLoadingShipments] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout>();

  // Static page commands
  const pageCommands: Command[] = [
    {
      id: 'shipments',
      type: 'page',
      label: 'Shipments',
      description: 'View all shipments',
      icon: FileText,
      action: () => {
        router.push('/dashboard/shipments');
        setOpen(false);
      },
    },
    {
      id: 'create',
      type: 'page',
      label: 'Create shipment',
      description: 'Create a new shipment',
      icon: Plus,
      action: () => {
        router.push('/dashboard/shipments/create');
        setOpen(false);
      },
    },
    {
      id: 'notifications',
      type: 'page',
      label: 'Notifications',
      description: 'View notifications',
      icon: Bell,
      action: () => {
        router.push('/notifications');
        setOpen(false);
      },
    },
    {
      id: 'settings',
      type: 'page',
      label: 'Settings',
      description: 'Manage preferences',
      icon: Settings,
      action: () => {
        router.push('/dashboard/settings');
        setOpen(false);
      },
    },
  ];

  // Dynamic action commands
  const actionCommands: Command[] = [
    {
      id: 'disconnect',
      type: 'action',
      label: 'Disconnect wallet',
      description: `Signed in as ${address ? shortAddress(address) : 'Unknown'}`,
      icon: LogOut,
      action: () => {
        logout();
        setOpen(false);
        router.push('/');
      },
    },
  ];

  // Shipment commands (filtered by query)
  const shipmentCommands: Command[] = useMemo(
    () =>
      shipments.map((s) => ({
        id: `shipment-${s.id}`,
        type: 'shipment' as const,
        label: s.id,
        description: `${s.supplierAddress ? shortAddress(s.supplierAddress) : 'Unknown'} • ${s.status}`,
        icon: Zap,
        action: () => {
          router.push(`/dashboard/shipments/${s.id}`);
          setOpen(false);
        },
      })),
    [shipments, router],
  );

  // Debounced shipment search
  useEffect(() => {
    if (!query.trim() || !address) {
      setShipments([]);
      return;
    }

    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setLoadingShipments(true);
      shipmentsApi
        .list({ buyerAddress: address, limit: 5 })
        .then((res) => {
          const filtered = res.data.filter(
            (s) =>
              fuzzyMatch(query, s.id) ||
              fuzzyMatch(query, s.supplierAddress) ||
              fuzzyMatch(query, s.buyerAddress),
          );
          setShipments(filtered.slice(0, 5));
        })
        .catch(() => setShipments([]))
        .finally(() => setLoadingShipments(false));
    }, 300);

    return () => clearTimeout(debounceTimer.current);
  }, [query, address]);

  // Combine all commands
  const allCommands = useMemo(() => {
    const pages = pageCommands.filter((cmd) => fuzzyMatch(query, cmd.label));
    const actions = actionCommands.filter((cmd) => fuzzyMatch(query, cmd.label));
    const shipmentCmds = shipmentCommands;

    const result: (Command & { section: string })[] = [
      ...pages.map((cmd) => ({ ...cmd, section: 'Pages' })),
      ...actions.map((cmd) => ({ ...cmd, section: 'Actions' })),
      ...shipmentCmds.map((cmd) => ({ ...cmd, section: 'Shipments' })),
    ];

    return result;
  }, [query, pageCommands, actionCommands, shipmentCommands]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open palette with Cmd/Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery('');
      }

      if (!open) return;

      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % allCommands.length || 0);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + allCommands.length) % allCommands.length || 0);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (allCommands[selectedIndex]) {
          allCommands[selectedIndex].action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, allCommands, selectedIndex]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setSelectedIndex(0);
    }
  }, [open]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  if (!address) return null;

  return (
    <>
      {/* Command Palette Trigger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open command palette (Cmd+K)"
          className="fixed bottom-5 left-5 z-40 hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Cmd+K</span>
        </button>
      )}

      {/* Modal Overlay & Palette */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-16 no-print">
          <div
            ref={containerRef}
            className="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200"
          >
            {/* Input */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search shipments, pages, actions…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  className="w-full bg-transparent text-sm outline-none text-gray-900 placeholder-gray-500"
                  aria-label="Search command palette"
                />
              </div>
            </div>

            {/* Commands List */}
            <div className="max-h-96 overflow-y-auto">
              {allCommands.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  No commands found
                </div>
              ) : (
                allCommands.reduce(
                  (acc, cmd, idx) => {
                    const sectionExists = acc.length > 0 && acc[acc.length - 1].section === cmd.section;

                    if (!sectionExists && acc.length > 0) {
                      acc.push(
                        <div key={`divider-${cmd.section}`} className="h-px bg-gray-100 my-1" />,
                      );
                    }

                    if (!sectionExists) {
                      acc.push(
                        <div key={`header-${cmd.section}`} className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                          {cmd.section}
                        </div>,
                      );
                    }

                    const Icon = cmd.icon;
                    acc.push(
                      <button
                        key={cmd.id}
                        onClick={() => {
                          cmd.action();
                          setQuery('');
                        }}
                        className={cn(
                          'w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm transition-colors focus-visible:outline-none',
                          selectedIndex === idx
                            ? 'bg-brand-50 text-brand-700'
                            : 'text-gray-700 hover:bg-gray-50',
                        )}
                      >
                        <Icon className={cn('w-4 h-4 flex-shrink-0', selectedIndex === idx ? 'text-brand-600' : 'text-gray-400')} />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{cmd.label}</p>
                          {cmd.description && (
                            <p className="text-xs text-gray-500 truncate">{cmd.description}</p>
                          )}
                        </div>
                      </button>,
                    );

                    return acc;
                  },
                  [] as React.ReactNode[],
                )
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-gray-100 text-[10px] text-gray-400 flex items-center justify-between">
              <span>Use arrow keys to navigate, Enter to select</span>
              <span>ESC to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
