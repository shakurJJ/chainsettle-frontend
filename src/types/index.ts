// src/types/index.ts
// All shared types — mirrors the Soroban contract data structures

export type MilestoneStatus =
  | 'Pending'
  | 'ProofSubmitted'
  | 'Confirmed'
  | 'Disputed'
  | 'Resolved';

export type ShipmentStatus = 'Active' | 'Completed' | 'Cancelled';

export type UserRole = 'BUYER' | 'SUPPLIER' | 'LOGISTICS' | 'ARBITER' | 'ADMIN';

export interface Milestone {
  id: string;
  shipmentId: string;
  milestoneIndex: number;
  name: string;
  paymentPercent: number;
  proofHash: string | null;
  status: MilestoneStatus;
  paymentReleased: string | null; // USDC in stroops as string
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Shipment {
  id: string;
  buyerAddress: string;
  supplierAddress: string;
  logisticsAddress: string;
  arbiterAddress: string;
  tokenAddress: string;
  totalAmount: string;      // BigInt serialised as string (stroops)
  releasedAmount: string;
  status: ShipmentStatus;
  txHash: string | null;
  createdLedger: number | null;
  createdAt: string;
  updatedAt: string;
  milestones: Milestone[];
  events?: ChainEvent[];
}

export interface ChainEvent {
  id: string;
  shipmentId: string | null;
  eventName: string;
  ledger: number;
  txHash: string;
  payload: Record<string, unknown>;
  processed: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  read: boolean;
  emailSent: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  stellarAddress: string;
  email: string | null;
  name: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

// DTO used when creating a shipment
export interface CreateMilestoneInput {
  name: string;
  paymentPercent: number;
}

export interface CreateShipmentInput {
  shipmentId: string;
  supplierAddress: string;
  logisticsAddress: string;
  arbiterAddress: string;
  totalAmount: string;  // human-readable USDC e.g. "500"
  milestones: CreateMilestoneInput[];
}

// API response envelope from the backend
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Auth
export interface AuthUser {
  id: string;
  stellarAddress: string;
  role: UserRole;
}

export interface JwtPayload {
  sub: string;
  stellarAddress: string;
  role: UserRole;
}
