import { httpBinClient } from './httpbin.client.ts';
import { monitoringEvents } from './monitoring.events.ts';
import { generateMonitoringPayload } from './payload-generator.ts';
import { monitoringRepository } from './monitoring.repository.ts';

class MonitoringService {
  async executeMonitoringCycle() {
    const payload = generateMonitoringPayload();

    const result = await httpBinClient.ping(payload);

    const saved = await monitoringRepository.savePingResult(result);

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