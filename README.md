# ChainSettle — Frontend Repo

> **Next.js 14 frontend for milestone-based supply chain escrow on Stellar**

This is **Repo 3 of 3** in the ChainSettle project:

| Repo | Description |
|------|-------------|
| `chainsettle-contract` | Soroban smart contract (Rust) |
| `chainsettle-backend` | NestJS REST API + event poller |
| `chainsettle-frontend` ← you are here | Next.js 14 + Freighter wallet UI |

---

## What This Frontend Does

ChainSettle frontend is the user-facing interface for creating, tracking, and resolving milestone-based shipments through a Stellar escrow contract. It is designed to be simple and secure for all roles in the supply chain.

Key user experiences:

- **Sign-In With Stellar** — authenticate with Freighter, no passwords required.
- **Create shipments** — configure buyer/supplier/logistics/arbiter, define milestone splits, then sign once to lock USDC into Soroban escrow.
- **Track active shipments** — view shipment status, progress, and related chain events.
- **Verify on-chain data** — Stellar addresses and transaction hashes are linked directly to Stellar Expert.
- **Role-driven milestone actions** — suppliers submit proof, buyers confirm delivery, logistics update transit status, and arbiters resolve disputes.
- **Search and filter** — browse shipments by status and by shipment ID or counterparty address.

Every transaction is signed through the user's Freighter wallet. The frontend never stores private keys.

---

## Prerequisites

- **Node.js** v20+
- **Freighter** browser extension installed
- Running backend service (`chainsettle-backend`)
- Deployed contract with IDs configured in `.env.local`

---

## Quick Start

```bash
npm install
cp .env.example .env.local
# Edit .env.local
npm run dev
```

See the [contributor guide](CONTRIBUTING.md) for full local setup, including Freighter testnet configuration and funding a testnet account.

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build (validates environment variables) |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests with `node:test` |
| `npm run format` | Format sources with Prettier |

For a map of the codebase (folder structure, data flow between the UI, backend and Soroban contract, state stores and polling), read the [architecture overview](docs/architecture.md).

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL |
| `NEXT_PUBLIC_STELLAR_NETWORK` | Yes | `testnet` or `mainnet` |
| `NEXT_PUBLIC_CONTRACT_ID` | Yes | Deployed contract ID |
| `NEXT_PUBLIC_USDC_ADDRESS` | Yes | USDC asset address for network |
| `NEXT_PUBLIC_STELLAR_RPC_URL` | Yes | Soroban RPC endpoint |
| `NEXT_PUBLIC_HORIZON_URL` | No | Optional Horizon URL |

---

## Documentation

- [Deployment guide and mainnet checklist](docs/deployment.md)
- [User guide](docs/user-guide/README.md) for buyers, suppliers, logistics providers and arbiters
- [Component conventions and catalog](docs/components.md)
- [i18n guide](docs/i18n.md)

---

## Production Checklist

- [ ] Set `NEXT_PUBLIC_STELLAR_NETWORK=mainnet`
- [ ] Use mainnet USDC address
- [ ] Configure mainnet contract ID
- [ ] Enable HTTPS backend URL
- [ ] Deploy frontend and backend with matching CORS settings

See the [deployment guide](docs/deployment.md) for the full mainnet go-live checklist, CSP changes for custom RPC/IPFS hosts, and how to verify a deployment.

---

## License

MIT
