export type PingResult = {
  id: string;
  requestId: string;
  timestamp: string;
  statusCode: number;
  responseTimeMs: number;
  eventType: string;
  environment: string;
  retry: boolean;
  responseBody: unknown;
  createdAt: string;
};

export type Pagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type PaginatedResponse = {
  data: PingResult[];
  pagination: Pagination;
};
