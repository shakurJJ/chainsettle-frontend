# Troubleshooting

Common problems when using or running the ChainSettle frontend, listed as **symptom → cause → fix**. If your problem is not listed, open an issue and include the **Technical details** shown under the error message.

- [Wallet and sign-in](#wallet-and-sign-in)
- [Accounts and balances](#accounts-and-balances)
- [Transactions](#transactions)
- [Shipments and milestones](#shipments-and-milestones)
- [Local setup](#local-setup)
- [Contract error codes](#contract-error-codes)

---

## Wallet and sign-in

### 1. "Freighter not installed" on the login page

- **Cause:** The Freighter browser extension is not installed, is disabled, or the page loaded before the extension was ready.
- **Fix:** Install [Freighter](https://www.freighter.app/), make sure it is enabled for the site, then click **I installed it - retry** or reload the page. Freighter is only available on desktop browsers (Chrome, Firefox, Brave, Edge).

### 2. Connecting the wallet does nothing / the Freighter popup never appears

- **Cause:** Freighter is locked, a previous popup is still open in the background, or the browser blocked the popup.
- **Fix:** Open Freighter from the toolbar, unlock it with your password, close any pending Freighter windows, then click connect again.

### 3. Transactions fail right away on the wrong network

- **Cause:** Freighter is on a different network from the app. The app uses `NEXT_PUBLIC_STELLAR_NETWORK` (`testnet` by default); if Freighter is on Mainnet, transactions are signed for the wrong network passphrase and the RPC rejects them, or the contract is not found.
- **Fix:** In Freighter open **Settings → Network** and pick the same network as the app (**Testnet** for development). Then reload the page.

### 4. "You rejected the transaction in Freighter"

- **Cause:** The signing request was declined or closed in Freighter (`UserRejected`).
- **Fix:** Retry the action and click **Approve** in Freighter. Nothing was submitted, so it is safe to retry.

### 5. Sign-in fails after signing the nonce, or you are logged out unexpectedly

- **Cause:** The login nonce expired before it was signed, the backend is unreachable, or your session timed out after inactivity.
- **Fix:** Reload the login page to request a fresh nonce and sign it promptly. Check that the backend at `NEXT_PUBLIC_API_URL` is running. After a session timeout, simply sign in again.

### 6. "Your connected wallet is not allowed to perform this action"

- **Cause:** The active Freighter account is not the buyer, supplier, logistics provider or arbiter required for this action (`NotAuthorized`).
- **Fix:** Switch to the right account in Freighter (it must match the address shown on the shipment for that role), then reconnect and retry.

---

## Accounts and balances

### 7. "Account not found" / the account is reported as missing

- **Cause:** The Stellar account is unfunded. A Stellar account does not exist on-chain until it holds the minimum XLM reserve, so Horizon returns 404 and transactions cannot be built.
- **Fix:** On testnet, fund the account with [Friendbot](https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY). On mainnet, send at least the base reserve of XLM to the address from another wallet or exchange. All counterparty addresses on a shipment must also be funded accounts.

### 8. "Your wallet does not have enough balance"

- **Cause:** Not enough USDC to lock in escrow, or not enough spare XLM above the minimum reserve to pay fees (`InsufficientBalance`).
- **Fix:** Top up USDC and keep a few XLM above the reserve for fees. Make sure the account has a trustline for the USDC asset configured in `NEXT_PUBLIC_USDC_ADDRESS`; without a trustline it cannot hold USDC.

---

## Transactions

### 9. "Transaction still pending"

- **Cause:** The transaction was submitted but not confirmed before the app stopped polling. It may still succeed.
- **Fix:** Open the Stellar Expert link shown with the message and check the status **before** retrying, otherwise you may submit the same action twice.

### 10. "The Stellar network is busy right now"

- **Cause:** The RPC kept returning `TRY_AGAIN_LATER` after several retries (`NetworkBusy`).
- **Fix:** Wait a minute and retry. If it persists, check the RPC endpoint in `NEXT_PUBLIC_STELLAR_RPC_URL` and the [Stellar status page](https://status.stellar.org/).

### 11. "The network fee was too low" / "The transaction expired"

- **Cause:** Fees spiked between simulation and submission (`InsufficientFee`), or signing took too long and the transaction's time bounds passed (`TransactionExpired`).
- **Fix:** Retry the action — the transaction is rebuilt with fresh fees and time bounds. Approve the Freighter popup promptly.

### 12. "Your account sequence number is out of date"

- **Cause:** Another transaction from the same account was submitted at the same time, e.g. from another tab or wallet (`BadSequence`).
- **Fix:** Wait for the other transaction to finish, then retry. Avoid running actions for the same account in several tabs at once.

---

## Shipments and milestones

### 13. The **Create shipment** button stays disabled

- **Cause:** Milestone percentages do not add up to exactly 100%, a percentage is outside 1–100, or a required field is empty (`InvalidPercentages` on-chain).
- **Fix:** Adjust the milestone split until the indicator below the milestones turns green, and fill in every address and the total amount.

### 14. "A shipment with this ID already exists"

- **Cause:** The generated shipment ID was already used on-chain, usually after a retried or duplicated submission (`ShipmentAlreadyExists`).
- **Fix:** Check the shipment list first — the earlier attempt may have succeeded. Otherwise reload the form to generate a new ID.

### 15. "This milestone is not in the right state for this action"

- **Cause:** Someone else already acted on the milestone (e.g. proof was submitted, confirmed or disputed) and your page is out of date (`InvalidMilestoneStatus`).
- **Fix:** Refresh the shipment page to load the latest milestone status, then choose the action that is now available.

### 16. A proof document is rejected or the hash does not match

- **Cause:** The file is over the 50 MB limit or empty, or a different version of the document was hashed (any change, even metadata, changes the SHA-256 hash).
- **Fix:** Use the exact file that was originally submitted. For very large documents, hash them yourself and paste the SHA-256 hash or IPFS CID manually.

---

## Local setup

### 17. "Invalid environment configuration" on `npm run dev` / `npm run build`

- **Cause:** A required `NEXT_PUBLIC_*` variable is missing or malformed. The app validates them at startup.
- **Fix:** Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_CONTRACT_ID`, `NEXT_PUBLIC_USDC_ADDRESS` and `NEXT_PUBLIC_STELLAR_RPC_URL`. Contract IDs must be valid `C…` addresses and URLs must be absolute. The error message lists each invalid variable.

### 18. Shipment lists are empty or API calls fail with network errors

- **Cause:** The backend (`chainsettle-backend`) is not running, `NEXT_PUBLIC_API_URL` points to the wrong host, or the backend's CORS settings do not allow the frontend origin.
- **Fix:** Start the backend, check `NEXT_PUBLIC_API_URL` (default `http://localhost:3000/api/v1`) and make sure the backend allows the frontend's origin.

### 19. "This shipment does not exist on-chain"

- **Cause:** `NEXT_PUBLIC_CONTRACT_ID` points to a different contract deployment than the one the shipment was created on, or the shipment was only saved in the backend (`ShipmentNotFound`).
- **Fix:** Make sure the frontend and backend use the same contract ID and network, then sync the shipment.

---

## Contract error codes

Contract and transaction failures are mapped to a `ContractErrorCode` in [`src/lib/stellar/errors.ts`](../src/lib/stellar/errors.ts). Codes `#1`–`#9` come from the contract's `ChainSettleError` enum (`Error(Contract, #N)`); the rest come from the token contract, the network or the wallet.

| Code | `#N` | Meaning | What to do |
|---|---|---|---|
| `ShipmentAlreadyExists` | 1 | A shipment with this ID is already on-chain. | Check the list for an earlier successful attempt, or reload the form for a new ID. |
| `ShipmentNotFound` | 2 | No shipment with this ID exists on the configured contract. | Sync the shipment; check the contract ID and network. |
| `NotAuthorized` | 3 | The signing account does not have the role required for this action. | Switch to the correct account in Freighter. |
| `InvalidMilestoneIndex` | 4 | The milestone does not exist on the shipment. | Refresh the page and retry. |
| `InvalidMilestoneStatus` | 5 | The milestone is not in the state this action needs. | Refresh to see the latest status. |
| `ShipmentNotActive` | 6 | The shipment is completed or cancelled and cannot change. | No action possible on this shipment. |
| `InvalidPercentages` | 7 | Milestone percentages do not sum to 100. | Fix the milestone split. |
| `InvalidAmount` | 8 | The amount is zero or negative. | Enter an amount greater than zero. |
| `DisputeAlreadyOpen` | 9 | A dispute is already open for the milestone. | Wait for the arbiter to resolve it. |
| `InsufficientBalance` | — | Not enough USDC or XLM to cover the transaction. | Top up and keep XLM above the reserve. |
| `InsufficientFee` | — | The fee was too low for current network demand. | Retry. |
| `BadSequence` | — | The account's sequence number is stale. | Wait for other transactions, then retry. |
| `TransactionExpired` | — | The transaction reached the network after its time bounds. | Retry and sign promptly. |
| `NetworkBusy` | — | The RPC returned `TRY_AGAIN_LATER` repeatedly. | Wait and retry. |
| `UserRejected` | — | The request was declined in Freighter. | Retry and approve in Freighter. |
| `Unknown` | — | The failure did not match a known pattern. | Retry; if it persists, open an issue with the technical details. |
