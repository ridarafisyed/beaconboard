import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/prisma.ts', () => ({ prisma: {} }));

vi.mock('@/modules/monitoring/payload-generator.ts', () => ({
  generateMonitoringPayload: vi.fn(),
}));

vi.mock('@/modules/monitoring/httpbin.client.ts', () => ({
  httpBinClient: { ping: vi.fn() },
}));

vi.mock('@/modules/monitoring/monitoring.repository.ts', () => ({
  monitoringRepository: {
    savePingResult: vi.fn(),
    getHistory: vi.fn(),
  },
}));

vi.mock('@/modules/monitoring/monitoring.events.ts', () => ({
  monitoringEvents: { emitPingResult: vi.fn(), onPingResult: vi.fn(() => vi.fn()) },
}));

import { monitoringService } from '@/modules/monitoring/monitoring.service.ts';
import { generateMonitoringPayload } from '@/modules/monitoring/payload-generator.ts';
import { httpBinClient } from '@/modules/monitoring/httpbin.client.ts';
import { monitoringRepository } from '@/modules/monitoring/monitoring.repository.ts';
import { monitoringEvents } from '@/modules/monitoring/monitoring.events.ts';

const mockPayload = {
  requestId: 'req-uuid-test',
  timestamp: '2026-06-12T10:00:00.000Z',
  source: 'pulsewatch-monitor',
  eventType: 'health_check',
  metadata: { environment: 'test', retry: false as const },
};

const mockHttpBinResult = {
  statusCode: 200,
  responseTimeMs: 145,
  requestPayload: mockPayload,
  responseBody: { json: true },
};

const mockSavedRecord = {
  id: 'cuid-1',
  requestId: mockPayload.requestId,
  timestamp: new Date(mockPayload.timestamp),
  statusCode: 200,
  responseTimeMs: 145,
  eventType: 'health_check',
  environment: 'test',
  retry: false,
  responseBody: { json: true },
  createdAt: new Date('2026-06-12T10:00:00.000Z'),
};

