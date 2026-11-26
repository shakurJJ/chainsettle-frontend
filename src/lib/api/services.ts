/**
 * lib/api/services.ts
 *
 * Typed wrappers around every backend REST endpoint.
 * Each function calls the backend and returns the typed data payload.
 */

import { apiClient } from './client';
import {
  computeSupplierMetrics,
  type SupplierMetrics,
} from '@/lib/counterparty-metrics';
import type {
  ApiResponse,
  PaginatedResponse,
  Shipment,
  Milestone,
  Notification,
  User,
  UserRole,
  ChainEvent,
  CreateShipmentInput,
  Comment,
  CreateCommentInput,
  UpdateCommentInput,
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

  /** Cancel an active shipment (buyer only) */
  cancel: async (id: string): Promise<Shipment> => {
    const { data } = await apiClient.post<ApiResponse<Shipment>>(
      `/shipments/${id}/cancel`,
    );
    return data.data;
  },
};

/** Helper to fetch all shipments */
export const fetchShipments = async (): Promise<Shipment[]> => {
  const { data } = await apiClient.get<ApiResponse<PaginatedResponse<Shipment>>>('/shipments');
  return data.data.data;
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
    eventName?: string[];
    fromLedger?: number;
    toLedger?: number;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<ChainEvent>> => {
    const queryParams: Record<string, string | number | undefined> = {
      shipmentId: params?.shipmentId,
      page: params?.page,
      limit: params?.limit,
    };
    if (params?.eventName && params.eventName.length > 0) {
      queryParams.eventName = params.eventName.join(',');
    }
    if (params?.fromLedger !== undefined) {
      queryParams.fromLedger = params.fromLedger;
    }
    if (params?.toLedger !== undefined) {
      queryParams.toLedger = params.toLedger;
    }
    const { data } = await apiClient.get<ApiResponse<PaginatedResponse<ChainEvent>>>(
      '/events',
      { params: queryParams },
    );
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

// ----------------------------------------------------------------
// Comments
// ----------------------------------------------------------------

export const commentsApi = {
  /** List all comments for a shipment */
  list: async (shipmentId: string): Promise<Comment[]> => {
    const { data } = await apiClient.get<ApiResponse<Comment[]> | Comment[]>(
      `/shipments/${shipmentId}/comments`,
    );
    if (Array.isArray(data)) return data;
    if (Array.isArray((data as ApiResponse<Comment[]>).data)) {
      return (data as ApiResponse<Comment[]>).data;
    }
    return (data as any)?.data?.data ?? [];
  },

  /** Create a comment on a shipment (optionally including @role mentions) */
  create: async (
    shipmentId: string,
    body: string | CreateCommentInput,
  ): Promise<Comment> => {
    const payload: CreateCommentInput =
      typeof body === 'string'
        ? { content: body }
        : body.mentions && body.mentions.length > 0
          ? { content: body.content, mentions: body.mentions }
          : { content: body.content };
    const { data } = await apiClient.post<ApiResponse<Comment> | Comment>(
      `/shipments/${shipmentId}/comments`,
      payload,
    );
    return (data as ApiResponse<Comment>).data ?? (data as Comment);
  },

  /** Update an existing comment authored by the current user */
  update: async (
    shipmentId: string,
    commentId: string,
    body: string | UpdateCommentInput,
  ): Promise<Comment> => {
    const payload: UpdateCommentInput =
      typeof body === 'string'
        ? { content: body }
        : body.mentions && body.mentions.length > 0
          ? { content: body.content, mentions: body.mentions }
          : { content: body.content };
    const { data } = await apiClient.patch<ApiResponse<Comment> | Comment>(
      `/shipments/${shipmentId}/comments/${encodeURIComponent(commentId)}`,
      payload,
    );
    return (data as ApiResponse<Comment>).data ?? (data as Comment);
  },

  /** Delete an existing comment authored by the current user */
  delete: async (shipmentId: string, commentId: string): Promise<void> => {
    await apiClient.delete(
      `/shipments/${shipmentId}/comments/${encodeURIComponent(commentId)}`,
    );
  },
};

// ----------------------------------------------------------------
// Admin Users
// ----------------------------------------------------------------

export const adminApi = {
  /** List all users with optional search and pagination (ADMIN only) */
  listUsers: async (params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<User>> => {
    const { data } = await apiClient.get<
      ApiResponse<PaginatedResponse<User> | User[]> | PaginatedResponse<User>
    >('/admin/users', { params });
    const inner =
      data && typeof data === 'object' && 'success' in data && 'data' in data
        ? (data as ApiResponse<PaginatedResponse<User> | User[]>).data
        : (data as PaginatedResponse<User> | User[]);
    if (Array.isArray(inner)) {
      return {
        data: inner,
        page: params?.page ?? 1,
        limit: params?.limit ?? inner.length,
        total: inner.length,
        totalPages: 1,
      };
    }
    return inner;
  },

  /** Update a user's platform role (ADMIN only) */
  updateUserRole: async (userId: string, role: UserRole): Promise<User> => {
    const { data } = await apiClient.patch<ApiResponse<User> | User>(
      `/admin/users/${encodeURIComponent(userId)}/role`,
      { role },
    );
    return (data as ApiResponse<User>).data ?? (data as User);
  },
};

// ----------------------------------------------------------------
// Counterparties
// ----------------------------------------------------------------

export const counterpartiesApi = {
  /** List shipments involving a counterparty address (defaults to supplier role) */
  listShipments: async (
    address: string,
    params?: { role?: 'supplier' | 'buyer'; page?: number; limit?: number },
  ): Promise<PaginatedResponse<Shipment>> => {
    const role = params?.role ?? 'supplier';
    const query =
      role === 'buyer'
        ? { buyerAddress: address, page: params?.page ?? 1, limit: params?.limit ?? 100 }
        : { supplierAddress: address, page: params?.page ?? 1, limit: params?.limit ?? 100 };
    const { data } = await apiClient.get<ApiResponse<PaginatedResponse<Shipment>>>(
      '/shipments',
      { params: query },
    );
    return data.data;
  },

  /** Fetch supplier shipment history from backend and compute reliability metrics */
  getSupplierMetrics: async (supplierAddress: string): Promise<SupplierMetrics> => {
    const firstPage = await counterpartiesApi.listShipments(supplierAddress, {
      role: 'supplier',
      page: 1,
      limit: 100,
    });
    const shipments = [...(firstPage.data ?? [])];
    const totalPages = Math.min(
      firstPage.totalPages ?? firstPage.meta?.totalPages ?? 1,
      5,
    );
    if (totalPages > 1) {
      const remaining = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) =>
          counterpartiesApi.listShipments(supplierAddress, {
            role: 'supplier',
            page: i + 2,
            limit: 100,
          }),
        ),
      );
      for (const res of remaining) {
        shipments.push(...(res.data ?? []));
      }
    }
    return computeSupplierMetrics(supplierAddress, shipments);
  },
};
