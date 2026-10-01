"use client";

import { useEffect, useId, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { TEMPLATE_NAME_MAX_LENGTH } from '@/lib/templates';

interface SaveTemplateDialogProps {
  open: boolean;
  /** Whether any counterparty address is filled in and could be saved. */
  hasParties: boolean;
  onClose: () => void;
  /** Should throw with a user-facing message if the template cannot be saved. */
  onSave: (name: string, includeParties: boolean) => void;
}

export function SaveTemplateDialog({ open, hasParties, onClose, onSave }: SaveTemplateDialogProps) {
  const titleId = useId();
  const nameId = useId();
  const errorId = useId();
  const [name, setName] = useState('');
  const [includeParties, setIncludeParties] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName('');
    setIncludeParties(false);
    setError(null);
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      onSave(name, includeParties && hasParties);
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Could not save template.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4" role="presentation">
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <h2 id={titleId} className="mb-1 text-lg font-semibold text-gray-900">
          Save as template
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          Reuse this milestone split on future shipments. Templates are stored in this browser for your wallet.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor={nameId} className="label">Template name</label>
            <input
              id={nameId}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              maxLength={TEMPLATE_NAME_MAX_LENGTH}
              placeholder="e.g. Standard sea freight"
              className="input"
              aria-invalid={!!error}
              aria-describedby={error ? errorId : undefined}
              autoFocus
              required
            />
          </div>

          <label
            className={`flex items-start gap-3 rounded-xl border border-gray-100 px-4 py-3 ${
              hasParties ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
            }`}
          >
            <input
              type="checkbox"
              checked={includeParties && hasParties}
              disabled={!hasParties}
              onChange={(e) => setIncludeParties(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span>
              <span className="block text-sm font-medium text-gray-800">Include counterparty addresses</span>
              <span className="block text-xs text-gray-500">
                {hasParties
                  ? 'Also pre-fill the supplier, logistics and arbiter addresses entered above.'
                  : 'Enter at least one counterparty address to include it.'}
              </span>
            </span>
          </label>

          {error && (
            <div id={errorId} className="flex gap-2 rounded-xl bg-red-50 p-3" role="alert">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500 mt-0.5" aria-hidden="true" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">
              Cancel
            </button>
            <button type="submit" className="btn-primary text-sm" disabled={!name.trim()}>
              Save template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
