export interface ChainEvent {
  id: string;
  contractId: string;
  eventName: string;
  shipmentId?: string;
  ledger: number;
  txHash: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
