import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// No real API key needed — Gemini SDK is fully mocked
const mockGenerateContent = vi.hoisted(() => vi.fn());

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return { generateContent: mockGenerateContent };
    }
  },
}));

vi.mock('@/config/prisma.ts', () => ({ prisma: {} }));

vi.mock('@/modules/monitoring/monitoring.repository.ts', () => ({
  monitoringRepository: { getHistory: vi.fn() },
}));

import { monitoringRepository } from '@/modules/monitoring/monitoring.repository.ts';
import { aiService } from '@/modules/ai/ai.service.ts';
import { env } from '@/config/env.ts';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeRecord(overrides: Partial<{
  statusCode: number;
  responseTimeMs: number;
  eventType: string;
}> = {}) {
  return {
    id: Math.random().toString(36).slice(2),
    requestId: 'req-id',
    timestamp: new Date(),
    statusCode: 200,
    responseTimeMs: 100,
    eventType: 'health_check',
    environment: 'test',
    retry: false,
    responseBody: {},
    createdAt: new Date(),
    ...overrides,
  };
}

// Simulates what Gemini returns
const geminiResponse = (text: string) => ({
  response: { text: () => text },
});

const validInsightJson = JSON.stringify({
  headline: 'Service is operating normally.',
  status: 'healthy',
  observations: ['100% success rate across all pings', 'Average response time is 100ms'],
  recommendation: 'Continue monitoring at the current frequency.',
});

const originalApiKey = env.geminiApiKey;

// ─── tests ───────────────────────────────────────────────────────────────────

