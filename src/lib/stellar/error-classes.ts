export type ContractErrorCode =
  // Mirrors `ChainSettleError` in the contract
  | 'ShipmentAlreadyExists'
  | 'ShipmentNotFound'
  | 'NotAuthorized'
  | 'InvalidMilestoneIndex'
  | 'InvalidMilestoneStatus'
  | 'ShipmentNotActive'
  | 'InvalidPercentages'
  | 'InvalidAmount'
  | 'DisputeAlreadyOpen'
  // Token / network / wallet level failures
  | 'InsufficientBalance'
  | 'InsufficientFee'
  | 'BadSequence'
  | 'TransactionExpired'
  | 'NetworkBusy'
  | 'UserRejected'
  | 'Unknown';

/** `#N` code from `Error(Contract, #N)` → error code (contract's `ChainSettleError` enum) */
export const CONTRACT_ERROR_CODES: Record<number, ContractErrorCode> = {
  1: 'ShipmentAlreadyExists',
  2: 'ShipmentNotFound',
  3: 'NotAuthorized',
  4: 'InvalidMilestoneIndex',
  5: 'InvalidMilestoneStatus',
  6: 'ShipmentNotActive',
  7: 'InvalidPercentages',
  8: 'InvalidAmount',
  9: 'DisputeAlreadyOpen',
};

/**
 * English fallback messages. The UI renders the `contractErrors.codes.*`
 * entries from the i18n messages; keep both in sync.
 */
export const CONTRACT_ERROR_MESSAGES: Record<ContractErrorCode, string> = {
  ShipmentAlreadyExists: 'A shipment with this ID already exists. Reload the form to generate a new ID and try again.',
  ShipmentNotFound: 'This shipment does not exist on-chain. Sync the shipment or check the ID.',
  NotAuthorized: 'Your connected wallet is not allowed to perform this action on this shipment. Switch to the right account in Freighter.',
  InvalidMilestoneIndex: 'This milestone does not exist on the shipment. Refresh the page and try again.',
  InvalidMilestoneStatus: 'This milestone is not in the right state for this action. Refresh the page to see its latest status.',
  ShipmentNotActive: 'This shipment is no longer active, so it cannot be changed.',
  InvalidPercentages: 'Milestone payment percentages must add up to exactly 100%.',
  InvalidAmount: 'The amount must be greater than zero.',
  DisputeAlreadyOpen: 'A dispute is already open for this milestone. Wait for the arbiter to resolve it.',
  InsufficientBalance: 'Your wallet does not have enough balance to cover this transaction. Top up and try again.',
  InsufficientFee: 'The network fee was too low for this transaction. Please try again.',
  BadSequence: 'Your account sequence number is out of date, usually because another transaction was sent at the same time. Please try again.',
  TransactionExpired: 'The transaction expired before it reached the network. Please try again.',
  NetworkBusy: 'The Stellar network is busy right now. Please wait a moment and try again.',
  UserRejected: 'You rejected the transaction in Freighter',
  Unknown: 'The transaction could not be completed. Please try again, or share the technical details below with support.',
};

/** A contract / wallet / submission failure, mapped to a known code */
export class ContractError extends Error {
  readonly code: ContractErrorCode;
  readonly raw: string;
  readonly txHash?: string;

  constructor(code: ContractErrorCode, raw: string, txHash?: string) {
    super(CONTRACT_ERROR_MESSAGES[code]);
    this.name = 'ContractError';
    this.code = code;
    this.raw = raw;
    this.txHash = txHash;
  }
}

/** The transaction was submitted but not confirmed before the timeout — it may still land */
export class TxPendingError extends Error {
  readonly hash: string;

  constructor(hash: string) {
    super(`Transaction is still pending: ${hash}`);
    this.name = 'TxPendingError';
    this.hash = hash;
  }
}
