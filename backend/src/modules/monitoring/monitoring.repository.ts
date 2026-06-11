import type { Prisma } from '@prisma/client';

import { prisma } from '@/config/prisma.ts';
import type { HttpBinPingResult } from './monitoring.types.ts';

class MonitoringRepository {
  async savePingResult(result: HttpBinPingResult) {
    const { requestPayload, responseBody, ...rest } = result;

    return prisma.pingResult.create({
      data: {
        requestId: requestPayload.requestId,
        timestamp: new Date(requestPayload.timestamp),
        statusCode: rest.statusCode,
        responseTimeMs: rest.responseTimeMs,
        eventType: requestPayload.eventType,
        environment: requestPayload.metadata.environment,
        retry: requestPayload.metadata.retry,
        responseBody: (responseBody ?? {}) as Prisma.InputJsonValue,
      },
    });
  }
}

export const monitoringRepository = new MonitoringRepository();
