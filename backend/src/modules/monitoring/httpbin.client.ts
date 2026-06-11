import axios from 'axios';

import { env } from '@/config/env.ts';

import type {
  MonitoringPayload,
  HttpBinPingResult,
} from './monitoring.types.ts';

class HttpBinClient {
  async ping(payload: MonitoringPayload): Promise<HttpBinPingResult> {
    const startedAt = Date.now();

    const response = await axios.post(`${env.httpBinBaseUrl}/anything`, payload, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
      validateStatus: () => true,
    });

    const responseTimeMs = Date.now() - startedAt;

    return {
      statusCode: response.status,
      responseTimeMs,
      requestPayload: payload,
      responseBody: response.data,
    };
  }
}

export const httpBinClient = new HttpBinClient();