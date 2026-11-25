# Changelog

All notable changes to the ChainSettle frontend are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Troubleshooting guide** — `docs/troubleshooting.md` covers common wallet, account, transaction and setup problems plus every `ContractErrorCode`. Linked from the "Technical details" of transaction errors and from the README.
- **Unit tests** for the USDC/stroop conversion helpers (`src/lib/utils/amount.test.ts`) and the proof hashing helpers (`src/lib/proof-hash.test.ts`).
- `hashFile` now rejects files larger than `MAX_PROOF_FILE_BYTES` with a `RangeError`.
- `usdcToStroops` now throws on invalid input (empty, negative, non-numeric, exponent notation) instead of silently producing a wrong amount.

### Changed

- README slimmed down to an overview, quick start, scripts and links; feature notes moved to this changelog, architecture notes to `docs/architecture.md` and the comments API contract to `docs/backend-api.md`.

### Fixed

- `stroopsToUsdc` no longer converts through a JavaScript float, so amounts above `Number.MAX_SAFE_INTEGER` are displayed exactly.
- Typos in the related repository names (`chainsetttle-*` → `chainsettle-*`) in the README.

## [0.1.0]

### Added

#### On-chain verification links

- Added `src/components/StellarLink.tsx`.
- Renders Stellar addresses and transaction hashes as anchor links.
- Uses `NEXT_PUBLIC_STELLAR_NETWORK` to generate the correct Stellar Expert base URL:
  - `testnet` → `https://stellar.expert/explorer/testnet/`
  - `mainnet` → `https://stellar.expert/explorer/public/`
- Address links point to `/account/{address}`.
- Transaction hash links point to `/tx/{hash}`.
- Links open in a new tab using `target="_blank"` and `rel="noopener noreferrer"`.

#### Shipment metadata UX

- Updated `src/components/shipments/ShipmentMeta.tsx` to replace raw address/hash text with `StellarLink`.
- Preserves copy-to-clipboard behavior while making chain references instantly clickable.

#### Shipment list filtering

- Updated `src/app/dashboard/shipments/page.tsx`.
- Added top tabs for: `All`, `Active`, `Completed`, and `Cancelled`.
- Displays counts for each status in tab labels.
- Highlights the active status tab visually.
- Persists filter state in the URL with `?status=`.
- Maintains compatibility with the search box.
- Fetches status counts from the backend using the existing shipments list API.

#### Milestone validation for creation

- Updated `src/app/dashboard/shipments/create/page.tsx`.
- Added a live percentage indicator beneath the milestone section.
- Shows a green success state when milestone percentages sum to `100%`.
- Shows a red warning state when the sum is invalid.
- Disables the submit button unless the milestone split totals exactly `100%`.
- Enforces numeric input between `1` and `100` for each milestone percentage.
- Supports dynamic milestone row add/remove with real-time total recalculation.

These updates improve reliability and reduce contract submission failures by catching invalid milestone splits in the UI.

#### Shipment discussion & notes thread (#65)

- Added a comments and discussion thread on the shipment detail page (`/dashboard/shipments/[id]`).
- Rendered via `src/components/shipments/ShipmentComments.tsx` under the milestone timeline.
- Counterparties (`buyer`, `supplier`, `logistics`) and the `arbiter` can post and view notes to coordinate delivery and resolve disputes with complete context.
- Observers and non-participants see a read-only view with comment posting restricted.
- Each comment displays:
  - Author address linked to Stellar Expert explorer via `StellarLink`.
  - Author role badge (`Buyer`, `Supplier`, `Logistics`, `Arbiter`, or `Read-only`) styled according to the design system.
  - Relative timestamp (`timeAgo`).
- Text content is rendered safely (`whitespace-pre-wrap break-words`) to support natural multiline formatting without HTML or XSS injection risks.
- Enforces a 1,000 character maximum limit with a live character counter and keyboard shortcut (`Ctrl+Enter` / `Cmd+Enter` to submit).
- Full empty state and loading skeleton states included.
- Automatic 15-second background polling synchronized with shipment status refreshes, manual sync, and interval timers.
- Typed REST client wrappers added in `src/lib/api/services.ts` (`commentsApi.list(shipmentId)`, `commentsApi.create(shipmentId, body)`) and data types in `src/types/index.ts` (`Comment`, `CreateCommentInput`).
- The backend endpoints this relies on (`GET` / `POST /shipments/:id/comments`) are documented in [docs/backend-api.md](docs/backend-api.md).
