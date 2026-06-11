import { httpBinClient } from './httpbin.client.ts';
import { generateMonitoringPayload } from './payload-generator.ts';

class MonitoringService {
  async executeMonitoringCycle() {
    const payload = generateMonitoringPayload();

    const result = await httpBinClient.ping(payload);

    return result;
  }
}

export const monitoringService = new MonitoringService();