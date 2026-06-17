import { httpBinClient } from './httpbin.client.ts';
import { monitoringEvents } from './monitoring.events.ts';
import { generateMonitoringPayload } from './payload-generator.ts';
import { monitoringRepository } from './monitoring.repository.ts';
import type { HttpBinPingResult } from './monitoring.types.ts';

class MonitoringService {
  async executeMonitoringCycle() {
    const payload = generateMonitoringPayload();
    const startedAt = Date.now();

    let pingResult: HttpBinPingResult;
    try {
      pingResult = await httpBinClient.ping(payload);
    } catch (error) {
      pingResult = {
        statusCode: 0,
        responseTimeMs: Date.now() - startedAt,
        requestPayload: payload,
        responseBody: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }

    const saved = await monitoringRepository.savePingResult(pingResult);
    monitoringEvents.emitPingResult(saved);
    return saved;
  }

  async getHistory(page: number, limit: number) {
    const offset = (page - 1) * limit;
    const { records, total } = await monitoringRepository.getHistory(limit, offset);

    return {
      data: records,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const monitoringService = new MonitoringService();