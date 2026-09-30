"use client";

import { useId, useState } from 'react';
import { AlertTriangle, LayoutTemplate } from 'lucide-react';
import type { ShipmentTemplate } from '@/lib/templates';

interface TemplatePickerProps {
  templates: ShipmentTemplate[];
  /** True when applying a template would overwrite data the user already entered. */
  needsConfirmation: boolean;
  onApply: (template: ShipmentTemplate) => void;
}

function splitSummary(template: ShipmentTemplate): string {
  return template.milestones.map((m) => `${m.paymentPercent}%`).join(' / ');
}

export function TemplatePicker({ templates, needsConfirmation, onApply }: TemplatePickerProps) {
  const selectId = useId();
  const dialogTitleId = useId();
  const [pending, setPending] = useState<ShipmentTemplate | null>(null);

  const builtIn = templates.filter((t) => t.builtIn);
  const saved = templates.filter((t) => !t.builtIn);

  const handleChange = (id: string) => {
    const template = templates.find((t) => t.id === id);
    if (!template) return;
    if (needsConfirmation) setPending(template);
    else onApply(template);
  };

  const confirm = () => {
    if (pending) onApply(pending);
    setPending(null);
  };

  return (
    <div className="card p-5">
      <label htmlFor={selectId} className="label flex items-center gap-1.5">
        <LayoutTemplate className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
        Use template
      </label>
      {/* Controlled to "" so the same template can be re-applied after edits. */}
      <select
        id={selectId}
        value=""
        onChange={(e) => handleChange(e.target.value)}
        className="input"
        aria-describedby={`${selectId}-hint`}
      >
        <option value="" disabled>
          Choose a milestone template…
        </option>
        <optgroup label="Starter templates">
          {builtIn.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </optgroup>
        {saved.length > 0 && (
          <optgroup label="Your templates">
            {saved.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({splitSummary(t)}){t.parties ? ' · with addresses' : ''}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      <p id={`${selectId}-hint`} className="text-xs text-gray-400 mt-1">
        Pre-fills milestones and any saved counterparty addresses. You can still edit everything.
      </p>

      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4" role="presentation">
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 id={dialogTitleId} className="mb-2 text-lg font-semibold text-gray-900">
              Replace current milestones?
            </h2>
            <p className="mb-5 text-sm leading-6 text-gray-500">
              Applying <strong className="text-gray-900">{pending.name}</strong> will overwrite the milestones
              {pending.parties ? ' and counterparty addresses' : ''} you have already entered.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setPending(null)} className="btn-secondary text-sm" autoFocus>
                Keep my changes
              </button>
              <button type="button" onClick={confirm} className="btn-primary text-sm">
                Apply template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
