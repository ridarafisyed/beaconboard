import { httpBinClient } from './httpbin.client.ts';
import { generateMonitoringPayload } from './payload-generator.ts';
import { monitoringRepository } from './monitoring.repository.ts';

class MonitoringService {
  async executeMonitoringCycle() {
    const payload = generateMonitoringPayload();

    const result = await httpBinClient.ping(payload);

    await monitoringRepository.savePingResult(result);

    return result;
  }
}

export const monitoringService = new MonitoringService();