describe('AiService.generateInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env.geminiApiKey = 'test-gemini-key';
  });

  afterEach(() => {
    env.geminiApiKey = originalApiKey;
  });

  // ── guard: no API key ──────────────────────────────────────────────────────

  describe('when GEMINI_API_KEY is not set', () => {
    it('throws 503 AppError', async () => {
      env.geminiApiKey = '';
      vi.mocked(monitoringRepository.getHistory).mockResolvedValue({
        records: [makeRecord(), makeRecord(), makeRecord()],
        total: 3,
      });

      await expect(aiService.generateInsights()).rejects.toMatchObject({
        statusCode: 503,
        message: expect.stringContaining('GEMINI_API_KEY'),
      });
    });

    it('does not call the Gemini API', async () => {
      env.geminiApiKey = '';
      vi.mocked(monitoringRepository.getHistory).mockResolvedValue({ records: [], total: 0 });

      await aiService.generateInsights().catch(() => {});

      expect(mockGenerateContent).not.toHaveBeenCalled();
    });
  });

  // ── guard: not enough data ─────────────────────────────────────────────────

  describe('when there are fewer than 3 records', () => {
    it('throws 422 AppError for 0 records', async () => {
      vi.mocked(monitoringRepository.getHistory).mockResolvedValue({ records: [], total: 0 });

      await expect(aiService.generateInsights()).rejects.toMatchObject({
        statusCode: 422,
        message: expect.stringContaining('Not enough data'),
      });
    });

    it('throws 422 AppError for 2 records', async () => {
      vi.mocked(monitoringRepository.getHistory).mockResolvedValue({
        records: [makeRecord(), makeRecord()],
        total: 2,
      });

      await expect(aiService.generateInsights()).rejects.toMatchObject({ statusCode: 422 });
    });

    it('does not call the Gemini API', async () => {
      vi.mocked(monitoringRepository.getHistory).mockResolvedValue({ records: [], total: 0 });

      await aiService.generateInsights().catch(() => {});

      expect(mockGenerateContent).not.toHaveBeenCalled();
    });
  });

  // ── successful generation ──────────────────────────────────────────────────

  describe('successful insight generation', () => {
    const records = Array.from({ length: 10 }, () => makeRecord());

    beforeEach(() => {
      vi.mocked(monitoringRepository.getHistory).mockResolvedValue({ records, total: 10 });
      mockGenerateContent.mockResolvedValue(geminiResponse(validInsightJson));
    });

    it('returns the parsed headline', async () => {
      const result = await aiService.generateInsights();
      expect(result.headline).toBe('Service is operating normally.');
    });

    it('returns the parsed status', async () => {
      const result = await aiService.generateInsights();
      expect(result.status).toBe('healthy');
    });

    it('returns the observations array', async () => {
      const result = await aiService.generateInsights();
      expect(result.observations).toHaveLength(2);
    });

    it('returns the recommendation', async () => {
      const result = await aiService.generateInsights();
      expect(result.recommendation).toBe('Continue monitoring at the current frequency.');
    });

    it('attaches recordsAnalyzed to the response', async () => {
      const result = await aiService.generateInsights();
      expect(result.recordsAnalyzed).toBe(10);
    });

    it('attaches a valid ISO generatedAt timestamp', async () => {
      const result = await aiService.generateInsights();
      expect(new Date(result.generatedAt).toISOString()).toBe(result.generatedAt);
    });

    it('calls the Gemini API exactly once per request', async () => {
      await aiService.generateInsights();
      expect(mockGenerateContent).toHaveBeenCalledOnce();
    });

    it('respects the limit parameter', async () => {
      await aiService.generateInsights(25);
      expect(monitoringRepository.getHistory).toHaveBeenCalledWith(25, 0);
    });

    it('includes success rate in the prompt', async () => {
      await aiService.generateInsights();
      const prompt = mockGenerateContent.mock.calls[0]?.[0] as string;
      expect(prompt).toContain('Success rate:');
    });

    it('strips markdown fences from the Gemini response', async () => {
      mockGenerateContent.mockResolvedValue(
        geminiResponse('```json\n' + validInsightJson + '\n```')
      );
      const result = await aiService.generateInsights();
      expect(result.headline).toBe('Service is operating normally.');
    });
  });

  // ── trend detection ────────────────────────────────────────────────────────

  describe('response time trend detection', () => {
    beforeEach(() => {
      mockGenerateContent.mockResolvedValue(geminiResponse(validInsightJson));
    });

    it('labels trend as increasing when recent pings are >10% slower', async () => {
      const slow = Array.from({ length: 5 }, () => makeRecord({ responseTimeMs: 500 }));
      const fast = Array.from({ length: 5 }, () => makeRecord({ responseTimeMs: 100 }));
      vi.mocked(monitoringRepository.getHistory).mockResolvedValue({
        records: [...slow, ...fast],
        total: 10,
      });

      await aiService.generateInsights();

      const prompt = mockGenerateContent.mock.calls[0]?.[0] as string;
      expect(prompt).toContain('increasing');
    });

    it('labels trend as decreasing when recent pings are >10% faster', async () => {
      const fast = Array.from({ length: 5 }, () => makeRecord({ responseTimeMs: 80 }));
      const slow = Array.from({ length: 5 }, () => makeRecord({ responseTimeMs: 500 }));
      vi.mocked(monitoringRepository.getHistory).mockResolvedValue({
        records: [...fast, ...slow],
        total: 10,
      });

      await aiService.generateInsights();

      const prompt = mockGenerateContent.mock.calls[0]?.[0] as string;
      expect(prompt).toContain('decreasing');
    });

    it('labels trend as stable when difference is within 10%', async () => {
      const records = Array.from({ length: 10 }, () => makeRecord({ responseTimeMs: 100 }));
      vi.mocked(monitoringRepository.getHistory).mockResolvedValue({ records, total: 10 });

      await aiService.generateInsights();

      const prompt = mockGenerateContent.mock.calls[0]?.[0] as string;
      expect(prompt).toContain('stable');
    });
  });

  // ── error handling ─────────────────────────────────────────────────────────

  describe('when Gemini returns malformed JSON', () => {
    it('throws a 500 AppError', async () => {
      vi.mocked(monitoringRepository.getHistory).mockResolvedValue({
        records: Array.from({ length: 5 }, () => makeRecord()),
        total: 5,
      });
      mockGenerateContent.mockResolvedValue(geminiResponse('not valid json'));

      await expect(aiService.generateInsights()).rejects.toMatchObject({
        statusCode: 500,
        message: expect.stringContaining('unexpected response format'),
      });
    });
  });
});
