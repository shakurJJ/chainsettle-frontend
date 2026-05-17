# ChainSettle — Frontend Repo

> **Next.js 14 frontend for milestone-based supply chain escrow on Stellar**

This is **Repo 3 of 3** in the ChainSettle project:

| Repo | Description |
|------|-------------|
| `chainsetttle-contract` | Soroban smart contract (Rust) |
| `chainsetttle-backend` | NestJS REST API + event poller |
| `chainsetttle-frontend` ← you are here | Next.js 14 + Freighter wallet UI |

---

## What This Frontend Does

- **Sign-In With Stellar** — no passwords, no email required. Users connect their Freighter wallet, sign a nonce challenge, and receive a JWT
- **Create shipments** — fill out a form, lock USDC in the Soroban escrow contract via Freighter with one click
- **Track milestones** — timeline view showing each delivery stage with real-time status
- **Take actions on-chain** — submit proof hashes (supplier/logistics), confirm milestones (buyer), raise and resolve disputes — all signed directly in Freighter
- **Notifications** — in-app feed of on-chain events relevant to the user

Every write action is signed in the user's Freighter wallet. The frontend never holds private keys.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **Next.js 14** (App Router) | Framework with server and client components |
| **Tailwind CSS** | Utility-first styling |
| **Zustand** | Lightweight global state (auth, wallet) |
| **@stellar/freighter-api** | Connect to Freighter wallet, sign transactions |
| **@stellar/stellar-sdk** | Build Soroban transactions, interact with RPC |
| **Axios** | HTTP client for backend API calls |
| **date-fns** | Date formatting |
| **lucide-react** | Icon set |

---

## Project Structure

```
chainsetttle-frontend/
├── .env.example                        ← copy to .env.local
├── .gitignore
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
├── README.md
│
└── src/
    ├── middleware.ts                   ← Auth-protect all dashboard routes
    │
    ├── app/
    │   ├── layout.tsx                  ← Root layout (font, metadata, Providers)
    │   ├── page.tsx                    ← Redirects to /dashboard/shipments
    │   ├── providers.tsx               ← Zustand rehydration wrapper
    │   │
    │   ├── auth/
    │   │   └── login/
    │   │       └── page.tsx            ← Freighter connect + Sign-In With Stellar
    │   │
    │   ├── dashboard/
    │   │   ├── layout.tsx              ← Sidebar + TopBar wrapper
    │   │   └── shipments/
    │   │       ├── page.tsx            ← Shipment list with search + filter
    │   │       ├── create/
    │   │       │   └── page.tsx        ← Create shipment form (Freighter tx)
    │   │       └── [id]/
    │   │           └── page.tsx        ← Shipment detail + milestone actions
    │   │
    │   └── notifications/
    │       └── page.tsx                ← Notification feed
    │
    ├── components/
    │   ├── layout/
    │   │   ├── Sidebar.tsx             ← Navigation sidebar
    │   │   └── TopBar.tsx              ← Top header bar
    │   ├── shipments/
    │   │   ├── ShipmentCard.tsx        ← List item card
    │   │   ├── ShipmentProgress.tsx    ← USDC stats + progress bar
    │   │   └── ShipmentMeta.tsx        ← Addresses + on-chain metadata
    │   └── milestones/
    │       └── MilestoneTimeline.tsx   ← Timeline with all role-based actions
    │
    ├── lib/
    │   ├── stellar/
    │   │   ├── freighter.ts            ← Freighter API wrappers (connect, sign, watch)
    │   │   └── contract.ts             ← Soroban contract call builders + submitters
    │   ├── api/
    │   │   ├── client.ts               ← Axios instance with JWT interceptor
    │   │   └── services.ts             ← Typed API functions for all backend endpoints
    │   ├── hooks/
    │   │   └── use-auth-store.ts       ← Zustand store (address, token, user)
    │   └── utils/
    │       └── index.ts                ← Formatting (USDC, addresses, dates, badges)
    │
    ├── types/
    │   └── index.ts                    ← All shared TypeScript types
    │
    └── styles/
        └── globals.css                 ← Tailwind + custom component classes
```

---

## Key Flows

### Authentication (Sign-In With Stellar)

```
User clicks "Connect Freighter"
  → connectFreighter() → requestAccess() from Freighter
  → authApi.getNonce(address) → GET /auth/nonce
  → signNonce(nonce) → Freighter signs a minimal Stellar transaction
  → authApi.login(payload) → POST /auth/login
  → JWT stored in localStorage + cookie (for Next.js middleware)
  → Redirect to /dashboard/shipments
```

### Creating a Shipment

```
User fills form → clicks "Sign & lock funds in escrow"
  → createShipment() in lib/stellar/contract.ts
  → TransactionBuilder + Contract.call('create_shipment', ...args)
  → rpc.simulateTransaction() → get resource footprint
  → assembleTransaction() → final tx
  → signTx() → Freighter prompts user to sign
  → rpc.sendTransaction() → broadcast to Stellar
  → waitForConfirmation() → poll until confirmed
  → shipmentsApi.create() → POST /shipments (register in backend DB)
  → Redirect to /dashboard/shipments/:id
```

### Confirming a Milestone

```
Buyer clicks "Confirm & release" on a ProofSubmitted milestone
  → confirmMilestone() → Freighter signs contract call
  → Contract releases % of USDC to supplier automatically
  → EventsService (backend) detects milestone_confirmed event
  → Notification sent to supplier
  → UI reloads shipment state
```

---

## Prerequisites

- **Node.js** v20+
- **Freighter** browser extension — [freighter.app](https://freighter.app)
- Running `chainsetttle-backend` on `localhost:3000`
- Deployed `chainsetttle-contract` (contract ID in `.env.local`)

---

## Setup

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with your backend URL and contract ID

# Start dev server
npm run dev
```

App runs at `http://localhost:3001` (or `3000` if backend is on a different port).

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL e.g. `http://localhost:3000/api/v1` |
| `NEXT_PUBLIC_STELLAR_NETWORK` | Yes | `testnet` or `mainnet` |
| `NEXT_PUBLIC_CONTRACT_ID` | Yes | Deployed ChainSettle contract ID |
| `NEXT_PUBLIC_USDC_ADDRESS` | Yes | USDC SAC address for your network |
| `NEXT_PUBLIC_STELLAR_RPC_URL` | Yes | Soroban RPC endpoint |
| `NEXT_PUBLIC_HORIZON_URL` | No | Horizon URL (for account lookups) |

---

## Role-Based UI

The frontend detects the current user's role by comparing their Stellar address to the shipment's stored addresses:

| Role | Detected by | Available actions |
|---|---|---|
| **Buyer** | `address === shipment.buyerAddress` | Confirm milestones, raise disputes, cancel shipment |
| **Supplier** | `address === shipment.supplierAddress` | Submit proof for dispatch + delivery milestones |
| **Logistics** | `address === shipment.logisticsAddress` | Submit proof for in-transit milestones |
| **Arbiter** | `address === shipment.arbiterAddress` | Approve or reject disputed milestones |
| **Observer** | Any other address | Read-only view |

---

## Production Checklist

- [ ] Set `NEXT_PUBLIC_STELLAR_NETWORK=mainnet`
- [ ] Update `NEXT_PUBLIC_USDC_ADDRESS` to mainnet USDC SAC
- [ ] Set `NEXT_PUBLIC_CONTRACT_ID` to mainnet deployed contract
- [ ] Use HTTPS for the backend URL
- [ ] Deploy to Vercel / Netlify / Docker
- [ ] Set `CORS_ORIGIN` in the backend to match the frontend domain

---

## License

MIT
