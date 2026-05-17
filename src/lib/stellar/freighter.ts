/**
 * lib/stellar/freighter.ts
 *
 * All interactions with the Freighter browser wallet extension.
 * Freighter is Stellar's official wallet — users install it as a browser
 * extension and use it to sign transactions without exposing their private key.
 *
 * Docs: https://docs.freighter.app
 */

import {
  isConnected,
  getAddress,
  signTransaction,
  signAuthEntry,
  requestAccess,
  getNetwork,
  WatchWalletChanges,
} from '@stellar/freighter-api';

// ----------------------------------------------------------------
// Connection
// ----------------------------------------------------------------

/** Check if Freighter extension is installed in the browser */
export async function isFreighterInstalled(): Promise<boolean> {
  try {
    const result = await isConnected();
    return result.isConnected;
  } catch {
    return false;
  }
}

/** Request access to the user's Stellar address */
export async function connectFreighter(): Promise<string> {
  const access = await requestAccess();
  if (access.error) {
    throw new Error(access.error);
  }

  const address = await getUserAddress();
  return address;
}

/** Get the current user's Stellar public key */
export async function getUserAddress(): Promise<string> {
  const result = await getAddress();
  if (result.error) {
    throw new Error(result.error);
  }
  return result.address;
}

/** Get the current network the wallet is connected to */
export async function getWalletNetwork(): Promise<string> {
  const result = await getNetwork();
  if (result.error) {
    throw new Error(result.error);
  }
  return result.network;
}

// ----------------------------------------------------------------
// Transaction Signing
// ----------------------------------------------------------------

/**
 * Sign a Stellar XDR transaction with Freighter.
 * The signed XDR is returned and must be submitted to the network.
 *
 * @param xdr           - Base64-encoded XDR transaction envelope
 * @param networkPassphrase - Stellar network passphrase
 * @returns Signed XDR string ready for submission
 */
export async function signTx(xdr: string, networkPassphrase: string): Promise<string> {
  const result = await signTransaction(xdr, { networkPassphrase });
  if (result.error) {
    throw new Error(result.error);
  }
  return result.signedTxXdr;
}

/**
 * Sign a Soroban auth entry for a contract call.
 * Used when a contract function requires `require_auth()`.
 *
 * @param entryXdr      - Base64-encoded auth entry XDR
 * @param validUntilLedger - Ledger until which this auth is valid
 * @returns Signed auth entry XDR
 */
export async function signAuth(
  entryXdr: string,
  validUntilLedger: number,
): Promise<string> {
  const result = await signAuthEntry(entryXdr, { accountToSign: await getUserAddress() });
  if (result.error) {
    throw new Error(result.error);
  }
  return result.signedAuthEntry;
}

// ----------------------------------------------------------------
// Challenge Signing (for backend auth)
// ----------------------------------------------------------------

/**
 * Sign a nonce string from the backend using Freighter.
 * Used in the Sign-In With Stellar flow.
 *
 * NOTE: Freighter's signTransaction requires a full XDR transaction.
 * For simple nonce signing, we encode the nonce as a ManageData operation.
 * The backend verifies the signed entry against the user's public key.
 */
export async function signNonce(nonce: string, networkPassphrase: string): Promise<string> {
  // Encode nonce as a memo in a minimal transaction and sign it
  // This is a simplified approach — production should use SEP-10
  const { Transaction, TransactionBuilder, Networks, BASE_FEE, Operation, Keypair } =
    await import('@stellar/stellar-sdk');

  const address = await getUserAddress();

  // Build a minimal transaction with the nonce as a ManageData operation
  const dummyAccount = {
    accountId: () => address,
    sequenceNumber: () => '0',
    incrementSequenceNumber: () => {},
  } as any;

  const tx = new TransactionBuilder(dummyAccount, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(
      Operation.manageData({
        name: 'chainsetttle_nonce',
        value: Buffer.from(nonce),
      }),
    )
    .setTimeout(30)
    .build();

  const signed = await signTx(tx.toXDR(), networkPassphrase);
  return signed;
}

// ----------------------------------------------------------------
// Wallet Change Watcher
// ----------------------------------------------------------------

/**
 * Subscribe to wallet changes (account switch, network change).
 * Call the returned unsubscribe function on cleanup.
 */
export function watchWallet(
  onChange: (address: string, network: string) => void,
): () => void {
  const watcher = new WatchWalletChanges(3000);
  watcher.watch(async () => {
    try {
      const address = await getUserAddress();
      const network = await getWalletNetwork();
      onChange(address, network);
    } catch {}
  });

  return () => watcher.stop();
}
