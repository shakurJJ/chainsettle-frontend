/**
 * lib/templates.ts
 *
 * Reusable milestone configurations for the create-shipment form.
 * A template stores a milestone split (names + percentages) and, optionally,
 * the counterparty addresses to pre-fill.
 */

import type { CreateMilestoneInput } from '@/types';

export interface TemplateParties {
  supplierAddress?: string;
  logisticsAddress?: string;
  arbiterAddress?: string;
}

export interface ShipmentTemplate {
  id: string;
  name: string;
  milestones: CreateMilestoneInput[];
  parties?: TemplateParties;
  builtIn?: boolean;
  createdAt: string;
}

export const TEMPLATE_NAME_MAX_LENGTH = 60;

/** Starter templates available to every wallet on first use. Read-only. */
export const BUILT_IN_TEMPLATES: ShipmentTemplate[] = [
  {
    id: 'builtin-standard',
    name: 'Standard (Dispatched 25% / In transit 50% / Delivered 25%)',
    milestones: [
      { name: 'Goods Dispatched', paymentPercent: 25 },
      { name: 'In Transit', paymentPercent: 50 },
      { name: 'Delivered', paymentPercent: 25 },
    ],
    builtIn: true,
    createdAt: '1970-01-01T00:00:00.000Z',
  },
  {
    id: 'builtin-production',
    name: 'Manufacturing (Production 30% / Shipped 40% / Delivered 30%)',
    milestones: [
      { name: 'Production Complete', paymentPercent: 30 },
      { name: 'Shipped', paymentPercent: 40 },
      { name: 'Delivered', paymentPercent: 30 },
    ],
    builtIn: true,
    createdAt: '1970-01-01T00:00:00.000Z',
  },
  {
    id: 'builtin-two-stage',
    name: 'Two-stage (Dispatched 50% / Delivered 50%)',
    milestones: [
      { name: 'Goods Dispatched', paymentPercent: 50 },
      { name: 'Delivered', paymentPercent: 50 },
    ],
    builtIn: true,
    createdAt: '1970-01-01T00:00:00.000Z',
  },
];

/** Sum of milestone percentages. */
export function milestoneTotal(milestones: CreateMilestoneInput[]): number {
  return milestones.reduce((sum, m) => sum + m.paymentPercent, 0);
}

/**
 * A split can be saved as a template only when it totals exactly 100%
 * and every milestone has a name and a positive percentage.
 */
export function isSavableSplit(milestones: CreateMilestoneInput[]): boolean {
  return (
    milestones.length > 0 &&
    milestoneTotal(milestones) === 100 &&
    milestones.every((m) => m.name.trim() !== '' && m.paymentPercent > 0)
  );
}

/** Deep-copy milestones so edits on the form never mutate a stored template. */
export function cloneMilestones(milestones: CreateMilestoneInput[]): CreateMilestoneInput[] {
  return milestones.map((m) => ({ name: m.name, paymentPercent: m.paymentPercent }));
}

/** Drop empty party fields; returns undefined when nothing is left. */
export function compactParties(parties: TemplateParties): TemplateParties | undefined {
  const result: TemplateParties = {};
  if (parties.supplierAddress?.trim()) result.supplierAddress = parties.supplierAddress.trim();
  if (parties.logisticsAddress?.trim()) result.logisticsAddress = parties.logisticsAddress.trim();
  if (parties.arbiterAddress?.trim()) result.arbiterAddress = parties.arbiterAddress.trim();
  return Object.keys(result).length ? result : undefined;
}

export function generateTemplateId(): string {
  return `tpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
