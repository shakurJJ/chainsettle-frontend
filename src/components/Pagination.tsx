'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

export function Pagination({ page, totalPages, onPrev, onNext }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 mt-6">
      <button
        onClick={onPrev}
        disabled={page === 1}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
          page === 1
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
        )}
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
        Previous
      </button>

      <span className="text-sm text-gray-500 min-w-[80px] text-center">
        Page {page} of {totalPages}
      </span>

      <button
        onClick={onNext}
        disabled={page === totalPages}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
          page === totalPages
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
        )}
        aria-label="Next page"
      >
        Next
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
