/**
 * lib/api/services.ts
 *
 * Typed wrappers around every backend REST endpoint.
 * Each function calls the backend and returns the typed data payload.
 */

import { apiClient } from './client';
import type {
  ApiResponse,
  PaginatedResponse,
  Shipment,
  Milestone,
  Notification,
  User,
  CreateShipmentInput,
} from '@/types';

// ----------------------------------------------------------------
// Auth
// ----------------------------------------------------------------

export const authApi = {
  /** Step 1: Get a nonce to sign */
  getNonce: async (address: string): Promise<string> => {
    const { data } = await apiClient.get<ApiResponse<{ nonce: string }>>(
      `/auth/nonce?address=${address}`,
    );
    return data.data.nonce;
  },

  /** Step 2: Submit signed nonce and get JWT */
  login: async (payload: {
    stellarAddress: string;
    signedNonce: string;
    signature: string;
  }): Promise<{ accessToken: string; user: User }> => {
    const { data } = await apiClient.post<
      ApiResponse<{ accessToken: string; user: User }>
    >('/auth/login', payload);
    return data.data;
  },
};

// ----------------------------------------------------------------
// Shipments
// ----------------------------------------------------------------

export const shipmentsApi = {
  /** Register a newly created on-chain shipment in the backend DB */
  create: async (
    input: CreateShipmentInput & { txHash: string; buyerAddress: string; tokenAddress: string },
  ): Promise<Shipment> => {
    const { data } = await apiClient.post<ApiResponse<Shipment>>('/shipments', input);
    return data.data;
  },

  /** List shipments with optional filters */
  list: async (params?: {
    buyerAddress?: string;
    supplierAddress?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Shipment>> => {
    const { data } = await apiClient.get<ApiResponse<PaginatedResponse<Shipment>>>(
      '/shipments',
      { params },
    );
    return data.data;
  },

  /** Get full shipment detail including milestones and events */
  get: async (id: string): Promise<Shipment> => {
    const { data } = await apiClient.get<ApiResponse<Shipment>>(`/shipments/${id}`);
    return data.data;
  },

  /** Force sync shipment state from Stellar chain */
  sync: async (id: string): Promise<void> => {
    await apiClient.post(`/shipments/${id}/sync`);
  },
};

// ----------------------------------------------------------------
// Milestones
// ----------------------------------------------------------------

export const milestonesApi = {
  list: async (shipmentId: string): Promise<Milestone[]> => {
    const { data } = await apiClient.get<ApiResponse<Milestone[]>>(
      `/shipments/${shipmentId}/milestones`,
    );
    return data.data;
  },

  get: async (shipmentId: string, index: number): Promise<Milestone> => {
    const { data } = await apiClient.get<ApiResponse<Milestone>>(
      `/shipments/${shipmentId}/milestones/${index}`,
    );
    return data.data;
  },
};

// ----------------------------------------------------------------
// Events
// ----------------------------------------------------------------

export const eventsApi = {
  list: async (params?: {
    shipmentId?: string;
    page?: number;
    limit?: number;
  }) => {
    const { data } = await apiClient.get('/events', { params });
    return data.data;
  },
};

// ----------------------------------------------------------------
// Notifications
// ----------------------------------------------------------------

export const notificationsApi = {
  list: async (params?: {
    unreadOnly?: boolean;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Notification>> => {
    const { data } = await apiClient.get<ApiResponse<PaginatedResponse<Notification>>>(
      '/notifications',
      { params },
    );
    return data.data;
  },

  markRead: async (id: string): Promise<void> => {
    await apiClient.patch(`/notifications/${id}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await apiClient.patch('/notifications/read-all');
  },
};
