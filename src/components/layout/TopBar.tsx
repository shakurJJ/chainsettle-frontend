'use client';

import { Bell, Wifi } from 'lucide-react';
import Link from 'next/link';

export function TopBar() {
  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet';

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0">
      <div />
      <div className="flex items-center gap-3">
        {/* Network badge */}
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg ${
            network === 'mainnet'
              ? 'bg-green-50 text-green-700'
              : 'bg-amber-50 text-amber-700'
          }`}
        >
          <Wifi className="w-3 h-3" />
          {network === 'mainnet' ? 'Mainnet' : 'Testnet'}
        </span>

        {/* Notifications */}
        <Link
          href="/notifications"
          className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-4.5 h-4.5" />
          {/* Unread dot — connect to notifications count */}
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
        </Link>
      </div>
    </header>
  );
}
