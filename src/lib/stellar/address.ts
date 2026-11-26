/**
 * lib/stellar/address.ts
 * Client-side validation helpers for Stellar account addresses.
 * Uses lightweight StrKey/Horizon REST checks so non-signing pages don't
 * pull @stellar/stellar-sdk into their initial bundle.
 */

import { HORIZON_URL } from './balance';

export type PartyRole = 'buyer' | 'supplier' | 'logistics' | 'arbiter';

export const PARTY_ROLE_LABELS: Record<PartyRole, string> = {
  buyer: 'Buyer',
  supplier: 'Supplier',
  logistics: 'Logistics',
  arbiter: 'Arbiter',
};

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const ED25519_PUBLIC_KEY_VERSION_BYTE = 6 << 3; // 'G' prefix (0x30)

function decodeBase32(input: string): Uint8Array | null {
  if (input.length !== 56) return null;
  const out = new Uint8Array(35);
  let buffer = 0;
  let bits = 0;
  let index = 0;

  for (let i = 0; i < input.length; i++) {
    const val = BASE32_ALPHABET.indexOf(input[i]);
    if (val === -1) return null;
    buffer = (buffer << 5) | val;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out[index++] = (buffer >> bits) & 0xff;
    }
  }
  return index === 35 ? out : null;
}

function crc16Xmodem(bytes: Uint8Array): number {
  let crc = 0x0000;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i] << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

/** Trim whitespace (including pasted newlines/tabs) around an address */
export function normalizeAddress(value: string): string {
  return value.trim();
}

/** True when the value is a valid Ed25519 public key (G...) */
export function isValidStellarAddress(value: string): boolean {
  const normalized = normalizeAddress(value);
  if (!normalized.startsWith('G')) return false;
  const decoded = decodeBase32(normalized);
  if (!decoded || decoded[0] !== ED25519_PUBLIC_KEY_VERSION_BYTE) return false;
  const expected = crc16Xmodem(decoded.subarray(0, 33));
  const actual = decoded[33] | (decoded[34] << 8);
  return expected === actual;
}

/**
 * Check whether an account exists (is funded) on the configured network.
 * Resolves `false` on a Horizon 404; rethrows any other error so callers
 * can distinguish "unfunded" from "network unavailable".
 */
export async function accountExists(address: string): Promise<boolean> {
  const res = await fetch(`${HORIZON_URL}/accounts/${encodeURIComponent(normalizeAddress(address))}`);
  if (res.status === 404) return false;
  if (!res.ok) {
    throw new Error(`Horizon account check failed (${res.status})`);
  }
  return true;
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
