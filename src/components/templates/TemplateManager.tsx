"use client";

import { useState } from 'react';
import { Check, LayoutTemplate, Lock, Pencil, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useShipmentTemplates, useTemplatesStore } from '@/lib/hooks/use-templates-store';
import { TEMPLATE_NAME_MAX_LENGTH, type ShipmentTemplate } from '@/lib/templates';

interface TemplateManagerProps {
  owner: string | null;
}

function splitSummary(template: ShipmentTemplate): string {
  return template.milestones.map((m) => `${m.name} ${m.paymentPercent}%`).join(' · ');
}

export function TemplateManager({ owner }: TemplateManagerProps) {
  const t = useTranslations('settings.templates');
  const { userTemplates, builtInTemplates } = useShipmentTemplates(owner);
  const renameTemplate = useTemplatesStore((state) => state.renameTemplate);
  const deleteTemplate = useTemplatesStore((state) => state.deleteTemplate);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startEditing = (template: ShipmentTemplate) => {
    setEditingId(template.id);
    setDraftName(template.name);
    setConfirmDeleteId(null);
    setError(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setError(null);
  };

  const submitRename = (id: string) => {
    if (!owner) return;
    try {
      renameTemplate(owner, id, draftName);
      setEditingId(null);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? t('renameFailed'));
    }
  };

  const confirmDelete = (id: string) => {
    if (!owner) return;
    deleteTemplate(owner, id);
    setConfirmDeleteId(null);
  };

  return (
    <section className="card mt-5 p-5" aria-labelledby="templates-heading">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
          <LayoutTemplate className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 id="templates-heading" className="text-sm font-semibold text-gray-900">{t('title')}</h2>
          <p className="text-xs text-gray-500">{t('description')}</p>
        </div>
      </div>

      <p className="label">{t('yourTemplates')}</p>
      {!owner ? (
        <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500">{t('connectToManage')}</p>
      ) : userTemplates.length === 0 ? (
        <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500">{t('empty')}</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
          {userTemplates.map((template) => (
            <li key={template.id} className="px-4 py-3">
              {editingId === template.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitRename(template.id);
                  }}
                  className="flex items-center gap-2"
                >
                  <label htmlFor={`rename-${template.id}`} className="sr-only">{t('templateName')}</label>
                  <input
                    id={`rename-${template.id}`}
                    value={draftName}
                    onChange={(e) => {
                      setDraftName(e.target.value);
                      setError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') cancelEditing();
                    }}
                    maxLength={TEMPLATE_NAME_MAX_LENGTH}
                    className="input flex-1"
                    aria-invalid={!!error}
                    autoFocus
                  />
                  <button type="submit" className="btn-primary px-3" aria-label={t('saveName')} disabled={!draftName.trim()}>
                    <Check className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={cancelEditing} className="btn-secondary px-3" aria-label={t('cancel')}>
                    <X className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">{template.name}</p>
                    <p className="text-xs text-gray-500">{splitSummary(template)}</p>
                    {template.parties && (
                      <p className="mt-0.5 text-xs text-gray-400">{t('includesAddresses')}</p>
                    )}
                  </div>
                  {confirmDeleteId === template.id ? (
                    <div className="flex flex-shrink-0 items-center gap-2" role="group" aria-label={t('confirmDelete')}>
                      <span className="text-xs text-gray-600">{t('confirmDelete')}</span>
                      <button
                        type="button"
                        onClick={() => confirmDelete(template.id)}
                        className="btn-secondary px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        {t('delete')}
                      </button>
                      <button type="button" onClick={() => setConfirmDeleteId(null)} className="btn-secondary px-2.5 py-1 text-xs">
                        {t('cancel')}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEditing(template)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        aria-label={t('renameLabel', { name: template.name })}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDeleteId(template.id);
                          setEditingId(null);
                        }}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        aria-label={t('deleteLabel', { name: template.name })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
              {editingId === template.id && error && (
                <p className="mt-2 text-xs text-red-600" role="alert">{error}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="label mt-5">{t('starterTemplates')}</p>
      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
        {builtInTemplates.map((template) => (
          <li key={template.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-800">{template.name}</p>
              <p className="text-xs text-gray-500">{splitSummary(template)}</p>
            </div>
            <span className="inline-flex flex-shrink-0 items-center gap-1 text-xs text-gray-400">
              <Lock className="h-3 w-3" aria-hidden="true" />
              {t('builtIn')}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
