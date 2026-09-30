/**
 * lib/stellar/address.ts
 * Client-side validation helpers for Stellar account addresses
 */

import { Horizon, StrKey } from '@stellar/stellar-sdk';
import { HORIZON_URL } from './balance';

export type PartyRole = 'buyer' | 'supplier' | 'logistics' | 'arbiter';

export const PARTY_ROLE_LABELS: Record<PartyRole, string> = {
  buyer: 'Buyer',
  supplier: 'Supplier',
  logistics: 'Logistics',
  arbiter: 'Arbiter',
};

/** Trim whitespace (including pasted newlines/tabs) around an address */
export function normalizeAddress(value: string): string {
  return value.trim();
}

/** True when the value is a valid Ed25519 public key (G...) */
export function isValidStellarAddress(value: string): boolean {
  return StrKey.isValidEd25519PublicKey(normalizeAddress(value));
}

/**
 * Check whether an account exists (is funded) on the configured network.
 * Resolves `false` on a Horizon 404; rethrows any other error so callers
 * can distinguish "unfunded" from "network unavailable".
 */
export async function accountExists(address: string): Promise<boolean> {
  try {
    await new Horizon.Server(HORIZON_URL).loadAccount(normalizeAddress(address));
    return true;
  } catch (err: any) {
    if (err?.response?.status === 404 || err?.name === 'NotFoundError') return false;
    throw err;
  }
}

/**
 * Validate the set of shipment parties.
 * Returns a map of role → error message for invalid or duplicated addresses.
 * Empty fields are skipped; `required` on the inputs covers those.
 */
export function validateParties(
  parties: Record<PartyRole, string>,
): Partial<Record<PartyRole, string>> {
  const errors: Partial<Record<PartyRole, string>> = {};
  const roles = Object.keys(parties) as PartyRole[];

  for (const role of roles) {
    const value = normalizeAddress(parties[role]);
    if (value && !isValidStellarAddress(value)) {
      errors[role] = 'Enter a valid Stellar public key (starts with G, 56 characters).';
    }
  }

  roles.forEach((role, i) => {
    if (errors[role]) return;
    const value = normalizeAddress(parties[role]);
    if (!value) return;
    const duplicateOf = roles
      .slice(0, i)
      .find((other) => normalizeAddress(parties[other]) === value);
    if (duplicateOf) {
      errors[role] = `${PARTY_ROLE_LABELS[role]} must be different from the ${PARTY_ROLE_LABELS[duplicateOf].toLowerCase()} address.`;
    }
  });

  return errors;
}
