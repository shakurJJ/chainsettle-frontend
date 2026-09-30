/**
 * lib/hooks/use-templates-store.ts
 *
 * Zustand store for user-defined shipment templates.
 * Persisted to localStorage and scoped per connected wallet address, so
 * templates saved by one wallet are never shown to another.
 */

import { useEffect, useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CreateMilestoneInput } from '@/types';
import {
  BUILT_IN_TEMPLATES,
  TEMPLATE_NAME_MAX_LENGTH,
  cloneMilestones,
  compactParties,
  generateTemplateId,
  isSavableSplit,
  type ShipmentTemplate,
  type TemplateParties,
} from '@/lib/templates';

export interface SaveTemplateInput {
  name: string;
  milestones: CreateMilestoneInput[];
  parties?: TemplateParties;
}

export class TemplateError extends Error {}

interface TemplatesState {
  templatesByOwner: Record<string, ShipmentTemplate[]>;

  saveTemplate: (owner: string, input: SaveTemplateInput) => ShipmentTemplate;
  renameTemplate: (owner: string, id: string, name: string) => void;
  deleteTemplate: (owner: string, id: string) => void;
}

function normalizeName(name: string): string {
  const value = name.trim().replace(/\s+/g, ' ');
  if (!value) throw new TemplateError('Template name is required.');
  if (value.length > TEMPLATE_NAME_MAX_LENGTH) {
    throw new TemplateError(`Template name must be ${TEMPLATE_NAME_MAX_LENGTH} characters or fewer.`);
  }
  return value;
}

function assertUniqueName(templates: ShipmentTemplate[], name: string, ignoreId?: string) {
  const lower = name.toLowerCase();
  const clash = [...BUILT_IN_TEMPLATES, ...templates].some(
    (t) => t.id !== ignoreId && t.name.toLowerCase() === lower,
  );
  if (clash) throw new TemplateError(`A template named "${name}" already exists.`);
}

export const useTemplatesStore = create<TemplatesState>()(
  persist(
    (set, get) => ({
      templatesByOwner: {},

      saveTemplate: (owner, input) => {
        if (!isSavableSplit(input.milestones)) {
          throw new TemplateError('Milestone percentages must sum to 100% before saving a template.');
        }
        const existing = get().templatesByOwner[owner] ?? [];
        const name = normalizeName(input.name);
        assertUniqueName(existing, name);

        const template: ShipmentTemplate = {
          id: generateTemplateId(),
          name,
          milestones: cloneMilestones(input.milestones).map((m) => ({ ...m, name: m.name.trim() })),
          parties: input.parties ? compactParties(input.parties) : undefined,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          templatesByOwner: { ...state.templatesByOwner, [owner]: [...existing, template] },
        }));
        return template;
      },

      renameTemplate: (owner, id, name) => {
        const existing = get().templatesByOwner[owner] ?? [];
        const value = normalizeName(name);
        assertUniqueName(existing, value, id);

        set((state) => ({
          templatesByOwner: {
            ...state.templatesByOwner,
            [owner]: existing.map((t) => (t.id === id ? { ...t, name: value } : t)),
          },
        }));
      },

      deleteTemplate: (owner, id) => {
        set((state) => ({
          templatesByOwner: {
            ...state.templatesByOwner,
            [owner]: (state.templatesByOwner[owner] ?? []).filter((t) => t.id !== id),
          },
        }));
      },
    }),
    {
      name: 'chainsetttle_shipment_templates',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ templatesByOwner: state.templatesByOwner }),
      // Rehydrated on mount (see useShipmentTemplates) to avoid SSR hydration mismatches.
      skipHydration: true,
    },
  ),
);

const EMPTY: ShipmentTemplate[] = [];

/**
 * Templates visible to the given wallet: built-in starters first,
 * followed by the wallet's own saved templates.
 */
export function useShipmentTemplates(owner: string | null) {
  useEffect(() => {
    if (!useTemplatesStore.persist.hasHydrated()) {
      void useTemplatesStore.persist.rehydrate();
    }
  }, []);

  const userTemplates = useTemplatesStore((state) =>
    owner ? state.templatesByOwner[owner] ?? EMPTY : EMPTY,
  );

  const templates = useMemo(() => [...BUILT_IN_TEMPLATES, ...userTemplates], [userTemplates]);

  return { templates, userTemplates, builtInTemplates: BUILT_IN_TEMPLATES };
}
