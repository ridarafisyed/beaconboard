export type MonitoringPayload = {
  requestId: string;
  timestamp: string;
  source: string;
  eventType: string;
  metadata: {
    environment: string;
    retry: boolean;
  };
};

export type HttpBinPingResult = {
  statusCode: number;
  responseTimeMs: number;
  requestPayload: MonitoringPayload;
  responseBody: unknown;
};