describe('MonitoringService.executeMonitoringCycle', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls each step in order and returns the saved record', async () => {
    vi.mocked(generateMonitoringPayload).mockReturnValue(mockPayload);
    vi.mocked(httpBinClient.ping).mockResolvedValue(mockHttpBinResult);
    vi.mocked(monitoringRepository.savePingResult).mockResolvedValue(mockSavedRecord as any);

    const result = await monitoringService.executeMonitoringCycle();

    expect(generateMonitoringPayload).toHaveBeenCalledOnce();
    expect(httpBinClient.ping).toHaveBeenCalledWith(mockPayload);
    expect(monitoringRepository.savePingResult).toHaveBeenCalledWith(mockHttpBinResult);
    expect(monitoringEvents.emitPingResult).toHaveBeenCalledWith(mockSavedRecord);
    expect(result).toBe(mockSavedRecord);
  });

  it('passes the generated payload to httpBinClient.ping', async () => {
    vi.mocked(generateMonitoringPayload).mockReturnValue(mockPayload);
    vi.mocked(httpBinClient.ping).mockResolvedValue(mockHttpBinResult);
    vi.mocked(monitoringRepository.savePingResult).mockResolvedValue(mockSavedRecord as any);

    await monitoringService.executeMonitoringCycle();

    expect(httpBinClient.ping).toHaveBeenCalledWith(mockPayload);
  });

  it('passes the httpbin result to the repository', async () => {
    vi.mocked(generateMonitoringPayload).mockReturnValue(mockPayload);
    vi.mocked(httpBinClient.ping).mockResolvedValue(mockHttpBinResult);
    vi.mocked(monitoringRepository.savePingResult).mockResolvedValue(mockSavedRecord as any);

    await monitoringService.executeMonitoringCycle();

    expect(monitoringRepository.savePingResult).toHaveBeenCalledWith(mockHttpBinResult);
  });

  it('saves a statusCode:0 record and emits it when httpBinClient.ping throws', async () => {
    vi.mocked(generateMonitoringPayload).mockReturnValue(mockPayload);
    vi.mocked(httpBinClient.ping).mockRejectedValue(new Error('timeout'));

    const failedSaved = { ...mockSavedRecord, statusCode: 0 };
    vi.mocked(monitoringRepository.savePingResult).mockResolvedValue(failedSaved as any);

    const result = await monitoringService.executeMonitoringCycle();

    expect(monitoringRepository.savePingResult).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 0,
        requestPayload: mockPayload,
        responseBody: { error: 'timeout' },
      })
    );
    expect(monitoringEvents.emitPingResult).toHaveBeenCalledWith(failedSaved);
    expect(result).toBe(failedSaved);
  });

  it('does not emit when the repository throws', async () => {
    vi.mocked(generateMonitoringPayload).mockReturnValue(mockPayload);
    vi.mocked(httpBinClient.ping).mockResolvedValue(mockHttpBinResult);
    vi.mocked(monitoringRepository.savePingResult).mockRejectedValue(new Error('DB error'));

    await expect(monitoringService.executeMonitoringCycle()).rejects.toThrow('DB error');
    expect(monitoringEvents.emitPingResult).not.toHaveBeenCalled();
  });

  it('still stores a non-200 httpbin response (503 treated as data)', async () => {
    const errorResult = { ...mockHttpBinResult, statusCode: 503 };
    const savedError = { ...mockSavedRecord, statusCode: 503 };

    vi.mocked(generateMonitoringPayload).mockReturnValue(mockPayload);
    vi.mocked(httpBinClient.ping).mockResolvedValue(errorResult);
    vi.mocked(monitoringRepository.savePingResult).mockResolvedValue(savedError as any);

    const result = await monitoringService.executeMonitoringCycle();

    expect(monitoringRepository.savePingResult).toHaveBeenCalledWith(errorResult);
    expect(result.statusCode).toBe(503);
  });
});

describe('MonitoringService.getHistory', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes correct limit and offset=0 for page 1', async () => {
    vi.mocked(monitoringRepository.getHistory).mockResolvedValue({ records: [], total: 0 });

    await monitoringService.getHistory(1, 20);

    expect(monitoringRepository.getHistory).toHaveBeenCalledWith(20, 0);
  });

  it('calculates offset as (page-1)*limit for page 3 limit 10', async () => {
    vi.mocked(monitoringRepository.getHistory).mockResolvedValue({ records: [], total: 0 });

    await monitoringService.getHistory(3, 10);

    expect(monitoringRepository.getHistory).toHaveBeenCalledWith(10, 20);
  });

  it('returns the correct pagination metadata', async () => {
    vi.mocked(monitoringRepository.getHistory).mockResolvedValue({
      records: [mockSavedRecord as any],
      total: 47,
    });

    const result = await monitoringService.getHistory(2, 10);

    expect(result.pagination).toEqual({ total: 47, page: 2, limit: 10, totalPages: 5 });
  });

  it('uses ceiling division for totalPages (47 / 10 = 5)', async () => {
    vi.mocked(monitoringRepository.getHistory).mockResolvedValue({ records: [], total: 47 });

    const { pagination } = await monitoringService.getHistory(1, 10);

    expect(pagination.totalPages).toBe(5);
  });

  it('returns totalPages=0 when there are no records', async () => {
    vi.mocked(monitoringRepository.getHistory).mockResolvedValue({ records: [], total: 0 });

    const { pagination } = await monitoringService.getHistory(1, 20);

    expect(pagination.totalPages).toBe(0);
  });

  it('wraps the records array under data key', async () => {
    vi.mocked(monitoringRepository.getHistory).mockResolvedValue({
      records: [mockSavedRecord as any],
      total: 1,
    });

    const result = await monitoringService.getHistory(1, 20);

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toBe(mockSavedRecord);
  });
});
